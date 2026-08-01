import { firebaseConfig, cloudinaryConfig } from "./firebase-config.js";
import { COLLECTIONS } from "./collections-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- LOGIN ----------
const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const whoami = document.getElementById("whoami");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    loginError.textContent = "No se pudo iniciar sesión: " + err.message;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginScreen.classList.remove("hidden");
    adminScreen.classList.add("hidden");
    return;
  }
  try {
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    if (!adminDoc.exists()) {
      loginError.textContent =
        "Esta cuenta no tiene permiso de admin (falta el doc en /admins/" +
        user.uid +
        "). Creálo desde la consola de Firestore.";
      await signOut(auth);
      return;
    }
  } catch (err) {
    loginError.textContent =
      "No se pudo verificar el permiso de admin: " + err.message;
    await signOut(auth);
    return;
  }
  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  whoami.textContent = user.email;
  buildNav();
});

// ---------- NAV ----------
const navEl = document.getElementById("nav");
const sectionsEl = document.getElementById("sections");
let navBuilt = false;

function buildNav() {
  if (navBuilt) return;
  navBuilt = true;

  COLLECTIONS.forEach((cfg) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.textContent = `${cfg.icon} ${cfg.label}`;
    btn.dataset.target = cfg.key;
    navEl.appendChild(btn);
    sectionsEl.appendChild(buildCollectionSection(cfg));
  });

  const nodeBtn = document.createElement("button");
  nodeBtn.className = "nav-btn";
  nodeBtn.textContent = "🔀 Nodos / Decisiones";
  nodeBtn.dataset.target = "nodes";
  navEl.appendChild(nodeBtn);
  sectionsEl.appendChild(buildNodesSection());

  const adminsBtn = document.createElement("button");
  adminsBtn.className = "nav-btn";
  adminsBtn.textContent = "🔑 Administradores";
  adminsBtn.dataset.target = "admins-mgmt";
  navEl.appendChild(adminsBtn);
  sectionsEl.appendChild(buildAdminsSection());

  const activityBtn = document.createElement("button");
  activityBtn.className = "nav-btn";
  activityBtn.textContent = "📋 Actividad";
  activityBtn.dataset.target = "activity";
  navEl.appendChild(activityBtn);
  sectionsEl.appendChild(buildActivitySection());

  navEl.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.target));
  });
  showSection(COLLECTIONS[0].key);
}

function showSection(key) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.toggle("hidden", s.dataset.key !== key));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.target === key));
}

// ---------- CLOUDINARY ----------
function openCloudinaryWidget(onSuccess) {
  if (!window.cloudinary) {
    alert("El widget de Cloudinary todavía no cargó, esperá un segundo y probá de nuevo.");
    return;
  }
  if (cloudinaryConfig.uploadPreset === "COMPLETAR") {
    alert("Falta configurar el 'upload preset' unsigned de Cloudinary en firebase-config.js");
    return;
  }
  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      folder: cloudinaryConfig.folder,
      multiple: false,
      sources: ["local", "url", "camera"],
      styles: { palette: { window: "#1a1a2e", windowBorder: "#8b5cf6" } },
    },
    (error, result) => {
      if (!error && result.event === "success") {
        onSuccess(result.info.secure_url);
      }
    }
  );
  widget.open();
}

// ---------- CAMPO: lista de imágenes con etiqueta (image-list) ----------
// Sirve para personajes/heroínas con varias expresiones (sonriendo,
// enojada, etc). Cada item queda como { label, url } en Firestore.
function buildImageListField(container, initial) {
  let items = initial ? JSON.parse(JSON.stringify(initial)) : [];
  const rowsEl = document.createElement("div");
  rowsEl.className = "dynamic-rows";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row-btn";
  addBtn.textContent = "+ Agregar imagen";
  addBtn.addEventListener("click", () => {
    openCloudinaryWidget((url) => {
      items.push({ label: "", url });
      renderRows();
    });
  });

  function renderRows() {
    rowsEl.innerHTML = "";
    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "imagelist-row";
      const img = document.createElement("img");
      img.src = item.url;
      img.className = "img-preview";
      const label = document.createElement("input");
      label.type = "text";
      label.placeholder = "Etiqueta (ej: sonriendo, enojada, triste)";
      label.value = item.label || "";
      label.addEventListener("input", () => (items[idx].label = label.value));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        items.splice(idx, 1);
        renderRows();
      });
      row.append(img, label, del);
      rowsEl.appendChild(row);
    });
  }
  renderRows();
  container.append(rowsEl, addBtn);
  return {
    getValue: () => items,
    setValue: (v) => {
      items = v ? JSON.parse(JSON.stringify(v)) : [];
      renderRows();
    },
  };
}

