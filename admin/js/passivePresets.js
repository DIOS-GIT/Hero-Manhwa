/**
 * PASSIVEPRESETS.JS
 * -----------------------------------------------------------------------
 * Catálogo de pasivas listas para elegir en el editor de cartas del
 * admin (pestaña Cartas → Pasivas → "Elegir de la lista"), para no
 * tener que escribirlas desde cero cada vez.
 *
 * OJO — LIMITACIÓN IMPORTANTE: el motor de combate actual solo sabe
 * aplicar pasivas de una forma: "+X% a una stat, según en qué posición
 * de la formación esté la carta" (ver engine/statusEffects.js). Todavía
 * NO evalúa condiciones como "si tiene menos de 50% HP", efectos que
 * duran varios turnos, auras que afectan a todo el equipo, ni eventos
 * como "al derrotar a un enemigo".
 *
 * Por eso cada preset de acá trae:
 *   - descripcionOriginal: el texto completo de la pasiva tal como se
 *     pensó (para que quede documentado y el admin sepa la intención).
 *   - efectos: la aproximación más cercana que el motor SÍ puede
 *     aplicar hoy (uno o dos modificadores planos de stat). Algunas
 *     pasivas complejas quedan bastante simplificadas a propósito.
 * Cuando el motor de combate soporte condiciones/eventos, estos
 * presets son el lugar para ampliarlos sin tocar el editor.
 * -----------------------------------------------------------------------
 */

