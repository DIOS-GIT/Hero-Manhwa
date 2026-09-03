/**
 * PLAYERSTORAGE.JS
 * -----------------------------------------------------------------------
 * Guarda todo lo que pertenece al JUGADOR (no al diseño del juego):
 * moneda, qué cartas tiene, cuáles están caídas, sus presets de
 * equipo, y su historial de runs. Es independiente de GameData
 * (js/storage.js), que es el diseño del juego (cartas/reglas que
 * edita el admin).
 *
 * AHORA SOPORTA CUENTAS:
 * - Si el jugador inició sesión, sus datos se guardan en Firestore
 *   (players/{uid}) y también en localStorage como caché local.
 * - Si NO inició sesión (modo local), sus datos se guardan solo en
 *   localStorage.
 *
 * PlayerData = {
 *   moneda: number,
 *   coleccion: [cardId, ...],       // cartas que el jugador ya tiene
 *   cartasCaidas: [cardId, ...],    // cartas caídas, no usables hasta revivir
 *   presets: [ { id, nombre, cartaIds: [id,id,id,id] } ],
 *   historial: [ver forma en engine/runState.js],
 * }
 * -----------------------------------------------------------------------
 */

const PLAYER_STORAGE_KEY = "cardGamePlayerData_v1";

let PlayerData = {
  moneda: 0,
  coleccion: [],
  cartasCaidas: [],
  presets: [],
  ultimoPresetId: null,
  historial: [],
  progresoCartas: {}, // { [cardId]: { nivel, xp } } — ver engine/cardLevelEngine.js
  progresoHistoria: { capituloIndex: 0, escenaIndex: 0 }, // ver engine/storyEngine.js
  personalizacionProtagonistas: {}, // { [protagonistId]: { apodo, varianteIndex } } — ver engine/protagonistCustomization.js
  fragmentosCartas: {}, // { [cardId]: cantidad } — de duplicados, se gastan al evolucionar (ver engine/evolutionEngine.js)
  yaTuvoPrimeraTirada: false, // controla el gacha "primera tirada siempre legendaria" (ver engine/gacha.js)
};

function aplicarPlayerData(parsed) {
  PlayerData = {
    moneda: parsed.moneda ?? ECONOMY_CONFIG.monedaInicial,
    coleccion: parsed.coleccion || [],
    cartasCaidas: parsed.cartasCaidas || [],
    presets: parsed.presets || [],
    ultimoPresetId: parsed.ultimoPresetId || null,
    historial: parsed.historial || [],
    progresoCartas: parsed.progresoCartas || {},
    progresoHistoria: parsed.progresoHistoria || { capituloIndex: 0, escenaIndex: 0 },
    personalizacionProtagonistas: parsed.personalizacionProtagonistas || {},
    fragmentosCartas: parsed.fragmentosCartas || {},
    yaTuvoPrimeraTirada: parsed.yaTuvoPrimeraTirada || false,
  };
}

/**
 * Carga el progreso del jugador, en este orden de preferencia:
 *   1. Firestore (players/{uid}) si hay sesión iniciada.
 *   2. localStorage (modo local o caché).
 *   3. Progreso nuevo (valores de fábrica).
 * Es async por el paso 1 (red) — el resto del juego sigue leyendo el
 * objeto PlayerData en memoria de forma síncrona, como siempre.
 */
async function initPlayerData() {
  await ensureFirebaseReady();

  // Si hay sesión iniciada, priorizar Firestore
  if (currentUser && firebaseEnabled) {
    const nube = await fetchPlayerDataFromCloud();
    if (nube) {
      aplicarPlayerData(nube);
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(PlayerData)); // caché local
      return PlayerData;
    }
    // Si no hay datos en la nube pero sí en localStorage (migración)
    const savedLocal = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (savedLocal) {
      try {
        aplicarPlayerData(JSON.parse(savedLocal));
        syncPlayerDataToCloud(PlayerData); // subir a la nube
        return PlayerData;
      } catch (err) {
        console.error("No se pudo leer el guardado local, se reinician.", err);
      }
    }
    // Si no hay nada, crear datos nuevos y subirlos
    PlayerData = {
      moneda: ECONOMY_CONFIG.monedaInicial,
      coleccion: [],
      cartasCaidas: [],
      presets: [],
      ultimoPresetId: null,
      historial: [],
      progresoCartas: {},
      progresoHistoria: { capituloIndex: 0, escenaIndex: 0 },
      personalizacionProtagonistas: {},
      fragmentosCartas: {},
      yaTuvoPrimeraTirada: false,
    };
    syncPlayerDataToCloud(PlayerData);
    return PlayerData;
  }

  // Modo local (sin sesión): usar localStorage
  const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
  if (saved) {
    try {
      aplicarPlayerData(JSON.parse(saved));
      return PlayerData;
    } catch (err) {
      console.error("No se pudo leer los datos del jugador, se reinician.", err);
    }
  }

  // Progreso nuevo
  PlayerData = {
    moneda: ECONOMY_CONFIG.monedaInicial,
    coleccion: [],
    cartasCaidas: [],
    presets: [],
    ultimoPresetId: null,
    historial: [],
    progresoCartas: {},
    progresoHistoria: { capituloIndex: 0, escenaIndex: 0 },
    personalizacionProtagonistas: {},
    fragmentosCartas: {},
    yaTuvoPrimeraTirada: false,
  };
  savePlayerData();
  return PlayerData;
}

function savePlayerData() {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(PlayerData));
  if (currentUser && firebaseEnabled) {
    syncPlayerDataToCloud(PlayerData);
  }
}

function ownsCard(cardId) {
  return PlayerData.coleccion.includes(cardId);
}

function isCardCaida(cardId) {
  return PlayerData.cartasCaidas.includes(cardId);
}

function addCardToCollection(cardId) {
  if (!ownsCard(cardId)) {
    PlayerData.coleccion.push(cardId);
    savePlayerData();
  }
}

function addCoins(cantidad) {
  PlayerData.moneda += cantidad;
  savePlayerData();
}

function spendCoins(cantidad) {
  if (PlayerData.moneda < cantidad) return false;
  PlayerData.moneda -= cantidad;
  savePlayerData();
  return true;
}

function markCardAsCaida(cardId) {
  if (!PlayerData.cartasCaidas.includes(cardId)) {
    PlayerData.cartasCaidas.push(cardId);
    savePlayerData();
  }
}

function reviveCard(cardId) {
  PlayerData.cartasCaidas = PlayerData.cartasCaidas.filter((id) => id !== cardId);
  savePlayerData();
}

function savePreset(nombre, cartaIds, protagonistaId) {
  const preset = { id: "preset_" + Date.now(), nombre, cartaIds, protagonistaId: protagonistaId || null };
  PlayerData.presets.push(preset);
  savePlayerData();
  return preset;
}

function setLastUsedPreset(presetId) {
  PlayerData.ultimoPresetId = presetId;
  savePlayerData();
}

function deletePreset(presetId) {
  PlayerData.presets = PlayerData.presets.filter((p) => p.id !== presetId);
  if (PlayerData.ultimoPresetId === presetId) PlayerData.ultimoPresetId = null;
  savePlayerData();
}

function addHistoryEntry(entry) {
  PlayerData.historial.unshift(entry); // más reciente primero
  savePlayerData();
}
