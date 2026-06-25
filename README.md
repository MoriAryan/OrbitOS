# SystemVerse (formerly SolarOS)

**Explore the hidden universe running inside your computer.**

> Every day we use computers that perform millions of operations per second.
> 
> Processes compete for CPU time.  
> Applications consume memory.  
> Packets travel across continents before a webpage loads.  
> 
> Yet almost all of this activity remains invisible.  
> 
> SystemVerse was born from a simple question:  
> **What if your computer could show you what it is doing instead of hiding it?**  
> 
> SystemVerse transforms operating system telemetry into a living solar system where running applications become planets orbiting a CPU star, and network routes become journeys across the globe.  
> 
> Instead of reading numbers from a task manager, you experience your machine as a dynamic universe.

---

<div align="center">
  <!-- TODO: Add a high quality GIF or Video here -->
  <img src="https://via.placeholder.com/800x400/020408/06b6d4?text=Space+reserved+for+a+glorious+60fps+demo+video" alt="SystemVerse Demo" />
  <br>
  <em>(Screenshots and Demo Video coming soon...)</em>
</div>

---

## 🚀 Features

• **Live CPU & Memory Visualization:** The Sun's intensity represents CPU usage, while planet sizes represent RAM usage.  
• **Process-based Planetary System:** Your top running applications (Chrome, VS Code, Discord) are actual planets with accurate textures.  
• **Background Asteroid Belt:** The hundreds of tiny background processes running on your PC are visualized as an interactive asteroid belt.  
• **Interactive Network Node (Earth):** Click on Earth to switch to Traceroute mode.  
• **Real Traceroute Visualization:** Trace packets from your computer to any URL on the internet, drawn as glowing arcs across a 3D Earth.  
• **Real-time Telemetry Streaming:** 500ms update ticks for a buttery smooth, "live" feeling.

---

## 🔒 Privacy & Security (The "Please Don't Sue Me" Section)

If you are wondering: *"Is this random student project stealing my data and sending my processes to the cloud?"*

**No. Not even a single byte.**

SystemVerse is **100% Offline-First**. 
The Python backend reads your system data (using `psutil`) and streams it over a local WebSocket (`ws://localhost:8765`) directly to your own browser. The telemetry data never leaves your machine. 

The *only* time SystemVerse connects to the outside world is when you explicitly use the Traceroute globe to ping a website. And even then, it's just standard ICMP pings. Don't trust me? I encourage you to read the code—that's why it's open source!

---

## 🛠️ How to Run This on Your Own PC

I haven't packaged this into a `.exe` yet because I wanted to keep it fully open-source and transparent. You'll need to run the backend and the frontend yourself. It takes about 2 minutes.

### Prerequisites
Before you begin, make sure you have installed:
1. **[Node.js](https://nodejs.org/)** (for the beautiful 3D frontend)
2. **[Python 3.8+](https://www.python.org/)** (for the backend that actually talks to your OS)
3. **[Npcap](https://npcap.com/)** (Required for Python's `scapy` to run traceroutes on Windows without pulling its hair out).

### Step 1: Start the Python Backend

This script acts as the "Task Manager", scanning your PC and sending the data over WebSockets.

```bash
# Open a terminal and clone the repository
git clone https://github.com/yourusername/SystemVerse.git
cd SystemVerse/backend

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
cd SystemVerse/frontend

# Install dependencies (React, Three.js, gsap, tailwind, etc.)
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
