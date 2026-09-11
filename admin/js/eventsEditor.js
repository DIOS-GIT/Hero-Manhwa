/**
 * EVENTSEDITOR.JS
 * -----------------------------------------------------------------------
 * Pantalla de admin para crear/editar eventos de temporada (ver
 * shared/js/engine/eventEngine.js para cómo se usan en el juego).
 * -----------------------------------------------------------------------
 */

let eventsEditorState = {
  editandoId: null,
  borrador: null,
};

function createEmptyEvent() {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    id: generateUniqueId("evento"),
    nombre: "Nuevo evento",
    tema: "",
    fechaInicio: hoy,
    fechaFin: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    cartaExclusivaId: "",
    probabilidadRateUp: 0.5,
    costoTiendaMonedaEvento: 150,
    misiones: [],
  };
}

function createEmptyEventMission() {
  return { id: generateUniqueId("mision"), descripcion: "", tipo: "victoriasEvento", meta: 3, recompensaMonedaEvento: 40 };
}

function renderEventsEditorView() {
  const container = document.getElementById("view-eventos");
  const eventos = GameData.eventos || [];
  const hoy = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <button class="btn" id="btn-nuevo-evento">+ Nuevo evento</button>
        <div class="cardlist">
          ${
            eventos
              .map((e) => {
                const estado = e.fechaInicio <= hoy && hoy <= e.fechaFin ? "🟢 activo" : hoy < e.fechaInicio ? "⏳ programado" : "⚪ terminado";
                return `
              <div class="cardlist__item ${eventsEditorState.editandoId === e.id ? "cardlist__item--activo" : ""}" data-evento-id="${e.id}">
                <span class="cardlist__nombregrupo"><strong>${e.nombre}</strong></span>
                <span class="cardlist__clase">${estado} · ${e.fechaInicio} → ${e.fechaFin}</span>
              </div>
            `;
              })
              .join("") || '<p class="empty-hint">No hay eventos creados todavía.</p>'
          }
        </div>
      </div>

      <div class="admin-layout__form">
        ${eventsEditorState.borrador ? renderEventForm(eventsEditorState.borrador) : '<p class="empty-hint">Selecciona un evento o crea uno nuevo.</p>'}
      </div>
    </div>
  `;

  attachEventsEditorEvents(container);
}

function renderEventForm(evento) {
  const cartasOptions = GameData.cartas
    .map((c) => `<option value="${c.id}" ${evento.cartaExclusivaId === c.id ? "selected" : ""}>${c.nombre} (${c.rareza})</option>`)
    .join("");

  return `
    <form id="form-evento" class="cardform">
      <label>Nombre del evento
        <input type="text" name="nombre" value="${evento.nombre}" />
      </label>

      <label>Tema / ambientación (texto corto)
        <input type="text" name="tema" value="${evento.tema || ""}" placeholder="Ej: Una noche de luna sangrienta cae sobre el reino..." />
      </label>

      <div class="form-grid-2">
        <label>Fecha de inicio
          <input type="date" name="fechaInicio" value="${evento.fechaInicio}" />
        </label>
        <label>Fecha de fin
          <input type="date" name="fechaFin" value="${evento.fechaFin}" />
        </label>
      </div>

      <label>Carta exclusiva del evento
        <select name="cartaExclusivaId">
          <option value="">— elige una carta —</option>
          ${cartasOptions}
        </select>
      </label>

      <div class="form-grid-2">
        <label>Probabilidad de rate-up (0 a 1)
          <input type="number" name="probabilidadRateUp" step="0.05" min="0" max="1" value="${evento.probabilidadRateUp}" />
        </label>
        <label>Costo en tienda (moneda de evento)
          <input type="number" name="costoTiendaMonedaEvento" min="0" value="${evento.costoTiendaMonedaEvento}" />
        </label>
      </div>
      <p class="hint">El rate-up solo aplica en el gacha del evento: si al tirar sale la rareza de la carta exclusiva, esta probabilidad decide si es justo ella o cualquier otra de esa rareza.</p>

      <fieldset>
        <legend>Misiones del evento</legend>
        <div id="lista-misiones-evento">${evento.misiones.map((m, i) => renderEventMissionRow(m, i)).join("")}</div>
        <button type="button" class="btn btn--secundario" id="btn-agregar-mision-evento">+ Agregar misión</button>
      </fieldset>

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar evento</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-evento">Eliminar evento</button>
      </div>
    </form>
  `;
}

function renderEventMissionRow(mision, index) {
  const tipoOptions = [
    { value: "victoriasEvento", label: "Ganar X combates durante el evento" },
    { value: "tiradasGachaEvento", label: "Hacer X tiradas en el gacha del evento" },
    { value: "cofresAbiertosEvento", label: "Abrir X cofres durante el evento" },
  ]
    .map((o) => `<option value="${o.value}" ${mision.tipo === o.value ? "selected" : ""}>${o.label}</option>`)
    .join("");

  return `
    <div class="repeatable-row repeatable-row--habilidad" data-index="${index}">
      <input type="text" data-field="descripcion" placeholder="Descripción para el jugador" value="${mision.descripcion || ""}" />
      <select data-field="tipo">${tipoOptions}</select>
      <label class="mini-label">Meta<input type="number" data-field="meta" min="1" value="${mision.meta}" /></label>
      <label class="mini-label">Recompensa (moneda evento)<input type="number" data-field="recompensaMonedaEvento" min="0" value="${mision.recompensaMonedaEvento}" /></label>
      <button type="button" class="btn btn--icono btn--quitar-mision-evento">✕</button>
    </div>
  `;
}

function attachEventsEditorEvents(container) {
  container.querySelectorAll("[data-evento-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const evento = GameData.eventos.find((e) => e.id === item.dataset.eventoId);
      eventsEditorState.editandoId = evento.id;
      eventsEditorState.borrador = safeClone(evento);
      renderEventsEditorView();
    });
  });

  const btnNuevo = container.querySelector("#btn-nuevo-evento");
  if (btnNuevo) btnNuevo.addEventListener("click", () => {
    eventsEditorState.editandoId = null;
    eventsEditorState.borrador = createEmptyEvent();
    renderEventsEditorView();
  });

  const form = container.querySelector("#form-evento");
  if (!form) return;

  const btnAgregarMision = form.querySelector("#btn-agregar-mision-evento");
  btnAgregarMision.addEventListener("click", () => {
    eventsEditorState.borrador.misiones.push(createEmptyEventMission());
    renderEventsEditorView();
  });

  form.querySelectorAll(".btn--quitar-mision-evento").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.closest(".repeatable-row").dataset.index);
      eventsEditorState.borrador.misiones.splice(index, 1);
      renderEventsEditorView();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const b = eventsEditorState.borrador;
    b.nombre = form.elements["nombre"].value.trim() || "Evento sin nombre";
    b.tema = form.elements["tema"].value.trim();
    b.fechaInicio = form.elements["fechaInicio"].value;
    b.fechaFin = form.elements["fechaFin"].value;
    b.cartaExclusivaId = form.elements["cartaExclusivaId"].value;
    b.probabilidadRateUp = Number(form.elements["probabilidadRateUp"].value) || 0;
    b.costoTiendaMonedaEvento = Number(form.elements["costoTiendaMonedaEvento"].value) || 0;

    form.querySelectorAll("#lista-misiones-evento .repeatable-row").forEach((row, i) => {
      b.misiones[i] = {
        id: b.misiones[i].id,
        descripcion: row.querySelector('[data-field="descripcion"]').value,
        tipo: row.querySelector('[data-field="tipo"]').value,
        meta: Number(row.querySelector('[data-field="meta"]').value) || 1,
        recompensaMonedaEvento: Number(row.querySelector('[data-field="recompensaMonedaEvento"]').value) || 0,
      };
    });

    if (!b.cartaExclusivaId) {
      alert("Elige una carta exclusiva para el evento antes de guardar.");
      return;
    }

    const existente = GameData.eventos.findIndex((ev) => ev.id === b.id);
    if (existente >= 0) {
      GameData.eventos[existente] = b;
    } else {
      GameData.eventos.push(b);
    }
    eventsEditorState.editandoId = b.id;
    saveGameData();
    renderEventsEditorView();
    alert("Evento guardado.");
  });

  const btnBorrar = form.querySelector("#btn-borrar-evento");
  if (btnBorrar) btnBorrar.addEventListener("click", () => {
    if (!confirm("¿Eliminar este evento? Esto no se puede deshacer.")) return;
    GameData.eventos = GameData.eventos.filter((ev) => ev.id !== eventsEditorState.borrador.id);
    eventsEditorState.editandoId = null;
    eventsEditorState.borrador = null;
    saveGameData();
    renderEventsEditorView();
  });
}
