# Tokens

The raw standard. Values only, no usage advice, because that lives on the topical pages.
Every value is read from `app/globals.css` unless another path is given. The project has no
Tailwind config file (`components.json:8`), so this stylesheet is the only token source.

## Color

Light values live in `:root` and are exposed as Tailwind utilities through `@theme inline`
(`app/globals.css:7-56`).

| Token | Value | Source | Defined |
| --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `app/globals.css:96` | yes |
| `--foreground` | `oklch(0.141 0.005 285.823)` | `app/globals.css:97` | yes |
| `--card` | `oklch(1 0 0)` | `app/globals.css:59` | yes |
| `--card-foreground` | `oklch(0.141 0.005 285.823)` | `app/globals.css:60` | yes |
| `--popover` | `oklch(1 0 0)` | `app/globals.css:61` | yes |
| `--popover-foreground` | `oklch(0.141 0.005 285.823)` | `app/globals.css:62` | yes |
| `--primary` | `oklch(0.21 0.006 285.885)` | `app/globals.css:63` | yes |
| `--primary-foreground` | `oklch(0.985 0 0)` | `app/globals.css:64` | yes |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `app/globals.css:65` | yes |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` | `app/globals.css:66` | yes |
| `--muted` | `oklch(0.967 0.001 286.375)` | `app/globals.css:67` | yes |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | `app/globals.css:68` | yes |
| `--accent` | `oklch(0.967 0.001 286.375)` | `app/globals.css:69` | yes |
| `--accent-foreground` | `oklch(0.21 0.006 285.885)` | `app/globals.css:70` | yes |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `app/globals.css:71` | yes |
| `--success` | `oklch(0.627 0.194 149.214)` | `app/globals.css:72` | yes |
| `--success-foreground` | `oklch(0.985 0 0)` | `app/globals.css:73` | yes |
| `--warning` | `oklch(0.555 0.163 48.998)` | `app/globals.css:74` | yes |
| `--warning-foreground` | `oklch(0.985 0 0)` | `app/globals.css:75` | yes |
| `--info` | `oklch(0.685 0.169 237.323)` | `app/globals.css:76` | yes |
| `--info-foreground` | `oklch(0.985 0 0)` | `app/globals.css:77` | yes |
| `--overlay` | `oklch(0 0 0 / 30%)` | `app/globals.css:78` | yes |
| `--border` | `oklch(0.92 0.004 286.32)` | `app/globals.css:79` | yes |
| `--input` | `oklch(0.92 0.004 286.32)` | `app/globals.css:80` | yes |
| `--ring` | `oklch(0.705 0.015 286.067)` | `app/globals.css:81` | yes |
| `--chart-1` | `oklch(0.871 0.006 286.286)` | `app/globals.css:82` | yes |
| `--chart-2` | `oklch(0.552 0.016 285.938)` | `app/globals.css:83` | yes |
| `--chart-3` | `oklch(0.442 0.017 285.786)` | `app/globals.css:84` | yes |
| `--chart-4` | `oklch(0.37 0.013 285.805)` | `app/globals.css:85` | yes |
| `--chart-5` | `oklch(0.274 0.006 286.033)` | `app/globals.css:86` | yes |
| `--sidebar` | `oklch(0.985 0 0)` | `app/globals.css:88` | yes |
| `--sidebar-foreground` | `oklch(0.141 0.005 285.823)` | `app/globals.css:89` | yes |
| `--sidebar-primary` | `oklch(0.21 0.006 285.885)` | `app/globals.css:90` | yes |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `app/globals.css:91` | yes |
| `--sidebar-accent` | `oklch(0.967 0.001 286.375)` | `app/globals.css:92` | yes |
| `--sidebar-accent-foreground` | `oklch(0.21 0.006 285.885)` | `app/globals.css:93` | yes |
| `--sidebar-border` | `oklch(0.92 0.004 286.32)` | `app/globals.css:94` | yes |
| `--sidebar-ring` | `oklch(0.705 0.015 286.067)` | `app/globals.css:95` | yes |

The `--chart-*` family is defined and no chart component exists in `app/` or `components/`.

## Radius and border

The radius scale is derived from `--radius` by multiplication, so every step moves with
the base value.

| Token | Value | Source | Defined |
| --- | --- | --- | --- |
| `--radius` | `0.625rem` (10px) | `app/globals.css:87` | yes |
| `--radius-sm` | `calc(var(--radius) * 0.6)` (6px) | `app/globals.css:49` | yes |
| `--radius-md` | `calc(var(--radius) * 0.8)` (8px) | `app/globals.css:50` | yes |
| `--radius-lg` | `var(--radius)` (10px) | `app/globals.css:51` | yes |
| `--radius-xl` | `calc(var(--radius) * 1.4)` (14px) | `app/globals.css:52` | yes |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` (18px) | `app/globals.css:53` | yes |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` (22px) | `app/globals.css:54` | yes |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` (26px) | `app/globals.css:55` | yes |
| border width | `1px` | `components/ui/input.tsx:11` | utility |
| focus ring width | `3px` | `components/ui/button.tsx:7` | utility |
| focus ring width (compact controls) | `2px` | `components/ui/sidebar.tsx:439` | utility |

## Typography

| Token | Value | Source | Defined |
| --- | --- | --- | --- |
| `--font-sans` | Kanit via `next/font/google`, weights 400, 500, 600 | `app/layout.tsx:9-16` | yes |
| `--font-mono` | `var(--font-sans)` | `app/globals.css:11` | yes |
| `--font-heading` | `var(--font-sans)` | `app/globals.css:12` | yes |
| base body size | Not defined; the base layer sets family and colors only | `app/globals.css:134-144` | no |

## Spacing

| Token | Value | Source | Defined |
| --- | --- | --- | --- |
| custom spacing token | Not defined; Tailwind default step `0.25rem` | `node_modules/tailwindcss/theme.css:325` | no |

## Elevation

No elevation tokens exist. Shadows are per-component utilities.

| Utility | Value | Source | Defined |
| --- | --- | --- | --- |
| `shadow-sm` | Tailwind default | `components/ui/sidebar.tsx:221` | utility |
| `shadow-lg` | Tailwind default | `components/ui/dropdown-menu.tsx:43` | utility |
| `shadow-xl` | Tailwind default | `components/ui/dialog.tsx:56` | utility |

## Rules

- A new semantic color is added in `:root` and mapped in `@theme inline` in the same change.
  The success, warning, info and overlay tokens show the pattern (`app/globals.css:30-36`).
- Dark values in `.dark` (`app/globals.css:100-132`) are shadcn baseline, not maintained.
  There is no ThemeProvider and the toaster pins `theme="light"` (`components/ui/sonner.tsx:19`),
  so dark mode is unsupported.
- No raw palette color may be used in place of a token (`color.md`).
- No arbitrary z-index value may be added; the scale lives in `spacing-layout.md`.
- Durations are literal utilities, not tokens; they are listed in `motion.md`.
