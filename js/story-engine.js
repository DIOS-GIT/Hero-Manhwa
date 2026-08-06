/**
 * story-engine.js
 * -----------------------------------------------------------------------
 * El motor no sabe nada de UI ni de contenido: solo conoce nodos, stats,
 * flags y las reglas para pasar de un nodo a otro. Estructura (según el
 * diagrama): Story > Chapter > Scene > Node, pero el ID de cada Node es
 * ÚNICO en toda la historia — chapter/scene son solo metadatos para
 * organizar en el admin, no afectan cómo se conectan los nodos entre sí.
 *
 * Tipos de nodo soportados:
 *   - dialogue  : muestra texto de un personaje, sigue solo a `next`
 *   - choice    : el jugador elige entre `options[]`, cada opción puede
 *                 tener `effects` (cambios de stats), `flag` y `next`
 *   - event     : narrativa automática con `effects`, sigue a `next`
 *                 (no requiere decisión del jugador)
 *   - condition : evalúa `checks[]` en orden (stat/flag) y salta al
 *                 primer `next` que cumpla; si ninguno cumple usa
 *                 `fallbackNext`
 *   - random    : "ruleta" — pesa `outcomes[]` por `probability` (deben
 *                 sumar 100) y sortea uno, aplicando sus `effects`
 *   - chapter_end: no termina la partida — carga la Historia indicada en
 *                 `nextStoryId` y sigue con los mismos stats/flags,
 *                 desde el `startNode` de esa historia
 *   - ending    : final real de la partida, no hay vuelta atrás
 * -----------------------------------------------------------------------
 */

class StoryEngine {
  /**
   * @param {Object} nodes       mapa plano { [nodeId]: nodeObject }
   * @param {string} startNodeId nodo inicial
   * @param {Object} initialStats stats iniciales (ej. las del protagonista elegido)
   * @param {Set|Array} initialFlags flags iniciales (ej. ["ruta_ntr", "trabajo_universidad"])
   */
  constructor(nodes, startNodeId, initialStats = {}, initialFlags = []) {
    if (!nodes[startNodeId]) {
      throw new Error(`El nodo inicial "${startNodeId}" no existe en el mapa de nodos.`);
    }
    this.nodes = nodes;
    this.currentNodeId = startNodeId;
    this.stats = { ...initialStats };
    this.flags = new Set(initialFlags);
    this.history = [];
  }

  getCurrentNode() {
    return this.nodes[this.currentNodeId];
  }

  isEnding() {
    const node = this.getCurrentNode();
    return node.type === "ending";
  }

  applyEffects(effects = {}) {
    Object.entries(effects).forEach(([stat, delta]) => {
      // "afinidad" es especial: en vez de una stat plana, sube la afinidad
      // de TODAS las heroínas que el jugador tiene en esta partida puntual
      // (sembradas como afinidad_<heroinaId> al arrancar la historia) — así
      // los nodos no necesitan saber qué heroína le tocó a cada jugador.
      if (stat === "afinidad") {
        Object.keys(this.stats).forEach((k) => {
          if (k.startsWith("afinidad_")) this.stats[k] = (this.stats[k] || 0) + delta;
        });
        return;
      }
      this.stats[stat] = (this.stats[stat] || 0) + delta;
    });
  }

