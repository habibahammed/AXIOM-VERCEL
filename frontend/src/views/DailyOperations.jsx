import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { QuestCard, useCompleteQuest } from "@/views/QuestBoard";

const Section = ({ title, subtitle, tint, children }) => (
  <div className="hud-panel p-5 mb-4">
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <div className={`font-mono text-[10px] tracking-[0.5em] ${tint}`}>{title}</div>
        <div className="font-mono text-[10px] text-[#8A8A93] mt-0.5">{subtitle}</div>
      </div>
    </div>
    {children}
  </div>
);

export default function DailyOperations() {
  const [today, setToday] = useState({ MAIN: [], SUPPORT: [], MICRO: [] });
  const complete = useCompleteQuest();

  const load = async () => {
    const { data } = await api.get("/quests/today");
    setToday(data);
  };
  useEffect(() => { load(); }, []);

  const handle = async (q) => { await complete(q); await load(); };
  const primary = today.MAIN?.[0];

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] text-glow-amber">// DAILY OPERATIONS BRIEFING</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">{new Date().toLocaleDateString([], {weekday:"long", month:"short", day:"numeric"}).toUpperCase()}</h1>
      </div>

      {primary && (
        <div className="hud-panel corner-ticks p-6 mb-4 scanline">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] mb-2">// PRIMARY OBJECTIVE OF THE DAY</div>
          <h2 className="font-display text-3xl text-[#EAEAEA] mb-2">{primary.title}</h2>
          <p className="font-heading text-[#8A8A93]">{primary.description}</p>
        </div>
      )}

      <Section title="// MAIN QUESTS" subtitle="EXECUTE FIRST" tint="text-[#FFB000]">
        <div className="grid md:grid-cols-2 gap-3">
          {today.MAIN?.map(q => <QuestCard key={q.id} q={q} onComplete={handle} />)}
          {(!today.MAIN || today.MAIN.length === 0) && <div className="text-[#8A8A93] font-mono text-xs col-span-2">No main quests assigned.</div>}
        </div>
      </Section>

      <Section title="// SUPPORT QUESTS" subtitle="SUSTAIN MOMENTUM" tint="text-[#00F0FF]">
        <div className="grid md:grid-cols-2 gap-3">
          {today.SUPPORT?.map(q => <QuestCard key={q.id} q={q} onComplete={handle} />)}
        </div>
      </Section>

      <Section title="// MICRO QUESTS" subtitle="MINIMUM DAILY DISCIPLINE" tint="text-[#EAEAEA]">
        <div className="grid md:grid-cols-3 gap-3">
          {today.MICRO?.map(q => <QuestCard key={q.id} q={q} onComplete={handle} dense />)}
        </div>
      </Section>
    </div>
  );
}
