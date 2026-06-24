"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface AsteroidBeltProps {
  count: number;        // number of background processes
  totalRamMb: number;   // for density hint
}

const INNER_RADIUS = 30;
const OUTER_RADIUS = 42;
const PARTICLE_COUNT = 250; // fixed count for performance

export default function AsteroidBelt({ count: _count }: AsteroidBeltProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef  = useRef<THREE.InstancedMesh>(null!);

  // Build instanced positions once
  const { matrices, dummy } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle  = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.25;
      const r      = INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS);
      const yJitter = (Math.random() - 0.5) * 2.5;
      const scale  = 0.04 + Math.random() * 0.14;

      dummy.position.set(
        Math.cos(angle) * r,
        yJitter,
        Math.sin(angle) * r,
      );
      dummy.scale.setScalar(scale);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
    return { matrices, dummy };
  }, []);

  // Apply matrices to instanced mesh once after mount
  const onMeshReady = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    meshRef.current = mesh;
    matrices.forEach((mat, i) => {
      mesh.setMatrixAt(i, mat);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useFrame((_, delta) => {
    // Whole belt rotates as one — very cheap, no per-particle animation
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={onMeshReady}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#4a5568"
          emissive="#1e293b"
          emissiveIntensity={0.2}
          roughness={0.9}
          metalness={0.1}
        />
      </instancedMesh>

      {/* Subtle belt glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[(INNER_RADIUS + OUTER_RADIUS) / 2, (OUTER_RADIUS - INNER_RADIUS) / 2, 2, 256]} />
        <meshBasicMaterial
          color="#334155"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
