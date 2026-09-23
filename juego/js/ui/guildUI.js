/**
 * GUILDUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Gremio" del hub. Dos estados: sin gremio (buscar por tag o
 * fundar uno nuevo) o con gremio (roster, salir, y si eres líder,
 * expulsar/disolver).
 * -----------------------------------------------------------------------
 */

let guildViewState = "buscar"; // "buscar" | "crear" — solo aplica cuando no tienes gremio
let guildEncontrado = null; // resultado de la última búsqueda por tag

async function renderGuildView() {
  const container = document.getElementById("view-gremio");

  if (!firebaseEnabled) {
    container.innerHTML = `
      ${renderScreenHeader("Gremio", "hub")}
      <p class="empty-hint">Los gremios necesitan conexión — estás jugando en modo 100% local.</p>
    `;
    attachScreenHeaderEvents(container);
    return;
  }

  container.innerHTML = `
    ${renderScreenHeader("Gremio", "hub")}
    <div class="guildview" id="guildview-cuerpo">
      <p class="hint">Cargando…</p>
    </div>
  `;
  attachScreenHeaderEvents(container);

  const gremio = await fetchMyGuild();
  const cuerpo = document.getElementById("guildview-cuerpo");
  if (!cuerpo) return; // el jugador ya navegó a otra pantalla

  cuerpo.innerHTML = gremio ? renderGuildRoster(gremio) : renderNoGuildPanel();
  attachGuildViewEvents(cuerpo, gremio);
}

function renderNoGuildPanel() {
  return `
    <div class="leaderboard__tabs">
      <button type="button" class="leaderboard__tab ${guildViewState === "buscar" ? "leaderboard__tab--activo" : ""}" data-guild-tab="buscar">Buscar</button>
      <button type="button" class="leaderboard__tab ${guildViewState === "crear" ? "leaderboard__tab--activo" : ""}" data-guild-tab="crear">Fundar</button>
    </div>

    ${
      guildViewState === "buscar"
        ? `
      <div class="pvpretar">
        <h4>Buscar gremio por tag</h4>
        <input type="text" id="input-tag-buscar" placeholder="Ej: HERO" maxlength="5" />
        <button class="btn btn--titulo" id="btn-buscar-gremio">Buscar</button>
        <div id="guild-error" class="loginbox__error" style="display:none"></div>
      </div>
      <div id="guild-resultado"></div>
    `
        : `
      <div class="pvpretar">
        <h4>Fundar un gremio nuevo</h4>
        <p class="hint">Cuesta 🪙 ${ECONOMY_CONFIG.gremio.costoCrear} (tienes 🪙 ${PlayerData.moneda}).</p>
        <input type="text" id="input-nombre-gremio" placeholder="Nombre del gremio" maxlength="30" />
        <input type="text" id="input-tag-gremio" placeholder="Tag (2 a 5 letras, ej: HERO)" maxlength="5" />
        <textarea id="input-desc-gremio" rows="2" placeholder="Descripción (opcional)"></textarea>
        <button class="btn btn--titulo" id="btn-fundar-gremio" ${PlayerData.moneda < ECONOMY_CONFIG.gremio.costoCrear ? "disabled" : ""}>Fundar</button>
        <div id="guild-error-crear" class="loginbox__error" style="display:none"></div>
      </div>
    `
    }
  `;
}

