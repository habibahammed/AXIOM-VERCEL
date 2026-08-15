import React, { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { sound } from "@/services/sound";

// TiltCard — a presentation-only wrapper that gives any piece of flat AXIOM
// artwork (boss portraits, medals, rank emblems, artifacts) a premium
// "collectible" feel: CSS 3D depth + mouse-tilt, a moving light sheen,
// idle micro-rotation, hover sparkle particles, and a one-time unlock
// reveal animation. It never reads or writes progression state — it only
// receives `unlocked`/`locked` as a display flag from the caller.
export default function TiltCard({
  children,
  className = "",
  glowColor = "#00F0FF",
  locked = false,
  tiltStrength = 10,
  particles = true,
  sparkleRadius = 42,
  idleRotate = true,
  style = {},
}) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovering, setHovering] = useState(false);
  const [sheen, setSheen] = useState({ x: 50, y: 50 });
  const sparkles = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      angle: (i / 6) * Math.PI * 2,
      delay: i * 0.05,
    })),
    []
  );

  // Perf: raw mousemove can fire 120-1000+ times/sec on modern mice/trackpads.
  // Previously this called setState (x2) + getBoundingClientRect on every
  // single event — with several TiltCards visible at once (boss grids,
  // medal rows) that's a real source of excessive React re-renders and
  // layout thrash. Collapse to at most one state update per animation
  // frame via a rAF-gated pending-value pattern instead.
  const pendingRef = useRef(null);
  const rafRef = useRef(null);

  const onMove = (e) => {
    if (!ref.current) return;
    pendingRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafRef.current) return; // a flush is already scheduled this frame
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!pendingRef.current || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (pendingRef.current.clientX - rect.left) / rect.width;
      const py = (pendingRef.current.clientY - rect.top) / rect.height;
      setTilt({ rx: (0.5 - py) * tiltStrength, ry: (px - 0.5) * tiltStrength });
      setSheen({ x: px * 100, y: py * 100 });
    });
  };

  const onLeave = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setHovering(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={`relative select-none ${className}`}
      style={{ perspective: 700, ...style }}
      onMouseMove={onMove}
      onMouseEnter={() => { setHovering(true); if (!locked) sound.uiHover(); }}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={{
          rotateX: tilt.rx,
          rotateY: tilt.ry,
          rotateZ: idleRotate && !hovering ? [0, 0.6, 0, -0.6, 0] : 0,
          scale: hovering ? 1.05 : 1,
        }}
        transition={
          hovering
            ? { rotateX: { type: "spring", stiffness: 220, damping: 18 }, rotateY: { type: "spring", stiffness: 220, damping: 18 }, scale: { duration: 0.2 } }
            : { rotateZ: { duration: 6, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.3 } }
        }
        style={{ transformStyle: "preserve-3d", filter: locked ? "grayscale(0.85) brightness(0.5)" : "none" }}
        className="relative"
      >
        {children}

        {/* Moving light sheen — reads as a dynamic light source raking across the surface */}
        {hovering && !locked && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background: `radial-gradient(circle at ${sheen.x}% ${sheen.y}%, ${glowColor}55 0%, transparent 45%)`,
            }}
          />
        )}

        {/* Ambient rim glow, always-on but faint; brightens on hover */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 ${hovering ? 26 : 10}px ${locked ? "#00000000" : glowColor}${hovering ? "66" : "22"}`,
            opacity: locked ? 0 : 1,
          }}
        />
      </motion.div>

      {/* Hover sparkle particles */}
      {particles && hovering && !locked && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {sparkles.map((s) => (
            <motion.span
              key={s.id}
              className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full"
              style={{ background: glowColor, boxShadow: `0 0 6px ${glowColor}` }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
              animate={{
                x: Math.cos(s.angle) * sparkleRadius,
                y: Math.sin(s.angle) * sparkleRadius,
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{ duration: 0.9, delay: s.delay, repeat: Infinity, repeatDelay: 0.4 }}
            />
          ))}
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 rounded-full bg-black/60 border border-white/20" />
        </div>
      )}
    </motion.div>
  );
}