  addFlag(flag) {
    if (flag) this.flags.add(flag);
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  goTo(nodeId) {
    if (!this.nodes[nodeId]) {
      throw new Error(`El nodo "${nodeId}" no existe (referenciado desde "${this.currentNodeId}").`);
    }
    // guardamos una foto completa del estado ANTES de moverse, así el
    // rollback puede restaurar stats/flags tal cual estaban, no solo el ID.
    this.history.push({
      nodeId: this.currentNodeId,
      stats: { ...this.stats },
      flags: [...this.flags]
    });
    this.currentNodeId = nodeId;
  }

  canRollback() {
    return this.history.length > 0;
  }

  // vuelve un paso atrás en el diálogo, restaurando stats y flags a como
  // estaban en ese momento (equivalente al "rollback" de Ren'Py).
  rollback() {
    if (!this.canRollback()) return false;
    const prev = this.history.pop();
    this.currentNodeId = prev.nodeId;
    this.stats = { ...prev.stats };
    this.flags = new Set(prev.flags);
    return true;
  }

  // ---- resolución de "choice": la llama la UI cuando el jugador clickea ----
  choose(optionIndex) {
    const node = this.getCurrentNode();
    if (node.type !== "choice") throw new Error("choose() solo aplica a nodos tipo 'choice'.");
    const option = node.options[optionIndex];
    if (!option) throw new Error(`La opción ${optionIndex} no existe en el nodo "${this.currentNodeId}".`);
    if (option.effects) this.applyEffects(option.effects);
    if (option.flag) this.addFlag(option.flag);
    this.goTo(option.next);
    return option;
  }

  // cambia a los nodos de OTRA historia sin perder stats/flags — así una
  // "Historia" puede terminar y encadenar directo con la siguiente sin
  // volver a pasar por la reencarnación. El historial de rollback se
  // reinicia porque los nodos del capítulo anterior ya no están cargados.
  loadChapter(nodes, startNodeId) {
    if (!nodes[startNodeId]) {
      throw new Error(`El nodo inicial "${startNodeId}" no existe en el capítulo nuevo.`);
    }
    this.nodes = nodes;
    this.currentNodeId = startNodeId;
    this.history = [];
  }

  // ---- resolución automática: la llama la UI para dialogue/event/condition/random ----
  advance() {
    const node = this.getCurrentNode();
    switch (node.type) {
      case "dialogue":
        this.goTo(node.next);
        return { type: "dialogue" };

      case "event":
        if (node.effects) this.applyEffects(node.effects);
        this.goTo(node.next);
        return { type: "event", effects: node.effects };

      case "condition": {
        const next = this._resolveCondition(node);
        this.goTo(next);
        return { type: "condition", next };
      }

      case "random": {
        const outcome = this._resolveRandom(node);
        if (outcome.effects) this.applyEffects(outcome.effects);
        this.goTo(outcome.next);
        return { type: "random", outcome };
      }

      case "ending":
        return { type: "ending" };

      case "chapter_end":
        // el cambio de capítulo lo maneja la UI (main.js) llamando a
        // loadChapter(), no goTo() — acá solo evita que rompa si algo
        // llega a llamar advance() por error.
        return { type: "chapter_end" };

      default:
        throw new Error(`El nodo tipo "${node.type}" requiere choose(), no advance().`);
    }
  }

  _resolveCondition(node) {
    for (const branch of node.checks) {
      if (this._checkPasses(branch)) return branch.next;
    }
    if (!node.fallbackNext) throw new Error(`El nodo condition "${this.currentNodeId}" no tiene fallbackNext.`);
    return node.fallbackNext;
  }

  _checkPasses(branch) {
    if (branch.flag) {
      const wantsTrue = branch.equals !== false;
      return this.hasFlag(branch.flag) === wantsTrue;
    }
    const value = this.stats[branch.stat] || 0;
    switch (branch.operator) {
      case ">=": return value >= branch.value;
      case "<=": return value <= branch.value;
      case ">":  return value > branch.value;
      case "<":  return value < branch.value;
      case "==": return value === branch.value;
      default:   return false;
    }
  }

  _resolveRandom(node) {
    const total = node.outcomes.reduce((sum, o) => sum + o.probability, 0);
    if (Math.abs(total - 100) > 0.01) {
      console.warn(`Nodo random "${this.currentNodeId}": las probabilidades suman ${total}, no 100.`);
    }
    const roll = Math.random() * total;
    let acc = 0;
    for (const outcome of node.outcomes) {
      acc += outcome.probability;
      if (roll <= acc) return outcome;
    }
    return node.outcomes[node.outcomes.length - 1];
  }

  // ---- guardar / restaurar progreso (localStorage por ahora, Firestore después) ----
  serialize() {
    return {
      currentNodeId: this.currentNodeId,
      stats: this.stats,
      flags: [...this.flags],
      history: this.history
    };
  }

  static fromSerialized(nodes, saved) {
    const engine = new StoryEngine(nodes, saved.currentNodeId, saved.stats, saved.flags);
    engine.history = saved.history || [];
    return engine;
  }
}

window.StoryEngine = StoryEngine;
