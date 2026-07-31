/**
 * main.js
 * -----------------------------------------------------------------------
 * Pega todas las piezas: cambia de pantalla, arranca el StoryEngine con
 * los datos que salieron de la creación de personaje, y renderiza el
 * stream de nodos en formato panel vertical (estilo webtoon).
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
  // TU_STORY_ID = el ID del documento en Firestore > stories (lo ves en
  // Firebase Console > Firestore Database > colección "stories", el ID
  // que aparece arriba de cada documento, NO un campo de adentro).
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

  document.getElementById("panel-stream").innerHTML = "";
  showScreen("screen-game");
  renderCurrentNode();
}

function renderCurrentNode() {
  const node = engine.getCurrentNode();
  const stream = document.getElementById("panel-stream");
  const readerNav = document.getElementById("reader-nav");

  const panel = document.createElement("div");
  panel.className = `node-panel${node.type === "ending" ? " ending-panel" : ""}`;

  const sceneTag = node.scene ? node.scene.replace(/_/g, " ") : "";
  let inner = `
    <div class="node-panel-bg">
      <span class="node-panel-scene-tag">${sceneTag}</span>
    </div>
    <div class="node-panel-body">`;

  switch (node.type) {
    case "dialogue":
      inner += `${node.speaker ? `<div class="node-speaker">${node.speaker}</div>` : ""}
                 <div class="node-text">${node.text}</div>`;
      break;

    case "event":
      inner += `<div class="node-system-tag">◆ evento</div>
                 <div class="node-text">${node.text}</div>`;
      break;

    case "condition":
      inner += `<div class="node-system-tag">◆ el sistema evalúa la situación...</div>`;
      break;

    case "random":
      inner += `<div class="node-system-tag">🎲 el destino decide...</div>
                 <div class="node-text">${node.text || ""}</div>`;
      break;

    case "choice":
      inner += `${node.speaker ? `<div class="node-speaker">${node.speaker}</div>` : ""}
                 <div class="node-text">${node.text}</div>
                 <div class="node-options" id="node-options"></div>`;
      break;

    case "ending":
      inner += `<div class="ending-title">${node.title}</div>
                 <div class="node-text">${node.summary}</div>`;
      break;
  }

  inner += `</div>`;
  panel.innerHTML = inner;
  stream.appendChild(panel);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  if (node.type === "choice") {
    const optionsWrap = panel.querySelector("#node-options");
    node.options.forEach((option, i) => {
      const btn = document.createElement("button");
      btn.className = "node-option-btn";
      btn.textContent = option.text;
      btn.addEventListener("click", () => {
        optionsWrap.querySelectorAll("button").forEach((b) => (b.disabled = true));
        engine.choose(i);
        renderCurrentNode();
      });
      optionsWrap.appendChild(btn);
    });
    readerNav.hidden = true;
    return;
  }

  if (node.type === "ending") {
    readerNav.hidden = true;
    return;
  }

  // dialogue / event / condition / random: el jugador solo avanza
  readerNav.hidden = false;
}

function initGameControls() {
  document.getElementById("btn-reader-continue").addEventListener("click", () => {
    // dialogue, event, condition y random se resuelven todos con advance();
    // condition y random deciden el siguiente nodo solos, sin pedirle nada al jugador.
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

  document.getElementById("btn-hud-restart").addEventListener("click", () => {
    if (!confirm("¿Reiniciar tu historia desde el principio?")) return;
    Object.assign(player, {
      protagonist: null, route: null, job: null, housing: null,
      haremMode: false, heroines: []
    });
    document.getElementById("hud-stats-panel").hidden = true;
    goToStepScreen(0);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.GAME_DATA_READY;
  initCharacterCreation();
  initGameControls();
  document.getElementById("btn-summary-confirm").addEventListener("click", startStory);
  showScreen("screen-boot");
});
