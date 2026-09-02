# Hero-Manhwa

> 📡 **¿Vas a subirlo a internet?** Ver **[DEPLOY.md](./DEPLOY.md)** —
> paso a paso para conectar Firebase (base de datos), Cloudinary
> (imágenes) y publicarlo gratis en GitHub Pages. Sin eso configurado,
> el juego sigue funcionando 100% local como se describe abajo.

Dos aplicaciones SEPARADAS que comparten el mismo motor y los mismos datos
(vía `shared/`), pensadas para abrirse por separado:

- **`admin/index.html`** — panel de administración: diseñas y balanceas
  cartas, protagonistas y reglas.
- **`juego/index.html`** — el juego real: pantalla de título, colección,
  protagonistas, equipos, tienda/gacha, mapa de runs, historial.

Ambas leen y escriben el mismo `localStorage` del navegador, así que si
las abres en el mismo navegador quedan sincronizadas (crea una carta en
el admin, aparece disponible para el gacha del juego).

## Cómo abrirlo

- Para diseñar/balancear: doble clic en `admin/index.html`.
- Para jugar: doble clic en `juego/index.html`.

No hace falta instalar nada ni tener internet — las tipografías están
auto-alojadas (no dependen de Google Fonts ni de ningún CDN).

## Estructura del proyecto

```
admin/
  index.html            → punto de entrada del admin
  css/admin.css           → layout exclusivo del admin
  js/
    cardEditor.js, protagonistEditor.js, rulesEditor.js,
    teamBuilder.js, dataPanel.js, admin-main.js

juego/
  index.html            → punto de entrada del juego (con pantalla de título)
  css/home.css            → layout exclusivo del juego
  js/
    game-main.js           → arranque + pantalla de título + navegación
    ui/
      collectionUI.js, protagonistsUI.js, teamPresetsUI.js,
      gachaHomeUI.js, mapUI.js, historyUI.js, homeUI.js

shared/                  → TODO lo que usan ambas apps
  assets/
    fonts/                 → .woff2 auto-alojados (Cinzel, Cinzel
                            Decorative, Cormorant Garamond, Manrope,
                            JetBrains Mono)
    cards/comunes|raras|epicas|legendarias|miticas/  → imágenes de cartas
    elements/, status/, ui/  → íconos
  css/
    tokens.css              → fuente única de verdad: paleta, tipografía,
                              radios, sombras (edita SOLO aquí para
                              cambiar el look de ambas apps a la vez)
    fonts.css                 → declaraciones @font-face
    base.css                   → botones, inputs, fieldsets genéricos
    battle.css                  → tablero de combate (lo usan admin y juego)
  js/
    data/                      → cartas, protagonistas, elementos, clases,
                                 estados, reglas, economía, nodos, eventos,
                                 tienda — todo lo editable del diseño
    storage.js                  → guarda/carga cartas+reglas+protagonistas
    engine/
      playerStorage.js           → guarda/carga moneda, colección,
                                   presets, historial del JUGADOR
      combatCardFactory.js, formation.js, turnOrder.js, energy.js,
      targeting.js, damage.js, statusEffects.js, actions.js, combat.js,
      simpleAI.js                 → motor de combate
      protagonistActions.js         → activa única del protagonista
      gacha.js, mapGenerator.js       → gacha y generación de mapas de run
      runState.js                      → una run activa de punta a punta
    ui/battle/
      battlefieldUI.js, turnQueueUI.js, logUI.js, combatController.js
                                        → pantalla de combate compartida
```

## Imágenes de cartas y protagonistas

Ya no se escribe un nombre de archivo a mano: en **Admin: Cartas** y
**Admin: Protagonistas** hay un campo "Imagen" con botón de subida de
archivo real. Al elegir una imagen:

1. Se lee del disco, se redimensiona (ancho máximo 480px) y se
   comprime a JPEG con `shared/js/engine/imageUtils.js`.
2. Se guarda como texto base64 DENTRO de la carta/protagonista — es
   decir, dentro del mismo `.json` que ya exportas/importas desde
   "Admin: Datos". No hace falta copiar nada a mano a las carpetas de
   `shared/assets/cards/`.
