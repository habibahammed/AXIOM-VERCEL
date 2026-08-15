"""
AXIOM — MONARCH SYSTEM Backend
Cinematic personal-development RPG operating system.
"""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, jwt, bcrypt, logging, json, asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRE_HOURS = int(os.environ['JWT_EXPIRE_HOURS'])
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'google/gemma-4-26b-a4b-it:free')
OPENROUTER_FALLBACKS = [m.strip() for m in os.environ.get('OPENROUTER_FALLBACK_MODELS', '').split(',') if m.strip()]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# OpenRouter streaming client (free Gemma model, no Universal Key cost)
import httpx as _httpx

async def _openrouter_stream_one(model: str, system_message: str, user_text: str):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_text},
        ],
        "stream": True,
        "temperature": 0.6,
        "max_tokens": 2048,
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.environ.get("APP_PUBLIC_URL", "https://axiom.app"),
        "X-Title": "AXIOM Monarch System",
    }
    async with _httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", OPENROUTER_URL, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                raise RuntimeError(f"OpenRouter {resp.status_code} on {model}: {body.decode(errors='ignore')[:300]}")
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                    err = obj.get("error")
                    if err:
                        raise RuntimeError(f"OpenRouter mid-stream error on {model}: {json.dumps(err)[:300]}")
                    delta = obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if delta:
                        yield delta
                except json.JSONDecodeError:
                    continue

