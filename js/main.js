/**
 * main.js
 * -----------------------------------------------------------------------
 * Pega todas las piezas: cambia de pantalla, arranca el StoryEngine con
 * los datos que salieron de la creación de personaje, y renderiza la
 * pantalla de lectura en formato novela visual clásica — fondo a pantalla
 * completa, personaje grande parado sobre el fondo, caja de diálogo fija
 * abajo. Cada nodo REEMPLAZA lo anterior (no se apila como antes).
 *
 * La historia y los datos de personaje salen de Firestore vía
 * data-loader.js (window.GAME_DATA_READY / window.loadStory).
 * -----------------------------------------------------------------------
 */

let engine = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

async function startStory() {
  // TU_STORY_ID = el ID del documento en Firestore > stories.
  await window.loadStory("TU_STORY_ID");

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

  showScreen("screen-game");
  renderCurrentNode();
}

function findCharacter(name) {
  if (!name) return null;
  const all = [
    ...(window.GAME_DATA.PROTAGONISTS || []),
    ...(window.GAME_DATA.HEROINES || [])
  ];
  return all.find((c) => c.name === name) || null;
}

function renderCurrentNode() {
  const node = engine.getCurrentNode();

  const bg = document.getElementById("vn-bg");
  const charImg = document.getElementById("vn-character");
  const speakerEl = document.getElementById("vn-speaker-name");
  const systemTag = document.getElementById("vn-system-tag");
  const textEl = document.getElementById("vn-text");
  const optionsEl = document.getElementById("vn-options");
  const continueBtn = document.getElementById("btn-reader-continue");
  const endingCard = document.getElementById("vn-ending-card");
  const dialogueBox = document.getElementById("vn-dialogue-box");

  // ---- fondo ----
  bg.style.backgroundImage = node.backgroundUrl ? `url('${node.backgroundUrl}')` : "";

  // ---- final: tapa toda la escena, no se usa la caja de diálogo ----
  if (node.type === "ending") {
    dialogueBox.style.visibility = "hidden";
    charImg.hidden = true;
    endingCard.hidden = false;
    document.getElementById("vn-ending-title").textContent = node.title || "";
    document.getElementById("vn-ending-summary").textContent = node.summary || "";
    return;
  }
  endingCard.hidden = true;
  dialogueBox.style.visibility = "visible";

  // ---- personaje parado sobre el fondo ----
  const character = findCharacter(node.character);
  const portrait = character && character.images && character.images[0];
  if (portrait) {
    charImg.src = portrait.url;
    charImg.alt = character.name;
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

  // ---- texto ----
  textEl.textContent = node.text || "";

  // ---- opciones (choice) vs. continuar (dialogue/event/condition/random) ----
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
    // dialogue, event, condition y random se resuelven todos con advance();
    // condition y random deciden solos el siguiente nodo, sin preguntarle nada al jugador.
    engine.advance();
    renderCurrentNode();
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
    if (!confirm("¿Reiniciar tu historia desde el principio?")) return;
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
  showScreen("screen-boot");
});
