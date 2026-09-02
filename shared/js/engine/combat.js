/**
 * COMBAT.JS
 * -----------------------------------------------------------------------
 * Punto de entrada del motor: crea un combate nuevo a partir de dos
 * equipos (hasta 4 cartas cada uno) y expone la función que avanza al
 * siguiente turno.
 *
 * combatState = {
 *   cards: [combatCard, ...]            (jugador + enemigo, mezclados)
 *   reglas: <copia de GameData.reglas>  (para que editar el admin en
 *                                        medio de una prueba no rompa
 *                                        un combate ya en curso)
 *   energia: { jugador: n, enemigo: n }
 *   log: [string, ...]
 *   turno: number                        (contador global, informativo)
 *   cambiosFormacionEsteTurno: { jugador: n, enemigo: n }
 *   finalizado: boolean
 *   resultado: "victoria" | "derrota" | null
 *   actorActual: combatCard | null       (a quién le toca actuar ahora)
 * }
 * -----------------------------------------------------------------------
 */

/**
 * @param {object} opciones
 *   opciones.hpInicial       {cardId: hp} — HP con el que arranca cada
 *                            carta del jugador (para runs: continuar con
 *                            el HP que traía del nodo anterior). Si no
 *                            se pasa, cada carta arranca con HP completo.
 *   opciones.buffsPermanentes {cardId: [{stat, modificador}]} — buffs
 *                            ganados durante la run (eventos/objetos),
 *                            aplicados encima de las stats base.
 *   opciones.protagonista    objeto protagonista (ver
 *                            data/protagonistSchema.js) o null — su
 *                            activa única se puede usar 1 vez en este
 *                            combate, sin ocupar una posición.
 */
function createCombat(equipoJugadorTemplates, equipoEnemigoTemplates, opciones = {}) {
  const cards = [];
  const hpInicial = opciones.hpInicial || {};
  const buffsPermanentes = opciones.buffsPermanentes || {};

  equipoJugadorTemplates.forEach((tpl, i) => {
    const card = createCombatCard(tpl, "jugador", i + 1);
    (buffsPermanentes[tpl.id] || []).forEach((buff) => {
      if (card.statsBase[buff.stat] !== undefined) {
        card.statsBase[buff.stat] *= 1 + buff.modificador;
      }
    });
    if (hpInicial[tpl.id] !== undefined) {
      card.hp = Math.max(0, Math.min(card.hpMax, hpInicial[tpl.id]));
    }
    cards.push(card);
  });
  equipoEnemigoTemplates.forEach((tpl, i) => {
    cards.push(createCombatCard(tpl, "enemigo", i + 1));
  });

  cards.forEach(recalculateStats);

  const combatState = {
    cards,
    reglas: structuredClone(GameData.reglas),
    energia: { jugador: 0, enemigo: 0 },
    danoHechoPorJugador: 0, // usado por engine/runState.js para el historial
    protagonista: opciones.protagonista || null,
    protagonistaUsado: false,
    log: [],
    turno: 0,
    cambiosFormacionEsteTurno: { jugador: 0, enemigo: 0 },
    finalizado: false,
    resultado: null,
    actorActual: null,
  };

  log(combatState, "El combate comienza.");
  advanceTurn(combatState);
  return combatState;
}

/**
 * Avanza hasta encontrar quién actúa. Resuelve energía de inicio de
 * turno y estados (veneno/aturdido/etc). Si la carta pierde el turno
 * por aturdimiento, se resetea su barra y se busca al siguiente actor
 * automáticamente.
 */
function advanceTurn(combatState) {
  if (combatState.finalizado) return null;

  combatState.cambiosFormacionEsteTurno = { jugador: 0, enemigo: 0 };

  const actor = advanceToNextActor(combatState);
  if (!actor) return null;

  combatState.turno++;
  grantTurnEnergy(combatState, actor.team);

  const { perdioTurno, logs } = resolveStartOfTurnStatuses(actor);
  logs.forEach((m) => log(combatState, m));
  tickProtagonistBuffs(actor);

  actor.defendiendo = false; // el efecto de "Defender" dura hasta el próximo turno propio

  if (!actor.alive) {
    resetActionBar(actor);
    return advanceTurn(combatState);
  }

  if (perdioTurno) {
    resetActionBar(actor);
    Object.keys(actor.cooldowns).forEach((k) => {
      if (actor.cooldowns[k] > 0) actor.cooldowns[k]--;
    });
    return advanceTurn(combatState);
  }

  Object.keys(actor.cooldowns).forEach((k) => {
    if (actor.cooldowns[k] > 0) actor.cooldowns[k]--;
  });

  combatState.actorActual = actor;
  resetActionBar(actor);
  return actor;
}

// La función log(combatState, mensaje) vive en js/engine/actions.js
// (se carga antes que este archivo) — se reutiliza aquí para no
// duplicar la misma función en dos lugares.
