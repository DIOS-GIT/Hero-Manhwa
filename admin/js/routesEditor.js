/**
 * ROUTESEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar GameData.rutas (antes RUN_CONFIG fijo). Esto
 * es lo que hace que las runs no sean siempre iguales: cuántos pisos
 * tiene el mapa, qué tan probable es cada tipo de nodo, y qué tan
 * duros/recompensados son los combates normales/élite/jefe.
 * -----------------------------------------------------------------------
 */

const TIPOS_NODO_COMBATE = ["combate", "elite", "jefe"];
const TIPOS_NODO_CON_PESO = ["combate", "elite", "evento", "tienda", "descanso"];
const TIPOS_NODO_ARRASTRABLES = ["combate", "elite", "evento", "tienda", "descanso"]; // el jefe se agrega solo, no se arrastra

let _nextPlantillaId = 1;
let plantillaEditorState = { plantillaId: null, pisoFocoIndex: 0 };

function renderRoutesEditorView() {
  const container = document.getElementById("view-rutas");
  const r = GameData.rutas;

  container.innerHTML = `
    <form id="form-rutas" class="rulesform">
      <fieldset>
        <legend>Estructura del mapa (generación aleatoria)</legend>
        <label>Pisos antes del jefe
          <input type="number" name="pisosAntesDelJefe" value="${r.pisosAntesDelJefe}" min="1" />
        </label>
        <label>Nodos por piso — mínimo
          <input type="number" name="nodosPorPiso.min" value="${r.nodosPorPiso.min}" min="1" />
        </label>
        <label>Nodos por piso — máximo
          <input type="number" name="nodosPorPiso.max" value="${r.nodosPorPiso.max}" min="1" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Probabilidad de cada tipo de nodo (peso relativo)</legend>
        ${TIPOS_NODO_CON_PESO.map(
          (tipo) => `
          <label>${getNodeType(tipo).icono} ${getNodeType(tipo).label}
            <input type="number" name="pesosPorTipo.${tipo}" value="${r.pesosPorTipo[tipo]}" min="0" />
          </label>
        `
        ).join("")}
        <p class="hint">Esta sección se usa solo cuando "Usar plantillas de mapa" (más abajo) está apagado, o no hay ninguna plantilla cargada.</p>
      </fieldset>

      ${TIPOS_NODO_COMBATE.map((tipo) => renderCombatTypeFieldset(tipo, r)).join("")}

      <div class="rulesform__acciones">
        <button type="submit" class="btn">Guardar rutas</button>
        <button type="button" class="btn btn--secundario" id="btn-restaurar-rutas">Restaurar valores por defecto</button>
      </div>
    </form>

    ${renderTemplatesSection(r)}
  `;

  document.getElementById("form-rutas").addEventListener("submit", (e) => {
    e.preventDefault();
    saveRoutesFromForm(e.target);
  });

  document.getElementById("btn-restaurar-rutas").addEventListener("click", () => {
    if (!confirm("¿Restaurar todos los parámetros de rutas a los valores de fábrica? Esto también borra tus plantillas de mapa.")) return;
    resetRoutesToDefault();
    plantillaEditorState = { plantillaId: null, pisoFocoIndex: 0 };
    renderRoutesEditorView();
  });

  attachTemplateEditorEvents();
}

function renderCombatTypeFieldset(tipo, r) {
  const tamano = r.tamanoEquipoEnemigo[tipo] || { min: 2, max: 3 };
  const recompensa = r.recompensaMonedaPorTipo[tipo] || { min: 10, max: 20 };
  const rarezasActuales = r.rarezaMaximaPorTipo[tipo] || [];
  const label = getNodeType(tipo === "jefe" ? "jefe" : tipo).label;

  const checkboxesRareza = RAREZAS.map(
    (rareza) => `
      <label class="checkbox-label">
        <input type="checkbox" name="rareza.${tipo}.${rareza}" ${rarezasActuales.includes(rareza) ? "checked" : ""} />
        ${rareza}
      </label>
    `
  ).join("");

  return `
    <fieldset>
      <legend>${getNodeType(tipo).icono} ${label}</legend>
      <label>Tamaño de equipo enemigo — mínimo
        <input type="number" name="tamano.${tipo}.min" value="${tamano.min}" min="1" max="4" />
      </label>
      <label>Tamaño de equipo enemigo — máximo
        <input type="number" name="tamano.${tipo}.max" value="${tamano.max}" min="1" max="4" />
      </label>
      <label>Recompensa de moneda — mínimo
        <input type="number" name="recompensa.${tipo}.min" value="${recompensa.min}" min="0" />
      </label>
      <label>Recompensa de moneda — máximo
        <input type="number" name="recompensa.${tipo}.max" value="${recompensa.max}" min="0" />
      </label>
      <div class="routesform__rarezas">
        <span class="mini-label">Rarezas permitidas para los enemigos</span>
        ${checkboxesRareza}
      </div>
    </fieldset>
  `;
}

