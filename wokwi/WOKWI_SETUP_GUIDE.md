# 🌐 Wokwi ESP32 Direct Supabase Setup Guide

This guide explains how your **Wokwi ESP32 simulation** connects directly to **Supabase Cloud Database** without needing any Node.js server or ngrok tunnel.

---

## ⚡ Direct Cloud Architecture

- **Wokwi Virtual ESP32** connects to `Wokwi-GUEST` WiFi (which has full internet access).
- When sensor values change, the ESP32 sends an **HTTPS POST request** directly to the Supabase REST API:
  `https://<YOUR_PROJECT_ID>.supabase.co/rest/v1/sensor_readings`
- **Supabase** stores the reading in PostgreSQL.
- **Supabase Realtime** broadcasts the new row over WebSockets to your dashboard.
- The **SmartClass Dashboard** redraws the graph and updates the cards live!

---

## 📋 Step-by-Step Setup

### 1. Open Wokwi
Go to [wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).

### 2. Copy Code and Circuit
1. Copy [wokwi/sketch.ino](file:///c:/Users/khara/Downloads/srujan2.0/wokwi/sketch.ino) into the `sketch.ino` tab.
2. Update lines 14 & 15 with your Supabase credentials:
   ```cpp
   String supabaseUrl = "https://your-project-id.supabase.co/rest/v1/sensor_readings";
   String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
   ```
3. Copy [wokwi/diagram.json](file:///c:/Users/khara/Downloads/srujan2.0/wokwi/diagram.json) into the `diagram.json` tab.
4. In the Library Manager tab, add:
   - `DHT sensor library for ESPx`
   - `ArduinoJson`

### 3. Click Play (▶)
The ESP32 will connect to WiFi and begin monitoring the sensors.

### 4. Move the Sliders
- Click on the **DHT22** (temp & humidity), **LDR** (light), or **Potentiometer** (air quality).
- Watch the dashboard at `index.html` update in real time!
