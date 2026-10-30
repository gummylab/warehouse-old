# Components

The UI layer is shadcn style `base-luma` on Base UI (`components.json:3`), with lucide icons
(`components.json:13`) and no Radix. Add a component by copying the shadcn source into
`components/ui/` and adapting it; compose with the Base UI `render` prop, not `asChild`.

## Inventory

### Layout primitives

| Component | Path | Props | Variants | States | Use when | Avoid when |
| --- | --- | --- | --- | --- | --- | --- |
| `PageHeader` | `components/layout/page-header.tsx` | `title`, `subtitle`, `leading`, `trailing`, `sticky`, `variant`, `className` | `admin` (h-16, full-width inner row), `form` (min-h-14, inner row capped at 42rem) | sticky or static | A surface needs one title bar | The shell already renders a header |
| `SkipLink` | `components/layout/skip-link.tsx` | `href` (default `#main-content`) | Not defined | hidden until focused | A shell needs a skip target ahead of the page content | A surface without a page body to jump to |
| `PageBody` | `components/layout/page-body.tsx` | `id`, `width`, `fill`, `className`, `children` | `full`, `form` (42rem, centred) | focusable (`tabIndex={-1}`) only when `id` is set | Content needs the standard gutter; `FormPage` uses `width="form"` | A surface outside the page shell |
| `PageFooter` | `components/layout/page-footer.tsx` | `children`, `className` | Not defined | Not defined | A shell needs a closing line | Actions that must stay visible; use a sticky bar in the form |
| `FormPage` | `components/layout/form-page.tsx` | `header`, `children`, `className` | Not defined | Not defined | A LIFF form reads top to bottom; the body is a `PageBody width="form" fill` with safe-area bottom padding | The page is not a form |
| `StateScreen` | `components/layout/state-screen.tsx` | `title`, `description`, `reference`, `debug`, `actions`, `tone`, `loading`, `headingLevel`, `className` | `neutral`, `error`; `h1`, `h2` | loading (spinner `aria-hidden`), error | A screen is loading, empty, failed or missing | A normal page body |
| `TileGrid` | `components/layout/tile-grid.tsx` | `label`, `children`, `className` | Not defined | Not defined | Equal tiles for items, varieties or photos; `label` names the section | Tabular or free-form content |
| `TileButton` | `components/layout/tile-grid.tsx` | Button props plus `label`, `hint`, `icon`, `height` | `default`, `tall`; outline only | disabled | The dashed add cell that closes a `TileGrid` | A primary action outside a grid |

### App components

| Component | Path | Props | Variants | States | Use when | Avoid when |
| --- | --- | --- | --- | --- | --- | --- |
| `AppHeader` | `app/(admin)/app-header.tsx` | none | Not defined | title follows the pathname | Admin shell header | Outside `(admin)` |
| `AppSidebar` | `components/app-sidebar.tsx` | Sidebar props | icon collapsible | expanded, collapsed | Admin shell navigation | The LIFF surface |
| `Banner` | `components/banner.tsx` | none | Not defined | Not defined | Sidebar brand row | Anywhere else |
| `FormNavbar` | `app/liff/form-navbar.tsx` | `title`, `subtitle`, `action` | form header only | sticky | LIFF form header | Admin pages |
| `LocalDeviceBadge` | `app/liff/local-device-badge.tsx` | none | Not defined | renders only in local mode | Mark local device trust | Admin pages |
| `LiffNotice` | `app/liff/liff-notice.tsx` | `status`, `stage`, `onRetry` | loading, unconfigured, outside-line, error | loading, error | A LIFF session state has no action | The user is approved |
| `LiffGate` | `app/liff/liff-gate.tsx` | `children` | Not defined | redirecting, masking | Route gating under `/liff` | Outside `/liff` |
| `AdminGate` | `app/(admin)/admin-gate.tsx` | `children` | Not defined | allowed, refused | Guard every admin page | Outside `(admin)` |
| `UserAvatar` | `app/(admin)/register/user-avatar.tsx` | `displayName`, `avatarUrl` | small avatar | image or initial fallback | Identity in a table row | A large profile display |
| `DataTable` | `components/data-table/data-table.tsx` | `columns`, `data`, `searchColumn`, `searchSlot` | Not defined | empty, sorted, filtered, paginated | A searchable table | A short list |
| `DataTablePagination` | `components/data-table/data-table-pagination.tsx` | `table` | Not defined | first and last page disabled | The footer of a `DataTable` | Custom paging |

