/**
 * PVPMATCHMAKING.JS
 * -----------------------------------------------------------------------
 * Cola de emparejamiento SOLO para Ranked. A diferencia del reto por
 * apodo (Normal/Amistosa, ver pvpChallengeEngine.js), acá no eliges
 * rival — evita que dos amigos se pongan de acuerdo para perder a
 * propósito y regalarse puntos de liga.
 *
 * Cómo empareja sin servidor: al entrar a la cola, el cliente busca si
 * ya hay alguien más esperando (pvpQueue/{uid}) y, si lo hay, intenta
 * "reclamarlo" con una transacción de Firestore (así dos personas
 * entrando al mismo tiempo no se pisan ni quedan duplicadas). Si nadie
 * espera todavía, te quedas escuchando tu propio documento de cola
 * hasta que OTRO jugador te reclame a vos.
 * -----------------------------------------------------------------------
 */

let _pvpQueueUnsubscribe = null;

/** Entra a la cola y hace un primer intento de emparejar de una. */
async function joinPvpQueue() {
  ensurePvpProfile();
  await firestoreDb.collection("pvpQueue").doc(currentUser.uid).set({
    uid: currentUser.uid,
    nombre: PlayerData.nombre || currentUser.email,
    rankScore: getRankScore(PlayerData.pvp),
    buscandoDesde: new Date().toISOString(),
    matchId: null,
  });
  return intentarEmparejar();
}

async function leavePvpQueue() {
  if (_pvpQueueUnsubscribe) {
    _pvpQueueUnsubscribe();
    _pvpQueueUnsubscribe = null;
  }
  try {
    await firestoreDb.collection("pvpQueue").doc(currentUser.uid).delete();
  } catch (err) {
    console.error("No se pudo salir de la cola:", err);
  }
}

/** Busca hasta 10 jugadores esperando y trata de reclamar al primero disponible. */
async function intentarEmparejar() {
  const snap = await firestoreDb.collection("pvpQueue").where("matchId", "==", null).limit(10).get();
  const candidatos = snap.docs.map((d) => d.data()).filter((c) => c.uid !== currentUser.uid);

  for (const candidato of candidatos) {
    const matchId = await intentarReclamar(candidato.uid);
    if (matchId) return { ok: true, matchId, emparejadoDeUna: true };
  }
  return { ok: true, matchId: null, emparejadoDeUna: false }; // nadie disponible todavía, hay que esperar
}

/** Transacción atómica: si el rival sigue libre, crea el match y marca a ambos como emparejados. */
async function intentarReclamar(rivalUid) {
  const refRival = firestoreDb.collection("pvpQueue").doc(rivalUid);
  const refMio = firestoreDb.collection("pvpQueue").doc(currentUser.uid);
  const refMatch = firestoreDb.collection("matches").doc();

  try {
    await firestoreDb.runTransaction(async (tx) => {
      const docRival = await tx.get(refRival);
      const docMio = await tx.get(refMio);
      if (!docRival.exists || docRival.data().matchId) throw new Error("RIVAL_YA_TOMADO");
      if (!docMio.exists || docMio.data().matchId) throw new Error("YO_YA_TOMADO");

      const datosRival = docRival.data();
      const datosMio = docMio.data();

      tx.set(refMatch, {
        modo: "ranked",
        retador: { uid: datosMio.uid, nombre: datosMio.nombre },
        retado: { uid: datosRival.uid, nombre: datosRival.nombre },
        estado: "aceptado",
        creadoEn: new Date().toISOString(),
        expiraEn: null,
      });
      tx.update(refRival, { matchId: refMatch.id });
      tx.update(refMio, { matchId: refMatch.id });
    });
    return refMatch.id;
  } catch (err) {
    return null; // alguien más lo reclamó primero (o falló la conexión) — se sigue buscando
  }
}

/** Escucha el propio documento de cola: cuando OTRO jugador te reclama, matchId deja de ser null. */
function listenForQueueMatch(onEmparejado) {
  _pvpQueueUnsubscribe = firestoreDb.collection("pvpQueue").doc(currentUser.uid).onSnapshot((doc) => {
    if (doc.exists && doc.data().matchId) {
      onEmparejado(doc.data().matchId);
    }
  });
}
