const modalELement = document.querySelector('.js-modal');

if (modalELement) {
  const modalOpenerELement = document.querySelector('.js-modal-open');
  const modalCloserElement = modalELement.querySelector('.js-modal-close');

  modalOpenerELement.addEventListener('click', (evt) => {
    evt.preventDefault();

    modalELement.classList.add('modal-open');
    document.body.classList.add('overflow-hidden');
  });

  modalCloserElement.addEventListener('click', (evt) => {
    evt.preventDefault();

    modalELement.classList.remove('modal-open');
    document.body.classList.remove('overflow-hidden');
  });
}
