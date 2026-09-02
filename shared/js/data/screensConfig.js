/**
 * SCREENSCONFIG.JS
 * -----------------------------------------------------------------------
 * Lista de pantallas que se pueden personalizar con un fondo y un
 * personaje ilustrado desde el admin (pestaña "Pantallas"). La copia
 * editable vive en GameData.pantallas — este archivo solo aporta la
 * lista de pantallas disponibles y el punto de partida (todas vacías,
 * o sea: se usa el fondo degradado por defecto y sin personaje, como
 * hasta ahora).
 * -----------------------------------------------------------------------
 */

const SCREENS_LIST = [
  { id: "titulo", label: "Pantalla de título" },
  { id: "hub", label: "Hub / menú principal" },
  { id: "coleccion", label: "Colección" },
  { id: "protagonistas", label: "Protagonistas" },
  { id: "tienda", label: "Tienda (gacha)" },
  { id: "historial", label: "Historial" },
  { id: "equipos", label: "Armar equipos" },
  { id: "aventura", label: "Aventura (mapa de la run)" },
  { id: "combate", label: "Combate" },
];

function crearPantallaVacia() {
  return { fondo: "", personaje: "", posicionPersonaje: "derecha" };
}

const SCREENS_CONFIG_DEFAULT = {};
SCREENS_LIST.forEach((s) => {
  SCREENS_CONFIG_DEFAULT[s.id] = crearPantallaVacia();
});
