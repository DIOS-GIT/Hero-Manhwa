/**
 * ADMIN-MAIN.JS
 * -----------------------------------------------------------------------
 * Punto de entrada del admin (separado del juego — ver game-main.js en
 * juego/js/). Inicializa GameData y controla el cambio de pestañas.
 * AHORA SOPORTA LOGIN DE ADMINS con roles:
 * - admin_principal: acceso total
 * - admin_secundario: acceso limitado (solo crear, no borrar ni modificar)
 * -----------------------------------------------------------------------
 */

const VISTAS_ADMIN = ["cartas", "protagonistas", "reglas", "rutas", "niveles", "elementos", "tienda", "pantallas", "historia", "equipos", "combate", "datos"];

function showView(nombre) {
  VISTAS_ADMIN.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("view--activa", v === nombre);
  });
  document.querySelectorAll(".tabs__btn").forEach((btn) => {
    btn.classList.toggle("tabs__btn--activo", btn.dataset.view === nombre);
  });
  refreshView(nombre);
}

function refreshView(nombre) {
  if (nombre === "cartas") renderCardEditorView();
  if (nombre === "protagonistas") renderProtagonistEditorView();
  if (nombre === "reglas") renderRulesEditorView();
  if (nombre === "rutas") renderRoutesEditorView();
  if (nombre === "niveles") renderLevelingEditorView();
  if (nombre === "elementos") renderElementsEditorView();
  if (nombre === "tienda") renderShopEditorView();
  if (nombre === "pantallas") renderScreensEditorView();
  if (nombre === "historia") renderHistoriaEditorView();
  if (nombre === "equipos") renderTeamBuilderView();
  if (nombre === "combate") renderCombatScreen();
  if (nombre === "datos") renderDataPanelView();
}

function refreshAllAdminViews() {
  VISTAS_ADMIN.forEach(refreshView);
}

async function initAdminApp() {
  await initGameData();

  document.querySelectorAll(".tabs__btn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  showView("cartas");
}

/* =======================================================================
   LOGIN DE ADMIN
   ======================================================================= */

function renderAdminLogin() {
  const btnLogin = document.getElementById("btn-admin-login");
  const btnVolver = document.getElementById("btn-admin-volver-juego");
  const errorBox = document.getElementById("admin-login-error");

  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("input-admin-email").value.trim();
    const password = document.getElementById("input-admin-password").value;

    if (!email || !password) {
      errorBox.textContent = "Completa todos los campos.";
      errorBox.style.display = "block";
      return;
    }

    // 🔥 IMPORTANTE: conectar Firebase ANTES de intentar login
    await ensureFirebaseReady();

    const resultado = await loginAdmin(email, password);
    if (resultado.ok) {
      document.getElementById("admin-login").style.display = "none";
      document.getElementById("admin-shell").style.display = "block";
      initAdminApp();
    } else {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
    }
  });

  btnVolver.addEventListener("click", () => {
    window.location.href = "../juego/index.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // 🔥 Conectar Firebase ANTES de cargar datos
  await ensureFirebaseReady();
  await initGameData();
  renderAdminLogin();
});
