// ============================================================
// data-loader.js — pegar en /js/ del repo del juego (no del admin)
// ============================================================
// Reemplaza a game-data.js y demo-story.js: en vez de datos
// hardcodeados, arma window.GAME_DATA y window.DEMO_STORY leyendo
// Firestore, para que TODO lo que cambies desde el admin se refleje
// en el juego sin tocar código.
//
// Cómo usarlo en index.html: cargar este script (type="module") ANTES
// que main.js, y borrar (o dejar de cargar) game-data.js/demo-story.js.
// main.js sigue igual, solo espera a que window.GAME_DATA_READY resuelva.

import { firebaseConfig } from "./js/firebase-config.js"; // ajustar ruta relativa
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

async function loadCollection(name) {
  const snap = await getDocs(collection(db, name));
  const out = {};
  snap.forEach((d) => (out[d.id] = { id: d.id, ...d.data() }));
  return out;
}

window.GAME_DATA_READY = (async () => {
  const [protagonists, routes, jobs, housing, heroines] = await Promise.all([
    loadCollection("protagonists"),
    loadCollection("routes"),
    loadCollection("jobs"),
    loadCollection("housing"),
    loadCollection("heroines"),
  ]);
  window.GAME_DATA = { protagonists, routes, jobs, housing, heroines };
  return window.GAME_DATA;
})();

// Carga los nodos de UNA historia puntual (por su ID de documento en
// "stories") y arma el mapa plano { [nodeId]: nodo } que espera
// StoryEngine, tal como describe INTEGRACION.md.
window.loadStory = async function loadStory(storyId) {
  const storyDoc = (await getDocs(collection(db, "stories"))).docs.find(
    (d) => d.id === storyId
  );
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
