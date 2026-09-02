/**
 * RUNSTATE.JS
 * -----------------------------------------------------------------------
 * Maneja UNA run activa: el mapa generado, el equipo con su HP que
 * persiste entre nodos (por eso existe el Descanso), qué cartas
 * quedaron caídas durante la run, y las estadísticas que van a parar
 * al historial cuando la run termina.
 *
 * activeRun = {
 *   mapa: <de mapGenerator.js>,
 *   equipoCartaIds: [cardId, cardId, cardId, cardId],
 *   hpActual: {cardId: hp},
 *   buffsPermanentes: {cardId: [{stat, modificador}]},
 *   cartasCaidasEnRun: [cardId, ...],
 *   estadisticas: { cartasUsadas: Set, danoTotalHecho, nodosAlcanzados },
 *   finalizada: boolean,
 *   resultado: "victoria" | "derrota" | null,
 * }
 * -----------------------------------------------------------------------
 */

let activeRun = null;

const ACTIVE_RUN_STORAGE_KEY = "cardGameActiveRun_v1";

/** Guarda (o borra) la run activa en localStorage. Se llama tras cada cambio. */
function saveActiveRun() {
  if (activeRun) {
    localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, JSON.stringify(activeRun));
  } else {
    localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
  }
}

/** Se llama al arrancar la app, para recuperar una run que quedó a medias. */
function loadActiveRunFromStorage() {
  const saved = localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
  if (!saved) {
    activeRun = null;
    return null;
  }
  try {
    activeRun = JSON.parse(saved);
  } catch (err) {
    console.error("No se pudo leer la run guardada.", err);
    activeRun = null;
  }
  return activeRun;
}

/** Único punto para terminar/abandonar la run activa — siempre limpia el guardado. */
function clearActiveRun() {
  activeRun = null;
  saveActiveRun();
}

function startNewRun(preset) {
  const hpActual = {};
  preset.cartaIds.forEach((id) => {
    const tpl = GameData.cartas.find((c) => c.id === id);
    if (tpl) hpActual[id] = tpl.stats.hp;
  });

  activeRun = {
    mapa: generateRunMap(),
    equipoCartaIds: preset.cartaIds.slice(),
    protagonistaId: preset.protagonistaId || null,
    hpActual,
    buffsPermanentes: {},
    relicsObtenidos: [],
    cartasCaidasEnRun: [],
    estadisticas: {
      cartasUsadas: new Set(preset.cartaIds),
      danoTotalHecho: 0,
      nodosAlcanzados: 0,
    },
    finalizada: false,
    resultado: null,
  };
  setLastUsedPreset(preset.id);
  saveActiveRun();
  return activeRun;
}

/** Cartas del equipo de esta run que siguen vivas (no cayeron todavía). */
function getRunAliveCardIds() {
  return activeRun.equipoCartaIds.filter((id) => !activeRun.cartasCaidasEnRun.includes(id));
}

function getRunCardTemplates(cardIds) {
  return cardIds
    .map((id) => GameData.cartas.find((c) => c.id === id))
    .filter(Boolean)
    .map((carta) => getLeveledCardTemplate(carta)); // aplica el nivel del jugador para esa carta
}

/**
 * Genera un equipo enemigo para un nodo de combate/élite/jefe, respetando
 * los rangos de tamaño y rareza de GameData.rutas.
 */
