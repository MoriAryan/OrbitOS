"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MetricsData, ProcessData } from "@/hooks/useSystemWS";
import AsteroidBelt from "./AsteroidBelt";
import EarthNode from "./EarthNode";
import Planet, { PLANET_DEFS } from "./Planet";
import SidePanel, { SelectedItem } from "./SidePanel";
import Sun from "./Sun";

// ── Camera Rig ────────────────────────────────────────────────────────────────
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

    // Direction from the Sun (origin) toward Earth's current world position
    const earthDir = targetPos.clone().normalize();

    // Place camera just beyond Earth in that same direction, slightly elevated
    // This makes the camera look AT Earth, not at the Sun
    const camPos = targetPos.clone()
      .addScaledVector(earthDir, 3.5)   // 3.5 units past Earth (away from Sun)
      .add(new THREE.Vector3(0, 1.5, 0)); // slight upward tilt for drama

    gsap.to(camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: 2.0,
      ease: "power3.inOut",
      onComplete: () => {
        animatingRef.current = false;
        onZoomComplete();
      },
    });
  }, [targetPos, camera, onZoomComplete]);

  return null;
}

// ── Scene inner ───────────────────────────────────────────────────────────────
interface SceneProps {
  metrics: MetricsData | null;
  onEarthClick: (pos: THREE.Vector3) => void;
  zoomedIn: boolean;
  onSelectItem: (item: SelectedItem) => void;
}

function SceneContent({ metrics, onEarthClick, zoomedIn, onSelectItem }: SceneProps) {
  const cpu  = metrics?.cpu_total ?? 0;

  // Sort top processes by RAM desc — biggest RAM → index 0 (Jupiter slot)
  const sortedProcs: ProcessData[] = [...(metrics?.top_processes ?? [])].sort(
    (a, b) => b.ram_mb - a.ram_mb
  );

  const bgProcs: ProcessData[] = metrics?.bg_processes?.processes ?? [];
  const maxRam = sortedProcs[0]?.ram_mb ?? 1;

  return (
    <>
      {/* ── Global lighting ── */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} color="#ffe8cc" />

      <Stars radius={180} depth={60} count={6000} factor={3.5} saturation={0} fade speed={0.3} />

      {/* Sun — CPU-driven */}
      <Sun cpuPct={cpu} />

      {/* 8 planets — each mapped by RAM rank to a solar system planet type */}
      {sortedProcs.slice(0, PLANET_DEFS.length).map((proc, i) => (
        <Planet
          key={proc.pid}
          process={proc}
          sizeRank={i}
          maxRam={maxRam}
          zoomedIn={zoomedIn}
          onSelect={(p, name) => onSelectItem({ type: "planet", proc: p, planetName: name })}
        />
      ))}

      {/* Earth — special network node */}
      <EarthNode onEarthClick={onEarthClick} zoomedIn={zoomedIn} />

      {/* Real asteroid belt (between Mars and Jupiter) */}
      {!zoomedIn && bgProcs.length > 0 && (
        <AsteroidBelt
          processes={bgProcs}
          zoomedIn={zoomedIn}
          onSelect={(p) => onSelectItem({ type: "asteroid", proc: p })}
        />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={!zoomedIn}
        minDistance={5}
        maxDistance={95}       // Allow zooming out to see full system
        autoRotate={!zoomedIn}
        autoRotateSpeed={0.10}
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

export default function SystemScene({ metrics, onEarthZoomed, zoomedIn }: SystemSceneProps) {
  const [earthWorldPos, setEarthWorldPos] = useState<THREE.Vector3 | null>(null);
  const [selectedItem,  setSelectedItem]  = useState<SelectedItem | null>(null);

  // ── Fix: prevent Canvas onClick from clearing selection set by a 3D object ──
  // When a planet/asteroid is clicked, R3F's mesh onClick fires FIRST (native),
  // then React's synthetic onClick on the Canvas div fires. Without this guard,
  // the Canvas onClick always clears the selection immediately after it's set.
  const justSelectedRef = useRef(false);

  const handleSelectItem = useCallback((item: SelectedItem) => {
    justSelectedRef.current = true;
    // Reset flag after current event loop so next empty-space clicks work
    requestAnimationFrame(() => { justSelectedRef.current = false; });
    setSelectedItem(item);
  }, []);

  const handleEarthClick = useCallback((pos: THREE.Vector3) => {
    setEarthWorldPos(pos.clone());
  }, []);

  const handleZoomComplete = useCallback(() => { onEarthZoomed(); }, [onEarthZoomed]);

  const allProcesses: ProcessData[] = [
    ...(metrics?.top_processes ?? []),
    ...(metrics?.bg_processes?.processes ?? []),
  ];

  return (
    <>
      <Canvas
        camera={{ position: [0, 20, 48], fov: 58, near: 0.1, far: 600 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100vw", height: "100vh", background: "#020408" }}
        onClick={() => {
          // Only close panel if no 3D object was just clicked
          if (!justSelectedRef.current) {
            setSelectedItem(null);
          }
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            metrics={metrics}
            onEarthClick={handleEarthClick}
            zoomedIn={zoomedIn}
            onSelectItem={handleSelectItem}
          />
          <CameraRig targetPos={earthWorldPos} onZoomComplete={handleZoomComplete} />
        </Suspense>
      </Canvas>

      {/* Slide-in side panel — renders outside Canvas */}
      <SidePanel
        item={selectedItem}
        allProcesses={allProcesses}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
