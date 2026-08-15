import React, { useEffect, useState } from "react";
import { usePlayer } from "@/state/PlayerContext";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, Flame, Skull, Zap } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import { ENVIRONMENT_ART } from "@/services/assets/registry";

const StatChip = ({ k, v }) => (
  <div className="border border-white/10 bg-black/40 p-2 clip-tech text-center">
    <div className="font-mono text-[9px] tracking-[0.25em] text-[#8A8A93]">{k}</div>
    <div className="font-display text-lg text-[#EAEAEA]" data-testid={`stat-${k}`}>{v}</div>
  </div>
);

export default function CommandCenter() {
  const { player } = usePlayer();
  const [today, setToday] = useState(null);
  const [bosses, setBosses] = useState([]);
  const [greeting, setGreeting] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/quests/today").then(r => setToday(r.data));
    api.get("/bosses").then(r => setBosses(r.data.filter(b => b.status === "ACTIVE").sort((a,b)=>a.resistance-b.resistance).slice(0,3)));
    api.get("/architect/greeting").then(r => setGreeting(r.data));
    api.get("/events/recent?limit=5").then(r => setEvents(r.data));
  }, []);

  if (!player) return null;
  const rank = player.rank;
  const primaryQuest = today?.MAIN?.[0];

  return (
    <div className="relative">
      {/* Atmospheric AXIOM Command Center environment (very dim, behind the 3D scene) */}
      <div className="absolute inset-0 -z-20 opacity-[0.16] pointer-events-none">
        <AxiomArt src={ENVIRONMENT_ART.commandCenter} alt="" className="w-full h-full" />
        <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 50% 30%, transparent 0%, #000 80%)"}}/>
      </div>
      {/* AUDIT FIX: the enhanced 3D background (parallax, floating geometry,
          dynamic lighting, breathing core) previously lived in a second,
          duplicate <AxiomScene> here. It's now provided by AxiomShell's
          single global scene (route-aware), so this page no longer mounts
          its own WebGL context. Visual result is unchanged. */}

      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// COMMAND CENTER</div>
        <h1 className="font-display text-3xl md:text-4xl text-[#EAEAEA] text-glow-cyan mt-1">{player.display_name?.toUpperCase()}</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">RANK {rank.code} — {rank.name} · LVL {player.level}</div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Primary Objective */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="col-span-12 lg:col-span-8 hud-panel p-6 scanline">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] text-glow-amber mb-2">// PRIMARY OBJECTIVE</div>
          {primaryQuest ? (
            <>
              <h2 className="font-display text-2xl md:text-3xl text-[#EAEAEA] mb-2" data-testid="primary-quest-title">{primaryQuest.title}</h2>
              <p className="font-heading text-[#8A8A93] mb-4">{primaryQuest.description}</p>
              <div className="flex gap-6 mb-4 font-mono text-xs">
                <div><span className="text-[#8A8A93]">TIME </span><span className="text-[#EAEAEA]">{primaryQuest.duration_min}m</span></div>
                <div><span className="text-[#8A8A93]">XP </span><span className="text-[#FFB000]">+{primaryQuest.xp_reward}</span></div>
                <div><span className="text-[#8A8A93]">DIFF </span><span className="text-[#00F0FF]">{primaryQuest.difficulty}</span></div>
              </div>
              <Link to="/daily" className="inline-flex items-center gap-2 px-4 py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10 clip-tech font-display tracking-[0.25em] text-sm" data-testid="btn-engage-primary">
                ENGAGE <ChevronRight size={14} />
              </Link>
            </>
          ) : (
            <div className="text-[#8A8A93] font-mono text-sm">No active primary quest. Visit Quest Board.</div>
          )}
        </motion.div>

        {/* Architect Whisper */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.05}} className="col-span-12 lg:col-span-4 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] text-glow-cyan mb-3">// ARCHITECT</div>
          {greeting ? (
            <>
              <div className="font-display text-lg text-[#EAEAEA] mb-2">{greeting.text}</div>
              <div className="font-mono text-xs text-[#8A8A93] mb-3">{greeting.detail}</div>
              <div className="font-mono text-sm text-[#FFB000] text-glow-amber mb-4">{greeting.recommendation}</div>
              <Link to="/architect" className="text-[#00F0FF] font-mono text-xs tracking-[0.25em] hover:underline" data-testid="btn-open-architect">// OPEN CHANNEL →</Link>
            </>
          ) : <div className="text-[#8A8A93] font-mono text-xs">LOADING...</div>}
        </motion.div>

        {/* Stats */}
        <div className="col-span-12 lg:col-span-8 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// CORE ATTRIBUTES</div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Object.entries(player.stats).map(([k,v]) => <StatChip key={k} k={k} v={v} />)}
          </div>
        </div>

        {/* Streak */}
        <div className="col-span-6 lg:col-span-2 hud-panel p-5 flex flex-col justify-center">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] mb-2">// STREAK</div>
          <div className="flex items-baseline gap-2">
            <Flame size={22} className="text-[#FFB000]" strokeWidth={1.5} />
            <div className="font-display text-3xl text-[#FFB000] text-glow-amber">{player.streak}</div>
            <div className="font-mono text-xs text-[#8A8A93]">DAYS</div>
          </div>
        </div>
        <div className="col-span-6 lg:col-span-2 hud-panel p-5 flex flex-col justify-center">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-2">// CREDITS</div>
          <div className="flex items-baseline gap-2">
            <Zap size={22} className="text-[#00F0FF]" strokeWidth={1.5} />
            <div className="font-display text-3xl text-[#00F0FF] text-glow-cyan" data-testid="hud-credits">{player.credits}</div>
          </div>
        </div>

        {/* Bosses */}
        <div className="col-span-12 lg:col-span-6 hud-panel hud-panel-danger p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#FF2A2A] text-glow-red">// ACTIVE BOSSES</div>
            <Link to="/bosses" className="font-mono text-[10px] text-[#8A8A93] hover:text-[#FF2A2A]">// ARCHIVE →</Link>
          </div>
          <div className="space-y-2">
            {bosses.length === 0 && <div className="text-[#8A8A93] font-mono text-xs">All bosses dormant.</div>}
            {bosses.map(b => {
              const pct = (b.resistance / b.max_resistance) * 100;
              return (
                <div key={b.id} className="border border-[#FF2A2A]/20 p-3 clip-tech bg-black/30" data-testid={`hud-boss-${b.boss_key}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 font-heading text-sm text-[#FFB8B8]"><Skull size={14} strokeWidth={1.5}/>{b.name}</span>
                    <span className="font-mono text-[10px] text-[#8A8A93]">PHASE {b.current_phase}/{b.phases}</span>
                  </div>
                  <div className="h-1.5 bg-white/5">
                    <div className="h-full bg-[#FF2A2A]" style={{width: `${pct}%`, boxShadow: "0 0 8px #FF2A2A"}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent events */}
        <div className="col-span-12 lg:col-span-6 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// EVENT LOG</div>
          <div className="space-y-1 font-mono text-xs">
            {events.length === 0 && <div className="text-[#8A8A93]">No recent events.</div>}
            {events.slice(0,6).map(e => (
              <div key={e.id} className="flex items-center gap-2 text-[#8A8A93]">
                <span className="text-[#00F0FF]">›</span>
                <span className="text-[#EAEAEA]">+{e.xp_gain} XP</span>
                {e.rank_up && <span className="text-[#FFB000]">· RANK UP</span>}
                {e.level_up && !e.rank_up && <span className="text-[#00F0FF]">· LVL {e.new_level}</span>}
                {e.boss_result?.defeated && <span className="text-[#FF2A2A]">· BOSS DEFEATED</span>}
                <span className="ml-auto text-[10px]">{new Date(e.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
