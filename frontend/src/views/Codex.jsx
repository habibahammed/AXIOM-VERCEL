import React from "react";
import { BookOpen, Crown, Skull, Zap, Trophy, Network, BrainCircuit } from "lucide-react";

const RANKS = [
  ["E","SPARK",1,10],["D","RISER",11,22],["C","WARRIOR",23,38],["B","HUNTER",39,55],
  ["A","ELITE",56,72],["S","MASTER",73,86],["SS","LEGEND",87,96],["SSS","MONARCH",97,103],
  ["???","SUPREME MONARCH",104,104],
];

const XP_TABLE = [
  ["MICRO",   [15,25,40,60,90]],
  ["SUPPORT", [30,55,90,140,210]],
  ["MAIN",    [70,120,200,320,500]],
  ["CHALLENGE",[100,180,300,500,800]],
  ["BOSS",    [200,400,700,1100,1800]],
  ["SECRET",  [300,500,900,1500,2500]],
];
const DIFFS = ["TRIVIAL","EASY","MEDIUM","HARD","EXTREME"];

const BOSSES = [
  ["THE SCROLL", "Endless feeds fracture your mind."],
  ["THE PROCRASTINATOR", "Whispers: begin tomorrow."],
  ["THE COMFORT SEEKER", "Chooses ease over evolution."],
  ["THE DISTRACTOR", "Redirects attention seconds before flow."],
  ["THE PERFECTIONIST", "Refuses to ship."],
  ["THE FEAR", "Freezes the body when courage is required."],
  ["THE INCONSISTENCY", "Erases 30 days of work in a single skipped day."],
  ["THE REACTOR", "Bleeds power to every outside stimulus."],
  ["THE DIRECTIONLESS", "Effort without vector."],
];

const Section = ({ id, icon: I, title, subtitle, children, tint = "#00F0FF" }) => (
  <div id={id} className="hud-panel p-6 scroll-mt-24 scanline">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 flex items-center justify-center clip-tech border" style={{borderColor: tint, color: tint}}>
        <I size={18} strokeWidth={1.5}/>
      </div>
      <div>
        <div className="font-mono text-[10px] tracking-[0.5em]" style={{color: tint}}>// {subtitle}</div>
        <h2 className="font-display text-xl text-[#EAEAEA]">{title}</h2>
      </div>
    </div>
    {children}
  </div>
);

