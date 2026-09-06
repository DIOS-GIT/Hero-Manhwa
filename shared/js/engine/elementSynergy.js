/**
 * ELEMENTSYNERGY.JS
 * -----------------------------------------------------------------------
 * Bono de equipo por elemento compartido: por cada PAR de cartas del
 * equipo que compartan el elemento más repetido, +8% a ATQ/DEF/VEL de
 * esas cartas durante el combate. 2 iguales = +8%, 4 iguales = +16%.
 * Un número impar de sobra (ej. el tercero de tres) no cuenta como
 * medio bono — se necesitan pares completos.
 *
 * OJO: no incluye HP en el bono a propósito. En este motor, un buff de
 * stat "hp" solo infla combatCard.stats.hp (un valor de referencia) sin
 * tocar combatCard.hpMax/hp reales (ver combatCardFactory.js +
 * statusEffects.js:recalculateStats) — es una inconsistencia ya
 * existente en cómo funcionan los buffs de "hp" en general, y no vale
 * la pena que el bono de elemento la herede.
 * -----------------------------------------------------------------------
 */

const BONO_ELEMENTO_POR_PAR = 0.08;
const STATS_QUE_AFECTA_BONO_ELEMENTO = ["atk", "def", "velocidad"];

/**
 * @param {Array} equipoTemplates plantillas de carta (con .elemento)
 * @returns {{elemento: string, pares: number, bonoPct: number} | null}
 */
function calcularBonoElemento(equipoTemplates) {
  const conteo = {};
  equipoTemplates.forEach((tpl) => {
    if (tpl.elemento) conteo[tpl.elemento] = (conteo[tpl.elemento] || 0) + 1;
  });

  let elementoDominante = null;
  let maxConteo = 0;
  Object.keys(conteo).forEach((el) => {
    if (conteo[el] > maxConteo) {
      maxConteo = conteo[el];
      elementoDominante = el;
    }
  });

  const pares = Math.floor(maxConteo / 2);
  if (pares === 0) return null;
  return { elemento: elementoDominante, pares, bonoPct: pares * BONO_ELEMENTO_POR_PAR };
}
