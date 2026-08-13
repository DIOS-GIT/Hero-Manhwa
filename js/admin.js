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
  getDocs,
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
      items = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : [];
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

// ---------- CAMPO: checklist de tags (tag-multiselect) ----------
// Junta los tags únicos que ya existen en Trabajos y Vivienda, y los
// muestra como checkboxes — así nunca se puede tipear un tag mal escrito
// que no matchee con nada.
function buildTagMultiselectField(container) {
  let checkedTags = [];
  let jobTags = new Set();
  let housingTags = new Set();
  const wrap = document.createElement("div");
  wrap.className = "tag-checklist";

  function render() {
    const available = Array.from(new Set([...jobTags, ...housingTags])).sort();
    wrap.innerHTML = "";
    if (available.length === 0) {
      wrap.innerHTML = '<p class="hint" style="margin:0;">Todavía no hay tags cargados en Trabajos ni Vivienda.</p>';
      return;
    }
    available.forEach((tag) => {
      const label = document.createElement("label");
      label.className = "tag-check-label";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checkedTags.includes(tag);
      cb.addEventListener("change", () => {
        checkedTags = cb.checked
          ? [...new Set([...checkedTags, tag])]
          : checkedTags.filter((t) => t !== tag);
      });
      label.append(cb, document.createTextNode(" " + tag));
      wrap.appendChild(label);
    });
  }

  onSnapshot(collection(db, "jobs"), (snap) => {
    jobTags = new Set();
    snap.forEach((d) => d.data().tag && jobTags.add(d.data().tag));
    render();
  });
  onSnapshot(collection(db, "housing"), (snap) => {
    housingTags = new Set();
    snap.forEach((d) => d.data().tag && housingTags.add(d.data().tag));
    render();
  });

  container.appendChild(wrap);
  return {
    getValue: () => [...checkedTags],
    setValue: (v) => {
      checkedTags = Array.isArray(v) ? [...v] : [];
      render();
    },
  };
}

// stats que existen en el juego — se usa en varios selectores (efectos,
// condiciones). "afinidad" es especial: el motor la aplica automáticamente
// a la(s) heroína(s) que el jugador tenga en esa partida puntual.
const STAT_OPTIONS = [
  { value: "carisma", label: "Carisma" },
  { value: "inteligencia", label: "Inteligencia" },
  { value: "fisico", label: "Físico" },
  { value: "riqueza", label: "Riqueza" },
  { value: "afinidad", label: "Afinidad (de la/s heroína/s de esta partida)" },
];

