/**
 * STORYCONFIG.JS
 * -----------------------------------------------------------------------
 * Valores de FÁBRICA de la historia principal: arranca VACÍA a
 * propósito (el contenido narrativo lo escribe el usuario desde el
 * admin, pestaña "Historia"). La copia editable vive en
 * GameData.historia.
 *
 * FORMA:
 *   {
 *     capitulos: [
 *       {
 *         id, titulo,
 *         escenas: [
 *           {
 *             id, texto,
 *             imagenFondo: "",     // opcional, estilo visual novel
 *             imagenPersonaje: "", // opcional, estilo visual novel
 *             opciones: [
 *               {
 *                 texto: "lo que ve el jugador en el botón",
 *                 consecuencia: { tipo: "nada" | "moneda" | "hp" | "buffCarta" | "debuffCarta", ... }
 *                 // misma forma que en eventsPool.js — se resuelve con
 *                 // la misma función (resolveEventConsequence)
 *               },
 *             ],
 *           },
 *         ],
 *       },
 *     ],
 *   }
 *
 * Los capítulos y escenas se reproducen EN ORDEN: cada vez que el
 * jugador cae en un nodo 🎁 Evento del mapa, si todavía queda historia
 * sin ver se muestra la siguiente escena en vez de un evento al azar.
 * Cuando se termina toda la historia cargada, los nodos de Evento
 * vuelven a usar EVENTS_POOL (aleatorios) como siempre.
 * -----------------------------------------------------------------------
 */

const STORY_CONFIG_DEFAULT = {
  capitulos: [],
};
