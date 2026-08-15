import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Torus } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/services/sound";
import * as THREE from "three";
import AxiomArt from "@/components/common/AxiomArt";
import { BOSS_ART } from "@/services/assets/registry";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";

const BossCore = ({ color = "#FF2A2A" }) => {
  const core = useRef();
  const rim = useRef();
  const flare = useRef();
  useFrame((state, dt) => {
    if (core.current) core.current.rotation.y += dt * 0.6;
    if (rim.current) { rim.current.rotation.z += dt * 0.4; rim.current.rotation.x += dt * 0.2; }
    if (flare.current) flare.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
  });
  return (
    <group>
      <mesh ref={flare}>
        <sphereGeometry args={[2.4, 24, 24]}/>
        <meshBasicMaterial color={color} transparent opacity={0.06}/>
      </mesh>
      <Icosahedron ref={core} args={[1.5, 1]}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.95}/>
      </Icosahedron>
      <group ref={rim}>
        <Torus args={[2.2, 0.03, 8, 128]}>
          <meshBasicMaterial color={color}/>
        </Torus>
        <Torus args={[2.6, 0.02, 8, 128]} rotation={[Math.PI/2, 0, 0]}>
          <meshBasicMaterial color={color} transparent opacity={0.5}/>
        </Torus>
      </group>
    </group>
  );
};

export default function BossRevealOverlay({ boss, onClose }) {
  const visible = useDocumentVisible();
  useEffect(() => {
    if (!boss) return;
    sound.bossEncounter();
    const t1 = setTimeout(() => sound.bossHit(), 700);
    const t2 = setTimeout(onClose, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [boss, onClose]);

  if (!boss) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        data-testid="boss-reveal"
      >
        {/* Boss portrait backdrop (atmospheric, behind the 3D core) */}
        {BOSS_ART[boss.boss_key] && (
          <div className="absolute inset-0 pointer-events-none">
            <AxiomArt src={BOSS_ART[boss.boss_key]} alt={boss.name} className="w-full h-full opacity-30" />
            <div className="absolute inset-0" style={{background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.85) 75%)"}}/>
          </div>
        )}

        {/* R3F backdrop */}
        <div className="absolute inset-0">
          <Canvas dpr={[1, 1.4]} camera={{position:[0,0,7], fov: 55}} gl={{alpha: true}} frameloop={visible ? "always" : "never"}>
            <ambientLight intensity={0.5}/>
            <fog attach="fog" args={[0x000000, 5, 18]}/>
            <Suspense fallback={null}>
              <BossCore color="#FF2A2A"/>
            </Suspense>
          </Canvas>
        </div>

        {/* Red vignette scanlines */}
        <div className="absolute inset-0 grid-void opacity-25 pointer-events-none"/>
        <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(255,42,42,0.35) 100%)"}}/>

        {/* Warning bands top/bottom */}
        <motion.div initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:0.1, duration: 0.6}} className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-transparent via-[#FF2A2A]/40 to-transparent origin-left"/>
        <motion.div initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:0.15, duration: 0.6}} className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-transparent via-[#FF2A2A]/40 to-transparent origin-right"/>

        {/* Text content */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
          className="relative z-10 text-center max-w-2xl px-6"
        >
          <div className="font-mono text-[11px] tracking-[0.7em] text-[#FF2A2A] text-glow-red mb-6 animate-pulse">
            // THREAT DETECTED · FIRST STRIKE //
          </div>
          <div className="font-display text-5xl md:text-7xl text-[#FF2A2A] text-glow-red mb-4 leading-none">
            {boss.name}
          </div>
          <div className="font-mono text-xs tracking-[0.4em] text-[#FFB8B8] mb-4">{boss.domain?.replace(/_/g," ")}</div>
          <div className="font-heading text-base text-[#EAEAEA] mb-6 italic border-l-2 border-[#FF2A2A] pl-4 text-left">
            "{boss.description}"
          </div>
          <div className="flex justify-center gap-6 font-mono text-xs">
            <div><span className="text-[#8A8A93]">RESISTANCE </span><span className="text-[#FF2A2A]">{boss.resistance}/{boss.max_resistance}</span></div>
            <div><span className="text-[#8A8A93]">PHASES </span><span className="text-[#FF2A2A]">{boss.phases}</span></div>
            <div><span className="text-[#8A8A93]">DAMAGE </span><span className="text-[#FFB000]">-{boss.damage}</span></div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
