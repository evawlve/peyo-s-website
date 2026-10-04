/**
 * html-validate config: the recommended preset, minus two rules that clash
 * with deliberate choices in this site.
 */
module.exports = {
  extends: ["html-validate:recommended"],
  rules: {
    // Scroll-reveal stagger is set per element with `style="--reveal-delay: …"`.
    // Only a custom property is set inline; all styling stays in the CSS files.
    "no-inline-style": "off",
    // Phone numbers stay on one line through CSS (`a[href^="tel:"] { white-space: nowrap }`
    // in main.css) rather than non-breaking characters in the markup.
    "tel-non-breaking": "off",
  },
};
