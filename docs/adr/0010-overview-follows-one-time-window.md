# The order overview follows one time window, not the list filters

The KPI strip and the order trend chart on `/order-images` share one time window, chosen by the switch above them: **day** is the last 30 consecutive days, **month** the last 12 calendar months, **year** the last 5 calendar years, and every window ends today in Bangkok. The window covers the whole system and deliberately ignores the order list filters (period, line, order-number search). A KPI that changes with the table's day filter cannot show a trend, and two time concepts on one screen made the overview hard to read; with one window the numbers above and the shape below tell the same story.

Counts are bucketed by `order_date`, the Bangkok calendar date the order already carries, not by the upload timestamp, so the KPI numbers and the chart always agree and no timezone conversion is involved. Orders dated in the future fall outside every window. The chart plots orders only, as a single area series.

The old KPI scope switch ("ตามตัวกรอง / ทั้งหมด", `?summary=all`) is removed: a legacy `summary` parameter is ignored and dropped from rewritten URLs. The new switch is client state, so it does not appear in the URL.

## Considered options

- **Keep the filtered/all toggle and give the chart its own independent range.** Rejected: two time concepts on one screen was the problem, and an independent chart range keeps it.
- **Keep the KPI filtered while the chart stays whole-system.** Rejected: the numbers and the shape would describe different periods, which is the confusion this change removes.
- **Make the KPI follow the selected production line.** Rejected: that ties the overview to the table's filters again, and the overview is whole-system.
- **Bucket by `created_at` (upload time) instead of `order_date`.** Rejected: upload time is not the day the order belongs to, and bucketing a timestamp needs a timezone conversion that `order_date` avoids.
- **Put the window in the URL.** Rejected: the switch is view state for one screen, and the URL parameter it would replace was the old scope toggle, now removed.

## Consequences

- The three windows are computed on the server and sent together, so the switch is instant and needs no request or URL change.
- The KPI strip can legitimately show numbers the filtered table below it does not contain. That is intended: the strip is the system overview, the table is the filtered list.
- The table keeps its own period, line and search filters unchanged; only the KPI scope switch was removed.
