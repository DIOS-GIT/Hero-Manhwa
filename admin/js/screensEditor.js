/**
 * SCREENSEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar GameData.pantallas: por cada pantalla del
 * juego (título, hub, colección, etc.) se puede subir un fondo, un
 * personaje ilustrado y elegir de qué lado aparece. Si una pantalla se
 * deja vacía, el juego usa el degradado por defecto sin personaje,
 * como hasta ahora — nada se rompe si no configuras nada acá.
 * -----------------------------------------------------------------------
 */

function renderScreensEditorView() {
  const container = document.getElementById("view-pantallas");

  container.innerHTML = `
    <form id="form-pantallas" class="rulesform">
      <p class="hint">Subí una imagen o pegá una URL para cada pantalla. Dejar todo vacío usa el fondo por defecto del juego, sin personaje.</p>
      ${SCREENS_LIST.map((s) => renderScreenFieldset(s)).join("")}
      <div class="rulesform__acciones">
        <button type="submit" class="btn">Guardar pantallas</button>
        <button type="button" class="btn btn--secundario" id="btn-restaurar-pantallas">Quitar todos los fondos/personajes</button>
      </div>
    </form>
  `;

  attachScreensEditorEvents(container);
}

function renderScreenFieldset(screen) {
  const cfg = GameData.pantallas[screen.id];
  return `
    <fieldset class="screenfieldset">
      <legend>${screen.label}</legend>

      <div class="screenfieldset__campo">
        <label class="mini-label">Fondo</label>
        ${cfg.fondo ? `<img class="screenfieldset__preview" src="${cfg.fondo}" alt="" />` : ""}
        <input type="file" accept="image/*" data-fondo-file="${screen.id}" />
        <input type="text" placeholder="...o pegá una URL de imagen" value="${cfg.fondo}" data-fondo-url="${screen.id}" />
        ${cfg.fondo ? `<button type="button" class="btn btn--secundario btn--icono" data-quitar-fondo="${screen.id}">Quitar fondo</button>` : ""}
      </div>

      <div class="screenfieldset__campo">
        <label class="mini-label">Personaje ilustrado</label>
        ${cfg.personaje ? `<img class="screenfieldset__preview screenfieldset__preview--personaje" src="${cfg.personaje}" alt="" />` : ""}
        <input type="file" accept="image/*" data-personaje-file="${screen.id}" />
        <input type="text" placeholder="...o pegá una URL de imagen" value="${cfg.personaje}" data-personaje-url="${screen.id}" />
        <select data-posicion="${screen.id}">
          <option value="izquierda" ${cfg.posicionPersonaje === "izquierda" ? "selected" : ""}>Izquierda</option>
          <option value="centro" ${cfg.posicionPersonaje === "centro" ? "selected" : ""}>Centro</option>
          <option value="derecha" ${cfg.posicionPersonaje === "derecha" ? "selected" : ""}>Derecha</option>
        </select>
        ${cfg.personaje ? `<button type="button" class="btn btn--secundario btn--icono" data-quitar-personaje="${screen.id}">Quitar personaje</button>` : ""}
      </div>
    </fieldset>
  `;
}

function attachScreensEditorEvents(container) {
  container.querySelectorAll("[data-fondo-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        GameData.pantallas[input.dataset.fondoFile].fondo = await uploadCardImage(file);
        saveGameData();
        renderScreensEditorView();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll("[data-personaje-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        GameData.pantallas[input.dataset.personajeFile].personaje = await uploadCardImage(file);
        saveGameData();
        renderScreensEditorView();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll("[data-quitar-fondo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      GameData.pantallas[btn.dataset.quitarFondo].fondo = "";
      saveGameData();
      renderScreensEditorView();
    });
  });

  container.querySelectorAll("[data-quitar-personaje]").forEach((btn) => {
    btn.addEventListener("click", () => {
      GameData.pantallas[btn.dataset.quitarPersonaje].personaje = "";
      saveGameData();
      renderScreensEditorView();
    });
  });

  document.getElementById("btn-restaurar-pantallas").addEventListener("click", () => {
    if (!confirm("¿Quitar todos los fondos y personajes configurados?")) return;
    resetScreensToDefault();
    renderScreensEditorView();
  });

  document.getElementById("form-pantallas").addEventListener("submit", (e) => {
    e.preventDefault();
    saveScreensFromForm(e.target);
  });
}

function saveScreensFromForm(form) {
  SCREENS_LIST.forEach((s) => {
    const cfg = GameData.pantallas[s.id];
    const urlFondo = form.querySelector(`[data-fondo-url="${s.id}"]`).value.trim();
    const urlPersonaje = form.querySelector(`[data-personaje-url="${s.id}"]`).value.trim();
    cfg.fondo = urlFondo;
    cfg.personaje = urlPersonaje;
    cfg.posicionPersonaje = form.querySelector(`[data-posicion="${s.id}"]`).value;
  });
  saveGameData();
  alert("Pantallas guardadas.");
  renderScreensEditorView();
}
