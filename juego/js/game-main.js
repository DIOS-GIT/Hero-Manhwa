/**
 * GAME-MAIN.JS
 * -----------------------------------------------------------------------
 * Punto de entrada del juego. Controla:
 *   1) La pantalla de título: resumen de progreso o bienvenida.
 *   2) Dentro del juego, showView(nombre) alterna entre todas las
 *      pantallas: hub, colección, protagonistas, tienda, historial,
 *      equipos (parte del flujo de aventura), aventura (mapa de la
 *      run) y combate.
 * -----------------------------------------------------------------------
 */

const VISTAS_JUEGO = ["hub", "coleccion", "protagonistas", "tienda", "historial", "equipos", "aventura", "combate"];

/**
 * Aplica el fondo y el personaje ilustrado configurados en el admin
 * (pestaña "Pantallas") para la pantalla `nombre`. Si esa pantalla no
 * tiene nada configurado, se ocultan y queda el degradado por defecto.
 */
function applyScreenBackground(nombre) {
  const cfg = GameData.pantallas && GameData.pantallas[nombre];
  const bg = document.getElementById("screen-backdrop-bg");
  const personaje = document.getElementById("screen-backdrop-personaje");

  if (cfg && cfg.fondo) {
    bg.style.backgroundImage = `url("${cfg.fondo}")`;
    bg.classList.add("screen-backdrop-bg--activo");
  } else {
    bg.classList.remove("screen-backdrop-bg--activo");
  }

  personaje.classList.remove("screen-backdrop-personaje--izquierda", "screen-backdrop-personaje--derecha", "screen-backdrop-personaje--centro");
  if (cfg && cfg.personaje) {
    personaje.src = cfg.personaje;
    personaje.classList.add("screen-backdrop-personaje--activo", `screen-backdrop-personaje--${cfg.posicionPersonaje || "derecha"}`);
  } else {
    personaje.classList.remove("screen-backdrop-personaje--activo");
  }
}

function showView(nombre) {
  VISTAS_JUEGO.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("view--activa", v === nombre);
  });
  applyScreenBackground(nombre);

  if (nombre === "hub") renderHubView();
  if (nombre === "coleccion") renderCollectionView();
  if (nombre === "protagonistas") renderProtagonistsView();
  if (nombre === "tienda") renderGachaHomeView();
  if (nombre === "historial") renderHistoryView();
  if (nombre === "equipos") renderPresetsView();
  if (nombre === "aventura") renderMapView();
  if (nombre === "combate") renderCombatScreen();
}

function renderTitleScreenPanel() {
  const panel = document.getElementById("titlescreen-panel");
  const tieneProgreso = PlayerData.coleccion.length > 0 || PlayerData.historial.length > 0 || PlayerData.moneda !== ECONOMY_CONFIG.monedaInicial;

  if (!tieneProgreso) {
    panel.innerHTML = `
      <p style="font-family: var(--fuente-narrativa); font-style: italic; font-size: 16px; color: var(--texto-tenue); margin-bottom: 18px;">
        Empiezas con ${PlayerData.moneda} de moneda y ninguna carta. La formación de tu primer equipo está a una tirada de gacha de distancia.
      </p>
      <div class="titlescreen__acciones">
        <button class="btn btn--titulo" id="btn-entrar">Comenzar</button>
      </div>
    `;
  } else {
    const victorias = PlayerData.historial.filter((h) => h.resultado === "victoria").length;
    panel.innerHTML = `
      <div class="titlescreen__stat"><span>Moneda</span><strong>🪙 ${PlayerData.moneda}</strong></div>
      <div class="titlescreen__stat"><span>Colección</span><strong>${PlayerData.coleccion.length} / ${GameData.cartas.length}</strong></div>
      <div class="titlescreen__stat"><span>Runs jugadas</span><strong>${PlayerData.historial.length} (${victorias} victorias)</strong></div>
      <div class="titlescreen__acciones">
        <button class="btn btn--titulo" id="btn-entrar">Continuar</button>
        <button class="btn btn--secundario" id="btn-reiniciar-progreso">Reiniciar progreso</button>
      </div>
    `;
  }

  document.getElementById("btn-entrar").addEventListener("click", enterGame);

  const btnReiniciar = document.getElementById("btn-reiniciar-progreso");
  if (btnReiniciar) btnReiniciar.addEventListener("click", async () => {
    if (!confirm("Esto borra tu moneda, colección, presets e historial guardados en este navegador. ¿Continuar?")) return;
    localStorage.removeItem(PLAYER_STORAGE_KEY);
    clearActiveRun();
    await initPlayerData();
    renderTitleScreenPanel();
  });
}

function enterGame() {
  document.getElementById("titlescreen").style.display = "none";
  document.getElementById("game-shell").style.display = "block";
  showView("hub");
}

document.addEventListener("DOMContentLoaded", async () => {
  await initGameData();
  await initPlayerData();
  loadActiveRunFromStorage();
  renderTitleScreenPanel();
  applyScreenBackground("titulo");

  document.getElementById("link-volver-titulo").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("game-shell").style.display = "none";
    document.getElementById("titlescreen").style.display = "flex";
    renderTitleScreenPanel();
    applyScreenBackground("titulo");
  });
});
