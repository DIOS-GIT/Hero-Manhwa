/**
 * NODETYPES.JS
 * -----------------------------------------------------------------------
 * Los 6 tipos de nodo del mapa de runs, ya cerrados en el diseño.
 * Cada tipo solo trae su etiqueta/ícono/color para la UI — el
 * COMPORTAMIENTO de cada uno vive en su propio archivo del motor
 * (engine/nodeResolvers/*.js), así que agregar un tipo de nodo nuevo
 * en el futuro no obliga a tocar el mapa ni el motor existente.
 * -----------------------------------------------------------------------
 */

const NODE_TYPES = {
  combate: { id: "combate", label: "Combate", icono: "⚔️", color: "#9aa3ad" },
  elite: { id: "elite", label: "Élite", icono: "💀", color: "#e0473f" },
  jefe: { id: "jefe", label: "Jefe", icono: "👑", color: "#e0b93f" },
  evento: { id: "evento", label: "Evento", icono: "🎁", color: "#a463e0" },
  tienda: { id: "tienda", label: "Tienda", icono: "🏪", color: "#4f8fe0" },
  descanso: { id: "descanso", label: "Descanso", icono: "🔥", color: "#4fae6a" },
};

function getNodeType(id) {
  return NODE_TYPES[id] || null;
}
