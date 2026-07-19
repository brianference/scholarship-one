/**
 * Health + lightweight capability probe for CI / post-deploy checks.
 */
export async function onRequestGet({ env }: { env: Record<string, string | undefined> }) {
  // Brevo is the sender (see _lib/email.ts). This probe checked RESEND_API_KEY,
  // left over from an earlier provider, so it reported digestEmail:false while
  // email was configured and sending — and CI treats this endpoint as a
  // post-deploy capability check.
  const digestConfigured = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.length > 8)
  // Rate limiting falls back to a hardcoded salt when this is unset, which is
  // fine locally and not fine in production.
  const rateLimitSaltConfigured = Boolean(env.RATE_LIMIT_SALT && env.RATE_LIMIT_SALT.length > 8)
  const chatConfigured = Boolean(
    (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 8) ||
      (env.GROK_API_KEY && env.GROK_API_KEY.length > 8),
  )

  return new Response(
    JSON.stringify({
      status: 'ok',
      product: 'scholarship-one',
      capabilities: {
        digestEmail: digestConfigured,
        chat: chatConfigured,
        rateLimitSalt: rateLimitSaltConfigured,
      },
      at: Date.now(),
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  )
}
