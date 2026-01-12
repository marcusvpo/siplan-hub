# Visual QA Checklist

## Design System Verification
- [ ] **Typography**: Headings should use `Inter` (or default sans) with `tracking-tight`.
- [ ] **Colors**: Primary should be a refined Crimson. Backgrounds should be stark white (light mode) or deep slate (dark mode).
- [ ] **Radius**: All corners should be 8px (`0.5rem`).
- [ ] **Shadows**: Cards should use `shadow-subtle` (very faint). Floated elements (popovers, dialogs) should use `shadow-layered`.

## Component Check
- [ ] **Buttons**:
    - `default`: Crimson background, shadow.
    - `secondary`/`outline`: Subtle shadow, no grey background default.
- [ ] **Inputs**: Default height `h-10`. "Crafted" border color (Slate 200).
- [ ] **Sidebar**:
    - Background should match or be very subtly distinct from the main page.
    - Floating sidebar should have `shadow-layered`.
- [ ] **Modals/Dialogs**:
    - Overlay backdrop blur/opacity.
    - Panel should have deep `shadow-layered`.
