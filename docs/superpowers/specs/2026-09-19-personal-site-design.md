# Personal site — design spec

Date: 2026-09-19
Status: Approved by Samuel (chat, 2026-09-19)

## Purpose

A personal brand/bio site for Samuel, structurally inspired by the Ali Abdaal
reference (photo + bio, sidebar newsletter box, top nav of content sections)
but with Samuel's own visual identity and only the sections that have real
content today. Not a CFI-lead-gen site — the goal is telling his story
(aircraft mechanic → pilot → flight instructor) and, eventually, writing.

## Non-goals (v1)

- No course sales, podcast, or book-notes sections (nothing to put in them yet)
- No contact form (spam surface not worth it for v1) — a mailto/social link is enough
- No CMS/admin UI — content is edited as files in the repo
- No automated test suite — content site, verified by hand in-browser

## Tech stack

- **Node.js + Express**, server-rendered with **EJS** templates
- Plain CSS with custom-property design tokens (no Tailwind/component lib —
  unnecessary weight for this site's size)
- Articles as Markdown files with frontmatter, parsed with `gray-matter` +
  rendered with `marked`
- `dotenv` for local env vars (ConvertKit credentials)
- `nodemon` as a dev dependency only

## Visual design

- Design system: Swiss Modernism 2.0 (editorial grid, clean hierarchy),
  adapted from `ui-ux-pro-max --design-system` output
- Palette (navy + sky-blue, aviation-appropriate — swapped in for the
  design system's default pink accent):
  - `--color-primary: #0F172A` (navy)
  - `--color-on-primary: #FFFFFF`
  - `--color-secondary: #334155`
  - `--color-accent: #0369A1` (sky blue)
  - `--color-on-accent: #FFFFFF`
  - `--color-background: #F8FAFC`
  - `--color-foreground: #020617`
  - `--color-card: #FFFFFF`
  - `--color-muted: #E8ECF1`
  - `--color-muted-foreground: #475569`
  - `--color-border: #E2E8F0`
  - `--color-ring: #0F172A`
  - Dark mode: token overrides under `prefers-color-scheme: dark` (desaturated/lighter
    tonal variants per `color-dark-mode` guidance, not raw inversion)
- Typography: Public Sans (body/UI) + a serif display face for headlines
  (e.g. Fraunces or Libre Bodoni — pick at implementation time by pairing check)
- Layout: 12-col grid, mobile-first breakpoints at 375/768/1024/1440,
  photo+bio with sidebar newsletter box on desktop, single column stacked
  on mobile
- Accessibility: 4.5:1 text contrast in both themes, visible focus rings,
  `prefers-reduced-motion` respected, all interactive targets ≥44px

## Pages & routes

| Route | Purpose |
|---|---|
| `GET /` | Home/About — photo, bio, nav, newsletter sidebar box |
| `GET /articles` | List of published articles (may be empty/1 post at launch) |
| `GET /articles/:slug` | Single article page, rendered from Markdown |
| `POST /api/subscribe` | Newsletter signup → ConvertKit; redirects back to `/` with a success/error query flag, no client JS required |
| `GET *` (404) | Simple not-found page |

Nav (v1): Home, Articles, Contact (Contact is an anchor/section, not a route).

## Content model

- `src/content/site.json` — site-wide copy: name, tagline, nav labels, bio
  text (rich — paragraphs), contact email, social links, newsletter box
  copy. Single source of truth for anything editable that isn't a full
  article.
- `src/content/articles/*.md` — one file per post. Frontmatter: `title`,
  `slug`, `date`, `excerpt`. Body is Markdown.
- Bio copy is being fine-tuned via a separate copy-editing pass (applying
  Samuel's writing-cleanup rules) before it's placed into `site.json` —
  tracked as a follow-up to this spec, not blocking the build.

## Newsletter integration (ConvertKit)

- Samuel is creating a free ConvertKit account; we need a **Form ID** and
  **API key** from him before this is wired live.
- `src/services/convertkit.js` wraps ConvertKit's "add subscriber to a
  form" endpoint. API key lives in `.env` (`.env.example` checked in with
  blank placeholders), never sent to the client.
- **Graceful degradation:** if `CONVERTKIT_API_KEY` / `CONVERTKIT_FORM_ID`
  are unset, `/api/subscribe` returns a clear "signup temporarily
  unavailable" message instead of crashing — the rest of the site must
  work today even before the ConvertKit account exists.
- Form submission is a plain HTML POST (progressive enhancement — works
  without JS); success/error shown near the form via a redirect query
  param read server-side into the template.

## Ask AI about me

A block at the bottom of every page (shared partial, not a route) with three
buttons: ChatGPT, Claude, Perplexity. Gemini is excluded — as of this spec,
it has no confirmed public URL-prefill mechanism, unlike the other three.

- Clicking a button copies a prompt to the clipboard **and** opens the
  provider in a new tab with the prompt pre-filled via that provider's
  `?q=` query parameter:
  - ChatGPT: `https://chatgpt.com/?q=<prompt>`
  - Claude: `https://claude.ai/new?q=<prompt>`
  - Perplexity: `https://www.perplexity.ai/search?q=<prompt>`
  - Clipboard copy is a fallback in case a provider silently drops the
    param — the visitor can paste if the box doesn't auto-fill. These
    `?q=` params are undocumented/unofficial for at least Claude, so this
    fallback is load-bearing, not decorative.
- Prompt (built client-side, domain filled in from `window.location.hostname`
  so it's correct regardless of where the site ends up hosted):
  `Tell me about Samuel Dvorak based on <domain>. Summarize who he is, what
  he does, and how to get in touch.`
- No instruction telling the AI to email Samuel — a browser-opened chat
  session can't act on Samuel's behalf (send email, etc.), only respond
  with text. That instruction was dropped rather than shipped non-functional.
- New tabs open with `noopener,noreferrer` (reverse-tabnabbing protection)
- Buttons are `<button>` (not `<a>` — the action is JS-driven), each an icon
  button showing that provider's real mark (sourced from
  [Simple Icons](https://github.com/simple-icons/simple-icons), inlined as
  SVG — no runtime fetch, so it works within the CSP-style constraints of
  the canvas preview and needs no extra dependency in the real site either),
  with an `aria-label` (icon-only buttons need a text alternative) and a
  small visible caption underneath for clarity

## AI & search discoverability

The site should be easy for both search crawlers and AI assistants (the ones
linked from the "Ask AI about me" block, and general web-browsing LLMs) to
read and cite correctly.

- **Meta descriptions on every page**, via a `pageDescription` local read by
  `partials/head.ejs`, falling back to `site.siteDescription`:
  - Home: `site.siteDescription` — a one-sentence, factual summary of who
    Samuel is and what he does
  - Articles list: a short static description of the articles section
  - Article detail: the article's own `excerpt` frontmatter field (already
    exists in the content model — no new data needed)
  - 404: also gets `<meta name="robots" content="noindex">` so it's never
    indexed or cited as real content
- **Canonical URLs**: every page computes its own absolute canonical URL
  server-side from the request (`req.protocol` + `req.get('host')` +
  `req.originalUrl`), via a small `src/services/url.js` helper — same
  "don't hardcode a domain that isn't chosen yet" approach already used for
  the Ask AI prompt's `window.location.hostname`. Rendered as both
  `<link rel="canonical">` and the `url` field of that page's structured data.
- **Structured data (JSON-LD)**: a `<script type="application/ld+json">`
  block per page, built server-side and passed into `head.ejs` as a
  `structuredData` local:
  - Home: `schema.org/Person` — name, job title, `worksFor` (Brazos Valley
    Flight Services), description, canonical url
  - Article detail: `schema.org/Article` — headline, description (the
    excerpt), datePublished, author, canonical url
- **Semantic HTML**: the home page's bio is a `<section>` (page-bound
  content, not independently distributable), not an `<article>`; each
  article-list card is wrapped in a real `<article>` (it is a self-contained,
  syndicatable summary); heading hierarchy stays one `<h1>` per page with
  sibling `<h2>`s for each named block (newsletter box, contact, ask-ai,
  article cards)
- **`/llms.txt`**: served by a route (not a static file), built at request
  time from `site.json` + the current article list — so it can never drift
  out of sync with the real content the way a hand-maintained static file
  would. Format follows the llms.txt convention: an H1 title, a one-line
  blockquote summary, then linked sections for pages and articles (using
  each article's `excerpt`). `Content-Type: text/plain; charset=utf-8`.
- **`/robots.txt`**: a static file at `src/public/robots.txt` (served at the
  site root automatically by the existing static middleware — no new route
  needed). Explicitly allows both general crawlers and the named AI
  crawlers (GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot,
  Google-Extended, CCBot) — the goal is discoverability, so this is an
  allow-list statement, not a block-list. No `Sitemap:` line: that would
  need an absolute domain, which isn't chosen yet, and no sitemap.xml was
  asked for.

## File layout

```
personal-site/
  package.json
  .env.example
  .gitignore
  server.js
  src/
    routes/
      index.js         (home)
      articles.js       (list + single)
      subscribe.js       (POST /api/subscribe)
      llms.js            (GET /llms.txt)
    services/
      convertkit.js
      articles.js         (reads/parses markdown from content/articles)
      url.js               (canonicalUrl(req) helper for canonical links + JSON-LD)
    content/
      site.json
      articles/*.md
    views/
      layout.ejs
      partials/ (nav.ejs, newsletter-box.ejs, footer.ejs, ask-ai.ejs)
      index.ejs
      articles-list.ejs
      article.ejs
      404.ejs
    public/
      css/ (tokens.css, styles.css)
      images/
      js/ (mobile nav toggle, contact.js, ask-ai.js)
      robots.txt
  docs/superpowers/specs/2026-09-19-personal-site-design.md
```

## Testing / verification

No automated suite (YAGNI at this size). Verification is manual, in the
browser preview: every route loads, nav works, newsletter form
degrades gracefully without credentials, responsive at 375/768/1024,
light + dark mode contrast checked.

## Open items (not blocking build start)

1. ConvertKit Form ID + API key — Samuel to provide once account exists.
2. Bio copy — being fine-tuned separately (stop-slop pass) before final
   text lands in `site.json`.
3. Remaining site copy (tagline, nav labels, contact blurb, newsletter
   pitch, one placeholder article) — gathered via a short interview,
   tracked separately from this spec.
