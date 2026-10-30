'use client'

import type { CSSProperties } from 'react'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// One toaster for the whole app. The app is light-only (there is no
// ThemeProvider), so the theme is pinned instead of read from next-themes:
// a dark OS would otherwise render dark toasts over a light page.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-center"
    // Sit near the top edge. This overlays the sticky navbar on purpose:
    // keeping the toast below it pushed the notification too far down.
    offset={{ top: 12 }}
    mobileOffset={{ top: 12 }}
    visibleToasts={3}
    closeButton
    duration={4000}
    richColors={false}
    icons={{
      success: <CircleCheckIcon className="size-4 text-success" />,
      info: <InfoIcon className="size-4 text-info" />,
      warning: <TriangleAlertIcon className="size-4 text-warning" />,
      error: <OctagonXIcon className="size-4 text-destructive" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
      } as CSSProperties
    }
    containerAriaLabel="การแจ้งเตือน"
    toastOptions={{
      closeButtonAriaLabel: 'ปิดการแจ้งเตือน',
      classNames: {
        toast: 'font-sans cn-toast',
      },
    }}
    {...props}
  />
)

export { Toaster }
