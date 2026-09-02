/**
 * ARCHETYPESCONFIG.JS
 * -----------------------------------------------------------------------
 * ÚNICO lugar donde vive el balance del sistema RAREZA → CLASE →
 * ARQUETIPO → ESTADÍSTICAS. El algoritmo que genera los números
 * (engine/archetypeStatGenerator.js) no sabe nada de balance — solo
 * lee estos rangos y hace la cuenta. Cambiar un número acá (o
 * agregar/quitar un arquetipo) no toca el algoritmo para nada.
 *
 * CÓMO FUNCIONA EL SISTEMA:
 *   1. Cada rareza tiene un PRESUPUESTO de "puntos" abstractos
 *      (RAREZA_BUDGETS). No son las estadísticas finales todavía.
 *   2. Cada arquetipo (dentro de una clase) define, para cada stat, un
 *      RANGO de qué FRACCIÓN del presupuesto le toca (ej. un Tanque
 *      Muralla mete 40%-50% de sus puntos en DEF). Elegir un número al
 *      azar dentro de cada rango, y luego normalizar para que sumen
 *      exactamente 100%, es lo que da la variación entre dos cartas
 *      del mismo arquetipo sin romper el presupuesto.
 *   3. Esos puntos por stat se convierten a la ESCALA REAL del juego
 *      multiplicando por STAT_POINT_MULTIPLIER (para que un "punto" de
 *      HP no valga lo mismo que un "punto" de VEL, ya que HP maneja
 *      números mucho más grandes en el resto del juego).
 *   4. STAT_MIN_VALUE evita que una carta quede con 0 en algo aunque
 *      su arquetipo casi no le meta presupuesto a esa stat.
 *
 * La misma fracción de presupuesto por arquetipo se usa en TODAS las
 * rarezas — por eso un Asesino Crítico prioriza ATQ/VEL igual de común
 * que mítico (solo cambia el presupuesto total a repartir).
 * -----------------------------------------------------------------------
 */

const RAREZA_BUDGETS = {
  comun: 20,
  rara: 40,
  epica: 80,
  legendaria: 160,
  mitica: 320,
};

// Cuánto vale, en la escala de stats REALES que ya usa el resto del
// juego, cada "punto" de presupuesto asignado a esa estadística.
// Ajustá estos números si querés que el sistema dé cartas más o menos
// fuertes en general, sin tocar ningún arquetipo.
const STAT_POINT_MULTIPLIER = {
  hp: 16,
  atk: 3,
  def: 1.5,
  velocidad: 2.5,
};

// Piso mínimo de cada estadística final (después de convertir puntos a
// valor real), para que ningún arquetipo pueda dejar una stat en 0.
const STAT_MIN_VALUE = {
  hp: 10,
  atk: 1,
  def: 1,
  velocidad: 5,
};

/**
 * pesos: fracción del presupuesto (0 a 1) que le toca a cada stat,
 * como rango [mínimo, máximo]. No hace falta que sumen exactamente 1 —
 * el generador normaliza — pero conviene que ronden 1 para que el
 * rango tenga sentido a simple vista.
 */
