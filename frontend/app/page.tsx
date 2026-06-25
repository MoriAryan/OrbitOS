"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useSystemWS } from "@/hooks/useSystemWS";
import HUD from "@/components/HUD";
import type { SelectedItem } from "@/components/SidePanel";

// Dynamic imports for Three.js components (browser-only)
const SystemScene = dynamic(() => import("@/components/SystemScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020408",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "2px solid rgba(249,115,22,0.3)",
          borderTop: "2px solid #f97316",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <p
        style={{
          fontSize: 12,
          fontFamily: "JetBrains Mono, monospace",
          color: "#475569",
          letterSpacing: "0.1em",
        }}
      >
        INITIALISING ORBITOS…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

const TraceGlobe = dynamic(() => import("@/components/TraceGlobe"), {
  ssr: false,
});

export default function Home() {
  const { metrics, traceHops, traceStatus, wsStatus, sendTraceroute, resetTrace } =
    useSystemWS();

  const [zoomedIn, setZoomedIn] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  const handleEarthZoomed = useCallback(() => {
    setZoomedIn(true);
  }, []);

  const handleCloseGlobe = useCallback(() => {
    setZoomedIn(false);
    resetTrace();
  }, [resetTrace]);

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#020408",
      }}
    >
      {/* 3D Solar System */}
      <SystemScene
        metrics={metrics}
        onEarthZoomed={handleEarthZoomed}
        zoomedIn={zoomedIn}
        selectedItem={selectedItem}
        onSelectItem={setSelectedItem}
      />

      {/* HUD overlays */}
      {!zoomedIn && (
        <HUD 
          metrics={metrics} 
          wsStatus={wsStatus} 
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          onTraceOpen={handleEarthZoomed}
        />
      )}

      {/* Traceroute Globe — fades in after Earth click + zoom */}
      {zoomedIn && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            animation: "fadeIn 0.6s ease forwards",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
          <TraceGlobe
            hops={traceHops}
            traceStatus={traceStatus}
            onTrace={sendTraceroute}
            onClose={handleCloseGlobe}
          />
        </div>
      )}
    </main>
  );
}
