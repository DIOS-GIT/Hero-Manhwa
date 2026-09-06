/**
 * LEADERBOARDUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Ranking" del hub: dos pestañas (Victorias / Colección),
 * top 20 leído de la colección leaderboard (ver engine/leaderboard.js).
 * Si el juego corre sin Firebase (modo 100% local), no hay con quién
 * comparar, así que se avisa en vez de mostrar una lista vacía.
 * -----------------------------------------------------------------------
 */

let leaderboardTabActiva = "victorias"; // "victorias" | "coleccion"
let leaderboardCache = { victorias: null, coleccion: null };

async function renderLeaderboardView() {
  const container = document.getElementById("view-ranking");

  container.innerHTML = `
    ${renderScreenHeader("Ranking", "hub")}
    <div class="leaderboard">
      <div class="leaderboard__tabs">
        <button type="button" class="leaderboard__tab ${leaderboardTabActiva === "victorias" ? "leaderboard__tab--activo" : ""}" data-tab="victorias">Victorias</button>
        <button type="button" class="leaderboard__tab ${leaderboardTabActiva === "coleccion" ? "leaderboard__tab--activo" : ""}" data-tab="coleccion">Colección</button>
      </div>
      <div id="leaderboard-lista">
        ${!firebaseEnabled ? '<p class="empty-hint">El ranking necesita conexión — estás jugando en modo 100% local.</p>' : '<p class="hint">Cargando…</p>'}
      </div>
    </div>
  `;

  attachScreenHeaderEvents(container);

  container.querySelectorAll(".leaderboard__tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      leaderboardTabActiva = btn.dataset.tab;
      renderLeaderboardView();
    });
  });

  if (!firebaseEnabled) return;

  const campo = leaderboardTabActiva; // "victorias" o "coleccion" — mismo nombre de campo en Firestore
  if (!leaderboardCache[campo]) {
    leaderboardCache[campo] = await fetchLeaderboard(campo, 20);
  }
  const lista = leaderboardCache[campo];
  const listaEl = document.getElementById("leaderboard-lista");
  if (!listaEl) return; // el jugador ya navegó a otra pantalla mientras cargaba

  if (lista.length === 0) {
    listaEl.innerHTML = '<p class="empty-hint">Todavía no hay nadie en el ranking.</p>';
    return;
  }

  listaEl.innerHTML = `
    <div class="leaderboardlist">
      ${lista
        .map((fila, i) => {
          const esYo = currentUser && fila.uid === currentUser.uid;
          return `
          <div class="leaderboardrow ${esYo ? "leaderboardrow--yo" : ""}">
            <span class="leaderboardrow__pos">${i + 1}</span>
            <span class="leaderboardrow__nombre">${fila.nombre || "Jugador"}</span>
            <span class="leaderboardrow__valor">${campo === "victorias" ? "⚔️" : "🃏"} ${fila[campo] || 0}</span>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}
