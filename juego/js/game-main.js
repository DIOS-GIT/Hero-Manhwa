/**
 * GAME-MAIN.JS
 * -----------------------------------------------------------------------
 * Punto de entrada del juego. Controla:
 *   1) La pantalla de título: resumen de progreso o bienvenida.
 *   2) El sistema de login/registro de jugadores.
 *   3) Dentro del juego, showView(nombre) alterna entre todas las
 *      pantallas.
 * -----------------------------------------------------------------------
 */

const VISTAS_JUEGO = ["hub", "coleccion", "protagonistas", "tienda", "historial", "equipos", "aventura", "combate", "perfil", "cofres", "logros", "ranking", "evento", "pvp"];
let ultimoResultadoRacha = null; // ver dailyStreak.js — se muestra una vez en la pantalla de título

/**
 * Aplica el fondo y el personaje ilustrado configurados en el admin
 * (pestaña "Pantallas") para la pantalla `nombre`.
 */
function applyScreenBackground(nombre) {
  const cfg = GameData.pantallas && GameData.pantallas[nombre];
  const bg = document.getElementById("screen-backdrop-bg");
  const personaje = document.getElementById("screen-backdrop-personaje");

  if (cfg && cfg.fondo) {
    bg.style.backgroundImage = `url("${cfg.fondo}")`;
    bg.classList.add("screen-backdrop-bg--activo");
  } else {
    bg.classList.remove("screen-backdrop-bg--activo");
  }

  personaje.classList.remove("screen-backdrop-personaje--izquierda", "screen-backdrop-personaje--derecha", "screen-backdrop-personaje--centro");
  if (cfg && cfg.personaje) {
    personaje.src = cfg.personaje;
    personaje.classList.add("screen-backdrop-personaje--activo", `screen-backdrop-personaje--${cfg.posicionPersonaje || "derecha"}`);
  } else {
    personaje.classList.remove("screen-backdrop-personaje--activo");
  }
}

function showView(nombre) {
  VISTAS_JUEGO.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("view--activa", v === nombre);
  });
  applyScreenBackground(nombre);

  if (nombre === "hub") renderHubView();
  if (nombre === "coleccion") renderCollectionView();
  if (nombre === "protagonistas") renderProtagonistsView();
  if (nombre === "tienda") renderGachaHomeView();
  if (nombre === "historial") renderHistoryView();
  if (nombre === "equipos") renderPresetsView();
  if (nombre === "aventura") renderMapView();
  if (nombre === "combate") renderCombatScreen();
  if (nombre === "perfil") renderProfileView();
  if (nombre === "cofres") renderChestsView();
  if (nombre === "logros") renderAchievementsView();
  if (nombre === "ranking") renderLeaderboardView();
  if (nombre === "evento") renderEventView();
  if (nombre === "pvp") renderPvpView();
}

/* =======================================================================
   PANTALLA DE TÍTULO (si ya hay sesión iniciada)
   ======================================================================= */

function renderTitleScreenPanel() {
  const panel = document.getElementById("titlescreen-panel");

  if (currentUser) {
    const banner =
      ultimoResultadoRacha && !ultimoResultadoRacha.yaContadoHoy
        ? `
      <div class="rachabanner">
        <strong>🔥 Racha: día ${ultimoResultadoRacha.racha}</strong>
        <p>+${ultimoResultadoRacha.monedaGanada} de moneda por entrar hoy${ultimoResultadoRacha.cofreGanado ? ` — ¡y un cofre ${ultimoResultadoRacha.cofreGanado} de regalo!` : ""}</p>
      </div>
    `
        : "";

    panel.innerHTML = `
      ${banner}
      <div class="titlescreen__stat"><span>Apodo</span><strong>${PlayerData.nombre || "(sin apodo)"}</strong></div>
      <div class="titlescreen__stat"><span>Correo</span><strong>${currentUser.email}</strong></div>
      <div class="titlescreen__stat"><span>Rol</span><strong>${isAdmin() ? "Administrador" : "Jugador"}</strong></div>
      <div class="titlescreen__stat"><span>Moneda</span><strong>🪙 ${PlayerData.moneda}</strong></div>
      <div class="titlescreen__stat"><span>Colección</span><strong>${PlayerData.coleccion.length} / ${GameData.cartas.length}</strong></div>
      <div class="titlescreen__stat"><span>Runs jugadas</span><strong>${PlayerData.historial.length}</strong></div>
      <div class="titlescreen__acciones">
        <button class="btn btn--titulo" id="btn-entrar">Continuar</button>
        <button class="btn btn--secundario" id="btn-cerrar-sesion">Cerrar sesión</button>
      </div>
    `;
    ultimoResultadoRacha = null; // se muestra una sola vez

    document.getElementById("btn-entrar").addEventListener("click", enterGame);
    document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
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
      renderTitleScreenPanel();
    });
  } else {
    panel.innerHTML = `
      <p style="font-family: var(--fuente-narrativa); font-style: italic; font-size: 16px; color: var(--texto-tenue); margin-bottom: 18px;">
        Crea tu cuenta o inicia sesión para guardar tu progreso y vivir tu propia aventura.
      </p>
      <div class="titlescreen__acciones">
        <button class="btn btn--titulo" id="btn-login-titulo">Iniciar sesión</button>
        <button class="btn btn--secundario" id="btn-registro-titulo">Crear cuenta</button>
      </div>
    `;

    document.getElementById("btn-login-titulo").addEventListener("click", () => {
      document.getElementById("titlescreen").style.display = "none";
      document.getElementById("loginscreen").style.display = "flex";
    });

    document.getElementById("btn-registro-titulo").addEventListener("click", () => {
      document.getElementById("titlescreen").style.display = "none";
      document.getElementById("registerscreen").style.display = "flex";
    });
  }
}

