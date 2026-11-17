require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const SensorReading = require('./models/SensorReading');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartclass';
const CLASSROOM = process.env.CLASSROOM_NAME || 'Room 302';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// State tracking & In-memory cache (acts as buffer & fallback)
let isMongoConnected = false;
let memoryHistory = [];
let latestReading = null;

// Initialize initial default data matching the provided reference image
function initSeedData() {
  const now = Date.now();
  const times = [
    new Date(now - 45 * 60 * 1000), // 7:00 PM
    new Date(now - 30 * 60 * 1000), // 7:15 PM
    new Date(now - 15 * 60 * 1000), // 7:30 PM
    new Date(now)                   // 7:45 PM
  ];

  const seedPoints = [
    { temperature: 30.2, humidity: 61, light: 72, airQuality: 405, timestamp: times[0] },
    { temperature: 32.1, humidity: 59, light: 74, airQuality: 395, timestamp: times[1] },
    { temperature: 31.0, humidity: 65, light: 80, airQuality: 412, timestamp: times[2] },
    { temperature: 28.0, humidity: 60, light: 82, airQuality: 422, timestamp: times[3] }
  ];

  memoryHistory = seedPoints.map(p => {
    const doc = new SensorReading({ ...p, classroom: CLASSROOM });
    const evalData = doc.getEvaluation();
    return {
      _id: new mongoose.Types.ObjectId().toString(),
      ...p,
      classroom: CLASSROOM,
      ...evalData
    };
  });

  latestReading = memoryHistory[memoryHistory.length - 1];
}

initSeedData();

// MongoDB Connection with robust background retry
async function connectMongoDB() {
  if (isMongoConnected) return;

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    isMongoConnected = true;
    console.log(`\x1b[32m✔ Connected to MongoDB Atlas successfully at: ${MONGODB_URI}\x1b[0m`);

    // Notify all connected clients of MongoDB connection
    io.emit('dbStatus', { isMongoConnected: true });

    // Load recent history from MongoDB if available
    try {
      const dbReadings = await SensorReading.find()
        .sort({ timestamp: -1 })
        .limit(50);

      if (dbReadings && dbReadings.length > 0) {
        memoryHistory = dbReadings.reverse().map(doc => ({
          _id: doc._id.toString(),
          temperature: doc.temperature,
          humidity: doc.humidity,
          light: doc.light,
          airQuality: doc.airQuality,
          classroom: doc.classroom,
          timestamp: doc.timestamp,
          ...doc.getEvaluation()
        }));
        latestReading = memoryHistory[memoryHistory.length - 1];
        console.log(`Loaded ${memoryHistory.length} historical readings from MongoDB.`);
      } else {
        // Seed MongoDB with initial readings
        for (const item of memoryHistory) {
          const newDoc = new SensorReading({
            temperature: item.temperature,
            humidity: item.humidity,
            light: item.light,
            airQuality: item.airQuality,
            classroom: item.classroom,
            timestamp: item.timestamp
          });
          await newDoc.save();
        }
        console.log('Seeded initial reference readings into MongoDB.');
      }
    } catch (e) {
      console.warn('Note on loading DB history:', e.message);
    }
  } catch (err) {
    isMongoConnected = false;
    console.warn(`\x1b[33m⚠ MongoDB Atlas: ${err.message}. Running with in-memory buffer. Dashboard is fully active!\x1b[0m`);
  }
}

connectMongoDB();

// Background retry every 30 seconds
setInterval(() => {
  if (!isMongoConnected) {
    connectMongoDB();
  }
}, 30000);

