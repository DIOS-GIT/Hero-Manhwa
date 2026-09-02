/**
 * RULESEDITOR.JS
 * -----------------------------------------------------------------------
 * Formulario para editar todos los números de balance definidos en
 * js/data/rules-default.js (energía, formación, defender, proteger,
 * turnos, muerte). Cambiarlos aquí afecta inmediatamente a cualquier
 * combate de prueba nuevo que inicies.
 * -----------------------------------------------------------------------
 */

function renderRulesEditorView() {
  const container = document.getElementById("view-reglas");
  const r = GameData.reglas;

  container.innerHTML = `
    <form id="form-reglas" class="rulesform">
      <fieldset>
        <legend>Formación</legend>
        <label>Cambios de formación gratis por turno
          <input type="number" name="formacion.cambiosGratisPorTurno" value="${r.formacion.cambiosGratisPorTurno}" min="0" />
        </label>
        <label>Costo en energía de un cambio extra
          <input type="number" name="formacion.costoCambioExtra" value="${r.formacion.costoCambioExtra}" min="0" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Energía</legend>
        <label>Tope máximo
          <input type="number" name="energia.maximo" value="${r.energia.maximo}" min="1" />
        </label>
        <label>Generación base al iniciar un turno
          <input type="number" name="energia.generacionBasePorTurno" value="${r.energia.generacionBasePorTurno}" min="0" />
        </label>
        <label>Energía extra al recibir daño
          <input type="number" name="energia.energiaPorRecibirDano" value="${r.energia.energiaPorRecibirDano}" min="0" />
        </label>
        <label>Energía extra al atacar
          <input type="number" name="energia.energiaPorAtacar" value="${r.energia.energiaPorAtacar}" min="0" />
        </label>
        <label>Costo de saltarse la primera línea
          <input type="number" name="energia.costoSaltarPrimeraLinea" value="${r.energia.costoSaltarPrimeraLinea}" min="0" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Defender</legend>
        <label>Reducción de daño (0.5 = 50%)
          <input type="number" name="defender.reduccionDano" value="${r.defender.reduccionDano}" step="0.01" min="0" max="1" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Proteger / Taunt</legend>
        <label>% de daño redirigido
          <input type="number" name="proteger.porcentajeRedireccion" value="${r.proteger.porcentajeRedireccion}" step="0.01" min="0" max="1" />
        </label>
        <label>Probabilidad de fallo (0.1 = 10%)
          <input type="number" name="proteger.probabilidadFallo" value="${r.proteger.probabilidadFallo}" step="0.01" min="0" max="1" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Turnos</legend>
        <label>Umbral de la barra de acción
          <input type="number" name="turnos.umbralAccion" value="${r.turnos.umbralAccion}" min="10" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Muerte y revivir</legend>
        <label class="checkbox-label">
          <input type="checkbox" name="muerte.reordenarAlCaerPrimeraLinea" ${r.muerte.reordenarAlCaerPrimeraLinea ? "checked" : ""} />
          Reordenar formación automáticamente al caer la Carta 1
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="muerte.revivirEnCombate" ${r.muerte.revivirEnCombate ? "checked" : ""} />
          Permitir revivir durante el combate
        </label>
        <label>Costo de revivir entre combates (monedas, opcional)
          <input type="number" name="muerte.costoRevivirMonedas" value="${r.muerte.costoRevivirMonedas ?? ""}" min="0" placeholder="sin definir todavía" />
        </label>
      </fieldset>

      <div class="rulesform__acciones">
        <button type="submit" class="btn">Guardar reglas</button>
        <button type="button" class="btn btn--secundario" id="btn-restaurar-reglas">Restaurar valores por defecto</button>
      </div>
    </form>
  `;

  document.getElementById("form-reglas").addEventListener("submit", (e) => {
    e.preventDefault();
    saveRulesFromForm(e.target);
  });

  document.getElementById("btn-restaurar-reglas").addEventListener("click", () => {
    if (!confirm("¿Restaurar todas las reglas a los valores de fábrica?")) return;
    resetRulesToDefault();
    renderRulesEditorView();
  });
}

function saveRulesFromForm(form) {
  const r = GameData.reglas;
  const getNum = (path) => Number(form.elements[path].value);
  const getChecked = (path) => form.elements[path].checked;

  r.formacion.cambiosGratisPorTurno = getNum("formacion.cambiosGratisPorTurno");
  r.formacion.costoCambioExtra = getNum("formacion.costoCambioExtra");

  r.energia.maximo = getNum("energia.maximo");
  r.energia.generacionBasePorTurno = getNum("energia.generacionBasePorTurno");
  r.energia.energiaPorRecibirDano = getNum("energia.energiaPorRecibirDano");
  r.energia.energiaPorAtacar = getNum("energia.energiaPorAtacar");
  r.energia.costoSaltarPrimeraLinea = getNum("energia.costoSaltarPrimeraLinea");

  r.defender.reduccionDano = getNum("defender.reduccionDano");

  r.proteger.porcentajeRedireccion = getNum("proteger.porcentajeRedireccion");
  r.proteger.probabilidadFallo = getNum("proteger.probabilidadFallo");

  r.turnos.umbralAccion = getNum("turnos.umbralAccion");

  r.muerte.reordenarAlCaerPrimeraLinea = getChecked("muerte.reordenarAlCaerPrimeraLinea");
  r.muerte.revivirEnCombate = getChecked("muerte.revivirEnCombate");
  const costoRevivir = form.elements["muerte.costoRevivirMonedas"].value;
  r.muerte.costoRevivirMonedas = costoRevivir === "" ? null : Number(costoRevivir);

  saveGameData();
  alert("Reglas guardadas.");
}
