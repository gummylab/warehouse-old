# A line walk is identified by date, shift, line, brand and pack style

A line walk is the five-part key `(walk_date, shift, line, brand, pack_style)`, with `shift` either `day` or `night`. Saving that key again updates `people` and `amount` in place, so the id, the creator and the created time survive; a key that is not stored yet creates a new row. The key includes the shift and the line because the operator can walk the same brand and pack style on more than one line, and on both shifts of one day, and those are separate walks. Re-entering an existing combination is a correction of its counts, not a second observation of the same walk.

Brand and pack style are free text, trimmed and compared exactly. The form treats the key as incomplete until the date, shift, line, brand and pack style are all present. It then looks the key up after a debounce and prefills the two counts from the stored record, so the operator sees the numbers they are about to correct. Every section of the form is saved in one request, and the server writes the batch in one transaction.

Two sections in one form that produce the same key are flagged by key as soon as it happens, skip the lookup, and block saving. The server also rejects duplicate keys inside a single batch, because the client-side check is not the only way a request can arrive.

## Considered options

- **Create a new row on every save.** Rejected: the same walk would be stored twice.
- **Leave the shift out of the key.** Rejected: a line walked on the day and night shifts would collapse into one record, and the second shift would overwrite the first.
- **Match brand and pack style case-insensitively or through a canonical form.** Rejected: either needs a normalisation rule and, for a canonical form, a catalog to normalise against. Exact matching after trimming keeps the rule small.
- **Patch each row separately.** Rejected: more requests for one save, and the batch would stop being a single transaction.
- **Let duplicate keys inside one form overwrite each other silently.** Rejected: the operator would not learn that two sections target one record, and the last section would win without a word.

## Consequences

- Two operators saving the same key at the same moment end with the later write; there is no conflict detection.
- Typing a brand or pack style differently creates a separate record, because matching is exact once whitespace is trimmed.
- `people` and `amount` are whole numbers and zero is allowed.
- The success screen is client state: a refresh returns to an empty form even though the rows are saved.
- There is no admin list of line walks yet, so a stored walk is only visible by opening its key in the form again.
