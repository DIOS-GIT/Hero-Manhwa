/**
 * BATTLEFIELDUI.JS
 * -----------------------------------------------------------------------
 * Formación cruzada (1 carta en primera línea + 3 en retaguardia), TODAS
 * del mismo tamaño y siempre visibles a la vez — nada de "una carta
 * gigante en foco". El bando enemigo muestra su retaguardia arriba y su
 * primera línea abajo (hacia el centro del tablero); el bando jugador es
 * el espejo: primera línea arriba (hacia el centro), retaguardia abajo.
 * Así el tablero entero cabe en una pantalla de teléfono sin necesidad
 * de hacer zoom, y en escritorio no se ve gigante ni deforme.
 *
 * Tocar tu carta con el turno abre/cierra sus acciones (ver
 * combatController.js — este archivo solo dibuja).
 * -----------------------------------------------------------------------
 */

const RAREZA_COLOR = {
  comun: "#9aa3ad",
  rara: "#4f8fe0",
  epica: "#a463e0",
  legendaria: "#e0b93f",
  mitica: "#e0473f",
};

function renderStatusChips(combatCard) {
  return combatCard.statuses
    .map((e) => {
      const def = getStatusById(e.statusId);
      return `<span class="status-chip" title="${def ? def.label : e.statusId}">${def ? def.label[0] : "?"}</span>`;
    })
    .join("");
}

/** Una carta de formación: misma plantilla para primera línea y retaguardia. */
function renderFormationCard(combatCard, esSeleccionable, esAccionable, esTurnoActual) {
  if (!combatCard) return `<div class="formcard formcard--empty">—</div>`;

  const elemento = getElementDefById(combatCard.elemento, GameData.elementos.lista);
  const pctHp = Math.round((combatCard.hp / combatCard.hpMax) * 100);
  const rarezaColor = RAREZA_COLOR[combatCard.rareza] || RAREZA_COLOR.comun;
  const tieneArte = !!combatCard.imagen;

  const clases = [
    "formcard",
    combatCard.slot === 1 ? "formcard--frente" : "formcard--retaguardia",
    combatCard.alive ? "" : "formcard--dead",
    esSeleccionable ? "formcard--selectable" : "",
    esAccionable ? "formcard--accionable" : "",
    esTurnoActual ? "formcard--turno" : "",
    combatCard.protegiendo ? "formcard--protegiendo" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${clases}" style="--rareza-color:${rarezaColor}" data-instance-id="${combatCard.instanceId}">
      <div class="formcard__art">
        ${tieneArte ? `<img class="formcard__img" src="${combatCard.imagen}" alt="" />` : `<div class="formcard__sinarte">${combatCard.nombre[0]}</div>`}
        ${combatCard.slot === 1 ? '<span class="formcard__linea">1ª línea</span>' : ""}
        ${combatCard.nivelActual ? `<span class="formcard__nivel">Nv.${combatCard.nivelActual}</span>` : ""}
        ${combatCard.protegiendo ? '<span class="formcard__proteger" title="Protegiendo">🛡</span>' : ""}
        ${esAccionable ? '<span class="formcard__toca">Toca para actuar</span>' : ""}
        <div class="formcard__estados">${renderStatusChips(combatCard)}</div>
      </div>
      <div class="formcard__info">
        <div class="formcard__nombre" title="${combatCard.nombre}">${combatCard.nombre}</div>
        <div class="formcard__hpbar"><div class="formcard__hpbar-fill" style="width:${pctHp}%"></div></div>
        <div class="formcard__hptext">${combatCard.hp}/${combatCard.hpMax}</div>
        <div class="formcard__meta">
          <span title="Elemento" style="color:${elemento ? elemento.color : "inherit"}">${elemento ? elemento.label : ""}</span>
          <span title="Ataque">⚔${Math.round(combatCard.stats.atk)}</span>
          <span title="Defensa">🛡${Math.round(combatCard.stats.def)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Dibuja un bando completo en formación cruzada.
 * @param {"enemigo"|"jugador"} team
 */
function renderTeamFormation(combatState, team, seleccionables = []) {
  const vivas = getTeamBySlot(combatState, team);
  if (vivas.length === 0) return `<div class="teamarea teamarea--${team}"><p class="empty-hint">Equipo derrotado.</p></div>`;

  const frente = vivas.find((c) => c.slot === 1) || null;
  const retaguardia = vivas.filter((c) => !frente || c.instanceId !== frente.instanceId);

  const cardHtml = (c) => {
    const esAccionable = combatState.actorActual && combatState.actorActual.instanceId === c.instanceId && c.team === "jugador";
    const esTurnoActual = combatState.actorActual && combatState.actorActual.instanceId === c.instanceId;
    return renderFormationCard(c, seleccionables.includes(c.instanceId), esAccionable, esTurnoActual);
  };

  const filaFrente = `<div class="formrow formrow--frente">${frente ? cardHtml(frente) : ""}</div>`;
  const filaRetaguardia = `<div class="formrow formrow--retaguardia">${retaguardia.map(cardHtml).join("")}</div>`;

  // Enemigo: retaguardia arriba, primera línea abajo (hacia el centro).
  // Jugador: primera línea arriba (hacia el centro), retaguardia abajo.
  const filas = team === "enemigo" ? filaRetaguardia + filaFrente : filaFrente + filaRetaguardia;

  return `<div class="teamarea teamarea--${team}">${filas}</div>`;
}

function renderEnergyBar(combatState, team) {
  const energia = combatState.energia[team];
  const max = combatState.reglas.energia.maximo;
  const pct = Math.round((energia / max) * 100);
  return `
    <div class="energybar">
      <div class="energybar__label">Energía ${team === "jugador" ? "jugador" : "enemigo"}: ${energia} / ${max}</div>
      <div class="energybar__track"><div class="energybar__fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

function renderBattlefield(combatState, seleccionables = []) {
  return `
    <div class="battlefield">
      <div class="battlefield__side battlefield__side--enemigo">
        ${renderEnergyBar(combatState, "enemigo")}
        ${renderTeamFormation(combatState, "enemigo", seleccionables)}
      </div>
      <div class="battlefield__side battlefield__side--jugador">
        ${renderTeamFormation(combatState, "jugador", seleccionables)}
        ${renderEnergyBar(combatState, "jugador")}
      </div>
    </div>
  `;
}
