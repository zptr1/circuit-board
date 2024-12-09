let MAX_UPDATES_PER_SECOND = 1;
let TICK_DELAY = 1;

/** @type {Instance[]} */
const updateQueue = [];
/** @type {Set<Instance>} */
const updateQueued = new Set();

let debug$ticks = 0, debug$updates = 0, debug$signals = 0;
let debug$nextUpdate = Date.now() + 1000;

let tickScheduled = false;

/** @param {Instance} gate */
function tickGate(gate) {
  if (!updateQueued.has(gate)) {
    updateQueued.add(gate);
    updateQueue.push(gate);
  }

  if (!tickScheduled) {
    tickScheduled = true;
    setTimeout(tick);
  }
}

function tick() {
  let start = Date.now(), updateCount = 0;
  tickScheduled = true;
  debug$ticks++;

  if (start >= debug$nextUpdate) {
    debugElem.textContent = `${debug$ticks} TPS\n${debug$updates} updates\n${debug$signals} signals\n${updateQueue.length} queued`;
    debug$nextUpdate = start + 1000;
    debug$updates = 0;
    debug$signals = 0;
    debug$ticks = 0;
  }
  
  const ticked = new Set();
  const nextTick = new Set();

  for (let i = 0; i < MAX_UPDATES_PER_SECOND; i++) {
    if (updateQueue.length) {
      const gate = updateQueue.pop();
      updateQueued.delete(gate);

      if (ticked.has(gate)) {
        nextTick.add(gate);
        continue;
      }

      updateCount++;
      ticked.add(gate);
      gate.update();
    } else break;
  }

  for (const gate of nextTick) tickGate(gate);

  debug$updates += updateCount;
  if (updateCount || nextTick.size) setTimeout(tick, TICK_DELAY);
  else {
    tickScheduled = false;
    debug$nextUpdate = start + 1000;
    debugElem.textContent = `${debug$updates} updates\n${debug$signals} signals\n${nextTick.size}`;
    debug$updates = 0;
    debug$signals = 0;
  }
}

setTimeout(tick, TICK_DELAY);
