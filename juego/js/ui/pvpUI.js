/**
 * PVPUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "PvP" del hub. Por ahora cubre: tu rango, tu récord, retar
 * a alguien por apodo (eligiendo modo), y aceptar/rechazar retos que
 * te mandaron. El combate en vivo llega en una entrega aparte — al
 * aceptar un reto, se avisa que todavía no se puede jugar ahí mismo.
 * -----------------------------------------------------------------------
 */

let pvpRetosCache = { recibidos: [], enviados: [] };
let pvpModoActivo = "ranked"; // "ranked" | "normal" | "amistosa"
let pvpBuscandoRanked = false;

async function renderPvpView() {
  const container = document.getElementById("view-pvp");
  const pvp = ensurePvpProfile();

  if (!firebaseEnabled) {
    container.innerHTML = `
      ${renderScreenHeader("PvP", "hub")}
      <p class="empty-hint">El PvP necesita conexión — estás jugando en modo 100% local.</p>
    `;
    attachScreenHeaderEvents(container);
    return;
  }

  container.innerHTML = `
    ${renderScreenHeader("PvP", "hub")}
    <div class="pvpview">
      <div class="pvprank">
        <span class="pvprank__etiqueta">${getRankLabel(pvp)}</span>
        <span class="pvprank__lp">${pvp.lp} LP</span>
        <div class="pvprank__record">
          <span>Ranked ${pvp.victoriasRanked}V - ${pvp.derrotasRanked}D</span>
          <span>Normal ${pvp.victoriasNormal}V - ${pvp.derrotasNormal}D</span>
          <span>Amistosa ${pvp.victoriasAmistosa}V - ${pvp.derrotasAmistosa}D</span>
        </div>
      </div>

      <div class="leaderboard__tabs">
        <button type="button" class="leaderboard__tab ${pvpModoActivo === "ranked" ? "leaderboard__tab--activo" : ""}" data-modo="ranked">Ranked</button>
        <button type="button" class="leaderboard__tab ${pvpModoActivo === "normal" ? "leaderboard__tab--activo" : ""}" data-modo="normal">Normal</button>
        <button type="button" class="leaderboard__tab ${pvpModoActivo === "amistosa" ? "leaderboard__tab--activo" : ""}" data-modo="amistosa">Amistosa</button>
      </div>

      ${pvpModoActivo === "ranked" ? renderRankedQueueSection() : renderChallengeSection(pvpModoActivo)}

      <div class="pvpretos">
        <h4>Retos que te mandaron</h4>
        <div id="pvp-retos-recibidos"><p class="hint">Cargando…</p></div>
      </div>

      <div class="pvpretos">
        <h4>Retos que mandaste (pendientes)</h4>
        <div id="pvp-retos-enviados"><p class="hint">Cargando…</p></div>
      </div>
    </div>
  `;

  attachScreenHeaderEvents(container);

  const btnVolver = container.querySelector("[data-volver-a]");
  if (btnVolver) btnVolver.addEventListener("click", () => {
    if (pvpBuscandoRanked) {
      pvpBuscandoRanked = false;
      leavePvpQueue();
    }
  });

  container.querySelectorAll("[data-modo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pvpModoActivo = btn.dataset.modo;
      renderPvpView();
    });
  });

  if (pvpModoActivo === "ranked") {
    attachRankedQueueEvents(container);
  } else {
    attachChallengeEvents(container);
  }

  cargarYRenderizarRetos();
}

function renderRankedQueueSection() {
  return `
    <div class="pvpretar pvpretar--ranked">
      <h4>Ranked — emparejamiento aleatorio</h4>
      <p class="hint">No puedes elegir rival acá a propósito: así nadie se pone de acuerdo con un amigo para regalarse puntos de liga.</p>
      ${
        pvpBuscandoRanked
          ? `<p class="pvpbuscando">🔍 Buscando rival…</p><button class="btn btn--secundario" id="btn-cancelar-cola">Cancelar búsqueda</button>`
          : `<button class="btn btn--titulo" id="btn-entrar-cola">Buscar partida Ranked</button>`
      }
    </div>
  `;
}