async def gemini_stream_text(system_message: str, user_text: str):
    """Async generator yielding text deltas. Tries primary model then fallbacks on rate-limit/error."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not configured")
    models = [OPENROUTER_MODEL] + OPENROUTER_FALLBACKS
    last_err = None
    for m in models:
        try:
            got_any = False
            async for delta in _openrouter_stream_one(m, system_message, user_text):
                got_any = True
                yield delta
            if got_any:
                return
        except Exception as e:
            last_err = e
            logger.warning(f"OpenRouter model {m} failed: {e}")
            continue
    raise last_err or RuntimeError("All OpenRouter models failed")

async def gemini_drain(system_message: str, user_text: str) -> str:
    parts = []
    async for delta in gemini_stream_text(system_message, user_text):
        parts.append(delta)
    return "".join(parts).strip()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="AXIOM Monarch System")
api = APIRouter(prefix="/api")
security = HTTPBearer()

logger = logging.getLogger("axiom")
logging.basicConfig(level=logging.INFO)

# ============================================================
# CORE ENGINE — Levels, Ranks, XP
# ============================================================
RANKS = [
    ("E", "SPARK", 1, 10),
    ("D", "RISER", 11, 22),
    ("C", "WARRIOR", 23, 38),
    ("B", "HUNTER", 39, 55),
    ("A", "ELITE", 56, 72),
    ("S", "MASTER", 73, 86),
    ("SS", "LEGEND", 87, 96),
    ("SSS", "MONARCH", 97, 103),
    ("???", "SUPREME MONARCH", 104, 104),
]

def xp_required_for_level(level: int) -> int:
    """Total XP needed to REACH this level from level 1."""
    if level <= 1:
        return 0
    # Escalating curve — meaningful long-term progression
    return int(100 * (level - 1) + 25 * (level - 1) ** 2)

def xp_for_next_level(current_level: int) -> int:
    return xp_required_for_level(current_level + 1) - xp_required_for_level(current_level)

def level_from_xp(total_xp: int) -> int:
    lvl = 1
    for l in range(1, 105):
        if total_xp >= xp_required_for_level(l):
            lvl = l
        else:
            break
    return lvl

def rank_for_level(level: int):
    for code, name, lo, hi in RANKS:
        if lo <= level <= hi:
            return {"code": code, "name": name, "min": lo, "max": hi}
    return {"code": "E", "name": "SPARK", "min": 1, "max": 10}

# ============================================================
# MODELS
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = "Habib"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    token: str
    player_id: str

class QuestCompleteIn(BaseModel):
    evidence: Optional[str] = None

class QuestCreateIn(BaseModel):
    title: str
    description: str
    kind: Literal["MAIN", "SUPPORT", "MICRO", "CHALLENGE", "BOSS", "SECRET"] = "MICRO"
    difficulty: Literal["TRIVIAL", "EASY", "MEDIUM", "HARD", "EXTREME"] = "MEDIUM"
    domain: str = "DISCIPLINE"
    duration_min: int = 30
    xp_reward: Optional[int] = None
    trained_stats: List[str] = Field(default_factory=list)
    boss_id: Optional[str] = None

class ArchitectMsgIn(BaseModel):
    text: str

# ============================================================
# XP TABLE — meaningful, non-farmable
# ============================================================
XP_BY_KIND_DIFFICULTY = {
    "MICRO":     {"TRIVIAL": 15, "EASY": 25, "MEDIUM": 40, "HARD": 60, "EXTREME": 90},
    "SUPPORT":   {"TRIVIAL": 30, "EASY": 55, "MEDIUM": 90, "HARD": 140, "EXTREME": 210},
    "MAIN":      {"TRIVIAL": 70, "EASY": 120, "MEDIUM": 200, "HARD": 320, "EXTREME": 500},
    "CHALLENGE": {"TRIVIAL": 100, "EASY": 180, "MEDIUM": 300, "HARD": 500, "EXTREME": 800},
    "BOSS":      {"TRIVIAL": 200, "EASY": 400, "MEDIUM": 700, "HARD": 1100, "EXTREME": 1800},
    "SECRET":    {"TRIVIAL": 300, "EASY": 500, "MEDIUM": 900, "HARD": 1500, "EXTREME": 2500},
}

STATS_KEYS = ["STR", "AGI", "INT", "FOC", "MEM", "CHA", "PER", "STA"]
DOMAINS = ["DISCIPLINE", "COMMUNICATION", "EMOTIONAL_CONTROL", "ACADEMICS",
           "FINANCIAL_CAPABILITY", "CREATIVITY", "SPIRITUAL_DEVELOPMENT",
           "PHYSICAL_DEVELOPMENT", "RECOVERY"]

# ============================================================
# AUTH
# ============================================================
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def make_token(player_id: str) -> str:
    payload = {"sub": player_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_player(creds: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        pid = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    player = await db.players.find_one({"id": pid}, {"_id": 0})
    if not player:
        raise HTTPException(401, "Player not found")
    return player

# ============================================================
# SEED — Bosses, Skills, Starter quests
# ============================================================
DEFAULT_BOSSES = [
    ("the-scroll", "THE SCROLL", "Endless feeds fracture your mind into a thousand small distractions.", "DISCIPLINE", 3, 100),
    ("the-procrastinator", "THE PROCRASTINATOR", "The shadow that whispers: begin tomorrow. Tomorrow never arrives.", "DISCIPLINE", 4, 150),
    ("the-comfort-seeker", "THE COMFORT SEEKER", "Chooses ease over evolution. Rots ambition in warmth.", "DISCIPLINE", 3, 120),
    ("the-distractor", "THE DISTRACTOR", "Redirects your attention seconds before flow ignites.", "FOCUS", 3, 100),
    ("the-perfectionist", "THE PERFECTIONIST", "Refuses to ship. Turns progress into paralysis.", "EXECUTION", 4, 140),
    ("the-fear", "THE FEAR", "Freezes the body when the moment demands courage.", "EMOTIONAL_CONTROL", 5, 180),
    ("the-inconsistency", "THE INCONSISTENCY", "Breaks momentum. Erases 30 days of work in a single skipped day.", "DISCIPLINE", 4, 160),
    ("the-reactor", "THE REACTOR", "Reacts instead of responds. Bleeds power to every outside stimulus.", "EMOTIONAL_CONTROL", 3, 120),
    ("the-directionless", "THE DIRECTIONLESS", "Wanders through days without command. Effort without vector.", "STRATEGY", 4, 140),
]

def new_player_profile(email: str, display_name: str, password_hash: str) -> dict:
    pid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": pid,
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "level": 1,
        "rank": rank_for_level(1),
        "xp": 0,
        "lifetime_xp": 0,
        "streak": 0,
        "last_completion_date": None,
        "credits": 0,
        "essence": 0,
        "stats": {k: 5 for k in STATS_KEYS},
        "domains": {d: 0 for d in DOMAINS},
        "achievements": [],
        "medals": [],
        "titles": ["INITIATE"],
        "active_title": "INITIATE",
        "created_at": now,
        "settings": {"sound": True, "reduced_motion": False, "music_volume": 0.4, "sfx_volume": 0.6},
        "onboarded": False,
        "prime_objective": None,
        "streak_shields": 1,
        "guild_id": None,
        "avatar_url": None,
    }

async def seed_player_bosses(player_id: str):
    docs = []
    for bid, name, desc, domain, phases, hp in DEFAULT_BOSSES:
        docs.append({
            "id": str(uuid.uuid4()),
            "player_id": player_id,
            "boss_key": bid,
            "name": name,
            "description": desc,
            "domain": domain,
            "phases": phases,
            "current_phase": 1,
            "max_resistance": hp,
            "resistance": hp,
            "status": "ACTIVE",
            "defeated_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.bosses.insert_many(docs)

async def seed_player_quests(player_id: str):
    starter = [
        ("Deep Work Block — 25 min", "Complete one uninterrupted 25 minute deep-work block on your highest-priority task.", "MAIN", "MEDIUM", "DISCIPLINE", 25, ["FOC", "STA"], "the-procrastinator"),
        ("Physical Ignition", "10 pushups + 20 squats + 30 second plank. Non-negotiable.", "SUPPORT", "EASY", "PHYSICAL_DEVELOPMENT", 10, ["STR", "STA"], None),
        ("Cold Water Reset", "60 seconds cold shower or cold face immersion. Break comfort.", "MICRO", "EASY", "DISCIPLINE", 5, ["STA"], "the-comfort-seeker"),
        ("Silent Read — 15 min", "Read 15 minutes of a book that trains a real skill. No screens.", "SUPPORT", "EASY", "ACADEMICS", 15, ["INT", "MEM"], "the-scroll"),
        ("Strategic Journal", "Write tomorrow's ONE primary objective and the first micro-action to begin it.", "MICRO", "EASY", "STRATEGY", 10, ["INT", "FOC"], "the-directionless"),
        ("The First Forge — Main Trial", "Complete 3 deep-work blocks today. This is a real trial.", "MAIN", "HARD", "DISCIPLINE", 90, ["FOC", "STA", "STR"], "the-procrastinator"),
        ("Digital Blackout Hour", "One hour with phone in a different room. No exceptions.", "SUPPORT", "MEDIUM", "DISCIPLINE", 60, ["FOC"], "the-scroll"),
        ("Voice Practice", "Speak one thing out loud that you'd usually stay silent about.", "MICRO", "EASY", "COMMUNICATION", 5, ["CHA"], "the-fear"),
        ("Recovery Protocol", "10 minute walk without phone. Nervous system reset.", "MICRO", "EASY", "RECOVERY", 10, ["STA"], None),
        ("Skill Sharpening", "30 minutes deliberate practice on one professional skill.", "SUPPORT", "MEDIUM", "ACADEMICS", 30, ["INT", "PER"], None),
    ]
    docs = []
    for title, desc, kind, diff, domain, dur, stats, boss_key in starter:
        docs.append({
            "id": str(uuid.uuid4()),
            "player_id": player_id,
            "title": title,
            "description": desc,
            "kind": kind,
            "difficulty": diff,
            "domain": domain,
            "duration_min": dur,
            "trained_stats": stats,
            "xp_reward": XP_BY_KIND_DIFFICULTY[kind][diff],
            "boss_key": boss_key,
            "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "evidence": None,
            "is_daily": True,
        })
    await db.quests.insert_many(docs)

# ============================================================
# ROUTES — AUTH
# ============================================================
@api.get("/")
async def root():
    return {"system": "AXIOM MONARCH SYSTEM", "status": "ONLINE"}

@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn):
    if await db.players.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already registered")
    profile = new_player_profile(body.email.lower(), body.display_name, hash_password(body.password))
    await db.players.insert_one(profile)
    await seed_player_bosses(profile["id"])
    await seed_player_quests(profile["id"])
    return TokenOut(token=make_token(profile["id"]), player_id=profile["id"])

@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    p = await db.players.find_one({"email": body.email.lower()})
    if not p or not verify_password(body.password, p["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return TokenOut(token=make_token(p["id"]), player_id=p["id"])

def _clean_player(p: dict) -> dict:
    return {k: v for k, v in p.items() if k not in ("_id", "password_hash")}

@api.get("/player/me")
async def get_me(player=Depends(current_player)):
    p = _clean_player(player)
    lvl = p["level"]
    xp_at_lvl = xp_required_for_level(lvl)
    xp_next = xp_required_for_level(lvl + 1)
    p["xp_into_level"] = p["lifetime_xp"] - xp_at_lvl
    p["xp_to_next_level"] = xp_next - xp_at_lvl
    p["level_progress"] = (p["xp_into_level"] / p["xp_to_next_level"]) if p["xp_to_next_level"] else 1
    p["rank"] = rank_for_level(lvl)
    return p

@api.patch("/player/settings")
async def update_settings(settings: Dict[str, Any], player=Depends(current_player)):
    await db.players.update_one({"id": player["id"]}, {"$set": {"settings": {**player["settings"], **settings}}})
    return {"ok": True}

@api.patch("/player/name")
async def update_name(body: Dict[str, str], player=Depends(current_player)):
    name = body.get("display_name", "").strip()
    if not name:
        raise HTTPException(400, "Name required")
    await db.players.update_one({"id": player["id"]}, {"$set": {"display_name": name}})
    return {"ok": True}

# ============================================================
# ROUTES — QUESTS
# ============================================================
@api.get("/quests")
async def list_quests(player=Depends(current_player)):
    quests = await db.quests.find({"player_id": player["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return quests

@api.get("/quests/today")
async def todays_quests(player=Depends(current_player)):
    quests = await db.quests.find({
        "player_id": player["id"],
        "status": {"$in": ["AVAILABLE", "ACTIVE"]},
        "is_daily": True,
    }, {"_id": 0}).to_list(50)
    # organise
    return {
        "MAIN": [q for q in quests if q["kind"] == "MAIN"][:3],
        "SUPPORT": [q for q in quests if q["kind"] == "SUPPORT"][:4],
        "MICRO": [q for q in quests if q["kind"] == "MICRO"][:3],
    }

@api.post("/quests")
async def create_quest(body: QuestCreateIn, player=Depends(current_player)):
    xp = body.xp_reward or XP_BY_KIND_DIFFICULTY[body.kind][body.difficulty]
    q = {
        "id": str(uuid.uuid4()),
        "player_id": player["id"],
        "title": body.title,
        "description": body.description,
        "kind": body.kind,
        "difficulty": body.difficulty,
        "domain": body.domain,
        "duration_min": body.duration_min,
        "trained_stats": body.trained_stats,
        "xp_reward": xp,
        "boss_key": body.boss_id,
        "status": "AVAILABLE",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "evidence": None,
        "is_daily": True,
    }
    await db.quests.insert_one(q)
    q.pop("_id", None)
    return q

@api.post("/quests/{quest_id}/complete")
async def complete_quest(quest_id: str, body: QuestCompleteIn, player=Depends(current_player)):
    q = await db.quests.find_one({"id": quest_id, "player_id": player["id"]}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Quest not found")
    if q["status"] == "COMPLETED":
        raise HTTPException(400, "Quest already completed")

    xp_gain = q["xp_reward"]
    # Update quest
    await db.quests.update_one(
        {"id": quest_id, "status": {"$ne": "COMPLETED"}},
        {"$set": {"status": "COMPLETED", "completed_at": datetime.now(timezone.utc).isoformat(),
                  "evidence": body.evidence}}
    )
    # Update player
    p = player
    new_lifetime = p["lifetime_xp"] + xp_gain
    old_level = p["level"]
    new_level = level_from_xp(new_lifetime)
    level_up = new_level > old_level
    old_rank = rank_for_level(old_level)
    new_rank = rank_for_level(new_level)
    rank_up = old_rank["code"] != new_rank["code"]

    stats = dict(p["stats"])
    for s in q.get("trained_stats", []):
        if s in stats:
            stats[s] = min(999, stats[s] + max(1, xp_gain // 40))
    domains = dict(p.get("domains", {}))
    dom = q.get("domain")
    if dom in domains:
        domains[dom] = domains[dom] + xp_gain

    # streak with shield insurance
    today = datetime.now(timezone.utc).date().isoformat()
    last = p.get("last_completion_date")
    streak = p.get("streak", 0)
    shields = p.get("streak_shields", 0)
    shield_consumed = False
    if last != today:
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
        if last == yesterday:
            streak = streak + 1
        elif last is None:
            streak = 1
        elif shields > 0:
            # shield absorbs missed day(s), streak continues
            streak = streak + 1
            shields -= 1
            shield_consumed = True
        else:
            streak = 1

    updates = {
        "xp": p["xp"] + xp_gain,
        "lifetime_xp": new_lifetime,
        "level": new_level,
        "stats": stats,
        "domains": domains,
        "streak": streak,
        "streak_shields": shields,
        "last_completion_date": today,
        "credits": p.get("credits", 0) + max(1, xp_gain // 20),
    }
    # rank up grants a shield
    if rank_up:
        updates["streak_shields"] = shields + 1
    await db.players.update_one({"id": p["id"]}, {"$set": updates})

    # boss damage
    boss_result = None
    first_hit = False
    if q.get("boss_key"):
        boss = await db.bosses.find_one({"player_id": p["id"], "boss_key": q["boss_key"]}, {"_id": 0})
        if boss and boss["status"] == "ACTIVE":
            damage = max(3, xp_gain // 8)
            new_res = max(0, boss["resistance"] - damage)
            phase = boss["current_phase"]
            phase_size = boss["max_resistance"] / boss["phases"]
            new_phase = min(boss["phases"], int((boss["max_resistance"] - new_res) / phase_size) + 1)
            defeated = new_res <= 0
            was_full = boss["resistance"] >= boss["max_resistance"]
            already_revealed = boss.get("first_hit_shown", False)
            first_hit = was_full and not already_revealed
            bupdate = {
                "resistance": new_res,
                "current_phase": new_phase,
                "status": "DEFEATED" if defeated else "ACTIVE",
                "defeated_at": datetime.now(timezone.utc).isoformat() if defeated else None,
            }
            if first_hit:
                bupdate["first_hit_shown"] = True
            await db.bosses.update_one({"id": boss["id"]}, {"$set": bupdate})
            # propagate to guildmates (shared damage)
            if p.get("guild_id"):
                mates = await db.players.find({"guild_id": p["guild_id"], "id": {"$ne": p["id"]}}, {"_id": 0}).to_list(10)
                for m in mates:
                    mb = await db.bosses.find_one({"player_id": m["id"], "boss_key": q["boss_key"]}, {"_id": 0})
                    if mb and mb["status"] == "ACTIVE":
                        mnew_res = max(0, mb["resistance"] - damage)
                        mphase = min(mb["phases"], int((mb["max_resistance"] - mnew_res) / (mb["max_resistance"] / mb["phases"])) + 1)
                        await db.bosses.update_one({"id": mb["id"]}, {"$set": {
                            "resistance": mnew_res,
                            "current_phase": mphase,
                            "status": "DEFEATED" if mnew_res <= 0 else "ACTIVE",
                            "defeated_at": datetime.now(timezone.utc).isoformat() if mnew_res <= 0 else None,
                        }})
            boss_result = {"boss_key": q["boss_key"], "damage": damage, "resistance": new_res,
                          "max_resistance": boss["max_resistance"], "defeated": defeated,
                          "phase": new_phase, "name": boss["name"],
                          "description": boss["description"], "domain": boss["domain"], "phases": boss["phases"]}

    # Log event
    event = {
        "id": str(uuid.uuid4()),
        "player_id": p["id"],
        "kind": "QUEST_COMPLETE",
        "quest_id": quest_id,
        "xp_gain": xp_gain,
        "level_up": level_up,
        "rank_up": rank_up,
        "new_level": new_level,
        "new_rank": new_rank,
        "boss_result": boss_result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(event)
    event.pop("_id", None)

    return {
        "xp_gain": xp_gain,
        "level_up": level_up,
        "rank_up": rank_up,
        "old_level": old_level,
        "new_level": new_level,
        "old_rank": old_rank,
        "new_rank": new_rank,
        "boss_result": boss_result,
        "quest": {**q, "status": "COMPLETED"},
    }

# ============================================================
# ROUTES — BOSSES
# ============================================================
@api.get("/bosses")
async def list_bosses(player=Depends(current_player)):
    bosses = await db.bosses.find({"player_id": player["id"]}, {"_id": 0}).to_list(200)
    return bosses

# ============================================================
# ROUTES — EVENTS (recent history)
# ============================================================
@api.get("/events/recent")
async def recent_events(player=Depends(current_player), limit: int = 20):
    events = await db.events.find({"player_id": player["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return events

# ============================================================
# ROUTES — ARCHITECT AI (streamed via OpenRouter)
# ============================================================
ARCHITECT_SYSTEM = """You are AXIOM — THE MONARCH SYSTEM's Architect.
You speak calmly, directly, strategically, concisely, confidently.
You do not deliver motivational speeches. You issue commands and strategies.
When the player expresses resistance, convert it into the smallest executable action.
Format:
- Prefer 3–8 short lines.
- Use ALL CAPS SPARINGLY for emphasis on commands (e.g., "OPEN THE TASK.").
- Refer to real player state (level, rank, streak, active bosses) when given.
- End with a single next action.
Never claim to predict the future with certainty — use words like "projection", "estimate", "trajectory".
Never invent XP, level, or reward changes. Progression is controlled by the AXIOM engine, not by you.
"""

async def build_player_context(player: dict) -> str:
    bosses = await db.bosses.find({"player_id": player["id"], "status": "ACTIVE"}, {"_id": 0}).sort("resistance", 1).to_list(5)
    quests_today = await db.quests.find({
        "player_id": player["id"], "is_daily": True,
        "status": {"$in": ["AVAILABLE", "ACTIVE"]}
    }, {"_id": 0}).to_list(20)
    rank = rank_for_level(player["level"])
    ctx_lines = [
        f"PLAYER: {player['display_name']}",
        f"LEVEL: {player['level']} / RANK: {rank['code']} — {rank['name']}",
        f"LIFETIME XP: {player['lifetime_xp']}  STREAK: {player.get('streak', 0)} days",
        f"CREDITS: {player.get('credits', 0)}",
        f"STATS: {player['stats']}",
        f"ACTIVE BOSSES: {[b['name']+' ('+str(b['resistance'])+'/'+str(b['max_resistance'])+')' for b in bosses[:3]]}",
        f"OPEN QUESTS TODAY: {len(quests_today)}",
    ]
    if quests_today:
        ctx_lines.append("QUESTS:")
        for q in quests_today[:6]:
            ctx_lines.append(f"  - [{q['kind']}/{q['difficulty']}] {q['title']} (+{q['xp_reward']} XP)")
    return "\n".join(ctx_lines)

@api.post("/architect/chat")
async def architect_chat(body: ArchitectMsgIn, player=Depends(current_player)):
    """Streaming SSE from Gemini 2.5 Flash (direct Google API, free tier)."""
    context = await build_player_context(player)
    system_msg = ARCHITECT_SYSTEM + "\n\nCURRENT PLAYER STATE:\n" + context

    async def gen():
        collected = []
        try:
            async for delta in gemini_stream_text(system_msg, body.text):
                collected.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            logger.exception("architect stream failed")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
        full = "".join(collected)
        # persist
        await db.architect_messages.insert_many([
            {"id": str(uuid.uuid4()), "player_id": player["id"], "role": "user",
             "text": body.text, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "player_id": player["id"], "role": "architect",
             "text": full, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api.get("/architect/history")
async def architect_history(player=Depends(current_player), limit: int = 40):
    msgs = await db.architect_messages.find({"player_id": player["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    msgs.reverse()
    return msgs

@api.get("/architect/greeting")
async def architect_greeting(player=Depends(current_player)):
    """Static contextual greeting — no LLM cost on page load."""
    rank = rank_for_level(player["level"])
    active_bosses = await db.bosses.count_documents({"player_id": player["id"], "status": "ACTIVE"})
    streak = player.get("streak", 0)
    if streak == 0:
        line = "STREAK: 0. TODAY YOU IGNITE OR YOU DO NOT."
    elif streak < 3:
        line = f"STREAK: {streak}. FRAGILE. PROTECT IT."
    elif streak < 10:
        line = f"STREAK: {streak}. MOMENTUM DETECTED."
    else:
        line = f"STREAK: {streak}. DISCIPLINE COMPOUNDING."
    return {
        "text": f"{player['display_name']}. RANK {rank['code']} — {rank['name']}.",
        "detail": line,
        "recommendation": f"{active_bosses} ACTIVE BOSSES. BEGIN WITH ONE QUEST." if active_bosses else "OPEN QUEST BOARD."
    }

# ============================================================
# CINEMATIC EVENTS ENDPOINT — read/consume
# ============================================================
@api.post("/events/{event_id}/consume")
async def consume_event(event_id: str, player=Depends(current_player)):
    await db.events.update_one({"id": event_id, "player_id": player["id"]}, {"$set": {"consumed": True}})
    return {"ok": True}

# ============================================================
# SKILL MATRIX — computed from domain XP + completed quests
# ============================================================
SKILL_THRESHOLDS = [("LOCKED", 0), ("NOVICE", 25), ("TRAINED", 120), ("ADVANCED", 320), ("MASTERED", 800)]
SKILL_MAP = [
    # (id, name, domain, parent_id or None, tint)
    ("task-initiation",     "Task Initiation",     "DISCIPLINE",           None,                "cyan"),
    ("distraction-control", "Distraction Control", "DISCIPLINE",           "task-initiation",   "cyan"),
    ("deep-work",           "Deep Work",           "DISCIPLINE",           "distraction-control","cyan"),
    ("consistency",         "Consistency",         "DISCIPLINE",           None,                "cyan"),
    ("impulse-control",     "Impulse Control",     "DISCIPLINE",           "consistency",       "cyan"),
    ("execution",           "Execution",           "DISCIPLINE",           "impulse-control",   "cyan"),
    ("listening",           "Listening",           "COMMUNICATION",        None,                "amber"),
    ("clarity",             "Clarity",             "COMMUNICATION",        "listening",         "amber"),
    ("speaking",            "Speaking",            "COMMUNICATION",        "clarity",           "amber"),
    ("persuasion",          "Persuasion",          "COMMUNICATION",        "speaking",          "amber"),
    ("regulation",          "Regulation",          "EMOTIONAL_CONTROL",    None,                "red"),
    ("fear-management",     "Fear Management",     "EMOTIONAL_CONTROL",    "regulation",        "red"),
    ("reading",             "Reading",             "ACADEMICS",            None,                "cyan"),
    ("retention",           "Retention",           "ACADEMICS",            "reading",           "cyan"),
    ("deliberate-practice", "Deliberate Practice", "ACADEMICS",            "retention",         "cyan"),
    ("strength-base",       "Strength Base",       "PHYSICAL_DEVELOPMENT", None,                "amber"),
    ("endurance",           "Endurance",           "PHYSICAL_DEVELOPMENT", "strength-base",     "amber"),
    ("recovery-protocol",   "Recovery Protocol",   "RECOVERY",             None,                "cyan"),
    ("ideation",            "Ideation",            "CREATIVITY",           None,                "amber"),
    ("budgeting",           "Budgeting",           "FINANCIAL_CAPABILITY", None,                "amber"),
]

def skill_state(xp: int):
    state = "LOCKED"
    prog_pct = 0
    for i, (name, thr) in enumerate(SKILL_THRESHOLDS):
        if xp >= thr: state = name
    # progress toward next tier
    for i, (name, thr) in enumerate(SKILL_THRESHOLDS):
        nxt = SKILL_THRESHOLDS[i+1] if i+1 < len(SKILL_THRESHOLDS) else None
        if xp >= thr and (nxt is None or xp < nxt[1]):
            if nxt:
                prog_pct = min(1.0, (xp - thr) / (nxt[1] - thr))
            else:
                prog_pct = 1.0
            break
    return state, prog_pct

@api.get("/skills")
async def get_skills(player=Depends(current_player)):
    domains = player.get("domains", {})
    quests = await db.quests.find({"player_id": player["id"], "status": "COMPLETED"}, {"_id": 0}).to_list(500)
    # bonus xp per skill from quest keyword match
    kw = {s[0]: 0 for s in SKILL_MAP}
    for q in quests:
        title = (q.get("title","") + " " + q.get("description","")).lower()
        for sid, name, dom, parent, tint in SKILL_MAP:
            if sid.replace("-", " ") in title or name.lower() in title:
                kw[sid] += q.get("xp_reward", 0) // 2
    out = []
    for sid, name, dom, parent, tint in SKILL_MAP:
        base = domains.get(dom, 0)
        # spread domain xp softly across its children
        siblings = [s for s in SKILL_MAP if s[2] == dom]
        share = base / max(1, len(siblings))
        total = int(share + kw[sid])
        state, prog = skill_state(total)
        out.append({
            "id": sid, "name": name, "domain": dom, "parent": parent, "tint": tint,
            "xp": total, "state": state, "progress": prog
        })
    return out

# ============================================================
# TRIALS — high-level unlocked-by-real-progress challenges
# ============================================================
TRIALS = [
    {
        "id": "trial-of-discipline",
        "name": "TRIAL OF DISCIPLINE",
        "description": "Prove the pattern. The Monarch does not skip.",
        "reward_xp": 800,
        "reward_title": "IRONBOUND",
        "requires": {"streak": 3, "domain": {"DISCIPLINE": 150}, "boss_dmg": 0.20},
        "boss_key": "the-inconsistency",
    },
    {
        "id": "trial-of-focus",
        "name": "TRIAL OF FOCUS",
        "description": "Sustain attention until the noise dies. Ignite flow on command.",
        "reward_xp": 1000,
        "reward_title": "SILENT BLADE",
        "requires": {"stat": {"FOC": 12}, "quests_completed": 5},
        "boss_key": "the-distractor",
    },
    {
        "id": "trial-of-execution",
        "name": "TRIAL OF EXECUTION",
        "description": "Kill perfectionism. Ship imperfect. Ship anyway.",
        "reward_xp": 1200,
        "reward_title": "SHIPPER",
        "requires": {"level": 3, "domain": {"DISCIPLINE": 300}, "boss_dmg": 0.40},
        "boss_key": "the-perfectionist",
    },
    {
        "id": "trial-of-the-monarch",
        "name": "TRIAL OF THE MONARCH",
        "description": "Nine shadows have been faced. Now they are broken.",
        "reward_xp": 2500,
        "reward_title": "MONARCH ASPIRANT",
        "requires": {"level": 6, "bosses_defeated": 3},
        "boss_key": None,
    },
]

async def evaluate_trials(player: dict):
    bosses = await db.bosses.find({"player_id": player["id"]}, {"_id": 0}).to_list(50)
    boss_by_key = {b["boss_key"]: b for b in bosses}
    defeated_count = sum(1 for b in bosses if b["status"] == "DEFEATED")
    completed_count = await db.quests.count_documents({"player_id": player["id"], "status": "COMPLETED"})
    completed_trials = set((player.get("completed_trials") or []))

    out = []
    for t in TRIALS:
        req = t["requires"]
        checks = []
        met_all = True
        # streak
        if "streak" in req:
            v = player.get("streak", 0)
            ok = v >= req["streak"]
            met_all &= ok
            checks.append({"label": f"STREAK ≥ {req['streak']}", "value": f"{v}", "ok": ok})
        # level
        if "level" in req:
            ok = player["level"] >= req["level"]
            met_all &= ok
            checks.append({"label": f"LEVEL ≥ {req['level']}", "value": str(player["level"]), "ok": ok})
        # stat
        if "stat" in req:
            for s, need in req["stat"].items():
                v = player["stats"].get(s, 0)
                ok = v >= need
                met_all &= ok
                checks.append({"label": f"{s} ≥ {need}", "value": str(v), "ok": ok})
        # domain
        if "domain" in req:
            for d, need in req["domain"].items():
                v = player.get("domains", {}).get(d, 0)
                ok = v >= need
                met_all &= ok
                checks.append({"label": f"{d.replace('_',' ')} XP ≥ {need}", "value": str(v), "ok": ok})
        # quests_completed
        if "quests_completed" in req:
            ok = completed_count >= req["quests_completed"]
            met_all &= ok
            checks.append({"label": f"QUESTS ≥ {req['quests_completed']}", "value": str(completed_count), "ok": ok})
        # boss damage
        if "boss_dmg" in req and t.get("boss_key"):
            b = boss_by_key.get(t["boss_key"])
            if b:
                dmg = 1 - (b["resistance"] / b["max_resistance"])
                need = req["boss_dmg"]
                ok = dmg >= need
                met_all &= ok
                checks.append({"label": f"{b['name']} DAMAGE ≥ {int(need*100)}%", "value": f"{int(dmg*100)}%", "ok": ok})
            else:
                met_all = False
                checks.append({"label": "BOSS BOUND MISSING", "value": "", "ok": False})
        # bosses defeated
        if "bosses_defeated" in req:
            ok = defeated_count >= req["bosses_defeated"]
            met_all &= ok
            checks.append({"label": f"BOSSES DEFEATED ≥ {req['bosses_defeated']}", "value": str(defeated_count), "ok": ok})

        completed = t["id"] in completed_trials
        out.append({
            **t,
            "checks": checks,
            "unlocked": met_all,
            "completed": completed,
        })
    return out

@api.get("/trials")
async def list_trials(player=Depends(current_player)):
    return await evaluate_trials(player)

@api.post("/trials/{trial_id}/attempt")
async def attempt_trial(trial_id: str, player=Depends(current_player)):
    trials = await evaluate_trials(player)
    trial = next((t for t in trials if t["id"] == trial_id), None)
    if not trial:
        raise HTTPException(404, "Trial not found")
    if trial["completed"]:
        raise HTTPException(400, "Trial already conquered")
    if not trial["unlocked"]:
        raise HTTPException(400, "Prerequisites not met")

    xp_gain = trial["reward_xp"]
    p = player
    new_lifetime = p["lifetime_xp"] + xp_gain
    old_level = p["level"]
    new_level = level_from_xp(new_lifetime)
    old_rank = rank_for_level(old_level)
    new_rank = rank_for_level(new_level)
    titles = list(p.get("titles", []))
    title = trial["reward_title"]
    if title not in titles:
        titles.append(title)
    completed_trials = list(p.get("completed_trials", [])) + [trial_id]
    updates = {
        "xp": p["xp"] + xp_gain,
        "lifetime_xp": new_lifetime,
        "level": new_level,
        "titles": titles,
        "active_title": title,
        "completed_trials": completed_trials,
        "credits": p.get("credits", 0) + xp_gain // 10,
    }
    await db.players.update_one({"id": p["id"]}, {"$set": updates})

    event = {
        "id": str(uuid.uuid4()), "player_id": p["id"], "kind": "TRIAL_COMPLETE",
        "trial_id": trial_id, "xp_gain": xp_gain,
        "level_up": new_level > old_level, "rank_up": old_rank["code"] != new_rank["code"],
        "new_level": new_level, "new_rank": new_rank,
        "boss_result": None,
        "trial_name": trial["name"], "trial_title": title,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(event); event.pop("_id", None)
    return {
        "xp_gain": xp_gain,
        "level_up": new_level > old_level, "rank_up": old_rank["code"] != new_rank["code"],
        "old_level": old_level, "new_level": new_level,
        "old_rank": old_rank, "new_rank": new_rank,
        "trial": {"name": trial["name"], "title": title},
        "boss_result": None,
    }

# ============================================================
# REALITY SIMULATOR — projection engine
# ============================================================
class SimulatorIn(BaseModel):
    horizon_days: int = 30

def _project_trajectory(player: dict, multiplier: float, streak_bonus: float, horizon: int, days_active: int):
    lifetime = player["lifetime_xp"]
    daily = (lifetime / max(1, days_active)) * multiplier
    # streak bonus over horizon
    total_gain = daily * horizon * (1 + streak_bonus)
    projected = int(lifetime + total_gain)
    final_level = level_from_xp(projected)
    rank = rank_for_level(final_level)
    return {
        "daily_xp": int(daily),
        "projected_lifetime_xp": projected,
        "projected_level": final_level,
        "projected_rank": rank,
        "level_delta": final_level - player["level"],
        "gain": int(total_gain),
    }

@api.post("/simulator/project")
async def simulator_project(body: SimulatorIn, player=Depends(current_player)):
    created = player.get("created_at")
    try:
        dt = datetime.fromisoformat(created)
    except Exception:
        dt = datetime.now(timezone.utc)
    days_active = max(1, (datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc if dt.tzinfo is None else dt.tzinfo)).days + 1)
    horizon = max(7, min(365, body.horizon_days))
    trajectories = [
        {
            "id": "current", "name": "CURRENT TRAJECTORY", "tint": "cyan",
            "verdict": "You continue as you are. Momentum without evolution.",
            **_project_trajectory(player, 1.0, 0.0, horizon, days_active),
        },
        {
            "id": "disciplined", "name": "DISCIPLINED TRAJECTORY", "tint": "amber",
            "verdict": "You honour the daily minimum. Small edges compound.",
            **_project_trajectory(player, 1.6, 0.15, horizon, days_active),
        },
        {
            "id": "high_performance", "name": "HIGH-PERFORMANCE TRAJECTORY", "tint": "amber",
            "verdict": "You engage every main quest. Every boss loses ground.",
            **_project_trajectory(player, 2.4, 0.35, horizon, days_active),
        },
        {
            "id": "neglected", "name": "NEGLECTED TRAJECTORY", "tint": "red",
            "verdict": "You skip. You scroll. The Inconsistency wins.",
            **_project_trajectory(player, 0.2, -0.4, horizon, days_active),
        },
    ]
    return {
        "horizon_days": horizon,
        "days_active": days_active,
        "current_level": player["level"],
        "current_rank": rank_for_level(player["level"]),
        "trajectories": trajectories,
        "note": "Projections are estimates derived from your historical XP rate. Real outcomes depend on real action.",
    }

# ============================================================
# ADAPTIVE WAR ROOM — analytics + Architect verdict
# ============================================================
async def _drain_llm(chat, user_text: str) -> str:
    """Compatibility shim — now uses Gemini 2.5 Flash directly.
    `chat` is a tuple (system_message, _) preserved for legacy call-sites."""
    system_msg = chat[0] if isinstance(chat, tuple) else str(chat)
    return await gemini_drain(system_msg, user_text)

def _llm_chat(system_message: str, session_hint: str = ""):
    """Return an opaque handle carrying the system message for _drain_llm."""
    return (system_message, session_hint)

@api.get("/analytics")
async def analytics(player=Depends(current_player)):
    quests = await db.quests.find({"player_id": player["id"]}, {"_id": 0}).to_list(1000)
    completed = [q for q in quests if q["status"] == "COMPLETED"]
    active = [q for q in quests if q["status"] in ("AVAILABLE", "ACTIVE")]

    total = len(quests) or 1
    completion_rate = len(completed) / total
    # per-kind counts
    by_kind = {}
    for q in quests:
        k = q["kind"]
        by_kind.setdefault(k, {"total": 0, "completed": 0})
        by_kind[k]["total"] += 1
        if q["status"] == "COMPLETED": by_kind[k]["completed"] += 1
    # per-domain XP + completion
    by_domain = {}
    for q in quests:
        d = q.get("domain", "UNKNOWN")
        by_domain.setdefault(d, {"total": 0, "completed": 0, "xp": 0})
        by_domain[d]["total"] += 1
        if q["status"] == "COMPLETED":
            by_domain[d]["completed"] += 1
            by_domain[d]["xp"] += q.get("xp_reward", 0)
    # last 7 days XP
    today = datetime.now(timezone.utc).date()
    daily_xp = { (today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1) }
    for q in completed:
        try:
            d = datetime.fromisoformat(q["completed_at"]).date().isoformat()
            if d in daily_xp: daily_xp[d] += q.get("xp_reward", 0)
        except Exception:
            pass
    # top drop-off domain
    drop = sorted(
        [(d, v) for d, v in by_domain.items() if v["total"] >= 2],
        key=lambda x: (x[1]["completed"] / x[1]["total"], -x[1]["total"])
    )
    dropoff = None
    if drop:
        d, v = drop[0]
        dropoff = {"domain": d, "rate": v["completed"]/v["total"], "total": v["total"], "completed": v["completed"]}
    # dominant difficulty completed
    difficulty_counts = {}
    for q in completed:
        difficulty_counts[q["difficulty"]] = difficulty_counts.get(q["difficulty"], 0) + 1
    return {
        "completion_rate": completion_rate,
        "total_quests": len(quests),
        "completed_quests": len(completed),
        "active_quests": len(active),
        "by_kind": by_kind,
        "by_domain": by_domain,
        "daily_xp": [{"date": d, "xp": v} for d, v in daily_xp.items()],
        "dropoff": dropoff,
        "difficulty_counts": difficulty_counts,
        "streak": player.get("streak", 0),
        "lifetime_xp": player["lifetime_xp"],
    }

@api.post("/analytics/verdict")
async def analytics_verdict(player=Depends(current_player)):
    a = await analytics(player=player)
    ctx = f"""Player {player['display_name']} Rank {rank_for_level(player['level'])['code']} Level {player['level']}.
