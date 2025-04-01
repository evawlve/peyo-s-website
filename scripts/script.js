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
    
  });

  document.addEventListener("DOMContentLoaded", function () {
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");
    const transitionDuration = 300; // Match your CSS transition duration in ms

    // --- Function to Open Menu ---
    function openMenu() {
        if (!navLinks.classList.contains("active")) {
            // Make it visible before starting transition
            navLinks.style.visibility = "visible";
            navLinks.style.display = "flex"; // Or "block", matching your CSS

            // Use setTimeout to allow the display change to register before adding class
            setTimeout(() => {
                navLinks.classList.add("active");
                navLinks.style.opacity = "1";
                navLinks.style.transform = "translateY(0)";
            }, 10); // Small delay
        }
    }

    // --- Function to Close Menu ---
    function closeMenu() {
        if (navLinks.classList.contains("active")) {
            // Start fade out
            navLinks.style.opacity = "0";
            navLinks.style.transform = "translateY(-10px)"; // Or your desired transform
            navLinks.classList.remove("active"); // Remove active class immediately

            // Set display:none and visibility:hidden after transition ends
            setTimeout(() => {
                // Double check it's still meant to be closed
                if (!navLinks.classList.contains("active")) {
                    navLinks.style.visibility = "hidden";
                    navLinks.style.display = "none";
                }
            }, transitionDuration);
        }
    }

    // --- Hamburger Click Toggle ---
    hamburger.addEventListener("click", function (event) {
        // Optional: stopPropagation if needed, but usually the check below is sufficient
        // event.stopPropagation();
        if (navLinks.classList.contains("active")) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // --- Click Outside to Close ---
    document.addEventListener("click", function (event) {
        // Check if the menu is open
        // AND if the click target is NOT the hamburger
        // AND if the click target is NOT inside the navLinks container
        if (
            navLinks.classList.contains("active") &&
            !hamburger.contains(event.target) &&
            !navLinks.contains(event.target)
        ) {
            closeMenu();
        }
    });

    // --- Resize Listener ---
    // Consider simplifying this - CSS media queries often handle default states better.
    // This JS mainly needs to ensure state consistency when crossing the breakpoint.
    window.addEventListener("resize", function () {
        const isDesktop = window.innerWidth > 768;

        if (isDesktop) {
            // On desktop, ensure menu is visible and not in "active" mobile state
            navLinks.style.visibility = "visible";
            navLinks.style.display = "flex"; // Use your desktop display type
            navLinks.style.opacity = "1";
            navLinks.style.transform = "translateY(0)";
            navLinks.classList.remove("active"); // Crucial: remove mobile state class
        } else {
            // Resizing down to mobile view. If the menu isn't currently active (open),
            // ensure its styles are reset to the hidden defaults.
            // If it *is* active, let it stay active until closed manually or by clicking outside.
            if (!navLinks.classList.contains("active")) {
                 navLinks.style.visibility = "hidden";
                 navLinks.style.display = "none";
                 navLinks.style.opacity = "0";
                 navLinks.style.transform = "translateY(-10px)"; // Match closed state
            }
        }
    });

    // Initial setup for mobile: ensure it's hidden if starting on small screen
    // This might be better handled purely by CSS initially.
    if (window.innerWidth <= 768 && !navLinks.classList.contains('active')) {
         navLinks.style.visibility = "hidden";
         navLinks.style.display = "none";
         navLinks.style.opacity = "0";
         navLinks.style.transform = "translateY(-10px)";
    }
});


  
  
  
  