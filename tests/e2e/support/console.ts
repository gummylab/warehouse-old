import { expect, type ConsoleMessage, type Page } from '@playwright/test'

// Collects the console errors a page logs while it is open.
//
// The browser console is where a component library reports that it was
// used wrongly (a button rendering a link, a missing key, an invalid
// prop). None of those fail a locator assertion, so a spec that only
// clicks through the screen would pass while the console filled up with
// errors. This helper turns them into a test failure.
//
// Usage:
//
//   const errors = collectConsoleErrors(page)
//   await page.goto('/liff/forms/order-image')
//   ...
//   expect(errors).toEqual([])
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  return errors
}
