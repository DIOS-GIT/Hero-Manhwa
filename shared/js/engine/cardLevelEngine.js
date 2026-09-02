/**
 * CARDLEVELENGINE.JS
 * -----------------------------------------------------------------------
 * Guarda y aplica el progreso de nivel/XP de las cartas del JUGADOR.
 * No toca la plantilla de carta que edita el admin (js/data/cards-*.js)
 * — vive en PlayerData.progresoCartas y usa las fórmulas de
 * js/data/levelingConfig.js para todo el cálculo. Ni el admin ni el
 * motor de combate necesitan saber el detalle de esas fórmulas: solo
 * llaman a las funciones de este archivo.
 * -----------------------------------------------------------------------
 */

/** Progreso de una carta (nivel 1 / xp 0 si todavía no tiene registro). */
function getCardLevelInfo(cardId) {
  return PlayerData.progresoCartas[cardId] || { nivel: 1, xp: 0 };
}

/**
 * Devuelve un CLON de la plantilla de carta con sus stats multiplicados
 * según el nivel actual del jugador para esa carta. La plantilla
 * original (GameData.cartas) nunca se modifica.
 */
function getLeveledCardTemplate(cardTemplate) {
  const { nivel } = getCardLevelInfo(cardTemplate.id);
  const mult = multiplicadorStatsPorNivel(cardTemplate.rareza, nivel, GameData.niveles);

  return {
    ...cardTemplate,
    nivelActual: nivel,
    stats: {
      hp: Math.round(cardTemplate.stats.hp * mult),
      atk: Math.round(cardTemplate.stats.atk * mult),
      def: Math.round(cardTemplate.stats.def * mult),
      velocidad: Math.round(cardTemplate.stats.velocidad * mult),
    },
  };
}

/**
 * Reparte `xpCada` puntos de XP a cada carta en `cardIds` (las que
 * jugaron el combate ganado), sube de nivel las que junten suficiente
 * XP (puede subir más de un nivel de una vez), y guarda todo en un solo
 * paso al final.
 *
 * @returns {Array<{cardId, nombre, nivelAnterior, nivelNuevo}>} solo las
 *   cartas que efectivamente subieron de nivel — para mostrar feedback.
 */
function grantXpToCards(cardIds, xpCada) {
  const subidas = [];

  cardIds.forEach((cardId) => {
    const carta = GameData.cartas.find((c) => c.id === cardId);
    if (!carta) return;

    const progreso = { ...getCardLevelInfo(cardId) };
    const nivelAnterior = progreso.nivel;
    progreso.xp += xpCada;

    let requerida = xpParaSiguienteNivel(carta.rareza, progreso.nivel, GameData.niveles);
    while (progreso.xp >= requerida && requerida !== Infinity) {
      progreso.xp -= requerida;
      progreso.nivel += 1;
      requerida = xpParaSiguienteNivel(carta.rareza, progreso.nivel, GameData.niveles);
    }
    // Ya al tope: no acumules XP de sobra sin uso.
    if (requerida === Infinity) progreso.xp = 0;

    PlayerData.progresoCartas[cardId] = progreso;
    if (progreso.nivel > nivelAnterior) {
      subidas.push({ cardId, nombre: carta.nombre, nivelAnterior, nivelNuevo: progreso.nivel });
    }
  });

  savePlayerData();
  return subidas;
}
