export function mountMemorial(root = document, browser = window) {
  const memorial = root.querySelector('.home-memorial');
  if (!memorial) return;
  const track = memorial.querySelector('.memorial-ticker-track');
  const group = track.firstElementChild;
  const measure = () => {
    const width = group.getBoundingClientRect().width;
    if (width > 0) {
      track.style.animationDuration = `${width / 33.75}s`;
      memorial.classList.add('memorial-ready');
    }
  };
  measure();
  if (browser.ResizeObserver) new browser.ResizeObserver(measure).observe(group);
  if (root.fonts) root.fonts.ready.then(measure);
}