// ---------- CAMPO: lista de stats (stat-list) ----------
// Reemplaza el textarea de JSON por filas "nombre + valor". Se guarda
// en Firestore como objeto { carisma: 8, ... }, igual que antes.
function buildStatListField(container, initial) {
  let items = initial
    ? Object.entries(initial).map(([key, value]) => ({ key, value }))
    : [];
  const rowsEl = document.createElement("div");
  rowsEl.className = "dynamic-rows";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row-btn";
  addBtn.textContent = "+ Agregar stat";
  addBtn.addEventListener("click", () => {
    items.push({ key: "", value: 0 });
    renderRows();
  });

  function renderRows() {
    rowsEl.innerHTML = "";
    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "statlist-row";
      const keyInput = document.createElement("input");
      keyInput.type = "text";
      keyInput.placeholder = "nombre (ej: carisma)";
      keyInput.value = item.key;
      keyInput.addEventListener("input", () => (items[idx].key = keyInput.value));
      const valInput = document.createElement("input");
      valInput.type = "number";
      valInput.placeholder = "valor";
      valInput.value = item.value;
      valInput.addEventListener(
        "input",
        () => (items[idx].value = Number(valInput.value))
      );
      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        items.splice(idx, 1);
        renderRows();
      });
      row.append(keyInput, valInput, del);
      rowsEl.appendChild(row);
    });
  }
  renderRows();
  container.append(rowsEl, addBtn);
  return {
    getValue: () => {
      const obj = {};
      items.forEach((it) => {
        if (it.key.trim()) obj[it.key.trim()] = it.value;
      });
      return obj;
    },
    setValue: (v) => {
      items = v
        ? Object.entries(v).map(([key, value]) => ({ key, value }))
        : [];
      renderRows();
    },
  };
}

// ---------- CAMPO: stats fijas (mismo set para todos, sin agregar/quitar) ----------
// Se usa para que todos los protagonistas/heroínas compartan exactamente
// los mismos nombres de stat (evita typos que rompan checks/effects de
// los nodos). f.keys define el set fijo, ej: ["carisma","inteligencia","fisico","riqueza"].
function buildFixedStatsField(container, keys, initial) {
  let values = {};
  keys.forEach((k) => (values[k] = initial && initial[k] != null ? initial[k] : 0));
  const rowsEl = document.createElement("div");
  rowsEl.className = "dynamic-rows";

  function render() {
    rowsEl.innerHTML = "";
    keys.forEach((k) => {
      const row = document.createElement("div");
      row.className = "statlist-row";
      const label = document.createElement("span");
      label.textContent = k;
      label.style.flex = "1";
      label.style.color = "var(--muted)";
      const input = document.createElement("input");
      input.type = "number";
      input.value = values[k];
      input.addEventListener("input", () => (values[k] = Number(input.value)));
      row.append(label, input);
      rowsEl.appendChild(row);
    });
  }
  render();
  container.appendChild(rowsEl);
  return {
    getValue: () => ({ ...values }),
    setValue: (v) => {
      keys.forEach((k) => (values[k] = v && v[k] != null ? v[k] : 0));
      render();
    },
  };
}

