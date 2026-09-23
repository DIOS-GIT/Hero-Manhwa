/**
 * AMBIENTE.JS (compartido) — atmósfera viva
 * -----------------------------------------------------------------------
 * Un canvas fijo con brasas y motas de luz que suben lentamente, chispas
 * doradas al tocar la pantalla y sonido al pasar el ratón por botones.
 * setEscenaAmbiente(nombre) cambia paleta (oro / místico / combate) y la
 * música (menú / batalla). Si el usuario pidió menos movimiento, solo se
 * cambia la música. Nada de esto toca la lógica del juego.
 * -----------------------------------------------------------------------
 */
(function () {
  const PALETAS = {
    oro: ["255,200,110", "255,160,70", "240,220,170"],
    mistico: ["170,120,255", "110,170,255", "230,200,255"],
    combate: ["255,110,70", "255,170,80", "230,70,60"],
  };
  let paleta = PALETAS.oro, velocidad = 1;

  window.setEscenaAmbiente = function (nombre) {
    const combate = nombre === "combate";
    paleta = combate ? PALETAS.combate : ["tienda", "cofres", "coleccion"].includes(nombre) ? PALETAS.mistico : PALETAS.oro;
    velocidad = combate ? 1.7 : 1;
    if (typeof setMusicaEscena === "function") setMusicaEscena(combate ? "batalla" : "menu");
  };

  // hover con sonido (solo ratón; en móvil no existe el hover)
  let ultimo = null;
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest && e.target.closest(".hubtile, .btn, .collectioncard, .protagonistcard, .chestcard");
    if (!el || el === ultimo) return;
    ultimo = el;
    if (typeof sfxHover === "function") sfxHover();
  }, { passive: true });

  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.id = "ambiente-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const movil = Math.min(innerWidth, innerHeight) < 600;
  const brasas = [], chispas = [];

  function medir() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function nuevaBrasa(enFondo) {
    return {
      x: Math.random() * W, y: enFondo ? H + 10 : Math.random() * H,
      r: 0.7 + Math.random() * 1.9, vy: 9 + Math.random() * 24,
      amp: 8 + Math.random() * 22, fase: Math.random() * 6.28, vf: 0.4 + Math.random() * 0.9,
      c: paleta[(Math.random() * paleta.length) | 0], a: 0.25 + Math.random() * 0.5,
    };
  }
  function dibujarPunto(x, y, r, c, a) {
    ctx.fillStyle = `rgba(${c},${a * 0.14})`; ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${c},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  let previo = performance.now(), t = 0;
  function bucle(ahora) {
    const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora; t += dt;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < brasas.length; i++) {
      const b = brasas[i];
      b.y -= b.vy * dt * velocidad;
      const x = b.x + Math.sin(t * b.vf + b.fase) * b.amp;
      const parpadeo = 0.65 + 0.35 * Math.sin(t * 3 + b.fase * 5);
      const desvanecer = Math.min(1, b.y / (H * 0.25), (H - b.y) / 40 + 0.2);
      if (b.y < -10) brasas[i] = nuevaBrasa(true);
      else dibujarPunto(x, b.y, b.r, b.c, b.a * parpadeo * Math.max(0, desvanecer));
    }
    for (let i = chispas.length - 1; i >= 0; i--) {
      const s = chispas[i];
      s.vida -= dt; if (s.vida <= 0) { chispas.splice(i, 1); continue; }
      s.vy += 380 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      dibujarPunto(s.x, s.y, s.r, s.c, Math.min(1, s.vida * 2.4));
    }
    ctx.globalCompositeOperation = "source-over";
    if (!document.hidden) requestAnimationFrame(bucle);
  }

  window.addEventListener("pointerdown", (e) => {
    for (let i = 0; i < 9; i++) {
      const ang = Math.random() * 6.283, v = 60 + Math.random() * 150;
      chispas.push({ x: e.clientX, y: e.clientY, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 70,
        r: 0.8 + Math.random() * 1.5, vida: 0.35 + Math.random() * 0.4, c: paleta[(Math.random() * paleta.length) | 0] });
    }
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { previo = performance.now(); requestAnimationFrame(bucle); } });
  window.addEventListener("resize", medir);

  function iniciar() {
    document.body.appendChild(canvas); medir();
    const total = movil ? 26 : 48;
    for (let i = 0; i < total; i++) brasas.push(nuevaBrasa(false));
    requestAnimationFrame(bucle);
  }
  if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar);
})();
