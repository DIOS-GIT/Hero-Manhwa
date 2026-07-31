/**
 * game-data.js
 * -----------------------------------------------------------------------
 * Datos de arranque del "creador de personaje" (pasos 1 a 5 antes de que
 * empiece el motor de nodos). Todo esto es contenido de EJEMPLO — tu
 * equipo lo reemplaza por lo real desde el panel admin o directo en
 * Firestore (colecciones: protagonists, routes, jobs, housing, heroines).
 *
 * Nada de lo que hay acá es contenido +18 explícito: son fichas de
 * selección (nombre, stats, descripción corta). El contenido sensible
 * vive en los nodos de la historia (story-engine.js + admin), no acá.
 * -----------------------------------------------------------------------
 */

// ---- Paso 1: protagonistas jugables ----
const PROTAGONISTS = [
  {
    id: "heredero",
    name: "El Heredero Caído",
    desc: "Nace en la familia más rica de la ciudad — hasta el día que lo desheredan.",
    stats: { carisma: 8, inteligencia: 6, fisico: 4, riqueza: 9, suerte: 3 }
  },
  {
    id: "genio",
    name: "El Genio Ignorado",
    desc: "El mejor promedio de su generación, invisible para todos... hasta ahora.",
    stats: { carisma: 3, inteligencia: 10, fisico: 3, riqueza: 4, suerte: 6 }
  },
  {
    id: "exdeportista",
    name: "El Ex-Deportista",
    desc: "Una lesión terminó su carrera en su mundo anterior. Acá tiene otra oportunidad.",
    stats: { carisma: 6, inteligencia: 4, fisico: 10, riqueza: 3, suerte: 5 }
  }
];

// ---- Paso 2: tipo de ruta / tono narrativo ----
const ROUTES = [
  {
    id: "vainilla",
    name: "Vainilla",
    desc: "Relaciones fieles y directas. Sin triángulos ni traiciones en el medio."
  },
  {
    id: "ntr",
    name: "NTR",
    desc: "El eje de la trama son los triángulos, los celos y la traición."
  },
  {
    id: "harem_dominante",
    name: "Harem dominante",
    desc: "El protagonista lleva la iniciativa con más de una heroína a la vez."
  }
];

// ---- Paso 3: trabajo o estudio (define qué personajes/tramas aparecen) ----
const JOBS = [
  { id: "universidad", name: "Estudiante universitario", tag: "campus", desc: "Desbloquea tramas y personajes del entorno universitario." },
  { id: "oficina", name: "Oficinista junior", tag: "corporativo", desc: "Desbloquea tramas y personajes del mundo corporativo." },
  { id: "gimnasio", name: "Entrenador de gimnasio", tag: "deportivo", desc: "Desbloquea tramas y personajes del entorno deportivo." },
  { id: "freelance", name: "Artista freelance", tag: "creativo", desc: "Desbloquea tramas y personajes del entorno artístico." }
];

// ---- Paso 4: vivienda (también define tramas/personajes disponibles) ----
const HOUSING = [
  { id: "apartamento", name: "Apartamento propio", tag: "independencia", desc: "Más libertad, menos supervisión." },
  { id: "familia", name: "Casa familiar", tag: "familia", desc: "Tramas con personajes de la familia y vecinos." },
  { id: "residencia", name: "Residencia compartida", tag: "comunidad", desc: "Tramas con compañeros de piso." },
  { id: "dormitorio", name: "Dormitorio universitario", tag: "campus", desc: "Solo disponible si tu trabajo/estudio es la universidad.", requiresJobTag: "campus" }
];

// ---- Paso 5: heroína principal (FMC) o harem ----
// `tags` cruza con el tag de JOBS/HOUSING para decidir qué heroínas se
// pueden ofrecer según lo elegido en los pasos 3 y 4.
const HEROINES = [
  { id: "ha_eun", name: "Ha-eun", tags: ["campus", "familia"], desc: "Compañera de clase, seria y competitiva." },
  { id: "seo_yun", name: "Seo-yun", tags: ["corporativo"], desc: "Su superiora directa en el trabajo." },
  { id: "mira", name: "Mira", tags: ["deportivo"], desc: "Su compañera de entrenamiento." },
  { id: "yuna", name: "Yuna", tags: ["creativo", "comunidad"], desc: "Vive en el piso de al lado, artista también." }
];

// Se exponen como globales simples (mismo patrón sin build-tools que ya usás:
// se cargan con <script> en orden dentro de index.html).
window.GAME_DATA = { PROTAGONISTS, ROUTES, JOBS, HOUSING, HEROINES };
