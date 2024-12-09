/**
 * @typedef {{
 *   id: string,
 *   editable: boolean,
 *   board: HTMLDivElement,
 *   svg: SVGSVGElement,
 *   lines: Set<ConnectionLine>,
 *   gates: Set<Instance>,
 *   offsetX: number, offsetY: number,
 *   show: () => void,
 *   hide: () => void,
 *   load: (data: SerializedData, offsetX?: number, offsetY?: number, loadValues?: boolean) => void,
 *   serialize: (includeCustomTypes?: boolean, removeUnneeded?: boolean) => SerializedData,
 *   clear: (deleteComponents?: boolean) => void,
 *   remove: (deleteComponents?: boolean) => void
 * }} Board
 */

/** @type {Board[]} */
const boards = [];
/** @type {Board} */
let currentBoard;
/** @type {Board} */
let mainBoard;

function createBoard(id, editable=true) {
  let offsetX = 0, offsetY = 0;

  /** @type {Board} */
  const board = {
    id,
    editable,
    board: _("div.board"),
    svg: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    lines: new Set(),
    gates: new Set(),
    clear(deleteComponents=false) {
      if (deleteComponents) {
        this.gates.forEach((x) => x.remove());
        this.lines.forEach((x) => x.remove());
      } else {
        this.gates.forEach((x) => x.board = null);
        this.lines.forEach((x) => x.board = null);
      }

      this.gates.clear();
      this.lines.clear();
    },
    show() {
      if (currentBoard) {
        currentBoard.hide();
      }

      currentBoard = this;
      document.querySelector(".boards").append(this.board);
    },
    hide() {
      if (currentBoard == this) currentBoard = null;
      this.board.remove();
    },
    load(data, offsetX=0, offsetY=0, loadValues=true) {
      deserialize(data, offsetX, offsetY, false, loadValues, false)
        .addToBoard(board);
    },
    serialize(includeCustomTypes=false, removeUnneeded=false) {
      return serialize(this.gates, this.lines, includeCustomTypes, removeUnneeded);
    },
    remove(deleteComponents=false) {
      const idx = boards.indexOf(this);
      if (idx > -1) {
        boards.splice(idx, 1);
        updateNavbar();
      }

      this.deleted = true;
      this.hide();
      this.clear(deleteComponents);

      this.board = this.svg = null;
    },

    get offsetX() { return offsetX },
    get offsetY() { return offsetY },

    set offsetX(val) {
      offsetX = val;
      this.board.style.setProperty("--offset-x", offsetX + "px");
    },
    set offsetY(val) {
      offsetY = val;
      this.board.style.setProperty("--offset-y", offsetY + "px");
    },
  };

  board.board.append(board.svg);
  return board;
}

/** @param {CustomInstance} customGate */
function showCustomGate(id, customGate) {
  const board = createBoard(id, false);
  const [w, h] = findMaxPos(customGate.gates, customGate.lines);
  
  boards.push(board);
  board.show();

  board.offsetX = alignGrid(window.innerWidth / 2 - w / 2);
  board.offsetY = alignGrid(window.innerHeight / 2 - h / 2);

  customGate.addToBoard(board);
  updateNavbar();
}

mainBoard = createBoard("main");
mainBoard.show();
