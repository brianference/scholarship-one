var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/http.ts
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}
__name(json, "json");
function readCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
__name(readCookie, "readCookie");
var COOKIE_NAME = "so_session";
function sessionCookie(id, maxAgeSeconds) {
  return [
    `${COOKIE_NAME}=${id}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ].join("; ");
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
__name(clearSessionCookie, "clearSessionCookie");
function readSessionId(request) {
  return readCookie(request, COOKIE_NAME);
}
__name(readSessionId, "readSessionId");

// _lib/auth.ts
async function sha256hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256hex, "sha256hex");
function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomToken, "randomToken");
async function getSession(env, request) {
  const sid = readSessionId(request);
  if (!sid) return null;
  const row = await env.DB.prepare(
    `select s.user_id as userId, u.email as email
       from sessions s join users u on u.id = s.user_id
      where s.id = ? and s.expires_at > ?`
  ).bind(sid, Date.now()).first();
  return row ? { userId: row.userId, email: row.email } : null;
}
__name(getSession, "getSession");

// _lib/email.ts
function parseSender(from) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "Scholarship One", email: m[2] };
  return { name: "Scholarship One", email: from };
}
__name(parseSender, "parseSender");
async function sendEmail(env, to, subject, html) {
  const key = env.BREVO_API_KEY;
  const from = env.DIGEST_FROM_EMAIL || "Scholarship One <no-reply@scholarship-one.pages.dev>";
  if (!key) {
    console.log(`[email stub] to=${to} subject=${subject}`);
    return { sent: false, stubbed: true };
  }
  const sender = parseSender(from);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html })
  });
  if (!res.ok) {
    const text = await res.text();
    return { sent: false, error: `brevo ${res.status}: ${text.slice(0, 200)}` };
  }
  return { sent: true };
}
__name(sendEmail, "sendEmail");
var wrap = /* @__PURE__ */ __name((inner) => `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#2a1c14">
     <h2 style="color:#c45c26;margin:0 0 12px">Scholarship One</h2>${inner}
     <p style="color:#8a7365;font-size:12px;margin-top:24px">You received this because you use Scholarship One. Awards link to their official pages; we never invent scholarships.</p>
   </div>`, "wrap");
function magicLinkHtml(link) {
  return wrap(
    `<p>Click to sign in and sync your saved scholarships:</p>
     <p><a href="${link}" style="display:inline-block;background:#c45c26;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Sign in to Scholarship One</a></p>
     <p style="color:#8a7365;font-size:13px">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`
  );
}
__name(magicLinkHtml, "magicLinkHtml");

// api/auth/request.ts
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var TOKEN_TTL_MS = 15 * 60 * 1e3;
async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 160);
  if (!EMAIL_RE.test(email)) return json({ error: "valid email required" }, 400);
  const now = Date.now();
  await env.DB.prepare("insert into users (id, email, created_at) values (?, ?, ?) on conflict(email) do nothing").bind(crypto.randomUUID(), email, now).run();
  const user = await env.DB.prepare("select id from users where email = ?").bind(email).first();
  if (!user) return json({ error: "could not create account" }, 500);
  const token = randomToken(32);
  const hash = await sha256hex(token);
  await env.DB.prepare("insert into auth_tokens (token_hash, user_id, expires_at) values (?, ?, ?)").bind(hash, user.id, now + TOKEN_TTL_MS).run();
  const origin = env.SITE_URL || new URL(request.url).origin;
  const link = `${origin}/auth?token=${token}`;
  const result = await sendEmail(env, email, "Sign in to Scholarship One", magicLinkHtml(link));
  const dev = env.EXPOSE_DEV_MAGIC_LINK === "1" && result.stubbed;
  return json({ ok: true, ...dev ? { devLink: link } : {} });
}
__name(onRequestPost, "onRequestPost");

// api/auth/session.ts
async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  const enabled = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.length > 8);
  return json({ email: session?.email || null, enabled });
}
__name(onRequestGet, "onRequestGet");

// api/auth/signout.ts
async function onRequestPost2({ request, env }) {
  const sid = readSessionId(request);
  if (sid) await env.DB.prepare("delete from sessions where id = ?").bind(sid).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
__name(onRequestPost2, "onRequestPost");

// api/auth/verify.ts
var SESSION_TTL_SECONDS = 60 * 24 * 60 * 60;
async function onRequestPost3({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const token = String(body?.token || "");
  if (!token) return json({ error: "token required" }, 400);
  const now = Date.now();
  const hash = await sha256hex(token);
  const row = await env.DB.prepare(
    "select user_id as userId, expires_at as expiresAt, used_at as usedAt from auth_tokens where token_hash = ?"
  ).bind(hash).first();
  if (!row || row.usedAt || row.expiresAt < now) {
    return json({ error: "invalid or expired link" }, 400);
  }
  await env.DB.prepare("update auth_tokens set used_at = ? where token_hash = ?").bind(now, hash).run();
  const sid = randomToken(24);
  await env.DB.prepare("insert into sessions (id, user_id, created_at, expires_at) values (?, ?, ?, ?)").bind(sid, row.userId, now, now + SESSION_TTL_SECONDS * 1e3).run();
  const user = await env.DB.prepare("select email from users where id = ?").bind(row.userId).first();
  return json({ ok: true, email: user?.email || null }, 200, { "Set-Cookie": sessionCookie(sid, SESSION_TTL_SECONDS) });
}
__name(onRequestPost3, "onRequestPost");

// api/chat.ts
function extractCatalogIds(context) {
  const ids = /* @__PURE__ */ new Set();
  try {
    const parsed = JSON.parse(context);
    for (const row of parsed.catalog || []) {
      if (row?.id) ids.add(String(row.id));
    }
  } catch {
  }
  return ids;
}
__name(extractCatalogIds, "extractCatalogIds");
async function onRequestPost4({ request, env }) {
  const json2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  }), "json");
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json2({ error: "invalid json" }, 400);
  }
  const message = (payload.message || "").trim().slice(0, 1e3);
  if (!message) return json2({ error: "message required" }, 400);
  const dataContext = (payload.context || "").slice(0, 16e3);
  const product = (payload.product || "scholarship-one").slice(0, 40);
  const history = Array.isArray(payload.history) ? payload.history.slice(-12) : [];
  const validIds = extractCatalogIds(dataContext);
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return json2({
      stage: "clarify",
      message: "The online assistant is not configured right now. Use the scholarship list and filters on this page \u2014 every award is real. Pick a school level, major, or need below to get started.",
      questions: [
        "Undergraduate",
        "High school senior",
        "Nursing",
        "Engineering / STEM",
        "Hispanic / Latino / Mexican",
        "Need-based aid"
      ],
      questionGroups: true,
      matches: []
    });
  }
  const system = `You are the Scholarship match assistant for ${product}.
You help students find scholarships from CONTEXT.catalog only. CONTEXT may also include userProfile (level, major, identity, need, state) already set on the page.

Be a smart coach:
- Use the full conversation history and userProfile together.
- Short phrases about students, majors, sports, disability, or aid ARE on-topic (e.g. "handicapped student track math", "Latina sports", "nursing Pell"). Treat them as search queries and return stage "preview" with catalog matches.
- Only use the off-topic line for true non-scholarship chatter (trivia, weather, jokes with no student/aid intent). If in doubt, search the catalog.
- If you already know enough (from message + history + userProfile) to recommend 2-5 programs, use stage "preview". Do not over-ask.
- If the request is partial (e.g. Mexican women in sports, disability + math + track), return closest catalog ids with an honest one-sentence lead-in. Never invent programs.
- Prefer concrete, warm, plain English. No jargon like "grounded" or "Match AI".

Stages:
- clarify: need more detail. matches []. Ask for school level, major/field, and/or background/needs. Provide short chip labels in questions.
- preview: enough to recommend. matches 2-5 catalog ids with reasons. message is a short intro only (UI shows cards). Invite them to save programs they want.
- confirmed: user said save/yes/confirm. Return the same matches again.

STRICT JSON only:
{"stage":"clarify"|"preview"|"confirmed","message":"string","questions":["chip labels"],"matches":[{"id":"catalog-id","reason":"why it fits"}]}

Catalog guidance (ids must exist in CONTEXT.catalog):
- Hispanic / Mexican / Latina: hispanic, hsf-athletes, lulac-scholarship, la-raza-scholarships, shpe-scholarships, dream-us
- Women + sports / track: wsf-grants, ncaa-postgrad, hsf-athletes, lulac-scholarship, aauw-fellowships
- Black students: uncf, jackie-robinson, ron-brown, gates, thurgood, nbmbaa, nsbe-scholarships, nbna-scholarships, united-negro-college, acs-scholars
- Marketing/business: ama-foundation, nbmbaa, deloitte
- STEM / math: smart-scholarship, goldwater, swe-scholarships, nsbe-scholarships, shpe-scholarships, generation-google, acs-scholars
- Disability / handicapped / accessibility: google-lime, microsoft-disability, aahd-krause, incight-scholarship, nfb-scholarship
- Nursing: nurse-corps, aacn-nursing, nbna-scholarships, aftercollege-aacn
- Need / FAFSA / first-gen: pell, fastweb-note, jack-kent, uncf, dell-scholars, horatio-alger, burger-king-scholars, elks-mvs
- Community college transfer: jack-kent-transfer
- Asian / Pacific Islander: apia-scholarship
- LGBTQ: point-foundation
- Military family: nmfa-military
- DACA / undocumented: dream-us
- State / regional: cal-grant, texas-grant, excelsior-ny, bright-futures-fl, illinois-map, wa-college-grant, arizona-leap, hope-georgia, ohio-ocog, pa-state-grant, massgrant, oregon-opportunity, michigan-tuition-grant, colorado-student-grant, nc-need-based, virginia-schev, nj-tag, minnesota-state-grant

questions chips should be short answers a student can tap (e.g. "Undergraduate", "Math", "Student with a disability", "Student athlete").
ASCII punctuation only.`;
  const historyMessages = history.filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string").map((h) => ({ role: h.role, content: h.content.slice(0, 1500) }));
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 750,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "system",
            content: `CONTEXT JSON (catalog + optional userProfile):
${dataContext || '{"catalog":[]}'}

Use userProfile when present to avoid re-asking known facts.`
          },
          ...historyMessages,
          { role: "user", content: message }
        ]
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return json2({ error: `upstream ${res.status}`, detail: errText.slice(0, 200) }, 502);
    }
    const body = await res.json();
    const raw = body.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json2({
        stage: "clarify",
        message: "I hit a snag reading that reply. Tell me your school level, major or field, and any background or aid needs.",
        questions: ["Undergraduate", "High school senior", "Nursing", "Hispanic / Latino / Mexican", "Need-based aid"],
        matches: []
      });
    }
    const stage = parsed.stage === "preview" || parsed.stage === "confirmed" || parsed.stage === "clarify" ? parsed.stage : "clarify";
    let matches = Array.isArray(parsed.matches) ? parsed.matches.filter((m) => m && typeof m.id === "string").map((m) => ({
      id: String(m.id).slice(0, 40),
      reason: String(m.reason || "").slice(0, 200)
    })).slice(0, 6) : [];
    if (validIds.size) {
      matches = matches.filter((m) => validIds.has(m.id));
    }
    let questions = Array.isArray(parsed.questions) ? parsed.questions.map((q) => String(q).slice(0, 80)).filter(Boolean).slice(0, 12) : [];
    if (stage === "clarify" && questions.length < 4) {
      questions = [
        "Undergraduate",
        "High school senior",
        "Nursing",
        "Engineering / STEM",
        "Hispanic / Latino / Mexican",
        "Woman / female student",
        "Need-based aid",
        "Student athlete",
        ...questions
      ].slice(0, 12);
    }
    return json2({
      stage,
      message: (parsed.message || "Tell me a bit more about what you need.").slice(0, 2500),
      questions,
      matches,
      useOptionGroups: stage === "clarify"
    });
  } catch {
    return json2({ error: "chat failed" }, 500);
  }
}
__name(onRequestPost4, "onRequestPost");

// api/digest-send.ts
async function onRequestPost5({ request, env }) {
  const json2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  }), "json");
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json2({ error: "invalid json" }, 400);
  }
  const email = String(payload.email || "").trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json2({ error: "valid email required" }, 400);
  }
  const items = Array.isArray(payload.items) ? payload.items.slice(0, 40) : [];
  const weekLabel = String(payload.weekLabel || "This week").slice(0, 80);
  const key = env.RESEND_API_KEY;
  const from = env.DIGEST_FROM_EMAIL || "Scholarship One <onboarding@resend.dev>";
  if (!key) {
    return json2({
      ok: false,
      configured: false,
      error: "Email is not configured on the server yet. Use Copy digest or Email to myself (mailto) on the digest panel."
    });
  }
  const rows = items.length === 0 ? "<p>No fixed deadlines in the next week. Check rolling / FAFSA programs on Scholarship One.</p>" : `<ul>${items.map((item) => {
    const name = escapeHtml(String(item.name || "Program"));
    const deadline = escapeHtml(String(item.deadline || ""));
    const amount = escapeHtml(String(item.amount || ""));
    const url = String(item.url || "").startsWith("https://") ? item.url : "#";
    const days = typeof item.daysLeft === "number" ? ` \xB7 due in ${item.daysLeft} day(s)` : "";
    return `<li><strong>${name}</strong><br/>${deadline}${days} \xB7 ${amount}<br/><a href="${escapeHtml(String(url))}">Official site</a></li>`;
  }).join("")}</ul>`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#1a1a1a">
    <h1 style="font-size:1.25rem">Your scholarship deadline digest</h1>
    <p>${escapeHtml(weekLabel)}</p>
    ${rows}
    <p style="color:#555;font-size:13px">Always confirm deadlines on the official program site. Sent from Scholarship One.</p>
    <p><a href="https://scholarship-one.pages.dev/digest">Open Deadlines on Scholarship One</a></p>
  </body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Scholarship deadlines \xB7 ${weekLabel}`,
        html
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json2({ error: "email send failed", detail: detail.slice(0, 200) }, 502);
    }
    return json2({ ok: true, configured: true });
  } catch {
    return json2({ error: "email send failed" }, 500);
  }
}
__name(onRequestPost5, "onRequestPost");
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHtml, "escapeHtml");