Completion rate: {int(a['completion_rate']*100)}% ({a['completed_quests']}/{a['total_quests']})
Streak: {a['streak']} days
Drop-off domain: {a['dropoff']['domain'] if a['dropoff'] else 'none'} ({int((a['dropoff']['rate'] if a['dropoff'] else 1)*100)}%)
Difficulty distribution: {a['difficulty_counts']}
Last 7 days XP: {[d['xp'] for d in a['daily_xp']]}
"""
    chat = _llm_chat(ARCHITECT_SYSTEM + "\nOutput format: 4 lines maximum. Diagnosis then command. No preface.",
                     f"war-{player['id']}")
    try:
        text = await _drain_llm(chat, "DIAGNOSTIC REQUEST:\n" + ctx + "\nDeliver diagnosis and one difficulty tuning command.")
    except Exception as e:
        logger.exception("war room verdict failed")
        text = "// SIGNAL LOSS — retry."
    return {"verdict": text, "context": a}

# ============================================================
# HALL OF ASCENSION — trophies
# ============================================================
@api.get("/trophies")
async def trophies(player=Depends(current_player)):
    defeated_bosses = await db.bosses.find({"player_id": player["id"], "status": "DEFEATED"}, {"_id": 0}).sort("defeated_at", -1).to_list(50)
    completed_trials_ids = set(player.get("completed_trials") or [])
    trial_trophies = []
    for t in TRIALS:
        if t["id"] in completed_trials_ids:
            # find when
            evt = await db.events.find_one({"player_id": player["id"], "kind": "TRIAL_COMPLETE", "trial_id": t["id"]}, {"_id": 0})
            trial_trophies.append({
                "id": t["id"], "name": t["name"], "kind": "TRIAL",
                "title_awarded": t["reward_title"], "xp": t["reward_xp"],
                "at": evt["created_at"] if evt else None,
            })
    boss_trophies = [{
        "id": b["id"], "name": b["name"], "kind": "BOSS",
        "domain": b["domain"], "phases": b["phases"],
        "at": b.get("defeated_at"),
    } for b in defeated_bosses]
    # rank promotions from events
    rank_events = await db.events.find({"player_id": player["id"], "rank_up": True}, {"_id": 0}).sort("created_at", -1).to_list(20)
    ranks = [{"id": e["id"], "name": f"RANK {e['new_rank']['code']} — {e['new_rank']['name']}", "kind": "RANK",
              "level": e["new_level"], "at": e["created_at"]} for e in rank_events]
    return {
        "counts": {"bosses": len(boss_trophies), "trials": len(trial_trophies), "ranks": len(ranks)},
        "bosses": boss_trophies,
        "trials": trial_trophies,
        "ranks": ranks,
    }

# ============================================================
# EVOLUTION LAB — Architect-forged campaigns
# ============================================================
class CampaignForgeIn(BaseModel):
    boss_key: str
    days: int = 3
    focus: Optional[str] = None

@api.post("/campaigns/forge")
async def forge_campaign(body: CampaignForgeIn, player=Depends(current_player)):
    if body.days < 2 or body.days > 14:
        raise HTTPException(400, "Campaign duration must be 2-14 days")
    boss = await db.bosses.find_one({"player_id": player["id"], "boss_key": body.boss_key}, {"_id": 0})
    if not boss:
        raise HTTPException(404, "Boss not found for player")

    total_quests = body.days * 2  # 2 per day (1 MAIN + 1 SUPPORT)
    prompt = f"""Forge a {body.days}-day campaign to defeat {boss['name']} ({boss['description']}) in domain {boss['domain']}.
