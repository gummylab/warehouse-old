# Typography

## Families

| Family | Token | Fallback stack | Source |
| --- | --- | --- | --- |
| Kanit (Thai and Latin) | `--font-sans` | Supplied by `next/font/google`; not written in the repository | `app/layout.tsx:9-16` |
| Mono | `--font-mono` | `var(--font-sans)` | `app/globals.css:11` |
| Heading | `--font-heading` | `var(--font-sans)` | `app/globals.css:12` |

Only the 400, 500 and 600 weights are loaded (`app/layout.tsx:13`). The root element applies
`font-sans` and `antialiased` (`app/layout.tsx:37`, `app/globals.css:141-143`).

## Scale

| Name | Size | Line height | Weight | Use for |
| --- | --- | --- | --- | --- |
| State screen title | `text-lg` (1.125rem) | Default | `font-semibold` (600) | Loading, empty, error and not-found headings (`components/layout/state-screen.tsx:33`) |
| Page header title | `text-base` (1rem) | Default | `font-semibold` (600) | Admin and form header title (`components/layout/page-header.tsx:54`) |
| Dialog and sheet title | `text-base` (1rem) | `leading-none` in dialog, default in sheet | `font-medium` (500) | Overlay titles (`components/ui/dialog.tsx:125`, `components/ui/sheet.tsx:108`) |
| Section and card title | `text-sm` (0.875rem) | Default | `font-medium` (500) | Item tile heading, `h2` for a pack and `h3` for a variety (`app/liff/forms/order-image/order-items-step.tsx:239`, `:241`) |
| Body | `text-sm` (0.875rem) | Default | 400 | Dialog and sheet text (`components/ui/dialog.tsx:56`), table (`components/ui/table.tsx:14`), form copy (`app/liff/forms/order-image/items/[itemId]/page.tsx:38`) |
| Caption | `text-xs` (0.75rem) | Default | 400 | Header subtitle, footer line, photo count and package label (`components/layout/page-header.tsx:55`, `components/layout/page-footer.tsx:17`, `app/liff/forms/order-image/order-items-step.tsx:244`) |
| Badge | `text-xs` (0.75rem) | Default | `font-medium` (500) | Badge primitive and local device badge (`components/ui/badge.tsx:7`, `app/liff/local-device-badge.tsx:15`) |
| Button label | `text-sm` (0.875rem) | Default | `font-medium` (500) | Default button size; `xs` uses `text-xs` (`components/ui/button.tsx:7`, `:25`) |
| Field text | `text-base` on phones, `md:text-sm` above | Default | 400 | Input and select value (`components/ui/input.tsx:11`) |
| Tile action label | `text-xs` (0.75rem) | `leading-tight` | 400 | Dashed add cell (`components/layout/tile-grid.tsx:59`) |
| Base page text | Not defined | Default | 400 | The base layer sets family and colors only (`app/globals.css:134-144`) |

## Rules

- One family carries Thai and Latin. Do not introduce a second display or Thai face.
- The heaviest available weight is 600. `font-bold` and heavier would be synthesised.
- `font-heading` and `font-mono` both resolve to the sans family, so a heading never changes
  family and a monospace span does not get a monospace face.
- Size follows screen role, not page identity: the same role gets the same size on both the
  admin and the LIFF surface.
- Line height uses the Tailwind default except the dialog title (`leading-none`) and the tile
  action label (`leading-tight`).
- No italic, uppercase, letter-spacing or truncation rule is defined beyond the `truncate`
  utilities used to protect a header title (`components/layout/page-header.tsx:54`, `:56`).
