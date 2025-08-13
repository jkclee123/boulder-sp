### Responsive Header with Profile Avatar

Goals
- Keep brand left, actions right.
- Provide a compact profile entry point (avatar) with a menu for account actions.
- Remain visible while scrolling content (sticky).

Decisions
- Sticky header: improves quick access to profile and filters.
- Avatar button: 36px circle, shows user photo or initial fallback.
- Menu: right-aligned popover with subtle shadow and clear hit targets.

States
- Logged out: show Login button.
- Logged in: show avatar; menu items: My Profile, Sign out.

Breakpoints
- Desktop/tablet: header layout stays single-row.
- Mobile: same layout; use concise sizes; rely on sticky behavior.

Interactions
- Click avatar toggles menu; clicking outside closes it.
- Escape closes menu (future enhancement).

Future Enhancements
- Add keyboard navigation for menu items.
- Add user preview card and settings link.


