# The order overview follows one time window, not the list filters

The KPI strip and the order trend chart on `/order-images` share one calendar window anchored on today in Bangkok, chosen by a Select labelled วัน/เดือน/ปี, and both sit in one card. Every grain counts `order_date`; nothing reads `created_at`. วัน is the last seven days, today and the six before it, with one chart bucket per day, and its KPI counts the orders, items and images in that window. เดือน is every day of the current month, one bucket per day, counting from the first of the month through today. ปี is every month of the current year, one bucket per month, counting from 1 January through today. The window covers the whole system and ignores the order list's period, line and search filters: a KPI that moves with the table filter cannot show a trend, and one window keeps the strip and the chart in agreement.

The day grain is a week because `order_date` stores a calendar date with no time, so a single day would give one point and no trend; a seven-day window keeps the daily breakdown while staying on the business date. The card shows no exact date range and starts collapsed with the KPI visible. Future days and months stay on the axis and render as zero, and the month and year ranges end at today, so future-dated orders stay out. The switch is client state and never appears in the URL.

## Considered options

- **Bucket the day chart hourly from `created_at`.** Rejected: `order_date` carries no time, and counting a second source would make the KPI and the chart disagree.
- **Show a single day with one point.** Rejected: one point shows no trend.
- **Keep the day KPI on `order_date` while the chart uses `created_at`.** Rejected: the number and the shape would count different orders.
- **Follow the date selected in the table filter.** Rejected: that ties the overview back to the list, and a window that moves with the filter cannot show a trend.
- **Keep the rolling 30-day and 5-year windows.** Rejected: the grains are calendar windows anchored on today.

## Consequences

- The วัน KPI covers seven days, so it does not equal the table's default today view.
- The rolling 30-day and 5-year views are gone.
- The day window is a week, not a single day.
- The three windows are computed on the server and sent together, so the switch is instant and needs no request.
- The strip can show numbers the filtered table below it does not contain. That is intended: the strip is the system overview, the table is the filtered list.
- The table keeps its own period, line and search filters unchanged, and the old scope switch ("ตามตัวกรอง / ทั้งหมด") is gone.
