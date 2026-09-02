/**
 * CARDEDITOR.JS
 * -----------------------------------------------------------------------
 * Pantalla de admin para crear/editar/borrar cartas. Todo por
 * formulario: dropdowns para rareza/clase/elemento, inputs numéricos
 * para stats, y "filas repetibles" para pasivas y habilidades (con
 * botón "+ Agregar" y "Quitar" en cada fila). En ningún momento se le
 * pide al usuario escribir JSON.
 *
 * Los cambios se guardan directo en GameData (ver js/storage.js), así
 * que el probador de combate (Equipos y combate) siempre ve la
 * versión más reciente de cada carta.
 * -----------------------------------------------------------------------
 */

let cardEditorState = {
  editandoId: null, // id de la carta que se está editando, o null si es nueva
  borrador: null, // copia de trabajo de la carta mientras se edita
};

function renderCardEditorView() {
  const container = document.getElementById("view-cartas");
  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <button class="btn" id="btn-nueva-carta">+ Nueva carta</button>
        ${renderCardList()}
      </div>
      <div class="admin-layout__form">
        ${cardEditorState.borrador ? renderCardForm(cardEditorState.borrador) : `<p class="empty-hint">Selecciona una carta de la lista o crea una nueva.</p>`}
      </div>
    </div>
  `;
  attachCardEditorEvents();
}

function renderCardList() {
  const porRareza = RAREZAS.map((rareza) => {
    const cartas = GameData.cartas.filter((c) => c.rareza === rareza);
    if (cartas.length === 0) return "";
    return `
      <div class="cardlist__grupo">
        <div class="cardlist__rareza cardlist__rareza--${rareza}">${rareza}</div>
        ${cartas
          .map(
            (c) => `
          <div class="cardlist__item" data-id="${c.id}">
            <span class="cardlist__nombregrupo">
              ${c.imagen ? `<img class="cardlist__thumb" src="${c.imagen}" alt="" />` : ""}
              ${c.nombre}
            </span>
            <span class="cardlist__clase">${c.clase}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }).join("");

  return `<div class="cardlist">${porRareza || '<p class="empty-hint">Todavía no hay cartas.</p>'}</div>`;
}

function renderCardForm(carta) {
  const elementosOptions = GameData.elementos.lista.map(
    (e) => `<option value="${e.id}" ${carta.elemento === e.id ? "selected" : ""}>${e.label}</option>`
  ).join("");
  const clasesOptions = CLASSES_LIST.map(
    (c) => `<option value="${c.id}" ${carta.clase === c.id ? "selected" : ""}>${c.label}</option>`
  ).join("");
  const rarezaOptions = RAREZAS.map(
    (r) => `<option value="${r}" ${carta.rareza === r ? "selected" : ""}>${r}</option>`
  ).join("");
  const arquetipoOptions = renderArquetipoOptions(carta.clase, carta.arquetipo);

  return `
    <form id="form-carta" class="cardform">
      <label>Nombre
        <input type="text" name="nombre" value="${carta.nombre}" required />
      </label>

      <div class="cardform__fila">
        <label>Rareza
          <select name="rareza" id="input-rareza-carta">${rarezaOptions}</select>
        </label>
        <label>Clase
          <select name="clase" id="input-clase-carta">${clasesOptions}</select>
        </label>
        <label>Elemento
          <select name="elemento">${elementosOptions}</select>
        </label>
      </div>

      <label>Arquetipo (opcional — define cómo el botón 🎲 Random reparte las estadísticas)
        <select name="arquetipo" id="input-arquetipo-carta">${arquetipoOptions}</select>
      </label>

      <label class="checkbox-label">
        <input type="checkbox" name="esFMC" ${carta.esFMC ? "checked" : ""} />
        Es FMC (carta centro de estrategia — etiqueta especial, cualquier rareza)
      </label>

      <label>Imagen de la carta
        <input type="file" name="imagenArchivo" accept="image/*" />
      </label>
      <div class="image-preview" id="preview-imagen-carta">
        ${carta.imagen ? `<img src="${carta.imagen}" alt="${carta.nombre}" /><button type="button" class="btn btn--icono btn--peligro" id="btn-quitar-imagen-carta">Quitar imagen</button>` : '<p class="empty-hint">Sin imagen todavía.</p>'}
      </div>

      <fieldset class="cardform__stats">
        <legend>
          Estadísticas
          <button type="button" class="btn btn--secundario btn--icono" id="btn-random-stats" title="Generar HP/ATQ/DEF/VEL según rareza+clase+arquetipo">🎲 Random</button>
        </legend>
        <label>HP <input type="number" name="hp" id="input-stat-hp" value="${carta.stats.hp}" min="1" /></label>
        <label>ATQ <input type="number" name="atk" id="input-stat-atk" value="${carta.stats.atk}" min="0" /></label>
        <label>DEF <input type="number" name="def" id="input-stat-def" value="${carta.stats.def}" min="0" /></label>
        <label>Velocidad <input type="number" name="velocidad" id="input-stat-velocidad" value="${carta.stats.velocidad}" min="1" /></label>
        <div id="balance-warnings" class="balance-warnings"></div>
      </fieldset>

      <fieldset class="cardform__pasivas">
        <legend>Pasivas de posición</legend>
        <div id="lista-pasivas">${carta.pasivas.map((p, i) => renderPasivaRow(p, i)).join("")}</div>
        <label class="mini-label">Elegir de la lista (según la clase de la carta)
          <select id="select-pasiva-preset">
            <option value="">— elegir una pasiva predefinida —</option>
            ${PASSIVE_PRESETS[carta.clase] ? PASSIVE_PRESETS[carta.clase].map((p, i) => `<option value="${i}">${p.nombre}</option>`).join("") : ""}
          </select>
        </label>
        <p class="hint">Las pasivas predefinidas son una aproximación a % de stat — el combate todavía no evalúa condiciones de HP, turnos o efectos de equipo. Podés editar los números después de agregarla.</p>
        <button type="button" class="btn btn--secundario" id="btn-agregar-pasiva">+ Agregar pasiva en blanco</button>
      </fieldset>

      <fieldset class="cardform__habilidades">
        <legend>Habilidades activas</legend>
        <div id="lista-habilidades">${carta.habilidades.map((h, i) => renderHabilidadRow(h, i)).join("")}</div>
        <button type="button" class="btn btn--secundario" id="btn-agregar-habilidad">+ Agregar habilidad</button>
      </fieldset>

      ${renderEvolutionFieldset(carta)}

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar carta</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-carta">Borrar carta</button>
        <button type="button" class="btn btn--secundario" id="btn-cancelar-carta">Cancelar</button>
      </div>
    </form>
  `;
}

function renderArquetipoOptions(claseId, arquetipoSeleccionado) {
  const arquetipos = getArchetypesForClass(claseId);
  return (
    `<option value="">— sin arquetipo —</option>` +
    arquetipos.map((a) => `<option value="${a.id}" ${arquetipoSeleccionado === a.id ? "selected" : ""}>${a.nombre}</option>`).join("")
  );
}

/** Compara los valores actuales del formulario contra el rango recomendado del arquetipo y los muestra (no bloquea nada). */
function renderBalanceWarnings(form) {
  const contenedor = form.querySelector("#balance-warnings");
  if (!contenedor) return;

  const rareza = form.elements["rareza"].value;
  const clase = form.elements["clase"].value;
  const arquetipo = form.elements["arquetipo"].value;
  if (!arquetipo) {
    contenedor.innerHTML = "";
    return;
  }

  const stats = {
    hp: Number(form.elements["hp"].value),
    atk: Number(form.elements["atk"].value),
    def: Number(form.elements["def"].value),
    velocidad: Number(form.elements["velocidad"].value),
  };
  const chequeo = checkStatBalance(rareza, clase, arquetipo, stats);
  contenedor.innerHTML = chequeo.avisos.map((a) => `<p class="balance-warnings__item">⚠️ ${a}</p>`).join("");
}

function renderPasivaRow(pasiva, index) {
  const statOptions = ["hp", "atk", "def", "velocidad"]
    .map((s) => `<option value="${s}" ${pasiva.efecto?.stat === s ? "selected" : ""}>${s}</option>`)
    .join("");
  const posOptions = ["primera_linea", "retaguardia", "cualquiera"]
    .map((p) => `<option value="${p}" ${pasiva.posicionRequerida === p ? "selected" : ""}>${p}</option>`)
    .join("");
  return `
    <div class="repeatable-row" data-index="${index}">
      <input type="text" data-field="nombre" placeholder="Nombre de la pasiva" value="${pasiva.nombre || ""}" />
      <select data-field="posicionRequerida">${posOptions}</select>
      <select data-field="stat">${statOptions}</select>
      <input type="number" data-field="modificador" step="0.01" placeholder="ej: 0.15 = +15%" value="${pasiva.efecto?.modificador ?? ""}" />
      <button type="button" class="btn btn--icono btn--quitar-pasiva">✕</button>
    </div>
  `;
}

function renderHabilidadRow(habilidad, index) {
  const tipoObjetivoOptions = ["un_enemigo", "area", "aliado", "uno_mismo"]
    .map((t) => `<option value="${t}" ${habilidad.tipoObjetivo === t ? "selected" : ""}>${t}</option>`)
    .join("");
  const tipoEfectoOptions = ["dano", "curacion", "taunt"]
    .map((t) => `<option value="${t}" ${habilidad.efecto?.tipo === t ? "selected" : ""}>${t}</option>`)
    .join("");
  const estadoOptions =
    `<option value="">(ninguno)</option>` +
    STATUSES_LIST.map(
      (s) => `<option value="${s.id}" ${habilidad.estadoQueAplica === s.id ? "selected" : ""}>${s.label}</option>`
    ).join("");

  return `
    <div class="repeatable-row repeatable-row--habilidad" data-index="${index}">
      <input type="text" data-field="nombre" placeholder="Nombre de la habilidad" value="${habilidad.nombre || ""}" />
      <label class="mini-label">Costo ⚡<input type="number" data-field="costoEnergia" min="0" value="${habilidad.costoEnergia ?? 0}" /></label>
      <label class="mini-label">Objetivo<select data-field="tipoObjetivo">${tipoObjetivoOptions}</select></label>
      <label class="mini-label">Efecto<select data-field="tipoEfecto">${tipoEfectoOptions}</select></label>
      <label class="mini-label">Multiplicador<input type="number" data-field="multiplicador" step="0.1" value="${habilidad.efecto?.multiplicador ?? 1}" /></label>
      <label class="mini-label">Estado que aplica<select data-field="estadoQueAplica">${estadoOptions}</select></label>
      <label class="mini-label">Enfriamiento (turnos)<input type="number" data-field="cooldownTurnos" min="0" value="${habilidad.cooldownTurnos ?? 0}" /></label>
      <button type="button" class="btn btn--icono btn--quitar-habilidad">✕</button>
    </div>
  `;
}

function renderEvolutionFieldset(carta) {
  const evo = carta.evolucion || { puedeEvolucionar: false, siguienteCartaId: "", fragmentosRequeridos: 20, monedaRequerida: 200, nivelMinimoRequerido: null };
  const opcionesSiguiente = GameData.cartas
    .filter((c) => c.id !== carta.id)
    .map((c) => `<option value="${c.id}" ${evo.siguienteCartaId === c.id ? "selected" : ""}>${c.nombre} (${c.rareza})</option>`)
    .join("");

  return `
    <fieldset class="cardform__evolucion">
      <legend>Evolución</legend>
      <label class="checkbox-label">
        <input type="checkbox" name="puedeEvolucionar" id="input-puede-evolucionar" ${evo.puedeEvolucionar ? "checked" : ""} />
        Esta carta puede evolucionar
      </label>

      <div id="campos-evolucion" ${!evo.puedeEvolucionar ? 'style="display:none"' : ""}>
        <label>Evoluciona a
          <select name="siguienteCartaId">
            <option value="">— elegir carta —</option>
            ${opcionesSiguiente}
          </select>
        </label>
        <label>Fragmentos de esta carta requeridos
          <input type="number" name="fragmentosRequeridos" min="0" value="${evo.fragmentosRequeridos}" />
        </label>
        <label>Moneda requerida
          <input type="number" name="monedaRequerida" min="0" value="${evo.monedaRequerida}" />
        </label>
        <label>Nivel mínimo requerido (vacío = usa el nivel máximo de su rareza)
          <input type="number" name="nivelMinimoRequerido" min="1" value="${evo.nivelMinimoRequerido ?? ""}" placeholder="automático" />
        </label>
      </div>
    </fieldset>
  `;
}

function attachCardEditorEvents() {
  const container = document.getElementById("view-cartas");

  const btnNueva = container.querySelector("#btn-nueva-carta");
  if (btnNueva) btnNueva.addEventListener("click", () => {
    cardEditorState.editandoId = null;
    cardEditorState.borrador = createEmptyCard();
    renderCardEditorView();
  });

  container.querySelectorAll(".cardlist__item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.dataset.id;
      const carta = GameData.cartas.find((c) => c.id === id);
      cardEditorState.editandoId = id;
      cardEditorState.borrador = structuredClone(carta);
      renderCardEditorView();
    });
  });

  const form = container.querySelector("#form-carta");
  if (!form) return;

  const inputImagen = form.querySelector('input[name="imagenArchivo"]');
  if (inputImagen) inputImagen.addEventListener("change", async () => {
    const file = inputImagen.files[0];
    if (!file) return;
    syncFormToBorrador();
    try {
      cardEditorState.borrador.imagen = await uploadCardImage(file);
      saveCardFromEditor();
    } catch (err) {
      alert(err.message);
    }
  });

  const btnQuitarImagen = form.querySelector("#btn-quitar-imagen-carta");
  if (btnQuitarImagen) btnQuitarImagen.addEventListener("click", () => {
    syncFormToBorrador();
    cardEditorState.borrador.imagen = "";
    saveCardFromEditor();
  });

  const btnAgregarPasiva = form.querySelector("#btn-agregar-pasiva");
  if (btnAgregarPasiva) btnAgregarPasiva.addEventListener("click", () => {
    syncFormToBorrador();
    cardEditorState.borrador.pasivas.push({ nombre: "", posicionRequerida: "cualquiera", efecto: { stat: "atk", modificador: 0.1 } });
    renderCardEditorView();
  });

  const selectPasivaPreset = form.querySelector("#select-pasiva-preset");
  if (selectPasivaPreset) selectPasivaPreset.addEventListener("change", () => {
    if (selectPasivaPreset.value === "") return;
    syncFormToBorrador();
    const preset = PASSIVE_PRESETS[cardEditorState.borrador.clase][Number(selectPasivaPreset.value)];
    preset.efectos.forEach((efecto) => {
      cardEditorState.borrador.pasivas.push({
        nombre: preset.efectos.length > 1 ? `${preset.nombre} (${efecto.stat})` : preset.nombre,
        posicionRequerida: "cualquiera",
        efecto: { stat: efecto.stat, modificador: efecto.modificador },
      });
    });
    renderCardEditorView();
  });

  const btnAgregarHabilidad = form.querySelector("#btn-agregar-habilidad");
  if (btnAgregarHabilidad) btnAgregarHabilidad.addEventListener("click", () => {
    syncFormToBorrador();
    cardEditorState.borrador.habilidades.push({
      nombre: "",
      costoEnergia: 2,
      tipoObjetivo: "un_enemigo",
      efecto: { tipo: "dano", multiplicador: 1 },
      estadoQueAplica: null,
      cooldownTurnos: 0,
    });
    renderCardEditorView();
  });

  form.querySelectorAll(".btn--quitar-pasiva").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncFormToBorrador();
      const index = Number(btn.closest(".repeatable-row").dataset.index);
      cardEditorState.borrador.pasivas.splice(index, 1);
      renderCardEditorView();
    });
  });

  form.querySelectorAll(".btn--quitar-habilidad").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncFormToBorrador();
      const index = Number(btn.closest(".repeatable-row").dataset.index);
      cardEditorState.borrador.habilidades.splice(index, 1);
      renderCardEditorView();
    });
  });

  const inputPuedeEvolucionar = form.querySelector("#input-puede-evolucionar");
  if (inputPuedeEvolucionar) inputPuedeEvolucionar.addEventListener("change", () => {
    form.querySelector("#campos-evolucion").style.display = inputPuedeEvolucionar.checked ? "" : "none";
  });

  // Cambiar la clase actualiza la lista de arquetipos y de pasivas
  // predefinidas disponibles, sin perder lo demás que ya se completó.
  const selectClase = form.querySelector("#input-clase-carta");
  if (selectClase) selectClase.addEventListener("change", () => {
    syncFormToBorrador();
    cardEditorState.borrador.clase = selectClase.value;
    cardEditorState.borrador.arquetipo = ""; // el arquetipo viejo puede no existir en la clase nueva
    renderCardEditorView();
  });

  const btnRandomStats = form.querySelector("#btn-random-stats");
  if (btnRandomStats) btnRandomStats.addEventListener("click", () => {
    const rareza = form.elements["rareza"].value;
    const clase = form.elements["clase"].value;
    const arquetipo = form.elements["arquetipo"].value;
    if (!arquetipo) {
      alert("Elegí un arquetipo primero — el botón Random reparte las estadísticas según el arquetipo elegido.");
      return;
    }
    const stats = generateArchetypeStats(rareza, clase, arquetipo);
    if (!stats) {
      alert("No se pudo generar: revisá que la rareza y el arquetipo sean válidos.");
      return;
    }
    form.elements["hp"].value = stats.hp;
    form.elements["atk"].value = stats.atk;
    form.elements["def"].value = stats.def;
    form.elements["velocidad"].value = stats.velocidad;
    syncFormToBorrador();
    renderBalanceWarnings(form);
  });

  ["hp", "atk", "def", "velocidad"].forEach((stat) => {
    const input = form.querySelector(`#input-stat-${stat}`);
    if (input) input.addEventListener("change", () => renderBalanceWarnings(form));
  });
  const inputRareza = form.querySelector("#input-rareza-carta");
  if (inputRareza) inputRareza.addEventListener("change", () => renderBalanceWarnings(form));
  const inputArquetipo = form.querySelector("#input-arquetipo-carta");
  if (inputArquetipo) inputArquetipo.addEventListener("change", () => renderBalanceWarnings(form));

  renderBalanceWarnings(form); // estado inicial al abrir/reabrir el formulario

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    syncFormToBorrador();
    saveCardFromEditor();
  });

  const btnBorrar = form.querySelector("#btn-borrar-carta");
  if (btnBorrar) btnBorrar.addEventListener("click", () => {
    if (!cardEditorState.editandoId) return;
    if (!confirm(`¿Borrar "${cardEditorState.borrador.nombre}"? Esto no se puede deshacer.`)) return;
    GameData.cartas = GameData.cartas.filter((c) => c.id !== cardEditorState.editandoId);
    saveGameData();
    cardEditorState.editandoId = null;
    cardEditorState.borrador = null;
    renderCardEditorView();
  });

  const btnCancelar = form.querySelector("#btn-cancelar-carta");
  if (btnCancelar) btnCancelar.addEventListener("click", () => {
    cardEditorState.editandoId = null;
    cardEditorState.borrador = null;
    renderCardEditorView();
  });
}

