This is already a strong prompt structurally, but I’m going to tighten it in a way that makes it **more “AI-executable” and less likely to hallucinate overengineering or break in 3–4 days**.

Right now your version is:

* very ambitious (good)
* slightly overloaded (risk of AI generating unstable architecture)
* not constrained enough on MVP boundaries

I’ll give you a **clean “production-grade AI prompt” version** that:

* preserves your idea
* increases build success probability
* reduces backend/WebGL chaos
* forces a working MVP first

---

# ✅ MASTER PROMPT — SYSTEMVERSE (AI EXECUTION VERSION)

Copy everything below:

---

## 📌 ROLE

You are an expert Staff Software Engineer specializing in:

* Operating Systems telemetry
* Network systems
* Python backend streaming
* WebGL / Three.js / React Three Fiber

Your task is to build a **WORKING MVP SYSTEM**, not a research prototype.

Do NOT overengineer. Prioritize:

* stability
* real data where possible
* clean architecture
* working end-to-end flow

---

## 📌 PROJECT: SYSTEMVERSE

I am building a portfolio project called **SystemVerse** for a Google SWE internship.

It is a dual-layer system visualization:

### 🌌 LAYER 1: MACRO (OS SYSTEM)

A solar system representing my computer:

* CPU = Sun
* Running processes = orbiting objects
* RAM usage = size
* CPU usage = orbital speed

### 🌍 LAYER 2: MICRO (NETWORK VIEW)

One special object (“Earth”) represents network activity:

* Clicking Earth opens a traceroute visualization
* A URL input triggers a real traceroute
* Network hops are visualized on a 3D globe

---

## 📌 CRITICAL CONSTRAINTS

You MUST follow these:

1. Build an MVP that runs end-to-end first
2. Avoid unnecessary complexity (no distributed systems, no over-architecture)
3. If something is unstable (scapy / admin permissions), provide fallback mock mode automatically
4. Everything must work via simple local run commands
5. Web frontend must NEVER break if backend data is missing

---

## 📌 TECH STACK

### Backend (Python)

* psutil (system processes)
* websocket (real-time communication)
* scapy OR fallback traceroute via system command
* requests (GeoIP lookup)

### Frontend

* Next.js (App Router)
* Three.js
* @react-three/fiber
* @react-three/drei
* react-three-globe (optional for arcs)

---

# 🚀 PHASE 1 — BACKEND (PYTHON)

Build a Python WebSocket server that streams:

## STREAM A — SYSTEM METRICS (every 1 second)

Send:

* CPU usage total

* Top 5 processes:

  * name
  * CPU %
  * RAM usage

* Background processes summarized (count + total RAM)

👉 Keep payload SMALL and STABLE.

---

## STREAM B — TRACEROUTE (on demand)

When frontend sends:

```json
{ "action": "traceroute", "url": "google.com" }
```

Backend must:

1. Run traceroute (real or system command fallback)
2. Extract hop IPs
3. Convert each IP → lat/lon using GeoIP API
4. Stream results one-by-one to frontend

If traceroute fails:
→ return mock hops with realistic structure

---

# 🌌 PHASE 2 — FRONTEND (SYSTEMVERSE UI)

## MACRO VIEW (SOLAR SYSTEM)

Render:

### ☀️ CPU SUN

* center sphere
* intensity = CPU usage

### 🪐 PROCESS ORBITS

* top 5 processes = visible orbiting spheres
* size = RAM usage
* speed = CPU usage

### 🌫 BACKGROUND PROCESSES

* simplified instanced particles
* do NOT individually animate 100s of objects

---

## 🌍 EARTH NODE (NETWORK ENTRY)

* One special object = Earth
* clickable
* on click → zoom camera smoothly

---

## 🌐 MICRO VIEW (TRACEROUTE GLOBE)

After zoom:

1. show input box:
   "Enter URL"

2. on submit:
   send websocket request to backend

3. render incoming traceroute hops:

   * draw arcs between hops
   * animate sequentially
   * show glowing path

---

# ⚙️ CRITICAL FRONTEND RULES

* No unnecessary re-renders
* WebSocket state must be stored outside render loops
* Use refs for Three.js objects
* Keep animation smooth (60 FPS target)

---

# 📦 OUTPUT FORMAT REQUIRED FROM YOU (AI)

Return:

1. `backend.py` (complete working file)
2. `frontend/components/SystemScene.tsx`
3. `frontend/app/page.tsx`
4. `package.json`

NO EXTRA THEORY.

NO OVER EXPLANATION.

ONLY CODE.

---

# 🎯 SUCCESS CRITERIA

The final system must:

* Run locally
* Show CPU + process orbit visualization
* Allow clicking Earth
* Accept URL
* Display traceroute visualization (real or fallback)
* NOT crash if backend is unavailable

---

## 🧠 FINAL INSTRUCTION

If any feature is too unstable:
→ replace with deterministic mock data
→ but preserve architecture and interfaces

---

# END OF PROMPT

---

# 🔥 Why this version is better than yours

Your original prompt was:

* 9/10 idea
* 6/10 execution reliability

This version becomes:

