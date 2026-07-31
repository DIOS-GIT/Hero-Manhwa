# Cómo conecta esto con el resto del proyecto

Este `index.html` + `js/*` es la parte del **jugador**: pantalla de reencarnación
(los 5 pasos) y el lector estilo webtoon que corre sobre el motor de nodos.
No tenía tus archivos reales de `manhwa-legend` en esta conversación, así que
construí todo de nuevo siguiendo la arquitectura que ya habían definido
(Firestore + Auth + GitHub Pages, sin build tools) — pegalo sobre tu repo
existente y ajustá rutas si tu `firebase-config.js` vive en otro lado.

## Qué es local todavía (a propósito, para poder probarlo ya)

- **`js/game-data.js`** — protagonistas, rutas, trabajos, vivienda y heroínas
  están hardcodeados acá. Cuando quieras que salgan de Firestore, el patrón
  es el mismo que ya usás en el admin: leer las colecciones
  `protagonists / routes / jobs / housing / heroines` y reemplazar
  `window.GAME_DATA` por el resultado de esa consulta antes de llamar a
  `initCharacterCreation()`.
- **`js/demo-story.js`** — la historia de prueba con los 5 tipos de nodo
  (dialogue, choice, event, condition, random) más un nodo `ending`. Cuando
  el admin ya tenga contenido real, `startStory()` en `main.js` debería
  traer el mapa de nodos desde Firestore en vez de `window.DEMO_STORY`.

## Motor de nodos (`js/story-engine.js`)

No cambia nada de lo anterior — `StoryEngine` sigue sin saber nada de UI ni
de Firestore, solo recibe un mapa plano de nodos `{ [nodeId]: nodo }` y un
nodo inicial. Lo nuevo respecto a la versión anterior es que ahora soporta
los 5 tipos del diagrama en vez de solo diálogo/decisión:

| tipo        | qué hace                                                        |
|-------------|------------------------------------------------------------------|
| `dialogue`  | texto + `next`                                                   |
| `choice`    | el jugador elige entre `options[]` (cada una con `effects`/`next`)|
| `event`     | narrativa automática que aplica `effects` y sigue a `next`        |
| `condition` | evalúa `checks[]` (stat o flag) y salta al primer `next` que cumpla|
| `random`    | "ruleta" — sortea entre `outcomes[]` según `probability`          |

Los IDs de nodo son únicos en toda la historia (`n001`, `n002`...), no se
repiten por capítulo/escena — así el admin puede conectar cualquier nodo con
cualquier otro sin importar en qué capítulo estén.

## Cloudinary (imágenes)

Ni los fondos ni los retratos de personaje están resolviendo URLs reales
todavía — en `game-data.js`, `demo-story.js` y en el render de `main.js`
dejé placeholders (gradientes CSS) donde en producción iría la URL de
Cloudinary. El único cambio necesario es:

```js
// en vez de un div con gradiente CSS:
<div class="node-panel-bg" style="background-image:url('${node.backgroundUrl}')">
```

donde `node.backgroundUrl` sea la URL que guardaste en el fondo elegido
desde el panel admin (`sec-fondos` que ya armamos) — el picker de fondos
del admin es justamente lo que le da ese dato a cada nodo.

## Qué falta para producción

- Reemplazar `game-data.js` y `demo-story.js` por lecturas reales a Firestore.
- Reemplazar los placeholders de imagen por las URLs de Cloudinary.
- Guardar el progreso del jugador en Firestore en vez de solo en memoria
  (`engine.serialize()` ya te da el objeto listo para guardar; falta el
  `setDoc`/`getDoc` con el UID del jugador).
- Verificación de edad real antes de `screen-boot` — sigue siendo una
  decisión legal de ustedes según dónde publiquen esto, no la resolví acá.
