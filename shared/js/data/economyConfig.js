/**
 * ECONOMYCONFIG.JS
 * -----------------------------------------------------------------------
 * TODOS los números relacionados con la economía del jugador (moneda,
 * gacha, revivir, descanso) viven aquí. Si mañana quieres cambiar el
 * costo de una tirada o cuánto cura el descanso, este es el ÚNICO
 * archivo que hay que tocar — nada más depende de números "sueltos"
 * repartidos por el código.
 *
 * ⚠️ Los valores marcados "PENDIENTE" son provisionales: se dejaron
 * así a propósito porque en el diseño dijiste "eso lo decidimos
 * después". Ajústalos aquí cuando tengas el número definitivo.
 * -----------------------------------------------------------------------
 */

const ECONOMY_CONFIG = {
  monedaInicial: 300, // con cuánta moneda arranca un jugador nuevo

  gacha: {
    costoPorTirada: 100,
    // La primerísima tirada de CADA jugador siempre da una legendaria (si
    // ya hay al menos una cargada en el admin), para motivarlo a seguir
    // jugando. Se puede apagar acá sin tocar el motor.
    garantizarLegendariaPrimeraTirada: true,
    probabilidadPorRareza: {
      comun: 0.55,
      rara: 0.27,
      epica: 0.12,
      legendaria: 0.05,
      mitica: 0.01,
    },
    // moneda que se obtiene si la tirada "sale repetida" (carta que ya tienes)
    // PENDIENTE: son valores provisionales, ajústalos cuando pruebes el ritmo
    // de progresión real.
    monedaPorDuplicado: {
      comun: 20,
      rara: 45,
      epica: 90,
      legendaria: 180,
      mitica: 400,
    },
    // Fragmentos de ESA carta que da un duplicado (además de la moneda de
    // arriba) — se acumulan para evolucionarla. Rarezas altas dan menos
    // porque sus evoluciones piden menos fragmentos.
    fragmentosPorDuplicado: {
      comun: 5,
      rara: 4,
      epica: 3,
      legendaria: 2,
      mitica: 1,
    },
  },

  revivir: {
    // PENDIENTE (dijiste "eso lo decidimos después"): costo provisional
    // de revivir una carta caída, por rareza. Se puede pagar desde la
    // pantalla de inicio (Curar) o desde un nodo de Tienda dentro del mapa.
    costoPorRareza: {
      comun: 60,
      rara: 140,
      epica: 280,
      legendaria: 550,
      mitica: 1200,
    },
  },

  descanso: {
    porcentajeCuracion: 0.4, // 40% del HP máx, fijo, decidido en el diseño
  },
};
