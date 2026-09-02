/**
 * SMARTAI.JS
 * -----------------------------------------------------------------------
 * Reemplaza al placeholder anterior (simpleAI.js). Enfoque: para cada
 * acción legal que la carta pueda hacer este turno, SIMULA el
 * resultado (sobre una copia del combate, nunca el real) y le pone un
 * puntaje con una heurística. Elige la de mejor puntaje y la ejecuta
 * de verdad.
 *
 * Por qué este enfoque y no algo más pesado (MCTS, minimax profundo):
 * con 4 cartas por bando y pocas acciones legales por turno (atacar,
 * saltar línea, defender, 2-3 habilidades con 1-4 objetivos cada una),
 * el árbol de decisión de UN turno es chico — se puede evaluar
 * completo, al instante, en JavaScript puro. No hace falta ninguna
 * tecnología externa. Ver runEnemyAITurn() más abajo para el detalle.
 *
 * Limitación conocida: solo mira 1 turno hacia adelante (el propio),
 * no lo que pasa después. Por eso "Defender" casi nunca gana contra
 * un ataque que sí deja daño hecho en el marcador — se compensa con
 * un pequeño bonus manual cuando el HP propio está bajo (ver abajo).
 * Si más adelante se quiere una IA más fuerte, el siguiente paso
 * natural es simular 2 turnos en vez de 1, reusando exactamente las
 * mismas piezas de aquí.
 * -----------------------------------------------------------------------
 */

/**
 * Puntúa un combatState (ya resuelto tras una acción simulada) desde
 * la perspectiva de `team`. Más alto = mejor para ese equipo.
 */
function evaluateCombatState(combatState, team) {
  const rival = team === "jugador" ? "enemigo" : "jugador";
  const propios = combatState.cards.filter((c) => c.team === team);
  const rivales = combatState.cards.filter((c) => c.team === rival);

  const propiosVivos = propios.filter((c) => c.alive).length;
  const rivalesVivos = rivales.filter((c) => c.alive).length;
  const propiosHP = propios.reduce((s, c) => s + c.hp, 0);
  const propiosHPMax = propios.reduce((s, c) => s + c.hpMax, 0) || 1;
  const rivalesHP = rivales.reduce((s, c) => s + c.hp, 0);
  const rivalesHPMax = rivales.reduce((s, c) => s + c.hpMax, 0) || 1;

  let score = 0;
  score += (rivales.length - rivalesVivos) * 130; // cada rival derrotado
  score -= (propios.length - propiosVivos) * 130; // cada carta propia perdida
  score += (propiosHP / propiosHPMax) * 55;
  score -= (rivalesHP / rivalesHPMax) * 55;

  // pequeño valor por dejar control (aturdido/silencio) en un rival vivo
  rivales.forEach((c) => {
    if (c.alive && (hasStatus(c, "aturdido") || hasStatus(c, "silencio"))) score += 9;
  });

  if (combatState.finalizado) {
    const ganaEnemigo = combatState.resultado === "derrota"; // "derrota" = pierde el jugador
    const esteEquipoGano = team === "enemigo" ? ganaEnemigo : !ganaEnemigo;
    score += esteEquipoGano ? 4000 : -4000;
  }

  return score;
}

/** Todas las acciones legales que `actor` puede tomar este turno. */
function generateCandidateActions(combatState, actor) {
  const candidatos = [];
  const energiaEquipo = getTeamEnergy(combatState, actor.team);

  const objetivoNormal = getValidNormalAttackTargets(combatState, actor, false)[0];
  if (objetivoNormal) {
    candidatos.push({ tipo: "ataque", saltarPrimeraLinea: false, objetivoId: objetivoNormal.instanceId });
  }

  const costoSaltar = combatState.reglas.energia.costoSaltarPrimeraLinea;
  if (energiaEquipo >= costoSaltar) {
    getValidNormalAttackTargets(combatState, actor, true).forEach((obj) => {
      candidatos.push({ tipo: "ataque", saltarPrimeraLinea: true, objetivoId: obj.instanceId });
    });
  }

  candidatos.push({ tipo: "defender" });

  if (!hasStatus(actor, "silencio")) {
    (actor.habilidades || []).forEach((h) => {
      if ((actor.cooldowns[h.nombre] || 0) > 0) return;
      if (h.costoEnergia > energiaEquipo) return;

      const objetivos = getValidAbilityTargets(combatState, actor, h);
      if (h.tipoObjetivo === "uno_mismo" || h.tipoObjetivo === "area") {
        candidatos.push({ tipo: "habilidad", nombre: h.nombre, objetivoId: objetivos[0] ? objetivos[0].instanceId : null });
      } else {
        objetivos.forEach((obj) => candidatos.push({ tipo: "habilidad", nombre: h.nombre, objetivoId: obj.instanceId }));
      }
    });
  }

  return candidatos;
}

function executeCandidate(combatState, actorRef, candidato) {
  if (candidato.tipo === "ataque") {
    return actionAttack(combatState, actorRef, {
      saltarPrimeraLinea: candidato.saltarPrimeraLinea,
      objetivoElegidoId: candidato.objetivoId,
    });
  }
  if (candidato.tipo === "defender") {
    return actionDefend(combatState, actorRef);
  }
  if (candidato.tipo === "habilidad") {
    return actionUseAbility(combatState, actorRef, candidato.nombre, candidato.objetivoId);
  }
  return { ok: false };
}

/**
 * Punto de entrada: decide y EJECUTA de verdad la mejor acción para
 * `actor` en el combatState real (no una copia).
 */
function runEnemyAITurn(combatState, actor) {
  const candidatos = generateCandidateActions(combatState, actor);
  if (candidatos.length === 0) {
    return actionAttack(combatState, actor, {});
  }

  let mejorCandidato = null;
  let mejorScore = -Infinity;

  candidatos.forEach((candidato) => {
    const clone = structuredClone(combatState);
    const actorClone = clone.cards.find((c) => c.instanceId === actor.instanceId);
    if (!actorClone || !actorClone.alive) return;

    executeCandidate(clone, actorClone, candidato);
    let score = evaluateCombatState(clone, actor.team);

    // Compensación manual: Defender no deja rastro de daño en el
    // marcador de 1 turno, así que sin esto la IA casi nunca se
    // defendería aunque le convenga. Se le da un empujón cuando el
    // propio HP está bajo.
    if (candidato.tipo === "defender") {
      const propioEnClone = clone.cards.find((c) => c.instanceId === actor.instanceId);
      if (propioEnClone && propioEnClone.hp / propioEnClone.hpMax < 0.3) score += 45;
    }

    if (score > mejorScore) {
      mejorScore = score;
      mejorCandidato = candidato;
    }
  });

  if (!mejorCandidato) return actionAttack(combatState, actor, {});
  return executeCandidate(combatState, actor, mejorCandidato);
}
