(() => {
  const triggerSelector = "[data-member-signup]";

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <dialog class="member-signup-modal" aria-labelledby="member-signup-title">
        <div class="member-signup-shell">
          <button class="member-signup-close" type="button" aria-label="Close membership signup">&times;</button>
          <p class="member-signup-eyebrow">REBs Moving Forward</p>
          <h2 id="member-signup-title">Become a Member</h2>
          <p class="member-signup-copy">Join our email list for local updates, upcoming events, and calls to action.</p>

          <div class="member-signup-embed">
            <iframe
              src="https://celeste422256.substack.com/embed"
              title="Subscribe to the REBs newsletter on Substack"
              width="480"
              height="150"
              frameborder="0"
              scrolling="no"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </dialog>
    `
  );

  const modal = document.querySelector(".member-signup-modal");
  const closeButton = modal.querySelector(".member-signup-close");
  let previousFocus;

  function openSignup() {
    if (modal.open) return;
    previousFocus = document.activeElement;
    modal.showModal();
  }

  function closeSignup() {
    modal.close();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(triggerSelector);
    if (!trigger) return;

    event.preventDefault();
    document.querySelector(".mobile-menu")?.classList.remove("active");
    document.querySelector(".hamburger")?.classList.remove("active");
    openSignup();
  });

  document.addEventListener("keydown", (event) => {
    const trigger = event.target.closest(triggerSelector);
    if (!trigger || !["Enter", " "].includes(event.key)) return;

    event.preventDefault();
    openSignup();
  });

  closeButton.addEventListener("click", closeSignup);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeSignup();
  });

  modal.addEventListener("close", () => {
    previousFocus?.focus();
  });

  if (window.location.hash === "#member-signup") openSignup();
})();
