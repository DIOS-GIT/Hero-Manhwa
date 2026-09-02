/**
 * ACTIONS.JS
 * -----------------------------------------------------------------------
 * Cada función de aquí ejecuta UNA acción de combate completa: valida
 * lo que haga falta, muta el combatState, agrega líneas al log y
 * devuelve un resumen. La UI (o el admin, al probar) solo necesita
 * llamar a estas funciones — nunca debe tocar el estado directamente.
 * -----------------------------------------------------------------------
 */

function log(combatState, mensaje) {
  combatState.log.push(`T${combatState.turno} · ${mensaje}`);
}

/**
 * Ataque normal. Por defecto va a la Carta 1 rival. Si
 * `saltarPrimeraLinea` es true, se cobra el costo de energía y el
 * jugador puede elegir cualquier objetivo de retaguardia
 * (objetivoElegidoId es obligatorio en ese caso).
 */
function actionAttack(combatState, atacante, opciones = {}) {
  const { saltarPrimeraLinea = false, objetivoElegidoId = null } = opciones;

  if (saltarPrimeraLinea) {
    const costo = combatState.reglas.energia.costoSaltarPrimeraLinea;
    if (!spendEnergy(combatState, atacante.team, costo)) {
      log(combatState, `${atacante.nombre} no tiene suficiente energía para saltar la primera línea.`);
      return { ok: false };
    }
  }

  const candidatos = getValidNormalAttackTargets(combatState, atacante, saltarPrimeraLinea);
  let objetivo = saltarPrimeraLinea
    ? candidatos.find((c) => c.instanceId === objetivoElegidoId)
    : candidatos[0];

  if (!objetivo) {
    log(combatState, `${atacante.nombre} no tiene objetivo válido para atacar.`);
    return { ok: false };
  }

  objetivo = applyProtectionRedirect(combatState, objetivo);

  const resultado = calculateDamage(atacante, objetivo, 1.0);
  const murio = applyDamage(objetivo, resultado.valor);
  if (atacante.team === "jugador") combatState.danoHechoPorJugador += resultado.valor;

  let mensaje = `${atacante.nombre} ataca a ${objetivo.nombre} por ${resultado.valor} de daño`;
  if (resultado.fueVentajaElemental) mensaje += " (¡ventaja elemental!)";
  if (resultado.fueDesventajaElemental) mensaje += " (desventaja elemental)";
  log(combatState, mensaje + ".");

  grantAttackEnergy(combatState, atacante.team);
  grantDamageTakenEnergy(combatState, objetivo.team);

  if (murio) {
    log(combatState, `${objetivo.nombre} ha sido derrotada.`);
    reorderFormationAfterDeath(combatState, objetivo.team);
    combatState.cards.filter((c) => c.team === objetivo.team && c.alive).forEach(recalculateStats);
  }

  checkVictoryConditions(combatState);
  return { ok: true, objetivo, dano: resultado.valor, murio };
}

/** Acción "Defender": reduce el daño que reciba esta carta hasta su próximo turno. */
function actionDefend(combatState, actor) {
  actor.defendiendo = true;
  actor._reduccionDefender = combatState.reglas.defender.reduccionDano;
  log(combatState, `${actor.nombre} se pone en guardia (Defender).`);
  return { ok: true };
}

/**
 * Usa una habilidad activa por nombre. `objetivoId` es necesario salvo
 * que la habilidad sea de área o sobre uno mismo.
 */
