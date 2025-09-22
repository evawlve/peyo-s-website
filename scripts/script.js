document.body.classList.remove("no-js");

// Smooth scroll function
function smoothScrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const headerOffset = document.querySelector('header').offsetHeight;
  const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - headerOffset - 20; // extra 20px for breathing room

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize smooth scroll for Get Started button
  const getStartedBtn = document.querySelector('.hero-btn.get-started');
  if (getStartedBtn) {
    // Check which page we're on and scroll to appropriate section
    if (document.body.classList.contains('carpet-page')) {
      getStartedBtn.addEventListener('click', () => smoothScrollTo('before-after'));
    } else if (document.body.classList.contains('landscape-page')) {
      getStartedBtn.addEventListener('click', () => smoothScrollTo('landscape-services'));
    } else if (document.body.classList.contains('snow-page')) {
      getStartedBtn.addEventListener('click', () => smoothScrollTo('snow-services'));
    } else {
      getStartedBtn.addEventListener('click', () => smoothScrollTo('intro'));
    }
  }
  const modalOverlay = document.getElementById("modal-overlay");
  const closeModalBtn = document.getElementById("close-modal");
  const quoteButtons = document.querySelectorAll(".quote-button");
  const body = document.body;

  console.log('Modal elements found:');
  console.log('modalOverlay:', modalOverlay);
  console.log('closeModalBtn:', closeModalBtn);
  console.log('quoteButtons:', quoteButtons.length);

  if (!modalOverlay || !closeModalBtn) {
    console.warn("Modal elements not found on this page.");
    return;
  }

  function showModal(service = "") {
    console.log('showModal called with service:', service);
    console.log('modalOverlay element:', modalOverlay);
    modalOverlay.style.display = "flex";

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      modalOverlay.classList.add("show");
      body.classList.add("modal-open");

      // Pre-select dropdown
      const serviceSelect = document.getElementById("service");
      if (serviceSelect && service) {
        serviceSelect.value = service;
        console.log('Service selected:', service);
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

  // Only add quote button listeners if quote buttons exist
  if (quoteButtons.length > 0) {
    quoteButtons.forEach(button => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const href = button.getAttribute("href");
        if (href) {
          // Handle buttons with href (links)
          const serviceMatch = href.match(/service=(\w+)/);
          const service = serviceMatch ? serviceMatch[1] : "";
          showModal(service);
        } else {
          // Handle buttons without href (button elements)
          // Determine service based on page class
          let service = "";
          if (document.body.classList.contains('carpet-page')) {
            service = "carpet";
          } else if (document.body.classList.contains('landscape-page')) {
            service = "landscape";
          } else if (document.body.classList.contains('snow-page')) {
            service = "snow";
          }
          showModal(service);
        }
      });
    });
  }

  // Handle contact buttons in hero sections
  const contactButtons = document.querySelectorAll('.hero-btn.contact-btn');
  console.log('Found contact buttons:', contactButtons.length);
  contactButtons.forEach((button, index) => {
    console.log(`Adding listener to button ${index}`);
    button.addEventListener("click", (e) => {
      console.log('Contact button clicked!');
      e.preventDefault();
      // Determine service based on page class
      let service = "";
      if (document.body.classList.contains('carpet-page')) {
        service = "carpet";
      } else if (document.body.classList.contains('landscape-page')) {
        service = "landscape";
      } else if (document.body.classList.contains('snow-page')) {
        service = "snow";
      }
      console.log('Service determined:', service);
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

// Image Modal Functionality
document.addEventListener("DOMContentLoaded", function () {
  const imageModalOverlay = document.getElementById("image-modal-overlay");
  const closeImageModalBtn = document.getElementById("close-image-modal");
  const modalImage = document.getElementById("modal-image");
  const modalCaption = document.getElementById("modal-caption");
  const clickableImages = document.querySelectorAll(".clickable-image");
  const body = document.body;

  if (!imageModalOverlay || !closeImageModalBtn || !modalImage || !modalCaption) {
    console.warn("Image modal elements not found on this page.");
    return;
  }

  function showImageModal(imageSrc, caption) {
    modalImage.src = imageSrc;
    modalCaption.textContent = caption;
    imageModalOverlay.style.display = "flex";
    
    // Trigger fade-in animation
    requestAnimationFrame(() => {
      imageModalOverlay.classList.add("show");
      body.classList.add("image-modal-open");
    });
  }

  function hideImageModal() {
    imageModalOverlay.classList.remove("show");
    body.classList.remove("image-modal-open");

    // Delay hiding modal until fade-out completes
    setTimeout(() => {
      imageModalOverlay.style.display = "none";
    }, 300); // Match CSS transition duration
  }

  // Add click event listeners to all clickable images
  clickableImages.forEach(image => {
    image.addEventListener("click", (e) => {
      e.preventDefault();
      const imageSrc = image.src;
      const caption = image.getAttribute("data-caption") || image.alt;
      showImageModal(imageSrc, caption);
    });
  });

  // Close modal when clicking the close button
  closeImageModalBtn.addEventListener("click", hideImageModal);

  // Close modal when clicking outside the image
  imageModalOverlay.addEventListener("click", (e) => {
    if (e.target === imageModalOverlay) {
      hideImageModal();
    }
  });

  // Close modal when pressing Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageModalOverlay.classList.contains("show")) {
      hideImageModal();
    }
  });
});
  