#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// --------------------------------------------------------------------------
// 1. Wokwi Virtual WiFi Credentials (Built into Wokwi - No password needed)
// --------------------------------------------------------------------------
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// --------------------------------------------------------------------------
// 2. Supabase Project Credentials (DIRECT CLOUD - NO NODE.JS - NO NGROK!)
// --------------------------------------------------------------------------
String supabaseUrl = "https://dokmayffuxynebgvxkrv.supabase.co";
String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva21heWZmdXh5bmViZ3Z4a3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTUzMjMsImV4cCI6MjExMDY3MTMyM30.X6SN189ldttU0VapKtFMW-jLlrhXUw_Ts59xF9qog3U";

// Sensor Pin Definitions
const int DHT_PIN = 15;         // DHT22 Temperature & Humidity Sensor
const int LDR_PIN = 34;         // Photoresistor (LDR) Analog Input (0-4095)
const int AIR_QUALITY_PIN = 35; // Potentiometer Simulating MQ-135 Gas / AQI Sensor

DHTesp dhtSensor;
WiFiClientSecure client;
HTTPClient http;

// Target endpoint URL
String targetUrl = "";

// Store previous values to detect changes
float lastTemp = -999;
float lastHum = -999;
float lastLight = -999;
int lastAir = -999;

// Timing controls for high-speed responsiveness
unsigned long lastDhtReadTime = 0;
unsigned long lastSendTime = 0;
float curTemp = 28.0;
float curHum = 60.0;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=========================================================");
  Serial.println("  SmartClass - Wokwi ESP32 High-Speed Supabase Node       ");
  Serial.println("  Low Latency Cloud IoT (< 1-2s Realtime Sync)           ");
  Serial.println("=========================================================");

  // Initialize DHT22
  dhtSensor.setup(DHT_PIN, DHTesp::DHT22);

  // Configure Analog Pins
  pinMode(LDR_PIN, INPUT);
  pinMode(AIR_QUALITY_PIN, INPUT);

  // Configure high-speed client parameters
  client.setInsecure();
  client.setTimeout(2); // 2 second socket timeout (prevents 15s freezes)
  http.setTimeout(2500); // 2.5 second HTTP timeout

  // Prepare Supabase REST target URL
  targetUrl = supabaseUrl;
  if (!targetUrl.endsWith("/rest/v1/sensor_readings")) {
    while (targetUrl.endsWith("/")) {
      targetUrl.remove(targetUrl.length() - 1);
    }
    if (targetUrl.endsWith("/rest/v1")) {
      targetUrl += "/sensor_readings";
    } else {
      targetUrl += "/rest/v1/sensor_readings";
    }
  }

  // Connect to Virtual WiFi
  Serial.print("Connecting to Wokwi-GUEST WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }

  Serial.println("\n✔ WiFi Connected Successfully!");
  Serial.print("ESP32 Local IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Target Endpoint: " + targetUrl);
  Serial.println("Ready to push readings in real-time!\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi Disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(500);
    return;
  }

  unsigned long now = millis();

  // 1. Read DHT22 every 1000ms (DHT22 internal hardware limit)
  if (now - lastDhtReadTime >= 1000 || lastTemp == -999) {
    lastDhtReadTime = now;
    TempAndHumidity dhtData = dhtSensor.getTempAndHumidity();
    if (!isnan(dhtData.temperature) && !isnan(dhtData.humidity)) {
      curTemp = dhtData.temperature;
      curHum = dhtData.humidity;
    }
  }

  // 2. Read Analog sensors every 200ms (instant responsiveness)
  int rawLdr = analogRead(LDR_PIN);
  float lightLevel = map(rawLdr, 0, 4095, 0, 100);
  lightLevel = constrain(lightLevel, 0, 100);

  int rawAir = analogRead(AIR_QUALITY_PIN);
  int airQuality = map(rawAir, 0, 4095, 100, 1000);

  // 3. Detect if any sensor value changed
  bool hasChanged = (abs(curTemp - lastTemp) >= 0.2) ||
                    (abs(curHum - lastHum) >= 1.0) ||
                    (abs(lightLevel - lastLight) >= 1.0) ||
                    (abs(airQuality - lastAir) >= 5);

  // 4. Send when changed with a smooth 800ms debounce
  if ((hasChanged || lastTemp == -999) && (now - lastSendTime >= 800 || lastTemp == -999)) {
    lastSendTime = now;
    lastTemp = curTemp;
    lastHum = curHum;
    lastLight = lightLevel;
    lastAir = airQuality;

    Serial.println("---------------------------------------------------------");
    Serial.printf("📡 [SENSOR CHANGE DETECTED]\n");
    Serial.printf("   Temp: %.1f °C | Humidity: %.0f %% | Light: %.0f %% | Air: %d AQI\n",
                  curTemp, curHum, lightLevel, airQuality);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["temperature"] = curTemp;
    doc["humidity"] = curHum;
    doc["light"] = lightLevel;
    doc["air_quality"] = airQuality;
    doc["classroom"] = "Room 302";

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // Send HTTP POST with Keep-Alive connection
    http.begin(client, targetUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabaseKey);
    http.addHeader("Authorization", "Bearer " + supabaseKey);
    http.addHeader("Prefer", "return=minimal");
    http.addHeader("Connection", "keep-alive");
    http.setReuse(true);

    int httpCode = http.POST(jsonPayload);

    if (httpCode == 201 || httpCode == 200 || httpCode == 204) {
      Serial.printf("✔ [SUPABASE SYNC SUCCESS] HTTP Code: %d (Sent in real-time!)\n", httpCode);
    } else {
      String response = http.getString();
      Serial.printf("❌ [SUPABASE POST ERROR] Code %d: %s\n", httpCode, response.c_str());
    }

    http.end();
  }

  // Fast 200ms loop delay (responsive to slider movements)
  delay(200);
}
