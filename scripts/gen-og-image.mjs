/**
 * Renders the Open Graph card to dist/og.png.
 *
 * Screenshots an HTML card over a local HTTP server rather than a file:// URL,
 * because Chromium blocks font and asset loading under file:// and the card
 * would render in a fallback face.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { writeFile } from 'node:fs/promises'

const PORT = 4179
const WIDTH = 1200
const HEIGHT = 630

const CARD = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: #faf6f2;
    background-image:
      radial-gradient(900px 480px at 8% -10%, rgba(196, 92, 38, 0.22), transparent 70%),
      radial-gradient(700px 400px at 95% 8%, rgba(232, 165, 75, 0.20), transparent 65%);
    color: #2a1c14;
    display: flex; flex-direction: column; justify-content: center;
    padding: 76px 80px;
  }
  .brand { display: flex; align-items: center; gap: 16px; margin-bottom: 36px; }
  .mark { width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, #c45c26, #e8a54b);
          display: grid; place-items: center; }
  .brand span { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
  h1 { font-size: 66px; line-height: 1.06; font-weight: 800; letter-spacing: -0.035em; max-width: 15ch; }
  p { margin-top: 26px; font-size: 28px; line-height: 1.45; color: #7a6458; max-width: 30ch; }
  .strip { margin-top: 44px; display: flex; gap: 12px; }
  .chip { border: 1px solid rgba(42,28,20,0.14); background: rgba(255,255,255,0.72);
          border-radius: 999px; padding: 10px 20px; font-size: 21px; font-weight: 600; }
</style>
</head>
<body>
  <div class="brand">
    <div class="mark">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 6 21 10l-9 4-9-4 9-4Z" />
        <path d="M7 12.2V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-3.8" />
      </svg>
    </div>
    <span>Scholarship One</span>
  </div>
  <h1>Find scholarships that actually fit you.</h1>
  <p>Real awards, official links, and deadline reminders. Free, with no sponsored listings.</p>
  <div class="strip">
    <div class="chip">Real awards</div>
    <div class="chip">Official links</div>
    <div class="chip">Save and track</div>
  </div>
</body>
</html>`

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(CARD)
})
await new Promise((resolve) => server.listen(PORT, resolve))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
// Wait for the webfont so the card never ships with a fallback face.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(250)

const buffer = await page.screenshot({ type: 'png' })
await writeFile('dist/og.png', buffer)

await browser.close()
server.close()
console.log(`og.png: ${WIDTH}x${HEIGHT}, ${(buffer.length / 1024).toFixed(1)} kB`)
