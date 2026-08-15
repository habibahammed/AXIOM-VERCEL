import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider, usePlayer } from "@/state/PlayerContext";
import { Toaster } from "sonner";
import AxiomShell from "@/app/AxiomShell";
import AuthPage from "@/views/AuthPage";
import CommandCenter from "@/views/CommandCenter";
import DailyOperations from "@/views/DailyOperations";
import QuestBoard from "@/views/QuestBoard";
import BossArchive from "@/views/BossArchive";
import PlayerEvolution from "@/views/PlayerEvolution";
import ArchitectPage from "@/views/ArchitectPage";
import SkillMatrix from "@/views/SkillMatrix";
import RealitySimulator from "@/views/RealitySimulator";
import Trials from "@/views/Trials";
import WarRoom from "@/views/WarRoom";
import HallOfAscension from "@/views/HallOfAscension";
import EvolutionLab from "@/views/EvolutionLab";
import MonarchSanctum from "@/views/MonarchSanctum";
import Codex from "@/views/Codex";
import WeeklyReview from "@/views/WeeklyReview";
import GuildPage from "@/views/GuildPage";
import ComingSoon from "@/views/ComingSoon";

const Protected = ({ children }) => {
  const { player, loading } = usePlayer();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="pulse-dot" data-testid="boot-pulse" />
      <div
        className="font-mono text-[#00F0FF] tracking-[0.5em] text-glow-cyan text-sm"
        style={{ animation: "ambientPulse 1.8s ease-in-out infinite" }}
      >
        // BOOTING AXIOM
      </div>
    </div>
  );
  if (!player) return <Navigate to="/auth" replace />;
  return children;
};

function App() {
  return (
    <PlayerProvider>
      <Toaster theme="dark" position="top-right" toastOptions={{
        style: { background: "rgba(10,12,16,0.9)", border: "1px solid rgba(0,240,255,0.3)", color: "#EAEAEA", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderRadius: 0 }
      }} />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<Protected><AxiomShell /></Protected>}>
            <Route index element={<Navigate to="/command" replace />} />
            <Route path="/command" element={<CommandCenter />} />
            <Route path="/daily" element={<DailyOperations />} />
            <Route path="/quests" element={<QuestBoard />} />
            <Route path="/bosses" element={<BossArchive />} />
            <Route path="/evolution" element={<PlayerEvolution />} />
            <Route path="/architect" element={<ArchitectPage />} />
            <Route path="/skills" element={<SkillMatrix />} />
            <Route path="/war-room" element={<WarRoom />} />
            <Route path="/lab" element={<EvolutionLab />} />
            <Route path="/simulator" element={<RealitySimulator />} />
            <Route path="/trials" element={<Trials />} />
            <Route path="/ascension" element={<HallOfAscension />} />
            <Route path="/sanctum" element={<MonarchSanctum />} />
            <Route path="/guild" element={<GuildPage />} />
            <Route path="/codex" element={<Codex />} />
            <Route path="/review" element={<WeeklyReview />} />
          </Route>
          <Route path="*" element={<Navigate to="/command" replace />} />
        </Routes>
      </BrowserRouter>
    </PlayerProvider>
  );
}

export default App;
