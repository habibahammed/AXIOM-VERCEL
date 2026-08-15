import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Icosahedron, Sphere, Points, PointMaterial, Dodecahedron, Octahedron, Tetrahedron } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { RANK_PALETTES } from "@/config/rankPalettes";
import { getQuality } from "@/config/quality";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";

const ParticleField = ({ count = 1200, radius = 14, color = "#00F0FF", size = 0.05, speed = 0.02, opacity = 0.7 }) => {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.4 + Math.random() * 0.6);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i*3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i*3+2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) { ref.current.rotation.y += dt * speed; ref.current.rotation.x += dt * speed * 0.3; } });
  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial transparent color={color} size={size} sizeAttenuation depthWrite={false} opacity={opacity} blending={THREE.AdditiveBlending}/>
    </Points>
  );
};

// --- Atmosphere layer (obsidian/void fog + cyan rim lighting) ---------------
// Additive only: no camera/geometry changes, respects existing scene tree.
const OBSIDIAN = 0x050508;      // deep void tone for exponential fog
const CYAN_GLOW = "#00F0FF";    // AXIOM cyan for rim highlights

const RimLighting = () => (
  // Two low-intensity cyan lights placed BEHIND the origin relative to the
  // default camera at [0,0,9] — they graze the back edges of any lit object
  // (FloatingShard etc.) to produce a subtle cyan rim without altering the
  // scene's front-lit look. MeshBasic materials (Core/Rings) are unaffected.
  <>
    <directionalLight color={CYAN_GLOW} intensity={1.15} position={[0, 2.5, -9]} />
    <directionalLight color={CYAN_GLOW} intensity={0.55} position={[-4, -1, -6]} />
  </>
);

const DriftingBackdropParticles = ({ count = 260 }) => (
  // Distant, slow-drifting cyan haze — sits well outside the primary particle
  // shells (radius 40) with tiny points at very low opacity so it reads as
  // depth/atmosphere, not foreground detail.
  <ParticleField
    key={`bg-${count}`}
    count={count}
    radius={40}
    color={CYAN_GLOW}
    size={0.018}
    speed={0.004}
    opacity={0.22}
  />
);

const Core = ({ intensity = 1, palette }) => {
  const ref = useRef();
  const inner = useRef();
  const flare = useRef();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (ref.current) { ref.current.rotation.x += dt * 0.12; ref.current.rotation.y += dt * 0.18; }
    if (inner.current) { inner.current.rotation.y -= dt * 0.35; inner.current.rotation.z += dt * 0.12; }
    if (flare.current) flare.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.09);
  });
  return (
    <group>
      <mesh ref={flare}>
        <sphereGeometry args={[3.4, 32, 32]}/>
        <meshBasicMaterial color={palette.primary} transparent opacity={0.06 * intensity} blending={THREE.AdditiveBlending}/>
      </mesh>
      <Dodecahedron args={[2.6, 0]}>
        <meshBasicMaterial color={palette.primary} wireframe transparent opacity={0.28 * intensity}/>
      </Dodecahedron>
      <Icosahedron ref={ref} args={[2.0, 1]}>
        <meshBasicMaterial color={palette.primary} wireframe transparent opacity={0.55 * intensity} toneMapped={false}/>
      </Icosahedron>
      <Sphere ref={inner} args={[1.05, 32, 32]}>
        <meshBasicMaterial color={palette.primary} transparent opacity={0.13 * intensity} blending={THREE.AdditiveBlending}/>
      </Sphere>
      <Octahedron args={[0.55, 0]}>
        <meshBasicMaterial color={palette.tertiary} toneMapped={false}/>
      </Octahedron>
      <Sphere args={[0.32, 24, 24]}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} toneMapped={false}/>
      </Sphere>
    </group>
  );
};

const Ring = ({ radius = 4, tilt = 0.4, speed = 0.1, color = "#00F0FF", thickness = 0.02 }) => {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * speed; });
  return (
    <mesh ref={ref} rotation={[Math.PI/2 + tilt, 0, 0]}>
      <torusGeometry args={[radius, thickness, 8, 200]}/>
      <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </mesh>
  );
};

