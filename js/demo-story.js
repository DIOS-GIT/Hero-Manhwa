/**
 * demo-story.js
 * -----------------------------------------------------------------------
 * Historia corta de prueba (contenido genérico, no explícito) que toca
 * los 5 tipos de nodo del diagrama. Sirve para validar el motor de punta
 * a punta antes de que carguen contenido real desde el admin.
 *
 * IMPORTANTE: los IDs de nodo son únicos en TODA la historia (n001, n002...)
 * — no se repiten por capítulo/escena, así conectar nodos entre distintos
 * capítulos es tan simple como poner el ID en `next`.
 * -----------------------------------------------------------------------
 */

const DEMO_NODES = {

  n001: {
    type: "dialogue",
    chapter: "cap_01", scene: "escena_despertar",
    speaker: "Sistema",
    background: "vacio_blanco",
    text: "Abrís los ojos. Esta no es tu habitación. Esta no es tu vida.",
    next: "n002"
  },

  n002: {
    type: "event",
    chapter: "cap_01", scene: "escena_despertar",
    background: "vacio_blanco",
    text: "Los recuerdos de otra persona se acomodan en tu cabeza como si siempre hubieran estado ahí.",
    effects: { suerte: 1 },
    next: "n003"
  },

  n003: {
    type: "choice",
    chapter: "cap_01", scene: "escena_despertar",
    speaker: "Vos",
    background: "vacio_blanco",
    text: "¿Cómo reaccionás ante esto?",
    options: [
      { text: "Con calma. Hay que entender las reglas de este mundo primero.", effects: { inteligencia: 1 }, next: "n004" },
      { text: "Con pánico. Nada de esto tiene sentido.", effects: { carisma: -1 }, next: "n004" }
    ]
  },

  n004: {
    type: "condition",
    chapter: "cap_01", scene: "escena_despertar",
    checks: [
      { stat: "inteligencia", operator: ">=", value: 7, next: "n005a" }
    ],
    fallbackNext: "n005b"
  },

  n005a: {
    type: "dialogue",
    chapter: "cap_01", scene: "escena_primer_dia",
    speaker: "Vos",
    background: "habitacion",
    text: "Reconocés el patrón enseguida: esto se parece a los manhwas que leías antes de reencarnar.",
    next: "n006"
  },

  n005b: {
    type: "dialogue",
    chapter: "cap_01", scene: "escena_primer_dia",
    speaker: "Vos",
    background: "habitacion",
    text: "No tenés idea de en qué te metiste. Vas a tener que improvisar.",
    next: "n006"
  },

  n006: {
    type: "random",
    chapter: "cap_01", scene: "escena_primer_dia",
    background: "habitacion",
    text: "Bajás a la cocina a buscar respuestas.",
    outcomes: [
      { probability: 60, next: "n007a", effects: { carisma: 1 } },
      { probability: 40, next: "n007b", effects: {} }
    ]
  },

  n007a: {
    type: "dialogue",
    chapter: "cap_01", scene: "escena_primer_dia",
    speaker: "Ha-eun",
    background: "cocina",
    text: "\"¿Vos también te quedaste dormido hasta esta hora?\" — te dice alguien que, por los recuerdos prestados, reconocés como tu compañera de clase.",
    next: "n008"
  },

  n007b: {
    type: "dialogue",
    chapter: "cap_01", scene: "escena_primer_dia",
    speaker: "Sistema",
    background: "cocina",
    text: "La casa está vacía. Silencio total. Por ahora, estás solo con tus preguntas.",
    next: "n008"
  },

  n008: {
    type: "ending",
    chapter: "cap_01", scene: "final_demo",
    title: "Fin de la demo",
    summary: "Este es el final de la historia de prueba — acá seguiría el capítulo 2 cuando tu equipo cargue contenido real."
  }
};

const DEMO_START_NODE = "n001";

window.DEMO_STORY = { nodes: DEMO_NODES, startNode: DEMO_START_NODE };
