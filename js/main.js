/**
 * main.js
 * -----------------------------------------------------------------------
 * Pega todas las piezas: cambia de pantalla, arranca el StoryEngine, y
 * renderiza la pantalla de lectura en formato novela visual clásica.
 *
 * Incorpora 4 ideas tomadas de cómo resuelve estas cosas Ren'Py, adaptadas
 * a nuestro stack (Firebase + admin propio en vez de archivos .rpy):
 *   1. Expresiones: cada nodo puede pedir una expresión puntual del
 *      personaje (la que se eligió en el admin); si no la especifica,
 *      usa la primera imagen cargada.
 *   2. Guardado/Continuar: guarda el progreso en localStorage del
 *      navegador (por ahora — más adelante puede migrar a Firestore
 *      por usuario, el motor ya lo deja preparado con serialize()).
 *   3. Rollback: volver un paso atrás en el diálogo, restaurando stats
 *      y flags a como estaban (no solo el texto).
 *   4. Transición: crossfade suave entre fondos en vez de corte seco.
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

// vuelve a disparar una animación CSS que ya está definida en la clase
// del elemento (para que no se "salte" la primera vez y sí se repita en
// cada línea nueva).
function replayAnimation(el) {
  el.style.animation = "none";
  void el.offsetWidth; // fuerza reflow
  el.style.animation = "";
}

// ---- crossfade de fondo entre 2 capas superpuestas ----
let activeBgLayer = "a";
let currentBgUrl = null;
function setBackground(url) {
  if (url === currentBgUrl) return;
  currentBgUrl = url;
  const showing = document.getElementById(`vn-bg-${activeBgLayer}`);
  const nextLayer = activeBgLayer === "a" ? "b" : "a";
  const hidden = document.getElementById(`vn-bg-${nextLayer}`);
  hidden.style.backgroundImage = url ? `url('${url}')` : "";
  hidden.style.opacity = "1";
  showing.style.opacity = "0";
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
  currentBgUrl = null; // para que el próximo fondo sí dispare el crossfade
  showScreen("screen-game");
  renderCurrentNode();
}

async function startStory() {
  try {
    await window.loadStory(currentStoryId);

    const initialStats = { ...player.protagonist.stats };
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

  const charImg = document.getElementById("vn-character");
  const speakerEl = document.getElementById("vn-speaker-name");
  const systemTag = document.getElementById("vn-system-tag");
  const textEl = document.getElementById("vn-text");
  const optionsEl = document.getElementById("vn-options");
  const continueBtn = document.getElementById("btn-reader-continue");
  const endingCard = document.getElementById("vn-ending-card");
  const dialogueBox = document.getElementById("vn-dialogue-box");
  const backBtn = document.getElementById("btn-hud-back");

  backBtn.disabled = !engine.canRollback();

  // ---- fondo (con crossfade) ----
  setBackground(node.backgroundUrl || "");

  // ---- final real, o fin de capítulo que sigue con la próxima historia ----
  if (node.type === "ending" || node.type === "chapter_end") {
    dialogueBox.style.visibility = "hidden";
    charImg.hidden = true;
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

  // ---- personaje + expresión ----
  const character = findCharacter(node.character);
  let portrait = null;
  if (character && character.images && character.images.length) {
    portrait =
      character.images.find((img) => img.label === node.characterExpression) ||
      character.images[0];
  }
  if (portrait) {
    if (charImg.src !== portrait.url) {
      charImg.src = portrait.url;
      charImg.alt = character.name;
      replayAnimation(charImg);
    }
    charImg.hidden = false;
  } else {
    charImg.hidden = true;
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

  // ---- texto (con fade de entrada en cada línea) ----
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
