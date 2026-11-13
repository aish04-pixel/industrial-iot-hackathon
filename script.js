
// WIREDMINDS - ROV MONITORING DASHBOARD
// LIVE MQTT SENSOR TELEMETRY

const $ = (id) => document.getElementById(id);

const state = {
  pressure: 1800,
  moisture: 700,
  communicationFault: false,
  relayActive: false,
  selectedDevice: "ESP32",
  commandLog: [],
  alerts: []
};

const devices = [
  { id: "PRS-001", name: "Hull Pressure Sensor", type: "Pressure", value: "1800 ADC", status: "Healthy" },
  { id: "MST-001", name: "Moisture Sensor", type: "Leak detection", value: "700 ADC", status: "Healthy" },
  { id: "COM-001", name: "Communication Link", type: "Communication", value: "Connected", status: "Healthy" },
  { id: "RLY-001", name: "Ballast Purge Relay", type: "Emergency", value: "Standby", status: "Healthy" },
  { id: "ESP-001", name: "ESP32 Controller", type: "Controller", value: "Online", status: "Healthy" }
];

let toastTimer;

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

// NAVIGATION

function navigate(view) {
  const page = $(view + "View");
  if (!page) return;

  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("active-page")
  );

  page.classList.add("active-page");

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === view
    );
  });

  const names = {
    overview: "Overview",
    devices: "Sensors & Devices",
    analytics: "ROV Analytics",
    alerts: "Alerts & Events",
    controls: "Emergency Control",
    settings: "System Settings"
  };

  if ($("breadcrumbCurrent")) {
    $("breadcrumbCurrent").textContent = names[view] || view;
  }

  $("sidebar")?.classList.remove("sidebar-open");

  if (view === "analytics") drawAnalyticsChart();
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.view);
  });
});

$("mobileMenu")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("sidebar-open");
});

// SENSOR STATUS

function getPressureStatus() {
  if (state.pressure >= 3500) return "Critical";
  if (state.pressure >= 2500) return "Warning";
  return "Healthy";
}

function getMoistureStatus() {
  return state.moisture >= 2500 ? "Critical" : "Healthy";
}

function isEmergency() {
  return state.pressure >= 3500 || state.moisture >= 2500;
}

function updateDashboard() {
  const pressureStatus = getPressureStatus();
  const moistureStatus = getMoistureStatus();

  devices[0].value = state.pressure + " ADC";
  devices[0].status = pressureStatus;

  devices[1].value = state.moisture + " ADC";
  devices[1].status = moistureStatus;

  devices[2].value = state.communicationFault
    ? "Fault"
    : "Connected";

  devices[2].status = state.communicationFault
    ? "Critical"
    : "Healthy";

  devices[3].value = state.relayActive
    ? "Activated"
    : "Standby";

  devices[3].status = state.relayActive
    ? "Warning"
    : "Healthy";

  devices[4].value = "Online";

  if ($("totalDevices")) $("totalDevices").textContent = "05";

  if ($("onlineDevices")) {
    $("onlineDevices").textContent =
      state.communicationFault ? "04" : "05";
  }

  if ($("activeAlerts")) {
    $("activeAlerts").textContent = String(
      state.alerts.filter(a => a.active).length
    ).padStart(2, "0");
  }

  if ($("chartCurrent")) {
    $("chartCurrent").textContent = state.pressure + " ADC";
  }

  if ($("lastUpdated")) {
    $("lastUpdated").textContent = "just now";
  }

  renderDeviceTable();
  renderDeviceCards();
  renderAlerts();
  renderControlDevices();
  updateRovLabels();
}

function updateRovLabels() {
  const headings = document.querySelectorAll(".page-heading h1");

  if (headings[0]) headings[0].textContent = "ROV Operations Overview";
  if (headings[1]) headings[1].textContent = "Sensor Registry";
  if (headings[2]) headings[2].textContent = "ROV Analytics";
  if (headings[3]) headings[3].textContent = "Alerts & Emergency Events";
  if (headings[4]) headings[4].textContent = "Emergency Ballast Control";

  const eyebrow = document.querySelector(".topbar .breadcrumb");
  if (eyebrow) eyebrow.firstChild.textContent = "ROV / ";

  const chartTitle = document.querySelector(".chart-panel h2");
  if (chartTitle) chartTitle.textContent = "Hull pressure telemetry";

  const healthTitle = document.querySelector(".health-panel h2");
  if (healthTitle) healthTitle.textContent = "ROV system health";
}

// DEVICE TABLE

function renderDeviceTable() {
  const body = $("deviceTableBody");
  if (!body) return;

  body.innerHTML = devices.map(device => `
    <tr>
      <td><strong>${device.name}</strong><br><small>${device.id}</small></td>
      <td>${device.type}</td>
      <td>${device.value}</td>
      <td><span class="status-pill status-${device.status.toLowerCase()}">${device.status}</span></td>
    </tr>
  `).join("");
}

