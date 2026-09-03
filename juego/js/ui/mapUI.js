/**
 * MAPUI.JS
 * -----------------------------------------------------------------------
 * Tres estados posibles de esta vista:
 *   1) No hay run activa → elegir un preset y "Iniciar run".
 *   2) Hay run activa, sin interacción pendiente → mostrar el mapa y
 *      dejar elegir el siguiente nodo disponible.
 *   3) Hay run activa CON una interacción pendiente (evento/tienda/
 *      descanso) → mostrar solo esa interacción hasta resolverla.
 *      Los nodos de combate/élite/jefe no pasan por aquí: usan
 *      directamente la pantalla "Combate en curso" ya existente.
 * -----------------------------------------------------------------------
 */

let pendingNodeInteraction = null; // null | { tipo, nodo, ...datosExtra }
let ultimoResultadoGachaTienda = null; // texto del último resultado de gacha dentro de la tienda de un nodo
let ultimoResultadoNodo = null; // { recompensa, subidasNivel } del último combate ganado, para mostrar un aviso

function renderResultadoNodoBanner() {
  if (!ultimoResultadoNodo) return "";
  const { recompensa, subidasNivel } = ultimoResultadoNodo;
  return `
    <div class="resultnodo">
      <button type="button" class="resultnodo__cerrar" id="btn-cerrar-resultnodo">✕</button>
      <p>🪙 +${recompensa} de moneda por ganar el combate.</p>
      ${subidasNivel.map((s) => `<p>⭐ ${s.nombre} subió de nivel ${s.nivelAnterior} a nivel ${s.nivelNuevo}.</p>`).join("")}
    </div>
  `;
}

function attachResultadoNodoBannerEvents(container) {
  const btn = container.querySelector("#btn-cerrar-resultnodo");
  if (btn) btn.addEventListener("click", () => {
    ultimoResultadoNodo = null;
    renderMapView();
  });
}

function renderMapView() {
  const container = document.getElementById("view-aventura");
  const bannerHtml = renderResultadoNodoBanner();

  if (!activeRun || activeRun.finalizada) {
    container.innerHTML = `${renderScreenHeader("Aventura", "hub")}${bannerHtml}${renderStartRunScreen()}`;
    attachScreenHeaderEvents(container);
    attachStartRunEvents(container);
    attachResultadoNodoBannerEvents(container);
    return;
  }

  const relicsHtml = renderRelicsBar();

  if (pendingNodeInteraction) {
    container.innerHTML = `${renderScreenHeader("Aventura", "hub")}${bannerHtml}${relicsHtml}${renderPendingInteraction(pendingNodeInteraction)}`;
    attachScreenHeaderEvents(container);
    attachRelicsBarEvents(container, renderMapView);
    attachInteractionEvents(container);
    attachResultadoNodoBannerEvents(container);
    return;
  }

  container.innerHTML = `${renderScreenHeader("Aventura", "hub")}${bannerHtml}${relicsHtml}${renderRunMap()}`;
  attachScreenHeaderEvents(container);
  attachRelicsBarEvents(container, renderMapView);
  attachResultadoNodoBannerEvents(container);
  attachMapEvents(container);
}

/* ---------------------------------------------------------------------
   1) Iniciar run
--------------------------------------------------------------------- */

