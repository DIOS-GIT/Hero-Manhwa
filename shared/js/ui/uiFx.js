/**
 * UIFX.JS (compartido)
 * -----------------------------------------------------------------------
 * Capa de "juice" del juego: el feedback visual que hace que tocar algo
 * se sienta bien. Inspirado en lo que hacen los gacha móviles —
 * confeti al reclamar, contadores que suben rodando, toasts en vez de
 * alert(), entrada escalonada de listas y transición entre pantallas.
 *
 * Nada de esto cambia lógica de juego: si falla o no se llama, el juego
 * funciona igual, solo más seco.
 * -----------------------------------------------------------------------
 */

/* ===== Capa donde viven los efectos que flotan sobre todo ===== */
function getUiFxLayer() {
  let layer = document.getElementById("ui-fx-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "ui-fx-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

/* ===== TOASTS — reemplazan al alert() feo del navegador ===== */
/** @param {"exito"|"error"|"info"} tipo */
function showToast(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `uitoast uitoast--${tipo}`;
  toast.innerHTML = `<span class="uitoast__icono">${tipo === "exito" ? "✔" : tipo === "error" ? "✕" : "ℹ"}</span><span>${mensaje}</span>`;
  getUiFxLayer().appendChild(toast);
  if (tipo === "error" && typeof sfxError === "function") sfxError();

  setTimeout(() => {
    toast.classList.add("uitoast--saliendo");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

/* ===== CONFETI — para reclamar logros, regalos, subir de rango ===== */
const COLORES_CONFETI = ["#d9a441", "#ffd76a", "#4f8fe0", "#4fae6a", "#e0473f", "#a463e0"];

/**
 * Estalla confeti desde un elemento (o desde el centro de la pantalla si
 * no se pasa ninguno). Se usa en momentos de recompensa, no en cada clic.
 */
function burstConfetti(elementoOrigen, cantidad = 28) {
  const layer = getUiFxLayer();
  const rect = elementoOrigen
    ? elementoOrigen.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const origenX = rect.left + rect.width / 2;
  const origenY = rect.top + rect.height / 2;

  for (let i = 0; i < cantidad; i++) {
    const trozo = document.createElement("span");
    trozo.className = "uiconfeti";
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 60 + Math.random() * 140;
    trozo.style.left = `${origenX}px`;
    trozo.style.top = `${origenY}px`;
    trozo.style.background = COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)];
    trozo.style.setProperty("--dx", `${Math.cos(angulo) * distancia}px`);
    trozo.style.setProperty("--dy", `${Math.sin(angulo) * distancia + 120}px`); // +120 = cae por gravedad
    trozo.style.setProperty("--giro", `${Math.random() * 720 - 360}deg`);
    trozo.style.animationDelay = `${Math.random() * 0.12}s`;
    layer.appendChild(trozo);
    setTimeout(() => trozo.remove(), 1400);
  }
}

/* ===== CONTADOR QUE SUBE RODANDO — para la moneda del hub ===== */
const _valoresContadorPrevios = {};

/**
 * Anima un número de su valor anterior al actual. Recuerda el último
 * valor por clave, así que al re-renderizar el hub la moneda "sube"
 * sola en vez de aparecer ya cambiada.
 */
function animateCounter(el, valorFinal, clave) {
  if (!el) return;
  const valorInicial = _valoresContadorPrevios[clave];
  _valoresContadorPrevios[clave] = valorFinal;

  // primera vez que se ve: sin animación, se muestra tal cual
  if (valorInicial === undefined || valorInicial === valorFinal) {
    el.textContent = valorFinal;
    return;
  }

  const subio = valorFinal > valorInicial;
  el.classList.add(subio ? "uicontador--subiendo" : "uicontador--bajando");
  setTimeout(() => el.classList.remove("uicontador--subiendo", "uicontador--bajando"), 600);

  const duracion = 650;
  const inicio = performance.now();
  function paso(ahora) {
    const t = Math.min(1, (ahora - inicio) / duracion);
    const suavizado = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(valorInicial + (valorFinal - valorInicial) * suavizado);
    if (t < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

/* ===== ENTRADA ESCALONADA — listas que aparecen una tras otra ===== */
/**
 * Hace que los hijos que matcheen `selector` entren en cascada.
 * Se llama justo después de pintar una lista (colección, amigos, etc).
 */
function staggerIn(contenedor, selector, retrasoPorItem = 35) {
  if (!contenedor) return;
  const items = contenedor.querySelectorAll(selector);
  items.forEach((item, i) => {
    item.classList.add("uistagger");
    item.style.animationDelay = `${Math.min(i * retrasoPorItem, 500)}ms`;
  });
}

/* ===== TRANSICIÓN AL CAMBIAR DE PANTALLA ===== */
function playViewTransition(viewEl) {
  if (!viewEl) return;
  viewEl.classList.remove("uiview-entrando");
  void viewEl.offsetWidth; // fuerza reinicio de la animación
  viewEl.classList.add("uiview-entrando");
}

/* ===== POP AL TOCAR CUALQUIER BOTÓN ===== */
/**
 * Un solo listener global en vez de uno por botón: como el juego
 * re-renderiza pantallas enteras con innerHTML, engancharlo a cada botón
 * se perdería en cada repintado.
 */
function initGlobalButtonFeedback() {
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("button, .btn, .hubtile");
    if (!btn || btn.disabled) return;
    btn.classList.remove("uipop");
    void btn.offsetWidth;
    btn.classList.add("uipop");
    setTimeout(() => btn.classList.remove("uipop"), 220);
    if (typeof sfxClick === "function") sfxClick();
  });
}
