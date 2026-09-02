/**
 * RULES-DEFAULT.JS
 * -----------------------------------------------------------------------
 * Todos los números "de balance" del sistema de combate viven aquí, en
 * un solo lugar. El admin edita estos valores con formularios (ver
 * js/admin/rulesEditor.js) y los cambios se guardan en localStorage —
 * este archivo solo define los valores de fábrica la primera vez que
 * se abre el juego, o si el admin usa "Restaurar valores por defecto".
 *
 * Cada bloque corresponde a una de las mecánicas que ya diseñamos.
 * -----------------------------------------------------------------------
 */

const DEFAULT_RULES = {
  formacion: {
    // cuántos cambios de formación gratuitos tiene el jugador por turno
    cambiosGratisPorTurno: 1,
    // costo de energía por cada cambio de formación adicional
    costoCambioExtra: 2,
  },

  energia: {
    maximo: 10,
    generacionBasePorTurno: 2,
    // energía extra que gana el EQUIPO cuando una de sus cartas recibe daño
    energiaPorRecibirDano: 1,
    // energía extra que gana el equipo cuando una de sus cartas ataca
    energiaPorAtacar: 1,
    // costo en energía de "saltarse" la primera línea con un ataque normal
    costoSaltarPrimeraLinea: 2,
  },

  objetivos: {
    // el ataque normal SIEMPRE prioriza la Carta 1 salvo que se pague
    // el costo de saltarPrimeraLinea de arriba
    ataqueNormalPriorizaCarta1: true,
  },

  defender: {
    // reducción de daño recibido al usar la acción "Defender".
    // Es un valor FIJO para cualquier carta (decisión ya tomada).
    reduccionDano: 0.5, // 50%
  },

  proteger: {
    // % de daño de la retaguardia que redirige el tanque en Carta 1
    porcentajeRedireccion: 0.3, // 30%
    // probabilidad de que la redirección FALLE (la retaguardia recibe
    // el golpe igualmente)
    probabilidadFallo: 0.1, // 10%
  },

  turnos: {
    // umbral que debe alcanzar la barra de acción de una carta para
    // que le toque actuar
    umbralAccion: 100,
  },

  muerte: {
    // reordenar automáticamente la formación cuando cae la Carta 1
    reordenarAlCaerPrimeraLinea: true,
    // ¿se puede revivir una carta DURANTE el combate? (decisión: no)
    revivirEnCombate: false,
    // costo en monedas de revivir una carta entre combates (a definir)
    costoRevivirMonedas: null,
  },

  victoria: {
    condicion: "eliminar_todas_las_cartas_enemigas",
  },
};
