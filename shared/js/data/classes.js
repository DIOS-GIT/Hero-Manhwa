/**
 * CLASSES.JS
 * -----------------------------------------------------------------------
 * Lista de clases/roles de carta. Esto es solo una ETIQUETA descriptiva
 * (no bloquea lo que una carta puede hacer, tal como se definió en el
 * diseño: la posición y las pasivas dan eficiencia, no reglas rígidas).
 *
 * Para agregar una clase nueva, solo añádela a esta lista.
 * -----------------------------------------------------------------------
 */

const CLASSES_LIST = [
  { id: "tanque", label: "Tanque" },
  { id: "asesino", label: "Asesino" },
  { id: "dps", label: "DPS" },
  { id: "soporte", label: "Soporte" },
  { id: "controlador", label: "Controlador" },
  { id: "guerrero", label: "Guerrero" },
];

function getClassById(id) {
  return CLASSES_LIST.find((c) => c.id === id) || null;
}
