/**
 * character-creation.js
 * -----------------------------------------------------------------------
 * Maneja los 5 pasos antes de que arranque el motor de nodos:
 *   1. Protagonista   2. Ruta/tono   3. Trabajo   4. Vivienda   5. Heroína(s)
 *
 * Todos los pasos comparten el mismo layout (una sola pantalla reciclada,
 * #screen-step) — lo que cambia es la config de cada paso: de dónde saca
 * las opciones, si es selección única o "harem", y cómo pinta cada carta.
 * Al terminar, arma `player` y lo pasa a main.js para iniciar el motor.
 * -----------------------------------------------------------------------
 */

const HAREM_MAX = 3;

const player = {
  protagonist: null,
  route: null,
  job: null,
  housing: null,
  haremMode: false,
  heroines: []
};

const STEPS = [
  {
    id: "protagonist",
    label: "Reencarnación",
    title: "¿En quién reencarnás?",
    subtitle: "Cada protagonista arranca con sus propias estadísticas.",
    source: () => window.GAME_DATA.PROTAGONISTS,
    renderExtra: (item) => `
      <div class="stat-row">
        ${Object.entries(item.stats).map(([k, v]) => `<span>${k}: <b>${v}</b></span>`).join("")}
      </div>`,
    onSelect: (item) => { player.protagonist = item; }
  },
  {
    id: "route",
    label: "Tu camino",
    title: "¿Qué tipo de historia querés vivir?",
    subtitle: "Define el tono general de la trama que vas a recorrer.",
    source: () => window.GAME_DATA.ROUTES,
    onSelect: (item) => { player.route = item; }
  },
  {
    id: "job",
    label: "Ocupación",
    title: "Trabajo o estudio",
    subtitle: "De acá dependen muchos personajes y tramas que vas a encontrar.",
    source: () => window.GAME_DATA.JOBS,
    renderExtra: (item) => `<span class="pick-card-tag">${item.tag}</span>`,
    onSelect: (item) => { player.job = item; player.housing = null; }
  },
  {
    id: "housing",
    label: "Vivienda",
    title: "¿Dónde vivís?",
    subtitle: "También define qué personajes y tramas están disponibles.",
    source: () => window.GAME_DATA.HOUSING.filter(
      (h) => !h.requiresJobTag || h.requiresJobTag === player.job.tag
    ),
    renderExtra: (item) => `<span class="pick-card-tag">${item.tag}</span>`,
    onSelect: (item) => { player.housing = item; }
  },
  {
    id: "heroines",
    label: "Interés romántico",
    title: "FMC o harem",
    subtitle: "Elegí una heroína principal, o activá el modo harem para elegir varias.",
    isHarem: true,
    source: () => window.GAME_DATA.HEROINES.filter(
      (h) => h.tags.includes(player.job.tag) || h.tags.includes(player.housing.tag)
    ),
    renderExtra: (item) => `<span class="pick-card-tag">${item.tags.join(" · ")}</span>`,
    onSelect: (item) => {
      if (player.haremMode) {
        const i = player.heroines.findIndex((h) => h.id === item.id);
        if (i >= 0) player.heroines.splice(i, 1);
        else if (player.heroines.length < HAREM_MAX) player.heroines.push(item);
      } else {
        player.heroines = [item];
      }
    }
  }
];

let stepIndex = 0;

function currentStep() {
  return STEPS[stepIndex];
}

function stepIsSatisfied() {
  const step = currentStep();
  return step.isHarem ? player.heroines.length > 0 : Boolean(playerValueFor(step.id));
}

function playerValueFor(stepId) {
  if (stepId === "heroines") return player.heroines.length ? player.heroines : null;
  return player[stepId];
}

function renderStep() {
  const step = currentStep();

  document.getElementById("step-current").textContent = stepIndex + 1;
  document.getElementById("step-total").textContent = STEPS.length;
  document.getElementById("step-label").textContent = step.label;
  document.getElementById("step-title").textContent = step.title;
  document.getElementById("step-subtitle").textContent = step.subtitle;

  const haremToggle = document.getElementById("harem-toggle");
  haremToggle.hidden = !step.isHarem;
  if (step.isHarem) {
    haremToggle.querySelectorAll(".harem-toggle-btn").forEach((btn) => {
      btn.classList.toggle("active", (btn.dataset.mode === "harem") === player.haremMode);
    });
  }

  const items = step.source();
  const grid = document.getElementById("step-cards");
  grid.innerHTML = "";

  if (items.length === 0) {
    grid.innerHTML = `<p class="pick-card-desc">No hay opciones disponibles con tu selección anterior.</p>`;
  }

  items.forEach((item) => {
    const isSelected = step.isHarem
      ? player.heroines.some((h) => h.id === item.id)
      : playerValueFor(step.id)?.id === item.id;
    const isDisabled = step.isHarem && player.haremMode &&
      !isSelected && player.heroines.length >= HAREM_MAX;

    const card = document.createElement("div");
    card.className = `pick-card${isSelected ? " selected" : ""}${isDisabled ? " disabled" : ""}`;
    card.innerHTML = `
      <div class="pick-card-check"></div>
      <h3 class="pick-card-name">${item.name}</h3>
      <p class="pick-card-desc">${item.desc}</p>
      ${step.renderExtra ? step.renderExtra(item) : ""}
    `;
    if (!isDisabled) {
      card.addEventListener("click", () => {
        step.onSelect(item);
        renderStep();
        refreshNextButton();
      });
    }
    grid.appendChild(card);
  });

  refreshNextButton();
}

function refreshNextButton() {
  document.getElementById("btn-step-next").disabled = !stepIsSatisfied();
  document.getElementById("btn-step-back").hidden = stepIndex === 0;
}

function goToStepScreen(index) {
  stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
  showScreen("screen-step");
  renderStep();
}

function renderSummary() {
  const rows = [
    ["Protagonista", player.protagonist.name],
    ["Ruta", player.route.name],
    ["Ocupación", player.job.name],
    ["Vivienda", player.housing.name],
    [player.haremMode ? "Harem" : "Heroína", player.heroines.map((h) => h.name).join(", ")]
  ];
  document.getElementById("summary-content").innerHTML = rows
    .map(([k, v]) => `<div class="summary-row"><span class="k">${k}</span><span class="v">${v}</span></div>`)
    .join("");
}

function initCharacterCreation() {
  document.getElementById("btn-start").addEventListener("click", () => goToStepScreen(0));

  document.getElementById("btn-step-back").addEventListener("click", () => {
    if (stepIndex === 0) return;
    goToStepScreen(stepIndex - 1);
  });

  document.getElementById("btn-step-next").addEventListener("click", () => {
    if (stepIndex < STEPS.length - 1) {
      goToStepScreen(stepIndex + 1);
    } else {
      renderSummary();
      showScreen("screen-summary");
    }
  });

  document.querySelectorAll(".harem-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      player.haremMode = btn.dataset.mode === "harem";
      player.heroines = [];
      renderStep();
    });
  });

  document.getElementById("btn-summary-back").addEventListener("click", () => goToStepScreen(STEPS.length - 1));

  // el listener de "Empezar tu historia" se conecta desde main.js,
  // que es quien arranca el StoryEngine con los datos de `player`.
}
