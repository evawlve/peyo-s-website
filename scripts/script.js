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

  /** Must match the desktop-navigation media queries in header.css. */
  const DESKTOP_NAV_QUERY = "(width > 860px)";

  /** Minimum horizontal travel, in px, for a lightbox swipe. */
  const SWIPE_THRESHOLD = 40;

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  /**
   * Select an option by value, but only if that option actually exists.
   * @param {HTMLSelectElement} select
   * @param {string | null | undefined} value
   * @param {boolean} [asDefault] also make it the value that form.reset() restores
   * @returns {boolean} whether the value was applied
   */
  function selectOption(select, value, asDefault = false) {
    if (!value) return false;
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    if (!option) return false;
    select.value = value;
    if (asDefault) option.defaultSelected = true;
    return true;
  }

  /**
   * True for a click the browser should handle itself: a modifier click
   * (new tab or window) or a non-primary button.
   * @param {MouseEvent} event
   */
  const isModifiedClick = (event) =>
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey;

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

    // The label stays "Menu"; aria-expanded alone carries the state.
    /** @param {boolean} open */
    const setOpen = (open) => {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    // Escape closes the menu and returns focus to the toggle.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !isOpen()) return;
      setOpen(false);
      toggle.focus();
    });

    // Clicking outside the menu closes it. While open, the header's scrim
    // (a pseudo-element, so the target is the header itself) covers the page,
    // which keeps that tap from also activating whatever is underneath.
    document.addEventListener("click", (event) => {
      if (!isOpen() || !(event.target instanceof Node)) return;
      if (event.target === header || !header.contains(event.target)) setOpen(false);
    });

    // Tabbing out of the header closes the menu, so it never covers the
    // element that now has focus.
    header.addEventListener("focusout", (event) => {
      const next = event instanceof FocusEvent ? event.relatedTarget : null;
      if (isOpen() && next instanceof Node && !header.contains(next)) setOpen(false);
    });

    // Following a link (including in-page anchors) closes the menu.
    nav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
    });

    // Reset when the viewport grows into the desktop layout.
    const desktop = window.matchMedia(DESKTOP_NAV_QUERY);
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
        // Let Ctrl/Cmd/Shift-click open contact.html in a new tab or window.
        if (event instanceof MouseEvent && isModifiedClick(event)) return;
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
    const status = dialog.querySelector(".lightbox-status");
    const prevButton = dialog.querySelector(".lightbox-prev");
    const nextButton = dialog.querySelector(".lightbox-next");
    if (!(image instanceof HTMLImageElement)) return;

    /** @type {{ src: string, alt: string, caption: string, thumb: HTMLImageElement | null }[]} */
    const items = triggers.map((trigger) => {
      const thumb = trigger.querySelector("img");
      return {
        // Triggers are links to the full-size photo, so the gallery works without JS.
        src: trigger.getAttribute("href") || thumb?.currentSrc || thumb?.src || "",
        alt: thumb?.alt ?? "",
        caption: trigger.getAttribute("data-caption") ?? "",
        thumb,
      };
    });

    const total = items.length;
    let current = 0;
    let request = 0;

    /** @param {number} index */
    const wrap = (index) => (index + total) % total;

    /** @param {number} index */
    const preload = (index) => {
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = items[wrap(index)].src;
    };

    const markLoaded = () => image.classList.remove("is-loading");
    image.addEventListener("load", markLoaded);
    image.addEventListener("error", markLoaded);

    /** @param {number} index */
    const show = (index) => {
      current = wrap(index);
      const item = items[current];
      const thisRequest = ++request;

      // Show the already-loaded thumbnail at once, then swap in the full-size
      // photo when it is ready. If there is no usable thumbnail, hide the
      // image until it loads so the previous photo never sits under the new
      // caption.
      const thumb = item.thumb;
      const thumbSrc = thumb && thumb.complete && thumb.naturalWidth > 0 ? thumb.currentSrc : "";

      image.alt = item.alt;
      if (thumbSrc) {
        image.classList.remove("is-loading");
        image.src = thumbSrc;
        if (thumbSrc !== item.src) {
          const full = new Image();
          full.src = item.src;
          full
            .decode()
            .then(() => {
              if (thisRequest === request) image.src = item.src;
            })
            .catch(() => {});
        }
      } else {
        image.classList.add("is-loading");
        image.src = item.src;
        if (image.complete) markLoaded();
      }

      if (caption instanceof HTMLElement) {
        caption.textContent = item.caption;
        caption.hidden = !item.caption;
      }
      if (counter) counter.textContent = `${current + 1} / ${total}`;
      if (status) status.textContent = `${item.caption || item.alt}, image ${current + 1} of ${total}`;

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
        if (event instanceof MouseEvent && isModifiedClick(event)) return;
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

    // Swipe left/right on the photo area (touch, pen or mouse drag).
    /** @type {{ x: number, y: number, id: number } | null} */
    let swipeStart = null;
    let suppressClick = false;

    dialog.addEventListener("pointerdown", (event) => {
      // A touch swipe may end without a click; never let that eat a later one.
      suppressClick = false;
      const onControl = event.target instanceof Element && event.target.closest("button");
      swipeStart = event.isPrimary && !onControl ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
    });

    dialog.addEventListener("pointercancel", () => {
      swipeStart = null;
    });

    dialog.addEventListener("pointerup", (event) => {
      if (!swipeStart || event.pointerId !== swipeStart.id) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (total < 2 || Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      // A swipe is not a click: keep it from counting as a backdrop click.
      suppressClick = true;
      show(dx < 0 ? current + 1 : current - 1);
    });

    dialog.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        suppressClick = false;
        event.stopImmediatePropagation();
      },
      { capture: true }
    );

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

    // CSS hides .reveal elements only once this class is set, so the content
    // stays visible if this script fails to load or throws earlier.
    document.documentElement.classList.add("reveal-ready");

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

    // As the default, so it survives form.reset() after a successful send.
    const service = new URLSearchParams(window.location.search).get("service");
    selectOption(select, service, true);
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