3. Se ve al instante en la lista del admin (miniatura), en la
   Colección y el códice de Protagonistas del juego, y como un
   pequeño retrato en cada casilla durante el combate.

**Por qué se comprime**: el navegador no puede escribir archivos al
disco por seguridad, así que la única forma de que una app 100%
offline "suba" una imagen es guardarla como texto dentro de los datos
del juego. Sin comprimir, unas pocas decenas de cartas con arte grande
(tus artes vienen en ~1024×1536) llenarían el límite de `localStorage`
del navegador (~5-10 MB). Si en algún momento notas que el navegador
se queja de espacio al guardar muchas cartas con imagen, es momento de
bajar `IMAGE_UPLOAD_CONFIG.anchoMaximoPx` en `imageUtils.js` (por
ejemplo a 360) — es el único número que hay que tocar.

Las carpetas `shared/assets/cards/<rareza>/` se mantienen por si en
algún momento prefieres referenciar archivos externos en vez de
subirlos, pero hoy no las usa ningún flujo del admin.

## Novedades de esta versión: reliquias, historial de movimientos e IA nueva

- **Reliquias arriba (estilo Slay the Spire)**: los efectos permanentes
  que vas ganando en una run (buffs/debuffs de eventos, objetos de
  tienda con efecto duradero) aparecen como íconos en una barra arriba
  del mapa y del combate. Al presionar uno se ve su descripción,
  verde si es positivo, rojo si es negativo. Vive en
  `shared/js/ui/battle/relicsBarUI.js`.
- **Historial de movimientos como sidebar (estilo Yu-Gi-Oh)**: durante
  el combate, a la derecha del tablero (o debajo, en pantallas
  angostas) hay un panel fijo con TODOS los movimientos de la partida
  en orden, cada uno con su número de turno. Reemplaza al log chico
  que había antes. Vive en `shared/js/ui/battle/moveHistoryUI.js`.
- **IA nueva** (`shared/js/engine/smartAI.js`, reemplaza al placeholder
  `simpleAI.js` que ya no existe): para cada turno enemigo, simula el
  resultado de cada acción legal disponible y elige la de mejor
  puntaje según una heurística (kills, HP propio vs. rival, estados de
  control aplicados). Sigue siendo JavaScript puro, sin ninguna
  tecnología externa — el espacio de decisiones por turno es chico y
  no hace falta nada más pesado (ver el comentario al inicio del
  archivo para el razonamiento completo, incluida su limitación
  conocida: solo mira 1 turno hacia adelante).

## Rueda de 6 elementos y Rutas editables desde el admin

**Elementos**: Fuego → Tierra → Aire → Agua → Luz → Oscuridad → (vuelve
a Fuego). Los 6 forman un solo círculo cerrado — cada uno le gana al
siguiente y pierde contra el anterior (ver el razonamiento completo en
`shared/js/data/elements.js`). Ya no hay ningún elemento aislado.

**Rutas** (`Admin: Rutas`, nueva pestaña): todo lo que antes era fijo
en `RUN_CONFIG` ahora es editable y se guarda con el resto del diseño
— pisos antes del jefe, cantidad de nodos por piso, qué tan probable
es cada tipo de nodo, y por cada tipo de combate (normal/élite/jefe):
tamaño del equipo enemigo, recompensa de moneda, y qué rarezas puede
usar. Así puedes hacer que las runs no salgan siempre iguales, sin
tocar código. Vive en `shared/js/data/runConfig.js` (fábrica) +
`admin/js/routesEditor.js` (formulario) — el motor
(`mapGenerator.js`/`runState.js`) siempre lee de `GameData.rutas`, ya
no de una constante fija.

## Tablero de combate estilo Pokémon TCG (carta en foco + banca)

Como aquí hay 4 cartas activas por bando (no 1 activa + banca inactiva
como en Pokémon), se adaptó así: **una carta se ve grande con su arte
completo** (la que tiene el turno, o la que toques), y las otras 3
quedan como una **banca chica** debajo — pero las 4 siguen vivas y en
juego, ninguna está "descansando".

