/**
 * EVENTUI.JS
 * -----------------------------------------------------------------------
 * Pantalla "Evento" del hub — solo aparece en el hub mientras haya un
 * evento activo (ver hubUI.js). Reutiliza el mismo patrón de fases de
 * revelación que gachaHomeUI.js/chestsUI.js para el gacha del evento.
 * -----------------------------------------------------------------------
 */

let eventoFaseRevelacion = null; // null | "boca_abajo" | "revelado"
let ultimoResultadoEventoGacha = null;
let _eventoRevealTimer = null;

function renderEventView() {
  const container = document.getElementById("view-evento");
  const evento = getActiveEvent();

  if (!evento) {
    container.innerHTML = `
      ${renderScreenHeader("Evento", "hub")}
      <p class="empty-hint">No hay ningún evento activo ahora mismo. Vuelve más adelante.</p>
    `;
    attachScreenHeaderEvents(container);
    return;
  }

  const progreso = ensureEventProgress(evento.id);
  const cartaExclusiva = GameData.cartas.find((c) => c.id === evento.cartaExclusivaId);
  const diasRestantes = Math.max(0, Math.ceil((new Date(evento.fechaFin) - new Date(getFechaHoyLocal())) / 86400000) + 1);
  const tirando = eventoFaseRevelacion === "boca_abajo";
  const costoGacha = ECONOMY_CONFIG.gacha.costoPorTirada;

  container.innerHTML = `
    ${renderScreenHeader("Evento", "hub")}
    <div class="eventoview">
      <div class="eventobanner">
        <h3>${evento.nombre}</h3>
        ${evento.tema ? `<p class="eventobanner__tema">${evento.tema}</p>` : ""}
        <p class="eventobanner__cuenta">⏳ Termina en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"} · 🪙 x2 en todo el juego mientras dure</p>
      </div>

      <div class="eventogacha">
        <h4>Gacha del evento — rate-up a ${cartaExclusiva ? cartaExclusiva.nombre : "(elige carta en el admin)"}</h4>
        ${eventoFaseRevelacion ? `<div class="gachareveal-stage">${renderEventGachaStage(evento)}</div>` : ""}
        <button class="btn btn--titulo" id="btn-tirar-gacha-evento" ${PlayerData.moneda < costoGacha || tirando ? "disabled" : ""}>Tirar (🪙 ${costoGacha})</button>
      </div>

      <div class="eventomisiones">
        <h4>Misiones del evento</h4>
        <p class="eventomisiones__moneda">💠 Moneda de evento: ${progreso.monedaEvento}</p>
        ${evento.misiones.map((m) => renderEventMissionCard(evento, m)).join("") || '<p class="empty-hint">Este evento no tiene misiones cargadas.</p>'}
      </div>

      <div class="eventotienda">
        <h4>Canjear carta exclusiva</h4>
        <p class="hint">Cuesta ${evento.costoTiendaMonedaEvento} de moneda de evento, garantizada (o se convierte en moneda si ya la tienes).</p>
        <button class="btn" id="btn-canjear-exclusiva" ${progreso.monedaEvento < evento.costoTiendaMonedaEvento ? "disabled" : ""}>Canjear (💠 ${evento.costoTiendaMonedaEvento})</button>
      </div>
    </div>
  `;

  attachScreenHeaderEvents(container);

  const btnTirar = container.querySelector("#btn-tirar-gacha-evento");
  if (btnTirar) btnTirar.addEventListener("click", () => {
    ultimoResultadoEventoGacha = performEventGachaRoll(evento);
    eventoFaseRevelacion = "boca_abajo";
    renderEventView();

    clearTimeout(_eventoRevealTimer);
    _eventoRevealTimer = setTimeout(() => {
      eventoFaseRevelacion = "revelado";
      renderEventView();
    }, 850);
  });

  const btnCerrarReveal = container.querySelector("#btn-cerrar-reveal-evento");
  if (btnCerrarReveal) btnCerrarReveal.addEventListener("click", () => {
    eventoFaseRevelacion = null;
    ultimoResultadoEventoGacha = null;
    renderEventView();
  });

  container.querySelectorAll(".btn--reclamar-mision-evento").forEach((btn) => {
    btn.addEventListener("click", () => {
      const resultado = claimEventMission(evento, btn.dataset.id);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      alert(`¡Misión reclamada! +${resultado.mision.recompensaMonedaEvento} de moneda de evento.`);
      renderEventView();
    });
  });

  const btnCanjear = container.querySelector("#btn-canjear-exclusiva");
  if (btnCanjear) btnCanjear.addEventListener("click", () => {
    const resultado = redeemEventExclusive(evento);
    if (!resultado.ok) {
      alert(resultado.motivo);
      return;
    }
    alert(
      resultado.eraDuplicado
        ? `Ya tenías a ${resultado.carta.nombre} — se convirtió en 🪙 ${resultado.monedaGanada}.`
        : `¡Conseguiste a ${resultado.carta.nombre}!`
    );
    renderEventView();
  });
}

function renderEventGachaStage(evento) {
  if (eventoFaseRevelacion === "boca_abajo") {
    return `<span class="gachacard-back__simbolo">✦</span>`;
  }

  const resultado = ultimoResultadoEventoGacha;
  if (!resultado.ok) {
    return `
      <p class="hint">${resultado.motivo}</p>
      <button type="button" class="btn" id="btn-cerrar-reveal-evento">Volver</button>
    `;
  }

  const cuerpo = resultado.eraDuplicado
    ? `<p>Salió <strong>${resultado.carta.nombre}</strong> — ya la tenías, se convirtió en 🪙 ${resultado.monedaGanada}${resultado.fragmentosGanados ? ` + 🧩 ${resultado.fragmentosGanados} fragmentos` : ""}.</p>`
    : `<p>¡Nueva carta! <strong>${resultado.carta.nombre}</strong> (${resultado.carta.rareza})</p>`;

  return `
    <div class="gachareveal">
      <div class="gacha__resultado collectioncard--${resultado.carta.rareza}">
        ${resultado.carta.imagen ? `<img class="gachareveal__img" src="${resultado.carta.imagen}" alt="${resultado.carta.nombre}" />` : ""}
        ${cuerpo}
      </div>
      <button type="button" class="btn" id="btn-cerrar-reveal-evento">Continuar</button>
    </div>
  `;
}

function renderEventMissionCard(evento, mision) {
  const progreso = getEventMissionProgress(evento, mision);
  const completo = isEventMissionComplete(evento, mision);
  const reclamado = isEventMissionClaimed(evento, mision);
  const pct = Math.min(100, Math.round((progreso / mision.meta) * 100));

  return `
    <div class="achievement ${reclamado ? "achievement--reclamado" : completo ? "achievement--completo" : ""}">
      <div class="achievement__texto">
        <strong>${mision.descripcion || "Misión de evento"}</strong>
        <div class="achievement__barra"><div class="achievement__barra-fill" style="width:${pct}%"></div></div>
        <span class="achievement__progreso">${Math.min(progreso, mision.meta)} / ${mision.meta}</span>
      </div>
      <div class="achievement__recompensa">
        <span>💠 ${mision.recompensaMonedaEvento}</span>
        ${
          reclamado
            ? '<span class="achievement__estado">Reclamado</span>'
            : completo
            ? `<button type="button" class="btn btn--reclamar-mision-evento" data-id="${mision.id}">Reclamar</button>`
            : ""
        }
      </div>
    </div>
  `;
}
