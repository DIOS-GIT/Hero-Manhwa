/**
 * GUILDENGINE.JS
 * -----------------------------------------------------------------------
 * Gremios/clanes. Igual que con amigos y PvP, se usan documentos PLANOS
 * en vez de arrays de miembros dentro del gremio — así dos jugadores
 * uniéndose/saliendo al mismo tiempo no se pisan (un array compartido
 * necesitaría transacciones para cada cambio; documentos sueltos no).
 *
 * COLECCIONES:
 *   guildTags/{tag}        → { guildId } — reserva el tag, mismo patrón que nicknames
 *   guilds/{guildId}       → { nombre, tag, descripcion, liderUid, liderNombre,
 *                              miembroCount, creadoEn }
 *   guildMembers/{docId}   → { guildId, uid, nombre, rol: "lider"|"miembro", unidoEn }
 *                              (docId = `${guildId}_${uid}`, así nunca hay dos
 *                              filas del mismo jugador en el mismo gremio)
 *
 * PlayerData.guildId guarda en qué gremio está (o null) para no tener
 * que consultar Firestore solo para saberlo.
 * -----------------------------------------------------------------------
 */

function normalizarTag(tag) {
  return (tag || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

async function createGuild(nombre, tagCrudo, descripcion) {
  if (!firebaseEnabled || !firestoreDb) return { ok: false, motivo: "Los gremios necesitan conexión." };
  if (PlayerData.guildId) return { ok: false, motivo: "Ya perteneces a un gremio — sal de él primero." };

  const nombreLimpio = (nombre || "").trim();
  const tag = normalizarTag(tagCrudo);
  if (nombreLimpio.length < 3) return { ok: false, motivo: "El nombre debe tener al menos 3 caracteres." };
  if (tag.length < 2 || tag.length > 5) return { ok: false, motivo: "El tag debe tener entre 2 y 5 letras/números." };

  const costo = ECONOMY_CONFIG.gremio.costoCrear;
  if (PlayerData.moneda < costo) return { ok: false, motivo: `Necesitas 🪙 ${costo} para fundar un gremio.` };

  const refTag = firestoreDb.collection("guildTags").doc(tag);
  const refGuild = firestoreDb.collection("guilds").doc();

  try {
    await firestoreDb.runTransaction(async (tx) => {
      const docTag = await tx.get(refTag);
      if (docTag.exists) throw new Error("TAG_OCUPADO");

      tx.set(refTag, { guildId: refGuild.id });
      tx.set(refGuild, {
        nombre: nombreLimpio,
        tag,
        descripcion: (descripcion || "").trim(),
        liderUid: currentUser.uid,
        liderNombre: PlayerData.nombre || currentUser.email,
        miembroCount: 1,
        creadoEn: new Date().toISOString(),
      });
    });

    await firestoreDb.collection("guildMembers").doc(`${refGuild.id}_${currentUser.uid}`).set({
      guildId: refGuild.id,
      uid: currentUser.uid,
      nombre: PlayerData.nombre || currentUser.email,
      rol: "lider",
      unidoEn: new Date().toISOString(),
    });

    PlayerData.moneda -= costo;
    PlayerData.guildId = refGuild.id;
    savePlayerData();
    return { ok: true, guildId: refGuild.id };
  } catch (err) {
    if (err.message === "TAG_OCUPADO") return { ok: false, motivo: "Ese tag ya está en uso." };
    console.error("No se pudo crear el gremio:", err);
    return { ok: false, motivo: "No se pudo crear el gremio, intenta de nuevo." };
  }
}

async function findGuildByTag(tagCrudo) {
  const tag = normalizarTag(tagCrudo);
  if (!tag) return { ok: false, motivo: "Escribe un tag." };

  try {
    const docTag = await firestoreDb.collection("guildTags").doc(tag).get();
    if (!docTag.exists) return { ok: false, motivo: "No existe ningún gremio con ese tag." };
    const doc = await firestoreDb.collection("guilds").doc(docTag.data().guildId).get();
    if (!doc.exists) return { ok: false, motivo: "Ese gremio ya no existe." };
    return { ok: true, guild: { id: doc.id, ...doc.data() } };
  } catch (err) {
    console.error("No se pudo buscar el gremio:", err);
    return { ok: false, motivo: "No se pudo buscar ese tag, intenta de nuevo." };
  }
}

async function joinGuild(guildId) {
  if (PlayerData.guildId) return { ok: false, motivo: "Ya perteneces a un gremio — sal de él primero." };

  try {
    const refGuild = firestoreDb.collection("guilds").doc(guildId);
    const doc = await refGuild.get();
    if (!doc.exists) return { ok: false, motivo: "Ese gremio ya no existe." };
    const gremio = doc.data();
    if (gremio.miembroCount >= ECONOMY_CONFIG.gremio.maxMiembros) return { ok: false, motivo: "Ese gremio ya está lleno." };

    await firestoreDb.collection("guildMembers").doc(`${guildId}_${currentUser.uid}`).set({
      guildId,
      uid: currentUser.uid,
      nombre: PlayerData.nombre || currentUser.email,
      rol: "miembro",
      unidoEn: new Date().toISOString(),
    });
    await refGuild.update({ miembroCount: firebase.firestore.FieldValue.increment(1) });

    PlayerData.guildId = guildId;
    savePlayerData();
    return { ok: true, nombre: gremio.nombre };
  } catch (err) {
    console.error("No se pudo unir al gremio:", err);
    return { ok: false, motivo: "No se pudo unir al gremio." };
  }
}

async function fetchMyGuild() {
  if (!firebaseEnabled || !PlayerData.guildId) return null;
  try {
    const doc = await firestoreDb.collection("guilds").doc(PlayerData.guildId).get();
    if (!doc.exists) {
      PlayerData.guildId = null; // el gremio se disolvió sin que nos enteráramos
      savePlayerData();
      return null;
    }
    const miembrosSnap = await firestoreDb.collection("guildMembers").where("guildId", "==", PlayerData.guildId).get();
    const miembros = miembrosSnap.docs.map((d) => d.data()).sort((a, b) => (a.rol === "lider" ? -1 : b.rol === "lider" ? 1 : 0));
    return { id: doc.id, ...doc.data(), miembros };
  } catch (err) {
    console.error("No se pudo cargar el gremio:", err);
    return null;
  }
}

/** Sale del gremio. Si era el líder y quedan más miembros, asciende al más antiguo. Si era el último, disuelve el gremio. */
async function leaveGuild() {
  if (!PlayerData.guildId) return { ok: false, motivo: "No perteneces a ningún gremio." };
  const guildId = PlayerData.guildId;

  try {
    const miDoc = await firestoreDb.collection("guildMembers").doc(`${guildId}_${currentUser.uid}`).get();
    const eraLider = miDoc.exists && miDoc.data().rol === "lider";

    await firestoreDb.collection("guildMembers").doc(`${guildId}_${currentUser.uid}`).delete();

    const restantesSnap = await firestoreDb.collection("guildMembers").where("guildId", "==", guildId).get();
    if (restantesSnap.empty) {
      await disolverGuildInterno(guildId);
    } else {
      await firestoreDb.collection("guilds").doc(guildId).update({ miembroCount: firebase.firestore.FieldValue.increment(-1) });
      if (eraLider) {
        const nuevoLider = restantesSnap.docs.sort((a, b) => (a.data().unidoEn < b.data().unidoEn ? -1 : 1))[0];
        await nuevoLider.ref.update({ rol: "lider" });
        await firestoreDb.collection("guilds").doc(guildId).update({ liderUid: nuevoLider.data().uid, liderNombre: nuevoLider.data().nombre });
      }
    }

    PlayerData.guildId = null;
    savePlayerData();
    return { ok: true };
  } catch (err) {
    console.error("No se pudo salir del gremio:", err);
    return { ok: false, motivo: "No se pudo salir del gremio." };
  }
}

async function disolverGuildInterno(guildId) {
  const doc = await firestoreDb.collection("guilds").doc(guildId).get();
  if (doc.exists) await firestoreDb.collection("guildTags").doc(doc.data().tag).delete();
  await firestoreDb.collection("guilds").doc(guildId).delete();
}

/** Expulsa a un miembro — solo el líder puede hacerlo. */
async function kickGuildMember(uidAExpulsar) {
  if (!PlayerData.guildId) return { ok: false, motivo: "No perteneces a ningún gremio." };
  try {
    await firestoreDb.collection("guildMembers").doc(`${PlayerData.guildId}_${uidAExpulsar}`).delete();
    await firestoreDb.collection("guilds").doc(PlayerData.guildId).update({ miembroCount: firebase.firestore.FieldValue.increment(-1) });
    return { ok: true };
  } catch (err) {
    console.error("No se pudo expulsar al miembro:", err);
    return { ok: false, motivo: "No se pudo expulsar al miembro." };
  }
}

/** Disuelve el gremio entero — solo el líder puede hacerlo. */
async function disbandGuild() {
  if (!PlayerData.guildId) return { ok: false, motivo: "No perteneces a ningún gremio." };
  const guildId = PlayerData.guildId;
  try {
    const miembrosSnap = await firestoreDb.collection("guildMembers").where("guildId", "==", guildId).get();
    await Promise.all(miembrosSnap.docs.map((d) => d.ref.delete()));
    await disolverGuildInterno(guildId);
    PlayerData.guildId = null;
    savePlayerData();
    return { ok: true };
  } catch (err) {
    console.error("No se pudo disolver el gremio:", err);
    return { ok: false, motivo: "No se pudo disolver el gremio." };
  }
}
