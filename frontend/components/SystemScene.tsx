"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
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

// ── Follow Rig ────────────────────────────────────────────────────────────────
interface FollowRigProps {
  followTargetRef: React.MutableRefObject<{ position: THREE.Vector3; radius: number }>;
  orbitControlsRef: React.MutableRefObject<any>;
  isActive: boolean;
  selectedItem: SelectedItem | null;
}

function FollowRig({ followTargetRef, orbitControlsRef, isActive, selectedItem }: FollowRigProps) {
  const { camera } = useThree();
  const wasActiveRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);
  const hasArrivedRef = useRef(false);
  const prevTargetPosRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    const currentId = selectedItem ? selectedItem.proc.pid.toString() : null;

    if (isActive && orbitControlsRef.current && followTargetRef.current) {
      wasActiveRef.current = true;
      
      const targetPos = followTargetRef.current.position;
      const radius = followTargetRef.current.radius;

      if (targetPos.lengthSq() > 0.1) {
        if (currentId !== prevSelectedRef.current) {
          prevSelectedRef.current = currentId;
          hasArrivedRef.current = false;
          prevTargetPosRef.current = targetPos.clone();
        }

        const dir = targetPos.clone().normalize();
        if (dir.length() === 0) dir.set(0, 0, 1);
        
        // Ideal camera position: outside the planet's orbit looking inward, slightly elevated
        const dist = radius * 4.5 + 1.2;
        const idealCamPos = targetPos.clone()
          .addScaledVector(dir, dist)
          .add(new THREE.Vector3(0, dist * 0.25, 0));

        // 1. Shift camera and target by the exact amount the planet moved this frame
        // This puts the camera in the planet's moving reference frame, eliminating orbital lag
        if (prevTargetPosRef.current) {
          const deltaPos = targetPos.clone().sub(prevTargetPosRef.current);
          camera.position.add(deltaPos);
          orbitControlsRef.current.target.add(deltaPos);
        }

        // 2. Glide camera to ideal zoom/angle ONLY initially
        if (!hasArrivedRef.current) {
          const lerpAlpha = Math.min(delta * 6.0, 1.0);
          camera.position.lerp(idealCamPos, lerpAlpha);
          if (camera.position.distanceTo(idealCamPos) < 0.5) {
            hasArrivedRef.current = true;
          }
        }

        // 3. ALWAYS tightly lock the target perfectly to the planet's center
        // By using exact copy instead of lerp, we prevent violent math oscillations at low framerates.
        orbitControlsRef.current.target.copy(targetPos);
        
        prevTargetPosRef.current = targetPos.clone();
        orbitControlsRef.current.update();
      }
    } else if (!isActive && orbitControlsRef.current) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        // When deselected, smoothly fly back to the global solar system overview
        gsap.to(camera.position, {
          x: 0,
          y: 20,
          z: 48,
          duration: 2.0,
          ease: "power3.inOut",
          onUpdate: () => {
            if (orbitControlsRef.current) orbitControlsRef.current.update();
          }
        });
      }

      // Smoothly return target to center (Sun) when nothing is selected
      orbitControlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 3.5);
    }
  });
  return null;
}



// ── Scene inner ───────────────────────────────────────────────────────────────
interface SceneProps {
  metrics: MetricsData | null;
  onEarthClick: (pos: THREE.Vector3) => void;
  zoomedIn: boolean;
  selectedItem: SelectedItem | null;
  onSelectItem: (item: SelectedItem | null) => void;
  followTargetRef: React.MutableRefObject<{ position: THREE.Vector3; radius: number }>;
}

function SceneContent({ metrics, onEarthClick, zoomedIn, selectedItem, onSelectItem, followTargetRef }: SceneProps) {
  const cpu  = metrics?.cpu_total ?? 0;
  const orbitControlsRef = useRef<any>(null);

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
          isSelected={selectedItem?.type === "planet" && selectedItem.proc.pid === proc.pid}
          followTargetRef={followTargetRef}
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
          selectedItem={selectedItem}
          followTargetRef={followTargetRef}
        />
      )}

      <FollowRig followTargetRef={followTargetRef} orbitControlsRef={orbitControlsRef} isActive={!!selectedItem} selectedItem={selectedItem} />

      <OrbitControls
        ref={orbitControlsRef}
        enablePan={false}
        enableZoom={!zoomedIn}
        minDistance={1.0}
        maxDistance={120}
        autoRotate={!zoomedIn && !selectedItem}
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
  selectedItem: SelectedItem | null;
  onSelectItem: (item: SelectedItem | null) => void;
}

export default function SystemScene({ metrics, onEarthZoomed, zoomedIn, selectedItem, onSelectItem }: SystemSceneProps) {
  const [earthWorldPos, setEarthWorldPos] = useState<THREE.Vector3 | null>(null);
  const followTargetRef = useRef({ position: new THREE.Vector3(), radius: 1 });

  // ── Fix: prevent Canvas onClick from clearing selection set by a 3D object ──
  // When a planet/asteroid is clicked, R3F's mesh onClick fires FIRST (native),
  // then React's synthetic onClick on the Canvas div fires. Without this guard,
  // the Canvas onClick always clears the selection immediately after it's set.
  const justSelectedRef = useRef(false);

  const handleSelectItem = useCallback((item: SelectedItem | null) => {
    justSelectedRef.current = true;
    // Reset flag after current event loop so next empty-space clicks work
    requestAnimationFrame(() => { justSelectedRef.current = false; });
    onSelectItem(item);
  }, [onSelectItem]);

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
            onSelectItem(null);
          }
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            metrics={metrics}
            onEarthClick={handleEarthClick}
            zoomedIn={zoomedIn}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            followTargetRef={followTargetRef}
          />
          <CameraRig targetPos={earthWorldPos} onZoomComplete={handleZoomComplete} />
        </Suspense>
      </Canvas>

      {/* Slide-in side panel — renders outside Canvas */}
      <SidePanel
        item={selectedItem}
        allProcesses={allProcesses}
        onClose={() => onSelectItem(null)}
      />
    </>
  );
}
