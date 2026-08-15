import { useEffect, useRef, useState } from "react";

// Adaptive quality tier: HIGH / BALANCED / LOW.
// -----------------------------------------------------------------------
// 1. A one-time static guess from device signals already available in the
//    browser (no new dependencies): CPU core count, device memory (where
//    supported), and a coarse mobile check.
// 2. A short runtime frame-time sample after mount that can downgrade
//    (never upgrade, to avoid visible flicker) if the device is actually
//    struggling once the real scene is rendering.
//
// This is intentionally invisible/automatic — no new settings UI, per the
// "don't add features" instruction. It just changes how much work the 3D
// scene asks the GPU to do.
function staticTierGuess() {
  if (typeof navigator === "undefined") return "BALANCED";
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory; // Chrome-only, undefined elsewhere
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  if (isMobile || cores <= 4 || (mem && mem <= 4)) return "LOW";
  if (cores <= 8 || (mem && mem <= 8)) return "BALANCED";
  return "HIGH";
}

const DOWNGRADE = { HIGH: "BALANCED", BALANCED: "LOW", LOW: "LOW" };

export function useAdaptiveQuality() {
  const [tier, setTier] = useState(staticTierGuess);
  const samples = useRef([]);
  const rafId = useRef(null);
  const start = useRef(null);

  useEffect(() => {
    // Sample real frame deltas for ~1.5s, then decide once whether to
    // downgrade. Only runs once per mount of the first scene that uses it.
    const SAMPLE_MS = 1500;
    const loop = (t) => {
      if (start.current === null) start.current = t;
      samples.current.push(t);
      if (t - start.current < SAMPLE_MS) {
        rafId.current = requestAnimationFrame(loop);
        return;
      }
      const frames = samples.current;
      if (frames.length >= 2) {
        const avgDelta = (frames[frames.length - 1] - frames[0]) / (frames.length - 1);
        const fps = 1000 / avgDelta;
        // Comfortably above 50fps -> leave tier alone. Below that,
        // step down one tier so particle/bloom load actually drops.
        if (fps < 50) {
          setTier((cur) => DOWNGRADE[cur] || cur);
        }
      }
    };
    rafId.current = requestAnimationFrame(loop);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, []);

  return tier; // "HIGH" | "BALANCED" | "LOW"
}
