import React, { useState } from "react";
import { api } from "@/services/api";
import { usePlayer } from "@/state/PlayerContext";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AxiomScene } from "@/components/3d/AxiomScene";
import { ChevronRight, Sparkles } from "lucide-react";

const DOMAINS = [
  { k: "DISCIPLINE", label: "DISCIPLINE" },
  { k: "PHYSICAL_DEVELOPMENT", label: "PHYSICAL DEVELOPMENT" },
  { k: "ACADEMICS", label: "ACADEMICS / LEARNING" },
  { k: "CREATIVITY", label: "CREATIVITY" },
  { k: "FINANCIAL_CAPABILITY", label: "FINANCIAL" },
  { k: "COMMUNICATION", label: "COMMUNICATION" },
  { k: "EMOTIONAL_CONTROL", label: "EMOTIONAL CONTROL" },
  { k: "RECOVERY", label: "RECOVERY" },
];

export default function OnboardingRitual({ onDone }) {
  const { refresh } = usePlayer();
  const [step, setStep] = useState(0);
  const [prime, setPrime] = useState("");
  const [focus, setFocus] = useState("DISCIPLINE");
  const [busy, setBusy] = useState(false);
  const [quests, setQuests] = useState(null);

  const next = () => { sound.ui(); setStep(s => s + 1); };

  const submit = async () => {
    setBusy(true); sound.levelUp();
    try {
      const { data } = await api.post("/onboarding/complete", { prime_objective: prime.trim(), focus_area: focus });
      setQuests(data.quests);
      setStep(3);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "RITUAL FAILED");
    } finally { setBusy(false); }
  };

  const finish = () => { sound.rankUp(); onDone?.(); };

  return (
    <div className="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <AxiomScene intensity={0.9}/>
      </div>
      <div className="absolute inset-0 grid-void opacity-25"/>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.35 }}
          className="hud-panel scanline p-8 w-[92%] max-w-xl relative z-10 clip-tech"
          data-testid="onboarding-modal"
        >
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-2">// INITIATION RITUAL · STEP {Math.min(step+1, 4)}/4</div>

          {step === 0 && (
            <>
              <h2 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mb-3">WELCOME, PLAYER.</h2>
              <p className="font-heading text-[#8A8A93] mb-6">
                AXIOM is not an app. It is an operating system for your evolution.
                Your real actions become XP. Your XP becomes stats. Your stats defeat the shadows.
                Before we begin, we must calibrate.
              </p>
              <button onClick={next} className="px-5 py-2.5 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em] flex items-center gap-2" data-testid="onb-next-0">
                CALIBRATE <ChevronRight size={14}/>
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-2xl text-[#EAEAEA] mb-3">DECLARE YOUR PRIME OBJECTIVE.</h2>
              <p className="font-heading text-[#8A8A93] mb-4">
                One outcome you want in real life. Short. Specific. Achievable within 90 days.
              </p>
              <textarea
                value={prime} onChange={e => setPrime(e.target.value)} rows={3}
                placeholder="e.g. Ship the AXIOM launch. Or: run a 5K without stopping."
                className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 font-heading focus:outline-none focus:border-[#00F0FF]"
                data-testid="onb-prime"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={next} disabled={prime.trim().length < 6}
                  className="px-5 py-2.5 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em] flex items-center gap-2 disabled:opacity-30" data-testid="onb-next-1">
                  CONTINUE <ChevronRight size={14}/>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-2xl text-[#EAEAEA] mb-3">SELECT PRIMARY DOMAIN.</h2>
              <p className="font-heading text-[#8A8A93] mb-4">
                The Architect will forge your first 3 quests in this domain. You can add more later.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {DOMAINS.map(d => (
                  <button key={d.k} type="button" onClick={() => setFocus(d.k)}
                    className={`px-3 py-2 border clip-tech font-display tracking-[0.2em] text-xs text-left ${focus === d.k ? "border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]" : "border-white/15 text-[#8A8A93] hover:border-white/40"}`}
                    data-testid={`onb-domain-${d.k}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <button onClick={submit} disabled={busy}
                className="px-5 py-2.5 border border-[#FFB000] text-[#FFB000] hover:bg-[#FFB000]/15 clip-tech font-display tracking-[0.3em] flex items-center gap-2 disabled:opacity-30" data-testid="onb-forge">
                <Sparkles size={14} strokeWidth={1.5}/> {busy ? "AXIOM IS FORGING..." : "FORGE STARTER QUESTS"}
              </button>
            </>
          )}

          {step === 3 && quests && (
            <>
              <h2 className="font-display text-2xl text-[#00F0FF] text-glow-cyan mb-2">RITUAL COMPLETE.</h2>
              <p className="font-heading text-[#8A8A93] mb-4">
                Your first three commands are inscribed. The system is live.
              </p>
              <div className="space-y-2 mb-6">
                {quests.map((q, i) => (
                  <div key={q.id} className="border border-[#00F0FF]/20 p-3 clip-tech bg-black/40" data-testid={`onb-q-${i}`}>
                    <div className="flex items-center gap-2 mb-1 font-mono text-[9px] tracking-[0.3em]">
                      <span className={q.kind === "MAIN" ? "text-[#FFB000]" : q.kind === "SUPPORT" ? "text-[#00F0FF]" : "text-[#EAEAEA]"}>{q.kind}</span>
                      <span className="text-[#8A8A93]">· {q.difficulty} · {q.duration_min}m · +{q.xp_reward} XP</span>
                    </div>
                    <div className="font-heading text-[#EAEAEA]">{q.title}</div>
                    <div className="font-mono text-[10px] text-[#8A8A93]">{q.description}</div>
                  </div>
                ))}
              </div>
              <button onClick={finish} className="px-5 py-2.5 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em]" data-testid="onb-enter">
                ENTER AXIOM
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
