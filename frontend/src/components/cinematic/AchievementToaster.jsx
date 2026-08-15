import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { sound } from "@/services/sound";
import AxiomArt from "@/components/common/AxiomArt";
import { ACHIEVEMENT_ART } from "@/services/assets/registry";

const TINTS = {
  cyan:  { color: "#00F0FF", glow: "0 0 24px rgba(0,240,255,0.7)" },
  amber: { color: "#FFB000", glow: "0 0 24px rgba(255,176,0,0.7)" },
  red:   { color: "#FF2A2A", glow: "0 0 24px rgba(255,42,42,0.7)" },
};

const Toast = ({ ach, onDone }) => {
  const t = TINTS[ach.tint] || TINTS.cyan;
  useEffect(() => {
    sound.achievementUnlocked();
    const timer = setTimeout(onDone, 4200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden hud-panel scanline pl-4 pr-5 py-3 w-80 clip-tech"
      style={{
        borderColor: t.color,
        boxShadow: `${t.glow}, inset 0 0 0 1px rgba(255,255,255,0.05)`,
      }}
      data-testid={`achievement-toast-${ach.id}`}
    >
      {/* Ambient sweep highlight */}
      <motion.div
        initial={{ x: "-100%" }} animate={{ x: "120%" }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 w-1/3"
        style={{ background: `linear-gradient(90deg, transparent, ${t.color}22, transparent)` }}
      />
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 relative flex items-center justify-center clip-tech border overflow-hidden" style={{borderColor: t.color, color: t.color, background: "rgba(0,0,0,0.55)"}}>
          {ACHIEVEMENT_ART[ach.id] && (
            <AxiomArt src={ACHIEVEMENT_ART[ach.id]} alt={ach.name} className="absolute inset-0 w-full h-full opacity-95" />
          )}
          {!ACHIEVEMENT_ART[ach.id] && <Trophy size={20} strokeWidth={1.5}/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[9px] tracking-[0.5em]" style={{color: t.color}}>// ACHIEVEMENT</div>
          <div className="font-display text-sm truncate" style={{color: t.color, textShadow: t.glow}}>{ach.name}</div>
          <div className="font-mono text-[10px] text-[#8A8A93] truncate">{ach.desc}</div>
        </div>
        <Sparkles size={12} className="opacity-70" style={{color: t.color}} strokeWidth={1.5}/>
      </div>
    </motion.div>
  );
};

export default function AchievementToaster({ queue, onConsume }) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
    }
  }, [queue, current]);
  const advance = () => { onConsume?.(current?.id); setCurrent(null); };
  return (
    <div className="fixed top-24 right-6 z-[80] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {current && <Toast key={current.id} ach={current} onDone={advance}/>}
      </AnimatePresence>
    </div>
  );
}
