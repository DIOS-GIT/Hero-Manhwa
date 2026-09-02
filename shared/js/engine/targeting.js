/**
 * TARGETING.JS
 * -----------------------------------------------------------------------
 * Reglas ya cerradas:
 *   - Ataque normal: por defecto SOLO puede apuntar a la Carta 1 del
 *     equipo rival. El atacante puede pagar energía
 *     (rules.energia.costoSaltarPrimeraLinea) para elegir cualquier
 *     objetivo en la retaguardia en su lugar.
 *   - Habilidades de alcance/dirigidas: libres, sin restricción de
 *     línea (cada habilidad define su propio tipoObjetivo).
 *   - Ataque de área: golpea varias posiciones (todas las vivas del
 *     equipo rival, salvo que la habilidad diga lo contrario).
 * -----------------------------------------------------------------------
 */

/**
 * Objetivos legales para un ataque normal.
 * @param {boolean} saltarPrimeraLinea - si el jugador pagó el costo
 */
function getValidNormalAttackTargets(combatState, atacante, saltarPrimeraLinea) {
  const equipoRival = atacante.team === "jugador" ? "enemigo" : "jugador";
  const rivalesVivos = combatState.cards.filter(
    (c) => c.team === equipoRival && c.alive
  );

  if (!saltarPrimeraLinea) {
    const frontLine = rivalesVivos.find((c) => c.slot === 1);
    return frontLine ? [frontLine] : [];
  }

  // Al saltar la primera línea, solo se puede elegir retaguardia.
  return rivalesVivos.filter((c) => c.slot !== 1);
}

/** Objetivos legales para una habilidad, según su tipoObjetivo. */
function getValidAbilityTargets(combatState, actor, ability) {
  const equipoRival = actor.team === "jugador" ? "enemigo" : "jugador";
  switch (ability.tipoObjetivo) {
    case "un_enemigo":
      return combatState.cards.filter((c) => c.team === equipoRival && c.alive);
    case "area":
      return combatState.cards.filter((c) => c.team === equipoRival && c.alive);
    case "aliado":
      return combatState.cards.filter((c) => c.team === actor.team && c.alive);
    case "uno_mismo":
      return [actor];
    default:
      return [];
  }
}

/**
 * Si el objetivo elegido tiene una redirección activa ("Provocar"),
 * y el objetivo estaba en retaguardia, hay probabilidad de que el
 * golpe se redirija a quien está protegiendo (normalmente el tanque
 * en primera línea). Devuelve el objetivo final tras aplicar esto.
 */
function applyProtectionRedirect(combatState, originalTarget) {
  if (originalTarget.slot === 1) return originalTarget; // ya es primera línea

  const protector = combatState.cards.find(
    (c) =>
      c.team === originalTarget.team &&
      c.alive &&
      c.protegiendo &&
      c.instanceId !== originalTarget.instanceId
  );
  if (!protector) return originalTarget;

  const fallo = combatState.reglas.proteger.probabilidadFallo;
  const sePuedeRedirigir = Math.random() >= fallo; // 10% de fallo por defecto
  if (!sePuedeRedirigir) return originalTarget;

  return protector;
}
