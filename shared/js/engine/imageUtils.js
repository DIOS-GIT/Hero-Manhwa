/**
 * IMAGEUTILS.JS
 * -----------------------------------------------------------------------
 * Como el juego corre 100% local (sin servidor), no hay forma de que el
 * navegador "suba" un archivo a una carpeta del proyecto — por seguridad,
 * ninguna página web puede escribir en el disco. La solución práctica
 * para una app offline de un solo archivo HTML es: leer la imagen que
 * el usuario elige, comprimirla, y guardarla como texto base64 DENTRO
 * de los datos del juego (el mismo JSON que ya se guarda en
 * localStorage y se exporta/importa desde "Admin: Datos").
 *
 * Por qué se comprime: tus artes vienen grandes (ej. 1024×1536). Sin
 * comprimir, unas pocas decenas de cartas llenarían el límite de
 * localStorage del navegador (~5-10 MB). Por eso toda imagen se
 * redimensiona a un ancho máximo antes de guardarse.
 *
 * Esto reemplaza al campo de texto "nombre de archivo" que había antes
 * — ya no hace falta escribir un nombre de archivo ni copiar nada a
 * mano en shared/assets/cards/.
 * -----------------------------------------------------------------------
 */

const IMAGE_UPLOAD_CONFIG = {
  anchoMaximoPx: 480, // suficiente para verse nítido en carta y colección
  calidadJPEG: 0.85,
};

/**
 * Lee un File (de un <input type="file">), lo redimensiona con un
 * <canvas> si hace falta, y devuelve una Promise con el resultado en
 * base64 (string listo para usar directo en un atributo src="").
 */
function readAndResizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo elegido no es una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const maxW = IMAGE_UPLOAD_CONFIG.anchoMaximoPx;
        const escala = img.width > maxW ? maxW / img.width : 1;
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/jpeg", IMAGE_UPLOAD_CONFIG.calidadJPEG));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** true si el valor guardado en `imagen` es una imagen ya cargada (base64), no un nombre de archivo suelto. */
function isUploadedImage(imagen) {
  return typeof imagen === "string" && imagen.startsWith("data:image");
}
