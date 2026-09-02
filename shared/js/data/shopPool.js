/**
 * SHOPPOOL.JS
 * -----------------------------------------------------------------------
 * Valores de FÁBRICA de los objetos que se pueden comprar en el nodo
 * 🏪 Tienda (dentro del mapa de una run). La copia que realmente se usa
 * en el juego vive en GameData.tienda.objetos (editable en admin,
 * pestaña "Tienda") — este archivo solo aporta el punto de partida.
 *
 * Además de estos objetos, la pantalla de tienda siempre ofrece
 * "Revivir carta caída" y "Tirada de gacha" — esas dos opciones NO
 * viven acá porque ya tienen su propia lógica en engine/runState.js.
 *
 * FORMA DE UN OBJETO:
 *   {
 *     id, nombre, descripcion, costo,
 *     efecto: {
 *       tipo: "hp" | "buffCarta",
 *       // para "hp": cantidad (0-1 si esPorcentaje, o un número fijo de HP)
 *       cantidad, esPorcentaje,
 *       // para "buffCarta": stat + modificador (0.1 = +10%, permanente el
 *       //                   resto de la run)
 *       stat, modificador,
 *     }
 *   }
 * El jugador siempre elige a qué carta de su equipo se lo aplica.
 * -----------------------------------------------------------------------
 */

const SHOP_CONFIG_DEFAULT = {
  objetos: [
    {
      id: "objeto_pocion_menor",
      nombre: "Poción menor",
      descripcion: "Cura 25% de HP a una carta elegida.",
      costo: 40,
      efecto: { tipo: "hp", cantidad: 0.25, esPorcentaje: true },
    },
    {
      id: "objeto_amuleto_fuerza",
      nombre: "Amuleto de fuerza",
      descripcion: "+10% ATQ permanente (el resto de la run) a una carta elegida.",
      costo: 90,
      efecto: { tipo: "buffCarta", stat: "atk", modificador: 0.1 },
    },
    {
      id: "objeto_placa_reforzada",
      nombre: "Placa reforzada",
      descripcion: "+12% DEF permanente (el resto de la run) a una carta elegida.",
      costo: 90,
      efecto: { tipo: "buffCarta", stat: "def", modificador: 0.12 },
    },
  ],
};
