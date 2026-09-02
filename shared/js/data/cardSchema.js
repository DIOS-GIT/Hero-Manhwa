/**
 * CARDSCHEMA.JS
 * -----------------------------------------------------------------------
 * Define la FORMA de una carta (qué campos tiene) y una función para
 * crear cartas nuevas con valores por defecto. El admin usa
 * createEmptyCard() cada vez que le das a "Nueva carta", y luego tú
 * rellenas los campos desde el formulario — nunca escribiendo JSON a
 * mano.
 *
 * CAMPOS DE UNA CARTA:
 *   id            → identificador único (se genera solo)
 *   nombre        → nombre de la carta
 *   rareza        → "comun" | "rara" | "epica" | "legendaria" | "mitica"
 *   clase         → id de js/data/classes.js
 *   elemento      → id de js/data/elements.js
 *   imagen        → ruta relativa dentro de /assets/cards/<rareza>/
 *   stats: {
 *     hp, atk, def, velocidad
 *   }
 *   pasivas       → lista de pasivas de posición (ver ejemplo abajo)
 *   habilidades   → lista de habilidades activas (ver ejemplo abajo)
 *   esFMC         → true/false — etiqueta aparte de la rareza para marcar
 *                   cartas "centro de estrategia" (ver admin, pestaña Cartas)
 *   arquetipo     → id del arquetipo dentro de su clase (opcional, informativo
 *                   + usado por el botón 🎲 Random del admin — ver
 *                   data/archetypesConfig.js). "" si se armó a mano sin arquetipo.
 *   evolucion: {
 *     puedeEvolucionar: false,
 *     siguienteCartaId: "",     // id de OTRA carta ya cargada — su forma evolucionada
 *     fragmentosRequeridos: 20, // fragmentos de ESTA carta (vienen de duplicados)
 *     monedaRequerida: 200,
 *     nivelMinimoRequerido: null, // null = usa el nivel máximo de su rareza actual
 *   }
 *
 * PASIVA DE POSICIÓN (ejemplo, el tanque):
 *   {
 *     nombre: "Bastión",
 *     posicionRequerida: "primera_linea", // o "retaguardia" o "cualquiera"
 *     efecto: { stat: "def", modificador: 0.15 } // +15% DEF
 *   }
 *
 * HABILIDAD ACTIVA (ejemplo):
 *   {
 *     nombre: "Golpe certero",
 *     costoEnergia: 3,
 *     tipoObjetivo: "un_enemigo", // un_enemigo | area | aliado | uno_mismo
 *     efecto: { tipo: "dano", multiplicador: 1.5 },
 *     estadoQueAplica: null, // o un id de js/data/statuses.js
 *     cooldownTurnos: 0
 *   }
 * -----------------------------------------------------------------------
 */

const RAREZAS = ["comun", "rara", "epica", "legendaria", "mitica"];

let _nextCardId = 1;

function createEmptyCard() {
  const card = {
    id: "card_" + _nextCardId++,
    nombre: "Nueva carta",
    rareza: "comun",
    clase: "dps",
    elemento: "fuego",
    imagen: "",
    stats: {
      hp: 100,
      atk: 20,
      def: 10,
      velocidad: 10,
    },
    pasivas: [],
    habilidades: [],
    esFMC: false,
    arquetipo: "",
    evolucion: {
      puedeEvolucionar: false,
      siguienteCartaId: "",
      fragmentosRequeridos: 20,
      monedaRequerida: 200,
      nivelMinimoRequerido: null,
    },
  };
  return card;
}

// NOTA: antes existía aquí un mapeo de rareza -> carpeta de assets,
// pensado para cuando la imagen se ponía como un nombre de archivo a
// mano. Ya no hace falta: desde el admin ahora se sube la imagen real
// y queda guardada dentro de la carta (ver shared/js/engine/imageUtils.js).
// Las carpetas shared/assets/cards/<rareza>/ se mantienen por si algún
// día prefieres referenciar archivos externos en vez de subirlos.
