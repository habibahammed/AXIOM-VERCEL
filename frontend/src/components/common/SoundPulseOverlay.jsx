import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sound } from "@/services/sound";

// Full-screen colored pulse synced to sound.js play events. Each flash is
// under 200ms total (attack + release). Multiple rapid triggers layer via
// unique keys instead of interrupting one another.
export default function SoundPulseOverlay() {
  const [pulses, setPulses] = useState([]);
  useEffect(() => {
    const off = sound.onPulse(({ color, category }) => {
      const id = `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setPulses((p) => [...p, { id, color }]);
      // auto-remove after 220ms (>animation 190ms) so DOM stays lean
      setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 220);
    });
    return off;
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      <AnimatePresence>
        {pulses.map(({ id, color }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.19, times: [0, 0.35, 1], ease: [0.2, 0.9, 0.3, 1] }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${color}66 0%, ${color}22 35%, transparent 70%)`,
              mixBlendMode: "screen",
              boxShadow: `inset 0 0 120px ${color}55`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
