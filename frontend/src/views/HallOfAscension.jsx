import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Torus, Octahedron, Points, PointMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import { rewardEngine } from "@/engine/rewardEngine";
import { Trophy, Skull, Crown } from "lucide-react";
import AxiomArt from "@/components/common/AxiomArt";
import { ENVIRONMENT_ART } from "@/services/assets/registry";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";

const Rotating = ({ children, speed = 0.4, hovered }) => {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    const s = hovered ? speed * 3 : speed;
    ref.current.rotation.x += dt * s * 0.6;
    ref.current.rotation.y += dt * s;
    const targetScale = hovered ? 1.18 : 1;
    ref.current.scale.x += (targetScale - ref.current.scale.x) * Math.min(1, dt * 6);
    ref.current.scale.y = ref.current.scale.x;
    ref.current.scale.z = ref.current.scale.x;
  });
  return <group ref={ref}>{children}</group>;
};

// Small orbiting spark particles — reads as ambient dust caught by the light
const ArtifactSparks = ({ color, count = 24 }) => {
  const ref = useRef();
  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.3 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.15; });
  return (
    <group ref={ref}>
      <Points positions={positions} stride={3}>
        <PointMaterial transparent color={color} size={0.045} sizeAttenuation depthWrite={false} opacity={0.75} />
      </Points>
    </group>
  );
};

const ArtifactCanvas = ({ kind, color = "#00F0FF", tabVisible = true }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Canvas
      dpr={[1,1.4]}
      camera={{position:[0,0,3.5], fov:45}}
      gl={{alpha:true}}
      style={{width:80, height:80, cursor: "pointer"}}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      frameloop={tabVisible ? "always" : "never"}
    >
      <ambientLight intensity={0.5}/>
      <pointLight position={[2, 2, 3]} intensity={hovered ? 8 : 3} color={color} distance={8} decay={2}/>
      <pointLight position={[-2, -1, 2]} intensity={2} color={color} distance={8} decay={2}/>
      <Suspense fallback={null}>
        <ArtifactSparks color={color}/>
        <Rotating speed={0.5} hovered={hovered}>
          {kind === "BOSS" && (
            <Octahedron args={[1, 0]}>
              <meshStandardMaterial wireframe color={color} transparent opacity={0.9} emissive={color} emissiveIntensity={hovered ? 0.6 : 0.25}/>
            </Octahedron>
          )}
          {kind === "TRIAL" && (
            <Icosahedron args={[1, 1]}>
              <meshStandardMaterial wireframe color={color} transparent opacity={0.9} emissive={color} emissiveIntensity={hovered ? 0.6 : 0.25}/>
            </Icosahedron>
          )}
          {kind === "RANK" && (
            <group>
              <Torus args={[0.9, 0.05, 8, 64]}>
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.8 : 0.35}/>
              </Torus>
              <Icosahedron args={[0.5, 0]}>
                <meshStandardMaterial wireframe color={color} transparent opacity={0.9} emissive={color} emissiveIntensity={hovered ? 0.6 : 0.25}/>
              </Icosahedron>
            </group>
          )}
        </Rotating>
      </Suspense>
    </Canvas>
  );
};

// AUDIT FIX: Hall of Ascension can list up to ~22 trophies (9 ranks + 9
// bosses + up to 4 trials). Each Artifact previously mounted its own
// permanent <Canvas>, i.e. its own WebGL context — 22+ concurrent contexts
// on one page (plus the always-on background scene) risks exceeding the
// browser's WebGL context limit, silently losing/blanking older canvases.
// Fix: gate mounting behind IntersectionObserver so only trophies actually
// scrolled into view hold a live WebGL context; off-screen ones render a
// cheap static placeholder instead. Visual result is unchanged for the
// user — this only bounds how many contexts exist at once.
const Artifact = ({ kind, color = "#00F0FF", tabVisible = true }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: 80, height: 80 }}>
      {inView ? (
        <ArtifactCanvas kind={kind} color={color} tabVisible={tabVisible} />
      ) : (
        <div className="w-full h-full flex items-center justify-center opacity-40" style={{ color }}>
          {kind === "BOSS" ? <Skull size={22} strokeWidth={1.5}/> : kind === "RANK" ? <Crown size={22} strokeWidth={1.5}/> : <Trophy size={22} strokeWidth={1.5}/>}
        </div>
      )}
    </div>
  );
};

const fmt = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"}); }
  catch { return iso; }
};

export default function HallOfAscension() {
  const [t, setT] = useState(null);
  const visible = useDocumentVisible();
  useEffect(() => { rewardEngine.listTrophies().then(setT); }, []);

  const rows = t ? [
    { title: "RANK PROMOTIONS", items: t.ranks, color: "#00F0FF", icon: Crown, kind: "RANK", empty: "Reach the next rank to inscribe your first promotion." },
    { title: "CONQUERED TRIALS", items: t.trials, color: "#FFB000", icon: Trophy, kind: "TRIAL", empty: "Confront a sanctioned trial to earn your first title." },
    { title: "DEFEATED BOSSES", items: t.bosses, color: "#FF2A2A", icon: Skull, kind: "BOSS", empty: "Complete linked quests to erode a boss to zero." },
  ] : [];

  return (
    <div className="relative">
      <div className="fixed inset-0 -z-20 opacity-[0.14] pointer-events-none">
        <AxiomArt src={ENVIRONMENT_ART.hallOfAscension} alt="" className="w-full h-full" />
        <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 50% 30%, transparent 0%, #000 80%)"}}/>
      </div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] text-glow-amber">// HALL OF ASCENSION</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">TROPHY VAULT</h1>
        {t && <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">
          {t.counts.bosses} BOSSES · {t.counts.trials} TRIALS · {t.counts.ranks} RANK ASCENSIONS
        </div>}
      </div>

      <div className="space-y-4">
        {rows.map(section => (
          <div key={section.title} className="hud-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <section.icon size={14} strokeWidth={1.5} style={{color: section.color}}/>
              <div className="font-mono text-[10px] tracking-[0.5em]" style={{color: section.color}}>// {section.title}</div>
              <div className="font-mono text-[10px] text-[#8A8A93] ml-2">· {section.items.length}</div>
            </div>
            {section.items.length === 0 ? (
              <div className="text-[#8A8A93] font-mono text-xs">{section.empty}</div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {section.items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className="border border-white/10 p-3 clip-tech bg-black/40 flex items-center gap-3 hover:border-[#00F0FF]/40 transition-colors relative overflow-hidden"
                    data-testid={`trophy-${item.id}`}
                    initial={{ opacity: 0, scale: 0.8, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ borderColor: section.color, boxShadow: `0 0 18px ${section.color}33` }}
                  >
                    <Artifact kind={section.kind} color={section.color} tabVisible={visible}/>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-[#EAEAEA] truncate">{item.name}</div>
                      {item.title_awarded && <div className="font-mono text-[9px] text-[#FFB000] tracking-[0.25em]">TITLE · {item.title_awarded}</div>}
                      {item.domain && <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.25em]">{item.domain.replace(/_/g," ")}</div>}
                      {item.level && <div className="font-mono text-[9px] text-[#00F0FF]">LEVEL {item.level}</div>}
                      <div className="font-mono text-[9px] text-[#8A8A93] mt-1">{fmt(item.at)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
