/**
 * MAILBOXUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Correo" del hub: lista los mensajes del admin sin reclamar
 * (ver engine/mailboxEngine.js).
 * -----------------------------------------------------------------------
 */

function renderMailboxView() {
  const container = document.getElementById("view-correo");
  const correos = getUnclaimedMail();

  container.innerHTML = `
    ${renderScreenHeader("Correo", "hub")}
    <div class="mailboxview">
      ${
        correos.length === 0
          ? '<p class="empty-hint">No tienes correo sin reclamar.</p>'
          : correos.map((c) => renderMailCard(c)).join("")
      }
    </div>
  `;

  attachScreenHeaderEvents(container);
  staggerIn(container, ".mailcard", 45);

  container.querySelectorAll("[data-reclamar-correo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const correo = (GameData.correoGlobal || []).find((c) => c.id === btn.dataset.reclamarCorreo);
      if (!correo) return;

      let cartaId = null;
      if (correo.recompensa.fragmentos > 0) {
        if (PlayerData.coleccion.length === 0) {
          showToast("Necesitas tener al menos una carta para recibir fragmentos.", "error");
          return;
        }
        cartaId = pedirCartaParaFragmentos();
        if (!cartaId) return;
      }

      const resultado = claimMail(correo.id, cartaId);
      if (!resultado.ok) {
        showToast(resultado.motivo, "error");
        return;
      }
      burstConfetti(btn);
      if (typeof sfxMoneda === "function") sfxMoneda();
      showToast(`¡Reclamaste "${correo.titulo}"!`, "exito");
      setTimeout(() => renderMailboxView(), 450);
    });
  });
}

function renderMailCard(correo) {
  const r = correo.recompensa;
  const partes = [];
  if (r.moneda) partes.push(`🪙 ${r.moneda}`);
  if (r.cofre) partes.push(`🎁 Cofre ${r.cofre}`);
  if (r.fragmentos) partes.push(`🧩 ${r.fragmentos} fragmentos`);

  return `
    <div class="mailcard">
      <div class="mailcard__texto">
        <strong>${correo.titulo}</strong>
        ${correo.mensaje ? `<p>${correo.mensaje}</p>` : ""}
        <span class="mailcard__recompensa">${partes.join(" · ")}</span>
      </div>
      <button type="button" class="btn" data-reclamar-correo="${correo.id}">Reclamar</button>
    </div>
  `;
}