// DEVICE CARDS

function renderDeviceCards() {
  const container = $("deviceCards");
  if (!container) return;

  const search = ($("deviceSearch")?.value || "").toLowerCase();
  const filter = $("statusFilter")?.value || "all";

  const filtered = devices.filter(device => {
    const matchesSearch =
      device.name.toLowerCase().includes(search) ||
      device.id.toLowerCase().includes(search);

    const matchesStatus =
      filter === "all" || device.status === filter;

    return matchesSearch && matchesStatus;
  });

  container.innerHTML = filtered.map(device => `
    <article class="panel device-card">
      <div class="panel-heading">
        <div>
          <h2>${device.name}</h2>
          <p>${device.id}</p>
        </div>
        <span class="status-pill status-${device.status.toLowerCase()}">
          ${device.status}
        </span>
      </div>
      <div class="stat-value">${device.value}</div>
      <p class="muted">${device.type}</p>
    </article>
  `).join("") || "<p>No matching sensors found.</p>";
}

$("deviceSearch")?.addEventListener("input", renderDeviceCards);
$("statusFilter")?.addEventListener("change", renderDeviceCards);

// ALERT SYSTEM

function addAlert(title, severity) {
  if (state.alerts.some(a => a.active && a.title === title)) return;

  state.alerts.unshift({
    id: Date.now(),
    title,
    severity,
    active: true
  });
}

function renderAlerts() {
  const active = state.alerts.filter(a => a.active);

  const critical = active.filter(
    a => a.severity === "Critical"
  ).length;

  const warning = active.filter(
    a => a.severity === "Warning"
  ).length;

  if ($("criticalCount")) $("criticalCount").textContent = critical;
  if ($("warningCount")) $("warningCount").textContent = warning;

  if ($("resolvedCount")) {
    $("resolvedCount").textContent =
      state.alerts.filter(a => !a.active).length;
  }

  if ($("activeAlerts")) {
    $("activeAlerts").textContent = String(active.length).padStart(2, "0");
  }

  if ($("allAlerts")) {
    const filter = $("alertFilter")?.value || "all";

    const filtered = state.alerts.filter(a =>
      filter === "all" ||
      (filter === "Active" && a.active) ||
      (filter === "Resolved" && !a.active)
    );

    $("allAlerts").innerHTML = filtered.map(a => `
      <div class="alert-item">
        <strong>${a.severity}: ${a.title}</strong>
        <span>${a.active ? "Active" : "Resolved"}</span>
        ${a.active
          ? `<button class="text-button" data-ack="${a.id}">Acknowledge</button>`
          : ""}
      </div>
    `).join("") || "<p>No alerts found.</p>";
  }

  if ($("recentAlerts")) {
    $("recentAlerts").innerHTML = active.slice(0, 4).map(a => `
      <div class="recent-alert">
        <strong>${a.title}</strong>
        <small>${a.severity}</small>
      </div>
    `).join("") || "<p>No active alerts.</p>";
  }

  document.querySelectorAll("[data-ack]").forEach(button => {
    button.addEventListener("click", () => {
      const alert = state.alerts.find(
        a => a.id === Number(button.dataset.ack)
      );

      if (alert) {
        alert.active = false;
        renderAlerts();
        updateDashboard();
        showToast("Alert acknowledged.");
      }
    });
  });

  const badge = document.querySelector(".alert-count");
  if (badge) badge.textContent = active.length;
}

$("alertFilter")?.addEventListener("change", renderAlerts);

$("clearResolvedBtn")?.addEventListener("click", () => {
  state.alerts = state.alerts.filter(a => a.active);
  renderAlerts();
  showToast("Resolved alert history cleared.");
});

// ANALYTICS CHART

function drawAnalyticsChart() {
  ["telemetryChart", "analyticsChart"].forEach(id => {
    const canvas = $(id);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 220;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    const values = Array.from({ length: 12 }, (_, i) =>
      state.pressure + Math.sin(i * 0.8) * 180
    );

    const min = 0;
    const max = 4095;

    ctx.strokeStyle = "#263449";
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = 15 + (height - 30) * i / 4;
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    ctx.beginPath();

    values.forEach((value, i) => {
      const x = 35 + (width - 50) * i / 11;
      const y = height - 15 -
        (value - min) / (max - min) * (height - 30);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#20c6b7";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
}

// REMOTE CONTROL

function renderControlDevices() {
  const container = $("controlDeviceList");
  if (!container) return;

  const controllable = devices.filter(d =>
    ["ESP32", "RLY-001"].includes(d.id)
  );

  container.innerHTML = controllable.map(d => `
    <button class="control-device-option"
      data-select-device="${d.id}">
      ${d.name} · ${d.value}
    </button>
  `).join("");

  container.querySelectorAll("[data-select-device]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedDevice = button.dataset.selectDevice;
      showToast("Selected " + state.selectedDevice);
    });
  });
}

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => {
    const command = button.dataset.command;

    // Demo-only: commands are not sent to physical machinery.
    if (command === "START" && isEmergency()) {
      showToast("Start blocked: emergency condition active.");
      return;
    }

    state.commandLog.unshift({
      command,
      time: new Date().toLocaleTimeString()
    });

    if ($("commandLog")) {
      $("commandLog").innerHTML = state.commandLog.map(c => `
        <div class="command-entry">
          <strong>${c.command}</strong>
          <small>${c.time} · SIMULATED</small>
        </div>
      `).join("");
    }

    showToast(command + " command simulated.");
  });
});

