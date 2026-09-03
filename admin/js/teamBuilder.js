/**
 * TEAMBUILDER.JS
 * -----------------------------------------------------------------------
 * Permite armar equipos de prueba en el admin para probar combates
 * sin necesidad de tener cartas en la colección del jugador.
 * -----------------------------------------------------------------------
 */

function renderTeamBuilderView() {
  const container = document.getElementById("view-equipos");
  container.innerHTML = `
    <div class="teambuilder">
      <div class="teambuilder__columna">
        <h3>Equipo Jugador</h3>
        <div id="team-jugador-slots"></div>
        <label class="mini-label">Agregar carta (jugador)</label>
        <select class="teampicker__select" id="select-jugador">
          <option value="">— elegir carta —</option>
          ${GameData.cartas.map((c) => `<option value="${c.id}">${c.nombre} (${c.rareza})</option>`).join("")}
        </select>
        <button class="btn" id="btn-agregar-jugador">Agregar al equipo</button>
      </div>

      <div class="teambuilder__columna">
        <h3>Equipo Enemigo</h3>
        <div id="team-enemigo-slots"></div>
        <label class="mini-label">Agregar carta (enemigo)</label>
        <select class="teampicker__select" id="select-enemigo">
          <option value="">— elegir carta —</option>
          ${GameData.cartas.map((c) => `<option value="${c.id}">${c.nombre} (${c.rareza})</option>`).join("")}
        </select>
        <button class="btn" id="btn-agregar-enemigo">Agregar al equipo</button>
      </div>
    </div>

    <div class="teambuilder__acciones">
      <button class="btn btn--titulo" id="btn-iniciar-combate">⚔️ Iniciar Combate</button>
    </div>
  `;

  // Estado local
  const equipoJugador = [];
  const equipoEnemigo = [];

  function renderSlots() {
    const render = (equipo, contenedorId) => {
      const contenedor = document.getElementById(contenedorId);
      contenedor.innerHTML = equipo.map((carta, i) => `
        <div class="teamslot">
          <span class="teamslot__pos">${i === 0 ? "1ª línea" : "Retaguardia"}</span>
          <span>${carta.nombre} (${carta.rareza})</span>
          <button class="btn btn--icono btn--peligro" data-quitar="${i}" data-equipo="${contenedorId}">✕</button>
        </div>
      `).join("");
    };

    render(equipoJugador, "team-jugador-slots");
    render(equipoEnemigo, "team-enemigo-slots");
  }

  function agregarCarta(equipo, selectId) {
    const select = document.getElementById(selectId);
    const cardId = select.value;
    if (!cardId) return;
    const carta = GameData.cartas.find((c) => c.id === cardId);
    if (carta && equipo.length < 4) {
      equipo.push(carta);
      renderSlots();
    }
  }

  document.getElementById("btn-agregar-jugador").addEventListener("click", () => agregarCarta(equipoJugador, "select-jugador"));
  document.getElementById("btn-agregar-enemigo").addEventListener("click", () => agregarCarta(equipoEnemigo, "select-enemigo"));

  document.querySelectorAll("[data-quitar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const equipoId = btn.dataset.equipo;
      const index = Number(btn.dataset.quitar);
      if (equipoId === "team-jugador-slots") equipoJugador.splice(index, 1);
      if (equipoId === "team-enemigo-slots") equipoEnemigo.splice(index, 1);
      renderSlots();
    });
  });

  document.getElementById("btn-iniciar-combate").addEventListener("click", () => {
    if (equipoJugador.length === 0 || equipoEnemigo.length === 0) {
      alert("Ambos equipos deben tener al menos 1 carta.");
      return;
    }
    startCombatFromTeams(equipoJugador, equipoEnemigo);
  });

  renderSlots();
}