Player focus: {body.focus or 'general discipline'}.
Output STRICT JSON array of exactly {total_quests} quests. Alternate MAIN and SUPPORT starting with MAIN.
Each quest object schema:
{{"title": string (short, action-oriented, <60 chars),
  "description": string (single sentence, concrete measurable action, <180 chars),
  "kind": "MAIN" | "SUPPORT",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "duration_min": integer 10-90,
  "trained_stats": array of 1-3 from ["STR","AGI","INT","FOC","MEM","CHA","PER","STA"]}}
No prose. No markdown. JSON array only."""
    chat = _llm_chat("You are AXIOM Campaign Forger. Output only valid JSON.",
                     f"lab-{player['id']}-{uuid.uuid4().hex[:6]}")
    try:
        raw = await _drain_llm(chat, prompt)
    except Exception as e:
        logger.exception("campaign forge llm error")
        raise HTTPException(502, f"Architect signal lost: {e}")
    # find JSON array in response
    start = raw.find("["); end = raw.rfind("]")
    if start == -1 or end == -1:
        raise HTTPException(502, "Campaign JSON not returned")
    try:
        arr = json.loads(raw[start:end+1])
    except Exception:
        raise HTTPException(502, "Malformed campaign JSON")

    quest_docs = []
    campaign_id = str(uuid.uuid4())
    for q in arr[:total_quests]:
        kind = q.get("kind", "MAIN") if q.get("kind") in ("MAIN", "SUPPORT") else "MAIN"
        diff = q.get("difficulty", "MEDIUM") if q.get("difficulty") in ("EASY","MEDIUM","HARD") else "MEDIUM"
        stats = [s for s in (q.get("trained_stats") or []) if s in STATS_KEYS][:3]
        doc = {
            "id": str(uuid.uuid4()),
            "player_id": player["id"],
            "title": (q.get("title") or "Unnamed quest")[:80],
            "description": (q.get("description") or "")[:220],
            "kind": kind,
            "difficulty": diff,
            "domain": boss["domain"],
            "duration_min": max(5, min(120, int(q.get("duration_min", 25)))),
            "trained_stats": stats,
            "xp_reward": XP_BY_KIND_DIFFICULTY[kind][diff],
            "boss_key": body.boss_key,
            "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "evidence": None,
            "is_daily": True,
            "campaign_id": campaign_id,
        }
        quest_docs.append(doc)
    if not quest_docs:
        raise HTTPException(502, "Empty campaign forge")
    await db.quests.insert_many(quest_docs)
    campaign = {
        "id": campaign_id,
        "player_id": player["id"],
        "boss_key": body.boss_key,
        "boss_name": boss["name"],
        "days": body.days,
        "focus": body.focus,
        "quest_count": len(quest_docs),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    for q in quest_docs: q.pop("_id", None)
    return {"campaign": campaign, "quests": quest_docs}

@api.get("/campaigns")
async def list_campaigns(player=Depends(current_player)):
    campaigns = await db.campaigns.find({"player_id": player["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # compute progress
    for c in campaigns:
        qs = await db.quests.find({"player_id": player["id"], "campaign_id": c["id"]}, {"_id": 0}).to_list(200)
        done = sum(1 for q in qs if q["status"] == "COMPLETED")
        c["completed"] = done
        c["total"] = len(qs)
    return campaigns

# ============================================================
# ONBOARDING RITUAL
# ============================================================
class OnboardingIn(BaseModel):
    prime_objective: str
    focus_area: str  # domain

@api.post("/onboarding/complete")
async def complete_onboarding(body: OnboardingIn, player=Depends(current_player)):
    if player.get("onboarded"):
        return {"already": True}
    domain = body.focus_area if body.focus_area in DOMAINS else "DISCIPLINE"
    prompt = f"""Player {player['display_name']}, Rank E — SPARK, prime objective: "{body.prime_objective}", focus: {domain}.
