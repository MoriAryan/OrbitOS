"use client";

import { useEffect, useRef, useState } from "react";
import type { ProcessData } from "@/hooks/useSystemWS";

export type SelectedItem =
  | { type: "planet"; proc: ProcessData; planetName: string }
  | { type: "asteroid"; proc: ProcessData };

interface SidePanelProps {
  item: SelectedItem | null;
  /** Latest metrics so panel shows fresh CPU/RAM on each tick */
  allProcesses: ProcessData[];
  onClose: () => void;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`,
        background: color,
        borderRadius: 2,
        transition: "width 0.4s ease",
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  );
}

export default function SidePanel({ item, allProcesses, onClose }: SidePanelProps) {
  const [visible, setVisible] = useState(false);
  const prevPid = useRef<number | null>(null);

  // Animate in/out
  useEffect(() => {
    if (item) { setVisible(true); }
    else      { const t = setTimeout(() => setVisible(false), 300); return () => clearTimeout(t); }
  }, [item]);

  if (!item && !visible) return null;

  // Live process data — look up current RAM/CPU from latest metrics
  const live = allProcesses.find(p => p.pid === item?.proc.pid) ?? item?.proc;
  const maxRam = Math.max(...allProcesses.map(p => p.ram_mb), 1);

  const isOpen = !!item;
  const isPlanet = item?.type === "planet";
  const accentColor = isPlanet ? "#f97316" : "#6b7280";
  const title = isPlanet ? (item as { planetName: string }).planetName : "Asteroid";

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      height: "100vh",
      width: 280,
      zIndex: 30,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
      display: "flex",
      flexDirection: "column",
      background: "rgba(4,8,16,0.94)",
      borderLeft: `1px solid ${accentColor}28`,
      backdropFilter: "blur(12px)",
      boxShadow: `-16px 0 48px rgba(0,0,0,0.5)`,
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: `1px solid ${accentColor}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
            color: accentColor,
            letterSpacing: "0.12em",
            textShadow: `0 0 10px ${accentColor}88`,
          }}>
            {isPlanet ? "🪐 PLANET" : "⬡ ASTEROID"}
          </div>
          <div style={{
            fontSize: 16,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            color: "#f8fafc",
            marginTop: 3,
          }}>
            {title}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          color: "#94a3b8",
          width: 30,
          height: 30,
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>✕</button>
      </div>

      {/* Process info */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {live && (
          <>
            {/* Process name */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", marginBottom: 4, letterSpacing: "0.1em" }}>
                PROCESS
              </div>
              <div style={{ fontSize: 14, color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                {live.name}
              </div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                PID: {live.pid}
              </div>
            </div>

            {/* RAM */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>RAM USAGE</span>
                <span style={{ fontSize: 10, color: "#7dd3fc", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                  {live.ram_mb >= 1024
                    ? `${(live.ram_mb / 1024).toFixed(2)} GB`
                    : `${live.ram_mb.toFixed(1)} MB`}
                </span>
              </div>
              <Bar value={live.ram_mb} max={maxRam} color="#0ea5e9" />
            </div>

            {/* CPU */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>CPU USAGE</span>
                <span style={{ fontSize: 10, color: "#f97316", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                  {live.cpu_pct.toFixed(1)}%
                </span>
              </div>
              <Bar value={live.cpu_pct} max={100} color="#f97316" />
            </div>

            {/* Separator */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }} />

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "ORBIT SPEED", value: `${live.cpu_pct.toFixed(1)}%`, icon: "⚡" },
                { label: "PLANET SIZE", value: live.ram_mb >= 1024 ? `${(live.ram_mb / 1024).toFixed(1)}G` : `${live.ram_mb.toFixed(0)}M`, icon: "⬤" },
                { label: "RANK", value: `#${allProcesses.findIndex(p => p.pid === live.pid) + 1}`, icon: "📊" },
                { label: "TYPE", value: isPlanet ? title.toUpperCase() : "BELT", icon: "🌐" },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}>
                  <div style={{ fontSize: 8, color: "#334155", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: 3 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                    {stat.icon} {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Live badge */}
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
                display: "inline-block",
                animation: "pulse 1s infinite",
              }} />
              <span style={{ fontSize: 9, color: "#22c55e", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
                LIVE · updates every 500ms
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 18px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        fontSize: 9,
        color: "#1e293b",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        click elsewhere to close
      </div>
    </div>
  );
}
