// ============================================================
// CONFIG DE FIREBASE — proyecto "juego-manhwa-18"
// ============================================================
// La apiKey que me pasaste NO es secreta (Firebase la expone en el
// cliente a propósito, la seguridad real la dan las Reglas de Firestore,
// no esta key). Lo que SÍ me falta son "appId" y "messagingSenderId":
// no son adivinables, están en:
//   Firebase Console > ⚙️ Configuración del proyecto > Tus apps
//   > selecciona la app web (o "Agregar app" > Web si no la creaste)
//   > copiá el bloque "firebaseConfig" completo y pegalo abajo.
export const firebaseConfig = {
  apiKey: "AIzaSyA9NfaGr-_-EylGxVd5c5_iYd6ITUnRLu0",
  authDomain: "juego-manhwa-18.firebaseapp.com",
  projectId: "juego-manhwa-18",
  storageBucket: "juego-manhwa-18.appspot.com",
  messagingSenderId: "COMPLETAR", // <-- pegar el número real
  appId: "COMPLETAR", // <-- pegar el appId real (formato 1:xxxx:web:xxxx)
};

// ============================================================
// CONFIG DE CLOUDINARY
// ============================================================
// La "apiKey" de Cloudinary (461885831879791) es para subidas FIRMADAS
// desde un backend — nunca debe vivir en JS público porque va siempre
// junto al "api secret". Para subir imágenes directo desde el admin
// (sin backend) se usa un "unsigned upload preset" en su lugar:
//   Cloudinary Console > Settings > Upload > Upload presets > Add preset
//   Signing mode: "Unsigned"  |  Folder: HERO MANHWA
// y pegás el nombre del preset abajo.
export const cloudinaryConfig = {
  cloudName: "dy66brku6",
  uploadPreset: "hero_manhwa_admin", // <-- nombre del preset "unsigned" que crees
  folder: "HERO MANHWA",
};

// ============================================================
// UIDs con permiso de administrador (además de la regla en Firestore,
// esto solo controla si el panel MUESTRA la interfaz; la seguridad real
// vive en firestore.rules, no acá).
// ============================================================
export const ADMIN_HINT =
  "El acceso real se valida contra la colección /admins/{uid} en Firestore.";
