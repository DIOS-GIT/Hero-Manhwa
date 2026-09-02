/**
 * ADMIN-MAIN.JS
 * -----------------------------------------------------------------------
 * Punto de entrada del admin (separado del juego — ver game-main.js en
 * juego/js/). Inicializa GameData y controla el cambio de pestañas.
 * -----------------------------------------------------------------------
 */

const VISTAS_ADMIN = ["cartas", "protagonistas", "reglas", "rutas", "niveles", "elementos", "tienda", "pantallas", "historia", "equipos", "combate", "datos"];

function showView(nombre) {
  VISTAS_ADMIN.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("view--activa", v === nombre);
  });
  document.querySelectorAll(".tabs__btn").forEach((btn) => {
    btn.classList.toggle("tabs__btn--activo", btn.dataset.view === nombre);
  });
  refreshView(nombre);
}

function refreshView(nombre) {
  if (nombre === "cartas") renderCardEditorView();
  if (nombre === "protagonistas") renderProtagonistEditorView();
  if (nombre === "reglas") renderRulesEditorView();
  if (nombre === "rutas") renderRoutesEditorView();
  if (nombre === "niveles") renderLevelingEditorView();
  if (nombre === "elementos") renderElementsEditorView();
  if (nombre === "tienda") renderShopEditorView();
  if (nombre === "pantallas") renderScreensEditorView();
  if (nombre === "historia") renderHistoriaEditorView();
  if (nombre === "equipos") renderTeamBuilderView();
  if (nombre === "combate") renderCombatScreen();
  if (nombre === "datos") renderDataPanelView();
}

function refreshAllAdminViews() {
  VISTAS_ADMIN.forEach(refreshView);
}

async function initAdminApp() {
  await initGameData();

  document.querySelectorAll(".tabs__btn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  showView("cartas");
}

document.addEventListener("DOMContentLoaded", initAdminApp);
