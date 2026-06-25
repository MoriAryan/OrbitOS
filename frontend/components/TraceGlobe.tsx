"use client";

import { Line, Stars, Html, useTexture, CameraControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { TraceHop, TraceStatus } from "@/hooks/useSystemWS";

// ── Constants ─────────────────────────────────────────────────────────────────
const R = 1.6; // Globe radius

// ── Helpers ───────────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segs = 60): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const dist = a.distanceTo(b);
  
  // Height of the arc depends on the distance between the two points
  const arcHeight = dist * 0.35; 

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    // Linear interpolate between the two vectors
    const p = new THREE.Vector3().copy(a).lerp(b, t);
    
    // Project the interpolated point onto the unit sphere to form a perfect Great Circle
    if (p.lengthSq() < 0.0001) {
      // Extremely rare fallback if points are exactly 180 degrees opposite
      p.copy(a).cross(new THREE.Vector3(0, 1, 0));
      if (p.lengthSq() < 0.0001) p.copy(a).cross(new THREE.Vector3(1, 0, 0));
    }
    p.normalize();
    
    // Add a sine wave height to make it an arc rather than dragging on the ground
    const height = Math.sin(t * Math.PI) * arcHeight;
    p.multiplyScalar(R + height);
    points.push(p);
  }
  return points;
}

// ── Latitude grid lines ───────────────────────────────────────────────────────
const LAT_LINES = [-60, -30, 0, 30, 60].map((lat) => ({
  id: `lat${lat}`,
  pts: Array.from({ length: 65 }, (_, i) => latLonToVec3(lat, -180 + i * (360 / 64), R * 1.001)),
}));
const LON_LINES = Array.from({ length: 12 }, (_, i) => ({
  id: `lon${i}`,
  pts: Array.from({ length: 65 }, (_, j) => latLonToVec3(-90 + j * (180 / 64), i * 30, R * 1.001)),
}));

// ── Animated Arc Component ──────────────────────────────────────────────────
interface AnimatedArcProps {
  pts: THREE.Vector3[];
  speed?: number;
  isDrawing?: boolean;
  isActive?: boolean;
  onComplete?: () => void;
  cameraControlsRef?: React.MutableRefObject<any>;
  viewMode?: "orbital" | "cinematic";
  interacting?: boolean;
}

function AnimatedArc({ pts, speed = 0.6, isDrawing, isActive, onComplete, cameraControlsRef, viewMode, interacting }: AnimatedArcProps) {
  const [visiblePoints, setVisiblePoints] = useState<THREE.Vector3[]>(() => pts.slice(0, 2));
  const progressRef = useRef(0);
  const [completed, setCompleted] = useState(false);

  // Do not use useEffect to reset based on pts reference changing.
  // This prevents the camera from repeating the ride if React re-renders the parent.
  
  useFrame((_, delta) => {
    if (!isDrawing) return;

    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * speed);
      const count = Math.floor(pts.length * progressRef.current);
      const newPoints = pts.slice(0, Math.max(2, count));
      setVisiblePoints(newPoints);

      // Packet Rider Camera Update
      if (isActive && viewMode === "cinematic" && cameraControlsRef?.current && !interacting) {
        const tip = newPoints[newPoints.length - 1];
        if (tip) {
          // Pull camera back to prevent texture blurring (1.7x radius)
          const camPos = tip.clone().multiplyScalar(1.7);
          
          cameraControlsRef.current.setLookAt(
            camPos.x, camPos.y, camPos.z,
            tip.x, tip.y, tip.z,
            false // instant lock to the moving packet
          );
        }
      }

      if (progressRef.current >= 1 && !completed) {
        setCompleted(true);
        if (onComplete) onComplete();
      }
    } else if (visiblePoints.length !== pts.length) {
      // Ensure the full array is set if the animation finishes but parent gives new pts reference
      setVisiblePoints(pts);
    }
  });

  return (
    <Line
      points={visiblePoints}
      color="#06b6d4"
      lineWidth={2.5}
      transparent
      opacity={0.9}
    />
  );
}

// ── Pulsing Ring Component (for active hop base) ───────────────────────────
function PulsingRing() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const elapsed = clock.getElapsedTime();
      const scale = 1 + (elapsed % 1.2) * 2.2;
      const opacity = 1 - (elapsed % 1.2) / 1.2;
      meshRef.current.scale.set(scale, scale, 1);
      if (meshRef.current.material) {
        (meshRef.current.material as THREE.Material).opacity = opacity;
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.02, 0.05, 32]} />
      <meshBasicMaterial color="#f97316" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Data Tower Component (Replaces basic pins) ──────────────────────────────
