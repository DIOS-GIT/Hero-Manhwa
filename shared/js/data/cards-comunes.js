const CARDS_COMUNES = [
  {
    id: "card_tanque_01",
    nombre: "Guardián de Piedra",
    rareza: "comun",
    clase: "tanque",
    elemento: "tierra",
    imagen: "",
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
    imagen: "",
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
    imagen: "",
    stats: { hp: 95, atk: 8, def: 10, velocidad: 12 },
    pasivas: [
      {
        nombre: "Retaguardia",
        posicionRequerida: "retaguardia",
        efecto: { stat: "atk", modificador: 0.1 },
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
