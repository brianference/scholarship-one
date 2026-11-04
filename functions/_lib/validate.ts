/** Zod schemas for every request body the API accepts, plus a parse helper. */
import { z } from 'zod'
import { json } from './http'

/** Emails are stored and compared lowercase so sign-in is case-insensitive. */
export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email('Enter a valid email address.')
  .transform((v) => v.toLowerCase())

/**
 * Password floor is length-first, per current NIST guidance: long beats a
 * character-class obstacle course. 12 chars minimum, 200 max so a very long
 * input cannot be used to burn CPU in PBKDF2.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200, 'That password is too long.')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
})

export const resetRequestSchema = z.object({ email: emailSchema })

export const resetSchema = z.object({
  token: z.string().min(16).max(256),
  password: passwordSchema,
})

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(100),
  email: emailSchema,
  subject: z.string().trim().min(1, 'Add a subject.').max(150),
  message: z.string().trim().min(10, 'Add a little more detail.').max(5000),
  /**
   * Honeypot. Accepts any value here on purpose: the handler checks it and
   * returns a normal success response, so a bot never learns what gave it away.
   * Rejecting it at validation would leak that signal in the 400.
   */
  website: z.string().max(200).optional(),
})

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response }

/**
 * Parse a JSON request body against a schema. On failure returns a ready-to-send
 * 400 carrying field-level messages, so callers stay a single early return.
 */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: json({ error: 'Send a valid JSON body.' }, 400) }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form'
      if (!fields[key]) fields[key] = issue.message
    }
    return { ok: false, response: json({ error: 'Please fix the highlighted fields.', fields }, 400) }
  }
  return { ok: true, data: result.data }
}

/** The five profile fields that drive ranking. Short strings only. */
const profileField = z.string().trim().min(1).max(64)

export const profileSchema = z.object({
  profile: z.object({
    major: profileField,
    state: profileField,
    level: profileField,
    identity: profileField,
    need: profileField,
  }),
  /** Epoch ms of the edit on the device; the newer write wins when devices disagree. */
  updatedAt: z
    .number()
    .int()
    .positive()
    // A device with a wrong clock must not win every future write: allow at most a day ahead.
    .refine((v) => v <= Date.now() + 86_400_000, 'Timestamp is in the future.'),
})

/** Catalog ids are short slugs; this stops arbitrary text landing in D1. */
const catalogId = z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i)

export const hiddenAddSchema = z.object({
  ids: z.array(catalogId).min(1).max(500),
})

export const hiddenIdSchema = z.object({ id: catalogId })

/** True for a YYYY-MM-DD that exists on the calendar (rejects 2026-02-31, which Date.parse rolls over). */
function isRealCalendarDay(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const t = Date.parse(v)
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v
}

/** A calendar day, YYYY-MM-DD. Empty string clears the reminder. */
export const remindOnSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || isRealCalendarDay(v), 'Use a YYYY-MM-DD date.')

/** Body for /api/find: the profile the query is built from, and which of the two searches to run. */
export const findRequestSchema = z.object({
  profile: profileSchema.shape.profile,
  variant: z.union([z.literal(0), z.literal(1)]),
})

/** Body for /api/find-cron. */
export const cronBodySchema = z.object({ query: z.string().trim().min(8).max(200) })

/** Body for /api/find-state: both parts optional; ids are catalog or web-find slugs. */
export const findStateSchema = z.object({
  firstCheckedAt: z
    .number()
    .int()
    .positive()
    .refine((v) => v <= Date.now() + 86_400_000, 'Timestamp is in the future.')
    .optional(),
  checkedAt: z
    .number()
    .int()
    .positive()
    .refine((v) => v <= Date.now() + 86_400_000, 'Timestamp is in the future.')
    .optional(),
  seenIds: z.array(catalogId).max(1000).optional(),
})
