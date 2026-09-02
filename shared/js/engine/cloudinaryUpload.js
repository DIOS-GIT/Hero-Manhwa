/**
 * CLOUDINARYUPLOAD.JS
 * -----------------------------------------------------------------------
 * Sube un archivo de imagen directo desde el navegador a Cloudinary
 * usando un "unsigned upload preset" (no requiere servidor propio ni
 * exponer ninguna clave secreta). Devuelve la URL pública (secure_url)
 * para guardarla en el campo `imagen` de la carta/protagonista, tal
 * como antes se guardaba el base64.
 * -----------------------------------------------------------------------
 */

function isCloudinaryConfigured() {
  return (
    typeof CLOUDINARY_CONFIG !== "undefined" &&
    CLOUDINARY_CONFIG.cloudName &&
    !CLOUDINARY_CONFIG.cloudName.startsWith("TU_") &&
    CLOUDINARY_CONFIG.uploadPreset &&
    !CLOUDINARY_CONFIG.uploadPreset.startsWith("TU_")
  );
}

function uploadImageToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo elegido no es una imagen."));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Cloudinary respondió con un error (revisa el cloud name y el upload preset).");
        return res.json();
      })
      .then((data) => resolve(data.secure_url))
      .catch(reject);
  });
}

/**
 * Punto único que usa el admin: si Cloudinary está configurado, sube
 * ahí y guarda la URL; si todavía no lo configuraste, cae de vuelta al
 * comportamiento anterior (imagen local comprimida en base64) para que
 * puedas seguir probando sin cortarte.
 */
async function uploadCardImage(file) {
  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinary(file);
  }
  console.warn("[Cloudinary] Sin configurar todavía (shared/js/cloudinaryConfig.js) — se guarda la imagen localmente por ahora. Ver DEPLOY.md.");
  return readAndResizeImageFile(file);
}
