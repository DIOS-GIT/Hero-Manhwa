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
let currentStoryId = "TU_STORY_ID"; // el ID del documento en Firestore > stories
const SAVE_KEY = "manhwa_legend_save_v1";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

function findCharacter(name) {
  if (!name) return null;
  const all = [
    ...(window.GAME_DATA.PROTAGONISTS || []),
    ...(window.GAME_DATA.HEROINES || [])
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
function saveGame() {
  if (!engine) return;
  const saveData = {
    storyId: currentStoryId,
    engine: engine.serialize(),
    player: {
      protagonistId: player.protagonist.id,
      routeId: player.route.id,
      jobId: player.job.id,
      housingId: player.housing.id,
      haremMode: player.haremMode,
      heroineIds: player.heroines.map((h) => h.id)
    }
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

  player.protagonist = findById(window.GAME_DATA.PROTAGONISTS, saveData.player.protagonistId);
  player.route = findById(window.GAME_DATA.ROUTES, saveData.player.routeId);
  player.job = findById(window.GAME_DATA.JOBS, saveData.player.jobId);
  player.housing = findById(window.GAME_DATA.HOUSING, saveData.player.housingId);
  player.haremMode = saveData.player.haremMode;
  player.heroines = saveData.player.heroineIds
    .map((id) => findById(window.GAME_DATA.HEROINES, id))
    .filter(Boolean);

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
    await window.loadStory(currentStoryId);

    const initialStats = { ...player.protagonist.stats };
    // afinidad de cada heroína de ESTA partida, sembrada como stat propia
    // (afinidad_<id>) — así las decisiones pueden subirla igual que
    // cualquier otra stat, con el efecto genérico "afinidad".
    player.heroines.forEach((h) => {
      initialStats[`afinidad_${h.id}`] = (h.stats && h.stats.afinidad) || 0;
    });

    const initialFlags = [
      `protagonista_${player.protagonist.id}`,
      `ruta_${player.route.id}`,
      `trabajo_${player.job.id}`,
      `vivienda_${player.housing.id}`,
      ...(player.haremMode ? ["modo_harem"] : ["modo_fmc"]),
      ...player.heroines.map((h) => `heroina_${h.id}`)
    ];

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
      `Revisá que "currentStoryId" en main.js tenga el ID real de la Historia ` +
      `(no "TU_STORY_ID"), y que esa Historia tenga un nodo inicial válido cargado.`
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
  setCharacterSlot(
    "vn-char-slot-primary",
    "vn-character-primary",
    findCharacter(node.character),
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
    speakerEl.textContent = node.character;
    speakerEl.hidden = false;
  } else {
    speakerEl.hidden = true;
  }

  // ---- tag de sistema (evento / condición / ruleta interna) ----
  const systemLabels = {
    event: "◆ evento",
    condition: "◆ el sistema evalúa la situación...",
    random: "🎲 el destino decide..."
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

  // ---- opciones (choice) vs. continuar ----
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
  } else {
    optionsEl.hidden = true;
    continueBtn.hidden = false;
  }
}

function initGameControls() {
  document.getElementById("btn-reader-continue").addEventListener("click", () => {
    engine.advance();
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
      protagonist: null, route: null, job: null, housing: null,
      haremMode: false, heroines: []
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
