/**
 * STATUSES.JS
 * -----------------------------------------------------------------------
 * Catálogo de estados alterados que una habilidad puede aplicar.
 * Se dividen en 3 categorías (campo "type"):
 *
 *   - "dot"     → daño sobre tiempo (veneno, quemadura). Se resuelve al
 *                 inicio del turno de la carta afectada.
 *   - "control" → impide actuar con normalidad (aturdido, silenciado).
 *   - "stat"    → modifica una estadística mientras dure (acelerar,
 *                 ralentizar, buff/debuff de ATQ o DEF).
 *
 * Para agregar un estado nuevo, cópialo del más parecido y cambia sus
 * valores. El motor (js/engine/statusEffects.js) lee esta lista para
 * saber cómo aplicar cada uno; no hace falta tocar el motor salvo que
 * el estado necesite una lógica totalmente nueva.
 * -----------------------------------------------------------------------
 */

const STATUSES_LIST = [
  {
    id: "veneno",
    label: "Veneno",
    type: "dot",
    icon: "veneno.png",
    // daño = porcentaje del HP máximo de la carta afectada, por turno
    defaultValue: 0.05, // 5% del HP máx por turno
    defaultDuration: 3, // turnos
    stackable: true,
  },
  {
    id: "quemadura",
    label: "Quemadura",
    type: "dot",
    icon: "quemadura.png",
    defaultValue: 0.08,
    defaultDuration: 2,
    stackable: false,
  },
  {
    id: "aturdido",
    label: "Aturdido",
    type: "control",
    icon: "aturdido.png",
    // efecto: la carta pierde su próximo turno por completo
    defaultDuration: 1,
    stackable: false,
  },
  {
    id: "silencio",
    label: "Silenciado",
    type: "control",
    icon: "silencio.png",
    // efecto: la carta no puede usar habilidades activas (sí puede
    // atacar normal o defender)
    defaultDuration: 2,
    stackable: false,
  },
  {
    id: "acelerar",
    label: "Acelerado",
    type: "stat",
    icon: "acelerar.png",
    stat: "velocidad",
    // multiplicador aplicado a la Velocidad mientras dure
    defaultValue: 1.3,
    defaultDuration: 3,
    stackable: false,
  },
  {
    id: "ralentizar",
    label: "Ralentizado",
    type: "stat",
    icon: "ralentizar.png",
    stat: "velocidad",
    defaultValue: 0.7,
    defaultDuration: 3,
    stackable: false,
  },
];

function getStatusById(id) {
  return STATUSES_LIST.find((s) => s.id === id) || null;
}
