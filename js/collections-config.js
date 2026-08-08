// Los "key" de cada campo tienen que coincidir EXACTO con lo que lee
// js/character-creation.js del juego (desc, tag, tags, stats como
// objeto) — así data-loader.js no tiene que renombrar nada.
// "hint" se muestra como guía arriba del formulario; "placeholder" como
// ejemplo tenue adentro de cada input, para que cualquiera del equipo
// sepa qué tipo de contenido va ahí sin tener que preguntar.
export const COLLECTIONS = [
  {
    key: "protagonists",
    label: "Protagonistas",
    icon: "🧑‍🎤",
    hint: "Ejemplo: nombre corto y con gancho, 1-2 líneas de descripción, 4 stats del 1 al 10, un peso para la ruleta (dejalo en blanco = 1, o subilo si querés que salga más seguido), y una imagen por expresión.",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: El Heredero Caído" },
      { key: "desc", label: "Descripción", type: "textarea", placeholder: "Ej: Nace en la familia más rica de la ciudad — hasta el día que lo desheredan." },
      { key: "images", label: "Imágenes (una por expresión)", type: "image-list" },
      { key: "weight", label: "Peso en la ruleta (1-100, más alto = más probable)", type: "number", placeholder: "Ej: 50" },
      { key: "stats", label: "Stats iniciales", type: "fixed-stats", keys: ["carisma", "inteligencia", "fisico", "riqueza"] },
    ],
  },
  {
    key: "routes",
    label: "Rutas",
    icon: "🧭",
    hint: "Ejemplo: el tono general de una trama posible (venganza, romance, ascenso social...), no un personaje ni un capítulo puntual.",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Ascenso al poder" },
      { key: "desc", label: "Descripción", type: "textarea", placeholder: "Ej: tu historia gira en torno a construir un imperio desde cero." },
    ],
  },
  {
    key: "jobs",
    label: "Trabajos",
    icon: "💼",
    hint: "El 'tag' es lo que conecta el trabajo con la vivienda y las heroínas disponibles — usá siempre el mismo tag si dos trabajos deberían abrir las mismas rutas.",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Estudiante de élite" },
      { key: "desc", label: "Descripción", type: "textarea", placeholder: "Ej: vas a la academia más prestigiosa de la ciudad." },
      { key: "tag", label: "Tag (ej: estudiante, oficinista)", type: "text", placeholder: "Ej: estudiante", normalize: "lowercase" },
    ],
  },
  {
    key: "housing",
    label: "Vivienda",
    icon: "🏠",
    hint: "'Requiere este tag de trabajo' es opcional — dejalo vacío si esa vivienda está disponible para cualquier trabajo.",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Dormitorio compartido" },
      { key: "desc", label: "Descripción", type: "textarea", placeholder: "Ej: vivís con otros becados dentro del campus." },
      { key: "tag", label: "Tag (ej: dormitorio, depto)", type: "text", placeholder: "Ej: dormitorio", normalize: "lowercase" },
      {
        key: "requiresJobTag",
        label: "Requiere este tag de trabajo (opcional)",
        type: "text",
        placeholder: "Ej: estudiante (vacío = disponible para todos)",
        normalize: "lowercase",
      },
    ],
  },
  {
    key: "heroines",
    label: "Heroínas / Waifus",
    icon: "💗",
    hint: "Los tags son una lista para tildar (ya no se escriben a mano, así no hay riesgo de un typo como 'Estudiante' vs 'estudiante' que rompa el match). Si no ves el tag que buscás, cargalo primero en Trabajos o Vivienda.",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Yua Tanaka" },
      { key: "desc", label: "Descripción", type: "textarea", placeholder: "Ej: tu compañera de clase, fría por fuera pero atenta con vos sin que se note." },
      { key: "images", label: "Imágenes (una por expresión)", type: "image-list" },
      {
        key: "tags",
        label: "Tags (tildá los que correspondan — salen de los tags que ya cargaste en Trabajos y Vivienda)",
        type: "tag-multiselect",
      },
      { key: "weight", label: "Peso en la ruleta (1-100, más alto = más probable)", type: "number", placeholder: "Ej: 50" },
      {
        key: "stats",
        label: "Stats (afinidad es la más importante — no se le muestra al jugador)",
        type: "fixed-stats",
        keys: ["carisma", "inteligencia", "fisico", "riqueza", "afinidad"],
      },
    ],
  },
  {
    key: "backgrounds",
    label: "Fondos",
    icon: "🖼️",
    hint: "El nombre es solo para identificarlo en los selectores de Nodos — no lo ve el jugador.",
    fields: [
      { key: "name", label: "Nombre / etiqueta", type: "text", required: true, placeholder: "Ej: Aula vacía al atardecer" },
      { key: "imageUrl", label: "Imagen", type: "image", required: true },
    ],
  },
  {
    key: "stories",
    label: "Historias / Capítulos",
    icon: "📖",
    hint: "El 'ID del nodo inicial' es el ID (n001, n002...) del primer nodo que armes para esta historia en la pestaña Nodos/Decisiones. Tildá 'Es la Historia de introducción' en UNA sola — el juego siempre arranca por ahí, sin importar cuántas otras historias tengas cargadas.",
    fields: [
      { key: "title", label: "Título", type: "text", required: true, placeholder: "Ej: Capítulo 1 — El despertar" },
      { key: "description", label: "Descripción", type: "textarea", placeholder: "Ej: el protagonista descubre que reencarnó en el mundo del manhwa." },
      {
        key: "startNode",
        label: "ID del nodo inicial (ej: n001)",
        type: "text",
        placeholder: "Ej: n001",
      },
      {
        key: "isIntro",
        label: "Es la Historia de introducción (el juego siempre arranca acá)",
        type: "boolean",
      },
    ],
  },
];
