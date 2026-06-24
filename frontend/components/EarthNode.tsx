"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

const EARTH_ORBIT_RADIUS = 20;  // special outer orbit
const EARTH_SPEED        = 0.055;
const EARTH_SIZE         = 0.75;

interface EarthNodeProps {
  onEarthClick: (worldPos: THREE.Vector3) => void;
  zoomedIn?: boolean;
}

export default function EarthNode({ onEarthClick, zoomedIn }: EarthNodeProps) {
  const earthTexture = useTexture("/textures/earth-blue-marble.jpg");
  const groupRef  = useRef<THREE.Group>(null!);
  const meshRef   = useRef<THREE.Mesh>(null!);
  const angleRef  = useRef(Math.PI); // start Earth on the far side
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    angleRef.current += EARTH_SPEED * delta;

    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * EARTH_ORBIT_RADIUS;
      groupRef.current.position.z = Math.sin(angleRef.current) * EARTH_ORBIT_RADIUS;
      groupRef.current.position.y = Math.sin(angleRef.current * 0.4) * 0.6;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4; // self-rotation
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
      {/* Earth orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[EARTH_ORBIT_RADIUS, 0.018, 8, 200]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} />
      </mesh>

      <group ref={groupRef}>
        {/* Earth body */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerEnter={() => { setHovered(true);  document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        >
          <sphereGeometry args={[EARTH_SIZE, 48, 48]} />
          <meshStandardMaterial
            map={earthTexture}
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>

        {/* Atmosphere glow */}
        <mesh>
          <sphereGeometry args={[EARTH_SIZE * 1.18, 32, 32]} />
          <meshStandardMaterial
            color="#06b6d4"
            transparent
            opacity={hovered ? 0.22 : 0.12}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Hover ring */}
        {hovered && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[EARTH_SIZE * 1.6, 0.025, 8, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
          </mesh>
        )}

        {/* Label */}
        {!zoomedIn && (
          <Html
            position={[0, EARTH_SIZE + 0.5, 0]}
            center
            distanceFactor={18}
            occlude={false}
          >
            <div
              style={{
                background: "rgba(6,182,212,0.12)",
                border: "1px solid rgba(6,182,212,0.6)",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
                color: "#06b6d4",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                textShadow: "0 0 8px #06b6d4",
                cursor: "pointer",
              }}
            >
              🌍 NETWORK
            </div>
          </Html>
        )}

        {/* Click hint when hovered */}
        {!zoomedIn && hovered && (
          <Html position={[0, -(EARTH_SIZE + 0.5), 0]} center distanceFactor={18}>
            <div
              style={{
                fontSize: "9px",
                fontFamily: "JetBrains Mono, monospace",
                color: "#94a3b8",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                animation: "pulse 1s infinite",
              }}
            >
              click to trace
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