Forge exactly 3 STARTER quests that immediately begin real-world action toward this objective today.
Output STRICT JSON array. Schema per quest:
{{"title": short action-oriented string (<60 chars),
  "description": single-sentence concrete instruction (<160 chars),
  "kind": one of "MAIN" | "SUPPORT" | "MICRO",
  "difficulty": one of "EASY" | "MEDIUM",
  "duration_min": integer 5-45,
  "trained_stats": 1-2 from ["STR","AGI","INT","FOC","MEM","CHA","PER","STA"]}}
Order: MAIN, SUPPORT, MICRO. No prose. JSON only."""
    chat = _llm_chat("You are AXIOM Onboarding Forger. Output only valid JSON.",
                     f"onb-{player['id']}")
    docs = []
    try:
        raw = await _drain_llm(chat, prompt)
        s = raw.find("["); e = raw.rfind("]")
        arr = json.loads(raw[s:e+1]) if s != -1 else []
        for q in arr[:3]:
            kind = q.get("kind", "MICRO") if q.get("kind") in ("MAIN","SUPPORT","MICRO") else "MICRO"
            diff = q.get("difficulty", "EASY") if q.get("difficulty") in ("EASY","MEDIUM") else "EASY"
            stats = [s for s in (q.get("trained_stats") or []) if s in STATS_KEYS][:2] or ["FOC"]
            docs.append({
                "id": str(uuid.uuid4()), "player_id": player["id"],
                "title": (q.get("title") or "Begin now")[:80],
                "description": (q.get("description") or "Take the first micro-action toward your objective.")[:200],
                "kind": kind, "difficulty": diff, "domain": domain,
                "duration_min": max(5, min(60, int(q.get("duration_min", 15)))),
                "trained_stats": stats,
                "xp_reward": XP_BY_KIND_DIFFICULTY[kind][diff],
                "boss_key": None,
                "status": "AVAILABLE",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None, "evidence": None, "is_daily": True,
                "onboarding": True,
            })
    except Exception:
        logger.exception("onboarding forge failed — using fallback")

    if not docs:
        # fallback deterministic 3 quests
        docs = [
            {"kind":"MAIN","difficulty":"MEDIUM","dur":25,"title":"First Deep Work Block","desc":f"25 min of focused action on: {body.prime_objective}","stats":["FOC","STA"]},
            {"kind":"SUPPORT","difficulty":"EASY","dur":10,"title":"Objective Journal","desc":"Write in one line what \"done\" looks like for your prime objective.","stats":["INT"]},
            {"kind":"MICRO","difficulty":"EASY","dur":5,"title":"Environment Prep","desc":"Remove one distraction from your workspace right now.","stats":["FOC"]},
        ]
        docs = [{
            "id": str(uuid.uuid4()), "player_id": player["id"],
            "title": d["title"], "description": d["desc"],
            "kind": d["kind"], "difficulty": d["difficulty"], "domain": domain,
            "duration_min": d["dur"], "trained_stats": d["stats"],
            "xp_reward": XP_BY_KIND_DIFFICULTY[d["kind"]][d["difficulty"]],
            "boss_key": None, "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None, "evidence": None, "is_daily": True, "onboarding": True,
        } for d in docs]
    await db.quests.insert_many(docs)
    await db.players.update_one({"id": player["id"]}, {"$set": {
        "onboarded": True,
        "prime_objective": body.prime_objective,
        "focus_area": domain,
    }})
    for d in docs: d.pop("_id", None)
    return {"quests": docs, "onboarded": True}

# ============================================================
# BOSS DEEP-DIVE — dossier + Architect counter-strategy
# ============================================================
@api.get("/bosses/{boss_key}/dossier")
async def boss_dossier(boss_key: str, player=Depends(current_player)):
    boss = await db.bosses.find_one({"player_id": player["id"], "boss_key": boss_key}, {"_id": 0})
    if not boss:
        raise HTTPException(404, "Boss not found")
    linked = await db.quests.find({"player_id": player["id"], "boss_key": boss_key}, {"_id": 0}).sort("created_at", -1).to_list(200)
    events = await db.events.find({"player_id": player["id"], "boss_result.boss_key": boss_key}, {"_id": 0}).sort("created_at", -1).to_list(50)
    total_damage = sum(e.get("boss_result", {}).get("damage", 0) for e in events)
    contributing_quests = [q for q in linked if q["status"] == "COMPLETED"]
    return {
        "boss": boss,
        "linked_quests": linked,
        "contributing_quests": contributing_quests,
        "damage_events": events,
        "total_damage_dealt": total_damage,
        "damage_pct": (boss["max_resistance"] - boss["resistance"]) / boss["max_resistance"] if boss["max_resistance"] else 0,
    }

@api.post("/bosses/{boss_key}/strategy")
async def boss_strategy(boss_key: str, player=Depends(current_player)):
    d = await boss_dossier(boss_key, player=player)
    b = d["boss"]
    ctx = f"""BOSS: {b['name']}
