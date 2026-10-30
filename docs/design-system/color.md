# Color

## Roles

Every role is a semantic token from `app/globals.css`; the utility name is the token name
without the `--color-` prefix.

| Role | Token | Use for | Avoid |
| --- | --- | --- | --- |
| Canvas and text | `--background`, `--foreground` | Page background and default body text (`app/globals.css:96-97`, base layer `:138-140`) | Hard-coded white or black |
| Raised surface | `--card`, `--card-foreground` | Defined surface token | No `bg-card` call site exists today; dialogs use popover instead |
| Floating surface | `--popover`, `--popover-foreground` | Dialog and sheet content (`components/ui/dialog.tsx:56`, `components/ui/sheet.tsx:56`), dropdown and select panels (`components/ui/dropdown-menu.tsx:43`, `components/ui/select.tsx:85`) | Page background |
| Primary action | `--primary`, `--primary-foreground` | Default button (`components/ui/button.tsx:11`), primary badge (`components/ui/badge.tsx:11`), avatar badge (`components/ui/avatar.tsx:61`) | Body text |
| Quiet surface | `--secondary`, `--secondary-foreground` | Secondary button (`components/ui/button.tsx:15`), close chip on dialogs and sheets (`components/ui/dialog.tsx:68`, `components/ui/sheet.tsx:68`) | Main call to action |
| Muted surface | `--muted` | Ghost and outline hover (`components/ui/button.tsx:12-17`), skeleton fill (`components/ui/skeleton.tsx:7`) | Text |
| Muted text | `--muted-foreground` | Captions, headers subtitles, empty-state copy, footer line (`components/layout/page-header.tsx:47`, `components/layout/page-footer.tsx:17`) | Primary copy |
| Selection | `--accent`, `--accent-foreground` | Focused menu and select rows (`components/ui/dropdown-menu.tsx:90`, `components/ui/select.tsx:119`) | Buttons |
| Destructive | `--destructive` | Destructive button (`components/ui/button.tsx:19`), inline form errors (`app/liff/forms/order-image/step-one-fields.tsx:88`), register alert (`app/(admin)/register/register-view.tsx:55`), error titles (`components/layout/state-screen.tsx:34`) | Ordinary emphasis |
| Success | `--success`, `--success-foreground` | Success toast icon (`components/ui/sonner.tsx:30`), uploaded check mark (`app/liff/forms/order-image/items/[itemId]/upload-dialog.tsx:262`) | Decorative fills |
| Warning | `--warning`, `--warning-foreground` | Local device badge (`app/liff/local-device-badge.tsx:15`) | Error states |
| Info | `--info`, `--info-foreground` | Info toast icon (`components/ui/sonner.tsx:31`) | Ordinary text |
| Backdrop | `--overlay` | Dialog backdrop (`components/ui/dialog.tsx:34`), sheet backdrop (`components/ui/sheet.tsx:31`) | Any non-overlay surface |
| Border | `--border` | Card and tile borders (`components/layout/tile-grid.tsx:25`), page header rule (`components/layout/page-header.tsx:34`), table lines (`components/ui/table.tsx:25`) | Text |
| Field | `--input` | Input and select fill at 50 percent (`components/ui/input.tsx:11`, `components/ui/select.tsx:43`) | Borders elsewhere |
| Focus | `--ring` | Focus ring and invalid ring (`components/ui/button.tsx:7`, `components/ui/input.tsx:11`) | Static decoration |
| Sidebar | `--sidebar` and its foreground, accent, border, ring siblings | Sidebar shell and menu rows (`components/ui/sidebar.tsx:154`, `:439`) | Page content |

## Contrast pairs

| Foreground | Background | Ratio | Verified by |
| --- | --- | --- | --- |
| `--foreground` | `--background` | Not measured | No measurement in the repository |
| `--muted-foreground` | `--background` | Not measured | No measurement in the repository |
| `--primary-foreground` | `--primary` | Not measured | No measurement in the repository |
| `--destructive` | `--background` | Not measured | No measurement in the repository |
| `--success` | `--background` | Not measured | No measurement in the repository |
| `--warning` | `--background` | Not measured | No measurement in the repository |
| `--info` | `--background` | Not measured | No measurement in the repository |
| `--popover-foreground` | `--popover` | Not measured | No measurement in the repository |

## Rules

- The UI is light only. `.dark` (`app/globals.css:100-132`) is shadcn baseline and cannot be
  reached: there is no ThemeProvider and the toaster pins `theme="light"`
  (`components/ui/sonner.tsx:14-19`).
- Use the semantic token, never a raw Tailwind palette value. Pack tiles use
  `bg-primary/5 border-primary/20` and variety tiles use `bg-muted/50 border-border`
  (`app/liff/forms/order-image/order-items-step.tsx:235`).
- Success, warning and info carry status meaning. Do not reuse them as decoration.
- `--overlay` is for backdrops only, never for a surface.
- A color decision is not made from a contrast ratio until that ratio is measured; this
  record holds source values, not pixels.
