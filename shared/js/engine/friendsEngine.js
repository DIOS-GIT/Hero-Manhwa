/**
 * FRIENDSENGINE.JS
 * -----------------------------------------------------------------------
 * Amigos y regalos. Se apoya en el ID permanente del jugador
 * (PlayerData.playerId, ver firebaseClient.js:claimPlayerId) en vez del
 * apodo, porque el apodo puede cambiar y el ID no — así una amistad no
 * se "rompe" si alguien se renombra.
 *
 * COLECCIONES DE FIRESTORE:
 *   friendRequests/{id} → { de: {uid, nombre, playerId}, para: {uid},
 *                           estado: "pendiente"|"aceptada"|"rechazada", creadoEn }
 *   friendships/{id}    → { uids: [uidA, uidB], desde }
 *   gifts/{id}          → { de: {uid, nombre}, para: {uid}, tipo: "creditos"|"fragmentos",
 *                           cantidad, reclamado: false, creadoEn }
 *
 * LÍMITE DE REGALOS: 500 créditos o 10 fragmentos por amigo cada 24h.
 * Se valida mirando el último regalo enviado a ESE amigo en concreto
 * (no un total global), como se pidió.
 * -----------------------------------------------------------------------
 */

const LIMITE_REGALO = {
  creditos: { max: 500, etiqueta: "créditos" },
  fragmentos: { max: 10, etiqueta: "fragmentos" },
};
const HORAS_ENTRE_REGALOS = 24;

/** Busca a un jugador por su ID corto (ej. "A7K2P9", con o sin #). */
async function findPlayerByPlayerId(idCorto) {
  if (!firebaseEnabled || !firestoreDb) return { ok: false, motivo: "Los amigos necesitan conexión." };
  const codigo = (idCorto || "").trim().toUpperCase().replace(/^#/, "");
  if (!codigo) return { ok: false, motivo: "Escribe un ID." };
  if (codigo === PlayerData.playerId) return { ok: false, motivo: "Ese es tu propio ID." };

  try {
    const doc = await firestoreDb.collection("playerIds").doc(codigo).get();
    if (!doc.exists) return { ok: false, motivo: "No existe ningún jugador con ese ID." };

    const uid = doc.data().uid;
    const perfil = await firestoreDb.collection("leaderboard").doc(uid).get();
    const nombre = perfil.exists ? perfil.data().nombre : "Jugador";
    return { ok: true, uid, nombre, playerId: codigo };
  } catch (err) {
    console.error("No se pudo buscar el ID:", err);
    return { ok: false, motivo: "No se pudo buscar ese ID, intenta de nuevo." };
  }
}

async function sendFriendRequest(idCorto) {
  const busqueda = await findPlayerByPlayerId(idCorto);
  if (!busqueda.ok) return busqueda;

  const yaAmigos = await areAlreadyFriends(busqueda.uid);
  if (yaAmigos) return { ok: false, motivo: "Ya son amigos." };

  try {
    await firestoreDb.collection("friendRequests").add({
      de: { uid: currentUser.uid, nombre: PlayerData.nombre || currentUser.email, playerId: PlayerData.playerId },
      para: { uid: busqueda.uid },
      estado: "pendiente",
      creadoEn: new Date().toISOString(),
    });
    return { ok: true, nombre: busqueda.nombre };
  } catch (err) {
    console.error("No se pudo enviar la solicitud:", err);
    return { ok: false, motivo: "No se pudo enviar la solicitud." };
  }
}

async function areAlreadyFriends(otroUid) {
  const snap = await firestoreDb.collection("friendships").where("uids", "array-contains", currentUser.uid).get();
  return snap.docs.some((d) => d.data().uids.includes(otroUid));
}

async function fetchFriendRequests() {
  if (!firebaseEnabled || !currentUser) return [];
  try {
    const snap = await firestoreDb
      .collection("friendRequests")
      .where("para.uid", "==", currentUser.uid)
      .where("estado", "==", "pendiente")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("No se pudieron cargar las solicitudes:", err);
    return [];
  }
}

async function acceptFriendRequest(requestId, deUid) {
  try {
    await firestoreDb.collection("friendships").add({
      uids: [currentUser.uid, deUid],
      desde: new Date().toISOString(),
    });
    await firestoreDb.collection("friendRequests").doc(requestId).update({ estado: "aceptada" });
    return { ok: true };
  } catch (err) {
    console.error("No se pudo aceptar la solicitud:", err);
    return { ok: false, motivo: "No se pudo aceptar la solicitud." };
  }
}

async function declineFriendRequest(requestId) {
  try {
    await firestoreDb.collection("friendRequests").doc(requestId).update({ estado: "rechazada" });
    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: "No se pudo rechazar la solicitud." };
  }
}

