let activeModal;

function closeModal() {
  if (!activeModal) return;
  activeModal.close();
  activeModal.remove();
  activeModal = null;
}

function showModal(title, contents, buttons, callback) {
  const modal = _("dialog.modal",
    _("div.title", title),
    _("div.content", contents),
    buttons ? _("div.buttons",
      buttons.map((x) => _("button.btn", {
        textContent: x,
        onclick: () => callback
          ? callback(x) && closeModal()
          : closeModal()
      }))
    ) : []
  );

  activeModal = modal;
  document.body.append(modal);
  
  modal.onclose = () => closeModal();
  modal.showModal();

  document.activeElement.blur();
}

function showWarningModal(title, contents, buttons, callback) {
  showModal(title, contents, buttons, callback);
  activeModal.classList.add("warn");
}
