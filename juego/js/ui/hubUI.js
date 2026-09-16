/**
 * HUBUI.JS
 * -----------------------------------------------------------------------
 * Pantalla principal tras "Comenzar/Continuar". Reemplaza a la vieja
 * fila de sub-pestañas: ahora cada sección (Colección, Protagonistas,
 * Tienda, Historial) es un botón grande que abre su propia pantalla
 * completa. Equipos ya no vive aquí — se gestiona dentro del flujo de
 * "Iniciar Aventura" (ver mapUI.js / teamPresetsUI.js).
 * -----------------------------------------------------------------------
 */

function renderHubView() {
  const container = document.getElementById("view-hub");

  const ultimoPreset = PlayerData.ultimoPresetId
    ? PlayerData.presets.find((p) => p.id === PlayerData.ultimoPresetId)
    : null;
  const hayRunActiva = !!(activeRun && !activeRun.finalizada);

  container.innerHTML = `
    ${renderHubHeader()}
    ${hayRunActiva ? renderRunEnProgresoBanner() : ""}
    ${ultimoPreset ? renderTeamPreviewCard(ultimoPreset) : ""}

    <div class="hubgrid">
      <button type="button" class="hubtile" data-hub-nav="coleccion">
        <span class="hubtile__icono">🃏</span>
        <span class="hubtile__label">Colección</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="protagonistas">
        <span class="hubtile__icono">⭐</span>
        <span class="hubtile__label">Protagonistas</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="tienda">
        <span class="hubtile__icono">🏪</span>
        <span class="hubtile__label">Tienda</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="historial">
        <span class="hubtile__icono">📜</span>
        <span class="hubtile__label">Historial</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="perfil">
        <span class="hubtile__icono">👤</span>
        <span class="hubtile__label">Perfil</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="cofres">
        <span class="hubtile__icono">🎁</span>
        <span class="hubtile__label">Cofres</span>
        ${(PlayerData.cofres || []).length > 0 ? `<span class="hubtile__badge">${PlayerData.cofres.length}</span>` : ""}
      </button>
      <button type="button" class="hubtile" data-hub-nav="logros">
        <span class="hubtile__icono">🏆</span>
        <span class="hubtile__label">Logros</span>
        ${countClaimableAchievements() > 0 ? `<span class="hubtile__badge">${countClaimableAchievements()}</span>` : ""}
      </button>
      <button type="button" class="hubtile" data-hub-nav="ranking">
        <span class="hubtile__icono">📊</span>
        <span class="hubtile__label">Ranking</span>
      </button>
      ${
        getActiveEvent()
          ? `<button type="button" class="hubtile hubtile--evento" data-hub-nav="evento">
              <span class="hubtile__icono">🌟</span>
              <span class="hubtile__label">Evento</span>
            </button>`
          : ""
      }
      <button type="button" class="hubtile" data-hub-nav="pvp">
        <span class="hubtile__icono">⚔️</span>
        <span class="hubtile__label">PvP</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="amigos">
        <span class="hubtile__icono">👥</span>
        <span class="hubtile__label">Amigos</span>
      </button>
      <button type="button" class="hubtile" data-hub-nav="correo">
        <span class="hubtile__icono">✉️</span>
        <span class="hubtile__label">Correo</span>
        ${getUnclaimedMail().length > 0 ? `<span class="hubtile__badge">${getUnclaimedMail().length}</span>` : ""}
      </button>
    </div>

    <button type="button" class="btn btn--aventura" id="btn-iniciar-aventura">
      ⚔️ ${hayRunActiva ? "Continuar aventura" : "Iniciar Aventura"}
    </button>
  `;

  staggerIn(container, ".hubtile", 45);
  animateCounter(container.querySelector(".hubheader__moneda span"), PlayerData.moneda, "moneda-hub");

  container.querySelectorAll("[data-hub-nav]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.hubNav));
  });

  container.querySelector("#btn-iniciar-aventura").addEventListener("click", () => showView("aventura"));

  const btnCancelarAventura = container.querySelector("#btn-cancelar-aventura");
  if (btnCancelarAventura) {
    btnCancelarAventura.addEventListener("click", (e) => {
      e.stopPropagation();
      const confirmado = confirm(
        "¿Cancelar esta aventura? Perderás el progreso de esta run (nodo alcanzado y cualquier objeto ganado en el camino) " +
        "y NO recibirás ninguna recompensa. Las cartas y el nivel que ya tenías antes de empezar no se pierden."
      );
      if (!confirmado) return;
      clearActiveRun();
      renderHubView();
    });
  }
}

function renderHubHeader() {
  const victorias = PlayerData.historial.filter((h) => h.resultado === "victoria").length;
  return `
    <div class="hubheader">
      <div class="hubheader__moneda">🪙 <span>${PlayerData.moneda}</span></div>
      <div class="hubheader__stats">
        <span>${PlayerData.coleccion.length}/${GameData.cartas.length} cartas</span>
        <span>${victorias} victorias</span>
      </div>
    </div>
  `;
}

