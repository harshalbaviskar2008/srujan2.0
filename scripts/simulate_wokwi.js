/**
 * SmartClass CLI Wokwi Simulation Script
 * Simulates ESP32 sending sensor data to the server and MongoDB every 3 seconds.
 * Run with: node scripts/simulate_wokwi.js
 */

const http = require('http');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;
const ENDPOINT = '/api/sensor-data';

let temp = 28.0;
let humidity = 60.0;
let light = 82.0;
let aqi = 422;

console.log('====================================================');
console.log('🤖 SmartClass CLI Wokwi ESP32 Sensor Feeder Started');
console.log(`📡 Pushing data to http://${SERVER_HOST}:${SERVER_PORT}${ENDPOINT}`);
console.log('Press Ctrl + C to stop.');
console.log('====================================================\n');

function getRandomFluctuation(val, delta, min, max) {
  const change = (Math.random() * delta * 2) - delta;
  let next = val + change;
  if (next < min) next = min;
  if (next > max) next = max;
  return next;
}

function sendSensorPacket() {
  // Simulate natural classroom fluctuations
  temp = +getRandomFluctuation(temp, 0.4, 20.0, 35.0).toFixed(1);
  humidity = +getRandomFluctuation(humidity, 1.2, 35.0, 80.0).toFixed(0);
  light = +getRandomFluctuation(light, 2.0, 40.0, 95.0).toFixed(0);
  aqi = +getRandomFluctuation(aqi, 8.0, 300, 750).toFixed(0);

  const payload = JSON.stringify({
    temperature: temp,
    humidity: humidity,
    light: light,
    airQuality: aqi,
    classroom: 'Room 302',
    timestamp: new Date().toISOString()
  });

  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Sent -> Temp: ${temp}°C | Humidity: ${humidity}% | Light: ${light}% | AQI: ${aqi} | Status: ${res.statusCode}`);
    });
  });

  req.on('error', (err) => {
    console.error(`[Error] Unable to reach server at :${SERVER_PORT} (${err.message}). Is server running?`);
  });

  req.write(payload);
  req.end();
}

// Initial packet immediately, then every 3.5 seconds
sendSensorPacket();
setInterval(sendSensorPacket, 3500);
