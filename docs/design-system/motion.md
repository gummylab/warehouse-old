# Motion

## Durations

No duration tokens exist. Each value is a literal utility on the component that uses it.

| Utility | Value | Use for |
| --- | --- | --- |
| `duration-100` | 100ms | Dialog overlay and content (`components/ui/dialog.tsx:34`, `:56`), dropdown menu content and sub content (`components/ui/dropdown-menu.tsx:43`, `:137`), select content (`components/ui/select.tsx:85`) |
| `duration-150` | 150ms | Sheet overlay opacity (`components/ui/sheet.tsx:31`) |
| `duration-200` | 200ms | Sheet content transform and opacity (`components/ui/sheet.tsx:56`); sidebar gap width, container position and group label (`components/ui/sidebar.tsx:198`, `:210`, `:367`) |

## Easing

- Sheet content: `ease-in-out` (`components/ui/sheet.tsx:56`).
- Sidebar: `ease-linear` (`components/ui/sidebar.tsx:198`, `:210`, `:367`).
- Dialog, dropdown, select and tooltip: the default from `tw-animate-css`
  (`app/globals.css:2`), not set in the repository.

## What may animate

- Overlay enter and exit: fade, zoom from 95 percent, and a 0.5rem slide from the anchored
  edge (`components/ui/dialog.tsx:56`, `components/ui/dropdown-menu.tsx:43`,
  `components/ui/select.tsx:85`, `components/ui/sheet.tsx:56`,
  `components/ui/tooltip.tsx:52`).
- Sidebar width and position, 200ms linear (`components/ui/sidebar.tsx:198`, `:210`).
- Loading: skeleton pulse (`components/ui/skeleton.tsx:7`), spinner rotation
  (`components/ui/spinner.tsx:10`), upload placeholder pulse
  (`app/liff/forms/order-image/items/[itemId]/item-images.tsx:210`).
- Button press: a 1px downward translate while active (`components/ui/button.tsx:7`).
- Hover color transitions on buttons, menu rows and table rows (`transition-all`,
  `transition-colors` in the primitives).
- Not animated: page transitions, list reordering, and optimistic add or remove. A temporary
  tile renders at once with reduced opacity (`app/liff/forms/order-image/order-items-step.tsx:97-121`).

## Reduced motion

- A global media query at the end of `app/globals.css` targets `*, ::before, ::after` under
  `prefers-reduced-motion: reduce` and applies `animation-duration: 0.01ms`,
  `animation-iteration-count: 1`, `transition-duration: 0.01ms` and
  `scroll-behavior: auto`, each `!important` (`app/globals.css:148-157`).
- Every animation and transition above therefore completes in one frame: overlays appear and
  disappear at once, the sidebar width jumps, and the spinner settles on a static frame
  (`components/ui/spinner.tsx:10`).
- The loading text still names the state, because `StateScreen` renders a title beside the
  spinner (`components/layout/state-screen.tsx:44-47`).
- No component uses a `motion-reduce` variant; the rule is global only.

## Related timing

These are timers, not transitions.

| Timing | Value | Source |
| --- | --- | --- |
| Success toast | 2500ms | `lib/toast.ts:10` |
| Error toast | 6000ms | `lib/toast.ts:14` |
| Toaster default | 4000ms, 3 visible | `components/ui/sonner.tsx:25-27` |
| Upload dialog close after success | 700ms | `app/liff/forms/order-image/items/[itemId]/upload-dialog.tsx:166` |
