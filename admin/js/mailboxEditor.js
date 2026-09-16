/**
 * MAILBOXEDITOR.JS
 * -----------------------------------------------------------------------
 * Pantalla de admin para mandar correo con recompensa a todos los
 * jugadores (ver shared/js/engine/mailboxEngine.js).
 * -----------------------------------------------------------------------
 */

function renderMailboxEditorView() {
  const container = document.getElementById("view-correo");
  const correos = (GameData.correoGlobal || []).slice().reverse(); // más nuevo primero

  container.innerHTML = `
    <div class="cardform" style="margin-bottom:20px;">
      <h3>Mandar correo nuevo</h3>
      <p class="hint">Llega a TODOS los jugadores a la vez — no hace falta elegir a quién.</p>
      <form id="form-correo-nuevo">
        <label>Título
          <input type="text" name="titulo" placeholder="Ej: ¡Gracias por jugar!" required />
        </label>
        <label>Mensaje
          <textarea name="mensaje" rows="3" placeholder="Ej: Como agradecimiento por el lanzamiento, acá tienes un regalo."></textarea>
        </label>

        <div class="form-grid-2">
          <label>Moneda
            <input type="number" name="moneda" min="0" value="0" />
          </label>
          <label>Fragmentos (de una carta a elección del jugador)
            <input type="number" name="fragmentos" min="0" value="0" />
          </label>
        </div>

        <label>Cofre (opcional)
          <select name="cofre">
            <option value="">Ninguno</option>
            <option value="comun">Común</option>
            <option value="rara">Rara</option>
            <option value="epica">Épica</option>
            <option value="legendaria">Legendaria</option>
            <option value="mitica">Mítica</option>
          </select>
        </label>

        <label>Vence el (opcional, vacío = nunca vence)
          <input type="date" name="fechaExpira" />
        </label>

        <button type="submit" class="btn">Mandar a todos</button>
      </form>
    </div>

    <h3>Correo ya enviado</h3>
    <div class="cardlist">
      ${
        correos
          .map(
            (c) => `
        <div class="cardlist__item">
          <span class="cardlist__nombregrupo"><strong>${c.titulo}</strong></span>
          <span class="cardlist__clase">
            ${c.recompensa.moneda ? `🪙${c.recompensa.moneda} ` : ""}${c.recompensa.cofre ? `🎁${c.recompensa.cofre} ` : ""}${c.recompensa.fragmentos ? `🧩${c.recompensa.fragmentos}` : ""}
            ${c.fechaExpira ? ` · vence ${c.fechaExpira}` : ""}
          </span>
          <button type="button" class="btn btn--icono btn--peligro" data-borrar-correo="${c.id}">Borrar</button>
        </div>
      `
          )
          .join("") || '<p class="empty-hint">Todavía no mandaste ningún correo.</p>'
      }
    </div>
  `;

  attachMailboxEditorEvents(container);
}

function attachMailboxEditorEvents(container) {
  const form = container.querySelector("#form-correo-nuevo");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nuevo = {
      id: generateUniqueId("correo"),
      titulo: form.elements["titulo"].value.trim(),
      mensaje: form.elements["mensaje"].value.trim(),
      recompensa: {
        moneda: Number(form.elements["moneda"].value) || 0,
        cofre: form.elements["cofre"].value || null,
        fragmentos: Number(form.elements["fragmentos"].value) || 0,
      },
      fechaExpira: form.elements["fechaExpira"].value || null,
    };

    if (!nuevo.titulo) {
      alert("Ponle un título al correo.");
      return;
    }
    if (nuevo.recompensa.moneda === 0 && !nuevo.recompensa.cofre && nuevo.recompensa.fragmentos === 0) {
      alert("El correo necesita al menos una recompensa (moneda, cofre o fragmentos).");
      return;
    }

    if (!GameData.correoGlobal) GameData.correoGlobal = [];
    GameData.correoGlobal.push(nuevo);
    saveGameData();
    alert("Correo enviado a todos los jugadores.");
    renderMailboxEditorView();
  });

  container.querySelectorAll("[data-borrar-correo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("¿Borrar este correo? Quien todavía no lo reclamó ya no podrá hacerlo.")) return;
      GameData.correoGlobal = GameData.correoGlobal.filter((c) => c.id !== btn.dataset.borrarCorreo);
      saveGameData();
      renderMailboxEditorView();
    });
  });
}