// ---------- ACTIVIDAD (quién hizo qué) ----------
async function logActivity(action, collectionName, docId, label) {
  try {
    await addDoc(collection(db, "activity_log"), {
      action,
      collectionName,
      docId,
      label: label || "",
      adminEmail: auth.currentUser?.email || "desconocido",
      adminUid: auth.currentUser?.uid || "",
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn("No se pudo registrar actividad:", err);
  }
}

// ---------- CANDADOS SUAVES (avisar si alguien más ya está editando esto) ----------
// No bloquea de verdad (Firestore no da locking real desde el cliente),
// pero avisa quién lo está tocando para que dos personas no se pisen sin
// darse cuenta. Se vence solo a los 10 min por si alguien cierra la
// pestaña sin cancelar.
const LOCK_TTL_MS = 10 * 60 * 1000;

async function acquireLock(collectionName, docId) {
  try {
    await setDoc(doc(db, "locks", `${collectionName}_${docId}`), {
      collectionName,
      docId,
      adminEmail: auth.currentUser?.email || "",
      adminUid: auth.currentUser?.uid || "",
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn("No se pudo tomar el candado:", err);
  }
}

async function releaseLock(collectionName, docId) {
  try {
    await deleteDoc(doc(db, "locks", `${collectionName}_${docId}`));
  } catch {
    // si ya no existe o falla, no pasa nada
  }
}

function isLockFresh(lockData) {
  if (!lockData || !lockData.at || !lockData.at.toMillis) return false;
  return Date.now() - lockData.at.toMillis() < LOCK_TTL_MS;
}

function subscribeLocks(collectionName, onChange) {
  onSnapshot(
    query(collection(db, "locks"), where("collectionName", "==", collectionName)),
    (snap) => {
      const map = {};
      snap.forEach((d) => (map[d.data().docId] = d.data()));
      onChange(map);
    }
  );
}

// ---------- CRUD GENÉRICO ----------
function buildCollectionSection(cfg) {
  const section = document.createElement("div");
  section.className = "section hidden";
  section.dataset.key = cfg.key;

  section.innerHTML = `
    <h2>${cfg.icon} ${cfg.label}</h2>
    ${cfg.hint ? `<p class="hint">${cfg.hint}</p>` : ""}
    <form class="entity-form" id="form-${cfg.key}"></form>
    <table class="entity-table">
      <thead><tr id="thead-${cfg.key}"></tr></thead>
      <tbody id="tbody-${cfg.key}"></tbody>
    </table>
  `;

  const form = section.querySelector(`#form-${cfg.key}`);
  const thead = section.querySelector(`#thead-${cfg.key}`);
  const complexFields = {}; // f.key -> { getValue, setValue } para image-list/stat-list
  let editingId = null;
  let locksMap = {};
  subscribeLocks(cfg.key, (map) => (locksMap = map));
  const labelField = cfg.fields.find((f) => f.key === "name" || f.key === "title");

  cfg.fields.forEach((f) => {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.textContent = f.label;
    wrap.appendChild(label);

    if (f.type === "textarea" || f.type === "json") {
      const ta = document.createElement("textarea");
      ta.name = f.key;
      ta.placeholder = f.placeholder || "";
      wrap.appendChild(ta);
    } else if (f.type === "image") {
      const row = document.createElement("div");
      row.className = "image-row";
      const preview = document.createElement("img");
      preview.className = "img-preview";
      preview.hidden = true;
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = f.key;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Subir imagen";
      btn.addEventListener("click", () =>
        openCloudinaryWidget((url) => {
          hidden.value = url;
          preview.src = url;
          preview.hidden = false;
        })
      );
      row.append(btn, preview, hidden);
      wrap.appendChild(row);
    } else if (f.type === "image-list") {
      const container = document.createElement("div");
      complexFields[f.key] = buildImageListField(container, []);
      wrap.appendChild(container);
    } else if (f.type === "stat-list") {
      const container = document.createElement("div");
      complexFields[f.key] = buildStatListField(container, {});
      wrap.appendChild(container);
    } else if (f.type === "fixed-stats") {
      const container = document.createElement("div");
      complexFields[f.key] = buildFixedStatsField(container, f.keys, {});
      wrap.appendChild(container);
    } else {
      const input = document.createElement("input");
      input.type = f.type === "number" ? "number" : "text";
      input.name = f.key;
      if (f.placeholder) input.placeholder = f.placeholder;
      wrap.appendChild(input);
    }
    form.appendChild(wrap);
  });

  const actions = document.createElement("div");
  actions.className = "form-actions";
  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "Guardar";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancelar edición";
  cancelBtn.hidden = true;
  actions.append(saveBtn, cancelBtn);
  form.appendChild(actions);

  function resetComplexFields() {
    cfg.fields.forEach((f) => {
      if (f.type === "image-list") complexFields[f.key].setValue([]);
      if (f.type === "stat-list") complexFields[f.key].setValue({});
      if (f.type === "fixed-stats") complexFields[f.key].setValue({});
    });
  }

  cancelBtn.addEventListener("click", () => {
    if (editingId) releaseLock(cfg.key, editingId);
    editingId = null;
    form.reset();
    resetComplexFields();
    form.querySelectorAll(".img-preview").forEach((p) => (p.hidden = true));
    cancelBtn.hidden = true;
  });

  cfg.fields.forEach((f) => {
    const th = document.createElement("th");
    th.textContent = f.label;
    thead.appendChild(th);
  });
  thead.appendChild(document.createElement("th"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    for (const f of cfg.fields) {
      if (f.type === "image-list" || f.type === "stat-list" || f.type === "fixed-stats") {
        data[f.key] = complexFields[f.key].getValue();
        continue;
      }
      const el = form.elements[f.key];
      let val = el.value;
      if (f.type === "number") val = val === "" ? null : Number(val);
      if (f.type === "json") {
        if (val.trim() === "") {
          val = null;
        } else {
          try {
            val = JSON.parse(val);
          } catch (err) {
            alert(`El campo "${f.label}" no es JSON válido: ${err.message}`);
            return;
          }
        }
      }
      if (f.required && (val === "" || val === null)) {
        alert(`"${f.label}" es obligatorio`);
        return;
      }
      data[f.key] = val;
    }
    try {
      const wasEditing = editingId;
      if (editingId) {
        await updateDoc(doc(db, cfg.key, editingId), data);
        await releaseLock(cfg.key, editingId);
      } else {
        await addDoc(collection(db, cfg.key), data);
      }
      logActivity(
        wasEditing ? "update" : "create",
        cfg.key,
        wasEditing || "",
        labelField ? data[labelField.key] : ""
      );
      form.reset();
      resetComplexFields();
      form.querySelectorAll(".img-preview").forEach((p) => (p.hidden = true));
      editingId = null;
      cancelBtn.hidden = true;
    } catch (err) {
      alert("Error guardando: " + err.message);
    }
  });

  const tbody = section.querySelector(`#tbody-${cfg.key}`);
  onSnapshot(collection(db, cfg.key), (snap) => {
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const tr = document.createElement("tr");
      cfg.fields.forEach((f) => {
        const td = document.createElement("td");
        if (f.type === "image" && item[f.key]) {
          const img = document.createElement("img");
          img.src = item[f.key];
          img.className = "cell-thumb";
          td.appendChild(img);
        } else if (f.type === "image-list" && item[f.key]) {
          (item[f.key] || []).slice(0, 3).forEach((im) => {
            const img = document.createElement("img");
            img.src = im.url;
            img.title = im.label || "";
            img.className = "cell-thumb";
            td.appendChild(img);
          });
        } else if ((f.type === "stat-list" || f.type === "fixed-stats") && item[f.key]) {
          td.textContent = Object.entries(item[f.key])
            .map(([k, v]) => `${k}:${v}`)
            .join(", ");
        } else if (f.type === "json" && item[f.key]) {
          td.textContent = JSON.stringify(item[f.key]);
        } else {
          td.textContent = item[f.key] ?? "";
        }
        tr.appendChild(td);
      });
      const actionsTd = document.createElement("td");
      const lock = locksMap[docSnap.id];
      if (lock && isLockFresh(lock) && lock.adminUid !== auth.currentUser?.uid) {
        const badge = document.createElement("span");
        badge.className = "lock-badge";
        badge.textContent = `🔒 ${lock.adminEmail}`;
        actionsTd.appendChild(badge);
      }
      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        if (lock && isLockFresh(lock) && lock.adminUid !== auth.currentUser?.uid) {
          if (
            !confirm(
              `${lock.adminEmail} está editando esto ahora mismo (o lo estaba hace menos de 10 min). ¿Seguís igual? Si los dos guardan, gana el último.`
            )
          )
            return;
        }
        acquireLock(cfg.key, docSnap.id);
        editingId = docSnap.id;
        cfg.fields.forEach((f) => {
          const val = item[f.key];
          if (f.type === "image-list") {
            complexFields[f.key].setValue(val || []);
          } else if (f.type === "stat-list" || f.type === "fixed-stats") {
            complexFields[f.key].setValue(val || {});
          } else if (f.type === "json") {
            form.elements[f.key].value = val ? JSON.stringify(val, null, 2) : "";
          } else if (f.type === "image") {
            const el = form.elements[f.key];
            el.value = val || "";
            const preview = el.parentElement.querySelector(".img-preview");
            if (val) {
              preview.src = val;
              preview.hidden = false;
            }
          } else {
            form.elements[f.key].value = val ?? "";
          }
        });
        cancelBtn.hidden = false;
        form.scrollIntoView({ behavior: "smooth" });
      });
      const delBtn = document.createElement("button");
      delBtn.textContent = "Borrar";
      delBtn.className = "danger";
      delBtn.addEventListener("click", async () => {
        if (confirm("¿Borrar este elemento? No se puede deshacer.")) {
          await deleteDoc(doc(db, cfg.key, docSnap.id));
          logActivity("delete", cfg.key, docSnap.id, labelField ? item[labelField.key] : "");
        }
      });
      actionsTd.append(editBtn, delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  });

  return section;
}

// ---------- EDITOR DE NODOS (decisiones de la historia) ----------
function buildNodesSection() {
  const section = document.createElement("div");
  section.className = "section hidden";
  section.dataset.key = "nodes";

  section.innerHTML = `
    <h2>🔀 Nodos / Decisiones</h2>
    <p class="hint">
      El ID del nodo se asigna solo (n001, n002...). Los tipos
      <b>condition</b> y <b>random</b> son avanzados y se editan como JSON
      para no perder flexibilidad.
    </p>
    <form class="entity-form" id="form-nodes">
      <div class="field">
        <label>ID del nodo (automático)</label>
        <input type="text" id="node-id-display" readonly />
      </div>
      <div class="field">
        <label>Historia (título de la colección "stories")</label>
        <input type="text" name="storyId" placeholder="Ej: capitulo-1" />
      </div>
      <div class="field">
        <label>Tipo</label>
        <select name="type">
          <option value="dialogue">dialogue — diálogo simple</option>
          <option value="choice">choice — el jugador elige</option>
          <option value="event">event — narrativa automática</option>
          <option value="condition">condition — bifurca según stats (JSON)</option>
          <option value="random">random — ruleta de probabilidad (JSON)</option>
          <option value="ending">ending — final</option>
        </select>
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>Personaje que habla</label>
        <div class="char-picker" id="char-picker"></div>
      </div>
      <div class="field">
        <label>Fondo</label>
        <select name="backgroundUrl" id="bg-select"></select>
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>Texto</label>
        <textarea name="text" placeholder="Ej: —Nunca pensé que volvería a verte —dijo, sin apartar la mirada."></textarea>
      </div>
      <div class="field" id="next-field">
        <label>Siguiente nodo (para dialogue/event)</label>
        <select name="next" id="next-select"></select>
      </div>
      <div class="field" id="options-field" hidden style="grid-column: 1 / -1;">
        <label>Opciones (choice)</label>
        <div class="dynamic-rows" id="options-rows"></div>
        <button type="button" class="add-row-btn" id="add-option-btn">+ Agregar opción</button>
      </div>
      <div class="field" id="advanced-field" hidden style="grid-column: 1 / -1;">
        <label>JSON avanzado (checks para condition / outcomes para random)</label>
        <textarea name="advancedJson" placeholder='[{"stat":"carisma","op":">=","value":5,"next":"n020"}]'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit">Guardar nodo</button>
        <button type="button" id="cancel-node" hidden>Cancelar edición</button>
      </div>
    </form>
    <table class="entity-table">
      <thead><tr><th>ID</th><th>Historia</th><th>Tipo</th><th>Personaje</th><th>Texto</th><th>Acciones</th></tr></thead>
      <tbody id="tbody-nodes"></tbody>
    </table>
  `;

  const form = section.querySelector("#form-nodes");
  const typeSelect = form.elements.type;
  const nextField = section.querySelector("#next-field");
  const nextSelect = section.querySelector("#next-select");
  const optionsField = section.querySelector("#options-field");
  const optionsRows = section.querySelector("#options-rows");
  const addOptionBtn = section.querySelector("#add-option-btn");
  const advancedField = section.querySelector("#advanced-field");
  const bgSelect = section.querySelector("#bg-select");
  const nodeIdDisplay = section.querySelector("#node-id-display");
  const charPicker = section.querySelector("#char-picker");
  const cancelBtn = section.querySelector("#cancel-node");

  let editingId = null;
  let currentNodeId = "";
  let selectedCharacter = "";
  let allNodes = []; // [{id, type, text, character}]
  let optionItems = []; // [{text, next, effectsRaw}]
  let charactersList = []; // [{name, thumbUrl}]
  let locksMap = {};
  subscribeLocks("nodes", (map) => (locksMap = map));

  function computeNextId() {
    let max = 0;
    allNodes.forEach((n) => {
      const m = /^n(\d+)$/.exec(n.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "n" + String(max + 1).padStart(3, "0");
  }

  function refreshNodeIdSuggestion() {
    if (!editingId) {
      currentNodeId = computeNextId();
      nodeIdDisplay.value = currentNodeId;
    }
  }

  function refreshNextSelect() {
    const current = nextSelect.value;
    nextSelect.innerHTML = '<option value="">(elegir nodo)</option>';
    allNodes.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = `${n.id} — ${n.type} — ${(n.text || "").slice(0, 40)}`;
      nextSelect.appendChild(opt);
    });
    nextSelect.value = current;
  }

  function renderOptionRows() {
    optionsRows.innerHTML = "";
    optionItems.forEach((opt, idx) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.placeholder = "Ej: Aceptar la misión";
      textInput.value = opt.text || "";
      textInput.addEventListener("input", () => (optionItems[idx].text = textInput.value));

      const nextSel = document.createElement("select");
      nextSel.innerHTML = '<option value="">(siguiente nodo)</option>';
      allNodes.forEach((n) => {
        const o = document.createElement("option");
        o.value = n.id;
        o.textContent = `${n.id} — ${(n.text || "").slice(0, 30)}`;
        nextSel.appendChild(o);
      });
      nextSel.value = opt.next || "";
      nextSel.addEventListener("change", () => (optionItems[idx].next = nextSel.value));

      const effectsInput = document.createElement("input");
      effectsInput.type = "text";
      effectsInput.placeholder = 'efectos JSON opcional, ej: {"carisma":1}';
      effectsInput.value = opt.effectsRaw || "";
      effectsInput.addEventListener("input", () => (optionItems[idx].effectsRaw = effectsInput.value));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        optionItems.splice(idx, 1);
        renderOptionRows();
      });

      row.append(textInput, nextSel, effectsInput, del);
      optionsRows.appendChild(row);
    });
  }

  addOptionBtn.addEventListener("click", () => {
    optionItems.push({ text: "", next: "", effectsRaw: "" });
    renderOptionRows();
  });

  // fondos
  onSnapshot(collection(db, "backgrounds"), (snap) => {
    const current = bgSelect.value;
    bgSelect.innerHTML = '<option value="">(sin fondo)</option>';
    snap.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.data().imageUrl;
      opt.textContent = d.data().name;
      bgSelect.appendChild(opt);
    });
    bgSelect.value = current;
  });

  // personajes (protagonistas + heroínas) para el selector con foto
  function renderCharPicker() {
    charPicker.innerHTML = "";
    const noneChip = document.createElement("button");
    noneChip.type = "button";
    noneChip.className = "char-chip" + (selectedCharacter === "" ? " selected" : "");
    noneChip.textContent = "— narrador / sin personaje —";
    noneChip.addEventListener("click", () => {
      selectedCharacter = "";
      renderCharPicker();
    });
    charPicker.appendChild(noneChip);

    charactersList.forEach((c) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "char-chip" + (selectedCharacter === c.name ? " selected" : "");
      if (c.thumbUrl) {
        const img = document.createElement("img");
        img.src = c.thumbUrl;
        chip.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = c.name;
      chip.appendChild(span);
      chip.addEventListener("click", () => {
        selectedCharacter = c.name;
        renderCharPicker();
      });
      charPicker.appendChild(chip);
    });
  }

  function subscribeCharacters(collectionName) {
    onSnapshot(collection(db, collectionName), (snap) => {
      charactersList = charactersList.filter((c) => c.source !== collectionName);
      snap.forEach((d) => {
        const data = d.data();
        const firstImg = (data.images || [])[0];
        charactersList.push({
          name: data.name,
          thumbUrl: firstImg ? firstImg.url : "",
          source: collectionName,
        });
      });
      renderCharPicker();
    });
  }
  subscribeCharacters("protagonists");
  subscribeCharacters("heroines");

  function updateVisibleFields() {
    const t = typeSelect.value;
    nextField.hidden = !(t === "dialogue" || t === "event");
    optionsField.hidden = t !== "choice";
    advancedField.hidden = !(t === "condition" || t === "random");
  }
  typeSelect.addEventListener("change", updateVisibleFields);
  updateVisibleFields();

  function resetForm() {
    if (editingId) releaseLock("nodes", editingId);
    editingId = null;
    form.reset();
    selectedCharacter = "";
    optionItems = [];
    renderOptionRows();
    renderCharPicker();
    updateVisibleFields();
    refreshNodeIdSuggestion();
    cancelBtn.hidden = true;
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let nodeId = currentNodeId;
    if (!nodeId) return alert("No se pudo generar el ID del nodo, probá de nuevo.");

    // si es un nodo NUEVO (no edición), confirmamos justo antes de guardar
    // que nadie más creó ya ese mismo ID en el último segundo (dos admins
    // trabajando a la vez podían calcular el mismo "próximo ID").
    if (!editingId) {
      let attempts = 0;
      while (attempts < 20) {
        const existing = await getDoc(doc(db, "nodes", nodeId));
        if (!existing.exists()) break;
        const m = /^n(\d+)$/.exec(nodeId);
        const n = m ? parseInt(m[1], 10) + 1 : 1;
        nodeId = "n" + String(n).padStart(3, "0");
        attempts++;
      }
      if (nodeId !== currentNodeId) {
        alert(
          `Alguien más acaba de crear el nodo ${currentNodeId} justo ahora — este se guarda como ${nodeId} en su lugar.`
        );
      }
    }
    const data = {
      storyId: form.elements.storyId.value.trim(),
      type: typeSelect.value,
      character: selectedCharacter,
      backgroundUrl: bgSelect.value,
      text: form.elements.text.value,
    };
    if (data.type === "dialogue" || data.type === "event") {
      data.next = nextSelect.value;
    }
    if (data.type === "choice") {
      data.options = optionItems
        .filter((o) => o.text.trim())
        .map((o) => {
          const option = { text: o.text, next: o.next };
          if (o.effectsRaw && o.effectsRaw.trim()) {
            try {
              option.effects = JSON.parse(o.effectsRaw);
            } catch {
              // efecto inválido: se ignora, no rompe el guardado
            }
          }
          return option;
        });
    }
    if (data.type === "condition" || data.type === "random") {
      const raw = form.elements.advancedJson.value.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (data.type === "condition") data.checks = parsed;
          else data.outcomes = parsed;
        } catch (err) {
          return alert("El JSON avanzado no es válido: " + err.message);
        }
      }
    }
    try {
      const wasEditing = editingId;
      await setDoc(doc(db, "nodes", nodeId), data);
      logActivity(wasEditing ? "update" : "create", "nodes", nodeId, data.text ? data.text.slice(0, 40) : data.type);
      resetForm();
    } catch (err) {
      alert("Error guardando el nodo: " + err.message);
    }
  });

  const tbody = section.querySelector("#tbody-nodes");
  onSnapshot(collection(db, "nodes"), (snap) => {
    allNodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    refreshNodeIdSuggestion();
    refreshNextSelect();
    if (!optionsField.hidden) renderOptionRows(); // refresca los <select> de next en las filas visibles

    tbody.innerHTML = "";
    allNodes.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.id}</td>
        <td>${item.storyId || ""}</td>
        <td>${item.type || ""}</td>
        <td>${item.character || ""}</td>
        <td>${(item.text || "").slice(0, 60)}</td>
      `;
      const actionsTd = document.createElement("td");
      const lock = locksMap[item.id];
      if (lock && isLockFresh(lock) && lock.adminUid !== auth.currentUser?.uid) {
        const badge = document.createElement("span");
        badge.className = "lock-badge";
        badge.textContent = `🔒 ${lock.adminEmail}`;
        actionsTd.appendChild(badge);
      }
      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        if (lock && isLockFresh(lock) && lock.adminUid !== auth.currentUser?.uid) {
          if (
            !confirm(
              `${lock.adminEmail} está editando este nodo ahora mismo (o hace menos de 10 min). ¿Seguís igual?`
            )
          )
            return;
        }
        acquireLock("nodes", item.id);
        editingId = item.id;
        currentNodeId = item.id;
        nodeIdDisplay.value = item.id;
        form.elements.storyId.value = item.storyId || "";
        typeSelect.value = item.type || "dialogue";
        selectedCharacter = item.character || "";
        renderCharPicker();
        bgSelect.value = item.backgroundUrl || "";
        form.elements.text.value = item.text || "";
        nextSelect.value = item.next || "";
        optionItems = (item.options || []).map((o) => ({
          text: o.text || "",
          next: o.next || "",
          effectsRaw: o.effects ? JSON.stringify(o.effects) : "",
        }));
        renderOptionRows();
        if (item.checks) form.elements.advancedJson.value = JSON.stringify(item.checks, null, 2);
        else if (item.outcomes) form.elements.advancedJson.value = JSON.stringify(item.outcomes, null, 2);
        else form.elements.advancedJson.value = "";
        updateVisibleFields();
        cancelBtn.hidden = false;
        form.scrollIntoView({ behavior: "smooth" });
      });
      const delBtn = document.createElement("button");
      delBtn.textContent = "Borrar";
      delBtn.className = "danger";
      delBtn.addEventListener("click", async () => {
        if (confirm(`¿Borrar el nodo ${item.id}?`)) {
          await deleteDoc(doc(db, "nodes", item.id));
          logActivity("delete", "nodes", item.id, (item.text || "").slice(0, 40));
        }
      });
      actionsTd.append(editBtn, delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  });

  renderCharPicker();
  refreshNodeIdSuggestion();

  return section;
}

// ---------- ADMINISTRADORES ----------
function buildAdminsSection() {
  const section = document.createElement("div");
  section.className = "section hidden";
  section.dataset.key = "admins-mgmt";

  section.innerHTML = `
    <h2>🔑 Administradores</h2>
    <p class="hint">
      Para dar acceso a alguien nuevo: primero creale la cuenta en
      Firebase Console → Authentication → Add user, copiá su UID de ahí,
      y pegalo acá.
    </p>
    <form class="entity-form" id="form-admins">
      <div class="field">
        <label>UID (copiado de Authentication)</label>
        <input type="text" name="uid" required />
      </div>
      <div class="field">
        <label>Email (solo para identificarlo en la lista)</label>
        <input type="text" name="email" />
      </div>
      <div class="form-actions">
        <button type="submit">Dar acceso de admin</button>
      </div>
    </form>
    <table class="entity-table">
      <thead><tr><th>UID</th><th>Email</th><th>Acciones</th></tr></thead>
      <tbody id="tbody-admins"></tbody>
    </table>
  `;

  const form = section.querySelector("#form-admins");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const uid = form.elements.uid.value.trim();
    const email = form.elements.email.value.trim();
    if (!uid) return;
    try {
      await setDoc(doc(db, "admins", uid), { email });
      logActivity("create", "admins", uid, email);
      form.reset();
    } catch (err) {
      alert("Error dando acceso: " + err.message);
    }
  });

  const tbody = section.querySelector("#tbody-admins");
  onSnapshot(collection(db, "admins"), (snap) => {
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${docSnap.id}</td><td>${item.email || ""}</td>`;
      const actionsTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "Quitar acceso";
      delBtn.className = "danger";
      delBtn.addEventListener("click", async () => {
        if (docSnap.id === auth.currentUser.uid) {
          alert("No podés quitarte el acceso a vos mismo desde acá.");
          return;
        }
        if (confirm(`¿Quitar acceso de admin a ${item.email || docSnap.id}?`)) {
          await deleteDoc(doc(db, "admins", docSnap.id));
          logActivity("delete", "admins", docSnap.id, item.email || "");
        }
      });
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  });

  return section;
}

