/**
 * RELICSBARUI.JS
 * -----------------------------------------------------------------------
 * Barra horizontal con los efectos persistentes que el jugador lleva
 * acumulados en la run actual (buffs/debuffs de eventos y objetos de
 * tienda) — igual que la barra de reliquias de Slay the Spire: siempre
 * visible arriba, y al presionar un ícono se ve su descripción
 * (positiva en verde, negativa en rojo).
 *
 * Es compartida (vive en shared/js/ui/battle/) porque se muestra tanto
 * en el mapa como durante el combate — ambos usan la misma activeRun.
 * Si no hay run activa (ej. un combate de prueba desde el admin), no
 * dibuja nada.
 * -----------------------------------------------------------------------
 */

let relicBarSelectedId = null;

function renderRelicsBar() {
  if (!activeRun || activeRun.relicsObtenidos.length === 0) return "";

  const iconos = activeRun.relicsObtenidos
    .map(
      (r) => `
      <button type="button" class="relicicon relicicon--${r.tipo} ${relicBarSelectedId === r.id ? "relicicon--activo" : ""}" data-relic-id="${r.id}" title="${r.nombre}">
        ${r.icono}
      </button>
    `
    )
    .join("");

  const seleccionada = activeRun.relicsObtenidos.find((r) => r.id === relicBarSelectedId);

  return `
    <div class="relicsbar">
      <div class="relicsbar__iconos">${iconos}</div>
      ${
        seleccionada
          ? `<div class="relicsbar__detalle relicsbar__detalle--${seleccionada.tipo}">
              <strong>${seleccionada.icono} ${seleccionada.nombre}</strong>
              <p>${seleccionada.descripcion}</p>
            </div>`
          : ""
      }
    </div>
  `;
}

/**
 * @param {HTMLElement} container - el elemento donde se dibujó renderRelicsBar()
 * @param {Function} onChange - callback para volver a dibujar la pantalla
 *   que llama a esto (cada pantalla tiene su propio render, ej.
 *   renderMapView o renderCombatScreen)
 */
function attachRelicsBarEvents(container, onChange) {
  container.querySelectorAll("[data-relic-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      relicBarSelectedId = relicBarSelectedId === btn.dataset.relicId ? null : btn.dataset.relicId;
      onChange();
    });
  });
}
