/**
 * SOUNDFX.JS v2 (compartido) — motor de audio con alma
 * -----------------------------------------------------------------------
 * Todo sintetizado con Web Audio (sin archivos externos), pero ahora con
 * bus maestro + compresor, reverb de sala (eco de mazmorra), campanas
 * inarmónicas, golpes con cuerpo (sub-bajo + ruido filtrado) y una
 * MÚSICA AMBIENTAL generativa: pad oscuro en Re menor + arpegios de
 * campana para el menú, y tambores + pulso de bajo para el combate.
 *
 * La API pública no cambió: sfxClick(), sfxHit()... siguen igual.
 * Nuevo: sfxHover, sfxBuff, sfxDebuff, sfxMuerte, setMusicaEscena(),
 * setMusicaActivada(), isMusicaEnabled().
 * -----------------------------------------------------------------------
 */
const _AUDIO_KEY = "hm_audio_v2";
let _audioCtx = null;
let _bus = null;
let _ruidoBuf = null;
const _mus = { mood: "menu", paso: 0, proximo: 0, timer: null };
const _ajustes = (() => {
  const base = { musica: true, vol: 0.6 };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(_AUDIO_KEY) || "{}")); } catch (e) { return base; }
})();
function _guardarAjustes() { try { localStorage.setItem(_AUDIO_KEY, JSON.stringify(_ajustes)); } catch (e) {} }

function _impulso(ctx, seg, curva) {
  const n = Math.floor(ctx.sampleRate * seg);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, curva);
  }
  return b;
}

function _construirBus(ctx) {
  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4;
  comp.attack.value = 0.004; comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.connect(master);
  const mus = ctx.createGain(); mus.gain.value = 0.0001; mus.connect(master);
  const rev = ctx.createConvolver(); rev.buffer = _impulso(ctx, 2.4, 2.6);
  const revOut = ctx.createGain(); revOut.gain.value = 0.55;
  rev.connect(revOut).connect(master);
  const musSend = ctx.createGain(); musSend.gain.value = 0.5; // la música "vive" en la sala
  mus.connect(musSend).connect(rev);
  _bus = { master, sfx, mus, rev };
}

function getAudioContext() {
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _audioCtx = new Ctx();
    _construirBus(_audioCtx);
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function isSoundEnabled() {
  return typeof PlayerData === "undefined" || PlayerData.sonidoActivado !== false;
}

function _conectar(ctx, nodo, eco, musica) {
  nodo.connect(musica ? _bus.mus : _bus.sfx);
  if (eco > 0) { const s = ctx.createGain(); s.gain.value = eco; nodo.connect(s).connect(_bus.rev); }
}

/** Tono con envolvente (ataque lineal, caída exponencial), filtro y eco opcionales. */
function playTone({ freq, duration = 0.15, type = "sine", volume = 0.16, freqEnd = null, retraso = 0,
  ataque = 0.005, filtro = null, eco = 0.18, detune = 0, musica = false, t0 = null }) {
  if (!musica && !isSoundEnabled()) return;
  const ctx = getAudioContext(); if (!ctx) return;
  try {
    const ini = t0 != null ? t0 : ctx.currentTime + retraso;
    const osc = ctx.createOscillator();
    osc.type = type; osc.detune.value = detune;
    osc.frequency.setValueAtTime(freq, ini);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ini + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.linearRampToValueAtTime(volume, ini + ataque);
    g.gain.exponentialRampToValueAtTime(0.0008, ini + duration);
    let nodo = osc.connect(g);
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtro; nodo = nodo.connect(f); }
    _conectar(ctx, nodo, eco, musica);
    osc.start(ini); osc.stop(ini + duration + 0.05);
  } catch (e) {}
}