// ---------- CAMPO: efectos en stats, como chips (para opciones de choice y outcomes de random) ----------
function buildEffectsPicker(container, initial, onChange) {
  let effects = initial ? Object.entries(initial).map(([stat, value]) => ({ stat, value })) : [];
  const chipsEl = document.createElement("div");
  chipsEl.className = "effects-chips";
  const addRow = document.createElement("div");
  addRow.className = "effects-add-row";
  const statSel = document.createElement("select");
  statSel.innerHTML = STAT_OPTIONS.map((s) => `<option value="${s.value}">${s.label}</option>`).join("");
  const valInput = document.createElement("input");
  valInput.type = "number";
  valInput.placeholder = "+/-";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row-btn";
  addBtn.textContent = "+ Agregar efecto";
  function currentValue() {
    const obj = {};
    effects.forEach((e) => (obj[e.stat] = e.value));
    return obj;
  }
  addBtn.addEventListener("click", () => {
    const value = Number(valInput.value);
    if (!value) return;
    effects = effects.filter((e) => e.stat !== statSel.value);
    effects.push({ stat: statSel.value, value });
    valInput.value = "";
    renderChips();
    if (onChange) onChange(currentValue());
  });
  addRow.append(statSel, valInput, addBtn);

  function renderChips() {
    chipsEl.innerHTML = "";
    effects.forEach((e) => {
      const chip = document.createElement("span");
      chip.className = "effect-chip";
      const label = STAT_OPTIONS.find((s) => s.value === e.stat)?.label.split(" (")[0] || e.stat;
      chip.textContent = `${label} ${e.value > 0 ? "+" : ""}${e.value} `;
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "✕";
      x.addEventListener("click", () => {
        effects = effects.filter((ef) => ef !== e);
        renderChips();
        if (onChange) onChange(currentValue());
      });
      chip.appendChild(x);
      chipsEl.appendChild(chip);
    });
  }
  renderChips();
  container.append(chipsEl, addRow);
  return {
    getValue: currentValue,
    setValue: (v) => {
      effects = v ? Object.entries(v).map(([stat, value]) => ({ stat, value })) : [];
      renderChips();
    },
  };
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

    if (f.type === "boolean") {
      const checkLabel = document.createElement("label");
      checkLabel.className = "checkbox-label";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = f.key;
      checkLabel.append(input, document.createTextNode(" " + f.label));
      wrap.appendChild(checkLabel);
      form.appendChild(wrap);
      return;
    }

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
    } else if (f.type === "tag-multiselect") {
      const container = document.createElement("div");
      complexFields[f.key] = buildTagMultiselectField(container);
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
      if (f.type === "tag-multiselect") complexFields[f.key].setValue([]);
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
      if (f.type === "image-list" || f.type === "stat-list" || f.type === "fixed-stats" || f.type === "tag-multiselect") {
        data[f.key] = complexFields[f.key].getValue();
        continue;
      }
      if (f.type === "boolean") {
        data[f.key] = form.elements[f.key].checked;
        continue;
      }
      const el = form.elements[f.key];
      let val = el.value;
      if (f.type === "number") val = val === "" ? null : Number(val);
      if (f.normalize === "lowercase" && typeof val === "string") val = val.trim().toLowerCase();
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
      let savedId = editingId;
      if (editingId) {
        await updateDoc(doc(db, cfg.key, editingId), data);
        await releaseLock(cfg.key, editingId);
      } else {
        const ref = await addDoc(collection(db, cfg.key), data);
        savedId = ref.id;
      }
      // solo puede haber UNA historia de introducción a la vez — si esta
      // se marcó, le sacamos el tilde a cualquier otra que lo tuviera.
      if (cfg.key === "stories" && data.isIntro) {
        const others = await getDocs(query(collection(db, "stories"), where("isIntro", "==", true)));
        const unset = [];
        others.forEach((d) => {
          if (d.id !== savedId) unset.push(updateDoc(doc(db, "stories", d.id), { isIntro: false }));
        });
        await Promise.all(unset);
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
      try {
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
          (Array.isArray(item[f.key]) ? item[f.key] : []).slice(0, 3).forEach((im) => {
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
        } else if (f.type === "tag-multiselect" && item[f.key]) {
          // tolera datos viejos guardados como texto libre (antes de este
          // campo pasar a checklist), en vez de romper con .join() en un string
          td.textContent = Array.isArray(item[f.key]) ? item[f.key].join(", ") : String(item[f.key]);
        } else if (f.type === "boolean") {
          td.textContent = item[f.key] ? "✅ Sí" : "No";
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
          } else if (f.type === "tag-multiselect") {
            complexFields[f.key].setValue(val || []);
          } else if (f.type === "boolean") {
            form.elements[f.key].checked = !!val;
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
      } catch (err) {
        // un documento con datos en formato viejo/roto no debe tumbar la
        // lista para todo el equipo — se muestra como fila de aviso, con
        // opción de borrarlo, y el resto de la tabla sigue funcionando.
        console.error(`Error mostrando ${cfg.key}/${docSnap.id}:`, err);
        const warnTr = document.createElement("tr");
        const warnTd = document.createElement("td");
        warnTd.colSpan = cfg.fields.length + 1;
        warnTd.innerHTML =
          `⚠ No se pudo mostrar este elemento (ID: <code>${docSnap.id}</code>) — probablemente tiene ` +
          `datos en un formato viejo. `;
        const fixDelBtn = document.createElement("button");
        fixDelBtn.type = "button";
        fixDelBtn.className = "danger";
        fixDelBtn.textContent = "Borrar este elemento";
        fixDelBtn.addEventListener("click", async () => {
          if (confirm("¿Borrar este elemento con datos rotos? No se puede deshacer.")) {
            await deleteDoc(doc(db, cfg.key, docSnap.id));
          }
        });
        warnTd.appendChild(fixDelBtn);
        warnTr.appendChild(warnTd);
        tbody.appendChild(warnTr);
      }
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
      El ID del nodo se asigna solo (n001, n002...). Si el personaje elegido tiene
      varias imágenes cargadas, podés elegir cuál expresión mostrar en este nodo puntual.
      Usá <b>chapter_end</b> para encadenar una Historia con la siguiente sin volver a
      pasar por la reencarnación — <b>ending</b> es solo para un final real de partida.
      Los tipos <b>condition</b> y <b>random</b> son avanzados y se editan como JSON
      para no perder flexibilidad.
    </p>
    <div class="mode-toggle">
      <button type="button" class="mode-toggle-btn active" id="mode-btn-full">📝 Formulario completo</button>
      <button type="button" class="mode-toggle-btn" id="mode-btn-script">✍️ Modo guión (rápido)</button>
    </div>
    <p class="hint" id="script-mode-hint" hidden>
      Elegí el personaje una vez y quedate escribiendo línea tras línea — cada
      "Guardar y seguir" encadena sola con la anterior, sin que tengas que
      elegir "siguiente nodo" a mano. Para decisiones, condiciones o finales,
      volvé al formulario completo.
    </p>
    <div class="node-editor-layout">
    <form class="entity-form" id="form-nodes">
      <div class="field">
        <label>ID del nodo (automático)</label>
        <input type="text" id="node-id-display" readonly />
      </div>
      <div class="field">
        <label>Historia</label>
        <select name="storyId" id="story-select"></select>
      </div>
      <div class="field" id="type-field">
        <label>Tipo</label>
        <select name="type">
          <option value="dialogue">dialogue — diálogo simple</option>
          <option value="choice">choice — el jugador elige</option>
          <option value="event">event — narrativa automática</option>
          <option value="condition">condition — bifurca según stats (JSON)</option>
          <option value="random">random — ruleta de probabilidad (JSON)</option>
          <option value="chapter_end">chapter_end — termina esta Historia y sigue con la siguiente</option>
          <option value="ending">ending — final real de la partida</option>
        </select>
      </div>
      <div class="field" id="script-event-field" hidden>
        <label>&nbsp;</label>
        <label class="checkbox-label">
          <input type="checkbox" id="script-is-event" />
          Es narración/evento (no habla nadie)
        </label>
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>Personaje que habla</label>
        <div class="char-picker" id="char-picker"></div>
      </div>
      <div class="field" id="expression-field" hidden>
        <label>Expresión (qué imagen de ese personaje usar en este nodo)</label>
        <select name="characterExpression" id="expression-select"></select>
      </div>
      <div class="field" id="position-field" hidden>
        <label>Posición en pantalla</label>
        <select name="position" id="position-select">
          <option value="centro">Centro</option>
          <option value="izquierda">Izquierda</option>
          <option value="derecha">Derecha</option>
        </select>
      </div>
      <div class="field" id="effect-field" hidden>
        <label>Efecto visual (opcional)</label>
        <select name="effect" id="effect-select">
          <option value="">Ninguno</option>
          <option value="zoom">Zoom (acercamiento sutil)</option>
          <option value="shake">Temblor</option>
          <option value="pop">Aparición con rebote</option>
          <option value="tilt">Inclinación</option>
        </select>
      </div>
      <div class="field" id="second-char-field" hidden style="grid-column: 1 / -1;">
        <label>Otro personaje en escena (opcional, no habla, queda atenuado)</label>
        <select id="second-char-select"></select>
      </div>
      <div class="field" id="second-char-expression-field" hidden>
        <label>Expresión del 2do personaje</label>
        <select id="second-char-expression-select"></select>
      </div>
      <div class="field" id="second-char-position-field" hidden>
        <label>Posición del 2do personaje</label>
        <select id="second-char-position-select">
          <option value="izquierda">Izquierda</option>
          <option value="centro">Centro</option>
          <option value="derecha">Derecha</option>
        </select>
      </div>
      <div class="field" id="transition-field">
        <label>Transición de escena</label>
        <select name="transition" id="transition-select">
          <option value="">Dissolve (crossfade, por defecto)</option>
          <option value="wipe_left">Barrido hacia la izquierda</option>
          <option value="wipe_right">Barrido hacia la derecha</option>
          <option value="curtain">Cortina (corte a negro)</option>
          <option value="shake">Temblor de cámara</option>
        </select>
      </div>
      <div class="field">
        <label>Fondo</label>
        <select name="backgroundUrl" id="bg-select"></select>
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>Texto</label>
        <textarea name="text" id="text-field" placeholder="Ej: —Nunca pensé que volvería a verte —dijo, sin apartar la mirada."></textarea>
      </div>
      <div class="field" id="next-field">
        <label>Siguiente nodo (para dialogue/event)</label>
        <select name="next" id="next-select"></select>
      </div>
      <div class="field" id="continue-after-field" hidden style="grid-column: 1 / -1;">
        <label>Esta línea continúa después de...</label>
        <select id="continue-after-select"></select>
      </div>
      <div class="field" id="chapter-end-field" hidden>
        <label>Próxima historia (a dónde sigue)</label>
        <select name="nextStoryId" id="next-story-select"></select>
      </div>
      <div class="field" id="options-field" hidden style="grid-column: 1 / -1;">
        <label>Opciones (choice)</label>
        <div class="dynamic-rows" id="options-rows"></div>
        <button type="button" class="add-row-btn" id="add-option-btn">+ Agregar opción</button>
      </div>
      <div class="field" id="advanced-field" hidden style="grid-column: 1 / -1;">
        <label id="advanced-label">Condiciones</label>
        <div class="check-row-wrap" id="checks-rows"></div>
        <button type="button" class="add-row-btn" id="add-check-btn">+ Agregar condición</button>
        <div id="fallback-wrap" style="margin-top:10px;">
          <label>Si ninguna se cumple, ir a</label>
          <select id="fallback-select"></select>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" id="submit-node-btn">Guardar nodo</button>
        <button type="button" id="cancel-node" hidden>Cancelar edición</button>
        <button type="button" id="playtest-from-form-btn" class="ghost-btn">▶ Probar desde este nodo</button>
      </div>
    </form>

    <div class="node-preview-panel">
      <div class="node-preview-label">👁️ Vista previa en vivo</div>
      <div class="node-preview-stage" id="node-preview-stage">
        <div class="np-bg" id="np-bg"></div>
        <div class="np-char-slot np-pos-centro" id="np-char-slot-primary" hidden>
          <img id="np-char-primary" src="" alt="" />
        </div>
        <div class="np-char-slot np-pos-izquierda np-dim" id="np-char-slot-secondary" hidden>
          <img id="np-char-secondary" src="" alt="" />
        </div>
        <div class="np-dialogue-box">
          <div class="np-system-tag" id="np-system-tag" hidden></div>
          <div class="np-speaker" id="np-speaker" hidden></div>
          <div class="np-text" id="np-text">La vista previa se arma sola a medida que completás el formulario.</div>
          <div class="np-options" id="np-options" hidden></div>
        </div>
      </div>
    </div>
    </div>
    <div class="script-transcript" id="script-transcript" hidden></div>

    <div class="view-toggle">
      <button type="button" class="mode-toggle-btn active" id="view-btn-list">📋 Lista</button>
      <button type="button" class="mode-toggle-btn" id="view-btn-tree">🌳 Árbol</button>
      <select id="tree-story-select" class="tree-story-select"><option value="">(elegir historia)</option></select>
    </div>

    <div class="tree-view" id="tree-view" hidden>
      <div class="tree-legend">
        <span><i class="dot dot-blue"></i> diálogo/evento</span>
        <span><i class="dot dot-purple"></i> decisión</span>
        <span><i class="dot dot-amber"></i> condición/random</span>
        <span><i class="dot dot-green"></i> fin de capítulo</span>
        <span><i class="dot dot-gray"></i> final</span>
        <span><i class="dot dot-red"></i> conexión rota</span>
      </div>
      <div class="tree-scroll" id="tree-scroll">
        <div class="tree-canvas" id="tree-canvas"></div>
      </div>
      <div class="tree-orphans" id="tree-orphans"></div>
    </div>

    <table class="entity-table" id="nodes-table-view">
      <thead><tr><th>ID</th><th>Historia</th><th>Tipo</th><th>Personaje</th><th>Texto</th><th>Acciones</th></tr></thead>
      <tbody id="tbody-nodes"></tbody>
    </table>

    <div class="playtest-overlay" id="playtest-overlay" hidden>
      <div class="playtest-window">
        <div class="playtest-header">
          <span>▶ Probando la historia (con la lógica real del juego)</span>
          <button type="button" id="playtest-close-btn">✕ Cerrar</button>
        </div>
        <div class="playtest-stage" id="playtest-stage">
          <div class="np-bg" id="pt-bg"></div>
          <div class="np-char-slot np-pos-centro" id="pt-char-slot-primary" hidden>
            <img id="pt-char-primary" src="" alt="" />
          </div>
          <div class="np-char-slot np-pos-izquierda np-dim" id="pt-char-slot-secondary" hidden>
            <img id="pt-char-secondary" src="" alt="" />
          </div>
          <div class="np-dialogue-box">
            <div class="np-system-tag" id="pt-system-tag" hidden></div>
            <div class="np-speaker" id="pt-speaker" hidden></div>
            <div class="np-text" id="pt-text"></div>
            <div class="np-options" id="pt-options" hidden></div>
            <button type="button" id="pt-continue-btn" class="np-continue-btn" hidden>continuar ▼</button>
          </div>
        </div>
        <div class="playtest-footer" id="playtest-footer"></div>
      </div>
    </div>
  `;

  const form = section.querySelector("#form-nodes");
  const typeSelect = form.elements.type;
  const typeField = section.querySelector("#type-field");
  const scriptEventField = section.querySelector("#script-event-field");
  const scriptIsEventCheckbox = section.querySelector("#script-is-event");
  const nextField = section.querySelector("#next-field");
  const nextSelect = section.querySelector("#next-select");
  const continueAfterField = section.querySelector("#continue-after-field");
  const continueAfterSelect = section.querySelector("#continue-after-select");
  const chapterEndField = section.querySelector("#chapter-end-field");
  const nextStorySelect = section.querySelector("#next-story-select");
  const optionsField = section.querySelector("#options-field");
  const optionsRows = section.querySelector("#options-rows");
  const addOptionBtn = section.querySelector("#add-option-btn");
  const advancedField = section.querySelector("#advanced-field");
  const advancedLabel = section.querySelector("#advanced-label");
  const checksRows = section.querySelector("#checks-rows");
  const addCheckBtn = section.querySelector("#add-check-btn");
  const fallbackWrap = section.querySelector("#fallback-wrap");
  const fallbackSelect = section.querySelector("#fallback-select");
  const positionField = section.querySelector("#position-field");
  const positionSelect = section.querySelector("#position-select");
  const effectField = section.querySelector("#effect-field");
  const effectSelect = section.querySelector("#effect-select");
  const secondCharField = section.querySelector("#second-char-field");
  const secondCharSelect = section.querySelector("#second-char-select");
  const secondCharExpressionField = section.querySelector("#second-char-expression-field");
  const secondCharExpressionSelect = section.querySelector("#second-char-expression-select");
  const secondCharPositionField = section.querySelector("#second-char-position-field");
  const secondCharPositionSelect = section.querySelector("#second-char-position-select");
  const transitionSelect = section.querySelector("#transition-select");
  const bgSelect = section.querySelector("#bg-select");
  const nodeIdDisplay = section.querySelector("#node-id-display");
  const charPicker = section.querySelector("#char-picker");
  const cancelBtn = section.querySelector("#cancel-node");
  const storySelect = section.querySelector("#story-select");
  const textField = section.querySelector("#text-field");
  const submitBtn = section.querySelector("#submit-node-btn");
  const modeBtnFull = section.querySelector("#mode-btn-full");
  const modeBtnScript = section.querySelector("#mode-btn-script");
  const scriptModeHint = section.querySelector("#script-mode-hint");
  const scriptTranscript = section.querySelector("#script-transcript");
  const viewBtnList = section.querySelector("#view-btn-list");
  const viewBtnTree = section.querySelector("#view-btn-tree");
  const treeStorySelect = section.querySelector("#tree-story-select");
  const treeView = section.querySelector("#tree-view");
  const treeCanvas = section.querySelector("#tree-canvas");
  const treeOrphans = section.querySelector("#tree-orphans");
  const nodesTableView = section.querySelector("#nodes-table-view");

  let editorMode = "full"; // "full" | "script"
  let editingId = null;
  let currentNodeId = "";
  let selectedCharacter = "";
  let allNodes = []; // [{id, type, text, character}]
  let optionItems = []; // [{text, next, effects}]
  let checkItems = []; // [{mode:'stat'|'flag', stat, operator, value, flag, equals, next}]
  let outcomeItems = []; // [{probability, next, effects}]
  let charactersList = []; // [{name, thumbUrl}]
  let locksMap = {};
  subscribeLocks("nodes", (map) => (locksMap = map));

  function findCharInList(name) {
    return charactersList.find((c) => c.name === name) || null;
  }

  function setPreviewCharSlot(prefix, slotSuffix, character, expressionLabel, position, dim) {
    const slot = document.getElementById(`${prefix}-char-slot-${slotSuffix}`);
    const img = document.getElementById(`${prefix}-char-${slotSuffix}`);
    if (!slot || !img) return;
    slot.classList.remove("np-pos-izquierda", "np-pos-centro", "np-pos-derecha");
    slot.classList.add(`np-pos-${position || "centro"}`);
    slot.classList.toggle("np-dim", !!dim);
    const portrait =
      character && character.images && character.images.length
        ? character.images.find((im) => im.label === expressionLabel) || character.images[0]
        : null;
    if (!portrait) {
      slot.hidden = true;
      return;
    }
    slot.hidden = false;
    img.src = portrait.url;
    img.alt = character.name;
  }

  function renderNodePreview() {
    const bg = document.getElementById("np-bg");
    const speakerEl = document.getElementById("np-speaker");
    const systemTag = document.getElementById("np-system-tag");
    const textEl = document.getElementById("np-text");
    const optionsEl = document.getElementById("np-options");
    if (!bg) return; // el panel de vista previa vive solo en modo "full"

    const type = typeSelect.value;
    bg.style.backgroundImage = bgSelect.value ? `url('${bgSelect.value}')` : "";

    const showsCharacter = type === "dialogue" || type === "choice" || type === "event";
    if (showsCharacter) {
      setPreviewCharSlot("np", "primary", findCharInList(selectedCharacter), expressionSelect.value, positionSelect.value, false);
      if (secondCharSelect.value) {
        setPreviewCharSlot(
          "np", "secondary",
          findCharInList(secondCharSelect.value),
          secondCharExpressionSelect.value,
          secondCharPositionSelect.value,
          true
        );
      } else {
        document.getElementById("np-char-slot-secondary").hidden = true;
      }
    } else {
      document.getElementById("np-char-slot-primary").hidden = true;
      document.getElementById("np-char-slot-secondary").hidden = true;
    }

    speakerEl.hidden = !(selectedCharacter && showsCharacter);
    if (!speakerEl.hidden) speakerEl.textContent = selectedCharacter;

    const systemLabels = {
      event: "◆ evento",
      condition: "◆ este nodo evalúa condiciones y salta solo — no hay texto que previsualizar",
      random: "🎲 este nodo sortea entre desenlaces — no hay texto que previsualizar",
      chapter_end: "⏭ fin de capítulo — sigue con la próxima historia",
      ending: "🏁 final de la partida",
    };
    const isSystemOnly = type === "condition" || type === "random";
    systemTag.hidden = !systemLabels[type] || type === "dialogue" || type === "choice";
    if (!systemTag.hidden) systemTag.textContent = systemLabels[type];

    textEl.textContent = isSystemOnly ? "" : textField.value || "Escribí el texto para verlo acá...";

    if (type === "choice") {
      optionsEl.innerHTML = "";
      const withText = optionItems.filter((o) => o.text.trim());
      optionsEl.hidden = withText.length === 0;
      withText.forEach((o) => {
        const btn = document.createElement("div");
        btn.className = "np-option-preview";
        btn.textContent = o.text;
        optionsEl.appendChild(btn);
      });
    } else {
      optionsEl.hidden = true;
    }
  }

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

  // solo nodos dialogue/event que todavía NO tienen "next" asignado —
  // son los únicos puntos válidos para "enganchar" la próxima línea sin
  // pisar una conexión que ya existía.
  function refreshContinueAfterSelect(preferId) {
    const current = preferId !== undefined ? preferId : continueAfterSelect.value;
    const openThreads = allNodes.filter(
      (n) => (n.type === "dialogue" || n.type === "event") && !n.next
    );
    continueAfterSelect.innerHTML = '<option value="">(ninguno — nodo suelto)</option>';
    openThreads.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = `${n.id} — ${n.character || "narrador"}: ${(n.text || "").slice(0, 40)}`;
      continueAfterSelect.appendChild(opt);
    });
    if (current && openThreads.some((n) => n.id === current)) {
      continueAfterSelect.value = current;
    }
  }

  function renderOptionRows() {
    optionsRows.innerHTML = "";
    optionItems.forEach((opt, idx) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.gap = "8px";
      topRow.style.width = "100%";

      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.placeholder = "Ej: Aceptar la misión";
      textInput.value = opt.text || "";
      textInput.addEventListener("input", () => {
        optionItems[idx].text = textInput.value;
        renderNodePreview();
      });

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

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        optionItems.splice(idx, 1);
        renderOptionRows();
      });

      topRow.append(textInput, nextSel, del);
      row.appendChild(topRow);

      const effectsContainer = document.createElement("div");
      effectsContainer.style.width = "100%";
      buildEffectsPicker(effectsContainer, opt.effects || {}, (val) => {
        optionItems[idx].effects = val;
      });
      row.appendChild(effectsContainer);

      optionsRows.appendChild(row);
    });
    renderNodePreview();
  }

  addOptionBtn.addEventListener("click", () => {
    optionItems.push({ text: "", next: "", effects: {} });
    renderOptionRows();
  });

  // ---- condición (checks + fallbackNext) ----
  function renderCheckRows() {
    checksRows.innerHTML = "";
    checkItems.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "check-row";

      const statSel = document.createElement("select");
      statSel.innerHTML =
        STAT_OPTIONS.map((s) => `<option value="${s.value}">${s.label.split(" (")[0]}</option>`).join("") +
        '<option value="__flag__">Flag (avanzado)</option>';
      statSel.value = c.flag ? "__flag__" : c.stat || "carisma";

      const flagInput = document.createElement("input");
      flagInput.type = "text";
      flagInput.placeholder = "nombre del flag";
      flagInput.value = c.flag || "";
      flagInput.hidden = !c.flag;

      const opSel = document.createElement("select");
      [
        [">=", "≥"],
        ["<=", "≤"],
        [">", ">"],
        ["<", "<"],
        ["==", "=="],
      ].forEach(([value, label]) => {
        const o = document.createElement("option");
        o.value = value;
        o.textContent = label;
        opSel.appendChild(o);
      });
      opSel.value = c.operator || ">=";
      opSel.hidden = !!c.flag;

      const valInput = document.createElement("input");
      valInput.type = "number";
      valInput.placeholder = "valor";
      valInput.value = c.value ?? "";
      valInput.style.width = "80px";
      valInput.hidden = !!c.flag;

      const nextSel = document.createElement("select");
      nextSel.innerHTML = '<option value="">(nodo si se cumple)</option>';
      allNodes.forEach((n) => {
        const o = document.createElement("option");
        o.value = n.id;
        o.textContent = `${n.id} — ${(n.text || "").slice(0, 30)}`;
        nextSel.appendChild(o);
      });
      nextSel.value = c.next || "";

      statSel.addEventListener("change", () => {
        if (statSel.value === "__flag__") {
          checkItems[idx] = { flag: "", equals: true, next: checkItems[idx].next };
        } else {
          checkItems[idx] = { stat: statSel.value, operator: ">=", value: 0, next: checkItems[idx].next };
        }
        renderCheckRows();
      });
      flagInput.addEventListener("input", () => (checkItems[idx].flag = flagInput.value));
      opSel.addEventListener("change", () => (checkItems[idx].operator = opSel.value));
      valInput.addEventListener("input", () => (checkItems[idx].value = Number(valInput.value)));
      nextSel.addEventListener("change", () => (checkItems[idx].next = nextSel.value));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        checkItems.splice(idx, 1);
        renderCheckRows();
      });

      row.append(statSel, flagInput, opSel, valInput, nextSel, del);
      checksRows.appendChild(row);
    });
  }

  // ---- random (outcomes pesados por probabilidad) ----
  function renderOutcomeRows() {
    checksRows.innerHTML = "";
    outcomeItems.forEach((o, idx) => {
      const row = document.createElement("div");
      row.className = "outcome-row";
      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.gap = "8px";
      topRow.style.width = "100%";
      topRow.style.alignItems = "center";

      const probInput = document.createElement("input");
      probInput.type = "number";
      probInput.placeholder = "% (ej: 30)";
      probInput.style.width = "80px";
      probInput.value = o.probability ?? "";
      probInput.addEventListener("input", () => (outcomeItems[idx].probability = Number(probInput.value)));

      const nextSel = document.createElement("select");
      nextSel.innerHTML = '<option value="">(nodo destino)</option>';
      allNodes.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n.id;
        opt.textContent = `${n.id} — ${(n.text || "").slice(0, 30)}`;
        nextSel.appendChild(opt);
      });
      nextSel.value = o.next || "";
      nextSel.addEventListener("change", () => (outcomeItems[idx].next = nextSel.value));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Quitar";
      del.addEventListener("click", () => {
        outcomeItems.splice(idx, 1);
        renderOutcomeRows();
      });

      topRow.append(probInput, nextSel, del);
      row.appendChild(topRow);

      const effectsContainer = document.createElement("div");
      effectsContainer.style.width = "100%";
      buildEffectsPicker(effectsContainer, o.effects || {}, (val) => {
        outcomeItems[idx].effects = val;
      });
      row.appendChild(effectsContainer);

      checksRows.appendChild(row);
    });
    const total = outcomeItems.reduce((sum, o) => sum + (Number(o.probability) || 0), 0);
    const totalNote = document.createElement("p");
    totalNote.className = "hint";
    totalNote.style.margin = "4px 0 0";
    totalNote.textContent =
      total === 100 ? `✅ Suma ${total}%` : `⚠ Suma ${total}% — debería sumar 100%`;
    checksRows.appendChild(totalNote);
  }

  addCheckBtn.addEventListener("click", () => {
    if (typeSelect.value === "random") {
      outcomeItems.push({ probability: 0, next: "", effects: {} });
      renderOutcomeRows();
    } else {
      checkItems.push({ stat: "carisma", operator: ">=", value: 0, next: "" });
      renderCheckRows();
    }
  });

  function refreshFallbackSelect() {
    const current = fallbackSelect.value;
    fallbackSelect.innerHTML = '<option value="">(elegir nodo)</option>';
    allNodes.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = `${n.id} — ${(n.text || "").slice(0, 30)}`;
      fallbackSelect.appendChild(opt);
    });
    fallbackSelect.value = current;
  }

  function refreshAdvancedUI() {
    if (typeSelect.value === "random") {
      advancedLabel.textContent = "Desenlaces (deben sumar 100%)";
      addCheckBtn.textContent = "+ Agregar desenlace";
      fallbackWrap.hidden = true;
      renderOutcomeRows();
    } else if (typeSelect.value === "condition") {
      advancedLabel.textContent = "Condiciones (se evalúan en orden, la primera que se cumpla gana)";
      addCheckBtn.textContent = "+ Agregar condición";
      fallbackWrap.hidden = false;
      refreshFallbackSelect();
      renderCheckRows();
    }
  }
  typeSelect.addEventListener("change", refreshAdvancedUI);

  // ---- segundo personaje en escena (opcional) ----
  function refreshSecondCharSelect() {
    const current = secondCharSelect.value;
    secondCharSelect.innerHTML = '<option value="">(ninguno)</option>';
    charactersList.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      secondCharSelect.appendChild(opt);
    });
    secondCharSelect.value = current;
    refreshSecondCharExpression();
  }
  function refreshSecondCharExpression() {
    const character = charactersList.find((c) => c.name === secondCharSelect.value);
    secondCharExpressionField.hidden = !character || !character.images || character.images.length === 0;
    if (character && character.images) {
      const current = secondCharExpressionSelect.value;
      secondCharExpressionSelect.innerHTML = character.images
        .map((img) => `<option value="${img.label}">${img.label || "(sin etiqueta)"}</option>`)
        .join("");
      if (character.images.some((img) => img.label === current)) secondCharExpressionSelect.value = current;
    }
    secondCharPositionField.hidden = !secondCharSelect.value;
    renderNodePreview();
  }
  secondCharSelect.addEventListener("change", refreshSecondCharExpression);
  secondCharExpressionSelect.addEventListener("change", renderNodePreview);
  secondCharPositionSelect.addEventListener("change", renderNodePreview);
  positionSelect.addEventListener("change", renderNodePreview);
  effectSelect.addEventListener("change", renderNodePreview);
  textField.addEventListener("input", renderNodePreview);

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
    renderNodePreview();
  });
  bgSelect.addEventListener("change", renderNodePreview);

  // historias disponibles: alimenta tanto el selector "Historia" del nodo
  // como el de "próxima historia" en chapter_end, y el mapa que usa el
  // árbol visual para saber por dónde arranca cada historia.
  let storiesMap = {};
  onSnapshot(collection(db, "stories"), (snap) => {
    const currentStory = storySelect.value;
    const currentNext = nextStorySelect.value;
    const currentTree = treeStorySelect.value;
    storySelect.innerHTML = '<option value="">(elegir historia)</option>';
    nextStorySelect.innerHTML = '<option value="">(elegir historia)</option>';
    treeStorySelect.innerHTML = '<option value="">(elegir historia)</option>';
    storiesMap = {};
    snap.forEach((d) => {
      const data = d.data();
      const label = data.title || d.id;
      storiesMap[d.id] = { title: label, startNode: data.startNode || "" };
      [storySelect, nextStorySelect, treeStorySelect].forEach((sel) => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = label;
        sel.appendChild(opt);
      });
    });
    storySelect.value = currentStory;
    nextStorySelect.value = currentNext;
    treeStorySelect.value = currentTree;
    if (!treeView.hidden) renderNodeTree();
  });

  // personajes (protagonistas + heroínas) para el selector con foto
  const expressionField = section.querySelector("#expression-field");
  const expressionSelect = section.querySelector("#expression-select");

  function refreshExpressionOptions(keepValue) {
    const character = charactersList.find((c) => c.name === selectedCharacter);
    const previous = keepValue !== undefined ? keepValue : expressionSelect.value;
    if (!character || !character.images || character.images.length === 0) {
      expressionField.hidden = true;
      expressionSelect.innerHTML = "";
      return;
    }
    expressionField.hidden = false;
    expressionSelect.innerHTML = character.images
      .map((img) => `<option value="${img.label}">${img.label || "(sin etiqueta)"}</option>`)
      .join("");
    if (previous && character.images.some((img) => img.label === previous)) {
      expressionSelect.value = previous;
    }
    renderNodePreview();
  }
  expressionSelect.addEventListener("change", renderNodePreview);

  function renderCharPicker() {
    charPicker.innerHTML = "";
    const noneChip = document.createElement("button");
    noneChip.type = "button";
    noneChip.className = "char-chip" + (selectedCharacter === "" ? " selected" : "");
    noneChip.textContent = "— narrador / sin personaje —";
    noneChip.addEventListener("click", () => {
      selectedCharacter = "";
      renderCharPicker();
      refreshExpressionOptions("");
      renderNodePreview();
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
        refreshExpressionOptions("");
        renderNodePreview();
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
          images: data.images || [],
          source: collectionName,
        });
      });
      renderCharPicker();
      refreshExpressionOptions();
      refreshSecondCharSelect();
    });
  }
  subscribeCharacters("protagonists");
  subscribeCharacters("heroines");
  subscribeCharacters("specialCharacters");

  function updateVisibleFields() {
    const t = typeSelect.value;
    const showsCharacter = t === "dialogue" || t === "choice" || t === "event";
    if (editorMode === "script") {
      typeField.hidden = true;
      scriptEventField.hidden = false;
      nextField.hidden = true;
      continueAfterField.hidden = false;
      optionsField.hidden = true;
      advancedField.hidden = true;
      chapterEndField.hidden = true;
      positionField.hidden = true;
      effectField.hidden = true;
      secondCharField.hidden = true;
      secondCharExpressionField.hidden = true;
      secondCharPositionField.hidden = true;
    } else {
      typeField.hidden = false;
      scriptEventField.hidden = true;
      continueAfterField.hidden = true;
      nextField.hidden = !(t === "dialogue" || t === "event");
      optionsField.hidden = t !== "choice";
      advancedField.hidden = !(t === "condition" || t === "random");
      chapterEndField.hidden = t !== "chapter_end";
      positionField.hidden = !showsCharacter;
      effectField.hidden = !showsCharacter;
      secondCharField.hidden = !showsCharacter;
      secondCharExpressionField.hidden = !showsCharacter || secondCharSelect.value === "";
      secondCharPositionField.hidden = !showsCharacter || secondCharSelect.value === "";
      if (t === "condition" || t === "random") refreshAdvancedUI();
    }
    renderNodePreview();
  }

  function setEditorMode(mode) {
    editorMode = mode;
    modeBtnFull.classList.toggle("active", mode === "full");
    modeBtnScript.classList.toggle("active", mode === "script");
    scriptModeHint.hidden = mode !== "script";
    scriptTranscript.hidden = mode !== "script";
    submitBtn.textContent = mode === "script" ? "Guardar y seguir escribiendo →" : "Guardar nodo";
    if (mode === "script") {
      refreshContinueAfterSelect();
    }
    updateVisibleFields();
  }
  modeBtnFull.addEventListener("click", () => setEditorMode("full"));
  modeBtnScript.addEventListener("click", () => setEditorMode("script"));
  typeSelect.addEventListener("change", updateVisibleFields);
  updateVisibleFields();

  viewBtnList.addEventListener("click", () => {
    viewBtnList.classList.add("active");
    viewBtnTree.classList.remove("active");
    treeView.hidden = true;
    nodesTableView.hidden = false;
  });
  viewBtnTree.addEventListener("click", () => {
    viewBtnTree.classList.add("active");
    viewBtnList.classList.remove("active");
    treeView.hidden = false;
    nodesTableView.hidden = true;
    renderNodeTree();
  });
  treeStorySelect.addEventListener("change", renderNodeTree);

  const TYPE_DOT = {
    dialogue: "dot-blue", event: "dot-blue", choice: "dot-purple",
    condition: "dot-amber", random: "dot-amber",
    chapter_end: "dot-green", ending: "dot-gray",
  };

  function nodeOutgoingIds(node) {
    const ids = [];
    if (node.type === "dialogue" || node.type === "event") {
      if (node.next) ids.push(node.next);
    } else if (node.type === "choice") {
      (node.options || []).forEach((o) => o.next && ids.push(o.next));
    } else if (node.type === "condition") {
      (node.checks || []).forEach((c) => c.next && ids.push(c.next));
      if (node.fallbackNext) ids.push(node.fallbackNext);
    } else if (node.type === "random") {
      (node.outcomes || []).forEach((o) => o.next && ids.push(o.next));
    }
    return ids;
  }

  function renderNodeTree() {
    const storyId = treeStorySelect.value;
    treeCanvas.innerHTML = "";
    treeOrphans.innerHTML = "";
    if (!storyId) {
      treeCanvas.innerHTML = '<p class="hint">Elegí una Historia arriba para ver su árbol.</p>';
      return;
    }
    const storyInfo = storiesMap[storyId];
    const nodesForStory = allNodes.filter((n) => n.storyId === storyId);
    const byId = {};
    nodesForStory.forEach((n) => (byId[n.id] = n));

    if (!storyInfo || !storyInfo.startNode) {
      treeCanvas.innerHTML = '<p class="hint">Esta Historia todavía no tiene "ID del nodo inicial" configurado.</p>';
      return;
    }

    // BFS desde el nodo inicial: cada nodo se ubica en la primera
    // profundidad en la que se lo encuentra, aunque tenga más de un
    // "padre" (varias flechas pueden apuntarle al mismo nodo).
    const depthOf = {};
    const parentsOf = {}; // id -> [ids de padres]
    const queue = [storyInfo.startNode];
    depthOf[storyInfo.startNode] = 0;
    const brokenTargets = new Set(); // ids referenciados que no existen
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      const node = byId[id];
      if (!node) {
        brokenTargets.add(id);
        continue;
      }
      nodeOutgoingIds(node).forEach((targetId) => {
        if (!(targetId in depthOf)) {
          depthOf[targetId] = depthOf[id] + 1;
          queue.push(targetId);
        }
        (parentsOf[targetId] = parentsOf[targetId] || []).push(id);
      });
    }

    const rows = {}; // depth -> [ids]
    Object.entries(depthOf).forEach(([id, d]) => {
      (rows[d] = rows[d] || []).push(id);
    });
    const maxDepth = Math.max(0, ...Object.keys(rows).map(Number));
    const COL = 190, ROW = 150, PAD = 30;
    const maxCols = Math.max(1, ...Object.values(rows).map((r) => r.length));
    const canvasW = Math.max(680, maxCols * COL + PAD * 2);
    const canvasH = (maxDepth + 1) * ROW + PAD * 2;
    treeCanvas.style.width = canvasW + "px";
    treeCanvas.style.height = canvasH + "px";

    const pos = {}; // id -> {x,y}
    for (let d = 0; d <= maxDepth; d++) {
      const idsInRow = rows[d] || [];
      idsInRow.forEach((id, i) => {
        pos[id] = {
          x: PAD + COL / 2 + i * COL,
          y: PAD + d * ROW,
        };
      });
    }

    // lineas de conexión (SVG)
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", canvasW);
    svg.setAttribute("height", canvasH);
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.pointerEvents = "none";
    Object.entries(parentsOf).forEach(([childId, parents]) => {
      const cp = pos[childId];
      if (!cp) return; // hijo roto/no encontrado, se dibuja aparte
      parents.forEach((parentId) => {
        const pp = pos[parentId];
        if (!pp) return;
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", pp.x);
        line.setAttribute("y1", pp.y + 40);
        line.setAttribute("x2", cp.x);
        line.setAttribute("y2", cp.y - 40);
        line.setAttribute("stroke", "#3a3a52");
        line.setAttribute("stroke-width", "1.5");
        svg.appendChild(line);
      });
    });
    // flechas rotas: desde cada nodo que referencia un ID inexistente
    nodesForStory.forEach((node) => {
      nodeOutgoingIds(node).forEach((targetId) => {
        if (!byId[targetId] && pos[node.id]) {
          const pp = pos[node.id];
          const line = document.createElementNS(svgNS, "line");
          line.setAttribute("x1", pp.x);
          line.setAttribute("y1", pp.y + 40);
          line.setAttribute("x2", pp.x + 90);
          line.setAttribute("y2", pp.y + 110);
          line.setAttribute("stroke", "#e5484d");
          line.setAttribute("stroke-width", "1.5");
          line.setAttribute("stroke-dasharray", "4 3");
          svg.appendChild(line);
        }
      });
    });
    treeCanvas.appendChild(svg);

    // tarjetas de nodo
    Object.entries(pos).forEach(([id]) => {
      const node = byId[id];
      const p = pos[id];
      const card = document.createElement("div");
      const broken = !node;
      card.className = "tree-card" + (broken ? " tree-card-broken" : "");
      card.style.left = p.x - 85 + "px";
      card.style.top = p.y - 40 + "px";
      if (broken) {
        card.innerHTML = `<div class="tree-card-id">⚠ ${id}</div><div class="tree-card-sub">nodo no encontrado</div>`;
      } else {
        const character = findCharInList(node.character);
        const dot = TYPE_DOT[node.type] || "dot-blue";
        card.innerHTML = `
          <div class="tree-card-head">
            <i class="dot ${dot}"></i>
            <span class="tree-card-id">${node.id}</span>
          </div>
          <div class="tree-card-sub">${node.character || (node.type === "ending" ? "final" : node.type === "chapter_end" ? "fin de capítulo" : "narrador")}</div>
          <div class="tree-card-text">${(node.text || node.title || "(sin texto)").slice(0, 70)}</div>
        `;
        card.addEventListener("click", () => loadNodeIntoForm(node));
      }
      treeCanvas.appendChild(card);
    });

    // nodos de esta historia que nunca se llegan a alcanzar desde el inicio
    const orphanIds = nodesForStory.map((n) => n.id).filter((id) => !(id in depthOf));
    if (orphanIds.length) {
      treeOrphans.innerHTML =
        `<p class="hint">⚠ Estos nodos de "${storyInfo.title}" existen pero no se puede llegar a ellos desde el nodo inicial (nadie los referencia): ` +
        orphanIds.map((id) => `<code>${id}</code>`).join(", ") + "</p>";
    }
  }


}

  function loadNodeIntoForm(item) {
    acquireLock("nodes", item.id);
    setEditorMode("full");
    editingId = item.id;
    currentNodeId = item.id;
    nodeIdDisplay.value = item.id;
    form.elements.storyId.value = item.storyId || "";
    typeSelect.value = item.type || "dialogue";
    selectedCharacter = item.character || "";
    renderCharPicker();
    refreshExpressionOptions(item.characterExpression || "");
    bgSelect.value = item.backgroundUrl || "";
    positionSelect.value = item.position || "centro";
    effectSelect.value = item.effect || "";
    secondCharSelect.value = item.secondCharacter || "";
    refreshSecondCharExpression();
    if (item.secondCharacterExpression) secondCharExpressionSelect.value = item.secondCharacterExpression;
    secondCharPositionSelect.value = item.secondCharacterPosition || "izquierda";
    transitionSelect.value = item.transition || "";
    form.elements.text.value = item.text || "";
    nextSelect.value = item.next || "";
    nextStorySelect.value = item.nextStoryId || "";
    optionItems = (item.options || []).map((o) => ({
      text: o.text || "",
      next: o.next || "",
      effects: o.effects || {},
    }));
    renderOptionRows();
    checkItems = (item.checks || []).map((c) => ({ ...c }));
    outcomeItems = (item.outcomes || []).map((o) => ({ ...o, effects: o.effects || {} }));
    updateVisibleFields();
    if (item.type === "condition") {
      refreshFallbackSelect();
      fallbackSelect.value = item.fallbackNext || "";
    }
    cancelBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    if (editingId) releaseLock("nodes", editingId);
    editingId = null;
    form.reset();
    selectedCharacter = "";
    optionItems = [];
    checkItems = [];
    outcomeItems = [];
    renderOptionRows();
    renderCharPicker();
    refreshExpressionOptions("");
    secondCharSelect.value = "";
    refreshSecondCharExpression();
    updateVisibleFields();
    refreshNodeIdSuggestion();
    cancelBtn.hidden = true;
  }

  function softResetForScript(newNodeId, savedText) {
    // no toca Historia/Personaje/Expresión/Fondo — son las que querés
    // mantener mientras escribís varias líneas seguidas.
    textField.value = "";
    textField.focus();
    // el nodo recién creado pasa a ser el próximo "hilo abierto" por
    // default, así la línea siguiente se engancha sola sin elegir nada.
    if (!allNodes.some((n) => n.id === newNodeId)) {
      allNodes.push({
        id: newNodeId,
        type: scriptIsEventCheckbox.checked ? "event" : "dialogue",
        text: savedText,
        character: selectedCharacter
      });
    }
    refreshContinueAfterSelect(newNodeId);
    refreshNodeIdSuggestion();
  }

  function appendTranscriptLine(character, text) {
    scriptTranscript.hidden = false;
    const line = document.createElement("div");
    line.className = "transcript-line";
    line.innerHTML = `<b>${character || "narrador"}:</b> ${text}`;
    scriptTranscript.appendChild(line);
    scriptTranscript.scrollTop = scriptTranscript.scrollHeight;
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

    if (editorMode === "script") {
      if (!storySelect.value) return alert("Elegí a qué Historia pertenece antes de guardar.");
      if (!textField.value.trim()) return alert("El texto no puede estar vacío.");
      const data = {
        storyId: storySelect.value,
        type: scriptIsEventCheckbox.checked ? "event" : "dialogue",
        character: selectedCharacter,
        characterExpression: expressionField.hidden ? "" : expressionSelect.value,
        backgroundUrl: bgSelect.value,
        text: textField.value
      };
      try {
        await setDoc(doc(db, "nodes", nodeId), data);
        if (continueAfterSelect.value) {
          await updateDoc(doc(db, "nodes", continueAfterSelect.value), { next: nodeId });
        }
        logActivity("create", "nodes", nodeId, data.text.slice(0, 40));
        appendTranscriptLine(data.character, data.text);
        softResetForScript(nodeId, data.text);
      } catch (err) {
        alert("Error guardando la línea: " + err.message);
      }
      return;
    }

    const data = {
      storyId: storySelect.value,
      type: typeSelect.value,
      character: selectedCharacter,
      characterExpression: expressionField.hidden ? "" : expressionSelect.value,
      position: positionField.hidden ? "centro" : positionSelect.value,
      effect: effectField.hidden ? "" : effectSelect.value,
      secondCharacter: secondCharField.hidden ? "" : secondCharSelect.value,
      secondCharacterExpression: secondCharExpressionField.hidden ? "" : secondCharExpressionSelect.value,
      secondCharacterPosition: secondCharPositionField.hidden ? "izquierda" : secondCharPositionSelect.value,
      backgroundUrl: bgSelect.value,
      transition: transitionSelect.value,
      text: form.elements.text.value,
    };
    if (data.type === "dialogue" || data.type === "event") {
      data.next = nextSelect.value;
    }
    if (data.type === "chapter_end") {
      data.nextStoryId = nextStorySelect.value;
      if (!data.nextStoryId) {
        return alert('Elegí a qué Historia sigue este "chapter_end" antes de guardar.');
      }
    }
    if (data.type === "choice") {
      data.options = optionItems
        .filter((o) => o.text.trim())
        .map((o) => {
          const option = { text: o.text, next: o.next };
          if (o.effects && Object.keys(o.effects).length) option.effects = o.effects;
          return option;
        });
    }
    if (data.type === "condition") {
      data.checks = checkItems.map((c) =>
        c.flag
          ? { flag: c.flag, equals: c.equals !== false, next: c.next }
          : { stat: c.stat, operator: c.operator, value: c.value, next: c.next }
      );
      data.fallbackNext = fallbackSelect.value;
      if (!data.fallbackNext) {
        return alert('Un nodo "condition" necesita "si ninguna se cumple, ir a" completado.');
      }
    }
    if (data.type === "random") {
      data.outcomes = outcomeItems.map((o) => {
        const outcome = { probability: o.probability, next: o.next };
        if (o.effects && Object.keys(o.effects).length) outcome.effects = o.effects;
        return outcome;
      });
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
    if (editorMode === "script") refreshContinueAfterSelect();
    if (!treeView.hidden) renderNodeTree();
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
        loadNodeIntoForm(item);
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
      const playBtn = document.createElement("button");
      playBtn.textContent = "▶ Probar";
      playBtn.addEventListener("click", () => openPlaytest(item.id));
      actionsTd.append(editBtn, playBtn, delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  });

  // ---------- MODO "PROBAR" (juega la historia real, con el motor real) ----------
  let ptEngine = null;

  function openPlaytest(startNodeId) {
    const nodesMap = {};
    allNodes.forEach((n) => (nodesMap[n.id] = n));
    if (!window.StoryEngine) {
      alert('No se pudo cargar el motor del juego (story-engine.js) — revisá que admin.html lo esté importando.');
      return;
    }
    try {
      ptEngine = new window.StoryEngine(nodesMap, startNodeId, { carisma: 5, inteligencia: 5, fisico: 5, riqueza: 5 }, []);
    } catch (err) {
      alert("No se pudo iniciar la prueba: " + err.message);
      return;
    }
    document.getElementById("playtest-overlay").hidden = false;
    renderPlaytestNode();
  }

  function closePlaytest() {
    document.getElementById("playtest-overlay").hidden = true;
    ptEngine = null;
  }

  function renderPlaytestNode() {
    const footer = document.getElementById("playtest-footer");
    const speakerEl = document.getElementById("pt-speaker");
    const systemTag = document.getElementById("pt-system-tag");
    const textEl = document.getElementById("pt-text");
    const optionsEl = document.getElementById("pt-options");
    const continueBtn = document.getElementById("pt-continue-btn");
    const bg = document.getElementById("pt-bg");
    footer.textContent = "";

    try {
      const node = ptEngine.getCurrentNode();
      if (!node) throw new Error("ese nodo no existe");

      bg.style.backgroundImage = node.backgroundUrl ? `url('${node.backgroundUrl}')` : "";

      if (node.type === "ending" || node.type === "chapter_end") {
        document.getElementById("pt-char-slot-primary").hidden = true;
        document.getElementById("pt-char-slot-secondary").hidden = true;
        speakerEl.hidden = true;
        systemTag.hidden = false;
        systemTag.textContent = node.type === "ending" ? "🏁 FINAL" : "⏭ FIN DEL CAPÍTULO";
        textEl.textContent = node.type === "ending" ? node.summary || node.title || "" : node.text || "";
        optionsEl.hidden = true;
        continueBtn.hidden = true;
        footer.textContent =
          node.type === "ending"
            ? "Llegaste a un final. Cerrá y probá otro camino si querés."
            : "Este nodo saltaría a otra Historia — la prueba no sigue capítulos distintos todavía, pero hasta acá la cadena está sana.";
        return;
      }

      const character = findCharInList(node.character);
      setPreviewCharSlot("pt", "primary", character, node.characterExpression, node.position, false);
      if (node.secondCharacter) {
        setPreviewCharSlot(
          "pt", "secondary",
          findCharInList(node.secondCharacter),
          node.secondCharacterExpression,
          node.secondCharacterPosition,
          true
        );
      } else {
        document.getElementById("pt-char-slot-secondary").hidden = true;
      }

      speakerEl.hidden = !node.character;
      if (node.character) speakerEl.textContent = node.character;

      const systemLabels = { event: "◆ evento", condition: "◆ el sistema evalúa la situación...", random: "🎲 el destino decide..." };
      systemTag.hidden = !systemLabels[node.type];
      if (!systemTag.hidden) systemTag.textContent = systemLabels[node.type];

      textEl.textContent = node.text || "(este nodo todavía no tiene texto cargado)";

      if (node.type === "choice") {
        optionsEl.innerHTML = "";
        const hasOptions = (node.options || []).some((o) => o.next);
        optionsEl.hidden = false;
        continueBtn.hidden = true;
        if (!hasOptions) {
          footer.innerHTML = "⚠ Este nodo todavía no tiene opciones con un destino elegido.";
        }
        (node.options || []).forEach((option, i) => {
          const btn = document.createElement("button");
          btn.className = "node-option-btn";
          btn.textContent = option.text || "(opción sin texto)";
          btn.disabled = !option.next;
          btn.addEventListener("click", () => {
            try {
              ptEngine.choose(i);
              renderPlaytestNode();
            } catch (err) {
              footer.innerHTML = `⚠ <b>Conexión rota en esta opción:</b> ${err.message}`;
            }
          });
          optionsEl.appendChild(btn);
        });
      } else if (node.type === "dialogue" || node.type === "event") {
        optionsEl.hidden = true;
        continueBtn.hidden = false;
        if (!node.next) {
          footer.innerHTML = "⚠ Este nodo todavía no tiene un \"siguiente nodo\" elegido — es normal si lo estás armando ahora.";
        }
      } else {
        // condition / random: se resuelven solas al tocar "continuar"
        optionsEl.hidden = true;
        continueBtn.hidden = false;
      }
    } catch (err) {
      console.error("Error en playtest:", err);
      bg.style.backgroundImage = "";
      document.getElementById("pt-char-slot-primary").hidden = true;
      document.getElementById("pt-char-slot-secondary").hidden = true;
      speakerEl.hidden = true;
      systemTag.hidden = true;
      textEl.textContent = "";
      optionsEl.hidden = true;
      continueBtn.hidden = true;
      footer.innerHTML = `⚠ <b>Algo se rompió mostrando este nodo:</b> ${err.message}. Cerrá y avisale al admin principal con este mensaje.`;
    }
  }

  section.querySelector("#playtest-close-btn").addEventListener("click", closePlaytest);
  section.querySelector("#playtest-overlay").addEventListener("click", (e) => {
    if (e.target.id === "playtest-overlay") closePlaytest();
  });
  section.querySelector("#playtest-from-form-btn").addEventListener("click", () => {
    if (!currentNodeId) return alert("Todavía no hay un nodo para probar.");
    openPlaytest(currentNodeId);
  });
  section.querySelector("#pt-continue-btn").addEventListener("click", () => {
    try {
      ptEngine.advance();
      renderPlaytestNode();
    } catch (err) {
      document.getElementById("playtest-footer").innerHTML = `⚠ <b>Conexión rota:</b> ${err.message}`;
    }
  });

  renderCharPicker();
  refreshNodeIdSuggestion();
  renderNodePreview();

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
