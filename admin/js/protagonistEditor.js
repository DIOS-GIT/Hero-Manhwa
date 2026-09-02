/**
 * PROTAGONISTEDITOR.JS
 * -----------------------------------------------------------------------
 * Análogo a cardEditor.js pero para protagonistas: son más simples (sin
 * rareza, sin stats, sin pasivas de posición) porque no son cartas de
 * combate — solo aportan una activa única. Todo por formulario, igual
 * que el resto del admin.
 * -----------------------------------------------------------------------
 */

let protagonistEditorState = {
  editandoId: null,
  borrador: null,
};

function renderProtagonistEditorView() {
  const container = document.getElementById("view-protagonistas");
  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <button class="btn" id="btn-nuevo-protagonista">+ Nuevo protagonista</button>
        <div class="cardlist">
          ${GameData.protagonistas
            .map((p) => `<div class="cardlist__item" data-id="${p.id}"><span class="cardlist__nombregrupo">${p.imagen ? `<img class="cardlist__thumb" src="${p.imagen}" alt="" />` : ""}${p.nombre}</span><span class="cardlist__clase">${p.arquetipo}</span></div>`)
            .join("") || '<p class="empty-hint">Todavía no hay protagonistas.</p>'}
        </div>
      </div>
      <div class="admin-layout__form">
        ${protagonistEditorState.borrador ? renderProtagonistForm(protagonistEditorState.borrador) : '<p class="empty-hint">Selecciona un protagonista o crea uno nuevo.</p>'}
      </div>
    </div>
  `;
  attachProtagonistEditorEvents();
}

function renderProtagonistForm(p) {
  const tipoEfectoOptions = ["dano_area", "curacion_equipo", "buff_equipo", "debuff_area"]
    .map((t) => `<option value="${t}" ${p.activaUnica.efecto.tipo === t ? "selected" : ""}>${t}</option>`)
    .join("");
  const statOptions = ["hp", "atk", "def", "velocidad"]
    .map((s) => `<option value="${s}" ${p.activaUnica.efecto.stat === s ? "selected" : ""}>${s}</option>`)
    .join("");

  return `
    <form id="form-protagonista" class="cardform">
      <label>Nombre
        <input type="text" name="nombre" value="${p.nombre}" required />
      </label>
      <label>Arquetipo (texto libre, ej: "Táctico", "Defensivo")
        <input type="text" name="arquetipo" value="${p.arquetipo}" />
      </label>
      <label>Descripción
        <input type="text" name="descripcion" value="${p.descripcion}" />
      </label>
      <label>Imagen del protagonista
        <input type="file" name="imagenArchivo" accept="image/*" />
      </label>
      <div class="image-preview" id="preview-imagen-protagonista">
        ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" /><button type="button" class="btn btn--icono btn--peligro" id="btn-quitar-imagen-protagonista">Quitar imagen</button>` : '<p class="empty-hint">Sin imagen todavía.</p>'}
      </div>

      <fieldset>
        <legend>Activa única (1 vez por combate)</legend>
        <label>Nombre de la activa
          <input type="text" name="activaNombre" value="${p.activaUnica.nombre}" />
        </label>
        <label>Descripción de la activa
          <input type="text" name="activaDescripcion" value="${p.activaUnica.descripcion}" />
        </label>
        <div class="cardform__fila">
          <label>Tipo de efecto
            <select name="efectoTipo">${tipoEfectoOptions}</select>
          </label>
          <label>Multiplicador (daño/curación)
            <input type="number" name="efectoMultiplicador" step="0.1" value="${p.activaUnica.efecto.multiplicador ?? 1}" />
          </label>
        </div>
        <div class="cardform__fila">
          <label>Stat afectado (buff/debuff)
            <select name="efectoStat">${statOptions}</select>
          </label>
          <label>Modificador (0.2 = 20%)
            <input type="number" name="efectoModificador" step="0.01" value="${p.activaUnica.efecto.modificador ?? 0.1}" />
          </label>
          <label>Duración (turnos, buff/debuff)
            <input type="number" name="efectoDuracion" min="1" value="${p.activaUnica.efecto.duracionTurnos ?? 3}" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Variantes de la activa (opcional)</legend>
        <p class="hint">Si agregás variantes, el jugador podrá elegir en la pantalla Protagonistas cuál usar en vez de la activa de arriba.</p>
        <div id="lista-variantes-protagonista">
          ${(p.variantes || []).map((v, i) => renderVariantRow(v, i)).join("")}
        </div>
        <button type="button" class="btn btn--secundario" id="btn-agregar-variante">+ Agregar variante</button>
      </fieldset>

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar protagonista</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-protagonista">Borrar</button>
        <button type="button" class="btn btn--secundario" id="btn-cancelar-protagonista">Cancelar</button>
      </div>
    </form>
  `;
}

function renderVariantRow(v, index) {
  const tipoOptions = ["dano_area", "curacion_equipo", "buff_equipo", "debuff_area"]
    .map((t) => `<option value="${t}" ${v.efecto.tipo === t ? "selected" : ""}>${t}</option>`)
    .join("");
  const statOptions = ["hp", "atk", "def", "velocidad"]
    .map((s) => `<option value="${s}" ${v.efecto.stat === s ? "selected" : ""}>${s}</option>`)
    .join("");

  return `
    <div class="repeatable-row repeatable-row--variante variantrow" data-index="${index}">
      <input type="text" data-field="nombre" placeholder="Nombre de la variante" value="${v.nombre || ""}" />
      <input type="text" data-field="descripcion" placeholder="Descripción" value="${v.descripcion || ""}" />
      <select data-field="tipo">${tipoOptions}</select>
      <input type="number" step="0.1" data-field="multiplicador" placeholder="Multiplicador" value="${v.efecto.multiplicador ?? 1}" />
      <select data-field="stat">${statOptions}</select>
      <input type="number" step="0.01" data-field="modificador" placeholder="Modificador" value="${v.efecto.modificador ?? 0.1}" />
      <input type="number" min="1" data-field="duracion" placeholder="Duración" value="${v.efecto.duracionTurnos ?? 3}" />
      <button type="button" class="btn btn--icono btn--quitar-variante">✕</button>
    </div>
  `;
}

function syncVariantesFromForm(form) {
  protagonistEditorState.borrador.variantes = [...form.querySelectorAll(".variantrow")].map((row) => {
    const campo = (name) => row.querySelector(`[data-field="${name}"]`).value;
    return {
      nombre: campo("nombre"),
      descripcion: campo("descripcion"),
      efecto: {
        tipo: campo("tipo"),
        multiplicador: Number(campo("multiplicador")) || 1,
        stat: campo("stat"),
        modificador: Number(campo("modificador")) || 0.1,
        duracionTurnos: Number(campo("duracion")) || 3,
      },
    };
  });
}

function attachProtagonistEditorEvents() {
  const container = document.getElementById("view-protagonistas");

  function saveProtagonistDraft() {
    const b = protagonistEditorState.borrador;
    const existente = GameData.protagonistas.findIndex((x) => x.id === b.id);
    if (existente >= 0) GameData.protagonistas[existente] = b;
    else GameData.protagonistas.push(b);
    saveGameData();
    protagonistEditorState.editandoId = b.id;
    renderProtagonistEditorView();
  }

  const btnNuevo = container.querySelector("#btn-nuevo-protagonista");
  if (btnNuevo) btnNuevo.addEventListener("click", () => {
    protagonistEditorState.editandoId = null;
    protagonistEditorState.borrador = createEmptyProtagonist();
    renderProtagonistEditorView();
  });

  container.querySelectorAll(".cardlist__item").forEach((item) => {
    item.addEventListener("click", () => {
      const p = GameData.protagonistas.find((x) => x.id === item.dataset.id);
      protagonistEditorState.editandoId = item.dataset.id;
      protagonistEditorState.borrador = structuredClone(p);
      renderProtagonistEditorView();
    });
  });

  const form = container.querySelector("#form-protagonista");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const b = protagonistEditorState.borrador;
    b.nombre = form.elements["nombre"].value;
    b.arquetipo = form.elements["arquetipo"].value;
    b.descripcion = form.elements["descripcion"].value;
    // b.imagen NO se toca aquí — la maneja el input de archivo (ver abajo)
    b.activaUnica = {
      nombre: form.elements["activaNombre"].value,
      descripcion: form.elements["activaDescripcion"].value,
      efecto: {
        tipo: form.elements["efectoTipo"].value,
        multiplicador: Number(form.elements["efectoMultiplicador"].value) || 1,
        stat: form.elements["efectoStat"].value,
        modificador: Number(form.elements["efectoModificador"].value) || 0.1,
        duracionTurnos: Number(form.elements["efectoDuracion"].value) || 3,
      },
    };
    b.variantes = [...form.querySelectorAll(".variantrow")].map((row) => {
      const campo = (name) => row.querySelector(`[data-field="${name}"]`).value;
      return {
        nombre: campo("nombre"),
        descripcion: campo("descripcion"),
        efecto: {
          tipo: campo("tipo"),
          multiplicador: Number(campo("multiplicador")) || 1,
          stat: campo("stat"),
          modificador: Number(campo("modificador")) || 0.1,
          duracionTurnos: Number(campo("duracion")) || 3,
        },
      };
    });
    saveProtagonistDraft();
  });

  const inputImagen = form.querySelector('input[name="imagenArchivo"]');
  if (inputImagen) inputImagen.addEventListener("change", async () => {
    const file = inputImagen.files[0];
    if (!file) return;
    try {
      protagonistEditorState.borrador.imagen = await uploadCardImage(file);
      saveProtagonistDraft();
    } catch (err) {
      alert(err.message);
    }
  });

  const btnQuitarImagen = form.querySelector("#btn-quitar-imagen-protagonista");
  if (btnQuitarImagen) btnQuitarImagen.addEventListener("click", () => {
    protagonistEditorState.borrador.imagen = "";
    saveProtagonistDraft();
  });

  const btnAgregarVariante = form.querySelector("#btn-agregar-variante");
  if (btnAgregarVariante) btnAgregarVariante.addEventListener("click", () => {
    syncVariantesFromForm(form);
    protagonistEditorState.borrador.variantes.push({
      nombre: "Variante nueva",
      descripcion: "",
      efecto: { tipo: "dano_area", multiplicador: 1.0, stat: "atk", modificador: 0.1, duracionTurnos: 3 },
    });
    renderProtagonistEditorView();
  });

  form.querySelectorAll(".btn--quitar-variante").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncVariantesFromForm(form);
      const index = Number(btn.closest(".variantrow").dataset.index);
      protagonistEditorState.borrador.variantes.splice(index, 1);
      renderProtagonistEditorView();
    });
  });

  const btnBorrar = container.querySelector("#btn-borrar-protagonista");
  if (btnBorrar) btnBorrar.addEventListener("click", () => {
    if (!protagonistEditorState.editandoId) return;
    if (!confirm(`¿Borrar "${protagonistEditorState.borrador.nombre}"?`)) return;
    GameData.protagonistas = GameData.protagonistas.filter((x) => x.id !== protagonistEditorState.editandoId);
    saveGameData();
    protagonistEditorState.editandoId = null;
    protagonistEditorState.borrador = null;
    renderProtagonistEditorView();
  });

  const btnCancelar = container.querySelector("#btn-cancelar-protagonista");
  if (btnCancelar) btnCancelar.addEventListener("click", () => {
    protagonistEditorState.editandoId = null;
    protagonistEditorState.borrador = null;
    renderProtagonistEditorView();
  });
}
