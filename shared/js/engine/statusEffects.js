/**
 * STATUSEFFECTS.JS
 * -----------------------------------------------------------------------
 * Dos cosas distintas se resuelven aquí:
 *
 *  1) PASIVAS DE POSICIÓN: se recalculan cada vez que cambia la
 *     formación o cada vez que le toca el turno a una carta. No son
 *     "estados" con duración, son permanentes mientras la carta esté
 *     en la posición requerida.
 *
 *  2) ESTADOS ALTERADOS (veneno, quemadura, aturdido, silencio,
 *     acelerar, ralentizar): tienen duración en turnos y se resuelven
 *     al empezar el turno de la carta afectada.
 * -----------------------------------------------------------------------
 */

/**
 * Recalcula combatCard.stats a partir de statsBase + pasivas de
 * posición activas + modificadores de estados tipo "stat" (acelerar/
 * ralentizar). Se debe llamar cada vez que cambia la formación o un
 * estado se aplica/expira.
 */
function recalculateStats(combatCard) {
  const stats = { ...combatCard.statsBase };
  const enPrimeraLinea = combatCard.slot === 1;

  (combatCard.pasivas || []).forEach((pasiva) => {
    const aplica =
      pasiva.posicionRequerida === "cualquiera" ||
      (pasiva.posicionRequerida === "primera_linea" && enPrimeraLinea) ||
      (pasiva.posicionRequerida === "retaguardia" && !enPrimeraLinea);
    if (aplica && pasiva.efecto && pasiva.efecto.stat && stats[pasiva.efecto.stat] !== undefined) {
      stats[pasiva.efecto.stat] *= 1 + pasiva.efecto.modificador;
    }
  });

  (combatCard.statuses || []).forEach((estado) => {
    const def = getStatusById(estado.statusId);
    if (def && def.type === "stat" && stats[def.stat] !== undefined) {
      stats[def.stat] *= estado.value;
    }
  });

  Object.keys(stats).forEach((k) => {
    stats[k] = Math.round(stats[k] * 100) / 100;
  });

  combatCard.stats = stats;
}

/**
 * Se llama al empezar el turno de una carta, ANTES de que actúe.
 * Resuelve daño sobre tiempo y decide si pierde el turno por control.
 * @returns {{ perdioTurno: boolean, logs: string[] }}
 */
function resolveStartOfTurnStatuses(combatCard) {
  const logs = [];
  let perdioTurno = false;

  combatCard.statuses.forEach((estado) => {
    const def = getStatusById(estado.statusId);
    if (!def) return;

    if (def.type === "dot") {
      const dano = Math.round(combatCard.hpMax * estado.value);
      applyDamage(combatCard, dano);
      logs.push(`${combatCard.nombre} sufre ${dano} de daño por ${def.label}.`);
    }

    if (def.type === "control" && estado.statusId === "aturdido") {
      perdioTurno = true;
      logs.push(`${combatCard.nombre} está aturdido y pierde su turno.`);
    }
  });

  // reduce duraciones y elimina expirados
  combatCard.statuses = combatCard.statuses
    .map((e) => ({ ...e, turnosRestantes: e.turnosRestantes - 1 }))
    .filter((e) => e.turnosRestantes > 0);

  recalculateStats(combatCard);

  return { perdioTurno, logs };
}

function hasStatus(combatCard, statusId) {
  return combatCard.statuses.some((e) => e.statusId === statusId);
}

/** Aplica un estado nuevo a una carta (usado por habilidades). */
function applyStatus(combatCard, statusId, valueOverride, durationOverride) {
  const def = getStatusById(statusId);
  if (!def) return;

  if (!def.stackable) {
    combatCard.statuses = combatCard.statuses.filter((e) => e.statusId !== statusId);
  }

  combatCard.statuses.push({
    statusId,
    value: valueOverride !== undefined ? valueOverride : def.defaultValue,
    turnosRestantes: durationOverride !== undefined ? durationOverride : def.defaultDuration,
  });

  recalculateStats(combatCard);
}
