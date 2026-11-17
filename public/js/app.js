/**
 * SmartClass Dashboard Main Application Logic
 * Integrates WebSockets, Wokwi IoT updates, MongoDB sync,
 * interactive card-to-graph filtering, and tab switching.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Chart
  if (window.chartTrends) {
    window.chartTrends.init();
  }

  // State
  let isStreamPaused = false;
  let packetCounter = 0;
  let activeIncidentsCount = 2;

  // 2. Establish Socket.IO Real-time Connection
  const socket = io();

  socket.on('connect', () => {
    updateSystemOnline(true);
  });

  socket.on('disconnect', () => {
    updateSystemOnline(false);
  });

  // Initial Data Payload from Server
  socket.on('initData', (data) => {
    if (data.latest) {
      applyReadingToDashboard(data.latest);
    }
    if (data.history && window.chartTrends) {
      window.chartTrends.loadHistory(data.history);
      populateHistoryTable(data.history);
    }
    updateMongoStatusBadge(data.isMongoConnected);
  });

  // Real-Time Sensor Updates from Wokwi ESP32 / MongoDB
  socket.on('sensorUpdate', (payload) => {
    if (isStreamPaused) return;

    const reading = payload.reading || payload.latest;
    if (reading) {
      applyReadingToDashboard(reading);

      // Append to line chart
      if (window.chartTrends) {
        window.chartTrends.addRealtimePoint(reading);
      }

      // Add to telemetry log table
      appendTelemetryRow(reading, payload.isMongoConnected);
    }

    if (payload.isMongoConnected !== undefined) {
      updateMongoStatusBadge(payload.isMongoConnected);
    }
  });

  // 3. UI Update Engine: Apply Sensor Reading to DOM
  function applyReadingToDashboard(data) {
    // Temperature
    const tempVal = parseFloat(data.temperature);
    document.getElementById('val-temp').textContent = `${tempVal.toFixed(1)}°C`;
    const pillTemp = document.getElementById('pill-temp');
    const textTempPill = document.getElementById('text-temp-pill');
    textTempPill.textContent = data.tempStatus || (tempVal > 32 ? 'Hot' : 'Normal');
    pillTemp.className = `metric-status-pill ${data.tempClass === 'status-danger' ? 'pill-danger' : (tempVal > 28.5 ? 'pill-amber' : 'pill-green')}`;
    const liveGaugeTemp = document.getElementById('live-gauge-temp');
    if (liveGaugeTemp) liveGaugeTemp.textContent = tempVal.toFixed(1);

    // Humidity
    const humVal = parseFloat(data.humidity);
    document.getElementById('val-hum').textContent = `${Math.round(humVal)}%`;
    const pillHum = document.getElementById('pill-hum');
    const textHumPill = document.getElementById('text-hum-pill');
    textHumPill.textContent = data.humidityStatus || (humVal > 70 ? 'High' : 'Normal');
    pillHum.className = `metric-status-pill ${humVal > 70 ? 'pill-amber' : 'pill-green'}`;
    const liveGaugeHum = document.getElementById('live-gauge-hum');
    if (liveGaugeHum) liveGaugeHum.textContent = Math.round(humVal);

    // Light Level
    const lightVal = parseFloat(data.light);
    document.getElementById('val-light').textContent = `${Math.round(lightVal)}%`;
    const pillLight = document.getElementById('pill-light');
    const textLightPill = document.getElementById('text-light-pill');
    textLightPill.textContent = data.lightStatus || 'Good';
    pillLight.className = 'metric-status-pill pill-amber';
    const liveGaugeLight = document.getElementById('live-gauge-light');
    if (liveGaugeLight) liveGaugeLight.textContent = Math.round(lightVal);

    // Air Quality
    const aqiVal = parseFloat(data.airQuality);
    document.getElementById('val-air').textContent = `${Math.round(aqiVal)}`;
    const pillAir = document.getElementById('pill-air');
    const textAirPill = document.getElementById('text-air-pill');
    textAirPill.textContent = data.aqiStatus || (aqiVal > 700 ? 'Hazardous' : 'Good');
    pillAir.className = `metric-status-pill ${aqiVal > 700 ? 'pill-danger' : 'pill-green'}`;
    const liveGaugeAir = document.getElementById('live-gauge-air');
    if (liveGaugeAir) liveGaugeAir.textContent = Math.round(aqiVal);

    // Dynamic Recommendation
    if (data.recommendation) {
      document.getElementById('disp-recommendation').textContent = data.recommendation;
    }

    // Dynamic Alerts
    updateAlertsState(data.alerts || []);

    // Last updated timestamp
    updateLastUpdatedTime(data.timestamp);
  }

  // Alerts Box Handler
  function updateAlertsState(alerts) {
    const safeContainer = document.getElementById('safe-alerts-display');
    const activeContainer = document.getElementById('active-alerts-display');
    const sidebarBadge = document.getElementById('sidebar-badge-alerts');

    if (!alerts || alerts.length === 0) {
      safeContainer.style.display = 'flex';
      activeContainer.style.display = 'none';
      activeContainer.innerHTML = '';
      sidebarBadge.textContent = '0';
      sidebarBadge.style.display = 'none';
    } else {
      safeContainer.style.display = 'none';
      activeContainer.style.display = 'flex';
      activeContainer.innerHTML = '';
      sidebarBadge.style.display = 'inline-block';
      sidebarBadge.textContent = alerts.length;

      alerts.forEach(item => {
        const div = document.createElement('div');
        div.className = `alert-dynamic-item ${item.level === 'danger' ? 'danger' : 'warning'}`;
        div.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${item.message}</span>`;
        activeContainer.appendChild(div);
      });
    }
  }

  // Timestamp Formatter
  function updateLastUpdatedTime(timestamp) {
    const d = timestamp ? new Date(timestamp) : new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    document.getElementById('disp-last-updated').textContent = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${timeStr}`;
  }

  // MongoDB Status Indicator
  function updateMongoStatusBadge(isConnected) {
    const badge = document.getElementById('mongo-status-badge');
    const text = document.getElementById('mongo-status-text');
    const cfgStatus = document.getElementById('cfg-db-status');

    if (isConnected) {
      badge.classList.add('connected');
      text.textContent = 'MongoDB: Connected';
      if (cfgStatus) cfgStatus.textContent = 'Status: MongoDB Atlas Connected (Persistent)';
    } else {
      badge.classList.remove('connected');
      text.textContent = 'MongoDB: Standby / Memory';
      if (cfgStatus) cfgStatus.textContent = 'Status: Standby / In-Memory Cache (Waiting for MongoDB Atlas)';
    }
  }

  // System Online Indicator
  function updateSystemOnline(isOnline) {
    const dot = document.getElementById('status-dot');
    const txt = document.getElementById('status-text');
    if (isOnline) {
      dot.className = 'pulse-dot-online';
      txt.textContent = 'System Online';
    } else {
      dot.className = '';
      dot.style.backgroundColor = '#ef4444';
      txt.textContent = 'Reconnecting...';
    }
  }

  // 4. Header Clock Widget
  function tickClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    if (clockTime) clockTime.textContent = timeStr;
    if (clockDate) clockDate.textContent = dateStr;
  }
  tickClock();
  setInterval(tickClock, 1000);

  // 5. Interactive Cards & Legend Click Handlers (Filter specific sensor graph)
  const metricCards = document.querySelectorAll('.metric-card');
  const legendBtns = document.querySelectorAll('.legend-filter-btn');

  function setSensorFilter(sensorKey) {
    metricCards.forEach(card => {
      if (card.dataset.sensor === sensorKey) {
        card.classList.add('active-filter-card');
      } else {
        card.classList.remove('active-filter-card');
      }
    });

    if (window.chartTrends) {
      window.chartTrends.setFilter(sensorKey);
    }
  }

  metricCards.forEach(card => {
    card.addEventListener('click', () => {
      const sensor = card.dataset.sensor;
      if (card.classList.contains('active-filter-card') && window.chartTrends.activeFilter === sensor) {
        setSensorFilter('all');
      } else {
        setSensorFilter(sensor);
      }
    });
  });

  legendBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setSensorFilter(btn.dataset.sensor);
    });
  });

  // 6. Time Range Buttons (1h, 6h, 12h, 24h)
  const timeBtns = document.querySelectorAll('.time-toggle-btn');
  timeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const range = btn.dataset.range;
      try {
        const res = await fetch(`/api/sensor-data/history?range=${range}`);
        const result = await res.json();
        if (result.success && result.data && window.chartTrends) {
          window.chartTrends.loadHistory(result.data);
          populateHistoryTable(result.data);
        }
      } catch (err) {
        console.error('Error fetching range history:', err);
      }
    });
  });

  // 7. Navigation Tabs Switching
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const tabTitles = {
    'dashboard': { title: 'Classroom Environment', subtitle: 'Real-time monitoring for a smarter learning space' },
    'live': { title: 'Live Data Telemetry', subtitle: 'Real-time streaming from Wokwi ESP32 to MongoDB' },
    'history': { title: 'Environmental History', subtitle: 'Time series archive, analytical aggregations and logs' },
    'alerts': { title: 'Alerts & Safety Management', subtitle: 'Active environmental incidents and safety triggers' },
    'reports': { title: 'Environmental Health Reports', subtitle: 'International classroom comfort compliance scores' },
    'settings': { title: 'System Configuration', subtitle: 'MongoDB Atlas, Wokwi IoT bridge and threshold settings' }
  };

  function switchTab(tabId) {
    navItems.forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === `view-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (tabTitles[tabId]) {
      pageTitle.textContent = tabTitles[tabId].title;
      pageSubtitle.textContent = tabTitles[tabId].subtitle;
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });

  const linkGotoAlerts = document.getElementById('link-goto-alerts');
  if (linkGotoAlerts) {
    linkGotoAlerts.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('alerts');
    });
  }

  // 8. Ingestion Telemetry Table (Tab 2)
  function appendTelemetryRow(reading, isMongo) {
    const tbody = document.getElementById('telemetry-tbody');
    if (!tbody) return;

    packetCounter++;
    const countTag = document.getElementById('live-packets-count');
    if (countTag) countTag.textContent = `${packetCounter} Packets Received`;

    const tr = document.createElement('tr');
    const timeStr = new Date(reading.timestamp || Date.now()).toLocaleTimeString();

    tr.innerHTML = `
      <td><strong>${timeStr}</strong></td>
      <td><span class="code-pill">ESP32 (Wokwi)</span></td>
      <td><span style="color:#ef4444; font-weight:700;">${parseFloat(reading.temperature).toFixed(1)} °C</span></td>
      <td><span style="color:#3b82f6; font-weight:700;">${Math.round(reading.humidity)} %</span></td>
      <td><span style="color:#f59e0b; font-weight:700;">${Math.round(reading.light)} %</span></td>
      <td><span style="color:#a855f7; font-weight:700;">${Math.round(reading.airQuality)} AQI</span></td>
      <td><span class="metric-status-pill ${isMongo ? 'pill-green' : 'pill-amber'}">${isMongo ? 'Synced to Atlas' : 'Saved to Cache'}</span></td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    // Keep max 25 rows
    while (tbody.children.length > 25) {
      tbody.removeChild(tbody.lastChild);
    }
  }

  // 9. History Table Populator (Tab 3)
  function populateHistoryTable(historyList) {
    const tbody = document.getElementById('history-tbody');
    const countTag = document.getElementById('hist-records-count');
    if (!tbody || !historyList) return;

    tbody.innerHTML = '';
    if (countTag) countTag.textContent = `${historyList.length} Records Loaded`;

    historyList.slice().reverse().forEach(item => {
      const tr = document.createElement('tr');
      const timeStr = new Date(item.timestamp).toLocaleString();
      tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${item.classroom || 'Room 302'}</td>
        <td><strong>${parseFloat(item.temperature).toFixed(1)} °C</strong></td>
        <td>${Math.round(item.humidity)} %</td>
        <td>${Math.round(item.light)} %</td>
        <td>${Math.round(item.airQuality)} AQI</td>
        <td><span class="metric-status-pill pill-green">${item.tempStatus || 'Normal'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Stream Pause / Resume
  const btnToggleStream = document.getElementById('btn-toggle-stream');
  if (btnToggleStream) {
    btnToggleStream.addEventListener('click', () => {
      isStreamPaused = !isStreamPaused;
      if (isStreamPaused) {
        btnToggleStream.innerHTML = '<i class="fa-solid fa-play"></i> Resume Stream';
        btnToggleStream.style.background = '#10b981';
      } else {
        btnToggleStream.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Stream';
        btnToggleStream.style.background = 'var(--purple-primary)';
      }
    });
  }

  const btnClearTable = document.getElementById('btn-clear-table');
  if (btnClearTable) {
    btnClearTable.addEventListener('click', () => {
      const tbody = document.getElementById('telemetry-tbody');
      if (tbody) tbody.innerHTML = '';
      packetCounter = 0;
      document.getElementById('live-packets-count').textContent = '0 Packets Received';
    });
  }

  // 10. Export CSV & JSON
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/sensor-data/history?range=24h');
        const json = await res.json();
        const data = json.data || [];
        
        let csv = 'Timestamp,Classroom,Temperature,Humidity,Light,AirQuality\n';
        data.forEach(d => {
          csv += `"${d.timestamp}","${d.classroom}",${d.temperature},${d.humidity},${d.light},${d.airQuality}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartClass_Telemetry_${Date.now()}.csv`;
        a.click();
      } catch (err) {
        alert('Could not export CSV: ' + err.message);
      }
    });
  }

  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/sensor-data/history?range=24h');
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartClass_Archive_${Date.now()}.json`;
        a.click();
      } catch (err) {
        alert('Could not download JSON: ' + err.message);
      }
    });
  }

  // 11. Floating Wokwi Live Controller Drawer
  const wokwiDrawer = document.getElementById('wokwi-drawer');
  const btnOpenDrawer = document.getElementById('btn-toggle-sim-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-sim-drawer');

  if (btnOpenDrawer) {
    btnOpenDrawer.addEventListener('click', () => wokwiDrawer.classList.add('open'));
  }
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => wokwiDrawer.classList.remove('open'));
  }

  const sliderTemp = document.getElementById('slider-temp');
  const sliderHum = document.getElementById('slider-hum');
  const sliderLight = document.getElementById('slider-light');
  const sliderAir = document.getElementById('slider-air');

  const dispSliderTemp = document.getElementById('disp-slider-temp');
  const dispSliderHum = document.getElementById('disp-slider-hum');
  const dispSliderLight = document.getElementById('disp-slider-light');
  const dispSliderAir = document.getElementById('disp-slider-air');

  sliderTemp.addEventListener('input', () => dispSliderTemp.textContent = `${sliderTemp.value} °C`);
  sliderHum.addEventListener('input', () => dispSliderHum.textContent = `${sliderHum.value} %`);
  sliderLight.addEventListener('input', () => dispSliderLight.textContent = `${sliderLight.value} %`);
  sliderAir.addEventListener('input', () => dispSliderAir.textContent = sliderAir.value);

  // Push Live Sensor Reading to Backend & MongoDB
  const btnPush = document.getElementById('btn-push-reading');
  btnPush.addEventListener('click', async () => {
    const payload = {
      temperature: parseFloat(sliderTemp.value),
      humidity: parseFloat(sliderHum.value),
      light: parseFloat(sliderLight.value),
      airQuality: parseFloat(sliderAir.value),
      classroom: 'Room 302',
      timestamp: new Date().toISOString()
    };

    try {
      btnPush.disabled = true;
      btnPush.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Writing to MongoDB...';

      await fetch('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      btnPush.innerHTML = '<i class="fa-solid fa-check"></i> Saved & Synced!';
      setTimeout(() => {
        btnPush.disabled = false;
        btnPush.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Push to Dashboard & MongoDB';
      }, 1000);
    } catch (err) {
      console.error('Error posting sensor reading:', err);
      btnPush.disabled = false;
      btnPush.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Push to Dashboard & MongoDB';
    }
  });

  // Auto Fluctuation Loop
  let autoSimTimer = null;
  const btnAutoStream = document.getElementById('btn-auto-stream');

  btnAutoStream.addEventListener('click', () => {
    if (autoSimTimer) {
      clearInterval(autoSimTimer);
      autoSimTimer = null;
      btnAutoStream.innerHTML = '<i class="fa-solid fa-play"></i> Start Auto Fluctuation';
      btnAutoStream.style.background = '#f1f5f9';
      btnAutoStream.style.color = '#334155';
    } else {
      btnAutoStream.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Auto Fluctuation';
      btnAutoStream.style.background = '#fee2e2';
      btnAutoStream.style.color = '#991b1b';

      autoSimTimer = setInterval(async () => {
        let curTemp = parseFloat(sliderTemp.value);
        let curHum = parseFloat(sliderHum.value);
        let curLight = parseFloat(sliderLight.value);
        let curAir = parseFloat(sliderAir.value);

        curTemp = +(curTemp + (Math.random() * 1.6 - 0.8)).toFixed(1);
        curTemp = Math.min(Math.max(curTemp, 18), 38);

        curHum = +(curHum + (Math.random() * 4 - 2)).toFixed(0);
        curHum = Math.min(Math.max(curHum, 30), 85);

        curLight = +(curLight + (Math.random() * 6 - 3)).toFixed(0);
        curLight = Math.min(Math.max(curLight, 20), 98);

        curAir = +(curAir + (Math.random() * 20 - 10)).toFixed(0);
        curAir = Math.min(Math.max(curAir, 250), 800);

        sliderTemp.value = curTemp;
        sliderHum.value = curHum;
        sliderLight.value = curLight;
        sliderAir.value = curAir;

        dispSliderTemp.textContent = `${curTemp} °C`;
        dispSliderHum.textContent = `${curHum} %`;
        dispSliderLight.textContent = `${curLight} %`;
        dispSliderAir.textContent = curAir;

        await fetch('/api/sensor-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            temperature: curTemp,
            humidity: curHum,
            light: curLight,
            airQuality: curAir,
            classroom: 'Room 302'
          })
        });
      }, 3000);
    }
  });
});

function updateBadgeAfterResolve() {
  const badge = document.getElementById('active-incidents-badge');
  const sidebarBadge = document.getElementById('sidebar-badge-alerts');
  const count = document.querySelectorAll('.incident-item').length;
  if (badge) badge.textContent = `${count} Active`;
  if (sidebarBadge) {
    sidebarBadge.textContent = count;
    if (count === 0) sidebarBadge.style.display = 'none';
  }
}
