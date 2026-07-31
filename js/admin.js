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
  orderBy,
  query,
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
  // Confirmar que este usuario está en /admins/{uid} antes de mostrar nada.
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

    const section = buildCollectionSection(cfg);
    sectionsEl.appendChild(section);
  });

  const nodeBtn = document.createElement("button");
  nodeBtn.className = "nav-btn";
  nodeBtn.textContent = "🔀 Nodos / Decisiones";
  nodeBtn.dataset.target = "nodes";
  navEl.appendChild(nodeBtn);
  sectionsEl.appendChild(buildNodesSection());

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
    alert(
      "Falta configurar el 'upload preset' unsigned de Cloudinary en firebase-config.js"
    );
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

// ---------- CRUD GENÉRICO ----------
function buildCollectionSection(cfg) {
  const section = document.createElement("div");
  section.className = "section hidden";
  section.dataset.key = cfg.key;

  section.innerHTML = `
    <h2>${cfg.icon} ${cfg.label}</h2>
    <form class="entity-form" id="form-${cfg.key}"></form>
    <table class="entity-table">
      <thead><tr id="thead-${cfg.key}"></tr></thead>
      <tbody id="tbody-${cfg.key}"></tbody>
    </table>
  `;

  const form = section.querySelector(`#form-${cfg.key}`);
  const thead = section.querySelector(`#thead-${cfg.key}`);
  let editingId = null;

  // construir formulario
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
    } else {
      const input = document.createElement("input");
      input.type = f.type === "number" ? "number" : "text";
      input.name = f.key;
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

  cancelBtn.addEventListener("click", () => {
    editingId = null;
    form.reset();
    form.querySelectorAll(".img-preview").forEach((p) => (p.hidden = true));
    cancelBtn.hidden = true;
  });

  // header tabla
  cfg.fields.forEach((f) => {
    const th = document.createElement("th");
    th.textContent = f.label;
    thead.appendChild(th);
  });
  thead.appendChild(document.createElement("th")); // acciones

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    for (const f of cfg.fields) {
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
      if (editingId) {
        await updateDoc(doc(db, cfg.key, editingId), data);
      } else {
        await addDoc(collection(db, cfg.key), data);
      }
      form.reset();
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
        } else if (f.type === "json" && item[f.key]) {
          td.textContent = JSON.stringify(item[f.key]);
        } else {
          td.textContent = item[f.key] ?? "";
        }
        tr.appendChild(td);
      });
      const actionsTd = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        editingId = docSnap.id;
        cfg.fields.forEach((f) => {
          const el = form.elements[f.key];
          const val = item[f.key];
          if (f.type === "json") {
            el.value = val ? JSON.stringify(val, null, 2) : "";
          } else if (f.type === "image") {
            el.value = val || "";
            const preview = el.parentElement.querySelector(".img-preview");
            if (val) {
              preview.src = val;
              preview.hidden = false;
            }
          } else {
            el.value = val ?? "";
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
      Cada nodo es un paso de la historia. El "ID del nodo" es lo que usás en
      "next" para encadenarlos (ej: n001 → n002). Los tipos <b>condition</b> y
      <b>random</b> son avanzados y se editan como JSON para no perder
      flexibilidad.
    </p>
    <form class="entity-form" id="form-nodes">
      <div class="field">
        <label>ID del nodo (ej: n001)</label>
        <input type="text" name="nodeId" required />
      </div>
      <div class="field">
        <label>Historia (título de la colección "stories")</label>
        <input type="text" name="storyId" />
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
      <div class="field">
        <label>Personaje que habla (opcional)</label>
        <input type="text" name="character" />
      </div>
      <div class="field">
        <label>Fondo</label>
        <select name="backgroundUrl" id="bg-select"></select>
      </div>
      <div class="field">
        <label>Texto</label>
        <textarea name="text"></textarea>
      </div>
      <div class="field" id="next-field">
        <label>Siguiente nodo (para dialogue/event)</label>
        <input type="text" name="next" />
      </div>
      <div class="field" id="options-field" hidden>
        <label>Opciones (choice) — una por línea: texto | next | efectos JSON opcional</label>
        <textarea name="optionsRaw" placeholder="Aceptar la misión | n010 | {"valentia":1}
Rechazarla | n011"></textarea>
      </div>
      <div class="field" id="advanced-field" hidden>
        <label>JSON avanzado (checks para condition / outcomes para random)</label>
        <textarea name="advancedJson" placeholder='[{"stat":"carisma","op":">=","value":5,"next":"n020"}]'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit">Guardar nodo</button>
        <button type="button" id="cancel-node" hidden>Cancelar edición</button>
      </div>
    </form>
    <table class="entity-table">
      <thead><tr><th>ID</th><th>Historia</th><th>Tipo</th><th>Texto</th><th>Acciones</th></tr></thead>
      <tbody id="tbody-nodes"></tbody>
    </table>
  `;

  const form = section.querySelector("#form-nodes");
  const typeSelect = form.elements.type;
  const nextField = section.querySelector("#next-field");
  const optionsField = section.querySelector("#options-field");
  const advancedField = section.querySelector("#advanced-field");
  const bgSelect = section.querySelector("#bg-select");
  const cancelBtn = section.querySelector("#cancel-node");
  let editingId = null;

  // fondos disponibles (vienen de la colección "backgrounds")
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

  function updateVisibleFields() {
    const t = typeSelect.value;
    nextField.hidden = !(t === "dialogue" || t === "event");
    optionsField.hidden = t !== "choice";
    advancedField.hidden = !(t === "condition" || t === "random");
  }
  typeSelect.addEventListener("change", updateVisibleFields);
  updateVisibleFields();

  cancelBtn.addEventListener("click", () => {
    editingId = null;
    form.reset();
    updateVisibleFields();
    cancelBtn.hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nodeId = form.elements.nodeId.value.trim();
    if (!nodeId) return alert("El ID del nodo es obligatorio");
    const data = {
      storyId: form.elements.storyId.value.trim(),
      type: typeSelect.value,
      character: form.elements.character.value.trim(),
      backgroundUrl: bgSelect.value,
      text: form.elements.text.value,
    };
    if (data.type === "dialogue" || data.type === "event") {
      data.next = form.elements.next.value.trim();
    }
    if (data.type === "choice") {
      const raw = form.elements.optionsRaw.value.trim();
      data.options = raw
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const [text, next, effectsRaw] = line.split("|").map((s) => s.trim());
          const option = { text, next };
          if (effectsRaw) {
            try {
              option.effects = JSON.parse(effectsRaw);
            } catch {
              // si no es JSON válido, se ignora el efecto pero no rompe el guardado
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
      // el ID del nodo ES el ID del documento, así main.js/story-engine.js
      // pueden seguir usando el mismo "next": "n010" tal cual. setDoc crea
      // el nodo si no existe o lo sobreescribe si ya existe (upsert).
      await setDoc(doc(db, "nodes", nodeId), data);
      form.reset();
      updateVisibleFields();
      editingId = null;
      cancelBtn.hidden = true;
    } catch (err) {
      alert("Error guardando el nodo: " + err.message);
    }
  });

  const tbody = section.querySelector("#tbody-nodes");
  onSnapshot(query(collection(db, "nodes")), (snap) => {
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${docSnap.id}</td>
        <td>${item.storyId || ""}</td>
        <td>${item.type || ""}</td>
        <td>${(item.text || "").slice(0, 60)}</td>
      `;
      const actionsTd = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        editingId = docSnap.id;
        form.elements.nodeId.value = docSnap.id;
        form.elements.storyId.value = item.storyId || "";
        typeSelect.value = item.type || "dialogue";
        form.elements.character.value = item.character || "";
        bgSelect.value = item.backgroundUrl || "";
        form.elements.text.value = item.text || "";
        form.elements.next.value = item.next || "";
        if (item.options) {
          form.elements.optionsRaw.value = item.options
            .map(
              (o) =>
                `${o.text} | ${o.next}` +
                (o.effects ? ` | ${JSON.stringify(o.effects)}` : "")
            )
            .join("\n");
        }
        if (item.checks) form.elements.advancedJson.value = JSON.stringify(item.checks, null, 2);
        if (item.outcomes) form.elements.advancedJson.value = JSON.stringify(item.outcomes, null, 2);
        updateVisibleFields();
        cancelBtn.hidden = false;
        form.scrollIntoView({ behavior: "smooth" });
      });
      const delBtn = document.createElement("button");
      delBtn.textContent = "Borrar";
      delBtn.className = "danger";
      delBtn.addEventListener("click", async () => {
        if (confirm(`¿Borrar el nodo ${docSnap.id}?`)) {
          await deleteDoc(doc(db, "nodes", docSnap.id));
        }
      });
      actionsTd.append(editBtn, delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  });

  return section;
}
