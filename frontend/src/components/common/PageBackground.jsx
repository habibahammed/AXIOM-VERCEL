import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import AxiomArt from "@/components/common/AxiomArt";
import { ENVIRONMENT_ART } from "@/services/assets/registry";

// Route → environment art mapping. Reuses the 4 canonical environment
// images already shipped in /assets/environments so we don't invent new
// asset paths that would 404. Views that already render their own
// dedicated background (BossArchive, CommandCenter, HallOfAscension,
// MonarchSanctum) are intentionally excluded here to avoid double layers.
const ROUTE_ART = {
  "/daily":      ENVIRONMENT_ART.commandCenter,
  "/quests":     ENVIRONMENT_ART.bossArena,
  "/architect":  ENVIRONMENT_ART.commandCenter,
  "/evolution":  ENVIRONMENT_ART.monarchSanctum,
  "/skills":     ENVIRONMENT_ART.monarchSanctum,
  "/war-room":   ENVIRONMENT_ART.bossArena,
  "/lab":        ENVIRONMENT_ART.hallOfAscension,
  "/simulator":  ENVIRONMENT_ART.commandCenter,
  "/trials":     ENVIRONMENT_ART.bossArena,
  "/guild":      ENVIRONMENT_ART.hallOfAscension,
  "/review":     ENVIRONMENT_ART.monarchSanctum,
  "/codex":      ENVIRONMENT_ART.monarchSanctum,
};

export default function PageBackground() {
  const { pathname } = useLocation();
  const src = useMemo(() => ROUTE_ART[pathname], [pathname]);
  if (!src) return null;
  return (
    <div className="fixed inset-0 -z-20 opacity-[0.14] pointer-events-none" aria-hidden>
      <AxiomArt src={src} alt="" className="w-full h-full" />
      <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 50% 30%, transparent 0%, #000 80%)"}}/>
    </div>
  );
}