/** Ruido filtrado con barrido — golpes, roces de papel, viento. */
function playNoiseBurst({ duration = 0.12, volume = 0.12, retraso = 0, filtro = "bandpass", freq = 1800,
  freqEnd = null, q = 0.9, eco = 0.12, ataque = 0.003, musica = false, t0 = null }) {
  if (!musica && !isSoundEnabled()) return;
  const ctx = getAudioContext(); if (!ctx) return;
  try {
    if (!_ruidoBuf) {
      _ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = _ruidoBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const ini = t0 != null ? t0 : ctx.currentTime + retraso;
    const src = ctx.createBufferSource(); src.buffer = _ruidoBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filtro; f.Q.value = q;
    f.frequency.setValueAtTime(freq, ini);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), ini + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.linearRampToValueAtTime(volume, ini + ataque);
    g.gain.exponentialRampToValueAtTime(0.0008, ini + duration);
    src.connect(f).connect(g);
    _conectar(ctx, g, eco, musica);
    src.start(ini, Math.random() * 0.5); src.stop(ini + duration + 0.05);
  } catch (e) {}
}

/** Campana: parciales inarmónicos que decaen a distinto ritmo (metal real, no un "beep"). */
function campana(freq, { volume = 0.1, duracion = 1.1, retraso = 0, eco = 0.45 } = {}) {
  [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([r, a]) =>
    playTone({ freq: freq * r, duration: duracion / (1 + r * 0.35), volume: volume * a, retraso, ataque: 0.002, eco }));
}

function _timbal(t, vol, tono = 95, musica = true) {
  playTone({ freq: tono * 1.9, freqEnd: tono, duration: 0.38, volume: vol, ataque: 0.002, eco: 0.25, musica, t0: t });
  playNoiseBurst({ duration: 0.08, volume: vol * 0.4, filtro: "lowpass", freq: 500, q: 0.5, musica, t0: t });
}

/* ===== SFX con nombre ===== */

function sfxClick() {
  playNoiseBurst({ duration: 0.03, volume: 0.05, freq: 3200, q: 1.5, eco: 0.05 });
  playTone({ freq: 540, freqEnd: 380, duration: 0.06, type: "triangle", volume: 0.07, eco: 0.08 });
}
function sfxHover() { playTone({ freq: 1500, duration: 0.035, volume: 0.018, eco: 0.05 }); }

