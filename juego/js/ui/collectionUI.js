/**
 * COLLECTIONUI.JS
 * -----------------------------------------------------------------------
 * Galería de todas las cartas del diseño (GameData.cartas), marcando
 * cuáles tiene el jugador, cuáles no (silueta bloqueada) y cuáles están
 * caídas (con botón para revivir pagando su costo por rareza).
 * Filtros por rareza, elemento y clase, tal como se definió.
 * -----------------------------------------------------------------------
 */

let collectionFilters = { rareza: "todas", elemento: "todas", clase: "todas" };
let cartaDetalleAbiertaId = null; // id de la carta con el detalle grande abierto, o null

function renderCollectionView() {
  const container = document.getElementById("view-coleccion");

  const rarezaOptions = `<option value="todas">Todas las rarezas</option>` +
    RAREZAS.map((r) => `<option value="${r}">${r}</option>`).join("");
  const elementoOptions = `<option value="todas">Todos los elementos</option>` +
    GameData.elementos.lista.map((e) => `<option value="${e.id}">${e.label}</option>`).join("");
  const claseOptions = `<option value="todas">Todas las clases</option>` +
    CLASSES_LIST.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");

  const cartasFiltradas = GameData.cartas.filter((c) => {
    if (collectionFilters.rareza !== "todas" && c.rareza !== collectionFilters.rareza) return false;
    if (collectionFilters.elemento !== "todas" && c.elemento !== collectionFilters.elemento) return false;
    if (collectionFilters.clase !== "todas" && c.clase !== collectionFilters.clase) return false;
    return true;
  });

  container.innerHTML = `
    ${renderScreenHeader("Colección", "hub")}
    <div class="collection">
      <div class="collection__filtros">
        <select id="filtro-rareza">${rarezaOptions}</select>
        <select id="filtro-elemento">${elementoOptions}</select>
        <select id="filtro-clase">${claseOptions}</select>
      </div>
      <div class="collection__grid">
        ${cartasFiltradas.map(renderCollectionCard).join("") || '<p class="empty-hint">Ninguna carta coincide con estos filtros.</p>'}
      </div>
    </div>
    ${cartaDetalleAbiertaId ? renderCardDetailModal(cartaDetalleAbiertaId) : ""}
  `;

  attachScreenHeaderEvents(container);

  container.querySelector("#filtro-rareza").value = collectionFilters.rareza;
  container.querySelector("#filtro-elemento").value = collectionFilters.elemento;
  container.querySelector("#filtro-clase").value = collectionFilters.clase;

  ["rareza", "elemento", "clase"].forEach((campo) => {
    container.querySelector(`#filtro-${campo}`).addEventListener("change", (e) => {
      collectionFilters[campo] = e.target.value;
      renderCollectionView();
    });
  });

  container.querySelectorAll("[data-abrir-detalle]").forEach((el) => {
    el.addEventListener("click", () => {
      cartaDetalleAbiertaId = el.dataset.abrirDetalle;
      renderCollectionView();
    });
  });

  container.querySelectorAll(".btn--revivir").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const resultado = reviveCardPaying(btn.dataset.id);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      renderCollectionView();
    });
  });

  container.querySelectorAll("[data-evolucionar]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const resultado = evolveCard(btn.dataset.evolucionar);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      alert(`¡Evolucionó a ${resultado.nuevaCarta.nombre}!`);
      renderCollectionView();
    });
  });

  const overlay = container.querySelector(".carddetail-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cartaDetalleAbiertaId = null;
        renderCollectionView();
      }
    });
    const btnCerrar = overlay.querySelector("#btn-cerrar-detalle-carta");
    btnCerrar.addEventListener("click", () => {
      cartaDetalleAbiertaId = null;
      renderCollectionView();
    });
  }
}

