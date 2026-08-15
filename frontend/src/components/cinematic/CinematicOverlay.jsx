import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/services/sound";
import { useReducedMotion } from "@/hooks/useMotion";
import { SkipForward } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import { CORE_ART, RANK_ART, VFX_ART, BOSS_ART, STAT_ART } from "@/services/assets/registry";
import {
  LEVEL_STAGE_DURATIONS, LEVEL_STAGE_ORDER,
  RANK_STAGE_DURATIONS, RANK_STAGE_ORDER, RANK_CAMERA_SCALE,
  CINEMATIC_TOTAL_MS,
} from "@/config/cinematicTiming";
import { estimateStatGainForDisplay } from "@/engine/progressionEngine";

// --- Cinematic upgrade primitives ------------------------------------------
// Design tokens sourced verbatim from design_guidelines.json
const CYAN_GLOW = "rgba(0, 240, 255, 0.4)";
const CRIMSON_GLOW = "rgba(255, 42, 42, 0.4)";
// 300ms "hold then slam" — value nearly frozen for the first half, then a
// hard release to the target. Achieved via keyframe timing (times) so the
// curve is deterministic across all consumers, not per-motion easing.
const SLAM_TIMES = [0, 0.5, 1];
const SLAM_EASE = [0.87, 0, 0.13, 1]; // fallback cubic when times aren't wanted

// Impact-frame screen shake — mounts only during the burst beat, then
// unmounts. Wrap the target with this to inherit the shake.
const ScreenShake = ({ active, strength = 10, children }) => (
  <motion.div
    animate={active ? {
      x: [0, -strength, strength * 0.8, -strength * 0.6, strength * 0.4, -strength * 0.2, 0],
      y: [0, strength * 0.6, -strength * 0.9, strength * 0.4, -strength * 0.3, strength * 0.15, 0],
    } : { x: 0, y: 0 }}
    transition={{ duration: 0.45, ease: "easeOut" }}
    className="contents"
  >
    {children}
  </motion.div>
);

// Chromatic aberration burst — layered cyan_glow + crimson_glow tints that
// briefly split apart (opposite offsets) then snap back to center, reading
// as an RGB split without a shader.
const ChromaticBurst = ({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[35] overflow-hidden">
      <motion.div
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: [-8, 22, -6, 0], opacity: [0, 0.85, 0.4, 0] }}
        transition={{ duration: 0.42, times: [0, 0.25, 0.6, 1], ease: [0.2, 0.9, 0.3, 1] }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${CYAN_GLOW} 0%, transparent 55%)`, mixBlendMode: "screen" }}
      />
      <motion.div
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: [8, -22, 6, 0], opacity: [0, 0.85, 0.4, 0] }}
        transition={{ duration: 0.42, times: [0, 0.25, 0.6, 1], ease: [0.2, 0.9, 0.3, 1] }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${CRIMSON_GLOW} 0%, transparent 55%)`, mixBlendMode: "screen" }}
      />
    </div>
  );
};

// Radial light burst that sits BEHIND the rank/level Michroma text — a
// static, layered aura that expands as the number lands. Two rings for depth.
const RadialLightBurst = ({ color = "#FFB000", accent = CYAN_GLOW, size = 640 }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
    <motion.div
      initial={{ scale: 0.35, opacity: 0 }}
      animate={{ scale: [0.35, 0.55, 1.05], opacity: [0, 0.95, 0.75] }}
      transition={{ duration: 0.6, times: SLAM_TIMES, ease: SLAM_EASE }}
      className="rounded-full"
      style={{ width: size, height: size, background: `radial-gradient(circle, ${color} 0%, transparent 55%)`, filter: "blur(28px)" }}
    />
    <motion.div
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: [0.2, 0.4, 1.2], opacity: [0, 0.7, 0.55] }}
      transition={{ duration: 0.65, times: SLAM_TIMES, ease: SLAM_EASE }}
      className="absolute rounded-full"
      style={{ width: size * 0.7, height: size * 0.7, background: `radial-gradient(circle, ${accent} 0%, transparent 60%)`, filter: "blur(18px)", mixBlendMode: "screen" }}
    />
  </div>
);