function renderGuildRoster(gremio) {
  const soyLider = gremio.liderUid === currentUser.uid;
  return `
    <div class="guildheader">
      <h3>[${gremio.tag}] ${gremio.nombre}</h3>
      ${gremio.descripcion ? `<p class="hint">${gremio.descripcion}</p>` : ""}
      <p class="hint">${gremio.miembroCount} / ${ECONOMY_CONFIG.gremio.maxMiembros} miembros</p>
    </div>

    <div class="pvpretos">
      <h4>Miembros</h4>
      ${gremio.miembros
        .map(
          (m) => `
        <div class="friendcard">
          <div class="friendcard__info">
            <strong>${m.rol === "lider" ? "👑 " : ""}${m.nombre}</strong>
          </div>
          ${
            soyLider && m.uid !== currentUser.uid
              ? `<button type="button" class="btn btn--secundario btn--pequeno" data-expulsar="${m.uid}">Expulsar</button>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>

    <div class="pvpretar" style="text-align:center;">
      <button type="button" class="btn btn--secundario" id="btn-salir-gremio">Salir del gremio</button>
      ${soyLider ? '<button type="button" class="btn btn--peligro" id="btn-disolver-gremio" style="margin-top:8px;">Disolver gremio</button>' : ""}
    </div>
  `;
}

function attachGuildViewEvents(cuerpo, gremio) {
  if (gremio) {
    cuerpo.querySelectorAll("[data-expulsar]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Expulsar a este miembro?")) return;
        const resultado = await kickGuildMember(btn.dataset.expulsar);
        if (!resultado.ok) return showToast(resultado.motivo, "error");
        showToast("Miembro expulsado.", "exito");
        renderGuildView();
      });
    });

    const btnSalir = cuerpo.querySelector("#btn-salir-gremio");
    if (btnSalir) btnSalir.addEventListener("click", async () => {
      if (!confirm("¿Seguro que quieres salir del gremio?")) return;
      const resultado = await leaveGuild();
      if (!resultado.ok) return showToast(resultado.motivo, "error");
      showToast("Saliste del gremio.", "info");
      renderGuildView();
    });

    const btnDisolver = cuerpo.querySelector("#btn-disolver-gremio");
    if (btnDisolver) btnDisolver.addEventListener("click", async () => {
      if (!confirm("¿Disolver el gremio para TODOS los miembros? Esto no se puede deshacer.")) return;
      const resultado = await disbandGuild();
      if (!resultado.ok) return showToast(resultado.motivo, "error");
      showToast("Gremio disuelto.", "info");
      renderGuildView();
    });
    return;
  }

  cuerpo.querySelectorAll("[data-guild-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      guildViewState = btn.dataset.guildTab;
      guildEncontrado = null;
      renderGuildView();
    });
  });

  const btnBuscar = cuerpo.querySelector("#btn-buscar-gremio");
  if (btnBuscar) btnBuscar.addEventListener("click", async () => {
    const errorBox = document.getElementById("guild-error");
    errorBox.style.display = "none";
    const resultado = await findGuildByTag(document.getElementById("input-tag-buscar").value);
    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      document.getElementById("guild-resultado").innerHTML = "";
      return;
    }
    guildEncontrado = resultado.guild;
    document.getElementById("guild-resultado").innerHTML = `
      <div class="friendcard">
        <div class="friendcard__info">
          <strong>[${guildEncontrado.tag}] ${guildEncontrado.nombre}</strong>
          <span class="hint">${guildEncontrado.miembroCount} / ${ECONOMY_CONFIG.gremio.maxMiembros} miembros</span>
        </div>
        <button type="button" class="btn btn--pequeno" id="btn-unirse-gremio">Unirse</button>
      </div>
    `;
    document.getElementById("btn-unirse-gremio").addEventListener("click", async () => {
      const r = await joinGuild(guildEncontrado.id);
      if (!r.ok) return showToast(r.motivo, "error");
      showToast(`¡Te uniste a ${r.nombre}!`, "exito");
      renderGuildView();
    });
  });

  const btnFundar = cuerpo.querySelector("#btn-fundar-gremio");
  if (btnFundar) btnFundar.addEventListener("click", async () => {
    const errorBox = document.getElementById("guild-error-crear");
    errorBox.style.display = "none";
    btnFundar.disabled = true;
    btnFundar.textContent = "Fundando…";

    const resultado = await createGuild(
      document.getElementById("input-nombre-gremio").value,
      document.getElementById("input-tag-gremio").value,
      document.getElementById("input-desc-gremio").value
    );

    btnFundar.disabled = false;
    btnFundar.textContent = "Fundar";

    if (!resultado.ok) {
      errorBox.textContent = resultado.motivo;
      errorBox.style.display = "block";
      return;
    }
    showToast("¡Gremio fundado!", "exito");
    if (typeof burstConfetti === "function") burstConfetti(btnFundar);
    renderGuildView();
  });
}
