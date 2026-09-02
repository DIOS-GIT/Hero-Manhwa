/**
 * STORAGE.JS
 * -----------------------------------------------------------------------
 * Esta es la ÚNICA fuente de verdad de los datos del juego mientras
 * juegas/pruebas. Tanto el admin como el motor de combate leen y
 * escriben sobre el mismo objeto `GameData` que vive aquí — por eso
 * cualquier cambio que hagas en el admin se refleja al instante en el
 * combate, sin recargar la página.
 *
 * GameData se guarda automáticamente en localStorage (persiste aunque
 * cierres el navegador), y además puedes:
 *
 *   - EXPORTAR: descarga un archivo .json con todo (cartas + reglas).
 *     Este es el archivo que me puedes traer en una sesión futura para
 *     que yo entienda exactamente cómo quedaron tus pruebas.
 *   - IMPORTAR: carga un archivo .json exportado antes, reemplazando
 *     los datos actuales.
 *
 * Nunca necesitas abrir ni editar ese .json a mano — es solo el
 * "guardado" que produce el admin.
 * -----------------------------------------------------------------------
 */

const STORAGE_KEY = "cardGameOffline_v1";

// Objeto en memoria que usan admin y motor. Se llena en initGameData().
let GameData = {
  cartas: [],
  reglas: null,
  protagonistas: [],
  rutas: null,
  niveles: null,
  elementos: null,
  tienda: null,
  pantallas: null,
  historia: null,
};

function aplicarGameData(parsed) {
  GameData.cartas = parsed.cartas || [];
  GameData.reglas = parsed.reglas || structuredClone(DEFAULT_RULES);
  GameData.protagonistas = parsed.protagonistas && parsed.protagonistas.length > 0 ? parsed.protagonistas : structuredClone(PROTAGONISTS_DEFAULT);
  GameData.rutas = parsed.rutas || structuredClone(RUN_CONFIG_DEFAULT);
  // Por si el guardado es de antes de que existieran las plantillas de mapa:
  if (!GameData.rutas.plantillas) GameData.rutas.plantillas = [];
  if (GameData.rutas.usarPlantillas === undefined) GameData.rutas.usarPlantillas = false;
  GameData.niveles = parsed.niveles || structuredClone(LEVELING_CONFIG_DEFAULT);
  GameData.elementos = parsed.elementos || structuredClone(ELEMENTS_CONFIG_DEFAULT);
  GameData.tienda = parsed.tienda || structuredClone(SHOP_CONFIG_DEFAULT);
  GameData.pantallas = parsed.pantallas || structuredClone(SCREENS_CONFIG_DEFAULT);
  GameData.historia = parsed.historia || structuredClone(STORY_CONFIG_DEFAULT);
  // Por si se agregan pantallas nuevas más adelante y el guardado viejo no las tiene:
  SCREENS_LIST.forEach((s) => {
    if (!GameData.pantallas[s.id]) GameData.pantallas[s.id] = crearPantallaVacia();
  });
}

/**
 * Carga los datos, en este orden de preferencia:
 *   1. Firestore (gamedata/main) si Firebase está configurado y hay
 *      algo guardado en la nube — así todos los jugadores ven los
 *      mismos datos que carga el admin, sin recompilar ni redeployar.
 *   2. localStorage (partida/prueba en curso en este navegador).
 *   3. Datos de fábrica definidos en js/data/*.js.
 * Es async porque el paso 1 requiere red — todo lo demás en el juego
 * sigue leyendo el objeto GameData en memoria de forma síncrona, como
 * siempre.
 */
