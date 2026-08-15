import React from "react";
import { Lock } from "lucide-react";

export default function ComingSoon({ title, subtitle, description }) {
  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#8A8A93]">// {subtitle || title}</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">{title}</h1>
      </div>
      <div className="hud-panel p-10 text-center scanline">
        <div className="mx-auto w-16 h-16 flex items-center justify-center clip-tech border border-[#FFB000]/40 text-[#FFB000] mb-4">
          <Lock size={26} strokeWidth={1.5}/>
        </div>
        <div className="font-display text-xl text-[#FFB000] text-glow-amber mb-2">SEALED PROTOCOL</div>
        <div className="font-mono text-sm text-[#8A8A93] max-w-lg mx-auto">{description || "This chamber unlocks in the next AXIOM directive. Progression in active modules will accelerate its arrival."}</div>
        <div className="mt-6 font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// PHASE II · IMMINENT</div>
      </div>
    </div>
  );
}
