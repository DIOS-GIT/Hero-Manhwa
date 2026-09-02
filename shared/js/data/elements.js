/**
 * ELEMENTS.JS
 * -----------------------------------------------------------------------
 * Define los VALORES DE FÁBRICA de los elementos y la "rueda de
 * ventajas" (tipo piedra-papel-tijera). La copia que realmente se usa
 * en el juego vive en GameData.elementos (editable en admin, pestaña
 * "Elementos") — este archivo solo aporta el punto de partida y las
 * funciones puras que leen esa copia.
 *
 * Cada elemento puede tener un elemento contra el que hace daño extra
 * ("fuerte contra"); el motor de combate deduce solo, a partir de eso,
 * quién es débil contra quién.
 * -----------------------------------------------------------------------
 */

const ELEMENTS_CONFIG_DEFAULT = {
  // "id" se usa internamente, "label" es lo que ve el jugador/admin.
  lista: [
    { id: "fuego", label: "Fuego", color: "#e0562f" },
    { id: "agua", label: "Agua", color: "#2f8fe0" },
    { id: "tierra", label: "Tierra", color: "#8a6a3c" },
    { id: "aire", label: "Aire", color: "#9fd6e0" },
    { id: "luz", label: "Luz", color: "#e8d16b" },
    { id: "oscuridad", label: "Oscuridad", color: "#5a3d7a" },
  ],

  // Rueda de ventajas: los 6 elementos de fábrica forman un solo círculo
  // cerrado — cada uno es FUERTE contra el siguiente.
  // Fuego -> Tierra -> Aire -> Agua -> Luz -> Oscuridad -> (Fuego)
  // Formato: "elemento_atacante": "elemento_defensor_debil_contra_mi" (o null = ninguno)
  ventajas: {
    fuego: "tierra",
    tierra: "aire",
    aire: "agua",
    agua: "luz",
    luz: "oscuridad",
    oscuridad: "fuego",
  },

  // Multiplicadores de daño según ventaja/desventaja elemental.
  multiplicadores: {
    ventaja: 1.5, // atacante tiene ventaja sobre el defensor
    desventaja: 0.66, // atacante tiene desventaja
  },
};

/**
 * Devuelve el multiplicador de daño elemental entre un atacante y un
 * defensor, según `reglasElementos.ventajas` (normalmente GameData.elementos).
 */
function getElementMultiplier(attackerElementId, defenderElementId, reglasElementos) {
  if (!attackerElementId || !defenderElementId || !reglasElementos) return 1.0;
  const { ventajas, multiplicadores } = reglasElementos;
  if (ventajas[attackerElementId] === defenderElementId) return multiplicadores.ventaja;
  if (ventajas[defenderElementId] === attackerElementId) return multiplicadores.desventaja;
  return 1.0;
}

// Nombrada "getElementDefById" (no "getElementById") a propósito, para
// no confundirla con la función nativa del navegador document.getElementById.
function getElementDefById(id, listaElementos) {
  if (!listaElementos) return null;
  return listaElementos.find((e) => e.id === id) || null;
}
