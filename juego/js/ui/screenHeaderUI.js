/**
 * SCREENHEADERUI.JS
 * -----------------------------------------------------------------------
 * Encabezado chico y reutilizable: título de la pantalla + botón de
 * volver. Lo usan todas las pantallas que se abren DESDE el hub (o
 * desde el flujo de aventura), para que quede claro dónde estás y
 * cómo regresar — en vez de la fila de sub-pestañas que había antes.
 * -----------------------------------------------------------------------
 */

/**
 * @param {string} titulo - texto del encabezado
 * @param {string} destino - nombre de vista al que vuelve (para showView)
 */
function renderScreenHeader(titulo, destino) {
  return `
    <div class="screenheader">
      <button type="button" class="screenheader__volver" data-volver-a="${destino}">←</button>
      <h2 class="screenheader__titulo">${titulo}</h2>
    </div>
  `;
}

/** Conecta el botón de volver de un renderScreenHeader() ya pintado. */
function attachScreenHeaderEvents(container) {
  const btn = container.querySelector("[data-volver-a]");
  if (btn) btn.addEventListener("click", () => showView(btn.dataset.volverA));
}
