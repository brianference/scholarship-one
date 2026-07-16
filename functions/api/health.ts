/**
 * Health + lightweight capability probe for CI / post-deploy checks.
 */
export async function onRequestGet({ env }: { env: Record<string, string | undefined> }) {
  const digestConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.length > 8)
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
