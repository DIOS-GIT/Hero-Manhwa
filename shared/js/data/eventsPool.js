/**
 * EVENTSPOOL.JS
 * -----------------------------------------------------------------------
 * Catálogo de eventos para el nodo 🎁 Evento: texto + 2-3 opciones con
 * consecuencias. Trae 3 eventos de EJEMPLO para que el mapa funcione
 * de una vez — agrega los tuyos copiando la forma de uno existente.
 *
 * FORMA DE UN EVENTO:
 *   {
 *     id, titulo, texto,
 *     opciones: [
 *       {
 *         texto: "lo que ve el jugador en el botón",
 *         consecuencia: {
 *           tipo: "moneda" | "hp" | "buffCarta" | "debuffCarta" | "objeto" | "nada",
 *           // para "moneda": cantidad (positiva o negativa)
 *           // para "hp": cantidad (positiva=cura, negativa=daño), aplica a
 *           //            una carta al azar del equipo salvo objetivo:"todas"
 *           // para "buffCarta"/"debuffCarta": stat + modificador (0.1 = +10%),
 *           //            y si es permanente (dura el resto de la run) u objeto
 *           // para "objeto": nombre del objeto que se agrega al inventario de la run
 *           cantidad: 0,
 *           stat: null,
 *           modificador: 0,
 *           objetivo: "aleatoria", // "aleatoria" | "todas"
 *           objeto: null,
 *         },
 *       },
 *     ],
 *   }
 * -----------------------------------------------------------------------
 */

const EVENTS_POOL = [
  {
    id: "evento_altar_abandonado",
    titulo: "Altar abandonado",
    texto: "Encuentras un altar cubierto de musgo. Todavía brilla con energía residual.",
    opciones: [
      {
        texto: "Rezar y pedir fuerza (una carta al azar gana +10% ATQ el resto de la run)",
        consecuencia: { tipo: "buffCarta", stat: "atk", modificador: 0.1, objetivo: "aleatoria" },
      },
      {
        texto: "Saquear el altar (ganas moneda, pero una carta al azar pierde HP)",
        consecuencia: { tipo: "moneda", cantidad: 60 },
        consecuenciaExtra: { tipo: "hp", cantidad: -15, objetivo: "aleatoria" },
      },
      {
        texto: "Ignorar el altar y seguir",
        consecuencia: { tipo: "nada" },
      },
    ],
  },
  {
    id: "evento_mercader_herido",
    titulo: "Mercader herido",
    texto: "Un mercader malherido te pide ayuda a cambio de parte de su mercancía.",
    opciones: [
      {
        texto: "Ayudarlo (pierdes algo de HP en el proceso, ganas moneda)",
        consecuencia: { tipo: "hp", cantidad: -10, objetivo: "aleatoria" },
        consecuenciaExtra: { tipo: "moneda", cantidad: 80 },
      },
      {
        texto: "Ignorarlo y seguir tu camino",
        consecuencia: { tipo: "nada" },
      },
    ],
  },
  {
    id: "evento_fuente_extrana",
    titulo: "Fuente extraña",
    texto: "Una fuente de agua oscura burbujea sola. Algo en ella se siente peligroso pero poderoso.",
    opciones: [
      {
        texto: "Beber (una carta al azar gana +15% DEF, pero -10% Velocidad el resto de la run)",
        consecuencia: { tipo: "buffCarta", stat: "def", modificador: 0.15, objetivo: "aleatoria" },
        consecuenciaExtra: { tipo: "debuffCarta", stat: "velocidad", modificador: -0.1, objetivo: "aleatoria" },
      },
      {
        texto: "No arriesgarse",
        consecuencia: { tipo: "nada" },
      },
    ],
  },
];

function getRandomEvent() {
  return EVENTS_POOL[Math.floor(Math.random() * EVENTS_POOL.length)];
}
