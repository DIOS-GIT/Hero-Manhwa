/**
 * EFFECT-DESCRIPTIONS.JS (compartido)
 * -----------------------------------------------------------------------
 * Traduce el campo `efecto` (mecánico) de una pasiva, habilidad o activa
 * única de protagonista a una frase legible para mostrar en el detalle
 * de carta (juego) y en el editor (admin).
 *
 * Si el objeto trae un campo `descripcion` escrito a mano, esa siempre
 * gana — esto es solo el fallback automático para todo lo que no tiene
 * una descripción propia todavía.
 * -----------------------------------------------------------------------
 */

function nombreStatLegible(stat) {
  return { hp: "HP", atk: "ATQ", def: "DEF", velocidad: "VEL" }[stat] || stat || "stat";
}

function nombrePosicionLegible(pos) {
  if (pos === "primera_linea") return "primera línea";
  if (pos === "retaguardia") return "retaguardia";
  return null;
}

/** Describe una pasiva de carta: { stat, modificador, posicionRequerida? } */
function describirPasiva(p) {
  if (!p) return "";
  if (p.descripcion) return p.descripcion;
  const efecto = p.efecto;
  if (!efecto) return "Efecto pasivo sin configurar.";

  if (efecto.stat && efecto.modificador != null) {
    const signo = efecto.modificador >= 0 ? "+" : "";
    const porcentaje = `${signo}${Math.round(efecto.modificador * 100)}% ${nombreStatLegible(efecto.stat)}`;
    const posicion = nombrePosicionLegible(p.posicionRequerida);
    return posicion ? `${porcentaje} mientras esté en ${posicion}.` : `${porcentaje} de forma permanente.`;
  }
  return "Efecto pasivo especial.";
}

/** Describe una habilidad activa de carta o la activa única de un protagonista. */
function describirHabilidad(h) {
  if (!h) return "";
  if (h.descripcion) return h.descripcion;
  const efecto = h.efecto;
  if (!efecto) return "Efecto sin configurar.";

  const mult = efecto.multiplicador != null ? ` (x${efecto.multiplicador})` : "";
  let texto;

  switch (efecto.tipo) {
    case "dano":
      texto = `Inflige daño al objetivo${mult}.`;
      break;
    case "dano_area":
      texto = `Inflige daño a todo el equipo enemigo${mult}.`;
      break;
    case "curacion":
      texto = `Cura al objetivo${mult}.`;
      break;
    case "curacion_equipo":
      texto = `Cura a todo tu equipo${mult}.`;
      break;
    case "taunt":
      texto = "Obliga a los enemigos a atacar a esta carta durante el próximo turno.";
      break;
    case "buff_equipo":
      texto = efecto.stat
        ? `Da +${Math.round((efecto.modificador || 0) * 100)}% ${nombreStatLegible(efecto.stat)} a todo tu equipo durante ${efecto.duracionTurnos || "algunos"} turno(s).`
        : "Mejora a todo tu equipo por unos turnos.";
      break;
    case "debuff_area":
      texto = efecto.stat
        ? `Reduce ${Math.round((efecto.modificador || 0) * 100)}% ${nombreStatLegible(efecto.stat)} al equipo enemigo durante ${efecto.duracionTurnos || "algunos"} turno(s).`
        : "Debilita a todo el equipo enemigo por unos turnos.";
      break;
    default:
      texto = "Efecto especial.";
  }

  if (h.estadoQueAplica) texto += ` Aplica el estado "${h.estadoQueAplica}".`;
  if (h.cooldownTurnos) texto += ` Cooldown: ${h.cooldownTurnos} turno(s).`;
  if (h.costoEnergia != null) texto += ` Cuesta ${h.costoEnergia} de energía.`;

  return texto;
}
