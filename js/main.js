/**
 * character-creation.js
 * -----------------------------------------------------------------------
 * Maneja los 2 pasos antes de que arranque el motor de nodos:
 *   1. Protagonista (ruleta)   2. Reparto de 15 puntos
 *
 * Ruta, Trabajo, Vivienda y Heroína YA NO se eligen acá — ahora son nodos
 * dentro de la propia historia (elegir_ruta / elegir_trabajo /
 * elegir_vivienda / sorteo_heroina en story-engine.js), para que un
 * escritor los pueda ubicar donde quiera del árbol, incluso más de una vez.
 * Ver esos nodos y la resolución de opciones en main.js.
 *
 * El paso de Protagonista es RULETA: el sistema elige por vos, pesado por
 * el campo "weight" que se carga desde el admin (más alto = más
 * probable). No hay cartas para tocar ahí, solo un botón para girar — así
 * cada partida se siente distinta.
 * -----------------------------------------------------------------------
 */

// Recorta la imagen centrada en la cara detectada (vía Cloudinary), en
// vez de siempre agarrar la franja de arriba — así funciona incluso con
// poses dinámicas (brazo levantado, salto, etc.) donde la cabeza no está
// necesariamente en el borde superior de la imagen.
function faceCropUrl(url, width, height) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},h_${height},c_fill,g_auto:face/`);
}

const player = {
  protagonist: null,
  allocatedStats: { carisma: 0, inteligencia: 0, fisico: 0, riqueza: 0 },
  spinsUsed: {}
};

// Elige un item al azar, pesado por item.weight (1-100). Si falta el
// campo o es 0/inválido, se lo trata como peso 1 (no rompe partidas
// viejas cargadas antes de que existiera este campo).
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

const STEPS = [
  {
    id: "protagonist",
    label: "Reencarnación",
    title: "¿En quién reencarnás?",
    subtitle: "El sistema decide por vos. Girá la ruleta — tenés 3 intentos.",
    isRoulette: true,
    maxSpins: 3,
    source: () => window.GAME_DATA.PROTAGONISTS,
    renderExtra: (item) => `
      <div class="stat-row">
        ${Object.entries(item.stats || {}).map(([k, v]) => `<span>${k}: <b>${v}</b></span>`).join("")}
      </div>`
  },
  {
    id: "statAllocation",
    label: "Estadísticas",
    title: "Repartí tus 15 puntos",
    subtitle: "Vos decidís cómo se dividen entre las 4 stats — cada partida puede jugarse distinto.",
    isAllocation: true,
  }
];

let stepIndex = 0;

function currentStep() {
  return STEPS[stepIndex];
}

function stepIsSatisfied() {
  const step = currentStep();
  if (step.isAllocation) {
    const total = ["carisma", "inteligencia", "fisico", "riqueza"]
      .reduce((sum, k) => sum + (player.allocatedStats[k] || 0), 0);
    return total === 15;
  }
  return Boolean(playerValueFor(step.id));
}

function playerValueFor(stepId) {
  return player[stepId];
}

function renderCardGridStep(step) {
  const items = step.source();
  const grid = document.getElementById("step-cards");

  if (items.length === 0) {
    grid.innerHTML = `<p class="pick-card-desc">No hay opciones disponibles con tu selección anterior.</p>`;
    return;
  }

  items.forEach((item) => {
    const isSelected = playerValueFor(step.id)?.id === item.id;
    const firstImg = (item.images || [])[0];

    const card = document.createElement("div");
    card.className = `pick-card${isSelected ? " selected" : ""}`;
    card.innerHTML = `
      <div class="pick-card-check"></div>
      ${firstImg ? `<img class="pick-card-img" src="${faceCropUrl(firstImg.url, 800, 280)}" alt="${item.name}" />` : ""}
      <h3 class="pick-card-name">${item.name}</h3>
      <p class="pick-card-desc">${item.desc}</p>
      ${step.renderExtra ? step.renderExtra(item) : ""}
    `;
    card.addEventListener("click", () => {
      step.onSelect(item);
      renderStep();
    });
    grid.appendChild(card);
  });
}

function renderRouletteStep(step) {
  const items = step.source();
  const grid = document.getElementById("step-cards");

  if (items.length === 0) {
    grid.innerHTML = `<p class="pick-card-desc">No hay opciones disponibles con tu selección anterior.</p>`;
    return;
  }

  const picks = player[step.id] ? [player[step.id]] : [];
  let canSpin = true;
  const spinsUsed = player.spinsUsed[step.id] || 0;
  if (step.maxSpins) canSpin = canSpin && spinsUsed < step.maxSpins;

  const wrap = document.createElement("div");
  wrap.className = "roulette-wrap";

  if (picks.length) {
    const revealed = document.createElement("div");
    revealed.className = "roulette-revealed";
    picks.forEach((item) => {
      const firstImg = (item.images || [])[0];
      const card = document.createElement("div");
      card.className = "pick-card selected roulette-result";
      card.innerHTML = `
        ${firstImg ? `<img class="pick-card-img" src="${faceCropUrl(firstImg.url, 800, 280)}" alt="${item.name}" />` : ""}
        <h3 class="pick-card-name">${item.name}</h3>
        <p class="pick-card-desc">${item.desc}</p>
        ${step.renderExtra ? step.renderExtra(item) : ""}
      `;
      revealed.appendChild(card);
    });
    wrap.appendChild(revealed);
  } else {
    const empty = document.createElement("p");
    empty.className = "pick-card-desc";
    empty.textContent = "Todavía no giraste. Tocá el botón para que el sistema elija.";
    wrap.appendChild(empty);
  }

  if (canSpin) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-primary roulette-btn";
    const remaining = step.maxSpins ? ` (${step.maxSpins - spinsUsed} ${step.maxSpins - spinsUsed === 1 ? "intento" : "intentos"})` : "";
    btn.textContent = (picks.length ? "🎲 Volver a girar" : "🎰 Girar la ruleta") + remaining;
    btn.addEventListener("click", () => {
      const result = weightedPick(items);
      if (!result) return;
      if (step.maxSpins) player.spinsUsed[step.id] = spinsUsed + 1;
      player[step.id] = result;
      renderStep();
    });
    wrap.appendChild(btn);
  } else if (step.maxSpins && picks.length) {
    const note = document.createElement("p");
    note.className = "pick-card-desc";
    note.textContent = "Ya usaste tus " + step.maxSpins + " tiradas — este es tu personaje.";
    wrap.appendChild(note);
  }

  grid.appendChild(wrap);
}

function renderAllocationStep() {
  const grid = document.getElementById("step-cards");
  const keys = ["carisma", "inteligencia", "fisico", "riqueza"];
  const labels = { carisma: "Carisma", inteligencia: "Inteligencia", fisico: "Físico", riqueza: "Riqueza" };

  const wrap = document.createElement("div");
  wrap.className = "allocation-wrap";

  const totalEl = document.createElement("div");
  totalEl.className = "allocation-total";

  function currentTotal() {
    return keys.reduce((sum, k) => sum + (player.allocatedStats[k] || 0), 0);
  }

  function refresh() {
    const total = currentTotal();
    totalEl.innerHTML = `Puntos usados: <b class="${total === 15 ? "ok" : "warn"}">${total} / 15</b>`;
    keys.forEach((k) => {
      const input = wrap.querySelector(`input[data-stat="${k}"]`);
      const valueLabel = wrap.querySelector(`span[data-stat-value="${k}"]`);
      const otherSum = total - (player.allocatedStats[k] || 0);
      input.max = 15 - otherSum;
      valueLabel.textContent = player.allocatedStats[k] || 0;
    });
    refreshNextButton();
  }

  keys.forEach((k) => {
    const row = document.createElement("div");
    row.className = "allocation-row";
    row.innerHTML = `
      <label>${labels[k]}</label>
      <input type="range" min="0" max="15" value="${player.allocatedStats[k] || 0}" data-stat="${k}" />
      <span class="allocation-value" data-stat-value="${k}">${player.allocatedStats[k] || 0}</span>
    `;
    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      player.allocatedStats[k] = Number(input.value);
      refresh();
    });
    wrap.appendChild(row);
  });

  wrap.appendChild(totalEl);
  grid.appendChild(wrap);
  refresh();
}

function renderStep() {
  const step = currentStep();

  document.getElementById("step-current").textContent = stepIndex + 1;
  document.getElementById("step-total").textContent = STEPS.length;
  document.getElementById("step-label").textContent = step.label;
  document.getElementById("step-title").textContent = step.title;
  document.getElementById("step-subtitle").textContent = step.subtitle;

  const grid = document.getElementById("step-cards");
  grid.innerHTML = "";

  if (step.isRoulette) {
    renderRouletteStep(step);
  } else if (step.isAllocation) {
    renderAllocationStep();
  } else {
    renderCardGridStep(step);
  }

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
  const statsStr = ["carisma", "inteligencia", "fisico", "riqueza"]
    .map((k) => `${k}: ${player.allocatedStats[k] || 0}`)
    .join(" · ");
  // Ruta/Trabajo/Vivienda/Heroína ya no se muestran acá — se eligen más
  // adelante, dentro de la propia historia.
  const rows = [
    ["Protagonista", player.protagonist.name],
    ["Stats", statsStr]
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

  document.getElementById("btn-summary-back").addEventListener("click", () => goToStepScreen(STEPS.length - 1));

  // el listener de "Empezar tu historia" se conecta desde main.js,
  // que es quien arranca el StoryEngine con los datos de `player`.
}