/* =======================================================================
   LOGIN / REGISTRO
   ======================================================================= */

function renderLoginScreen() {
  const btnLogin = document.getElementById("btn-login");
  const btnVolver = document.getElementById("btn-volver-titulo");
  const btnIrRegistro = document.getElementById("btn-ir-registro");
  const errorBox = document.getElementById("login-error");

  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("input-login-email").value.trim();
    const password = document.getElementById("input-login-password").value;

    if (!email || !password) {
      errorBox.textContent = "Completa todos los campos.";
      errorBox.style.display = "block";
      return;
    }

    const resultado = await loginPlayer(email, password);
    if (resultado.ok) {
      // 🔥 IMPORTANTE: al cargar la página (antes de iniciar sesión) Firestore
      // niega la lectura de gamedata/main porque todavía no hay usuario
      // autenticado, así que el juego se queda con la copia vieja cacheada
      // en localStorage. Ahora que el login ya está confirmado, volvemos a
      // pedir GameData para traer las cartas/reglas reales y actualizadas.
      await initGameData();
      await initPlayerData();
      ultimoResultadoRacha = applyDailyStreak();
      document.getElementById("loginscreen").style.display = "none";
      if (!PlayerData.nombre) {
        showNicknameScreen();
      } else {
        renderTitleScreenPanel();
        document.getElementById("titlescreen").style.display = "flex";
      }
    } else {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
    }
  });

  btnVolver.addEventListener("click", () => {
    document.getElementById("loginscreen").style.display = "none";
    document.getElementById("titlescreen").style.display = "flex";
  });

  btnIrRegistro.addEventListener("click", () => {
    document.getElementById("loginscreen").style.display = "none";
    document.getElementById("registerscreen").style.display = "flex";
  });
}

function renderRegisterScreen() {
  const btnRegister = document.getElementById("btn-register");
  const btnVolver = document.getElementById("btn-volver-login");
  const errorBox = document.getElementById("register-error");

  btnRegister.addEventListener("click", async () => {
    const email = document.getElementById("input-register-email").value.trim();
    const password = document.getElementById("input-register-password").value;

    if (!email || !password) {
      errorBox.textContent = "Completa todos los campos.";
      errorBox.style.display = "block";
      return;
    }

    const resultado = await registerPlayer(email, password);
    if (resultado.ok) {
      // Mismo motivo que en el login: recién ahora hay sesión, así que
      // podemos leer gamedata/main de verdad en vez de la copia vieja local.
      await initGameData();
      await initPlayerData();
      ultimoResultadoRacha = applyDailyStreak();
      document.getElementById("registerscreen").style.display = "none";
      if (!PlayerData.nombre) {
        showNicknameScreen();
      } else {
        renderTitleScreenPanel();
        document.getElementById("titlescreen").style.display = "flex";
      }
    } else {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
    }
  });

  btnVolver.addEventListener("click", () => {
    document.getElementById("registerscreen").style.display = "none";
    document.getElementById("loginscreen").style.display = "flex";
  });
}

/* =======================================================================
   PANTALLA DE APODO (obligatoria si el jugador todavía no eligió uno)
   ======================================================================= */

function showNicknameScreen() {
  document.getElementById("titlescreen").style.display = "none";
  document.getElementById("loginscreen").style.display = "none";
  document.getElementById("registerscreen").style.display = "none";
  document.getElementById("nicknamescreen").style.display = "flex";

  const input = document.getElementById("input-nickname");
  const btnViejo = document.getElementById("btn-confirmar-nickname");
  const btn = btnViejo.cloneNode(true);
  btnViejo.replaceWith(btn);
  const errorBox = document.getElementById("nickname-error");
  input.value = "";
  errorBox.style.display = "none";

  const handler = async () => {
    const nombre = input.value.trim();
    if (!nombre) {
      errorBox.textContent = "Escribe un apodo.";
      errorBox.style.display = "block";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Verificando…";
    const resultado = await claimNickname(nombre);
    btn.disabled = false;
    btn.textContent = "Confirmar y entrar";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }

    PlayerData.nombre = nombre;
    PlayerData.nombreLower = nombre.toLowerCase();
    await savePlayerData();

    document.getElementById("nicknamescreen").style.display = "none";
    renderTitleScreenPanel();
    document.getElementById("titlescreen").style.display = "flex";
  };

  btn.addEventListener("click", handler);
}

/* =======================================================================
   ENTRAR AL JUEGO
   ======================================================================= */

function enterGame() {
  document.getElementById("titlescreen").style.display = "none";
  document.getElementById("loginscreen").style.display = "none";
  document.getElementById("registerscreen").style.display = "none";
  document.getElementById("game-shell").style.display = "block";
  showView("hub");

  // Botón de cerrar sesión en la barra superior
  document.getElementById("btn-logout-topbar").addEventListener("click", async () => {
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

document.addEventListener("DOMContentLoaded", async () => {
  await initGameData();
  await initPlayerData();
  loadActiveRunFromStorage();
  renderTitleScreenPanel();
  renderLoginScreen();
  renderRegisterScreen();
  applyScreenBackground("titulo");

  document.getElementById("link-volver-titulo").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("game-shell").style.display = "none";
    document.getElementById("titlescreen").style.display = "flex";
    renderTitleScreenPanel();
    applyScreenBackground("titulo");
  });
});
