// AXIOM VISUAL ASSET REGISTRY
// Single source of truth mapping symbolic keys -> optimized WebP paths in /public/assets.
// These are purely presentational. Nothing here touches XP, level, rank, quest,
// boss, or AI logic — nothing in this file makes network calls or mutates state.

const base = "/assets";

// Rank badge art — keyed by backend rank code (E, D, C, B, A, S, SS, SSS, 104)
export const RANK_ART = {
  E: `${base}/ranks/E.webp`,
  D: `${base}/ranks/D.webp`,
  C: `${base}/ranks/C.webp`,
  B: `${base}/ranks/B.webp`,
  A: `${base}/ranks/A.webp`,
  S: `${base}/ranks/S.webp`,
  SS: `${base}/ranks/SS.webp`,
  SSS: `${base}/ranks/SSS.webp`,
  "???": `${base}/ranks/SUPREME.webp`,
};

// Architect portrait per emotional/operational state
export const ARCHITECT_ART = {
  idle: `${base}/architect/idle.webp`,
  analyzing: `${base}/architect/analyzing.webp`,
  warning: `${base}/architect/warning.webp`,
  quest_generation: `${base}/architect/quest_generation.webp`,
  victory: `${base}/architect/victory.webp`,
  rank_ascension: `${base}/architect/rank_ascension.webp`,
};

export const AXIOM_SYMBOL = `${base}/brand/axiom_symbol.webp`;

// AXIOM Core state art (used for large cinematic moments only —
// the always-on HUD core remains the existing procedural Three.js scene)
export const CORE_ART = {
  idle: `${base}/core/idle.webp`,
  xp_gain: `${base}/core/xp_gain.webp`,
  level_up: `${base}/core/level_up.webp`,
  rank_up: `${base}/core/rank_up.webp`,
  boss_victory: `${base}/core/boss_victory.webp`,
  warning: `${base}/core/warning.webp`,
};

// Boss portraits — keyed by the REAL backend boss_key values.
// "the-scroll" has no matching art in the provided sheet; components must
// fall back to the existing procedural Skull icon for it (and any unknown key).
export const BOSS_ART = {
  "the-procrastinator": `${base}/bosses/the-procrastinator.webp`,
  "the-comfort-seeker": `${base}/bosses/the-comfort-seeker.webp`,
  "the-distractor": `${base}/bosses/the-distractor.webp`,
  "the-perfectionist": `${base}/bosses/the-perfectionist.webp`,
  "the-fear": `${base}/bosses/the-fear.webp`,
  "the-inconsistency": `${base}/bosses/the-inconsistency.webp`,
  "the-reactor": `${base}/bosses/the-reactor.webp`,
  "the-directionless": `${base}/bosses/the-directionless.webp`,
};

// Quest kind art — keyed by the REAL backend quest kind enum values.
// SUPPORT maps to the "side quest" art, MICRO maps to "daily quest" art
// (closest visual analogues; no logic implication).
export const QUEST_ART = {
  MAIN: `${base}/quests/main.webp`,
  SUPPORT: `${base}/quests/side.webp`,
  MICRO: `${base}/quests/daily.webp`,
  CHALLENGE: `${base}/quests/challenge.webp`,
  BOSS: `${base}/quests/boss.webp`,
  SECRET: `${base}/quests/secret.webp`,
  // Extra art (non-backend kinds) — surfaced by dedicated views:
  //   TRIAL     → Monarch Trials view
  //   EMERGENCY → high-urgency cinematic cue (reserved)
  //   MONARCH   → Monarch-tier quest ornament (reserved)
  TRIAL: `${base}/quests/trial.webp`,
  EMERGENCY: `${base}/quests/emergency.webp`,
  MONARCH: `${base}/quests/monarch.webp`,
};

// Stat medal art — keyed by the REAL backend STATS_KEYS
export const STAT_ART = {
  STR: `${base}/medals/strength.webp`,
  AGI: `${base}/medals/courage.webp`,
  INT: `${base}/medals/intelligence.webp`,
  FOC: `${base}/medals/focus.webp`,
  MEM: `${base}/medals/memory.webp`,
  CHA: `${base}/medals/charisma.webp`,
  PER: `${base}/medals/perception.webp`,
  STA: `${base}/medals/stamina.webp`,
};

