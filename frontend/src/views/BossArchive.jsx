import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bossEngine } from "@/engine/bossEngine";
import { Skull, Trophy } from "lucide-react";
import BossDossier from "@/components/common/BossDossier";
import AxiomArt from "@/components/common/AxiomArt";
import TiltCard from "@/components/common/TiltCard";
import { BOSS_ART } from "@/services/assets/registry";
import { ENVIRONMENT_ART } from "@/services/assets/registry";

export default function BossArchive() {
  const [bosses, setBosses] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  useEffect(() => { bossEngine.list().then(setBosses); }, []);

  return (
    <div className="relative">
      <div className="fixed inset-0 -z-20 opacity-[0.14] pointer-events-none">
        <AxiomArt src={ENVIRONMENT_ART.bossArena} alt="" className="w-full h-full" />
        <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 50% 30%, transparent 0%, #000 80%)"}}/>
      </div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FF2A2A] text-glow-red">// BOSS ARCHIVE</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">BEHAVIORAL THREATS</h1>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bosses.map((b, idx) => {
          const pct = (b.resistance / b.max_resistance) * 100;
          const defeated = b.status === "DEFEATED";
          return (
            <motion.button key={b.id} onClick={() => setSelectedKey(b.boss_key)}
              className={`hud-panel ${defeated ? "" : "hud-panel-danger"} p-5 relative scanline text-left hover:-translate-y-0.5 transition-transform`}
              data-testid={`boss-${b.boss_key}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-start gap-3">
                <TiltCard glowColor={defeated ? "#FFB000" : "#FF2A2A"} tiltStrength={10} sparkleRadius={28} className="w-20 h-20 flex-shrink-0">
                  <div className={`w-20 h-20 relative flex items-center justify-center clip-tech border overflow-hidden ${defeated ? "border-[#FFB000]/70 text-[#FFB000]" : "border-[#FF2A2A]/70 text-[#FF2A2A]"} bg-black/60`}
                       style={{boxShadow: defeated ? "0 0 18px rgba(255,176,0,0.4), inset 0 0 18px rgba(255,176,0,0.18)" : "0 0 18px rgba(255,42,42,0.45), inset 0 0 18px rgba(255,42,42,0.2)"}}>
                    {BOSS_ART[b.boss_key] && (
                      <AxiomArt src={BOSS_ART[b.boss_key]} alt={b.name} className={`absolute inset-0 w-full h-full ${defeated ? "opacity-55 grayscale" : "opacity-95"}`} />
                    )}
                    <div className="absolute inset-0 pointer-events-none" style={{background: defeated ? "radial-gradient(circle at 50% 40%, transparent 45%, rgba(255,176,0,0.22) 100%)" : "radial-gradient(circle at 50% 40%, transparent 45%, rgba(255,42,42,0.28) 100%)"}}/>
                    <span className="relative z-10" style={{textShadow: "0 0 6px #000, 0 0 12px #000"}}>
                      {defeated ? <Trophy size={30} strokeWidth={1.5}/> : <Skull size={30} strokeWidth={1.5}/>}
                    </span>
                  </div>
                </TiltCard>
                <div className="flex-1">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-[#8A8A93]">{b.domain}</div>
                  <h3 className={`font-display text-lg ${defeated ? "text-[#FFB000] text-glow-amber" : "text-[#EAEAEA]"}`}>{b.name}</h3>
                </div>
              </div>
              <p className="font-heading text-sm text-[#8A8A93] my-3">{b.description}</p>
              <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#8A8A93]">RESISTANCE</span>
                <span className={defeated ? "text-[#FFB000]" : "text-[#FF2A2A]"}>{b.resistance}/{b.max_resistance}</span>
              </div>
              <div className="h-2 bg-white/5">
                <div className={`h-full ${defeated ? "bg-[#FFB000]" : "bg-[#FF2A2A]"}`} style={{width: `${pct}%`, boxShadow: defeated ? "0 0 8px #FFB000" : "0 0 8px #FF2A2A"}}></div>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.25em]">
                <span className="text-[#8A8A93]">PHASE {b.current_phase}/{b.phases}</span>
                <span className={defeated ? "text-[#FFB000]" : "text-[#FF2A2A]"}>{b.status}</span>
              </div>
              <div className="mt-2 font-mono text-[9px] text-[#00F0FF] tracking-[0.25em]">// CLICK FOR DOSSIER →</div>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {selectedKey && <BossDossier key={selectedKey} bossKey={selectedKey} onClose={() => setSelectedKey(null)}/>}
      </AnimatePresence>
    </div>
  );
}
