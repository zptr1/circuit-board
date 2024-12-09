/**
 * @typedef {{
 *   element?: HTMLElement,
 *   ctx?: () => CtxMenuOption[],
 *   fn: (inputs: number[]) => number[]
 * }} GateInterface
  */

/**
 * @typedef {{
 *   id: string,
 *   isInput: true | undefined,
 *   isOutput: true | undefined,
 *   color?: string,
 *   customGate?: SerializedData,
 *   inputs: number, outputs: number,
 *   create: (instance: Instance) => GateInterface
 * }} GateType
  */

/** @type {GateType[]} */
const GATE_TYPES = [
  {
    id: "toggle",
    isInput: true,
    inputs: 0, outputs: 1,
    create(gate) {
      const btn = _("div.indicator.button", {
        onmousedown(e) {
          if (e.button != 0 || e.shiftKey || e.ctrlKey) return;
          gate.output.set(0, !gate.output.values[0]);
          e.stopPropagation();
          tickGate(gate);
        }
      });

      gate.output.updateDisplay = (values) => {
        btn.classList.toggle("on", !!values[0]);
      }
      
      return {
        element: btn,
        fn: () => gate.output.values,
        ctx: () => [{
          type: "submenu",
          text: "Color",
          options: COLORS.map((x) => ({
            type: "option",
            text: x[0],
            callback() {
              gate.color = x[1];
              gate.update(true);
            }
          }))
        }]
      };
    }
  },
  {
    id: "output",
    isOutput: true,
    inputs: 1, outputs: 0,
    create(gate) {
      const btn = _("div.indicator");
      gate.input.updateDisplay = (values) => {
        btn.classList.toggle("on", !!values[0]);
      }

      return {
        element: btn,
        fn: () => [],
        ctx: () => [{
          type: "submenu",
          text: "Color",
          options: COLORS.map((x) => ({
            type: "option",
            text: x[0],
            callback() {
              gate.color = x[1];
              gate.update(true);
            }
          }))
        }]
      };
    }
  },
  {
    id: "segdisplay",
    isOutput: true,
    inputs: 4, outputs: 0,
    create(gate) {
      const disp = _("div.segdisp", "0");

      gate.input.updateDisplay = (values) => {
        const num = [...values].reverse().reduce((p, c) => p << 1 | c);
        disp.textContent = num.toString(16);
      }

      return {
        element: disp,
        fn: () => [],
        ctx: () => [{
          type: "submenu",
          text: "Color",
          options: COLORS.map((x) => ({
            type: "option",
            text: x[0],
            callback() {
              gate.color = x[1];
              gate.update(true);
            }
          }))
        }]
      };
    }
  },
  {
    id: "oscillator",
    inputs: 0, outputs: 1,
    create(gate) {
      let state = 0;
      let interval = setInterval(() => {
        state = !state;
        if (gate.deleted) return clearInterval(interval);
        tickGate(gate);
      }, 100);

      return {
        fn: () => {
          // if (!timeout) {
          //   timeout = 1;
          //   state = !state;
          //   setTimeout(() => {
          //     !gate.deleted && tickGate(gate);
          //     timeout = 0;
          //   }, 100);
          // }

          return [state];
        }
      }
    }
  },
  // {
  //   id: "and",
  //   color: "#3252a8",
  //   inputs: 2, outputs: 1,
  //   create: () => ({
  //     fn: ([a, b]) => [a & b],
  //   }),
  // },
  // {
  //   id: "or",
  //   color: "#32a834",
  //   inputs: 2, outputs: 1,
  //   create: () => ({
  //     fn: ([a, b]) => [a | b],
  //   }),
  // },
  // {
  //   id: "not",
  //   color: "#a83232",
  //   inputs: 1, outputs: 1,
  //   create: () => ({
  //     fn: ([a]) => [!a],
  //   }),
  // },
  // {
  //   id: "nor",
  //   color: "#3290a8",
  //   inputs: 2, outputs: 1,
  //   create: () => ({
  //     fn: ([a, b]) => [!(a | b)],
  //   }),
  // },
  {
    id: "nand",
    color: "#3632a8",
    inputs: 2, outputs: 1,
    create: () => ({
      fn: ([a, b]) => [!(a & b)],
    }),
  },
  {
    id: "built-in xor",
    color: "#6332a8",
    inputs: 2, outputs: 1,
    create: () => ({
      fn: ([a, b]) => [a ^ b],
    }),
  },
  // {
  //   id: "xnor",
  //   color: "#a432a8",
  //   inputs: 2, outputs: 1,
  //   create: () => ({
  //     fn: ([a, b]) => [!(a ^ b)],
  //   }),
  // }
];

/**
 * @param {SerializedData} data
 * @returns {GateType}
 */
function createCustomType(id, color, data) {
  return {
    id, color,
    inputs: data.inputCount,
    outputs: data.outputCount,
    customGate: data,
    create(instance) {
      const gate = deserialize(data, 0, 0, true, false, instance);
      instance.customGate = gate;

      return {
        ctx: () => [{
          type: "option",
          text: "See inside",
          callback: () => showCustomGate(id, gate)
        }],
        fn: (inputs) => {
          inputs.forEach((val, idx) => {
            gate.input[idx].set(val);
          });

          return gate.output.map((x) => x.get());
        },
      }
    }
  }
}

/** @param {GateType} type */
function addGateType(type) {
  const container = _("div.gate-container", _("span", type.id));
  const elem = _("div.gate.inv", container, {
    onmousedown(e) {
      if (e.button == 0) {
        clearSelection();
        e.stopPropagation();
        const gate = createGate(type, e.x, e.y, false, true);
        
        // gate.elem.style.pointerEvents = "none";
        dragSelection = true;
      }
    }
  });
  
  if (type.color) {
    container.style.setProperty("--color", type.color);
  }
  
  invElem.append(elem);
}

GATE_TYPES.forEach(addGateType);
