(function () {
  const ADAPTER_BASE = "http://127.0.0.1:8765";
  const ADAPTER_ID = "smart-glasses-mock";

  const COMMANDS = [
    {
      label: "Kopf nach hinten",
      file: "../backend/vestibular-basic/assets/head-back-ger.mp3",
      axis: "pitch",
      dir: +1
    },
    {
      label: "Kopf nach vorne",
      file: "../backend/vestibular-basic/assets/head-forward-ger.mp3",
      axis: "pitch",
      dir: -1
    },
    {
      label: "Blick nach links",
      file: "../backend/vestibular-basic/assets/look-left.mp3",
      axis: "yaw",
      dir: -1
    }
  ];

  function createModule() {
    let intervalId = null;
    let current = null;
    let running = false;
    let successes = 0;
    let attempts = 0;

    function render(container, config, onComplete) {
      container.innerHTML = `
        <div class="grid">
          <div>Status: <strong id="status">bereit</strong></div>
          <div>Erfolgreich: <strong id="score">0</strong></div>
          <div>Versuche: <strong id="tries">0</strong></div>
        </div>
        <div style="margin-top: 10px;">
          <button class="primary focus-ring" id="start">Start</button>
          <button class="secondary focus-ring" id="stop">Stop</button>
        </div>
        <div id="feedback" style="margin-top: 10px;"></div>
      `;

      const statusEl = container.querySelector("#status");
      const scoreEl = container.querySelector("#score");
      const triesEl = container.querySelector("#tries");
      const feedbackEl = container.querySelector("#feedback");
      const btnStart = container.querySelector("#start");
      const btnStop = container.querySelector("#stop");

      btnStart.addEventListener("click", async () => {
        if (running) return;
        running = true;
        statusEl.textContent = "läuft";
        feedbackEl.textContent = "";
        try {
          await fetch(`${ADAPTER_BASE}/adapters/${ADAPTER_ID}/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
        } catch (e) {
          feedbackEl.textContent = "Adapter nicht erreichbar.";
          running = false;
          statusEl.textContent = "bereit";
          return;
        }
        nextCommand(statusEl, feedbackEl, scoreEl, triesEl, config);
      });

      btnStop.addEventListener("click", () => {
        stopLoop(statusEl);
      });
    }

    function stopLoop(statusEl) {
      running = false;
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (statusEl) statusEl.textContent = "bereit";
    }

    function nextCommand(statusEl, feedbackEl, scoreEl, triesEl, config) {
      if (!running) return;
      current = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
      attempts += 1;
      triesEl.textContent = String(attempts);
      feedbackEl.textContent = `Anweisung: ${current.label}`;

      const audio = new Audio(current.file);
      audio.play().catch(() => {
        // ignore audio errors
      });

      const thresholdYaw = config.thresholdYaw || 10;
      const thresholdPitch = config.thresholdPitch || 8;

      let elapsed = 0;
      const pollMs = config.pollMs || 500;

      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(async () => {
        elapsed += pollMs;
        try {
          const res = await fetch(`${ADAPTER_BASE}/adapters/${ADAPTER_ID}/read`);
          const data = await res.json();
          const state = data && data.state ? data.state : {};
          const yaw = Number(state["imu.yaw"] || 0);
          const pitch = Number(state["imu.pitch"] || 0);

          let ok = false;
          if (current.axis === "yaw") {
            ok = current.dir < 0 ? yaw <= -thresholdYaw : yaw >= thresholdYaw;
          }
          if (current.axis === "pitch") {
            ok = current.dir < 0 ? pitch <= -thresholdPitch : pitch >= thresholdPitch;
          }

          if (ok) {
            successes += 1;
            scoreEl.textContent = String(successes);
            feedbackEl.textContent = "Bewegung erkannt.";
            clearInterval(intervalId);
            intervalId = null;
            setTimeout(() => nextCommand(statusEl, feedbackEl, scoreEl, triesEl, config), 800);
          }
        } catch (e) {
          feedbackEl.textContent = "Lesen vom Adapter fehlgeschlagen.";
        }

        if (elapsed >= 3000) {
          clearInterval(intervalId);
          intervalId = null;
          feedbackEl.textContent = "Nicht erkannt.";
          setTimeout(() => nextCommand(statusEl, feedbackEl, scoreEl, triesEl, config), 800);
        }
      }, pollMs);
    }

    function cleanup() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    }

    return { render, cleanup };
  }

  window.ModuleRegistry.register("vestibular-basic", createModule);
})();

