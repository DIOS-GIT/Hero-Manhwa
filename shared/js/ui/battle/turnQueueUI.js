/**
 * TURNQUEUEUI.JS
 * -----------------------------------------------------------------------
 * Pinta la barra horizontal de "próximos turnos" usando
 * engine/turnOrder.js -> previewUpcomingTurns().
 * -----------------------------------------------------------------------
 */

function renderTurnQueue(combatState) {
  const proximos = previewUpcomingTurns(combatState, 8);
  const items = proximos
    .map((p, i) => {
      const claseEquipo = p.team === "jugador" ? "turnqueue__item--jugador" : "turnqueue__item--enemigo";
      return `<div class="turnqueue__item ${claseEquipo}" title="${p.nombre}">
        <span class="turnqueue__pos">${i + 1}</span>
        <span class="turnqueue__nombre">${p.nombre}</span>
      </div>`;
    })
    .join("");

  return `
    <div class="turnqueue">
      <div class="turnqueue__label">Próximos turnos</div>
      <div class="turnqueue__list">${items}</div>
    </div>
  `;
}
