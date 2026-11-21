/**
 * SmartClass - Sensor Trends Chart Controller
 * Recreates the exact spline line chart from reference image
 * with real-time updates and interactive dataset filtering.
 */

class SensorTrendsManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
    this.activeFilter = 'all'; // 'all', 'temperature', 'humidity', 'light', 'airQuality'
    this.rawAirQualityData = [405, 395, 412, 422];
  }

  init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Create soft gradient fill for temperature bottom area
    const tempGradient = ctx.createLinearGradient(0, 0, 0, 220);
    tempGradient.addColorStop(0, 'rgba(239, 68, 68, 0.12)');
    tempGradient.addColorStop(0.7, 'rgba(244, 63, 94, 0.05)');
    tempGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    // Timestamps matching reference photo
    const initialLabels = ['7:00 PM', '7:15 PM', '7:30 PM', '7:45 PM'];

    // 4 Lines matching photo colors & order
    const datasets = [
      {
        id: 'light',
        label: 'Light (%)',
        data: [72, 75, 80, 82],
        borderColor: '#f59e0b', // Amber/Orange
        backgroundColor: 'transparent',
        borderWidth: 2.2,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        tension: 0.38,
        fill: false,
        order: 1
      },
      {
        id: 'humidity',
        label: 'Humidity (%)',
        data: [61, 59, 65, 60],
        borderColor: '#3b82f6', // Vivid Blue
        backgroundColor: 'transparent',
        borderWidth: 2.2,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        tension: 0.38,
        fill: false,
        order: 2
      },
      {
        id: 'airQuality',
        label: 'Air Quality',
        // Scaled to fit 0-100 chart axis (e.g. 422 AQI -> 42.2)
        data: [40.5, 39.5, 41.2, 42.2],
        borderColor: '#a855f7', // Violet
        backgroundColor: 'transparent',
        borderWidth: 2.2,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        tension: 0.38,
        fill: false,
        order: 3
      },
      {
        id: 'temperature',
        label: 'Temperature (°C)',
        data: [30.2, 32.1, 31.0, 28.0],
        borderColor: '#ef4444', // Red/Coral
        backgroundColor: tempGradient,
        borderWidth: 2.2,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        tension: 0.38,
        fill: true, // Soft gradient under bottom line matching photo
        order: 4
      }
    ];

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 450,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // Handled by custom pill legend
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 11.5, weight: '500' },
            padding: 10,
            cornerRadius: 10,
            boxPadding: 4,
            callbacks: {
              label: (context) => {
                const id = context.dataset.id;
                const val = context.parsed.y;
                if (id === 'temperature') return ` Temperature: ${val.toFixed(1)} °C`;
                if (id === 'humidity') return ` Humidity: ${Math.round(val)} %`;
                if (id === 'light') return ` Light Level: ${Math.round(val)} %`;
                if (id === 'airQuality') {
                  const idx = context.dataIndex;
                  const raw = this.rawAirQualityData[idx] || Math.round(val * 10);
                  return ` Air Quality: ${raw} AQI`;
                }
                return `${context.dataset.label}: ${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(226, 232, 240, 0.55)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: '#64748b',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
            },
            grid: {
              color: 'rgba(226, 232, 240, 0.65)',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // Filter or isolate specific sensor line
  setFilter(sensorKey) {
    this.activeFilter = sensorKey;
    if (!this.chart) return;

    this.chart.data.datasets.forEach((dataset) => {
      if (sensorKey === 'all') {
        dataset.hidden = false;
      } else {
        dataset.hidden = (dataset.id !== sensorKey);
      }
    });

    this.chart.update();
  }

  // Load historical batch readings from Supabase or memory
  loadHistory(historyList) {
    if (!this.chart || !historyList || historyList.length === 0) return;

    const labels = [];
    const lightData = [];
    const humData = [];
    const airData = [];
    const tempData = [];
    this.rawAirQualityData = [];

    // Limit to latest 10-12 points on chart for clean display
    const slice = historyList.slice(-12);

    slice.forEach((item) => {
      const date = new Date(item.created_at || item.timestamp || Date.now());
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      labels.push(timeStr);

      lightData.push(parseFloat(item.light));
      humData.push(parseFloat(item.humidity));
      
      const rawAqi = parseFloat(item.air_quality ?? item.airQuality ?? 422);
      this.rawAirQualityData.push(rawAqi);
      airData.push(rawAqi / 10);

      tempData.push(parseFloat(item.temperature));
    });

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = lightData;
    this.chart.data.datasets[1].data = humData;
    this.chart.data.datasets[2].data = airData;
    this.chart.data.datasets[3].data = tempData;

    this.chart.update();
  }

  // Push single real-time reading from Wokwi ESP32 / Supabase Realtime
  addRealtimePoint(reading) {
    if (!this.chart) return;

    const date = new Date(reading.created_at || reading.timestamp || Date.now());
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Keep sliding window of 10 points
    if (this.chart.data.labels.length >= 10) {
      this.chart.data.labels.shift();
      this.chart.data.datasets.forEach(ds => ds.data.shift());
      this.rawAirQualityData.shift();
    }

    this.chart.data.labels.push(timeStr);
    this.chart.data.datasets[0].data.push(parseFloat(reading.light));
    this.chart.data.datasets[1].data.push(parseFloat(reading.humidity));

    const rawAqi = parseFloat(reading.air_quality ?? reading.airQuality ?? 422);
    this.rawAirQualityData.push(rawAqi);
    this.chart.data.datasets[2].data.push(rawAqi / 10);

    this.chart.data.datasets[3].data.push(parseFloat(reading.temperature));

    this.chart.update('none'); // Update smoothly without full animation reset
  }
}

window.chartTrends = new SensorTrendsManager('sensorTrendsCanvas');