// api/health.ts
async function onRequestGet2({ env }) {
  const digestConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.length > 8);
  const chatConfigured = Boolean(
    env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 8 || env.GROK_API_KEY && env.GROK_API_KEY.length > 8
  );
  return new Response(
    JSON.stringify({
      status: "ok",
      product: "scholarship-one",
      capabilities: {
        digestEmail: digestConfigured,
        chat: chatConfigured
      },
      at: Date.now()
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
__name(onRequestGet2, "onRequestGet");

// api/saves.ts
function mapRow(r) {
  let checklist = [];
  try {
    checklist = r.checklist ? JSON.parse(r.checklist) : [];
  } catch {
    checklist = [];
  }
  return {
    id: r.id,
    savedAt: r.saved_at,
    updatedAt: r.updated_at,
    notes: r.notes || "",
    checklist,
    applyStatus: r.apply_status || "none",
    deadline: r.deadline || "",
    reminderSent: r.reminder_sent ? r.reminder_sent.split(",").filter(Boolean) : []
  };
}
__name(mapRow, "mapRow");
async function onRequestGet3({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "auth required" }, 401);
  const rows = (await env.DB.prepare(
    `select scholarship_id as id, saved_at, updated_at, notes, checklist, apply_status, deadline, reminder_sent
         from saved_scholarships where user_id = ? order by saved_at desc`
  ).bind(session.userId).all()).results;
  return json({ saves: rows.map(mapRow) });
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost6({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "auth required" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const saves = Array.isArray(body?.saves) ? body.saves.slice(0, 500) : [];
  const now = Date.now();
  const db = env.DB;
  const stmts = saves.filter((it) => it.id).map(
    (it) => db.prepare(
      `insert into saved_scholarships
             (user_id, scholarship_id, saved_at, updated_at, notes, checklist, apply_status, deadline)
           values (?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(user_id, scholarship_id) do update set
             updated_at = excluded.updated_at,
             notes = excluded.notes,
             checklist = excluded.checklist,
             apply_status = excluded.apply_status,
             deadline = excluded.deadline`
    ).bind(
      session.userId,
      String(it.id),
      Number(it.saved_at) || now,
      now,
      it.notes ?? null,
      JSON.stringify(Array.isArray(it.checklist) ? it.checklist : []),
      String(it.apply_status || "none"),
      it.deadline ?? null
    )
  );
  if (stmts.length) await db.batch(stmts);
  return json({ ok: true, count: stmts.length });
}
__name(onRequestPost6, "onRequestPost");
async function onRequestDelete({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "auth required" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  await env.DB.prepare("delete from saved_scholarships where user_id = ? and scholarship_id = ?").bind(session.userId, id).run();
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");

// ../.wrangler/tmp/pages-BSJAbM/functionsRoutes-0.02706916576995888.mjs
var routes = [
  {
    routePath: "/api/auth/request",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/auth/session",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/auth/signout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/verify",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/chat",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/digest-send",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/health",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/saves",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/saves",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/saves",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  }
];

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-AmqNI0/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-AmqNI0/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.49336138956524667.mjs.map