function renderChallengeSection(modo) {
  const label = modo === "normal" ? "Normal — solo créditos" : "Amistosa — sin recompensa";
  return `
    <div class="pvpretar">
      <h4>Retar a alguien (${label})</h4>
      <input type="text" id="input-apodo-rival" placeholder="Apodo del rival" maxlength="20" />
      <button class="btn btn--titulo" id="btn-mandar-reto" data-modo="${modo}">Retar</button>
      <div id="pvp-reto-error" class="loginbox__error" style="display:none"></div>
    </div>
  `;
}

function attachRankedQueueEvents(container) {
  const btnEntrar = container.querySelector("#btn-entrar-cola");
  if (btnEntrar) btnEntrar.addEventListener("click", async () => {
    pvpBuscandoRanked = true;
    renderPvpView();

    const resultado = await joinPvpQueue();
    if (resultado.emparejadoDeUna) {
      manejarRankedEmparejado(resultado.matchId);
      return;
    }
    listenForQueueMatch((matchId) => manejarRankedEmparejado(matchId));
  });

  const btnCancelar = container.querySelector("#btn-cancelar-cola");
  if (btnCancelar) btnCancelar.addEventListener("click", async () => {
    await leavePvpQueue();
    pvpBuscandoRanked = false;
    renderPvpView();
  });
}

async function manejarRankedEmparejado(matchId) {
  pvpBuscandoRanked = false;
  await leavePvpQueue();
  alert("¡Rival encontrado! El combate en vivo todavía no está disponible en esta versión — llega en la próxima entrega.");
  renderPvpView();
}

function attachChallengeEvents(container) {
  const btnRetar = container.querySelector("#btn-mandar-reto");
  if (!btnRetar) return;
  btnRetar.addEventListener("click", async () => {
    const apodo = document.getElementById("input-apodo-rival").value;
    const modo = btnRetar.dataset.modo;
    const errorBox = document.getElementById("pvp-reto-error");
    errorBox.style.display = "none";

    btnRetar.disabled = true;
    btnRetar.textContent = "Retando…";
    const resultado = await sendPvpChallenge(apodo, modo);
    btnRetar.disabled = false;
    btnRetar.textContent = "Retar";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }
    document.getElementById("input-apodo-rival").value = "";
    alert(`¡Reto enviado! Expira en ${ECONOMY_CONFIG.pvp.retoExpiraEnMinutos} minutos si no responde.`);
    cargarYRenderizarRetos();
  });
}

async function cargarYRenderizarRetos() {
  pvpRetosCache = await fetchMyPvpChallenges();

  const contRecibidos = document.getElementById("pvp-retos-recibidos");
  const contEnviados = document.getElementById("pvp-retos-enviados");
  if (!contRecibidos || !contEnviados) return; // el jugador ya navegó a otra pantalla

  const LABEL_MODO = { ranked: "Ranked", normal: "Normal", amistosa: "Amistosa" };

  contRecibidos.innerHTML =
    pvpRetosCache.recibidos.length === 0
      ? '<p class="empty-hint">No tienes retos pendientes.</p>'
      : pvpRetosCache.recibidos
          .map(
            (m) => `
      <div class="pvpretocard">
        <span><strong>${m.retador.nombre}</strong> te retó (${LABEL_MODO[m.modo]})</span>
        <div class="pvpretocard__botones">
          <button type="button" class="btn btn--pequeno" data-aceptar="${m.id}">Aceptar</button>
          <button type="button" class="btn btn--secundario btn--pequeno" data-rechazar="${m.id}">Rechazar</button>
        </div>
      </div>
    `
          )
          .join("");

  contEnviados.innerHTML =
    pvpRetosCache.enviados.length === 0
      ? '<p class="empty-hint">No tienes retos enviados pendientes.</p>'
      : pvpRetosCache.enviados
          .map((m) => `<div class="pvpretocard"><span>Retaste a <strong>${m.retado.nombre}</strong> (${LABEL_MODO[m.modo]}) — esperando respuesta</span></div>`)
          .join("");

  contRecibidos.querySelectorAll("[data-aceptar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const resultado = await acceptPvpChallenge(btn.dataset.aceptar);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      alert("¡Reto aceptado! El combate en vivo todavía no está disponible en esta versión — llega en la próxima entrega.");
      cargarYRenderizarRetos();
    });
  });

  contRecibidos.querySelectorAll("[data-rechazar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await declinePvpChallenge(btn.dataset.rechazar);
      cargarYRenderizarRetos();
    });
  });
}
