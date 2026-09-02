/**
 * DATAPANEL.JS
 * -----------------------------------------------------------------------
 * Exportar descarga un .json con TODAS tus cartas y reglas actuales —
 * ese es el archivo que le puedes compartir a Claude en una sesión
 * futura para que retome exactamente donde quedaste.
 *
 * Importar reemplaza los datos actuales por los de un archivo
 * exportado antes (por ejemplo, si cambias de computador).
 * -----------------------------------------------------------------------
 */

function renderDataPanelView() {
  const container = document.getElementById("view-datos");
  container.innerHTML = `
    <div class="datapanel">
      <div class="datapanel__bloque">
        <h3>Exportar</h3>
        <p>Descarga un archivo con todas tus cartas y reglas actuales. Es el archivo que le puedes compartir a Claude para que entienda tus pruebas en la próxima sesión.</p>
        <button class="btn" id="btn-exportar-datos">Descargar datos (.json)</button>
      </div>
      <div class="datapanel__bloque">
        <h3>Importar</h3>
        <p>Carga un archivo exportado antes. Esto reemplaza las cartas y reglas actuales.</p>
        <input type="file" id="input-importar-datos" accept="application/json" />
      </div>
      <div class="datapanel__bloque datapanel__bloque--peligro">
        <h3>Reiniciar</h3>
        <p>Borra todo lo guardado en este navegador y vuelve a las cartas y reglas de fábrica (las que vienen en los archivos js/data/cards-*.js).</p>
        <button class="btn btn--peligro" id="btn-reiniciar-datos">Reiniciar a valores de fábrica</button>
      </div>
    </div>
  `;

  document.getElementById("btn-exportar-datos").addEventListener("click", () => {
    exportGameDataToFile();
  });

  document.getElementById("input-importar-datos").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importGameDataFromFile(file);
      alert("Datos importados correctamente.");
      refreshAllAdminViews();
    } catch (err) {
      alert("No se pudo leer ese archivo. ¿Seguro que es un export válido de este juego?");
    }
  });

  document.getElementById("btn-reiniciar-datos").addEventListener("click", async () => {
    if (!confirm("Esto borra tus cartas y reglas guardadas en este navegador. ¿Continuar?")) return;
    localStorage.removeItem(STORAGE_KEY);
    await initGameData();
    refreshAllAdminViews();
  });
}
