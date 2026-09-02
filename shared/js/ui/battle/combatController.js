/**
 * COMBATCONTROLLER.JS
 * -----------------------------------------------------------------------
 * Todas las cartas se ven a la vez en su formación (ver battlefieldUI.js).
 * Tocar TU carta con el turno abre/cierra sus acciones (dentro de la
 * misma carta, como una hoja pegada a ella). Tocar cualquier otra carta
 * sin selección activa no hace nada.
 * -----------------------------------------------------------------------
 */

let activeCombat = null;
let seleccionModo = null; // null | "saltar_linea" | "habilidad" | "formacion"
let habilidadSeleccionada = null;
let formacionPrimeraSeleccion = null;

// Si la carta con el turno del jugador está tocada, tocarla
// abre/cierra sus acciones (en vez de un panel siempre visible).
let accionesAbiertas = false;

let combatFinishCallback = null;

function startCombatFromTeams(equipoJugadorCards, equipoEnemigoCards, opciones = {}) {
  activeCombat = createCombat(equipoJugadorCards, equipoEnemigoCards, opciones);
  combatFinishCallback = opciones.onFinish || null;
  resetInteractionState();
  showView("combate");
  renderCombatScreen();
}

function resetInteractionState() {
  seleccionModo = null;
  habilidadSeleccionada = null;
  formacionPrimeraSeleccion = null;
  accionesAbiertas = false;
}

function renderCombatScreen() {
  const container = document.getElementById("view-combate");
  if (!activeCombat) {
    container.innerHTML = `<p class="empty-hint">No hay ningún combate de prueba activo todavía. Ve a "Equipos y combate" para armar uno.</p>`;
    return;
  }

  const cs = activeCombat;
  const actor = cs.actorActual;
  const esTurnoJugador = actor && actor.team === "jugador" && actor.alive && !cs.finalizado;

  let seleccionables = [];
  if (seleccionModo === "saltar_linea" && actor) {
    seleccionables = getValidNormalAttackTargets(cs, actor, true).map((c) => c.instanceId);
  } else if (seleccionModo === "habilidad" && actor && habilidadSeleccionada) {
    seleccionables = getValidAbilityTargets(cs, actor, habilidadSeleccionada).map((c) => c.instanceId);
  } else if (seleccionModo === "formacion" && actor) {
    seleccionables = getTeamBySlot(cs, actor.team).map((c) => c.instanceId);
  }

  let panelExtraHtml = "";
  if (cs.finalizado) {
    panelExtraHtml = `
      <div class="actionpanel actionpanel--final">
        <p class="resultado resultado--${cs.resultado}">
          ${cs.resultado === "victoria" ? "¡Victoria del equipo jugador!" : "El equipo jugador fue derrotado."}
        </p>
        <button class="btn" id="btn-cerrar-combate">${combatFinishCallback ? "Continuar" : "Volver a Equipos y combate"}</button>
      </div>
    `;
  } else if (!actor) {
    panelExtraHtml = `<div class="actionpanel"><p>Calculando siguiente turno…</p></div>`;
  } else if (!esTurnoJugador) {
    panelExtraHtml = `
      <div class="actionpanel">
        <p>Turno de <strong>${actor.nombre}</strong> (equipo enemigo).</p>
        <button class="btn" id="btn-continuar-ia">Continuar</button>
      </div>
    `;
  } else if (seleccionModo) {
    panelExtraHtml = renderSelectionHint();
  } else if (accionesAbiertas) {
    panelExtraHtml = renderPlayerActionSheet(cs, actor);
  } else {
    panelExtraHtml = `<p class="hint hint--tap">Toca a <strong>${actor.nombre}</strong> para ver sus acciones.</p>`;
  }

  container.innerHTML = `
    ${renderRelicsBar()}
    <div class="combatscreen">
      <div class="combatscreen__main">
        ${renderTurnQueue(cs)}
        ${renderBattlefield(cs, seleccionables)}
        ${panelExtraHtml}
      </div>
      ${renderMoveHistorySidebar(cs)}
    </div>
  `;

  attachRelicsBarEvents(container, renderCombatScreen);
  attachCombatScreenEvents();
  scrollMoveHistoryToBottom();
}

