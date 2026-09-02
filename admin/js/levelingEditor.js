/**
 * LEVELINGEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar GameData.niveles (antes LEVELING_CONFIG_DEFAULT
 * fijo). Define, por rareza: nivel máximo, % de stat que sube por nivel,
 * y la curva de XP necesaria. También la XP que da cada victoria.
 * -----------------------------------------------------------------------
 */

function renderLevelingEditorView() {
  const container = document.getElementById("view-niveles");
  const n = GameData.niveles;

  container.innerHTML = `
    <form id="form-niveles" class="rulesform">
      <fieldset>
        <legend>General</legend>
        <label>XP que da CADA carta jugada al ganar un combate
          <input type="number" name="xpPorVictoria" value="${n.xpPorVictoria}" min="0" />
        </label>
      </fieldset>

      ${RAREZAS.map((rareza) => renderRarezaFieldset(rareza, n)).join("")}

      <div class="rulesform__acciones">
        <button type="submit" class="btn">Guardar niveles</button>
        <button type="button" class="btn btn--secundario" id="btn-restaurar-niveles">Restaurar valores por defecto</button>
      </div>
    </form>
  `;

  document.getElementById("form-niveles").addEventListener("submit", (e) => {
    e.preventDefault();
    saveLevelingFromForm(e.target);
  });

  document.getElementById("btn-restaurar-niveles").addEventListener("click", () => {
    if (!confirm("¿Restaurar todos los parámetros de niveles a los valores de fábrica?")) return;
    resetLevelingToDefault();
    renderLevelingEditorView();
  });
}

function renderRarezaFieldset(rareza, n) {
  const cfg = n.porRareza[rareza] || { nivelMax: 1, statPorNivel: 0, xpBase: 10, xpCrecimiento: 1.05 };
  const totalPct = Math.round(cfg.statPorNivel * (cfg.nivelMax - 1) * 1000) / 10; // % acumulado al llegar al tope

  const colorVar = rareza === "mitica" ? "--rareza-mitica-1" : `--rareza-${rareza}`;
  return `
    <fieldset>
      <legend style="color:var(${colorVar})">${rareza}</legend>
      <label>Nivel máximo
        <input type="number" name="${rareza}.nivelMax" value="${cfg.nivelMax}" min="1" />
      </label>
      <label>% de stat por nivel (ej. 1.2 = +1.2% por nivel)
        <input type="number" step="0.1" name="${rareza}.statPorNivel" value="${(cfg.statPorNivel * 100).toFixed(2)}" min="0" />
      </label>
      <label>XP para pasar del nivel 1 al 2
        <input type="number" name="${rareza}.xpBase" value="${cfg.xpBase}" min="1" />
      </label>
      <label>Crecimiento de XP por nivel (ej. 1.05 = +5% de costo cada nivel)
        <input type="number" step="0.01" name="${rareza}.xpCrecimiento" value="${cfg.xpCrecimiento}" min="1" />
      </label>
      <p class="hint">Al nivel máximo (${cfg.nivelMax}), una carta de esta rareza tendrá +${totalPct}% en todas sus stats respecto a nivel 1.</p>
    </fieldset>
  `;
}

function saveLevelingFromForm(form) {
  const n = GameData.niveles;
  n.xpPorVictoria = Number(form.elements["xpPorVictoria"].value);

  RAREZAS.forEach((rareza) => {
    if (!n.porRareza[rareza]) n.porRareza[rareza] = {};
    n.porRareza[rareza].nivelMax = Math.max(1, Number(form.elements[`${rareza}.nivelMax`].value));
    n.porRareza[rareza].statPorNivel = Number(form.elements[`${rareza}.statPorNivel`].value) / 100;
    n.porRareza[rareza].xpBase = Math.max(1, Number(form.elements[`${rareza}.xpBase`].value));
    n.porRareza[rareza].xpCrecimiento = Math.max(1, Number(form.elements[`${rareza}.xpCrecimiento`].value));
  });

  saveGameData();
  alert("Niveles guardados.");
}
