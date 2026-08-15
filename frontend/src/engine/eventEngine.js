// EVENT ENGINE
// ----------------------------------------------------------------------------
// Pure function that reads the existing raw progression-event shape (as
// already returned by the backend and passed to triggerEvent) and derives
// which named EVENT_TYPES it represents. This does not change what data is
// available — it only labels it, so cinematic/UI code can be written
// against clean event names going forward instead of ad-hoc field checks
// scattered across components.
import { EVENT_TYPES } from "@/config/events";

/**
 * @param {object} raw - the event object already produced by the backend
 *   (xp_gain, level_up, rank_up, new_level, new_rank, boss_result,
 *   new_achievements, trial_complete, quest, ...)
 * @returns {string[]} applicable EVENT_TYPES values, in a sensible order
 */
export function deriveEventTypes(raw) {
  if (!raw) return [];
  const types = [];

  if (raw.xp_gain) types.push(EVENT_TYPES.XP_GAINED);
  if (raw.quest && !raw.trial_complete) types.push(EVENT_TYPES.QUEST_COMPLETED);
  if (raw.quest?.trained_stats?.length) types.push(EVENT_TYPES.STAT_CHANGED);

  if (raw.boss_result) {
    types.push(raw.boss_result.defeated ? EVENT_TYPES.BOSS_DEFEATED : EVENT_TYPES.BOSS_PHASE);
  }

  if (raw.level_up) types.push(EVENT_TYPES.LEVEL_UP);
  if (raw.rank_up) { types.push(EVENT_TYPES.RANK_UP); types.push(EVENT_TYPES.ASCENSION); }

  // Present in the raw shape today but not yet populated by the backend
  // (see final report — dormant field, not wired up server-side yet).
  if (raw.new_achievements?.length) types.push(EVENT_TYPES.ACHIEVEMENT_UNLOCKED);
  if (raw.new_medals?.length) types.push(EVENT_TYPES.MEDAL_UNLOCKED);
  if (raw.new_artifacts?.length) types.push(EVENT_TYPES.ARTIFACT_UNLOCKED);
  if (raw.skill_unlocked) types.push(EVENT_TYPES.SKILL_UNLOCKED);

  return types;
}
