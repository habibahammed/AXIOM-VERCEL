import React, { useEffect, useState } from "react";
import { masteryEngine } from "@/engine/masteryEngine";
import { usePlayer } from "@/state/PlayerContext";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { Trophy, Lock, Sparkles, Check } from "lucide-react";

const CheckRow = ({ c }) => (
  <div className="flex items-center justify-between text-[11px] font-mono py-1">
    <div className="flex items-center gap-2">
      {c.ok ? <Check size={12} className="text-[#00F0FF]" strokeWidth={2}/> : <span className="w-3 h-3 border border-[#8A8A93]"/>}
      <span className={c.ok ? "text-[#EAEAEA]" : "text-[#8A8A93]"}>{c.label}</span>
    </div>
    <span className={c.ok ? "text-[#00F0FF]" : "text-[#8A8A93]"}>{c.value}</span>
  </div>
);

export default function Trials() {
  const [trials, setTrials] = useState([]);
  const [busy, setBusy] = useState(null);
  const { triggerEvent, refresh } = usePlayer();

  const load = async () => {
    const data = await masteryEngine.listTrials();
    setTrials(data);
  };
  useEffect(() => { load(); }, []);

  const attempt = async (t) => {
    setBusy(t.id); sound.ui();
    try {
      const data = await masteryEngine.attemptTrial(t.id);
      toast.success(`TRIAL CONQUERED · +${data.xp_gain} XP`);
      sound.rankUp();
      triggerEvent({ ...data, trial_complete: true, xp_gain: data.xp_gain, boss_result: null });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "TRIAL DENIED");
    } finally { setBusy(null); }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] text-glow-amber">// MONARCH TRIALS</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">SANCTIONED ORDEALS</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">RARE · HIGH-XP · UNLOCK ORIGINAL TITLES</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {trials.map(t => {
          const state = t.completed ? "CONQUERED" : t.unlocked ? "READY" : "SEALED";
          const stateColor = t.completed ? "#FFB000" : t.unlocked ? "#00F0FF" : "#8A8A93";
          return (
            <div key={t.id} className={`hud-panel ${t.unlocked && !t.completed ? "" : ""} p-6 relative ${t.unlocked ? "scanline" : ""}`} data-testid={`trial-${t.id}`}>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 flex items-center justify-center clip-tech border`} style={{borderColor: stateColor, color: stateColor, background:"rgba(0,0,0,0.5)"}}>
                  {t.completed ? <Trophy size={22} strokeWidth={1.5}/> : t.unlocked ? <Sparkles size={22} strokeWidth={1.5}/> : <Lock size={22} strokeWidth={1.5}/>}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[9px] tracking-[0.4em]" style={{color: stateColor}}>// {state}</div>
                  <h3 className="font-display text-xl text-[#EAEAEA] leading-tight">{t.name}</h3>
                </div>
              </div>
              <p className="font-heading text-sm text-[#8A8A93] my-3">{t.description}</p>
              <div className="border-t border-white/10 pt-3">
                <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93] mb-2">// PREREQUISITES</div>
                {t.checks.map((c,i) => <CheckRow key={i} c={c}/>)}
              </div>
              <div className="mt-3 flex items-center gap-3 font-mono text-xs">
                <span className="text-[#8A8A93]">REWARD</span>
                <span className="text-[#FFB000] text-glow-amber">+{t.reward_xp} XP</span>
                <span className="text-[#00F0FF]">· TITLE "{t.reward_title}"</span>
              </div>
              <button
                disabled={!t.unlocked || t.completed || busy === t.id}
                onClick={() => attempt(t)}
                className="mt-4 w-full py-2 border font-display tracking-[0.3em] text-sm clip-tech transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: t.completed ? "#FFB000" : "#00F0FF",
                  color: t.completed ? "#FFB000" : "#00F0FF",
                  background: t.completed ? "rgba(255,176,0,0.08)" : "rgba(0,240,255,0.08)",
                }}
                data-testid={`btn-trial-${t.id}`}
              >
                {t.completed ? "CONQUERED" : t.unlocked ? (busy === t.id ? "PROCESSING..." : "CONFRONT TRIAL") : "SEALED"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
