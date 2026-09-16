/**
 * MAILBOXENGINE.JS
 * -----------------------------------------------------------------------
 * Correo global: mensajes que el admin manda a TODOS los jugadores a la
 * vez (compensación por un bug, regalo de lanzamiento, aviso de evento).
 * No hay una copia por jugador — vive una sola vez en GameData.correoGlobal
 * y cada PlayerData.correoReclamado guarda qué ids ya reclamó, para no
 * tener que escribirle a cada jugador por separado.
 *
 * FORMA DE UN CORREO (lo crea el admin):
 *   { id, titulo, mensaje, recompensa: { moneda, cofre (rareza u null),
 *     fragmentos (cantidad u 0) }, fechaExpira (ISO "YYYY-MM-DD" u null) }
 * -----------------------------------------------------------------------
 */

function getUnclaimedMail() {
  const hoy = new Date().toISOString().slice(0, 10);
  return (GameData.correoGlobal || []).filter((m) => {
    const reclamado = (PlayerData.correoReclamado || []).includes(m.id);
    const vencido = m.fechaExpira && m.fechaExpira < hoy;
    return !reclamado && !vencido;
  });
}

/**
 * Reclama un correo: aplica su recompensa y lo marca como reclamado.
 * @param {string} mailId
 * @param {string} [cartaIdParaFragmentos] obligatorio si el correo trae fragmentos
 */
function claimMail(mailId, cartaIdParaFragmentos) {
  const correo = (GameData.correoGlobal || []).find((m) => m.id === mailId);
  if (!correo) return { ok: false, motivo: "Ese correo ya no existe." };
  if ((PlayerData.correoReclamado || []).includes(mailId)) return { ok: false, motivo: "Ya reclamaste este correo." };
  if (correo.recompensa.fragmentos > 0 && !cartaIdParaFragmentos) {
    return { ok: false, motivo: "Elige a qué carta van los fragmentos." };
  }

  if (correo.recompensa.moneda > 0) addCoins(correo.recompensa.moneda);
  if (correo.recompensa.cofre) addChest(correo.recompensa.cofre);
  if (correo.recompensa.fragmentos > 0) addCardFragments(cartaIdParaFragmentos, correo.recompensa.fragmentos);

  if (!PlayerData.correoReclamado) PlayerData.correoReclamado = [];
  PlayerData.correoReclamado.push(mailId);
  savePlayerData();
  return { ok: true, correo };
}
