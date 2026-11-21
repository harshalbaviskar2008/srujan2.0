# 🏫 SmartClass - Smart Classroom Environment Monitoring System

> **Hackathon Edition**: Built with **Supabase Cloud Database (PostgreSQL + Realtime)** and **Wokwi ESP32 IoT Simulation**.  
> **100% Serverless & Ready to Deploy**: No Node.js server to keep alive, no ngrok tunnel required, zero terminal commands needed!

---

## 📸 Overview & Features

- **Exact Reference UI Matching**: Dreamy pastel gradients, liquid wave corners, glassmorphism sidebar, and clean typography matching the design specification.
- **Serverless Cloud Architecture**:
  - The frontend runs directly in any browser (pure HTML, CSS, JavaScript).
  - Wokwi ESP32 connects directly to Supabase REST API over WiFi.
  - Live updates pushed directly via **Supabase Realtime WebSockets** in sub-second latency!
- **Interactive Spline Sensor Trends Graph**:
  - Exact 4-line smooth spline curve matching the reference design.
  - Interactive dataset filtering: Click any of the 4 cards (or legend pills) to isolate that specific sensor curve, or view all 4 curves together.
  - Dynamic time range toggles: `1h`, `6h`, `12h`, and `24h`.
- **Live Alerts & Recommendations**:
  - Displays **"No Alerts - All parameters are within safe range"** when normal.
  - Dynamically triggers alert cards and updates the notification badge if temperature spikes (>32°C) or air quality degrades (>700 AQI).
  - Dynamic AI/heuristic recommendation banner.
- **Full Functional Sub-Pages**:
  - **Live Data**: Full telemetry meter dials and real-time ingestion packet table.
  - **History**: Query time series records with 1-click **Export CSV** and **Download JSON**.
  - **Alerts**: Incident logs and configurable safety threshold limits.
  - **Reports**: Classroom compliance assessment and educational comfort index.
  - **Settings**: Easy 1-click Supabase connection configuration right from the UI.
- **Built-in Wokwi Live Controller**:
  - Slide-out drawer with sliders for Temperature, Humidity, Light, and Air Quality, plus "Auto Fluctuation" mode to easily test live changes without configuring tunnels.

---

## 🛠️ Project Structure

```
srujan2.0/
├── index.html                     # Main dashboard markup matching reference photo
├── css/
│   └── style.css                  # Pastel glows, glassmorphism & responsive layout
├── js/
│   ├── app.js                     # Dashboard controller & Supabase Realtime listener
│   ├── chart-handler.js           # Chart.js spline curves & dynamic filtering
│   └── supabase-config.js         # Supabase connection credentials
├── supabase_schema.sql            # Ready-to-run Supabase PostgreSQL SQL setup script
├── HACKATHON_SUPABASE_GUIDE.md    # Step-by-step hackathon guide for first-year students
├── wokwi/
│   ├── diagram.json               # Wokwi ESP32 + DHT22 + LDR + Potentiometer circuit
│   ├── sketch.ino                 # C++ ESP32 Arduino code for direct Supabase sync
│   ├── libraries.txt              # Required Arduino libraries (DHTesp, ArduinoJson)
│   └── WOKWI_SETUP_GUIDE.md       # Step-by-step Wokwi connection instructions
└── README.md
```

---

## 🚀 Quick Start Guide (For Judges & Evaluation)

### 1. View the Dashboard
Simply open [index.html](file:///c:/Users/khara/Downloads/srujan2.0/index.html) in your browser (Chrome, Edge, Firefox)!  
*No terminal, no npm install, and no Node.js required!*

### 2. Connect Supabase & Wokwi
Follow the 5-minute setup in [HACKATHON_SUPABASE_GUIDE.md](file:///c:/Users/khara/Downloads/srujan2.0/HACKATHON_SUPABASE_GUIDE.md).
