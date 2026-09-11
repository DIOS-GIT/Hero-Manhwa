/**
 * PVPCHALLENGEENGINE.JS
 * -----------------------------------------------------------------------
 * Retos PvP: viven en la colección matches/{matchId} de Firestore.
 *
 * NOTA DE ALCANCE: esta primera entrega cubre buscar rival, mandar el
 * reto, aceptarlo/rechazarlo y que expire solo — NO el combate en vivo
 * sincronizado todavía (eso es la parte 2, más delicada, para una
 * sesión aparte). Al aceptar un reto, el match queda en estado
 * "aceptado" a la espera de esa segunda parte.
 *
 * FORMA DE UN MATCH:
 *   {
 *     modo: "ranked" | "normal" | "amistosa",
 *     retador: { uid, nombre },
 *     retado: { uid, nombre },
 *     estado: "pendiente" | "rechazado" | "expirado" | "aceptado" | "cancelado",
 *     creadoEn, expiraEn (ISO),
 *   }
 * -----------------------------------------------------------------------
 */

/** Busca el UID de un jugador por su apodo (case-insensitive), usando la tabla de apodos únicos. */
async function findPlayerByNickname(apodo) {
  if (!firebaseEnabled || !firestoreDb) return { ok: false, motivo: "El PvP necesita conexión." };
  const nombreLower = (apodo || "").trim().toLowerCase();
  if (!nombreLower) return { ok: false, motivo: "Escribe un apodo." };

  try {
    const doc = await firestoreDb.collection("nicknames").doc(nombreLower).get();
    if (!doc.exists) return { ok: false, motivo: "No existe ningún jugador con ese apodo." };
    const datos = doc.data();
    if (datos.uid === currentUser.uid) return { ok: false, motivo: "No puedes retarte a ti mismo." };
    return { ok: true, uid: datos.uid, nombre: datos.nombre };
  } catch (err) {
    console.error("No se pudo buscar el apodo:", err);
    return { ok: false, motivo: "No se pudo buscar ese apodo, intenta de nuevo." };
  }
}

/** Crea un reto pendiente contra otro jugador. */
async function sendPvpChallenge(apodoRival, modo) {
  const busqueda = await findPlayerByNickname(apodoRival);
  if (!busqueda.ok) return busqueda;

  const ahora = new Date();
  const expira = new Date(ahora.getTime() + ECONOMY_CONFIG.pvp.retoExpiraEnMinutos * 60000);

  try {
    await firestoreDb.collection("matches").add({
      modo,
      retador: { uid: currentUser.uid, nombre: PlayerData.nombre || currentUser.email },
      retado: { uid: busqueda.uid, nombre: busqueda.nombre },
      estado: "pendiente",
      creadoEn: ahora.toISOString(),
      expiraEn: expira.toISOString(),
    });
    return { ok: true };
  } catch (err) {
    console.error("No se pudo crear el reto:", err);
    return { ok: false, motivo: "No se pudo mandar el reto, intenta de nuevo." };
  }
}

/** Trae los retos donde el jugador actual participa (como retador o retado), ya filtrando los vencidos por fecha. */
async function fetchMyPvpChallenges() {
  if (!firebaseEnabled || !firestoreDb || !currentUser) return { recibidos: [], enviados: [] };
  const ahora = new Date().toISOString();

  try {
    const [comoRetado, comoRetador] = await Promise.all([
      firestoreDb.collection("matches").where("retado.uid", "==", currentUser.uid).where("estado", "==", "pendiente").get(),
      firestoreDb.collection("matches").where("retador.uid", "==", currentUser.uid).get(),
    ]);

    const recibidos = comoRetado.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.expiraEn > ahora);

    const enviados = comoRetador.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.estado === "pendiente")
      .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1))
      .slice(0, 10);

    return { recibidos, enviados };
  } catch (err) {
    console.error("No se pudieron cargar los retos:", err);
    return { recibidos: [], enviados: [] };
  }
}

async function acceptPvpChallenge(matchId) {
  try {
    await firestoreDb.collection("matches").doc(matchId).update({ estado: "aceptado" });
    return { ok: true };
  } catch (err) {
    console.error("No se pudo aceptar el reto:", err);
    return { ok: false, motivo: "No se pudo aceptar, puede que ya haya expirado." };
  }
}

async function declinePvpChallenge(matchId) {
  try {
    await firestoreDb.collection("matches").doc(matchId).update({ estado: "rechazado" });
    return { ok: true };
  } catch (err) {
    console.error("No se pudo rechazar el reto:", err);
    return { ok: false, motivo: "No se pudo rechazar el reto." };
  }
}
