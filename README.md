# V&B Luxe — Website

Marketing site for **V&B Luxe**, a Lake Tahoe home-services business offering carpet cleaning, snow removal, and landscaping.

Built with **vanilla HTML, CSS, and JavaScript** — no framework, no bundler, no build step. Every page is a plain `.html` file that can be served from any static host (GitHub Pages, Netlify, etc.).

## Pages

| Page | Highlights |
| --- | --- |
| `index.html` | Hero, service cards, about/features, "How it works" steps, call-to-action band, LocalBusiness JSON-LD |
| `carpet.html` | Before & after gallery with a keyboard-accessible lightbox, quote request modal |
| `snow.html` / `landscape.html` | Service details, what's included, quote request modal |
| `contact.html` | Contact form (Formspree) with live validation; `?service=snow` preselects a service |
| `404.html` | Friendly not-found page |

## Project structure

```
├── *.html                 # One file per page
├── styles/
│   ├── main.css           # Design tokens, base styles, layout, components, forms, footer
│   ├── header.css         # Sticky header + responsive navigation
│   ├── featurephotos.css  # Before/after gallery + lightbox
│   └── contact.css        # Contact page layout
├── scripts/
│   ├── script.js          # Nav, header state, dialogs, lightbox, scroll reveal
│   └── validation.js      # Form validation, phone mask, async Formspree submit
├── images/
│   ├── hero/              # Responsive WebP hero images (768w / 1536w)
│   └── carpet/            # Before/after photos (800w / 1600w WebP + originals)
├── jsconfig.json          # Type-checks the vanilla JS with TypeScript (no TS syntax)
└── package.json           # Dev scripts only — no runtime dependencies
```

## Running locally

```bash
npm start            # serves the site at http://localhost:8080
npm run typecheck    # type-checks scripts/ via JSDoc + // @ts-check
```

(Or open the folder with any static server, e.g. VS Code Live Server.)

## Technical notes

- **Design system in plain CSS.** Colors, type, radii, shadows, and spacing are CSS custom properties on `:root`. Fluid typography uses `clamp()`. Fonts are Fraunces (display) and Inter (body).
- **Performance.**
  - Hero images are real `<img>` elements with `srcset`/`sizes` and `fetchpriority="high"`, so phones download the 768px version.
  - Gallery photos were converted from 3–5 MB JPEGs to responsive WebP, lazy-loaded, with explicit `width`/`height` to prevent layout shift.
  - Scripts load with `defer`.
- **Native `<dialog>`** powers the quote modal and the lightbox, which gives focus trapping, Escape-to-close, and focus return without a library.
- **Progressive enhancement.**
  - Quote buttons are real links to `contact.html?service=…`. JavaScript upgrades them to open the modal.
  - Scroll-reveal animations only apply when JS is running.
  - In-page links use CSS `scroll-behavior` and `scroll-margin-top`.
- **Accessibility.**
  - Skip link, `aria-expanded` menu toggle, `aria-current` on the active page, visible `:focus-visible` rings.
  - Form errors are wired with `aria-invalid`/`aria-describedby`, and form status messages use a live region.
  - All motion respects `prefers-reduced-motion`.
- **Type-safe vanilla JS.** Both scripts use `// @ts-check` with JSDoc types, and `tsc` runs in strict mode with zero errors. You get TypeScript's safety without a compile step.
- **Forms** submit to Formspree with `fetch`, so visitors stay on the page and see an inline success or error message. A honeypot field filters spam.
