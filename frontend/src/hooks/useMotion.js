import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(q.matches);
    const on = () => setRm(q.matches);
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, []);
  return rm;
}

// Smoothly animate a number from -> to over duration ms
export function useAnimatedNumber(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    let raf, start;
    const from = display;
    const change = target - from;
    if (change === 0) return;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + change * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return display;
}

// Very subtle mouse parallax vector (px offset scaled by strength)
export function useMouseParallax(strength = 12) {
  const [xy, setXy] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setXy({
        x: ((e.clientX - cx) / cx) * strength,
        y: ((e.clientY - cy) / cy) * strength,
      });
    };
    window.addEventListener("mousemove", on, { passive: true });
    return () => window.removeEventListener("mousemove", on);
  }, [strength]);
  return xy;
}
