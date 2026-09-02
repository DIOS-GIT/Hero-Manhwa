/**
 * PROTAGONISTSCHEMA.JS
 * -----------------------------------------------------------------------
 * El protagonista es un "comandante": no ocupa una de las 4 posiciones
 * de combate, no tiene HP ni ataque normal propio. Solo aporta una
 * ACTIVA ÚNICA que se puede usar 1 vez por combate (decisión ya
 * cerrada en el diseño, punto #12).
 *
 * FORMA DE UN PROTAGONISTA:
 *   {
 *     id, nombre, arquetipo (texto libre, ej: "Táctico", "Defensivo"),
 *     descripcion, imagen,
 *     activaUnica: {
 *       nombre, descripcion,
 *       efecto: {
 *         tipo: "dano_area" | "curacion_equipo" | "buff_equipo" | "debuff_area",
 *         multiplicador,   // para dano_area / curacion_equipo
 *         stat, modificador, duracionTurnos, // para buff_equipo / debuff_area
 *       },
 *     },
 *     variantes: [ { nombre, descripcion, efecto } ], // alternativas opcionales, elegibles por el jugador
 *   }
 * -----------------------------------------------------------------------
 */

let _nextProtagonistId = 1;

function createEmptyProtagonist() {
  return {
    id: "protagonista_" + _nextProtagonistId++,
    nombre: "Nuevo protagonista",
    arquetipo: "Táctico",
    descripcion: "",
    imagen: "",
    activaUnica: {
      nombre: "Activa única",
      descripcion: "",
      efecto: { tipo: "dano_area", multiplicador: 1.0, stat: "atk", modificador: 0.1, duracionTurnos: 3 },
    },
    // Variantes ALTERNATIVAS de la activa única, opcionales — si hay al
    // menos una, el jugador puede elegir en la pantalla Protagonistas
    // cuál usar en vez de la de arriba (ver engine/protagonistCustomization.js).
    variantes: [],
  };
}
