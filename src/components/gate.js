/**
 * @typedef {{
 *   id: number,
 *   color?: string,
 *   type: GateType,
 *   interface: GateInterface,
 *   customGate?: CustomInstance,
 *   elem: HTMLDivElement,
 *   board?: Board,
 *   noRecalc?: boolean,
 *   input: InstanceIO,
 *   output: InstanceIO,
 *   x: number,
 *   y: number,
 *   update: (force?: boolean) => void,
 *   addToBoard: (board: Board) => void,
 *   remove: () => void,
 *   moveBy: (dx: number, dy: number) => void,
 *   moveToTop: () => void
 * }} Instance
 */

/** @type {Set<Instance>} */
const instances = new Set();

/** @param {GateType} type */
function createGate(type, x, y, virtual=false, select=false) {
  const elem = _("div.gate.instance");

  const inputNodes = _("div.io.i");
  const outputNodes = _("div.io.o");
  
  const container = _("div.gate-container", inputNodes, outputNodes);
  elem.append(container);
  
  const instance = createGateData(type, elem);
  const interface = type.create(instance);
  
  instance.interface = interface;
  instance.input.instance = instance;
  instance.output.instance = instance;
  
  instance.x = x;
  instance.y = y;
  
  instances.add(instance);
  elementData.set(elem, instance);
  
  if (interface.element) container.append(interface.element);
  else container.append(_("span", type.id));
  
  for (let i = 0; i < type.inputs; i++) {
    const node = _("span.node.inode", {"data-i": i});

    instance.input.nodes.push(node);
    inputNodes.append(node);
  }

  for (let i = 0; i < type.outputs; i++) {
    const node = _("span.node.onode", {"data-i": i});

    instance.output.nodes.push(node);
    outputNodes.append(node);
  }

  if (type.color) {
    container.style.setProperty("--color", type.color);
  }

  if (!virtual) {
    lastMx = x;
    lastMy = y;

    instance.addToBoard(currentBoard);
    if (select) {
      clearSelection();
      selectGate(instance);
      dragSelection = true;
    }
  }

  container.style.minHeight = Math.max(
    type.inputs * 12 + ((type.inputs - 1) * 8),
    type.outputs * 12 + ((type.outputs - 1) * 8)
  ) + 16 + "px";

  tickGate(instance);
  return instance;
}

/**
 * @param {GateType} type
 * @param {HTMLDivElement} elem
 * @param {Board?} board
 * @returns {Instance}
 */
function createGateData(type, elem, board) {
  let x = 0;
  let y = 0;
  let color = type.color;

  return {
    id: $instanceId++,
    type, elem, board,

    input: createIO(type.inputs, "input", !elem),
    output: createIO(type.outputs, "output", !elem),

    remove() {
      if (this.deleted) return console.warn(`tried to .remove() an already deleted gate`);
      
      this.deleted = true;
      instances.delete(this);
      if (this.board) this.board.gates.delete(this);

      if (this.elem) this.elem.remove();
      if (this.customGate) {
        this.customGate.gates.forEach((x) => x.remove());
        this.customGate.lines.forEach((x) => x.remove());
        this.customGate = null;
      }

      this.input.unlink();
      this.output.unlink();
      selectedGates.delete(this);
    },

    update(force=false) {
      if (this.noRecalc || this.deleted) return;

      const output = this.interface.fn(this.input.values);
      if (!output) return;

      for (let i = 0; i < output.length; i++) {
        this.output.set(i, output[i], force);
      }
    },

    addToBoard(board) {
      if (this.board) this.board.gates.delete(this);
      
      this.board = board;
      this.board.gates.add(this);
      this.board.board.append(this.elem);
    },

    moveBy(dx, dy) {
      this.x += dx;
      this.y += dy;
      
      this.input.lines.forEach((line, i) => {
        if (line) {
          const rect = this.input.nodes[i].getBoundingClientRect();

          line.x2 = rect.x + rect.width / 2;
          line.y2 = rect.y + rect.height / 2;

          line.moveBranches();
        }
      });

      this.output.lines.forEach((line, i) => {
        if (line) {
          const rect = this.output.nodes[i].getBoundingClientRect();

          line.x1 = rect.x + rect.width / 2;
          line.y1 = rect.y + rect.height / 2;

          line.moveBranches();
        }
      });
    },

    moveToTop() {
      if (this.elem.parentElement) {
        this.elem.parentElement.append(this.elem);
      }
    },

    get color() { return color },
    set color(clr) {
      color = clr;
      if (clr) this.elem.childNodes[0].style.setProperty("--color", clr);
      else this.elem.childNodes[0].style.removeProperty("--color");
    },

    get x() { return x },
    get y() { return y },
    set x(nx) {
      x = alignGrid(nx);
      elem.style.left = x + "px";
    },
    set y(ny) {
      y = alignGrid(ny);
      elem.style.top = y + "px";
    },
  }
}

/** @returns {Instance} */
function getData(elem) {
  if (elementData.has(elem)) return elementData.get(elem);
  else if (elem.parentElement) return getData(elem.parentElement);
}
