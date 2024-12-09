/**
 * @typedef {{
 *   instance: Instance,
 *   values: number[],
 *   lines: (ConnectionLine | null)[],
 *   nodes: HTMLSpanElement[],
 *   set: (idx: number, value: 0 | 1, force?: boolean) => void,
 *   unlinkNode: (idx: number) => void,
 *   unlink: () => void
 * }} InstanceIO
 */

/**
 * @param {"input" | "output"} type
 * @returns {InstanceIO}
 */
function createIO(count, type) {
  return {
    values: new Array(count).fill(0),
    lines: new Array(count).fill(null),
    nodes: [],

    set(idx, value, force=false) {
      if (this.values[idx] == value && !force) return false;
      
      this.values[idx] = value;
      this.nodes[idx].classList.toggle("on", !!value);
      
      if (type == "input") {
        tickGate(this.instance);
      } else if (type == "output") {
        const line = this.lines[idx];
        line && line.signal(value, this.instance.color, force);
      }
      
      if (this.updateDisplay) this.updateDisplay(this.values);
      return true;
    },

    unlinkNode(idx, unlinkLine=true) {
      const line = this.lines[idx];
      this.lines[idx] = null;
      if (type == "input") this.set(idx, 0);

      unlinkLine && line && line.unlink(type);
    },

    unlink() {
      for (let i = 0; i < count; i++) {
        if (this.lines[i]) this.unlinkNode(i);
      }
    }
  }
}
