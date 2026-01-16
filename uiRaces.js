// uiRaces.js
(function () {
  const App = (window.App = window.App || {});
const getRaces = () => window.RACES || [];

  // ====== DOM ======
  const raceListEl = document.getElementById("raceList");
  const btnToggleAllRaces = document.getElementById("btnToggleAllRaces");

  const btnCreateRoute = document.getElementById("btnCreateRoute");
  const btnUndoPoint = document.getElementById("btnUndoPoint");
  const btnPrintRoute = document.getElementById("btnPrintRoute");

  const btnCoords = document.getElementById("btnCoords");
  const coordsBox = document.getElementById("coordsBox");
  const coordsText = document.getElementById("coordsText");

  // ====== Iconos ======
  function eyeSVG() {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
      </svg>
    `;
  }

  function infoSVG() {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 15a1 1 0 0 1-1-1v-4a1 1 0 1 1 2 0v4a1 1 0 0 1-1 1Zm0-9a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 8Z"/>
      </svg>
    `;
  }

  // ====== Hooks UI para mapCore.js ======
  App.updateEyeUI = (raceId, isOn) => {
    const eye = document.querySelector(`.eye-btn[data-eye="${raceId}"]`);
    if (!eye) return;
    eye.classList.toggle("on", isOn);
    eye.setAttribute("aria-pressed", String(isOn));
  };

  App.setAllEyesOff = () => {
    document.querySelectorAll(".eye-btn").forEach((btn) => {
      btn.classList.remove("on");
      btn.setAttribute("aria-pressed", "false");
    });
    btnToggleAllRaces.textContent = "Ver carreras";
  };

  const btnSaveRace = document.getElementById("btnSaveRace");

  btnSaveRace.addEventListener("click", async () => {
    // ✅ Comprobar aquí (en el momento del click)
    if (!window.db || !window.fs) {
      alert("Firebase todavía no está listo. Espera 1 segundo y prueba otra vez.");
      return;
    }

    // (opcional recomendado) mínimo 2 puntos
    if (!App.createdPoints || App.createdPoints.length < 2 || !App.draftRace) {
      alert("No hay ruta (mín. 2 puntos) o datos de carrera");
      return;
    }

    try {
      const path = App.createdPoints.map(([lat, lng]) => ({ lat, lng }));

const raceData = {
  name: App.draftRace.name,
  type: App.draftRace.type,
  laps: App.draftRace.laps,
  color: "#1e90ff",
  path,
  start: path[0],
  createdAt: Date.now(),
};
      await window.fs.addDoc(
        window.fs.collection(window.db, "races"),
        raceData
      );

      alert("Carrera guardada correctamente ✅");

      // Reset estado
      App.createdPoints = [];
      if (App.createdPolyline) {
        App.map.removeLayer(App.createdPolyline);
        App.createdPolyline = null;
      }
      App.setCreateRouteMode(false);
      App.draftRace = null;

    } catch (e) {
      console.error("Error guardando carrera:", e);
      alert("Error al guardar la carrera");
    }
  });


  App.updateCreateRouteButton = (isCreating) => {
    if (isCreating) {
      // Dibujando → mostrar Guardar
      btnCreateRoute.hidden = true;

      btnSaveRace.hidden = false;
      btnSaveRace.disabled = false;
    } else {
      // Normal → mostrar Crear
      btnCreateRoute.hidden = false;

      btnSaveRace.hidden = true;
      btnSaveRace.disabled = true;
    }
  };


  App.updateCoordsButton = (on) => {
    btnCoords.setAttribute("aria-pressed", String(on));
    btnCoords.textContent = `Modo coordenadas: ${on ? "ON" : "OFF"}`;
    coordsBox.classList.toggle("hidden", !on);
  };

  App.setCoordsText = (point) => {
    coordsText.textContent = JSON.stringify(point);
  };

  // ====== Build list ======
  function buildUI() {
    raceListEl.innerHTML = "";

for (const race of getRaces()) {
      const item = document.createElement("div");
      item.className = "race-item";

      const left = document.createElement("div");
      left.className = "race-left";
      left.innerHTML = `
        <span class="dot" style="background:${race.color}"></span>
        <span class="race-name">${race.name}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "race-actions";

      // OJO
      const eyeBtn = document.createElement("button");
      eyeBtn.type = "button";
      eyeBtn.className = "eye-btn";
      eyeBtn.dataset.eye = race.id;
      eyeBtn.setAttribute("aria-pressed", "false");
      eyeBtn.title = "Mostrar/ocultar";
      eyeBtn.innerHTML = eyeSVG();
      eyeBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        App.toggleRaceVisibility(race.id);
      });

      // INFO tooltip (hover)
      const infoWrap = document.createElement("div");
      infoWrap.className = "info-wrap";
      infoWrap.innerHTML = `
        <button type="button" class="info-btn" aria-label="Información">
          ${infoSVG()}
        </button>
        <div class="info-tooltip">
          Vueltas: ${Number.isFinite(race.laps) ? race.laps : 1}
        </div>
      `;

      actions.appendChild(eyeBtn);
      actions.appendChild(infoWrap);

      item.appendChild(left);
      item.appendChild(actions);
      raceListEl.appendChild(item);
    }
  }

  buildUI();
  App.refreshRaceList = () => {
  buildUI();
};

  // ====== Ver/Ocultar todas ======
  function areAllVisible() {
const races = getRaces();
return races.length > 0 && races.every((r) => App.visibleRaceIds.has(r.id));
  }

  function showAllRaces() {
    for (const race of RACES) {
      if (!App.visibleRaceIds.has(race.id)) App.addRaceToMap(race);
      App.updateEyeUI(race.id, true);
    }
    btnToggleAllRaces.textContent = "Ocultar carreras";
  }

  function hideAllRaces() {
    for (const raceId of Array.from(App.visibleRaceIds)) App.removeRaceFromMap(raceId);
for (const race of getRaces()) App.updateEyeUI(race.id, false);
    btnToggleAllRaces.textContent = "Ver carreras";
  }

  btnToggleAllRaces.addEventListener("click", () => {
    if (areAllVisible()) hideAllRaces();
    else showAllRaces();
  });


  btnCreateRoute.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof App.openRaceDialog === "function") {
      App.openRaceDialog();
    }
  });


  btnUndoPoint.addEventListener("click", () => {
    App.undoLastPoint();
  });

  btnPrintRoute.addEventListener("click", async () => {
    try {
      const pretty = await App.printRouteToClipboard();
      if (!pretty) return;

      const t = btnPrintRoute.textContent;
      btnPrintRoute.textContent = "Copiado ✅";
      setTimeout(() => (btnPrintRoute.textContent = t), 900);
    } catch (e) {
      console.warn("Clipboard bloqueado, copia desde consola.");
    }
  });

  btnCoords.addEventListener("click", () => {
    App.setCoordsMode(!App.coordsMode);
  });
})();
