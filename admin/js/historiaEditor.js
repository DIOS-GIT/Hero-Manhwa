/**
 * HISTORIAEDITOR.JS
 * -----------------------------------------------------------------------
 * Pantalla de admin para escribir la historia principal: capítulos que
 * contienen escenas (texto + fondo/personaje opcionales + opciones con
 * consecuencia). Todo por formulario, nunca JSON a mano. Las escenas se
 * reproducen EN ORDEN dentro del juego, en los nodos 🎁 Evento del mapa
 * (ver engine/storyEngine.js) — acá solo se escribe el contenido.
 *
 * Las consecuencias de cada opción usan la MISMA forma que los eventos
 * aleatorios de data/eventsPool.js, así que se resuelven con la misma
 * función (resolveEventConsequence) sin duplicar lógica de juego.
 * -----------------------------------------------------------------------
 */

let _nextCapituloId = 1;
let _nextEscenaId = 1;

let historiaEditorState = {
  capituloId: null, // capítulo actualmente abierto en la lista
  escenaId: null, // escena actualmente en el formulario
  borrador: null, // copia de trabajo de la escena
};

function createEmptyScene() {
  return {
    id: "escena_" + _nextEscenaId++,
    texto: "",
    imagenFondo: "",
    imagenPersonaje: "",
    opciones: [{ texto: "Continuar", consecuencia: { tipo: "nada" } }],
  };
}

