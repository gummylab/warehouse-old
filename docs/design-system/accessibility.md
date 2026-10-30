# Accessibility

This page records what the source does. It does not report rendered behaviour, and no
contrast ratio has been measured in this repository.

## Focus

- The base layer sets `outline-ring/50` on every element (`app/globals.css:134-137`). There is
  no global `:focus-visible` ring rule.
- `SkipLink` is `sr-only` until focused, then fixed at the top-left with a 2px
  `ring-ring` (`components/layout/skip-link.tsx:8`).
- `Button` and `ButtonLink`: `focus-visible:border-ring focus-visible:ring-3
  focus-visible:ring-ring/30` (`components/ui/button.tsx:7`). The destructive variant swaps in
  a destructive border and ring (`components/ui/button.tsx:19`).
- `Input`: the same border and 3px ring treatment (`components/ui/input.tsx:11`).
- `SelectTrigger`: the same border and 3px ring treatment (`components/ui/select.tsx:43`).
- `Badge`: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`
  (`components/ui/badge.tsx:7`).
- `TabsTrigger`: 3px ring plus `outline-1 outline-ring` (`components/ui/tabs.tsx:60`).
- Sidebar menu button, group label, group action, menu action and sub button: a 2px
  `ring-sidebar-ring` (`components/ui/sidebar.tsx:367`, `:391`, `:439`, `:523`, `:626`).
- Gaps: the photo button in `PhotoTile` has no focus style
  (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:378`), and the retry button in
  the global error page is a plain `<button>` with inline styles only
  (`app/global-error.tsx:61`).

## Keyboard

| Component | Keys | Behavior |
| --- | --- | --- |
| Image viewer | ArrowLeft, ArrowRight | Previous and next photo; a window listener exists only while the viewer is open (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:158-167`) |
| Image viewer | Touch drag | A horizontal drag over 40px moves one photo; a mostly vertical drag is ignored (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:249-264`, `:340`) |
| Sidebar | Ctrl+B or Cmd+B | Toggles the sidebar (`components/ui/sidebar.tsx:87-97`) |
| Skip link | Tab, Enter | Focuses `#main-content`; the control is the first Tab stop in the admin shell, before the sidebar links (`components/layout/skip-link.tsx:4-11`, `app/(admin)/layout.tsx:25-27`) |
| Dialog, Sheet, DropdownMenu, Select, Tooltip | Not defined in the repository | Provided by the Base UI primitives (`components/ui/dialog.tsx:4`, `components/ui/sheet.tsx:4`, `components/ui/dropdown-menu.tsx:4`, `components/ui/select.tsx:4`, `components/ui/tooltip.tsx:3`); focus trapping, Escape and arrow keys are library behaviour and are not restated here |
| Data table pagination | Tab, Enter or Space | First, previous, next and last page buttons, each with a screen-reader name (`components/data-table/data-table-pagination.tsx:41`, `:51`, `:61`, `:71`) |
| Register queue | Tab, Enter | Approve and reject are submit buttons (`app/(admin)/register/pending-columns.tsx:101`) |

## Labels

- Visible labels wrap their control. The step-one fields use a `<label>` around the `Input`
  and the `Select`, so the field takes its accessible name from the label
  (`app/liff/forms/order-image/step-one-fields.tsx:51`, `:62`, `:72`).
- Icon-only buttons carry an `aria-label`:
  - `กลับออเดอร์` on the item photo page (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:183`)
  - `รูปก่อนหน้า` and `รูปถัดไป` in the viewer (`:289`, `:301`)
  - `ตั้งค่ารูปที่ {seq}` on the photo menu (`:403`)
  - `เลือกออเดอร์ใหม่` on the order form (`app/liff/forms/order-image/order-image-form.tsx:110`)
  - `ดูรูปภาพไอเท็ม {n}` and `เพิ่มรูปภาพไอเท็ม {n}` on an item tile (`app/liff/forms/order-image/order-items-step.tsx:261`)
  - `กำลังสร้างไอเท็ม {n}` on a temporary tile (`:253`)
  - `ลบไอเท็ม {n}` on the delete control (`:271`)
  - `เพิ่มไอเท็มย่อย ({n})` on the variety add cell (`:327`)
  - `เอา {file} ออก` on an upload row (`app/liff/forms/order-image/items/[itemId]/upload-dialog.tsx:274`)
- `sr-only` text supplies names where the visible label is an icon: pagination
  (`components/data-table/data-table-pagination.tsx:41-71`), the dialog close button `ปิด`
  (`components/ui/dialog.tsx:75`, `:113`), the sheet close button `ปิด`
  (`components/ui/sheet.tsx:75`), the sidebar trigger `สลับเมนู`
  (`components/ui/sidebar.tsx:245`), and the mobile sidebar title and description
  `เมนูนำทาง` / `เมนูสำหรับหน้าจอขนาดเล็ก` (`components/ui/sidebar.tsx:176-179`).
- The skip link label is readable when it takes focus: `ข้ามไปยังเนื้อหาหลัก`
  (`components/layout/skip-link.tsx:9`).
- Every dialog in app code has a `DialogTitle`. The viewer title is `sr-only` and reads the
  position, for example `รูปที่ 2 จาก 5` (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:265-269`).
