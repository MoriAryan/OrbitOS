# backend.py — SystemVerse Python WebSocket Server
# Streams real OS telemetry via psutil + live traceroute via Windows tracert
# ─────────────────────────────────────────────────────────────────────────────

import asyncio
import json
import re
import time
import random
import subprocess

import psutil
import requests
import websockets
import websockets.exceptions

# ── Config ────────────────────────────────────────────────────────────────────
PORT = 8765

# Human-readable display names for common Windows/Mac/Linux system processes
FRIENDLY_NAMES: dict[str, str] = {
    "chrome.exe":                 "Google Chrome",
    "msedge.exe":                 "Microsoft Edge",
    "firefox.exe":                "Firefox",
    "brave.exe":                  "Brave Browser",
    "opera.exe":                  "Opera",
    "code.exe":                   "VS Code",
    "cursor.exe":                 "Cursor IDE",
    "windsurf.exe":               "Windsurf IDE",
    "node.exe":                   "Node.js",
    "python.exe":                 "Python",
    "python3.exe":                "Python 3",
    "pythonw.exe":                "Python (bg)",
    "discord.exe":                "Discord",
    "slack.exe":                  "Slack",
    "teams.exe":                  "MS Teams",
    "zoom.exe":                   "Zoom",
    "spotify.exe":                "Spotify",
    "steam.exe":                  "Steam",
    "explorer.exe":               "Windows Explorer",
    "searchhost.exe":             "Windows Search",
    "runtimebroker.exe":          "Runtime Broker",
    "svchost.exe":                "System Services",
    "lsass.exe":                  "Security (LSASS)",
    "dwm.exe":                    "Desktop Window Mgr",
    "csrss.exe":                  "System Runtime",
    "wininit.exe":                "Windows Init",
    "winlogon.exe":               "Windows Logon",
    "audiodg.exe":                "Audio Service",
    "textinputhost.exe":          "Touch Keyboard",
    "startmenuexperiencehost.exe":"Start Menu",
    "shellexperiencehost.exe":    "Shell Experience",
    "sihost.exe":                 "Shell Infrastructure",
    "taskhostw.exe":              "Task Host",
    "ctfmon.exe":                 "Language/Input",
    "fontdrvhost.exe":            "Font Driver",
    "spoolsv.exe":                "Print Spooler",
    "mscorsvw.exe":               ".NET Optimizer",
    "msmpeng.exe":                "Windows Defender",
    "antimalware service executable": "Windows Defender",
    "nvcontainer.exe":            "Nvidia Container",
    "nvdisplay.container.exe":    "Nvidia Display",
    "nvidia web helper.exe":      "Nvidia Web Helper",
    "nvosd.exe":                  "Nvidia OSD",
    "amdow.exe":                  "AMD Overlay",
    "atieclxx.exe":               "AMD External Events",
    "onedrive.exe":               "OneDrive",
    "dropbox.exe":                "Dropbox",
    "googledrivefs.exe":          "Google Drive",
    "outlook.exe":                "Outlook",
    "winword.exe":                "Microsoft Word",
    "excel.exe":                  "Microsoft Excel",
    "powerpnt.exe":               "PowerPoint",
    "acrobat.exe":                "Adobe Acrobat",
    "acrord32.exe":               "Adobe Reader",
    "photoshop.exe":              "Photoshop",
    "illustrator.exe":            "Illustrator",
    "figma.exe":                  "Figma",
    "postman.exe":                "Postman",
    "docker desktop.exe":         "Docker Desktop",
    "com.docker.backend.exe":     "Docker Backend",
    "git.exe":                    "Git",
    "conhost.exe":                "Console Host",
    "cmd.exe":                    "Command Prompt",
    "powershell.exe":             "PowerShell",
    "windowsterminal.exe":        "Windows Terminal",
    "nssm.exe":                   "NSSM Service Mgr",
    "msode.exe":                  "MS ODE",
    "nssdc.exe":                  "Nvidia Share",
    "nvsphelper64.exe":           "Nvidia Share Helper",
    "language_server.exe":        "Language Server",
    "antigravity ide.exe":        "Antigravity IDE",
    "mexcompression.exe":         "MEX Compression",
    # Windows built-in
    "memcompression.exe":         "Memory Compression",
    "snippingtool.exe":           "Snipping Tool",
    "snippingtool":               "Snipping Tool",
    "searchfilterhost.exe":       "Search Filter",
    "searchindexer.exe":          "Search Indexer",
    "searchprotocolhost.exe":     "Search Protocol",
    "dllhost.exe":                "DLL Host",
    "smartscreen.exe":            "SmartScreen",
    "securityhealthservice.exe":  "Security Health",
    "securityhealthsystray.exe":  "Security Systray",
    "wuauclt.exe":                "Windows Update",
    "usocoreworker.exe":          "Update Worker",
    "msiexec.exe":                "Installer",
    "sppextcomobj.exe":           "License Manager",
    "vmmem":                      "VM Memory",
    "vmmemwsl":                   "WSL Memory",
    "wslhost.exe":                "WSL Host",
    "wsl.exe":                    "WSL",
    "wsl2.exe":                   "WSL 2",
    "olk.exe":                    "New Outlook",
    "msedgewebview2.exe":         "Edge WebView2",
    "supportassistagent.exe":     "Dell Support Assist",
    "dell.techhub.instrum":       "Dell TechHub",
    "mc-fw-host.exe":             "Malwarebytes",
    "mbamservice.exe":            "Malwarebytes Svc",
    "pyrefly.exe":                "Pyrefly",
    "esrv_svc.exe":               "Intel Energy",
    "igfxem.exe":                 "Intel Graphics",
    "igfxcui.exe":                "Intel GFX UI",
    "perfmon.exe":                "Performance Monitor",
    "taskmgr.exe":                "Task Manager",
    "regedit.exe":                "Registry Editor",
    "mmc.exe":                    "Management Console",
    "eventvwr.exe":               "Event Viewer",
    "commsapps.exe":              "Communication Apps",
    "yourphone.exe":              "Phone Link",
    "phoneexperiencehost.exe":    "Phone Link Host",
    "gamebar.exe":                "Xbox Game Bar",
    "gamebarft.exe":              "Game Bar FT",
    "widgets.exe":                "Windows Widgets",
    "widgetsservice.exe":         "Widgets Service",
    "copilot.exe":                "Copilot",
    "unknown":                    "Unknown Process",
}
def _get_my_location() -> dict:
    try:
        r = requests.get("http://ip-api.com/json/", timeout=3)
        d = r.json()
        if d.get("status") == "success":
            return {
                "lat": d["lat"],
                "lon": d["lon"],
                "city": f"My Machine ({d.get('city', '')}, {d.get('country', '')})"
            }
    except Exception:
        pass
    return {"lat": 28.6139, "lon": 77.2090, "city": "My Machine (Unknown Location)"}