function renderSelectionHint() {
  const mensaje =
    seleccionModo === "saltar_linea"
      ? "Elige un objetivo en la retaguardia enemiga (resaltado)."
      : seleccionModo === "habilidad"
      ? `Elige objetivo para ${habilidadSeleccionada.nombre} (resaltado).`
      : `Elige dos cartas de tu equipo (resaltadas) para intercambiar posición. ${formacionPrimeraSeleccion ? "Ya elegiste la primera, elige la segunda." : ""}`;
  return `
    <div class="actionpanel">
      <p class="hint">${mensaje}</p>
      <button class="btn btn--secundario" id="btn-cancelar-seleccion">Cancelar</button>
    </div>
  `;
}

/** Hoja de acciones que se abre al tocar tu carta con el turno. */
function renderPlayerActionSheet(cs, actor) {
  const energia = getTeamEnergy(cs, actor.team);
  const costoSaltar = cs.reglas.energia.costoSaltarPrimeraLinea;

  const protagonistaHtml = cs.protagonista
    ? `<button class="btn btn--protagonista" id="btn-activa-protagonista" ${cs.protagonistaUsado ? "disabled" : ""}>
        ⭐ ${cs.protagonista.activaUnica.nombre} (${cs.protagonista.nombre})${cs.protagonistaUsado ? " — usada" : ""}
      </button>`
    : "";

  const habilidadesHtml = (actor.habilidades || [])
    .map((h) => {
      const enCooldown = (actor.cooldowns[h.nombre] || 0) > 0;
      const sinEnergia = h.costoEnergia > energia;
      const deshabilitada = enCooldown || sinEnergia;
      let motivo = "";
      if (enCooldown) motivo = ` (enfriamiento: ${actor.cooldowns[h.nombre]})`;
      else if (sinEnergia) motivo = " (energía insuficiente)";
      return `
        <button class="btn btn--habilidad" data-habilidad="${h.nombre}" ${deshabilitada ? "disabled" : ""}>
          ${h.nombre} — ${h.costoEnergia}⚡${motivo}
        </button>
      `;
    })
    .join("");

  return `
    <div class="actionsheet">
      <div class="actionsheet__header">
        <span>Acciones de ${actor.nombre} · Energía: ${energia}</span>
        <button type="button" class="actionsheet__cerrar" id="btn-cerrar-acciones">✕</button>
      </div>
      ${protagonistaHtml}
      <div class="actionpanel__grupo">
        <button class="btn" id="btn-atacar">Atacar (primera línea rival)</button>
        <button class="btn" id="btn-saltar-linea" ${energia < costoSaltar ? "disabled" : ""}>
          Atacar retaguardia (${costoSaltar}⚡)
        </button>
        <button class="btn" id="btn-defender">Defender</button>
        <button class="btn" id="btn-cambiar-formacion">Cambiar formación</button>
      </div>
      <div class="actionpanel__grupo actionpanel__grupo--habilidades">${habilidadesHtml}</div>
    </div>
  `;
}

