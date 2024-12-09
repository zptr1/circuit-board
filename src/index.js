const invElem = document.getElementById("inventory");
const debugElem = document.getElementById("debug");

/** @type {WeakMap<HTMLElement, Instance>} */
const elementData = new WeakMap();
