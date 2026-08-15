// Timing configuration for the two staged cinematic sequences
// (level-up and rank ascension). Centralized so tuning the pacing of a
// premium moment never requires touching component/animation code.
//
// Level-up total: 3550ms stage sum + 300ms fade-out ≈ 3.85s
// Rank-ascension total: 4100ms stage sum + 300ms fade-out ≈ 4.4s
// (intentionally longer/grander than a level-up)

export const LEVEL_STAGE_DURATIONS = {
  particles: 400, charge: 450, rings: 350, convergence: 300,
  burst: 450, reveal: 750, stats: 400, reward: 450,
};
export const LEVEL_STAGE_ORDER = [
  "particles", "charge", "rings", "convergence", "burst", "reveal", "stats", "reward",
];

export const RANK_STAGE_DURATIONS = {
  reaction: 300, charge: 550, rings: 500, ascend: 450, burst: 600, reveal: 1100, reward: 600,
};
export const RANK_STAGE_ORDER = [
  "reaction", "charge", "rings", "ascend", "burst", "reveal", "reward",
];

// Simulated camera dolly-in scale per rank-ascension stage.
export const RANK_CAMERA_SCALE = {
  reaction: 1, charge: 1.04, rings: 1.08, ascend: 1.13, burst: 0.97, reveal: 1, reward: 1,
};

// Total time before the overlay's onClose fires (the setTimeout trigger).
// After this fires, the parent's own 300ms fade-out exit transition plays
// on top — so the full on-screen experience is slightly longer than these
// numbers (e.g. rank-up: 4100ms stage sum + ~300ms fade ≈ 4.4s total).
export const CINEMATIC_TOTAL_MS = {
  rankUp: 4100,
  levelUp: 3550,
  reducedMotion: 1400,
  default: 1800, // plain quest-complete/XP-only — the most frequent event;
                 // kept snappy so routine completions don't feel heavy
};
