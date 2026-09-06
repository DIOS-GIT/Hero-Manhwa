/**
 * CHESTSUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Cofres" del hub: lista los cofres sin abrir del jugador
 * (PlayerData.cofres) agrupados por rareza, y anima la apertura de uno
 * con el mismo patrón de fases que ya usa el gacha (ver gachaHomeUI.js):
 * null -> "temblando" -> "revelado". Así ambos sistemas se sienten
 * coherentes en vez de tener dos mecánicas de reveal distintas.
 * -----------------------------------------------------------------------
 */

let chestFaseApertura = null; // null | "temblando" | "revelado"
let ultimoResultadoCofre = null;
let _chestOpenTimer = null;
const CHEST_OPEN_DELAY_MS = 750;

function renderChestsView() {
  const container = document.getElementById("view-cofres");
  const cofres = PlayerData.cofres || [];
  const abriendo = chestFaseApertura !== null;

  const conteoPorRareza = {};
  cofres.forEach((r) => { conteoPorRareza[r] = (conteoPorRareza[r] || 0) + 1; });

  container.innerHTML = `
    ${renderScreenHeader("Cofres", "hub")}
    <div class="chestsview">
      ${
        abriendo
          ? `<div class="chestsview-stage">${renderChestStage()}</div>`
          : cofres.length === 0
          ? '<p class="empty-hint">Todavía no tienes cofres. Ganas alguno derrotando élites y jefes durante una aventura, o en ciertos eventos.</p>'
          : `<div class="chestlist">
              ${RAREZAS.filter((r) => conteoPorRareza[r] > 0)
                .map(
                  (r) => `
                <div class="chestcard chestcard--${r}">
                  <div class="chestcard__icono">🎁</div>
                  <div class="chestcard__info">
                    <strong>Cofre ${r}</strong>
                    <span>x${conteoPorRareza[r]}</span>
                  </div>
                  <button type="button" class="btn btn--abrir-cofre" data-rareza="${r}">Abrir</button>
                </div>
              `
                )
                .join("")}
            </div>`
      }
    </div>
  `;

  attachScreenHeaderEvents(container);

  container.querySelectorAll(".btn--abrir-cofre").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rareza = btn.dataset.rareza;
      const index = PlayerData.cofres.indexOf(rareza);
      if (index === -1) return;
      removeChestAt(index);

      chestFaseApertura = "temblando";
      renderChestsView();

      clearTimeout(_chestOpenTimer);
      _chestOpenTimer = setTimeout(() => {
        ultimoResultadoCofre = openChest(rareza);
        ultimoResultadoCofre.rarezaCofre = rareza;
        chestFaseApertura = "revelado";
        renderChestsView();
      }, CHEST_OPEN_DELAY_MS);
    });
  });

  const btnContinuar = container.querySelector("#btn-cerrar-reveal-cofre");
  if (btnContinuar) btnContinuar.addEventListener("click", () => {
    chestFaseApertura = null;
    ultimoResultadoCofre = null;
    renderChestsView();
  });
}

function renderChestStage() {
  if (chestFaseApertura === "temblando") {
    return `<div class="chestbox chestbox--temblando">🎁</div>`;
  }
  return renderChestResult(ultimoResultadoCofre);
}

function renderChestResult(resultado) {
  if (!resultado.ok) {
    return `
      <p class="hint">${resultado.motivo}</p>
      <button type="button" class="btn" id="btn-cerrar-reveal-cofre">Volver</button>
    `;
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

  const cuerpo = resultado.eraDuplicado
    ? `<p>Salió <strong>${resultado.carta.nombre}</strong> — ya la tenías, se convirtió en 🪙 ${resultado.monedaGanada}${resultado.fragmentosGanados ? ` + 🧩 ${resultado.fragmentosGanados} fragmentos` : ""}.</p>`
    : `<p>¡Nueva carta! <strong>${resultado.carta.nombre}</strong> (${resultado.carta.rareza})</p>`;

  return `
    <div class="gachareveal ${esRarezaAlta ? "gachareveal--epico" : ""}">
      <div class="gachareveal__burst gachareveal__burst--${rareza}"></div>
      ${chispas}
      <p class="hint">Cofre ${resultado.rarezaCofre} abierto</p>
      <div class="gacha__resultado collectioncard--${rareza}">
        ${resultado.carta.imagen ? `<img class="gachareveal__img" src="${resultado.carta.imagen}" alt="${resultado.carta.nombre}" />` : ""}
        ${cuerpo}
      </div>
      <button type="button" class="btn" id="btn-cerrar-reveal-cofre">Continuar</button>
    </div>
  `;
}