async function initGameData() {
  await ensureFirebaseReady();

  const nube = await fetchGameDataFromCloud();
  if (nube) {
    aplicarGameData(nube);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(GameData)); // cache local
    return GameData;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      aplicarGameData(JSON.parse(saved));
      saveGameData(); // si hay Firebase disponible, esto siembra la nube con lo que ya tenías local
      return GameData;
    } catch (err) {
      console.error("No se pudo leer el guardado, se usan datos de fábrica.", err);
    }
  }

  GameData.cartas = getAllBaseCards();
  GameData.reglas = structuredClone(DEFAULT_RULES);
  GameData.protagonistas = structuredClone(PROTAGONISTS_DEFAULT);
  GameData.rutas = structuredClone(RUN_CONFIG_DEFAULT);
  GameData.niveles = structuredClone(LEVELING_CONFIG_DEFAULT);
  GameData.elementos = structuredClone(ELEMENTS_CONFIG_DEFAULT);
  GameData.tienda = structuredClone(SHOP_CONFIG_DEFAULT);
  GameData.pantallas = structuredClone(SCREENS_CONFIG_DEFAULT);
  GameData.historia = structuredClone(STORY_CONFIG_DEFAULT);
  saveGameData();
  return GameData;
}

function saveGameData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(GameData));
  syncGameDataToCloud(GameData);
}

/**
 * Descarga GameData como un archivo .json con fecha en el nombre.
 * Este es el archivo que le compartes a Claude en una sesión futura.
 */
function exportGameDataToFile() {
  const fecha = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(GameData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `card-game-datos_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lee un archivo .json (elegido con un <input type="file">) y reemplaza
 * GameData con su contenido. Devuelve una Promise para poder usar
 * await y refrescar la UI cuando termine.
 */
function importGameDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        aplicarGameData(parsed);
        saveGameData();
        resolve(GameData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Restaura las reglas globales a los valores de fábrica de
 * js/data/rules-default.js, sin tocar las cartas.
 */
function resetRulesToDefault() {
  GameData.reglas = structuredClone(DEFAULT_RULES);
  saveGameData();
}

/**
 * Restaura los parámetros de generación de mapas (Admin: Rutas) a los
 * valores de fábrica de js/data/runConfig.js, sin tocar cartas/reglas.
 */
function resetRoutesToDefault() {
  GameData.rutas = structuredClone(RUN_CONFIG_DEFAULT);
  saveGameData();
}

/**
 * Restaura el balance de niveles (Admin: Niveles) a los valores de
 * fábrica de js/data/levelingConfig.js, sin tocar cartas/reglas/rutas.
 */
function resetLevelingToDefault() {
  GameData.niveles = structuredClone(LEVELING_CONFIG_DEFAULT);
  saveGameData();
}

/**
 * Restaura la rueda de elementos (Admin: Elementos) a los valores de
 * fábrica de js/data/elements.js, sin tocar cartas/reglas/rutas/niveles.
 */
function resetElementsToDefault() {
  GameData.elementos = structuredClone(ELEMENTS_CONFIG_DEFAULT);
  saveGameData();
}

/**
 * Restaura los objetos de tienda (Admin: Tienda) a los valores de
 * fábrica de js/data/shopPool.js, sin tocar el resto de GameData.
 */
function resetShopToDefault() {
  GameData.tienda = structuredClone(SHOP_CONFIG_DEFAULT);
  saveGameData();
}

/**
 * Restaura los fondos/personajes por pantalla (Admin: Pantallas) a
 * vacíos (fondo degradado por defecto, sin personaje), sin tocar el
 * resto de GameData.
 */
function resetScreensToDefault() {
  GameData.pantallas = structuredClone(SCREENS_CONFIG_DEFAULT);
  saveGameData();
}

/**
 * Borra TODA la historia cargada (Admin: Historia). No toca el
 * progreso del jugador — si algún jugador ya avanzó más capítulos de
 * los que quedan, simplemente no verá más escenas hasta que cargues
 * contenido nuevo (los nodos de Evento vuelven a ser aleatorios).
 */
function resetStoryToDefault() {
  GameData.historia = structuredClone(STORY_CONFIG_DEFAULT);
  saveGameData();
}
