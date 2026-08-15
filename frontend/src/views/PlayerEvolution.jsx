import React from "react";
import { motion } from "framer-motion";
import { usePlayer } from "@/state/PlayerContext";
import AxiomArt from "@/components/common/AxiomArt";
import TiltCard from "@/components/common/TiltCard";
import { RANK_ART, STAT_ART, DOMAIN_ART } from "@/services/assets/registry";
import { clampPercent } from "@/engine/progressionEngine";
import { useAnimatedNumber } from "@/hooks/useMotion";

const StatCard = ({ k, v, max = 100 }) => {
  const anim = useAnimatedNumber(v, 900);
  return (
  <TiltCard glowColor="#00F0FF" tiltStrength={7}>
    <div className="hud-panel p-4 relative overflow-hidden">
      {STAT_ART[k] && (
        <AxiomArt src={STAT_ART[k]} alt={k} className="absolute -right-2 -top-2 w-20 h-20 opacity-45 pointer-events-none" fit="contain" style={{filter: "drop-shadow(0 0 10px rgba(0,240,255,0.5))"}} />
      )}
      <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93] relative">{k}</div>
      <div className="font-display text-3xl text-[#EAEAEA] text-glow-cyan relative" data-testid={`evo-stat-${k}`}>{anim}</div>
      <div className="h-1 mt-2 bg-white/5 relative">
        <div className="h-full bg-[#00F0FF] transition-[width] duration-700 ease-out" style={{width: `${clampPercent((v/max)*100)}%`, boxShadow: "0 0 6px #00F0FF"}}/>
      </div>
    </div>
  </TiltCard>
  );
};

const DomainRow = ({ k, v }) => {
  const anim = useAnimatedNumber(v, 1000);
  const pct = clampPercent(v, 2000);
  return (
    <motion.div className="flex items-center gap-2"
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
    >
      {DOMAIN_ART[k] && (
        <TiltCard glowColor="#FFB000" tiltStrength={14} sparkleRadius={22} className="w-14 h-14 flex-shrink-0" idleRotate>
          <div className="w-14 h-14 relative clip-tech border border-[#FFB000]/60 bg-black/60 overflow-hidden"
               style={{boxShadow: "0 0 14px rgba(255,176,0,0.35), inset 0 0 14px rgba(255,176,0,0.15)"}}>
            <AxiomArt src={DOMAIN_ART[k]} alt={k} className="absolute inset-0 w-full h-full" fit="cover" />
            <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(255,176,0,0.22) 100%)"}}/>
          </div>
        </TiltCard>
      )}
      <div className="flex-1">
        <div className="flex justify-between font-mono text-[10px] mb-1"><span className="text-[#8A8A93]">{k.replace(/_/g, " ")}</span><span className="text-[#FFB000]">{anim} XP</span></div>
        <div className="h-1.5 bg-white/5"><div className="h-full bg-[#FFB000] transition-[width] duration-700 ease-out" style={{width: `${pct}%`, boxShadow: "0 0 4px #FFB000"}}/></div>
      </div>
    </motion.div>
  );
};

export default function PlayerEvolution() {
  const { player } = usePlayer();
  const lifetimeAnim = useAnimatedNumber(player?.lifetime_xp || 0, 1100);
  const xpIntoAnim  = useAnimatedNumber(player?.xp_into_level || 0, 900);
  const streakAnim  = useAnimatedNumber(player?.streak || 0, 700);
  if (!player) return null;
  const rank = player.rank;
  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// PLAYER EVOLUTION</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">{player.display_name?.toUpperCase()}</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 hud-panel hud-panel-active p-6 flex flex-col items-center text-center scanline">
          <TiltCard glowColor="#00F0FF" tiltStrength={12} className="w-32 h-32 mb-4">
            <div className="w-32 h-32 relative clip-tech border border-[#00F0FF]/40 flex items-center justify-center overflow-hidden" style={{background:"radial-gradient(circle, rgba(0,240,255,0.2), transparent 70%)"}}>
              {RANK_ART[rank.code] && (
                <AxiomArt src={RANK_ART[rank.code]} alt={rank.code} eager className="absolute inset-0 w-full h-full opacity-85" />
              )}
              <span className="font-display text-5xl text-[#00F0FF] text-glow-cyan relative z-10" style={{textShadow:"0 0 10px #000, 0 0 20px #000"}}>{rank.code}</span>
            </div>
          </TiltCard>
          <div className="font-display text-xl text-[#EAEAEA]">{rank.name}</div>
          <div className="font-mono text-xs text-[#8A8A93] tracking-[0.25em] mt-1">LEVEL {player.level} / 104</div>
          <div className="w-full mt-4 font-mono text-xs">
            <div className="flex justify-between text-[#8A8A93] mb-1"><span>XP</span><span>{xpIntoAnim}/{player.xp_to_next_level}</span></div>
            <div className="seg-bar seg-bar-cyan">
              {Array.from({length:20}).map((_,i) => <div key={i} className={"seg " + ((i/20)*100 < (player.level_progress*100) ? "on" : "")}/>)}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs font-mono">
            <div className="border border-white/10 p-2 clip-tech text-center"><div className="text-[#8A8A93]">LIFETIME XP</div><div className="text-[#FFB000]">{lifetimeAnim}</div></div>
            <div className="border border-white/10 p-2 clip-tech text-center"><div className="text-[#8A8A93]">STREAK</div><div className="text-[#FFB000]">{streakAnim}D</div></div>
          </div>
          <div className="mt-2 font-mono text-[10px] text-[#8A8A93] tracking-[0.25em]">TITLE · <span className="text-[#00F0FF]">{player.active_title}</span></div>
        </div>

        <div className="col-span-12 md:col-span-8 space-y-4">
          <div className="hud-panel p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// CORE ATTRIBUTES</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(player.stats).map(([k,v]) => <StatCard key={k} k={k} v={v} />)}
            </div>
          </div>
          <div className="hud-panel p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] mb-3">// DEVELOPMENT DOMAINS</div>
            <div className="space-y-2">
              {Object.entries(player.domains || {}).map(([k, v]) => {
                return <DomainRow key={k} k={k} v={v} />;
              })}
            </div>
          </div>
          <div className="hud-panel p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// TITLES · MEDALS</div>
            <div className="flex flex-wrap gap-2">
              {player.titles.map(t => (
                <span key={t} className="px-3 py-1 border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-[10px] tracking-[0.25em] clip-tech" data-testid={`title-${t}`}>{t}</span>
              ))}
              {player.medals.length === 0 && <span className="text-[#8A8A93] font-mono text-xs">Medals unlock through boss victories and trials.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
