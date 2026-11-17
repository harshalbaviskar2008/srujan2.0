# 🏫 SmartClass - Smart Classroom Environment Monitoring System

A complete IoT classroom environment monitoring system connected to **MongoDB Atlas**, an **ESP32 simulation in Wokwi**, and a **Real-Time Interactive Dashboard** that updates live when sensor values change in Wokwi.

---

## 📸 Dashboard Design & Features

- **Exact Reference UI Matching**: Dreamy pastel gradients, liquid wave corners, glassmorphism sidebar, and clean typography matching your reference photo.
- **Real-Time Sensor Synchronization**:
  - **Temp**: Live temperature reading with `Normal` / `Hot` / `Cold` badge and coral liquid wave.
  - **Humidity**: Live relative humidity with `Normal` / `High` / `Low` badge and sky blue liquid wave.
  - **Light Level**: Ambient luminance with `Good` / `Dim` / `Bright` badge and amber liquid wave.
  - **Air Quality**: AQI / CO₂ PPM with `Good` / `Moderate` / `Hazardous` badge and lavender liquid wave.
- **Sensor Trends Spline Graph**:
  - Exact 4-line smooth spline curve matching the reference image.
  - Interactive dataset filtering: Click any of the 4 cards (or legend pills) to isolate that specific sensor curve, or view all 4 curves together.
  - Real-time point ingestion: As values change in Wokwi, new points are plotted dynamically with zero page reloads.
  - Time range toggles: `1h`, `6h`, `12h`, and `24h`.
- **Dynamic Alerts**:
  - Displays the circular mint green badge with checkmark and **"No Alerts - All parameters are within safe range"** when normal.
  - Dynamically triggers warning notifications and increments the sidebar notification counter if values cross threshold limits.
- **Smart Recommendations**:
  - Live AI / heuristic classroom recommendation banner (e.g., advising window ventilation, thermostat adjustment, or lighting tweaks).
- **Secondary Views**:
  - **Live Data**: Full telemetry meter dials and real-time ingestion packet table.
  - **History**: Database query interface with CSV and JSON data export.
  - **Alerts**: Incident logs and configurable safety threshold limits.
  - **Reports**: Classroom compliance assessment and educational comfort index.
  - **Settings**: MongoDB Atlas connection parameters and Wokwi IoT configuration.
- **Built-in Wokwi Live Controller**:
  - Slide-out drawer with sliders for Temperature, Humidity, Light, and Air Quality, plus "Auto Fluctuation" mode to easily test live changes without configuring tunnels.

---

## 🛠️ Project Structure

```
srujan2.0/
├── server.js                      # Express + Mongoose + Socket.IO server
├── package.json                   # Dependencies & npm scripts
├── .env                           # MongoDB Atlas URI & Port configuration
├── models/
│   └── SensorReading.js           # Mongoose schema with automated health evaluation
├── public/
│   ├── index.html                 # Main dashboard markup matching reference photo
│   ├── css/
│   │   └── style.css              # Pastel glows, glassmorphism & responsive layout
│   └── js/
│       ├── app.js                 # Dashboard controller, Socket.IO & event handlers
│       └── chart-handler.js       # Chart.js spline curves & dynamic filtering
├── wokwi/
│   ├── diagram.json               # Wokwi ESP32 + DHT22 + LDR + Potentiometer circuit
│   ├── sketch.ino                 # C++ ESP32 Arduino code for Wokwi simulation
│   ├── libraries.txt              # Required Arduino libraries (DHTesp, ArduinoJson)
│   └── WOKWI_SETUP_GUIDE.md       # Step-by-step Wokwi connection instructions
├── scripts/
│   └── simulate_wokwi.js          # CLI sensor stream simulator
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Start the Server

```bash
# In c:\Users\khara\Downloads\srujan2.0
node server.js
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 2. Connect to MongoDB Atlas

Your MongoDB Atlas URI is pre-configured in `.env`:
```env
PORT=3000
MONGODB_URI="mongodb+srv://harshalbaviskar2008_db_user:6xUht5PWfPupTkbE@error404.4jaxs1x.mongodb.net/smartclass?retryWrites=true&w=majority"
```
> **Tip for MongoDB Atlas**: In your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/) under **Security ➔ Network Access**, ensure your current IP or `0.0.0.0/0` (Allow Access from Anywhere) is whitelisted. If Atlas is temporarily unreachable, the server automatically uses an in-memory buffer so the dashboard and graph always remain functional.

---

### 3. Connect Wokwi ESP32 Simulation

1. Open [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).
2. Copy the files from the `wokwi/` folder:
   - Paste `wokwi/sketch.ino` into the **sketch.ino** tab.
   - Paste `wokwi/diagram.json` into the **diagram.json** tab.
   - Add `DHT sensor library for ESPx` and `ArduinoJson` in the **Library Manager** tab.
3. Expose port 3000 to the internet so Wokwi can send data to your local machine:
   ```bash
   npx ngrok http 3000
   ```
4. Copy your forwarding URL (e.g. `https://your-domain.ngrok-free.app`) and set it in `sketch.ino`:
   ```cpp
   String serverUrl = "https://your-domain.ngrok-free.app/api/sensor-data";
   ```
5. Click **Start Simulation (Play button)** in Wokwi!
6. Click the DHT22, LDR, or Potentiometer in Wokwi to change values:
   - The dashboard values update immediately!
   - The graph appends new points and redraws live!
   - Data is stored in your MongoDB Atlas database!
