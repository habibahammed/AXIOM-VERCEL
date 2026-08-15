import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { usePlayer } from "@/state/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/services/sound";
import CinematicOverlay from "@/components/cinematic/CinematicOverlay";
import OnboardingRitual from "@/components/cinematic/OnboardingRitual";
import BossRevealOverlay from "@/components/cinematic/BossRevealOverlay";
import ShieldStore from "@/components/common/ShieldStore";
import AchievementToaster from "@/components/cinematic/AchievementToaster";
import AvatarUploadModal from "@/components/common/AvatarUploadModal";
import AxiomLogo from "@/components/common/AxiomLogo";
import AxiomArt from "@/components/common/AxiomArt";
import TiltCard from "@/components/common/TiltCard";
import AudioSettingsPanel from "@/components/common/AudioSettingsPanel";
import SoundPulseOverlay from "@/components/common/SoundPulseOverlay";
import PageBackground from "@/components/common/PageBackground";
import { RANK_ART } from "@/services/assets/registry";
import { AxiomScene } from "@/components/3d/AxiomScene";
import { useMouseParallax, useAnimatedNumber, useReducedMotion } from "@/hooks/useMotion";
import {
  Command, Sunrise, ScrollText, Skull, User, Network, Radar,
  FlaskConical, TimerReset, Trophy, Crown, Castle, BrainCircuit,
  BookOpen, LogOut, CalendarCheck, Shield, Users
} from "lucide-react";

const NAV = [
  { to: "/command", label: "Command Center", icon: Command, deep: true },
  { to: "/daily", label: "Daily Operations", icon: Sunrise, deep: true },
  { to: "/quests", label: "Quest Board", icon: ScrollText, deep: true },
  { to: "/bosses", label: "Boss Archive", icon: Skull, deep: true },
  { to: "/evolution", label: "Player Evolution", icon: User, deep: true },
  { to: "/architect", label: "AXIOM Architect", icon: BrainCircuit, deep: true },
  { to: "/skills", label: "Skill Matrix", icon: Network, deep: true },
  { to: "/war-room", label: "Adaptive War Room", icon: Radar, deep: true },
  { to: "/lab", label: "Evolution Lab", icon: FlaskConical, deep: true },
  { to: "/simulator", label: "Reality Simulator", icon: TimerReset, deep: true },
  { to: "/trials", label: "Monarch Trials", icon: Trophy, deep: true },
  { to: "/ascension", label: "Hall of Ascension", icon: Crown, deep: true },
  { to: "/sanctum", label: "Monarch Sanctum", icon: Castle, deep: true },
  { to: "/guild", label: "Monarch Guild", icon: Users, deep: true },
  { to: "/review", label: "Weekly Review", icon: CalendarCheck, deep: true },
  { to: "/codex", label: "Guide / Codex", icon: BookOpen, deep: true },
];

const RankBadge = ({ rank, level }) => (
  <div className="flex items-center gap-3">
    <TiltCard glowColor="#00F0FF" tiltStrength={6} sparkleRadius={16} className="w-12 h-12">
      <div className="w-12 h-12 relative flex items-center justify-center border border-[#00F0FF]/50 clip-tech overflow-hidden" style={{background:"rgba(0,240,255,0.06)"}}>
        {RANK_ART[rank?.code] && (
          <AxiomArt src={RANK_ART[rank.code]} alt={`Rank ${rank?.code}`} eager className="absolute inset-0 w-full h-full opacity-80" />
        )}
        <span className="rank-emblem text-xl font-display relative z-10 text-shadow-[0_0_6px_rgba(0,0,0,0.9)]" data-testid="hud-rank-code" style={{textShadow: "0 0 6px #000, 0 0 12px #000"}}>{rank?.code}</span>
      </div>
    </TiltCard>
    <div className="leading-tight">
      <div className="text-[10px] tracking-[0.3em] font-mono text-[#8A8A93]">LEVEL</div>
      <div className="font-display text-lg text-[#EAEAEA] text-glow-cyan" data-testid="hud-level">{level}</div>
    </div>
  </div>
);

