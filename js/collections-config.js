// Cada entrada describe una colección de Firestore y qué formulario
// generar para ella. Agregar una sección nueva = agregar un objeto acá,
// no hace falta tocar admin.js.
export const COLLECTIONS = [
  {
    key: "protagonists",
    label: "Protagonistas",
    icon: "🧑‍🎤",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "portraitUrl", label: "Retrato", type: "image" },
      {
        key: "stats",
        label: "Stats iniciales (JSON)",
        type: "json",
        placeholder: '{"fuerza":5,"carisma":3}',
      },
    ],
  },
  {
    key: "heroines",
    label: "Heroínas / Waifus",
    icon: "💗",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "route", label: "Ruta a la que pertenece", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "portraitUrl", label: "Retrato", type: "image" },
    ],
  },
  {
    key: "routes",
    label: "Rutas",
    icon: "🧭",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
    ],
  },
  {
    key: "jobs",
    label: "Trabajos",
    icon: "💼",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "requirements",
        label: "Requisitos (JSON)",
        type: "json",
        placeholder: '{"carisma":4}',
      },
    ],
  },
  {
    key: "housing",
    label: "Vivienda",
    icon: "🏠",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "cost", label: "Costo", type: "number" },
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
