let tmpId = 0;

addContextMenu(".gate.instance", (elem) => {
  if (drawingLine || dragSelection || selectAreaStart)
    return;

  if ((selectedGates.size > 1 || selectedLines.size > 1) && currentBoard.editable) {
    const gates = [...selectedGates];
    const lines = [...selectedLines];

    return {
      title: `${selectedGates.size} gates`,
      options: [
        {
          type: "option", text: "Create circuit",
          callback: () => createCircuitModal(gates, lines)
        },
        { type: "divider" },
        {
          type: "option", text: "Clone",
          callback() {
            const [x, y] = findMinPos(gates, lines);
            const data = serialize(gates, lines, false);
            const clone = deserialize(data, x + 20, y + 20, false, true, false);
            
            clearSelection();
            clone.addToBoard(currentBoard);
            clone.selectAll();
          }
        },
        {
          type: "option", text: "Delete",
          callback() {
            gates.forEach((x) => x.remove());
            lines.forEach((x) => x.remove());
            clearSelection();
          }
        }
      ]
    }
  }

  const data = getData(elem);

  clearSelection();
  selectGate(data);

  return {
    title: data.type.id,
    options: [
      ...(
        data.interface.ctx
          ? data.interface.ctx().concat({ type: "divider" })
          : []
      ),
      {
        type: "option", text: "Clone",
        disabled: !currentBoard.editable,
        callback() {
          clearSelection();
          selectGate(createGate(data.type, data.x + 20, data.y + 20));
        }
      },
      {
        type: "option", text: "Delete",
        disabled: !currentBoard.editable,
        callback() {
          data.remove();
        }
      }
    ]
  };
});

addContextMenu(".gate.inv", (elem) => {
  
});
