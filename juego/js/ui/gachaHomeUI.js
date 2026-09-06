/**
 * GACHAHOMEUI.JS
 * -----------------------------------------------------------------------
 * Pantalla de tirada de gacha general (fuera de una run). El nodo de
 * Tienda DENTRO de una run es distinto y vive en mapUI.js — comparte
 * la misma función performGachaRoll() de engine/gacha.js.
 *
 * La entrega de la carta tiene una animación de 2 tiempos para que se
 * sienta con más vida: primero se ve una carta boca abajo brillando
 * (suspenso), y después se revela con un giro y un destello de color
 * según la rareza que salió.
 * -----------------------------------------------------------------------
 */

let ultimoResultadoGacha = null;
let gachaFaseRevelacion = null; // null | "boca_abajo" | "revelado"
let _gachaRevealTimer = null;

const GACHA_REVEAL_DELAY_MS = 850;

/**
 * Convierte 0.55 en "55%" en vez de "55.00000000000001%" (error clásico
 * de punto flotante de JS al multiplicar decimales por 100). Redondea a
 * 1 decimal y quita el ".0" si el número ya es entero.
 */
function formatearProbabilidad(valorDecimal) {
  const pct = Math.round(valorDecimal * 1000) / 10;
  return (pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)) + "%";
}

function renderGachaHomeView() {
  const container = document.getElementById("view-tienda");
  const costo = ECONOMY_CONFIG.gacha.costoPorTirada;
  const tirando = gachaFaseRevelacion === "boca_abajo";

  container.innerHTML = `
    ${renderScreenHeader("Tienda", "hub")}
    <div class="gacha">
      <p class="gacha__moneda">🪙 ${PlayerData.moneda}</p>
      <p>Cada tirada cuesta 🪙 ${costo}. Probabilidades: Común ${formatearProbabilidad(ECONOMY_CONFIG.gacha.probabilidadPorRareza.comun)} ·
        Rara ${formatearProbabilidad(ECONOMY_CONFIG.gacha.probabilidadPorRareza.rara)} ·
        Épica ${formatearProbabilidad(ECONOMY_CONFIG.gacha.probabilidadPorRareza.epica)} ·
        Legendaria ${formatearProbabilidad(ECONOMY_CONFIG.gacha.probabilidadPorRareza.legendaria)} ·
        Mítica ${formatearProbabilidad(ECONOMY_CONFIG.gacha.probabilidadPorRareza.mitica)}
      </p>
      <button class="btn btn--titulo" id="btn-tirar-gacha" ${PlayerData.moneda < costo || tirando ? "disabled" : ""}>Tirar (🪙 ${costo})</button>

      <div class="gachareveal-stage">
        ${renderGachaStage()}
      </div>

      ${renderStartItemsSection()}
    </div>
  `;

  attachScreenHeaderEvents(container);

  const btnTirar = container.querySelector("#btn-tirar-gacha");
  btnTirar.addEventListener("click", () => {
    ultimoResultadoGacha = performGachaRoll();
    gachaFaseRevelacion = "boca_abajo";
    renderGachaHomeView();

    clearTimeout(_gachaRevealTimer);
    _gachaRevealTimer = setTimeout(() => {
      gachaFaseRevelacion = "revelado";
      renderGachaHomeView();
    }, GACHA_REVEAL_DELAY_MS);
  });

  container.querySelectorAll(".startitem__comprar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const objeto = GameData.tienda.objetos.find((o) => o.id === btn.dataset.id);
      if (!objeto) return;
      if (PlayerData.moneda < objeto.costo) {
        alert("No tienes suficiente moneda.");
        return;
      }
      if ((PlayerData.objetosActivos || []).includes(objeto.id)) return;
      PlayerData.moneda -= objeto.costo;
      PlayerData.objetosActivos = [...(PlayerData.objetosActivos || []), objeto.id];
      savePlayerData();
      renderGachaHomeView();
    });
  });

  container.querySelectorAll(".startitem__quitar").forEach((btn) => {
    btn.addEventListener("click", () => {
      PlayerData.moneda += Number(btn.dataset.costo) || 0;
      PlayerData.objetosActivos = (PlayerData.objetosActivos || []).filter((id) => id !== btn.dataset.id);
      savePlayerData();
      renderGachaHomeView();
    });
  });
}

