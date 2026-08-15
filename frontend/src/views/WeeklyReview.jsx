import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { Sparkles, Flame, TrendingUp } from "lucide-react";

const Metric = ({ label, value, color = "#00F0FF" }) => (
  <div className="border border-white/10 p-3 clip-tech bg-black/30">
    <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">{label}</div>
    <div className="font-display text-2xl" style={{color, textShadow: `0 0 12px ${color}`}}>{value}</div>
  </div>
);

export default function WeeklyReview() {
  const [data, setData] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/weekly-review").then(r => setData(r.data)); }, []);

  const generate = async () => {
    setBusy(true); sound.ui();
    try {
      const { data: r } = await api.post("/weekly-review/generate");
      setReview(r.review);
      setData(r.data);
      sound.levelUp();
      toast.success("WEEK REVIEWED");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "REVIEW FAILED");
    } finally { setBusy(false); }
  };

  if (!data) return <div className="hud-panel p-8 font-mono text-[#00F0FF] tracking-[0.4em]">// COMPILING ...</div>;

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] text-glow-amber">// WEEKLY REVIEW</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">SEVEN-DAY RITUAL</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">A LOOK BACKWARD SO THE NEXT WEEK STRIKES TRUER</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="XP THIS WEEK" value={data.xp_earned}/>
        <Metric label="QUESTS DONE" value={data.quests_completed}/>
        <Metric label="BOSS HITS" value={data.boss_hits} color="#FF2A2A"/>
        <Metric label="LVL/RANK UPS" value={`${data.level_ups}/${data.rank_ups}`} color="#FFB000"/>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// DOMAIN XP THIS WEEK</div>
          {Object.keys(data.by_domain).length === 0 ? (
            <div className="font-mono text-xs text-[#8A8A93]">No XP earned this week. Ignite something.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.by_domain).sort((a,b) => b[1]-a[1]).map(([k, v]) => {
                const max = Math.max(...Object.values(data.by_domain));
                const pct = (v / max) * 100;
                const strong = k === data.strongest_domain;
                const weak = k === data.weakest_domain;
                return (
                  <div key={k}>
                    <div className="flex justify-between font-mono text-[10px] mb-1">
                      <span className={strong ? "text-[#00F0FF]" : weak ? "text-[#FF2A2A]" : "text-[#EAEAEA]"}>
                        {k.replace(/_/g," ")}
                        {strong && " · STRONGEST"}
                        {weak && !strong && " · WEAKEST"}
                      </span>
                      <span className="text-[#FFB000]">{v} XP</span>
                    </div>
                    <div className="h-1.5 bg-white/5"><div className="h-full" style={{width: `${pct}%`, background: strong ? "#00F0FF" : weak ? "#FF2A2A" : "#FFB000", boxShadow: `0 0 6px ${strong ? "#00F0FF" : weak ? "#FF2A2A" : "#FFB000"}`}}/></div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 border-t border-white/10 pt-4 space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Flame size={12} className="text-[#FFB000]" strokeWidth={1.5}/>
              <span className="text-[#8A8A93]">STREAK</span><span className="text-[#FFB000] ml-auto">{data.streak}D</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <TrendingUp size={12} className="text-[#00F0FF]" strokeWidth={1.5}/>
              <span className="text-[#8A8A93]">PRIME OBJECTIVE</span><span className="text-[#EAEAEA] ml-auto text-right max-w-[60%]">{data.prime_objective || "—"}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 hud-panel p-5 scanline">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// ARCHITECT SYNTHESIS</div>
            <button onClick={generate} disabled={busy}
              className="px-4 py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.25em] text-xs disabled:opacity-40 flex items-center gap-2"
              data-testid="btn-generate-review">
              <Sparkles size={14} strokeWidth={1.5}/>
              {busy ? "SYNTHESISING..." : review ? "RE-SYNTHESISE" : "RUN REVIEW"}
            </button>
          </div>
          {review ? (
            <pre className="font-mono text-sm text-[#EAEAEA] whitespace-pre-wrap border-l-2 border-[#00F0FF] pl-4 py-2 bg-black/40 min-h-40" data-testid="review-body">{review}</pre>
          ) : (
            <div className="font-heading text-sm text-[#8A8A93] leading-relaxed">
              Ask AXIOM to compress the last seven days into a summary, name your strongest and weakest domain, and issue a prime objective and first command for the week ahead.
              <br/><br/>
              Ideal ritual time: <span className="text-[#FFB000]">Sunday evening</span> — before you plan the next.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
