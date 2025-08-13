### Filter Bar and List View

Goals
- Make scanning and narrowing results fast on all devices.
- Keep filter controls discoverable without consuming excessive vertical space.

Filter Bar
- Sticky just below header so filters stay visible while scrolling.
- Inputs: search, category, sort.
- Compact 40px controls; 10px container padding; rounded corners.

List View
- Card-like list rows with light borders and 12px radius.
- Three columns on wide screens: media, content, meta.
- Collapse to two columns on small screens; meta wraps beneath.

Breakpoints
- ≤ 720px: filter row stacks vertically.
- ≤ 560px: list item uses two-column responsive grid.

Accessibility
- `role="search"` on filter container; `aria-label`s on inputs.
- Badges use high-contrast background and 12px font.

Performance
- Keep list virtualizable in future if results exceed 100 items.


