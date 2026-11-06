# Every uploaded photo is stored as an original plus two WebP copies

The admin grid and the LIFF item page were loading the full phone photo for tiles a few hundred pixels wide, over the tunnel on a phone, where a single view cost 3 to 10 MB. Storing the smaller copies once is cheaper than sending the big file on every view. Each upload now produces three files: the original exactly as it arrived, a WebP capped at 1600px for previews, and a WebP capped at 480px for grids. The layout gained a kind folder, and the app namespace folder was renamed from `wh-order-images-storage` to `order-images`:

```text
<STORAGE_PATH>/order-images/
├── originals/<date>/<order>/<line>/<item>/<seq>-<package>.<ext>
├── web/<date>/<order>/<line>/<item>/<seq>-<package>.webp
└── thumb/<date>/<order>/<line>/<item>/<seq>-<package>.webp
```

`images.storage_key` still holds only `date/order/line/item/seq-package.ext`. The kind folder is a storage detail resolved by `originalPath()`, `derivativeKey()` and `derivativePath()` in `lib/order-images/storage.ts`, so the paths are derived from the key and no schema column is needed. The split also says what to back up: `originals/` is the archive, `web/` and `thumb/` are disposable and can be rebuilt. The suffix check on the base became `path.basename(base) === 'order-images'`, because a string suffix would treat a base such as `backup-order-images` as the root.

Generation happens in the upload route before `saveImage`. `buildImageVariants` (sharp 0.35) reads the metadata first, so decoding doubles as the format check: a client can claim any MIME type, but only jpeg, png and webp parse. It applies the EXIF orientation and writes no metadata, which also drops any camera location from the copies. Quality is 78 for web and 72 for thumb, with `fit: inside` and `withoutEnlargement`, so nothing is upscaled. The order matters because sharp is async and `saveImage` must stay inside one synchronous better-sqlite3 transaction: a buffer that cannot be decoded is rejected with 400 `unsupported-type` instead of failing as a 500. `saveImage` writes all three files inside the transaction, and the three delete paths (`deleteImage`, `deleteItemCascade`, `deleteOrderCascade`) unlink all three through `removeStoredFiles`. The file route takes `?size=web|thumb|original`, defaults to `web`, serves `image/webp` for a derivative and falls back to the original with its stored MIME type when the derivative is missing. Tiles request `?size=thumb` and previews `?size=web` in both the admin and the LIFF screens.

## Considered options

- **Resize on the client before upload.** Rejected: the client is not trusted to produce the stored file, and the original still has to be uploaded, so it would not save transfer time.
- **Resize on each request.** Rejected: it moves CPU work into a read path that may run many times per photo, and the result is deterministic, so it only needs doing once.
- **One derivative only.** Rejected: a 1600px file is still heavy for a tile grid on a phone, and a 480px file is not enough for a preview.
- **Move the existing files to the new root automatically.** Out of scope: the database and uploads had already been cleared as part of the previous change.
- **A schema column for each derivative path.** Rejected for now: the path is derivable from `storage_key` with one function, and there were no rows to migrate. A format change such as AVIF would need a regenerate step, which is a script rather than a column.

## Consequences

- A photo costs three files instead of one, roughly 10 to 13 percent more disk for a 3 MB original.
- Deleting a row must remove three files. A missed derivative outlives the row that names it, so the unit test counts files rather than rows.
- An upload whose header parses but whose pixels are corrupt is rejected with 400 `unsupported-type` instead of being stored and shown broken.
- The originals keep their EXIF, including any camera location. The copies do not.
- There is no backfill. The database and the uploads had already been cleared, so nothing needed migrating, and anything left under the old `wh-order-images-storage` folder is unreachable.
- A storage path saved on `/settings` that pointed at the old folder now grows an `order-images` child folder. The field has to be updated by hand if it was set.
