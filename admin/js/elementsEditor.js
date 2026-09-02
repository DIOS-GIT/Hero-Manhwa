/**
 * ELEMENTSEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar GameData.elementos (antes ELEMENTS_LIST /
 * ADVANTAGE_MAP fijos). Deja: agregar/quitar elementos, elegir contra
 * cuál es fuerte cada uno (arma la rueda de ventajas), y ajustar los
 * multiplicadores de daño por ventaja/desventaja.
 * -----------------------------------------------------------------------
 */

let _nextElementId = 1;

function renderElementsEditorView() {
  const container = document.getElementById("view-elementos");
  const cfg = GameData.elementos;

  container.innerHTML = `
    <form id="form-elementos" class="rulesform">
      <fieldset>
        <legend>Multiplicadores de daño elemental</legend>
        <label>Multiplicador con VENTAJA (ej. 1.5 = +50% de daño)
          <input type="number" step="0.01" name="multVentaja" value="${cfg.multiplicadores.ventaja}" min="0" />
        </label>
        <label>Multiplicador con DESVENTAJA (ej. 0.66 = -34% de daño)
          <input type="number" step="0.01" name="multDesventaja" value="${cfg.multiplicadores.desventaja}" min="0" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Elementos y rueda de ventajas</legend>
        <p class="hint">Para cada elemento, elegí contra cuál es fuerte. El motor deduce solo que, si Fuego es fuerte contra Tierra, entonces Tierra es débil contra Fuego.</p>
        <div id="lista-elementos">${cfg.lista.map((el) => renderElementRow(el, cfg)).join("")}</div>
        <button type="button" class="btn btn--secundario" id="btn-agregar-elemento">+ Agregar elemento</button>
      </fieldset>

      <div class="rulesform__acciones">
        <button type="submit" class="btn">Guardar elementos</button>
        <button type="button" class="btn btn--secundario" id="btn-restaurar-elementos">Restaurar valores por defecto</button>
      </div>
    </form>
  `;

  document.getElementById("form-elementos").addEventListener("submit", (e) => {
    e.preventDefault();
    saveElementsFromForm(e.target);
  });

  document.getElementById("btn-agregar-elemento").addEventListener("click", () => {
    const label = prompt("Nombre del elemento nuevo (ej. \"Veneno\"):");
    if (!label || !label.trim()) return;
    cfg.lista.push({ id: "elemento_" + _nextElementId++, label: label.trim(), color: "#9aa3ad" });
    saveGameData();
    renderElementsEditorView();
  });

  document.getElementById("btn-restaurar-elementos").addEventListener("click", () => {
    if (!confirm("¿Restaurar la rueda de elementos a los valores de fábrica? Las cartas que usen elementos agregados por vos quedarán con un elemento que ya no existe.")) return;
    resetElementsToDefault();
    renderElementsEditorView();
  });

  container.querySelectorAll("[data-borrar-elemento]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("¿Borrar este elemento? Las cartas que lo tengan asignado quedarán sin ventajas/desventajas hasta que les cambies el elemento.")) return;
      const id = btn.dataset.borrarElemento;
      cfg.lista = cfg.lista.filter((e) => e.id !== id);
      delete cfg.ventajas[id];
      Object.keys(cfg.ventajas).forEach((k) => {
        if (cfg.ventajas[k] === id) cfg.ventajas[k] = null;
      });
      saveGameData();
      renderElementsEditorView();
    });
  });
}

function renderElementRow(el, cfg) {
  const otros = cfg.lista.filter((e) => e.id !== el.id);
  const fuerteContra = cfg.ventajas[el.id] || "";

  return `
    <div class="elementrow" data-elemento-id="${el.id}">
      <input type="color" name="color.${el.id}" value="${el.color}" title="Color" />
      <input type="text" name="label.${el.id}" value="${el.label}" placeholder="Nombre" />
      <label class="elementrow__fuerte">
        Fuerte contra:
        <select name="fuerte.${el.id}">
          <option value="">Ninguno</option>
          ${otros.map((o) => `<option value="${o.id}" ${fuerteContra === o.id ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
      <button type="button" class="btn btn--peligro btn--icono" data-borrar-elemento="${el.id}">Borrar</button>
    </div>
  `;
}

function saveElementsFromForm(form) {
  const cfg = GameData.elementos;
  cfg.multiplicadores.ventaja = Number(form.elements["multVentaja"].value);
  cfg.multiplicadores.desventaja = Number(form.elements["multDesventaja"].value);

  cfg.lista.forEach((el) => {
    el.label = form.elements[`label.${el.id}`].value.trim() || el.label;
    el.color = form.elements[`color.${el.id}`].value;
    const fuerte = form.elements[`fuerte.${el.id}`].value;
    cfg.ventajas[el.id] = fuerte || null;
  });

  saveGameData();
  alert("Elementos guardados.");
}
