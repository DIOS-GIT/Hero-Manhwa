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

let autoCombateActivo = false;
let velocidadCombate = 1; // 1, 2, o 3
let _autoTurnTimer = null;

/** Escala una duración en ms según la velocidad elegida — usarlo en todo setTimeout de este archivo/combatFx. */
function escalarDuracion(ms) {
  return Math.round(ms / velocidadCombate);
}

function startCombatFromTeams(equipoJugadorCards, equipoEnemigoCards, opciones = {}) {
  activeCombat = createCombat(equipoJugadorCards, equipoEnemigoCards, opciones);
  combatFinishCallback = opciones.onFinish || null;
  resetInteractionState();
  clearTimeout(_autoTurnTimer);
  autoCombateActivo = false;
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
  } else if (autoCombateActivo) {
    panelExtraHtml = `<div class="actionpanel"><p class="hint hint--tap">🤖 Combatiendo solo — ${actor ? actor.nombre : "…"} en turno.</p></div>`;
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
        ${
          cs.bonoElemento
            ? `<div class="elementobono">🔗 Sinergia de ${cs.bonoElemento.elemento}: +${Math.round(cs.bonoElemento.bonoPct * 100)}% ATQ/DEF/VEL a esas cartas</div>`
            : ""
        }
        ${!cs.finalizado ? `
          <div class="combatscreen__topbar">
            <div class="combatscreen__controles">
              <button type="button" class="btn btn--secundario btn--pequeno" id="btn-velocidad-combate">${velocidadCombate}x</button>
              <button type="button" class="btn ${autoCombateActivo ? "btn--auto-activo" : "btn--secundario"} btn--pequeno" id="btn-auto-combate">${autoCombateActivo ? "⏸ Auto" : "▶ Auto"}</button>
            </div>
            <button type="button" class="btn btn--peligro btn--abandonar" id="btn-abandonar-combate">Abandonar combate</button>
          </div>
        ` : ""}
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
  maybeScheduleAutoTurn();
}

/**
 * Si el auto-combate está activo, hace que el combate se juegue solo:
 * la carta con el turno (sea del jugador o enemiga) actúa por su cuenta
 * usando la misma IA que ya existe para los enemigos — funciona igual
 * de bien para cualquier bando, no está atada a "enemigo".
 */
