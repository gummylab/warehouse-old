# Order numbers are exactly nine digits

The warehouse prints nine digits on every order, so an order number is only valid when it is nine characters from `0` to `9`. `isValidOrderNumber` enforces `/^\d{9}$/` after trimming (`lib/order-images/validation.ts`); the form checks with it before submit, and the lookup route checks again on the server, so both reject any other shape. A fixed length makes the printed value unambiguous, gives the entry control a visible nine-slot shape, and makes the number safe as a storage-key segment without escaping.

The LIFF order-image form and the admin delete-confirmation dialog enter the number through a nine-slot OTP control (`components/order-number-input.tsx`). The admin order search does not: it matches partial numbers with `LIKE %q%`, and fixed slots would take that away. The delete dialog keeps a plain text fallback for any order row that predates the rule, so those rows stay deletable until the database is reset.

## Considered options

- **Keep the free-text field with a 1-60 character limit.** Rejected: the warehouse prints a fixed nine digits, so the wider range adds no valid value and gives the input no shape to show.
- **Allow nine alphanumeric characters.** Rejected: the warehouse prints digits only.
- **Use the OTP control in the admin search.** Rejected: the search works on partial numbers, and nine fixed slots only allow a complete one.
- **Migrate the legacy order numbers.** Rejected: the operator will reset the database instead, which is less work than a migration.

## Consequences

- A stored order number is text, not an integer, so a leading zero survives.
- Existing rows are not rewritten. The delete dialog falls back to free text when the row's number is not nine digits, but the form and the lookup route will reject those numbers from now on.
- Any new place that accepts a complete order number must use the shared validator and the slot control. A bespoke input would let a wrong shape through.
