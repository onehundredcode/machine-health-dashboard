import { machines as seedMachines } from "/src/data/machines.js";

console.log("Seed machines:", seedMachines);

/**
 * PressWatch (vanilla) — dashboard + modern table + details drawer
 * Data source: local JS module (seedMachines)
 */

const state = {
  machines: [...seedMachines],
  statusFilter: "All",
  searchQuery: "",
  sortMode: "health-desc"
};

// --- DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));


const els = {
  searchInput: $("#searchInput"),
  sortSelect: $("#sortSelect"),
  drawerCloseBtn: $("#drawerCloseBtn"),
  backdrop: $("#backdrop"),
  refreshBtn: $("#refreshBtn"),
  filterChips: $$(".chip--select"),
  kpiTotal: $('#kpiTotal'),
  kpiHealthy: $('#kpiHealthy'),
  kpiWarning: $('#kpiWarning'),
  kpiDown: $('#kpiDown'),
  kpiDueSoon: $('#kpiDueSoon'),
  tableMeta: $("#tableMeta"),
  machinesTbody: $("#machinesTbody"),
  drawer: $("#drawer"),
  drawerTitle: $("#drawerTitle"),
  drawerSubtitle: $("#drawerSubtitle"),
  drawerBody: $("#drawerBody"),
};




// 🔍 DEBUG: log missing elements
Object.entries(els).forEach(([key, val]) => {
  if (!val || (Array.isArray(val) && val.length === 0)) {
    console.warn(`❌ Missing DOM element: ${key}`);
  } else {
    console.log(`✅ Found DOM element: ${key}`);
  }
});


/* old els object 

const els = {
  kpiTotal: $("#kpiTotal"),
  kpiHealthy: $("#kpiHealthy"),
  kpiWarning: $("#kpiWarning"),
  kpiDown: $("#kpiDown"),
  kpiDueSoon: $("#kpiDueSoon"),

  alertsMeta: $("#alertsMeta"),
  criticalAlerts: $("#criticalAlerts"),

  dueMeta: $("#dueMeta"),
  dueSoonList: $("#dueSoonList"),

  tableMeta: $("#tableMeta"),
  machinesTbody: $("#machinesTbody"),

  searchInput: $("#searchInput"),
  sortSelect: $("#sortSelect"),
  filterChips: $$(".chip--select"),

  refreshBtn: $("#refreshBtn"),

  drawer: $("#drawer"),
  backdrop: $("#backdrop"),
  drawerCloseBtn: $("#drawerCloseBtn"),
  drawerTitle: $("#drawerTitle"),
  drawerSubtitle: $("#drawerSubtitle"),
  drawerBody: $("#drawerBody")
};

*/

// --- Utilities
function parseISO(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();
  const target = parseISO(dateStr);
  return Math.ceil((target - now) / msPerDay);
}

function byCriticalityRank(crit) {
  const map = { High: 3, Medium: 2, Low: 1 };
  return map[crit] ?? 0;
}

function statusBadge(status) {
  return `
    <span class="badge badge--${status}">
      <span class="dot"></span>
      ${status}
    </span>
  `;
}

function criticalityTag(crit) {
  return `<span class="tag tag--${crit}">${crit}</span>`;
}

function healthBar(score) {
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  return `
    <div class="health">
      <div class="bar" aria-label="Health bar">
        <div class="fill" style="width:${safe}%"></div>
      </div>
      <div class="score">${safe}</div>
    </div>
  `;
}

function formatDue(dateStr) {
  if (!dateStr) return "—";
  const du = daysUntil(dateStr);
  if (du < 0) return `${dateStr} (overdue)`;
  if (du <= 14) return `${dateStr} (due soon)`;
  return dateStr;
}