function renderStartRunScreen() {
  const botonEquipos = `<button type="button" class="btn btn--secundario" id="btn-ir-a-equipos">✏️ Gestionar equipos</button>`;

  if (PlayerData.presets.length === 0) {
    return `
      <div class="startrun">
        <p class="empty-hint">Todavía no tienes ningún equipo armado.</p>
        ${botonEquipos}
      </div>
    `;
  }
  return `
    <div class="startrun">
      <h3>Elige un equipo para iniciar la aventura</h3>
      ${PlayerData.presets
        .map((p) => {
          const algunaCaida = p.cartaIds.some((id) => isCardCaida(id));
          const cartas = p.cartaIds.map((id) => GameData.cartas.find((c) => c.id === id)).filter(Boolean);
          const protagonista = p.protagonistaId ? getPersonalizedProtagonist(p.protagonistaId) : null;
          return `
          <div class="presetcard">
            <strong>${p.nombre}</strong>
            <div class="presetcard__miniaturas">
              ${cartas
                .map(
                  (c) => `
                <div class="presetmini presetmini--${c.rareza}" title="${c.nombre}">
                  ${c.imagen ? `<img src="${c.imagen}" alt="${c.nombre}" />` : `<span>${c.nombre[0]}</span>`}
                </div>`
                )
                .join("")}
            </div>
            ${protagonista ? `<p class="hint">⭐ ${protagonista.nombre}</p>` : ""}
            ${algunaCaida ? '<p class="hint">⚠️ Este equipo tiene alguna carta caída — revívela primero en Colección.</p>' : ""}
            <button class="btn" data-run-id="${p.id}" ${algunaCaida ? "disabled" : ""}>Iniciar run con este equipo</button>
          </div>
        `;
        })
        .join("")}
      ${botonEquipos}
    </div>
  `;
}

function attachStartRunEvents(container) {
  container.querySelectorAll("[data-run-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = PlayerData.presets.find((p) => p.id === btn.dataset.runId);
      startNewRun(preset);
      ultimoResultadoNodo = null;
      renderMapView();
    });
  });

  const btnIrAEquipos = container.querySelector("#btn-ir-a-equipos");
  if (btnIrAEquipos) btnIrAEquipos.addEventListener("click", () => showView("equipos"));
}

/* ---------------------------------------------------------------------
   2) Mapa con nodos disponibles
--------------------------------------------------------------------- */

