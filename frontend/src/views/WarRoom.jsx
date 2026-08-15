import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { sound } from "@/services/sound";
import { TrendingDown, Zap } from "lucide-react";
import { clampPercent } from "@/engine/progressionEngine";

const Metric = ({ label, value, color = "#00F0FF" }) => (
  <div className="hud-panel p-4">
    <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">{label}</div>
    <div className="font-display text-2xl" style={{color, textShadow: `0 0 12px ${color}`}}>{value}</div>
  </div>
);

const Bar = ({ pct, color = "#00F0FF" }) => (
  <div className="h-1.5 bg-white/5">
    <div className="h-full" style={{width: `${clampPercent(pct)}%`, background: color, boxShadow: `0 0 6px ${color}`}}/>
  </div>
);

export default function WarRoom() {
  const [a, setA] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/analytics");
    setA(data);
  };
  useEffect(() => { load(); }, []);

  const runVerdict = async () => {
    setBusy(true); sound.ui();
    try {
      const { data } = await api.post("/analytics/verdict", {});
      setVerdict(data.verdict);
    } finally { setBusy(false); }
  };

  if (!a) return <div className="hud-panel p-8 font-mono text-[#00F0FF] tracking-[0.4em]">// SCANNING ...</div>;

  const maxDaily = Math.max(1, ...a.daily_xp.map(d => d.xp));
  const compPct = Math.round(a.completion_rate * 100);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FF2A2A] text-glow-red">// ADAPTIVE WAR ROOM</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">DIAGNOSTIC UPLINK</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="COMPLETION RATE" value={`${compPct}%`} color={compPct >= 50 ? "#00F0FF" : "#FFB000"}/>
        <Metric label="COMPLETED" value={a.completed_quests} color="#00F0FF"/>
        <Metric label="ACTIVE" value={a.active_quests} color="#FFB000"/>
        <Metric label="STREAK" value={`${a.streak}D`} color="#FFB000"/>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 hud-panel p-5 scanline">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// 7-DAY XP</div>
            <Zap size={14} className="text-[#FFB000]" strokeWidth={1.5}/>
          </div>
          <div className="flex items-end gap-2 h-40" data-testid="daily-xp-chart">
            {a.daily_xp.map((d, i) => {
              const h = (d.xp / maxDaily) * 100;
              const label = new Date(d.date).toLocaleDateString([], { weekday: "short" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end h-full">
                    <div className="w-full" style={{
                      height: `${Math.max(2, h)}%`,
                      background: d.xp > 0 ? "linear-gradient(180deg, #FFB000, #00F0FF)" : "rgba(255,255,255,0.08)",
                      boxShadow: d.xp > 0 ? "0 0 10px rgba(0,240,255,0.5)" : "none"
                    }}/>
                  </div>
                  <div className="font-mono text-[9px] text-[#8A8A93]">{label.toUpperCase()}</div>
                  <div className="font-mono text-[9px] text-[#EAEAEA]">{d.xp}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#FF2A2A] mb-3 flex items-center gap-2">
            <TrendingDown size={12} strokeWidth={1.5}/> DROP-OFF
          </div>
          {a.dropoff ? (
            <>
              <div className="font-display text-lg text-[#EAEAEA]">{a.dropoff.domain.replace(/_/g," ")}</div>
              <div className="font-mono text-[10px] text-[#8A8A93] mb-2 tracking-[0.3em]">
                {a.dropoff.completed}/{a.dropoff.total} · {Math.round(a.dropoff.rate*100)}%
              </div>
              <Bar pct={a.dropoff.rate*100} color="#FF2A2A"/>
            </>
          ) : (
            <div className="font-mono text-xs text-[#8A8A93]">Insufficient data. Complete more quests across domains.</div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-2">// DIFFICULTY MIX</div>
            <div className="space-y-2">
              {Object.entries(a.difficulty_counts).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between font-mono text-[10px] mb-0.5">
                    <span className="text-[#EAEAEA]">{k}</span><span className="text-[#8A8A93]">{v}</span>
                  </div>
                  <Bar pct={(v / a.completed_quests) * 100} color="#00F0FF"/>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// DOMAIN COMPLETION</div>
          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(a.by_domain).map(([d, v]) => {
              const rate = v.total ? (v.completed / v.total) : 0;
              const color = rate >= 0.7 ? "#00F0FF" : rate >= 0.4 ? "#FFB000" : "#FF2A2A";
              return (
                <div key={d} className="border border-white/10 p-3 clip-tech">
                  <div className="font-mono text-[10px] text-[#8A8A93]">{d.replace(/_/g," ")}</div>
                  <div className="flex justify-between font-mono text-xs mb-1"><span className="text-[#EAEAEA]">{v.completed}/{v.total}</span><span style={{color}}>{Math.round(rate*100)}%</span></div>
                  <Bar pct={rate*100} color={color}/>
                  <div className="font-mono text-[9px] text-[#FFB000] mt-1">{v.xp} XP</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 hud-panel p-5 scanline">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// ARCHITECT VERDICT</div>
            <button onClick={runVerdict} disabled={busy}
              className="px-3 py-1.5 text-xs border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10 clip-tech font-display tracking-[0.25em] disabled:opacity-40"
              data-testid="btn-run-verdict">
              {busy ? "PROCESSING..." : "REQUEST TUNING"}
            </button>
          </div>
          {verdict ? (
            <div className="font-mono text-sm text-[#EAEAEA] whitespace-pre-wrap border-l-2 border-[#00F0FF] pl-4 py-2 bg-black/40" data-testid="verdict-body">{verdict}</div>
          ) : (
            <div className="font-mono text-xs text-[#8A8A93]">Request a diagnostic tuning command from AXIOM. The Architect will identify your weakest domain and issue one directive.</div>
          )}
        </div>
      </div>
    </div>
  );
}