function saveRoutesFromForm(form) {
  const r = GameData.rutas;
  const getNum = (path) => Number(form.elements[path].value);

  r.pisosAntesDelJefe = getNum("pisosAntesDelJefe");
  r.nodosPorPiso.min = getNum("nodosPorPiso.min");
  r.nodosPorPiso.max = getNum("nodosPorPiso.max");

  TIPOS_NODO_CON_PESO.forEach((tipo) => {
    r.pesosPorTipo[tipo] = getNum(`pesosPorTipo.${tipo}`);
  });

  TIPOS_NODO_COMBATE.forEach((tipo) => {
    if (!r.tamanoEquipoEnemigo[tipo]) r.tamanoEquipoEnemigo[tipo] = { min: 1, max: 1 };
    if (!r.recompensaMonedaPorTipo[tipo]) r.recompensaMonedaPorTipo[tipo] = { min: 0, max: 0 };

    r.tamanoEquipoEnemigo[tipo].min = getNum(`tamano.${tipo}.min`);
    r.tamanoEquipoEnemigo[tipo].max = getNum(`tamano.${tipo}.max`);
    r.recompensaMonedaPorTipo[tipo].min = getNum(`recompensa.${tipo}.min`);
    r.recompensaMonedaPorTipo[tipo].max = getNum(`recompensa.${tipo}.max`);

    r.rarezaMaximaPorTipo[tipo] = RAREZAS.filter((rareza) => form.elements[`rareza.${tipo}.${rareza}`].checked);
  });

  saveGameData();
  alert("Rutas guardadas.");
}

/* =======================================================================
   PLANTILLAS DE MAPA — arrastrar y soltar (con alternativa por toque,
   para mobile): tocás un tipo de nodo de la paleta y cae en el piso que
   esté "enfocado" (el último que tocaste), o lo arrastrás directo con
   el mouse a un piso concreto. Cada acción se guarda al toque, no hace
   falta un botón de "Guardar plantilla" aparte.
   ======================================================================= */

function renderTemplatesSection(r) {
  const plantilla = r.plantillas.find((p) => p.id === plantillaEditorState.plantillaId) || null;

  return `
    <div class="templatesection">
      <h3>Plantillas de mapa (arrastrar y soltar)</h3>
      <p class="hint">Diseñá a mano la secuencia exacta de pisos de una ruta. Si activás la casilla de abajo y tenés al menos una plantilla, cada run nueva elige una al azar y usa EXACTO esos pisos — el 👑 Jefe se agrega solo, al final. Si no, se sigue usando la generación aleatoria de arriba.</p>

      <label class="checkbox-label">
        <input type="checkbox" id="input-usar-plantillas" ${r.usarPlantillas ? "checked" : ""} />
        Usar plantillas de mapa en vez de generación aleatoria
      </label>

      <div class="templatesection__layout">
        <div class="templatesection__lista">
          <button type="button" class="btn btn--secundario" id="btn-nueva-plantilla">+ Nueva plantilla</button>
          <div class="cardlist">
            ${
              r.plantillas
                .map(
                  (p) => `
              <div class="cardlist__item ${plantillaEditorState.plantillaId === p.id ? "cardlist__item--activo" : ""}" data-plantilla-id="${p.id}">
                <strong>${p.nombre}</strong> <span class="hint">${p.pisos.length} piso(s)</span>
              </div>
            `
                )
                .join("") || '<p class="empty-hint">Todavía no hay plantillas.</p>'
            }
          </div>
        </div>

        <div class="templatesection__builder">
          ${plantilla ? renderTemplateBuilder(plantilla) : '<p class="empty-hint">Elegí una plantilla de la lista o creá una nueva.</p>'}
        </div>
      </div>
    </div>
  `;
}