interface HopMarkerProps {
  hop: TraceHop & { bounces?: number };
  isLatest: boolean;
  isFinal: boolean;
}

function DataTower({ hop, isLatest, isFinal }: HopMarkerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const pos = latLonToVec3(hop.lat!, hop.lon!, R);
  const towerHeight = 0.15;
  
  // Choose colors based on status: Green for complete, Orange for active, Cyan for history
  const mainColor = isFinal ? "#22c55e" : isLatest ? "#f97316" : "#06b6d4";

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(0, 0, 0);
    }
  }, [pos]);

  return (
    <group position={pos} ref={groupRef}>
      {/* Hexagonal Base */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.025, 0.01, 6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Central Data Pillar */}
      <mesh position={[0, 0, -towerHeight / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.006, towerHeight, 6]} />
        <meshStandardMaterial 
          color={mainColor} 
          emissive={mainColor} 
          emissiveIntensity={isFinal || isLatest ? 0.8 : 0.4} 
        />
      </mesh>

      {/* Floating Rings */}
      <mesh position={[0, 0, -towerHeight * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.015, 0.0015, 8, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={isFinal || isLatest ? 0.8 : 0.3} />
      </mesh>
      <mesh position={[0, 0, -towerHeight * 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.012, 0.0015, 8, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={isFinal || isLatest ? 0.8 : 0.3} />
      </mesh>

      {/* Glowing Diamond Top */}
      <mesh position={[0, 0, -towerHeight - 0.02]}>
        <octahedronGeometry args={[isFinal || isLatest ? 0.025 : 0.015, 0]} />
        <meshStandardMaterial
          color={mainColor}
          emissive={mainColor}
          emissiveIntensity={isFinal ? 3.0 : isLatest ? 2.5 : 1.2}
          wireframe
        />
      </mesh>
      
      {/* Core diamond */}
      <mesh position={[0, 0, -towerHeight - 0.02]}>
        <octahedronGeometry args={[isFinal || isLatest ? 0.012 : 0.008, 0]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* HTML tooltip label */}
      <Html position={[0, 0, -towerHeight - 0.08]} center zIndexRange={[100, 0]}>
        <div
          style={{
            fontSize: "12px",
            fontFamily: "JetBrains Mono, monospace",
            color: mainColor,
            textShadow: "0 0 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            userSelect: "none",
            transform: "translateY(-15px)",
            fontWeight: 700,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div>
            {hop.hop === 0 ? "Home" : hop.city.split(",")[0]}
            {hop.bounces && hop.bounces > 0 ? ` (+${hop.bounces} internal bounces)` : ""}
          </div>
          {isFinal && (
            <div style={{ fontSize: "9px", color: "#86efac", fontWeight: "normal", marginTop: "2px", opacity: 0.9 }}>
              {hop.lat?.toFixed(4)}°, {hop.lon?.toFixed(4)}°
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ── 3D Globe Scene ────────────────────────────────────────────────────────────
interface GlobeSceneProps {
  hops: TraceHop[];
  interacting: boolean;
  setInter: (v: boolean) => void;
  viewMode: "orbital" | "cinematic";
  traceComplete: boolean;
}

function GlobeScene({ hops, interacting, setInter, viewMode, traceComplete }: GlobeSceneProps) {
  const earthTexture = useTexture("/textures/earth-blue-marble.jpg");
  const cloudsTexture = useTexture("/textures/earth-clouds.png");
  const topologyTexture = useTexture("/textures/earth-topology.png");
  const waterTexture = useTexture("/textures/earth-water.png");

  const cloudsRef = useRef<THREE.Mesh>(null!);
  const globeGroupRef = useRef<THREE.Group>(null!);
  const cameraControlsRef = useRef<any>(null!);
  const [targetQ, setTargetQ] = useState<THREE.Quaternion | null>(null);

  // Track unique physical data centers and internal bounces for sequential paths (Arcs)
  const valid = hops.filter((h) => h.lat !== null && h.lon !== null);
  const uniqueHops: (TraceHop & { bounces: number })[] = [];
  
  for (const hop of valid) {
    const last = uniqueHops[uniqueHops.length - 1];
    if (!last) {
      uniqueHops.push({ ...hop, bounces: 0 });
    } else {
      // Group adjacent hops if they are within ~5km of each other (0.05 degrees)
      const isSameDataCenter = Math.abs(last.lat! - hop.lat!) < 0.05 && Math.abs(last.lon! - hop.lon!) < 0.05;
      if (isSameDataCenter) {
        last.bounces += 1;
        last.city = hop.city; 
      } else {
        uniqueHops.push({ ...hop, bounces: 0 });
      }
    }
  }

  // Deduplicate towers globally so if a trace leaves a city and comes back, we don't draw two towers in the exact same spot!
  const towers: (TraceHop & { bounces: number, isLatest: boolean, isFinal: boolean })[] = [];
  uniqueHops.forEach((hop, idx) => {
    const isLatest = idx === uniqueHops.length - 1 && !traceComplete;
    const isFinal = idx === uniqueHops.length - 1 && traceComplete;
    
    const existing = towers.find(t => Math.abs(t.lat! - hop.lat!) < 0.05 && Math.abs(t.lon! - hop.lon!) < 0.05);
    if (existing) {
      existing.bounces += hop.bounces; // Accumulate all bounces that ever happened here
      existing.isLatest = existing.isLatest || isLatest;
      existing.isFinal = existing.isFinal || isFinal;
      existing.city = hop.city;
    } else {
      towers.push({ ...hop, isLatest, isFinal });
    }
  });

  // Animation queue state
  const [activeArcIndex, setActiveArcIndex] = useState(0);

  // Reset animation queue when tracing starts over
  useEffect(() => {
    if (valid.length <= 1) {
      setActiveArcIndex(0);
    }
  }, [valid.length]);

  const handleArcComplete = useCallback((idx: number) => {
    setActiveArcIndex((prev) => Math.max(prev, idx + 1));
  }, []);

  // Prevent camera from clipping inside the Earth
  useFrame(() => {
    if (cameraControlsRef.current) {
      const cam = cameraControlsRef.current.camera;
      // If the camera ever gets too close to the core (e.g. user panned and zoomed in), push it out
      if (cam.position.length() < R * 1.15) {
        cam.position.normalize().multiplyScalar(R * 1.15);
      }
    }
  });

  // Accurately detect if the user is dragging the camera (so we don't interrupt them)
  useEffect(() => {
    const controls = cameraControlsRef.current;
    if (controls) {
      const onStart = () => setInter(true);
      const onEnd = () => setInter(false);
      controls.addEventListener("controlstart", onStart);
      controls.addEventListener("controlend", onEnd);
      return () => {
        controls.removeEventListener("controlstart", onStart);
        controls.removeEventListener("controlend", onEnd);
      };
    }
  }, []);

  // Configure camera smooth speed based on mode
  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.smoothTime = viewMode === "cinematic" ? 0.6 : 0.25;
    }
  }, [viewMode]);

  // Smooth clouds rotation
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
    }
  });

  // Calculate targets based on viewMode
  useEffect(() => {
    if (uniqueHops.length === 0) {
      setTargetQ(null);
      if (cameraControlsRef.current && viewMode === "orbital") {
        cameraControlsRef.current.setLookAt(0, 0, 5, 0, 0, 0, true);
      }
      return;
    }
    
    const latest = uniqueHops[uniqueHops.length - 1];
    const localPos = latLonToVec3(latest.lat!, latest.lon!, R);
    const norm = localPos.clone().normalize();

    if (viewMode === "orbital") {
      // Rotate globe to face camera
      const q = new THREE.Quaternion().setFromUnitVectors(norm, new THREE.Vector3(0, 0, 1));
      setTargetQ(q);
      
      // Keep camera back
      if (cameraControlsRef.current && !interacting) {
        cameraControlsRef.current.setLookAt(0, 0, 5, 0, 0, 0, true);
      }
    } else if (viewMode === "cinematic") {
      // Stop globe rotation, reset to identity
      setTargetQ(new THREE.Quaternion());

      // If it's the very first hop (Home), fly to it.
      // For all subsequent hops, the AnimatedArc will handle the camera "riding" the packet.
      if (cameraControlsRef.current && !interacting && valid.length === 1) {
        const camPos = norm.clone().multiplyScalar(R * 1.6); // Hover 0.6 units above
        cameraControlsRef.current.setLookAt(
          camPos.x, camPos.y, camPos.z,
          localPos.x, localPos.y, localPos.z,
          true
        );
      }
    }
  }, [uniqueHops.length, viewMode, interacting]);

  // Smooth slerp rotation for orbital mode
  useFrame((_, delta) => {
    if (globeGroupRef.current) {
      if (viewMode === "orbital") {
        if (!interacting && targetQ) {
          globeGroupRef.current.quaternion.slerp(targetQ, delta * 4.2);
        } else if (!interacting) {
          globeGroupRef.current.rotation.y += delta * 0.06;
        }
      } else if (viewMode === "cinematic") {
        // Smoothly untwist the globe back to identity so physical coordinates match
        globeGroupRef.current.quaternion.slerp(new THREE.Quaternion(), delta * 5);
      }
    }
  });

  const arcs = uniqueHops.slice(0, -1).map((h, i) => {
    const nextHop = uniqueHops[i + 1];
    return {
      // Use unique identifiers based on the hop numbers so React doesn't destroy and recreate them
      id: `arc-${h.hop}-${nextHop.hop}`,
      pts: arcPoints(latLonToVec3(h.lat!, h.lon!), latLonToVec3(nextHop.lat!, nextHop.lon!)),
    };
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      {/* Main light — slightly off-center for realistic day/night side */}
      <pointLight position={[6, 4, 6]} intensity={4.5} color="#e8f0ff" />
      {/* Cool fill from opposite side — keeps dark hemisphere visible */}
      <pointLight position={[-5, -3, -5]} intensity={1.8} color="#1a3a6e" />

      {/* Starfield background */}
      <Stars radius={120} depth={40} count={3500} factor={3.5} saturation={0} fade speed={0.4} />

      <group ref={globeGroupRef}>
        {/* Globe body — photorealistic with strong emissive so it always glows */}
        <mesh>
          <sphereGeometry args={[R, 64, 64]} />
          <meshStandardMaterial
            map={earthTexture}
            bumpMap={topologyTexture}
            bumpScale={0.022}
            metalnessMap={waterTexture}
            metalness={0.35}
            roughness={0.65}
            // Strong emissive: keeps oceans deep blue even on the dark side
            emissive={new THREE.Color("#091830")}
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Clouds overlay */}
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[R * 1.015, 64, 64]} />
          <meshStandardMaterial
            map={cloudsTexture}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Atmosphere rim — inner glow: bright cyan blue */}
        <mesh>
          <sphereGeometry args={[R * 1.018, 64, 64]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.28}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Atmosphere rim — mid glow */}
        <mesh>
          <sphereGeometry args={[R * 1.06, 64, 64]} />
          <meshBasicMaterial
            color="#0ea5e9"
            transparent
            opacity={0.14}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Atmosphere rim — outer corona */}
        <mesh>
          <sphereGeometry args={[R * 1.18, 64, 64]} />
          <meshBasicMaterial
            color="#0284c7"
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Lat/lon grid */}
        {LAT_LINES.map((l) => (
          <Line key={l.id} points={l.pts} color="#1e3a5f" lineWidth={0.3} transparent opacity={0.12} />
        ))}
        {LON_LINES.map((l) => (
          <Line key={l.id} points={l.pts} color="#1e3a5f" lineWidth={0.3} transparent opacity={0.12} />
        ))}

        {/* Traceroute arcs */}
        {arcs.map((arc, idx) => (
          <AnimatedArc 
            key={arc.id} 
            pts={arc.pts} 
            isDrawing={idx <= activeArcIndex}
            isActive={idx === activeArcIndex}
            onComplete={() => handleArcComplete(idx)}
            cameraControlsRef={cameraControlsRef}
            viewMode={viewMode}
            interacting={interacting}
          />
        ))}

        {/* Hop markers */}
        {towers.map((tower, idx) => (
          <DataTower
            key={`tower-${idx}`}
            hop={tower}
            isLatest={tower.isLatest}
            isFinal={tower.isFinal}
          />
        ))}
      </group>

      <CameraControls
        ref={cameraControlsRef}
        minDistance={1.8}
        maxDistance={15}
        dollySpeed={0.5}
        makeDefault
      />
    </>
  );
}

