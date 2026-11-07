// Minimal Cloudflare D1 + env typings for Pages Functions (functions/ is not in the
// app tsconfig, so these are for local clarity; wrangler's esbuild strips them).

export interface D1PreparedStatement {
  bind(...vals: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  run(): Promise<{ success: boolean }>
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>
}

export interface Env {
  DB: D1Database
  /** Cloudflare Workers AI binding (wrangler.toml [ai]); the free fallback reader for the finder. */
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> }
  BREVO_API_KEY?: string
  DIGEST_FROM_EMAIL?: string
  SITE_URL?: string
  RATE_LIMIT_SALT?: string
  /** Search providers for the scholarship finder, tried in this order; DuckDuckGo needs no key. */
  FIRECRAWL_API_KEY?: string
  BRAVE_API_KEY?: string
  OPENAI_API_KEY?: string
  AI_MODEL?: string
  /** Optional first-choice Workers AI model id for the finder's fallback reader. */
  WORKERS_AI_MODEL?: string
  /** Shared secret for the daily finder job (X-Cron-Secret header). */
  CRON_SECRET?: string
  /** When '1', /api/auth/request returns the magic link in the response (LOCAL DEV ONLY). */
  EXPOSE_DEV_MAGIC_LINK?: string
}

export type FnCtx = { request: Request; env: Env }
