/**
 * ACHIEVEMENTSENGINE.JS
 * -----------------------------------------------------------------------
 * Calcula el progreso de cada logro a partir de PlayerData (nunca se
 * guarda un "progreso" aparte — siempre se recalcula de los datos que
 * ya existen, para que nunca se desincronice).
 * -----------------------------------------------------------------------
 */

function getAchievementProgress(logro) {
  switch (logro.tipo) {
    case "victorias":
      return PlayerData.victoriasTotales || 0;
    case "coleccionTotal":
      return PlayerData.coleccion.length;
    case "coleccionRareza":
      return PlayerData.coleccion.filter((id) => {
        const carta = GameData.cartas.find((c) => c.id === id);
        return carta && carta.rareza === logro.rareza;
      }).length;
    case "gachaTiradas":
      return PlayerData.gachaTiradasTotales || 0;
    case "profundidadMaxima":
      return PlayerData.historial.reduce((max, h) => Math.max(max, h.nodosAlcanzados || 0), 0);
    case "runsGanadas":
      return PlayerData.historial.filter((h) => h.resultado === "victoria").length;
    default:
      return 0;
  }
}

function isAchievementComplete(logro) {
  return getAchievementProgress(logro) >= logro.meta;
}

function isAchievementClaimed(logro) {
  return (PlayerData.logrosCompletados || []).includes(logro.id);
}

/** @returns {{ok: boolean, motivo?: string, logro?: object}} */
function claimAchievement(logroId) {
  const logro = ACHIEVEMENTS_POOL.find((l) => l.id === logroId);
  if (!logro) return { ok: false, motivo: "Logro no encontrado." };
  if (isAchievementClaimed(logro)) return { ok: false, motivo: "Ya reclamaste este logro." };
  if (!isAchievementComplete(logro)) return { ok: false, motivo: "Todavía no cumples este logro." };

  PlayerData.logrosCompletados.push(logro.id);
  if (logro.recompensa.moneda) addCoins(logro.recompensa.moneda);
  if (logro.recompensa.cofre) addChest(logro.recompensa.cofre);
  savePlayerData();
  return { ok: true, logro };
}

/** Cuántos logros completados y no reclamados hay (para el badge del hub). */
function countClaimableAchievements() {
  return ACHIEVEMENTS_POOL.filter((l) => isAchievementComplete(l) && !isAchievementClaimed(l)).length;
}
