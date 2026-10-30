# Spacing and layout

## Scale

No project spacing tokens exist; values are Tailwind utilities on the 0.25rem step
(`node_modules/tailwindcss/theme.css:325`).

| Utility | Value | Use for |
| --- | --- | --- |
| `px-4` | 16px | Page gutter on phones, on `PageBody` and on the header inner row (`components/layout/page-body.tsx:30`, `components/layout/page-header.tsx:43-44`, `components/layout/page-footer.tsx:17`) |
| `md:px-6` | 24px | The same gutter from the md breakpoint (`components/layout/page-body.tsx:30`, `components/layout/page-header.tsx:43-44`, `components/layout/page-footer.tsx:17`) |
| `py-4` | 16px | Page body vertical padding (`components/layout/page-body.tsx:30`); form bodies inherit it because `FormPage` delegates to `PageBody` |
| `gap-4` | 16px | Section gap inside a page (`components/layout/page-body.tsx:30`, `components/layout/state-screen.tsx:41`) |
| `p-4` | 16px | Tile grid frame (`components/layout/tile-grid.tsx:25`), state screen (`components/layout/state-screen.tsx:41`) |
| `gap-2` | 8px | Tile gap (`components/layout/tile-grid.tsx:25`) |
| `py-2` | 8px | Vertical padding of the form header inner row (`components/layout/page-header.tsx:44`) |
| `p-6` | 24px | Dialog padding (`components/ui/dialog.tsx:56`), sheet header and footer (`components/ui/sheet.tsx:87`, `:97`) |
| `pb-[max(1rem,env(safe-area-inset-bottom))]` | At least 16px | Bottom padding of the `PageBody` that `FormPage` renders, above the phone safe area (`components/layout/form-page.tsx:23`) |
| `h-16` | 64px | Admin header height, inner row full width (`components/layout/page-header.tsx:35`, `:43`) |
| `min-h-14` | 56px | Form header minimum height, inner row capped at 42rem (`components/layout/page-header.tsx:35`, `:44`) |
| `h-9` | 36px | Default button and input height (`components/ui/button.tsx:24`, `components/ui/input.tsx:11`) |
| `size-8` | 32px | `icon-sm` control (`components/ui/button.tsx:30`) |
| `size-11` | 44px | Image viewer arrow (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:288`) |

## Grid

`TileGrid` is the only grid primitive: `grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2`
inside a `rounded-xl border p-4` frame (`components/layout/tile-grid.tsx:25`). Column count
follows the viewport, and the minimum tile width keeps two columns on a phone
(`components/layout/tile-grid.tsx:6-8`). There is no twelve-column layout grid. The section
takes an optional `label` that becomes its `aria-label` (`components/layout/tile-grid.tsx:22`).

## Breakpoints

Tailwind v4 defaults, with no override in the project.

| Name | Min width | What changes |
| --- | --- | --- |
| `sm` | 40rem / 640px | State screen actions switch from a column to a row (`components/layout/state-screen.tsx:66`); sheet content caps at `max-w-sm` (`components/ui/sheet.tsx:56`) |
| `md` | 48rem / 768px | Page gutter moves from 16px to 24px on `PageBody` and on the header inner row (`components/layout/page-body.tsx:30`, `components/layout/page-header.tsx:43-44`); sidebar renders as a desktop column instead of a sheet (`components/ui/sidebar.tsx:161`, `:188`) |
| `lg` | 64rem / 1024px | First and last page buttons in the data table footer appear (`components/data-table/data-table-pagination.tsx:36`, `:66`) |
| `xl` | 80rem / 1280px | Not used in the source |
| `2xl` | 96rem / 1536px | Not used in the source |

Mobile detection for the sidebar uses its own 768px media query (`hooks/use-mobile.ts:3`).

## Containers

| Name | Max width | Used on |
| --- | --- | --- |
| Form content | 42rem (672px), centred | `FormPage` passes `width="form"` to `PageBody` (`components/layout/form-page.tsx:20-23`), and `PageBody` applies the cap and centring (`components/layout/page-body.tsx:32`); every LIFF form route uses it. The form header row uses the same cap and gutter, so the title and the body share one left edge (`components/layout/page-header.tsx:44`) |
| Dialog | `calc(100% - 2rem)`, `sm:max-w-md` (28rem) | `components/ui/dialog.tsx:56` |
| Image viewer | `sm:max-w-3xl` (48rem) | `app/liff/forms/order-image/items/[itemId]/item-images.tsx:248` |
| State screen description | `max-w-md` (28rem) | `components/layout/state-screen.tsx:57` |
| Sidebar | 16rem expanded, 18rem mobile, 3rem icon | `components/ui/sidebar.tsx:20-22` |
| Tooltip | `max-w-xs` (20rem) | `components/ui/tooltip.tsx:52` |

## Stacking

The scale is declared in `AGENTS.md`. The source uses `z-10`, `z-20`, `z-30` and `z-50` as
classes. `z-60` is the toast level; Sonner sets it through its own stylesheet, not through a
project class.

| Level | Meaning | Where it is applied |
| --- | --- | --- |
| 10 | Inside a card | Avatar badge (`components/ui/avatar.tsx:61`), select scroll arrows (`components/ui/select.tsx:162`, `:181`) |
| 20 | Sticky header and footer | Sticky page header (`components/layout/page-header.tsx:35`), sidebar rail (`components/ui/sidebar.tsx:262`) |
| 30 | App chrome | Fixed desktop sidebar (`components/ui/sidebar.tsx:210`) |
| 50 | Overlays, and the skip link while focused | Dialog (`components/ui/dialog.tsx:34`, `:56`), sheet (`components/ui/sheet.tsx:31`, `:56`), dropdown (`components/ui/dropdown-menu.tsx:35`, `:43`), select (`components/ui/select.tsx:80`, `:85`), tooltip (`components/ui/tooltip.tsx:47`, `:52`), skip link (`components/layout/skip-link.tsx:8`) |
| 60 | Toast | Declared in `AGENTS.md`; sonner layers its own toasts through its stylesheet (`node_modules/sonner/dist/styles.css:84`), no class in the repository source |

The photo card menu is positioned with `absolute` and carries no z-index class
(`app/liff/forms/order-image/items/[itemId]/item-images.tsx:402`), so it does not use the
level 10 slot.

## Shell composition

- Admin shell: `SidebarProvider` (default closed) wraps `SkipLink`, `AppSidebar` and
  `SidebarInset`, which holds `AppHeader`, `PageBody fill id="main-content"` with the admin
  gate, and `PageFooter` (`app/(admin)/layout.tsx:24-42`). `SkipLink` is the first child of
  the provider, ahead of the sidebar, so it is the first Tab stop
  (`app/(admin)/layout.tsx:25-27`). The footer line is `โหมดเครื่องผู้ดูแลระบบ`.
- `PageBody` sets `tabIndex={-1}` only when it receives an `id`, so the skip link target can
  take focus (`components/layout/page-body.tsx:24-27`); the admin layout passes
  `id="main-content"` (`app/(admin)/layout.tsx:31`).
- `SidebarInset` is the `<main>` element (`components/ui/sidebar.tsx:275-277`), so `PageBody`
  renders a `div` rather than a second main (`app/(admin)/layout.tsx:14-16`).
- Code off-standard, not fixed: `PageFooter` is the last child of `SidebarInset`, so the
  footer sits inside that `<main>` (`app/(admin)/layout.tsx:40-41`), and it still renders
  `โหมดเครื่องผู้ดูแลระบบ` when `AdminGate` refuses a remote request
  (`app/(admin)/admin-gate.tsx:19-24`). The refused screen therefore shows a footer line
  describing a mode the visitor is not in. The fix belongs in the admin shell code.
- LIFF shell: the layout owns the `<main>` landmark above the gate
  (`app/liff/layout.tsx:15`), so the loading and error notices that `LiffGate` renders still
  sit inside a main. The authorization route centres its content with
  `items-center justify-center px-4 py-6` in a plain `div`
  (`app/liff/authorization/layout.tsx:10`); the form routes read top to bottom in a plain
  `div` (`app/liff/forms/layout.tsx:9`). Neither sub-layout renders a main, which would nest
  inside the LIFF layout's one.
- `FormPage` puts the header as a direct child, so the header is full width without a
  negative margin, and delegates the body to `PageBody width="form" fill` with only the
  safe-area bottom padding added (`components/layout/form-page.tsx:20-23`). The 42rem cap
  and the gutter therefore live in `PageBody` (`components/layout/page-body.tsx:30-32`), and
  the form header caps its inner row at the same width with the same gutter
  (`components/layout/page-header.tsx:44`).
- Root: `html` is `h-full antialiased font-sans`, `body` is `min-h-full flex flex-col`
  (`app/layout.tsx:37-40`).
- The shell owns height and padding. Pages use `flex-1`, `gap-*` and `min-w-0`; they do not
  add `min-h-screen`, escape the gutter with negative margins, or set page-level padding
  (`AGENTS.md`, Layout primitives).