function renderHistoriaEditorView() {
  const container = document.getElementById("view-historia");
  const capitulos = GameData.historia.capitulos;
  const capitulo = capitulos.find((c) => c.id === historiaEditorState.capituloId) || null;

  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <button class="btn" id="btn-nuevo-capitulo">+ Nuevo capítulo</button>
        <div class="cardlist">
          ${capitulos
            .map(
              (c) => `
            <div class="cardlist__item ${historiaEditorState.capituloId === c.id ? "cardlist__item--activo" : ""}" data-capitulo-id="${c.id}">
              <strong>${c.titulo || "(sin título)"}</strong>
              <span class="hint">${c.escenas.length} escena(s)</span>
            </div>
          `
            )
            .join("") || '<p class="empty-hint">Todavía no hay capítulos.</p>'}
        </div>

        ${
          capitulo
            ? `
          <div class="historialista__escenas">
            <label class="mini-label">Título del capítulo</label>
            <input type="text" id="input-titulo-capitulo" value="${capitulo.titulo}" />
            <button class="btn btn--peligro btn--icono" id="btn-borrar-capitulo">Borrar capítulo</button>

            <h4 style="margin-top:14px;">Escenas (en orden)</h4>
            <div class="cardlist">
              ${capitulo.escenas
                .map(
                  (e, i) => `
                <div class="cardlist__item ${historiaEditorState.escenaId === e.id ? "cardlist__item--activo" : ""}" data-escena-id="${e.id}">
                  ${i + 1}. ${e.texto ? e.texto.slice(0, 40) + (e.texto.length > 40 ? "…" : "") : "(vacía)"}
                </div>
              `
                )
                .join("") || '<p class="empty-hint">Todavía no hay escenas.</p>'}
            </div>
            <button class="btn btn--secundario" id="btn-nueva-escena">+ Nueva escena</button>
          </div>
        `
            : ""
        }

        <button type="button" class="btn btn--secundario" id="btn-borrar-toda-historia" style="margin-top:14px;">Borrar toda la historia</button>
      </div>

      <div class="admin-layout__form">
        ${historiaEditorState.borrador ? renderSceneForm(historiaEditorState.borrador) : `<p class="empty-hint">Elegí un capítulo y una escena, o creá una nueva.</p>`}
      </div>
    </div>
  `;

  attachHistoriaEditorEvents(container);
}

function renderSceneForm(escena) {
  return `
    <form id="form-escena" class="cardform">
      <label>Texto de la escena
        <textarea name="texto" rows="5" required>${escena.texto}</textarea>
      </label>

      <label>Fondo (opcional, estilo visual novel)</label>
      ${escena.imagenFondo ? `<img class="screenfieldset__preview" src="${escena.imagenFondo}" alt="" />` : ""}
      <input type="file" accept="image/*" id="input-fondo-file" />
      <input type="text" name="imagenFondo" placeholder="...o pegá una URL de imagen" value="${escena.imagenFondo}" />

      <label>Personaje ilustrado (opcional)</label>
      ${escena.imagenPersonaje ? `<img class="screenfieldset__preview screenfieldset__preview--personaje" src="${escena.imagenPersonaje}" alt="" />` : ""}
      <input type="file" accept="image/*" id="input-personaje-file" />
      <input type="text" name="imagenPersonaje" placeholder="...o pegá una URL de imagen" value="${escena.imagenPersonaje}" />

      <fieldset>
        <legend>Opciones que ve el jugador</legend>
        <div id="lista-opciones-escena">
          ${escena.opciones.map((op, i) => renderOptionRow(op, i)).join("")}
        </div>
        <button type="button" class="btn btn--secundario" id="btn-agregar-opcion-escena">+ Agregar opción</button>
      </fieldset>

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar escena</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-escena">Borrar escena</button>
      </div>
    </form>
  `;
}

function renderOptionRow(opcion, index) {
  const tipo = opcion.consecuencia.tipo;
  return `
    <div class="repeatable-row storyopcion" data-index="${index}">
      <input type="text" data-field="texto" placeholder="Texto del botón" value="${opcion.texto || ""}" />
      <label class="mini-label">Consecuencia
        <select data-field="tipo">
          <option value="nada" ${tipo === "nada" ? "selected" : ""}>Ninguna</option>
          <option value="moneda" ${tipo === "moneda" ? "selected" : ""}>Moneda</option>
          <option value="hp" ${tipo === "hp" ? "selected" : ""}>HP a una carta</option>
          <option value="buffCarta" ${tipo === "buffCarta" ? "selected" : ""}>Bendición permanente (+stat)</option>
          <option value="debuffCarta" ${tipo === "debuffCarta" ? "selected" : ""}>Maldición permanente (-stat)</option>
        </select>
      </label>
      ${tipo === "moneda" ? `<label class="mini-label">Cantidad (negativa = pierde)<input type="number" data-field="cantidad" value="${opcion.consecuencia.cantidad ?? 0}" /></label>` : ""}
      ${
        tipo === "hp"
          ? `
        <label class="mini-label">Cantidad<input type="number" data-field="cantidad" value="${opcion.consecuencia.cantidad ?? 0}" /></label>
        <label class="checkbox-label"><input type="checkbox" data-field="esPortentaje" ${opcion.consecuencia.esPortentaje ? "checked" : ""} /> Es % del HP máx</label>
        <label class="mini-label">A quién<select data-field="objetivo">
          <option value="aleatoria" ${opcion.consecuencia.objetivo !== "todas" ? "selected" : ""}>Una carta al azar</option>
          <option value="todas" ${opcion.consecuencia.objetivo === "todas" ? "selected" : ""}>Todo el equipo</option>
        </select></label>
      `
          : ""
      }
      ${
        tipo === "buffCarta" || tipo === "debuffCarta"
          ? `
        <label class="mini-label">Stat<select data-field="stat">
          <option value="atk" ${opcion.consecuencia.stat === "atk" ? "selected" : ""}>Ataque</option>
          <option value="def" ${opcion.consecuencia.stat === "def" ? "selected" : ""}>Defensa</option>
          <option value="hp" ${opcion.consecuencia.stat === "hp" ? "selected" : ""}>HP máximo</option>
          <option value="velocidad" ${opcion.consecuencia.stat === "velocidad" ? "selected" : ""}>Velocidad</option>
        </select></label>
        <label class="mini-label">Modificador (0.1 = 10%)<input type="number" step="0.01" data-field="modificador" value="${opcion.consecuencia.modificador ?? 0.1}" /></label>
        <label class="mini-label">A quién<select data-field="objetivo">
          <option value="aleatoria" ${opcion.consecuencia.objetivo !== "todas" ? "selected" : ""}>Una carta al azar</option>
          <option value="todas" ${opcion.consecuencia.objetivo === "todas" ? "selected" : ""}>Todo el equipo</option>
        </select></label>
      `
          : ""
      }
      <button type="button" class="btn btn--icono btn--quitar-opcion-escena">✕</button>
    </div>
  `;
}

function syncSceneFormToBorrador() {
  const form = document.getElementById("form-escena");
  if (!form || !historiaEditorState.borrador) return;
  const b = historiaEditorState.borrador;
  b.texto = form.elements["texto"].value;
  b.imagenFondo = form.elements["imagenFondo"].value.trim();
  b.imagenPersonaje = form.elements["imagenPersonaje"].value.trim();

  b.opciones = [...form.querySelectorAll(".storyopcion")].map((row) => {
    const campo = (name) => row.querySelector(`[data-field="${name}"]`);
    const valor = (name, fallback) => (campo(name) ? campo(name).value : fallback);
    const tipo = valor("tipo", "nada");
    const texto = valor("texto", "");

    let consecuencia = { tipo: "nada" };
    if (tipo === "moneda") {
      consecuencia = { tipo: "moneda", cantidad: Number(valor("cantidad", 0)) };
    } else if (tipo === "hp") {
      consecuencia = {
        tipo: "hp",
        cantidad: Number(valor("cantidad", 0)),
        esPortentaje: campo("esPortentaje") ? campo("esPortentaje").checked : false,
        objetivo: valor("objetivo", "aleatoria"),
      };
    } else if (tipo === "buffCarta" || tipo === "debuffCarta") {
      consecuencia = {
        tipo,
        stat: valor("stat", "atk"),
        modificador: Number(valor("modificador", 0.1)),
        objetivo: valor("objetivo", "aleatoria"),
      };
    }
    return { texto, consecuencia };
  });
}

function attachHistoriaEditorEvents(container) {
  const btnNuevoCapitulo = container.querySelector("#btn-nuevo-capitulo");
  if (btnNuevoCapitulo) btnNuevoCapitulo.addEventListener("click", () => {
    const nuevo = { id: "capitulo_" + _nextCapituloId++, titulo: "Nuevo capítulo", escenas: [] };
    GameData.historia.capitulos.push(nuevo);
    saveGameData();
    historiaEditorState = { capituloId: nuevo.id, escenaId: null, borrador: null };
    renderHistoriaEditorView();
  });

  container.querySelectorAll("[data-capitulo-id]").forEach((el) => {
    el.addEventListener("click", () => {
      historiaEditorState = { capituloId: el.dataset.capituloId, escenaId: null, borrador: null };
      renderHistoriaEditorView();
    });
  });

  const inputTitulo = container.querySelector("#input-titulo-capitulo");
  if (inputTitulo) inputTitulo.addEventListener("change", () => {
    const capitulo = GameData.historia.capitulos.find((c) => c.id === historiaEditorState.capituloId);
    capitulo.titulo = inputTitulo.value.trim() || "Capítulo sin título";
    saveGameData();
    renderHistoriaEditorView();
  });

  const btnBorrarCapitulo = container.querySelector("#btn-borrar-capitulo");
  if (btnBorrarCapitulo) btnBorrarCapitulo.addEventListener("click", () => {
    if (!confirm("¿Borrar este capítulo entero, con todas sus escenas?")) return;
    GameData.historia.capitulos = GameData.historia.capitulos.filter((c) => c.id !== historiaEditorState.capituloId);
    saveGameData();
    historiaEditorState = { capituloId: null, escenaId: null, borrador: null };
    renderHistoriaEditorView();
  });

  const btnNuevaEscena = container.querySelector("#btn-nueva-escena");
  if (btnNuevaEscena) btnNuevaEscena.addEventListener("click", () => {
    const capitulo = GameData.historia.capitulos.find((c) => c.id === historiaEditorState.capituloId);
    const nueva = createEmptyScene();
    capitulo.escenas.push(nueva);
    saveGameData();
    historiaEditorState.escenaId = nueva.id;
    historiaEditorState.borrador = structuredClone(nueva);
    renderHistoriaEditorView();
  });

  container.querySelectorAll("[data-escena-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const capitulo = GameData.historia.capitulos.find((c) => c.id === historiaEditorState.capituloId);
      const escena = capitulo.escenas.find((e) => e.id === el.dataset.escenaId);
      historiaEditorState.escenaId = escena.id;
      historiaEditorState.borrador = structuredClone(escena);
      renderHistoriaEditorView();
    });
  });

  const btnBorrarTodaHistoria = container.querySelector("#btn-borrar-toda-historia");
  if (btnBorrarTodaHistoria) btnBorrarTodaHistoria.addEventListener("click", () => {
    if (!confirm("¿Borrar TODA la historia (todos los capítulos y escenas)? Esto no se puede deshacer.")) return;
    resetStoryToDefault();
    historiaEditorState = { capituloId: null, escenaId: null, borrador: null };
    renderHistoriaEditorView();
  });

  const form = container.querySelector("#form-escena");
  if (!form) return;

  const inputFondoFile = form.querySelector("#input-fondo-file");
  if (inputFondoFile) inputFondoFile.addEventListener("change", async () => {
    const file = inputFondoFile.files[0];
    if (!file) return;
    syncSceneFormToBorrador();
    try {
      historiaEditorState.borrador.imagenFondo = await uploadCardImage(file);
      saveSceneFromEditor();
    } catch (err) {
      alert(err.message);
    }
  });

  const inputPersonajeFile = form.querySelector("#input-personaje-file");
  if (inputPersonajeFile) inputPersonajeFile.addEventListener("change", async () => {
    const file = inputPersonajeFile.files[0];
    if (!file) return;
    syncSceneFormToBorrador();
    try {
      historiaEditorState.borrador.imagenPersonaje = await uploadCardImage(file);
      saveSceneFromEditor();
    } catch (err) {
      alert(err.message);
    }
  });

  const btnAgregarOpcion = form.querySelector("#btn-agregar-opcion-escena");
  if (btnAgregarOpcion) btnAgregarOpcion.addEventListener("click", () => {
    syncSceneFormToBorrador();
    historiaEditorState.borrador.opciones.push({ texto: "", consecuencia: { tipo: "nada" } });
    renderHistoriaEditorView();
  });

  form.querySelectorAll(".btn--quitar-opcion-escena").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncSceneFormToBorrador();
      const index = Number(btn.closest(".storyopcion").dataset.index);
      historiaEditorState.borrador.opciones.splice(index, 1);
      renderHistoriaEditorView();
    });
  });

  form.querySelectorAll(".storyopcion select[data-field='tipo']").forEach((select) => {
    select.addEventListener("change", () => {
      syncSceneFormToBorrador();
      renderHistoriaEditorView();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    syncSceneFormToBorrador();
    saveSceneFromEditor();
  });

  const btnBorrarEscena = form.querySelector("#btn-borrar-escena");
  if (btnBorrarEscena) btnBorrarEscena.addEventListener("click", () => {
    if (!confirm("¿Borrar esta escena?")) return;
    const capitulo = GameData.historia.capitulos.find((c) => c.id === historiaEditorState.capituloId);
    capitulo.escenas = capitulo.escenas.filter((e) => e.id !== historiaEditorState.escenaId);
    saveGameData();
    historiaEditorState.escenaId = null;
    historiaEditorState.borrador = null;
    renderHistoriaEditorView();
  });
}

function saveSceneFromEditor() {
  const capitulo = GameData.historia.capitulos.find((c) => c.id === historiaEditorState.capituloId);
  const index = capitulo.escenas.findIndex((e) => e.id === historiaEditorState.escenaId);
  if (index >= 0) capitulo.escenas[index] = historiaEditorState.borrador;
  saveGameData();
  renderHistoriaEditorView();
}