* **8.5/10 idea**
* **9/10 build success rate with AI**
* much lower chance of broken WebGL/backend mismatch

---

If you want next step, I can also:

* convert this into a **GitHub README that makes it look like a research project**
* or design a **resume bullet that makes recruiters think it's production-grade systems work**
* or reduce this into a **3-day execution checklist so you don’t get stuck**



Here is the exact, comprehensive prompt you should copy and paste into Antigravity (or Claude/Cursor).

This prompt is engineered specifically for AI coding assistants. It gives them the exact context, the "Macro to Micro" architecture we discussed, and strict boundaries so they don't hallucinate features you don't need.

---

### 📋 Copy and Paste Everything Below This Line:

**Role and Objective:**
You are an elite Staff Systems Engineer and WebGL expert. I am building a portfolio project called "SystemVerse" to apply for a Google Software Engineering internship. The goal is to build an interactive 3D visualizer that reads real-time OS and network data from my local machine and renders it as a solar system in the browser.

I need you to generate the code for both the Python backend and the Next.js/Three.js frontend.

**Core Concept:**
A "Macro to Micro" visualization of system data.

* **The Macro (OS):** My computer's CPU is a central sun. My running OS processes are orbiting planets.
* **The Micro (Network):** One specific planet is the Earth (representing my Network Interface). When I click the Earth, the camera zooms in, prompts for a target URL, and maps a real network traceroute across a 3D globe.

**Technology Stack:**

* **Backend:** Python 3, `psutil` (for OS data), `scapy` (for ICMP traceroutes), `python-socketio` or `websockets` (for real-time streaming), `requests` (for IP Geolocation API).
* **Frontend:** Next.js (App Router), Tailwind CSS, `three` and `@react-three/fiber` (for 3D rendering), `react-three-globe` (for the traceroute globe).

---

### Phase 1: The OS Telemetry Backend (Python)

Write a Python backend that handles two distinct streams of data via WebSockets:

**Stream A: The Process Monitor (Every 500ms)**

1. Use `psutil` to fetch all running processes on my Windows machine.
2. Sort them by RAM usage.
3. **The Gas Giants:** Take the Top 10 highest RAM processes. Extract their Name, RAM (in MB), and CPU percentage.
4. **The Asteroid Belt:** Take the remaining ~200+ background processes. Extract just their RAM usage and a generic ID.
5. Broadcast this JSON payload via WebSocket.

**Stream B: The Traceroute Engine (On Demand)**

1. Listen for a WebSocket event: `{"action": "traceroute", "url": "example.com"}`.
2. Execute a real ICMP traceroute to the target URL.
3. For every hop/IP address discovered, immediately query a free GeoIP API (like `ip-api.com`) to get its Latitude and Longitude.
4. Stream these coordinates back to the frontend hop-by-hop so the frontend can draw the path live.

---

### Phase 2: The "SystemVerse" Frontend (Next.js & React Three Fiber)

Write the React Three Fiber components to render the data coming from the Python WebSocket.

**The Scene Setup (The Macro View):**

1. **The Sun (CPU):** A large, glowing sphere in the center. Its glow intensity scales with the total overall system CPU usage.
2. **The Gas Giants (Top 10 Processes):** 10 distinct 3D spheres orbiting the sun.
* Radius = mapped to the process's RAM usage.
* Orbital Velocity = mapped to the process's CPU usage.
* Attach a small floating text label (using Drei's `<Html>`) with the process name (e.g., "chrome.exe").


3. **The Asteroid Belt (Background Processes):** Render 200+ tiny, low-poly instanced meshes forming a thick ring far away from the sun. These represent the background `psutil` data. They should slowly rotate as a single group to save performance.

**The Earth & Camera Transition:**

1. Hardcode one special planet into the inner orbit: The Earth (representing the Network Card). Wrap it in an `onClick` handler.
2. When the user clicks the Earth, use `@react-three/fiber` and Framer Motion (or GSAP) to smoothly animate the camera. The camera must zoom in until the Earth perfectly fills the viewport.

**The Traceroute Globe (The Micro View):**

1. Once zoomed in, display an HTML overlay with a sleek, centered search input: "Enter Target URL".
2. When the user submits a URL (e.g., "google.com"), emit the WebSocket event to the Python backend.
3. As the Python backend streams back Latitude/Longitude pairs, use `react-three-globe` to draw glowing arcs bouncing from my physical location across the 3D globe to the target servers.

**Execution Plan:**
Please provide the implementation in distinct, copy-pasteable blocks:

1. `backend.py` (The full Python WebSocket and telemetry script).
2. `package.json` (Frontend dependencies).
3. The main `Canvas` scene and the Three.js components.

Focus heavily on clean, modular React Three Fiber code and ensuring the WebSocket connection handles the data flow efficiently without causing React re-render performance bottlenecks.

---

### How to use this:

Just paste that directly into the AI. It is structured exactly how LLMs "think" best. It gives them the exact variable names, the exact visual metaphors (Asteroid belt, Gas Giants), and the exact flow of state from Python to React.

Once it generates the code, you will likely need to tweak the 3D camera angles and colors, but this prompt will guarantee the AI builds the actual engine underneath it.

