// PROGRESSION ENGINE
// ----------------------------------------------------------------------------
// Pure, deterministic, side-effect-free functions only. This module does NOT
// calculate XP, levels, or ranks — that remains exclusively server-side
// (backend/server.py) and is intentionally not duplicated here, since the
// server is the single source of truth for progression correctness.
//
// What lives here instead: small display-derivation helpers that were
// previously copy-pasted with slightly different formulas across multiple
// views (PlayerEvolution, RealitySimulator, WarRoom). Consolidating them
// doesn't change any behavior — each call site already clamped to the same
// [0, 100] range — it just removes the duplication and gives future callers
// one obviously-correct place to reach for it instead of re-deriving it.

/** Clamp any progress ratio/value into a 0–100 percentage for a progress bar. */
export function clampPercent(value, max = 100) {
  if (!Number.isFinite(value)) return 0;
  const pct = max === 100 ? value : (value / max) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Display-only estimate of the stat gain a completed quest granted.
 *
 * IMPORTANT: this mirrors the backend's public formula
 * (max(1, xp_gain // 40) in backend/server.py) purely so the level-up
 * cinematic can show a "+N" chip immediately, before the authoritative
 * player object is re-fetched. It is NEVER used to award, store, or
 * validate a stat value — the server response (via refresh()) remains
 * the only source of truth for actual stat totals.
 */
export function estimateStatGainForDisplay(xpGain) {
  return Math.max(1, Math.floor((xpGain || 0) / 40));
}
