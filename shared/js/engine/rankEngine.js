/**
 * RANKENGINE.JS
 * -----------------------------------------------------------------------
 * Sistema de rango estilo LoL: 5 divisiones (bronce → diamante), cada
 * una con 4 sub-rangos (IV el más bajo, I el más alto de esa división)
 * y una barra de LP (0-100) dentro del sub-rango actual.
 *
 * PlayerData.pvp = {
 *   division: "bronce", subrango: 4, lp: 0,
 *   victoriasRanked, derrotasRanked, victoriasNormal, derrotasNormal,
 *   victoriasAmistosa, derrotasAmistosa,
 *   historial: [{ fecha, modo, oponente, resultado }],
 * }
 * -----------------------------------------------------------------------
 */

const NOMBRES_DIVISION = { bronce: "Bronce", plata: "Plata", oro: "Oro", platino: "Platino", diamante: "Diamante" };
const NUMERAL_SUBRANGO = { 4: "IV", 3: "III", 2: "II", 1: "I" };

function getDefaultPvpProfile() {
  return {
    division: "bronce",
    subrango: 4,
    lp: 0,
    victoriasRanked: 0,
    derrotasRanked: 0,
    victoriasNormal: 0,
    derrotasNormal: 0,
    victoriasAmistosa: 0,
    derrotasAmistosa: 0,
    historial: [],
  };
}

function ensurePvpProfile() {
  if (!PlayerData.pvp) PlayerData.pvp = getDefaultPvpProfile();
  return PlayerData.pvp;
}

function getRankLabel(pvp) {
  return `${NOMBRES_DIVISION[pvp.division]} ${NUMERAL_SUBRANGO[pvp.subrango]}`;
}

/** Puntaje numérico único para ordenar el ranking PvP (más alto = mejor rango). */
function getRankScore(pvp) {
  const divisiones = ECONOMY_CONFIG.pvp.divisiones;
  const indiceDivision = divisiones.indexOf(pvp.division);
  return indiceDivision * 400 + (4 - pvp.subrango) * 100 + pvp.lp;
}

/**
 * Aplica el resultado de una partida Ranked al rango del jugador
 * (sube/baja de sub-rango o división según corresponda) y devuelve un
 * resumen para mostrar en pantalla.
 */
function applyRankedResult(gano) {
  const pvp = ensurePvpProfile();
  const divisiones = ECONOMY_CONFIG.pvp.divisiones;
  const rangoAntes = getRankLabel(pvp);
  let ascendio = false;
  let descendio = false;

  if (gano) {
    pvp.lp += ECONOMY_CONFIG.pvp.lpPorVictoriaRanked;
    while (pvp.lp >= 100) {
      pvp.lp -= 100;
      if (pvp.subrango > 1) {
        pvp.subrango -= 1;
      } else {
        const indiceActual = divisiones.indexOf(pvp.division);
        if (indiceActual < divisiones.length - 1) {
          pvp.division = divisiones[indiceActual + 1];
          pvp.subrango = 4;
        } else {
          pvp.lp = 100; // ya está en la cima (Diamante I) — se queda ahí
          break;
        }
      }
      ascendio = true;
    }
  } else {
    pvp.lp -= ECONOMY_CONFIG.pvp.lpPorDerrotaRanked;
    while (pvp.lp < 0) {
      if (pvp.subrango < 4) {
        pvp.subrango += 1;
        pvp.lp += 100;
        descendio = true;
      } else {
        const indiceActual = divisiones.indexOf(pvp.division);
        if (indiceActual > 0) {
          pvp.division = divisiones[indiceActual - 1];
          pvp.subrango = 1;
          pvp.lp += 100;
          descendio = true;
        } else {
          pvp.lp = 0; // ya está en el piso (Bronce IV) — no baja más
          break;
        }
      }
    }
  }

  return { rangoAntes, rangoDespues: getRankLabel(pvp), ascendio, descendio };
}

/**
 * Registra el resultado de una partida PvP (cualquier modo) y aplica
 * las recompensas correspondientes. Se llama al terminar un combate PvP.
 * @param {"ranked"|"normal"|"amistosa"} modo
 * @param {boolean} gano
 * @param {string} oponenteNombre
 */
function registerPvpResult(modo, gano, oponenteNombre) {
  const pvp = ensurePvpProfile();
  let resumenRango = null;
  let creditosGanados = 0;

  if (modo === "ranked") {
    pvp[gano ? "victoriasRanked" : "derrotasRanked"]++;
    resumenRango = applyRankedResult(gano);
    if (gano) creditosGanados = ECONOMY_CONFIG.pvp.creditosPorVictoriaRanked;
  } else if (modo === "normal") {
    pvp[gano ? "victoriasNormal" : "derrotasNormal"]++;
    if (gano) creditosGanados = ECONOMY_CONFIG.pvp.creditosPorVictoriaNormal;
  } else {
    pvp[gano ? "victoriasAmistosa" : "derrotasAmistosa"]++;
  }

  pvp.historial.unshift({
    fecha: new Date().toISOString(),
    modo,
    oponente: oponenteNombre,
    resultado: gano ? "victoria" : "derrota",
  });
  pvp.historial = pvp.historial.slice(0, 50); // no crecer infinito

  if (creditosGanados > 0) addCoins(creditosGanados);
  savePlayerData();
  syncLeaderboardEntry();

  return { resumenRango, creditosGanados };
}