function actionUseAbility(combatState, actor, nombreHabilidad, objetivoId) {
  if (hasStatus(actor, "silencio")) {
    log(combatState, `${actor.nombre} está silenciado y no puede usar habilidades.`);
    return { ok: false };
  }

  const habilidad = (actor.habilidades || []).find((h) => h.nombre === nombreHabilidad);
  if (!habilidad) return { ok: false };

  if ((actor.cooldowns[nombreHabilidad] || 0) > 0) {
    log(combatState, `${habilidad.nombre} todavía está en enfriamiento.`);
    return { ok: false };
  }

  if (!spendEnergy(combatState, actor.team, habilidad.costoEnergia)) {
    log(combatState, `${actor.nombre} no tiene suficiente energía para ${habilidad.nombre}.`);
    return { ok: false };
  }

  const objetivosPosibles = getValidAbilityTargets(combatState, actor, habilidad);
  let objetivo = objetivosPosibles.find((c) => c.instanceId === objetivoId) || objetivosPosibles[0];
  if (!objetivo) {
    log(combatState, `${habilidad.nombre} no tiene objetivo válido.`);
    return { ok: false };
  }

  const efecto = habilidad.efecto || {};

  if (efecto.tipo === "dano") {
    const resultado = calculateDamage(actor, objetivo, efecto.multiplicador || 1.0);
    const murio = applyDamage(objetivo, resultado.valor);
    if (actor.team === "jugador") combatState.danoHechoPorJugador += resultado.valor;
    log(combatState, `${actor.nombre} usa ${habilidad.nombre} sobre ${objetivo.nombre} (${resultado.valor} de daño).`);
    if (murio) {
      log(combatState, `${objetivo.nombre} ha sido derrotada.`);
      reorderFormationAfterDeath(combatState, objetivo.team);
    }
  } else if (efecto.tipo === "curacion") {
    const cantidad = Math.round(actor.stats.atk * (efecto.multiplicador || 1.0));
    applyHeal(objetivo, cantidad);
    log(combatState, `${actor.nombre} usa ${habilidad.nombre} y cura ${cantidad} de HP a ${objetivo.nombre}.`);
  } else if (efecto.tipo === "taunt") {
    actor.protegiendo = true;
    actor.protegiendoTurnosRestantes = 2;
    log(combatState, `${actor.nombre} usa ${habilidad.nombre} y llama la atención del enemigo.`);
  }

  if (habilidad.estadoQueAplica) {
    applyStatus(objetivo, habilidad.estadoQueAplica);
    const def = getStatusById(habilidad.estadoQueAplica);
    log(combatState, `${objetivo.nombre} queda con ${def ? def.label : habilidad.estadoQueAplica}.`);
  }

  if (habilidad.cooldownTurnos > 0) {
    actor.cooldowns[nombreHabilidad] = habilidad.cooldownTurnos;
  }

  checkVictoryConditions(combatState);
  return { ok: true };
}

/**
 * Cambia formación. El primer cambio del turno es gratis
 * (rules.formacion.cambiosGratisPorTurno); a partir de ahí cuesta
 * energía (rules.formacion.costoCambioExtra).
 */
function actionChangeFormation(combatState, team, instanceIdA, instanceIdB) {
  const usados = combatState.cambiosFormacionEsteTurno[team] || 0;
  const gratis = combatState.reglas.formacion.cambiosGratisPorTurno;

  if (usados >= gratis) {
    const costo = combatState.reglas.formacion.costoCambioExtra;
    if (!spendEnergy(combatState, team, costo)) {
      log(combatState, `No hay suficiente energía para otro cambio de formación.`);
      return { ok: false };
    }
  }

  const exito = swapPositions(combatState, instanceIdA, instanceIdB);
  if (exito) {
    combatState.cambiosFormacionEsteTurno[team] = usados + 1;
    combatState.cards.filter((c) => c.team === team).forEach(recalculateStats);
    log(combatState, `El equipo ${team} cambia su formación.`);
  }
  return { ok: exito };
}

function checkVictoryConditions(combatState) {
  const jugadorVivos = combatState.cards.filter((c) => c.team === "jugador" && c.alive).length;
  const enemigoVivos = combatState.cards.filter((c) => c.team === "enemigo" && c.alive).length;

  if (enemigoVivos === 0) {
    combatState.finalizado = true;
    combatState.resultado = "victoria";
    log(combatState, "¡Victoria! El equipo enemigo fue derrotado.");
  } else if (jugadorVivos === 0) {
    combatState.finalizado = true;
    combatState.resultado = "derrota";
    log(combatState, "Derrota. Tu equipo fue derrotado.");
  }
}
