const HEX_CHARS = "0123456789abcdef";
const randomHex = () => Array.from({ length: 6 }, () => HEX_CHARS[~~(Math.random() * HEX_CHARS.length)]).join("");

function fixHex(hex) {
  hex = hex.replace(/[^0-9a-f]/g, "");
  return "#" + (
    hex.length == 0 ? "000000"
    : hex.length == 1 ? hex.repeat(6)
    : hex.length == 2 ? hex[0].repeat(3) + hex[1].repeat(3)
    : hex.length == 3 ? hex.replace(/./g, "$&$&")
    : hex.length < 6 ? hex.slice(0, -1) + hex[hex.length - 1].repeat(7 - hex.length)
    : hex
  );
}

function createCircuitModal(gates, lines) {
  const data = serialize(gates, lines, false, true);
  if (data.gates.length == 0 || data.lines.length == 0) {
    return showWarningModal(
      "Create circuit",
      ["The circuit must have at least one connection"],
      ["Ok"]
    );
  } else if (data.outputCount == 0) {
    return showWarningModal(
      "Create circuit",
      [
        "The circuit must have at least one output.", _("br"),
        "(inputs are not required)"
      ],
      ["Ok"]
    );
  } else if (data.inputCount > 30 || data.outputCount > 30) {
    return showWarningModal(
      "Create circuit",
      ["The circuit cannot have more than 30 inputs or outputs"],
      ["Ok"]
    );
  }

  const [x, y] = findMinPos(gates, lines);

  let name = "custom gate";
  let color = "#" + randomHex();
  
  const nameInput = _("input", {
    type: "text",
    maxLength: 28,
    value: name, placeholder: "Gate Name",
    style: { textTransform: "uppercase" },
    oninput(e) {
      name = e.target.value.trim().toLowerCase();
      if (!name) {
        errSpan.textContent = "Name is a required field";
      } else if (GATE_TYPES.find((x) => x.id == name)) {
        errSpan.textContent = "This gate already exists";
      } else {
        errSpan.textContent = "";
      }
    },
    onblur: (e) => e.target.value = e.target.value.trim().toLowerCase()
  });
  
  const colorHexInput = _("input", {
    type: "text", maxLength: 7, value: color,
    oninput(e) {
      const value = "#" + e.target.value.replace(/[^0-9a-f]/g, "");
      if (e.target.value != value) e.target.value = value;
      colorPickerInput.value = color = fixHex(value);
    },
    onblur: (e) => e.target.value = colorPickerInput.value = fixHex(e.target.value)
  });

  const colorPickerInput = _("input", {
    type: "color", value: color,
    oninput(e) {
      colorHexInput.value = color = fixHex(e.target.value);
    }
  });

  const errSpan = _("span", {
    style: { color: "#f55" }
  });

  showModal("Create circuit", [
    _("div.field",
      _("label", "Name"),
      _("div", nameInput)
    ),

    _("div.field",
      _("label", "Color"),
      _("div",
        colorHexInput,
        colorPickerInput,
      )
    ),

    errSpan
  ], [
    "Cancel",
    "Create"
  ], (btn) => {
    if (btn == "Cancel") return true;

    if (!name) {
      errSpan.textContent = "Name is a required field";
      return;
    } else if (GATE_TYPES.find((x) => x.id == name)) {
      errSpan.textContent = "This gate already exists";
      return;
    }

    const type = createCustomType(name, color, data);

    clearSelection();
    gates.forEach((x) => x.remove());
    lines.forEach((x) => x.deleted || x.remove());

    GATE_TYPES.push(type);
    addGateType(type);
    selectGate(createGate(type, x, y));

    return true;
  });
}
