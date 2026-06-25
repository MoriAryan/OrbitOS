"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { ProcessData } from "@/hooks/useSystemWS";

// ── Real solar system planet definitions (in orbital order, excl. Earth) ──────
// Earth is hardcoded in EarthNode at radius 20.
// Processes are assigned by RAM rank: biggest RAM → biggest planet (Jupiter).
// SIZE_RANK maps from "most RAM" (0) to "least RAM" (7).

export const PLANET_DEFS = [
  // [0] biggest RAM process → Jupiter (largest, most prominent)
  {
    name:     "Jupiter",
    texture:  "/textures/planets/2k_jupiter.jpg",
    orbit:    27,
    color:    "#c4935a",
    hasRings: false,
    baseSize: 0.70,
    maxSize:  1.10,
    speed:    0.038,
    tilt:     0.05,
    roughness: 0.85,
    metalness: 0.02,
  },
  // [1] → Saturn (with rings)
  {
    name:     "Saturn",
    texture:  "/textures/planets/2k_saturn.jpg",
    orbit:    34,
    color:    "#e4d191",
    hasRings: true,
    baseSize: 0.58,
    maxSize:  0.95,
    speed:    0.030,
    tilt:     0.046,
    roughness: 0.80,
    metalness: 0.02,
  },
  // [2] → Neptune
  {
    name:     "Neptune",
    texture:  "/textures/planets/2k_neptune.jpg",
    orbit:    40,
    color:    "#5b7fde",
    hasRings: false,
    baseSize: 0.45,
    maxSize:  0.78,
    speed:    0.022,
    tilt:     0.029,
    roughness: 0.75,
    metalness: 0.02,
  },
  // [3] → Uranus
  {
    name:     "Uranus",
    texture:  "/textures/planets/2k_uranus.jpg",
    orbit:    47,
    color:    "#7de8e8",
    hasRings: false,
    baseSize: 0.42,
    maxSize:  0.75,
    speed:    0.018,
    tilt:     1.48,
    roughness: 0.70,
    metalness: 0.02,
  },
  // [4] → Mars
  {
    name:     "Mars",
    texture:  "/textures/planets/2k_mars.jpg",
    orbit:    17,
    color:    "#c1440e",
    hasRings: false,
    baseSize: 0.28,
    maxSize:  0.52,
    speed:    0.062,
    tilt:     0.44,
    roughness: 0.92,
    metalness: 0.01,
  },
  // [5] → Venus
  {
    name:     "Venus",
    texture:  "/textures/planets/2k_venus_surface.jpg",
    orbit:    9,
    color:    "#e8cda0",
    hasRings: false,
    baseSize: 0.30,
    maxSize:  0.52,
    speed:    0.090,
    tilt:     0.046,
    roughness: 0.85,
    metalness: 0.01,
  },
  // [6] → Mercury
  {
    name:     "Mercury",
    texture:  "/textures/planets/2k_moon.jpg",
    orbit:    7.5,        // Moved further from Sun (was 5 — overlapped Sun body)
    color:    "#a0a0a0",
    hasRings: false,
    baseSize: 0.18,
    maxSize:  0.35,
    speed:    0.16,
    tilt:     0.01,
    roughness: 0.95,
    metalness: 0.01,
  },
  // [7] least RAM → Pluto (tiny, outermost)
  {
    name:     "Pluto",
    texture:  "/textures/planets/2k_moon.jpg",
    orbit:    54,
    color:    "#b8a898",
    hasRings: false,
    baseSize: 0.12,
    maxSize:  0.22,
    speed:    0.012,
    tilt:     0.30,
    roughness: 0.95,
    metalness: 0.00,
  },
];

// Staggered initial angles so planets start spread out
const ORBIT_OFFSETS = [0, 0.78, 1.57, 2.36, 3.14, 3.93, 4.71, 5.50];

interface PlanetProps {
  process: ProcessData;
  /** 0 = biggest RAM process (Jupiter), 7 = smallest (Pluto) */
  sizeRank: number;
  maxRam: number;
  zoomedIn?: boolean;
  onSelect: (proc: ProcessData, planetName: string) => void;
  isSelected?: boolean;
  followTargetRef?: React.MutableRefObject<{ position: THREE.Vector3; radius: number }>;
}

