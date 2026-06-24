"use client";

import type { MetricsData, WsStatus } from "@/hooks/useSystemWS";

interface HUDProps {
  metrics: MetricsData | null;
  wsStatus: WsStatus;
}

const STATUS_CONFIG: Record<WsStatus, { color: string; label: string }> = {
  connected:    { color: "#22c55e", label: "LIVE" },
  connecting:   { color: "#eab308", label: "CONNECTING" },
  disconnected: { color: "#ef4444", label: "OFFLINE" },
  error:        { color: "#ef4444", label: "ERROR" },
};

export default function HUD({ metrics, wsStatus }: HUDProps) {
  const status  = STATUS_CONFIG[wsStatus];
  const cpuPct  = metrics?.cpu_total ?? 0;
  const topProc = metrics?.top_processes?.[0];
  const bgCount = metrics?.bg_processes?.count ?? 0;

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
        <div
          style={{
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f97316",
            textShadow: "0 0 10px rgba(249,115,22,0.5)",
            marginBottom: 10,
          }}
        >
          ☀ SYSTEMVERSE
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
        <div style={{ marginBottom: 8 }}>
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

        {/* Top process */}
        {topProc && (
          <div style={{ paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", marginBottom: 2 }}>
              TOP PROCESS
            </div>
            <div style={{ fontSize: 11, color: "#a855f7", fontFamily: "JetBrains Mono, monospace" }}>
              {topProc.name.replace(".exe", "").substring(0, 20)}
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
          minWidth: 200,
          maxWidth: 240,
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

        {metrics?.top_processes?.slice(0, 5).map((p, i) => (
          <div
            key={p.pid}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: ["#a855f7", "#3b82f6", "#22c55e", "#f97316", "#ec4899"][i],
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {p.name.replace(".exe", "").substring(0, 16)}
            </span>
            <span style={{ fontSize: 9, color: "#475569", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
              {p.ram_mb.toFixed(0)}MB
            </span>
          </div>
        ))}

        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 9, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>
          +{bgCount} background processes
        </div>
      </div>

      {/* ── Bottom centre: hint ── */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          color: "#334155",
          letterSpacing: "0.06em",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        drag to rotate · scroll to zoom · click 🌍 to traceroute
      </div>
    </>
  );
}