function attachCombatScreenEvents() {
  const container = document.getElementById("view-combate");

  const btnAtacar = container.querySelector("#btn-atacar");
  if (btnAtacar) btnAtacar.addEventListener("click", () => {
    actionAttack(activeCombat, activeCombat.actorActual, {});
    afterPlayerAction();
  });

  const btnSaltar = container.querySelector("#btn-saltar-linea");
  if (btnSaltar) btnSaltar.addEventListener("click", () => {
    seleccionModo = "saltar_linea";
    renderCombatScreen();
  });

  const btnDefender = container.querySelector("#btn-defender");
  if (btnDefender) btnDefender.addEventListener("click", () => {
    actionDefend(activeCombat, activeCombat.actorActual);
    afterPlayerAction();
  });

  const btnCambiarFormacion = container.querySelector("#btn-cambiar-formacion");
  if (btnCambiarFormacion) btnCambiarFormacion.addEventListener("click", () => {
    seleccionModo = "formacion";
    formacionPrimeraSeleccion = null;
    renderCombatScreen();
  });

  const btnCancelar = container.querySelector("#btn-cancelar-seleccion");
  if (btnCancelar) btnCancelar.addEventListener("click", () => {
    seleccionModo = null;
    habilidadSeleccionada = null;
    formacionPrimeraSeleccion = null;
    renderCombatScreen();
  });

  const btnCerrarAcciones = container.querySelector("#btn-cerrar-acciones");
  if (btnCerrarAcciones) btnCerrarAcciones.addEventListener("click", () => {
    accionesAbiertas = false;
    renderCombatScreen();
  });

  container.querySelectorAll(".btn--habilidad").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nombre = btn.dataset.habilidad;
      const habilidad = activeCombat.actorActual.habilidades.find((h) => h.nombre === nombre);
      if (habilidad.tipoObjetivo === "uno_mismo" || habilidad.tipoObjetivo === "area") {
        actionUseAbility(activeCombat, activeCombat.actorActual, nombre, null);
        afterPlayerAction();
      } else {
        seleccionModo = "habilidad";
        habilidadSeleccionada = habilidad;
        renderCombatScreen();
      }
    });
  });

  // Cualquier carta de la formación es tocable.
  container.querySelectorAll("[data-instance-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const esSeleccionable = el.classList.contains("formcard--selectable");
      if (seleccionModo && !esSeleccionable) return; // en selección, solo cuentan los objetivos válidos
      handleCardTap(el.dataset.instanceId);
    });
  });

  const btnContinuarIA = container.querySelector("#btn-continuar-ia");
  if (btnContinuarIA) btnContinuarIA.addEventListener("click", () => {
    runEnemyAITurn(activeCombat, activeCombat.actorActual);
    if (!activeCombat.finalizado) advanceTurn(activeCombat);
    accionesAbiertas = false;
    renderCombatScreen();
  });

  const btnActivaProtagonista = container.querySelector("#btn-activa-protagonista");
  if (btnActivaProtagonista) btnActivaProtagonista.addEventListener("click", () => {
    actionUseProtagonistActive(activeCombat);
    renderCombatScreen();
  });

  const btnCerrar = container.querySelector("#btn-cerrar-combate");
  if (btnCerrar) btnCerrar.addEventListener("click", () => {
    const resultadoCombate = activeCombat;
    const callback = combatFinishCallback;
    activeCombat = null;
    combatFinishCallback = null;
    if (callback) {
      callback(resultadoCombate);
    } else {
      showView("equipos");
    }
  });
}

/**
 * Tocar una carta hace UNA de dos cosas, en este orden de prioridad:
 *   1. Si hay una selección de objetivo en curso y esta carta es
 *      válida como objetivo -> se usa como objetivo.
 *   2. Si es TU carta y le toca actuar ahora -> abre/cierra sus
 *      acciones. Cualquier otra carta no hace nada (ya se ve entera
 *      en la formación, no hace falta "agrandarla").
 */
function handleCardTap(instanceId) {
  const cs = activeCombat;
  const carta = cs.cards.find((c) => c.instanceId === instanceId);
  if (!carta) return;

  if (seleccionModo) {
    handleTargetSelection(instanceId);
    return;
  }

  const esLaDelTurno = cs.actorActual && cs.actorActual.instanceId === instanceId && carta.team === "jugador" && carta.alive;
  if (!esLaDelTurno) return;

  accionesAbiertas = !accionesAbiertas;
  renderCombatScreen();
}

function handleTargetSelection(instanceId) {
  if (seleccionModo === "saltar_linea") {
    actionAttack(activeCombat, activeCombat.actorActual, {
      saltarPrimeraLinea: true,
      objetivoElegidoId: instanceId,
    });
    seleccionModo = null;
    afterPlayerAction();
  } else if (seleccionModo === "habilidad") {
    actionUseAbility(activeCombat, activeCombat.actorActual, habilidadSeleccionada.nombre, instanceId);
    seleccionModo = null;
    habilidadSeleccionada = null;
    afterPlayerAction();
  } else if (seleccionModo === "formacion") {
    if (!formacionPrimeraSeleccion) {
      formacionPrimeraSeleccion = instanceId;
      renderCombatScreen();
    } else {
      actionChangeFormation(activeCombat, activeCombat.actorActual.team, formacionPrimeraSeleccion, instanceId);
      seleccionModo = null;
      formacionPrimeraSeleccion = null;
      renderCombatScreen();
    }
  }
}

function afterPlayerAction() {
  accionesAbiertas = false;
  if (!activeCombat.finalizado) {
    advanceTurn(activeCombat);
  }
  renderCombatScreen();
}
