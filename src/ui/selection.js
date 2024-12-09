let dragSelection = false;

let selectAreaStart;
let selectAreaElem;

/** @type {Set<Instance>} */
const selectedGates = new Set();
/** @type {Set<ConnectionLine>} */
const selectedLines = new Set();

function clearSelection() {
  selectedGates.forEach((x) => x.elem.classList.remove("selected"));
  selectedLines.forEach((x) => x.line.classList.remove("selected"));

  selectedGates.clear();
  selectedLines.clear();
}

/** @param {Instance} gate */
function selectGate(gate) {
  gate.moveToTop();

  if (selectedGates.has(gate)) {
    selectedGates.delete(gate);
    gate.elem.classList.remove("selected");

    gate.input.lines.forEach((x) => x && deselectLineRecursively(x));
    gate.output.lines.forEach((x) => x && deselectLineRecursively(x));
  } else {
    selectedGates.add(gate);
    gate.elem.classList.add("selected");
  }
}

/** @param {ConnectionLine} line */
function deselectLineRecursively(line) {
  if (!selectedLines.has(line)) return;

  selectedLines.delete(line);
  line.line.classList.remove("selected");

  line.branches.forEach((branch) => deselectLineRecursively(branch));
  if (line.parent) deselectLineRecursively(line.parent);
}

/** @param {ConnectionLine} line */
function selectLineRecursively(line, selectGatesRecursively=true) {
  if (selectedLines.has(line)) return;
  
  selectedLines.add(line);
  line.line.classList.add("selected");

  if (line.input) selectAllGates(line.input.gate, selectGatesRecursively);
  if (line.output) selectAllGates(line.output.gate, selectGatesRecursively);
  
  line.branches.forEach((branch) => selectLineRecursively(branch, selectGatesRecursively));
  if (line.parent) selectLineRecursively(line.parent, selectGatesRecursively);
}

/** @param {Instance} gate */
function selectAllGates(gate, _rec=true) {
  if (selectedGates.has(gate)) return;
  
  gate.moveToTop();
  selectedGates.add(gate);
  gate.elem.classList.add("selected");
  
  _rec && gate.input.lines.forEach((line) => line && selectLineRecursively(line));
  _rec && gate.output.lines.forEach((line) => line && selectLineRecursively(line));
}
