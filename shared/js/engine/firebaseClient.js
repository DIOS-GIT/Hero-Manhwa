/**
 * FIREBASECLIENT.JS
 * -----------------------------------------------------------------------
 * Capa mínima sobre Firebase. No cambia cómo el resto del juego lee o
 * escribe datos — solo decide DE DÓNDE se cargan al inicio y A DÓNDE se
 * guardan además de localStorage.
 * -----------------------------------------------------------------------
 */

let firebaseEnabled = false;
let firebaseUid = null;
let firestoreDb = null;
let _firebaseReadyPromise = null;

// Datos del usuario actual
let currentUser = null;

// Detecta cuál configuración está cargada
function getFirebaseConfig() {
  if (typeof firebaseConfig !== "undefined") return firebaseConfig;
  if (typeof firebaseAdminConfig !== "undefined") return firebaseAdminConfig;
  if (typeof FIREBASE_CONFIG !== "undefined") return FIREBASE_CONFIG;
  return null;
}

function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return config && config.apiKey && !config.apiKey.startsWith("TU_");
}

function ensureFirebaseReady() {
  if (_firebaseReadyPromise) return _firebaseReadyPromise;

  _firebaseReadyPromise = (async () => {
    if (typeof firebase === "undefined") {
      console.warn("[Firebase] El SDK no está cargado en este HTML — modo local.");
      return;
    }
    if (!isFirebaseConfigured()) {
      console.warn("[Firebase] Sin configurar todavía — el juego funciona 100% local.");
      return;
    }
    try {
      firebase.initializeApp(getFirebaseConfig());
      firestoreDb = firebase.firestore();
      firebaseEnabled = true;
      console.log("[Firebase] Conectado.");
    } catch (err) {
      console.error("[Firebase] No se pudo conectar, se sigue en modo local.", err);
      firebaseEnabled = false;
    }
  })();

  return _firebaseReadyPromise;
}

async function loginAdmin(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().signInWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;

    // 🔥 IMPORTANTE: Intenta leer el documento de admin
    const doc = await firestoreDb.collection("admins").doc(firebaseUid).get();
    
    if (!doc.exists) {
      await firebase.auth().signOut();
      return { ok: false, motivo: "Este correo no tiene permisos de admin en Firestore." };
    }

    const data = doc.data();
    if (!data.role) {
      await firebase.auth().signOut();
      return { ok: false, motivo: "El documento de admin no tiene campo 'role'." };
    }

    const role = data.role;
    currentUser = { uid: firebaseUid, email, role };
    return { ok: true, role };
  } catch (err) {
    // 🔥 Detecta cualquier error y lo traduce
    const mensaje = traducirErrorFirebase(err.code) || `Error: ${err.message || "desconocido"}`;
    return { ok: false, motivo: mensaje };
  }
}

async function loginPlayer(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().signInWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;
    currentUser = { uid: firebaseUid, email, role: "jugador" };
    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: traducirErrorFirebase(err.code) || `Error: ${err.message || "desconocido"}` };
  }
}

async function registerPlayer(email, password) {
  await ensureFirebaseReady();
  if (!firebaseEnabled) return { ok: false, motivo: "Firebase no está configurado." };

  try {
    const credencial = await firebase.auth().createUserWithEmailAndPassword(email, password);
    firebaseUid = credencial.user.uid;
    currentUser = { uid: firebaseUid, email, role: "jugador" };

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
    return { ok: false, motivo: traducirErrorFirebase(err.code) || `Error: ${err.message || "desconocido"}` };
  }
}

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
    return { ok: false, motivo: traducirErrorFirebase(err.code) || `Error: ${err.message || "desconocido"}` };
  }
}

async function logout() {
  if (firebaseEnabled && firebase.auth().currentUser) {
    await firebase.auth().signOut();
  }
  firebaseUid = null;
  currentUser = null;
}

async function syncGameDataToCloud(data) {
  if (!firebaseEnabled) return;
  try {
    await firestoreDb.collection("gamedata").doc("main").set(data);
  } catch (err) {
    console.error("[Firebase] No se pudo guardar gamedata en la nube.", err);
  }
}

async function fetchGameDataFromCloud() {
  if (!firebaseEnabled) return null;
  try {
    const snap = await firestoreDb.collection("gamedata").doc("main").get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error("[Firebase] No se pudo leer gamedata de la nube.", err);
    return null;
  }
}

async function syncPlayerDataToCloud(data) {
  if (!firebaseEnabled || !firebaseUid) return;
  try {
    await firestoreDb.collection("players").doc(firebaseUid).set(data);
  } catch (err) {
    console.error("[Firebase] No se pudo guardar tu progreso en la nube.", err);
  }
}

async function fetchPlayerDataFromCloud() {
  if (!firebaseEnabled || !firebaseUid) return null;
  try {
    const snap = await firestoreDb.collection("players").doc(firebaseUid).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error("[Firebase] No se pudo leer tu progreso de la nube.", err);
    return null;
  }
}

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
    "permission-denied": "No tienes permisos para leer los datos de admin en Firestore.",
    "not-found": "El documento de admin no existe en Firestore."
  };
  return errores[code] || null;
}

function getCurrentUser() {
  return currentUser;
}

function isAdmin() {
  return currentUser && (currentUser.role === "admin_principal" || currentUser.role === "admin_secundario");
}

function isAdminPrincipal() {
  return currentUser && currentUser.role === "admin_principal";
}

function isPlayer() {
  return currentUser && currentUser.role === "jugador";
}
