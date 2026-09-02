/**
 * GACHA.JS
 * -----------------------------------------------------------------------
 * Una tirada de gacha hace 3 cosas en orden:
 *   1. Elige una RAREZA según ECONOMY_CONFIG.gacha.probabilidadPorRareza.
 *   2. Elige una CARTA al azar de esa rareza, del catálogo completo
 *      (GameData.cartas — el mismo que edita el admin).
 *   3. Si el jugador YA tiene esa carta, la convierte en moneda +
 *      fragmentos de esa carta (duplicado). Si no la tiene, se agrega
 *      a su colección.
 * -----------------------------------------------------------------------
 */

/** Elige una rareza al azar respetando las probabilidades configuradas. */
function rollRarity() {
  const tabla = ECONOMY_CONFIG.gacha.probabilidadPorRareza;
  const roll = Math.random();
  let acumulado = 0;
  for (const rareza of RAREZAS) {
    acumulado += tabla[rareza];
    if (roll <= acumulado) return rareza;
  }
  return RAREZAS[0]; // fallback por redondeo de probabilidades
}

/**
 * Ejecuta una tirada completa. Devuelve un resumen para mostrar en la UI:
 * { ok, carta, eraDuplicado, monedaGanada, fragmentosGanados, fueGarantizada, motivo }
 */
function performGachaRoll() {
  const costo = ECONOMY_CONFIG.gacha.costoPorTirada;
  if (!spendCoins(costo)) {
    return { ok: false, motivo: "Moneda insuficiente para tirar." };
  }

  // La primerísima tirada de cada jugador siempre da una legendaria, para
  // que arranque motivado — configurable en economyConfig.js.
  const esPrimeraTiradaGarantizada = !PlayerData.yaTuvoPrimeraTirada && ECONOMY_CONFIG.gacha.garantizarLegendariaPrimeraTirada;
  const legendariasDisponibles = getCardsArrayByRarity("legendaria");
  const fueGarantizada = esPrimeraTiradaGarantizada && legendariasDisponibles.length > 0;
  const rareza = fueGarantizada ? "legendaria" : rollRarity();

  // Solo "gastamos" la garantía cuando efectivamente se pudo cumplir — si
  // el admin todavía no cargó ninguna legendaria, se sigue intentando en
  // cada tirada hasta que sí haya una disponible.
  if (fueGarantizada) PlayerData.yaTuvoPrimeraTirada = true;

  const cartasDeEsaRareza = getCardsArrayByRarity(rareza);
  if (cartasDeEsaRareza.length === 0) {
    // no hay cartas cargadas de esa rareza todavía (el admin no ha creado
    // ninguna) — devolvemos la moneda para no cobrar por nada.
    addCoins(costo);
    return { ok: false, motivo: `Todavía no hay cartas de rareza "${rareza}" cargadas en el admin.` };
  }

  const carta = cartasDeEsaRareza[Math.floor(Math.random() * cartasDeEsaRareza.length)];
  const eraDuplicado = ownsCard(carta.id);

  if (eraDuplicado) {
    const monedaGanada = ECONOMY_CONFIG.gacha.monedaPorDuplicado[rareza];
    const fragmentosGanados = ECONOMY_CONFIG.gacha.fragmentosPorDuplicado[rareza] || 0;
    addCoins(monedaGanada);
    addCardFragments(carta.id, fragmentosGanados);
    return { ok: true, carta, eraDuplicado: true, monedaGanada, fragmentosGanados, fueGarantizada };
  }

  addCardToCollection(carta.id);
  return { ok: true, carta, eraDuplicado: false, monedaGanada: 0, fragmentosGanados: 0, fueGarantizada };
}
