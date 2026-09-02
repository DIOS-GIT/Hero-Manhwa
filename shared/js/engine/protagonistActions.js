/**
 * PROTAGONISTACTIONS.JS
 * -----------------------------------------------------------------------
 * El protagonista no es una carta de combate: no tiene turno propio en
 * la cola de iniciativa. Su activa única se puede disparar UNA vez por
 * combate, en cualquier momento que le toque turno a una carta del
 * jugador (se resuelve como una acción "gratis" adicional, no consume
 * el turno de ninguna carta).
 * -----------------------------------------------------------------------
 */

/** ¿El jugador todavía puede usar la activa de su protagonista en este combate? */
function canUseProtagonistActive(combatState) {
  return combatState.protagonista && !combatState.protagonistaUsado;
}

function actionUseProtagonistActive(combatState) {
  if (!canUseProtagonistActive(combatState)) return { ok: false };

  const protagonista = combatState.protagonista;
  const activa = protagonista.activaUnica;
  const efecto = activa.efecto;

  const propias = combatState.cards.filter((c) => c.team === "jugador" && c.alive);
  const rivales = combatState.cards.filter((c) => c.team === "enemigo" && c.alive);

  log(combatState, `${protagonista.nombre} activa "${activa.nombre}".`);

  if (efecto.tipo === "dano_area") {
    const atkPromedio = propias.reduce((sum, c) => sum + c.stats.atk, 0) / (propias.length || 1);
    rivales.forEach((objetivo) => {
      const dano = Math.max(1, Math.round(atkPromedio * efecto.multiplicador));
      const murio = applyDamage(objetivo, dano);
      log(combatState, `${objetivo.nombre} recibe ${dano} de daño.`);
      if (murio) {
        log(combatState, `${objetivo.nombre} ha sido derrotada.`);
        reorderFormationAfterDeath(combatState, "enemigo");
      }
    });
  } else if (efecto.tipo === "curacion_equipo") {
    const atkPromedio = propias.reduce((sum, c) => sum + c.stats.atk, 0) / (propias.length || 1);
    propias.forEach((c) => {
      const curacion = Math.round(atkPromedio * efecto.multiplicador);
      applyHeal(c, curacion);
      log(combatState, `${c.nombre} recupera ${curacion} de HP.`);
    });
  } else if (efecto.tipo === "buff_equipo") {
    propias.forEach((c) => {
      if (!c._buffsProtagonista) c._buffsProtagonista = [];
      c._buffsProtagonista.push({ stat: efecto.stat, modificador: efecto.modificador, turnosRestantes: efecto.duracionTurnos });
      c.statsBase[efecto.stat] *= 1 + efecto.modificador;
      recalculateStats(c);
    });
    log(combatState, `Tu equipo gana +${Math.round(efecto.modificador * 100)}% ${efecto.stat.toUpperCase()} por ${efecto.duracionTurnos} turnos.`);
  } else if (efecto.tipo === "debuff_area") {
    rivales.forEach((c) => {
      if (!c._buffsProtagonista) c._buffsProtagonista = [];
      c._buffsProtagonista.push({ stat: efecto.stat, modificador: -Math.abs(efecto.modificador), turnosRestantes: efecto.duracionTurnos });
      c.statsBase[efecto.stat] *= 1 - Math.abs(efecto.modificador);
      recalculateStats(c);
    });
    log(combatState, `El equipo enemigo pierde ${Math.round(Math.abs(efecto.modificador) * 100)}% ${efecto.stat.toUpperCase()} por ${efecto.duracionTurnos} turnos.`);
  }

  combatState.protagonistaUsado = true;
  checkVictoryConditions(combatState);
  return { ok: true };
}

/**
 * Se llama al inicio de cada turno para bajar la duración de los buffs
 * temporales que dio la activa del protagonista (independiente de los
 * estados normales de statusEffects.js, que son por habilidades de carta).
 */
function tickProtagonistBuffs(combatCard) {
  if (!combatCard._buffsProtagonista || combatCard._buffsProtagonista.length === 0) return;
  const restantes = [];
  combatCard._buffsProtagonista.forEach((buff) => {
    const nuevaDuracion = buff.turnosRestantes - 1;
    if (nuevaDuracion <= 0) {
      combatCard.statsBase[buff.stat] /= 1 + buff.modificador;
    } else {
      restantes.push({ ...buff, turnosRestantes: nuevaDuracion });
    }
  });
  combatCard._buffsProtagonista = restantes;
  recalculateStats(combatCard);
}
