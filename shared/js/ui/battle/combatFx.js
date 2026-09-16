/**
 * COMBATFX.JS
 * -----------------------------------------------------------------------
 * Capa de animación del combate — no calcula nada de juego, solo hace
 * que lo que YA pasó (daño, curación, muerte...) se sienta en pantalla.
 * Trabaja buscando el elemento `[data-instance-id="X"]` ya renderizado
 * y agregándole números flotantes / clases de animación temporales.
 *
 * playAttackLunge() devuelve una Promise para poder hacer:
 *   await playAttackLunge(id);   // la carta se adelanta...
 *   actionAttack(...);            // ...ahí se aplica el daño de verdad...
 *   renderCombatScreen();         // ...se repinta el tablero...
 *   playCombatFx(resultado.fx);   // ...y acá aparecen los números y el golpe.
 * -----------------------------------------------------------------------
 */

function getCombatCardEl(instanceId) {
  return document.querySelector(`[data-instance-id="${instanceId}"]`);
}

/** Adelanta la carta hacia el centro del tablero y vuelve — se usa ANTES de aplicar el daño real. */
function playAttackLunge(instanceId) {
  const el = getCombatCardEl(instanceId);
  if (!el) return Promise.resolve();

  // El tablero es vertical (enemigo arriba, jugador abajo, se encuentran
  // en el centro) — el jugador embiste hacia arriba, el enemigo hacia abajo.
  const direccion = el.closest(".battlefield__side--jugador") ? -1 : 1;
  el.style.setProperty("--lunge-dir", direccion);
  el.classList.add("formcard--embistiendo");

  return new Promise((resolve) => {
    setTimeout(() => {
      el.classList.remove("formcard--embistiendo");
      resolve();
    }, 260);
  });
}

function getOrCreateFxLayer() {
  let layer = document.getElementById("combat-fx-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "combat-fx-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

/** Número flotante (daño, curación, "¡Bloqueado!", etc.) sobre una carta ya renderizada. */
function spawnFloatingNumber(instanceId, texto, tipo) {
  const el = getCombatCardEl(instanceId);
  if (!el) return;

  // .formcard tiene overflow:hidden (para que el arte no se salga del marco),
  // así que el número NO puede ser hijo de la carta o se cortaría al subir.
  // Va en una capa aparte, posicionada con las coordenadas reales de la carta.
  const rect = el.getBoundingClientRect();
  const numero = document.createElement("span");
  numero.className = `fx-numero fx-numero--${tipo}`;
  numero.textContent = texto;
  numero.style.left = `${rect.left + rect.width / 2}px`;
  numero.style.top = `${rect.top + rect.height * 0.25}px`;
  // pequeño offset horizontal al azar para que varios números seguidos no queden pegados
  numero.style.setProperty("--fx-offset", `${Math.round((Math.random() - 0.5) * 30)}px`);

  getOrCreateFxLayer().appendChild(numero);
  setTimeout(() => numero.remove(), 950);
}

/** Destello + sacudida corta sobre la carta que acaba de recibir el efecto. */
function playImpactFlash(instanceId, tipo) {
  const el = getCombatCardEl(instanceId);
  if (!el) return;

  const clase = tipo === "curacion" ? "formcard--brillo-cura" : "formcard--golpeada";
  el.classList.add(clase);
  setTimeout(() => el.classList.remove(clase), 420);
}

/** Colapso al morir — se dispara una sola vez, cuando el fx trae muerte:true. */
function playDeathCollapse(instanceId) {
  const el = getCombatCardEl(instanceId);
  if (!el) return;
  el.classList.add("formcard--cayendo");
  setTimeout(() => el.classList.remove("formcard--cayendo"), 500);
}

/**
 * Anima la barra de HP de "antes" a "después" en vez de que salte de
 * golpe. Como el tablero se re-renderiza entero (innerHTML), no sirve
 * un simple `transition: width` de CSS — el navegador ve un elemento
 * nuevo, no un cambio. Se calcula el HP de antes a partir del propio
 * texto ya renderizado ("hp/hpMax") + el delta de esta acción, y se
 * anima con la Web Animations API, que sí funciona sobre un nodo recién
 * creado.
 * @param {number} deltaConSigno daño = positivo (el HP baja), cura = negativo (el HP sube)
 */
function animateHpBar(instanceId, deltaConSigno) {
  const el = getCombatCardEl(instanceId);
  if (!el) return;
  const fill = el.querySelector(".formcard__hpbar-fill");
  const texto = el.querySelector(".formcard__hptext");
  if (!fill || !texto) return;

  const [hpActual, hpMax] = texto.textContent.split("/").map(Number);
  if (!hpMax) return;

  const hpAntes = Math.max(0, Math.min(hpMax, hpActual + deltaConSigno));
  const pctAntes = (hpAntes / hpMax) * 100;
  const pctAhora = (Math.max(0, hpActual) / hpMax) * 100;
  if (pctAntes === pctAhora) return;

  fill.animate([{ width: `${pctAntes}%` }, { width: `${pctAhora}%` }], { duration: 450, easing: "ease-out", fill: "forwards" });
}

/** Sacude toda la pantalla de combate — solo para golpes grandes (ventaja elemental, activa de protagonista). */
function shakeCombatScreen() {
  const el = document.querySelector(".combatscreen");
  if (!el) return;
  el.classList.add("combatscreen--sacudida");
  setTimeout(() => el.classList.remove("combatscreen--sacudida"), 350);
}

/**
 * Reproduce un array `fx` (el que devuelven actionAttack/actionUseAbility/
 * actionUseProtagonistActive) sobre el tablero YA renderizado con el
 * resultado final. Se llama justo después de renderCombatScreen().
 */
function playCombatFx(fx) {
  if (!fx || fx.length === 0) return;

  let huboGolpeGrande = false;

  fx.forEach((efecto) => {
    if (efecto.tipo === "dano") {
      const texto = `-${efecto.valor}${efecto.ventaja ? " ⬆" : efecto.desventaja ? " ⬇" : ""}`;
      spawnFloatingNumber(efecto.instanceId, texto, efecto.ventaja ? "critico" : "dano");
      playImpactFlash(efecto.instanceId, "dano");
      animateHpBar(efecto.instanceId, efecto.valor);
      if (efecto.muerte) playDeathCollapse(efecto.instanceId);
      if (efecto.ventaja) huboGolpeGrande = true;
    } else if (efecto.tipo === "curacion") {
      spawnFloatingNumber(efecto.instanceId, `+${efecto.valor}`, "curacion");
      playImpactFlash(efecto.instanceId, "curacion");
      animateHpBar(efecto.instanceId, -efecto.valor);
    } else if (efecto.tipo === "buff") {
      spawnFloatingNumber(efecto.instanceId, "▲", "buff");
    } else if (efecto.tipo === "debuff") {
      spawnFloatingNumber(efecto.instanceId, "▼", "debuff");
    } else if (efecto.tipo === "taunt") {
      spawnFloatingNumber(efecto.instanceId, "¡Aquí!", "taunt");
    } else if (efecto.tipo === "defender") {
      spawnFloatingNumber(efecto.instanceId, "🛡", "defender");
    }
  });

  if (huboGolpeGrande || fx.length >= 3) shakeCombatScreen();
}
