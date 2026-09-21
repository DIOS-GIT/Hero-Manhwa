/**
 * SOUNDFX.JS (compartido)
 * -----------------------------------------------------------------------
 * Efectos de sonido SINTETIZADOS con Web Audio API — sin archivos de
 * audio externos (el proyecto es 100% offline, sin dependencias). Cada
 * sfx* es un tono/secuencia de tonos armado con osciladores + una
 * envolvente de volumen, no una grabación.
 *
 * Si en algún momento se consiguen efectos de sonido de verdad (.mp3/.ogg),
 * este archivo es el único que habría que tocar — el resto del juego
 * solo llama a sfxClick(), sfxHit(), etc. sin saber cómo se generan.
 * -----------------------------------------------------------------------
 */

let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null; // navegador sin soporte — el juego sigue funcionando mudo
    _audioCtx = new Ctx();
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

/** El sonido se puede apagar desde Perfil — por defecto activado. */
function isSoundEnabled() {
  return typeof PlayerData === "undefined" || PlayerData.sonidoActivado !== false;
}

/** Un tono simple con envolvente (ataque rápido, caída exponencial). */
function playTone({ freq, duration = 0.15, type = "sine", volume = 0.16, freqEnd = null, retraso = 0 }) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const inicio = ctx.currentTime + retraso;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, inicio);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), inicio + duration);
    gain.gain.setValueAtTime(volume, inicio);
    gain.gain.exponentialRampToValueAtTime(0.001, inicio + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + duration + 0.02);
  } catch (err) {
    // audio bloqueado por el navegador o similar — silencioso, no rompe el juego
  }
}

/** Ruido blanco corto — para impactos/golpes, se siente más "físico" que un tono puro. */
function playNoiseBurst({ duration = 0.12, volume = 0.12, retraso = 0 }) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const inicio = ctx.currentTime + retraso;
    const muestras = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);

    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, inicio);
    gain.gain.exponentialRampToValueAtTime(0.001, inicio + duration);
    fuente.connect(gain).connect(ctx.destination);
    fuente.start(inicio);
  } catch (err) {
    // silencioso
  }
}

/* ===== SFX con nombre — el resto del juego solo llama a estas ===== */

function sfxClick() {
  playTone({ freq: 720, duration: 0.045, type: "square", volume: 0.05 });
}

function sfxHit() {
  playNoiseBurst({ duration: 0.09, volume: 0.14 });
  playTone({ freq: 160, freqEnd: 50, duration: 0.12, type: "sawtooth", volume: 0.1 });
}

function sfxCritico() {
  playNoiseBurst({ duration: 0.15, volume: 0.2 });
  playTone({ freq: 220, freqEnd: 40, duration: 0.22, type: "sawtooth", volume: 0.18 });
}

function sfxCuracion() {
  playTone({ freq: 520, freqEnd: 880, duration: 0.28, type: "sine", volume: 0.13 });
}

function sfxMoneda() {
  playTone({ freq: 880, duration: 0.07, type: "square", volume: 0.09 });
  playTone({ freq: 1320, duration: 0.09, type: "square", volume: 0.09, retraso: 0.06 });
}

function sfxCartaNueva() {
  playTone({ freq: 660, duration: 0.1, type: "triangle", volume: 0.1 });
  playTone({ freq: 880, duration: 0.14, type: "triangle", volume: 0.1, retraso: 0.08 });
}

/** Para legendaria/mítica en gacha/cofres — un arpegio ascendente, el "gran momento". */
function sfxRarezaAlta() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    playTone({ freq, duration: 0.22, type: "triangle", volume: 0.13, retraso: i * 0.09 });
  });
}

function sfxVictoria() {
  [523, 659, 784].forEach((freq, i) => {
    playTone({ freq, duration: 0.3, type: "triangle", volume: 0.14, retraso: i * 0.11 });
  });
}

function sfxDerrota() {
  playTone({ freq: 300, freqEnd: 110, duration: 0.5, type: "sawtooth", volume: 0.13 });
}

function sfxError() {
  playTone({ freq: 220, duration: 0.14, type: "square", volume: 0.08 });
}

function sfxAscensoRango() {
  [392, 523, 659, 880].forEach((freq, i) => {
    playTone({ freq, duration: 0.25, type: "triangle", volume: 0.14, retraso: i * 0.08 });
  });
}
