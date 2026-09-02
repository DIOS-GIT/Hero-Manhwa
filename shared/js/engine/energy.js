/**
 * ENERGY.JS
 * -----------------------------------------------------------------------
 * Energía compartida por EQUIPO (no por carta), tal como se definió:
 *   - Tope máximo (rules.energia.maximo, por defecto 10)
 *   - Genera una base fija al llegarle el turno a una carta de ese
 *     equipo (rules.energia.generacionBasePorTurno)
 *   - Genera extra cuando una carta del equipo ataca o recibe daño
 *
 * NOTA DE DISEÑO: como el combate usa una cola de turnos individual
 * (no rondas de equipo), "generación por turno" se interpreta aquí
 * como "cada vez que le toca actuar a una carta de ese equipo, su
 * equipo gana la energía base ANTES de que actúe". Si al probarlo
 * prefieres que sea distinto (ej. solo una vez por vuelta completa
 * del equipo), este es el único archivo que hay que ajustar.
 * -----------------------------------------------------------------------
 */

function getTeamEnergy(combatState, team) {
  return combatState.energia[team];
}

function addEnergy(combatState, team, cantidad) {
  const max = combatState.reglas.energia.maximo;
  combatState.energia[team] = Math.min(max, combatState.energia[team] + cantidad);
}

function spendEnergy(combatState, team, cantidad) {
  if (combatState.energia[team] < cantidad) return false;
  combatState.energia[team] -= cantidad;
  return true;
}

function canAfford(combatState, team, cantidad) {
  return combatState.energia[team] >= cantidad;
}

/** Se llama al inicio del turno de una carta (ver engine/combat.js) */
function grantTurnEnergy(combatState, team) {
  addEnergy(combatState, team, combatState.reglas.energia.generacionBasePorTurno);
}

/** Se llama cuando una carta de `team` ataca */
function grantAttackEnergy(combatState, team) {
  addEnergy(combatState, team, combatState.reglas.energia.energiaPorAtacar);
}

/** Se llama cuando una carta de `team` recibe daño */
function grantDamageTakenEnergy(combatState, team) {
  addEnergy(combatState, team, combatState.reglas.energia.energiaPorRecibirDano);
}