function renderTemplateBuilder(plantilla) {
  return `
    <label class="mini-label">Nombre de la plantilla
      <input type="text" id="input-nombre-plantilla" value="${plantilla.nombre}" />
    </label>

    <div class="templatepaleta">
      <span class="mini-label">Arrastrá (o tocá) un tipo de nodo hacia el piso que quieras — el piso con el borde dorado es el que está enfocado:</span>
      <div class="templatepaleta__chips">
        ${TIPOS_NODO_ARRASTRABLES.map(
          (tipo) => `
          <div class="templatechip" draggable="true" data-tipo-paleta="${tipo}" style="--chip-color:${getNodeType(tipo).color}">
            ${getNodeType(tipo).icono} ${getNodeType(tipo).label}
          </div>
        `
        ).join("")}
      </div>
    </div>

    <div class="templatepisos">
      ${plantilla.pisos.map((piso, i) => renderTemplateFloorRow(piso, i, plantilla)).join("")}
    </div>
    <button type="button" class="btn btn--secundario" id="btn-agregar-piso">+ Agregar piso</button>
    <div class="templatepisos__jefe">👑 Jefe (se agrega solo, al final)</div>

    <div class="rulesform__acciones">
      <button type="button" class="btn btn--peligro" id="btn-borrar-plantilla">Borrar esta plantilla</button>
    </div>
  `;
}

