/**
 * main.js
 * -----------------------------------------------------------------------
 * Pega todas las piezas: cambia de pantalla, arranca el StoryEngine, y
 * renderiza la pantalla de lectura en formato novela visual clásica —
 * fondo, hasta 2 personajes en escena (posición + efecto), transiciones,
 * guardado/rollback.
 * -----------------------------------------------------------------------
 */

let engine = null;
let currentStoryId = null; // se resuelve solo: busca la Historia marcada como introducción
const SAVE_KEY = "manhwa_legend_save_v1";

// Mismo criterio de sorteo pesado que usa character-creation.js para la
// ruleta del protagonista — acá se reusa para elegir_ruta/elegir_trabajo/
// elegir_vivienda/sorteo_heroina, así que vive en main.js (no depende de
// character-creation.js para no acoplar los dos archivos entre sí).
function weightedPick(items, excludeIds = []) {
  const pool = items.filter((i) => !excludeIds.includes(i.id));
  if (pool.length === 0) return null;
  const weightOf = (i) => (Number(i.weight) > 0 ? Number(i.weight) : 1);
  const total = pool.reduce((sum, i) => sum + weightOf(i), 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= weightOf(item);
    if (r < 0) return item;
  }
  return pool[pool.length - 1];
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

// Mismo valor reservado que usa el admin (admin.js, HEROINA_SORTEADA) en el
// chip comodín del selector de personaje — tiene que ser IDÉNTICO carácter
// por carácter en los dos archivos, porque acá se compara como string.
const HEROINA_SORTEADA = "__heroina_sorteada__";

function findCharacter(name) {
  if (!name) return null;
  if (name === HEROINA_SORTEADA) {
    // Se resuelve contra la heroína más reciente sorteada en ESTA partida
    // (engine.selectedHeroines lo va llenando el nodo sorteo_heroina a
    // medida que la historia pasa por ahí — puede haber más de una en
    // rutas de harem, se usa siempre la última).
    if (!engine || !engine.selectedHeroines || engine.selectedHeroines.length === 0) return null;
    return engine.selectedHeroines[engine.selectedHeroines.length - 1];
  }
  const all = [
    ...(window.GAME_DATA.PROTAGONISTS || []),
    ...(window.GAME_DATA.HEROINES || []),
    ...(window.GAME_DATA.SPECIAL_CHARACTERS || [])
  ];
  return all.find((c) => c.name === name) || null;
}

function findById(arr, id) {
  return (arr || []).find((x) => x.id === id) || null;
}

function replayAnimation(el) {
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
}

function setCharacterSlot(slotId, imgId, character, expressionLabel, position, dim, effectClass) {
  const slot = document.getElementById(slotId);
  const img = document.getElementById(imgId);

  slot.classList.remove("vn-char-pos-izquierda", "vn-char-pos-centro", "vn-char-pos-derecha");
  slot.classList.add(`vn-char-pos-${position || "centro"}`);
  slot.classList.toggle("vn-char-dim", !!dim);

  const portrait = character && character.images && character.images.length
    ? character.images.find((im) => im.label === expressionLabel) || character.images[0]
    : null;

  if (!portrait) {
    slot.hidden = true;
    return;
  }
  slot.hidden = false;
  if (img.src !== portrait.url) {
    img.src = portrait.url;
    img.alt = character.name;
  }
  img.classList.remove("vn-fx-zoom", "vn-fx-shake", "vn-fx-pop", "vn-fx-tilt");
  if (effectClass) {
    void img.offsetWidth;
    img.classList.add(effectClass);
  }
}

// ---- fondo con 2 capas superpuestas + librería de transiciones ----
let activeBgLayer = "a";
let currentBgUrl = null;
function setBackground(url, transitionType) {
  if (url === currentBgUrl) return;
  currentBgUrl = url;
  const outgoing = document.getElementById(`vn-bg-${activeBgLayer}`);
  const nextLayer = activeBgLayer === "a" ? "b" : "a";
  const incoming = document.getElementById(`vn-bg-${nextLayer}`);
  const stage = document.getElementById("vn-stage-root");

  incoming.style.backgroundImage = url ? `url('${url}')` : "";
  incoming.classList.remove("wipe-left", "wipe-right");
  incoming.style.zIndex = "";
  incoming.style.clipPath = "";
  void incoming.offsetWidth; // reflow, para poder re-disparar animaciones

  if (transitionType === "wipe_left" || transitionType === "wipe_right") {
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    incoming.style.opacity = "1";
    incoming.classList.add(transitionType === "wipe_left" ? "wipe-left" : "wipe-right");
  } else if (transitionType === "curtain") {
    const curtain = document.getElementById("vn-curtain");
    curtain.classList.remove("curtain-play");
    void curtain.offsetWidth;
    curtain.classList.add("curtain-play");
    setTimeout(() => {
      incoming.style.opacity = "1";
      outgoing.style.opacity = "0";
    }, 260);
  } else {
    // dissolve (default): crossfade normal de siempre
    incoming.style.opacity = "1";
    outgoing.style.opacity = "0";
  }

  if (transitionType === "shake") {
    stage.classList.remove("cam-shake");
    void stage.offsetWidth;
    stage.classList.add("cam-shake");
    incoming.style.opacity = "1";
    outgoing.style.opacity = "0";
  }

  activeBgLayer = nextLayer;
}

// ---------- GUARDAR / CONTINUAR ----------
// Ruta/Trabajo/Vivienda/Heroína ya no viven en `player` — están adentro de
// `engine` (selectedRoute/selectedJob/selectedHousing/selectedHeroines),
// así que engine.serialize() ya los incluye. Acá solo hace falta guardar
// aparte el protagonista, que sigue siendo parte de la reencarnación fija.
function saveGame() {
  if (!engine) return;
  const saveData = {
    storyId: currentStoryId,
    engine: engine.serialize(),
    protagonistId: player.protagonist.id
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function hasSavedGame() {
  return !!localStorage.getItem(SAVE_KEY);
}

async function continueSavedGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  const saveData = JSON.parse(raw);
  currentStoryId = saveData.storyId;
  await window.loadStory(currentStoryId);

  player.protagonist = findById(window.GAME_DATA.PROTAGONISTS, saveData.protagonistId);
  if (!player.protagonist) {
    alert("No se pudo continuar: el protagonista guardado ya no existe (puede haber sido borrado del admin).");
    return;
  }

  engine = window.StoryEngine.fromSerialized(window.DEMO_STORY.nodes, saveData.engine);
  currentBgUrl = null;
  showScreen("screen-game");
  renderCurrentNode();
}

async function startStory() {
  try {
    currentStoryId = await window.findIntroStoryId();
    if (!currentStoryId) {
      alert(
        'Todavía no marcaste ninguna Historia como "Historia de introducción" en el admin.\n\n' +
        "Andá a Historias/Capítulos, editá la que quieras que sea el arranque del juego, " +
        'tildá "Es la Historia de introducción", guardá, y volvé a intentar.'
      );
      return;
    }
    await window.loadStory(currentStoryId);

    // las stats iniciales ahora las reparte el jugador (15 puntos entre las
    // 4), no vienen fijas del protagonista — "Stats iniciales" en el admin
    // quedó como referencia/lore, no se usa acá. Ruta/Trabajo/Vivienda/
    // Heroína ya no se deciden acá tampoco — son nodos dentro de la propia
    // historia (elegir_ruta/elegir_trabajo/elegir_vivienda/sorteo_heroina),
    // así que los flags y la afinidad de la heroína se siembran ahí, no acá.
    const initialStats = { ...player.allocatedStats };
    const initialFlags = [`protagonista_${player.protagonist.id}`];

    engine = new window.StoryEngine(
      window.DEMO_STORY.nodes,
      window.DEMO_STORY.startNode,
      initialStats,
      initialFlags
    );

    currentBgUrl = null;
    showScreen("screen-game");
    renderCurrentNode();
  } catch (err) {
    console.error(err);
    alert(
      `No se pudo arrancar la historia: ${err.message}\n\n` +
      `Revisá que la Historia marcada como introducción tenga un "ID del nodo inicial" ` +
      `válido, y que ese nodo exista en Nodos/Decisiones.`
    );
  }
}

async function goToNextChapter(nextStoryId) {
  if (!nextStoryId) {
    alert('Este nodo "chapter_end" todavía no tiene una Historia siguiente configurada en el admin.');
    return;
  }
  try {
    currentStoryId = nextStoryId;
    await window.loadStory(currentStoryId);
    engine.loadChapter(window.DEMO_STORY.nodes, window.DEMO_STORY.startNode);
    currentBgUrl = null;
    document.getElementById("vn-ending-card").hidden = true;
    renderCurrentNode();
  } catch (err) {
    console.error(err);
    alert(`No se pudo cargar el próximo capítulo: ${err.message}`);
  }
}

// ---- opciones disponibles para elegir_ruta/elegir_trabajo/elegir_vivienda/
// sorteo_heroina — el motor no sabe nada de esto (ver story-engine.js), así
// que la lista se arma acá mismo a partir de window.GAME_DATA + lo que ya
// eligió el jugador en ESTA partida (engine.selectedJob/selectedHousing).
function pickerPool(node) {
  switch (node.type) {
    case "elegir_ruta":
      return window.GAME_DATA.ROUTES || [];
    case "elegir_trabajo":
      return window.GAME_DATA.JOBS || [];
    case "elegir_vivienda":
      // si todavía no se eligió trabajo en esta historia (el escritor puso
      // este nodo antes que elegir_trabajo), no filtramos por nada — mejor
      // mostrar todas las viviendas que dejar al jugador sin opciones.
      return (window.GAME_DATA.HOUSING || []).filter(
        (h) => !h.requiresJobTag || !engine.selectedJob || h.requiresJobTag === engine.selectedJob.tag
      );
    case "sorteo_heroina": {
      const yaSalieron = engine.selectedHeroines.map((h) => h.id);
      const jobTag = engine.selectedJob && engine.selectedJob.tag;
      const housingTag = engine.selectedHousing && engine.selectedHousing.tag;
      return (window.GAME_DATA.HEROINES || []).filter(
        (h) => !yaSalieron.includes(h.id) && ((jobTag && h.tags.includes(jobTag)) || (housingTag && h.tags.includes(housingTag)))
      );
    }
    default:
      return [];
  }
}

function renderCurrentNode() {
  const node = engine.getCurrentNode();

  const speakerEl = document.getElementById("vn-speaker-name");
  const systemTag = document.getElementById("vn-system-tag");
  const textEl = document.getElementById("vn-text");
  const optionsEl = document.getElementById("vn-options");
  const continueBtn = document.getElementById("btn-reader-continue");
  const endingCard = document.getElementById("vn-ending-card");
  const dialogueBox = document.getElementById("vn-dialogue-box");
  const backBtn = document.getElementById("btn-hud-back");

  backBtn.disabled = !engine.canRollback();

  // ---- elegir_ruta/elegir_trabajo/elegir_vivienda/sorteo_heroina: si no
  // hay ninguna opción disponible con el filtro actual, saltamos derecho
  // al fallback sin mostrarle nada al jugador (nunca lo dejamos trabado).
  // Se revisa ANTES de dibujar nada de este nodo, para no hacer parpadear
  // la pantalla con un nodo que ni se va a llegar a ver.
  const PICKER_NODE_TYPES = ["elegir_ruta", "elegir_trabajo", "elegir_vivienda", "sorteo_heroina"];
  if (PICKER_NODE_TYPES.includes(node.type) && pickerPool(node).length === 0) {
    engine.goTo(node.fallbackNext);
    renderCurrentNode();
    return;
  }

  // ---- fondo, con la transición elegida en el nodo ----
  setBackground(node.backgroundUrl || "", node.transition || "");

  // ---- final real, o fin de capítulo que sigue con la próxima historia ----
  if (node.type === "ending" || node.type === "chapter_end") {
    dialogueBox.style.visibility = "hidden";
    document.getElementById("vn-char-slot-primary").hidden = true;
    document.getElementById("vn-char-slot-secondary").hidden = true;
    endingCard.hidden = false;

    const tagEl = document.getElementById("vn-ending-tag");
    const restartBtn = document.getElementById("btn-hud-restart-2");
    const chapterContinueBtn = document.getElementById("btn-chapter-continue");

    if (node.type === "chapter_end") {
      tagEl.textContent = "FIN DEL CAPÍTULO";
      document.getElementById("vn-ending-title").textContent = node.title || "";
      document.getElementById("vn-ending-summary").textContent = node.text || node.summary || "";
      restartBtn.hidden = true;
      chapterContinueBtn.hidden = false;
      chapterContinueBtn.onclick = () => goToNextChapter(node.nextStoryId);
    } else {
      tagEl.textContent = "FINAL";
      document.getElementById("vn-ending-title").textContent = node.title || "";
      document.getElementById("vn-ending-summary").textContent = node.summary || "";
      restartBtn.hidden = false;
      chapterContinueBtn.hidden = true;
    }
    return;
  }
  endingCard.hidden = true;
  dialogueBox.style.visibility = "visible";

  // ---- personaje principal (quien habla): posición + efecto visual ----
  const effectClassMap = { zoom: "vn-fx-zoom", shake: "vn-fx-shake", pop: "vn-fx-pop", tilt: "vn-fx-tilt" };
  const speakingCharacter = findCharacter(node.character);
  setCharacterSlot(
    "vn-char-slot-primary",
    "vn-character-primary",
    speakingCharacter,
    node.characterExpression,
    node.position || "centro",
    false,
    effectClassMap[node.effect] || null
  );

  // ---- segundo personaje en escena (opcional, siempre atenuado) ----
  if (node.secondCharacter) {
    setCharacterSlot(
      "vn-char-slot-secondary",
      "vn-character-secondary",
      findCharacter(node.secondCharacter),
      node.secondCharacterExpression,
      node.secondCharacterPosition || "izquierda",
      true,
      null
    );
  } else {
    document.getElementById("vn-char-slot-secondary").hidden = true;
  }

  // ---- nombre de quien habla ----
  if (node.character) {
    // el jugador nunca tiene que ver el valor técnico del comodín
    // (__heroina_sorteada__): si se resolvió a un personaje real, se
    // muestra su nombre; si por algún motivo no se pudo resolver (partida
    // vieja sin heroína asignada, etc.) se oculta el nombre en vez de
    // mostrar el ID interno.
    if (node.character === HEROINA_SORTEADA) {
      if (speakingCharacter) {
        speakerEl.textContent = speakingCharacter.name;
        speakerEl.hidden = false;
      } else {
        speakerEl.hidden = true;
      }
    } else {
      speakerEl.textContent = node.character;
      speakerEl.hidden = false;
    }
  } else {
    speakerEl.hidden = true;
  }

  // ---- tag de sistema (evento / condición / ruleta interna) ----
  const systemLabels = {
    event: "◆ evento",
    condition: "◆ el sistema evalúa la situación...",
    random: "🎲 el destino decide...",
    elegir_ruta: "🧭 elegí tu camino",
    elegir_trabajo: "💼 elegí tu ocupación",
    elegir_vivienda: "🏠 elegí dónde vivís",
    sorteo_heroina: "🎲 el sistema busca a alguien para vos..."
  };
  if (systemLabels[node.type]) {
    systemTag.textContent = systemLabels[node.type];
    systemTag.hidden = false;
  } else {
    systemTag.hidden = true;
  }

  // ---- texto ----
  textEl.textContent = node.text || "";
  replayAnimation(textEl);

  // ---- opciones (choice / elegir_*) vs. continuar (resto, incl. sorteo_heroina) ----
  if (node.type === "choice") {
    optionsEl.innerHTML = "";
    optionsEl.hidden = false;
    continueBtn.hidden = true;
    node.options.forEach((option, i) => {
      const btn = document.createElement("button");
      btn.className = "node-option-btn";
      btn.textContent = option.text;
      btn.addEventListener("click", () => {
        optionsEl.querySelectorAll("button").forEach((b) => (b.disabled = true));
        engine.choose(i);
        renderCurrentNode();
      });
      optionsEl.appendChild(btn);
    });
  } else if (node.type === "elegir_ruta" || node.type === "elegir_trabajo" || node.type === "elegir_vivienda") {
    // acá ya sabemos que pickerPool(node) tiene al menos 1 item (si no,
    // ya nos habríamos ido al fallback más arriba, antes de dibujar nada).
    optionsEl.innerHTML = "";
    optionsEl.hidden = false;
    continueBtn.hidden = true;
    pickerPool(node).forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "node-option-btn";
      btn.textContent = item.desc ? `${item.name} — ${item.desc}` : item.name;
      btn.addEventListener("click", () => {
        optionsEl.querySelectorAll("button").forEach((b) => (b.disabled = true));
        engine.resolvePicker(item);
        renderCurrentNode();
      });
      optionsEl.appendChild(btn);
    });
  } else {
    // dialogue / event / condition / random / sorteo_heroina: todos
    // avanzan con el botón "continuar" — sorteo_heroina se resuelve ahí
    // mismo (ver initGameControls), los demás vía engine.advance().
    optionsEl.hidden = true;
    continueBtn.hidden = false;
  }
}

