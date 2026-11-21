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
// Replace with your Project URL and anon key from your Supabase Dashboard:
// --------------------------------------------------------------------------
String supabaseUrl = "https://dokmayffuxynebgvxkrv.supabase.co";
String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva21heWZmdXh5bmViZ3Z4a3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTUzMjMsImV4cCI6MjExMDY3MTMyM30.X6SN189ldttU0VapKtFMW-jLlrhXUw_Ts59xF9qog3U";

// Sensor Pin Definitions
const int DHT_PIN = 15;         // DHT22 Temperature & Humidity Sensor
const int LDR_PIN = 34;         // Photoresistor (LDR) Analog Input (0-4095)
const int AIR_QUALITY_PIN = 35; // Potentiometer Simulating MQ-135 Gas / AQI Sensor

DHTesp dhtSensor;

// Store previous values to detect changes
float lastTemp = -999;
float lastHum = -999;
float lastLight = -999;
int lastAir = -999;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=========================================================");
  Serial.println("  SmartClass - Wokwi ESP32 Direct Supabase Node          ");
  Serial.println("  Cloud Serverless IoT (No Node.js or ngrok needed!)     ");
  Serial.println("=========================================================");

  // Initialize DHT22
  dhtSensor.setup(DHT_PIN, DHTesp::DHT22);

  // Configure Analog Pins
  pinMode(LDR_PIN, INPUT);
  pinMode(AIR_QUALITY_PIN, INPUT);

  // Connect to Virtual WiFi
  Serial.print("Connecting to Wokwi-GUEST WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n✔ WiFi Connected Successfully!");
  Serial.print("ESP32 Local IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Ready to push readings directly to Supabase!\n");

  if (supabaseUrl.indexOf("YOUR_PROJECT_ID") != -1) {
    Serial.println("⚠️ NOTICE: Please update supabaseUrl and supabaseKey with your credentials from supabase.com!");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Read Temperature and Humidity from DHT22
    TempAndHumidity dhtData = dhtSensor.getTempAndHumidity();
    float temperature = dhtData.temperature;
    float humidity = dhtData.humidity;

    if (isnan(temperature) || isnan(humidity)) {
      temperature = 28.0;
      humidity = 60.0;
    }

    // 2. Read Light Level from LDR (ADC 0-4095 mapped to 0-100%)
    int rawLdr = analogRead(LDR_PIN);
    float lightLevel = map(rawLdr, 0, 4095, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);

    // 3. Read Air Quality from Potentiometer / MQ-135 Simulator
    int rawAir = analogRead(AIR_QUALITY_PIN);
    int airQuality = map(rawAir, 0, 4095, 100, 1000);

    // Detect if values moved
    bool hasChanged = (abs(temperature - lastTemp) >= 0.2) ||
                      (abs(humidity - lastHum) >= 1.0) ||
                      (abs(lightLevel - lastLight) >= 1.0) ||
                      (abs(airQuality - lastAir) >= 5);

    if (hasChanged || lastTemp == -999) {
      lastTemp = temperature;
      lastHum = humidity;
      lastLight = lightLevel;
      lastAir = airQuality;

      // Print to Serial Monitor
      Serial.println("---------------------------------------------------------");
      Serial.printf("📡 [SENSOR CHANGE DETECTED]\n");
      Serial.printf("   Temp: %.1f °C | Humidity: %.0f %% | Light: %.0f %% | Air: %d AQI\n",
                    temperature, humidity, lightLevel, airQuality);

      // Create JSON Payload matching Supabase table columns
      StaticJsonDocument<256> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["light"] = lightLevel;
      doc["air_quality"] = airQuality;
      doc["classroom"] = "Room 302";

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      // Only send if user has entered real URL
      if (supabaseUrl.indexOf("YOUR_PROJECT_ID") == -1) {
        WiFiClientSecure client;
        client.setInsecure(); // Skip SSL certificate check for IoT simulation

        // Automatically format endpoint path if only base URL was provided
        String targetUrl = supabaseUrl;
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

        HTTPClient http;
        http.begin(client, targetUrl);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("apikey", supabaseKey);
        http.addHeader("Authorization", "Bearer " + supabaseKey);
        http.addHeader("Prefer", "return=minimal");

        int httpResponseCode = http.POST(jsonPayload);

        if (httpResponseCode == 201 || httpResponseCode == 200 || httpResponseCode == 204) {
          Serial.printf("✔ [SUPABASE SYNC SUCCESS] HTTP Code: %d (Saved to Cloud DB!)\n", httpResponseCode);
        } else {
          String response = http.getString();
          Serial.printf("❌ [SUPABASE POST ERROR] Code %d: %s\n", httpResponseCode, response.c_str());
        }

        http.end();
      } else {
        Serial.println("ℹ Simulation active. To sync to cloud, paste your Supabase URL & Key in sketch.ino line 14!");
      }
    }
  } else {
    Serial.println("⚠ WiFi Disconnected. Reconnecting...");
    WiFi.reconnect();
  }

  // Poll sensors every 1.5 seconds for snappy real-time response
  delay(1500);
}
