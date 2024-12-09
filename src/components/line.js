/**
 * @typedef {{
 *   line: SVGLineElement,
 *   dist: number,
 *   x1: number, x2: number,
 *   y1: number, y2: number,
 *   value: number,
 *   color?: string,
 *   board?: Board,
 *   input: {
 *     gate: Instance,
 *     node: number
 *   } | null,
 *   output: {
 *     gate: Instance,
 *     node: number
 *   } | null,
 *   parent: ConnectionLine | null,
 *   branches: ConnectionLine[],
 *   linkTo: (gate: Instance, node: number) => void,
 *   unlink: () => void,
 *   addToBoard: (board: Board) => void,
 *   removeBranch: (idx: number) => void,
 *   signal: (value: 0 | 1) => void,
 *   moveBranches: () => void,
 *   remove: () => void,
 * }} ConnectionLine
  */

/** @type {Set<ConnectionLine>} */
const lines = new Set();

/** @type {ConnectionLine} */
let drawingLine;

/**
 * @param {{gate: Instance, node: number} | null} input
 * @param {{gate: Instance, node: number} | null} output
 * @param {ConnectionLine | null} parent
 * @param {Board?} board
 * @returns {ConnectionLine}
 */
function createLineData(line, input=null, output=null, parent=null, board) {
  /** @type {ConnectionLine} */
  const data = {
    value: 0,
    dist: 0,
    
    line, input, output, parent, board,
    branches: [],

    linkTo(gate, node) {
      if (gate.input.lines[node] && gate.input.lines[node] != this) gate.input.unlinkNode(node);
      if (this.output && this.output.gate != gate) this.output.gate.input.unlinkNode(this.output.node);

      const nodeElem = gate.input.nodes[node];
      nodeElem.classList.toggle("on", !!this.value);
      
      const rect = nodeElem.getBoundingClientRect();
      this.x2 = rect.x + rect.width / 2;
      this.y2 = rect.y + rect.height / 2;

      gate.input.set(node, this.value);
      gate.input.lines[node] = this;
      this.output = { gate, node };
    },

    unlink(typ) {
      if (typ == "input" && this.output) {
        this.output.gate.input.unlinkNode(this.output.node, false);
        this.output = null;
      } else if (typ == "output" && this.input) {
        this.input.gate.output.unlinkNode(this.input.node, false);
        this.input = null;
      }

      if (!this.input && !this.parent) return this.remove();

      const farthestPoint = this.branches.sort((a, b) => b.dist - a.dist)[0];
      if (!farthestPoint) return this.remove();

      this.x2 = farthestPoint.x1;
      this.y2 = farthestPoint.y1;
      farthestPoint.dist = 1;
      this.moveBranches();
    },

    removeBranch(idx) {
      const branch = this.branches[idx];
      if (!branch) return;
      this.branches.splice(idx, 1);

      if (!this.output) {
        this.unlink();
      }
    },

    signal(value, color, force=false) {
      if (this.value == value && !force) return;
      
      debug$signals++;
      this.value = value;
      this.color = color;

      this.line.classList.toggle("on", !!value);
      this.line.style.color = color || null;

      for (const branch of this.branches) branch.signal(value, color, force);
      if (this.output) this.output.gate.input.set(this.output.node, value);
    },

    remove() {
      if (this.deleted) return console.warn(`tried to .remove() an already deleted line`);
      this.deleted = true;

      if (this.board) this.board.lines.delete(this);
      if (this.parent) {
        const idx = this.parent.branches.indexOf(this);
        if (idx > -1) this.parent.removeBranch(idx);
      } else if (this.input) {
        this.input.gate.output.unlinkNode(this.input.node, false, true);
        tickGate(this.input.gate);
      }

      if (this.output) {
        this.output.gate.input.unlinkNode(this.output.node, false);
        tickGate(this.output.gate);
      }

      for (const branch of this.branches) {
        branch.parent = branch.input = null;
        branch.remove();
      }
      
      lines.delete(this);
      selectedLines.delete(this);
      this.line.remove();
    },

    addToBoard(board) {
      if (this.board) this.board.lines.delete(this);
      
      this.board = board;
      this.board.lines.add(this);
      this.board.svg.append(this.line);
    },

    moveBranches() {
      if (!this.branches.length) return;

      const len = this.line.getTotalLength();
      for (const branch of this.branches) {
        const point = this.line.getPointAtLength(branch.dist * len);
        if (branch.x1 == point.x && branch.y1 == point.y) {
          continue;
        }
        
        branch.x1 = point.x;
        branch.y1 = point.y;

        if (branch.branches.length) branch.moveBranches(true);
      }
    },

    get x1() { return this.line.x1.baseVal.value },
    get y1() { return this.line.y1.baseVal.value },
    get x2() { return this.line.x2.baseVal.value },
    get y2() { return this.line.y2.baseVal.value },

    set x1(val) { this.line.setAttribute("x1", ~~val) },
    set y1(val) { this.line.setAttribute("y1", ~~val) },
    set x2(val) { this.line.setAttribute("x2", ~~val) },
    set y2(val) { this.line.setAttribute("y2", ~~val) },
  };

  if (board) {
    data.addToBoard(board);
  }

  if (parent) {
    data.color = parent.color;
    data.value = parent.value;
  } else if (input) {
    data.color = input.gate.color;
    data.value = input.gate.output.values[input.node];
  }
  
  data.line.style.color = data.color;
  data.line.classList.toggle("on", !!data.value);

  elementData.set(line, data);
  lines.add(data);
  
  return data;
}