DOMAIN: {b['domain']}
NARRATIVE: {b['description']}
RESISTANCE: {b['resistance']}/{b['max_resistance']} ({int(d['damage_pct']*100)}% eroded)
PHASE: {b['current_phase']}/{b['phases']}
CONTRIBUTING QUESTS: {len(d['contributing_quests'])}
PLAYER RANK: {rank_for_level(player['level'])['code']} LEVEL {player['level']}
PLAYER STATS: {player['stats']}
"""
    chat = _llm_chat(ARCHITECT_SYSTEM + "\nOutput format: 5-7 lines maximum. Deliver diagnosis, counter-pattern, then ONE concrete quest command with duration.",
                     f"strat-{player['id']}-{boss_key}")
    try:
        text = await _drain_llm(chat, "STRATEGIC UPLINK — deliver counter-strategy for this boss:\n" + ctx)
    except Exception as e:
        logger.exception("boss strategy failed")
        text = "// SIGNAL LOSS. Retry."
    return {"strategy": text}

# ============================================================
# WEEKLY REVIEW — Sunday ritual
# ============================================================
@api.get("/weekly-review")
async def weekly_review_data(player=Depends(current_player)):
    seven_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    events = await db.events.find({"player_id": player["id"], "created_at": {"$gte": seven_ago}}, {"_id": 0}).to_list(500)
    quests = await db.quests.find({"player_id": player["id"], "status": "COMPLETED",
                                   "completed_at": {"$gte": seven_ago}}, {"_id": 0}).to_list(500)
    xp_week = sum(e.get("xp_gain", 0) for e in events)
    by_domain = {}
    for q in quests:
        d = q.get("domain", "UNKNOWN")
        by_domain[d] = by_domain.get(d, 0) + q.get("xp_reward", 0)
    strongest = max(by_domain.items(), key=lambda x: x[1])[0] if by_domain else None
    weakest = min(by_domain.items(), key=lambda x: x[1])[0] if by_domain else None
    boss_hits = [e for e in events if e.get("boss_result")]
    return {
        "xp_earned": xp_week,
        "quests_completed": len(quests),
        "level_ups": sum(1 for e in events if e.get("level_up")),
        "rank_ups": sum(1 for e in events if e.get("rank_up")),
        "boss_hits": len(boss_hits),
        "by_domain": by_domain,
        "strongest_domain": strongest,
        "weakest_domain": weakest,
        "streak": player.get("streak", 0),
        "prime_objective": player.get("prime_objective"),
    }

@api.post("/weekly-review/generate")
async def weekly_review_generate(player=Depends(current_player)):
    d = await weekly_review_data(player=player)
    ctx = f"""WEEKLY REVIEW REQUEST — {player['display_name']}