// Domain medal art — keyed by the REAL backend domain strings
export const DOMAIN_ART = {
  DISCIPLINE: `${base}/medals/discipline.webp`,
  COMMUNICATION: `${base}/medals/communication.webp`,
  EMOTIONAL_CONTROL: `${base}/medals/emotional_control.webp`,
  ACADEMICS: `${base}/medals/academic_mastery.webp`,
  FINANCIAL_CAPABILITY: `${base}/medals/financial_ascension.webp`,
  CREATIVITY: `${base}/medals/creativity.webp`,
  SPIRITUAL_DEVELOPMENT: `${base}/medals/spiritual_growth.webp`,
  PHYSICAL_DEVELOPMENT: `${base}/medals/physical_ascension.webp`,
  RECOVERY: `${base}/medals/stamina.webp`,
};

export const MONARCHS_WILL_ART = `${base}/medals/monarchs_will.webp`;

// Achievement art — keyed by the REAL backend achievement ids (all 13 covered 1:1)
export const ACHIEVEMENT_ART = {
  "first-quest": `${base}/achievements/first-quest.webp`,
  "hunter-10": `${base}/achievements/hunter-10.webp`,
  "wolf-25": `${base}/achievements/wolf-25.webp`,
  "iron-will-3": `${base}/achievements/iron-will-3.webp`,
  "unbroken-7": `${base}/achievements/unbroken-7.webp`,
  "shadow-strike": `${base}/achievements/shadow-strike.webp`,
  "boss-slayer": `${base}/achievements/boss-slayer.webp`,
  "riser": `${base}/achievements/riser.webp`,
  "level-5": `${base}/achievements/level-5.webp`,
  "level-10": `${base}/achievements/level-10.webp`,
  "level-25": `${base}/achievements/level-25.webp`,
  "forger": `${base}/achievements/forger.webp`,
  "trial-first": `${base}/achievements/trial-first.webp`,
};

// Skill tree domain icons — keyed by REAL backend domain strings used in /skills
export const SKILL_DOMAIN_ART = {
  DISCIPLINE: `${base}/skill_domains/discipline.webp`,
  COMMUNICATION: `${base}/skill_domains/communication.webp`,
  EMOTIONAL_CONTROL: `${base}/skill_domains/emotional_control.webp`,
  ACADEMICS: `${base}/skill_domains/academics.webp`,
  FINANCIAL_CAPABILITY: `${base}/skill_domains/finance.webp`,
  CREATIVITY: `${base}/skill_domains/creativity.webp`,
  SPIRITUAL_DEVELOPMENT: `${base}/skill_domains/spiritual_development.webp`,
  PHYSICAL_DEVELOPMENT: `${base}/skill_domains/physical_power.webp`,
  RECOVERY: `${base}/medals/stamina.webp`,
};

// Skill node state icons — keyed by REAL backend skill state enum
export const SKILL_STATE_ART = {
  LOCKED: `${base}/skill_states/locked.webp`,
  NOVICE: `${base}/skill_states/available.webp`,
  TRAINED: `${base}/skill_states/available.webp`,
  ADVANCED: `${base}/skill_states/active.webp`,
  MASTERED: `${base}/skill_states/mastered.webp`,
};

// Transparent VFX sprites for cinematic overlay enhancement
export const VFX_ART = {
  ringGold: `${base}/vfx/ring_gold.webp`,
  ringBlue: `${base}/vfx/ring_blue.webp`,
  burstGold: `${base}/vfx/burst_gold.webp`,
  burstBlue: `${base}/vfx/burst_blue.webp`,
  wingsCrest: `${base}/vfx/wings_crest.webp`,
  xpTrail: `${base}/vfx/xp_trail.webp`,
};

// Full-scene atmospheric backgrounds (used at low opacity behind live UI panels)
export const ENVIRONMENT_ART = {
  commandCenter: `${base}/environments/command_center.webp`,
  bossArena: `${base}/environments/boss_arena.webp`,
  hallOfAscension: `${base}/environments/hall_of_ascension.webp`,
  monarchSanctum: `${base}/environments/monarch_sanctum.webp`,
};
