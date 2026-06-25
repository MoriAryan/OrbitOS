"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

const EARTH_ORBIT_RADIUS = 12;
const EARTH_SPEED        = 0.075;
const EARTH_SIZE         = 0.72; // Proper planet size — no more collisions

interface EarthNodeProps {
  onEarthClick: (worldPos: THREE.Vector3) => void;
  zoomedIn?: boolean;
}

export default function EarthNode({ onEarthClick, zoomedIn }: EarthNodeProps) {
  const earthTexture    = useTexture("/textures/earth-blue-marble.jpg");
  const cloudsTexture   = useTexture("/textures/earth-clouds.png");
  const topologyTexture = useTexture("/textures/earth-topology.png");
  const waterTexture    = useTexture("/textures/earth-water.png");

  const groupRef  = useRef<THREE.Group>(null!);
  const meshRef   = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const glowRef   = useRef<THREE.Mesh>(null!);
  const ring1Ref  = useRef<THREE.Mesh>(null!);
  const ring2Ref  = useRef<THREE.Mesh>(null!);
  const pulseRef  = useRef<THREE.Mesh>(null!);
  const angleRef  = useRef(Math.PI * 0.3);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    angleRef.current += EARTH_SPEED * delta;
    const t = Date.now() * 0.001;

    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * EARTH_ORBIT_RADIUS;
      groupRef.current.position.z = Math.sin(angleRef.current) * EARTH_ORBIT_RADIUS;
      groupRef.current.position.y = Math.sin(angleRef.current * 0.4) * 0.6;
    }

    // Earth self-rotation
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.4;

    // Cloud drift
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.05;

    // Atmosphere pulse
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.28 + Math.sin(t * 1.4) * 0.06 + (hovered ? 0.15 : 0);
    }

    // Inner ring spin + brightness pulse
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.4;
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        hovered ? 1.0 : 0.7 + Math.sin(t * 2.2) * 0.2;
    }

    // Outer ring counter-spin
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.2;
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity =
        hovered ? 0.65 : 0.28 + Math.sin(t * 1.5 + 1) * 0.1;
    }

    // Expanding sonar pulse ring
    if (pulseRef.current) {
      const cycle = (t % 2.4) / 2.4;
      const scale = 1 + cycle * 4;
      pulseRef.current.scale.set(scale, scale, 1);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.5;
    }
  });

  const handleClick = () => {
    if (!groupRef.current) return;
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);
    onEarthClick(worldPos);
  };

  return (
    <>
      {/* Earth orbit path — cyan */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[EARTH_ORBIT_RADIUS, 0.02, 8, 180]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.45} />
      </mesh>

      <group ref={groupRef}>
        {/*
          ── KEY FIX: lights are placed at OFFSET positions OUTSIDE the sphere ──
          A point light at (0,0,0) is inside the mesh — it only lights BackSide.
          Placing them at distance ~3 units away means they shine ON the surface.
        */}
        {/* Primary key light — from upper-right, mimics sun */}
        <pointLight position={[4, 2, 4]}   color="#ffffff" intensity={12} distance={14} decay={2} />
        {/* Soft fill — prevents the dark side being pure black */}
        <pointLight position={[-3, -1, -3]} color="#7dd3fc" intensity={4}  distance={10} decay={2} />

        {/* ── Earth body — boosted emissive so it’s clearly visible ── */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerEnter={() => { setHovered(true);  document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        >
          <sphereGeometry args={[EARTH_SIZE, 64, 64]} />
          <meshStandardMaterial
            map={earthTexture}
            bumpMap={topologyTexture}
            bumpScale={0.018}
            roughness={0.82}
            metalness={0.01}
            emissive={new THREE.Color("#0a2040")}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* ── Cloud overlay ── */}
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[EARTH_SIZE * 1.016, 64, 64]} />
          <meshStandardMaterial
            map={cloudsTexture}
            transparent
            opacity={0.38}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* ── Atmosphere inner rim ── */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[EARTH_SIZE * 1.25, 32, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.28}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* ── Wide corona halo ── */}
        <mesh>
          <sphereGeometry args={[EARTH_SIZE * 1.65, 24, 24]} />
          <meshBasicMaterial
            color="#0ea5e9"
            transparent
            opacity={0.07}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* ── Indicator rings (only in solar system view) ── */}
        {!zoomedIn && (
          <>
            {/* Spinning equatorial beacon */}
            <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[EARTH_SIZE * 1.55, hovered ? 0.04 : 0.022, 8, 100]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
            </mesh>

            {/* Counter-spin outer ring */}
            <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[EARTH_SIZE * 1.9, 0.012, 8, 100]} />
              <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
            </mesh>

            {/* Expanding sonar pulse */}
            <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[EARTH_SIZE * 1.55, 0.018, 8, 80]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
            </mesh>
          </>
        )}

        {/* ── Always-visible label ── */}
        {!zoomedIn && !hovered && (
          <Html position={[0, EARTH_SIZE + 0.55, 0]} center distanceFactor={18}>
            <div style={{
              padding: "2px 7px",
              background: "rgba(6,182,212,0.12)",
              border: "1px solid rgba(56,189,248,0.45)",
              borderRadius: "4px",
              fontSize: "9px",
              fontFamily: "JetBrains Mono, monospace",
              color: "rgba(56,189,248,0.8)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              letterSpacing: "0.08em",
            }}>
              🌍 EARTH
            </div>
          </Html>
        )}

        {/* ── Hover label ── */}
        {!zoomedIn && hovered && (
          <Html position={[0, EARTH_SIZE + 0.55, 0]} center distanceFactor={18}>
            <div style={{
              padding: "4px 12px",
              background: "rgba(6,182,212,0.20)",
              border: "1px solid rgba(56,189,248,0.85)",
              borderRadius: "5px",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              color: "#38bdf8",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              textShadow: "0 0 10px #38bdf8",
              boxShadow: "0 0 18px rgba(56,189,248,0.25)",
              letterSpacing: "0.05em",
            }}>
              🌍 NETWORK · click to trace
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
