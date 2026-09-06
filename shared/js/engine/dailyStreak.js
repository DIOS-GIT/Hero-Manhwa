/**
 * DAILYSTREAK.JS
 * -----------------------------------------------------------------------
 * Se llama una vez por sesión, justo después de loguearse. Compara la
 * fecha de hoy con PlayerData.ultimoLoginFecha:
 *   - mismo día  -> ya se contó hoy, no hace nada de nuevo.
 *   - día siguiente al último login -> +1 a la racha.
 *   - cualquier otro salto (o primera vez) -> la racha vuelve a 1.
 *
 * Cada día da moneda (más cuanto más larga la racha) y cada
 * ECONOMY_CONFIG.rachaDiaria.diasPorHito días consecutivos, además, un
 * cofre — con la rareza subiendo por cada tramo de días completado.
 * -----------------------------------------------------------------------
 */

function getFechaHoyLocal() {
  const ahora = new Date();
  const offsetMs = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - offsetMs).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** @returns {{yaContadoHoy: boolean, racha: number, monedaGanada: number, cofreGanado: string|null}} */
function applyDailyStreak() {
  const hoy = getFechaHoyLocal();

  if (PlayerData.ultimoLoginFecha === hoy) {
    return { yaContadoHoy: true, racha: PlayerData.rachaActual, monedaGanada: 0, cofreGanado: null };
  }

  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().slice(0, 10);

  PlayerData.rachaActual = PlayerData.ultimoLoginFecha === ayerStr ? PlayerData.rachaActual + 1 : 1;
  PlayerData.ultimoLoginFecha = hoy;

  const cfg = ECONOMY_CONFIG.rachaDiaria;
  const monedaGanada = cfg.monedaBase + PlayerData.rachaActual * cfg.monedaPorDiaDeRacha;
  addCoins(monedaGanada);

  let cofreGanado = null;
  if (PlayerData.rachaActual % cfg.diasPorHito === 0) {
    const semana = PlayerData.rachaActual / cfg.diasPorHito;
    cofreGanado = cfg.rarezaPorSemana[Math.min(semana - 1, cfg.rarezaPorSemana.length - 1)];
    addChest(cofreGanado);
  }

  savePlayerData();
  return { yaContadoHoy: false, racha: PlayerData.rachaActual, monedaGanada, cofreGanado };
}
