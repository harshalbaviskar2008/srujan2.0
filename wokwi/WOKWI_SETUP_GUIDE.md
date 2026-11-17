# 🌐 Wokwi ESP32 + MongoDB Real-Time Dashboard Guide

This guide explains how to connect your **Wokwi virtual circuit** to **MongoDB Atlas** and the **SmartClass Dashboard**, so that when you change sensor sliders in Wokwi, the values and graph on the dashboard update live in real time.

---

## ⚡ Quick Architecture Overview

```mermaid
flowchart LR
    A["Wokwi ESP32<br>(DHT22 + LDR + Potentiometer)"] -->|"HTTP POST (JSON)<br>/api/sensor-data"| B["Node.js + Express<br>(localhost:3000)"]
    B -->|"Persist Reading"| C[("MongoDB Atlas<br>Collection: sensorreadings")]
    B -->|"WebSocket Push<br>(Socket.IO)"| D["Live SmartClass Dashboard<br>(Cards, Graph, Alerts)"]
```

---

## 🚀 Step 1: Start the Dashboard Server

1. In your project directory (`srujan2.0`), make sure `.env` has your MongoDB Atlas URI:
   ```env
   PORT=3000
   MONGODB_URI="mongodb+srv://harshalbaviskar2008_db_user:6xUht5PWfPupTkbE@error404.4jaxs1x.mongodb.net/smartclass?retryWrites=true&w=majority"
   ```

2. Start the server:
   ```bash
   node server.js
   ```
3. Open your browser to:
   ```
   http://localhost:3000
   ```
   You will see the dashboard with the exact layout from the reference design.

---

## 🔌 Step 2: Open Wokwi Simulator

1. Go to [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)
2. In the **`sketch.ino`** tab, paste the code from [wokwi/sketch.ino](file:///c:/Users/khara/Downloads/srujan2.0/wokwi/sketch.ino).
3. In the **`diagram.json`** tab, paste the JSON from [wokwi/diagram.json](file:///c:/Users/khara/Downloads/srujan2.0/wokwi/diagram.json).
4. In the **`libraries.txt`** tab, add:
   ```
   DHT sensor library for ESPx
   ArduinoJson
   ```

---

## 🌐 Step 3: Connect Wokwi Online to Your Local Server

Because Wokwi runs in the cloud, Wokwi needs a public URL to send HTTP POST requests to your local computer.

### Option A: Using Ngrok (Recommended - 1 Command)
1. In a terminal window, run:
   ```bash
   npx ngrok http 3000
   ```
2. Ngrok will give you a public URL like:
   `https://a1b2c3d4.ngrok-free.app`
3. In your Wokwi **`sketch.ino`**, set:
   ```cpp
   String serverUrl = "https://a1b2c3d4.ngrok-free.app/api/sensor-data";
   ```
4. Click **Start Simulation (Play button)** in Wokwi!

### Option B: Local Network IP (If using Wokwi IoT Gateway or local runner)
1. Find your computer's local IP address (`ipconfig` on Windows, e.g. `192.168.1.15`).
2. Set in `sketch.ino`:
   ```cpp
   String serverUrl = "http://192.168.1.15:3000/api/sensor-data";
   ```

---

## 🎛️ Step 4: Test Live Changes in Wokwi

1. In Wokwi, while the simulation is running:
   - **Click the DHT22 sensor**: Drag the **Temperature** or **Humidity** sliders.
   - **Click the Photoresistor (LDR)**: Drag the **Lux** slider to change the Light Level.
   - **Click the Potentiometer**: Rotate the knob to change the Air Quality (MQ-135 AQI).
2. **Watch the SmartClass Dashboard in your browser**:
   - The 4 top metric cards (`Temp`, `Humidity`, `Light Level`, `Air Quality`) update instantly!
   - The **Sensor Trends line graph** appends the new points and redraws the smooth spline curve!
   - If temperature crosses 32°C or Air Quality crosses 700 AQI, the **Alerts** card triggers a warning notification and increments the sidebar badge!
   - The **Recommendation** banner updates dynamically!
   - The reading is automatically stored in **MongoDB Atlas**!

---

## 📱 Built-in Dashboard Controller (No Tunnel Required!)

For quick testing or presentation without starting ngrok:
1. Click the floating purple button at the bottom-right of the dashboard: **"Wokwi Live Controller"**
2. Move the sliders for **Temperature**, **Humidity**, **Light**, or **Air Quality**.
3. Click **"Push to Dashboard & MongoDB"** or **"Start Auto Fluctuation"**!
4. The dashboard graphs, cards, badges, and MongoDB database update in real time!
