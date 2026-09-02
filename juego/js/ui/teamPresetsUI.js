/**
 * TEAMPRESETSUI.JS
 * -----------------------------------------------------------------------
 * El jugador arma y guarda varios equipos (presets) de hasta 4 cartas,
 * tomadas solo de su colección y solo si no están caídas. Estos presets
 * son los que se eligen al iniciar una run nueva (ver mapUI.js).
 *
 * La armadora se ve como la formación real (1 al frente + 3 en
 * retaguardia) con miniaturas de las cartas ya elegidas, y elegir una
 * carta nueva es tocar su miniatura en una grilla (no un <select>).
 * -----------------------------------------------------------------------
 */

let presetEnEdicion = []; // array de cardIds mientras se arma uno nuevo
let protagonistaEnEdicion = null;
let selectorCartaAbierto = false; // true = mostrar la grilla para agregar carta

const EQUIPO_NOMBRE_ADJETIVOS = [
  "Furia", "Sombra", "Alba", "Ceniza", "Tormenta", "Filo", "Eco", "Bruma",
  "Escarcha", "Ámbar", "Vértigo", "Quimera", "Relámpago", "Ocaso", "Grito",
];
const EQUIPO_NOMBRE_NUCLEOS = [
  "Carmesí", "del Norte", "Errante", "Inmortal", "Salvaje", "Nocturno",
  "de Hierro", "del Abismo", "Silencioso", "Radiante", "Perdido", "Feroz",
];

function generarNombreEquipoAleatorio() {
  const a = EQUIPO_NOMBRE_ADJETIVOS[Math.floor(Math.random() * EQUIPO_NOMBRE_ADJETIVOS.length)];
  const b = EQUIPO_NOMBRE_NUCLEOS[Math.floor(Math.random() * EQUIPO_NOMBRE_NUCLEOS.length)];
  return `${a} ${b}`;
}

function renderPresetsView() {
  const container = document.getElementById("view-equipos");

  const cartasDisponibles = PlayerData.coleccion.filter((id) => !isCardCaida(id) && !presetEnEdicion.includes(id));
  const protagonistas = getAllProtagonists();

  container.innerHTML = `
    ${renderScreenHeader("Tus equipos", "aventura")}
    <div class="presets">
      <div class="presets__existentes">
        <h3>Tus equipos guardados</h3>
        ${
          PlayerData.presets.length === 0
            ? '<p class="empty-hint">Todavía no tienes ningún equipo guardado.</p>'
            : `<div class="presetgrid">${PlayerData.presets.map(renderPresetCard).join("")}</div>`
        }
      </div>

      <div class="teambuilder">
        <h3>Armar equipo nuevo</h3>
        <p class="teambuilder__ayuda">Toca un espacio vacío para elegir una carta. La primera que agregues va a primera línea.</p>

        <div class="teambuilder__formacion">
          <div class="formrow formrow--frente">${renderBuilderSlot(0)}</div>
          <div class="formrow formrow--retaguardia">${renderBuilderSlot(1)}${renderBuilderSlot(2)}${renderBuilderSlot(3)}</div>
        </div>

        ${
          selectorCartaAbierto && presetEnEdicion.length < 4
            ? `
          <div class="cardpicker">
            <div class="cardpicker__header">
              <span>Elige una carta de tu colección</span>
              <button type="button" class="actionsheet__cerrar" id="btn-cerrar-picker">✕</button>
            </div>
            ${
              cartasDisponibles.length === 0
                ? '<p class="empty-hint">No te quedan más cartas disponibles.</p>'
                : `<div class="cardpicker__grid">${cartasDisponibles.map(renderPickerCard).join("")}</div>`
            }
          </div>`
            : ""
        }

        <label class="mini-label">Protagonista (comandante)</label>
        <div class="protopicker">
          <button type="button" class="protopick ${!protagonistaEnEdicion ? "protopick--activo" : ""}" data-protagonista="">
            <span class="protopick__icono">🚫</span>
            <span>Sin protagonista</span>
          </button>
          ${protagonistas
            .map(
              (p) => `
            <button type="button" class="protopick ${protagonistaEnEdicion === p.id ? "protopick--activo" : ""}" data-protagonista="${p.id}">
              ${p.imagen ? `<img class="protopick__img" src="${p.imagen}" alt="" />` : '<span class="protopick__icono">⭐</span>'}
              <span>${getProtagonistCustomization(p.id).apodo || p.nombre}</span>
            </button>`
            )
            .join("")}
        </div>

        <div class="presets__acciones">
          <div class="teambuilder__nombre">
            <input type="text" id="input-nombre-preset" placeholder="Nombre del equipo" />
            <button type="button" class="btn btn--secundario" id="btn-nombre-random" title="Nombre aleatorio">🎲 Aleatorio</button>
          </div>
          <button class="btn" id="btn-guardar-preset" ${presetEnEdicion.length === 0 ? "disabled" : ""}>Guardar equipo</button>
        </div>
      </div>
    </div>
  `;

  attachPresetsEvents(container);
}

