import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { usePlayer } from "@/state/PlayerContext";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, X, Sparkles } from "lucide-react";

export default function ShieldStore({ open, onClose }) {
  const { refresh } = usePlayer();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/store");
    setState(data);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const buy = async () => {
    setBusy(true); sound.ui();
    try {
      const { data } = await api.post("/store/buy-shield");
      setState({ ...state, ...data });
      sound.levelUp();
      toast.success("SHIELD FORGED");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "PURCHASE DENIED");
    } finally { setBusy(false); }
  };

  if (!open) return null;
  const canBuy = state && state.credits >= state.shield_cost && state.streak_shields < state.shield_max;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="shield-store"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
          className="hud-panel scanline p-8 max-w-md w-full relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-[#8A8A93] hover:text-[#FF2A2A]" data-testid="btn-close-store">
            <X size={20} strokeWidth={1.5}/>
          </button>

          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-1">// AXIOM STORE</div>
          <h2 className="font-display text-2xl text-[#EAEAEA] text-glow-cyan mb-6">SHIELD FORGE</h2>

          {state ? (
            <>
              <div className="flex items-center gap-4 mb-6 justify-center">
                <div className="text-center">
                  <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.3em]">CREDITS</div>
                  <div className="font-display text-3xl text-[#00F0FF] text-glow-cyan flex items-center justify-center gap-1">
                    <Zap size={20} strokeWidth={1.5}/>{state.credits}
                  </div>
                </div>
                <div className="w-px h-12 bg-white/10"/>
                <div className="text-center">
                  <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.3em]">HELD SHIELDS</div>
                  <div className="font-display text-3xl text-[#FFB000] text-glow-amber flex items-center justify-center gap-1">
                    <Shield size={20} strokeWidth={1.5}/>{state.streak_shields}
                  </div>
                </div>
              </div>

              <div className="border border-[#00F0FF]/30 clip-tech p-5 bg-black/40 relative mb-4">
                <div className="absolute -top-2 left-3 px-2 bg-black font-mono text-[9px] tracking-[0.3em] text-[#FFB000]">// PRODUCT 001</div>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 flex items-center justify-center clip-tech border border-[#00F0FF]/60 text-[#00F0FF] bg-[#00F0FF]/10">
                    <Shield size={26} strokeWidth={1.5}/>
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-lg text-[#EAEAEA]">STREAK SHIELD</div>
                    <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.25em]">ABSORBS ONE MISSED DAY</div>
                    <div className="font-heading text-sm text-[#8A8A93] mt-2">
                      Deploys automatically on the first day you miss. Your streak survives. Momentum unbroken.
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.25em]">
                    CAPACITY {state.streak_shields}/{state.shield_max}
                  </div>
                  <div className="font-display text-2xl text-[#FFB000] text-glow-amber flex items-center gap-1">
                    <Zap size={16} strokeWidth={1.5}/>{state.shield_cost}
                  </div>
                </div>
              </div>

              <button onClick={buy} disabled={!canBuy || busy}
                className="w-full py-3 border font-display tracking-[0.3em] clip-tech flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{
                  borderColor: canBuy ? "#00F0FF" : "#8A8A93",
                  color: canBuy ? "#00F0FF" : "#8A8A93",
                  background: canBuy ? "rgba(0,240,255,0.1)" : "transparent",
                }}
                data-testid="btn-buy-shield">
                <Sparkles size={14} strokeWidth={1.5}/>
                {busy ? "FORGING..."
                  : state.streak_shields >= state.shield_max ? "CAPACITY REACHED"
                  : !canBuy ? `NEED ${state.shield_cost - state.credits} MORE CREDITS`
                  : "FORGE SHIELD"}
              </button>

              <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.25em] mt-4 leading-relaxed">
                Credits are earned by completing quests. Every rank ascension also grants +1 shield free.
                Shield cost scales — the higher your capacity, the pricier each next one.
              </div>
            </>
          ) : (
            <div className="font-mono text-[#00F0FF] tracking-[0.4em]">// LOADING ...</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
