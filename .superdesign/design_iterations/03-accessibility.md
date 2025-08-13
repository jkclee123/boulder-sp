### Accessibility Notes

Header and Menu
- Avatar button has `aria-haspopup="menu"` and `aria-expanded` state.
- Clicking outside closes the menu; add Escape key handling later.
- Ensure focus styles are visible on avatar and menu items.

Filter Bar
- Each control is labeled with `aria-label`.
- Consider associating `<label>` elements if controls move.

List Items
- Use semantic `<article>` within a `role="list"` wrapper to support assistive tech.
- Provide meaningful text for badges and titles; avoid color-only indicators.

Future Work
- Keyboard navigation for the menu and filters.
- Live region for filter result counts.


