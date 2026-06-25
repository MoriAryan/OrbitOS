"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";

interface SunProps { cpuPct: number }

function SunInner({ cpuPct }: SunProps) {
  const sunTexture = useTexture("/textures/planets/2k_sun.jpg");
  const meshRef    = useRef<THREE.Mesh>(null!);
  const lightRef   = useRef<THREE.PointLight>(null!);
  const halo1      = useRef<THREE.Mesh>(null!);
  const halo2      = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
    if (lightRef.current) lightRef.current.intensity = 4 + (cpuPct / 100) * 6;

    // Two independent slow-spinning halo shells — no torus rings
    if (halo1.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.0015) * 0.03;
      halo1.current.scale.setScalar(pulse);
    }
    if (halo2.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.001 + 1) * 0.05;
      halo2.current.scale.setScalar(pulse);
    }
  });

  const intensity = 0.8 + (cpuPct / 100) * 1.2;

  return (
    <group>
      {/* Real Sun surface texture */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshStandardMaterial
          map={sunTexture}
          emissive={new THREE.Color("#ff6000")}
          emissiveIntensity={intensity}
          emissiveMap={sunTexture}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Inner corona glow — sphere shell, NOT a ring */}
      <mesh ref={halo1}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer corona halo */}
      <mesh ref={halo2}>
        <sphereGeometry args={[4.2, 24, 24]} />
        <meshBasicMaterial
          color="#ff5500"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Primary light — illuminates all planets, very long range, low decay */}
      <pointLight ref={lightRef} color="#ffdd88" intensity={12} distance={0} decay={0} />
      {/* Warm fill */}
      <pointLight color="#ff6600" intensity={2.5} distance={0} decay={0} />
    </group>
  );
}

export default function Sun({ cpuPct }: SunProps) {
  return (
    <Suspense fallback={null}>
      <SunInner cpuPct={cpuPct} />
    </Suspense>
  );
}