const Streak = ({ angle, tilt, radius, speed, offset, color }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(angle + t) * radius;
    ref.current.position.z = Math.sin(angle + t) * radius;
    ref.current.position.y = Math.sin(t * 0.7) * tilt * 4;
    ref.current.rotation.y = angle + t + Math.PI/2;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.02, 0.02, 0.9]}/>
      <meshBasicMaterial color={color} blending={THREE.AdditiveBlending} transparent opacity={0.9} toneMapped={false}/>
    </mesh>
  );
};

const EnergyStreaks = ({ count = 24, palette }) => {
  const streaks = useMemo(() => Array.from({length: count}).map(() => ({
    angle: Math.random() * Math.PI * 2,
    tilt: (Math.random() - 0.5) * 1.2,
    radius: 3 + Math.random() * 6,
    speed: 0.2 + Math.random() * 0.4,
    offset: Math.random() * Math.PI * 2,
    color: Math.random() > 0.7 ? palette.accent : palette.primary,
  })), [count, palette]);
  return <group>{streaks.map((s, i) => <Streak key={i} {...s}/>)}</group>;
};

// ---- Command Center environment upgrade (opt-in, additive) ----------------
// Everything below is gated behind new props that default to `false`, so
// every existing call site of <AxiomScene/> renders exactly as it did
// before. Nothing here touches XP/level/rank/quest/boss/AI logic.

// Subtle autonomous drift + mouse-parallax camera rig. Always looks at the
// origin so the whole scene reads as gently orbiting around the AXIOM Core.
const CameraRig = ({ strength = 0.55 }) => {
  const { camera, pointer } = useThree();
  const base = useMemo(() => camera.position.clone(), [camera]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const driftX = Math.sin(t * 0.12) * 0.6;
    const driftY = Math.cos(t * 0.09) * 0.35;
    const targetX = base.x + driftX + pointer.x * strength;
    const targetY = base.y + driftY + pointer.y * strength * 0.6;
    const lerp = Math.min(1, dt * 1.4);
    camera.position.x += (targetX - camera.position.x) * lerp;
    camera.position.y += (targetY - camera.position.y) * lerp;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

// Slow-drifting, lit geometric fragments scattered around the core. Uses
// MeshStandardMaterial deliberately (unlike the pure-emissive Core/Rings) so
// the new dynamic point lights below have something visible to illuminate.
const FloatingShard = ({ position, scale = 1, speed = 0.2, color, geo = "octa" }) => {
  const ref = useRef();
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state, dt) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x += dt * speed * 0.5;
    ref.current.rotation.y += dt * speed * 0.7;
    ref.current.position.y = position[1] + Math.sin(t * 0.4 + seed) * 0.6;
  });
  const Geo = geo === "tetra" ? Tetrahedron : geo === "ico" ? Icosahedron : Octahedron;
  return (
    <Geo ref={ref} args={[scale, 0]} position={position}>
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.6} emissive={color} emissiveIntensity={0.15}/>
    </Geo>
  );
};

const FloatingGeometry = ({ count = 7, palette, radius = 9 }) => {
  const shards = useMemo(() => Array.from({length: count}).map((_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const r = radius * (0.6 + Math.random() * 0.5);
    return {
      position: [Math.cos(angle) * r, (Math.random() - 0.5) * 5, Math.sin(angle) * r],
      scale: 0.18 + Math.random() * 0.3,
      speed: 0.15 + Math.random() * 0.3,
      color: Math.random() > 0.5 ? palette.primary : palette.accent,
      geo: ["octa", "tetra", "ico"][i % 3],
    };
  }), [count, radius, palette]);
  return <group>{shards.map((s, i) => <FloatingShard key={i} {...s}/>)}</group>;
};

// Two to three orbiting, gently pulsing point lights in the rank palette —
// real THREE.PointLight sources (not emissive fakes), giving the floating
// geometry above genuine dynamic illumination as it drifts through the scene.
const OrbitingLight = ({ color, radius, height, speed, offset, intensity = 6 }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = height + Math.sin(t * 1.3) * 1.2;
    ref.current.intensity = intensity * (0.75 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.25);
  });
  return <pointLight ref={ref} color={color} distance={16} decay={2}/>;
};

const DynamicLights = ({ palette, count = 3 }) => (
  <>
    <OrbitingLight color={palette.primary} radius={6} height={1.5} speed={0.22} offset={0} intensity={7}/>
    {count >= 2 && <OrbitingLight color={palette.accent} radius={8} height={-1.5} speed={-0.16} offset={2.1} intensity={5}/>}
    {count >= 3 && <OrbitingLight color={palette.tertiary} radius={4.5} height={0} speed={0.3} offset={4.2} intensity={4}/>}
  </>
);

