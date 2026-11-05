# An order is identified by number, date and line

An order is the triple `(order_number, order_date, line)`, not the pair `(order_number, order_date)`. `line` is part of the identity because the warehouse can print the same number on more than one production line on the same day, and the line was always stored on the order and already part of the storage key; only the lookup ignored it. The unique index becomes `idx_orders_number_date_line` on the three columns in place of `idx_orders_number_date` on two, created by the schema bootstrap, which drops the old index on the next open. No data migration is needed: the new key is weaker, so every existing row already satisfies it.

The old rule made the second line invisible. Step 1 of the order-image form found the existing order by number and date, ignored the line the operator had selected, and opened the first line's order, so both lines saw one order with the same items and photos. The rejected options all keep the pair and hand the collision to the operator: a notice that the line was ignored, an overwrite of the stored line, or a confirmation prompt each leave a real second-line order with nowhere to store its items. Treating the line as a mutable attribute of one order goes further and declares the two lines to be the same order.

## Considered options

- **Keep number and date, and show a notice that the line was ignored.** Rejected: a notice explains the collision but still gives the second line no order of its own.
- **Keep number and date, but overwrite the stored line on lookup.** Rejected: the second visit silently relabels the first line's order, and the items already under it now belong to the wrong line.
- **Keep number and date, and ask the operator to confirm a line change.** Rejected: a prompt makes the collision a decision the operator has to make on every lookup, and one order can still carry only one line.
- **Treat the line as a mutable attribute of one order.** Rejected: it states that two production lines sharing a printed number are the same order, which is the assumption that broke.

## Consequences

- Two orders can share a number and a date and appear as two rows in the admin order list.
- The delete dialog is scoped to the order id, so deleting one of them leaves the other in place.
- The KPI strip and the trend chart count each order separately, so a shared number adds two.
- Orders created under the old rule cannot be split retroactively: the second line's selection was discarded at entry, so there is no record of which line it was.
- The storage key already includes the line, so files from two same-number, same-date orders do not collide.
