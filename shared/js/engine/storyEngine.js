/**
 * STORYENGINE.JS
 * -----------------------------------------------------------------------
 * Entrega la historia EN ORDEN: cada jugador tiene su propio puntero
 * (PlayerData.progresoHistoria) a qué capítulo/escena le toca ver. No
 * decide CUÁNDO se muestra una escena — eso lo decide mapUI.js al
 * entrar a un nodo de Evento — solo QUÉ escena toca y cómo avanzar.
 * -----------------------------------------------------------------------
 */

/** true si todavía queda alguna escena de historia sin mostrar. */
function hasStoryContentPending() {
  const { capituloIndex } = PlayerData.progresoHistoria;
  return capituloIndex < GameData.historia.capitulos.length;
}

/**
 * Devuelve la escena que le toca ver al jugador ahora mismo, en el
 * mismo formato que usa un evento aleatorio (para poder reusar
 * renderEventInteraction / resolveEventConsequence sin duplicar
 * código), o null si no queda historia cargada.
 */
function getCurrentStoryScene() {
  const { capituloIndex, escenaIndex } = PlayerData.progresoHistoria;
  const capitulo = GameData.historia.capitulos[capituloIndex];
  if (!capitulo) return null;
  const escena = capitulo.escenas[escenaIndex];
  if (!escena) return null;

  return {
    titulo: capitulo.titulo,
    texto: escena.texto,
    imagenFondo: escena.imagenFondo || "",
    imagenPersonaje: escena.imagenPersonaje || "",
    opciones: escena.opciones,
  };
}

/** Avanza el puntero de historia a la siguiente escena (o al siguiente capítulo). Guarda solo. */
function advanceStoryProgress() {
  const p = PlayerData.progresoHistoria;
  const capitulo = GameData.historia.capitulos[p.capituloIndex];
  if (!capitulo) return;

  if (p.escenaIndex + 1 < capitulo.escenas.length) {
    p.escenaIndex += 1;
  } else {
    p.capituloIndex += 1;
    p.escenaIndex = 0;
  }
  savePlayerData();
}
