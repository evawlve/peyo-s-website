document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll(".vnb-form");
  
    forms.forEach(form => {
      const nameInput = form.querySelector("#name");
      const emailInput = form.querySelector("#email");
      const phoneInput = form.querySelector("#phone");
      const serviceSelect = form.querySelector("#service");
      const messageInput = form.querySelector("#message"); // optional
  
      // Attach real-time validation
      if (nameInput) {
        addFocusBlurHandlers(nameInput, validateName);
      }
      if (emailInput) {
        addFocusBlurHandlers(emailInput, validateOptionalEmail);
      }
      if (phoneInput) {
        addFocusBlurHandlers(phoneInput, validateOptionalPhone);
        // Add phone masking
        phoneInput.addEventListener("input", () => {
          phoneInput.value = formatPhone(phoneInput.value);
        });
      }
  
      // Final check on submit
      form.addEventListener("submit", (e) => {
        // Clear old errors
        form.querySelectorAll(".error").forEach(err => err.remove());
        // Clear old highlights (optional, but good practice for submit)
        form.querySelectorAll('input, select').forEach(el => removeHighlight(el));
    
        let isValid = true;
    
        // 1) Name >= 2 chars
        if (nameInput) { // Check if element exists
          if (!validateName(nameInput)) { // Validate the input
            // Explicitly show error and highlight ON SUBMIT if invalid
            showError(nameInput, "Name must be at least 2 characters."); // Re-show error message
            highlightInput(nameInput, "red"); // Apply highlight
            isValid = false; // Mark form as invalid
          }
        }
    
    
        // 2) Email OR Phone on submit
         const emailVal = emailInput ? emailInput.value.trim() : "";
         const phoneVal = phoneInput ? stripNonDigits(phoneInput.value) : "";
    
         if (!emailVal && !phoneVal) {
           // Must have at least one
           if (emailInput) {
             showError(emailInput, "Please provide either a valid email or phone.");
             highlightInput(emailInput, "red");
           }
           if (phoneInput) {
             showError(phoneInput, "Please provide either a valid email or phone.");
             highlightInput(phoneInput, "red");
           }
           isValid = false;
         } else {
           // If email is not empty => must be valid
           if (emailVal && !isEmailValid(emailVal)) {
             showError(emailInput, "Invalid email format.");
             highlightInput(emailInput, "red");
             isValid = false;
           }
           // If phone is not empty => must be 10 digits
           // Ensure phone validation check is robust if field might not exist
           if (phoneVal && phoneInput && phoneVal.length !== 10) {
             showError(phoneInput, "Please enter a valid 10-digit phone number.");
             highlightInput(phoneInput, "red");
             isValid = false;
           }
         }
    
    
        // 3) Service required
        if (serviceSelect && !serviceSelect.value) {
          showError(serviceSelect, "Please select a service.");
          highlightInput(serviceSelect, "red");
          isValid = false;
        }
    
        // 4) Message optional => no checks
    
        if (!isValid) {
          e.preventDefault();
        }
      });
    });
  });
  
  /* ==================== Real-Time Hooks ==================== */
  
  /**
   * addFocusBlurHandlers
   *  - onFocus => remove error, remove highlight
   *  - onBlur  => if invalid => red, else green
   */
  function addFocusBlurHandlers(input, validatorFn) {
  input.addEventListener("focus", () => {
    removeError(input);
    removeHighlight(input);
  });

  input.addEventListener("blur", () => {
    const isValid = validatorFn(input); // Call the specific validator

    if (!isValid) {
      // Validator returned false, meaning input is present but invalid
      highlightInput(input, "red");
    } else {
      // Validator returned true. Now check if it was true because
      // the input is valid, or merely because it's empty (which is allowed for optional fields).
      if (input.value.trim() !== "") {
        // It's valid AND not empty, make it green
        highlightInput(input, "green");
      } else {
        // It's valid because it's empty. Ensure no highlight remains.
        removeHighlight(input);
      }
    }
  });
}
  
  /* ==================== Field Validators ==================== */
  
  /** validateName: must have at least 2 chars */
  function validateName(input) {
    removeError(input);
    const val = input.value.trim();
    if (val.length < 2) {
      showError(input, "Name must be at least 2 characters.");
      return false;
    }
    return true;
  }
  
  /** validateOptionalEmail: if not empty => must pass email check */
  function validateOptionalEmail(input) {
    removeError(input);
    const val = input.value.trim();
    if (!val) {
      removeHighlight(input);
      return true; // empty => ok in real-time
    }
    if (!isEmailValid(val)) {
      showError(input, "Invalid email format.");
      return false;
    }
    return true;
  }
  
  /** validateOptionalPhone: if not empty => must be 10 digits after removing formatting */
  function validateOptionalPhone(input) {
    removeError(input);
    const digits = stripNonDigits(input.value);
    if (!digits) {
      // empty => no error
      removeHighlight(input);
      return true;
    }
    if (digits.length !== 10) {
      showError(input, "Phone must be 10 digits.");
      return false;
    }
    return true;
  }
  
  /* ==================== Utility / Logic ==================== */
  
  function isEmailValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /** Removes all non-digits => used to check raw length for phone */
  function stripNonDigits(str) {
    return str.replace(/\D/g, '');
  }
  
  /* Input mask: (XXX) XXX-XXXX */
  /**
 * formatPhone(value)
 * Strips non-digits, ensures max 10 digits, and formats like:
 * (XXX) XXX-XXXX
 */
function formatPhone(value) {
    // 1) Strip all non-digits
    let digits = value.replace(/\D/g, "");
  
    // 2) Limit to max 10
    digits = digits.substring(0, 10);
  
    // 3) Construct the mask step by step
    if (digits.length === 0) {
      // empty -> no output
      return "";
    } else if (digits.length <= 3) {
      // up to 3 digits -> "(XXX"
      return `(${digits}`;
    } else if (digits.length <= 6) {
      // 4-6 digits -> "(XXX) XXX"
      return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    } else {
      // 7-10 digits -> "(XXX) XXX-XXXX"
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
  }
  
  /* ==================== Error & Highlight ==================== */
  
  /** showError => remove old error, then create + append .error below input */
  function showError(input, message) {
    removeError(input);
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("error");
    errorDiv.style.color = "red";
    errorDiv.style.fontSize = "0.9rem";
    errorDiv.style.marginTop = "5px";
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
  }
  
  /** removeError => remove existing .error in the same parent */
  function removeError(input) {
    const err = input.parentNode.querySelector(".error");
    if (err) err.remove();
  }
  
  /** highlightInput => apply red or green border */
  function highlightInput(input, color) {
    if (color === "red") {
      input.style.border = "2px solid red";
    } else if (color === "green") {
      input.style.border = "2px solid green";
    }
  }
  
  /** removeHighlight => reset border style */
  function removeHighlight(input) {
    input.style.border = "";
  }
  