const PASSIVE_PRESETS = {
  tanque: [
    { nombre: "Muralla", descripcionOriginal: "Aumenta DEF un 10%.", efectos: [{ stat: "def", modificador: 0.1 }] },
    { nombre: "Piel de Piedra", descripcionOriginal: "Reduce un 8% el daño recibido.", efectos: [{ stat: "def", modificador: 0.08 }] },
    { nombre: "Protector", descripcionOriginal: "Los aliados reciben 5% menos daño mientras este personaje esté vivo (efecto de equipo, aproximado como DEF propia).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Último Bastión", descripcionOriginal: "Si tiene menos de 30% HP, obtiene +15% DEF (condición no evaluada, versión atenuada siempre activa).", efectos: [{ stat: "def", modificador: 0.08 }] },
    { nombre: "Fortaleza", descripcionOriginal: "Aumenta HP máximo un 12%.", efectos: [{ stat: "hp", modificador: 0.12 }] },
    { nombre: "Intercepción", descripcionOriginal: "La primera vez que un aliado recibe daño crítico, reduce ese daño 20% (efecto de equipo, aproximado como DEF propia).", efectos: [{ stat: "def", modificador: 0.06 }] },
    { nombre: "Peso Pesado", descripcionOriginal: "Si tiene más de 70% HP, obtiene +8% DEF (condición no evaluada, versión atenuada siempre activa).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Regeneración", descripcionOriginal: "Recupera 2% de su HP máximo al finalizar su turno (regeneración por turno no soportada, aproximado como HP máx).", efectos: [{ stat: "hp", modificador: 0.05 }] },
    { nombre: "Desafío", descripcionOriginal: "Los enemigos tienen mayor prioridad para atacar a este personaje (taunt no soportado por pasivas, aproximado como DEF).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Baluarte", descripcionOriginal: "Mientras tenga más de 50% HP, todos los aliados reciben 5% menos daño (efecto de equipo, aproximado como DEF propia).", efectos: [{ stat: "def", modificador: 0.06 }] },
  ],
  asesino: [
    { nombre: "Depredador", descripcionOriginal: "+10% ATQ contra enemigos con menos de 50% HP (condición de objetivo no evaluada).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Paso Sombrío", descripcionOriginal: "+10% VEL durante los primeros turnos.", efectos: [{ stat: "velocidad", modificador: 0.1 }] },
    { nombre: "Golpe Crítico", descripcionOriginal: "Aumenta ligeramente la probabilidad de crítico (sin sistema de crítico todavía, aproximado como ATQ).", efectos: [{ stat: "atk", modificador: 0.04 }] },
    { nombre: "Ejecución", descripcionOriginal: "+20% daño contra enemigos con menos de 25% HP (condición no evaluada, versión atenuada).", efectos: [{ stat: "atk", modificador: 0.1 }] },
    { nombre: "Emboscada", descripcionOriginal: "El primer ataque de combate obtiene +15% ATQ (aproximado como ATQ permanente atenuado).", efectos: [{ stat: "atk", modificador: 0.08 }] },
    { nombre: "Sangre Fría", descripcionOriginal: "+8% ATQ cuando ningún aliado ha sido derrotado (condición no evaluada).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Cazador", descripcionOriginal: "+10% daño contra enemigos por encima del 80% HP (condición de objetivo no evaluada).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Velocidad Letal", descripcionOriginal: "Si actúa antes que el objetivo, obtiene +8% daño (orden de turno no evaluado, aproximado como VEL).", efectos: [{ stat: "velocidad", modificador: 0.08 }] },
    { nombre: "Oportunista", descripcionOriginal: "+10% daño contra enemigos afectados por una debilitación (estado del enemigo no evaluado).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Último Golpe", descripcionOriginal: "Si un ataque deja al enemigo con poca vida, +10% VEL el siguiente turno (evento no evaluado).", efectos: [{ stat: "velocidad", modificador: 0.06 }] },
  ],
  dps: [
    { nombre: "Potencia", descripcionOriginal: "+10% ATQ.", efectos: [{ stat: "atk", modificador: 0.1 }] },
    { nombre: "Furia", descripcionOriginal: "+10% ATQ mientras tenga más del 70% HP (condición no evaluada, versión atenuada).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Asalto Continuo", descripcionOriginal: "Cada ataque consecutivo al mismo objetivo +3% daño, hasta 3 veces (stacking no soportado, versión plana).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Cañón de Cristal", descripcionOriginal: "+18% ATQ, pero -8% DEF.", efectos: [{ stat: "atk", modificador: 0.18 }, { stat: "def", modificador: -0.08 }] },
    { nombre: "Fuego Sostenido", descripcionOriginal: "+3% daño acumulativo por turno, hasta 4 veces (stacking no soportado, versión plana).", efectos: [{ stat: "atk", modificador: 0.08 }] },
    { nombre: "Perforador", descripcionOriginal: "Ignora 8% de la DEF del enemigo (penetración no soportada, aproximado como ATQ).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Adrenalina", descripcionOriginal: "+10% ATQ cuando tiene menos de 50% HP (condición no evaluada, versión atenuada).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Destructor", descripcionOriginal: "+12% daño contra enemigos con DEF alta (condición de objetivo no evaluada).", efectos: [{ stat: "atk", modificador: 0.07 }] },
    { nombre: "Combate Intenso", descripcionOriginal: "Tras derrotar a un enemigo, +8% ATQ el resto del combate (evento no evaluado).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Especialista", descripcionOriginal: "Aumenta 12% el daño de su tipo de ataque principal.", efectos: [{ stat: "atk", modificador: 0.1 }] },
  ],
  soporte: [
    { nombre: "Inspiración", descripcionOriginal: "Los aliados obtienen +5% ATQ (efecto de equipo, aproximado como stat propia).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Protección", descripcionOriginal: "Los aliados obtienen +5% DEF (efecto de equipo, aproximado como stat propia).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Motivación", descripcionOriginal: "Los aliados obtienen +5% VEL (efecto de equipo, aproximado como stat propia).", efectos: [{ stat: "velocidad", modificador: 0.05 }] },
    { nombre: "Sanador", descripcionOriginal: "Aumenta 15% la efectividad de las curaciones (modificador de curación no soportado, aproximado como HP).", efectos: [{ stat: "hp", modificador: 0.08 }] },
    { nombre: "Primeros Auxilios", descripcionOriginal: "Al inicio del combate, el aliado con menos HP recupera HP (evento de equipo, aproximado como HP propia).", efectos: [{ stat: "hp", modificador: 0.05 }] },
    { nombre: "Liderazgo", descripcionOriginal: "Mientras esté vivo, +5% todas las stats de los aliados (aura de equipo, aproximado como HP propia).", efectos: [{ stat: "hp", modificador: 0.05 }] },
    { nombre: "Resistencia Mental", descripcionOriginal: "Los aliados reciben 10% menos daño de efectos de control (efecto de equipo, aproximado como DEF propia).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Sacrificio", descripcionOriginal: "Cuando un aliado baja de 30% HP, esta carta obtiene +10% DEF temporal (condición de equipo no evaluada).", efectos: [{ stat: "def", modificador: 0.06 }] },
    { nombre: "Apoyo Rápido", descripcionOriginal: "+10% VEL al aliado con menor VEL (efecto de equipo, aproximado como VEL propia).", efectos: [{ stat: "velocidad", modificador: 0.06 }] },
    { nombre: "Esperanza", descripcionOriginal: "Cuando un aliado es derrotado, el resto obtiene +8% ATQ y +8% DEF (evento de equipo no evaluado).", efectos: [{ stat: "atk", modificador: 0.05 }] },
  ],
  controlador: [
    { nombre: "Mente Rápida", descripcionOriginal: "+10% VEL.", efectos: [{ stat: "velocidad", modificador: 0.1 }] },
    { nombre: "Manipulador", descripcionOriginal: "Los efectos de control duran 10% más (duración no soportada, aproximado como VEL).", efectos: [{ stat: "velocidad", modificador: 0.05 }] },
    { nombre: "Debilitador", descripcionOriginal: "Los enemigos con un efecto negativo reciben 5% más daño (estado del enemigo no evaluado).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Confusión", descripcionOriginal: "Los enemigos afectados por control tienen -10% ATQ (debuff al enemigo no soportado por esta pasiva).", efectos: [{ stat: "velocidad", modificador: 0.05 }] },
    { nombre: "Bloqueo", descripcionOriginal: "Los enemigos afectados por control tienen -10% VEL (debuff al enemigo no soportado por esta pasiva).", efectos: [{ stat: "velocidad", modificador: 0.05 }] },
    { nombre: "Dominio", descripcionOriginal: "+10% efectividad de los efectos de control (modificador de efectividad no soportado, aproximado como VEL).", efectos: [{ stat: "velocidad", modificador: 0.06 }] },
    { nombre: "Control Táctico", descripcionOriginal: "Si actúa antes que el objetivo, sus controles tienen +10% efectividad (orden de turno no evaluado).", efectos: [{ stat: "velocidad", modificador: 0.06 }] },
    { nombre: "Debilidad Expuesta", descripcionOriginal: "Los enemigos bajo un efecto negativo reciben +8% daño de los aliados (efecto de equipo no evaluado).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Interferencia", descripcionOriginal: "Reduce 8% la efectividad de las mejoras recibidas por enemigos (debuff al enemigo no soportado).", efectos: [{ stat: "def", modificador: 0.05 }] },
    { nombre: "Cadena de Control", descripcionOriginal: "Tras aplicar un control, el siguiente control de un aliado obtiene +10% efectividad (efecto de equipo no evaluado).", efectos: [{ stat: "velocidad", modificador: 0.05 }] },
  ],
  guerrero: [
    { nombre: "Combatiente", descripcionOriginal: "+6% ATQ y +6% DEF.", efectos: [{ stat: "atk", modificador: 0.06 }, { stat: "def", modificador: 0.06 }] },
    { nombre: "Veterano", descripcionOriginal: "+8% HP y +5% ATQ.", efectos: [{ stat: "hp", modificador: 0.08 }, { stat: "atk", modificador: 0.05 }] },
    { nombre: "Contraataque", descripcionOriginal: "Tras recibir daño, +8% ATQ el siguiente turno (evento no evaluado, versión atenuada permanente).", efectos: [{ stat: "atk", modificador: 0.05 }] },
    { nombre: "Tenacidad", descripcionOriginal: "Cuando tiene menos de 50% HP, recibe 10% menos daño (condición no evaluada, versión atenuada).", efectos: [{ stat: "def", modificador: 0.06 }] },
    { nombre: "Fuerza Bruta", descripcionOriginal: "+12% ATQ, pero -5% VEL.", efectos: [{ stat: "atk", modificador: 0.12 }, { stat: "velocidad", modificador: -0.05 }] },
    { nombre: "Guerrero Resistente", descripcionOriginal: "+10% HP y +5% DEF.", efectos: [{ stat: "hp", modificador: 0.1 }, { stat: "def", modificador: 0.05 }] },
    { nombre: "Sed de Batalla", descripcionOriginal: "+2% ATQ por golpe, hasta 5 veces (stacking no soportado, versión plana).", efectos: [{ stat: "atk", modificador: 0.06 }] },
    { nombre: "Equilibrio", descripcionOriginal: "Si ninguna estadística está muy baja, +5% a todas (condición no evaluada, se aplica a las 4 stats).", efectos: [{ stat: "hp", modificador: 0.05 }, { stat: "atk", modificador: 0.05 }, { stat: "def", modificador: 0.05 }, { stat: "velocidad", modificador: 0.05 }] },
    { nombre: "Superviviente", descripcionOriginal: "Cuando baja de 25% HP, recupera algo de HP una vez por combate (evento no evaluado, aproximado como HP máx).", efectos: [{ stat: "hp", modificador: 0.05 }] },
    { nombre: "Maestro de Batalla", descripcionOriginal: "Si tiene más HP que el enemigo +8% ATQ; si tiene menos, +8% DEF (condición de comparación no evaluada, se prioriza ATQ).", efectos: [{ stat: "atk", modificador: 0.06 }] },
  ],
};