function maybeScheduleAutoTurn() {
  clearTimeout(_autoTurnTimer);
  if (!autoCombateActivo || !activeCombat || activeCombat.finalizado || !activeCombat.actorActual) return;

  _autoTurnTimer = setTimeout(async () => {
    if (!autoCombateActivo || !activeCombat || activeCombat.finalizado) return;
    const atacanteId = activeCombat.actorActual.instanceId;
    await playAttackLunge(atacanteId);
    if (!autoCombateActivo || !activeCombat || activeCombat.finalizado) return; // se pudo desactivar mientras esperaba

    const resultado = runEnemyAITurn(activeCombat, activeCombat.actorActual);
    if (!activeCombat.finalizado) advanceTurn(activeCombat);
    accionesAbiertas = false;
    renderCombatScreen();
    if (resultado && resultado.fx) playCombatFx(resultado.fx);
  }, escalarDuracion(550));
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
  if (btnAtacar) btnAtacar.addEventListener("click", async () => {
    const atacanteId = activeCombat.actorActual.instanceId;
    await playAttackLunge(atacanteId);
    const resultado = actionAttack(activeCombat, activeCombat.actorActual, {});
    afterPlayerAction(resultado);
  });

  const btnSaltar = container.querySelector("#btn-saltar-linea");
  if (btnSaltar) btnSaltar.addEventListener("click", () => {
    seleccionModo = "saltar_linea";
    renderCombatScreen();
  });

  const btnDefender = container.querySelector("#btn-defender");
  if (btnDefender) btnDefender.addEventListener("click", () => {
    const resultado = actionDefend(activeCombat, activeCombat.actorActual);
    afterPlayerAction(resultado);
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
        const resultado = actionUseAbility(activeCombat, activeCombat.actorActual, nombre, null);
        afterPlayerAction(resultado);
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
  if (btnContinuarIA) btnContinuarIA.addEventListener("click", async () => {
    const atacanteId = activeCombat.actorActual.instanceId;
    await playAttackLunge(atacanteId);
    const resultado = runEnemyAITurn(activeCombat, activeCombat.actorActual);
    if (!activeCombat.finalizado) advanceTurn(activeCombat);
    accionesAbiertas = false;
    renderCombatScreen();
    if (resultado && resultado.fx) playCombatFx(resultado.fx);
  });

  const btnActivaProtagonista = container.querySelector("#btn-activa-protagonista");
  if (btnActivaProtagonista) btnActivaProtagonista.addEventListener("click", () => {
    const resultado = actionUseProtagonistActive(activeCombat);
    renderCombatScreen();
    if (resultado && resultado.fx) playCombatFx(resultado.fx);
  });

  const btnAbandonar = container.querySelector("#btn-abandonar-combate");
  if (btnAbandonar) btnAbandonar.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres abandonar este combate? Se cuenta como derrota y no recibirás ninguna recompensa.")) return;
    clearTimeout(_autoTurnTimer);
    autoCombateActivo = false;
    activeCombat.finalizado = true;
    activeCombat.resultado = "derrota";
    activeCombat.abandonado = true;
    resetInteractionState();
    renderCombatScreen();
  });

  const btnAuto = container.querySelector("#btn-auto-combate");
  if (btnAuto) btnAuto.addEventListener("click", () => {
    autoCombateActivo = !autoCombateActivo;
    resetInteractionState();
    renderCombatScreen();
  });

  const btnVelocidad = container.querySelector("#btn-velocidad-combate");
  if (btnVelocidad) btnVelocidad.addEventListener("click", () => {
    velocidadCombate = velocidadCombate >= 3 ? 1 : velocidadCombate + 1;
    renderCombatScreen();
  });

  const btnCerrar = container.querySelector("#btn-cerrar-combate");
  if (btnCerrar && activeCombat.resultado === "victoria" && !activeCombat._celebrado) {
    activeCombat._celebrado = true; // una sola vez, no en cada repintado
    setTimeout(() => burstConfetti(container.querySelector(".resultado"), 44), 200);
    if (typeof sfxVictoria === "function") sfxVictoria();
  }
  if (btnCerrar && activeCombat.resultado === "derrota" && !activeCombat._celebrado) {
    activeCombat._celebrado = true;
    if (typeof sfxDerrota === "function") sfxDerrota();
  }
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
  if (autoCombateActivo) return; // el combate se juega solo, no se puede intervenir a mano
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

async function handleTargetSelection(instanceId) {
  if (seleccionModo === "saltar_linea") {
    const atacanteId = activeCombat.actorActual.instanceId;
    seleccionModo = null;
    await playAttackLunge(atacanteId);
    const resultado = actionAttack(activeCombat, activeCombat.actorActual, {
      saltarPrimeraLinea: true,
      objetivoElegidoId: instanceId,
    });
    afterPlayerAction(resultado);
  } else if (seleccionModo === "habilidad") {
    const atacanteId = activeCombat.actorActual.instanceId;
    const habilidad = habilidadSeleccionada;
    seleccionModo = null;
    habilidadSeleccionada = null;
    await playAttackLunge(atacanteId);
    const resultado = actionUseAbility(activeCombat, activeCombat.actorActual, habilidad.nombre, instanceId);
    afterPlayerAction(resultado);
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

function afterPlayerAction(resultadoAccion) {
  accionesAbiertas = false;
  if (!activeCombat.finalizado) {
    advanceTurn(activeCombat);
  }
  renderCombatScreen();
  if (resultadoAccion && resultadoAccion.fx) playCombatFx(resultadoAccion.fx);
}
