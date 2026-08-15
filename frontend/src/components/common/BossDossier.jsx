import React, { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { sound } from "@/services/sound";
import { X, Sparkles, Skull, Check } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import TiltCard from "@/components/common/TiltCard";
import { BOSS_ART } from "@/services/assets/registry";

export default function BossDossier({ bossKey, onClose }) {
  const [d, setD] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    api.get(`/bosses/${bossKey}/dossier`).then(r => setD(r.data));
  }, [bossKey]);

  const requestStrategy = async () => {
    setBusy(true); sound.ui();
    try {
      const { data } = await api.post(`/bosses/${bossKey}/strategy`);
      setStrategy(data.strategy);
    } finally { setBusy(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="hud-panel hud-panel-danger scanline p-6 w-full max-w-3xl max-h-[88vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
        data-testid="boss-dossier"
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8A8A93] hover:text-[#FF2A2A]" data-testid="btn-close-dossier">
          <X size={20} strokeWidth={1.5}/>
        </button>
        {!d ? (
          <div className="font-mono text-[#00F0FF] tracking-[0.4em]">// LOADING DOSSIER ...</div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-4">
              <TiltCard glowColor="#FF2A2A" tiltStrength={9} sparkleRadius={26} className="w-16 h-16 flex-shrink-0">
                <div className={`w-16 h-16 relative flex items-center justify-center clip-tech border border-[#FF2A2A]/60 text-[#FF2A2A] bg-black/50 overflow-hidden`}>
                  {BOSS_ART[bossKey] && (
                    <AxiomArt src={BOSS_ART[bossKey]} alt={d.boss.name} className="absolute inset-0 w-full h-full opacity-90" />
                  )}
                  <span className="relative z-10" style={{textShadow: "0 0 6px #000, 0 0 10px #000"}}><Skull size={28} strokeWidth={1.5}/></span>
                </div>
              </TiltCard>
              <div className="flex-1">
                <div className="font-mono text-[10px] tracking-[0.4em] text-[#FF2A2A]">// {d.boss.domain.replace(/_/g," ")}</div>
                <h2 className="font-display text-2xl text-[#EAEAEA]">{d.boss.name}</h2>
                <div className="font-mono text-[10px] text-[#8A8A93] mt-1 tracking-[0.25em]">
                  PHASE {d.boss.current_phase}/{d.boss.phases} · {d.boss.status}
                </div>
              </div>
            </div>
            <p className="font-heading text-[#8A8A93] mb-4">{d.boss.description}</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="border border-white/10 p-2 clip-tech">
                <div className="font-mono text-[9px] text-[#8A8A93]">RESISTANCE</div>
                <div className="font-display text-lg text-[#FF2A2A]">{d.boss.resistance}/{d.boss.max_resistance}</div>
              </div>
              <div className="border border-white/10 p-2 clip-tech">
                <div className="font-mono text-[9px] text-[#8A8A93]">DAMAGE DEALT</div>
                <div className="font-display text-lg text-[#00F0FF]">{d.total_damage_dealt}</div>
              </div>
              <div className="border border-white/10 p-2 clip-tech">
                <div className="font-mono text-[9px] text-[#8A8A93]">CONTRIBUTORS</div>
                <div className="font-display text-lg text-[#FFB000]">{d.contributing_quests.length}</div>
              </div>
            </div>

            <div className="h-2 bg-white/5 mb-4">
              <div className="h-full bg-gradient-to-r from-[#FFB000] to-[#00F0FF]" style={{width: `${d.damage_pct*100}%`, boxShadow: "0 0 8px rgba(0,240,255,0.6)"}}/>
            </div>

            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.4em] text-[#00F0FF] mb-2">// LINKED QUESTS · {d.linked_quests.length}</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {d.linked_quests.map(q => (
                  <div key={q.id} className="flex items-center gap-2 border border-white/10 px-2 py-1.5 clip-tech text-xs" data-testid={`dossier-quest-${q.id}`}>
                    {q.status === "COMPLETED" ? <Check size={12} className="text-[#00F0FF]" strokeWidth={2}/> : <span className="w-3 h-3 border border-[#8A8A93]"/>}
                    <span className={q.status === "COMPLETED" ? "text-[#8A8A93] line-through" : "text-[#EAEAEA]"}>{q.title}</span>
                    <span className="ml-auto font-mono text-[10px] text-[#FFB000]">+{q.xp_reward}</span>
                  </div>
                ))}
                {d.linked_quests.length === 0 && <div className="text-[#8A8A93] font-mono text-xs">No quests linked yet. Forge one from the Quest Board.</div>}
              </div>
            </div>

            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.4em] text-[#FFB000] mb-2">// PHASE HISTORY</div>
              <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                {d.damage_events.length === 0 && <div className="text-[#8A8A93]">No damage events yet.</div>}
                {d.damage_events.slice(0, 8).map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-[#8A8A93]">
                    <span className="text-[#FF2A2A]">›</span>
                    <span className="text-[#EAEAEA]">-{e.boss_result?.damage} DMG</span>
                    <span>· PHASE {e.boss_result?.phase}</span>
                    {e.boss_result?.defeated && <span className="text-[#FFB000]">· DEFEATED</span>}
                    <span className="ml-auto">{new Date(e.created_at).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// ARCHITECT COUNTER-STRATEGY</div>
                <button onClick={requestStrategy} disabled={busy}
                  className="px-3 py-1.5 text-xs border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10 clip-tech font-display tracking-[0.25em] disabled:opacity-40 flex items-center gap-1"
                  data-testid="btn-request-strategy">
                  <Sparkles size={12} strokeWidth={1.5}/>
                  {busy ? "AXIOM..." : strategy ? "RE-STRATEGISE" : "REQUEST STRATEGY"}
                </button>
              </div>
              {strategy ? (
                <pre className="font-mono text-sm text-[#EAEAEA] whitespace-pre-wrap border-l-2 border-[#00F0FF] pl-4 py-2 bg-black/40" data-testid="strategy-body">{strategy}</pre>
              ) : (
                <div className="font-mono text-xs text-[#8A8A93]">Request an Architect counter-pattern tailored to this boss and your current state.</div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
