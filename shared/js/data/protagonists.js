/**
 * PROTAGONISTS.JS
 * -----------------------------------------------------------------------
 * Catálogo de protagonistas. Trae 2 de EJEMPLO (uno táctico ofensivo,
 * uno defensivo) para que el selector funcione de una vez — agrega los
 * tuyos desde el admin ("Admin: Protagonistas").
 *
 * A diferencia de las cartas, los protagonistas NO se consiguen por
 * gacha ni entran en la colección — están siempre disponibles para
 * elegir al armar un equipo, tal como se definió (son "comandantes",
 * no coleccionables).
 * -----------------------------------------------------------------------
 */

const PROTAGONISTS_DEFAULT = [
  {
    id: "protagonista_comandante_fuego",
    nombre: "Kael, el Comandante de Cenizas",
    arquetipo: "Táctico ofensivo",
    descripcion: "Un exgeneral que aprendió a leer el campo de batalla antes que a leer libros.",
    imagen: "",
    activaUnica: {
      nombre: "Andanada",
      descripcion: "Inflige daño a todo el equipo enemigo, con un multiplicador basado en el ATQ promedio de tu equipo.",
      efecto: { tipo: "dano_area", multiplicador: 0.6 },
    },
  },
  {
    id: "protagonista_guardiana_luz",
    nombre: "Ithra, Guardiana del Alba",
    arquetipo: "Defensivo",
    descripcion: "Antigua sacerdotisa de un templo caído; protege lo poco que le queda con todo lo que tiene.",
    imagen: "",
    activaUnica: {
      nombre: "Formación de hierro",
      descripcion: "Todo tu equipo gana +20% DEF durante 3 turnos.",
      efecto: { tipo: "buff_equipo", stat: "def", modificador: 0.2, duracionTurnos: 3 },
    },
  },
];

function getAllProtagonists() {
  return GameData.protagonistas;
}

function getProtagonistById(id) {
  return GameData.protagonistas.find((p) => p.id === id) || null;
}
