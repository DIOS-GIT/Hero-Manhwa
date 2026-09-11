/**
 * EVENTENGINE.JS
 * -----------------------------------------------------------------------
 * FORMA DE UN EVENTO (GameData.eventos, lo edita el admin):
 *   {
 *     id, nombre, tema (texto corto de ambientación),
 *     fechaInicio, fechaFin (ISO "YYYY-MM-DD"),
 *     cartaExclusivaId (id de una carta ya cargada en Cartas),
 *     probabilidadRateUp (0-1, chance de que salga la exclusiva al tirar
 *       su rareza en el gacha de evento — no afecta el gacha normal),
 *     costoTiendaMonedaEvento (cuánta moneda de evento cuesta canjear la
 *       exclusiva garantizada en la tienda del evento),
 *     misiones: [{ id, descripcion, tipo, meta, recompensaMonedaEvento }],
 *   }
 *
 * Si hay varios eventos con fechas que se cruzan, se toma el primero
 * que calce — evita cargar dos al mismo tiempo desde el admin.
 *
 * PROGRESO DEL JUGADOR: PlayerData.eventoProgreso[eventoId] = {
 *   monedaEvento, misionesReclamadas: [], tiradasGachaEvento,
 *   victoriasEvento, cofresAbiertosEvento
 * } — separado por evento para que uno nuevo siempre arranque en cero,
 * sin arrastrar nada del anterior.
 * -----------------------------------------------------------------------
 */

function getFechaHoyISO() {
  return getFechaHoyLocal(); // reutiliza el mismo cálculo de dailyStreak.js
}

/** @returns {object|null} el evento activo ahora mismo, o null si no hay ninguno. */
function getActiveEvent() {
  const hoy = getFechaHoyISO();
  return (GameData.eventos || []).find((e) => e.fechaInicio <= hoy && hoy <= e.fechaFin) || null;
}

/** Se llama antes de leer/escribir progreso de un evento — crea su bloque si es la primera vez. */
function ensureEventProgress(eventoId) {
  if (!PlayerData.eventoProgreso) PlayerData.eventoProgreso = {};
  if (!PlayerData.eventoProgreso[eventoId]) {
    PlayerData.eventoProgreso[eventoId] = {
      monedaEvento: 0,
      misionesReclamadas: [],
      tiradasGachaEvento: 0,
      victoriasEvento: 0,
      cofresAbiertosEvento: 0,
    };
  }
  return PlayerData.eventoProgreso[eventoId];
}

function getEventMissionProgress(evento, mision) {
  const progreso = ensureEventProgress(evento.id);
  switch (mision.tipo) {
    case "tiradasGachaEvento": return progreso.tiradasGachaEvento;
    case "victoriasEvento": return progreso.victoriasEvento;
    case "cofresAbiertosEvento": return progreso.cofresAbiertosEvento;
    default: return 0;
  }
}

function isEventMissionComplete(evento, mision) {
  return getEventMissionProgress(evento, mision) >= mision.meta;
}

function isEventMissionClaimed(evento, mision) {
  return ensureEventProgress(evento.id).misionesReclamadas.includes(mision.id);
}

function claimEventMission(evento, misionId) {
  const mision = evento.misiones.find((m) => m.id === misionId);
  if (!mision) return { ok: false, motivo: "Misión no encontrada." };
  if (isEventMissionClaimed(evento, mision)) return { ok: false, motivo: "Ya reclamaste esta misión." };
  if (!isEventMissionComplete(evento, mision)) return { ok: false, motivo: "Todavía no cumples esta misión." };

  const progreso = ensureEventProgress(evento.id);
  progreso.misionesReclamadas.push(mision.id);
  progreso.monedaEvento += mision.recompensaMonedaEvento;
  savePlayerData();
  return { ok: true, mision };
}

/**
 * Tirada del gacha EXCLUSIVO del evento (aparte del gacha normal). Cuesta
 * la misma moneda normal que una tirada regular. Si la rareza que sale
 * coincide con la de la carta exclusiva, hay probabilidadRateUp de chance
 * de que sea justo ella en vez de cualquier otra de esa rareza.
 */
function performEventGachaRoll(evento) {
  const costo = ECONOMY_CONFIG.gacha.costoPorTirada;
  if (!spendCoins(costo)) {
    return { ok: false, motivo: "Moneda insuficiente para tirar." };
  }

  const progreso = ensureEventProgress(evento.id);
  progreso.tiradasGachaEvento += 1;
  savePlayerData();

  const cartaExclusiva = GameData.cartas.find((c) => c.id === evento.cartaExclusivaId);
  const rarezaSorteada = rollRarity(); // ver gacha.js — misma tabla de probabilidades del gacha normal

  let carta;
  if (cartaExclusiva && cartaExclusiva.rareza === rarezaSorteada && Math.random() < evento.probabilidadRateUp) {
    carta = cartaExclusiva;
  } else {
    const cartasDeEsaRareza = getCardsArrayByRarity(rarezaSorteada);
    if (cartasDeEsaRareza.length === 0) {
      addCoins(costo); // se devuelve — no hay nada que entregar de esa rareza todavía
      return { ok: false, motivo: `Todavía no hay cartas de rareza "${rarezaSorteada}" cargadas en el admin.` };
    }
    carta = cartasDeEsaRareza[Math.floor(Math.random() * cartasDeEsaRareza.length)];
  }

  const eraDuplicado = ownsCard(carta.id);
  if (eraDuplicado) {
    const monedaGanada = ECONOMY_CONFIG.gacha.monedaPorDuplicado[carta.rareza];
    const fragmentosGanados = ECONOMY_CONFIG.gacha.fragmentosPorDuplicado[carta.rareza] || 0;
    addCoins(monedaGanada);
    addCardFragments(carta.id, fragmentosGanados);
    return { ok: true, carta, eraDuplicado: true, monedaGanada, fragmentosGanados };
  }

  addCardToCollection(carta.id);
  return { ok: true, carta, eraDuplicado: false, monedaGanada: 0, fragmentosGanados: 0 };
}

/** Canjea la carta exclusiva garantizada en la tienda del evento, gastando moneda de evento. */
function redeemEventExclusive(evento) {
  const progreso = ensureEventProgress(evento.id);
  if (progreso.monedaEvento < evento.costoTiendaMonedaEvento) {
    return { ok: false, motivo: "No tienes suficiente moneda de evento." };
  }
  const carta = GameData.cartas.find((c) => c.id === evento.cartaExclusivaId);
  if (!carta) return { ok: false, motivo: "La carta exclusiva ya no está disponible." };

  progreso.monedaEvento -= evento.costoTiendaMonedaEvento;

  if (ownsCard(carta.id)) {
    const monedaGanada = ECONOMY_CONFIG.gacha.monedaPorDuplicado[carta.rareza];
    addCoins(monedaGanada);
    savePlayerData();
    return { ok: true, carta, eraDuplicado: true, monedaGanada };
  }

  addCardToCollection(carta.id);
  savePlayerData();
  return { ok: true, carta, eraDuplicado: false, monedaGanada: 0 };
}
