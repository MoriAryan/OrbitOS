"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ProcessData } from "@/hooks/useSystemWS";

// Belt positioned between Mars (orbit=17) and Jupiter (orbit=27)
const BELT_INNER = 19.5;
const BELT_OUTER = 24.5;

interface AsteroidBeltProps {
  processes: ProcessData[];
  zoomedIn?: boolean;
  onSelect: (proc: ProcessData) => void;
}

interface AsteroidData {
  angle:   number;   // fixed angular position (radians)
  radius:  number;   // fixed radial position
  y:       number;   // very small vertical offset — keeps belt FLAT
  scale:   number;   // asteroid size
  rotX:    number;   // initial rotation
  rotZ:    number;
}

export default function AsteroidBelt({ processes, zoomedIn, onSelect }: AsteroidBeltProps) {
  const count     = Math.max(processes.length, 1);
  const groupRef  = useRef<THREE.Group>(null!);
  const meshRef   = useRef<THREE.InstancedMesh>(null!);
  const dummy     = useMemo(() => new THREE.Object3D(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const { camera, gl } = useThree();

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // ── Deterministic layout — each asteroid at a FIXED position ─────────────────
  // Using seeded pseudo-random so positions never change between renders.
  // Key constraint: y-jitter is tiny (±0.25) to keep belt FLAT and structured.
  const asteroids = useMemo<AsteroidData[]>(() => {
    const rng = (seed: number) => Math.abs(((Math.sin(seed * 9301 + 49297) * 233280) % 1));
    return Array.from({ length: count }, (_, i) => {
      // Spread evenly around the ring with small random perturbation
      const baseAngle = (i / count) * Math.PI * 2;
      const jitter    = (rng(i + 100) - 0.5) * (Math.PI * 2 / count) * 0.8;
      return {
        angle:  baseAngle + jitter,
        radius: BELT_INNER + rng(i + 200) * (BELT_OUTER - BELT_INNER),
        y:      (rng(i + 300) - 0.5) * 0.5,    // ± 0.25 — very flat disc
        scale:  0.025 + rng(i + 400) * 0.055,   // tiny asteroids: 0.025–0.080
        rotX:   rng(i + 500) * Math.PI * 2,
        rotZ:   rng(i + 600) * Math.PI * 2,
      };
    });
  }, [count]);

  // ── Apply all matrices once on mount ─────────────────────────────────────────
  const onMeshMount = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    meshRef.current = mesh;
    asteroids.forEach((a, i) => {
      dummy.position.set(Math.cos(a.angle) * a.radius, a.y, Math.sin(a.angle) * a.radius);
      dummy.scale.setScalar(a.scale);
      dummy.rotation.set(a.rotX, 0, a.rotZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  // ── Animate: whole GROUP rotates (cheap). No individual drift (keeps belt tidy) ──
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.018;

    // Only update hovered asteroid scale — don't move others
    if (meshRef.current && hoveredId !== null) {
      const a = asteroids[hoveredId];
      dummy.position.set(Math.cos(a.angle) * a.radius, a.y, Math.sin(a.angle) * a.radius);
      dummy.scale.setScalar(a.scale * 2.5);   // enlarge hovered asteroid
      dummy.rotation.set(a.rotX, 0, a.rotZ);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(hoveredId, dummy.matrix);
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // ── Hover / click — native canvas events ──────────────────────────────────────
  // Note: We call e.stopImmediatePropagation() on click so the React synthetic
  // Canvas onClick (which clears selectedItem) doesn't fire for asteroid clicks.
  const prevHoveredRef = useRef<number | null>(null);

  useEffect(() => {
    if (zoomedIn) return;
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!meshRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx   = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ny   = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hits = raycaster.intersectObject(meshRef.current);

      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const id = hits[0].instanceId;
        if (id !== prevHoveredRef.current) {
          // Restore previous hovered asteroid to normal size
          if (prevHoveredRef.current !== null && meshRef.current) {
            const pa = asteroids[prevHoveredRef.current];
            dummy.position.set(Math.cos(pa.angle) * pa.radius, pa.y, Math.sin(pa.angle) * pa.radius);
            dummy.scale.setScalar(pa.scale);
            dummy.rotation.set(pa.rotX, 0, pa.rotZ);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(prevHoveredRef.current, dummy.matrix);
            meshRef.current.instanceMatrix.needsUpdate = true;
          }
          prevHoveredRef.current = id;
          setHoveredId(id);
        }
        canvas.style.cursor = "pointer";
      } else {
        if (prevHoveredRef.current !== null && meshRef.current) {
          const pa = asteroids[prevHoveredRef.current];
          dummy.position.set(Math.cos(pa.angle) * pa.radius, pa.y, Math.sin(pa.angle) * pa.radius);
          dummy.scale.setScalar(pa.scale);
          dummy.rotation.set(pa.rotX, 0, pa.rotZ);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(prevHoveredRef.current, dummy.matrix);
          meshRef.current.instanceMatrix.needsUpdate = true;
        }
        prevHoveredRef.current = null;
        setHoveredId(null);
        canvas.style.cursor = "";
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!meshRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx   = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ny   = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hits = raycaster.intersectObject(meshRef.current);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const id = hits[0].instanceId;
        if (processes[id]) {
          // Stop propagation so Canvas onClick doesn't clear the panel
          e.stopImmediatePropagation();
          onSelect(processes[id]);
        }
      }
    };

    canvas.addEventListener("pointermove", onMove);
    // Use capture phase for click so we can stopImmediatePropagation before React
    canvas.addEventListener("click", onClick, true);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("click", onClick, true);
    };
  }, [zoomedIn, processes, camera, gl, raycaster, onSelect, asteroids, dummy]);

  // World position of hovered asteroid for tooltip (in group-local space)
  const hoveredLocalPos = hoveredId !== null ? asteroids[hoveredId] : null;

  return (
    // NO rotation tilt — keep the belt perfectly flat on the ecliptic plane
    <group ref={groupRef}>
      <instancedMesh
        ref={onMeshMount}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#8a9ab0"
          roughness={0.90}
          metalness={0.10}
          emissive="#3a4a5a"
          emissiveIntensity={0.50}
        />
      </instancedMesh>

      {/* Belt dust ring — visible glow in the ecliptic plane */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[(BELT_INNER + BELT_OUTER) / 2, (BELT_OUTER - BELT_INNER) / 2, 2, 256]} />
        <meshBasicMaterial color="#4a5568" transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>

      {/* Hover tooltip */}
      {!zoomedIn && hoveredId !== null && hoveredLocalPos && processes[hoveredId] && (
        <Html
          position={[
            Math.cos(hoveredLocalPos.angle) * hoveredLocalPos.radius,
            hoveredLocalPos.y + 0.5,
            Math.sin(hoveredLocalPos.angle) * hoveredLocalPos.radius,
          ]}
          center
          distanceFactor={20}
        >
          <div style={{
            padding: "3px 9px",
            background: "rgba(8,12,24,0.92)",
            border: "1px solid rgba(100,116,139,0.65)",
            borderRadius: 4,
            fontSize: 9,
            fontFamily: "JetBrains Mono, monospace",
            color: "#94a3b8",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            userSelect: "none",
            boxShadow: "0 0 12px rgba(100,116,139,0.3)",
          }}>
            ⬡ {processes[hoveredId].name.replace(/\.exe$/i, "")}
            <span style={{ color: "#64748b", marginLeft: 6 }}>
              {processes[hoveredId].ram_mb.toFixed(0)} MB
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
