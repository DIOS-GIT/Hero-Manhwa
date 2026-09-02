/**
 * FORMATION.JS
 * -----------------------------------------------------------------------
 * Reglas de formación ya cerradas en el diseño:
 *   - Slot 1 = primera línea. Slots 2, 3, 4 = retaguardia.
 *   - Cualquier carta puede ocupar cualquier posición.
 *   - Si cae la Carta 1, la de Carta 2 sube automáticamente, y así
 *     sucesivamente.
 *   - El jugador puede cambiar formación 1 vez por turno gratis
 *     (más cambios cuestan energía, ver rules-default.js).
 * -----------------------------------------------------------------------
 */

/**
 * Devuelve las cartas VIVAS de un equipo, ordenadas por slot (1 a 4).
 */
function getTeamBySlot(combatState, team) {
  return combatState.cards
    .filter((c) => c.team === team && c.alive)
    .sort((a, b) => a.slot - b.slot);
}

function getFrontLineCard(combatState, team) {
  return combatState.cards.find(
    (c) => c.team === team && c.alive && c.slot === 1
  ) || null;
}

/**
 * Se llama cada vez que una carta muere. Si era la Carta 1 de su equipo,
 * la siguiente carta viva con menor slot sube a slot 1, y así en
 * cascada (2->1, 3->2, 4->3).
 */
function reorderFormationAfterDeath(combatState, team) {
  const vivos = combatState.cards
    .filter((c) => c.team === team && c.alive)
    .sort((a, b) => a.slot - b.slot);

  vivos.forEach((card, index) => {
    card.slot = index + 1;
  });
}

/**
 * Cambia la posición de dos cartas del mismo equipo. Se valida el
 * límite de cambios gratis por turno desde engine/actions.js (esta
 * función solo hace el intercambio de slots).
 */
function swapPositions(combatState, instanceIdA, instanceIdB) {
  const a = combatState.cards.find((c) => c.instanceId === instanceIdA);
  const b = combatState.cards.find((c) => c.instanceId === instanceIdB);
  if (!a || !b || a.team !== b.team) return false;
  const tempSlot = a.slot;
  a.slot = b.slot;
  b.slot = tempSlot;
  return true;
}
