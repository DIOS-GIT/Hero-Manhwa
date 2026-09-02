/**
 * DAMAGE.JS
 * -----------------------------------------------------------------------
 * Fórmula de daño base + multiplicador elemental + reducción si el
 * objetivo está usando "Defender". Todo lo que sea "número mágico"
 * de balance vive aquí para poder ajustarlo en un solo lugar.
 * -----------------------------------------------------------------------
 */

/**
 * @param {object} atacante - combat card
 * @param {object} objetivo - combat card
 * @param {number} multiplicador - multiplicador de la habilidad/ataque (1.0 para ataque normal)
 */
function calculateDamage(atacante, objetivo, multiplicador = 1.0) {
  const atk = atacante.stats.atk;
  const def = objetivo.stats.def;

  // fórmula base: daño = ATQ * multiplicador - una porción de la DEF del
  // objetivo, con un mínimo de 1 para que nunca "no pase nada".
  let danoBase = atk * multiplicador - def * 0.5;
  if (danoBase < 1) danoBase = 1;

  const multElemental = getElementMultiplier(atacante.elemento, objetivo.elemento, GameData.elementos);
  let danoFinal = danoBase * multElemental;

  if (objetivo.defendiendo) {
    danoFinal *= 1 - objetivo._reduccionDefender;
  }

  return {
    valor: Math.round(danoFinal),
    fueVentajaElemental: multElemental > 1,
    fueDesventajaElemental: multElemental < 1,
  };
}

/** Aplica daño a una carta, sin bajar de 0 HP. Devuelve si murió. */
function applyDamage(combatCard, cantidad) {
  combatCard.hp = Math.max(0, combatCard.hp - cantidad);
  if (combatCard.hp === 0) {
    combatCard.alive = false;
    return true;
  }
  return false;
}

function applyHeal(combatCard, cantidad) {
  combatCard.hp = Math.min(combatCard.hpMax, combatCard.hp + cantidad);
}
