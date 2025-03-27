document.body.classList.remove("no-js");
document.addEventListener("DOMContentLoaded", function () {
  const modalOverlay = document.getElementById("modal-overlay");
  const closeModalBtn = document.getElementById("close-modal");
  const quoteButtons = document.querySelectorAll(".quote-button");
  const body = document.body;

  if (!modalOverlay || !closeModalBtn || quoteButtons.length === 0) {
    console.warn("Modal or quote buttons not found on this page.");
    return;
  }

  function showModal(service = "") {
    modalOverlay.style.display = "flex";

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      modalOverlay.classList.add("show");
      body.classList.add("modal-open");

      // Pre-select dropdown
      const serviceSelect = document.getElementById("service");
      if (serviceSelect && service) {
        serviceSelect.value = service;
      }
    });
  }

  function hideModal() {
    modalOverlay.classList.remove("show");
    body.classList.remove("modal-open");

    // Delay hiding modal until fade-out completes
    setTimeout(() => {
      modalOverlay.style.display = "none";
    }, 300); // Match CSS transition duration
  }

  quoteButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const href = button.getAttribute("href");
      const serviceMatch = href.match(/service=(\w+)/);
      const service = serviceMatch ? serviceMatch[1] : "";
      showModal(service);
    });
  });

  closeModalBtn.addEventListener("click", hideModal);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      hideModal();
    }
  });
  
    // Form validation
    const form = document.getElementById("contact-form");
  
    form.addEventListener("submit", function (event) {
      let isValid = true;
      const firstName = document.getElementById("first-name");
      const lastName = document.getElementById("last-name");
      const email = document.getElementById("email");
      const phone = document.getElementById("phone");
      const service = document.getElementById("service");
      const message = document.getElementById("message");
  
      // Clear previous errors
      document.querySelectorAll(".error").forEach(el => el.remove());
  
      function showError(input, message) {
        const error = document.createElement("div");
        error.classList.add("error");
        error.style.color = "red";
        error.style.fontSize = "0.9rem";
        error.style.marginTop = "5px";
        error.textContent = message;
        input.parentNode.insertBefore(error, input.nextSibling);
        isValid = false;
      }
  
      if (firstName.value.trim() === "") {
        showError(firstName, "First name is required.");
      }
  
      if (lastName.value.trim() === "") {
        showError(lastName, "Last name is required.");
      }
  
      if (!email.value.match(/^\S+@\S+\.\S+$/)) {
        showError(email, "Please enter a valid email address.");
      }
  
      if (!phone.value.match(/^\d{10}$/)) {
        showError(phone, "Please enter a valid 10-digit phone number.");
      }
  
      if (service.value === "") {
        showError(service, "Please select a service.");
      }
  
      if (message.value.trim() === "") {
        showError(message, "Message cannot be empty.");
      }
  
      // If invalid, prevent form submission
      if (!isValid) {
        event.preventDefault();
      }
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    // Toggle mobile navigation when clicking the hamburger menu
    hamburger.addEventListener("click", function () {
        if (!navLinks.classList.contains("active")) {
            // First, make it visible before fading in
            navLinks.style.visibility = "visible";
            navLinks.style.display = "flex";

            // Delay opacity and transform slightly so fade-in works
            setTimeout(() => {
                navLinks.classList.add("active");
                navLinks.style.opacity = "1";
                navLinks.style.transform = "translateY(0)";
            }, 10); // Small delay ensures transition works
        } else {
            // Fade out effect
            navLinks.style.opacity = "0";
            navLinks.style.transform = "translateY(-10px)";

            // Delay hiding the menu until after fade-out completes
            setTimeout(() => {
                if (!navLinks.classList.contains("active")) {
                    navLinks.style.visibility = "hidden";
                    navLinks.style.display = "none";
                }
            }, 300);
        }

        // Toggle class
        navLinks.classList.toggle("active");
    });

    // Ensure nav is always visible when resizing to large screens
    window.addEventListener("resize", function () {
        if (window.innerWidth > 768) {
            navLinks.style.visibility = "visible";
            navLinks.style.display = "flex";
            navLinks.style.opacity = "1";
            navLinks.style.transform = "translateY(0)";
            navLinks.classList.remove("active");
        } else {
            navLinks.style.visibility = "hidden";
            navLinks.style.display = "none";
            navLinks.style.opacity = "0";
            navLinks.style.transform = "translateY(-10px)";
        }
    });
});


  
  
  
  