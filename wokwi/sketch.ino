#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// --------------------------------------------------------------------------
// Wokwi Virtual WiFi Credentials
// --------------------------------------------------------------------------
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// --------------------------------------------------------------------------
// Target Backend API Endpoint:
// 1. If using ngrok tunnel (recommended for online Wokwi):
//    String serverUrl = "https://your-ngrok-subdomain.ngrok-free.app/api/sensor-data";
// 2. If using local IP (with Wokwi IoT Gateway or local simulator):
//    String serverUrl = "http://192.168.1.XX:3000/api/sensor-data";
// --------------------------------------------------------------------------
String serverUrl = "http://localhost:3000/api/sensor-data";

// Sensor Pin Definitions
const int DHT_PIN = 15;        // DHT22 Temperature & Humidity Sensor
const int LDR_PIN = 34;        // Photoresistor (LDR) Analog Input (0-4095)
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
  Serial.println("  SmartClass - Wokwi ESP32 Classroom Telemetry Node       ");
  Serial.println("  Connected to MongoDB Atlas & Live Real-Time Dashboard   ");
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
  Serial.println("Streaming sensor readings to MongoDB & Dashboard...\n");
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

    // Check if any value changed significantly
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

      // Create JSON Payload
      StaticJsonDocument<256> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["light"] = lightLevel;
      doc["airQuality"] = airQuality;
      doc["classroom"] = "Room 302";

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      // Send HTTP POST to Node.js backend & MongoDB
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✔ [HTTP %d SUCCESS] MongoDB Synced: %s\n", httpResponseCode, response.c_str());
      } else {
        Serial.printf("❌ [HTTP POST ERROR] Code %d (Verify serverUrl tunnel is active)\n", httpResponseCode);
      }

      http.end();
    }
  } else {
    Serial.println("⚠ WiFi Disconnected. Reconnecting...");
    WiFi.reconnect();
  }

  // Poll sensors every 1.5 seconds for snappy real-time response
  delay(1500);
}