/** Objetos comprables desde el hub para arrancar la próxima run con ellos ya activos (ver runState.js:startNewRun). */
function renderStartItemsSection() {
  const objetos = (GameData.tienda.objetos || []).filter((o) => o.disponibleAlIniciar);
  if (objetos.length === 0) return "";

  const activos = PlayerData.objetosActivos || [];

  return `
    <div class="startitems">
      <h3>Objetos para tu próxima run</h3>
      <p class="hint">Los compras ahora con tu moneda y quedan activos — se aplican solos a todo tu equipo apenas toques "Iniciar Aventura".</p>
      ${objetos
        .map((o) => {
          const comprado = activos.includes(o.id);
          return `
          <div class="startitem ${comprado ? "startitem--activo" : ""}">
            <div class="startitem__texto">
              <strong>${o.nombre}</strong>
              <p>${o.descripcion}</p>
            </div>
            ${
              comprado
                ? `<button type="button" class="btn btn--secundario startitem__quitar" data-id="${o.id}" data-costo="${o.costo}">Activo — quitar</button>`
                : `<button type="button" class="btn startitem__comprar" data-id="${o.id}" ${PlayerData.moneda < o.costo ? "disabled" : ""}>Comprar (🪙 ${o.costo})</button>`
            }
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderGachaStage() {
  if (!gachaFaseRevelacion) return "";
  if (gachaFaseRevelacion === "boca_abajo") {
    return `
      <div class="gachacard-back">
        <span class="gachacard-back__simbolo">✦</span>
      </div>
    `;
  }
  return renderGachaResult(ultimoResultadoGacha);
}

function renderGachaResult(resultado) {
  if (!resultado.ok) {
    return `<p class="hint">${resultado.motivo}</p>`;
  }

  const rareza = resultado.carta.rareza;
  const esRarezaAlta = rareza === "legendaria" || rareza === "mitica";
  const chispas = esRarezaAlta
    ? Array.from({ length: 8 })
        .map((_, i) => {
          const angulo = (i / 8) * 2 * Math.PI;
          const distancia = 70 + Math.random() * 30;
          const dx = Math.round(Math.cos(angulo) * distancia);
          const dy = Math.round(Math.sin(angulo) * distancia);
          return `<span class="gachareveal__chispa" style="--dx:${dx}px; --dy:${dy}px; animation-delay:${i * 0.03}s"></span>`;
        })
        .join("")
    : "";

  const etiquetaGarantizada = resultado.fueGarantizada
    ? '<p class="gachareveal__garantizada">⭐ ¡Tu primera tirada te regala una Legendaria! ⭐</p>'
    : "";

  const cuerpo = resultado.eraDuplicado
    ? `<p>Salió <strong>${resultado.carta.nombre}</strong> — ya la tenías, se convirtió en 🪙 ${resultado.monedaGanada}${resultado.fragmentosGanados ? ` + 🧩 ${resultado.fragmentosGanados} fragmentos` : ""}.</p>`
    : `<p>¡Nueva carta! <strong>${resultado.carta.nombre}</strong> (${resultado.carta.rareza})</p>`;

  return `
    <div class="gachareveal ${esRarezaAlta ? "gachareveal--epico" : ""}">
      <div class="gachareveal__burst gachareveal__burst--${rareza}"></div>
      ${chispas}
      ${etiquetaGarantizada}
      <div class="gacha__resultado collectioncard--${rareza}">
        ${resultado.carta.imagen ? `<img class="gachareveal__img" src="${resultado.carta.imagen}" alt="${resultado.carta.nombre}" />` : ""}
        ${cuerpo}
      </div>
    </div>
  `;
}
