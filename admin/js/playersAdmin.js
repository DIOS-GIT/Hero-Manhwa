/**
 * PLAYERSADMIN.JS
 * -----------------------------------------------------------------------
 * Pantalla de admin para gestionar jugadores registrados:
 * - Ver lista de todos los jugadores
 * - Ver datos de un jugador
 * - Modificar moneda, cartas, etc.
 * - Cambiar contraseña
 * - Eliminar cuenta
 * -----------------------------------------------------------------------
 */

let playersAdminState = {
  jugadorId: null, // id del jugador seleccionado
  borrador: null, // copia de trabajo del jugador
};

async function renderPlayersAdminView() {
  const container = document.getElementById("view-jugadores");
  const jugadores = await fetchAllPlayers();

  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-layout__lista">
        <h3>Jugadores (${jugadores.length})</h3>
        <div class="cardlist">
          ${jugadores.map((j) => `
            <div class="cardlist__item" data-jugador-id="${j.id}">
              <span class="cardlist__nombregrupo">
                ${j.nombre ? `<strong>${j.nombre}</strong>` : `<strong>${j.email}</strong>`}
              </span>
              <span class="cardlist__clase">🪙 ${j.moneda}</span>
            </div>
          `).join("") || '<p class="empty-hint">No hay jugadores registrados.</p>'}
        </div>
      </div>

      <div class="admin-layout__form">
        ${playersAdminState.borrador ? renderPlayerForm(playersAdminState.borrador) : '<p class="empty-hint">Selecciona un jugador para ver/modificar sus datos.</p>'}
      </div>
    </div>
  `;

  attachPlayersAdminEvents(container);
}

async function fetchAllPlayers() {
  if (!firebaseEnabled) return [];
  try {
    const snapshot = await firestoreDb.collection("players").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("No se pudo leer la lista de jugadores:", err);
    return [];
  }
}

function renderPlayerForm(jugador) {
  return `
    <form id="form-jugador" class="cardform">
      <h3>${jugador.nombre || jugador.email}</h3>
      <p class="hint">${jugador.email}</p>

      <label>Nombre / Apodo
        <input type="text" name="nombre" value="${jugador.nombre || ""}" />
      </label>

      <label>Moneda
        <input type="number" name="moneda" value="${jugador.moneda}" min="0" />
      </label>

      <fieldset>
        <legend>Colección (IDs de cartas separados por coma)</legend>
        <textarea name="coleccion" rows="3">${(jugador.coleccion || []).join(", ")}</textarea>
      </fieldset>

      <fieldset>
        <legend>Cambiar contraseña (opcional)</legend>
        <label>Nueva contraseña
          <input type="password" name="nuevaPassword" placeholder="Dejar vacío para no cambiar" />
        </label>
      </fieldset>

      <div class="cardform__acciones">
        <button type="submit" class="btn">Guardar cambios</button>
        <button type="button" class="btn btn--peligro" id="btn-borrar-jugador">Eliminar cuenta</button>
      </div>
    </form>
  `;
}

function attachPlayersAdminEvents(container) {
  container.querySelectorAll("[data-jugador-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = el.dataset.jugadorId;
      const doc = await firestoreDb.collection("players").doc(id).get();
      playersAdminState.jugadorId = id;
      playersAdminState.borrador = { id, ...doc.data() };
      renderPlayersAdminView();
    });
  });

  const form = container.querySelector("#form-jugador");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const jugador = playersAdminState.borrador;
    jugador.nombre = form.elements["nombre"].value.trim();
    jugador.moneda = Number(form.elements["moneda"].value) || 0;
    jugador.coleccion = form.elements["coleccion"].value.split(",").map((s) => s.trim()).filter(Boolean);

    await firestoreDb.collection("players").doc(jugador.id).set(jugador);
    alert("Datos del jugador guardados.");
    renderPlayersAdminView();
  });

  const btnBorrar = container.querySelector("#btn-borrar-jugador");
  if (btnBorrar) btnBorrar.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta cuenta de jugador? Esto no se puede deshacer.")) return;
    await firestoreDb.collection("players").doc(playersAdminState.jugadorId).delete();
    await firebase.auth().currentUser.delete();
    playersAdminState.jugadorId = null;
    playersAdminState.borrador = null;
    renderPlayersAdminView();
    alert("Cuenta eliminada.");
  });
}
