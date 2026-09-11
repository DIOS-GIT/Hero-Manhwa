/**
 * CHESTENGINE.JS
 * -----------------------------------------------------------------------
 * Los cofres se ganan jugando (jefes, élites, algunos eventos) y se
 * guardan SIN abrir en PlayerData.cofres hasta que el jugador entra a
 * la pantalla "Cofres" del hub y decide abrirlos — así no interrumpen
 * el combate ni la run.
 *
 * Abrir un cofre reutiliza la misma lógica de "carta al azar de esa
 * rareza / duplicado se convierte en moneda + fragmentos" que ya usa
 * el gacha (ver gacha.js) para que ambos sistemas se sientan coherentes
 * y no haya dos formas distintas de resolver una carta repetida.
 * -----------------------------------------------------------------------
 */

/** Calcula qué rareza de cofre corresponde según cuántos nodos lleva la run (más lejos = mejor). */
function getChestRarezaPorProfundidad(nodosAlcanzados) {
  const tabla = ECONOMY_CONFIG.cofres.rarezaPorProfundidad;
  for (const tramo of tabla) {
    if (nodosAlcanzados <= tramo.hastaNodo) return tramo.rareza;
  }
  return tabla[tabla.length - 1].rareza;
}

/**
 * Abre un cofre de la rareza dada. Devuelve un resumen para mostrar en
 * la UI: { ok, carta, eraDuplicado, monedaGanada, fragmentosGanados, motivo }
 * NOTA: esta función NO quita el cofre del inventario — eso lo hace la
 * UI llamando a removeChestAt() cuando arranca la animación, para que
 * el cofre desaparezca de la lista incluso si el resultado tarda en
 * mostrarse.
 */
function openChest(rareza) {
  const eventoActivo = getActiveEvent();
  if (eventoActivo) ensureEventProgress(eventoActivo.id).cofresAbiertosEvento++;

  const cartasDeEsaRareza = getCardsArrayByRarity(rareza);
  if (cartasDeEsaRareza.length === 0) {
    if (eventoActivo) savePlayerData();
    return { ok: false, motivo: `Todavía no hay cartas de rareza "${rareza}" cargadas en el admin.` };
  }

  const carta = cartasDeEsaRareza[Math.floor(Math.random() * cartasDeEsaRareza.length)];
  const eraDuplicado = ownsCard(carta.id);

  if (eraDuplicado) {
    const monedaGanada = ECONOMY_CONFIG.gacha.monedaPorDuplicado[rareza];
    const fragmentosGanados = ECONOMY_CONFIG.gacha.fragmentosPorDuplicado[rareza] || 0;
    addCoins(monedaGanada);
    addCardFragments(carta.id, fragmentosGanados);
    return { ok: true, carta, eraDuplicado: true, monedaGanada, fragmentosGanados };
  }

  addCardToCollection(carta.id);
  return { ok: true, carta, eraDuplicado: false, monedaGanada: 0, fragmentosGanados: 0 };
}