// ---------- ACTIVIDAD (últimos 100 cambios, quién y qué) ----------
function buildActivitySection() {
  const section = document.createElement("div");
  section.className = "section hidden";
  section.dataset.key = "activity";

  section.innerHTML = `
    <h2>📋 Actividad reciente</h2>
    <p class="hint">Últimos 100 cambios hechos desde el panel, más nuevo primero.</p>
    <table class="entity-table">
      <thead><tr><th>Cuándo</th><th>Quién</th><th>Acción</th><th>Sección</th><th>Elemento</th></tr></thead>
      <tbody id="tbody-activity"></tbody>
    </table>
  `;

  const actionLabels = { create: "🟢 Creó", update: "✏️ Editó", delete: "🔴 Borró" };
  const sectionLabels = {
    protagonists: "Protagonistas",
    routes: "Rutas",
    jobs: "Trabajos",
    housing: "Vivienda",
    heroines: "Heroínas",
    backgrounds: "Fondos",
    stories: "Historias",
    nodes: "Nodo",
    admins: "Administradores",
  };

  const tbody = section.querySelector("#tbody-activity");
  onSnapshot(
    query(collection(db, "activity_log"), orderBy("at", "desc"), limit(100)),
    (snap) => {
      tbody.innerHTML = "";
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        const when = item.at && item.at.toDate ? item.at.toDate().toLocaleString("es-AR") : "…";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${when}</td>
          <td>${item.adminEmail || ""}</td>
          <td>${actionLabels[item.action] || item.action}</td>
          <td>${sectionLabels[item.collectionName] || item.collectionName}</td>
          <td>${item.label || item.docId || ""}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  );

  return section;
}
