// @ts-check
/**
 * V&B Luxe — quote/contact form validation and submission.
 *
 * Enhances every `form.vnb-form` on the page independently:
 *   - name: at least 2 characters
 *   - email or phone: at least one is required
 *   - email: valid format when filled in
 *   - phone: a valid 10-digit US number when filled in, masked as (XXX) XXX-XXXX
 *   - service: required
 *   - message: optional
 * Valid forms are sent to Formspree with fetch() so the visitor stays on
 * the page and sees an inline success or error message.
 */
(() => {
  "use strict";

  /** @typedef {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} FormControl */
  /** @typedef {"name" | "email" | "phone" | "service"} FieldName */

  const MESSAGES = {
    name: "Please enter your name (at least 2 characters).",
    contact: "Please add an email address or a phone number.",
    email: "Please enter a valid email address, like name@example.com.",
    phone: "Please enter a valid 10-digit phone number.",
    service: "Please select a service.",
  };

  const STATUS = {
    sending: "Sending…",
    success: "Thanks! Your request was sent — we’ll be in touch soon.",
    error: "Something went wrong. Please email pedro.vnb.luxe@gmail.com or call (530) 314-9400.",
    checkFields: "Please check the highlighted fields and try again.",
  };

  /** Give up on a request that has not answered after this long. */
  const REQUEST_TIMEOUT_MS = 15000;

  /** @type {FieldName[]} */
  const VALIDATED_FIELDS = ["name", "phone", "email", "service"];

  // One "@", no spaces, no empty or doubled dots in the domain, and a
  // top-level domain of 2+ characters. Deliberately simple; Formspree
  // re-checks on the server.
  const EMAIL_PATTERN = /^(?!.*\.\.)[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;

  // North American numbers: area code and exchange cannot start with 0 or 1.
  const US_PHONE_PATTERN = /^[2-9]\d{2}[2-9]\d{6}$/;

  /* ------------------------------------------------------------------------
     Phone helpers
     ------------------------------------------------------------------------ */

  /** @param {string} value */
  const digitsOnly = (value) => value.replace(/\D/g, "");

  /**
   * All digits typed, minus a leading US country code on an 11-digit
   * number. Never truncates: extra digits must fail validation, not vanish.
   * @param {string} value
   */
  function phoneDigits(value) {
    const digits = digitsOnly(value);
    return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  }

  /**
   * Format digits progressively as (XXX) XXX-XXXX. Anything longer than a
   * US number is left as plain digits so the visitor can see and fix it.
   * @param {string} digits
   */
  function formatPhone(digits) {
    if (digits.length === 0) return "";
    if (digits.length > 10) return digits;
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  /**
   * Index in a formatted value just after the given number of digits.
   * @param {string} formatted
   * @param {number} digitCount
   */
  function caretAfterDigits(formatted, digitCount) {
    if (digitCount <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) seen += 1;
      if (seen === digitCount) return i + 1;
    }
    return formatted.length;
  }

  /**
   * Live input mask that keeps the caret in place while typing or editing
   * in the middle of the number.
   * @param {HTMLInputElement} input
   */
  function attachPhoneMask(input) {
    let previousDigits = phoneDigits(input.value);

    // Typing another digit into a complete number would push the last digit
    // off the end, so ignore it (a leading "1" country code is still allowed).
    input.addEventListener("beforeinput", (event) => {
      if (event.inputType !== "insertText" || !event.data || !/\d/.test(event.data)) return;
      if (input.selectionStart !== input.selectionEnd) return;
      const digits = digitsOnly(input.value);
      if (digits.length >= 10 && !(digits.length === 10 && digits.startsWith("1"))) {
        event.preventDefault();
      }
    });

    input.addEventListener("input", (event) => {
      const caret = input.selectionStart ?? input.value.length;
      let digits = phoneDigits(input.value);
      let digitsBeforeCaret = digitsOnly(input.value.slice(0, caret)).length;
      if (digitsOnly(input.value).length > digits.length) digitsBeforeCaret = Math.max(0, digitsBeforeCaret - 1);

      // Backspacing over a mask character, e.g. ")" or "-", removes the digit before it.
      const isBackspace = event instanceof InputEvent && event.inputType === "deleteContentBackward";
      if (isBackspace && digits === previousDigits && digitsBeforeCaret > 0) {
        digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
        digitsBeforeCaret -= 1;
      }

      const formatted = formatPhone(digits);
      input.value = formatted;
      previousDigits = digits;

      if (document.activeElement === input) {
        const position = caretAfterDigits(formatted, Math.min(digitsBeforeCaret, digits.length));
        input.setSelectionRange(position, position);
      }
    });

    // The "reset" event fires before the value is restored to its default.
    input.form?.addEventListener("reset", () => {
      previousDigits = "";
    });
  }

  /* ------------------------------------------------------------------------
     Field state (classes, ARIA and error text)
     ------------------------------------------------------------------------ */

  /** @param {FormControl} control */
  const getField = (control) => control.closest(".field");

  /** @param {FormControl} control */
  function getErrorElement(control) {
    const error = getField(control)?.querySelector(".field-error");
    if (!(error instanceof HTMLElement)) return null;
    if (!error.id) error.id = `${control.id || control.name}-error`;
    return error;
  }

  /**
   * Add or remove one id from the control's aria-describedby list,
   * keeping any ids that were already there.
   * @param {FormControl} control
   * @param {string} id
   * @param {boolean} include
   */
  function toggleDescribedBy(control, id, include) {
    const ids = new Set((control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
    if (include) ids.add(id);
    else ids.delete(id);

    if (ids.size > 0) control.setAttribute("aria-describedby", Array.from(ids).join(" "));
    else control.removeAttribute("aria-describedby");
  }

  /**
   * Mark a control invalid. With `sharedError`, the message is not repeated
   * under this control: it points at another field's message instead.
   * @param {FormControl} control
   * @param {string} message
   * @param {HTMLElement | null} [sharedError]
   */
  function showError(control, message, sharedError = null) {
    const field = getField(control);
    field?.classList.add("is-invalid");
    field?.classList.remove("is-valid");
    control.setAttribute("aria-invalid", "true");
    control.dataset.error = message === MESSAGES.contact ? "contact" : "field";

    const error = sharedError ?? getErrorElement(control);
    if (!error) return;
    if (!sharedError) error.textContent = message;
    toggleDescribedBy(control, error.id, true);
    if (sharedError) control.dataset.sharedError = error.id;
  }

  /** @param {FormControl} control */
  function clearError(control) {
    getField(control)?.classList.remove("is-invalid");
    control.removeAttribute("aria-invalid");
    delete control.dataset.error;

    const error = getErrorElement(control);
    if (error) {
      error.textContent = "";
      toggleDescribedBy(control, error.id, false);
    }

    const sharedId = control.dataset.sharedError;
    if (sharedId) {
      toggleDescribedBy(control, sharedId, false);
      delete control.dataset.sharedError;
    }
  }

  /** @param {FormControl} control */
  function clearState(control) {
    clearError(control);
    getField(control)?.classList.remove("is-valid");
  }

  /**
   * The field's label text without its hint, e.g. "Phone".
   * @param {FormControl} control
   */
  function getFieldLabel(control) {
    const label = control.labels?.[0];
    const text = label?.firstChild?.textContent ?? label?.textContent ?? control.name;
    return text.trim();
  }

  /* ------------------------------------------------------------------------
     Form enhancement
     ------------------------------------------------------------------------ */

  /**
   * @param {HTMLFormElement} form
   * @param {string} name
   * @returns {FormControl | null}
   */
  function getControl(form, name) {
    const el = form.querySelector(`[name="${name}"]`);
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      return el;
    }
    return null;
  }

  /** @param {HTMLFormElement} form */
  function enhanceForm(form) {
    /** @type {Record<FieldName, FormControl | null>} */
    const controls = {
      name: getControl(form, "name"),
      email: getControl(form, "email"),
      phone: getControl(form, "phone"),
      service: getControl(form, "service"),
    };

    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".form-status");
    const buttonLabel = submitButton?.textContent ?? "";
    let isSending = false;

    const hasEmail = () => (controls.email?.value.trim() ?? "") !== "";
    const hasPhone = () => digitsOnly(controls.phone?.value ?? "") !== "";
    const hasContactFields = () => Boolean(controls.email || controls.phone);

    /**
     * Error message for a field, or "" when it is valid.
     * @param {FieldName} name
     */
    function getErrorMessage(name) {
      const control = controls[name];
      if (!control) return "";
      const value = control.value.trim();

      switch (name) {
        case "name":
          return value.length >= 2 ? "" : MESSAGES.name;
        case "email":
          if (value) return EMAIL_PATTERN.test(value) ? "" : MESSAGES.email;
          return hasContactFields() && !hasPhone() ? MESSAGES.contact : "";
        case "phone":
          if (value) return US_PHONE_PATTERN.test(phoneDigits(value)) ? "" : MESSAGES.phone;
          return hasContactFields() && !hasEmail() ? MESSAGES.contact : "";
        case "service":
          return value ? "" : MESSAGES.service;
        default:
          return "";
      }
    }

    /**
     * Validate one field and update its UI. Returns true when valid.
     * @param {FieldName} name
     */
    function validateField(name) {
      const control = controls[name];
      if (!control) return true;

      const message = getErrorMessage(name);
      if (message) {
        // "Add an email or a phone" is one problem: say it once, under Email,
        // and point the Phone field at that same message.
        const shareWithEmail = name === "phone" && message === MESSAGES.contact && controls.email;
        showError(control, message, shareWithEmail && controls.email ? getErrorElement(controls.email) : null);
        return false;
      }

      clearError(control);
      getField(control)?.classList.toggle("is-valid", control.value.trim() !== "");
      return true;
    }

    /**
     * @param {string} text
     * @param {"is-success" | "is-error" | null} state  null = screen-reader-only note
     */
    function setStatus(text, state) {
      if (!(status instanceof HTMLElement)) return;
      status.textContent = text;
      status.classList.toggle("is-success", state === "is-success");
      status.classList.toggle("is-error", state === "is-error");
    }

    function clearSentState() {
      if (!form.classList.contains("is-sent")) return;
      form.classList.remove("is-sent");
      setStatus("", null);
    }

    /**
     * aria-disabled (not `disabled`) keeps keyboard focus on the button
     * while sending; the isSending guard blocks a second submit.
     * @param {boolean} busy
     */
    function setBusy(busy) {
      isSending = busy;
      if (!(submitButton instanceof HTMLButtonElement)) return;
      submitButton.textContent = busy ? STATUS.sending : buttonLabel;
      if (busy) {
        submitButton.setAttribute("aria-disabled", "true");
        submitButton.setAttribute("aria-busy", "true");
      } else {
        submitButton.removeAttribute("aria-disabled");
        submitButton.removeAttribute("aria-busy");
      }
    }

    /**
     * Show Formspree's field errors (`{ errors: [{ field, message }] }`) on
     * the matching fields. Returns true when at least one field was marked.
     * @param {unknown} body
     */
    function showServerErrors(body) {
      const errors =
        body && typeof body === "object" && "errors" in body && Array.isArray(body.errors) ? body.errors : [];
      let marked = false;
      for (const error of errors) {
        const field = error && typeof error === "object" ? error.field : null;
        const name = VALIDATED_FIELDS.find((key) => key === field);
        const control = name ? controls[name] : null;
        if (!name || !control) continue;
        showError(control, MESSAGES[name]);
        marked = true;
      }
      return marked;
    }

    async function send() {
      form.classList.remove("is-sent");
      setStatus("", null);
      setBusy(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (showServerErrors(body)) {
            setStatus(STATUS.checkFields, "is-error");
            return;
          }
          throw new Error(`Form submission failed with status ${response.status}`);
        }

        form.reset();
        VALIDATED_FIELDS.forEach((name) => {
          const control = controls[name];
          if (control) clearState(control);
        });
        form.classList.add("is-sent");
        setStatus(STATUS.success, "is-success");
      } catch (error) {
        console.error(error);
        setStatus(STATUS.error, "is-error");
      } finally {
        window.clearTimeout(timeout);
        setBusy(false);
      }
    }

    // Live feedback: validate filled-in fields on blur, clear errors on input.
    VALIDATED_FIELDS.forEach((name) => {
      const control = controls[name];
      if (!control) return;

      const blurEvent = control instanceof HTMLSelectElement ? "change" : "blur";
      control.addEventListener(blurEvent, () => {
        if (control.value.trim() !== "") validateField(name);
      });

      control.addEventListener("input", () => {
        clearState(control);

        // Filling in either contact method resolves the "email or phone" error on the other.
        const other = name === "email" ? controls.phone : name === "phone" ? controls.email : null;
        if (other?.dataset.error === "contact") clearError(other);
      });
    });

    // A success message is stale once the visitor starts a new request or
    // closes the quote dialog.
    form.addEventListener("input", clearSentState);
    form.closest("dialog")?.addEventListener("close", clearSentState);

    if (controls.phone instanceof HTMLInputElement) attachPhoneMask(controls.phone);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isSending) return;

      const invalid = VALIDATED_FIELDS.filter((name) => !validateField(name));
      if (invalid.length > 0) {
        // One summary for screen readers (the inline errors are only read
        // when each field is visited), then focus the first problem.
        const labels = invalid.flatMap((name) => {
          const control = controls[name];
          return control ? [getFieldLabel(control)] : [];
        });
        const summary =
          labels.length === 1
            ? `Please fix the ${labels[0]} field.`
            : `Please fix ${labels.length} fields: ${labels.join(", ")}.`;
        setStatus(summary, null);

        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
        return;
      }

      send();
    });
  }

  document.querySelectorAll("form.vnb-form").forEach((form) => {
    if (form instanceof HTMLFormElement) enhanceForm(form);
  });
})();