// Particle burst radiating outward
const Burst = ({ count = 30, color = "#00F0FF" }) => (
  <div className="pointer-events-none absolute inset-0">
    {Array.from({length: count}).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 260 + Math.random() * 220;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const dur = 1.0 + Math.random() * 0.7;
      return (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: dx, y: dy, opacity: 0, scale: 0 }}
          transition={{ duration: dur, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}, 0 0 28px ${color}` }}
        />
      );
    })}
  </div>
);

// XP glyphs converging toward center during CHARGE stage
const Converging = ({ count = 24, color = "#00F0FF" }) => (
  <div className="pointer-events-none absolute inset-0">
    {Array.from({length: count}).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 320 + Math.random() * 260;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      return (
        <motion.div key={i}
          initial={{ x: sx, y: sy, opacity: 0, scale: 0.4 }}
          animate={{ x: 0, y: 0, opacity: [0, 1, 0.9, 0], scale: [0.4, 1, 0.6, 0] }}
          transition={{ duration: 1.1, delay: i * 0.02, ease: [0.4, 0, 0.6, 1] }}
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      );
    })}
  </div>
);

// Small "+XP" glyph chips flying inward — the very first beat of the sequence
const XPParticles = ({ count = 16, color = "#00F0FF" }) => (
  <div className="pointer-events-none absolute inset-0">
    {Array.from({length: count}).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 380 + Math.random() * 200;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      return (
        <motion.div key={i}
          initial={{ x: sx, y: sy, opacity: 0, scale: 0.5 }}
          animate={{ x: sx * 0.15, y: sy * 0.15, opacity: [0, 1, 1], scale: [0.5, 1, 1] }}
          transition={{ duration: 0.42, delay: i * 0.015, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute left-1/2 top-1/2 font-mono text-[9px] tracking-wider"
          style={{ color, textShadow: `0 0 8px ${color}` }}
        >XP</motion.div>
      );
    })}
  </div>
);

// Concentric rotating rings that spin up around the charging core
const RotatingRings = ({ color = "#00F0FF", accent = "#FFB000" }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    {[
      { size: 140, dur: 1.4, dir: 1, dash: "60 20", c: color },
      { size: 200, dur: 1.9, dir: -1, dash: "40 30", c: accent },
      { size: 260, dur: 2.5, dir: 1, dash: "20 40", c: color },
    ].map((r, i) => (
      <motion.svg
        key={i}
        width={r.size} height={r.size} viewBox="0 0 100 100"
        className="absolute"
        initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
        animate={{ opacity: 0.85, scale: 1, rotate: 360 * r.dir }}
        transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.4, ease: "backOut" }, rotate: { duration: r.dur, repeat: Infinity, ease: "linear" } }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke={r.c} strokeWidth="1.2" strokeDasharray={r.dash} opacity="0.9" style={{ filter: `drop-shadow(0 0 4px ${r.c})` }}/>
      </motion.svg>
    ))}
  </div>
);

// Rapid inward energy streaks — the final gathering pulse right before the shockwave
const EnergyConvergence = ({ color = "#00F0FF", count = 18 }) => (
  <div className="pointer-events-none absolute inset-0">
    {Array.from({length: count}).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist = 220;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      return (
        <motion.div key={i}
          initial={{ x: sx, y: sy, opacity: 0, scaleX: 0.2 }}
          animate={{ x: 0, y: 0, opacity: [0, 1, 0], scaleX: [0.2, 1.6, 0.4] }}
          transition={{ duration: 0.35, delay: i * 0.008, ease: [0.3, 0, 0.4, 1] }}
          className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-y-1/2 origin-right"
          style={{ background: `linear-gradient(90deg, transparent, ${color})`, transform: `rotate(${(angle * 180) / Math.PI}deg)` }}
        />
      );
    })}
    <motion.div
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: [0.2, 1.6, 0.5], opacity: [0, 1, 1] }}
      transition={{ duration: 0.35, ease: "easeIn" }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
      style={{ background: `radial-gradient(circle, #fff 0%, ${color} 40%, transparent 75%)`, filter: "blur(3px)" }}
    />
  </div>
);

// Per-stat "+N" chips for the STAT CHANGES beat — value mirrors the same
// public formula the backend already uses (max(1, xp_gain // 40)), purely
// for display; the authoritative numbers still come from the server on refresh.
const StatChanges = ({ stats = [], xpGain = 0, color = "#00F0FF" }) => {
  const gain = estimateStatGainForDisplay(xpGain);
  if (!stats.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-center gap-3 flex-wrap mb-2"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08, ease: "backOut" }}
          className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[10px] tracking-[0.2em] clip-tech"
          style={{ borderColor: `${color}66`, color, background: `${color}14` }}
        >
          {STAT_ART[s] && <AxiomArt src={STAT_ART[s]} alt={s} className="w-4 h-4 rounded-sm opacity-90" />}
          {s} +{gain}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Level Up = staged multi-phase cinematic
// Sequence: XP particles -> AXIOM Core charge -> rotating rings ->
// energy convergence -> shockwave -> LEVEL UP -> new level -> stat changes
// -> rewards -> smooth return (fade handled by the parent AnimatePresence).
const LevelUpStage = ({ event, reducedMotion = false }) => {
  const [stage, setStage] = useState(LEVEL_STAGE_ORDER[0]);
  useEffect(() => {
    if (reducedMotion) return; // static reveal below skips the staged timeline entirely
    const timers = [];
    let t = 0;
    for (let i = 1; i < LEVEL_STAGE_ORDER.length; i++) {
      t += LEVEL_STAGE_DURATIONS[LEVEL_STAGE_ORDER[i - 1]];
      timers.push(setTimeout(() => setStage(LEVEL_STAGE_ORDER[i]), t));
    }
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  const isRank = !!event.rank_up;
  const tint = isRank ? "#FFB000" : "#00F0FF";
  const trainedStats = event.quest?.trained_stats || [];
  const stageIndex = LEVEL_STAGE_ORDER.indexOf(stage);
  const atOrAfter = (s) => stageIndex >= LEVEL_STAGE_ORDER.indexOf(s);

  // AUDIT FIX (accessibility): prefers-reduced-motion previously only
  // clamped how long the overlay stayed open — the full-intensity bursts,
  // particles and shockwave still played underneath for that shorter
  // window. Now reduced-motion skips straight to a calm, static reveal
  // with no particles/shockwave/camera movement, just a simple fade.
  if (reducedMotion) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{"--tint": tint}}>
        <div className="text-center relative z-10">
          <div className="font-mono text-xs tracking-[0.5em] mb-4" style={{color: tint}}>
            {isRank ? "// RANK ASCENSION //" : "// LEVEL UP //"}
          </div>
          <div className="font-display leading-none mb-3" style={{fontSize: "5rem", color: tint}}>
            {isRank ? event.new_rank?.code : event.new_level}
          </div>
          {isRank && <div className="font-display text-xl tracking-[0.4em] text-[#EAEAEA] mb-4">{event.new_rank?.name}</div>}
          <div className="font-mono text-sm tracking-[0.3em] text-[#FFB000]">+{event.xp_gain} XP</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{"--tint": tint}}>
      {/* 1. XP PARTICLES — the trigger: XP glyphs fly inward from the edges */}
      {stage === "particles" && <XPParticles count={18} color={tint}/>}

      {/* 2. AXIOM CORE CHARGE — the core art fades in and builds energy */}
      {(stage === "charge" || stage === "rings" || stage === "convergence") && (
        <>
          <Converging count={22} color={tint}/>
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute w-40 h-40 pointer-events-none"
          >
            <AxiomArt src={CORE_ART.xp_gain} alt="" className="w-full h-full" fit="contain" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.2, 1], opacity: [0, 0.8, 1] }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.6, 1] }}
            className="absolute w-32 h-32 rounded-full"
            style={{ background: `radial-gradient(circle, ${tint} 0%, transparent 70%)`, filter: "blur(12px)" }}
          />
        </>
      )}

      {/* 3. ROTATING RINGS — concentric rings spin up around the charging core */}
      {(stage === "rings" || stage === "convergence") && <RotatingRings color={tint} accent={isRank ? "#00F0FF" : "#FFB000"}/>}

      {/* 4. ENERGY CONVERGENCE — everything rapidly gathers to a single point */}
      {stage === "convergence" && <EnergyConvergence color={tint} count={20}/>}

      {/* 5. SHOCKWAVE — the release + chromatic aberration + screen shake */}
      <ChromaticBurst active={stage === "burst"} />
      {stage === "burst" && (
        <>
          <div className="shockwave" style={{"--tint": tint}}/>
          <div className="shockwave" style={{"--tint": tint, animationDelay: "120ms"}}/>
          <div className="shockwave" style={{"--tint": tint, animationDelay: "240ms"}}/>
          <Burst count={isRank ? 70 : 45} color={tint}/>
          <motion.img
            src={isRank ? VFX_ART.burstGold : VFX_ART.burstBlue}
            initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{ scale: 2.4, opacity: [0, 0.9, 0], rotate: 25 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute w-72 h-72 pointer-events-none"
            style={{ objectFit: "contain", mixBlendMode: "screen" }}
            alt=""
          />
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute w-64 h-64 rounded-full"
            style={{ background: `radial-gradient(circle, ${tint} 0%, transparent 60%)`, filter: "blur(24px)" }}
          />
        </>
      )}

      {/* 6/7/8. REVEAL — LEVEL UP, new level, stat changes, rewards */}
      {atOrAfter("reveal") && (
        <ScreenShake active={stage === "reveal"} strength={8}>
        <div className="text-center relative z-10 stage-emerge">
          {/* Radial light burst sitting behind the Michroma numeral */}
          <RadialLightBurst color={tint} accent={isRank ? CYAN_GLOW : CRIMSON_GLOW} size={isRank ? 700 : 560} />
          {/* Faded AXIOM Core / rank sigil art anchoring the moment */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 0.35, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none"
          >
            <AxiomArt
              src={isRank ? RANK_ART[event.new_rank?.code] : CORE_ART.level_up}
              alt=""
              className="w-[420px] h-[420px]"
              fit="contain"
            />
          </motion.div>
          {isRank ? (
            <>
              <div className="font-mono text-xs md:text-sm tracking-[0.7em] text-[#FFB000] mb-4 text-glow-amber">// RANK ASCENSION //</div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1], scale: [0.5, 0.55, 1] }}
                transition={{ duration: 0.55, times: SLAM_TIMES, ease: SLAM_EASE }}
                className="font-display text-8xl md:text-[10rem] text-[#FFB000] leading-none mb-3"
                style={{textShadow: "0 0 32px #FFB000, 0 0 64px rgba(255,176,0,0.5)"}}
              >
                {event.new_rank.code}
              </motion.div>
              <div className="font-display text-2xl md:text-3xl tracking-[0.5em] text-[#EAEAEA] mb-6">{event.new_rank.name}</div>
            </>
          ) : (
            <>
              <div className="font-mono text-xs md:text-sm tracking-[0.7em] text-[#00F0FF] mb-4 text-glow-cyan">// LEVEL UP //</div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1], scale: [0.5, 0.55, 1] }}
                transition={{ duration: 0.55, times: SLAM_TIMES, ease: SLAM_EASE }}
                className="font-display leading-none mb-4 text-[#00F0FF]"
                style={{fontSize: "clamp(6rem, 16vw, 12rem)", textShadow: "0 0 32px #00F0FF, 0 0 64px rgba(0,240,255,0.6)"}}
              >
                {event.new_level}
              </motion.div>
            </>
          )}

          {/* 7. STAT CHANGES — which attributes this quest trained */}
          {atOrAfter("stats") && !isRank && trainedStats.length > 0 && (
            <StatChanges stats={trainedStats} xpGain={event.xp_gain} color={tint}/>
          )}

          {/* 8. REWARDS — sequential reveal */}
          {stage === "reward" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-6 font-mono text-sm tracking-[0.3em]"
            >
              <div className="text-[#FFB000] text-glow-amber">+{event.xp_gain} XP</div>
              {isRank && <div className="text-[#00F0FF]">+1 SHIELD</div>}
              {event.new_rank && !isRank && (
                <div className="text-[#8A8A93]">LVL {event.new_level - 1} → <span className="text-[#EAEAEA]">{event.new_level}</span></div>
              )}
            </motion.div>
          )}

          {/* Environment ambient response */}
          {atOrAfter("reveal") && (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 3, opacity: [0, 0.5, 0] }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{ width: 500, height: 500, background: `radial-gradient(circle, ${tint} 0%, transparent 55%)`, filter: "blur(30px)" }}
              />
              {[0, 0.25, 0.5].map((delay, i) => (
                <motion.div key={i}
                  initial={{ scale: 0.5, opacity: 0.6 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  transition={{ duration: 2.4, delay, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
                  style={{ width: 300, height: 300, borderColor: tint }}
                />
              ))}
            </>
          )}
        </div>
        </ScreenShake>
      )}
    </div>
  );
};

// ============================================================================
// RANK ASCENSION — significantly more powerful than a normal level-up.
// A dedicated, longer, grander sequence (not a palette-swap of LevelUpStage):
// environmental reaction -> camera push-in -> energy rings -> ascending
// light pillar -> massive shockwave (+ camera shake) -> rank emblem reveal
// with cinematic typography -> rewards -> smooth return. Sound is hooked to
// the stage transitions themselves, not fired all at once at trigger time.
// ============================================================================


// A denser, larger ring formation than the level-up version — reads as
// meaningfully more powerful rather than just recolored.
const AscensionRings = ({ primary, accent }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    {[
      { size: 160, dur: 1.6, dir: 1, dash: "50 18", c: primary },
      { size: 230, dur: 2.1, dir: -1, dash: "30 26", c: accent },
      { size: 300, dur: 2.7, dir: 1, dash: "16 34", c: primary },
      { size: 380, dur: 3.4, dir: -1, dash: "8 44", c: accent },
    ].map((r, i) => (
      <motion.svg
        key={i}
        width={r.size} height={r.size} viewBox="0 0 100 100"
        className="absolute"
        initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
        animate={{ opacity: 0.9, scale: 1, rotate: 360 * r.dir }}
        transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.5, ease: "backOut" }, rotate: { duration: r.dur, repeat: Infinity, ease: "linear" } }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke={r.c} strokeWidth="1.4" strokeDasharray={r.dash} style={{ filter: `drop-shadow(0 0 5px ${r.c})` }}/>
      </motion.svg>
    ))}
  </div>
);

