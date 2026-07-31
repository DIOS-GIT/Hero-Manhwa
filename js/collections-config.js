// Los "key" de cada campo tienen que coincidir EXACTO con lo que lee
// js/character-creation.js del juego (desc, tag, tags, etc.) — así
// data-loader.js no tiene que renombrar nada, solo pasar los datos tal cual.
export const COLLECTIONS = [
  {
    key: "protagonists",
    label: "Protagonistas",
    icon: "🧑‍🎤",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "portraitUrl", label: "Retrato", type: "image" },
      {
        key: "stats",
        label: "Stats iniciales (JSON, ej: carisma/inteligencia/fisico/riqueza/suerte)",
        type: "json",
        placeholder: '{"carisma":8,"inteligencia":6,"fisico":4,"riqueza":9,"suerte":3}',
      },
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
      { key: "portraitUrl", label: "Retrato", type: "image" },
      {
        key: "tags",
        label: "Tags separados por coma (deben matchear tag de trabajo o vivienda)",
        type: "text",
        placeholder: "estudiante,dormitorio",
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
