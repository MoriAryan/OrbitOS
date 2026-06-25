"use client";

import { useState } from "react";
import type { MetricsData, WsStatus } from "@/hooks/useSystemWS";
import type { SelectedItem } from "./SidePanel";
import { PLANET_DEFS } from "./Planet";

interface HUDProps {
  metrics: MetricsData | null;
  wsStatus: WsStatus;
  selectedItem: SelectedItem | null;
  onSelectItem: (item: SelectedItem | null) => void;
  onTraceOpen?: () => void;
}

const STATUS_CONFIG: Record<WsStatus, { color: string; label: string }> = {
  connected:    { color: "#22c55e", label: "LIVE" },
  connecting:   { color: "#eab308", label: "CONNECTING" },
  disconnected: { color: "#ef4444", label: "OFFLINE" },
  error:        { color: "#ef4444", label: "ERROR" },
};

const PLANET_COLORS = [
  "#a855f7","#3b82f6","#22c55e","#f97316","#ec4899",
  "#14b8a6","#eab308","#ef4444","#8b5cf6","#06b6d4",
];

export default function HUD({ metrics, wsStatus, selectedItem, onSelectItem, onTraceOpen }: HUDProps) {
  const status   = STATUS_CONFIG[wsStatus];
  const cpuPct   = metrics?.cpu_total ?? 0;
  const ramPct   = metrics?.ram_total ?? 0;
  const topProc  = metrics?.top_processes?.[0];
  const bgCount  = metrics?.bg_processes?.count ?? 0;
  const bgProcs  = metrics?.bg_processes?.processes ?? [];

  const [bgExpanded, setBgExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      {/* ── Top-left: System status ── */}
      <div
        className="glass"
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          padding: "12px 16px",
          borderRadius: 10,
          minWidth: 220,
          zIndex: 10,
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#f97316", fontSize: "14px" }}>☀</span>
            <span style={{ 
              fontSize: "13px", 
              fontWeight: "bold", 
              letterSpacing: "0.12em", 
              color: "#f97316",
              textShadow: "0 0 10px rgba(249,115,22,0.5)",
              fontFamily: "Inter, sans-serif"
            }}>
              ORBITOS
            </span>
          </div>
          <button 
            onClick={() => setShowInfo(true)}
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer", 
              padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              marginLeft: "auto"
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f8fafc"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            title="About OrbitOS"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>

        {/* WS status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span
            className={wsStatus === "connected" ? "live-dot" : ""}
            style={{ color: status.color, fontSize: 8 }}
          >
            ●
          </span>
          <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>
            BACKEND
          </span>
          <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* CPU bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>
              CPU
            </span>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#f97316" }}>
              {cpuPct.toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${cpuPct}%`,
                background: `linear-gradient(90deg, #f97316, ${cpuPct > 70 ? "#ef4444" : "#fbbf24"})`,
                borderRadius: 2,
                transition: "width 0.8s ease",
                boxShadow: "0 0 8px rgba(249,115,22,0.6)",
              }}
            />
          </div>
        </div>

        {/* RAM bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>
              RAM
            </span>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#38bdf8" }}>
              {ramPct.toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${ramPct}%`,
                background: `linear-gradient(90deg, #38bdf8, ${ramPct > 80 ? "#ef4444" : "#818cf8"})`,
                borderRadius: 2,
                transition: "width 0.8s ease",
                boxShadow: "0 0 8px rgba(56,189,248,0.6)",
              }}
            />
          </div>
        </div>

        {/* Top process */}
        {topProc && (
          <div style={{ paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", marginBottom: 2 }}>
              TOP PROCESS
            </div>
            <div style={{ fontSize: 11, color: "#a855f7", fontFamily: "JetBrains Mono, monospace" }}>
              {topProc.name.substring(0, 20)}
            </div>
            <div style={{ fontSize: 9, color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
              {topProc.ram_mb.toFixed(0)} MB RAM · {topProc.cpu_pct.toFixed(1)}% CPU
            </div>
          </div>
        )}
      </div>

      {/* ── Top-right: Processes panel ── */}
      <div
        className="glass"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          padding: "12px 16px",
          borderRadius: 10,
          minWidth: 210,
          maxWidth: 260,
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
            color: "#475569",
            marginBottom: 8,
            letterSpacing: "0.08em",
          }}
        >
          PLANETS ({metrics?.top_processes?.length ?? 0})
        </div>

        {/* Top 10 planets */}
        {metrics?.top_processes?.map((p, i) => {
          const isSelected = selectedItem?.type === "planet" && selectedItem.proc.pid === p.pid;
          return (
            <div
              key={p.pid}
              onClick={() => onSelectItem({ type: "planet", proc: p, planetName: PLANET_DEFS[i]?.name || "Unknown" })}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5,
                padding: "2px 4px",
                borderRadius: 4,
                gap: 8,
                cursor: "pointer",
                background: isSelected ? "rgba(255,255,255,0.1)" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? "rgba(255,255,255,0.1)" : "transparent")}
            >
            <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: PLANET_COLORS[i % 10],
                boxShadow: `0 0 4px ${PLANET_COLORS[i % 10]}`,
              }} />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: PLANET_COLORS[i % 10],
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {p.name.substring(0, 18)}
              </span>
            </div>
            <span style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
              {p.ram_mb >= 1024 ? `${(p.ram_mb / 1024).toFixed(1)}GB` : `${p.ram_mb.toFixed(0)}MB`}
            </span>
            </div>
          );
        })}

        {/* Expandable background processes */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setBgExpanded(b => !b)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              width: "100%",
            }}
          >
            <span style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>
              {bgExpanded ? "▼" : "▶"}
            </span>
            <span style={{ fontSize: 9, color: bgExpanded ? "#94a3b8" : "#475569", fontFamily: "JetBrains Mono, monospace" }}>
              +{bgCount} background processes
            </span>
          </button>

          {bgExpanded && bgProcs.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {bgProcs.map((p, i) => {
                const isSelected = selectedItem?.type === "asteroid" && selectedItem.proc.pid === p.pid;
                return (
                  <div
                    key={p.pid}
                    onClick={() => onSelectItem({ type: "asteroid", proc: p })}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2px 4px",
                      borderRadius: 4,
                      gap: 6,
                      cursor: "pointer",
                      background: isSelected ? "rgba(255,255,255,0.1)" : "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? "rgba(255,255,255,0.1)" : "transparent")}
                  >
                  <span style={{
                    fontSize: 9,
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#334155",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {p.name.substring(0, 20)}
                  </span>
                  <span style={{ fontSize: 8, color: "#1e293b", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                    {p.ram_mb.toFixed(0)}MB
                  </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom centre: hint & buttons ── */}
      <div
        style={{
          position: "fixed",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          zIndex: 10,
        }}
      >
        {onTraceOpen && (
          <button
            onClick={onTraceOpen}
            className="glass"
            style={{
              padding: "10px 24px",
              borderRadius: "30px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(14, 165, 233, 0.3)",
              background: "rgba(14, 165, 233, 0.08)",
              color: "#38bdf8",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: "0 0 20px rgba(14, 165, 233, 0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(14, 165, 233, 0.15)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(14, 165, 233, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(14, 165, 233, 0.08)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.15)";
            }}
          >
            <span style={{ fontSize: "14px" }}>🌍</span>
            Network Traceroute
          </button>
        )}
        <div
          style={{
            fontSize: "11px",
            fontFamily: "JetBrains Mono, monospace",
            color: "#334155",
            letterSpacing: "0.06em",
            pointerEvents: "none",
          }}
        >
          drag to rotate · scroll to zoom
        </div>
      </div>

      {/* ── Info / Legend Modal ── */}
      {showInfo && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(2, 4, 8, 0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 99999, // High z-index to block DREI HTML labels from rendering on top
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setShowInfo(false)}
        >
          <div 
            className="glass"
            style={{
              width: "420px",
              padding: "32px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(15, 23, 42, 0.6)",
              color: "#e2e8f0",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#f97316", fontSize: "18px" }}>☀</span>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#f8fafc", letterSpacing: "0.15em", margin: 0 }}>ABOUT ORBITOS</h2>
              </div>
              <button 
                onClick={() => setShowInfo(false)} 
                style={{ color: "#64748b", cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "none", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "28px", lineHeight: "1.7" }}>
              OrbitOS is a real-time 3D visualization of your computer's operating system. It translates raw telemetry data into a living, interactive solar system.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontSize: "13px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "20px", filter: "drop-shadow(0 0 8px rgba(249,115,22,0.5))" }}>☀</span>
                <div>
                  <div style={{ fontWeight: "600", color: "#f8fafc", fontSize: "14px" }}>The Sun (Core OS)</div>
                  <div style={{ color: "#64748b", marginTop: "4px", lineHeight: "1.5" }}>Represents the central system running OrbitOS. Click the Sun or Traceroute button to visualize network hops.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "20px", filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))" }}>🪐</span>
                <div>
                  <div style={{ fontWeight: "600", color: "#f8fafc", fontSize: "14px" }}>Planets (Top Processes)</div>
                  <div style={{ color: "#64748b", marginTop: "4px", lineHeight: "1.5" }}>The 10 most RAM-intensive applications currently running on your machine.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "20px" }}>☄️</span>
                <div>
                  <div style={{ fontWeight: "600", color: "#f8fafc", fontSize: "14px" }}>Asteroid Belt</div>
                  <div style={{ color: "#64748b", marginTop: "4px", lineHeight: "1.5" }}>Hundreds of tiny background services and system processes orbiting quietly.</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "32px", padding: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#475569", letterSpacing: "0.15em", marginBottom: "16px" }}>METRICS MAPPING</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }}/> <span style={{ color: "#64748b" }}>Size</span> = RAM Usage</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316" }}/> <span style={{ color: "#64748b" }}>Speed</span> = CPU Usage</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }}/> <span style={{ color: "#64748b" }}>Orbit</span> = Process ID</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