function matchesSearch(m, q) {
  if (!q) return true;
  const hay = `${m.name} ${m.type} ${m.location}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function sortMachines(list, mode) {
  const copy = [...list];
  switch (mode) {
    case "health-asc":
      return copy.sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0));
    case "due-asc":
      return copy.sort((a, b) => daysUntil(a.nextMaintenanceDue) - daysUntil(b.nextMaintenanceDue));
    case "criticality-desc":
      return copy.sort((a, b) => byCriticalityRank(b.criticality) - byCriticalityRank(a.criticality));
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "health-desc":
    default:
      return copy.sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));
  }
}

// --- Derived views
function getFilteredMachines() {
  const { machines, statusFilter, searchQuery, sortMode } = state;

  const filtered = machines
    .filter((m) => (statusFilter === "All" ? true : m.status === statusFilter))
    .filter((m) => matchesSearch(m, searchQuery));

  return sortMachines(filtered, sortMode);
}

// --- Render: KPIs
function renderKPIs() {
  const ms = state.machines;
  const total = ms.length;
  const healthy = ms.filter((m) => m.status === "Healthy").length;
  const warning = ms.filter((m) => m.status === "Warning").length;
  const down = ms.filter((m) => m.status === "Down").length;

  const dueSoon = ms.filter((m) => daysUntil(m.nextMaintenanceDue) <= 14).length;

  els.kpiTotal.textContent = total;
  els.kpiHealthy.textContent = healthy;
  els.kpiWarning.textContent = warning;
  els.kpiDown.textContent = down;
  els.kpiDueSoon.textContent = dueSoon;
}

// --- Render: Alerts panel
function renderCriticalAlerts() {
  const ms = [...state.machines];

  // "Critical" = Down OR (Warning + High criticality) OR (alerts exist + High)
  const critical = ms
    .filter((m) => m.status === "Down" || (m.status === "Warning" && m.criticality === "High") || (m.alerts?.length && m.criticality === "High"))
    .sort((a, b) => {
      // Down first, then lowest health
      const aDown = a.status === "Down" ? 1 : 0;
      const bDown = b.status === "Down" ? 1 : 0;
      if (bDown !== aDown) return bDown - aDown;
      return (a.healthScore ?? 0) - (b.healthScore ?? 0);
    })
    .slice(0, 5);

  els.alertsMeta.textContent = `${critical.length} shown`;

  if (critical.length === 0) {
    els.criticalAlerts.innerHTML = `<div class="smallMuted">No critical alerts right now.</div>`;
    return;
  }

  els.criticalAlerts.innerHTML = `
    <div class="list">
      ${critical
        .map((m) => {
          const alertText = (m.alerts && m.alerts.length > 0) ? m.alerts[0] : "No alert details";
          return `
            <div class="item" data-open="${m.id}">
              <div class="item__main">
                <div class="item__title">${m.name}</div>
                <div class="item__sub">${statusBadge(m.status)} <span style="margin-left:8px;color:rgba(255,255,255,0.55)">•</span> ${alertText}</div>
              </div>
              <div class="item__meta">${m.lastInspectionDate ?? "—"}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  // Attach click handlers
  $$("#criticalAlerts .item").forEach((el) => {
    el.addEventListener("click", () => openDrawer(el.dataset.open));
  });
}

// --- Render: Due soon panel
function renderDueSoon() {
  const ms = [...state.machines]
    .filter((m) => daysUntil(m.nextMaintenanceDue) <= 14)
    .sort((a, b) => daysUntil(a.nextMaintenanceDue) - daysUntil(b.nextMaintenanceDue))
    .slice(0, 6);

  els.dueMeta.textContent = `${ms.length} shown`;

  if (ms.length === 0) {
    els.dueSoonList.innerHTML = `<div class="smallMuted">No maintenance due in the next 14 days.</div>`;
    return;
  }

  els.dueSoonList.innerHTML = `
    <div class="list">
      ${ms
        .map((m) => {
          return `
            <div class="item" data-open="${m.id}">
              <div class="item__main">
                <div class="item__title">${m.name}</div>
                <div class="item__sub">${m.location}</div>
              </div>
              <div class="item__meta">${formatDue(m.nextMaintenanceDue)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  $$("#dueSoonList .item").forEach((el) => {
    el.addEventListener("click", () => openDrawer(el.dataset.open));
  });
}

// --- Render: Table
function renderTable() {
  const rows = getFilteredMachines();
  els.tableMeta.textContent = `${rows.length} of ${state.machines.length}`;

  if (rows.length === 0) {
    els.machinesTbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="smallMuted" style="padding:10px 2px">
            No machines match your filters.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  els.machinesTbody.innerHTML = rows
    .map((m) => {
      const rowClass =
        m.status === "Down" ? "row row--Down" :
        m.status === "Warning" ? "row row--Warning" :
        "row";

      const alertsCount = m.alerts?.length ?? 0;
      const alertsLabel = alertsCount === 1 ? "1 alert" : `${alertsCount} alerts`;

      return `
        <tr class="${rowClass}" data-open="${m.id}">
          <td>
            <div class="machineTitle">${m.name}</div>
            <div class="machineSub">${m.type} • ${m.location}</div>
          </td>
          <td>${statusBadge(m.status)}</td>
          <td>${healthBar(m.healthScore)}</td>
          <td>${criticalityTag(m.criticality)}</td>
          <td>${formatDue(m.nextMaintenanceDue)}</td>
          <td><span class="tag">${alertsLabel}</span></td>
          <td style="text-align:right">
            <button class="linkBtn" data-openbtn="${m.id}" type="button">View</button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Row click opens drawer (ignore clicking the button which also opens it)
  $$("#machinesTbody tr").forEach((tr) => {
    tr.addEventListener("click", () => openDrawer(tr.dataset.open));
  });

  $$("#machinesTbody [data-openbtn]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("View clicked:", btn.dataset.openbtn);
    openDrawer(btn.dataset.openbtn);
  });
});


  /*
  $$("#machinesTbody [data-openbtn]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDrawer(btn.dataset.openbtn);
    });
  });
  */
}

// --- Drawer
function openDrawer(machineId) {
  console.log("Drawer element:" , els.drawer);
  const m = state.machines.find((x) => x.id === machineId);
  if (!m) return;

  els.drawerTitle.textContent = m.name;
  els.drawerSubtitle.textContent = `${m.type} • ${m.location}`;

  const alerts = (m.alerts && m.alerts.length)
    ? `<ul style="margin:10px 0 0 18px; color: rgba(255,255,255,0.78);">
        ${m.alerts.map((a) => `<li style="margin:6px 0">${a}</li>`).join("")}
      </ul>`
    : `<div class="smallMuted" style="margin-top:8px">No active alerts.</div>`;

  const sensor = [
    ["Temperature (°F)", m.temperatureF],
    ["Vibration (mm/s)", m.vibrationMmS],
    ["Pressure (psi)", m.pressurePsi],
    ["Runtime (hrs)", m.runtimeHours]
  ];

els.drawerBody.innerHTML = `

  <!-- Summary Strip -->
  <div class="drawerSummary drawerSummary--${m.status}">

    <div class="drawerSummary__item">
      <span class="drawerSummary__label">Status</span>
      <span class="drawerSummary__value">${statusBadge(m.status)}</span>
    </div>



    <div class="drawerSummary__item">
      <span class="drawerSummary__label">Health</span>
      <span class="drawerSummary__value">${m.healthScore ?? "—"}</span>
    </div>

  </div>


  <!-- AI Health Summary (Primary Section) -->
  <div>
    <div style="drawerSectionTitle">
      AI Health Summary
    </div>
    <div class="aiSummary">
      ${generateAISummary(m)}
    </div>
  </div>

  <hr class="sep" />

  <!-- Alerts -->
  <div>
    <div style="drawerSectionTitle">
      Alerts
    </div>
    ${alerts}
  </div>

  <hr class="sep" />

  <!-- Sensor Snapshot -->
  <div>
  
    <div class="smallMuted" style="line-height:1.6;">
      ${sensor
        .map(([label, val]) =>
          `${label}: <span style="color:rgba(255,255,255,0.9); font-weight:700;">${val ?? "—"}</span>`
        )
        .join("<br/>")}
    </div>
  </div>

  <hr class="sep" />


  <!-- Manufacturer + Maintenance Info -->
  <div>


    <div class="smallMuted" style="line-height:1.7;">
      Manufacturer: 
        <span style="color:rgba(255,255,255,0.92); font-weight:700;">
          ${m.manufacturer ?? "—"}
        </span>
      <br/>

      Last Inspection: 
        <span style="color:rgba(255,255,255,0.92); font-weight:700;">
          ${m.lastInspectionDate ?? "—"}
        </span>
      <br/>

      Next Maintenance Due: 
        <span style="color:rgba(255,255,255,0.92); font-weight:700;">
          ${formatDue(m.nextMaintenanceDue)}
        </span>
      <br/>

      Last Maintenance Note: 
        <span style="color:rgba(255,255,255,0.92); font-weight:700;">
          ${m.lastMaintenanceNote ?? "—"}
        </span>
    </div>
  </div>


`;


  els.drawer.classList.add("drawer--open");
  els.drawer.setAttribute("aria-hidden", "false");
  els.backdrop.hidden = false;

  console.log("Drawer class list:", els.drawer.classList);

}

function closeDrawer() {
  els.drawer.classList.remove("drawer--open");
  els.drawer.setAttribute("aria-hidden", "true");
  els.backdrop.hidden = true;
}


function setChipPressed(activeStatus) {
  if (!els.filterChips) return;

  els.filterChips.forEach((chip) => {
    const pressed = chip.dataset.status === activeStatus;
    chip.setAttribute("aria-pressed", pressed ? "true" : "false");
  });
}


// --- Events
function bindEvents() {
  // Filter chips
  if (els.filterChips && els.filterChips.length) {
    setChipPressed(state.statusFilter);

    els.filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        state.statusFilter = chip.dataset.status;
        setChipPressed(state.statusFilter);
        renderTable();
      });
    });
  }

  // Search
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      renderTable();
    });
  }

  // Sort
  if (els.sortSelect) {
    els.sortSelect.addEventListener("change", (e) => {
      state.sortMode = e.target.value;
      renderTable();
    });
  }

  // Drawer controls
  if (els.drawerCloseBtn) {
    els.drawerCloseBtn.addEventListener("click", closeDrawer);
  }

  if (els.backdrop) {
    els.backdrop.addEventListener("click", closeDrawer);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Refresh (optional)
  if (els.refreshBtn) {
    els.refreshBtn.addEventListener("click", renderAll);
  }
}



  // Default selection
  setChipPressed(state.statusFilter);

  els.filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.statusFilter = chip.dataset.status;
      setChipPressed(state.statusFilter);
      renderTable();
    });
  });

  els.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim();
    renderTable();
  });

  els.sortSelect.addEventListener("change", (e) => {
    state.sortMode = e.target.value;
    renderTable();
  });

  els.drawerCloseBtn.addEventListener("click", closeDrawer);
  els.backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  els.refreshBtn.addEventListener("click", () => {
    // In a real app this could refetch; here we re-render.
    renderAll();
  });


