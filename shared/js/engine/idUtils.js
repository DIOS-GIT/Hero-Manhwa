/**
 * IDUTILS.JS (compartido)
 * -----------------------------------------------------------------------
 * generateUniqueId(prefijo) — genera IDs tipo "carta_lq3f8a2x9k1" que NO
 * pueden repetirse entre sesiones del admin.
 *
 * Por qué existe: antes cada editor (cartas, protagonistas, elementos,
 * historia, rutas) tenía su propio contador en memoria que arrancaba
 * en 1 cada vez que se cargaba la página. Si refrescabas el admin entre
 * una creación y otra, el próximo ID generado chocaba con uno viejo de
 * una sesión anterior — y como guardar es "si el ID ya existe,
 * actualízalo", la carta/protagonista/etc. nueva sobrescribía en
 * silencio a la que ya tenía ese ID. Este generador usa la hora actual
 * + un sufijo aleatorio, así que nunca se repite sin importar cuántas
 * veces se recargue la página.
 * -----------------------------------------------------------------------
 */
function generateUniqueId(prefijo) {
  const parteTiempo = Date.now().toString(36);
  const parteAzar = Math.random().toString(36).slice(2, 8);
  return `${prefijo}_${parteTiempo}${parteAzar}`;
}
