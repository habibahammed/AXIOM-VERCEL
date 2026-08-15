// 3D QUALITY TIERS
// -----------------------------------------------------------------------
// HIGH matches the current/original appearance exactly (same numbers that
// were already hardcoded in AxiomScene before this pass) so capable
// devices see no visual change. BALANCED and LOW scale down particle
// counts, ring/streak counts, dpr, and postprocessing cost — the scene
// stays recognizably the same (same core, same rings, same bloom style),
// just lighter, per "preserve the current cinematic appearance."
export const QUALITY = {
  HIGH: {
    dpr: [1, 1.6],
    particlesPrimary: 900, particlesPrimarySparse: 500,
    particlesAccent: 400, particlesTertiary: 600,
    streaks: 20, extraRing: true,
    floatingCount: 7, dynamicLights: 3,
    bloom: true, chromaticAberration: true,
  },
  BALANCED: {
    dpr: [1, 1.3],
    particlesPrimary: 550, particlesPrimarySparse: 350,
    particlesAccent: 220, particlesTertiary: 320,
    streaks: 12, extraRing: true,
    floatingCount: 5, dynamicLights: 2,
    bloom: true, chromaticAberration: false,
  },
  LOW: {
    dpr: [1, 1],
    particlesPrimary: 260, particlesPrimarySparse: 180,
    particlesAccent: 0, particlesTertiary: 0,
    streaks: 0, extraRing: false,
    floatingCount: 0, dynamicLights: 1,
    bloom: false, chromaticAberration: false,
  },
};

export function getQuality(tier) {
  return QUALITY[tier] || QUALITY.BALANCED;
}
