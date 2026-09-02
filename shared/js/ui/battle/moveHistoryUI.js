/**
 * MOVEHISTORYUI.JS
 * -----------------------------------------------------------------------
 * Barra lateral con TODOS los movimientos de la partida en curso, en
 * orden cronológico (como el historial de un duelo de Yu-Gi-Oh): quién
 * hizo qué, en qué turno, contra quién, y con qué resultado. Reusa el
 * mismo combatState.log que ya llenan engine/actions.js y engine/combat.js
 * — cada línea ya trae el número de turno.
 *
 * Es un panel PERSISTENTE (a diferencia de un log pequeño que solo
 * muestra las últimas líneas): siempre visible al lado del tablero en
 * pantallas anchas, y se ve completo con scroll.
 * -----------------------------------------------------------------------
 */

function renderMoveHistorySidebar(combatState) {
  const lineas = combatState.log
    .map((linea, i) => `<div class="movehistory__line" id="movehistory-line-${i}">${linea}</div>`)
    .join("");

  return `
    <aside class="movehistory">
      <div class="movehistory__label">Movimientos de la partida</div>
      <div class="movehistory__lines" id="movehistory-lines">${lineas}</div>
    </aside>
  `;
}

/** Desplaza el sidebar hasta el movimiento más reciente. Llamar después de pintar. */
function scrollMoveHistoryToBottom() {
  const el = document.getElementById("movehistory-lines");
  if (el) el.scrollTop = el.scrollHeight;
}
