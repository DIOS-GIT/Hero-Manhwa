/**
 * FIREBASECLIENT.JS
 * -----------------------------------------------------------------------
 * Capa mínima sobre Firebase. No cambia cómo el resto del juego lee o
 * escribe datos (sigue siendo GameData / PlayerData en memoria) — solo
 * decide DE DÓNDE se cargan al inicio y A DÓNDE se guardan además de
 * localStorage: storage.js y engine/playerStorage.js llaman a
 * ensureFirebaseReady() antes de leer, y a syncGameDataToCloud() /
 * syncPlayerDataToCloud() después de cada guardado.
 *
 * Requiere que el HTML haya cargado antes los <script> del SDK de
 * Firebase (compat, sin build tools) y firebaseConfig.js.
 * -----------------------------------------------------------------------
 */

let firebaseEnabled = false;
let firebaseUid = null;
let firestoreDb = null;
let _firebaseReadyPromise = null;

function isFirebaseConfigured() {
  return typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("TU_");
}

/**
 * Conecta una sola vez (llamadas posteriores devuelven la misma
 * promesa). Si Firebase no está configurado o falla la conexión, el
 * juego sigue funcionando en modo 100% local sin romperse.
 */
function ensureFirebaseReady() {
  if (_firebaseReadyPromise) return _firebaseReadyPromise;

  _firebaseReadyPromise = (async () => {
    if (typeof firebase === "undefined") {
      console.warn("[Firebase] El SDK no está cargado en este HTML — modo local.");
      return;
    }
    if (!isFirebaseConfigured()) {
      console.warn("[Firebase] Sin configurar todavía (shared/js/firebaseConfig.js) — el juego funciona 100% local hasta que completes esos datos. Ver DEPLOY.md.");
      return;
    }
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      firestoreDb = firebase.firestore();
      const credencial = await firebase.auth().signInAnonymously();
      firebaseUid = credencial.user.uid;
      firebaseEnabled = true;
      console.log("[Firebase] Conectado. UID anónimo:", firebaseUid);
    } catch (err) {
      console.error("[Firebase] No se pudo conectar, se sigue en modo local.", err);
      firebaseEnabled = false;
    }
  })();

  return _firebaseReadyPromise;
}

/** Sube el documento único de datos de diseño del juego (cartas/reglas/protagonistas/rutas). */
async function syncGameDataToCloud(data) {
  if (!firebaseEnabled) return;
  try {
    await firestoreDb.collection("gamedata").doc("main").set(data);
  } catch (err) {
    console.error("[Firebase] No se pudo guardar gamedata en la nube (queda guardado localmente).", err);
  }
}

async function fetchGameDataFromCloud() {
  if (!firebaseEnabled) return null;
  try {
    const snap = await firestoreDb.collection("gamedata").doc("main").get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error("[Firebase] No se pudo leer gamedata de la nube, se usa el guardado local.", err);
    return null;
  }
}

/** Sube el documento de progreso del jugador actual (players/{uid}). */
async function syncPlayerDataToCloud(data) {
  if (!firebaseEnabled || !firebaseUid) return;
  try {
    await firestoreDb.collection("players").doc(firebaseUid).set(data);
  } catch (err) {
    console.error("[Firebase] No se pudo guardar tu progreso en la nube (queda guardado localmente).", err);
  }
}

async function fetchPlayerDataFromCloud() {
  if (!firebaseEnabled || !firebaseUid) return null;
  try {
    const snap = await firestoreDb.collection("players").doc(firebaseUid).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error("[Firebase] No se pudo leer tu progreso de la nube, se usa el guardado local.", err);
    return null;
  }
}