function renderBuilderSlot(index) {
  const id = presetEnEdicion[index];
  const esFrente = index === 0;

  if (!id) {
    return `
      <button type="button" class="slotcard slotcard--vacio ${esFrente ? "slotcard--frente" : ""}" data-abrir-picker="${index}">
        <span class="slotcard__mas">+</span>
        <span class="slotcard__etiqueta">${esFrente ? "1ª línea" : "Retaguardia"}</span>
      </button>
    `;
  }

  const carta = GameData.cartas.find((c) => c.id === id);
  if (!carta) return `<div class="slotcard slotcard--vacio">?</div>`;

  return `
    <div class="slotcard slotcard--${carta.rareza} ${esFrente ? "slotcard--frente" : ""}" data-instance-slot="${index}">
      ${carta.imagen ? `<img class="slotcard__img" src="${carta.imagen}" alt="" />` : `<div class="slotcard__sinarte">${carta.nombre[0]}</div>`}
      <span class="slotcard__etiqueta">${esFrente ? "1ª línea" : "Retaguardia"}</span>
      <span class="slotcard__nombre">${carta.nombre}</span>
      <button type="button" class="slotcard__quitar" data-quitar-preset="${id}">✕</button>
    </div>
  `;
}

function renderPickerCard(id) {
  const c = GameData.cartas.find((x) => x.id === id);
  return `
    <button type="button" class="pickcard pickcard--${c.rareza}" data-agregar-preset="${id}">
      ${c.imagen ? `<img class="pickcard__img" src="${c.imagen}" alt="" />` : `<div class="pickcard__sinarte">${c.nombre[0]}</div>`}
      <span class="pickcard__nombre">${c.nombre}</span>
      <span class="pickcard__rareza">${c.rareza}</span>
    </button>
  `;
}

function renderPresetCard(preset) {
  const cartas = preset.cartaIds.map((id) => GameData.cartas.find((x) => x.id === id)).filter(Boolean);
  const protagonista = preset.protagonistaId ? getPersonalizedProtagonist(preset.protagonistaId) : null;
  return `
    <div class="presetcard">
      <strong>${preset.nombre}</strong>
      <div class="presetcard__miniaturas">
        ${cartas
          .map(
            (c) => `
          <div class="presetmini presetmini--${c.rareza}" title="${c.nombre}">
            ${c.imagen ? `<img src="${c.imagen}" alt="${c.nombre}" />` : `<span>${c.nombre[0]}</span>`}
          </div>`
          )
          .join("")}
      </div>
      ${protagonista ? `<p class="hint">⭐ ${protagonista.nombre}</p>` : ""}
      <button class="btn btn--peligro btn--icono" data-borrar-preset="${preset.id}">Borrar</button>
    </div>
  `;
}

function attachPresetsEvents(container) {
  attachScreenHeaderEvents(container);

  container.querySelectorAll("[data-abrir-picker]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectorCartaAbierto = true;
      renderPresetsView();
    });
  });

  const btnCerrarPicker = container.querySelector("#btn-cerrar-picker");
  if (btnCerrarPicker) btnCerrarPicker.addEventListener("click", () => {
    selectorCartaAbierto = false;
    renderPresetsView();
  });

  container.querySelectorAll("[data-agregar-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      presetEnEdicion.push(btn.dataset.agregarPreset);
      selectorCartaAbierto = false;
      renderPresetsView();
    });
  });

  container.querySelectorAll("[data-quitar-preset]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      presetEnEdicion = presetEnEdicion.filter((id) => id !== btn.dataset.quitarPreset);
      renderPresetsView();
    });
  });

  container.querySelectorAll("[data-protagonista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      protagonistaEnEdicion = btn.dataset.protagonista || null;
      renderPresetsView();
    });
  });

  const btnNombreRandom = container.querySelector("#btn-nombre-random");
  if (btnNombreRandom) btnNombreRandom.addEventListener("click", () => {
    container.querySelector("#input-nombre-preset").value = generarNombreEquipoAleatorio();
  });

  const btnGuardar = container.querySelector("#btn-guardar-preset");
  if (btnGuardar) btnGuardar.addEventListener("click", () => {
    const nombre = container.querySelector("#input-nombre-preset").value.trim() || generarNombreEquipoAleatorio();
    savePreset(nombre, presetEnEdicion, protagonistaEnEdicion);
    presetEnEdicion = [];
    protagonistaEnEdicion = null;
    selectorCartaAbierto = false;
    renderPresetsView();
  });

  container.querySelectorAll("[data-borrar-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deletePreset(btn.dataset.borrarPreset);
      renderPresetsView();
    });
  });
}