function initGameControls() {
  document.getElementById("btn-reader-continue").addEventListener("click", () => {
    const node = engine.getCurrentNode();
    if (node.type === "sorteo_heroina") {
      // el pool ya se validó no-vacío al renderizar este nodo (si hubiera
      // estado vacío, nunca se habría llegado a mostrar "continuar" acá).
      const chosen = weightedPick(pickerPool(node));
      engine.resolveSorteoHeroina(chosen);
    } else {
      engine.advance();
    }
    renderCurrentNode();
  });

  document.getElementById("btn-hud-back").addEventListener("click", () => {
    if (engine.rollback()) renderCurrentNode();
  });

  document.getElementById("btn-hud-save").addEventListener("click", () => {
    saveGame();
    alert("Partida guardada ✅ — podés continuarla desde la pantalla de inicio.");
  });

  document.getElementById("btn-hud-stats").addEventListener("click", () => {
    const panel = document.getElementById("hud-stats-panel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      panel.innerHTML = Object.entries(engine.stats)
        // la afinidad de las heroínas nunca se le muestra al jugador
        .filter(([k]) => !k.startsWith("afinidad_"))
        .map(([k, v]) => `<div>${k}: <b class="accent">${v}</b></div>`)
        .join("");
    }
  });

  function restart() {
    if (!confirm("¿Reiniciar tu historia desde el principio? (esto no borra tu partida guardada)")) return;
    Object.assign(player, {
      protagonist: null,
      allocatedStats: { carisma: 0, inteligencia: 0, fisico: 0, riqueza: 0 },
      spinsUsed: {}
    });
    document.getElementById("hud-stats-panel").hidden = true;
    goToStepScreen(0);
  }
  document.getElementById("btn-hud-restart").addEventListener("click", restart);
  document.getElementById("btn-hud-restart-2").addEventListener("click", restart);
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.GAME_DATA_READY;
  initCharacterCreation();
  initGameControls();
  document.getElementById("btn-summary-confirm").addEventListener("click", startStory);

  if (hasSavedGame()) {
    const continueBtn = document.getElementById("btn-continue-save");
    continueBtn.hidden = false;
    continueBtn.addEventListener("click", continueSavedGame);
  }

  showScreen("screen-boot");
});
