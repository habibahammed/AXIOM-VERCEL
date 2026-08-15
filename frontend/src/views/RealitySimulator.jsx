import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { AxiomScene } from "@/components/3d/AxiomScene";
import { sound } from "@/services/sound";
import { clampPercent } from "@/engine/progressionEngine";

const TINT = {
  cyan: { color: "#00F0FF", glow: "0 0 12px #00F0FF" },
  amber: { color: "#FFB000", glow: "0 0 12px #FFB000" },
  red: { color: "#FF2A2A", glow: "0 0 12px #FF2A2A" },
};

const TrajectoryCard = ({ t, currentLevel }) => {
  const meta = TINT[t.tint];
  const pctBar = clampPercent(t.projected_level, 104);
  return (
    <div className="hud-panel p-5 relative scanline" data-testid={`trajectory-${t.id}`}>
      <div className="font-mono text-[10px] tracking-[0.4em] mb-2" style={{color: meta.color, textShadow: meta.glow}}>// {t.name}</div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className="font-display text-4xl" style={{color: meta.color, textShadow: meta.glow}}>LVL {t.projected_level}</div>
        <div className={`font-mono text-xs ${t.level_delta >= 0 ? "text-[#00F0FF]" : "text-[#FF2A2A]"}`}>
          {t.level_delta >= 0 ? "+" : ""}{t.level_delta}
        </div>
      </div>
      <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.3em] mb-3">
        RANK {t.projected_rank.code} — {t.projected_rank.name}
      </div>
      <div className="h-2 bg-white/5 mb-1">
        <div className="h-full" style={{width: `${pctBar}%`, background: meta.color, boxShadow: meta.glow}}/>
      </div>
      <div className="flex justify-between font-mono text-[9px] text-[#8A8A93] mb-3">
        <span>{currentLevel}</span><span>104</span>
      </div>
      <div className="border-t border-white/10 pt-2 space-y-1 font-mono text-[10px]">
        <div className="flex justify-between"><span className="text-[#8A8A93]">DAILY XP</span><span style={{color: meta.color}}>{t.daily_xp}</span></div>
        <div className="flex justify-between"><span className="text-[#8A8A93]">HORIZON GAIN</span><span style={{color: meta.color}}>+{t.gain} XP</span></div>
        <div className="flex justify-between"><span className="text-[#8A8A93]">FINAL XP</span><span style={{color: meta.color}}>{t.projected_lifetime_xp}</span></div>
      </div>
      <div className="mt-3 font-heading text-sm text-[#EAEAEA] italic border-l-2 pl-3" style={{borderColor: meta.color}}>
        "{t.verdict}"
      </div>
    </div>
  );
};

export default function RealitySimulator() {
  const [horizon, setHorizon] = useState(30);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (h) => {
    setBusy(true); sound.ui();
    try {
      const r = await api.post("/simulator/project", { horizon_days: h });
      setData(r.data);
    } finally { setBusy(false); }
  };

  useEffect(() => { run(30); }, []);

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 opacity-25 pointer-events-none">
        <AxiomScene intensity={0.6}/>
      </div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] text-glow-cyan">// REALITY SIMULATOR</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">TRAJECTORY PROJECTIONS</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">ESTIMATES · NOT PROPHECY · YOUR ACTIONS OVERWRITE THIS</div>
      </div>

      <div className="hud-panel p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">// HORIZON</div>
        {[7, 30, 90, 180].map(h => (
          <button key={h} onClick={() => { setHorizon(h); run(h); }}
            className={`px-3 py-1.5 text-xs font-display tracking-[0.25em] border clip-tech transition-colors ${
              horizon === h ? "border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]" : "border-white/15 text-[#8A8A93] hover:border-white/40"
            }`}
            data-testid={`horizon-${h}`}
          >{h}D</button>
        ))}
        {data && (
          <div className="ml-auto font-mono text-[10px] text-[#8A8A93] tracking-[0.3em]">
            NOW · LVL {data.current_level} · RANK {data.current_rank.code} · ACTIVE {data.days_active}D
          </div>
        )}
      </div>

      {busy && !data && <div className="hud-panel p-8 text-center font-mono text-[#00F0FF] tracking-[0.4em]">// PROJECTING ...</div>}

      {data && (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            {data.trajectories.map(t => <TrajectoryCard key={t.id} t={t} currentLevel={data.current_level}/>)}
          </div>
          <div className="hud-panel p-4 mt-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-[#FFB000]">// SYSTEM NOTE</div>
            <div className="font-heading text-sm text-[#8A8A93] mt-1">{data.note}</div>
          </div>
        </>
      )}
    </div>
  );
}