// Vertical light pillar — the "ascending" feel, unique to rank-up
const LightPillar = ({ color }) => (
  <motion.div
    initial={{ scaleY: 0, opacity: 0 }}
    animate={{ scaleY: 1, opacity: [0, 0.9, 0.7] }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 origin-bottom"
    style={{ background: `linear-gradient(to top, ${color} 0%, transparent 80%)`, filter: "blur(6px)", mixBlendMode: "screen" }}
  />
);

// Quick dark-then-bright pulse — "the environment reacts" before the
// ascension even begins, distinct from the level-up's straight fade-in.
const EnvironmentReaction = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.9, 0] }}
    transition={{ duration: 0.3, times: [0, 0.4, 1] }}
    className="pointer-events-none absolute inset-0 bg-black"
  />
);

// Camera dolly-in simulated via a continuous scale ramp across the whole
// sequence, with a sharp punch-out on the shockwave beat — the closest a
// full-screen DOM overlay can get to real camera movement.

const RankAscensionStage = ({ event, reducedMotion = false }) => {
  const [stage, setStage] = useState(RANK_STAGE_ORDER[0]);
  useEffect(() => {
    if (reducedMotion) return;
    const timers = [];
    let t = 0;
    for (let i = 1; i < RANK_STAGE_ORDER.length; i++) {
      t += RANK_STAGE_DURATIONS[RANK_STAGE_ORDER[i - 1]];
      timers.push(setTimeout(() => setStage(RANK_STAGE_ORDER[i]), t));
    }
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // Sound hooked directly to the visual beats, not fired all at once.
  // A single, gentler chime replaces the full staged audio when reduced
  // motion is on, since the rumble/impact beats are tied to visuals we skip.
  useEffect(() => {
    if (reducedMotion) { sound.rankChime(event.new_rank?.code || "E"); return; }
    if (stage === "reaction") sound.ascensionRumble();
    else if (stage === "burst") sound.ascensionImpact();
    else if (stage === "reveal") sound.rankChime(event.new_rank?.code || "E");
  }, [stage, event.new_rank, reducedMotion]);

  const primary = "#FFB000";
  const accent = "#00F0FF";
  const stageIndex = RANK_STAGE_ORDER.indexOf(stage);
  const atOrAfter = (s) => stageIndex >= RANK_STAGE_ORDER.indexOf(s);

  // AUDIT FIX (accessibility): same issue as LevelUpStage — reduced-motion
  // now gets a calm static reveal instead of the full shake/flash/particle
  // sequence at a shortened duration.
  if (reducedMotion) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center relative z-10">
          <div className="font-mono text-xs tracking-[0.5em] mb-4 text-[#FFB000]">// RANK ASCENSION //</div>
          <div className="font-display leading-none mb-3" style={{fontSize: "5.5rem", color: primary}}>{event.new_rank?.code}</div>
          <div className="font-display text-xl tracking-[0.4em] text-[#EAEAEA] mb-4">{event.new_rank?.name}</div>
          <div className="font-mono text-sm tracking-[0.3em] text-[#00F0FF]">+{event.xp_gain} XP · +1 SHIELD</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ "--tint": primary }}
      animate={{
        scale: RANK_CAMERA_SCALE[stage],
        x: stage === "burst" ? [0, -14, 12, -8, 5, -3, 0] : 0,
        y: stage === "burst" ? [0, 9, -12, 6, -4, 2, 0] : 0,
      }}
      transition={
        stage === "burst"
          ? { scale: { duration: 0.25, ease: "easeOut" }, x: { duration: 0.5, ease: "easeOut" }, y: { duration: 0.5, ease: "easeOut" } }
          : { duration: RANK_STAGE_DURATIONS[stage] / 1000, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {/* ENVIRONMENTAL REACTION — the world flinches before the power arrives */}
      {stage === "reaction" && <EnvironmentReaction />}

      {/* CHARGE — core builds, particles converge, faster/denser than level-up */}
      {(stage === "charge" || stage === "rings" || stage === "ascend") && (
        <>
          <Converging count={36} color={primary}/>
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.95, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute w-48 h-48 pointer-events-none"
          >
            <AxiomArt src={CORE_ART.rank_up} alt="" className="w-full h-full" fit="contain" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.3, 1.05], opacity: [0, 0.9, 1] }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.6, 1] }}
            className="absolute w-40 h-40 rounded-full"
            style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`, filter: "blur(14px)" }}
          />
        </>
      )}

      {/* ENERGY RINGS — bigger, denser formation than level-up */}
      {(stage === "rings" || stage === "ascend") && <AscensionRings primary={primary} accent={accent}/>}

      {/* ASCENDING LIGHT PILLAR + intensifying particles */}
      {stage === "ascend" && (
        <>
          <LightPillar color={primary}/>
          <Converging count={20} color={accent}/>
        </>
      )}

      {/* LIGHT BURST / SHOCKWAVE — with camera shake handled by the wrapper above */}
      <ChromaticBurst active={stage === "burst"} />
      {stage === "burst" && (
        <>
          <div className="shockwave" style={{"--tint": primary}}/>
          <div className="shockwave" style={{"--tint": primary, animationDelay: "100ms"}}/>
          <div className="shockwave" style={{"--tint": primary, animationDelay: "200ms"}}/>
          <div className="shockwave" style={{"--tint": accent, animationDelay: "300ms"}}/>
          <Burst count={90} color={primary}/>
          <Burst count={40} color={accent}/>
          <motion.img
            src={VFX_ART.burstGold}
            initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{ scale: 3.2, opacity: [0, 1, 0], rotate: 35 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute w-96 h-96 pointer-events-none"
            style={{ objectFit: "contain", mixBlendMode: "screen" }}
            alt=""
          />
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute w-72 h-72 rounded-full"
            style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 60%)`, filter: "blur(28px)" }}
          />
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle, #fff 0%, ${primary}55 40%, transparent 75%)` }}
          />
        </>
      )}

      {/* RANK EMBLEM REVEAL + CINEMATIC TYPOGRAPHY */}
      {atOrAfter("reveal") && (
        <div className="text-center relative z-10 stage-emerge">
          {/* Radial light burst behind the Michroma rank glyph */}
          <RadialLightBurst color={primary} accent={CYAN_GLOW} size={780} />
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 0.5, scale: 1, rotate: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none"
          >
            <AxiomArt src={RANK_ART[event.new_rank?.code]} alt={event.new_rank?.code} className="w-[520px] h-[520px]" fit="contain" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.7em" }}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs md:text-sm text-[#FFB000] mb-4 text-glow-amber"
          >// RANK ASCENSION //</motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.45, y: 30 }}
            animate={{ opacity: [0, 1, 1], scale: [0.45, 0.5, 1], y: [30, 26, 0] }}
            transition={{ duration: 0.6, times: SLAM_TIMES, ease: SLAM_EASE, delay: 0.1 }}
            className="font-display text-8xl md:text-[11rem] text-[#FFB000] leading-none mb-3"
            style={{textShadow: "0 0 40px #FFB000, 0 0 90px rgba(255,176,0,0.6)"}}
          >{event.new_rank?.code}</motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="font-display text-2xl md:text-3xl tracking-[0.5em] text-[#EAEAEA] mb-6"
          >{event.new_rank?.name}</motion.div>

          {stage === "reward" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-6 font-mono text-sm tracking-[0.3em]"
            >
              <div className="text-[#FFB000] text-glow-amber">+{event.xp_gain} XP</div>
              <div className="text-[#00F0FF]">+1 SHIELD</div>
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 4, opacity: [0, 0.6, 0] }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{ width: 600, height: 600, background: `radial-gradient(circle, ${primary} 0%, transparent 55%)`, filter: "blur(34px)" }}
          />
          {[0, 0.2, 0.4, 0.6].map((delay, i) => (
            <motion.div key={i}
              initial={{ scale: 0.5, opacity: 0.7 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 2.8, delay, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
              style={{ width: 320, height: 320, borderColor: i % 2 === 0 ? primary : accent }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default function CinematicOverlay({ event, onClose }) {
  const rm = useReducedMotion();
  useEffect(() => {
    if (!event) return;
    // Rank ascension's sound is staged internally (RankAscensionStage hooks
    // ascensionRumble/ascensionImpact/rankChime to its own stage transitions)
    // so we deliberately don't fire anything here for rank_up — a single
    // upfront cue would fight with the staged audio beats.
    if (event.rank_up) { /* handled by RankAscensionStage */ }
    else if (event.level_up) sound.levelUp();
    else if (event.boss_result?.defeated) sound.bossDefeat();
    else if (event.boss_result) sound.bossHit();
    else sound.questDone();
    // Total duration comes from config/cinematicTiming.js — see that file
    // for the stage-by-stage breakdown and reasoning behind each number.
    let totalMs;
    if (event.rank_up) totalMs = CINEMATIC_TOTAL_MS.rankUp;
    else if (event.level_up) totalMs = CINEMATIC_TOTAL_MS.levelUp;
    else totalMs = CINEMATIC_TOTAL_MS.default;
    if (rm) totalMs = Math.min(totalMs, CINEMATIC_TOTAL_MS.reducedMotion);
    const t = setTimeout(onClose, totalMs);
    return () => clearTimeout(t);
  }, [event, onClose, rm]);

  if (!event) return null;
  const bossDefeat = event.boss_result?.defeated;
  const isRankUp = !!event.rank_up;
  const isLevelUp = !!event.level_up && !isRankUp;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`cine-overlay ${rm ? "reduced-motion" : ""}`}
        data-testid="cinematic-overlay"
      >
        <div className="absolute inset-0 grid-void opacity-20" />
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 px-3 py-1.5 border border-white/15 text-[#8A8A93] hover:text-[#EAEAEA] hover:border-white/40 clip-tech font-mono text-[10px] tracking-[0.3em] flex items-center gap-2"
          data-testid="btn-skip-cinematic"
        >
          <SkipForward size={11} strokeWidth={1.5}/> SKIP
        </button>

        {isRankUp ? (
          <RankAscensionStage event={event} reducedMotion={rm} data-testid="rank-ascension-cinematic" />
        ) : isLevelUp ? (
          <LevelUpStage event={event} reducedMotion={rm} />
        ) : (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, filter: "blur(8px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
            className="text-center relative z-10"
          >
            {bossDefeat ? (
              <>
                <Burst count={40} color="#FF2A2A"/>
                {BOSS_ART[event.boss_result.boss_key] && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 0.3, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
                  >
                    <AxiomArt src={BOSS_ART[event.boss_result.boss_key]} alt="" className="w-[480px] h-[340px] rounded" />
                  </motion.div>
                )}
                <div className="font-mono text-xs tracking-[0.6em] text-[#FF2A2A] mb-2 text-glow-red">// BOSS DEFEATED //</div>
                <div className="font-display text-5xl md:text-7xl text-[#FF2A2A] text-glow-red mb-3 leading-none">{event.boss_result.name}</div>
                <div className="font-mono text-sm text-[#FFB000] text-glow-amber">+{event.xp_gain} XP · +{Math.floor(event.xp_gain/20)} CREDITS</div>
              </>
            ) : (
              <>
                <Burst count={22} color="#00F0FF"/>
                <div className="font-mono text-xs tracking-[0.6em] text-[#00F0FF] mb-2 text-glow-cyan">// QUEST COMPLETE //</div>
                <div className="font-display text-4xl md:text-5xl text-[#EAEAEA] mb-3" style={{textShadow: "0 0 20px rgba(0,240,255,0.7)"}}>+{event.xp_gain} XP</div>
                {event.boss_result && (
                  <div className="font-mono text-xs text-[#FF2A2A]">
                    {event.boss_result.name}: -{event.boss_result.damage} · {event.boss_result.resistance}/{event.boss_result.max_resistance}
                  </div>
                )}
                {event.shield_consumed && (
                  <div className="font-mono text-[10px] text-[#00F0FF] tracking-[0.3em] mt-2">// SHIELD ABSORBED MISSED DAY //</div>
                )}
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
