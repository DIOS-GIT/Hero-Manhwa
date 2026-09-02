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

function renderGachaHomeView() {
  const container = document.getElementById("view-tienda");
  const costo = ECONOMY_CONFIG.gacha.costoPorTirada;
  const tirando = gachaFaseRevelacion === "boca_abajo";

  container.innerHTML = `
    ${renderScreenHeader("Tienda", "hub")}
    <div class="gacha">
      <p class="gacha__moneda">🪙 ${PlayerData.moneda}</p>
      <p>Cada tirada cuesta 🪙 ${costo}. Probabilidades: Común ${ECONOMY_CONFIG.gacha.probabilidadPorRareza.comun * 100}% ·
        Rara ${ECONOMY_CONFIG.gacha.probabilidadPorRareza.rara * 100}% ·
        Épica ${ECONOMY_CONFIG.gacha.probabilidadPorRareza.epica * 100}% ·
        Legendaria ${ECONOMY_CONFIG.gacha.probabilidadPorRareza.legendaria * 100}% ·
        Mítica ${ECONOMY_CONFIG.gacha.probabilidadPorRareza.mitica * 100}%
      </p>
      <button class="btn btn--titulo" id="btn-tirar-gacha" ${PlayerData.moneda < costo || tirando ? "disabled" : ""}>Tirar (🪙 ${costo})</button>

      <div class="gachareveal-stage">
        ${renderGachaStage()}
      </div>
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