// Helper to process & broadcast new sensor reading
async function processNewReading(data) {
  const temp = parseFloat(data.temperature ?? data.temp ?? 28.0);
  const hum = parseFloat(data.humidity ?? data.hum ?? 60.0);
  const light = parseFloat(data.light ?? data.lightLevel ?? 82.0);
  const aqi = parseFloat(data.airQuality ?? data.aqi ?? data.air_quality ?? 422);
  const classroom = data.classroom || CLASSROOM;
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

  // Create document for evaluation
  const sensorDoc = new SensorReading({
    temperature: temp,
    humidity: hum,
    light: light,
    airQuality: aqi,
    classroom: classroom,
    timestamp: timestamp
  });

  const evaluation = sensorDoc.getEvaluation();

  const formattedReading = {
    _id: sensorDoc._id ? sensorDoc._id.toString() : Date.now().toString(),
    temperature: temp,
    humidity: hum,
    light: light,
    airQuality: aqi,
    classroom: classroom,
    timestamp: timestamp,
    ...evaluation
  };

  // Save to MongoDB if connected
  if (isMongoConnected) {
    try {
      await sensorDoc.save();
    } catch (dbErr) {
      console.error('Error saving reading to MongoDB:', dbErr.message);
    }
  }

  // Update in-memory buffer (keep last 100 items)
  memoryHistory.push(formattedReading);
  if (memoryHistory.length > 100) {
    memoryHistory.shift();
  }
  latestReading = formattedReading;

  // Broadcast to all connected Socket.IO clients in real time
  io.emit('sensorUpdate', {
    reading: formattedReading,
    latest: formattedReading,
    isMongoConnected: isMongoConnected
  });

  console.log(`[WOKWI SENSOR UPDATE] Temp: ${temp.toFixed(1)}°C | Hum: ${hum.toFixed(0)}% | Light: ${light.toFixed(0)}% | AQI: ${aqi.toFixed(0)} (DB: ${isMongoConnected ? 'MongoDB' : 'Memory Cache'})`);

  return formattedReading;
}

// REST API Endpoints

// 1. Ingestion Endpoint for Wokwi ESP32
app.post(['/api/sensor-data', '/api/wokwi'], async (req, res) => {
  try {
    const reading = await processNewReading(req.body);
    res.status(201).json({
      success: true,
      message: 'Sensor data saved to MongoDB and broadcasted successfully',
      data: reading,
      dbStatus: isMongoConnected ? 'MongoDB Connected' : 'In-Memory Cache'
    });
  } catch (error) {
    console.error('Error handling sensor POST:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 2. Fetch latest reading
app.get('/api/sensor-data/latest', (req, res) => {
  res.json({
    success: true,
    data: latestReading,
    isMongoConnected: isMongoConnected
  });
});

// 3. Fetch historical readings for graphs
app.get('/api/sensor-data/history', async (req, res) => {
  try {
    const range = req.query.range || '1h'; // 1h, 6h, 12h, 24h

    let historyData = [];

    if (isMongoConnected) {
      let hoursAgo = 1;
      if (range === '6h') hoursAgo = 6;
      else if (range === '12h') hoursAgo = 12;
      else if (range === '24h') hoursAgo = 24;

      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      const docs = await SensorReading.find({ timestamp: { $gte: since } })
        .sort({ timestamp: 1 })
        .limit(100);

      if (docs && docs.length > 0) {
        historyData = docs.map(d => ({
          _id: d._id.toString(),
          temperature: d.temperature,
          humidity: d.humidity,
          light: d.light,
          airQuality: d.airQuality,
          classroom: d.classroom,
          timestamp: d.timestamp,
          ...d.getEvaluation()
        }));
      }
    }

    // Fallback to memoryHistory if empty or DB offline
    if (historyData.length === 0) {
      historyData = [...memoryHistory];
    }

    res.json({
      success: true,
      range: range,
      count: historyData.length,
      data: historyData,
      isMongoConnected: isMongoConnected
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: memoryHistory
    });
  }
});

// 4. System status
app.get('/api/status', (req, res) => {
  res.json({
    system: 'SmartClass Classroom Environment Monitoring System',
    status: 'online',
    isMongoConnected: isMongoConnected,
    dbTarget: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
    totalHistoryCount: memoryHistory.length,
    classroom: CLASSROOM,
    latestTimestamp: latestReading ? latestReading.timestamp : new Date()
  });
});

// Socket.IO Real-time Connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial data immediately upon connection
  socket.emit('initData', {
    latest: latestReading,
    history: memoryHistory,
    isMongoConnected: isMongoConnected,
    classroom: CLASSROOM
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SmartClass Environment Monitoring Server Running!`);
  console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
  console.log(`📡 Wokwi POST API: http://localhost:${PORT}/api/sensor-data`);
  console.log(`🗄️  MongoDB: ${isMongoConnected ? 'CONNECTED' : 'STANDBY / IN-MEMORY FALLBACK'}`);
  console.log(`======================================================\n`);
});