export default function Codex() {
  const toc = [
    { id: "intro", label: "AXIOM PROTOCOL" },
    { id: "ranks", label: "RANK SYSTEM" },
    { id: "xp", label: "XP RULES" },
    { id: "bosses", label: "BOSS DOSSIER" },
    { id: "trials", label: "TRIALS" },
    { id: "skills", label: "SKILL MATRIX" },
    { id: "architect", label: "ARCHITECT AI" },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// GUIDE / CODEX</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">SYSTEM MANUAL</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3 hud-panel p-3 h-max lg:sticky lg:top-24">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#8A8A93] mb-2 px-2">// INDEX</div>
          <nav className="space-y-1">
            {toc.map(t => (
              <a key={t.id} href={`#${t.id}`}
                className="block px-3 py-2 text-xs font-heading tracking-wide text-[#8A8A93] hover:text-[#00F0FF] hover:bg-white/5 border-l-2 border-transparent hover:border-l-[#00F0FF]"
                data-testid={`codex-toc-${t.id}`}>
                {t.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          <Section id="intro" icon={BookOpen} title="AXIOM PROTOCOL" subtitle="OPERATING SYSTEM">
            <div className="space-y-3 font-heading text-[#EAEAEA] text-sm leading-relaxed">
              <p>AXIOM is a personal-development operating system. You are the player. Every real-world action is convertible to XP if it can be evidenced.</p>
              <p>The central loop: <span className="font-mono text-[#00F0FF]">GOAL → STRATEGY → QUEST → REAL ACTION → XP → STATS → SKILLS → BOSS → LEVEL → RANK → UNLOCK</span>.</p>
              <p>The digital numbers exist to serve real capability. Never invert this.</p>
            </div>
          </Section>

          <Section id="ranks" icon={Crown} title="RANK SYSTEM" subtitle="9 RANKS · 104 LEVELS" tint="#FFB000">
            <div className="grid grid-cols-3 gap-2">
              {RANKS.map(([code, name, min, max]) => (
                <div key={code} className="border border-white/10 p-3 clip-tech text-center bg-black/40">
                  <div className="font-display text-2xl text-[#00F0FF] text-glow-cyan">{code}</div>
                  <div className="font-mono text-[10px] tracking-[0.25em] text-[#EAEAEA] mt-1">{name}</div>
                  <div className="font-mono text-[9px] text-[#8A8A93] mt-0.5">LVL {min}{min !== max ? `–${max}` : ""}</div>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-[#8A8A93] mt-3 leading-relaxed">
              Rank ascension is cinematic. Each rank raises a new tower in the Monarch Sanctum. Level 104 · SUPREME MONARCH is the terminal state — pure discipline.
            </div>
          </Section>

          <Section id="xp" icon={Zap} title="XP RULES" subtitle="EARN · NEVER FARM">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-[#8A8A93]">
                    <th className="text-left py-2 px-2 tracking-[0.25em]">KIND</th>
                    {DIFFS.map(d => <th key={d} className="text-right py-2 px-2 tracking-[0.2em]">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {XP_TABLE.map(([kind, xps]) => (
                    <tr key={kind} className="border-b border-white/5 hover:bg-[#00F0FF]/5">
                      <td className="py-1.5 px-2 text-[#EAEAEA]">{kind}</td>
                      {xps.map((x,i) => <td key={i} className="text-right py-1.5 px-2 text-[#FFB000]">+{x}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-1.5 text-xs font-heading text-[#8A8A93]">
              <li><span className="text-[#00F0FF]">›</span> Duplicate completion is denied by the engine.</li>
              <li><span className="text-[#00F0FF]">›</span> XP scales with kind × difficulty. Boss-linked quests also erode boss resistance.</li>
              <li><span className="text-[#00F0FF]">›</span> Streak breaks reset to 1. Never lose consistency.</li>
              <li><span className="text-[#00F0FF]">›</span> Custom quests forged in the Quest Board use the same table.</li>
            </ul>
          </Section>

          <Section id="bosses" icon={Skull} title="BOSS DOSSIER" subtitle="9 BEHAVIORAL THREATS" tint="#FF2A2A">
            <div className="grid md:grid-cols-2 gap-2">
              {BOSSES.map(([name, desc]) => (
                <div key={name} className="border border-[#FF2A2A]/20 p-3 clip-tech bg-black/30">
                  <div className="font-display text-sm text-[#FFB8B8]">{name}</div>
                  <div className="font-mono text-[10px] text-[#8A8A93] mt-1">{desc}</div>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-[#8A8A93] mt-3">
              Each boss starts at full RESISTANCE. Complete linked quests to erode it. When it reaches 0, the boss is defeated and enters the Trophy Vault.
            </div>
          </Section>

          <Section id="trials" icon={Trophy} title="MONARCH TRIALS" subtitle="RARE ORDEALS" tint="#FFB000">
            <ul className="space-y-2 font-heading text-sm text-[#EAEAEA]">
              <li><span className="font-mono text-[#FFB000]">TRIAL OF DISCIPLINE</span> · streak 3d + Discipline 150 XP + 20% dmg to THE INCONSISTENCY → TITLE "IRONBOUND"</li>
              <li><span className="font-mono text-[#FFB000]">TRIAL OF FOCUS</span> · FOC ≥ 12 + 5 quests completed → TITLE "SILENT BLADE"</li>
              <li><span className="font-mono text-[#FFB000]">TRIAL OF EXECUTION</span> · Level 3 + Discipline 300 XP + 40% dmg to THE PERFECTIONIST → TITLE "SHIPPER"</li>
              <li><span className="font-mono text-[#FFB000]">TRIAL OF THE MONARCH</span> · Level 6 + 3 bosses defeated → TITLE "MONARCH ASPIRANT"</li>
            </ul>
          </Section>

          <Section id="skills" icon={Network} title="SKILL MATRIX" subtitle="CONSTELLATION">
            <div className="font-heading text-sm text-[#EAEAEA] space-y-2">
              <p>20 skills across 10 domains. Progression states: <span className="font-mono text-[#8A8A93]">LOCKED</span> → <span className="font-mono text-[#00F0FF]">NOVICE</span> → <span className="font-mono text-[#00F0FF]">TRAINED</span> → <span className="font-mono text-[#FFB000]">ADVANCED</span> → <span className="font-mono text-[#FFB000]">MASTERED</span>.</p>
              <p>Skills advance from domain XP + quest keyword matches. Click any node in the matrix for detail.</p>
            </div>
          </Section>

          <Section id="architect" icon={BrainCircuit} title="ARCHITECT AI" subtitle="GPT 5.6 TERRA">
            <div className="font-heading text-sm text-[#EAEAEA] space-y-2">
              <p>The Architect reads your live player state and issues strategic commands. It never invents XP or grants rewards — the deterministic AXIOM engine controls all progression.</p>
              <p>Use the Architect when you feel resistance. Ask for one command. Execute it. Report back.</p>
              <p>The Weekly Review, Boss Counter-Strategy, Onboarding Ritual and Campaign Forge are all authored by the Architect.</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
