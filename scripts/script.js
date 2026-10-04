// @ts-check
/**
 * V&B Luxe — site-wide behavior.
 *
 * Classic script loaded with `defer`, so the DOM is already parsed when it
 * runs. Every feature looks up its own elements and quietly does nothing
 * when they are not on the current page.
 */
(() => {
  "use strict";

  const SERVICE_KEYS = ["carpet", "snow", "landscape"];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  /**
   * Select an option by value, but only if that option actually exists.
   * @param {HTMLSelectElement} select
   * @param {string | null | undefined} value
   * @returns {boolean} whether the value was applied
   */
  function selectOption(select, value) {
    if (!value) return false;
    const hasOption = Array.from(select.options).some((option) => option.value === value);
    if (hasOption) select.value = value;
    return hasOption;
  }

  /**
   * Close a native dialog when the user clicks its backdrop. Requires the
   * press to start on the backdrop too, so a text selection dragged out of
   * the dialog does not close it by accident.
   * @param {HTMLDialogElement} dialog
   * @param {(target: EventTarget | null) => boolean} [isBackdrop]
   */
  function closeOnBackdropClick(dialog, isBackdrop = (target) => target === dialog) {
    let pressedOnBackdrop = false;

    dialog.addEventListener("pointerdown", (event) => {
      pressedOnBackdrop = isBackdrop(event.target);
    });

    dialog.addEventListener("click", (event) => {
      if (pressedOnBackdrop && isBackdrop(event.target)) dialog.close();
      pressedOnBackdrop = false;
    });
  }

  /* ------------------------------------------------------------------------
     Header: compact style once the page is scrolled
     ------------------------------------------------------------------------ */

  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let ticking = false;

    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  }

  /* ------------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------------ */

  function initMobileNav() {
    const header = document.querySelector(".site-header");
    const toggle = header?.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    if (!header || !(toggle instanceof HTMLButtonElement) || !nav) return;

    const isOpen = () => header.classList.contains("nav-open");

    /** @param {boolean} open */
    const setOpen = (open) => {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    // Escape closes the menu and returns focus to the toggle.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !isOpen()) return;
      setOpen(false);
      toggle.focus();
    });

    // Clicking anywhere outside the header closes the menu.
    document.addEventListener("click", (event) => {
      if (isOpen() && event.target instanceof Node && !header.contains(event.target)) {
        setOpen(false);
      }
    });

    // Following a link (including in-page anchors) closes the menu.
    nav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
    });

    // Reset when the viewport grows into the desktop layout.
    const desktop = window.matchMedia("(min-width: 861px)");
    desktop.addEventListener("change", (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     Dialogs: shared close buttons
     ------------------------------------------------------------------------ */

  function initDialogCloseButtons() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        if (dialog instanceof HTMLDialogElement) dialog.close();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Quote modal
     Openers are real links to contact.html?service=..., so they still work
     without JavaScript or on pages that have no modal.
     ------------------------------------------------------------------------ */

  function initQuoteModal() {
    const dialog = document.getElementById("quote-modal");
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== "function") return;

    const serviceSelect = dialog.querySelector('select[name="service"]');

    document.querySelectorAll("[data-open-quote]").forEach((opener) => {
      opener.addEventListener("click", (event) => {
        event.preventDefault();

        const service = opener.getAttribute("data-open-quote");
        if (serviceSelect instanceof HTMLSelectElement) selectOption(serviceSelect, service);

        if (!dialog.open) dialog.showModal();
      });
    });

    closeOnBackdropClick(dialog);
  }

  /* ------------------------------------------------------------------------
     Lightbox (before/after gallery)
     ------------------------------------------------------------------------ */

  function initLightbox() {
    const dialog = document.getElementById("lightbox");
    const triggers = Array.from(document.querySelectorAll("[data-lightbox]"));
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== "function") return;
    if (triggers.length === 0) return;

    const image = dialog.querySelector(".lightbox-img");
    const caption = dialog.querySelector(".lightbox-caption");
    const counter = dialog.querySelector(".lightbox-counter");
    const prevButton = dialog.querySelector(".lightbox-prev");
    const nextButton = dialog.querySelector(".lightbox-next");
    if (!(image instanceof HTMLImageElement)) return;

    /** @type {{ src: string, alt: string, caption: string }[]} */
    const items = triggers.map((trigger) => {
      const thumb = trigger.querySelector("img");
      return {
        src: trigger.getAttribute("data-full") || thumb?.currentSrc || thumb?.src || "",
        alt: thumb?.alt ?? "",
        caption: trigger.getAttribute("data-caption") ?? "",
      };
    });

    const total = items.length;
    let current = 0;

    /** @param {number} index */
    const wrap = (index) => (index + total) % total;

    /** @param {number} index */
    const preload = (index) => {
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = items[wrap(index)].src;
    };

    /** @param {number} index */
    const show = (index) => {
      current = wrap(index);
      const item = items[current];

      image.src = item.src;
      image.alt = item.alt;

      if (caption instanceof HTMLElement) {
        caption.textContent = item.caption;
        caption.hidden = !item.caption;
      }
      if (counter) counter.textContent = `${current + 1} / ${total}`;

      if (total > 1) {
        preload(current + 1);
        preload(current - 1);
      }
    };

    // Navigation is pointless with a single image.
    [prevButton, nextButton].forEach((button) => {
      if (button instanceof HTMLElement) button.hidden = total < 2;
    });

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        show(index);
        if (!dialog.open) dialog.showModal();
      });
    });

    prevButton?.addEventListener("click", () => show(current - 1));
    nextButton?.addEventListener("click", () => show(current + 1));

    dialog.addEventListener("keydown", (event) => {
      if (total < 2) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(current - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        show(current + 1);
      }
    });

    // The dialog fills the viewport, so its padding and the empty area of the
    // figure act as the backdrop.
    closeOnBackdropClick(
      dialog,
      (target) =>
        target === dialog ||
        (target instanceof Element && target.classList.contains("lightbox-figure"))
    );
  }

  /* ------------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------------ */

  function initScrollReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (elements.length === 0) return;

    const revealAll = () => elements.forEach((el) => el.classList.add("is-visible"));

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */

  function initYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = year;
    });
  }

  /* ------------------------------------------------------------------------
     Contact page: preselect a service from ?service=...
     ------------------------------------------------------------------------ */

  function initServiceFromQuery() {
    const select = document.querySelector('select#c-service[name="service"]');
    if (!(select instanceof HTMLSelectElement)) return;

    const service = new URLSearchParams(window.location.search).get("service");
    if (service && SERVICE_KEYS.includes(service)) selectOption(select, service);
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  initHeaderScroll();
  initMobileNav();
  initDialogCloseButtons();
  initQuoteModal();
  initLightbox();
  initScrollReveal();
  initYear();
  initServiceFromQuery();
})();
