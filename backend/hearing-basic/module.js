(function () {
  function createModule() {
    let ctx = null;
    let osc = null;
    let gain = null;

    function render(container, config, onComplete) {
      const minHz = config.minHz || 200;
      const maxHz = config.maxHz || 1200;
      const startHz = config.startHz || 440;

      container.innerHTML = `
        <div class="row">
          <button class="primary focus-ring" id="play">Ton starten</button>
          <button class="secondary focus-ring" id="stop">Ton stoppen</button>
        </div>
        <div style="margin-top: 10px;">
          <label>Frequenz: <strong id="freq-label">${startHz}</strong> Hz</label>
          <input id="freq" type="range" min="${minHz}" max="${maxHz}" value="${startHz}" />
        </div>
      `;

      const btnPlay = container.querySelector("#play");
      const btnStop = container.querySelector("#stop");
      const freq = container.querySelector("#freq");
      const freqLabel = container.querySelector("#freq-label");

      btnPlay.addEventListener("click", () => {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (!osc) {
          osc = ctx.createOscillator();
          gain = ctx.createGain();
          osc.type = "sine";
          gain.gain.value = 0.05;
          osc.connect(gain).connect(ctx.destination);
          osc.start();
        }
        osc.frequency.value = parseInt(freq.value, 10);
      });

      btnStop.addEventListener("click", () => {
        if (osc) {
          osc.stop();
          osc.disconnect();
          osc = null;
        }
        if (ctx) {
          ctx.close();
          ctx = null;
        }
      });

      freq.addEventListener("input", () => {
        freqLabel.textContent = freq.value;
        if (osc) osc.frequency.value = parseInt(freq.value, 10);
      });
    }

    function cleanup() {
      if (osc) {
        osc.stop();
        osc.disconnect();
        osc = null;
      }
      if (ctx) {
        ctx.close();
        ctx = null;
      }
    }

    return { render, cleanup };
  }

  window.ModuleRegistry.register("hearing-basic", createModule);
})();
