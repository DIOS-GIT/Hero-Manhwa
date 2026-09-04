/**
 * HUBUI.JS
 * -----------------------------------------------------------------------
 * Pantalla principal tras "Comenzar/Continuar". Reemplaza a la vieja
 * fila de sub-pestañas: ahora cada sección (Colección, Protagonistas,
 * Tienda, Historial) es un botón grande que abre su propia pantalla
 * completa. Equipos ya no vive aquí — se gestiona dentro del flujo de
 * "Iniciar Aventura" (ver mapUI.js / teamPresetsUI.js).
 * -----------------------------------------------------------------------
 */

function renderHubView() {
  const container = document.getElementById("view-hub");

  const ultimoPreset = PlayerData.ultimoPresetId
    ? PlayerData.presets.find((p) => p.id === PlayerData.ultimoPresetId)
    : null;
  const hayRunActiva = !!(activeRun && !activeRun.finalizada);

  container.innerHTML = `
    ${renderHubHeader()}
    ${hayRunActiva ? renderRunEnProgresoBanner() : ""}
    ${ultimoPreset ? renderTeamPreviewCard(ultimoPreset) : ""}

    <div class="hubgrid">
      <button type="button" class="hubtile" data-hub-nav="coleccion">
        <span class="hubtile__icono">🃏</span>
        <span class="hubtile__label">Colección</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="protagonistas">
        <span class="hubtile__icono">⭐</span>
        <span class="hubtile__label">Protagonistas</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="tienda">
        <span class="hubtile__icono">🏪</span>
        <span class="hubtile__label">Tienda</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="historial">
        <span class="hubtile__icono">📜</span>
        <span class="hubtile__label">Historial</span>
      </button>
    </div>

    <button type="button" class="btn btn--aventura" id="btn-iniciar-aventura">
      ⚔️ ${hayRunActiva ? "Continuar aventura" : "Iniciar Aventura"}
    </button>

    <div class="hubfooter">
      <button type="button" class="btn btn--secundario" id="btn-cerrar-sesion-hub">Cerrar sesión</button>
    </div>
  `;

  container.querySelectorAll("[data-hub-nav]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.hubNav));
  });

  container.querySelector("#btn-iniciar-aventura").addEventListener("click", () => showView("aventura"));

  container.querySelector("#btn-cerrar-sesion-hub").addEventListener("click", async () => {
    await logout();
    PlayerData = {
      moneda: ECONOMY_CONFIG.monedaInicial,
      coleccion: [],
      cartasCaidas: [],
      presets: [],
      ultimoPresetId: null,
      historial: [],
      progresoCartas: {},
      progresoHistoria: { capituloIndex: 0, escenaIndex: 0 },
      personalizacionProtagonistas: {},
      fragmentosCartas: {},
      yaTuvoPrimeraTirada: false,
    };
    clearActiveRun();
    document.getElementById("game-shell").style.display = "none";
    document.getElementById("titlescreen").style.display = "flex";
    renderTitleScreenPanel();
  });
}

function renderHubHeader() {
  const victorias = PlayerData.historial.filter((h) => h.resultado === "victoria").length;
  return `
    <div class="hubheader">
      <div class="hubheader__moneda">🪙 <span>${PlayerData.moneda}</span></div>
      <div class="hubheader__stats">
        <span>${PlayerData.coleccion.length}/${GameData.cartas.length} cartas</span>
        <span>${victorias} victorias</span>
      </div>
    </div>
  `;
}

function renderRunEnProgresoBanner() {
  const nodos = activeRun.estadisticas.nodosAlcanzados;
  return `
    <div class="runbanner">
      <span class="runbanner__icono">⚔️</span>
      <div class="runbanner__texto">
        <strong>Tienes una aventura en progreso</strong>
        <p>Llegaste al nodo ${nodos}. Toca "Continuar aventura" para seguir.</p>
      </div>
    </div>
  `;
}

function renderTeamPreviewCard(preset) {
  const cartas = preset.cartaIds
    .map((id) => GameData.cartas.find((c) => c.id === id))
    .filter(Boolean);
  const protagonista = preset.protagonistaId ? getPersonalizedProtagonist(preset.protagonistaId) : null;

  return `
    <div class="teampreview">
      <div class="teampreview__label">Tu equipo actual — ${preset.nombre}</div>
      <div class="teampreview__cartas">
        ${cartas
          .map(
            (c) => `
          <div class="teampreview__carta">
            ${c.imagen ? `<img src="${c.imagen}" alt="${c.nombre}" />` : `<div class="teampreview__placeholder">${c.nombre[0]}</div>`}
          </div>
        `
          )
          .join("")}
      </div>
      ${protagonista ? `<div class="teampreview__protagonista">⭐ ${protagonista.nombre}</div>` : ""}
    </div>
  `;
}
