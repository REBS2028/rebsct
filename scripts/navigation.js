export function mountNavigation(root = document, browser = window) {
  const button = root.querySelector('.hamburger');
  const menu = root.querySelector('.mobile-menu');
  const close = () => {
    menu.classList.remove('active');
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    const open = menu.classList.toggle('active');
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  browser.matchMedia('(min-width: 1024px)').addEventListener('change', close);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('active')) { close(); button.focus(); }
  });
}