// ── Inner — calls useTexture, must be inside Suspense ────────────────────────
function PlanetBody({ process, sizeRank, maxRam, zoomedIn, onSelect, isSelected, followTargetRef }: PlanetProps) {
  const def     = PLANET_DEFS[sizeRank] ?? PLANET_DEFS[0];
  const texture = useTexture(def.texture);

  const groupRef = useRef<THREE.Group>(null!);
  const meshRef  = useRef<THREE.Mesh>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);
  const angleRef = useRef(ORBIT_OFFSETS[sizeRank] ?? 0);

  // Scale planet size by RAM, clamped between baseSize and maxSize
  const ramFrac  = Math.min(process.ram_mb / Math.max(maxRam, 1), 1);
  const size     = def.baseSize + ramFrac * (def.maxSize - def.baseSize);

  // Scale orbital speed by CPU (higher CPU → faster)
  const cpuFrac  = Math.max(process.cpu_pct / 100, 0.05);
  const speed    = def.speed * (0.6 + cpuFrac * 0.8);

  useFrame((_, delta) => {
    angleRef.current += speed * delta;

    if (groupRef.current) {
      const r = def.orbit;
      groupRef.current.position.x = Math.cos(angleRef.current) * r;
      groupRef.current.position.z = Math.sin(angleRef.current) * r;
      // Slight orbital inclination for realism
      groupRef.current.position.y = Math.sin(angleRef.current * 0.6) * 0.5;
    }

    if (meshRef.current) {
      // Axial tilt + self-rotation
      meshRef.current.rotation.y += delta * 0.25;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.02;
    }

    if (isSelected && followTargetRef && groupRef.current) {
      groupRef.current.getWorldPosition(followTargetRef.current.position);
      followTargetRef.current.radius = size;
    }
  });

  return (
    <>
      {/* Orbit path — clearly visible dotted circle */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[def.orbit, 0.018, 8, 200]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.35} />
      </mesh>

      <group ref={groupRef} rotation={[def.tilt, 0, 0]}>
        {/* Planet body */}
        <mesh
          ref={meshRef}
          onClick={(e) => {
            // Stop both R3F and native propagation so Canvas onClick
            // doesn't clear the side panel immediately after opening it
            e.stopPropagation();
            (e.nativeEvent as Event).stopImmediatePropagation();
            onSelect(process, def.name);
          }}
          onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { document.body.style.cursor = "auto"; }}
        >
          <sphereGeometry args={[size, 56, 56]} />
          <meshStandardMaterial
            map={texture}
            roughness={def.roughness}
            metalness={def.metalness}
            // Strong emissive so planets are ALWAYS clearly visible
            emissive={new THREE.Color(def.color)}
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Subtle atmosphere rim */}
        <mesh>
          <sphereGeometry args={[size * 1.08, 24, 24]} />
          <meshBasicMaterial
            color={def.color}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Saturn ring system — only for Saturn (sizeRank 1) */}
        {def.hasRings && (
          <>
            {/* Inner dense ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[size * 1.7, size * 0.38, 2, 120]} />
              <meshBasicMaterial
                color="#d4c47a"
                transparent
                opacity={0.75}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Outer sparse ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[size * 2.3, size * 0.12, 2, 120]} />
              <meshBasicMaterial
                color="#c8b86a"
                transparent
                opacity={0.45}
                side={THREE.DoubleSide}
              />
            </mesh>
          </>
        )}

        {/* Planet label — hide when selected to prevent massive text overlap */}
        {(!zoomedIn && !isSelected) && (
          <Html position={[0, size + 0.42, 0]} center distanceFactor={18} occlude={false}>
            <div style={{
              background: "rgba(4,6,14,0.88)",
              border: `1px solid ${def.color}77`,
              borderRadius: 4,
              padding: "2px 7px",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
              color: def.color,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              userSelect: "none",
              textShadow: `0 0 8px ${def.color}`,
            }}>
              {process.name.replace(/\.exe$/i, "")}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

export default function Planet(props: PlanetProps) {
  return (
    <Suspense fallback={null}>
      <PlanetBody {...props} />
    </Suspense>
  );
}
