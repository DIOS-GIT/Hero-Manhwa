/**
 * TURNORDER.JS
 * -----------------------------------------------------------------------
 * Sistema de turnos elegido: cola de iniciativa INDIVIDUAL (no por
 * rondas de equipo), calculada por turnos discretos (no en tiempo
 * real), tipo ATB clásico:
 *
 *   - Cada carta tiene una "barra de acción" que empieza en 0.
 *   - En cada paso, se le suma su Velocidad efectiva a la barra de
 *     TODAS las cartas vivas.
 *   - La primera carta en llegar al umbral (rules.turnos.umbralAccion)
 *     actúa. Su barra vuelve a 0 (se descarta el sobrante, para
 *     simplicidad y para que el UI sea fácil de leer).
 *   - Si hay empate exacto, decide el orden de slot (primera línea
 *     primero) como desempate estable.
 * -----------------------------------------------------------------------
 */

/**
 * Avanza la cola hasta que exactamente UNA carta esté lista para
 * actuar, y la devuelve. No la marca como "ya actuó" — eso lo hace
 * quien procese su turno (engine/combat.js).
 */
function advanceToNextActor(combatState) {
  const umbral = combatState.reglas.turnos.umbralAccion;
  const vivos = combatState.cards.filter((c) => c.alive);
  if (vivos.length === 0) return null;

  // Avanza en pasos hasta que alguien cruce el umbral. Para evitar un
  // bucle infinito con velocidad 0, forzamos un mínimo de 1.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let listos = vivos.filter((c) => c.actionBar >= umbral);
    if (listos.length > 0) {
      // Desempate: menor slot (primera línea) actúa primero.
      listos.sort((a, b) => a.slot - b.slot);
      return listos[0];
    }
    vivos.forEach((c) => {
      const velocidadEfectiva = Math.max(1, c.stats.velocidad);
      c.actionBar += velocidadEfectiva;
    });
  }
}

/**
 * Se llama después de que una carta actúa: resetea su barra.
 */
function resetActionBar(combatCard) {
  const sobrante = combatCard.actionBar - 100;
  combatCard.actionBar = sobrante > 0 ? sobrante : 0;
}

/**
 * Devuelve una vista previa de las próximas N cartas en actuar, SIN
 * modificar el estado real (trabaja sobre una copia). Se usa para
 * pintar la barra de "próximos turnos" en la UI.
 */
function previewUpcomingTurns(combatState, cantidad) {
  const umbral = combatState.reglas.turnos.umbralAccion;
  // copia superficial de los datos que nos importan para simular
  let simulados = combatState.cards
    .filter((c) => c.alive)
    .map((c) => ({
      instanceId: c.instanceId,
      nombre: c.nombre,
      team: c.team,
      slot: c.slot,
      velocidad: Math.max(1, c.stats.velocidad),
      actionBar: c.actionBar,
    }));

  const resultado = [];
  let guard = 0;
  while (resultado.length < cantidad && guard < 500) {
    guard++;
    let listos = simulados.filter((c) => c.actionBar >= umbral);
    if (listos.length > 0) {
      listos.sort((a, b) => a.slot - b.slot);
      const actor = listos[0];
      resultado.push({ instanceId: actor.instanceId, nombre: actor.nombre, team: actor.team });
      actor.actionBar -= umbral;
    } else {
      simulados.forEach((c) => (c.actionBar += c.velocidad));
    }
  }
  return resultado;
}
