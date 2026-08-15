// PROGRESSION EVENT TYPES
// ----------------------------------------------------------------------------
// Named constants for every progression event AXIOM can emit. These are
// ADDITIVE labels attached to the existing raw event object that already
// flows through state/PlayerContext.jsx (triggerEvent) — nothing about the
// existing shape (event.level_up, event.rank_up, event.boss_result, etc.)
// is removed or changed, so every current consumer keeps working exactly
// as before. New/future consumers can react to `event.types` (an array,
// since one server response can represent several things at once — e.g. a
// quest completion that both leveled up and defeated a boss) instead of
// re-deriving the same boolean checks themselves.
export const EVENT_TYPES = Object.freeze({
  XP_GAINED: "XP_GAINED",
  QUEST_COMPLETED: "QUEST_COMPLETED",
  LEVEL_UP: "LEVEL_UP",
  STAT_CHANGED: "STAT_CHANGED",
  SKILL_UNLOCKED: "SKILL_UNLOCKED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  BOSS_PHASE: "BOSS_PHASE",
  BOSS_DEFEATED: "BOSS_DEFEATED",
  RANK_UP: "RANK_UP",
  MEDAL_UNLOCKED: "MEDAL_UNLOCKED",
  ARTIFACT_UNLOCKED: "ARTIFACT_UNLOCKED",
  ASCENSION: "ASCENSION", // alias fired alongside RANK_UP for the "big" ceremony
});