function sfxHit() {
  playNoiseBurst({ duration: 0.11, volume: 0.2, freq: 2600, freqEnd: 500, q: 0.7 });
  playTone({ freq: 170, freqEnd: 45, duration: 0.16, volume: 0.3, eco: 0.1 });
  playTone({ freq: 320, freqEnd: 90, duration: 0.08, type: "sawtooth", volume: 0.06, filtro: 1400 });
}
function sfxCritico() {
  playNoiseBurst({ duration: 0.22, volume: 0.24, freq: 5200, freqEnd: 600, q: 0.6, eco: 0.2 });
  playTone({ freq: 130, freqEnd: 30, duration: 0.45, volume: 0.4, eco: 0.3 });
  playNoiseBurst({ duration: 0.18, volume: 0.16, filtro: "lowpass", freq: 900, freqEnd: 120, retraso: 0.02 });
  campana(1180, { volume: 0.08, duracion: 0.9, retraso: 0.03 });
}
function sfxCuracion() {
  [784, 988, 1319, 1568].forEach((f, i) => playTone({ freq: f, duration: 0.5, volume: 0.07, retraso: i * 0.07, eco: 0.5 }));
}
function sfxBuff() {
  playTone({ freq: 440, freqEnd: 880, duration: 0.25, type: "triangle", volume: 0.07, eco: 0.4 });
  campana(1320, { volume: 0.05, duracion: 0.5, retraso: 0.12 });
}
function sfxDebuff() {
  playTone({ freq: 400, freqEnd: 140, duration: 0.3, type: "sawtooth", volume: 0.07, filtro: 900, eco: 0.3 });
}
function sfxMuerte() {
  playNoiseBurst({ duration: 0.35, volume: 0.14, filtro: "lowpass", freq: 1200, freqEnd: 90, eco: 0.3 });
  playTone({ freq: 110, freqEnd: 28, duration: 0.6, volume: 0.3, eco: 0.35 });
}
function sfxMoneda() {
  campana(1568, { volume: 0.08, duracion: 0.5, eco: 0.3 });
  campana(2093, { volume: 0.07, duracion: 0.6, retraso: 0.07, eco: 0.3 });
  playNoiseBurst({ duration: 0.05, volume: 0.03, freq: 6000, q: 2 });
}
function sfxCartaNueva() {
  playNoiseBurst({ duration: 0.22, volume: 0.07, freq: 900, freqEnd: 4200, q: 0.6 });
  campana(880, { volume: 0.07, retraso: 0.1, duracion: 0.8 });
  campana(1318, { volume: 0.06, retraso: 0.19, duracion: 0.9 });
}
/** Legendaria/mítica: sub-bajo que sube, arpegio de campanas y acorde brillante. */
function sfxRarezaAlta() {
  playNoiseBurst({ duration: 0.5, volume: 0.1, freq: 400, freqEnd: 6000, q: 0.5, eco: 0.4 });
  playTone({ freq: 55, freqEnd: 110, duration: 0.7, volume: 0.22, eco: 0.3 });
  [523, 659, 784, 1047, 1319].forEach((f, i) => campana(f, { volume: 0.09, duracion: 1.5, retraso: 0.1 + i * 0.09, eco: 0.55 }));
  [523, 659, 784].forEach((f) => playTone({ freq: f, duration: 1.6, type: "triangle", volume: 0.05, retraso: 0.5, ataque: 0.15, eco: 0.5 }));
}
function sfxVictoria() {
  [[392, 0], [523, 0.13], [659, 0.26], [784, 0.4]].forEach(([f, r]) => {
    playTone({ freq: f, duration: 0.35, type: "sawtooth", volume: 0.05, retraso: r, filtro: 1800, eco: 0.35 });
    playTone({ freq: f, duration: 0.35, type: "triangle", volume: 0.08, retraso: r, eco: 0.35 });
  });
  [523, 659, 784, 1047].forEach((f) => playTone({ freq: f, duration: 1.6, type: "triangle", volume: 0.07, retraso: 0.6, ataque: 0.05, eco: 0.5 }));
  campana(1568, { volume: 0.08, duracion: 1.6, retraso: 0.62 });
  const ctx = getAudioContext(); if (ctx && isSoundEnabled()) { _timbal(ctx.currentTime, 0.28, 90, false); _timbal(ctx.currentTime + 0.4, 0.3, 90, false); }
}
function sfxDerrota() {
  [392, 349, 311, 262].forEach((f, i) => playTone({ freq: f, duration: 0.7, type: "triangle", volume: 0.09, retraso: i * 0.28, filtro: 1200, eco: 0.5 }));
  playTone({ freq: 65, freqEnd: 50, duration: 1.8, type: "sawtooth", volume: 0.1, filtro: 300, eco: 0.3 });
}
function sfxError() {
  playTone({ freq: 210, freqEnd: 150, duration: 0.12, type: "square", volume: 0.06, filtro: 900, eco: 0.05 });
  playTone({ freq: 190, freqEnd: 130, duration: 0.14, type: "square", volume: 0.06, filtro: 900, eco: 0.05, retraso: 0.11 });
}
function sfxAscensoRango() {
  [392, 523, 659, 880, 1175].forEach((f, i) => campana(f, { volume: 0.1, duracion: 1.4, retraso: i * 0.1, eco: 0.55 }));
  [392, 494, 587].forEach((f) => playTone({ freq: f, duration: 1.4, type: "triangle", volume: 0.06, retraso: 0.4, ataque: 0.1, eco: 0.5 }));
}

/* ===== MÚSICA AMBIENTAL GENERATIVA ===== */
const _nota = (m) => 440 * Math.pow(2, (m - 69) / 12);
const _ACORDES = {
  menu: [{ r: 38, n: [50, 53, 57, 60] }, { r: 34, n: [46, 50, 53, 57] }, { r: 41, n: [53, 57, 60, 64] }, { r: 36, n: [48, 52, 55, 59] }],
  batalla: [{ r: 38, n: [50, 53, 57] }, { r: 34, n: [46, 50, 53] }, { r: 31, n: [43, 46, 50] }, { r: 33, n: [45, 52, 57] }],
};
const _ESCALA = [62, 65, 67, 69, 72, 74, 77];

function _volMus() { return Math.max(0.0001, _ajustes.vol * 0.55); }