/** Lee los valores actuales del formulario (incluyendo filas repetibles) hacia cardEditorState.borrador */
function syncFormToBorrador() {
  const form = document.getElementById("form-carta");
  if (!form) return;
  const b = cardEditorState.borrador;

  b.nombre = form.elements["nombre"].value;
  b.rareza = form.elements["rareza"].value;
  b.clase = form.elements["clase"].value;
  b.elemento = form.elements["elemento"].value;
  b.esFMC = form.elements["esFMC"].checked;
  b.arquetipo = form.elements["arquetipo"].value;
  // b.imagen NO se toca aquí — la maneja el input de archivo (ver
  // attachCardEditorEvents), porque cargar/comprimir una imagen es
  // asíncrono y no depende de este submit del formulario.
  b.stats = {
    hp: Number(form.elements["hp"].value),
    atk: Number(form.elements["atk"].value),
    def: Number(form.elements["def"].value),
    velocidad: Number(form.elements["velocidad"].value),
  };

  form.querySelectorAll("#lista-pasivas .repeatable-row").forEach((row, i) => {
    b.pasivas[i] = {
      nombre: row.querySelector('[data-field="nombre"]').value,
      posicionRequerida: row.querySelector('[data-field="posicionRequerida"]').value,
      efecto: {
        stat: row.querySelector('[data-field="stat"]').value,
        modificador: Number(row.querySelector('[data-field="modificador"]').value) || 0,
      },
    };
  });

  form.querySelectorAll("#lista-habilidades .repeatable-row").forEach((row, i) => {
    const estado = row.querySelector('[data-field="estadoQueAplica"]').value;
    b.habilidades[i] = {
      nombre: row.querySelector('[data-field="nombre"]').value,
      costoEnergia: Number(row.querySelector('[data-field="costoEnergia"]').value) || 0,
      tipoObjetivo: row.querySelector('[data-field="tipoObjetivo"]').value,
      efecto: {
        tipo: row.querySelector('[data-field="tipoEfecto"]').value,
        multiplicador: Number(row.querySelector('[data-field="multiplicador"]').value) || 1,
      },
      estadoQueAplica: estado || null,
      cooldownTurnos: Number(row.querySelector('[data-field="cooldownTurnos"]').value) || 0,
    };
  });

  const puedeEvolucionar = form.elements["puedeEvolucionar"].checked;
  b.evolucion = {
    puedeEvolucionar,
    siguienteCartaId: puedeEvolucionar ? form.elements["siguienteCartaId"].value : "",
    fragmentosRequeridos: Number(form.elements["fragmentosRequeridos"].value) || 0,
    monedaRequerida: Number(form.elements["monedaRequerida"].value) || 0,
    nivelMinimoRequerido: form.elements["nivelMinimoRequerido"].value ? Number(form.elements["nivelMinimoRequerido"].value) : null,
  };
}

function saveCardFromEditor() {
  const b = cardEditorState.borrador;
  const existente = GameData.cartas.findIndex((c) => c.id === b.id);
  if (existente >= 0) {
    GameData.cartas[existente] = b;
  } else {
    GameData.cartas.push(b);
  }
  saveGameData();
  cardEditorState.editandoId = b.id;
  renderCardEditorView();
}