function renderRunEnProgresoBanner() {
  const nodos = activeRun.estadisticas.nodosAlcanzados;
  return `
    <div class="runbanner">
      <span class="runbanner__icono">⚔️</span>
      <div class="runbanner__texto">
        <strong>Tienes una aventura en progreso</strong>
        <p>Llegaste al nodo ${nodos}. Toca "Continuar aventura" para seguir.</p>
      </div>
      <button type="button" class="runbanner__cancelar" id="btn-cancelar-aventura" title="Cancelar aventura">Cancelar</button>
    </div>
  `;
}

function renderTeamPreviewCard(preset) {
  const cartas = preset.cartaIds
    .map((id) => GameData.cartas.find((c) => c.id === id))
    .filter(Boolean);
  const protagonista = preset.protagonistaId ? getPersonalizedProtagonist(preset.protagonistaId) : null;

  return `
    <div class="teampreview">
      <div class="teampreview__label">Tu equipo actual — ${preset.nombre} <span class="teampreview__cp">⚡ ${getTeamCombatPower(preset.cartaIds)}</span></div>
      <div class="teampreview__cartas">
        ${cartas
          .map(
            (c) => `
          <div class="teampreview__carta">
            ${c.imagen ? `<img src="${c.imagen}" alt="${c.nombre}" />` : `<div class="teampreview__placeholder">${c.nombre[0]}</div>`}
          </div>
        `
          )
          .join("")}
      </div>
      ${protagonista ? `<div class="teampreview__protagonista">⭐ ${protagonista.nombre}</div>` : ""}
    </div>
  `;
}

/* =======================================================================
   PERFIL
   ======================================================================= */

const COLORES_AVATAR = ["#d9a441", "#e0473f", "#4f8fe0", "#4fae6a", "#a463e0", "#e08fc4"];
const COLORES_NOMBRE = ["#e8e8ee", "#d9a441", "#e0473f", "#4f8fe0", "#4fae6a", "#a463e0", "#ffd76a"];

