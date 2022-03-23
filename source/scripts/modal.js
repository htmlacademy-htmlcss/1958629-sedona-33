const MODAL_CLOSE = function() {
  document.querySelector(".js-modal").classList.remove("modal-open");
  document.querySelector(".js-body").classList.remove("overflow-hidden");
};

document.querySelector(".js-modal-open").onclick = function() {
  document.querySelector(".js-modal").classList.add("modal-open");
  document.querySelector(".js-body").classList.add("overflow-hidden");
};

document.querySelector(".js-modal-close").onclick = function() {
  MODAL_CLOSE();
};

document.querySelector(".js-modal-search").onclick = function() {
  MODAL_CLOSE();
};
