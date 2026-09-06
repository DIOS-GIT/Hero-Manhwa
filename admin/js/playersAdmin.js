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
                ${j.nombre ? `<strong>${j.nombre}</strong>` : `<strong>${j.email || "(sin datos)"}</strong>`}
              </span>
              <span class="cardlist__clase">🪙 ${j.moneda ?? 0}</span>
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
  const coleccionActual = new Set(jugador.coleccion || []);
  const cartasPorRareza = {};
  (GameData.cartas || []).forEach((c) => {
    if (!cartasPorRareza[c.rareza]) cartasPorRareza[c.rareza] = [];
    cartasPorRareza[c.rareza].push(c);
  });
  const ordenRarezas = ["comun", "rara", "epica", "legendaria", "mitica"];

  const listaCartasHtml = ordenRarezas
    .filter((r) => cartasPorRareza[r] && cartasPorRareza[r].length)
    .map(
      (r) => `
      <div class="playercards__grupo">
        <p class="playercards__rareza playercards__rareza--${r}">${r}</p>
        ${cartasPorRareza[r]
          .map(
            (c) => `
          <label class="playercards__item">
            <input type="checkbox" name="carta-${c.id}" value="${c.id}" ${coleccionActual.has(c.id) ? "checked" : ""} />
            ${c.nombre}
          </label>
        `
          )
          .join("")}
      </div>
    `
    )
    .join("");

  return `
    <form id="form-jugador" class="cardform">
      <h3>${jugador.nombre || jugador.email}</h3>
      <p class="hint">${jugador.email}</p>

      <label>Nombre / Apodo
        <input type="text" name="nombre" value="${jugador.nombre || ""}" />
      </label>

      <label>Moneda
        <input type="number" name="moneda" value="${jugador.moneda ?? 0}" min="0" />
      </label>

      <fieldset>
        <legend>Colección — marca las cartas que debería tener este jugador</legend>
        <div class="playercards">
          ${listaCartasHtml || '<p class="empty-hint">No hay cartas cargadas todavía en Cartas.</p>'}
        </div>
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
    jugador.coleccion = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);

    const btnGuardar = form.querySelector('button[type="submit"]');
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando…";

    try {
      await firestoreDb.collection("players").doc(jugador.id).set(jugador, { merge: true });
      alert("Datos del jugador guardados.");
      renderPlayersAdminView();
    } catch (err) {
      console.error("No se pudo guardar el jugador:", err);
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar cambios";
      if (err.code === "permission-denied") {
        alert(
          "Firestore rechazó el guardado por permisos. Las reglas de Firestore tienen que dejar que un admin " +
          "escriba en players/{uid} de otro usuario, no solo el dueño. Revisa DEPLOY.md, sección de reglas."
        );
      } else {
        alert("No se pudo guardar: " + (err.message || "error desconocido"));
      }
    }
  });

  const btnBorrar = container.querySelector("#btn-borrar-jugador");
  if (btnBorrar) btnBorrar.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta cuenta de jugador? Esto no se puede deshacer.")) return;
    try {
      await firestoreDb.collection("players").doc(playersAdminState.jugadorId).delete();
      alert(
        "Se borraron los datos del jugador en Firestore. Su cuenta de acceso (email + contraseña) sigue existiendo " +
        "en Authentication — para borrarla también, hazlo desde la consola de Firebase → Authentication (el SDK del " +
        "navegador no puede borrar la cuenta de otro usuario, solo la del que está logueado)."
      );
      playersAdminState.jugadorId = null;
      playersAdminState.borrador = null;
      renderPlayersAdminView();
    } catch (err) {
      console.error("No se pudo borrar el jugador:", err);
      alert("No se pudo borrar: " + (err.message || "error desconocido"));
    }
  });
}