MY_LOCATION = _get_my_location()

# ── Mock fallback data ─────────────────────────────────────────────────────────
MOCK_PROCESS_NAMES = [
    "chrome.exe", "Code.exe", "node.exe", "explorer.exe",
    "discord.exe", "Spotify.exe", "python.exe", "nvcontainer.exe",
    "Teams.exe", "OneDrive.exe",
]

MOCK_TRACE_HOPS = [
    {"lat": 28.6139, "lon": 77.2090, "city": "My Machine (Delhi, India)"},
    {"lat": 28.45,   "lon": 77.03,   "city": "ISP Gateway, Gurugram"},
    {"lat": 1.3521,  "lon": 103.82,  "city": "Equinix SG, Singapore"},
    {"lat": 35.6762, "lon": 139.65,  "city": "Tokyo IX, Japan"},
    {"lat": 37.7749, "lon": -122.42, "city": "San Francisco, USA"},
    {"lat": 37.4192, "lon": -122.06, "city": "Mountain View, Google HQ"},
]

# ── Initialise psutil CPU (first call always returns 0.0 on Windows) ──────────
psutil.cpu_percent(interval=None)

# ─────────────────────────────────────────────────────────────────────────────
# STREAM A — System Metrics
# ─────────────────────────────────────────────────────────────────────────────