- **Tocar tu carta con el turno** abre/cierra sus acciones (atacar,
  defender, habilidades…) como una hoja pegada a la carta — ya no hay
  un panel de botones siempre visible.
- **Tocar cualquier otra carta** (tuya o rival) solo la agranda para
  verla mejor, sin activar nada.
- Vive en `shared/js/ui/battle/battlefieldUI.js` (dibuja
  `.focuscard`/`.benchcard`) y `combatController.js` (decide qué pasa
  al tocar: seleccionar objetivo, abrir acciones, o solo cambiar el
  foco — ver `handleCardTap()`).

**Sobre los elementos nuevos (Luz/Oscuridad)**: son dos sistemas
separados en `shared/js/data/elements.js` — la rueda de 4 (Fuego→
Tierra→Aire→Agua→Fuego) y el par Luz↔Oscuridad, que solo se hacen
ventaja/desventaja entre ellos. Ninguno de los 4 elementales interactúa
con Luz u Oscuridad todavía; si quieres que sí lo hagan, hay que
rediseñar `ADVANTAGE_MAP`.

Probado con una prueba de humo con DOM real: entrar a un combate desde
la aventura, confirmar 1 carta en foco por bando + banca, tocar la
carta con turno (abre hoja de acciones), tocar una carta de banca
(cambia el foco y cierra la hoja), y atacar desde la hoja (se registra
en el log). Todo sin errores.

## Reorganización en hub + pantallas separadas (mobile-first)

El juego ya no vive como sub-pestañas apretadas dentro de una sola
pantalla. Ahora es un **hub** (como el lobby de un juego de teléfono)
con botones grandes que abren pantallas completas propias:

- **`juego/js/ui/hubUI.js`** — pantalla principal tras "Comenzar/
  Continuar": cabecera con moneda, aviso de "run en progreso" si hay
  una sin terminar, vista previa de tu equipo actual (las 4 cartas del
  último preset usado), y botones grandes a Colección, Protagonistas,
  Tienda e Historial. El botón destacado "⚔️ Iniciar Aventura" lleva al
  flujo de armar equipo → mapa → combate.
- **`juego/js/ui/screenHeaderUI.js`** — el encabezado con flecha de
  volver que usa cada pantalla secundaria.
