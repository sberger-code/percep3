// Simple in-memory state + localStorage persistence
const STORAGE_KEY = "percep3_progress_v1";

const state = {
  view: "home",
  progress: loadProgress(),
  manifest: null,
  modulesById: {},
  moduleDefsById: {},
  moduleList: [],
  loading: false,
  adapter: {
    list: [],
    states: {},
    polling: {}
  },
  adapterError: ""
};

const viewEl = document.getElementById("view");
const tabsEl = document.getElementById("tabs");

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.modules ? parsed : { modules: {}, lastDone: "" };
  } catch {
    return { modules: {}, lastDone: "" };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function markDone(moduleId) {
  state.progress.modules[moduleId] = (state.progress.modules[moduleId] || 0) + 1;
  state.progress.lastDone = new Date().toISOString();
  saveProgress();
  render();
}

function render() {
  const view = state.view;
  if (view === "home") return renderHome();
  if (view.startsWith("module:")) return renderModuleFromManifest(view.slice(7));
  if (view === "progress") return renderProgress();
}

function renderHome() {
  const moduleButtons = state.moduleList.map((m) => {
    return `<button class="primary focus-ring" onclick="setView('module:${m.id}')">${m.title}</button>`;
  }).join("");

  viewEl.innerHTML = `
    <section class="card">
      <h2>Willkommen</h2>
      <p>Wähle ein Modul, absolviere eine kurze Aufgabe und markiere sie als erledigt.</p>
      <div class="row">
        ${moduleButtons || "<span>Keine Module gefunden.</span>"}
      </div>
    </section>
  `;
}

let activeModule = null;
let activeModuleId = "";
let renderToken = 0;

function renderModuleFromManifest(moduleId) {
  const moduleEntry = state.modulesById[moduleId];

  if (!moduleEntry) {
    viewEl.innerHTML = `
      <section class="card">
        <h2>Modul nicht verfügbar</h2>
        <p>Für diesen Bereich ist noch kein Modul registriert.</p>
      </section>
    `;
    return;
  }

  viewEl.innerHTML = `
    <section class="card">
      <h2>${moduleEntry.title}</h2>
      <p>Modul wird geladen…</p>
      <div id="task"></div>
    </section>
  `;

  const token = ++renderToken;
  loadAndRenderModule(moduleEntry, moduleId, token);
}

async function loadAndRenderModule(moduleEntry, moduleId, token) {
  try {
    state.loading = true;
    const def = state.moduleDefsById[moduleId] ? 
		state.moduleDefsById[moduleId] :
		await window.ModuleLoader.loadModuleDefinition(moduleEntry.entry);
    state.moduleDefsById[moduleId] = def;
    await window.ModuleLoader.loadModuleScript(def.entryScript);
    if (token !== renderToken) return;

    if (activeModule && typeof activeModule.cleanup === "function") {
      activeModule.cleanup();
    }

    activeModuleId = def.id;
    activeModule = window.ModuleRegistry.create(def.id);

    const task = document.getElementById("task");
    task.innerHTML = "";

    const intro = def.steps?.find((s) => s.type === "intro");
    if (intro?.text) {
      const p = document.createElement("p");
      p.textContent = intro.text;
      task.appendChild(p);
    }

    const taskHost = document.createElement("div");
    task.appendChild(taskHost);

    const doneRow = document.createElement("div");
    doneRow.className = "row";
    doneRow.style.marginTop = "12px";
    doneRow.innerHTML = `
      <button class="primary focus-ring" id="mark-done">${def.ui?.completeLabel || "Mark Done"}</button>
      <button class="secondary focus-ring" id="view-progress">Fortschritt anzeigen</button>
    `;
    task.appendChild(doneRow);

    task.querySelector("#mark-done").addEventListener("click", () => markDone(moduleId));
    task.querySelector("#view-progress").addEventListener("click", () => setView("progress"));

    const step = def.steps?.find((s) => s.type === "task") || { params: {} };
    if (activeModule && typeof activeModule.render === "function") {
      activeModule.render(taskHost, step.params || {}, () => markDone(moduleId));
    }
  } catch (err) {
    viewEl.innerHTML = `
      <section class="card">
      <h2>Laden fehlgeschlagen</h2>
      <p>${err.message}</p>
    </section>
  `;
  } finally {
    state.loading = false;
  }
}

function renderProgress() {
  const { modules, lastDone } = state.progress;
  const rows = state.moduleList.map((m) => {
    const count = modules[m.id] || 0;
    return `<div>${m.title}: <strong>${count}</strong></div>`;
  }).join("");
  viewEl.innerHTML = `
    <section class="card">
      <h2>Fortschritt</h2>
      <div class="grid">
        ${rows || "<div>Keine Module vorhanden.</div>"}
        <div>Zuletzt erledigt: <strong>${lastDone ? new Date(lastDone).toLocaleString() : "-"}</strong></div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <button class="secondary focus-ring" onclick="resetProgress()">Zurücksetzen</button>
      </div>
    </section>
    <section class="card" style="margin-top: 12px;">
      <h2>Adapter-Status (Lokal)</h2>
      <div class="row" style="margin-top: 6px;">
        <button class="secondary focus-ring" onclick="refreshAdapters()">Adapter aktualisieren</button>
      </div>
      <div id="adapter-status"></div>
    </section>
  `;
  renderAdapterStatusPanels();
}

function renderTabs() {
  if (!tabsEl) return;
  tabsEl.innerHTML = "";
  const addTab = (label, view) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.view = view;
    btn.textContent = label;
    btn.setAttribute("aria-selected", state.view === view ? "true" : "false");
    btn.addEventListener("click", () => {
      state.view = view;
      renderTabs();
      render();
    });
    tabsEl.appendChild(btn);
  };

  addTab("Start", "home");
  state.moduleList.forEach((m) => addTab(m.title, `module:${m.id}`));
  addTab("Fortschritt", "progress");
}