function _pad(notas, t, dur, vol, corte) {
  const ctx = _audioCtx;
  notas.forEach((m) => [-6, 6].forEach((det) => {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = _nota(m); o.detune.value = det;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.6;
    f.frequency.setValueAtTime(corte * 0.55, t);
    f.frequency.linearRampToValueAtTime(corte, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(corte * 0.55, t + dur + 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(2, dur * 0.35));
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.6);
    o.connect(f).connect(g).connect(_bus.mus);
    o.start(t); o.stop(t + dur + 1.7);
  }));
}
function _bajo(m, t, dur, vol, tipo = "sine") {
  playTone({ freq: _nota(m), duration: dur, type: tipo, volume: vol, ataque: 0.03, filtro: 380, eco: 0, musica: true, t0: t });
}
function _pluck(m, t) {
  playTone({ freq: _nota(m), duration: 2.2, type: "triangle", volume: 0.05, ataque: 0.004, eco: 0, musica: true, t0: t });
  playTone({ freq: _nota(m + 12), duration: 1.4, type: "sine", volume: 0.02, ataque: 0.004, eco: 0, musica: true, t0: t });
}

function _paso(n, t, dur8) {
  const set = _ACORDES[_mus.mood];
  const ac = set[Math.floor(n / 16) % set.length];
  if (_mus.mood === "menu") {
    if (n % 16 === 0) { _pad(ac.n, t, dur8 * 16, 0.014, 900); _bajo(ac.r, t, dur8 * 16, 0.13); }
    if (n % 4 === 2 && Math.random() < 0.6) _pluck(_ESCALA[Math.floor(Math.random() * _ESCALA.length)], t);
  } else {
    if (n % 16 === 0) _pad(ac.n, t, dur8 * 16, 0.012, 1300);
    if (n % 2 === 0) _bajo(ac.r + (n % 8 === 6 ? 12 : 0), t, dur8 * 1.6, 0.11, "sawtooth");
    if (n % 8 === 0) _timbal(t, 0.3, 80);
    else if (n % 8 === 4) _timbal(t, 0.18, 100);
    else if (n % 8 === 6 && Math.random() < 0.45) _timbal(t, 0.1, 130);
    if (n % 16 === 12 && Math.random() < 0.6) _pluck(_ESCALA[Math.floor(Math.random() * 5) + 2], t);
  }
}

function _programar() {
  const ctx = _audioCtx; if (!ctx || ctx.state !== "running") return;
  const dur8 = _mus.mood === "menu" ? 0.55 : 0.27;
  while (_mus.proximo < ctx.currentTime + 0.4) {
    _paso(_mus.paso, _mus.proximo, dur8);
    _mus.proximo += dur8; _mus.paso++;
  }
}

function _iniciarMusica() {
  if (_mus.timer || !_ajustes.musica) return;
  const ctx = getAudioContext(); if (!ctx) return;
  const t = ctx.currentTime, g = _bus.mus.gain;
  _mus.paso = 0; _mus.proximo = t + 0.15;
  g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(_volMus(), t + 3);
  _mus.timer = setInterval(_programar, 120);
}
function _detenerMusica() {
  if (!_mus.timer || !_audioCtx) return;
  const t = _audioCtx.currentTime, g = _bus.mus.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + 0.8);
  clearInterval(_mus.timer); _mus.timer = null;
}

/** "menu" o "batalla" — cambia con un cruce suave (baja, cambia de compás, sube). */
function setMusicaEscena(mood) {
  if (mood !== "batalla") mood = "menu";
  if (mood === _mus.mood) return;
  _mus.mood = mood;
  if (!_mus.timer || !_audioCtx) return;
  const t = _audioCtx.currentTime, g = _bus.mus.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0.0001, t + 0.5);
  g.linearRampToValueAtTime(_volMus(), t + 2.6);
  _mus.paso = 0; _mus.proximo = t + 0.55;
}
function isMusicaEnabled() { return _ajustes.musica !== false; }
function setMusicaActivada(v) {
  _ajustes.musica = !!v; _guardarAjustes();
  if (v) _iniciarMusica(); else _detenerMusica();
}

/* La música arranca en el primer toque (los navegadores no dejan sonar antes) y se pausa en segundo plano. */
(function armarMusica() {
  const iniciar = () => { if (isMusicaEnabled()) _iniciarMusica(); };
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, iniciar, { once: true, passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (!_audioCtx) return;
    if (document.hidden) _audioCtx.suspend(); else _audioCtx.resume();
  });
})();
