/**
 * MAPGENERATOR.JS
 * -----------------------------------------------------------------------
 * Genera un mapa ramificado de "pisos" de nodos, con un piso final de un
 * solo nodo: el Jefe. Dos formas de decidir qué tipo de nodo va en cada
 * lugar:
 *   - Aleatorio (generateRunMapRandom): por pesos relativos, como
 *     siempre — GameData.rutas.pesosPorTipo.
 *   - Por plantilla (generateRunMapFromTemplate): el admin diseñó la
 *     secuencia EXACTA de cada piso arrastrando íconos (admin/js/
 *     routesEditor.js). Si GameData.rutas.usarPlantillas está activo y
 *     hay al menos una plantilla cargada, cada run elige una al azar.
 * En ambos casos, las conexiones entre pisos (qué nodo lleva a cuáles
 * del piso siguiente) se arman igual — ver connectFloors().
 *
 * mapaDeRun = {
 *   pisos: [
 *     [ { id, tipo, conectaCon: [idNodoSiguientePiso, ...] }, ... ],
 *     ...
 *   ],
 *   nodoActualId: string | null,   // null = todavía no empezó a moverse
 *   nodosVisitados: [id, ...],
 * }
 * -----------------------------------------------------------------------
 */

let _nextNodeId = 1;

function pickWeightedNodeType() {
  const pesos = GameData.rutas.pesosPorTipo;
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const tipo of Object.keys(pesos)) {
    roll -= pesos[tipo];
    if (roll <= 0) return tipo;
  }
  return "combate";
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRunMap() {
  if (GameData.rutas.usarPlantillas && GameData.rutas.plantillas.length > 0) {
    const plantilla = GameData.rutas.plantillas[Math.floor(Math.random() * GameData.rutas.plantillas.length)];
    return generateRunMapFromTemplate(plantilla);
  }
  return generateRunMapRandom();
}

function generateRunMapRandom() {
  const pisos = [];

  // Piso inicial: siempre un combate normal, para que la run abra suave.
  pisos.push([{ id: "nodo_" + _nextNodeId++, tipo: "combate", conectaCon: [] }]);

  for (let i = 1; i < GameData.rutas.pisosAntesDelJefe; i++) {
    const cantidad = randomBetween(GameData.rutas.nodosPorPiso.min, GameData.rutas.nodosPorPiso.max);
    const piso = [];
    for (let n = 0; n < cantidad; n++) {
      piso.push({ id: "nodo_" + _nextNodeId++, tipo: pickWeightedNodeType(), conectaCon: [] });
    }
    pisos.push(piso);
  }

  // Piso final: el jefe, un solo nodo.
  pisos.push([{ id: "nodo_" + _nextNodeId++, tipo: "jefe", conectaCon: [] }]);

  connectFloors(pisos);
  return { pisos, nodoActualId: null, nodosVisitados: [] };
}

/**
 * Arma el mapa EXACTO que diseñó el admin arrastrando íconos por piso
 * (ver admin/js/routesEditor.js). El jefe se agrega solo, siempre como
 * último piso — no forma parte de la plantilla. Las conexiones entre
 * pisos se arman igual que en el modo aleatorio (ramificado, cada nodo
 * conectado a 1-2 nodos del piso siguiente).
 */
function generateRunMapFromTemplate(plantilla) {
  const pisos = plantilla.pisos.map((tiposDelPiso) => tiposDelPiso.map((tipo) => ({ id: "nodo_" + _nextNodeId++, tipo, conectaCon: [] })));
  pisos.push([{ id: "nodo_" + _nextNodeId++, tipo: "jefe", conectaCon: [] }]);

  connectFloors(pisos);
  return { pisos, nodoActualId: null, nodosVisitados: [] };
}

/** Conecta cada nodo con 1-2 nodos del piso siguiente (ramificado), mutando pisos en el lugar. */
function connectFloors(pisos) {
  for (let i = 0; i < pisos.length - 1; i++) {
    const pisoActual = pisos[i];
    const pisoSiguiente = pisos[i + 1];
    pisoActual.forEach((nodo) => {
      const numConexiones = pisoSiguiente.length === 1 ? 1 : randomBetween(1, 2);
      const indicesDisponibles = pisoSiguiente.map((_, idx) => idx);
      for (let c = 0; c < numConexiones; c++) {
        const idx = indicesDisponibles.splice(Math.floor(Math.random() * indicesDisponibles.length), 1)[0];
        if (idx !== undefined) nodo.conectaCon.push(pisoSiguiente[idx].id);
      }
    });
    // asegurar que todo nodo del piso siguiente sea alcanzable por alguien
    pisoSiguiente.forEach((nodoSig) => {
      const tieneEntrada = pisoActual.some((n) => n.conectaCon.includes(nodoSig.id));
      if (!tieneEntrada) {
        const origen = pisoActual[Math.floor(Math.random() * pisoActual.length)];
        origen.conectaCon.push(nodoSig.id);
      }
    });
  }
}

function findNodeById(mapaDeRun, nodeId) {
  for (const piso of mapaDeRun.pisos) {
    const encontrado = piso.find((n) => n.id === nodeId);
    if (encontrado) return encontrado;
  }
  return null;
}

/** Nodos a los que el jugador puede moverse ahora mismo. */
function getAvailableNextNodes(mapaDeRun) {
  if (!mapaDeRun.nodoActualId) {
    return mapaDeRun.pisos[0]; // todavía no se movió: puede elegir cualquiera del piso 1
  }
  const actual = findNodeById(mapaDeRun, mapaDeRun.nodoActualId);
  return actual.conectaCon.map((id) => findNodeById(mapaDeRun, id));
}
