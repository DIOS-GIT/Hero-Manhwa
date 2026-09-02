/**
 * ARCHETYPESTATGENERATOR.JS
 * -----------------------------------------------------------------------
 * El algoritmo del botón 🎲 Random del admin. No tiene ningún número de
 * balance escrito acá — todo (presupuestos, rangos por arquetipo,
 * multiplicadores, pisos mínimos) se lee de data/archetypesConfig.js.
 * Cambiar el balance del juego nunca requiere tocar este archivo.
 * -----------------------------------------------------------------------
 */

const STATS_KEYS = ["hp", "atk", "def", "velocidad"];

/**
 * Genera HP/ATQ/DEF/VEL para una carta según su rareza + clase + arquetipo.
 * Respeta EXACTO el presupuesto de la rareza (en puntos abstractos, antes
 * de convertir a la escala real) y varía un poco cada vez que se llama.
 * @returns {{hp,atk,def,velocidad}|null} null si la rareza o el arquetipo no existen
 */
function generateArchetypeStats(rareza, claseId, arquetipoId) {
  const budget = RAREZA_BUDGETS[rareza];
  const archetype = getArchetypeById(claseId, arquetipoId);
  if (!budget || !archetype) return null;

  // 1) Un valor al azar dentro del rango de cada stat, después
  //    normalizado para que las 4 fracciones sumen exactamente 1.
  const crudo = {};
  STATS_KEYS.forEach((stat) => {
    const [min, max] = archetype.pesos[stat];
    crudo[stat] = min + Math.random() * (max - min);
  });
  const sumaCruda = STATS_KEYS.reduce((acc, s) => acc + crudo[s], 0);

  // 2) Una segunda pasada de variación pequeña (±5%) para que dos
  //    cartas del mismo arquetipo no salgan idénticas, re-normalizada
  //    de nuevo para no romper el presupuesto.
  const conJitter = {};
  STATS_KEYS.forEach((stat) => {
    const fraccion = crudo[stat] / sumaCruda;
    conJitter[stat] = fraccion * (1 + (Math.random() * 0.1 - 0.05));
  });
  const sumaJitter = STATS_KEYS.reduce((acc, s) => acc + conJitter[s], 0);

  // 3) Puntos -> stat real de la escala del juego, con piso mínimo.
  const stats = {};
  STATS_KEYS.forEach((stat) => {
    const puntos = (conJitter[stat] / sumaJitter) * budget;
    const valorReal = Math.round(puntos * STAT_POINT_MULTIPLIER[stat]);
    stats[stat] = Math.max(STAT_MIN_VALUE[stat], valorReal);
  });

  return stats;
}

/**
 * Rango de valores REALES (no fracciones) recomendados para cada stat,
 * según el arquetipo — se usa para el aviso de balance al editar a mano.
 * @returns {{hp:[min,max], atk:[min,max], def:[min,max], velocidad:[min,max]}|null}
 */
function getRecommendedStatRange(rareza, claseId, arquetipoId) {
  const budget = RAREZA_BUDGETS[rareza];
  const archetype = getArchetypeById(claseId, arquetipoId);
  if (!budget || !archetype) return null;

  const rango = {};
  STATS_KEYS.forEach((stat) => {
    const [min, max] = archetype.pesos[stat];
    const lo = Math.max(STAT_MIN_VALUE[stat], Math.round(min * budget * STAT_POINT_MULTIPLIER[stat]));
    const hi = Math.round(max * budget * STAT_POINT_MULTIPLIER[stat]);
    rango[stat] = [lo, hi];
  });
  return rango;
}

/**
 * Compara un set de stats (editado a mano, por ejemplo) contra el rango
 * recomendado del arquetipo. No bloquea nada — solo informa.
 * @returns {{balanceado: boolean, avisos: string[]}}
 */
function checkStatBalance(rareza, claseId, arquetipoId, stats) {
  const rango = getRecommendedStatRange(rareza, claseId, arquetipoId);
  if (!rango) return { balanceado: true, avisos: [] };

  const etiquetas = { hp: "HP", atk: "ATQ", def: "DEF", velocidad: "VEL" };
  const avisos = [];
  STATS_KEYS.forEach((stat) => {
    const [lo, hi] = rango[stat];
    const valor = stats[stat];
    if (valor < lo) avisos.push(`${etiquetas[stat]} (${valor}) está por debajo de lo recomendado para este arquetipo (${lo}–${hi}).`);
    else if (valor > hi) avisos.push(`${etiquetas[stat]} (${valor}) está por encima de lo recomendado para este arquetipo (${lo}–${hi}).`);
  });
  return { balanceado: avisos.length === 0, avisos };
}