- Photos use `alt="รูปที่ {seq}"` (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:276`,
  `:385`). The register avatar image uses an empty alt, so the name beside it carries identity
  (`app/(admin)/register/user-avatar.tsx:15`).
- The document language is Thai: `<html lang="th">` (`app/layout.tsx:36`).
- The toast region and its close button have Thai names: `การแจ้งเตือน` and
  `ปิดการแจ้งเตือน` (`components/ui/sonner.tsx:44-46`).
- Grid sections take their name from `TileGrid`'s `label`, which becomes the section
  `aria-label`: `ไอเท็ม {n}` for a pack grid and `เพิ่มไอเท็ม` for the root add grid
  (`app/liff/forms/order-image/order-items-step.tsx:313`, `:171`), and `รูปภาพของไอเท็ม` on
  the item photo page (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:195`). A
  grid without `label` has no accessible name, so every call site passes one.

## Landmarks

- Each surface has one `<main>`. The LIFF layout owns it above the gate
  (`app/liff/layout.tsx:15`), so every state the gate renders, including the `LiffNotice`
  loading and error screens, sits inside a main. The authorization and form layouts are
  plain `div`s (`app/liff/authorization/layout.tsx:10`, `app/liff/forms/layout.tsx:9`); a
  main in either would nest inside the layout's own.
- The admin main is `SidebarInset` (`components/ui/sidebar.tsx:275-277`), and `PageBody` is
  a div inside it rather than a second main (`app/(admin)/layout.tsx:14-16`).

## Heading levels

- `PageHeader` renders the screen `h1` (`components/layout/page-header.tsx:54`), so a page
  inside the admin shell does not render another.
- `StateScreen` defaults to `h1` and switches to `h2` through `headingLevel`
  (`components/layout/state-screen.tsx:15`, `:48-54`). The admin error boundary passes
  `headingLevel="h2"` because `AppHeader` owns the page `h1` (`app/(admin)/error.tsx:25`).
- A loading `StateScreen` renders its title as a paragraph, not a heading, so the spinner
  state adds no heading. That paragraph also carries `role="status"`, so it is the
  announcement for the load (`components/layout/state-screen.tsx:48-51`).
- An item tile on the order page renders its title as `h2` for a pack and `h3` for a
  variety (`app/liff/forms/order-image/order-items-step.tsx:239`, `:241`), so a variety card
  sits one level under the pack card and the page skips no level.

## Live regions

| Region | Attribute | Source |
| --- | --- | --- |
| Register refusal line above the table | `role="alert"` | `app/(admin)/register/register-view.tsx:55` |
| Local device badge | `role="status"` | `app/liff/local-device-badge.tsx:14` |
| `StateScreen` loading title | `role="status"` | `components/layout/state-screen.tsx:48-49` |
| Spinner | `role="status"`, `aria-label="กำลังโหลด"` | `components/ui/spinner.tsx:8-9` |

`StateScreen` passes `aria-hidden="true"` to its loading `Spinner`
(`components/layout/state-screen.tsx:46`), so the title paragraph's `role="status"` is the
single announcement on a screen-level load and `กำลังโหลด` is not read twice
(`components/layout/state-screen.tsx:44-51`). Every other `Spinner` call site keeps the
default `role="status"` name.

Order-image form errors are plain paragraphs (`app/liff/forms/order-image/step-one-fields.tsx:88`,
`app/liff/forms/order-image/items/[itemId]/item-images.tsx:190`) and are not in a live region.

## Target sizes

| Control | Size | Source |
| --- | --- | --- |
| Image viewer arrows | 44px (`size-11`) | `app/liff/forms/order-image/items/[itemId]/item-images.tsx:288` |
| Photo card menu | 32px (`icon-sm`) | `components/ui/button.tsx:30`, used at `app/liff/forms/order-image/items/[itemId]/item-images.tsx:401` |
| Default button | 36px (`h-9`) | `components/ui/button.tsx:24` |
| Small button | 32px (`h-8`) | `components/ui/button.tsx:26` |
| Icon button | 36px (`size-9`) | `components/ui/button.tsx:28` |
| Tile add cell | Full tile, `py-10` or `py-14` | `components/layout/tile-grid.tsx:54` |

The viewer deliberately uses the larger 44px arrows while the photo menu uses the compact
32px control. No minimum target size is written down.

## Gaps

- No contrast ratio is measured or asserted anywhere in the repository, so this record
  claims none.
- Code off-standard, not fixed: the admin `PageFooter` sits inside the `SidebarInset`
  `<main>` and keeps rendering `โหมดเครื่องผู้ดูแลระบบ` when `AdminGate` refuses a remote
  request (`app/(admin)/layout.tsx:40-41`, `app/(admin)/admin-gate.tsx:19-24`). A refused
  visitor therefore still gets a footer describing local admin mode. Recorded with the
  footer rule in `spacing-layout.md` Shell composition.

## Contrast floor

- Not defined. The repository holds token values only (`tokens.md`); it has no measured
  ratio, no contrast test and no automated check.
