# Form access is enforced in three layers, and the API is the boundary

An approved user with only some grants must not be able to open the forms they lack. The rule is applied three times: the form hub renders only the cards the user holds, `LiffGate` redirects a form path they lack to `/liff/forms`, and every form endpoint calls `authenticateFormRequest(request, formId)`, which re-reads the user and their grants on each request. The session exchange stays on `authenticateApprovedRequest`, which checks identity and approval but no form, because a cookie proves who the caller is, never which forms they may open (ADR 0005).

The redirect cannot carry the rule alone. The LINE idToken exists only in the browser (ADR 0003), so a server redirect never sees it and cannot decide whether the caller holds the form. Hiding the cards and redirecting are UX steering; the endpoint is the boundary. Reading the grant per request makes a removal take effect on the next request instead of at cookie expiry, the same way approval is already re-checked rather than trusted from the cookie.

## Considered options

- **Hide the cards and stop there.** Rejected: cosmetic. The URL still works and the endpoint still answers.
- **Embed the granted form ids in the signed session cookie.** Rejected: fast, but a form removed after the exchange would stay open until the 12-hour cookie expired.
- **Make every authenticated call require a form id.** Rejected: the session exchange runs before the browser reaches a form and serves both forms, so a form requirement there would block the exchange itself.

## Consequences

- A form endpoint that authenticates with `authenticateApprovedRequest` instead is open to any approved user. The helper's `formId` argument is required, but a copied route can still pass the wrong form.
- The gate compares exact form paths. A future form with sub-routes needs a prefix rule in `gateRedirect` (lib/liff/form-access.ts), or the sub-page falls through.
- Local device mode opens every form (ADR 0004), because it never reaches the database and the grant check has no row to read.
- Removing a grant does not close an open page by itself; it makes the page's next request answer 403, and the gate's status call takes effect on the next load.