function renderRunMap() {
  const disponibles = getAvailableNextNodes(activeRun.mapa).map((n) => n.id);

  const pisosHtml = activeRun.mapa.pisos
    .map((piso) => {
      const nodosHtml = piso
        .map((nodo) => {
          const tipo = getNodeType(nodo.tipo);
          const visitado = activeRun.mapa.nodosVisitados.includes(nodo.id);
          const esActual = activeRun.mapa.nodoActualId === nodo.id;
          const esDisponible = disponibles.includes(nodo.id);
          const clases = [
            "runnode",
            visitado ? "runnode--visitado" : "",
            esActual ? "runnode--actual" : "",
            esDisponible ? "runnode--disponible" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `
            <button class="${clases}" style="--nodo-color:${tipo.color}" data-nodo-id="${nodo.id}" ${esDisponible ? "" : "disabled"}>
              <span class="runnode__icono">${tipo.icono}</span>
              <span class="runnode__label">${tipo.label}</span>
            </button>
          `;
        })
        .join("");
      return `<div class="runmap__piso">${nodosHtml}</div>`;
    })
    .join("");

  const cardIdsVivas = getRunAliveCardIds();
  const hpResumen = cardIdsVivas
    .map((id) => {
      const tpl = GameData.cartas.find((c) => c.id === id);
      const hp = activeRun.hpActual[id];
      return `<span class="runhp__item">${tpl.nombre}: ${hp}/${tpl.stats.hp}</span>`;
    })
    .join("");
  const caidasResumen = activeRun.cartasCaidasEnRun
    .map((id) => GameData.cartas.find((c) => c.id === id)?.nombre)
    .join(", ");

  return `
    <div class="runmap">
      <div class="runmap__hp">${hpResumen}${caidasResumen ? `<span class="runhp__item runhp__item--caida">Caídas: ${caidasResumen}</span>` : ""}</div>
      <div class="runmap__pisos">${pisosHtml}</div>
    </div>
  `;
}

function attachMapEvents(container) {
  container.querySelectorAll("[data-nodo-id]").forEach((btn) => {
    btn.addEventListener("click", () => handleNodeClick(btn.dataset.nodoId));
  });
}

function handleNodeClick(nodeId) {
  const nodo = findNodeById(activeRun.mapa, nodeId);
  moveToNode(nodeId);
  resolveNode(nodo);
}

function resolveNode(nodo) {
  if (nodo.tipo === "combate" || nodo.tipo === "elite" || nodo.tipo === "jefe") {
    enterCombatNode(nodo, (resultado) => {
      ultimoResultadoNodo = resultado.recompensa != null ? resultado : null;
      if (resultado.finalizada) {
        clearActiveRun();
      }
      showView("aventura");
    });
    return;
  }

  if (nodo.tipo === "evento") {
    const escenaHistoria = getCurrentStoryScene();
    pendingNodeInteraction = { tipo: "evento", nodo, evento: escenaHistoria || getRandomEvent(), esHistoria: !!escenaHistoria };
  } else if (nodo.tipo === "tienda") {
    pendingNodeInteraction = { tipo: "tienda", nodo };
  } else if (nodo.tipo === "descanso") {
    resolveRestNode();
    pendingNodeInteraction = { tipo: "descanso", nodo };
  }
  renderMapView();
}

/* ---------------------------------------------------------------------
   3) Interacciones de nodo (evento / tienda / descanso)
--------------------------------------------------------------------- */

function renderPendingInteraction(interaccion) {
  if (interaccion.tipo === "evento") return renderEventInteraction(interaccion);
  if (interaccion.tipo === "tienda") return renderShopInteraction(interaccion);
  if (interaccion.tipo === "descanso") return renderRestInteraction();
  return "";
}

function renderEventInteraction(interaccion) {
  const { evento, esHistoria } = interaccion;
  const tieneArteVN = !!(evento.imagenFondo || evento.imagenPersonaje);

  return `
    <div class="eventbox ${tieneArteVN ? "eventbox--historia" : ""}">
      ${evento.imagenFondo ? `<div class="eventbox__fondo" style="background-image:url('${evento.imagenFondo}')"></div>` : ""}
      <div class="eventbox__contenido">
        ${evento.imagenPersonaje ? `<img class="eventbox__personaje" src="${evento.imagenPersonaje}" alt="" />` : ""}
        <div class="eventbox__texto">
          ${esHistoria ? '<span class="eventbox__etiqueta">📖 Historia</span>' : ""}
          <h3>${evento.titulo}</h3>
          <p>${evento.texto}</p>
          <div class="eventbox__opciones">
            ${evento.opciones
              .map((op, i) => `<button class="btn" data-opcion-evento="${i}">${op.texto}</button>`)
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderShopInteraction() {
  const cardIdsVivas = getRunAliveCardIds();
  const objetosHtml = GameData.tienda.objetos.map(
    (item) => `
    <div class="shopitem">
      <strong>${item.nombre}</strong> — 🪙 ${item.costo}
      <p>${item.descripcion}</p>
      <select class="shopitem__objetivo" data-item-id="${item.id}">
        ${cardIdsVivas.map((id) => `<option value="${id}">${GameData.cartas.find((c) => c.id === id).nombre}</option>`).join("")}
      </select>
      <button class="btn" data-comprar-objeto="${item.id}" ${PlayerData.moneda < item.costo ? "disabled" : ""}>Comprar</button>
    </div>
  `
  ).join("");

  const caidasHtml = activeRun.cartasCaidasEnRun
    .map((id) => {
      const tpl = GameData.cartas.find((c) => c.id === id);
      const costo = ECONOMY_CONFIG.revivir.costoPorRareza[tpl.rareza];
      return `
      <div class="shopitem">
        <strong>Revivir a ${tpl.nombre}</strong> — 🪙 ${costo}
        <button class="btn" data-revivir-en-tienda="${id}" ${PlayerData.moneda < costo ? "disabled" : ""}>Revivir</button>
      </div>
    `;
    })
    .join("");

  const costoGacha = ECONOMY_CONFIG.gacha.costoPorTirada;

  return `
    <div class="shopbox">
      <h3>🏪 Tienda</h3>
      <div class="shopbox__seccion">
        <h4>Objetos</h4>
        ${objetosHtml || '<p class="empty-hint">La tienda no tiene objetos cargados todavía.</p>'}
      </div>
      ${activeRun.cartasCaidasEnRun.length > 0 ? `<div class="shopbox__seccion"><h4>Revivir cartas caídas</h4>${caidasHtml}</div>` : ""}
      <div class="shopbox__seccion">
        <h4>Gacha</h4>
        <button class="btn" id="btn-gacha-en-tienda" ${PlayerData.moneda < costoGacha ? "disabled" : ""}>Tirar (🪙 ${costoGacha})</button>
        <div id="resultado-gacha-tienda">${ultimoResultadoGachaTienda ? renderGachaResult(ultimoResultadoGachaTienda) : ""}</div>
      </div>
      <button class="btn btn--secundario" id="btn-salir-tienda">Salir de la tienda y continuar</button>
    </div>
  `;
}

function renderRestInteraction() {
  return `
    <div class="restbox">
      <h3>🔥 Descanso</h3>
      <p>Tu equipo recuperó 40% de su HP máximo.</p>
      <button class="btn" id="btn-continuar-descanso">Continuar</button>
    </div>
  `;
}

function attachInteractionEvents(container) {
  container.querySelectorAll("[data-opcion-evento]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const opcion = pendingNodeInteraction.evento.opciones[Number(btn.dataset.opcionEvento)];
      const r1 = resolveEventConsequence(opcion.consecuencia);
      const r2 = opcion.consecuenciaExtra ? resolveEventConsequence(opcion.consecuenciaExtra) : null;
      if (pendingNodeInteraction.esHistoria) advanceStoryProgress();
      alert([r1.mensaje, r2 ? r2.mensaje : null].filter(Boolean).join("\n"));
      pendingNodeInteraction = null;
      renderMapView();
    });
  });

  const btnSalirTienda = container.querySelector("#btn-salir-tienda");
  if (btnSalirTienda) btnSalirTienda.addEventListener("click", () => {
    pendingNodeInteraction = null;
    ultimoResultadoGachaTienda = null;
    renderMapView();
  });

  container.querySelectorAll("[data-comprar-objeto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = GameData.tienda.objetos.find((i) => i.id === btn.dataset.comprarObjeto);
      const select = container.querySelector(`.shopitem__objetivo[data-item-id="${item.id}"]`);
      const cardId = select.value;
      if (!spendCoins(item.costo)) {
        alert("Moneda insuficiente.");
        return;
      }
      if (item.efecto.tipo === "hp") {
        const tpl = GameData.cartas.find((c) => c.id === cardId);
        const cantidad = item.efecto.esPorcentaje ? Math.round(tpl.stats.hp * item.efecto.cantidad) : item.efecto.cantidad;
        activeRun.hpActual[cardId] = Math.min(tpl.stats.hp, (activeRun.hpActual[cardId] || 0) + cantidad);
      } else if (item.efecto.tipo === "buffCarta") {
        if (!activeRun.buffsPermanentes[cardId]) activeRun.buffsPermanentes[cardId] = [];
        activeRun.buffsPermanentes[cardId].push({ stat: item.efecto.stat, modificador: item.efecto.modificador });
        const tpl = GameData.cartas.find((c) => c.id === cardId);
        addRelicToRun({
          nombre: item.nombre,
          descripcion: `${item.descripcion} (en ${tpl ? tpl.nombre : "una carta"})`,
          tipo: "positivo",
        });
      }
      renderMapView();
    });
  });

  container.querySelectorAll("[data-revivir-en-tienda]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const resultado = reviveCardPaying(btn.dataset.revivirEnTienda);
      if (!resultado.ok) alert(resultado.motivo);
      renderMapView();
    });
  });

  const btnGachaTienda = container.querySelector("#btn-gacha-en-tienda");
  if (btnGachaTienda) btnGachaTienda.addEventListener("click", () => {
    ultimoResultadoGachaTienda = performGachaRoll();
    renderMapView();
  });

  const btnContinuarDescanso = container.querySelector("#btn-continuar-descanso");
  if (btnContinuarDescanso) btnContinuarDescanso.addEventListener("click", () => {
    pendingNodeInteraction = null;
    renderMapView();
  });
}
