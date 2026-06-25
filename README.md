# OrbitOS

**A real-time operating system and network visualization engine that transforms live telemetry into an interactive universe.**

> Every day we use computers that perform millions of operations per second.
> 
> Processes compete for CPU time.  
> Applications consume memory.  
> Packets travel across continents before a webpage loads.  
> 
> Yet almost all of this activity remains invisible.  
> 
> OrbitOS was born from a simple question:  
> **What if your computer could show you what it is doing instead of hiding it?**  
> 
> OrbitOS transforms operating system telemetry into a living solar system where running applications become planets orbiting a CPU star, and network routes become journeys across the globe.  
> 
> Instead of reading numbers from a task manager, you experience your machine as a dynamic universe.

---

<div align="center">
  <!-- PRIMARY DEMO CLIP (Main overview) -->
  <video src="https://github.com/user-attachments/assets/4af316a6-8065-4173-afed-e4940a3f81a2" width="800" controls autoplay muted loop playsinline></video>
  
  <br><br>

  <!-- SECONDARY DEMO CLIP (e.g., Traceroute or zooming into a planet) -->
  <video src="https://github.com/user-attachments/assets/52b7debd-ed74-42f2-8aae-d6c07d2bd426" width="800" controls autoplay muted loop playsinline></video>
  
  <br><br>
  
  <!-- HIGH-RES SCREENSHOT -->

  <img src="https://github.com/user-attachments/assets/8707bb0b-1b6a-4442-9144-f6c873946c6b" alt="OrbitOS Snapshot" width="800" />
</div>

---

## 🏗️ How it works

OrbitOS bridges the gap between low-level system metrics and high-performance 3D rendering.

```text
┌─────────────┐
│   Windows   │  (Task Manager, Network Interfaces)
│ Processes   │
└──────┬──────┘
       │
    psutil
       │
┌──────▼──────┐
│ Python WS   │  (Scans OS & ping traces)
│ Backend     │
└──────┬──────┘
       │
 WebSocket       (Streams at 500ms intervals)
       │
┌──────▼──────┐
│ Next.js +   │
│ Three.js    │  (React Three Fiber, GSAP)
└──────┬──────┘
       │
   Solar System
```

---

## ⚙️ Engineering Highlights

- **Real-Time Telemetry Pipeline:** Engineered a robust WebSocket streaming pipeline delivering OS metrics at 500ms intervals with persistent local connections.
- **Dynamic 3D Data Mapping:** Dynamically translates arbitrary, volatile process memory and CPU telemetry into continuous spatial transformations within a GPU-rendered scene.
- **Instanced Rendering Optimization:** Renders 200+ background process objects without significant frame drops by leveraging Three.js `InstancedMesh` for highly efficient GPU batching.
- **Decoupled Architecture:** Separates the Python system metrics collector and ICMP networking stack from the React/WebGL frontend, ensuring non-blocking performance.
- **Custom Networking Visualization:** Implements live ICMP traceroute execution, aggregating hop IP data and resolving it against a geolocation API to plot spherical arc trajectories across a 3D Earth.

---

## 🌍 The Traceroute Engine

The Earth represents your machine's network interface.

While the planetary system visualizes activity *inside* your computer, Earth allows you to explore what happens *after* data leaves your machine. 

By clicking the Earth and entering a URL, OrbitOS performs a real ICMP traceroute and visualizes the physical path your packets take across the internet, bouncing between global ISP towers before reaching their final destination.

---

## 🚀 Features

• **Real OS Telemetry:** The Sun's emissive intensity represents live CPU usage; planet scales dynamically shift based on process RAM consumption.  
• **Persistent Live Streaming:** Streams telemetry at 500ms intervals using persistent WebSockets for a buttery smooth, "live" feeling.  
• **Real Networking Engine:** Executes live traceroutes and maps physical packet trajectories across a 3D globe using actual IP geolocation data.  
• **Background Asteroid Belt:** Visualizes 200+ background processes as a dynamic asteroid belt using optimized GPU instanced rendering.  

---

## 🔒 Privacy & Security (The "Please Don't Sue Me" Section)

If you are wondering: *"Is this random student project stealing my data and sending my processes to the cloud?"*

**No. Not even a single byte.**

OrbitOS is **100% Offline-First**. 
CPU usage, memory data, process information, and telemetry **never leave your machine.** The Python backend reads your system data and streams it over a local WebSocket (`ws://localhost:8765`) directly to your own browser. 

The *only* time OrbitOS connects to the outside world is when you explicitly use the Traceroute globe to ping a website. And even then, it's just standard ICMP pings. Don't trust me? I encourage you to read the code—that's why it's open source!

---

## 🛠️ How to Run This on Your Own PC

I haven't packaged this into a `.exe` yet because I wanted to keep it fully open-source and transparent. You'll need to run the backend and the frontend yourself. It takes about 2 minutes.

### Prerequisites
Before you begin, make sure you have installed:
1. **[Node.js](https://nodejs.org/)** (for the 3D frontend)
2. **[Python 3.8+](https://www.python.org/)** (for the backend that talks to your OS)
3. **[Npcap](https://npcap.com/)** (Required for Python's `scapy` to run traceroutes on Windows without pulling its hair out).

### Step 1: Start the Python Backend

This script acts as the "Task Manager", scanning your PC and sending the data over WebSockets.

```bash
# Open a terminal and clone the repository
git clone https://github.com/MoriAryan/OrbitOS.git
cd OrbitOS/backend

# Install the required Python libraries (psutil, websockets, scapy, requests)
pip install -r requirements.txt

# Run the backend
# IMPORTANT: On Windows, you MUST run this as Administrator 
# if you want the Traceroute feature to work! Otherwise, it will fail silently.
python backend.py
```
*If everything is working, you should see: `WebSocket server running on ws://localhost:8765`.*

### Step 2: Start the Next.js Frontend

Leave the Python terminal running in the background. Open a **new** terminal window.

```bash
# Go to the frontend folder
cd OrbitOS/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Step 3: Launch into Orbit
Open your web browser and go to:
👉 **[http://localhost:3000](http://localhost:3000)**

You should see your actual computer processes floating in space. Click on Earth to start tracing packets!

---

## 👨‍💻 Built With
* **Frontend:** Next.js, React Three Fiber (Three.js), GSAP, TailwindCSS.
* **Backend:** Python (asyncio, websockets, psutil, scapy).
* **Coffee:** Lots of it.

*Feel free to star the repo, fork it, break it, and submit a PR!*

Made with love by Mori Aryan