export default function AxiomShell() {
  const { player, logout, event, clearEvent, refresh, bossReveal, clearBossReveal } = usePlayer();
  const nav = useNavigate();
  const location = useLocation();
  const [sfx, setSfx] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [achQueue, setAchQueue] = useState([]);
  const rm = useReducedMotion();
  const parallax = useMouseParallax(rm ? 0 : 10);
  const lifetimeAnim = useAnimatedNumber(player?.lifetime_xp || 0, 1100);

  // Watch for new achievements from complete_quest events
  useEffect(() => {
    if (event?.new_achievements?.length) {
      setAchQueue(q => [...q, ...event.new_achievements]);
    }
  }, [event]);

  useEffect(() => {
    if (!player) return;
    const s = player.settings?.sound ?? true;
    setSfx(s);
    sound.setEnabled(s);
    if (s) sound.startAmbient();
    if (player.onboarded === false) setShowOnboarding(true);
    return () => sound.stopAmbient();
  }, [player]);
  const toggleSfx = () => {
    const next = !sfx;
    setSfx(next);
    sound.setEnabled(next);
    if (next) sound.startAmbient(); else sound.stopAmbient();
  };

  if (!player) return null;
  const rank = player.rank;
  const xpPct = Math.min(100, (player.level_progress || 0) * 100);

  // AUDIT FIX: previously CommandCenter and ArchitectPage each mounted a
  // second, independent <AxiomScene> on top of this shell's own always-on
  // background scene — two full WebGL contexts + two particle/bloom render
  // loops stacked on those pages. Consolidated into this single scene,
  // which now picks up per-route intensity/upgrades so the visual result
  // on those pages is unchanged, but only one Canvas exists at a time.
  const sceneProps = {
    "/command": { intensity: 0.9, dense: true, parallax: true, floating: true, dynamicLighting: true, coreBreathing: true, fogNear: 7, fogFar: 24 },
    "/architect": { intensity: 0.7, dense: true },
  }[location.pathname] || { intensity: 0.6, dense: false };

  return (
    <div className="min-h-screen text-[#EAEAEA] relative">
      {/* Global cinematic backdrop — subtle 3D always alive behind app.
          Single Canvas for the whole app; per-route props swap its
          richness instead of mounting a second scene. */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <AxiomScene rank={player.rank?.code || "E"} enableBloom={true} {...sceneProps}/>
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{background: "radial-gradient(circle at 50% 20%, transparent 40%, rgba(0,0,0,0.85) 100%)"}}/>
      {/* Top HUD Bar */}
      <header className="sticky top-0 z-30 border-b border-[#00F0FF]/15 bg-black/70 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-6">
          <button onClick={() => { sound.ui(); nav("/command"); }} className="flex items-center gap-3 group" data-testid="brand-home">
            <AxiomLogo size={40}/>
            <div>
              <div className="font-display text-sm tracking-[0.25em] text-glow-cyan group-hover:text-[#00F0FF] transition-colors">AXIOM</div>
              <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.3em]">MONARCH SYSTEM</div>
            </div>
          </button>
          <div className="hidden md:flex items-center gap-6 ml-6 flex-1">
            <RankBadge rank={rank} level={player.level} />
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8A93] mb-1 tracking-[0.25em]">
                <span>XP {player.xp_into_level}/{player.xp_to_next_level}</span>
                <span data-testid="hud-lifetime-xp">LIFETIME: {lifetimeAnim}</span>
              </div>
              <div className="seg-bar" data-testid="hud-xp-bar">
                {Array.from({length: 20}).map((_,i) => (
                  <div key={i} className={"seg " + ((i/20)*100 < xpPct ? "on" : "")} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-[0.3em] font-mono text-[#8A8A93]">STREAK</div>
              <button onClick={() => setStoreOpen(true)}
                className="font-display text-amber-400 text-glow-amber flex items-center gap-1 justify-end hover:brightness-125"
                data-testid="hud-streak" title="Open Shield Store">
                {player.streak}D
                {(player.streak_shields ?? 0) > 0 && (
                  <span className="flex items-center text-[#00F0FF]" data-testid="hud-shields">
                    <Shield size={12} strokeWidth={2}/>
                    <span className="text-[10px] ml-0.5">×{player.streak_shields}</span>
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <AudioSettingsPanel muted={!sfx} onToggleMute={toggleSfx} />
            <button onClick={() => { sound.ui(); setAvatarOpen(true); }} className="hidden sm:flex items-center gap-2 px-1 py-1 border border-white/10 hover:border-[#00F0FF]/60 clip-tech" data-testid="btn-profile">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt="avatar" className="w-6 h-6 object-cover" />
              ) : (
                <User size={14} strokeWidth={1.5} className="ml-1" />
              )}
              <span className="font-mono text-xs pr-2">{player.display_name}</span>
            </button>
            <button onClick={logout} className="w-9 h-9 flex items-center justify-center border border-white/10 hover:border-[#FF2A2A]/60 clip-tech" data-testid="btn-logout" title="Logout">
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-4 px-4 py-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
          <nav className="hud-panel p-3 space-y-1" data-testid="axiom-nav">
            {NAV.map(({ to, label, icon: I, deep }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => sound.ui()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-[13px] tracking-wide transition-colors duration-200 border-l-2 ${
                    isActive
                      ? "border-l-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF] text-glow-cyan"
                      : "border-l-transparent text-[#8A8A93] hover:text-[#EAEAEA] hover:bg-white/5"
                  }`
                }
                data-testid={`nav-${to.slice(1)}`}
              >
                <I size={14} strokeWidth={1.5} />
                <span className="uppercase font-heading">{label}</span>
                {!deep && <span className="ml-auto font-mono text-[8px] text-[#FFB000]">SOON</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main — Monarch route transition: cyan scanline wipe + fade
            with JetBrains Mono "SYSTEM LOADING..." flicker. Under 600ms total. */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-10 min-h-[70vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(1px)" }}
              transition={{ duration: 0.30, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Scanline wipe — sweeps top→bottom in 450ms */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                style={{ mixBlendMode: "screen" }}
              >
                <motion.div
                  initial={{ y: "-40%" }}
                  animate={{ y: "130%" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 h-[55vh]"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent 0%, rgba(0,240,255,0.04) 22%, rgba(0,240,255,0.30) 47%, rgba(0,240,255,0.95) 50%, rgba(0,240,255,0.30) 53%, rgba(0,240,255,0.04) 78%, transparent 100%)",
                    boxShadow: "0 0 40px rgba(0,240,255,0.55)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,240,255,0.06) 3px, transparent 4px)",
                  }}
                />
              </motion.div>

              {/* JetBrains Mono "SYSTEM LOADING..." with cyan glow flicker */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-2 right-2 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.25, 1, 0.55, 1, 0] }}
                transition={{ duration: 0.52, times: [0, 0.1, 0.28, 0.45, 0.65, 0.82, 1], ease: "linear" }}
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
                  fontSize: "10px",
                  letterSpacing: "0.5em",
                  color: "#00F0FF",
                  textShadow: "0 0 8px #00F0FF, 0 0 14px rgba(0,240,255,0.55)",
                }}
              >
                // SYSTEM LOADING...
              </motion.div>

              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {bossReveal && <BossRevealOverlay boss={bossReveal} onClose={clearBossReveal} />}
      {event && !bossReveal && <CinematicOverlay event={event} onClose={() => { clearEvent(); refresh(); }} />}
      {showOnboarding && <OnboardingRitual onDone={() => { setShowOnboarding(false); refresh(); }} />}
      <ShieldStore open={storeOpen} onClose={() => setStoreOpen(false)}/>
      <AvatarUploadModal open={avatarOpen} onClose={() => setAvatarOpen(false)}/>
      <AchievementToaster queue={achQueue} onConsume={(id) => setAchQueue(q => q.filter(a => a.id !== id))}/>
      <PageBackground />
      <SoundPulseOverlay />
    </div>
  );
}