- **Equipos** (`teamPresetsUI.js`) ya no es un botón del hub — vive
  DENTRO del flujo de Aventura (se llega ahí con "✏️ Gestionar
  equipos" desde la pantalla de iniciar aventura), tal como se decidió.
- La **run activa ahora se guarda en `localStorage`**
  (`shared/js/engine/runState.js` — `saveActiveRun()` /
  `loadActiveRunFromStorage()` / `clearActiveRun()`), así que el aviso
  "tienes una run en progreso" sobrevive a cerrar el navegador.
- Se guarda cuál fue el **último preset usado**
  (`PlayerData.ultimoPresetId`) para la vista previa de equipo del hub.

**Diseño mobile-first de verdad**: `juego/css/home.css` se reescribió
completo — las reglas base (sin `@media`) son las que ve un teléfono:
una columna donde corresponde, botones con alto mínimo de 46px para
que sean cómodos de tocar, cuadrícula de 2 columnas en el hub y la
colección, y soporte de áreas seguras (`env(safe-area-inset-*)`) para
teléfonos con notch. Las reglas dentro de `@media (min-width: 700px)`
y `@media (min-width: 1000px)` son las que AMPLÍAN el layout para
tablet/escritorio — no al revés, como estaba antes.

Probado con una prueba de humo con DOM real (jsdom): título → hub →
entrar y volver de cada pantalla → gacha → armar equipo → guardar
preset → iniciar aventura → confirmar que la run quedó persistida en
localStorage → volver al hub y ver el aviso de run en progreso y la
vista previa del equipo. Todo sin errores.

## El rediseño visual

Dirección de arte tipo fantasía oscura (referencia: Slay the Spire) en
vez del panel plano gris que había antes:

- **Tipografía real, no una sola fuente para todo**: Cinzel Decorative
  para el logo, Cinzel para encabezados, Cormorant Garamond (con
  cursiva) para texto narrativo de eventos/descripciones, Manrope para
  toda la interfaz, y JetBrains Mono para los números de estadísticas
  — así los números de HP/ATQ/moneda se leen como un HUD de juego, no
  como texto suelto.
- **Fondo con profundidad** (viñetas de color sutiles) en vez de un
  solo tono plano.
- **Cartas con marco por rareza** en vez de un borde genérico —
  incluida la mítica con borde en gradiente.
- **Pantalla de título propia del juego** con resumen de tu progreso
  (moneda, colección, runs) si ya jugaste antes, o bienvenida si es tu
  primera vez.

Si quieres ajustar el look, **`shared/css/tokens.css`** es el único
archivo que deberías tocar para cambiar colores/tipografía en las dos
apps a la vez — todo lo demás usa esas variables.

## Protagonistas (lo que faltaba)

- **Admin → pestaña "Protagonistas"**: crea/edita comandantes con su
  activa única (daño en área, curación de equipo, buff de equipo,
  debuff de área — cada una configurable con multiplicador/stat/
  duración).
- **Juego → pestaña "Protagonistas"**: códice de solo lectura, siempre
  disponibles (no se consiguen por gacha — son comandantes, no
  coleccionables).
- **Juego → pestaña "Equipos"**: al armar un preset, eliges qué
  protagonista lo acompaña.
- **En combate**: si tu equipo trae protagonista, aparece un botón
  "⭐ activa" en tu panel de acciones, usable una vez por combate, sin
  ocupar ninguna de las 4 posiciones — tal como se definió en el
  diseño (punto #12).

## Cómo se usa — Admin

1. **Cartas** — crea/edita/borra cartas con formularios.
2. **Protagonistas** — crea/edita comandantes y su activa única.
3. **Reglas globales** — ajusta los números de balance del combate.
4. **Equipos y combate** — prueba combates sueltos (ahora también con
   protagonista opcional) para balancear rápido.
5. **Datos** — exporta/importa cartas + reglas + protagonistas (`.json`)
   para compartir el estado del diseño en una sesión futura.

## Cómo se usa — Juego

1. **Pantalla de título** → "Comenzar" (o "Continuar" si ya jugaste).
2. **Colección** — cartas obtenidas y bloqueadas, con filtros y botón
   de revivir para las caídas.
3. **Protagonistas** — códice de comandantes disponibles.
4. **Equipos** — arma presets de hasta 4 cartas + protagonista.
5. **Tienda / Gacha** — tira por cartas nuevas.
6. **Mapa (Run)** — elige un preset, inicia una run, recorre el mapa
   ramificado de 6 tipos de nodo.
7. **Historial** — cada run completa queda registrada con detalle.

## Cosas marcadas explícitamente como PENDIENTES o PROVISIONALES

- `shared/js/engine/smartAI.js` — buena para el tamaño de combate actual (4v4, pocas acciones por turno), pero solo mira 1 turno hacia adelante; si en algún momento se siente débil, el siguiente paso natural es hacerla mirar 2 turnos, reusando las mismas piezas.
- `shared/js/data/economyConfig.js` — costo de revivir y moneda por
  duplicado son valores PROVISIONALES ("eso lo decidimos después").
- `shared/js/data/eventsPool.js` y `shopPool.js` — solo 3 ejemplos cada
  uno; agrega los tuyos con la misma forma.
- `shared/js/data/protagonists.js` — solo 2 protagonistas de ejemplo.
- Los datos del JUGADOR (moneda, colección, presets, historial) no
  tienen su propio exportar/importar todavía (el admin sí lo tiene
  para cartas/reglas/protagonistas) — fácil de agregar después con el
  mismo patrón de `shared/js/storage.js`.
- La generación de energía "por turno" se interpretó como "cada vez
  que le toca actuar a una carta de ese equipo" (ver comentario en
  `shared/js/engine/energy.js`).

## Si vuelves con cambios para que Claude los entienda

Exporta el diseño desde **Admin → Datos** (cartas + reglas +
protagonistas). Si además modificaste archivos de código directamente,
tráelos puntuales — cada uno tiene un propósito único y está comentado.
