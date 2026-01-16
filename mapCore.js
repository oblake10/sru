// mapCore.js
(function () {
  // ====== CONFIG MAPA ======
  const IMAGE_URL = "./images/mapa.png";
  const IMAGE_W = 1660;
  const IMAGE_H = 2048;
  const bounds = [[0, 0], [IMAGE_H, IMAGE_W]];

  const map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    wheelPxPerZoomLevel: 120,
    attributionControl: false,
  });

  L.imageOverlay(IMAGE_URL, bounds).addTo(map);
  map.setView([IMAGE_H / 2, IMAGE_W / 2], -1);

  map.setMaxBounds(bounds);
  map.on("drag", () => map.panInsideBounds(bounds, { animate: false }));

  // ====== Estado global de la app ======
  const App = (window.App = window.App || {});
  App.map = map;

  // Capas por carrera (para mostrar/ocultar varias)
  App.raceLayersById = new Map(); // id -> { line, start }
  App.visibleRaceIds = new Set();

  // Crear ruta
  App.createRouteMode = false;
  App.createdPoints = [];
  App.createdPolyline = null;

  // Coord mode
  App.coordsMode = false;

  // ====== Helpers ======
  App.round = (n) => Math.round(n);

  App.getStartPointFromRace = (race) => {
    if (Array.isArray(race.start) && race.start.length === 2) return race.start;
    return Array.isArray(race.path) && race.path.length ? race.path[0] : null;
  };

  App.addRaceToMap = (race) => {
    const line = L.polyline(race.path, {
      weight: 3,
      opacity: 0.95,
      color: race.color,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);

    const startPoint = App.getStartPointFromRace(race);
    let start = null;

    if (startPoint) {
      start = L.circleMarker(startPoint, {
        radius: 5,
        color: race.color,
        weight: 3,
        fillColor: race.color,
        fillOpacity: 1,
      }).addTo(map);
    }

    App.raceLayersById.set(race.id, { line, start });
    App.visibleRaceIds.add(race.id);
  };

  App.removeRaceFromMap = (raceId) => {
    const layers = App.raceLayersById.get(raceId);
    if (!layers) return;

    if (layers.line) map.removeLayer(layers.line);
    if (layers.start) map.removeLayer(layers.start);

    App.raceLayersById.delete(raceId);
    App.visibleRaceIds.delete(raceId);
  };

  App.toggleRaceVisibility = (raceId) => {
    const race = window.RACES.find((r) => r.id === raceId);
    if (!race) return;

    const isVisible = App.visibleRaceIds.has(raceId);
    if (isVisible) App.removeRaceFromMap(raceId);
    else App.addRaceToMap(race);

    // UI (si existe)
    if (typeof App.updateEyeUI === "function") {
      App.updateEyeUI(raceId, !isVisible);
    }
  };

  // ====== Modo crear ruta ======
  App.setCreateRouteMode = (on) => {
    App.createRouteMode = on;
    map.getContainer().classList.toggle("crosshair", on);

    // si activas crear ruta, apaga coords
    if (on && App.coordsMode) App.setCoordsMode(false);

    // el botón se actualiza desde uiRaces.js si existe
    if (typeof App.updateCreateRouteButton === "function") {
      App.updateCreateRouteButton(on);
    }
  };

  App.redrawCreatedRoute = () => {
    if (App.createdPolyline) {
      map.removeLayer(App.createdPolyline);
      App.createdPolyline = null;
    }

    if (App.createdPoints.length >= 2) {
      App.createdPolyline = L.polyline(App.createdPoints, {
        weight: 3,
        opacity: 0.9,
        color: "#ff0000",
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);
    }
  };

  App.undoLastPoint = () => {
    if (!App.createdPoints.length) return;
    App.createdPoints.pop();
    App.redrawCreatedRoute();
  };

  App.printRouteToClipboard = async () => {
    if (!App.createdPoints.length) return null;

    const pretty = `[${App.createdPoints
      .map((p) => `[${p[0]}, ${p[1]}]`)
      .join(", ")}]`;

    await navigator.clipboard.writeText(pretty);
    return pretty;
  };

  // ====== Modo coordenadas ======
  App.setCoordsMode = (on) => {
    App.coordsMode = on;
    map.getContainer().classList.toggle("crosshair", on);

    if (typeof App.updateCoordsButton === "function") {
      App.updateCoordsButton(on);
    }
  };

  // ====== Un único click handler ======
  map.on("click", (e) => {
    const point = [App.round(e.latlng.lat), App.round(e.latlng.lng)];

    if (App.createRouteMode) {
      App.createdPoints.push(point);
      App.redrawCreatedRoute();
    }

    if (App.coordsMode) {
      if (typeof App.setCoordsText === "function") App.setCoordsText(point);
      console.log("Punto:", point);
    }
  });

  // ====== Clear all ======
  App.clearAll = () => {
    // borrar carreras visibles
    for (const raceId of Array.from(App.visibleRaceIds)) {
      App.removeRaceFromMap(raceId);
    }

    // borrar ruta creada
    App.createdPoints = [];
    if (App.createdPolyline) {
      map.removeLayer(App.createdPolyline);
      App.createdPolyline = null;
    }
    App.setCreateRouteMode(false);

    // UI ojos OFF si existe
    if (typeof App.setAllEyesOff === "function") App.setAllEyesOff();
  };
})();


