// Visual palette per rank tier — used by the 3D scene (bloom color/intensity)
// and available for any other rank-driven visual treatment. Centralized here
// so rank colors are defined once instead of scattered across components.
export const RANK_PALETTES = {
  E:   { primary: "#00F0FF", accent: "#FFB000", tertiary: "#FFFFFF", bloom: 0.9 },
  D:   { primary: "#00F0FF", accent: "#FFB000", tertiary: "#B8FFFF", bloom: 1.0 },
  C:   { primary: "#00E5B8", accent: "#FFB000", tertiary: "#FFFFFF", bloom: 1.1 },
  B:   { primary: "#7FFF6A", accent: "#FFB000", tertiary: "#B8FF9C", bloom: 1.15 },
  A:   { primary: "#FFB000", accent: "#00F0FF", tertiary: "#FFDF7A", bloom: 1.25 },
  S:   { primary: "#FF7A2A", accent: "#FFB000", tertiary: "#FFDF7A", bloom: 1.35 },
  SS:  { primary: "#C400FF", accent: "#FF2A2A", tertiary: "#FFB000", bloom: 1.5 },
  SSS: { primary: "#FF2A2A", accent: "#FFB000", tertiary: "#C400FF", bloom: 1.7 },
  "???": { primary: "#FFFFFF", accent: "#FFB000", tertiary: "#00F0FF", bloom: 2.0 },
};
