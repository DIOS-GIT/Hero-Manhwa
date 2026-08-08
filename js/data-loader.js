// ============================================================
// data-loader.js — va en /js/ del repo del juego (junto a main.js)
// ============================================================
// Reemplaza a game-data.js: en vez de datos hardcodeados, arma
// window.GAME_DATA leyendo Firestore, con la MISMA forma que ya
// espera js/character-creation.js (arrays en PROTAGONISTS, ROUTES,
// JOBS, HOUSING, HEROINES). Así no hay que tocar character-creation.js
// para nada — todo lo que cambies desde el admin se refleja solo.
//
// Cómo usarlo en index.html: agregar ANTES que character-creation.js
// y main.js:
//   <script type="module" src="js/data-loader.js"></script>
// y BORRAR (o dejar de cargar) el <script src="js/game-data.js">.
// Como data-loader.js es type="module" (async por naturaleza), main.js
// tiene que esperar a window.GAME_DATA_READY antes de arrancar
// initCharacterCreation() — ese es el único cambio en main.js.

import { firebaseConfig } from "./firebase-config.js"; // mismo config que usa el admin
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadArray(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((d) => {
    const data = { id: d.id, ...d.data() };
    // "tags" se guarda en Firestore como texto separado por coma
    // (así lo escribe el form del admin) — acá se convierte a array,
    // que es lo que character-creation.js espera con .includes(...).
    if (typeof data.tags === "string") {
      data.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return data;
  });
}

window.GAME_DATA_READY = (async () => {
  const [protagonists, routes, jobs, housing, heroines] = await Promise.all([
    loadArray("protagonists"),
    loadArray("routes"),
    loadArray("jobs"),
    loadArray("housing"),
    loadArray("heroines"),
  ]);
  window.GAME_DATA = {
    PROTAGONISTS: protagonists,
    ROUTES: routes,
    JOBS: jobs,
    HOUSING: housing,
    HEROINES: heroines,
  };
  return window.GAME_DATA;
})();

// Devuelve el ID de la Historia marcada como "introducción" en el admin
// (checkbox "Es la Historia de introducción"), o null si todavía no se
// marcó ninguna. El juego siempre arranca por ahí — así no depende de
// que alguien escriba bien un ID a mano en el código.
window.findIntroStoryId = async function findIntroStoryId() {
  const snap = await getDocs(query(collection(db, "stories"), where("isIntro", "==", true)));
  return snap.empty ? null : snap.docs[0].id;
};

// Carga los nodos de UNA historia puntual (por su ID de documento en
// "stories") y arma el mapa plano { [nodeId]: nodo } que espera
// StoryEngine, tal como describe INTEGRACION.md. Se llama desde main.js
// cuando arranca la historia (reemplaza a window.DEMO_STORY).
window.loadStory = async function loadStory(storyId) {
  const storiesSnap = await getDocs(collection(db, "stories"));
  const storyDoc = storiesSnap.docs.find((d) => d.id === storyId);
  const q = query(collection(db, "nodes"), where("storyId", "==", storyId));
  const snap = await getDocs(q);
  const nodes = {};
  snap.forEach((d) => (nodes[d.id] = d.data()));
  window.DEMO_STORY = {
    startNode: storyDoc ? storyDoc.data().startNode : null,
    nodes,
  };
  return window.DEMO_STORY;
};