function resetProgress() {
  state.progress = { modules: {}, lastDone: "" };
  saveProgress();
  render();
}

function setView(view) {
  state.view = view;
  renderTabs();
  render();
}

function renderAdapterStatusPanels() {
  const el = document.getElementById("adapter-status");
  if (!el) return;
  if (state.adapter.list.length === 0) {
    el.innerHTML = `<p>Keine Adapter gefunden. Stelle sicher, dass der lokale Dienst läuft.</p>`;
    return;
  }
  const panels = state.adapter.list.map((a) => {
    const s = state.adapter.states[a.id] || {
      connected: false,
      lastState: null,
      error: ""
    };
    const polling = !!state.adapter.polling[a.id];
    return `
      <section class="card" style="margin-top: 10px;">
        <div class="grid">
          <div>Adapter-ID: <strong>${a.id}</strong></div>
          <div>Name: <strong>${a.name || "-"}</strong></div>
          <div>Version: <strong>${a.version || "-"}</strong></div>
          <div>Verbunden: <strong>${s.connected ? "ja" : "nein"}</strong></div>
          <div>Polling: <strong>${polling ? "ja" : "nein"}</strong></div>
          <div>Fehler: <strong>${s.error || "-"}</strong></div>
        </div>
        <div class="row" style="margin-top: 8px;">
          <button class="secondary focus-ring" onclick="adapterDiscover('${a.id}')">Suchen</button>
          <button class="secondary focus-ring" onclick="adapterConnect('${a.id}')">Verbinden</button>
          <button class="secondary focus-ring" onclick="adapterStartPolling('${a.id}')">Polling starten</button>
          <button class="secondary focus-ring" onclick="adapterStopPolling('${a.id}')">Polling stoppen</button>
        </div>
        <div style="margin-top: 8px;">
          <div>Letzter Status:</div>
          <pre style="white-space: pre-wrap; background: #f1ece3; padding: 8px; border-radius: 8px; margin: 6px 0 0;">${s.lastState ? JSON.stringify(s.lastState, null, 2) : "-"}</pre>
        </div>
      </section>
    `;
  }).join("");

  const errorLine = state.adapterError ? `<p>${state.adapterError}</p>` : "";
  el.innerHTML = `${errorLine}${panels}`;
}

async function refreshAdapters() {
  try {
    state.adapterError = "";
    const res = await fetch("http://127.0.0.1:8765/adapters");
    const data = await res.json();
    state.adapter.list = Array.isArray(data) ? data : [];
  } catch (e) {
    state.adapterError = e.message || String(e);
  }
  renderAdapterStatusPanels();
}

async function adapterDiscover(adapterId) {
  try {
    const s = ensureAdapterState(adapterId);
    s.error = "";
    const res = await fetch(`http://127.0.0.1:8765/adapters/${adapterId}/discover`, {
      method: "POST"
    });
    const data = await res.json();
    s.lastState = data;
  } catch (e) {
    const s = ensureAdapterState(adapterId);
    s.error = e.message || String(e);
  }
  renderAdapterStatusPanels();
}

async function adapterConnect(adapterId) {
  try {
    const s = ensureAdapterState(adapterId);
    s.error = "";
    const res = await fetch(`http://127.0.0.1:8765/adapters/${adapterId}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await res.json();
    s.connected = !!data.connected;
    s.lastState = data;
  } catch (e) {
    const s = ensureAdapterState(adapterId);
    s.error = e.message || String(e);
  }
  renderAdapterStatusPanels();
}

async function adapterReadOnce(adapterId) {
  const res = await fetch(`http://127.0.0.1:8765/adapters/${adapterId}/read`);
  const data = await res.json();
  const s = ensureAdapterState(adapterId);
  s.lastState = data;
  if (data && data.error) {
    s.connected = false;
  }
}

function adapterStartPolling(adapterId) {
  if (state.adapter.polling[adapterId]) return;
  state.adapter.polling[adapterId] = setInterval(async () => {
    try {
      const s = ensureAdapterState(adapterId);
      s.error = "";
      await adapterReadOnce(adapterId);
    } catch (e) {
      const s = ensureAdapterState(adapterId);
      s.error = e.message || String(e);
    }
    renderAdapterStatusPanels();
  }, 1500);
  renderAdapterStatusPanels();
}

function adapterStopPolling(adapterId) {
  const t = state.adapter.polling[adapterId];
  if (t) clearInterval(t);
  delete state.adapter.polling[adapterId];
  renderAdapterStatusPanels();
}

function ensureAdapterState(adapterId) {
  if (!state.adapter.states[adapterId]) {
    state.adapter.states[adapterId] = {
      connected: false,
      lastState: null,
      error: ""
    };
  }
  return state.adapter.states[adapterId];
}

async function init() {
  try {
    state.manifest = await window.ModuleLoader.loadModuleManifest();
    state.modulesById = Object.fromEntries(
      (state.manifest.modules || []).map((m) => [m.id, m])
    );
    const defs = await Promise.all(
      (state.manifest.modules || []).map(async (m) => {
        try {
          const def = await window.ModuleLoader.loadModuleDefinition(m.entry);
          state.moduleDefsById[m.id] = def;
          return { id: m.id, title: def.title || m.title || m.id };
        } catch {
          return { id: m.id, title: m.title || m.id };
        }
      })
    );
    state.moduleList = defs;
  } catch {
    state.manifest = { modules: [] };
    state.modulesById = {};
    state.moduleDefsById = {};
    state.moduleList = [];
  }
  refreshAdapters();
  renderTabs();
  render();
}

init();