XP EARNED (7d): {d['xp_earned']}
QUESTS COMPLETED: {d['quests_completed']}
LEVEL UPS: {d['level_ups']}  RANK UPS: {d['rank_ups']}
BOSS HITS: {d['boss_hits']}
STRONGEST DOMAIN: {d['strongest_domain']}
WEAKEST DOMAIN: {d['weakest_domain']}
STREAK: {d['streak']} days
STANDING PRIME OBJECTIVE: {d.get('prime_objective') or 'unset'}
"""
    chat = _llm_chat(ARCHITECT_SYSTEM + "\nOutput exactly this structure, no extra prose:\n// SUMMARY\n(1-2 lines)\n// STRONGEST\n(1 line)\n// WEAKEST\n(1 line)\n// NEXT WEEK OBJECTIVE\n(a single concrete one-sentence objective)\n// FIRST COMMAND\n(a single actionable 5-15 minute micro-quest)",
                     f"weekly-{player['id']}")
    try:
        text = await _drain_llm(chat, ctx)
    except Exception as e:
        logger.exception("weekly review llm failed")
        text = "// SIGNAL LOSS."
    # persist as an architect memo
    await db.architect_messages.insert_one({
        "id": str(uuid.uuid4()), "player_id": player["id"], "role": "architect",
        "text": "WEEKLY REVIEW\n" + text, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"review": text, "data": d}

# ============================================================
# MONARCH GUILD — 2-player shared boss damage
# ============================================================
def _guild_code() -> str:
    import random, string
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

@api.post("/guild/create")
async def guild_create(player=Depends(current_player)):
    if player.get("guild_id"):
        raise HTTPException(400, "Already in a guild")
    code = _guild_code()
    guild = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": f"MONARCH GUILD · {code}",
        "leader_id": player["id"],
        "member_ids": [player["id"]],
        "max_members": 2,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.guilds.insert_one(guild)
    await db.players.update_one({"id": player["id"]}, {"$set": {"guild_id": guild["id"]}})
    guild.pop("_id", None)
    return guild

class GuildJoinIn(BaseModel):
    code: str

@api.post("/guild/join")
async def guild_join(body: GuildJoinIn, player=Depends(current_player)):
    if player.get("guild_id"):
        raise HTTPException(400, "Already in a guild")
    guild = await db.guilds.find_one({"code": body.code.upper()}, {"_id": 0})
    if not guild:
        raise HTTPException(404, "Guild code invalid")
    if len(guild["member_ids"]) >= guild["max_members"]:
        raise HTTPException(400, "Guild is full")
    await db.guilds.update_one({"id": guild["id"]}, {"$push": {"member_ids": player["id"]}})
    await db.players.update_one({"id": player["id"]}, {"$set": {"guild_id": guild["id"]}})
    return {"joined": True, "guild_id": guild["id"]}

@api.post("/guild/leave")
async def guild_leave(player=Depends(current_player)):
    gid = player.get("guild_id")
    if not gid:
        raise HTTPException(400, "Not in a guild")
    await db.guilds.update_one({"id": gid}, {"$pull": {"member_ids": player["id"]}})
    await db.players.update_one({"id": player["id"]}, {"$set": {"guild_id": None}})
    # cleanup empty guilds
    g = await db.guilds.find_one({"id": gid})
    if g and not g.get("member_ids"):
        await db.guilds.delete_one({"id": gid})
    return {"left": True}

@api.get("/guild/me")
async def guild_me(player=Depends(current_player)):
    gid = player.get("guild_id")
    if not gid:
        return {"guild": None}
    guild = await db.guilds.find_one({"id": gid}, {"_id": 0})
    if not guild:
        return {"guild": None}
    members = await db.players.find({"id": {"$in": guild["member_ids"]}}, {"_id": 0}).to_list(10)
    # shared boss ledger — sum max_resistance - resistance across members
    shared = {}
    for m in members:
        mb = await db.bosses.find({"player_id": m["id"]}, {"_id": 0}).to_list(50)
        for b in mb:
            shared.setdefault(b["boss_key"], {"name": b["name"], "domain": b["domain"],
                                              "max_resistance": b["max_resistance"],
                                              "total_resistance": 0, "defeated_all": True})
            shared[b["boss_key"]]["total_resistance"] += b["resistance"]
            if b["status"] != "DEFEATED":
                shared[b["boss_key"]]["defeated_all"] = False
    guild_bosses = []
    for key, s in shared.items():
        total_max = s["max_resistance"] * len(members)
        eroded = total_max - s["total_resistance"]
        guild_bosses.append({
            "boss_key": key, "name": s["name"], "domain": s["domain"],
            "total_max": total_max, "eroded": eroded,
            "pct": eroded / total_max if total_max else 0,
            "defeated_all": s["defeated_all"],
        })
    guild_bosses.sort(key=lambda x: -x["pct"])
    return {
        "guild": guild,
        "members": [{"id": m["id"], "display_name": m["display_name"], "level": m["level"],
                     "rank": rank_for_level(m["level"]), "streak": m.get("streak",0),
                     "lifetime_xp": m["lifetime_xp"]} for m in members],
        "guild_bosses": guild_bosses,
    }

# ============================================================
# ACHIEVEMENTS
# ============================================================
ACHIEVEMENTS = [
    {"id": "first-quest",   "name": "FIRST BLOOD",      "desc": "Complete your first quest.",           "tint": "cyan"},
    {"id": "hunter-10",     "name": "HUNTER",           "desc": "Complete 10 quests.",                   "tint": "cyan"},
    {"id": "wolf-25",       "name": "WOLF",             "desc": "Complete 25 quests.",                   "tint": "cyan"},
    {"id": "iron-will-3",   "name": "IRON WILL",        "desc": "Hold a 3-day streak.",                 "tint": "amber"},
    {"id": "unbroken-7",    "name": "UNBROKEN",         "desc": "Hold a 7-day streak.",                 "tint": "amber"},
    {"id": "shadow-strike", "name": "SHADOW STRIKE",    "desc": "Land damage on any boss.",             "tint": "red"},
    {"id": "boss-slayer",   "name": "SHADOW SLAYER",    "desc": "Defeat your first boss.",              "tint": "red"},
    {"id": "riser",         "name": "RISER",            "desc": "Ascend to Rank D.",                    "tint": "amber"},
    {"id": "level-5",       "name": "IGNITED",          "desc": "Reach Level 5.",                       "tint": "cyan"},
    {"id": "level-10",      "name": "ASCENDING",        "desc": "Reach Level 10.",                      "tint": "cyan"},
    {"id": "level-25",      "name": "HARDENED",         "desc": "Reach Level 25.",                      "tint": "amber"},
    {"id": "forger",        "name": "FORGER",           "desc": "Forge a custom quest.",                "tint": "cyan"},
    {"id": "trial-first",   "name": "TRIAL WALKER",     "desc": "Conquer your first Monarch Trial.",    "tint": "amber"},
]

async def evaluate_achievements(player_id: str) -> list:
    """Check which achievements a player just earned. Returns list of newly-awarded achievement dicts."""
    p = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not p: return []
    earned = set(p.get("achievements", []))
    completed_count = await db.quests.count_documents({"player_id": player_id, "status": "COMPLETED"})
    custom_quests = await db.quests.count_documents({"player_id": player_id, "onboarding": {"$exists": False}, "campaign_id": {"$exists": False}, "is_daily": True})
    defeated_bosses = await db.bosses.count_documents({"player_id": player_id, "status": "DEFEATED"})
    any_boss_hit = await db.bosses.count_documents({"player_id": player_id, "resistance": {"$lt": 999999}})  # dummy check
    # count boss damage events for shadow-strike
    any_damage = await db.events.count_documents({"player_id": player_id, "boss_result": {"$ne": None}})
    trials_done = len(p.get("completed_trials") or [])
    checks = {
        "first-quest":   completed_count >= 1,
        "hunter-10":     completed_count >= 10,
        "wolf-25":       completed_count >= 25,
        "iron-will-3":   p.get("streak", 0) >= 3,
        "unbroken-7":    p.get("streak", 0) >= 7,
        "shadow-strike": any_damage >= 1,
        "boss-slayer":   defeated_bosses >= 1,
        "riser":         p.get("level", 1) >= 11,
        "level-5":       p.get("level", 1) >= 5,
        "level-10":      p.get("level", 1) >= 10,
        "level-25":      p.get("level", 1) >= 25,
        "forger":        custom_quests >= 12,  # 10 seed + 2 custom
        "trial-first":   trials_done >= 1,
    }
    new_ids = [aid for aid, ok in checks.items() if ok and aid not in earned]
    if new_ids:
        await db.players.update_one({"id": player_id}, {"$addToSet": {"achievements": {"$each": new_ids}}})
    lookup = {a["id"]: a for a in ACHIEVEMENTS}
    return [lookup[a] for a in new_ids if a in lookup]

@api.get("/achievements")
async def list_achievements(player=Depends(current_player)):
    earned = set(player.get("achievements", []))
    return [{**a, "earned": a["id"] in earned} for a in ACHIEVEMENTS]

@api.post("/player/avatar")
async def set_avatar(body: Dict[str, str], player=Depends(current_player)):
    url = body.get("avatar_url", "")
    if url and len(url) > 800_000:
        raise HTTPException(413, "Avatar too large (max ~600KB base64)")
    await db.players.update_one({"id": player["id"]}, {"$set": {"avatar_url": url or None}})
    return {"ok": True}
SHIELD_BASE_COST = 40  # credits per shield

def shield_cost(current_shields: int) -> int:
    return SHIELD_BASE_COST + max(0, current_shields) * 20

@api.get("/store")
async def store(player=Depends(current_player)):
    return {
        "credits": player.get("credits", 0),
        "streak_shields": player.get("streak_shields", 0),
        "shield_cost": shield_cost(player.get("streak_shields", 0)),
        "shield_max": 5,
    }

@api.post("/store/buy-shield")
async def buy_shield(player=Depends(current_player)):
    shields = player.get("streak_shields", 0)
    if shields >= 5:
        raise HTTPException(400, "Shield capacity reached")
    cost = shield_cost(shields)
    credits = player.get("credits", 0)
    if credits < cost:
        raise HTTPException(400, f"Insufficient credits ({credits}/{cost})")
    await db.players.update_one({"id": player["id"]}, {"$set": {
        "credits": credits - cost,
        "streak_shields": shields + 1,
    }})
    return {
        "credits": credits - cost,
        "streak_shields": shields + 1,
        "shield_cost": shield_cost(shields + 1),
        "purchased": True,
    }

# ============================================================
# BOOTSTRAP
# ============================================================
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup():
    await db.players.create_index("email", unique=True)
    await db.players.create_index("id", unique=True)
    await db.quests.create_index([("player_id", 1), ("status", 1)])
    await db.bosses.create_index([("player_id", 1), ("boss_key", 1)])
    await db.events.create_index([("player_id", 1), ("created_at", -1)])
    logger.info("AXIOM MONARCH SYSTEM ONLINE")

@app.on_event("shutdown")
async def _shutdown():
    client.close()
