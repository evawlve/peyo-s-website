// @ts-check
/**
 * V&B Luxe — quote/contact form validation and submission.
 *
 * Enhances every `form.vnb-form` on the page independently:
 *   - name: at least 2 characters
 *   - email or phone: at least one is required
 *   - email: valid format when filled in
 *   - phone: exactly 10 digits when filled in, masked as (XXX) XXX-XXXX
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
    phone: "Please enter a 10-digit phone number.",
    service: "Please select a service.",
  };

  const STATUS = {
    sending: "Sending…",
    success: "Thanks! Your request was sent — we'll be in touch soon.",
    error: "Something went wrong. Please email pedro.vnb.luxe@gmail.com or call (530) 314-9400.",
  };

  /** @type {FieldName[]} */
  const VALIDATED_FIELDS = ["name", "phone", "email", "service"];

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ------------------------------------------------------------------------
     Phone helpers
     ------------------------------------------------------------------------ */

  /** @param {string} value */
  const digitsOnly = (value) => value.replace(/\D/g, "");

  /**
   * Normalize to at most 10 digits, dropping a leading US country code.
   * @param {string} value
   */
  function phoneDigits(value) {
    const digits = digitsOnly(value);
    const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return local.slice(0, 10);
  }

  /**
   * Format digits progressively as (XXX) XXX-XXXX.
   * @param {string} digits
   */
  function formatPhone(digits) {
    if (digits.length === 0) return "";
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

    input.addEventListener("input", (event) => {
      const caret = input.selectionStart ?? input.value.length;
      let digits = phoneDigits(input.value);
      let digitsBeforeCaret = digitsOnly(input.value.slice(0, caret)).length;

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
   * @param {FormControl} control
   * @param {string} message
   */
  function showError(control, message) {
    const field = getField(control);
    field?.classList.add("is-invalid");
    field?.classList.remove("is-valid");
    control.setAttribute("aria-invalid", "true");

    const error = getErrorElement(control);
    if (error) {
      error.textContent = message;
      toggleDescribedBy(control, error.id, true);
    }
  }

  /** @param {FormControl} control */
  function clearError(control) {
    getField(control)?.classList.remove("is-invalid");
    control.removeAttribute("aria-invalid");

    const error = getErrorElement(control);
    if (error) {
      error.textContent = "";
      toggleDescribedBy(control, error.id, false);
    }
  }

  /** @param {FormControl} control */
  function clearState(control) {
    clearError(control);
    getField(control)?.classList.remove("is-valid");
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
    const hasPhone = () => (controls.phone ? digitsOnly(controls.phone.value) : "") !== "";
    const requiresContact = () => Boolean(controls.email || controls.phone);

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
          return requiresContact() && !hasPhone() ? MESSAGES.contact : "";
        case "phone":
          if (value) return digitsOnly(value).length === 10 ? "" : MESSAGES.phone;
          return requiresContact() && !hasEmail() ? MESSAGES.contact : "";
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
        showError(control, message);
        return false;
      }

      clearError(control);
      getField(control)?.classList.toggle("is-valid", control.value.trim() !== "");
      return true;
    }

    /**
     * @param {string} text
     * @param {"is-success" | "is-error" | null} state
     */
    function setStatus(text, state) {
      if (!(status instanceof HTMLElement)) return;
      status.textContent = text;
      status.classList.toggle("is-success", state === "is-success");
      status.classList.toggle("is-error", state === "is-error");
    }

    /** @param {boolean} busy */
    function setBusy(busy) {
      isSending = busy;
      if (!(submitButton instanceof HTMLButtonElement)) return;
      submitButton.disabled = busy;
      submitButton.textContent = busy ? STATUS.sending : buttonLabel;
      if (busy) submitButton.setAttribute("aria-busy", "true");
      else submitButton.removeAttribute("aria-busy");
    }

    async function send() {
      form.classList.remove("is-sent");
      setStatus("", null);
      setBusy(true);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

        form.reset();
        VALIDATED_FIELDS.forEach((name) => {
          const control = controls[name];
          if (control) clearState(control);
        });
        form.classList.add("is-sent");
        setStatus(STATUS.success, "is-success");
      } catch {
        setStatus(STATUS.error, "is-error");
      } finally {
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
        const otherError = other ? getErrorElement(other) : null;
        if (other && otherError?.textContent === MESSAGES.contact) clearError(other);
      });
    });

    if (controls.phone instanceof HTMLInputElement) attachPhoneMask(controls.phone);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isSending) return;

      const results = VALIDATED_FIELDS.map(validateField);
      if (results.includes(false)) {
        setStatus("", null);
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
