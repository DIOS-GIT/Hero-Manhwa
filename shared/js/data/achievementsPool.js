/**
 * ACHIEVEMENTSPOOL.JS
 * -----------------------------------------------------------------------
 * Catálogo de logros: de una sola vez, no diarios (para no mezclarlos
 * con la racha). Se editan a mano acá, igual que eventsPool.js — no
 * hay pantalla de admin para esto.
 *
 * FORMA DE UN LOGRO:
 *   id, categoria ("combate"|"coleccion"|"progreso"|"gacha"), titulo,
 *   descripcion, tipo (qué mide, ver achievementsEngine.js:getAchievementProgress),
 *   meta (número a alcanzar), rareza (solo para tipo "coleccionRareza"),
 *   recompensa: { moneda, cofre (rareza o null) }
 * -----------------------------------------------------------------------
 */

const ACHIEVEMENTS_POOL = [
  { id: "logro_primera_sangre", categoria: "combate", titulo: "Primera sangre", descripcion: "Gana tu primer combate.", tipo: "victorias", meta: 1, recompensa: { moneda: 50, cofre: null } },
  { id: "logro_veterano", categoria: "combate", titulo: "Veterano", descripcion: "Gana 25 combates.", tipo: "victorias", meta: 25, recompensa: { moneda: 200, cofre: "rara" } },
  { id: "logro_leyenda_combate", categoria: "combate", titulo: "Leyenda del combate", descripcion: "Gana 100 combates.", tipo: "victorias", meta: 100, recompensa: { moneda: 600, cofre: "epica" } },

  { id: "logro_coleccionista_novato", categoria: "coleccion", titulo: "Coleccionista novato", descripcion: "Consigue 5 cartas distintas.", tipo: "coleccionTotal", meta: 5, recompensa: { moneda: 80, cofre: null } },
  { id: "logro_coleccionista_experto", categoria: "coleccion", titulo: "Coleccionista experto", descripcion: "Consigue 20 cartas distintas.", tipo: "coleccionTotal", meta: 20, recompensa: { moneda: 300, cofre: "rara" } },
  { id: "logro_cazador_leyendas", categoria: "coleccion", titulo: "Cazador de leyendas", descripcion: "Consigue 3 cartas legendarias.", tipo: "coleccionRareza", rareza: "legendaria", meta: 3, recompensa: { moneda: 400, cofre: "legendaria" } },

  { id: "logro_explorador", categoria: "progreso", titulo: "Explorador", descripcion: "Llega al nodo 5 en una sola run.", tipo: "profundidadMaxima", meta: 5, recompensa: { moneda: 100, cofre: null } },
  { id: "logro_sobreviviente", categoria: "progreso", titulo: "Sobreviviente", descripcion: "Llega al nodo 10 en una sola run.", tipo: "profundidadMaxima", meta: 10, recompensa: { moneda: 250, cofre: "epica" } },
  { id: "logro_conquistador", categoria: "progreso", titulo: "Conquistador", descripcion: "Completa una run entera (derrota al jefe).", tipo: "runsGanadas", meta: 1, recompensa: { moneda: 200, cofre: "rara" } },

  { id: "logro_apostador", categoria: "gacha", titulo: "Apostador", descripcion: "Haz 10 tiradas de gacha.", tipo: "gachaTiradas", meta: 10, recompensa: { moneda: 100, cofre: null } },
  { id: "logro_adicto_gacha", categoria: "gacha", titulo: "Adicto al gacha", descripcion: "Haz 50 tiradas de gacha.", tipo: "gachaTiradas", meta: 50, recompensa: { moneda: 350, cofre: "epica" } },
];
