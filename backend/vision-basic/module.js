// Module script interface
// The host will call window.ModuleRegistry.register(moduleId, moduleFactory)

(function () {
  function createModule() {
    let intervalId = null;

    function render(container, config, onComplete) {
      container.innerHTML = `
        <div style="position: relative; height: 180px; border: 1px dashed #d0d0d0; border-radius: 10px;">
          <div style="position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; background: #1b1b1b; border-radius: 50%; transform: translate(-50%, -50%);"></div>
          <button id="target" class="secondary focus-ring" style="position: absolute; left: 20px; top: 20px;">Ziel</button>
        </div>
      `;

      const target = container.querySelector("#target");
      let x = 20;
      let y = 20;
      let dir = 1;
      let hot = false;

      intervalId = setInterval(() => {
        x += 20 * dir;
        y += 10 * dir;
        if (x > 260 || x < 20) dir *= -1;
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;

        hot = !hot;
        target.style.background = hot ? "#c01010" : "#ececec";
        target.style.color = "#1b1b1b";
      }, config.speed || 800);

      target.addEventListener("click", () => {
        if (hot) onComplete();
      });
    }

    function cleanup() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    }

    return { render, cleanup };
  }

  window.ModuleRegistry.register("vision-basic", createModule);
})();