def _collect_metrics_sync() -> dict:
    """Blocking call — run inside asyncio.to_thread()"""
    cpu_total = psutil.cpu_percent(interval=0.5)

    procs: list[dict] = []
    for proc in psutil.process_iter(["pid", "name", "memory_info", "cpu_percent"]):
        try:
            info = proc.info
            ram = (info["memory_info"].rss if info["memory_info"] else 0) / (1024 * 1024)
            procs.append({
                "pid":     info["pid"],
                "name":    info["name"] or "unknown",
                "ram_mb":  round(ram, 1),
                "cpu_pct": round(info["cpu_percent"] or 0.0, 1),
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    procs.sort(key=lambda p: p["ram_mb"], reverse=True)
    
    # Group same-name processes (e.g. multiple chrome.exe workers) into a single entry
    grouped: dict[str, dict] = {}
    for p in procs:
        base_name = p["name"].lower()
        # Try exact match first, then prefix match for long names like language_server_windows_x64.exe
        friendly = FRIENDLY_NAMES.get(base_name, None)
        if not friendly:
            for key, val in FRIENDLY_NAMES.items():
                if base_name.startswith(key.replace(".exe", "")):
                    friendly = val
                    break
        # Clean display name: remove .exe suffix and path separators
        raw_clean = p["name"].replace(".exe", "").replace(".EXE", "").replace("_", " ").strip()
        display_name = friendly if friendly else raw_clean
        
        if base_name in grouped:
            grouped[base_name]["ram_mb"]  = round(grouped[base_name]["ram_mb"]  + p["ram_mb"],  1)
            grouped[base_name]["cpu_pct"] = round(grouped[base_name]["cpu_pct"] + p["cpu_pct"], 1)
        else:
            grouped[base_name] = {**p, "name": display_name}
    
    merged = sorted(grouped.values(), key=lambda p: p["ram_mb"], reverse=True)
    top = merged[:10]
    bg  = merged[10:]

    return {
        "type":          "metrics",
        "timestamp":     int(time.time() * 1000),
        "cpu_total":     round(cpu_total, 1),
        "top_processes": top,
        "bg_processes": {
            "count":        len(bg),
            "total_ram_mb": round(sum(p["ram_mb"] for p in bg), 1),
            "processes":    bg,   # Full list so the HUD can expand it
        },
    }


async def get_system_metrics() -> dict:
    try:
        return await asyncio.to_thread(_collect_metrics_sync)
    except Exception as exc:
        print(f"[metrics] Falling back to mock: {exc}")
        return _mock_metrics()


def _mock_metrics() -> dict:
    return {
        "type":      "metrics",
        "timestamp": int(time.time() * 1000),
        "cpu_total": round(20 + random.random() * 40, 1),
        "top_processes": [
            {
                "pid":     1000 + i,
                "name":    name,
                "ram_mb":  round(80 + random.random() * 920, 1),
                "cpu_pct": round(random.random() * 12, 1),
            }
            for i, name in enumerate(MOCK_PROCESS_NAMES)
        ],
        "bg_processes": {
            "count":        180 + random.randint(0, 40),
            "total_ram_mb": round(2000 + random.random() * 1000, 1),
        },
    }


async def metrics_loop(websocket) -> None:
    """Push system metrics every second until connection closes."""
    while True:
        try:
            data = await get_system_metrics()
            await websocket.send(json.dumps(data))
            await asyncio.sleep(0.5)
        except websockets.exceptions.ConnectionClosed:
            break
        except Exception as exc:
            print(f"[metrics loop] Error: {exc}")
            await asyncio.sleep(1)


# ─────────────────────────────────────────────────────────────────────────────
# STREAM B — Traceroute Engine
# ─────────────────────────────────────────────────────────────────────────────

def _is_public_ip(ip: str) -> bool:
    try:
        parts = list(map(int, ip.split(".")))
    except ValueError:
        return False
    if parts[0] == 10:                              return False
    if parts[0] == 172 and 16 <= parts[1] <= 31:   return False
    if parts[0] == 192 and parts[1] == 168:         return False
    if parts[0] in (127, 0):                        return False
    if parts[0] == 169 and parts[1] == 254:         return False
    return True


def _geolocate(ip: str) -> dict | None:
    """Lookup lat/lon for a public IP using ip-api.com (free, no key)."""
    try:
        r = requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,lat,lon,city,country",
            timeout=3,
        )
        d = r.json()
        if d.get("status") == "success":
            return {
                "lat":  d["lat"],
                "lon":  d["lon"],
                "city": f"{d.get('city', '')}, {d.get('country', '')}",
            }
    except Exception as exc:
        print(f"[geoip] {ip} → {exc}")
    return None


async def run_traceroute(target: str, websocket) -> None:
    clean = re.sub(r"^https?://", "", target).split("/")[0]
    print(f"[traceroute] -> {clean}")

    try:
        await websocket.send(json.dumps({"type": "traceroute_start", "url": clean}))

        # Hop 0 = this machine
        await websocket.send(json.dumps({
            "type": "traceroute_hop",
            "hop":  0,
            "ip":   "127.0.0.1",
            **MY_LOCATION,
        }))
    except websockets.exceptions.ConnectionClosed:
        return  # Client gone before trace even started

    hop_index = 1
    real_hops_found = 0

    try:
        proc = await asyncio.create_subprocess_exec(
            "tracert", "-d", "-h", "20", "-w", "600", clean,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )

        async for line_bytes in proc.stdout:
            line = line_bytes.decode("utf-8", errors="replace").strip()
            ips  = re.findall(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)

            for ip in ips:
                if not _is_public_ip(ip):
                    continue
                geo = await asyncio.to_thread(_geolocate, ip)
                try:
                    await websocket.send(json.dumps({
                        "type": "traceroute_hop",
                        "hop":  hop_index,
                        "ip":   ip,
                        "lat":  geo["lat"]  if geo else None,
                        "lon":  geo["lon"]  if geo else None,
                        "city": geo["city"] if geo else "Unknown",
                    }))
                except websockets.exceptions.ConnectionClosed:
                    proc.kill()
                    return  # Client disconnected mid-trace — bail out cleanly
                hop_index += 1
                real_hops_found += 1
                break  # one IP per line

        await proc.wait()

        if real_hops_found == 0:
            raise RuntimeError("No public hops found via tracert")

    except websockets.exceptions.ConnectionClosed:
        return  # Client left during tracert — stop silently
    except Exception as exc:
        print(f"[traceroute] Real trace failed ({exc}) — using mock hops")
        try:
            await _send_mock_trace(clean, websocket, start_hop=hop_index)
        except websockets.exceptions.ConnectionClosed:
            return  # Client left during mock — stop silently

    try:
        await websocket.send(json.dumps({"type": "traceroute_done", "url": clean}))
    except websockets.exceptions.ConnectionClosed:
        pass
    print(f"[traceroute] Done for {clean}")


async def _send_mock_trace(target: str, websocket, start_hop: int = 1) -> None:
    hops = list(MOCK_TRACE_HOPS)
    hops[-1] = {**hops[-1], "city": f"Target: {target}"}
    for i, geo in enumerate(hops):
        if i == 0:
            continue  # hop 0 already sent
        await asyncio.sleep(0.45)
        await websocket.send(json.dumps({
            "type": "traceroute_hop",
            "hop":  start_hop + i - 1,
            "ip":   f"mock.hop.{i}",
            **geo,
        }))


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket Handler
# ─────────────────────────────────────────────────────────────────────────────

_connected: set = set()


async def handler(websocket) -> None:
    _connected.add(websocket)
    addr = getattr(websocket, "remote_address", "unknown")
    print(f"[+] Client connected   {addr}  (total: {len(_connected)})")

    # Push initial metrics immediately so UI isn't blank
    try:
        initial = await get_system_metrics()
        await websocket.send(json.dumps(initial))
    except websockets.exceptions.ConnectionClosed:
        # Client disconnected before we could send anything — clean up and exit
        _connected.discard(websocket)
        print(f"[-] Client disconnected immediately {addr}  (total: {len(_connected)})")
        return

    # Background streaming task
    stream_task = asyncio.create_task(metrics_loop(websocket))

    try:
        async for raw in websocket:
            try:
                msg    = json.loads(raw)
                action = msg.get("action", "")

                if action == "traceroute":
                    url = msg.get("url", "").strip()
                    if url:
                        await run_traceroute(url, websocket)

            except json.JSONDecodeError:
                print("[server] Received invalid JSON — ignoring")
            except websockets.exceptions.ConnectionClosed:
                break  # Stop the loop cleanly
            except Exception as exc:
                print(f"[server] Handler error: {exc}")

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as exc:
        print(f"[server] Unexpected error in handler: {exc}")
    finally:
        stream_task.cancel()
        try:
            await stream_task
        except (asyncio.CancelledError, Exception):
            pass
        _connected.discard(websocket)
        print(f"[-] Client disconnected {addr}  (total: {len(_connected)})")


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

async def main() -> None:
    banner = [
        "",
        "  =========================================",
        "     SystemVerse -- Python Backend",
        "  =========================================",
        f"   WebSocket  ->  ws://localhost:{PORT}",
        "   Press Ctrl+C to stop",
        "  =========================================",
        "",
    ]
    print("\n".join(banner))

    async with websockets.serve(handler, "localhost", PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[server] Stopped.")
