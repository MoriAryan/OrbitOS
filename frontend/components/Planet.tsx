"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { ProcessData } from "@/hooks/useSystemWS";

// Vibrant planet colour palette
const PLANET_COLORS = [
  "#a855f7", // violet
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
  "#ef4444", // red
  "#8b5cf6", // indigo
  "#06b6d4", // cyan
];

// Orbital radii for each rank (index 0 = highest RAM)
const ORBIT_RADII = [5, 7, 9, 11, 13.5, 16, 18.5, 21, 23.5, 26];
const ORBIT_OFFSETS = [0, 0.63, 1.26, 1.89, 2.51, 3.14, 3.77, 4.40, 5.03, 5.65];

interface PlanetProps {
  process: ProcessData;
  index: number;     // 0–9 rank
  maxRam: number;    // for normalisation
  zoomedIn?: boolean;
}

export default function Planet({ process, index, maxRam, zoomedIn }: PlanetProps) {
  const groupRef  = useRef<THREE.Group>(null!);
  const angleRef  = useRef(ORBIT_OFFSETS[index] ?? 0);
  const meshRef   = useRef<THREE.Mesh>(null!);

  const color      = PLANET_COLORS[index % PLANET_COLORS.length];
  const radius     = ORBIT_RADII[index] ?? 5 + index * 2;

  // Planet size: 0.22 → 0.85 based on RAM
  const planetSize = 0.22 + (process.ram_mb / Math.max(maxRam, 1)) * 0.63;

  // Orbital speed: 0.08 → 0.45 rad/s (inverse — inner orbits faster)
  const baseSpeed  = 0.45 - (index / 10) * 0.37;
  const cpuBoost   = (process.cpu_pct / 100) * 0.2;
  const speed      = Math.max(0.06, baseSpeed + cpuBoost);

  useFrame((_, delta) => {
    angleRef.current += speed * delta;

    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * radius;
      groupRef.current.position.z = Math.sin(angleRef.current) * radius;
      groupRef.current.position.y = Math.sin(angleRef.current * 0.7) * 0.4;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <>
      {/* Orbit path ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.012, 8, 160]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>

      {/* Planet group — position updated in useFrame */}
      <group ref={groupRef}>
        {/* Planet body */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[planetSize, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>

        {/* Atmospheric glow */}
        <mesh>
          <sphereGeometry args={[planetSize * 1.35, 16, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.07}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Process name label */}
        {!zoomedIn && (
          <Html
            position={[0, planetSize + 0.35, 0]}
            center
            distanceFactor={18}
            occlude={false}
          >
            <div
              style={{
                background: "rgba(10,14,26,0.85)",
                border: `1px solid ${color}55`,
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
                color: color,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                userSelect: "none",
                textShadow: `0 0 6px ${color}`,
              }}
            >
              {process.name.replace(".exe", "")}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
