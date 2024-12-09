/**
 * @typedef {(
 *   | { type: "element", element: HTMLElement }
 *   | { type: "option", text: string, icon?: string, disabled?: boolean, callback: () => void }
 *   | { type: "submenu", text: string, icon?: string, options: CtxMenuOption[] }
 *   | { type: "divider" }
 * )} CtxMenuOption
 *
 * @typedef {{
 *   title?: string,
 *   options: CtxMenuOption[]
 * }} CtxMenuConfig
 *
 * @typedef {(target: HTMLDivElement) => CtxMenuConfig} CtxMenuInit
 */

/**
 * @type {{ selector: string, init: CtxMenuInit }[]}
 */
const menus = [];

let ctxMenuZIndex = 727;  // wysi
let ctxMenuVisible = false;
let ctxMenuTarget;

/**
 * @param {string} selector
 * @param {CtxMenuInit} init
 */
function addContextMenu(selector, init) {
  menus.push({ selector, init });
}

/** @param {CtxMenuOption} option */
function createCtxOptionDiv(option) {
  const div = _("div.ctxitem");

  if (option.type == "element") {
    return option.element;
  } else if (option.type == "divider") {
    div.classList.add("divider");
  } else if (option.type == "option" || option.type == "submenu") {
    option.icon && div.append(
      _("div",
        _("img",
          { src: option.icon, draggable: false }
        )
      )
    );

    div.append(_("span", option.text));

    if (option.disabled) {
      div.classList.add("disabled");
    } else if (option.type == "option") {
      div.onmousedown = (e) => e.stopPropagation();
      div.onclick = () => {
        hideContextMenu();
        option.callback();
      }
    } else if (option.type == "submenu") {
      const menu = createCtxMenu({
        options: option.options
      });

      menu.style.display = "none";
      div.classList.add("submenu");
      document.body.append(menu);

      div.onmouseenter = () => {
        menu.style.display = null;

        const rect = div.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        menu.style.left = (
          rect.x + rect.width + menuRect.width > window.innerWidth
            ? rect.x - menuRect.width
            : rect.x + rect.width
        ) + "px";

        menu.style.top = (
          rect.y + menuRect.height > window.innerHeight
            ? rect.y + rect.height - menuRect.height
            : rect.y
        ) + "px";
      }

      div.onmouseleave = menu.onmouseleave = () => menu.style.display = "none";
      menu.onmouseenter = () => menu.style.display = null;
    }
  }

  return div;
}

function positionCtxMenu(menu, x, y) {
  const ctxRect = menu.getBoundingClientRect();
  const maxY = window.innerHeight - ctxRect.height;
  const maxX = window.innerWidth - ctxRect.width;

  menu.style.left = Math.min(alignGrid(x), maxX) + "px";
  menu.style.top = Math.min(alignGrid(y), maxY) + "px";
}

/** @param {CtxMenuConfig} config */
function createCtxMenu(config) {
  return _("div.ctxmenu",
    { style: { zIndex: ctxMenuZIndex++ } },
    config.title ? _("span", config.title) : [],
    config.options.map((x) => createCtxOptionDiv(x))
  );
}

/**
* @param {HTMLDivElement} target
* @param {CtxMenuInit} init
*/
function showContextMenu(target, init, x, y) {
  const config = init(target, x, y);
  if (!config) return;

  const menu = createCtxMenu(config);

  ctxMenuTarget = target;
  ctxMenuVisible = true;

  document.body.append(menu);
  target.classList.add("ctx_active");
  positionCtxMenu(menu, x, y);
}

function hideContextMenu() {
  ctxMenuTarget && ctxMenuTarget.classList.remove("ctx_active");
  document.querySelectorAll(".ctxmenu").forEach((x) => x.remove());

  ctxMenuVisible = false;
  ctxMenuTarget = null;
}

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (ctxMenuVisible) {
    hideContextMenu();
  }

  /** @type {HTMLDivElement} */
  let el = e.target;
  while (el) {
    if (el.hasAttribute("data-ignore-context-menu")) return;

    const menu = menus.find((x) => el.matches(x.selector));
    if (menu) {
      return showContextMenu(el, menu.init, e.x, e.y);
    }

    el = el.parentElement;
  }
});

document.addEventListener("keydown", hideContextMenu);

document.addEventListener("mousedown", (e) => {
  if (!e.target.classList.contains("ctxitem") && !e.target.classList.contains("ctxmenu")) {
    hideContextMenu();
  }
});
