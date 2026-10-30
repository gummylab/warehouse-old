# The order-image form removes a decided row before the server answers

A decided row leaves the register queue on the click, not after the server round trip. The queue is high-frequency work: the operator works down a list of requests, and waiting for a write to come back before the next row can be clicked makes the queue feel slow. The removal is optimistic (`useOptimistic`), so the table shows the result immediately and the server's revalidated payload replaces the rows once it arrives. When the server refuses the write, the row comes back.

The removal has to happen inside the button's own action. React rejects an optimistic update made outside a transition or an action, and `useActionState`'s action is one. That is also why both buttons use `useActionState`: the revoke button used `useTransition` with an async callback, whose state updates after the `await` are not part of the transition, so it could not carry an optimistic update.

A refusal is reported above the table rather than next to the button. The button unmounts together with the row it removed, so an error rendered inside it would disappear with it, and the operator would see the row come back with no explanation of why their click did nothing.

## Consequences

- The optimistic state lives in `RegisterView`, above the table. The buttons are inside the table's cells and the column definitions are module-level constants, so `register-decision-context.tsx` is how a button reaches the state above it.
- The removal is by id only. The status of the row does not change optimistically: an approved request moves to the approved table when the server's payload arrives.
- `useOptimistic` needs a plain value to pass through, so the two tables are held as one list and split by status again for the table that is on screen.
- The refused-decision case is covered by an e2e test (`a refused decision puts the row back in the table`), because it is the case the optimistic path makes easy to get wrong.
