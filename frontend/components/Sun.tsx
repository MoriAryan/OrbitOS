"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface SunProps {
  cpuPct: number; // 0–100
}

export default function Sun({ cpuPct }: SunProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);

  // Map CPU% to visual intensity
  const intensity = 0.3 + (cpuPct / 100) * 1.4; // 0.3 → 1.7

  useFrame((_, delta) => {
    // Slow rotation
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15;

    // Pulsing glow scale driven by CPU
    if (glowRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.04 * (cpuPct / 50);
      glowRef.current.scale.setScalar(pulse);
    }

    // Dynamic light intensity
    if (lightRef.current) {
      lightRef.current.intensity = 3 + (cpuPct / 100) * 5;
    }
  });

  return (
    <group>
      {/* Core sun sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <meshStandardMaterial
          color="#ff8c00"
          emissive="#ff6000"
          emissiveIntensity={intensity}
          roughness={0.2}
          metalness={0}
        />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.9, 32, 32]} />
        <meshStandardMaterial
          color="#ff6000"
          emissive="#ff4500"
          emissiveIntensity={0.6}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Corona ring 1 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.4, 0.06, 16, 128]} />
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ffaa00"
          emissiveIntensity={0.8}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Corona ring 2 */}
      <mesh rotation={[Math.PI / 3, 0.5, 0]}>
        <torusGeometry args={[3.8, 0.04, 16, 128]} />
        <meshStandardMaterial
          color="#ff8c00"
          emissive="#ff8c00"
          emissiveIntensity={0.5}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Central point light — illuminates planets */}
      <pointLight
        ref={lightRef}
        color="#ffcc66"
        intensity={6}
        distance={120}
        decay={1.5}
      />

      {/* Soft ambient fill */}
      <pointLight color="#ff6600" intensity={1.5} distance={80} decay={2} />
    </group>
  );
}
