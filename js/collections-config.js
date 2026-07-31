// Los "key" de cada campo tienen que coincidir EXACTO con lo que lee
// js/character-creation.js del juego (desc, tag, tags, stats como
// objeto) — así data-loader.js no tiene que renombrar nada.
export const COLLECTIONS = [
  {
    key: "protagonists",
    label: "Protagonistas",
    icon: "🧑‍🎤",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "images", label: "Imágenes (una por expresión)", type: "image-list" },
      { key: "stats", label: "Stats iniciales", type: "fixed-stats", keys: ["carisma", "inteligencia", "fisico", "riqueza"] },
    ],
  },
  {
    key: "routes",
    label: "Rutas",
    icon: "🧭",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
    ],
  },
  {
    key: "jobs",
    label: "Trabajos",
    icon: "💼",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "tag", label: "Tag (ej: estudiante, oficinista)", type: "text" },
    ],
  },
  {
    key: "housing",
    label: "Vivienda",
    icon: "🏠",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "tag", label: "Tag (ej: dormitorio, depto)", type: "text" },
      {
        key: "requiresJobTag",
        label: "Requiere este tag de trabajo (opcional)",
        type: "text",
      },
    ],
  },
  {
    key: "heroines",
    label: "Heroínas / Waifus",
    icon: "💗",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "images", label: "Imágenes (una por expresión)", type: "image-list" },
      {
        key: "tags",
        label: "Tags separados por coma (deben matchear tag de trabajo o vivienda)",
        type: "text",
        placeholder: "estudiante,dormitorio",
      },
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
    fields: [
      { key: "name", label: "Nombre / etiqueta", type: "text", required: true },
      { key: "imageUrl", label: "Imagen", type: "image", required: true },
    ],
  },
  {
    key: "stories",
    label: "Historias / Capítulos",
    icon: "📖",
    fields: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "startNode",
        label: "ID del nodo inicial (ej: n001)",
        type: "text",
      },
    ],
  },
];
