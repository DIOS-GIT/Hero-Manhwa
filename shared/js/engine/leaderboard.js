/**
 * LEADERBOARD.JS
 * -----------------------------------------------------------------------
 * Tabla de posiciones entre jugadores. Vive en su PROPIA colección de
 * Firestore (leaderboard/{uid}) en vez de leer directo de players/{uid}
 * a propósito: así cualquier jugador autenticado puede leer el ranking
 * sin que eso signifique exponer la moneda, colección completa, correo,
 * etc. de todo el mundo — solo lo que de verdad hace falta mostrar
 * (apodo, victorias, tamaño de colección).
 *
 * Reglas de Firestore que esto necesita:
 *   match /leaderboard/{uid} {
 *     allow read: if request.auth != null;
 *     allow write: if request.auth != null && request.auth.uid == uid;
 *   }
 * -----------------------------------------------------------------------
 */

/** Sube/actualiza la fila pública del jugador actual. Se llama cada vez que cambian sus victorias o colección. */
async function syncLeaderboardEntry() {
  if (!firebaseEnabled || !currentUser || !firestoreDb) return;
  const pvp = PlayerData.pvp; // puede ser null si nunca jugó PvP todavía
  try {
    await firestoreDb.collection("leaderboard").doc(currentUser.uid).set({
      nombre: PlayerData.nombre || currentUser.email,
      victorias: PlayerData.victoriasTotales || 0,
      coleccion: PlayerData.coleccion.length,
      rangoPvp: pvp ? getRankLabel(pvp) : null,
      rangoPvpScore: pvp ? getRankScore(pvp) : -1,
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    console.error("No se pudo actualizar el ranking:", err);
  }
}

/** Trae el top N ordenado por "victorias" o "coleccion". */
async function fetchLeaderboard(campo, limite) {
  if (!firebaseEnabled || !firestoreDb) return [];
  try {
    const snap = await firestoreDb.collection("leaderboard").orderBy(campo, "desc").limit(limite || 20).get();
    return snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("No se pudo leer el ranking:", err);
    return [];
  }
}