// ========================================
// WIREDMINDS - LIVE MQTT CONNECTION
// ========================================

const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_TOPIC = "wiredminds/rov/team01/telemetry";

let mqttClient = null;

function connectMQTT() {
  if (typeof mqtt === "undefined") {
    console.error("MQTT library not loaded. Check index.html.");
    showToast("MQTT library not loaded.");
    return;
  }

  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: "WiredMindsDashboard" + Math.random().toString(16).slice(2, 10),
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000
  });

  mqttClient.on("connect", () => {
    console.log("Connected to MQTT broker.");

    mqttClient.subscribe(MQTT_TOPIC, (error) => {
      if (error) {
        console.error("MQTT subscription failed:", error);
      } else {
        console.log("Subscribed to:", MQTT_TOPIC);
        showToast("Live MQTT connection established.");
      }
    });
  });

  mqttClient.on("message", (topic, message) => {
    if (topic !== MQTT_TOPIC) return;

    try {
      const data = JSON.parse(message.toString());

      const pressure = Number(data.pressure);
      const moisture = Number(data.moisture);

      if (!Number.isFinite(pressure) || !Number.isFinite(moisture)) {
        console.error("Invalid MQTT sensor values:", data);
        return;
      }

      state.pressure = Math.max(0, Math.min(4095, pressure));
      state.moisture = Math.max(0, Math.min(4095, moisture));

      state.communicationFault =
        data.communicationFault === true;

      if (typeof data.ballastPurge === "boolean") {
        state.relayActive = data.ballastPurge;
      } else if (typeof data.relayActive === "boolean") {
        state.relayActive = data.relayActive;
      } else {
        state.relayActive = isEmergency();
      }

      // Update alerts from live sensor values.
      syncLiveAlert(
        "Critical hull pressure detected",
        state.pressure >= 3500,
        "Critical"
      );

      syncLiveAlert(
        "Hull pressure warning",
        state.pressure >= 2500 && state.pressure < 3500,
        "Warning"
      );

      syncLiveAlert(
        "Water ingress detected",
        state.moisture >= 2500,
        "Critical"
      );

      syncLiveAlert(
        "Communication link failure",
        state.communicationFault,
        "Critical"
      );

      updateDashboard();
      drawAnalyticsChart();

      console.log("Live ESP32 data received:", data);

    } catch (error) {
      console.error("Could not process MQTT message:", error);
    }
  });

  mqttClient.on("error", (error) => {
    console.error("MQTT connection error:", error);
  });

  mqttClient.on("offline", () => {
    console.log("MQTT dashboard offline.");
  });

  mqttClient.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
  });
}

// Add or resolve live alerts.

function syncLiveAlert(title, condition, severity) {
  let alert = state.alerts.find(a => a.title === title);

  if (condition) {
    if (!alert) {
      addAlert(title, severity);
    } else {
      alert.active = true;
    }
  } else if (alert) {
    alert.active = false;
  }
}

// Connect website to MQTT broker.
connectMQTT();

// EXPORT REPORT

$("exportBtn")?.addEventListener("click", () => {
  const report = [
    "WIREDMINDS ROV SYSTEM REPORT",
    "Time: " + new Date().toLocaleString(),
    "Pressure ADC: " + state.pressure,
    "Moisture ADC: " + state.moisture,
    "Communication: " + (state.communicationFault ? "FAULT" : "NORMAL"),
    "Emergency purge: " + (state.relayActive ? "ACTIVE" : "STANDBY"),
    "Alerts: " + state.alerts.filter(a => a.active).length
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "WiredMinds-ROV-Report.txt";
  link.click();

  URL.revokeObjectURL(url);
});

// ADD DEVICE PLACEHOLDER

$("addDeviceBtn")?.addEventListener("click", () => {
  showToast("Device registration is a future integration.");
});

// INITIALIZE

updateDashboard();
drawAnalyticsChart();

window.addEventListener("resize", drawAnalyticsChart);

console.log("WiredMinds ROV dashboard initialized.");
