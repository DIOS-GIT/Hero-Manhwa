/**
 * PROTAGONISTSUI.JS
 * -----------------------------------------------------------------------
 * Galería de protagonistas disponibles — a diferencia de la Colección,
 * aquí no hay "bloqueados": los protagonistas siempre están disponibles
 * (no se consiguen por gacha, son comandantes, no coleccionables). Se
 * eligen al armar un equipo en la pestaña "Equipos".
 * -----------------------------------------------------------------------
 */

function renderProtagonistsView() {
  const container = document.getElementById("view-protagonistas");
  const protagonistas = getAllProtagonists();

  container.innerHTML = `
    ${renderScreenHeader("Protagonistas", "hub")}
    <div class="protagonists">
      <p class="hint">Elige tu protagonista al armar un equipo, dentro de "Iniciar Aventura". Su activa única se puede usar una vez por combate, sin ocupar un puesto en la formación.</p>
      <div class="protagonists__grid">
        ${protagonistas.map(renderProtagonistCard).join("") || '<p class="empty-hint">Todavía no hay protagonistas cargados.</p>'}
      </div>
    </div>
  `;
  attachScreenHeaderEvents(container);
  attachProtagonistCustomizationEvents(container);
}

function attachProtagonistCustomizationEvents(container) {
  container.querySelectorAll(".protagonistcard__apodo").forEach((input) => {
    input.addEventListener("change", () => {
      setProtagonistApodo(input.dataset.protagonistaId, input.value);
      renderProtagonistsView();
    });
  });

  container.querySelectorAll(".protagonistcard__variante").forEach((select) => {
    select.addEventListener("change", () => {
      setProtagonistVariante(select.dataset.protagonistaId, Number(select.value));
      renderProtagonistsView();
    });
  });
}

function renderProtagonistCard(p) {
  const custom = getProtagonistCustomization(p.id);
  const variantes = p.variantes || [];

  return `
    <div class="protagonistcard">
      ${p.imagen ? `<img class="protagonistcard__img" src="${p.imagen}" alt="${p.nombre}" />` : ""}
      <div class="protagonistcard__nombre">${custom.apodo || p.nombre}</div>
      <div class="protagonistcard__arquetipo">${p.arquetipo}</div>
      <p class="protagonistcard__descripcion">${p.descripcion}</p>

      <label class="mini-label">Apodo (opcional, solo para vos)
        <input type="text" class="protagonistcard__apodo" data-protagonista-id="${p.id}" placeholder="${p.nombre}" value="${custom.apodo || ""}" maxlength="24" />
      </label>

      <div class="protagonistcard__activa">
        <strong>⭐ ${custom.varianteIndex >= 0 && variantes[custom.varianteIndex] ? variantes[custom.varianteIndex].nombre : p.activaUnica.nombre}</strong>
        <p>${custom.varianteIndex >= 0 && variantes[custom.varianteIndex] ? variantes[custom.varianteIndex].descripcion : p.activaUnica.descripcion}</p>
      </div>

      ${
        variantes.length > 0
          ? `
        <label class="mini-label">Variante de la activa
          <select class="protagonistcard__variante" data-protagonista-id="${p.id}">
            <option value="-1" ${custom.varianteIndex < 0 ? "selected" : ""}>${p.activaUnica.nombre} (por defecto)</option>
            ${variantes.map((v, i) => `<option value="${i}" ${custom.varianteIndex === i ? "selected" : ""}>${v.nombre}</option>`).join("")}
          </select>
        </label>
      `
          : ""
      }
    </div>
  `;
}
