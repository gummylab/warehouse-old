// The shapes the /api/liff endpoints accept, checked at the boundary.
//
// The request bodies are the one place a caller controls the shape, and
// four handlers were parsing them by hand: read the JSON, check each
// field's type, and map the result to an error code the form shows in
// Thai. A schema says the same thing once, and the error code comes from
// the schema instead of from the branch that rejected it.
//
// The business rules stay where they were: the order number's length and
// the calendar date's realness live in lib/order-images/validation.ts,
// which the form checks with before it submits. Zod checks the shape; the
// shared helpers check the value.
import { z } from 'zod'

// The error codes the client already knows (app/liff/forms/order-image/
// order-image-api.ts, ERROR_MESSAGES). A schema names the code it
// rejects with, so a handler does not have to invent one per field.
//
// The code travels as the schema's error message: it is a fixed word the
// handler passes straight to the client, and the client maps it to Thai.
const code = (value: string) => ({ error: value })

export const orderLookupSchema = z.object({
  orderNumber: z.string(code('invalid-order-number')),
  orderDate: z.string(code('invalid-order-date')),
  line: z.string(code('unknown-line')),
})

export const addItemSchema = z.object({
  // A missing parent means "top level", and so does an explicit null: the
  // client sends the field every time, so null is what a top-level item
  // actually looks like on the wire. A present value has to be a
  // non-empty string.
  parentItemId: z.string().min(1).nullish(),
})

export const imagePackageSchema = z.object({
  // null clears the label, so null is a valid answer alongside a name.
  package: z.string().nullable(),
})

// The line-walk lookup carries its composite key in query params.
export const lineWalkLookupSchema = z.object({
  date: z.string(code('invalid-date')),
  shift: z.string(code('invalid-shift')),
  line: z.string(code('unknown-line')),
  brand: z.string(code('invalid-brand')),
  packStyle: z.string(code('invalid-pack-style')),
})

const lineWalkEntrySchema = z.object({
  walkDate: z.string(code('invalid-date')),
  shift: z.string(code('invalid-shift')),
  line: z.string(code('unknown-line')),
  brand: z.string(code('invalid-brand')),
  packStyle: z.string(code('invalid-pack-style')),
  people: z.number(code('invalid-people')),
  amount: z.number(code('invalid-amount')),
})

// A save is a batch, upserted in one transaction.
export const lineWalkSaveSchema = z.object({
  entries: z
    .array(lineWalkEntrySchema, code('invalid-entries'))
    .min(1, code('invalid-entries'))
    .max(50, code('invalid-entries')),
})

// Reads a JSON body and checks it against a schema. A body that is not
// JSON, or that does not fit the schema, comes back as the error code the
// schema named.
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const raw = await request.json().catch(() => null)
  const result = schema.safeParse(raw)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  // The first issue carries the code: the schemas put the code in the
  // message, so a handler only has to read it.
  const issue = result.error.issues[0]
  return { ok: false, error: issue?.message ?? 'invalid-body' }
}
