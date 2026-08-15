import React, { useEffect, useMemo, useState } from "react";
import { skillEngine } from "@/engine/skillEngine";
import { Lock, Sparkles } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import { SKILL_DOMAIN_ART } from "@/services/assets/registry";

const STATE_META = {
  LOCKED:   { color: "#3A3A44", ring: "rgba(255,255,255,0.15)", label: "LOCKED" },
  NOVICE:   { color: "#00F0FF", ring: "rgba(0,240,255,0.35)",   label: "NOVICE" },
  TRAINED:  { color: "#00F0FF", ring: "rgba(0,240,255,0.55)",   label: "TRAINED" },
  ADVANCED: { color: "#FFB000", ring: "rgba(255,176,0,0.55)",   label: "ADVANCED" },
  MASTERED: { color: "#FFB000", ring: "rgba(255,176,0,0.9)",    label: "MASTERED" },
};

// Deterministic polar layout, grouped by domain
function layoutSkills(skills, w, h) {
  const cx = w/2, cy = h/2;
  const domains = [...new Set(skills.map(s => s.domain))];
  const domainAngle = (2 * Math.PI) / domains.length;
  const positions = {};
  domains.forEach((d, di) => {
    const inDom = skills.filter(s => s.domain === d);
    inDom.forEach((s, i) => {
      const parent = inDom.find(x => x.id === s.parent);
      const radius = parent ? 210 : 130;
      const jitter = (i - (inDom.length-1)/2) * 0.18;
      const angle = di * domainAngle + jitter - Math.PI/2;
      positions[s.id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
  });
  return positions;
}

export default function SkillMatrix() {
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState(null);
  const W = 900, H = 620;

  useEffect(() => { skillEngine.list().then(setSkills); }, []);
  const positions = useMemo(() => layoutSkills(skills, W, H), [skills]);

  const activeCount = skills.filter(s => s.state !== "LOCKED").length;
  const mastered = skills.filter(s => s.state === "MASTERED").length;

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// SKILL MATRIX</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">CONSTELLATION OF MASTERIES</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">
          {activeCount}/{skills.length} AWAKENED · {mastered} MASTERED
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 hud-panel p-4 scanline overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{maxHeight: "70vh"}} data-testid="skill-svg">
            <defs>
              <radialGradient id="core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0"/>
              </radialGradient>
            </defs>
            {/* grid rings */}
            {[80, 140, 220, 300].map(r => (
              <circle key={r} cx={W/2} cy={H/2} r={r} fill="none" stroke="rgba(0,240,255,0.08)" strokeDasharray="2 4"/>
            ))}
            {/* core */}
            <circle cx={W/2} cy={H/2} r="70" fill="url(#core)"/>
            <circle cx={W/2} cy={H/2} r="18" fill="#00F0FF" opacity="0.9"/>
            <text x={W/2} y={H/2 + 4} textAnchor="middle" fill="#000" fontFamily="Michroma" fontSize="12">AXIOM</text>

            {/* edges */}
            {skills.map(s => {
              const pos = positions[s.id]; if (!pos) return null;
              const to = { x: W/2, y: H/2 };
              const parent = s.parent && positions[s.parent];
              const target = parent || to;
              const on = s.state !== "LOCKED";
              return (
                <line key={"e-"+s.id} x1={pos.x} y1={pos.y} x2={target.x} y2={target.y}
                  stroke={on ? (s.tint === "amber" ? "#FFB000" : s.tint === "red" ? "#FF2A2A" : "#00F0FF") : "rgba(255,255,255,0.1)"}
                  strokeOpacity={on ? 0.5 : 0.3} strokeWidth={on ? 1.4 : 0.8} strokeDasharray={on ? "" : "3 3"}/>
              );
            })}

            {/* nodes */}
            {skills.map(s => {
              const p = positions[s.id]; if (!p) return null;
              const meta = STATE_META[s.state];
              const isSel = selected?.id === s.id;
              const size = s.state === "LOCKED" ? 8 : s.state === "NOVICE" ? 10 : s.state === "TRAINED" ? 12 : s.state === "ADVANCED" ? 15 : 18;
              return (
                <g key={s.id} onClick={() => setSelected(s)} style={{cursor:"pointer"}} data-testid={`skill-node-${s.id}`}>
                  <circle cx={p.x} cy={p.y} r={size + 6} fill="none" stroke={meta.ring} strokeWidth={isSel ? 2 : 1}/>
                  <circle cx={p.x} cy={p.y} r={size} fill={meta.color} opacity={s.state === "LOCKED" ? 0.4 : 0.95}
                    style={{ filter: s.state !== "LOCKED" ? `drop-shadow(0 0 6px ${meta.color})` : "none" }}/>
                  <text x={p.x} y={p.y + size + 14} textAnchor="middle" fill={s.state === "LOCKED" ? "#8A8A93" : "#EAEAEA"} fontFamily="Rajdhani" fontSize="11" fontWeight="600" letterSpacing="0.05em">
                    {s.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="col-span-12 lg:col-span-4 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// NODE DETAIL</div>
          {selected ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                {SKILL_DOMAIN_ART[selected.domain] && (
                  <div className="w-16 h-16 relative flex-shrink-0 clip-tech border border-[#00F0FF]/60 bg-black/60 overflow-hidden"
                       style={{boxShadow: "0 0 16px rgba(0,240,255,0.4), inset 0 0 16px rgba(0,240,255,0.18)"}}>
                    <AxiomArt src={SKILL_DOMAIN_ART[selected.domain]} alt={selected.domain} className="absolute inset-0 w-full h-full" fit="cover" />
                    <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(0,240,255,0.25) 100%)"}}/>
                  </div>
                )}
                <div className="font-display text-xl text-[#EAEAEA]">{selected.name.toUpperCase()}</div>
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93] mb-4">{selected.domain.replace(/_/g," ")}</div>
              <div className="flex items-center gap-2 mb-3">
                {selected.state === "LOCKED" ? <Lock size={14} className="text-[#8A8A93]" strokeWidth={1.5}/> : <Sparkles size={14} className="text-[#00F0FF]" strokeWidth={1.5}/>}
                <span className="font-display tracking-[0.25em] text-sm" style={{color: STATE_META[selected.state].color}}>{selected.state}</span>
              </div>
              <div className="font-mono text-[10px] text-[#8A8A93] mb-1 flex justify-between">
                <span>PROGRESS</span><span>{Math.round(selected.progress*100)}%</span>
              </div>
              <div className="h-2 bg-white/5">
                <div className="h-full" style={{ width: `${selected.progress*100}%`, background: STATE_META[selected.state].color, boxShadow: `0 0 6px ${STATE_META[selected.state].color}` }}/>
              </div>
              <div className="font-mono text-[10px] text-[#8A8A93] mt-4">XP INVESTED · <span className="text-[#EAEAEA]">{selected.xp}</span></div>
              <div className="font-mono text-[9px] text-[#8A8A93] mt-6 tracking-[0.25em] leading-relaxed">
                Complete quests in <span className="text-[#EAEAEA]">{selected.domain.replace(/_/g," ")}</span> to sharpen this skill.
              </div>
            </>
          ) : (
            <div className="text-[#8A8A93] font-mono text-xs">Select a node to inspect. Skills sharpen as related quests complete.</div>
          )}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-2">// STATES</div>
            <div className="space-y-1">
              {Object.entries(STATE_META).map(([k, m]) => (
                <div key={k} className="flex items-center gap-2 font-mono text-[10px]">
                  <div className="w-3 h-3 rounded-full" style={{background: m.color, boxShadow: k !== "LOCKED" ? `0 0 6px ${m.color}` : "none"}}/>
                  <span className="text-[#EAEAEA]">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