function generateEnemyTeamForNode(tipoNodo) {
  const tamano = GameData.rutas.tamanoEquipoEnemigo[tipoNodo] || { min: 2, max: 3 };
  const rarezasPermitidas = GameData.rutas.rarezaMaximaPorTipo[tipoNodo] || RAREZAS;
  const cantidad = Math.floor(Math.random() * (tamano.max - tamano.min + 1)) + tamano.min;

  let pool = GameData.cartas.filter((c) => rarezasPermitidas.includes(c.rareza));
  if (pool.length === 0) pool = GameData.cartas; // respaldo si el admin no ha cargado esas rarezas

  const equipo = [];
  for (let i = 0; i < cantidad && pool.length > 0; i++) {
    equipo.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return equipo;
}

/**
 * Entra a un nodo de combate/élite/jefe: arma el equipo enemigo y lanza
 * la pantalla de combate ya existente, con el HP que trae la run.
 * `onNodeResolved` se llama cuando el jugador confirma el resultado.
 */
function enterCombatNode(nodo, onNodeResolved) {
  const cardIdsVivas = getRunAliveCardIds();
  const equipoJugador = getRunCardTemplates(cardIdsVivas);
  const equipoEnemigo = generateEnemyTeamForNode(nodo.tipo);

  startCombatFromTeams(equipoJugador, equipoEnemigo, {
    hpInicial: activeRun.hpActual,
    buffsPermanentes: activeRun.buffsPermanentes,
    protagonista: activeRun.protagonistaId ? getPersonalizedProtagonist(activeRun.protagonistaId) : null,
    onFinish: (combatState) => {
      applyCombatResultToRun(combatState);
      if (combatState.resultado === "derrota") {
        finishRun("derrota");
        onNodeResolved({ finalizada: true });
        return;
      }
      const rango = GameData.rutas.recompensaMonedaPorTipo[nodo.tipo] || { min: 10, max: 20 };
      const recompensa = Math.floor(Math.random() * (rango.max - rango.min + 1)) + rango.min;
      addCoins(recompensa);

      const subidasNivel = grantXpToCards(cardIdsVivas, GameData.niveles.xpPorVictoria);

      if (nodo.tipo === "jefe") {
        finishRun("victoria");
        onNodeResolved({ finalizada: true, recompensa, subidasNivel });
        return;
      }
      onNodeResolved({ finalizada: false, recompensa, subidasNivel });
    },
  });
}

/** Copia el HP resultante del combate hacia el estado de la run, y marca caídas. */
function applyCombatResultToRun(combatState) {
  combatState.cards
    .filter((c) => c.team === "jugador")
    .forEach((c) => {
      activeRun.hpActual[c.cardId] = c.hp;
      if (!c.alive && !activeRun.cartasCaidasEnRun.includes(c.cardId)) {
        activeRun.cartasCaidasEnRun.push(c.cardId);
        markCardAsCaida(c.cardId);
      }
    });
  activeRun.estadisticas.danoTotalHecho += combatState.danoHechoPorJugador;
  saveActiveRun();
}

/** Nodo de Descanso: cura 40% de HP máximo a las cartas vivas de la run. */
function resolveRestNode() {
  const cardIdsVivas = getRunAliveCardIds();
  cardIdsVivas.forEach((id) => {
    const tpl = GameData.cartas.find((c) => c.id === id);
    if (!tpl) return;
    const curacion = Math.round(tpl.stats.hp * ECONOMY_CONFIG.descanso.porcentajeCuracion);
    activeRun.hpActual[id] = Math.min(tpl.stats.hp, (activeRun.hpActual[id] || 0) + curacion);
  });
  saveActiveRun();
}

/**
 * Registra una reliquia (efecto persistente de la run) para mostrarla en
 * la barra estilo Slay the Spire. Solo se registran efectos DURADEROS
 * (buffs/debuffs que quedan el resto de la run) — no cambios puntuales
 * de moneda o HP, que no son "reliquias", son solo lo que pasó una vez.
 */
function addRelicToRun(relic) {
  if (!activeRun) return;
  activeRun.relicsObtenidos.push({
    id: "relic_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    nombre: relic.nombre,
    descripcion: relic.descripcion,
    tipo: relic.tipo, // "positivo" | "negativo"
    icono: relic.icono || (relic.tipo === "positivo" ? "✦" : "☠"),
  });
  saveActiveRun();
}

/** Aplica la consecuencia elegida de un evento (ver forma en data/eventsPool.js). */
function resolveEventConsequence(consecuencia) {
  if (!consecuencia || consecuencia.tipo === "nada") return { mensaje: "No pasó nada más." };

  if (consecuencia.tipo === "moneda") {
    addCoins(consecuencia.cantidad);
    return { mensaje: `${consecuencia.cantidad >= 0 ? "Ganaste" : "Perdiste"} ${Math.abs(consecuencia.cantidad)} de moneda.` };
  }

  const cardIdsVivas = getRunAliveCardIds();
  if (cardIdsVivas.length === 0) return { mensaje: "No hay cartas vivas para afectar." };

  const objetivos =
    consecuencia.objetivo === "todas"
      ? cardIdsVivas
      : [cardIdsVivas[Math.floor(Math.random() * cardIdsVivas.length)]];

  if (consecuencia.tipo === "hp") {
    objetivos.forEach((id) => {
      const tpl = GameData.cartas.find((c) => c.id === id);
      const cantidad = consecuencia.esPortentaje ? Math.round(tpl.stats.hp * consecuencia.cantidad) : consecuencia.cantidad;
      activeRun.hpActual[id] = Math.max(0, Math.min(tpl.stats.hp, (activeRun.hpActual[id] || 0) + cantidad));
      if (activeRun.hpActual[id] === 0 && !activeRun.cartasCaidasEnRun.includes(id)) {
        activeRun.cartasCaidasEnRun.push(id);
        markCardAsCaida(id);
      }
    });
    saveActiveRun();
    return { mensaje: `HP modificado para ${objetivos.length} carta(s).` };
  }

  if (consecuencia.tipo === "buffCarta" || consecuencia.tipo === "debuffCarta") {
    objetivos.forEach((id) => {
      if (!activeRun.buffsPermanentes[id]) activeRun.buffsPermanentes[id] = [];
      activeRun.buffsPermanentes[id].push({ stat: consecuencia.stat, modificador: consecuencia.modificador });
    });
    const tpl = GameData.cartas.find((c) => c.id === objetivos[0]);
    const positivo = consecuencia.modificador > 0;
    addRelicToRun({
      nombre: `${consecuencia.tipo === "buffCarta" ? "Bendición" : "Maldición"} de ${tpl ? tpl.nombre : "una carta"}`,
      descripcion: `${positivo ? "+" : ""}${Math.round(consecuencia.modificador * 100)}% ${consecuencia.stat.toUpperCase()} el resto de la run.`,
      tipo: positivo ? "positivo" : "negativo",
    });
    return { mensaje: `${objetivos.length} carta(s) recibieron un cambio permanente para esta run.` };
  }

  return { mensaje: "Evento resuelto." };
}

/** Revivir una carta caída pagando su costo por rareza (desde nodo Tienda o pantalla de inicio). */
function reviveCardPaying(cardId) {
  const tpl = GameData.cartas.find((c) => c.id === cardId);
  if (!tpl) return { ok: false, motivo: "Carta no encontrada." };
  const costo = ECONOMY_CONFIG.revivir.costoPorRareza[tpl.rareza];
  if (!spendCoins(costo)) return { ok: false, motivo: "Moneda insuficiente." };

  reviveCard(cardId);
  if (activeRun) {
    activeRun.cartasCaidasEnRun = activeRun.cartasCaidasEnRun.filter((id) => id !== cardId);
    activeRun.hpActual[cardId] = Math.round(tpl.stats.hp * 0.5); // revive con 50% de HP
    saveActiveRun();
  }
  return { ok: true, costo };
}

function moveToNode(nodeId) {
  activeRun.mapa.nodoActualId = nodeId;
  activeRun.mapa.nodosVisitados.push(nodeId);
  activeRun.estadisticas.nodosAlcanzados++;
  saveActiveRun();
}

function finishRun(resultado) {
  activeRun.finalizada = true;
  activeRun.resultado = resultado;

  addHistoryEntry({
    fecha: new Date().toISOString(),
    resultado,
    nodosAlcanzados: activeRun.estadisticas.nodosAlcanzados,
    cartasUsadas: Array.from(activeRun.estadisticas.cartasUsadas).map((id) => {
      const tpl = GameData.cartas.find((c) => c.id === id);
      return tpl ? tpl.nombre : id;
    }),
    cartasCaidasEnRun: activeRun.cartasCaidasEnRun.map((id) => {
      const tpl = GameData.cartas.find((c) => c.id === id);
      return tpl ? tpl.nombre : id;
    }),
    danoTotalHecho: activeRun.estadisticas.danoTotalHecho,
  });
  saveActiveRun();
}
