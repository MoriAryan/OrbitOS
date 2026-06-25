"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ProcessData {
  pid: number;
  name: string;
  ram_mb: number;
  cpu_pct: number;
}

export interface MetricsData {
  type: "metrics";
  timestamp: number;
  cpu_total: number;
  ram_total: number;
  top_processes: ProcessData[];
  bg_processes: { count: number; total_ram_mb: number; processes?: ProcessData[] };
}

export interface TraceHop {
  hop: number;
  ip: string;
  lat: number | null;
  lon: number | null;
  city: string;
}

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";
export type TraceStatus = "idle" | "running" | "done";

// ── Constants ─────────────────────────────────────────────────────────────────
const WS_URL = "ws://localhost:8765";
const RECONNECT_DELAY_MS = 3000;

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSystemWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [traceHops, setTraceHops] = useState<TraceHop[]>([]);
  const [traceStatus, setTraceStatus] = useState<TraceStatus>("idle");
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");

  const connect = useCallback(() => {
    // Don't open if already open or component unmounted
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    if (mountedRef.current) setWsStatus("connecting");

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log("[WS] Connected to SystemVerse backend");
      setWsStatus("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string);

        switch (data.type) {
          case "metrics":
            setMetrics(data as MetricsData);
            break;

          case "traceroute_start":
            setTraceHops([]);
            setTraceStatus("running");
            break;

          case "traceroute_hop":
            setTraceHops((prev) => [...prev, data as TraceHop]);
            break;

          case "traceroute_done":
            setTraceStatus("done");
            break;
        }
      } catch {
        console.warn("[WS] Could not parse message");
      }
    };

    ws.onerror = () => {
      if (mountedRef.current) setWsStatus("error");
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!mountedRef.current) return;
      setWsStatus("disconnected");
      // Auto-reconnect after delay
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, []);

  /** Send traceroute request to Python backend */
  const sendTraceroute = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "traceroute", url }));
    } else {
      console.warn("[WS] Cannot send — not connected");
    }
  }, []);

  /** Reset trace state for a new query */
  const resetTrace = useCallback(() => {
    setTraceHops([]);
    setTraceStatus("idle");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { metrics, traceHops, traceStatus, wsStatus, sendTraceroute, resetTrace };
}