function renderTemplateFloorRow(piso, index, plantilla) {
  const enFoco = plantillaEditorState.pisoFocoIndex === index;
  return `
    <div class="templatefloor ${enFoco ? "templatefloor--foco" : ""}" data-piso-index="${index}">
      <div class="templatefloor__header">
        <span>Piso ${index + 1}${index === 0 ? " (primero)" : ""}</span>
        <div class="templatefloor__botones">
          <button type="button" class="btn btn--icono" data-piso-subir="${index}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="btn btn--icono" data-piso-bajar="${index}" ${index === plantilla.pisos.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="btn btn--icono btn--peligro" data-piso-quitar="${index}">🗑</button>
        </div>
      </div>
      <div class="templatefloor__dropzone" data-piso-dropzone="${index}">
        ${
          piso.length === 0
            ? '<span class="templatefloor__vacio">Vacío — tocá un tipo de nodo de arriba</span>'
            : piso
                .map(
                  (tipo, ni) => `
              <span class="templatechip templatechip--puesto" style="--chip-color:${getNodeType(tipo).color}">
                ${getNodeType(tipo).icono} ${getNodeType(tipo).label}
                <button type="button" class="templatechip__quitar" data-piso-index="${index}" data-nodo-index="${ni}">✕</button>
              </span>
            `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

function attachTemplateEditorEvents() {
  const container = document.getElementById("view-rutas");
  const r = GameData.rutas;

  const inputUsarPlantillas = container.querySelector("#input-usar-plantillas");
  if (inputUsarPlantillas) inputUsarPlantillas.addEventListener("change", () => {
    r.usarPlantillas = inputUsarPlantillas.checked;
    saveGameData();
  });

  const btnNuevaPlantilla = container.querySelector("#btn-nueva-plantilla");
  if (btnNuevaPlantilla) btnNuevaPlantilla.addEventListener("click", () => {
    const nueva = { id: "plantilla_" + _nextPlantillaId++, nombre: "Nueva plantilla", pisos: [["combate"]] };
    r.plantillas.push(nueva);
    saveGameData();
    plantillaEditorState = { plantillaId: nueva.id, pisoFocoIndex: 0 };
    renderRoutesEditorView();
  });

  container.querySelectorAll("[data-plantilla-id]").forEach((el) => {
    el.addEventListener("click", () => {
      plantillaEditorState = { plantillaId: el.dataset.plantillaId, pisoFocoIndex: 0 };
      renderRoutesEditorView();
    });
  });

  const plantilla = r.plantillas.find((p) => p.id === plantillaEditorState.plantillaId);
  if (!plantilla) return; // no hay ninguna plantilla abierta, nada más que enganchar

  const inputNombre = container.querySelector("#input-nombre-plantilla");
  if (inputNombre) inputNombre.addEventListener("change", () => {
    plantilla.nombre = inputNombre.value.trim() || "Plantilla sin nombre";
    saveGameData();
    renderRoutesEditorView();
  });

  const btnBorrarPlantilla = container.querySelector("#btn-borrar-plantilla");
  if (btnBorrarPlantilla) btnBorrarPlantilla.addEventListener("click", () => {
    if (!confirm(`¿Borrar la plantilla "${plantilla.nombre}"?`)) return;
    r.plantillas = r.plantillas.filter((p) => p.id !== plantilla.id);
    saveGameData();
    plantillaEditorState = { plantillaId: null, pisoFocoIndex: 0 };
    renderRoutesEditorView();
  });

  const btnAgregarPiso = container.querySelector("#btn-agregar-piso");
  if (btnAgregarPiso) btnAgregarPiso.addEventListener("click", () => {
    plantilla.pisos.push([]);
    plantillaEditorState.pisoFocoIndex = plantilla.pisos.length - 1;
    saveGameData();
    renderRoutesEditorView();
  });

  // Tocar el cuerpo de un piso (sin tocar sus botones) lo pone en foco,
  // para saber a cuál cae el próximo nodo que se toque de la paleta.
  container.querySelectorAll(".templatefloor").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      plantillaEditorState.pisoFocoIndex = Number(el.dataset.pisoIndex);
      renderRoutesEditorView();
    });
  });

  container.querySelectorAll("[data-piso-subir]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.pisoSubir);
      [plantilla.pisos[i - 1], plantilla.pisos[i]] = [plantilla.pisos[i], plantilla.pisos[i - 1]];
      plantillaEditorState.pisoFocoIndex = i - 1;
      saveGameData();
      renderRoutesEditorView();
    });
  });

  container.querySelectorAll("[data-piso-bajar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.pisoBajar);
      [plantilla.pisos[i], plantilla.pisos[i + 1]] = [plantilla.pisos[i + 1], plantilla.pisos[i]];
      plantillaEditorState.pisoFocoIndex = i + 1;
      saveGameData();
      renderRoutesEditorView();
    });
  });

  container.querySelectorAll("[data-piso-quitar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.pisoQuitar);
      plantilla.pisos.splice(i, 1);
      if (plantillaEditorState.pisoFocoIndex >= plantilla.pisos.length) {
        plantillaEditorState.pisoFocoIndex = Math.max(0, plantilla.pisos.length - 1);
      }
      saveGameData();
      renderRoutesEditorView();
    });
  });

  container.querySelectorAll(".templatechip__quitar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pisoIndex = Number(btn.dataset.pisoIndex);
      const nodoIndex = Number(btn.dataset.nodoIndex);
      plantilla.pisos[pisoIndex].splice(nodoIndex, 1);
      saveGameData();
      renderRoutesEditorView();
    });
  });

  // Paleta: click/toque agrega al piso enfocado; arrastrar y soltar
  // agrega directo al piso donde se suelta (sin depender del foco).
  container.querySelectorAll("[data-tipo-paleta]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const tipo = chip.dataset.tipoPaleta;
      if (!plantilla.pisos[plantillaEditorState.pisoFocoIndex]) return;
      plantilla.pisos[plantillaEditorState.pisoFocoIndex].push(tipo);
      saveGameData();
      renderRoutesEditorView();
    });
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", chip.dataset.tipoPaleta);
    });
  });

  container.querySelectorAll("[data-piso-dropzone]").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      const tipo = e.dataTransfer.getData("text/plain");
      const index = Number(zone.dataset.pisoDropzone);
      if (!tipo || !plantilla.pisos[index]) return;
      plantilla.pisos[index].push(tipo);
      plantillaEditorState.pisoFocoIndex = index;
      saveGameData();
      renderRoutesEditorView();
    });
  });
}
