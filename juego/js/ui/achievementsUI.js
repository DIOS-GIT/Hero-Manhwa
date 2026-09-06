/**
 * ACHIEVEMENTSUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Logros" del hub: lista ACHIEVEMENTS_POOL agrupado por
 * categoría, con barra de progreso y botón de reclamar cuando ya se
 * cumplió y todavía no se reclamó.
 * -----------------------------------------------------------------------
 */

const LABELS_CATEGORIA_LOGRO = {
  combate: "Combate",
  coleccion: "Colección",
  progreso: "Progreso de run",
  gacha: "Gacha",
};

function renderAchievementsView() {
  const container = document.getElementById("view-logros");

  const porCategoria = {};
  ACHIEVEMENTS_POOL.forEach((l) => {
    if (!porCategoria[l.categoria]) porCategoria[l.categoria] = [];
    porCategoria[l.categoria].push(l);
  });

  container.innerHTML = `
    ${renderScreenHeader("Logros", "hub")}
    <div class="achievements">
      ${Object.keys(porCategoria)
        .map(
          (cat) => `
        <div class="achievements__grupo">
          <h3>${LABELS_CATEGORIA_LOGRO[cat] || cat}</h3>
          ${porCategoria[cat].map((l) => renderAchievementRow(l)).join("")}
        </div>
      `
        )
        .join("")}
    </div>
  `;

  attachScreenHeaderEvents(container);

  container.querySelectorAll(".btn--reclamar-logro").forEach((btn) => {
    btn.addEventListener("click", () => {
      const resultado = claimAchievement(btn.dataset.id);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      const premio = resultado.logro.recompensa;
      alert(`¡Logro reclamado! +${premio.moneda} moneda${premio.cofre ? ` + un cofre ${premio.cofre}` : ""}.`);
      renderAchievementsView();
    });
  });
}

function renderAchievementRow(logro) {
  const progreso = getAchievementProgress(logro);
  const completado = isAchievementComplete(logro);
  const reclamado = isAchievementClaimed(logro);
  const pct = Math.min(100, Math.round((progreso / logro.meta) * 100));

  return `
    <div class="achievement ${reclamado ? "achievement--reclamado" : completado ? "achievement--completo" : ""}">
      <div class="achievement__texto">
        <strong>${logro.titulo}</strong>
        <p>${logro.descripcion}</p>
        <div class="achievement__barra"><div class="achievement__barra-fill" style="width:${pct}%"></div></div>
        <span class="achievement__progreso">${Math.min(progreso, logro.meta)} / ${logro.meta}</span>
      </div>
      <div class="achievement__recompensa">
        <span>🪙 ${logro.recompensa.moneda}</span>
        ${logro.recompensa.cofre ? `<span>🎁 ${logro.recompensa.cofre}</span>` : ""}
        ${
          reclamado
            ? '<span class="achievement__estado">Reclamado</span>'
            : completado
            ? `<button type="button" class="btn btn--reclamar-logro" data-id="${logro.id}">Reclamar</button>`
            : ""
        }
      </div>
    </div>
  `;
}
