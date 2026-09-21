/**
 * FRIENDSUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Amigos" del hub: tu ID para compartir, agregar por ID,
 * solicitudes pendientes, lista de amigos (con botón de regalar) y
 * bandeja de regalos recibidos sin reclamar.
 * -----------------------------------------------------------------------
 */

let friendsCache = { amigos: [], solicitudes: [], regalos: [] };
let regaloParaAmigo = null; // { uid, nombre } mientras el formulario de regalo está abierto

async function renderFriendsView() {
  const container = document.getElementById("view-amigos");

  if (!firebaseEnabled) {
    container.innerHTML = `
      ${renderScreenHeader("Amigos", "hub")}
      <p class="empty-hint">Los amigos necesitan conexión — estás jugando en modo 100% local.</p>
    `;
    attachScreenHeaderEvents(container);
    return;
  }

  container.innerHTML = `
    ${renderScreenHeader("Amigos", "hub")}
    <div class="friendsview">
      <div class="friendsid">
        <p class="hint">Tu ID — compártelo para que te agreguen</p>
        <strong class="friendsid__codigo">#${PlayerData.playerId || "..."}</strong>
      </div>

      <div class="pvpretar">
        <h4>Agregar amigo por ID</h4>
        <input type="text" id="input-id-amigo" placeholder="Ej: A7K2P9" maxlength="7" />
        <button class="btn btn--titulo" id="btn-enviar-solicitud">Enviar solicitud</button>
        <div id="friends-error" class="loginbox__error" style="display:none"></div>
      </div>

      <div class="pvpretos">
        <h4>Regalos recibidos</h4>
        <div id="friends-regalos"><p class="hint">Cargando…</p></div>
      </div>

      <div class="pvpretos">
        <h4>Solicitudes de amistad</h4>
        <div id="friends-solicitudes"><p class="hint">Cargando…</p></div>
      </div>

      <div class="pvpretos">
        <h4>Tus amigos</h4>
        <div id="friends-lista"><p class="hint">Cargando…</p></div>
      </div>
    </div>
  `;

  attachScreenHeaderEvents(container);

  const btnSolicitud = container.querySelector("#btn-enviar-solicitud");
  btnSolicitud.addEventListener("click", async () => {
    const errorBox = document.getElementById("friends-error");
    errorBox.style.display = "none";
    btnSolicitud.disabled = true;
    btnSolicitud.textContent = "Enviando…";

    const resultado = await sendFriendRequest(document.getElementById("input-id-amigo").value);
    btnSolicitud.disabled = false;
    btnSolicitud.textContent = "Enviar solicitud";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }
    document.getElementById("input-id-amigo").value = "";
    showToast(`Solicitud enviada a ${resultado.nombre}.`, "exito");
  });

  cargarYRenderizarAmigos();
}

async function cargarYRenderizarAmigos() {
  const [amigos, solicitudes, regalos] = await Promise.all([fetchFriends(), fetchFriendRequests(), fetchPendingGifts()]);
  friendsCache = { amigos, solicitudes, regalos };

  const contRegalos = document.getElementById("friends-regalos");
  const contSolicitudes = document.getElementById("friends-solicitudes");
  const contLista = document.getElementById("friends-lista");
  if (!contRegalos || !contSolicitudes || !contLista) return; // el jugador ya navegó a otra pantalla

  // ---- Regalos recibidos ----
  contRegalos.innerHTML =
    regalos.length === 0
      ? '<p class="empty-hint">No tienes regalos sin reclamar.</p>'
      : regalos
          .map(
            (r) => `
      <div class="pvpretocard">
        <span><strong>${r.de.nombre}</strong> te mandó ${r.tipo === "creditos" ? `🪙 ${r.cantidad}` : `🧩 ${r.cantidad} fragmentos`}</span>
        <button type="button" class="btn btn--pequeno" data-reclamar-regalo="${r.id}">Reclamar</button>
      </div>
    `
          )
          .join("");

  // ---- Solicitudes ----
  contSolicitudes.innerHTML =
    solicitudes.length === 0
      ? '<p class="empty-hint">No tienes solicitudes pendientes.</p>'
      : solicitudes
          .map(
            (s) => `
      <div class="pvpretocard">
        <span><strong>${s.de.nombre}</strong> (#${s.de.playerId || "?"}) quiere ser tu amigo</span>
        <div class="pvpretocard__botones">
          <button type="button" class="btn btn--pequeno" data-aceptar-amigo="${s.id}" data-uid="${s.de.uid}">Aceptar</button>
          <button type="button" class="btn btn--secundario btn--pequeno" data-rechazar-amigo="${s.id}">Rechazar</button>
        </div>
      </div>
    `
          )
          .join("");

  // ---- Lista de amigos ----
  contLista.innerHTML =
    amigos.length === 0
      ? '<p class="empty-hint">Todavía no tienes amigos agregados.</p>'
      : amigos
          .map((a) => {
            const espera = horasRestantesParaRegalar(a.uid);
            return `
        <div class="friendcard">
          <div class="friendcard__info">
            <strong>${a.nombre}</strong>
            ${a.rangoPvp ? `<span class="hint">🏅 ${a.rangoPvp}</span>` : ""}
          </div>
          <div class="pvpretocard__botones">
            <button type="button" class="btn btn--pequeno" data-regalar="${a.uid}" data-nombre="${a.nombre}" ${espera !== null ? "disabled" : ""}>
              ${espera !== null ? `Regalar (${espera}h)` : "Regalar"}
            </button>
            <button type="button" class="btn btn--secundario btn--pequeno" data-eliminar-amigo="${a.uid}">Quitar</button>
          </div>
        </div>
      `;
          })
          .join("");

  staggerIn(document.getElementById("friends-lista"), ".friendcard", 40);
  attachFriendsListEvents();
}

