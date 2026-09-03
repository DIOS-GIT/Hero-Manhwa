/**
 * SHOPEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar GameData.tienda (antes SHOP_CONFIG fijo).
 * Permite agregar, editar y borrar objetos que se venden en la tienda
 * dentro del mapa de una run.
 * -----------------------------------------------------------------------
 */

let shopEditorState = {
  editandoId: null,
  borrador: null,
};

function renderShopEditorView() {
  const container = document.getElementById("view-tienda");
  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <button class="btn" id="btn-nuevo-objeto">+ Nuevo objeto</button>
        <div class="cardlist">
          ${GameData.tienda.objetos.map((o) => `
            <div class="cardlist__item" data-id="${o.id}">
              <strong>${o.nombre}</strong>
              <span class="cardlist__clase">🪙 ${o.costo}</span>
            </div>
          `).join("") || '<p class="empty-hint">No hay objetos.</p>'}
        </div>
      </div>
      <div class="admin-layout__form">
        ${shopEditorState.borrador ? renderShopForm(shopEditorState.borrador) : '<p class="empty-hint">Selecciona un objeto o crea uno nuevo.</p>'}
      </div>
    </div>
  `;

  attachShopEditorEvents(container);
}

function renderShopForm(objeto) {
  return `
    <form id="form-objeto" class="cardform">
      <label>Nombre
        <input type="text" name="nombre" value="${objeto.nombre}" />
      </label>
      <label>Descripción
        <input type="text" name="descripcion" value="${objeto.descripcion}" />
      </label>
      <label>Costo (monedas)
        <input type="number" name="costo" value="${objeto.costo}" min="0" />
      </label>

      <fieldset>
        <legend>Efecto</legend>
        <label>Tipo de efecto
          <select name="tipo">
            <option value="hp" ${objeto.efecto.tipo === "hp" ? "selected" : ""}>Curación (HP)</option>
            <option value="buffCarta" ${objeto.efecto.tipo === "buffCarta" ? "selected" : ""}>Buff permanente (+stat)</option>
          </select>
        </label>

        ${objeto.efecto.tipo === "hp" ? `
          <label>HP a curar
            <input type="number" name="cantidad" value="${objeto.efecto.cantidad}" step="0.01" />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" name="esPorcentaje" ${objeto.efecto.esPorcentaje ? "checked" : ""} />
            Es % del HP máx
          </label>
        ` : ""}

        ${objeto.efecto.tipo === "buffCarta" ? `
          <label>Stat a mejorar
            <select name="stat">
              <option value="atk" ${objeto.efecto.stat === "atk" ? "selected" : ""}>Ataque</option>
              <option value="def" ${objeto.efecto.stat === "def" ? "selected" : ""}>Defensa</option>
              <option value="hp" ${objeto.efecto.stat === "hp" ? "selected" : ""}>HP máximo</option>
              <option value="velocidad" ${objeto.efecto.stat === "velocidad" ? "selected" : ""}>Velocidad</option>
            </select>
          </label>
          <label>Modificador (0.1 = +10%)
            <input type="number" name="modificador" step="0.01" value="${objeto.efecto.modificador}" />
          </label>
        ` : ""}
      </fieldset>

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar objeto</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-objeto">Borrar</button>
      </div>
    </form>
  `;
}

function attachShopEditorEvents(container) {
  const btnNuevo = container.querySelector("#btn-nuevo-objeto");
  if (btnNuevo) btnNuevo.addEventListener("click", () => {
    shopEditorState.editandoId = null;
    shopEditorState.borrador = {
      id: "objeto_" + Date.now(),
      nombre: "Nuevo objeto",
      descripcion: "",
      costo: 50,
      efecto: { tipo: "hp", cantidad: 0.25, esPorcentaje: true, stat: "atk", modificador: 0.1 },
    };
    renderShopEditorView();
  });

  container.querySelectorAll(".cardlist__item").forEach((item) => {
    item.addEventListener("click", () => {
      const obj = GameData.tienda.objetos.find((o) => o.id === item.dataset.id);
      shopEditorState.editandoId = obj.id;
      shopEditorState.borrador = JSON.parse(JSON.stringify(obj));
      renderShopEditorView();
    });
  });

  const form = container.querySelector("#form-objeto");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const b = shopEditorState.borrador;
    b.nombre = form.elements["nombre"].value;
    b.descripcion = form.elements["descripcion"].value;
    b.costo = Number(form.elements["costo"].value) || 0;
    b.efecto.tipo = form.elements["tipo"].value;

    if (b.efecto.tipo === "hp") {
      b.efecto.cantidad = Number(form.elements["cantidad"].value) || 0;
      b.efecto.esPorcentaje = form.elements["esPorcentaje"].checked;
    } else if (b.efecto.tipo === "buffCarta") {
      b.efecto.stat = form.elements["stat"].value;
      b.efecto.modificador = Number(form.elements["modificador"].value) || 0.1;
    }

    const existente = GameData.tienda.objetos.findIndex((o) => o.id === b.id);
    if (existente >= 0) {
      GameData.tienda.objetos[existente] = b;
    } else {
      GameData.tienda.objetos.push(b);
    }
    saveGameData();
    shopEditorState.editandoId = b.id;
    renderShopEditorView();
  });

  const btnBorrar = container.querySelector("#btn-borrar-objeto");
  if (btnBorrar) btnBorrar.addEventListener("click", () => {
    if (!shopEditorState.editandoId) return;
    GameData.tienda.objetos = GameData.tienda.objetos.filter((o) => o.id !== shopEditorState.editandoId);
    saveGameData();
    shopEditorState.editandoId = null;
    shopEditorState.borrador = null;
    renderShopEditorView();
  });
}
