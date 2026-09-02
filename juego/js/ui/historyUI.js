/**
 * HISTORYUI.JS
 * -----------------------------------------------------------------------
 * Historial detallado por RUN COMPLETA (no por combate suelto), tal
 * como se definió: resultado, nodos alcanzados, cartas usadas, cartas
 * caídas durante esa run, y daño total hecho.
 * -----------------------------------------------------------------------
 */

function renderHistoryView() {
  const container = document.getElementById("view-historial");

  if (PlayerData.historial.length === 0) {
    container.innerHTML = `${renderScreenHeader("Historial", "hub")}<p class="empty-hint">Todavía no has completado ninguna run.</p>`;
    attachScreenHeaderEvents(container);
    return;
  }

  container.innerHTML = `
    ${renderScreenHeader("Historial", "hub")}
    <div class="history">
      ${PlayerData.historial.map(renderHistoryEntry).join("")}
    </div>
  `;
  attachScreenHeaderEvents(container);
}

function renderHistoryEntry(entry) {
  const fecha = new Date(entry.fecha).toLocaleString();
  return `
    <div class="historyentry historyentry--${entry.resultado}">
      <div class="historyentry__header">
        <strong>${entry.resultado === "victoria" ? "Victoria" : "Derrota"}</strong>
        <span>${fecha}</span>
      </div>
      <div class="historyentry__body">
        <p>Nodos alcanzados: ${entry.nodosAlcanzados}</p>
        <p>Daño total hecho: ${entry.danoTotalHecho}</p>
        <p>Cartas usadas: ${entry.cartasUsadas.join(", ")}</p>
        ${entry.cartasCaidasEnRun.length > 0 ? `<p>Cartas caídas en esta run: ${entry.cartasCaidasEnRun.join(", ")}</p>` : ""}
      </div>
    </div>
  `;
}
