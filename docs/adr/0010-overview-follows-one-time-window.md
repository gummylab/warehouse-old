# The order overview follows one time window, not the list filters

The KPI strip and the order trend chart on `/order-images` share one calendar window anchored on today in Bangkok, chosen by a Select labelled วัน/เดือน/ปี. วัน is the 24 hours of today, with one chart bucket per hour. เดือน is every day of the current month, with one bucket per day (28 to 31, leap February included). ปี is every month of the current year, with one bucket per month. The day grain counts orders created today, while the month and year grains count orders whose `order_date` falls from the first of the month, or 1 January, through today; each count includes the order's items and images. The window covers the whole system and ignores the order list's period, line and search filters: a KPI that moves with the table filter cannot show a trend, and one window keeps the strip and the chart in agreement.

The day grain reads `created_at` because `order_date` stores a calendar date with no time, so an hourly breakdown is only possible from the upload timestamp. The KPI uses the same source for that grain so the number and the chart agree. The month and year grains stay on `order_date`, the business date the table and its filters use. The card shows no exact date range, and the chart starts collapsed while the KPI stays visible. Future hours, days and months remain on the axis and render as zero, and the month and year ranges end at today, so future-dated orders stay out. The switch is client state and never appears in the URL.

## Considered options

- **Bucket the day chart by `order_date`.** Rejected: it has no time, so it cannot make an hourly bucket.
- **Keep the day KPI on `order_date` while the chart uses `created_at`.** Rejected: the number and the shape would count different orders.
- **Follow the date selected in the table filter.** Rejected: that ties the overview back to the list, and a window that moves with the filter cannot show a trend.
- **Keep the rolling 30-day and 5-year windows.** Rejected: the grains are calendar windows anchored on today.
- **Keep the toggle group instead of a Select.** Rejected: the control is a Select labelled วัน/เดือน/ปี.

## Consequences

- The day KPI can differ from the table when an order was entered on a different day than its `order_date`.
- The rolling 30-day and 5-year views are gone.
- The day window measures arrival time, not business date; the month and year windows measure the business date.
- The three windows are computed on the server and sent together, so the switch is instant and needs no request.
- The strip can show numbers the filtered table below it does not contain. That is intended: the strip is the system overview, the table is the filtered list.
- The table keeps its own period, line and search filters unchanged, and the old scope switch ("ตามตัวกรอง / ทั้งหมด") is gone.
