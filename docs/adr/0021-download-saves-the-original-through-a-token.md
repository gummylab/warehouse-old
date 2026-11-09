# The download button saves the original through a short-lived token

The photo viewer's toolbar download is lightGallery's own `<a download>`, pointed at the `web` WebP copy, and the file route sent no `Content-Disposition`. In LINE's in-app browser the tap did nothing useful: the WebView ignores the anchor's `download` attribute, so it either opened the image or went dead, which is the symptom this change answers.

`GET /api/liff/order-images/images/[id]/file` now accepts `?download=1`, forces the stored original and answers `Content-Disposition: attachment; filename="<basename(storageKey)>"` with the original MIME type. The name is stripped of quotes, backslashes and line breaks. The shared gallery in `components/order-images/image-gallery.tsx` sets each slide's `downloadUrl` to `photoDownloadUrl` and its `download` name to `photoDownloadName` from `lib/order-images/download.ts`, which keeps the uploaded `fileName` when it is safe and otherwise falls back to `photo-<seq>.<ext>`. The admin order detail passes no `onDownload`, so it keeps the plain anchor.

Inside the LINE client the page takes the download over. `app/liff/forms/order-image/items/[itemId]/item-images.tsx` reads `liff.isInClient()` once in a `useState` initializer, prefetches the current slide's original as a `File`, and passes `onDownload` to the gallery. The gallery intercepts clicks on the toolbar's `.lg-download` anchor in the capture phase while it is open, then calls `navigator.share({ files })` when `navigator.canShare` accepts the file, so the operator gets the OS share sheet and can save to Photos or Files. When Web Share is unavailable or fails (cancelling the sheet is not treated as a failure), the client mints a token at `GET /api/liff/order-images/images/[id]/download-token`, authenticated by the session cookie, appends it to the download URL, and calls `liff.openWindow({ external: true })`; outside LINE it uses `window.location.assign`. A failure shows a toast with a long-press hint. The token exists because the external browser never sees the session cookie, which is httpOnly and sameSite=lax and stays in the LINE WebView.

`lib/liff/download-token.ts` mints `<exp>.<signature>`: HMAC-SHA256 over `<imageId>:<exp>`, base64url, with a key derived by SHA-256 over `${LIFF_SESSION_SECRET}:download`. The TTL is five minutes and the comparison is timing-safe. It is deliberately not a JWT. The file route accepts the token only when `download=1` and neither the session cookie nor the local-device check authenticated the request.

## Considered options

- **Only add `Content-Disposition` and keep the anchor.** Rejected: iOS WKWebView still ignores the attribute, which is the reported symptom.
- **Keep downloading the `web` WebP copy.** Rejected: the operator asked for the photo, and the original is the archival file.
- **Let the external browser reuse the session cookie.** Rejected: the cookie belongs to the LINE WebView and is not shared with Safari or Chrome.
- **Sign the download token in the session JWT format.** Rejected: `verifySessionToken` does not check an audience, so it could accept a download token as a session.

## Consequences

- Playwright can prove the attachment path (the route header, the original bytes and the browser download event) but not the LINE WebView, so the share and external-browser paths need an on-device check.
- `.lg-download` is lightGallery's internal toolbar class; if it changes, the anchor's `downloadUrl` remains the fallback.
- A minted token grants a five-minute read of one image after revocation, because the file route does not re-check the user on the token path.
- `tests/unit/order-images/download.test.ts` covers the name helper, `tests/unit/liff/download-token.test.ts` covers sign, verify, expiry, the wrong image and the not-a-session-token case, and `tests/unit/api/order-image-download.test.ts` covers the route headers, the original bytes, the token path and the 401s.
- `tests/e2e/order-image.spec.ts` clicks the viewer's download link and asserts the browser download filename ends in `.png`.
