# Scholarship One

Public AI scholarship matcher: real programs, deadline tracking, essay guidance, and a grounded assistant â€” no invented awards.

**Live:** https://scholarship-one.pages.dev

> Public, no-account portfolio product in the same family as [trip-one](https://trip-one.pages.dev): grounded AI chat, light/dark UI, Cloudflare Pages, secrets server-side.

## What it does

- **Grounded catalog** â€” Only real, named scholarship programs with public URLs â€” the AI cannot invent awards.
- **Profile-aware match** â€” Major, state, GPA band, and first-gen flags re-rank the list.
- **Deadline spine** â€” Urgent vs stretch tiers so you always know what to do next.
- **Essay coach chat** â€” Ask how to frame an essay; answers stay tied to the selected program.
- **TypeScript + tests-ready** â€” Strict client, Zod-ready shapes, Cloudflare Pages deploy.
- **Privacy-first** â€” No login. Profile stays on-device unless you export it.

## Integrations

- **OpenAI** â€” Match & essay coaching from your profile + real catalog
- **College Board / FAFSA links** â€” Official application paths, never scraped fakes
- **Calendar export** â€” ICS reminders for deadlines
- **Local save** â€” Progress in your browser â€” no account required

## Engineering signals (for recruiters)

- Product thinking: constraint-based AI (no hallucinated scholarships)
- Full-stack: Vite/React/TS + Cloudflare Pages Functions
- UX: mobile-first planner, light/dark, accessible targets
- Integrations: OpenAI Chat Completions with server-side key

## Quick wins

- Add more regional scholarships from official .edu pages
- PDF export of application checklist
- Multi-profile (siblings) with localStorage namespaces
- Email digest via Resend when deadlines are <14 days

## Stack

- Vite + React 18 + TypeScript (strict)
- React Router
- Cloudflare Pages + Functions (`/api/chat`, `/api/health`)
- OpenAI `gpt-4o-mini` (optional; UI works without it)

## Develop

```bash
npm install
npm run dev
```

Copy `.env.example` to `.dev.vars` for Functions:

```
OPENAI_API_KEY=
AI_MODEL=gpt-4o-mini
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name scholarship-one --branch main
```

Set `OPENAI_API_KEY` on the Pages project for live chat.

`git push` updates GitHub only â€” deploy is a separate step.

## Privacy

No accounts. Chat sends the on-page context + your message to `/api/chat` when AI is configured. No ads, no tracking pixels.

## License

MIT
