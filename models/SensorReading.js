const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true,
    min: -20,
    max: 80
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  light: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  airQuality: {
    type: Number,
    required: true,
    min: 0,
    max: 2000
  },
  classroom: {
    type: String,
    default: 'Room 302'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Helper method to compute status ratings
sensorReadingSchema.methods.getEvaluation = function() {
  const temp = this.temperature;
  const hum = this.humidity;
  const light = this.light;
  const aqi = this.airQuality;

  let tempStatus = 'Normal';
  let tempClass = 'status-normal';
  if (temp > 32) {
    tempStatus = 'Hot';
    tempClass = 'status-danger';
  } else if (temp > 28.5) {
    tempStatus = 'Warm';
    tempClass = 'status-warning';
  } else if (temp < 18) {
    tempStatus = 'Cold';
    tempClass = 'status-warning';
  }

  let humidityStatus = 'Normal';
  let humidityClass = 'status-normal';
  if (hum > 70) {
    humidityStatus = 'High';
    humidityClass = 'status-warning';
  } else if (hum < 30) {
    humidityStatus = 'Low';
    humidityClass = 'status-warning';
  }

  let lightStatus = 'Good';
  let lightClass = 'status-good';
  if (light < 30) {
    lightStatus = 'Dim';
    lightClass = 'status-warning';
  } else if (light > 90) {
    lightStatus = 'Bright';
    lightClass = 'status-good';
  }

  let aqiStatus = 'Good';
  let aqiClass = 'status-good';
  if (aqi > 800) {
    aqiStatus = 'Hazardous';
    aqiClass = 'status-danger';
  } else if (aqi > 500) {
    aqiStatus = 'Moderate';
    aqiClass = 'status-warning';
  }

  // Calculate fill percentages for UI bars
  // Temperature bar: mapped relative to standard classroom comfort range (0°C - 50°C)
  const tempPercent = Math.min(Math.max(Math.round((temp / 50) * 100), 5), 100);
  // Humidity bar: direct percentage (0% - 100%)
  const humPercent = Math.min(Math.max(Math.round(hum), 0), 100);
  // Light bar: direct percentage (0% - 100%)
  const lightPercent = Math.min(Math.max(Math.round(light), 0), 100);
  // Air quality bar: mapped relative to 0 - 1000 scale
  const aqiPercent = Math.min(Math.max(Math.round((aqi / 1000) * 100), 5), 100);

  // Dynamic recommendation
  let recommendation = 'Keep monitoring for any sudden changes in temperature or humidity.';
  if (aqi > 600) {
    recommendation = '⚠️ Elevated CO2/Air Quality detected. Recommend opening classroom windows for fresh air circulation.';
  } else if (temp > 30) {
    recommendation = '🌡️ Classroom temperature is rising above 30°C. Consider turning on air conditioning or fans.';
  } else if (temp < 19) {
    recommendation = '❄️ Room temperature is below comfortable threshold. Adjust heating or close drafty windows.';
  } else if (hum > 70) {
    recommendation = '💧 High humidity detected. Ventilation or dehumidifier recommended to keep students focused.';
  } else if (light < 40) {
    recommendation = '💡 Classroom lighting is dim. Turn on overhead study lights to reduce student eye strain.';
  } else {
    recommendation = 'Keep monitoring for any sudden changes in temperature or humidity.';
  }

  // Active alerts
  const alerts = [];
  if (temp > 32) alerts.push({ type: 'temperature', level: 'danger', message: `High Temperature Alert: ${temp.toFixed(1)}°C` });
  if (hum > 75) alerts.push({ type: 'humidity', level: 'warning', message: `Excessive Humidity: ${hum.toFixed(0)}%` });
  if (aqi > 700) alerts.push({ type: 'airQuality', level: 'danger', message: `Poor Air Quality: ${aqi} AQI/ppm` });
  if (light < 25) alerts.push({ type: 'light', level: 'warning', message: `Low Classroom Lighting: ${light}%` });

  return {
    tempStatus,
    tempClass,
    tempPercent,
    humidityStatus,
    humidityClass,
    humPercent,
    lightStatus,
    lightClass,
    lightPercent,
    aqiStatus,
    aqiClass,
    aqiPercent,
    recommendation,
    alerts
  };
};

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