// ── Main Overlay ──────────────────────────────────────────────────────────────
interface TraceGlobeProps {
  hops: TraceHop[];
  traceStatus: TraceStatus;
  onTrace: (url: string) => void;
  onClose: () => void;
}

export default function TraceGlobe({ hops, traceStatus, onTrace, onClose }: TraceGlobeProps) {
  const [url, setUrl]             = useState("");
  const [interacting, setInter]   = useState(false);
  const [viewMode, setViewMode]   = useState<"orbital" | "cinematic">("cinematic");
  const validHops                 = hops.filter((h) => h.lat !== null);
  const loading                   = traceStatus === "running";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onTrace(url.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        background: "#020408", // Solid background hides the solar system
      }}
    >
      {/* ── Left: Hop list ── */}
      <div
        style={{
          width: 220,
          padding: "24px 16px",
          borderRight: "1px solid rgba(6,182,212,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
            color: "#475569",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          ROUTE HOPS ({validHops.length})
        </p>

        {hops.map((hop, i) => {
          const isFinalHUD = !loading && i === hops.length - 1;
          const numColor = isFinalHUD ? "#22c55e" : hop.lat ? "#06b6d4" : "#475569";
          const ipColor = isFinalHUD ? "#86efac" : "#64748b";
          const cityColor = isFinalHUD ? "#bbf7d0" : hop.lat ? "#94a3b8" : "#334155";
          const coordColor = isFinalHUD ? "#22c55e" : "#475569";

          return (
            <div
              key={hop.hop}
              className="hop-item"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                padding: "6px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    color: numColor,
                    minWidth: 22,
                  }}
                >
                  {String(hop.hop).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 9, color: ipColor, fontFamily: "JetBrains Mono, monospace" }}>
                  {hop.ip.startsWith("mock") ? "—" : hop.ip}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "Inter, sans-serif",
                  color: cityColor,
                  paddingLeft: 30,
                  fontWeight: isFinalHUD ? 600 : 400,
                }}
              >
                {hop.city !== "Unknown" ? hop.city.split(",")[0] : "•••"}
              </span>
              {hop.lat !== null && (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "JetBrains Mono, monospace",
                    color: coordColor,
                    paddingLeft: 30,
                    marginTop: 1,
                  }}
                >
                  {hop.lat.toFixed(3)}°, {hop.lon!.toFixed(3)}°
                </span>
              )}
            </div>
          );
        })}

        <div style={{ fontSize: 10, color: loading ? "#22c55e" : "#64748b", fontFamily: "JetBrains Mono, monospace", marginTop: 12 }}>
          {loading ? (
            <><span className="live-dot" style={{ animation: "pulse 1s infinite" }}>●</span> Tracing…</>
          ) : hops.length > 0 ? (
            <><span style={{ color: "#38bdf8" }}>✓</span> Trace Complete</>
          ) : null}
        </div>
      </div>

      {/* ── Centre: Globe + controls ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(6,182,212,0.1)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                color: "#06b6d4",
                textShadow: "0 0 20px rgba(6,182,212,0.5)",
                letterSpacing: "0.06em",
              }}
            >
              NETWORK TRACEROUTE
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>
              visualising packet path across the internet
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setViewMode(viewMode === "orbital" ? "cinematic" : "orbital")}
              style={{
                background: "rgba(6,182,212,0.12)",
                border: "1px solid rgba(6,182,212,0.35)",
                borderRadius: 6,
                color: "#06b6d4",
                padding: "6px 14px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Mode: {viewMode === "orbital" ? "🌍 Orbital" : "🚀 Cinematic"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: 6,
                color: "#ef4444",
                padding: "6px 14px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕ Back
            </button>
          </div>
        </div>

        {/* URL Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 24px",
            borderBottom: "1px solid rgba(6,182,212,0.08)",
          }}
        >
          <input
            className="trace-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to trace (e.g. google.com)"
            style={{
              flex: 1,
              padding: "9px 14px",
              fontSize: 13,
              background: "rgba(10,20,40,0.6)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: 8,
              color: "#ffffff",
              outline: "none",
              fontFamily: "JetBrains Mono, monospace",
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              background: loading ? "rgba(6,182,212,0.1)" : "rgba(6,182,212,0.2)",
              border: "1px solid rgba(6,182,212,0.5)",
              borderRadius: 8,
              color: "#06b6d4",
              padding: "9px 20px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Tracing…" : "▶ Trace"}
          </button>
        </form>

        {/* Globe canvas */}
        <div style={{ flex: 1 }}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            <Suspense fallback={null}>
              <GlobeScene 
                hops={hops} 
                interacting={interacting} 
                setInter={setInter}
                viewMode={viewMode} 
                traceComplete={!loading && hops.length > 0} 
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Hint */}
        <div
          style={{
            padding: "8px 24px",
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
            color: "#475569",
            borderTop: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          drag to rotate · scroll to zoom · cyan arcs = packet path · orange marker = active hop
        </div>
      </div>
    </div>
  );
}