/**
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @param {({ gate: Instance, node: number })?} input 
 * @param {({ gate: Instance, node: number })?} output 
 * @param {ConnectionLine} parent 
 * @param {boolean} virtual 
 * @param {Board?} board 
 */
function createLine(x1, y1, x2=x1, y2=y1, input=null, output=null, parent=null, virtual=false, board=undefined) {
  const elem = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const line = createLineData(elem, input, output, parent, board);

  elem.classList.add("line");
  
  line.x1 = x1; line.y1 = y1;
  line.x2 = x2; line.y2 = y2;

  if (!virtual) {
    currentBoard.svg.append(elem);
  }

  return line;
}

function startLineFromGate(elem, mx, my) {
  const gate = getData(elem);
  const idx = parseInt(elem.getAttribute("data-i"));
  const nodeRect = elem.getBoundingClientRect();

  if (gate.output.lines[idx]) {
    gate.output.unlinkNode(idx);
  }

  const line = createLine(
    nodeRect.x + nodeRect.width / 2,
    nodeRect.y + nodeRect.height / 2,
    undefined, undefined,
    { gate, node: idx },
    null, null, false,
    currentBoard
  );

  line.line.classList.add("drawing");
  gate.output.lines[idx] = line;
  drawingLine = line;

  lastMx = mx;
  lastMy = my;
}

/** @param {SVGLineElement} elem */
function startLineFromLine(elem, mx, my) {
  /** @type {ConnectionLine} */
  const parent = elementData.get(elem);
  elem.classList.remove("drawing");
  
  const branch = createLine(
    0, 0, 0, 0,
    null, null, parent, false,
    currentBoard
  );

  const totalLen = elem.getTotalLength();
  let shortestPoint = -1, shortestPointDist = Infinity;
  
  for (let i = 0; i < totalLen; i++) {
    const point = elem.getPointAtLength(i);
    const dist = Math.abs(point.x - mx) + Math.abs(point.y - my);
    if (dist < shortestPointDist) {
      shortestPointDist = dist;
      shortestPoint = i;
    }
  }
  
  const diff = totalLen - shortestPoint;
  const percent = diff < 15 ? 1 : shortestPoint / totalLen;

  const point = elem.getPointAtLength(percent * totalLen);
  
  branch.dist = percent;
  branch.x1 = branch.x2 = point.x;
  branch.y1 = branch.y2 = point.y;
  
  branch.line.classList.add("drawing");
  parent.branches.push(branch);
  drawingLine = branch;
}