// --- Render all
function renderAll() {
  renderKPIs();
  renderTable();
}

function generateAISummary(machine) {
  const riskLevel =
    machine.status === "Down" ? "high" :
    machine.healthScore < 60 ? "high" :
    machine.healthScore < 80 ? "moderate" :
    "low";

  const urgency =
    daysUntil(machine.nextMaintenanceDue) <= 7 ? "urgent" :
    daysUntil(machine.nextMaintenanceDue) <= 14 ? "soon" :
    "routine";

  const vibrationFlag = machine.vibrationMmS > 6 ? "elevated vibration" : null;
  const tempFlag = machine.temperatureF > 200 ? "high operating temperature" : null;
  const pressureFlag = machine.pressurePsi && machine.pressurePsi > 2500 ? "pressure instability" : null;

  const signals = [vibrationFlag, tempFlag, pressureFlag].filter(Boolean);

  return `
    ${machine.name} is currently operating under a ${machine.status} status 
    with a health score of ${machine.healthScore}. 
    ${signals.length ? `Detected ${signals.join(", ")}.` : ""}
    Given its ${machine.criticality} criticality rating, 
    this machine presents ${riskLevel} operational risk. 
    Recommended maintenance priority is ${urgency}.
  `;
}


// --- Init
bindEvents();
renderAll();
