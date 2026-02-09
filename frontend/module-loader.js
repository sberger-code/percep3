const ModuleRegistry = (function () {
  const modules = {};
  return {
    register(id, factory) {
      modules[id] = factory;
    },
    create(id) {
      return modules[id] ? modules[id]() : null;
    }
  };
})();

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

async function loadModuleManifest() {
  return fetchJson("../backend/manifest.json");
}

async function loadModuleDefinition(entryUrl) {
  return fetchJson(entryUrl);
}

async function loadModuleScript(scriptUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${scriptUrl}`));
    document.head.appendChild(script);
  });
}

window.ModuleRegistry = ModuleRegistry;
window.ModuleLoader = {
  loadModuleManifest,
  loadModuleDefinition,
  loadModuleScript
};
