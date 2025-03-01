document.addEventListener("DOMContentLoaded", function () {
    // Pre-select the service based on the URL parameter
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service");
    if (service) {
      document.getElementById("service").value = service;
    }
  
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
      navLinks.classList.toggle("active");
  
      // Ensure the menu is displayed when activated
      if (navLinks.classList.contains("active")) {
        navLinks.style.display = "flex";
      } else {
        setTimeout(() => {
          navLinks.style.display = "none";
        }, 300); // Delay hiding to allow fade-out animation
      }
    });
  
    // Ensure nav is always visible when resizing to large screens
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        navLinks.style.display = "flex"; // Show nav bar when back in large screen mode
        navLinks.classList.remove("active"); // Remove any active mobile state
      } else {
        navLinks.style.display = "none"; // Ensure it's hidden in mobile view initially
      }
    });
  });
  
  