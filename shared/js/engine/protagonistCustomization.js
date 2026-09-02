/**
 * PROTAGONISTCUSTOMIZATION.JS
 * -----------------------------------------------------------------------
 * El protagonista sigue siendo el "comandante" fijo que edita el admin
 * (nombre base, activa única, variantes) — esto NO cambia ese diseño
 * cerrado. Lo que sí guarda el jugador es:
 *   - un apodo propio para mostrar en vez del nombre base
 *   - cuál de las "variantes" de la activa (si el admin cargó alguna)
 *     quiere usar en vez de la de por defecto
 *
 * Todo vive en PlayerData.personalizacionProtagonistas, indexado por el
 * id del protagonista (no por partida ni por preset — es una elección
 * permanente del jugador para ESE protagonista).
 * -----------------------------------------------------------------------
 */

function getProtagonistCustomization(protagonistId) {
  return PlayerData.personalizacionProtagonistas[protagonistId] || { apodo: "", varianteIndex: -1 };
}

function setProtagonistApodo(protagonistId, apodo) {
  const actual = getProtagonistCustomization(protagonistId);
  PlayerData.personalizacionProtagonistas[protagonistId] = { ...actual, apodo: apodo.trim() };
  savePlayerData();
}

function setProtagonistVariante(protagonistId, varianteIndex) {
  const actual = getProtagonistCustomization(protagonistId);
  PlayerData.personalizacionProtagonistas[protagonistId] = { ...actual, varianteIndex };
  savePlayerData();
}

/** La activa que hay que usar para este protagonista: la variante elegida, o la de por defecto. */
function getProtagonistActivaElegida(protagonista) {
  const { varianteIndex } = getProtagonistCustomization(protagonista.id);
  const variantes = protagonista.variantes || [];
  if (varianteIndex >= 0 && variantes[varianteIndex]) return variantes[varianteIndex];
  return protagonista.activaUnica;
}

/**
 * Devuelve el protagonista tal como debe verse/actuar PARA ESTE
 * JUGADOR: con su apodo (si le puso uno) y su variante de activa
 * elegida (si eligió una) ya aplicados. La plantilla original en
 * GameData.protagonistas nunca se modifica.
 */
function getPersonalizedProtagonist(protagonistId) {
  const base = getProtagonistById(protagonistId);
  if (!base) return null;
  const { apodo } = getProtagonistCustomization(protagonistId);
  return {
    ...base,
    nombre: apodo || base.nombre,
    activaUnica: getProtagonistActivaElegida(base),
  };
}