const CLASS_ARCHETYPES = {
  tanque: [
    { id: "muralla", nombre: "Muralla", pesos: { hp: [0.3, 0.4], atk: [0.05, 0.1], def: [0.4, 0.5], velocidad: [0.05, 0.15] } },
    { id: "coloso", nombre: "Coloso", pesos: { hp: [0.45, 0.55], atk: [0.05, 0.1], def: [0.25, 0.35], velocidad: [0.05, 0.15] } },
    { id: "guardian", nombre: "Guardián", pesos: { hp: [0.35, 0.4], atk: [0.08, 0.15], def: [0.35, 0.4], velocidad: [0.08, 0.15] } },
    { id: "tanque_ofensivo", nombre: "Tanque ofensivo", pesos: { hp: [0.3, 0.35], atk: [0.2, 0.3], def: [0.25, 0.3], velocidad: [0.1, 0.15] } },
  ],
  asesino: [
    { id: "burst", nombre: "Burst", pesos: { hp: [0.1, 0.15], atk: [0.45, 0.55], def: [0.05, 0.1], velocidad: [0.2, 0.3] } },
    { id: "critico", nombre: "Crítico", pesos: { hp: [0.08, 0.12], atk: [0.4, 0.5], def: [0.05, 0.08], velocidad: [0.3, 0.4] } },
    { id: "velocidad", nombre: "Velocidad", pesos: { hp: [0.08, 0.12], atk: [0.3, 0.4], def: [0.05, 0.08], velocidad: [0.4, 0.5] } },
    { id: "ejecutor", nombre: "Ejecutor", pesos: { hp: [0.2, 0.25], atk: [0.45, 0.55], def: [0.05, 0.1], velocidad: [0.15, 0.2] } },
  ],
  dps: [
    { id: "canon_cristal", nombre: "Cañón de cristal", pesos: { hp: [0.1, 0.15], atk: [0.55, 0.65], def: [0.05, 0.1], velocidad: [0.15, 0.2] } },
    { id: "dps_equilibrado", nombre: "DPS equilibrado", pesos: { hp: [0.2, 0.25], atk: [0.4, 0.45], def: [0.1, 0.15], velocidad: [0.2, 0.25] } },
    { id: "dps_sostenido", nombre: "DPS sostenido", pesos: { hp: [0.25, 0.3], atk: [0.4, 0.45], def: [0.15, 0.2], velocidad: [0.1, 0.15] } },
    { id: "dps_pesado", nombre: "DPS pesado", pesos: { hp: [0.15, 0.2], atk: [0.4, 0.45], def: [0.25, 0.3], velocidad: [0.1, 0.15] } },
  ],
  soporte: [
    { id: "curador", nombre: "Curador", pesos: { hp: [0.25, 0.3], atk: [0.1, 0.15], def: [0.2, 0.25], velocidad: [0.3, 0.35] } },
    { id: "buffer", nombre: "Buffer", pesos: { hp: [0.2, 0.25], atk: [0.1, 0.15], def: [0.25, 0.3], velocidad: [0.3, 0.35] } },
    { id: "protector", nombre: "Protector", pesos: { hp: [0.3, 0.35], atk: [0.05, 0.1], def: [0.35, 0.4], velocidad: [0.15, 0.2] } },
    { id: "soporte_rapido", nombre: "Soporte rápido", pesos: { hp: [0.2, 0.25], atk: [0.08, 0.12], def: [0.2, 0.25], velocidad: [0.4, 0.45] } },
  ],
  controlador: [
    { id: "control_rapido", nombre: "Control rápido", pesos: { hp: [0.15, 0.2], atk: [0.1, 0.15], def: [0.15, 0.2], velocidad: [0.45, 0.55] } },
    { id: "debilitador", nombre: "Debilitador", pesos: { hp: [0.15, 0.2], atk: [0.25, 0.3], def: [0.1, 0.15], velocidad: [0.35, 0.4] } },
    { id: "control_defensivo", nombre: "Control defensivo", pesos: { hp: [0.2, 0.25], atk: [0.08, 0.12], def: [0.25, 0.3], velocidad: [0.35, 0.4] } },
    { id: "control_ofensivo", nombre: "Control ofensivo", pesos: { hp: [0.12, 0.18], atk: [0.3, 0.35], def: [0.08, 0.12], velocidad: [0.35, 0.4] } },
  ],
  guerrero: [
    { id: "bruiser", nombre: "Bruiser", pesos: { hp: [0.3, 0.35], atk: [0.3, 0.35], def: [0.15, 0.2], velocidad: [0.1, 0.15] } },
    { id: "ofensivo", nombre: "Ofensivo", pesos: { hp: [0.25, 0.3], atk: [0.4, 0.45], def: [0.12, 0.18], velocidad: [0.1, 0.15] } },
    { id: "defensivo", nombre: "Defensivo", pesos: { hp: [0.35, 0.4], atk: [0.15, 0.2], def: [0.25, 0.3], velocidad: [0.1, 0.15] } },
    { id: "equilibrado", nombre: "Equilibrado", pesos: { hp: [0.27, 0.3], atk: [0.27, 0.3], def: [0.2, 0.23], velocidad: [0.2, 0.23] } },
  ],
};

function getArchetypesForClass(claseId) {
  return CLASS_ARCHETYPES[claseId] || [];
}

function getArchetypeById(claseId, arquetipoId) {
  return getArchetypesForClass(claseId).find((a) => a.id === arquetipoId) || null;
}
