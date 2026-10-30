# Design system

The interface standard for Warehouse Dashboard: tokens, type, color, layout, components,
motion, accessibility and Thai copy for the local-only admin surface under
`app/(admin)/` and the public LIFF phone surface under `app/liff/`.

Audited: 2026-10-30, against the working tree at the time of the audit (no commit
recorded).

## Pages

| Page | Covers | Updated |
| --- | --- | --- |
| [tokens.md](./tokens.md) | Raw token standard: color, radius, type, spacing, elevation | 2026-10-30 |
| [color.md](./color.md) | Semantic roles, status colors, light-only rule | 2026-10-30 |
| [typography.md](./typography.md) | Kanit family, aliases, type scale by screen role | 2026-10-30 |
| [spacing-layout.md](./spacing-layout.md) | Gutter, padding, grid, breakpoints, containers, z-index | 2026-10-30 |
| [components.md](./components.md) | Layout primitives, app components, UI primitives | 2026-10-30 |
| [motion.md](./motion.md) | Durations, easing, what animates, reduced motion | 2026-10-30 |
| [accessibility.md](./accessibility.md) | Focus, keyboard, labels, live regions, target sizes | 2026-10-30 |
| [content-voice.md](./content-voice.md) | Thai tone, error, loading, empty and confirmation copy | 2026-10-30 |

## Value sources

| Family | Source | Notes |
| --- | --- | --- |
| Color | `app/globals.css` | CSS custom properties in `:root`, mapped through `@theme inline` |
| Radius | `app/globals.css:49-55` | Derived from `--radius: 0.625rem` |
| Typography | `app/layout.tsx`, `app/globals.css:10-12` | Kanit from `next/font/google`; mono and heading alias sans |
| Spacing | `node_modules/tailwindcss/theme.css:325` | Tailwind v4 default step; no project tokens |
| Breakpoints | `node_modules/tailwindcss/theme.css:327-331` | Tailwind v4 defaults; no project override |
| Theme config | `components.json` | Style `base-luma` (Base UI), icons lucide, no Tailwind config file |
| Motion | `app/globals.css:2`, component utilities | `tw-animate-css` plus literal duration classes |
| z-index | `AGENTS.md`, component classes | Declared scale; see `spacing-layout.md` |
| Voice | `lib/messages.ts`, `app/liff/forms/order-image/order-image-api.ts` | Thai UI copy |
| Titles | `lib/page-titles.ts` | Shared by metadata and the admin header |

## Not recorded

- Elevation: no elevation tokens exist, only per-component shadow utilities (`tokens.md`).
- Dark mode: unsupported by decision; `.dark` is unreachable (`tokens.md`, `color.md`).
- Icons: lucide is the only icon library (`components.json:13`); there is no icon page
  because no icon size scale is defined beyond `size-*` utilities in each component.
- Contrast ratios: no measurement exists in the repository, so none is claimed.

## Reading order

Open `tokens.md` before quoting any value, then the topical page that owns the decision.
For new screens read `spacing-layout.md` and `components.md` together. For user-facing
text read `content-voice.md` before writing copy.
