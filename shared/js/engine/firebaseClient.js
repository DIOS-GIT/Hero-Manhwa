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
 * AHORA SOPORTA:
 * - Registro/login de jugadores (usuario + contraseña)
 * - Registro/login de admins (email + contraseña + rol)
 * - Modo local sin Firebase (si no hay conexión o no está configurado)
 *
 * Requiere que el HTML haya cargado antes los <script> del SDK de
 * Firebase (compat, sin build tools) y firebaseConfig.js.
 * -----------------------------------------------------------------------
 */

let firebaseEnabled = false;
let firebaseUid = null;
let firestoreDb = null;
let _firebaseReadyPromise = null;

// Datos del usuario actual (jugador o admin)
let currentUser = null; // { uid, email, role: "jugador" | "admin_principal" | "admin_secundario" }

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
      firebaseEnabled = true;
      console.log("[Firebase] Conectado. Esperando login de usuario...");
    } catch (err) {
      console.error("[Firebase] No se pudo conectar, se sigue en modo local.", err);
      firebaseEnabled = false;
    }
  })();

  return _firebaseReadyPromise;
}

/* =======================================================================
   LOGIN / REGISTRO DE USUARIOS (jugadores normales)
   ======================================================================= */

/**
 * Registra un jugador nuevo con usuario y contraseña.
 * @param {string} email - correo del jugador
 * @param {string} password - contraseña (mínimo 6 caracteres)
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
async function registerPlayer(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().createUserWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;
    currentUser = { uid: firebaseUid, email, role: "jugador" };

    // Crear documento del jugador en Firestore
    await firestoreDb.collection("players").doc(firebaseUid).set({
      email,
      moneda: 300,
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
      creadoEn: new Date().toISOString()
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: traducirErrorFirebase(err.code) };
  }
}

/**
 * Inicia sesión de un jugador con email y contraseña.
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
async function loginPlayer(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().signInWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;
    currentUser = { uid: firebaseUid, email, role: "jugador" };
    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: traducirErrorFirebase(err.code) };
  }
}

/* =======================================================================
   LOGIN / REGISTRO DE ADMINS (con roles)
   ======================================================================= */

/**
 * Inicia sesión de un admin (email + contraseña).
 * Busca su rol en la colección "admins" de Firestore.
 * @returns {Promise<{ok: boolean, motivo?: string, role?: string}>}
 */
async function loginAdmin(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().signInWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;

    // Buscar rol en colección "admins"
    const doc = await firestoreDb.collection("admins").doc(firebaseUid).get();
    if (!doc.exists) {
      await firebase.auth().signOut();
      return { ok: false, motivo: "Este usuario no tiene permisos de admin." };
    }

    const data = doc.data();
    const role = data.role; // "admin_principal" | "admin_secundario"
    currentUser = { uid: firebaseUid, email, role };
    return { ok: true, role };
  } catch (err) {
    return { ok: false, motivo: traducirErrorFirebase(err.code) };
  }
}

/**
 * Registra un admin nuevo (solo puede llamarlo el admin principal).
 * @param {string} email - email del nuevo admin
 * @param {string} password - contraseña
 * @param {"admin_principal"|"admin_secundario"} role - rol del nuevo admin
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
async function registerAdmin(email, password, role) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };
  if (!currentUser || currentUser.role !== "admin_principal") {
    return { ok: false, motivo: "Solo el admin principal puede crear admins." };
  }

  try {
    const credencial = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const nuevoUid = credencial.user.uid;

    await firestoreDb.collection("admins").doc(nuevoUid).set({
      email,
      role,
      creadoPor: currentUser.uid,
      creadoEn: new Date().toISOString()
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: traducirErrorFirebase(err.code) };
  }
}

/* =======================================================================
   CERRAR SESIÓN
   ======================================================================= */

async function logout() {
  if (firebaseEnabled && firebase.auth().currentUser) {
    await firebase.auth().signOut();
  }
  firebaseUid = null;
  currentUser = null;
}

/* =======================================================================
   SINCRONIZACIÓN (se mantiene igual que antes)
   ======================================================================= */

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

/* =======================================================================
   UTILIDADES
   ======================================================================= */

function traducirErrorFirebase(code) {
  const errores = {
    "auth/email-already-in-use": "Este correo ya está registrado.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-not-found": "No existe una cuenta con este correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Credenciales inválidas. Revisa email y contraseña.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento y prueba de nuevo.",
    "auth/network-request-failed": "Error de conexión. Revisa tu internet.",
  };
  return errores[code] || "Error desconocido al autenticar.";
}

/** Devuelve el usuario actual (jugador o admin), o null si no hay sesión. */
function getCurrentUser() {
  return currentUser;
}

/** Devuelve true si el usuario actual es admin (principal o secundario). */
function isAdmin() {
  return currentUser && (currentUser.role === "admin_principal" || currentUser.role === "admin_secundario");
}

/** Devuelve true si el usuario actual es admin principal. */
function isAdminPrincipal() {
  return currentUser && currentUser.role === "admin_principal";
}

/** Devuelve true si el usuario actual es un jugador normal. */
function isPlayer() {
  return currentUser && currentUser.role === "jugador";
}
