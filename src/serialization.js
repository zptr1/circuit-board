/**
 * @typedef {{
 *   types: Record<string, SerializedData>,
 *   gates: {
 *     type: string, color?: string, x: number, y: number,
 *     input: { values: (0 | 1)[], lines: number[] },
 *     output: { values: (0 | 1)[], lines: number[] }
 *   }[],
 *   lines: {
 *     idx: number,
 *     value: 0 | 1,
 *     dist?: number,
 *     x1: number, y1: number,
 *     x2: number, y2: number,
 *     branches: number[],
 *     parent: number
 *   }[],
 *   inputCount: number,
 *   outputCount: number
 * }} SerializedData
  */

/**
 * @typedef {{
 *   id: number,
 *   gates: Instance[],
 *   lines: ConnectionLine[],
 *   input: {
 *     gate: Instance, idx: number,
 *     get: () => 0 | 1,
 *     set: (val: 0 | 1, force?: boolean) => void
 *   }[],
 *   output: {
 *     gate: Instance, idx: number,
 *     get: () => 0 | 1,
 *     set: (val: 0 | 1, force?: boolean) => void
 *   }[],
 *   addToBoard: (board: Board) => void,
 *   selectAll: () => void
 * }} CustomInstance
 */

/** @param {ConnectionLine} line */
function serializeLine(line, out, minX, minY) {
  if (out.has(line)) return;

  const idx = out.size;
  const data = {
    idx,
    dist: line.dist ?? undefined,
    
    x1: line.x1 - minX, y1: line.y1 - minY,
    x2: line.x2 - minX, y2: line.y2 - minY,
  };

  out.set(line, data);
  
  if (line.branches.length) {
    data.branches = line.branches.map(
      (branch) => out.get(branch)?.idx ?? serializeLine(branch, out, minX, minY)
    );
  }

  if (line.parent) {
    data.parent = out.get(line.parent)?.idx ?? serializeLine(line.parent, out, minX, minY);
  }

  return idx;
}

/** @param {InstanceIO} io */
function serializeIO(io, lines) {
  return {
    values: io.values.map((x) => x ? 1 : 0),
    lines: io.lines.map((x) => x ? lines.get(x)?.idx ?? -1 : -1)
  }
}

/** @param {SerializedData} data */
function extractCustomTypes(id, data, target) {
  target[id] = { ...data, types: undefined };

  for (const id in data.types) {
    if (!target[id]) extractCustomTypes(id, data.types[id], target);
  }
  
  for (const gate of data.gates) {
    const type = GATE_TYPES.find((x) => x.id == gate.type);
    if (type.customGate && !target[type.id]) {
      extractCustomTypes(type.id, type.customGate, target);
    }
  }
}

/**
 * @param {Instance[]} gates
 * @param {ConnectionLine[]} lines
 * @param {boolean} includeCustomTypes
 * @returns {SerializedData}
 */
function serialize(gates, lines, includeCustomTypes=false, removeUnneeded=false, includeCustomTypeValues=false) {
  const [minX, minY] = findMinPos(gates, lines);

  const outGates = [];
  const outLines = new Map();
  const customTypes = {};

  let inputCount = 0;
  let outputCount = 0;

  for (const line of lines) serializeLine(line, outLines, minX, minY);
  for (const gate of gates) {
    if (removeUnneeded && !gate.input.lines.some((x) => !!x) && !gate.output.lines.some((x) => !!x)) {
      continue;
    }

    if (gate.type.isInput) inputCount += gate.type.outputs;
    if (gate.type.isOutput) outputCount += gate.type.inputs;

    if (includeCustomTypes && gate.type.customGate && !customTypes[gate.type.id]) {
      extractCustomTypes(gate.type.id, gate.type.customGate, customTypes);
    }

    outGates.push({
      type: gate.type.id,
      color: gate.color == gate.type.color ? undefined : gate.color,
      x: gate.x - minX, y: gate.y - minY,

      input: serializeIO(gate.input, outLines),
      output: serializeIO(gate.output, outLines)
    });
  }

  const outLineArray = [];
  for (const line of outLines.values()) {
    const idx = line.idx;
    line.idx = undefined;
    outLineArray[idx] = line;
  }
  
  outGates.sort((a, b) => a.y - b.y || a.x - b.x);
  
  return {
    types: includeCustomTypes ? customTypes : undefined,
    gates: outGates,
    lines: outLineArray,
    inputCount, outputCount
  };
}

////////////////////////////////////////////

/**
 * @param {SerializedData["lines"]} lines
 * @param {number} idx
 * @param {ConnectionLine[]} out
 */
