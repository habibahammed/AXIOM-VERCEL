import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { usePlayer } from "@/state/PlayerContext";
import * as THREE from "three";
import AxiomArt from "@/components/common/AxiomArt";
import { ENVIRONMENT_ART } from "@/services/assets/registry";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";

const RANKS = [
  { code: "E", name: "SPARK", min: 1, max: 10, color: "#00F0FF" },
  { code: "D", name: "RISER", min: 11, max: 22, color: "#00F0FF" },
  { code: "C", name: "WARRIOR", min: 23, max: 38, color: "#00F0FF" },
  { code: "B", name: "HUNTER", min: 39, max: 55, color: "#FFB000" },
  { code: "A", name: "ELITE", min: 56, max: 72, color: "#FFB000" },
  { code: "S", name: "MASTER", min: 73, max: 86, color: "#FFB000" },
  { code: "SS", name: "LEGEND", min: 87, max: 96, color: "#FF2A2A" },
  { code: "SSS", name: "MONARCH", min: 97, max: 103, color: "#FF2A2A" },
  { code: "???", name: "SUPREME MONARCH", min: 104, max: 104, color: "#FF2A2A" },
];

const Tower = ({ position, unlocked, height, color, code }) => {
  const ref = useRef();
  const beam = useRef();
  useFrame((_, dt) => {
    if (ref.current && unlocked) ref.current.rotation.y += dt * 0.15;
    if (beam.current && unlocked) beam.current.material.opacity = 0.45 + Math.sin(performance.now()/500) * 0.2;
  });
  const opacity = unlocked ? 0.95 : 0.18;
  const solidColor = unlocked ? color : "#3A3A44";
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.7, 0.3, 6]}/>
        <meshBasicMaterial color={solidColor} transparent opacity={unlocked ? 0.4 : 0.15} wireframe/>
      </mesh>
      {/* Body */}
      <group ref={ref}>
        <mesh position={[0, height/2 + 0.3, 0]}>
          <cylinderGeometry args={[0.35, 0.45, height, 6]}/>
          <meshBasicMaterial color={solidColor} transparent opacity={opacity} wireframe/>
        </mesh>
        <mesh position={[0, height/2 + 0.3, 0]}>
          <cylinderGeometry args={[0.3, 0.4, height, 6]}/>
          <meshBasicMaterial color={solidColor} transparent opacity={opacity * 0.15}/>
        </mesh>
      </group>
      {/* Spire */}
      <mesh position={[0, height + 0.45, 0]}>
        <coneGeometry args={[0.32, 0.6, 6]}/>
        <meshBasicMaterial color={solidColor} transparent opacity={opacity}/>
      </mesh>
      {/* Beam of light for unlocked */}
      {unlocked && (
        <mesh ref={beam} position={[0, height + 2.5, 0]}>
          <cylinderGeometry args={[0.03, 0.08, 4, 6]}/>
          <meshBasicMaterial color={color} transparent opacity={0.6}/>
        </mesh>
      )}
      {/* Rank label sprite via HTML */}
    </group>
  );
};

const Citadel = ({ level }) => {
  const groupRef = useRef();
  useFrame((_, dt) => { if (groupRef.current) groupRef.current.rotation.y += dt * 0.06; });
  const positions = useMemo(() => {
    const R = 4.2;
    return RANKS.map((_, i) => {
      const angle = (i / RANKS.length) * Math.PI * 2 - Math.PI/2;
      return [Math.cos(angle) * R, 0, Math.sin(angle) * R];
    });
  }, []);
  return (
    <group ref={groupRef}>
      {/* Ground plate */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[2.5, 6.5, 32]}/>
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.12} side={THREE.DoubleSide}/>
      </mesh>
      {/* Central spire */}
      <group>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.4, 0.7, 3, 8]}/>
          <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.6}/>
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <octahedronGeometry args={[0.6, 0]}/>
          <meshBasicMaterial color="#00F0FF"/>
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <octahedronGeometry args={[0.9, 0]}/>
          <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.5}/>
        </mesh>
      </group>
      {RANKS.map((r, i) => {
        const unlocked = level >= r.min;
        const h = 1.2 + i * 0.35;
        return <Tower key={r.code} position={positions[i]} unlocked={unlocked} height={h} color={r.color} code={r.code}/>;
      })}
    </group>
  );
};

export default function MonarchSanctum() {
  const { player } = usePlayer();
  const visible = useDocumentVisible();
  if (!player) return null;
  const level = player.level;
  const unlockedRanks = RANKS.filter(r => level >= r.min);

  return (
    <div className="relative">
      <div className="fixed inset-0 -z-20 opacity-[0.14] pointer-events-none">
        <AxiomArt src={ENVIRONMENT_ART.monarchSanctum} alt="" className="w-full h-full" />
        <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 50% 30%, transparent 0%, #000 80%)"}}/>
      </div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// MONARCH SANCTUM</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">EVOLVING CITADEL</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">
          A NEW TOWER RISES EACH RANK · {unlockedRanks.length}/{RANKS.length} STANDING
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 hud-panel p-2 relative scanline" style={{height: "72vh", minHeight: 520}}>
          <Canvas dpr={[1, 1.4]} camera={{position:[8, 6, 8], fov: 45}} gl={{antialias:true, alpha:true}} frameloop={visible ? "always" : "never"}>
            <color attach="background" args={[0x000000]}/>
            <fog attach="fog" args={[0x000000, 10, 22]}/>
            <ambientLight intensity={0.5}/>
            <pointLight position={[0, 6, 0]} intensity={1.2} color="#00F0FF"/>
            <Suspense fallback={null}>
              <Citadel level={level}/>
            </Suspense>
            <OrbitControls enablePan={false} enableZoom={true} maxDistance={16} minDistance={6}/>
          </Canvas>
          <div className="absolute bottom-3 left-4 font-mono text-[10px] text-[#8A8A93] tracking-[0.3em] pointer-events-none">DRAG · SANCTUM RESPONDS</div>
        </div>

        <div className="col-span-12 lg:col-span-4 hud-panel p-5">
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// SANCTUM REGISTRY</div>
          <div className="space-y-1.5">
            {RANKS.map(r => {
              const unlocked = level >= r.min;
              return (
                <div key={r.code} className="flex items-center gap-3 border border-white/5 p-2 clip-tech" data-testid={`sanctum-tower-${r.code}`}>
                  <div className={`w-8 h-8 flex items-center justify-center border font-display text-xs`}
                    style={{borderColor: unlocked ? r.color : "rgba(255,255,255,0.15)", color: unlocked ? r.color : "#8A8A93", textShadow: unlocked ? `0 0 8px ${r.color}` : "none"}}>
                    {r.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-display text-sm ${unlocked ? "text-[#EAEAEA]" : "text-[#8A8A93]"}`}>{r.name}</div>
                    <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.2em]">LVL {r.min}{r.min !== r.max ? `–${r.max}` : ""}</div>
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.25em]" style={{color: unlocked ? "#00F0FF" : "#8A8A93"}}>
                    {unlocked ? "RAISED" : "SEALED"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] text-[#8A8A93] leading-relaxed">
            Every rank you attain raises another tower around the central spire. Legend and Monarch towers burn brighter than any beneath them.
          </div>
        </div>
      </div>
    </div>
  );
}