function renderProfileView() {
  const container = document.getElementById("view-perfil");
  const nombre = PlayerData.nombre || "Jugador";
  const colorAvatar = PlayerData.avatarColor || "#d9a441";
  const fechaCuenta = PlayerData.creadoEn
    ? new Date(PlayerData.creadoEn).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
    : null;

  container.innerHTML = `
    ${renderScreenHeader("Perfil", "hub")}
    <div class="profile">
      <div class="profile__avatar" id="profile-avatar" style="${PlayerData.avatarImagen ? "" : `background:${colorAvatar}`}">
        ${PlayerData.avatarImagen ? `<img src="${PlayerData.avatarImagen}" alt="Foto de perfil" />` : nombre[0].toUpperCase()}
      </div>

      <div class="profile__fotoacciones">
        <label class="btn btn--secundario btn--pequeno" for="input-foto-perfil">Subir foto</label>
        <input type="file" id="input-foto-perfil" accept="image/*" style="display:none" />
        ${PlayerData.avatarImagen ? '<button type="button" class="btn btn--peligro btn--pequeno" id="btn-quitar-foto-perfil">Quitar foto</button>' : ""}
      </div>

      <div class="profile__colores" id="profile-colores">
        ${COLORES_AVATAR.map(
          (c) => `<button type="button" class="profile__colorbtn ${c === colorAvatar ? "profile__colorbtn--activo" : ""}" data-color="${c}" style="background:${c}"></button>`
        ).join("")}
      </div>
      <p class="hint profile__coloreshint">${PlayerData.avatarImagen ? "El color de abajo se usa si quitas la foto." : "Color del círculo (si no subes foto)"}</p>

      <div class="profile__campos">
        <fieldset>
          <legend>Cuenta</legend>
          <label>Correo
            <input type="text" value="${currentUser?.email || "Sin cuenta"}" disabled />
          </label>
          ${
            PlayerData.playerId
              ? `<label>Tu ID (para que tus amigos te agreguen)
                  <div class="profile__idrow">
                    <input type="text" value="#${PlayerData.playerId}" disabled />
                    <button type="button" class="btn btn--secundario btn--pequeno" id="btn-copiar-id">Copiar</button>
                  </div>
                </label>`
              : ""
          }
          ${fechaCuenta ? `<p class="hint">Jugando desde el ${fechaCuenta}</p>` : ""}
        </fieldset>

        <fieldset>
          <legend>Apodo público</legend>
          <label>Apodo (3 a 20 caracteres, único)
            <input type="text" id="input-nombre-perfil" value="${nombre}" maxlength="20" />
          </label>
          <div id="perfil-apodo-error" class="loginbox__error" style="display:none"></div>
          <button class="btn" id="btn-guardar-perfil">Guardar apodo</button>

          <label class="mini-label" style="margin-top:12px;">Color del apodo</label>
          <div class="profile__colores" id="profile-colores-nombre">
            ${COLORES_NOMBRE.map(
              (c) => `<button type="button" class="profile__colorbtn ${(PlayerData.colorNombre || COLORES_NOMBRE[0]) === c ? "profile__colorbtn--activo" : ""}" data-color-nombre="${c}" style="background:${c}"></button>`
            ).join("")}
          </div>
          <p class="hint" style="margin-top:6px;">Vista previa: <strong style="color:${PlayerData.colorNombre || "inherit"}">${nombre}</strong></p>
        </fieldset>

        <fieldset>
          <legend>Contraseña</legend>
          <label>Nueva contraseña
            <input type="password" id="input-nueva-password" placeholder="Al menos 6 caracteres" />
          </label>
          <div id="perfil-password-error" class="loginbox__error" style="display:none"></div>
          <button class="btn btn--secundario" id="btn-cambiar-password">Cambiar contraseña</button>
        </fieldset>
      </div>

      <div class="profile__cerrar">
        <button class="btn btn--peligro" id="btn-cerrar-sesion-perfil">Cerrar sesión</button>
      </div>
    </div>
  `;

  attachScreenHeaderEvents(container);

  document.getElementById("profile-colores").addEventListener("click", async (e) => {
    const btn = e.target.closest(".profile__colorbtn");
    if (!btn) return;
    PlayerData.avatarColor = btn.dataset.color;
    await savePlayerData();
    renderProfileView();
  });

  const btnCopiarId = document.getElementById("btn-copiar-id");
  if (btnCopiarId) btnCopiarId.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(`#${PlayerData.playerId}`);
      btnCopiarId.textContent = "¡Copiado!";
      setTimeout(() => { btnCopiarId.textContent = "Copiar"; }, 1500);
    } catch (err) {
      alert(`Tu ID es #${PlayerData.playerId}`);
    }
  });

  document.getElementById("input-foto-perfil").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      PlayerData.avatarImagen = await uploadCardImage(file);
      await savePlayerData();
      renderProfileView();
    } catch (err) {
      alert("No se pudo subir la foto: " + (err.message || "error desconocido"));
    }
  });

  const btnQuitarFoto = document.getElementById("btn-quitar-foto-perfil");
  if (btnQuitarFoto) btnQuitarFoto.addEventListener("click", async () => {
    PlayerData.avatarImagen = null;
    await savePlayerData();
    renderProfileView();
  });

  document.getElementById("profile-colores-nombre").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-color-nombre]");
    if (!btn) return;
    PlayerData.colorNombre = btn.dataset.colorNombre;
    await savePlayerData();
    renderProfileView();
  });

  document.getElementById("btn-guardar-perfil").addEventListener("click", async () => {
    const errorBox = document.getElementById("perfil-apodo-error");
    const nuevoNombre = document.getElementById("input-nombre-perfil").value.trim();
    errorBox.style.display = "none";

    if (!nuevoNombre) {
      errorBox.textContent = "Escribe un apodo válido.";
      errorBox.style.display = "block";
      return;
    }
    if (nuevoNombre.toLowerCase() === (PlayerData.nombreLower || "")) {
      return; // no cambió nada
    }

    const btnGuardar = document.getElementById("btn-guardar-perfil");
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Verificando…";
    const resultado = await claimNickname(nuevoNombre);
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Guardar apodo";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }

    PlayerData.nombre = nuevoNombre;
    PlayerData.nombreLower = nuevoNombre.toLowerCase();
    await savePlayerData();
    renderProfileView();
  });

  document.getElementById("btn-cambiar-password").addEventListener("click", async () => {
    const errorBox = document.getElementById("perfil-password-error");
    const nuevaPassword = document.getElementById("input-nueva-password").value;
    errorBox.style.display = "none";

    const btnPassword = document.getElementById("btn-cambiar-password");
    btnPassword.disabled = true;
    btnPassword.textContent = "Cambiando…";
    const resultado = await changeOwnPassword(nuevaPassword);
    btnPassword.disabled = false;
    btnPassword.textContent = "Cambiar contraseña";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }
    document.getElementById("input-nueva-password").value = "";
    alert("Contraseña actualizada.");
  });

  document.getElementById("btn-cerrar-sesion-perfil").addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres cerrar sesión?")) return;
    await logout();
    PlayerData = {
      moneda: ECONOMY_CONFIG.monedaInicial,
      coleccion: [],
      cartasCaidas: [],
      presets: [],
      ultimoPresetId: null,
      historial: [],
      progresoCartas: {},
      progresoHistoria: { capituloIndex: 0, escenaIndex: 0 },
      personalizacionProtagonistas: {},
      fragmentosCartas: {},
      yaTuvoPrimeraTirada: false,
    };
    clearActiveRun();
    document.getElementById("game-shell").style.display = "none";
    document.getElementById("titlescreen").style.display = "flex";
    renderTitleScreenPanel();
  });
}