function deserializeLine(lines, idx, out, addedLines, xOffset, yOffset, virtual, loadValues) {
  const sLine = lines[idx];

  if (addedLines.has(sLine)) return;
  addedLines.add(sLine);

  const hasParent = typeof sLine.parent == "number";
  if (hasParent && !out[sLine.parent]) {
    deserializeLine(lines, sLine.parent, out, addedLines, xOffset, yOffset, virtual);
  }

  const line = createLine(
    sLine.x1 + xOffset, sLine.y1 + yOffset,
    sLine.x2 + xOffset, sLine.y2 + yOffset,
    null, null,
    hasParent ? out[sLine.parent] : null,
    virtual
  );

  if (hasParent) out[sLine.parent].branches.push(line);
  line.dist = sLine.dist;

  out[idx] = line;
}

/**
 * @param {SerializedData} data
 * @param {Instance | null} replaceIO
 * @returns {CustomInstance}
 */
function deserialize(data, xOffset=0, yOffset=0, virtual=false, loadValues=true, replaceIO=null) {
  /** @type {ConnectionLine[]} */
  const lines = [];
  
  const input = [];
  const output = [];
  
  const addedGates = [];
  const addedLines = new Set();

  for (let i = 0; i < data.lines.length; i++) {
    deserializeLine(data.lines, i, lines, addedLines, xOffset, yOffset, virtual, loadValues);
  }

  data.gates.sort((a, b) => a.y - b.y || a.x - b.x);
  let i = 0;

  for (const sGate of data.gates) {
    const type = GATE_TYPES.find((x) => x.id == sGate.type);
    if (!type && !data.types[sGate.type]) {
      throw new Error(`unknown gate type \`${sGate.type}\``);
    }

    const gate = createGate(
      type || data.types[sGate.type],
      sGate.x + xOffset, sGate.y + yOffset,
      virtual
    );

    if (replaceIO)
    if (gate.type.isInput) {
      gate.noRecalc = true;
      for (let idx = 0; idx < gate.type.outputs; idx++) {
        sGate.output.values[idx] = 0;
        input.push({
          gate, idx,
          get: () => gate.output.values[idx],
          set: (value, force=false) => gate.output.set(idx, value, force)
        });
      }
    } else if (gate.type.isOutput) {
      gate.noRecalc = true;
      gate.input.instance = replaceIO;
      for (let idx = 0; idx < gate.type.inputs; idx++) {
        sGate.input.values[idx] = 0;
        output.push({
          gate, idx,
          get: () => gate.input.values[idx],
          set: (value, force=false) => gate.input.set(idx, value, force)
        });
      }
    }

    for (let i = 0; i < gate.type.inputs; i++) {
      const line = sGate.input.lines[i];
      if (line >= 0) {
        lines[line].output = { gate, node: i };
        gate.input.lines[i] = lines[line];
        loadValues && gate.input.set(i, sGate.input.values[i], true);
      }
    }

    for (let i = 0; i < gate.type.outputs; i++) {
      const line = sGate.output.lines[i];
      
      if (line >= 0) {
        lines[line].input = { gate, node: i };
        gate.output.lines[i] = lines[line];
      }

      if (loadValues && (line >= 0 || gate.type.isInput)) {
        gate.output.set(i, sGate.output.values[i], true);
      }
    }

    addedGates.push(gate);
  }

  addedLines.clear();
  return {
    gates: addedGates, lines,
    input, output,
    
    /** @param {Board} board */
    addToBoard(board) {
      this.gates.forEach((x) => x.addToBoard(board));
      this.lines.forEach((x) => x.addToBoard(board));
    },

    selectAll() {
      for (const gate of this.gates) selectGate(gate);
      for (const line of this.lines) selectLineRecursively(line, false);
    }
  };
}

////////////////////////////////////////////

function saveBoard() {
  return JSON.stringify(mainBoard.serialize(false, false));
}

function saveTypes() {
  const types = [];
  for (const type of GATE_TYPES) {
    if (type.customGate) {
      types.push({
        id: type.id,
        color: type.color,
        ...type.customGate,
      });
    }
  }

  return JSON.stringify(types);
}

function save() {
  localStorage.setItem("board", saveBoard());
  localStorage.setItem("types", saveTypes());
}

function load() {
  const types = JSON.parse(localStorage.getItem("types"));
  const board = JSON.parse(localStorage.getItem("board"));
  
  if (types) {
    for (const type of GATE_TYPES) {
      if (type.customGate) GATE_TYPES.splice(GATE_TYPES.indexOf(type), 1);
    }
  
    for (const typ of types) {
      const type = createCustomType(typ.id, typ.color, typ);
      GATE_TYPES.push(type);
      addGateType(type);
    }
  }

  if (board) {
    boards.forEach((x) => x.remove(true));
    mainBoard.show();
    mainBoard.clear(true);
    updateNavbar();
    
    const [w, h] = findMaxPos(board.gates, board.lines);
    mainBoard.load(
      board,
      alignGrid(window.innerWidth / 2 - w / 2),
      alignGrid(window.innerHeight / 2 - h / 2),
      true
    );
  }
}

setTimeout(load, 10);
setInterval(save, 5000);

////////////////////////////////////////////
