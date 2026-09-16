/**
 * COMBATPOWER.JS
 * -----------------------------------------------------------------------
 * "Poder de Equipo" (CP): un solo número que resume qué tan fuerte es
 * una carta o un equipo — estándar en todo gacha, para poder comparar
 * de un vistazo sin tener que leer 4 stats por separado.
 *
 * Fórmula (a propósito simple y transparente, no una caja negra):
 *   CP de una carta = HP×0.35 + ATQ×2.2 + DEF×1.8 + VEL×1.3
 * Los pesos hacen que ATQ/DEF/VEL cuenten más por punto que el HP
 * (que suele ser un número mucho más grande), para que el CP no quede
 * dominado solo por la vida.
 * -----------------------------------------------------------------------
 */

const PESOS_COMBAT_POWER = { hp: 0.35, atk: 2.2, def: 1.8, velocidad: 1.3 };

/** CP de una carta ya nivelada (usa sus stats con nivel aplicado). */
function getCardCombatPower(cartaNivelada) {
  const s = cartaNivelada.stats;
  return Math.round(s.hp * PESOS_COMBAT_POWER.hp + s.atk * PESOS_COMBAT_POWER.atk + s.def * PESOS_COMBAT_POWER.def + s.velocidad * PESOS_COMBAT_POWER.velocidad);
}

/** CP total de un equipo (array de cardIds del jugador). */
function getTeamCombatPower(cartaIds) {
  return cartaIds.reduce((total, id) => {
    const tpl = GameData.cartas.find((c) => c.id === id);
    if (!tpl) return total;
    const nivelada = getLeveledCardTemplate(tpl);
    return total + getCardCombatPower(nivelada);
  }, 0);
}
