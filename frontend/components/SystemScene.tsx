"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MetricsData } from "@/hooks/useSystemWS";
import AsteroidBelt from "./AsteroidBelt";
import EarthNode from "./EarthNode";
import Planet from "./Planet";
import Sun from "./Sun";

// ── Camera Rig — handles smooth zoom to Earth ─────────────────────────────────
interface CameraRigProps {
  targetPos: THREE.Vector3 | null;
  onZoomComplete: () => void;
}

function CameraRig({ targetPos, onZoomComplete }: CameraRigProps) {
  const { camera } = useThree();
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!targetPos || animatingRef.current) return;
    animatingRef.current = true;

    // Calculate position behind and above the Earth
    const offset = new THREE.Vector3(
      targetPos.x * 0.2,
      targetPos.y + 3,
      targetPos.z + 6,
    );

    gsap.to(camera.position, {
      x: offset.x,
      y: offset.y,
      z: offset.z,
      duration: 2.2,
      ease: "power3.inOut",
      onComplete: () => {
        animatingRef.current = false;
        onZoomComplete();
      },
    });
  }, [targetPos, camera, onZoomComplete]);

  return null;
}

// ── Scene inner (needs to be inside Canvas) ───────────────────────────────────
interface SceneProps {
  metrics: MetricsData | null;
  onEarthClick: (pos: THREE.Vector3) => void;
  zoomedIn: boolean;
}

function SceneContent({ metrics, onEarthClick, zoomedIn }: SceneProps) {
  const cpu      = metrics?.cpu_total ?? 0;
  const procs    = metrics?.top_processes ?? [];
  const bg       = metrics?.bg_processes ?? { count: 150, total_ram_mb: 0 };
  const maxRam   = procs.length > 0 ? procs[0].ram_mb : 1;

  return (
    <>
      {/* Ambient light — minimal, so Sun is the main light source */}
      <ambientLight intensity={0.04} />

      {/* Stars background */}
      <Stars radius={180} depth={60} count={8000} factor={4} saturation={0} fade speed={0.5} />

      {/* Sun (CPU) */}
      <Sun cpuPct={cpu} />

      {/* Process planets */}
      {procs.map((proc, i) => (
        <Planet
          key={i}
          process={proc}
          index={i}
          maxRam={maxRam}
          zoomedIn={zoomedIn}
        />
      ))}

      {/* Earth (network node) */}
      <EarthNode onEarthClick={onEarthClick} zoomedIn={zoomedIn} />

      {/* Asteroid belt (background processes) */}
      <AsteroidBelt count={bg.count} totalRamMb={bg.total_ram_mb} />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={!zoomedIn}
        minDistance={8}
        maxDistance={90}
        autoRotate={!zoomedIn}
        autoRotateSpeed={0.18}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
interface SystemSceneProps {
  metrics: MetricsData | null;
  onEarthZoomed: () => void;
  zoomedIn: boolean;
}

export default function SystemScene({
  metrics,
  onEarthZoomed,
  zoomedIn,
}: SystemSceneProps) {
  const [earthWorldPos, setEarthWorldPos] = useState<THREE.Vector3 | null>(null);

  const handleEarthClick = useCallback((pos: THREE.Vector3) => {
    setEarthWorldPos(pos.clone());
  }, []);

  const handleZoomComplete = useCallback(() => {
    onEarthZoomed();
  }, [onEarthZoomed]);

  return (
    <Canvas
      camera={{ position: [0, 16, 42], fov: 55, near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100vw", height: "100vh", background: "#020408" }}
    >
      <Suspense fallback={null}>
        <SceneContent
          metrics={metrics}
          onEarthClick={handleEarthClick}
          zoomedIn={zoomedIn}
        />
        <CameraRig
          targetPos={earthWorldPos}
          onZoomComplete={handleZoomComplete}
        />
      </Suspense>
    </Canvas>
  );
}