function renderCollectionCard(carta) {
  const tiene = ownsCard(carta.id);
  const caida = isCardCaida(carta.id);

  if (!tiene) {
    return `
      <div class="collectioncard collectioncard--bloqueada">
        <div class="collectioncard__silueta">?</div>
        <div class="collectioncard__nombre">???</div>
      </div>
    `;
  }

  const costoRevivir = ECONOMY_CONFIG.revivir.costoPorRareza[carta.rareza];
  const { nivel, xp } = getCardLevelInfo(carta.id);
  const nivelMax = getNivelMaxPorRareza(carta.rareza, GameData.niveles);
  const xpSiguiente = xpParaSiguienteNivel(carta.rareza, nivel, GameData.niveles);
  const cartaNivelada = getLeveledCardTemplate(carta);
  const pctXp = xpSiguiente === Infinity ? 100 : Math.round((xp / xpSiguiente) * 100);
  const fragmentos = getCardFragments(carta.id);
  const evoInfo = canEvolveCard(carta.id);
  const puedeMostrarEvolucion = carta.evolucion && carta.evolucion.puedeEvolucionar && carta.evolucion.siguienteCartaId && evoInfo.requisitos;

  return `
    <div class="collectioncard collectioncard--${carta.rareza} ${caida ? "collectioncard--caida" : ""}" data-abrir-detalle="${carta.id}">
      ${carta.esFMC ? '<span class="collectioncard__fmc" title="Carta FMC — centro de estrategia">FMC</span>' : ""}
      ${carta.imagen ? `<img class="collectioncard__img" src="${carta.imagen}" alt="${carta.nombre}" />` : ""}
      <div class="collectioncard__nivel">Nv. ${nivel}${nivel >= nivelMax ? " (máx)" : ` / ${nivelMax}`}</div>
      <div class="collectioncard__nombre">${carta.nombre}</div>
      <div class="collectioncard__meta">${carta.rareza} · ${carta.clase}</div>
      <div class="collectioncard__xpbar" title="${nivel >= nivelMax ? "Nivel máximo" : `${xp} / ${xpSiguiente} XP`}">
        <div class="collectioncard__xpbar-fill" style="width:${pctXp}%"></div>
      </div>
      <div class="collectioncard__stats">
        HP ${cartaNivelada.stats.hp} · ATQ ${cartaNivelada.stats.atk} · DEF ${cartaNivelada.stats.def} · VEL ${cartaNivelada.stats.velocidad}
      </div>
      ${
        caida
          ? `<button class="btn btn--peligro btn--revivir" data-id="${carta.id}">Revivir (🪙 ${costoRevivir})</button>`
          : '<div class="collectioncard__estado">Disponible</div>'
      }
      ${puedeMostrarEvolucion ? renderEvolutionBlock(carta, evoInfo, fragmentos) : ""}
    </div>
  `;
}

function renderEvolutionBlock(carta, evoInfo, fragmentos) {
  const req = evoInfo.requisitos;
  return `
    <div class="collectioncard__evolucion">
      <p class="collectioncard__evotitulo">→ ${evoInfo.siguiente.nombre} (${evoInfo.siguiente.rareza})</p>
      <p class="${req.nivel.cumplido ? "collectioncard__evook" : ""}">Nivel ${req.nivel.actual}/${req.nivel.requerido}</p>
      <p class="${req.fragmentos.cumplido ? "collectioncard__evook" : ""}">🧩 ${req.fragmentos.actual}/${req.fragmentos.requerido}</p>
      <p class="${req.moneda.cumplido ? "collectioncard__evook" : ""}">🪙 ${req.moneda.requerido}</p>
      <button class="btn btn--evolucionar" data-evolucionar="${carta.id}" ${evoInfo.puede ? "" : "disabled"}>Evolucionar</button>
    </div>
  `;
}

/** Vista grande de una carta: arte completo, stats nivelados, pasivas y habilidades. */
function renderCardDetailModal(cardId) {
  const carta = GameData.cartas.find((c) => c.id === cardId);
  if (!carta || !ownsCard(cardId)) return "";

  const cartaNivelada = getLeveledCardTemplate(carta);
  const { nivel } = getCardLevelInfo(cardId);
  const nivelMax = getNivelMaxPorRareza(carta.rareza, GameData.niveles);
  const elemento = getElementDefById(carta.elemento, GameData.elementos.lista);
  const clase = CLASSES_LIST.find((c) => c.id === carta.clase);

  return `
    <div class="carddetail-overlay">
      <div class="carddetail carddetail--${carta.rareza}">
        <button type="button" class="carddetail__cerrar" id="btn-cerrar-detalle-carta">✕</button>
        ${carta.imagen ? `<img class="carddetail__img" src="${carta.imagen}" alt="${carta.nombre}" />` : '<div class="carddetail__sinarte">' + carta.nombre[0] + "</div>"}
        <h3 class="carddetail__nombre">${carta.nombre} ${carta.esFMC ? '<span class="collectioncard__fmc" style="position:static; display:inline-block; vertical-align:middle;">FMC</span>' : ""}</h3>
        <p class="hint">${carta.rareza} · ${clase ? clase.label : carta.clase}${carta.arquetipo ? ` (${carta.arquetipo})` : ""}${elemento ? ` · ${elemento.label}` : ""}</p>
        <p class="carddetail__nivel">Nivel ${nivel}${nivel >= nivelMax ? " (máximo)" : ` / ${nivelMax}`}</p>

        <div class="carddetail__stats">
          <div class="carddetail__stat">❤️ HP<strong>${cartaNivelada.stats.hp}</strong></div>
          <div class="carddetail__stat">⚔️ ATQ<strong>${cartaNivelada.stats.atk}</strong></div>
          <div class="carddetail__stat">🛡️ DEF<strong>${cartaNivelada.stats.def}</strong></div>
          <div class="carddetail__stat">💨 VEL<strong>${cartaNivelada.stats.velocidad}</strong></div>
        </div>

        ${
          carta.pasivas.length > 0
            ? `<h4>Pasivas</h4><ul class="carddetail__lista">${carta.pasivas.map((p) => `<li>${p.nombre}</li>`).join("")}</ul>`
            : ""
        }
        ${
          carta.habilidades.length > 0
            ? `<h4>Habilidades</h4><ul class="carddetail__lista">${carta.habilidades.map((h) => `<li>${h.nombre}</li>`).join("")}</ul>`
            : ""
        }
      </div>
    </div>
  `;
}
