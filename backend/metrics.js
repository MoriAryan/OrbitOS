// metrics.js — System telemetry using systeminformation
const si = require("systeminformation");

/**
 * Fetches current system metrics:
 * - Total CPU usage
 * - Top 10 processes by RAM
 * - Background process summary
 */
async function getSystemMetrics() {
  try {
    const [cpuLoad, processes] = await Promise.all([
      si.currentLoad(),
      si.processes(),
    ]);

    const cpuTotal = parseFloat(cpuLoad.currentLoad.toFixed(1));

    // Sort all processes by RAM (memRss = resident set size in KB)
    const sorted = [...processes.list].sort(
      (a, b) => (b.memRss || 0) - (a.memRss || 0)
    );

    // Top 10 = "Gas Giants"
    const topProcesses = sorted.slice(0, 10).map((p) => ({
      pid: p.pid,
      name: p.name,
      ram_mb: parseFloat(((p.memRss || 0) / 1024).toFixed(1)),
      cpu_pct: parseFloat((p.cpu || 0).toFixed(1)),
    }));

    // Remaining = "Asteroid Belt"
    const background = sorted.slice(10);
    const bgSummary = {
      count: background.length,
      total_ram_mb: parseFloat(
        (background.reduce((sum, p) => sum + (p.memRss || 0), 0) / 1024).toFixed(1)
      ),
    };

    return {
      type: "metrics",
      timestamp: Date.now(),
      cpu_total: cpuTotal,
      top_processes: topProcesses,
      bg_processes: bgSummary,
    };
  } catch (err) {
    console.error("[metrics] Error fetching system data:", err.message);
    return getMockMetrics();
  }
}

/**
 * Fallback mock metrics — realistic structure, always safe
 */
function getMockMetrics() {
  const mockProcesses = [
    "chrome.exe", "code.exe", "node.exe", "explorer.exe",
    "discord.exe", "spotify.exe", "slack.exe", "Teams.exe",
    "python.exe", "nvcontainer.exe",
  ];

  return {
    type: "metrics",
    timestamp: Date.now(),
    cpu_total: parseFloat((20 + Math.random() * 40).toFixed(1)),
    top_processes: mockProcesses.map((name, i) => ({
      pid: 1000 + i,
      name,
      ram_mb: parseFloat((100 + Math.random() * 900).toFixed(1)),
      cpu_pct: parseFloat((Math.random() * 15).toFixed(1)),
    })),
    bg_processes: {
      count: 180 + Math.floor(Math.random() * 40),
      total_ram_mb: parseFloat((2000 + Math.random() * 1000).toFixed(1)),
    },
  };
}

module.exports = { getSystemMetrics, getMockMetrics };
