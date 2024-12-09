/** @type {HTMLDivElement} */
let navbar;

function updateNavbar() {
  if (navbar) navbar.remove();
  
  navbar = _("div.navbar");
  document.querySelector("main").append(navbar);

  if (boards.length == 0) {
    navbar.append(_("span", "Board"));
  } else {
    navbar.append(
      _("a", "Board", {
        onclick() {
          boards.splice(0).forEach((x) => x.remove());
          mainBoard.show();
          updateNavbar();
        }
      }),
      ">",
      _("div.path",
        boards.map((x, i, a) => [
          _("span", x.id, {
            onclick() {
              boards.splice(i + 1).forEach((x) => x.remove());
              boards[i].show();
              updateNavbar();
            }
          }),
          i < a.length - 1 ? ">" : ""
        ])
      ),
    );
  }

  if (!currentBoard.editable) {
    navbar.append("(view-only)");
  }

  return navbar;
}

updateNavbar();