### UI primitives

| Component | Path | Props | Variants | States | Use when | Avoid when |
| --- | --- | --- | --- | --- | --- | --- |
| `Button` | `components/ui/button.tsx` | Base UI Button props plus `variant`, `size` | default, outline, secondary, ghost, destructive, link; default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg | hover, focus-visible, active, disabled, aria-invalid | A clickable action | Navigation; use `ButtonLink` |
| `ButtonLink` | `components/ui/button.tsx` | Link props plus `variant`, `size` | Same as Button | hover, focus-visible | A link that looks like a button | An action that does not navigate |
| `Badge` | `components/ui/badge.tsx` | `render`, `variant`, span props | default, secondary, destructive, outline, ghost, link | focus-visible, aria-invalid | A short status label | A sentence |
| `Input` | `components/ui/input.tsx` | native input props | Not defined | focus-visible, disabled, aria-invalid, file | A single-line field | Multi-line text |
| Select family | `components/ui/select.tsx` | Root, Group, Value, Trigger (`size`), Content, Label, Item, Separator, ScrollUp/Down | trigger `sm`, `default` | open, closed, focus, disabled, placeholder | Choosing one option | Free text; use `Input` |
| Dialog family | `components/ui/dialog.tsx` | Root, Trigger, Portal, Close, Overlay, Content (`showCloseButton`), Header, Footer (`showCloseButton`), Title, Description | close button on or off | open, closed | A blocking confirmation or focused task | Content that should stay on the page |
| Sheet family | `components/ui/sheet.tsx` | Root, Trigger, Close, Portal, Overlay, Content (`side`, `showCloseButton`), Header, Footer, Title, Description | side top, right, bottom, left | open, closed | An edge panel or the mobile sidebar | A centre modal |
| DropdownMenu family | `components/ui/dropdown-menu.tsx` | Root, Trigger, Content, Group, Label, Item (`variant`), CheckboxItem, RadioGroup, RadioItem, Separator, Shortcut, Sub*, Portal | item default, destructive | open, closed, focus, disabled | Actions on one object | Primary navigation |
| Tooltip family | `components/ui/tooltip.tsx` | Provider (`delay`), Root, Trigger, Content (`side`, `align`, offsets) | Not defined | delayed-open, open, closed | Naming an icon-only control | Information needed to finish a task |
| Tabs family | `components/ui/tabs.tsx` | Root (`orientation`), List (`variant`), Trigger, Content | default, line; horizontal, vertical | active, focus-visible, disabled | Switching views in place | Page navigation |
| Table family | `components/ui/table.tsx` | Table, Header, Body, Footer, Head, Row, Cell, Caption | Not defined | row hover, selected | Tabular data | Card or tile content |
| Sidebar family | `components/ui/sidebar.tsx` | Provider, Sidebar (`side`, `variant`, `collapsible`), Inset, Header, Content, Footer, Menu*, Trigger, Rail, Separator, Input, Group* | side left, right; variant sidebar, floating, inset; collapsible offcanvas, icon, none; menu size default, sm, lg | expanded, collapsed, active, focus-visible | Desktop app chrome | Phone primary navigation; the mobile sheet is automatic |
| Avatar family | `components/ui/avatar.tsx` | Root (`size`), Image, Fallback, Badge, Group, GroupCount | default, sm, lg | image or fallback | User identity | Decorative images |
| Breadcrumb family | `components/ui/breadcrumb.tsx` | Breadcrumb, List, Item, Link, Page, Separator, Ellipsis | Not defined | current page | Deep hierarchy | Two-level navigation; no call site today |
| Collapsible family | `components/ui/collapsible.tsx` | Root, Trigger, Content | Not defined | open, closed | A disclosure panel; no call site today | Navigation |
| `Separator` | `components/ui/separator.tsx` | `orientation` | horizontal, vertical | Not defined | Dividing header controls | Creating spacing |
| `Skeleton` | `components/ui/skeleton.tsx` | div props | Not defined | `animate-pulse` | A placeholder while loading | A wait already shown by a spinner |
| `Spinner` | `components/ui/spinner.tsx` | svg props | Not defined | `animate-spin`, role status | A short wait | A full-page state; use `StateScreen` |
| `Toaster` | `components/ui/sonner.tsx` | sonner `ToasterProps` | Not defined | success, info, warning, error, loading | Once, in the root layout | Anywhere else |

