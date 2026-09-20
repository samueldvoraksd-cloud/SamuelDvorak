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
    services/
      convertkit.js
      articles.js         (reads/parses markdown from content/articles)
    content/
      site.json
      articles/*.md
    views/
      layout.ejs
      partials/ (nav.ejs, newsletter-box.ejs, footer.ejs)
      index.ejs
      articles-list.ejs
      article.ejs
      404.ejs
    public/
      css/ (tokens.css, styles.css)
      images/
      js/ (minimal — mobile nav toggle only)
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
