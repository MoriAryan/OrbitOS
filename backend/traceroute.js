// traceroute.js — Traceroute engine with GeoIP lookup
const { exec } = require("child_process");
const axios = require("axios");

// My approximate location (used as first arc origin)
// Adjust if needed — this is just for the globe arc start point
const MY_LOCATION = { lat: 28.6139, lon: 77.2090, city: "My Machine (Delhi)" };

/**
 * Runs tracert on Windows, parses IPs, geolocates each hop
 * Calls onHop(hopData) for each discovered hop
 */
async function runTraceroute(target, onHop) {
  return new Promise((resolve) => {
    // Strip protocol if user types https://
    const cleanTarget = target.replace(/^https?:\/\//i, "").split("/")[0];

    console.log(`[traceroute] Starting tracert to: ${cleanTarget}`);

    // First hop is always our machine
    onHop({
      hop: 0,
      ip: "127.0.0.1",
      lat: MY_LOCATION.lat,
      lon: MY_LOCATION.lon,
      city: MY_LOCATION.city,
    });

    const cmd = `tracert -d -h 15 -w 500 ${cleanTarget}`;
    const child = exec(cmd, { timeout: 30000 });

    let hopIndex = 1;
    let buffer = "";

    child.stdout.on("data", async (data) => {
      buffer += data;
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const ip = extractIP(line);
        if (ip) {
          const hopData = await geolocate(ip, hopIndex++);
          if (hopData) onHop(hopData);
        }
      }
    });

    child.on("close", async () => {
      // Process any remaining buffer
      const ip = extractIP(buffer);
      if (ip) {
        const hopData = await geolocate(ip, hopIndex++);
        if (hopData) onHop(hopData);
      }
      console.log(`[traceroute] Done. ${hopIndex - 1} hops found.`);
      resolve();
    });

    child.on("error", (err) => {
      console.error("[traceroute] exec error:", err.message);
      resolve(); // don't reject — let caller use what we have
    });
  });
}

/**
 * Extract a public IP address from a tracert output line
 * Ignores private IPs and * timeouts
 */
function extractIP(line) {
  // Match IPv4 addresses
  const matches = line.match(/(\d{1,3}\.){3}\d{1,3}/g);
  if (!matches) return null;

  for (const ip of matches) {
    if (isPublicIP(ip)) return ip;
  }
  return null;
}

function isPublicIP(ip) {
  const parts = ip.split(".").map(Number);
  if (parts[0] === 10) return false;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  if (parts[0] === 192 && parts[1] === 168) return false;
  if (parts[0] === 127) return false;
  if (parts[0] === 169 && parts[1] === 254) return false;
  return true;
}

/**
 * Geolocate an IP using ip-api.com (free, no key needed)
 */
async function geolocate(ip, hopIndex) {
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country`, {
      timeout: 3000,
    });

    if (res.data.status === "success") {
      return {
        hop: hopIndex,
        ip,
        lat: res.data.lat,
        lon: res.data.lon,
        city: `${res.data.city}, ${res.data.country}`,
      };
    }
  } catch (err) {
    console.warn(`[geoip] Failed for ${ip}:`, err.message);
  }

  // Return hop without geo data (frontend skips drawing arc)
  return { hop: hopIndex, ip, lat: null, lon: null, city: "Unknown" };
}

/**
 * Mock traceroute — deterministic, always works
 * Returns a realistic path: India → Singapore → US
 */
async function getMockTraceroute(target, onHop) {
  const mockHops = [
    { hop: 0, ip: "192.168.1.1", lat: 28.6139, lon: 77.2090, city: "My Machine (Delhi)" },
    { hop: 1, ip: "103.21.244.1", lat: 28.45, lon: 77.03, city: "Gurugram, India" },
    { hop: 2, ip: "72.14.204.1", lat: 1.3521, lon: 103.8198, city: "Singapore" },
    { hop: 3, ip: "72.14.233.1", lat: 37.5485, lon: 126.9977, city: "Seoul, South Korea" },
    { hop: 4, ip: "108.170.252.1", lat: 37.7749, lon: -122.4194, city: "San Francisco, USA" },
    { hop: 5, ip: "142.250.68.206", lat: 37.4192, lon: -122.0574, city: `${target} (Google)` },
  ];

  for (const hop of mockHops) {
    await delay(400);
    onHop(hop);
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { runTraceroute, getMockTraceroute };
