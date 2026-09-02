/**
 * RUNCONFIG.JS
 * -----------------------------------------------------------------------
 * Valores de FÁBRICA de cómo se genera un mapa de run nueva. Igual que
 * DEFAULT_RULES para el combate: esto solo se usa para inicializar
 * GameData.rutas la primera vez, o si el admin usa "Restaurar valores
 * por defecto" en "Admin: Rutas". Los cambios reales del admin se
 * guardan en GameData.rutas (localStorage) — engine/mapGenerator.js y
 * engine/runState.js siempre leen de GameData.rutas, nunca de aquí
 * directamente.
 * -----------------------------------------------------------------------
 */

const RUN_CONFIG_DEFAULT = {
  // cuántos "pisos" tiene el mapa antes del jefe (el jefe es un piso aparte, fijo)
  pisosAntesDelJefe: 5,

  // cuántos nodos hay por piso (el jugador elige uno de estos para avanzar)
  nodosPorPiso: { min: 2, max: 3 },

  // peso relativo de cada tipo de nodo al generar un piso normal
  // (el jefe y el primer piso se generan aparte, ver mapGenerator.js)
  pesosPorTipo: {
    combate: 45,
    elite: 15,
    evento: 20,
    tienda: 12,
    descanso: 8,
  },

  // cuántas cartas enemigas trae cada tipo de combate (1 a 4)
  tamanoEquipoEnemigo: {
    combate: { min: 2, max: 3 },
    elite: { min: 3, max: 4 },
    jefe: { min: 4, max: 4 },
  },

  // de qué rarezas puede sacar enemigos cada tipo de combate (entre más
  // avanzado el piso, más alta la rareza permitida — ver mapGenerator.js)
  rarezaMaximaPorTipo: {
    combate: ["comun", "rara"],
    elite: ["rara", "epica"],
    jefe: ["epica", "legendaria", "mitica"],
  },

  // recompensa de moneda al ganar cada tipo de combate
  recompensaMonedaPorTipo: {
    combate: { min: 20, max: 40 },
    elite: { min: 60, max: 100 },
    jefe: { min: 200, max: 300 },
  },

  // Plantillas de mapa armadas a mano en el admin (arrastrando íconos),
  // como alternativa a la generación aleatoria por pesos de arriba. Si
  // usarPlantillas es true y hay al menos una cargada, cada run nueva
  // elige una plantilla al azar y usa EXACTO esa secuencia de pisos (el
  // jefe se agrega solo al final). Ver engine/mapGenerator.js.
  usarPlantillas: false,
  plantillas: [],
};
