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

**Superseded 2026-09-19** by a round of canvas exploration (5 color/type
directions, then 5 layout directions, then 5 dark-glass color variants of the
winning layout). Final direction: **Bento Indigo Glow** — a dark
glassmorphic bento-grid design, modeled on the visual language of Samuel's
own `cleaner` (PC Cleaner) app. This commits to a single dark visual world;
see the dark-only note below.

- Design pattern: bento grid — content lives in independent rounded glass
  tiles (hero, bio, newsletter, contact, ask-ai), not a single continuous
  page flow
- Palette (dark glass, indigo/violet glow):
  - `--color-bg-base: #140F28`
  - Body background is a layered gradient, not a flat color:
    `radial-gradient(circle at 18% 92%, rgba(139,92,246,0.35), transparent 55%), radial-gradient(circle at 88% 8%, rgba(99,102,241,0.25), transparent 50%), #140F28`
  - `--color-foreground: #F5F3FF` (headings, high-emphasis text)
  - `--color-foreground-soft: #D9D5EE` (body copy, e.g. bio paragraphs)
  - `--color-muted-foreground: #A9A3C9` (secondary/caption text)
  - `--color-card: rgba(255,255,255,0.05)` (glass tile fill)
  - `--color-border: rgba(255,255,255,0.10)` (glass tile border)
  - `--color-muted: rgba(255,255,255,0.08)` (placeholder/avatar fill)
  - `--color-accent: #8B5CF6` (solid accent, for links/focus rings)
  - `--gradient-accent: linear-gradient(135deg, #6366F1, #8B5CF6)` (every
    filled CTA: Subscribe, Email me, Ask-AI icon buttons, the contact tile
    background)
  - `--color-on-accent: #FFFFFF`
  - `--color-ring: #A5B4FC`
- Tile styling: `border-radius: 14px`, `border: 1px solid var(--color-border)`,
  `background: var(--color-card)`, `backdrop-filter: blur(16px)` (glass
  effect over the gradient background)
- Typography: **Space Grotesk** (display/headings) + **Inter** (body/UI) —
  replaces the earlier Fraunces + Public Sans pairing, which read too
  editorial/warm for a dark glassmorphic tech aesthetic
- Layout: bento grid, mobile-first breakpoints at 375/768/1024/1440. Desktop:
  hero tile (full width) → bio tile (full width, since the bio is the full
  four-paragraph story, not a condensed teaser — see Content model) →
  newsletter tile + contact tile side by side → ask-ai tile (full width).
  Tiles stack to one column below 768px.
- **Dark-only, not adaptive light/dark.** This design commits to one visual
  world, the way the `cleaner` app reference does — inverting it to a light
  theme would break the aesthetic it's built around. This supersedes the
  earlier "4.5:1 contrast in both themes" requirement: contrast is now
  checked against this one dark background only, not against a light
  counterpart, and there is no `prefers-color-scheme` branching in the CSS.
- Accessibility: 4.5:1 text contrast against the dark background, visible
  focus rings (`--color-ring`), `prefers-reduced-motion` respected, all
  interactive targets ≥44px

## Pages & routes

| Route | Purpose |
|---|---|
| `GET /` | Home/About — bento grid: hero, bio (full story), newsletter tile, contact tile, ask-ai tile |
| `GET /articles` | List of published articles (launches empty — see Content model) |
| `GET /articles/:slug` | Single article page, rendered from Markdown |
| `POST /api/subscribe` | Newsletter signup → ConvertKit; redirects back to `/` with a success/error query flag, no client JS required |
| `GET *` (404) | Simple not-found page |

Nav (v1): Home, Articles, Contact (Contact is an anchor/section — the
contact tile's `id="contact"` — not a route).

## Content model

- `src/content/site.json` — site-wide copy: name, tagline, nav labels, bio
  text (rich — paragraphs), contact email, social links, newsletter box
  copy. Single source of truth for anything editable that isn't a full
  article.
- **Header brand text — final, 2026-09-19.** The nav bar's brand label (top
  of every page) reads **"Aviation Professional"**, not Samuel's name. This
  is a distinct field, `site.navBrand`, separate from `site.siteTitle`
  ("Samuel Dvorak") — `siteTitle` still drives the hero's actual name
  heading, the `<title>` suffix, the footer copyright, and the
  `schema.org/Person` JSON-LD `name` field. Splitting these matters: using
  "Aviation Professional" everywhere `siteTitle` is used today would make
  the site's own structured data claim the person's name is "Aviation
  Professional," undermining the AI/SEO work below, which depends on
  consistently associating "Samuel Dvorak" with this site. The nav label
  is presentation only; the canonical identity fields are untouched.
- `src/content/articles/*.md` — one file per post. Frontmatter: `title`,
  `slug`, `date`, `excerpt`. Body is Markdown.
- **Bio copy — final, 2026-09-19.** `site.bio` is now the full four-paragraph
  story (Part 147 school → A&P certs and the DA-42 flight → the Georgia-to-
  Texas internship and ratings through the regional airline → teaching at
  Brazos Valley today), not the shorter three-paragraph condensed version
  explored earlier. The bento layout's bio tile was widened to full-width
  specifically to hold this.
  - **Resolved, 2026-09-19:** the duplicate-content question (this text vs.
    a `mechanic-to-pilot` article body) is settled — Samuel chose to drop
    that article rather than ship a word-for-word duplicate. Articles
    launches with zero posts; the routes/views/service still get built
    (Task 5) so Samuel can add real posts later without touching code.
- **Profile photo — final, 2026-09-19.** A real photo (Samuel in the
  cockpit, headset on, Brazos Valley Flight Services polo) replaces the
  gray placeholder box in the hero tile. Original saved at
  `src/public/images/samuel.webp` (tall portrait selfie); a face-centered
  square crop is saved alongside at `src/public/images/samuel-avatar.webp`
  and is what the hero tile actually uses. Cropped server-side (Python/
  Pillow) rather than relying on CSS `object-position` alone — an
  object-position guess against the uncropped portrait cut off the face,
  so the fix was a real crop, checked visually, not a percentage tweak.
  Displayed at 120×120 (bigger than the original 88×88 placeholder size,
  per Samuel's feedback).

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
      partials/ (nav.ejs, newsletter-tile.ejs, footer.ejs, ask-ai.ejs)
      index.ejs
      articles-list.ejs
      article.ejs
      404.ejs
    public/
      css/ (tokens.css, styles.css)
      images/ (samuel.webp — original photo; samuel-avatar.webp — cropped, used in the hero tile)
      js/ (mobile nav toggle, contact.js, ask-ai.js)
      robots.txt
  docs/superpowers/specs/2026-09-19-personal-site-design.md
```

## Testing / verification

No automated suite (YAGNI at this size). Verification is manual, in the
browser preview: every route loads, nav works, newsletter form
degrades gracefully without credentials, responsive at 375/768/1024,
contrast checked against the dark background (single theme — see Visual
design's dark-only note).

## Open items (not blocking build start)

1. ConvertKit Form ID + API key — Samuel to provide once account exists.

Resolved since this spec was first written: bio copy (final, full
four-paragraph version — Content model), remaining site copy (tagline, nav
labels, contact blurb, newsletter pitch — content-brief.md), the
duplicate-content/article question (dropped — Content model), and the
profile photo (real photo in place — Content model).
