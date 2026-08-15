import React, { useEffect, useState } from "react";
import { questEngine } from "@/engine/questEngine";
import { bossEngine } from "@/engine/bossEngine";
import { usePlayer } from "@/state/PlayerContext";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { Check, Clock, Sparkles, Skull, Plus, X } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import { QUEST_ART } from "@/services/assets/registry";

const KINDS = ["MAIN", "SUPPORT", "MICRO", "CHALLENGE"];
const DIFFS = ["TRIVIAL", "EASY", "MEDIUM", "HARD", "EXTREME"];
const DOMAINS = ["DISCIPLINE","COMMUNICATION","EMOTIONAL_CONTROL","ACADEMICS","FINANCIAL_CAPABILITY","CREATIVITY","SPIRITUAL_DEVELOPMENT","PHYSICAL_DEVELOPMENT","RECOVERY","STRATEGY","EXECUTION","FOCUS"];
const STAT_KEYS = ["STR","AGI","INT","FOC","MEM","CHA","PER","STA"];

function CreateQuestPanel({ onCreated, bosses }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", kind: "MICRO", difficulty: "MEDIUM",
    domain: "DISCIPLINE", duration_min: 20, trained_stats: [], boss_id: ""
  });
  const toggleStat = (s) => setForm(f => ({...f, trained_stats: f.trained_stats.includes(s) ? f.trained_stats.filter(x=>x!==s) : [...f.trained_stats, s] }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); sound.ui();
    try {
      await questEngine.create({ ...form, boss_id: form.boss_id || null });
      toast.success("QUEST FORGED");
      sound.questAccepted();
      setOpen(false); setForm({ title: "", description: "", kind: "MICRO", difficulty: "MEDIUM", domain: "DISCIPLINE", duration_min: 20, trained_stats: [], boss_id: "" });
      onCreated?.();
    } catch (err) { toast.error(err?.response?.data?.detail || "FORGE FAILED"); }
    finally { setBusy(false); }
  };
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); sound.ui(); }}
        className="hud-panel p-4 flex items-center justify-center gap-2 border-dashed hover:border-[#00F0FF] hover:bg-[#00F0FF]/5 transition-colors font-display tracking-[0.25em] text-sm text-[#00F0FF] w-full"
        data-testid="btn-open-create-quest">
        <Plus size={16} strokeWidth={1.5}/> FORGE NEW QUEST
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="hud-panel p-5 scanline" data-testid="create-quest-form">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000]">// QUEST FORGE</div>
          <div className="font-display text-xl text-[#EAEAEA]">CRAFT A CUSTOM MISSION</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-[#8A8A93] hover:text-[#FF2A2A]" data-testid="btn-close-create-quest"><X size={18} strokeWidth={1.5}/></button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">TITLE</label>
          <input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-heading focus:outline-none focus:border-[#00F0FF]"
            data-testid="cq-title"/>
        </div>
        <div className="col-span-2">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">DESCRIPTION</label>
          <textarea required rows={2} value={form.description} onChange={e=>setForm({...form, description:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-heading focus:outline-none focus:border-[#00F0FF]"
            data-testid="cq-desc"/>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">KIND</label>
          <select value={form.kind} onChange={e=>setForm({...form, kind:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]"
            data-testid="cq-kind">
            {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">DIFFICULTY</label>
          <select value={form.difficulty} onChange={e=>setForm({...form, difficulty:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]"
            data-testid="cq-diff">
            {DIFFS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">DOMAIN</label>
          <select value={form.domain} onChange={e=>setForm({...form, domain:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]">
            {DOMAINS.map(k => <option key={k} value={k}>{k.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">DURATION (MIN)</label>
          <input type="number" min={1} max={480} value={form.duration_min} onChange={e=>setForm({...form, duration_min: parseInt(e.target.value)||10})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]"/>
        </div>
        <div className="col-span-2">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">TRAINED STATS</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {STAT_KEYS.map(s => (
              <button type="button" key={s} onClick={()=>toggleStat(s)}
                className={`px-2 py-1 text-[10px] font-mono border clip-tech ${form.trained_stats.includes(s) ? "border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10" : "border-white/15 text-[#8A8A93]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">LINK TO BOSS (OPTIONAL)</label>
          <select value={form.boss_id} onChange={e=>setForm({...form, boss_id:e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]">
            <option value="">— NONE —</option>
            {bosses.map(b => <option key={b.boss_key} value={b.boss_key}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <button disabled={busy} className="w-full py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em] disabled:opacity-40" data-testid="cq-submit">
        {busy ? "FORGING..." : "FORGE QUEST"}
      </button>
    </form>
  );
}

const kindColor = {
  MAIN: "text-[#FFB000] border-[#FFB000]/40",
  SUPPORT: "text-[#00F0FF] border-[#00F0FF]/40",
  MICRO: "text-[#EAEAEA] border-white/20",
  CHALLENGE: "text-[#FF2A2A] border-[#FF2A2A]/40",
  BOSS: "text-[#FF2A2A] border-[#FF2A2A]/60",
  SECRET: "text-[#00F0FF] border-[#00F0FF]/60",
};

const kindGlow = {
  MAIN: "#FFB000", SUPPORT: "#00F0FF", MICRO: "#EAEAEA",
  CHALLENGE: "#FF2A2A", BOSS: "#FF2A2A", SECRET: "#00F0FF",
};

export function QuestCard({ q, onComplete, dense = false }) {
  const [busy, setBusy] = useState(false);
  const done = q.status === "COMPLETED";
  const glow = kindGlow[q.kind] || "#00F0FF";
  useEffect(() => {
    if (q.kind === "SECRET" && !done) sound.secretQuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id, q.kind]);
  const complete = async () => {
    if (done || busy) return;
    setBusy(true);
    try { await onComplete(q); } finally { setBusy(false); }
  };
  return (
    <div className={`hud-panel p-4 relative ${done ? "opacity-40" : ""} transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00F0FF]/50`} data-testid={`quest-card-${q.id}`}>
      <div className="flex items-start gap-3 mb-2">
        {QUEST_ART[q.kind] && (
          <div
            className="w-16 h-16 relative flex-shrink-0 clip-tech border overflow-hidden bg-black/60"
            style={{
              borderColor: `${glow}66`,
              boxShadow: done ? "none" : `0 0 14px ${glow}44, inset 0 0 18px ${glow}22`,
            }}
          >
            <AxiomArt src={QUEST_ART[q.kind]} alt={q.kind} className="absolute inset-0 w-full h-full" fit="cover" />
            <div className="absolute inset-0 pointer-events-none" style={{background: `radial-gradient(circle at 50% 40%, transparent 40%, ${glow}22 100%)`}}/>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] flex-wrap">
            <span className={`px-2 py-0.5 border ${kindColor[q.kind] || ""} clip-tech`}>{q.kind}</span>
            <span className="text-[#8A8A93]">{q.difficulty}</span>
            <span className="text-[#8A8A93] ml-auto flex items-center gap-1"><Clock size={11} strokeWidth={1.5}/>{q.duration_min}m</span>
          </div>
          <h3 className="font-heading text-lg text-[#EAEAEA] mt-1 uppercase tracking-wide">{q.title}</h3>
        </div>
      </div>
      {!dense && <p className="font-heading text-sm text-[#8A8A93] mb-3">{q.description}</p>}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <div className="font-mono text-xs">
          <span className="text-[#8A8A93]">XP </span>
          <span className="text-[#FFB000] text-glow-amber">+{q.xp_reward}</span>
        </div>
        {q.trained_stats?.length > 0 && (
          <div className="font-mono text-[10px] text-[#00F0FF]">{q.trained_stats.join(" · ")}</div>
        )}
        {q.boss_key && (
          <div className="font-mono text-[10px] text-[#FF2A2A] flex items-center gap-1"><Skull size={11} strokeWidth={1.5}/>{q.boss_key}</div>
        )}
        <button
          disabled={done || busy}
          onClick={complete}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.25em] disabled:opacity-40"
          data-testid={`btn-complete-${q.id}`}
        >
          {done ? <><Check size={12}/> DONE</> : <><Sparkles size={12}/> COMPLETE</>}
        </button>
      </div>
    </div>
  );
}

export const useCompleteQuest = () => {
  const { triggerEvent, refresh } = usePlayer();
  return async (q) => {
    try {
      const data = await questEngine.complete(q.id);
      toast.success(`+${data.xp_gain} XP`);
      triggerEvent(data);
      // refresh handled after overlay closes
      return data;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "COMPLETION DENIED");
    }
  };
};

export default function QuestBoard() {
  const [quests, setQuests] = useState([]);
  const [bosses, setBosses] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const complete = useCompleteQuest();

  const load = async () => {
    const [quests_, bosses_] = await Promise.all([questEngine.list(), bossEngine.list()]);
    setQuests(quests_);
    setBosses(bosses_.filter(x => x.status === "ACTIVE"));
  };
  useEffect(() => { load(); }, []);

  const kinds = ["ALL", "MAIN", "SUPPORT", "MICRO", "CHALLENGE", "BOSS"];
  const filtered = quests.filter(q => filter === "ALL" || q.kind === filter);
  const active = filtered.filter(q => q.status !== "COMPLETED");
  const done = filtered.filter(q => q.status === "COMPLETED");

  const handle = async (q) => {
    await complete(q);
    await load();
  };

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// QUEST BOARD</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">MISSION MANIFEST</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {kinds.map(k => (
          <button key={k} onClick={() => { sound.ui(); setFilter(k); }}
            className={`px-3 py-1.5 text-xs font-display tracking-[0.25em] border clip-tech transition-colors ${
              filter === k ? "border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]" : "border-white/15 text-[#8A8A93] hover:border-white/40"
            }`}
            data-testid={`filter-${k}`}
          >{k}</button>
        ))}
      </div>

      <div className="mb-6">
        <CreateQuestPanel bosses={bosses} onCreated={load}/>
      </div>

      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.4em] text-[#8A8A93] mb-3">// ACTIVE · {active.length}</div>
        <div className="grid md:grid-cols-2 gap-3">
          {active.map(q => <QuestCard key={q.id} q={q} onComplete={handle} />)}
          {active.length === 0 && <div className="col-span-2 hud-panel p-6 text-[#8A8A93] font-mono text-sm">No active quests in this filter.</div>}
        </div>
      </div>

      {done.length > 0 && (
        <div>
          <div className="font-mono text-[10px] tracking-[0.4em] text-[#8A8A93] mb-3">// COMPLETED · {done.length}</div>
          <div className="grid md:grid-cols-2 gap-3">
            {done.map(q => <QuestCard key={q.id} q={q} onComplete={handle} dense />)}
          </div>
        </div>
      )}
    </div>
  );
}
