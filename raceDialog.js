// raceDialog.js
(function () {
  const App = (window.App = window.App || {});

  const dlg = document.getElementById("dlgRace");
  const frm = document.getElementById("frmRace");
  const btnCancel = document.getElementById("btnCancelRace");

  const inputName = document.getElementById("raceName");
  const selectType = document.getElementById("raceType");
  const inputLaps = document.getElementById("raceLaps");

  // Si falta algo en el HTML, salimos sin romper la app
  if (!dlg || !frm || !btnCancel || !inputName || !selectType || !inputLaps) {
    console.warn("[raceDialog] Faltan elementos del diálogo (IDs).");
    return;
  }

  function applyTypeUI() {
    const type = selectType.value;

    if (type === "laps") {
      inputLaps.disabled = false;
      if (!inputLaps.value || Number(inputLaps.value) <= 0) inputLaps.value = 1;
    } else {
      // sprint
      inputLaps.value = 0;
      inputLaps.disabled = true;
    }
  }

  App.openRaceDialog = function () {
    // valores por defecto
    inputName.value = "";
    selectType.value = "laps";
    inputLaps.value = 1;
    applyTypeUI();

    dlg.showModal();
    inputName.focus();
  };

  App.closeRaceDialog = function () {
    dlg.close();
  };

  // Tipo => bloquea/desbloquea vueltas
  selectType.addEventListener("change", applyTypeUI);

  // Cancelar
  btnCancel.addEventListener("click", (e) => {
    e.preventDefault();
    App.closeRaceDialog();
  });

  // Guardar => activa modo crear ruta
  frm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = inputName.value.trim();
    const type = selectType.value;
    const laps = type === "laps" ? Math.max(1, parseInt(inputLaps.value || "1", 10)) : 0;

    App.draftRace = { name, type, laps };

    // Reset de la ruta actual que vas a dibujar
    App.createdPoints = [];
    if (App.createdPolyline) {
      App.map.removeLayer(App.createdPolyline);
      App.createdPolyline = null;
    }

    // Activar modo crear ruta (clicks añaden puntos)
    App.setCreateRouteMode(true);

    App.closeRaceDialog();
  });
})();
