/**
 * CARDS-COMUNES.JS
 * -----------------------------------------------------------------------
 * Cartas de rareza COMÚN. Este archivo trae 3 cartas de EJEMPLO ya
 * cargadas (un tanque, un asesino y un soporte) para que puedas probar
 * el motor de combate desde el primer momento sin tener que crear
 * cartas a mano.
 *
 * Puedes borrarlas, editarlas o agregar las tuyas — todo desde el
 * admin. Si prefieres editar este archivo directamente, cada carta
 * sigue exactamente la forma descrita en js/data/cardSchema.js.
 * -----------------------------------------------------------------------
 */

const CARDS_COMUNES = [
  {
    id: "card_tanque_01",
    nombre: "Guardián de Piedra",
    rareza: "comun",
    clase: "tanque",
    elemento: "tierra",
    imagen: "guardian_piedra.png",
    stats: { hp: 180, atk: 12, def: 22, velocidad: 6 },
    pasivas: [
      {
        nombre: "Bastión",
        posicionRequerida: "primera_linea",
        efecto: { stat: "def", modificador: 0.15 },
      },
    ],
    habilidades: [
      {
        nombre: "Provocar",
        costoEnergia: 2,
        tipoObjetivo: "uno_mismo",
        efecto: { tipo: "taunt" },
        estadoQueAplica: null,
        cooldownTurnos: 2,
      },
    ],
  },
  {
    id: "card_asesino_01",
    nombre: "Sombra Veloz",
    rareza: "comun",
    clase: "asesino",
    elemento: "oscuridad",
    imagen: "sombra_veloz.png",
    stats: { hp: 85, atk: 26, def: 8, velocidad: 18 },
    pasivas: [
      {
        nombre: "Emboscador",
        posicionRequerida: "retaguardia",
        efecto: { stat: "atk", modificador: 0.1 },
      },
    ],
    habilidades: [
      {
        nombre: "Golpe certero",
        costoEnergia: 3,
        tipoObjetivo: "un_enemigo",
        efecto: { tipo: "dano", multiplicador: 1.5 },
        estadoQueAplica: null,
        cooldownTurnos: 0,
      },
    ],
  },
  {
    id: "card_soporte_01",
    nombre: "Curandera del Alba",
    rareza: "comun",
    clase: "soporte",
    elemento: "luz",
    imagen: "curandera_alba.png",
    stats: { hp: 95, atk: 8, def: 10, velocidad: 12 },
    pasivas: [
      {
        nombre: "Retaguardia",
        posicionRequerida: "retaguardia",
        efecto: { stat: "curacion", modificador: 0.1 },
      },
    ],
    habilidades: [
      {
        nombre: "Luz sanadora",
        costoEnergia: 3,
        tipoObjetivo: "aliado",
        efecto: { tipo: "curacion", multiplicador: 1.2 },
        estadoQueAplica: null,
        cooldownTurnos: 0,
      },
    ],
  },
];
