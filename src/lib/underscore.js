// underscore.js
// simple mini-framework
// (c) zptr1 | MIT License

/**
 * @template {string} T
 * @typedef {(
 *   T extends `${infer K extends keyof HTMLElementTagNameMap}.${string}` ? HTMLElementTagNameMap[K]
 *   : T extends `${infer K extends keyof HTMLElementTagNameMap}#${string}` ? HTMLElementTagNameMap[K]
 *   : T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T]
 *   : HTMLDivElement
 * )} ElementTypeFromSelector
  */

/** @type {(<T extends string>(s: T) => ElementTypeFromSelector<T>)} */
const $ = (s) => document.querySelector(s);

/** @type {(<T extends string>(s: T) => NodeListOf<ElementTypeFromSelector<T>>)} */
const $$ = (s) => document.querySelectorAll(s);

/** @type {(<T extends string>(e: HTMLDivElement, s: T) => ElementTypeFromSelector<T>)} */
const $el = (e, s) => e.querySelector(s);

const parseSelector = (sel) => ({
  tag: sel.split(/[.#]/)[0],
  id: (sel.match(/#[^.#]+/)?.[0] || "").slice(1) || null,
  class: (sel.match(/\.[^.#]+/g) || []).map((x) => x.slice(1))
});

const assignData = (src, dest) => {
  for (const key in src) {
    const val = src[key];
    if (typeof val == "object" && !Array.isArray(val) && key in dest) {
      assignData(val, dest[key]);
    } else if (key.startsWith("data-") && dest.setAttribute) {
      dest.setAttribute(key, val);
    } else {
      dest[key] = val;
    }
  }
}

const addChildren = (e, a) => {
  a.forEach((x) => {
    if (typeof x == "string") e.appendChild(document.createTextNode(x));
    else if (Array.isArray(x)) addChildren(e, x);
    else if (x instanceof HTMLElement) e.appendChild(x);
    else assignData(x, e);
  });
}

/**
 * @template {string} T
 * @template {ElementTypeFromSelector<T>} E
 * @param {T} selector 
 * @param {...({[K in keyof E]?: E[K]})} children
 * @returns {E}
  */
function _(selector, ...children) {
  const sel = parseSelector(selector);
  const element = document.createElement(sel.tag);

  if (sel.id) element.id = sel.id;
  for (const token of sel.class) {
    element.classList.add(token);
  }

  addChildren(element, children);
  return element;
}