## Composition rules

- The shell owns height and padding. A page uses `flex-1`, `gap-*` and `min-w-0`, never
  `min-h-screen`, a negative margin to escape the gutter, or its own page padding.
- A shell with chrome places `SkipLink` ahead of the chrome, as the first child of the shell,
  and passes the matching `id` to `PageBody`, which then becomes focusable
  (`app/(admin)/layout.tsx:25-31`, `components/layout/page-body.tsx:24-27`). The admin target
  is `main-content`.
- `FormPage` renders `PageBody width="form" fill` and adds only the safe-area bottom padding
  (`components/layout/form-page.tsx:20-23`). The gutter and the `max-w-[42rem]` cap live in
  `PageBody` (`components/layout/page-body.tsx:30-32`), so `FormPage` does not repeat the
  width class and every form route reaches the cap the same way.
- `PageHeader` owns its padding through an inner row and is placed directly as the `header`
  slot of `FormPage`, full width without a negative margin
  (`components/layout/page-header.tsx:39-45`). The `form` variant caps that row at 42rem with
  `px-4 md:px-6`, the same gutter `PageBody` uses, so the title and the form below share one
  left edge on tablets (`components/layout/page-header.tsx:44`,
  `components/layout/page-body.tsx:30`). The `admin` variant keeps the full-width row.
- `StateScreen` reads the height from its parent (`flex-1`) and never sets a viewport
  height (`components/layout/state-screen.tsx:4-6`). `headingLevel` defaults to `h1`; the
  admin error boundary passes `h2` because the shell already renders the `h1`
  (`app/(admin)/error.tsx:25`). `debug` is a separate muted line, not the `reference`
  digest, which is prefixed `รหัสอ้างอิง:` (`components/layout/state-screen.tsx:61-64`).
  While loading it renders the title as a paragraph and passes `aria-hidden="true"` to the
  `Spinner`, so the title is the only announcement (`components/layout/state-screen.tsx:44-49`).
- An item tile renders its title as `h2` for a pack and `h3` for a variety, so the order page
  reaches `h2` from the header `h1` without skipping a level
  (`app/liff/forms/order-image/order-items-step.tsx:239`, `:241`). `ItemTile` is local to
  that file, not an exported component, so it has no inventory row.
- `Button` must not render a link; use `ButtonLink`, which styles an `<a>` with the same
  variants (`components/ui/button.tsx:56-65`).
- Base UI `Button` renders `type="button"` by default. A submit inside a form passes
  `type="submit"` explicitly (`app/(admin)/register/pending-columns.tsx:99-101`).
- Every `DialogContent` includes a `DialogTitle`; it may be `sr-only` when the title is
  positional (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:265-269`).
- Page titles come from `lib/page-titles.ts`; metadata and the admin header both read it
  (`app/(admin)/app-header.tsx:13`), so a new route adds its key there.
- Status color comes from the success, warning and info tokens, not from raw palette values
  (`color.md`).
