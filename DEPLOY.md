# Subir Hero-Manhwa a internet — GitHub Pages + Firebase + Cloudinary

Esta guía asume que **no tienes nada creado todavía** en ninguno de los tres
servicios. Todos son gratis en el nivel que este juego necesita (plan
"Spark" de Firebase, plan free de Cloudinary, GitHub Pages es gratis para
repos públicos).

El juego funciona sin tocar nada de esto — sigue guardando todo en
`localStorage` como hasta ahora — así que puedes ir paso por paso sin
romper lo que ya tienes.

---

## 1. Firebase (base de datos — Firestore)

1. Andá a https://console.firebase.google.com/ y creá un proyecto nuevo
   (nombre libre, ej. `hero-manhwa`). Podés desactivar Google Analytics,
   no hace falta.
2. En el menú lateral: **Compilación → Firestore Database → Crear base de
   datos**. Elegí "modo de producción" y la ubicación que te quede más
   cerca (ej. `southamerica-east1`).
3. Pestaña **Reglas** de Firestore, y pegá esto (deja leer/escribir a
   cualquiera con sesión anónima — es lo que este juego usa, no hay
   passwords que proteger):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /gamedata/{doc} {
         allow read, write: if request.auth != null;
       }
       match /players/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   (Esto deja que cualquiera que abra el juego pueda LEER y ESCRIBIR
   `gamedata` — incluido, en teoría, editar cartas desde la consola del
   navegador. Para un proyecto de prueba/comunidad chica está bien; si
   más adelante querés que solo vos puedas escribir `gamedata`, avisame
   y lo cambiamos a un login de administrador real en vez de anónimo.)
4. Menú lateral: **Compilación → Authentication → Comenzar → Anónimo →
   Habilitar**. No hace falta ningún otro proveedor.
5. Ícono de engranaje → **Configuración del proyecto** → bajá hasta "Tus
   apps" → ícono `</>` (Web) → registrá una app (nombre libre). Te va a
   mostrar un bloque `firebaseConfig = {...}`.
6. Copiá esos valores en **`shared/js/firebaseConfig.js`**, reemplazando
   los `"TU_..."`.

Con eso, el juego y el admin ya se conectan solos a Firestore (verás en
la consola del navegador `[Firebase] Conectado.`).

---

## 2. Cloudinary (imágenes)

1. Ya tenés cuenta en https://cloudinary.com — entrá al **Dashboard**,
   ahí arriba dice tu **Cloud name**. Copialo.
2. Configuración (ícono de engranaje) → **Upload** → bajá hasta
   **Upload presets** → **Add upload preset**.
   - **Signing Mode: Unsigned** (importante — sin esto no funciona desde
     el navegador sin servidor propio).
   - Guardá y copiá el **nombre del preset** que le pusiste.
3. Pegá ambos valores en **`shared/js/cloudinaryConfig.js`**.

Con eso, cuando subas una imagen de carta o protagonista desde el admin,
en vez de guardarse comprimida en el navegador se sube a Cloudinary y se
guarda la URL — así las imágenes no ocupan espacio en Firestore ni
dependen de tu navegador.

---

## 3. GitHub Pages (hosting)

1. Creá un repo en GitHub (público, para que Pages sea gratis) y subí
   esta carpeta completa (`card-game-offline/`) — el `index.html` de la
   raíz debe quedar en la raíz del repo, no dentro de una subcarpeta.
2. En el repo: **Settings → Pages → Source: Deploy from a branch →
   Branch: main / (root)** → Guardar.
3. En un par de minutos tu juego queda en
   `https://TU-USUARIO.github.io/TU-REPO/`.

No hay build ni instalación de nada — es HTML/CSS/JS puro, así que subir
los archivos tal cual ya es "compilar".

---

## Cómo verificar que todo quedó bien conectado

1. Abrí el juego en el navegador y mirá la consola (F12 → Console).
   Deberías ver `[Firebase] Conectado. UID anónimo: ...` en vez del
   aviso de "sin configurar".
2. Entrá al admin, editá o creá una carta con imagen. La imagen debería
   subirse a Cloudinary (se ve un dominio `res.cloudinary.com` en la URL
   que queda guardada).
3. Abrí el juego en OTRO navegador (o en modo incógnito): debería
   arrancar sin colección ni monedas — es un jugador nuevo con su propio
   progreso, pero viendo las MISMAS cartas que definiste en el admin
   (eso confirma que `gamedata` ya se comparte por la nube).
4. Jugá un rato, cerrá esa pestaña, volvé a abrir el juego: tu progreso
   debería seguir ahí (confirma que `players/{uid}` también persiste).

## Qué falta para el siguiente paso (cuando quieras)

- Ahora mismo cualquiera con el link puede escribir en `gamedata` desde
  la consola del navegador (ver nota del paso 1.3). Si vas a compartir
  el link ampliamente, conviene pasar a un login de administrador real
  para el panel admin en vez de dejarlo abierto.
- El admin sigue siendo una página sin login — cualquiera que sepa la
  URL `/admin/index.html` puede editar cartas. Si querés, en un próximo
  paso le agregamos un login simple (email/contraseña de Firebase Auth)
  solo para esa sección.
