/**
 * LEVELINGCONFIG.JS
 * -----------------------------------------------------------------------
 * ÚNICO lugar donde vive el balance de "subir de nivel" una carta. Ni el
 * motor de combate ni el admin necesitan saber CÓMO se calcula la XP o
 * el bonus de stats — solo llaman a las funciones de abajo. Cambiar un
 * número acá (o editarlo desde el admin, pestaña "Niveles") no rompe ni
 * toca ningún otro sistema.
 *
 * El nivel y la XP de una carta son progreso DEL JUGADOR (viven en
 * PlayerData.progresoCartas, ver engine/cardLevelEngine.js) — la carta
 * "molde" que edita el admin en js/data/cards-*.js nunca cambia.
 *
 * Por rareza:
 *   nivelMax       -> tope de nivel de esa rareza
 *   statPorNivel   -> % que sube CADA stat (hp/atk/def/velocidad) por
 *                     cada nivel ganado por encima del 1 (ej. 0.012 = +1.2%)
 *   xpBase         -> XP que pide pasar del nivel 1 al 2
 *   xpCrecimiento  -> cuánto se multiplica el costo de XP en cada nivel
 *                     siguiente (curva creciente)
 *
 * Pensado así a propósito: las rarezas altas ya arrancan con stats base
 * más fuertes (los define el admin), así que necesitan subir MENOS en
 * porcentaje para seguir siendo las mejores. Las comunes suben mucho
 * más en % porque parten bajas — así una común bien nivelada se vuelve
 * viable sin llegar a superar a una mítica nivelada.
 * -----------------------------------------------------------------------
 */

const LEVELING_CONFIG_DEFAULT = {
  xpPorVictoria: 12, // XP que recibe cada carta que jugó un combate ganado
  porRareza: {
    comun: { nivelMax: 100, statPorNivel: 0.012, xpBase: 20, xpCrecimiento: 1.045 },
    rara: { nivelMax: 80, statPorNivel: 0.014, xpBase: 28, xpCrecimiento: 1.05 },
    epica: { nivelMax: 40, statPorNivel: 0.022, xpBase: 45, xpCrecimiento: 1.07 },
    legendaria: { nivelMax: 20, statPorNivel: 0.032, xpBase: 70, xpCrecimiento: 1.1 },
    mitica: { nivelMax: 10, statPorNivel: 0.045, xpBase: 110, xpCrecimiento: 1.15 },
  },
};

/** XP necesaria para pasar de `nivel` a `nivel + 1`, para esa rareza. Infinity si ya está al tope. */
function xpParaSiguienteNivel(rareza, nivel, reglasNiveles) {
  const cfg = reglasNiveles.porRareza[rareza];
  if (!cfg || nivel >= cfg.nivelMax) return Infinity;
  return Math.round(cfg.xpBase * Math.pow(cfg.xpCrecimiento, nivel - 1));
}

/** Multiplicador de stats acumulado en `nivel` (nivel 1 = ×1, sin bonus). */
function multiplicadorStatsPorNivel(rareza, nivel, reglasNiveles) {
  const cfg = reglasNiveles.porRareza[rareza];
  if (!cfg) return 1;
  const nivelMax = cfg.nivelMax || 1;
  const nivelEfectivo = Math.max(1, Math.min(nivel, nivelMax));
  return 1 + cfg.statPorNivel * (nivelEfectivo - 1);
}

function getNivelMaxPorRareza(rareza, reglasNiveles) {
  const cfg = reglasNiveles.porRareza[rareza];
  return cfg ? cfg.nivelMax : 1;
}
