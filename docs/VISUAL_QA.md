# Visual QA Checklist

## Design System Verification
- [ ] **Typography**: Headings should use `Inter` (or default sans) with `tracking-tight`.
- [ ] **Colors**: Primary should be a refined Crimson. Backgrounds should be stark white (light mode) or deep slate (dark mode).
- [ ] **Radius**: All corners should be 8px (`0.5rem`).
- [ ] **Shadows**: Cards should use `shadow-subtle` (very faint). Floated elements (popovers, dialogs) should use `shadow-layered`.
- [ ] **Scrollbars**: Global custom styling applied in `index.css` (8px thin, transparent track, translucent thumb reactive to light/dark themes). Opaque rails and thick default browser scrollbars must be avoided.
- [ ] **Dark Mode Color Consistency**:
    - Avoid hardcoding light backgrounds (`bg-slate-50`, `bg-cyan-50`, `bg-emerald-50`, etc.) and border/text colors without `dark:` overrides.
    - When using colored/themed inputs (cyan, rose, violet, emerald, etc.), apply matching dark translucent variants (e.g., `dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900/50`) to maintain readability and theme cohesion.
    - Listbox option items text colors must be legible in both themes. Do not use hardcoded dark colors (e.g. `text-slate-600`) without dark variants (e.g. `dark:text-slate-300`).
    - Colored shadows (e.g., `shadow-blue-200`, `shadow-emerald-200`) must be disabled or overridden in dark mode (e.g., `dark:shadow-black/40`) to prevent glowing halos.

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
