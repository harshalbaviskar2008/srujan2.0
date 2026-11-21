/**
 * SmartClass Dashboard - Client Controller
 * Pure client-side implementation using Supabase Cloud Database + Realtime WebSockets.
 * No Node.js server required!
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Spline Chart
  if (window.chartTrends) {
    window.chartTrends.init();
  }

  // State Management
  let isStreamPaused = false;
  let packetCounter = 0;
  let memoryRecords = [];

  // Default seed points matching reference photo
  const now = Date.now();
  const seedReadings = [
    { temperature: 30.2, humidity: 61, light: 72, air_quality: 405, classroom: 'Room 302', created_at: new Date(now - 45 * 60 * 1000).toISOString() },
    { temperature: 32.1, humidity: 59, light: 74, air_quality: 395, classroom: 'Room 302', created_at: new Date(now - 30 * 60 * 1000).toISOString() },
    { temperature: 31.0, humidity: 65, light: 80, air_quality: 412, classroom: 'Room 302', created_at: new Date(now - 15 * 60 * 1000).toISOString() },
    { temperature: 28.0, humidity: 60, light: 82, air_quality: 422, classroom: 'Room 302', created_at: new Date(now).toISOString() }
  ];

  memoryRecords = [...seedReadings];

  // Helper: Evaluate thresholds, status badges, recommendations & alerts
  function evaluateReading(data) {
    const temp = parseFloat(data.temperature ?? 28.0);
    const hum = parseFloat(data.humidity ?? 60.0);
    const light = parseFloat(data.light ?? 82.0);
    const aqi = parseFloat(data.air_quality ?? data.airQuality ?? 422);

    let tempStatus = 'Normal';
    let tempClass = 'pill-green';
    if (temp > 32) {
      tempStatus = 'Hot';
      tempClass = 'pill-danger';
    } else if (temp > 28.5) {
      tempStatus = 'Warm';
      tempClass = 'pill-amber';
    } else if (temp < 18) {
      tempStatus = 'Cold';
      tempClass = 'pill-amber';
    }

    let humidityStatus = 'Normal';
    let humClass = 'pill-green';
    if (hum > 70) {
      humidityStatus = 'High';
      humClass = 'pill-amber';
    } else if (hum < 30) {
      humidityStatus = 'Low';
      humClass = 'pill-amber';
    }

    let lightStatus = 'Good';
    let lightClass = 'pill-amber';
    if (light < 30) {
      lightStatus = 'Dim';
    } else if (light > 90) {
      lightStatus = 'Bright';
    }

    let aqiStatus = 'Good';
    let aqiClass = 'pill-green';
    if (aqi > 700) {
      aqiStatus = 'Hazardous';
      aqiClass = 'pill-danger';
    } else if (aqi > 500) {
      aqiStatus = 'Moderate';
      aqiClass = 'pill-amber';
    }

    // Dynamic Recommendation
    let recommendation = 'Keep monitoring for any sudden changes in temperature or humidity.';
    if (aqi > 650) {
      recommendation = '⚠️ Elevated CO2/Air Quality detected. Recommend opening classroom windows for fresh air circulation.';
    } else if (temp > 30) {
      recommendation = '🌡️ Classroom temperature is rising above 30°C. Consider turning on air conditioning or fans.';
    } else if (temp < 19) {
      recommendation = '❄️ Room temperature is below comfortable threshold. Adjust heating or close drafty windows.';
    } else if (hum > 72) {
      recommendation = '💧 High humidity detected. Ventilation or dehumidifier recommended to keep students focused.';
    } else if (light < 35) {
      recommendation = '💡 Classroom lighting is dim. Turn on overhead study lights to reduce student eye strain.';
    }

    // Active Alerts
    const alerts = [];
    if (temp > 32) alerts.push({ type: 'temperature', level: 'danger', message: `High Temperature Alert: ${temp.toFixed(1)}°C` });
    if (hum > 75) alerts.push({ type: 'humidity', level: 'warning', message: `Excessive Humidity: ${hum.toFixed(0)}%` });
    if (aqi > 700) alerts.push({ type: 'airQuality', level: 'danger', message: `Poor Air Quality: ${Math.round(aqi)} AQI/ppm` });
    if (light < 25) alerts.push({ type: 'light', level: 'warning', message: `Low Classroom Lighting: ${Math.round(light)}%` });

    return {
      temp,
      hum,
      light,
      aqi,
      tempStatus,
      tempClass,
      humidityStatus,
      humClass,
      lightStatus,
      lightClass,
      aqiStatus,
      aqiClass,
      recommendation,
      alerts
    };
  }

  // Update UI components with reading
  function applyReadingToDashboard(data) {
    const evalData = evaluateReading(data);

    // Temperature
    document.getElementById('val-temp').textContent = `${evalData.temp.toFixed(1)}°C`;
    const pillTemp = document.getElementById('pill-temp');
    document.getElementById('text-temp-pill').textContent = evalData.tempStatus;
    pillTemp.className = `metric-status-pill ${evalData.tempClass}`;
    const liveGaugeTemp = document.getElementById('live-gauge-temp');
    if (liveGaugeTemp) liveGaugeTemp.textContent = evalData.temp.toFixed(1);

    // Humidity
    document.getElementById('val-hum').textContent = `${Math.round(evalData.hum)}%`;
    const pillHum = document.getElementById('pill-hum');
    document.getElementById('text-hum-pill').textContent = evalData.humidityStatus;
    pillHum.className = `metric-status-pill ${evalData.humClass}`;
    const liveGaugeHum = document.getElementById('live-gauge-hum');
    if (liveGaugeHum) liveGaugeHum.textContent = Math.round(evalData.hum);

    // Light Level
    document.getElementById('val-light').textContent = `${Math.round(evalData.light)}%`;
    const pillLight = document.getElementById('pill-light');
    document.getElementById('text-light-pill').textContent = evalData.lightStatus;
    pillLight.className = `metric-status-pill ${evalData.lightClass}`;
    const liveGaugeLight = document.getElementById('live-gauge-light');
    if (liveGaugeLight) liveGaugeLight.textContent = Math.round(evalData.light);

    // Air Quality
    document.getElementById('val-air').textContent = `${Math.round(evalData.aqi)}`;
    const pillAir = document.getElementById('pill-air');
    document.getElementById('text-air-pill').textContent = evalData.aqiStatus;
    pillAir.className = `metric-status-pill ${evalData.aqiClass}`;
    const liveGaugeAir = document.getElementById('live-gauge-air');
    if (liveGaugeAir) liveGaugeAir.textContent = Math.round(evalData.aqi);

    // Recommendation
    document.getElementById('disp-recommendation').textContent = evalData.recommendation;

    // Alerts
    updateAlertsState(evalData.alerts);

    // Last updated timestamp
    updateLastUpdatedTime(data.created_at || data.timestamp);
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

  // Status strip (top-right corner) — shows Realtime vs Poll vs Demo
  function updateStatusStrip(msg, color) {
    const strip = document.getElementById('realtime-status-strip');
    if (!strip) return;
    strip.textContent = msg;
    strip.style.background = color || '#6366f1';
    strip.style.display = 'flex';
  }

  // Update Supabase Sync Status Indicator
  function updateSupabaseBadge(isConnected, customText) {
    const badge = document.getElementById('mongo-status-badge');
    const text = document.getElementById('mongo-status-text');
    const cfgStatus = document.getElementById('cfg-db-status');
    const cfgDot = document.getElementById('cfg-db-dot');

    if (isConnected) {
      badge.classList.add('connected');
      text.textContent = customText || 'Supabase: Live Sync';
      if (cfgStatus) cfgStatus.textContent = 'Status: Supabase Cloud Connected (PostgreSQL)';
      if (cfgDot) cfgDot.style.backgroundColor = '#10b981';
    } else {
      badge.classList.remove('connected');
      text.textContent = customText || 'Supabase: Demo / Standby';
      if (cfgStatus) cfgStatus.textContent = 'Status: Standby / Local Demo Mode';
      if (cfgDot) cfgDot.style.backgroundColor = '#f59e0b';
    }
  }

  // Header Clock Widget
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

  // Ingestion Telemetry Table (Tab 2)
  function appendTelemetryRow(reading, isSupabase) {
    const tbody = document.getElementById('telemetry-tbody');
    if (!tbody) return;

    packetCounter++;
    const countTag = document.getElementById('live-packets-count');
    if (countTag) countTag.textContent = `${packetCounter} Packets Received`;

    const tr = document.createElement('tr');
    const timeStr = new Date(reading.created_at || reading.timestamp || Date.now()).toLocaleTimeString();
    const aqi = reading.air_quality ?? reading.airQuality ?? 422;

    tr.innerHTML = `
      <td><strong>${timeStr}</strong></td>
      <td><span class="code-pill">ESP32 (Wokwi)</span></td>
      <td><span style="color:#ef4444; font-weight:700;">${parseFloat(reading.temperature).toFixed(1)} °C</span></td>
      <td><span style="color:#3b82f6; font-weight:700;">${Math.round(reading.humidity)} %</span></td>
      <td><span style="color:#f59e0b; font-weight:700;">${Math.round(reading.light)} %</span></td>
      <td><span style="color:#a855f7; font-weight:700;">${Math.round(aqi)} AQI</span></td>
      <td><span class="metric-status-pill ${isSupabase ? 'pill-green' : 'pill-amber'}">${isSupabase ? 'Synced to Supabase' : 'Saved Locally'}</span></td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    while (tbody.children.length > 25) {
      tbody.removeChild(tbody.lastChild);
    }
  }

  // History Table Populator (Tab 3)
  function populateHistoryTable(historyList) {
    const tbody = document.getElementById('history-tbody');
    const countTag = document.getElementById('hist-records-count');
    if (!tbody || !historyList) return;

    tbody.innerHTML = '';
    if (countTag) countTag.textContent = `${historyList.length} Records Loaded`;

    historyList.slice().reverse().forEach(item => {
      const tr = document.createElement('tr');
      const timeStr = new Date(item.created_at || item.timestamp).toLocaleString();
      const aqi = item.air_quality ?? item.airQuality ?? 422;
      const evalData = evaluateReading(item);

      tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${item.classroom || 'Room 302'}</td>
        <td><strong>${parseFloat(item.temperature).toFixed(1)} °C</strong></td>
        <td>${Math.round(item.humidity)} %</td>
        <td>${Math.round(item.light)} %</td>
        <td>${Math.round(aqi)} AQI</td>
        <td><span class="metric-status-pill ${evalData.tempClass}">${evalData.tempStatus}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Track last processed record ID to prevent duplicate UI updates
  let lastProcessedId = null;

  // Handle incoming real-time sensor reading
  function handleIncomingReading(reading, isSupabaseSource = true) {
    if (isStreamPaused) return;

    // Normalise field names
    const formatted = {
      ...reading,
      air_quality: reading.air_quality ?? reading.airQuality ?? 422,
      created_at: reading.created_at || reading.timestamp || new Date().toISOString()
    };

    const recordId = formatted.id || formatted.created_at;
    if (recordId && recordId === lastProcessedId) {
      return; // Already applied this update
    }
    lastProcessedId = recordId;

    memoryRecords.push(formatted);
    if (memoryRecords.length > 100) memoryRecords.shift();

    applyReadingToDashboard(formatted);

    if (window.chartTrends) {
      window.chartTrends.addRealtimePoint(formatted);
    }

    appendTelemetryRow(formatted, isSupabaseSource);
  }

  // =========================================================================
  // SUPABASE INTEGRATION & REALTIME WEBSOCKET SUBSCRIPTION
  // =========================================================================
  async function initSupabaseData() {
    if (supabaseClient) {
      updateSupabaseBadge(true, 'Supabase: Connecting...');
      try {
        // 1. Fetch latest readings from Supabase
        const { data, error } = await supabaseClient
          .from('sensor_readings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.warn("Could not query Supabase table sensor_readings:", error.message);
          updateSupabaseBadge(false, 'Supabase: Table Check Needed');
        } else if (data && data.length > 0) {
          memoryRecords = data;
          console.log(`Loaded ${data.length} records from Supabase.`);
          
          // Apply latest
          const latest = data[data.length - 1];
          applyReadingToDashboard(latest);

          if (window.chartTrends) {
            window.chartTrends.loadHistory(data);
          }
          populateHistoryTable(data);
          updateSupabaseBadge(true, 'Supabase: Live Connected');
        } else {
          // Table exists but empty, insert initial seed points
          console.log("Supabase table is empty. Seeding initial reference records...");
          await supabaseClient.from('sensor_readings').insert(seedReadings);
          applyReadingToDashboard(seedReadings[seedReadings.length - 1]);
          if (window.chartTrends) window.chartTrends.loadHistory(seedReadings);
          populateHistoryTable(seedReadings);
          updateSupabaseBadge(true, 'Supabase: Live Connected');
        }

        // 2. Subscribe to Realtime Postgres Changes (Instant WebSocket)
        let realtimeConnected = false;
        const realtimeChannel = supabaseClient
          .channel('smartclass-fast-sync')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
            (payload) => {
              console.log("⚡ [FAST REALTIME WEBSOCKET]", payload.new);
              realtimeConnected = true;
              updateStatusStrip('🟢 Live — Instant Realtime', '#10b981');
              handleIncomingReading(payload.new, true);
            }
          )
          .subscribe((status, err) => {
            console.log("Supabase Realtime Status:", status, err || '');
            if (status === 'SUBSCRIBED') {
              realtimeConnected = true;
              updateSupabaseBadge(true, 'Supabase: Live Sync');
              updateStatusStrip('🟢 Realtime Live (< 1s sync)', '#10b981');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn("Realtime channel:", status, "— fast 1s polling active");
              updateStatusStrip('🟡 Fast Sync (1s Poll)', '#f59e0b');
            }
          });

        // 3. Lightning Fast Polling Fallback (1-second interval, indexed by id)
        setInterval(async () => {
          try {
            const { data: polled } = await supabaseClient
              .from('sensor_readings')
              .select('*')
              .order('id', { ascending: false })
              .limit(1);
            if (polled && polled[0]) {
              const latest = polled[0];
              if (latest.id !== lastProcessedId) {
                console.log("📡 [FAST 1s SYNC]", latest);
                if (!realtimeConnected) {
                  updateStatusStrip('🟢 Fast Sync (1s Poll)', '#10b981');
                }
                handleIncomingReading(latest, true);
              }
            }
          } catch (e) {
            console.warn("Fast poll error:", e);
          }
        }, 1000); // 1-second ultra-responsive sync

      } catch (err) {
        console.error("Supabase init error:", err);
        updateSupabaseBadge(false, 'Supabase: Standby');
      }
    } else {
      // Offline / Demo Mode
      console.log("Running in offline demo mode with initial reference dataset.");
      applyReadingToDashboard(seedReadings[seedReadings.length - 1]);
      if (window.chartTrends) window.chartTrends.loadHistory(seedReadings);
      populateHistoryTable(seedReadings);
      updateSupabaseBadge(false, 'Supabase: Demo Mode');
    }
  }

  await initSupabaseData();

  // =========================================================================
  // INTERACTIVE CARD & LEGEND FILTERS
  // =========================================================================
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

  // Time Range Filter Buttons (1h, 6h, 12h, 24h)
  const timeBtns = document.querySelectorAll('.time-toggle-btn');
  timeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const range = btn.dataset.range;
      let hoursAgo = 1;
      if (range === '6h') hoursAgo = 6;
      else if (range === '12h') hoursAgo = 12;
      else if (range === '24h') hoursAgo = 24;

      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      if (supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('sensor_readings')
            .select('*')
            .gte('created_at', since)
            .order('created_at', { ascending: true })
            .limit(100);

          if (data && data.length > 0) {
            window.chartTrends.loadHistory(data);
            populateHistoryTable(data);
            return;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      // Fallback: Filter local records
      const filtered = memoryRecords.filter(r => (r.created_at || r.timestamp) >= since);
      window.chartTrends.loadHistory(filtered.length > 0 ? filtered : memoryRecords);
    });
  });

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const tabTitles = {
    'dashboard': { title: 'Classroom Environment', subtitle: 'Real-time monitoring for a smarter learning space' },
    'live': { title: 'Live Data Telemetry', subtitle: 'Real-time streaming from Wokwi ESP32 to Supabase' },
    'history': { title: 'Environmental History', subtitle: 'Time series archive, analytical aggregations and logs' },
    'alerts': { title: 'Alerts & Safety Management', subtitle: 'Active environmental incidents and safety triggers' },
    'reports': { title: 'Environmental Health Reports', subtitle: 'International classroom comfort compliance scores' },
    'settings': { title: 'System Configuration', subtitle: 'Supabase Cloud Database, Wokwi IoT bridge and thresholds' }
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

  // =========================================================================
  // STREAM CONTROLS & EXPORTS
  // =========================================================================
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

  // CSV & JSON Export
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const data = memoryRecords;
      let csv = 'Timestamp,Classroom,Temperature,Humidity,Light,AirQuality\n';
      data.forEach(d => {
        csv += `"${d.created_at || d.timestamp}","${d.classroom || 'Room 302'}",${d.temperature},${d.humidity},${d.light},${d.air_quality ?? d.airQuality}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartClass_Telemetry_${Date.now()}.csv`;
      a.click();
    });
  }

  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(memoryRecords, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartClass_Archive_${Date.now()}.json`;
      a.click();
    });
  }

  // =========================================================================
  // SETTINGS TAB: CONFIGURE SUPABASE DIRECTLY IN UI
  // =========================================================================
  const inputSbUrl = document.getElementById('cfg-supabase-url');
  const inputSbKey = document.getElementById('cfg-supabase-key');
  const btnSaveSb = document.getElementById('btn-save-supabase');
  const wokwiEndpointInput = document.getElementById('cfg-wokwi-endpoint');

  if (inputSbUrl && SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID')) {
    inputSbUrl.value = SUPABASE_CONFIG.url;
    if (wokwiEndpointInput) {
      wokwiEndpointInput.value = `${SUPABASE_CONFIG.url}/rest/v1/sensor_readings`;
    }
  }
  if (inputSbKey && SUPABASE_CONFIG.anonKey && !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    inputSbKey.value = SUPABASE_CONFIG.anonKey;
  }

  if (btnSaveSb) {
    btnSaveSb.addEventListener('click', async () => {
      const newUrl = inputSbUrl.value.trim();
      const newKey = inputSbKey.value.trim();

      if (!newUrl.startsWith('https://')) {
        alert('Please enter a valid Supabase Project URL starting with https://');
        return;
      }
      if (!newKey) {
        alert('Please enter your Supabase anon public key');
        return;
      }

      btnSaveSb.disabled = true;
      btnSaveSb.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

      const success = saveSupabaseCredentials(newUrl, newKey);
      if (success) {
        if (wokwiEndpointInput) {
          wokwiEndpointInput.value = `${newUrl}/rest/v1/sensor_readings`;
        }
        await initSupabaseData();
        btnSaveSb.innerHTML = '<i class="fa-solid fa-check"></i> Connected & Saved!';
      } else {
        btnSaveSb.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Check Credentials';
      }

      setTimeout(() => {
        btnSaveSb.disabled = false;
        btnSaveSb.innerHTML = '<i class="fa-solid fa-plug"></i> Save & Connect Supabase';
      }, 2000);
    });
  }

  // =========================================================================
  // FLOATING WOKWI LIVE CONTROLLER (TEST DIRECTLY IN BROWSER)
  // =========================================================================
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

  // Push Sensor Reading to Supabase + Dashboard
  const btnPush = document.getElementById('btn-push-reading');
  btnPush.addEventListener('click', async () => {
    const payload = {
      temperature: parseFloat(sliderTemp.value),
      humidity: parseFloat(sliderHum.value),
      light: parseFloat(sliderLight.value),
      air_quality: parseFloat(sliderAir.value),
      classroom: 'Room 302',
      created_at: new Date().toISOString()
    };

    try {
      btnPush.disabled = true;
      btnPush.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      if (supabaseClient) {
        const { error } = await supabaseClient.from('sensor_readings').insert([payload]);
        if (error) console.error("Supabase insert error:", error);
      }

      // Update dashboard immediately
      handleIncomingReading(payload, !!supabaseClient);

      btnPush.innerHTML = '<i class="fa-solid fa-check"></i> Saved & Synced!';
      setTimeout(() => {
        btnPush.disabled = false;
        btnPush.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Push to Dashboard & Supabase';
      }, 1000);
    } catch (err) {
      console.error('Error posting sensor reading:', err);
      handleIncomingReading(payload, false);
      btnPush.disabled = false;
      btnPush.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Push to Dashboard & Supabase';
    }
  });

  // Auto Fluctuation Simulation Loop
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

        const payload = {
          temperature: curTemp,
          humidity: curHum,
          light: curLight,
          air_quality: curAir,
          classroom: 'Room 302',
          created_at: new Date().toISOString()
        };

        if (supabaseClient) {
          try {
            await supabaseClient.from('sensor_readings').insert([payload]);
          } catch (e) {
            console.warn(e);
          }
        }

        handleIncomingReading(payload, !!supabaseClient);
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
