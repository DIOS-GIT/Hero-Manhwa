/**
 * DATAINDEX.JS
 * -----------------------------------------------------------------------
 * Punto único de acceso a TODAS las cartas del juego, sin importar su
 * rareza. El resto del código (motor, admin, UI) nunca debe leer
 * CARDS_COMUNES, CARDS_RARAS, etc. directamente — siempre pasa por las
 * funciones de aquí, para que si mañana cambia cómo se guardan los
 * datos (ej. pasan a venir de localStorage en vez de estos archivos),
 * solo haya que tocar este archivo.
 * -----------------------------------------------------------------------
 */

function getAllBaseCards() {
  return [
    ...CARDS_COMUNES,
    ...CARDS_RARAS,
    ...CARDS_EPICAS,
    ...CARDS_LEGENDARIAS,
    ...CARDS_MITICAS,
  ];
}

function getCardsArrayByRarity(rareza) {
  // OJO: lee del catálogo VIVO (GameData.cartas — lo que edita el admin),
  // no de los arrays de fábrica de arriba. Si leyera de ahí, el gacha
  // nunca podría dar una carta nueva creada desde el admin.
  return GameData.cartas.filter((c) => c.rareza === rareza);
}
