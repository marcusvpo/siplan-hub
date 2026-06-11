# Visual QA Checklist

## Design System Verification
- [ ] **Typography**: Headings should use `Inter` (or default sans) with `tracking-tight`.
- [ ] **Colors**: Primary should be a refined Crimson. Backgrounds should be stark white (light mode) or deep slate (dark mode).
- [ ] **Radius**: All corners should be 8px (`0.5rem`).
- [ ] **Shadows**: Cards should use `shadow-subtle` (very faint). Floated elements (popovers, dialogs) should use `shadow-layered`.
- [ ] **Scrollbars**: Global custom styling applied in `index.css` (8px thin, transparent track, translucent thumb reactive to light/dark themes). Opaque rails and thick default browser scrollbars must be avoided.
- [ ] **Dark Mode Color Consistency**:
    - Avoid hardcoding light backgrounds (`bg-slate-50`, `bg-cyan-50`, `bg-emerald-50`, etc.) and border/text colors without `dark:` overrides.
    - When using colored/themed inputs or informative banners/alert blocks (cyan, rose, violet, emerald, etc.), apply matching dark translucent variants (e.g., `dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900/50`) to maintain readability and theme cohesion.
    - **Colored Badges & Status Indicators**: Badges of critical, attention, success, done, or pending statuses must never use fixed light colors. Always define explicit dark mode classes with low-opacity backgrounds (e.g., `dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50` for red statuses, etc.) to guarantee optimal legibility and standard design compliance.
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
- [ ] **Modals/Dialogs & Page Headers**:
    - Overlay backdrop blur/opacity.
    - Panel should have deep `shadow-layered`.
    - **Header Layout & Overlaps**: Avoid placing badges, status indicators, or action buttons in absolutely positioned containers inside headers (e.g. `absolute right-12 top-4`). Keep them in the standard flex flow (`flex flex-row items-start justify-between`) and use right margins (like `mr-8` or `mr-10`) to clear absolute-positioned dialog Close buttons.
    - **Text Truncation & Wraps**: Avoid aggressively truncating critical information like client names or ticket subjects with `truncate` in headers. Use responsive wrapping layouts (`break-words`, `leading-tight`, `flex-wrap`) so text wraps naturally and all details remain visible on all screen sizes.
- [ ] **Navigation & Menus Sincronization**:
    - Every newly created screen/route must be added to the primary sidebar in [AppSidebar.tsx](file:///d:/AI/siplan-hub/src/components/Layout/AppSidebar.tsx) and to the dashboard items structure in [menuItems.ts](file:///d:/AI/siplan-hub/src/constants/menuItems.ts) to guarantee access through both the sidebar and the dashboard quick links/modais.
