let lastMx = 0, lastMy = 0;
let movingBoard = false, boardX = 0, boardY = 0;

/**
 * @param {HTMLElement} elem
 * @param {MouseEvent} e
 */
function mouseDown(elem, e) {
  const x = alignGrid(e.x);
  const y = alignGrid(e.y);

  if (!currentBoard.editable) return;

  if (elem.classList.contains("board") && e.shiftKey) {
    if (selectAreaElem) selectAreaElem.remove();
    selectAreaElem = _("div.select_area");
    document.body.append(selectAreaElem);
    selectAreaStart = [x, y];
  } else if (elem.classList.contains("gate") && !elem.classList.contains("inv")) {
    if (e.button == 1) {
      clearSelection();
      createGate(getData(elem).type, x, y, false, true);
      dragSelection = true;
    } else if (e.button == 0) {
      const data = getData(elem);
      dragSelection = true;

      if (selectedGates.has(data)) return;
      if (!e.shiftKey) clearSelection();

      if (e.shiftKey && e.ctrlKey) selectAllGates(data);
      else selectGate(data);
    }
  } else if (e.button == 0 && elem.classList.contains("onode") && !drawingLine) {
    clearSelection();
    startLineFromGate(elem, x, y);
  } else if (drawingLine && e.ctrlKey) {
    if (drawingLine.line.getTotalLength() < 10) return;
    clearSelection();
    startLineFromLine(drawingLine.line, x, y);
  } else if (elem.classList.contains("line")) {
    if (drawingLine) return;
    if (e.ctrlKey) {
      clearSelection();
      startLineFromLine(elem, x, y);
    } else if (e.button == 0 && e.shiftKey) {
      /** @type {ConnectionLine} */
      const line = elementData.get(elem);
      if (selectedLines.has(line)) {
        selectedLines.delete(line);
        line.line.classList.remove("selected");
      } else if (e.ctrlKey) {
        selectLineRecursively(line);
      } else {
        selectLineRecursively(line, false);
      }
    } else if (e.button == 2) {
      clearSelection();
      elementData.get(elem).remove();
    }
  } else if (e.target.classList.contains("inode") && drawingLine) {
    clearSelection();

    drawingLine.line.classList.remove("drawing");
    drawingLine.linkTo(
      getData(e.target),
      parseInt(e.target.getAttribute("data-i"))
    );

    drawingLine = null;
  } else if (elem.parentElement) {
    mouseDown(elem.parentElement, e);
  } else {
    clearSelection();
  }
}

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  lastMx = e.x;
  lastMy = e.y;

  if (e.target.classList.contains("gate") && e.target.classList.contains("instance")) {
    showContextMenu();
  }
});

document.addEventListener("mousedown", (e) => {
  mouseDown(e.target, e);
  lastMx = e.x;
  lastMy = e.y;
});

document.addEventListener("mousemove", (e) => {
  const x = alignGrid(e.x), dx = x - lastMx;
  const y = alignGrid(e.y), dy = y - lastMy;

  if (selectedGates.size && dragSelection) {
    selectedLines.forEach((line) => {
      line.x1 = alignGrid(line.x1 + dx);
      line.x2 = alignGrid(line.x2 + dx);
      line.y1 = alignGrid(line.y1 + dy);
      line.y2 = alignGrid(line.y2 + dy);
    });

    selectedGates.forEach((gate) => {
      gate.moveBy(dx, dy);
    });
  } else if (drawingLine) {
    drawingLine.x2 = x;
    drawingLine.y2 = y;
  } else if (selectAreaStart) {
    const ax = Math.min(x, selectAreaStart[0]);
    const ay = Math.min(y, selectAreaStart[1]);
    
    const aw = Math.max(x, selectAreaStart[0]) - ax;
    const ah = Math.max(y, selectAreaStart[1]) - ay;

    selectAreaElem.style.left = ax + "px";
    selectAreaElem.style.top = ay + "px";
    selectAreaElem.style.width = aw + "px";
    selectAreaElem.style.height = ah + "px";
  }

  lastMx = x;
  lastMy = y;
});

document.addEventListener("mouseup", (e) => {
  const x = alignGrid(e.x);
  const y = alignGrid(e.y);

  if (selectAreaStart) {
    const x1 = Math.min(x, selectAreaStart[0]);
    const y1 = Math.min(y, selectAreaStart[1]);
    
    const x2 = Math.max(x, selectAreaStart[0]);
    const y2 = Math.max(y, selectAreaStart[1]);
    
    for (const gate of currentBoard.gates) {
      if (
        gate.x >= x1 && gate.x <= x2
        && gate.y >= y1 && gate.y <= y2
        && !selectedGates.has(gate)
      ) {
        selectGate(gate);
      }
    }

    for (const line of currentBoard.lines) {
      if (
        (line.x1 >= x1 && line.x1 <= x2) && (line.x2 >= x1 && line.x2 <= x2)
        && (line.y1 >= y1 && line.y1 <= y2) && (line.y2 >= y1 && line.y2 <= y2)
      ) {
        selectLineRecursively(line, false);
      }
    }

    selectAreaStart = null;
    selectAreaElem.remove();
    selectAreaElem = null;
  } else if (e.button == 2 && drawingLine) {
    drawingLine.remove();
    drawingLine = null;
  } else if (dragSelection) {
    dragSelection = false;

    if (e.y >= invElem.getBoundingClientRect().y) {
      selectedGates.forEach((x) => x.remove());
      selectedLines.forEach((x) => x.remove());
      clearSelection();
    }
  }

  setTimeout(save);
});
