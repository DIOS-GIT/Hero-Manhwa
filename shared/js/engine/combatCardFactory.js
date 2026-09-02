/**
 * COMBATCARDFACTORY.JS
 * -----------------------------------------------------------------------
 * Una carta en js/data/cards-*.js es solo una "plantilla" (sus stats
 * base). Cuando empieza un combate, cada carta necesita ADEMÁS su
 * propio estado que cambia turno a turno: HP actual, barra de turno,
 * estados alterados activos, cooldowns, etc.
 *
 * Este archivo crea esa "instancia de combate" a partir de la plantilla,
 * sin modificar nunca la plantilla original.
 * -----------------------------------------------------------------------
 */

let _nextInstanceId = 1;

/**
 * @param {object} cardTemplate - una carta de js/data/cards-*.js
 * @param {"jugador"|"enemigo"} team
 * @param {number} slot - 1 (primera línea) a 4
 */
function createCombatCard(cardTemplate, team, slot) {
  return {
    instanceId: "cc_" + _nextInstanceId++,
    cardId: cardTemplate.id,
    nombre: cardTemplate.nombre,
    clase: cardTemplate.clase,
    elemento: cardTemplate.elemento,
    imagen: cardTemplate.imagen,
    rareza: cardTemplate.rareza,
    pasivas: cardTemplate.pasivas || [],
    habilidades: cardTemplate.habilidades || [],
    nivelActual: cardTemplate.nivelActual || null, // solo cartas del jugador lo traen (ver getLeveledCardTemplate)

    team: team,
    slot: slot, // 1 = primera línea, 2-4 = retaguardia
    alive: true,

    statsBase: { ...cardTemplate.stats },
    stats: { ...cardTemplate.stats }, // stats "efectivos" (con pasivas/estados aplicados)
    hp: cardTemplate.stats.hp,
    hpMax: cardTemplate.stats.hp,

    actionBar: 0, // progreso hacia el umbral de turno (ver turnOrder.js)
    statuses: [], // estados alterados activos: { statusId, value, turnosRestantes }
    cooldowns: {}, // { nombreHabilidad: turnosRestantes }

    // true mientras esta carta tenga una redirección de daño activa
    // (ej. usó "Provocar"). Ver engine/actions.js y engine/targeting.js
    protegiendo: false,
    protegiendoTurnosRestantes: 0,
  };
}

function isFrontLine(combatCard) {
  return combatCard.slot === 1;
}