/** Devuelve la lista de amigos con su perfil público (nombre, rango, etc). */
async function fetchFriends() {
  if (!firebaseEnabled || !currentUser) return [];
  try {
    const snap = await firestoreDb.collection("friendships").where("uids", "array-contains", currentUser.uid).get();
    const amigosUids = snap.docs.map((d) => d.data().uids.find((u) => u !== currentUser.uid)).filter(Boolean);
    if (amigosUids.length === 0) return [];

    const perfiles = await Promise.all(
      amigosUids.map(async (uid) => {
        const doc = await firestoreDb.collection("leaderboard").doc(uid).get();
        return {
          uid,
          nombre: doc.exists ? doc.data().nombre : "Jugador",
          rangoPvp: doc.exists ? doc.data().rangoPvp : null,
        };
      })
    );
    return perfiles;
  } catch (err) {
    console.error("No se pudieron cargar los amigos:", err);
    return [];
  }
}

async function removeFriend(amigoUid) {
  try {
    const snap = await firestoreDb.collection("friendships").where("uids", "array-contains", currentUser.uid).get();
    const doc = snap.docs.find((d) => d.data().uids.includes(amigoUid));
    if (doc) await firestoreDb.collection("friendships").doc(doc.id).delete();
    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: "No se pudo eliminar al amigo." };
  }
}

/** ¿Cuánto falta para poder volver a regalarle a ESTE amigo? null = puede ya. */
function horasRestantesParaRegalar(amigoUid) {
  const registro = (PlayerData.regalosEnviados || {})[amigoUid];
  if (!registro) return null;
  const pasadas = (Date.now() - new Date(registro).getTime()) / 3600000;
  if (pasadas >= HORAS_ENTRE_REGALOS) return null;
  return Math.ceil(HORAS_ENTRE_REGALOS - pasadas);
}

/**
 * Envía un regalo a un amigo. El costo sale del inventario del que
 * regala (no se crea de la nada), y hay tope por amigo cada 24h.
 */
async function sendGift(amigoUid, amigoNombre, tipo, cantidad) {
  const limite = LIMITE_REGALO[tipo];
  if (!limite) return { ok: false, motivo: "Tipo de regalo inválido." };

  const cant = Math.floor(Number(cantidad) || 0);
  if (cant <= 0) return { ok: false, motivo: "La cantidad debe ser mayor que cero." };
  if (cant > limite.max) return { ok: false, motivo: `El máximo son ${limite.max} ${limite.etiqueta} por amigo cada 24 horas.` };

  const restantes = horasRestantesParaRegalar(amigoUid);
  if (restantes !== null) return { ok: false, motivo: `Ya le regalaste a ${amigoNombre}. Podrás de nuevo en ${restantes}h.` };

  if (tipo === "creditos" && PlayerData.moneda < cant) {
    return { ok: false, motivo: "No tienes suficientes créditos." };
  }

  try {
    await firestoreDb.collection("gifts").add({
      de: { uid: currentUser.uid, nombre: PlayerData.nombre || currentUser.email },
      para: { uid: amigoUid },
      tipo,
      cantidad: cant,
      reclamado: false,
      creadoEn: new Date().toISOString(),
    });

    if (tipo === "creditos") PlayerData.moneda -= cant;
    if (!PlayerData.regalosEnviados) PlayerData.regalosEnviados = {};
    PlayerData.regalosEnviados[amigoUid] = new Date().toISOString();
    savePlayerData();
    return { ok: true };
  } catch (err) {
    console.error("No se pudo enviar el regalo:", err);
    return { ok: false, motivo: "No se pudo enviar el regalo." };
  }
}

async function fetchPendingGifts() {
  if (!firebaseEnabled || !currentUser) return [];
  try {
    const snap = await firestoreDb
      .collection("gifts")
      .where("para.uid", "==", currentUser.uid)
      .where("reclamado", "==", false)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("No se pudieron cargar los regalos:", err);
    return [];
  }
}

/**
 * Reclama un regalo recibido: aplica el efecto y lo marca como usado.
 * @param {object} regalo
 * @param {string} [cartaIdParaFragmentos] obligatorio si el regalo es de
 *   fragmentos — los fragmentos son por carta, así que el jugador elige
 *   a cuál de las suyas van (lo pide la UI antes de llamar acá).
 */
async function claimGift(regalo, cartaIdParaFragmentos) {
  if (regalo.tipo === "fragmentos" && !cartaIdParaFragmentos) {
    return { ok: false, motivo: "Elige a qué carta van los fragmentos." };
  }

  try {
    await firestoreDb.collection("gifts").doc(regalo.id).update({ reclamado: true });

    if (regalo.tipo === "creditos") {
      addCoins(regalo.cantidad);
    } else if (regalo.tipo === "fragmentos") {
      addCardFragments(cartaIdParaFragmentos, regalo.cantidad);
    }
    savePlayerData();
    return { ok: true };
  } catch (err) {
    console.error("No se pudo reclamar el regalo:", err);
    return { ok: false, motivo: "No se pudo reclamar el regalo." };
  }
}