function attachFriendsListEvents() {
  document.querySelectorAll("[data-reclamar-regalo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const regalo = friendsCache.regalos.find((r) => r.id === btn.dataset.reclamarRegalo);
      if (!regalo) return;

      let cartaId = null;
      if (regalo.tipo === "fragmentos") {
        if (PlayerData.coleccion.length === 0) {
          alert("Necesitas tener al menos una carta para recibir fragmentos.");
          return;
        }
        cartaId = pedirCartaParaFragmentos();
        if (!cartaId) return;
      }

      const resultado = await claimGift(regalo, cartaId);
      if (!resultado.ok) {
        showToast(resultado.motivo, "error");
        return;
      }
      burstConfetti(btn);
      if (typeof sfxMoneda === "function") sfxMoneda();
      showToast(`¡Recibiste ${regalo.tipo === "creditos" ? `🪙 ${regalo.cantidad}` : `🧩 ${regalo.cantidad} fragmentos`} de ${regalo.de.nombre}!`, "exito");
      setTimeout(() => cargarYRenderizarAmigos(), 450);
    });
  });

  document.querySelectorAll("[data-aceptar-amigo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await acceptFriendRequest(btn.dataset.aceptarAmigo, btn.dataset.uid);
      cargarYRenderizarAmigos();
    });
  });

  document.querySelectorAll("[data-rechazar-amigo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await declineFriendRequest(btn.dataset.rechazarAmigo);
      cargarYRenderizarAmigos();
    });
  });

  document.querySelectorAll("[data-eliminar-amigo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Quitar a este amigo?")) return;
      await removeFriend(btn.dataset.eliminarAmigo);
      cargarYRenderizarAmigos();
    });
  });

  document.querySelectorAll("[data-regalar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirFormularioRegalo(btn.dataset.regalar, btn.dataset.nombre));
  });
}

/** Elige a qué carta van unos fragmentos recibidos (los fragmentos son por carta). */
function pedirCartaParaFragmentos() {
  const opciones = PlayerData.coleccion
    .map((id, i) => {
      const carta = GameData.cartas.find((c) => c.id === id);
      return carta ? `${i + 1}. ${carta.nombre}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const elegido = prompt(`¿A qué carta quieres darle los fragmentos?\n\n${opciones}\n\nEscribe el número:`);
  if (!elegido) return null;
  const indice = Number(elegido) - 1;
  return PlayerData.coleccion[indice] || null;
}

function abrirFormularioRegalo(amigoUid, amigoNombre) {
  const tipo = confirm(`Regalo para ${amigoNombre}:\n\nAceptar = créditos (máx 500)\nCancelar = fragmentos (máx 10)`)
    ? "creditos"
    : "fragmentos";
  const max = LIMITE_REGALO[tipo].max;
  const cantidad = prompt(`¿Cuántos ${LIMITE_REGALO[tipo].etiqueta} le mandas? (máximo ${max})`, max);
  if (cantidad === null) return;

  sendGift(amigoUid, amigoNombre, tipo, cantidad).then((resultado) => {
    if (!resultado.ok) {
      showToast(resultado.motivo, "error");
      return;
    }
    showToast(`¡Regalo enviado a ${amigoNombre}!`, "exito");
    cargarYRenderizarAmigos();
  });
}