// Subtle "breathing" scale pulse wrapped around whatever it's given —
// used to make the AXIOM Core feel alive without altering its own geometry.
const Breathing = ({ children, amount = 0.04, speed = 0.6 }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * speed) * amount;
    ref.current.scale.setScalar(s);
  });
  return <group ref={ref}>{children}</group>;
};

export const AxiomScene = ({
  intensity = 1, showCore = true, dense = true, rank = "E", enableBloom = true,
  // Opt-in Command Center environment upgrades — all default to false/unset
  // so every existing caller renders pixel-identical to before.
  parallax = false, floating = false, dynamicLighting = false, coreBreathing = false,
  fogNear, fogFar,
}) => {
  const palette = RANK_PALETTES[rank] || RANK_PALETTES.E;
  const tier = useAdaptiveQuality();
  const q = getQuality(tier);
  const visible = useDocumentVisible();
  const CoreEl = showCore && (
    coreBreathing ? <Breathing><Core intensity={intensity} palette={palette}/></Breathing> : <Core intensity={intensity} palette={palette}/>
  );
  const bloomOn = enableBloom && q.bloom;
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 55 }}
      dpr={q.dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      // Fully stop the render loop (and its bloom/particle/animation cost)
      // when the tab is backgrounded — this is a persistent, always-mounted
      // scene, so an inactive tab was previously still paying full render
      // cost for nothing.
      frameloop={visible ? "always" : "never"}
    >
      <color attach="background" args={[OBSIDIAN]} />
      {/* Volumetric-feeling exponential fog in obsidian/void tone —
          replaces the previous linear fog. Non-zero, very low density gives
          soft depth falloff without a full volumetric shader pass. */}
      <fogExp2 attach="fog" args={[OBSIDIAN, 0.028]} />
      {parallax && <CameraRig />}
      <Suspense fallback={null}>
        {/* Distant, slow-drifting cyan haze — background atmosphere layer,
            sits behind every existing particle shell and geometry. */}
        <DriftingBackdropParticles count={q.particlesPrimarySparse ? Math.min(q.particlesPrimarySparse, 260) : 180} />
        {/* Subtle cyan rim lighting on any lit object (FloatingShards etc.) */}
        <RimLighting />
        {CoreEl}
        <Ring radius={3.6} tilt={0.3} speed={0.18} thickness={0.025} color={palette.primary}/>
        <Ring radius={4.8} tilt={-0.5} speed={-0.1} color={palette.accent} thickness={0.02}/>
        <Ring radius={6.4} tilt={0.7} speed={0.07} thickness={0.015} color={palette.primary}/>
        {dense && q.extraRing && <Ring radius={8.0} tilt={-0.2} speed={-0.05} color={palette.accent} thickness={0.01}/>}
        <ParticleField key={`p1-${dense ? q.particlesPrimary : q.particlesPrimarySparse}`} count={dense ? q.particlesPrimary : q.particlesPrimarySparse} radius={12} color={palette.primary} size={0.05} speed={0.02}/>
        {dense && q.particlesAccent > 0 && <ParticleField key={`p2-${q.particlesAccent}`} count={q.particlesAccent} radius={18} color={palette.accent} size={0.03} speed={-0.015}/>}
        {dense && q.particlesTertiary > 0 && <ParticleField key={`p3-${q.particlesTertiary}`} count={q.particlesTertiary} radius={22} color={palette.tertiary} size={0.02} speed={0.008}/>}
        {dense && q.streaks > 0 && <EnergyStreaks key={`s-${q.streaks}`} count={q.streaks} palette={palette}/>}
        {floating && q.floatingCount > 0 && <FloatingGeometry key={`f-${q.floatingCount}`} count={q.floatingCount} palette={palette} radius={9}/>}
        <ambientLight intensity={dynamicLighting ? 0.35 : 0.7} />
        {dynamicLighting && <DynamicLights palette={palette} count={q.dynamicLights}/>}
      </Suspense>
      {bloomOn && (
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom
            intensity={palette.bloom}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.85}
          />
          {q.chromaticAberration && (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={[0.0006, 0.0009]}
              radialModulation={false}
              modulationOffset={0}
            />
          )}
          <Vignette eskil={false} offset={0.15} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  );
};

export default AxiomScene;
