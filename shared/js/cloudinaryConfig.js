/**
 * CLOUDINARYCONFIG.JS
 * -----------------------------------------------------------------------
 * Pega aquí tu "Cloud name" de Cloudinary y el nombre de un Upload
 * preset SIN FIRMAR (unsigned) — es necesario porque este juego no
 * tiene servidor propio, así que la subida se hace directo desde el
 * navegador con estos dos datos públicos.
 *
 * Mientras tengan los valores "TU_..." de ejemplo, el admin sube las
 * imágenes igual que antes (guardadas localmente, comprimidas) para
 * que puedas seguir probando sin Cloudinary configurado todavía.
 *
 * Ver DEPLOY.md para el paso a paso (crear el upload preset unsigned).
 * -----------------------------------------------------------------------
 */

const CLOUDINARY_CONFIG = {
  cloudName: "TU_CLOUD_NAME",
  uploadPreset: "TU_UPLOAD_PRESET_UNSIGNED",
};
