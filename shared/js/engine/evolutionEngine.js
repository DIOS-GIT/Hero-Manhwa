/**
 * EVOLUTIONENGINE.JS
 * -----------------------------------------------------------------------
 * Fragmentos: cada carta acumula los suyos propios (vienen de sacarla
 * repetida en el gacha — ver engine/gacha.js). Se gastan para
 * evolucionarla a OTRA carta ya cargada (la que el admin haya elegido
 * como "siguiente forma" en su ficha, ver data/cardSchema.js).
 *
 * Evolucionar CAMBIA la identidad de la carta en la colección del
 * jugador (la vieja se va, entra la nueva) — no es un simple aumento de
 * stats. El admin decide libremente a qué carta evoluciona cada una,
 * así que puede cruzar de rareza o no, según arme la cadena.
 * -----------------------------------------------------------------------
 */

function getCardFragments(cardId) {
  return PlayerData.fragmentosCartas[cardId] || 0;
}

function addCardFragments(cardId, cantidad) {
  if (cantidad <= 0) return;
  PlayerData.fragmentosCartas[cardId] = getCardFragments(cardId) + cantidad;
  savePlayerData();
}

/**
 * Revisa si una carta puede evolucionar AHORA MISMO.
 * @returns {{puede: boolean, motivo?: string, siguiente?: object, requisitos?: object}}
 */
function canEvolveCard(cardId) {
  const carta = GameData.cartas.find((c) => c.id === cardId);
  if (!carta) return { puede: false, motivo: "Esa carta ya no existe." };
  if (!carta.evolucion || !carta.evolucion.puedeEvolucionar || !carta.evolucion.siguienteCartaId) {
    return { puede: false, motivo: "Esta carta no tiene una evolución configurada." };
  }
  if (!ownsCard(cardId)) return { puede: false, motivo: "No tenés esta carta." };

  const siguiente = GameData.cartas.find((c) => c.id === carta.evolucion.siguienteCartaId);
  if (!siguiente) return { puede: false, motivo: "La carta a la que evoluciona ya no existe (revisalo en el admin)." };

  const nivelRequerido = carta.evolucion.nivelMinimoRequerido || getNivelMaxPorRareza(carta.rareza, GameData.niveles);
  const { nivel } = getCardLevelInfo(cardId);
  const fragmentos = getCardFragments(cardId);
  const requisitos = {
    nivel: { actual: nivel, requerido: nivelRequerido, cumplido: nivel >= nivelRequerido },
    fragmentos: { actual: fragmentos, requerido: carta.evolucion.fragmentosRequeridos, cumplido: fragmentos >= carta.evolucion.fragmentosRequeridos },
    moneda: { actual: PlayerData.moneda, requerido: carta.evolucion.monedaRequerida, cumplido: PlayerData.moneda >= carta.evolucion.monedaRequerida },
  };

  const puede = requisitos.nivel.cumplido && requisitos.fragmentos.cumplido && requisitos.moneda.cumplido;
  return { puede, siguiente, requisitos, motivo: puede ? null : "Todavía no se cumplen los requisitos." };
}

/**
 * Evoluciona la carta si se puede. Traslada nivel (recortado al tope de
 * la nueva rareza), reinicia XP, actualiza colección/presets/caídas.
 * @returns {{ok: boolean, motivo?: string, nuevaCarta?: object}}
 */
function evolveCard(cardId) {
  const chequeo = canEvolveCard(cardId);
  if (!chequeo.puede) return { ok: false, motivo: chequeo.motivo || "No se cumplen los requisitos." };

  const carta = GameData.cartas.find((c) => c.id === cardId);
  const siguiente = chequeo.siguiente;

  PlayerData.fragmentosCartas[cardId] -= carta.evolucion.fragmentosRequeridos;
  spendCoins(carta.evolucion.monedaRequerida);

  PlayerData.coleccion = PlayerData.coleccion.filter((id) => id !== cardId);
  if (!PlayerData.coleccion.includes(siguiente.id)) PlayerData.coleccion.push(siguiente.id);

  const nivelActual = getCardLevelInfo(cardId).nivel;
  const nivelMaxNueva = getNivelMaxPorRareza(siguiente.rareza, GameData.niveles);
  PlayerData.progresoCartas[siguiente.id] = { nivel: Math.min(nivelActual, nivelMaxNueva), xp: 0 };
  delete PlayerData.progresoCartas[cardId];

  PlayerData.cartasCaidas = PlayerData.cartasCaidas.filter((id) => id !== cardId);

  PlayerData.presets.forEach((preset) => {
    preset.cartaIds = preset.cartaIds.map((id) => (id === cardId ? siguiente.id : id));
  });

  savePlayerData();
  return { ok: true, nuevaCarta: siguiente };
}
