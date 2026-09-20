# Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Task 9 is a manual browser QA pass and must be run by the orchestrating session directly (it needs the Browser pane), not delegated to a subagent.

**Goal:** Build Samuel's personal bio site — a Node.js/Express server rendering an About/home page, an articles section (launching with one post), a newsletter signup wired to ConvertKit with graceful degradation, and a lightly-obfuscated contact link.

**Architecture:** Express + EJS, server-rendered, no frontend framework. Content lives in files (`src/content/site.json` for site copy, `src/content/articles/*.md` for posts) rather than a database or CMS. Raw EJS partials (`head.ejs`/`foot.ejs`) stand in for a layout engine — no `express-ejs-layouts` dependency, consistent with the spec's "keep dependencies minimal" stance.

**Tech Stack:** Node.js (≥18, for global `fetch`), Express, EJS, `gray-matter` + `marked` for Markdown articles, `dotenv` for env vars, `nodemon` (dev only).

**Spec:** [docs/superpowers/specs/2026-09-19-personal-site-design.md](../specs/2026-09-19-personal-site-design.md)
**Content:** [docs/content-brief.md](../../content-brief.md)

## Global Constraints

- Stack is Node.js + Express + EJS, server-rendered, no frontend framework or CSS framework (spec: Tech stack)
- Color tokens: primary `#0F172A`, accent `#0369A1`, background `#F8FAFC`, foreground `#020617` (light); dark-mode overrides via `prefers-color-scheme`, desaturated/lighter tonal variants, not raw inversion (spec: Visual design)
- Typography: Public Sans (body/UI) + Fraunces (display/headings) (spec: Visual design)
- Accessibility: 4.5:1 text contrast in both themes, visible focus rings, `prefers-reduced-motion` respected, interactive targets ≥44px (spec: Visual design)
- Responsive breakpoints: 375/768/1024/1440 (spec: Visual design)
- No automated test suite — every task is verified with manual `curl`/`npm run dev` checks, not test files (spec: Testing / non-goals — this is an explicit, approved decision, not an oversight)
- Newsletter form is a plain HTML POST (no client JS required) and must degrade gracefully (clear "temporarily unavailable" message, no crash) when ConvertKit env vars are unset (spec: Newsletter integration)
- Contact email must never appear as a single string in server-rendered HTML — split into `data-user`/`data-domain` attributes, joined client-side only (content brief: Contact)
- Nav is exactly Home, Articles, Contact for v1 — no Courses/Podcast/Book Notes (spec: Non-goals)
- The contact "Email me" control lives inside the newsletter box (`#contact`), not as a separate section — the nav's `/#contact` link targets that same element (design iteration, 2026-09-19)
- Every page passes `pageDescription` (falling back to `site.siteDescription`) and, where applicable, `canonicalUrl` and `structuredData` (JSON-LD) into `partials/head.ejs`; 404 responses additionally pass `noindex: true` (spec: AI & search discoverability)
- The "Ask AI about me" buttons are icon buttons showing each provider's real mark (inlined SVG, sourced from Simple Icons), not text labels (spec: Ask AI about me)

---

## Task 1: Project scaffolding & server bootstrap

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `server.js`
- Create: `src/routes/index.js`
- Create: `src/views/index.ejs`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: an Express app listening on `process.env.PORT || 3000`, with the view engine set to EJS and `src/views` as the views directory. `src/routes/index.js` exports an Express `Router` mounted at `/` in `server.js`. Later tasks require and mount `src/routes/articles.js` at `/articles` and `src/routes/subscribe.js` at `/api/subscribe` the same way.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "personal-site",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "gray-matter": "^4.0.3",
    "marked": "^12.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 3: Create `.env.example`**

```
PORT=3000
CONVERTKIT_API_KEY=
CONVERTKIT_FORM_ID=
```

- [ ] **Step 4: Create `src/routes/index.js`**

```js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
```

- [ ] **Step 5: Create `src/views/index.ejs`**

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Coming soon</title></head>
<body><h1>Coming soon</h1></body>
</html>
```

- [ ] **Step 6: Create `server.js`**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: installs without error, creates `node_modules/` and `package-lock.json`

- [ ] **Step 8: Verify the server starts and serves the placeholder**

Run: `npm run dev &` (or `npm start &`), wait ~1s, then:
`curl -s http://localhost:3000/`
Expected: HTML containing `<h1>Coming soon</h1>`

Stop the server afterward (`kill %1` or equivalent) before the next task.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example server.js src/routes/index.js src/views/index.ejs
git commit -m "Scaffold Express + EJS server"
```

---

## Task 2: Design tokens, stylesheet, shared partials, and AI/SEO meta wiring

**Files:**
- Create: `src/content/site.json`
- Create: `src/public/css/tokens.css`
- Create: `src/public/css/styles.css`
- Create: `src/services/url.js`
- Create: `src/views/partials/head.ejs`
- Create: `src/views/partials/foot.ejs`
- Create: `src/views/404.ejs`
- Modify: `src/routes/index.js`
- Modify: `src/views/index.ejs`

**Interfaces:**
- Consumes: Express app/static middleware from Task 1 (serves `src/public` at `/`)
- Produces: `site.json` shape `{ siteTitle, tagline, siteDescription, bio: string[], nav: [{label, href}], newsletter: {name, description} }`, required by every later view. `src/services/url.js` exports `canonicalUrl(req)` returning the page's absolute URL, used by every route from here on. `partials/head.ejs` expects locals `{ site, pageTitle?, pageDescription?, canonicalUrl?, structuredData?, noindex?, active? }`; `partials/foot.ejs` expects `{ site }`. `views/404.ejs` expects `{ site, pageDescription?, noindex? }` — later tasks (articles 404, catch-all 404) render this same view.

- [ ] **Step 1: Create `src/content/site.json` with the final approved copy**

```json
{
  "siteTitle": "Samuel Dvorak",
  "tagline": "Mechanic-turned-pilot, now teaching others to fly",
  "siteDescription": "Samuel Dvorak is a flight instructor and former aircraft mechanic teaching private, instrument, and commercial students at Brazos Valley Flight Services.",
  "bio": [
    "I didn't grow up dreaming about airplanes. I grew up taking things apart to see how they worked, mostly car engines on an old Honda Civic I never loved. When I found out airplane mechanic school existed, I figured wrenching on planes had to beat wrenching on cars. I was right, and it pulled me into aviation for good.",
    "I earned my Airframe and Powerplant certifications and started fixing trainer aircraft at a flight school. Then, after a maintenance job on a Diamond DA-42, my boss, also a pilot, took me along on the test flight. On that flight, I stopped wanting to fix airplanes and started wanting to fly them.",
    "I moved from Georgia to Texas for a mechanic-to-pilot internship, earned my ratings up through flight instructor, instrument flight instructor, and multi-engine flight instructor, and did line maintenance for a regional carrier at Bush Intercontinental along the way. Today I teach private, instrument, and commercial students at Brazos Valley Flight Services, and I want each of them to fall for flying the way I did that day in the DA-42."
  ],
  "nav": [
    { "label": "Home", "href": "/" },
    { "label": "Articles", "href": "/articles" },
    { "label": "Contact", "href": "/#contact" }
  ],
  "newsletter": {
    "name": "Beyond The Pattern",
    "description": "Weekly aviation articles, straight to your inbox."
  }
}
```

- [ ] **Step 2: Create `src/public/css/tokens.css`**

```css
:root {
  --color-primary: #0F172A;
  --color-on-primary: #FFFFFF;
  --color-secondary: #334155;
  --color-accent: #0369A1;
  --color-on-accent: #FFFFFF;
  --color-background: #F8FAFC;
  --color-foreground: #020617;
  --color-card: #FFFFFF;
  --color-muted: #E8ECF1;
  --color-muted-foreground: #475569;
  --color-border: #E2E8F0;
  --color-ring: #0F172A;

  --font-body: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: 'Fraunces', Georgia, serif;

  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2rem;
  --space-5: 3rem;
  --space-6: 4rem;

  --radius: 8px;
  --max-width: 1120px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #E2E8F0;
    --color-on-primary: #0F172A;
    --color-secondary: #CBD5E1;
    --color-accent: #38BDF8;
    --color-on-accent: #0F172A;
    --color-background: #0B1120;
    --color-foreground: #F1F5F9;
    --color-card: #131B2E;
    --color-muted: #1E293B;
    --color-muted-foreground: #94A3B8;
    --color-border: #1E293B;
    --color-ring: #38BDF8;
  }
}
```

- [ ] **Step 3: Create `src/public/css/styles.css`**

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: 1.2;
  margin: 0 0 var(--space-2);
}

p { margin: 0 0 var(--space-2); }

a { color: var(--color-accent); }

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--color-ring);
  outline-offset: 2px;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-3);
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--color-accent);
  color: var(--color-on-accent);
  padding: var(--space-1) var(--space-2);
  z-index: 100;
}

.skip-link:focus {
  left: var(--space-2);
  top: var(--space-2);
}

.site-header {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-2) 0;
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.site-header__brand {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-foreground);
  text-decoration: none;
}

.site-nav ul {
  display: flex;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.site-nav a {
  color: var(--color-secondary);
  text-decoration: none;
  font-weight: 500;
  padding: var(--space-1) 0;
}

.site-nav a.is-active,
.site-nav a:hover {
  color: var(--color-accent);
}

.hero {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-5) 0 var(--space-4);
}

.hero__photo img {
  width: 100%;
  height: auto;
  border-radius: var(--radius);
  display: block;
}

.hero h1 {
  font-size: 2rem;
  margin-bottom: var(--space-1);
}

.tagline {
  font-size: 1.125rem;
  color: var(--color-secondary);
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
  align-items: start;
  padding-bottom: var(--space-5);
}

.bio p {
  max-width: 68ch;
}

.newsletter-box {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
}

.newsletter-box h2 {
  font-size: 1.1rem;
}

.newsletter-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.newsletter-form label {
  font-size: 0.875rem;
  font-weight: 500;
}

.newsletter-form input {
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  min-height: 44px;
}

.newsletter-form button {
  padding: var(--space-1) var(--space-2);
  min-height: 44px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}

.newsletter-form button:hover { opacity: 0.9; }

.form-message {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius);
  font-size: 0.9rem;
}

.form-message--success {
  background: #DCFCE7;
  color: #14532D;
}

.form-message--error {
  background: #FEE2E2;
  color: #7F1D1D;
}

.contact {
  padding: var(--space-4) 0 var(--space-5);
  border-top: 1px solid var(--color-border);
}

.button {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  min-height: 44px;
  line-height: 1.8rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  text-decoration: none;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}

.button:hover { opacity: 0.9; }

.articles-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.article-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
  background: var(--color-card);
}

.article-card a {
  text-decoration: none;
  color: inherit;
  display: block;
}

.article-card h2 {
  color: var(--color-foreground);
  font-size: 1.25rem;
}

.article-card__date {
  color: var(--color-muted-foreground);
  font-size: 0.875rem;
}

.empty-state { color: var(--color-muted-foreground); }

.article-detail {
  max-width: 68ch;
  margin: 0 auto;
  padding: var(--space-5) 0;
}

.article-detail__date {
  color: var(--color-muted-foreground);
  margin-bottom: var(--space-3);
}

.article-detail__body p { margin-bottom: var(--space-2); }

.not-found {
  padding: var(--space-6) 0;
  text-align: center;
}

.site-footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-3) 0;
  color: var(--color-muted-foreground);
  font-size: 0.875rem;
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
  }

  .hero__photo img { width: 160px; }

  .content-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Create `src/services/url.js`**

```js
function canonicalUrl(req) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

module.exports = { canonicalUrl };
```

- [ ] **Step 5: Create `src/views/partials/head.ejs`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= typeof pageTitle !== 'undefined' && pageTitle ? pageTitle + ' — ' + site.siteTitle : site.siteTitle %></title>
  <meta name="description" content="<%= typeof pageDescription !== 'undefined' && pageDescription ? pageDescription : site.siteDescription %>">
  <% if (typeof noindex !== 'undefined' && noindex) { %>
  <meta name="robots" content="noindex">
  <% } %>
  <% if (typeof canonicalUrl !== 'undefined' && canonicalUrl) { %>
  <link rel="canonical" href="<%= canonicalUrl %>">
  <% } %>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/styles.css">
  <% if (typeof structuredData !== 'undefined' && structuredData) { %>
  <script type="application/ld+json"><%- JSON.stringify(structuredData) %></script>
  <% } %>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header">
    <div class="container site-header__inner">
      <a class="site-header__brand" href="/"><%= site.siteTitle %></a>
      <nav class="site-nav" aria-label="Primary">
        <ul>
          <% site.nav.forEach(function(item) { %>
            <li><a href="<%= item.href %>" class="<%= (typeof active !== 'undefined' && active === item.label.toLowerCase()) ? 'is-active' : '' %>"><%= item.label %></a></li>
          <% }); %>
        </ul>
      </nav>
    </div>
  </header>
  <main id="main" class="container">
```

- [ ] **Step 6: Create `src/views/partials/foot.ejs`**

```html
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <%= new Date().getFullYear() %> <%= site.siteTitle %></p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 7: Create `src/views/404.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: 'Page not found', pageDescription: 'This page could not be found.', noindex: true, active: '' }) %>

<section class="not-found">
  <h1>Page not found</h1>
  <p>The page you're looking for doesn't exist. <a href="/">Go back home</a>.</p>
</section>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 8: Rewrite `src/views/index.ejs` to use the partials (content still minimal — full hero/bio arrives in Task 3)**

```html
<%- include('partials/head', { site: site, pageTitle: 'Home', pageDescription: pageDescription, canonicalUrl: canonicalUrl, structuredData: structuredData, active: 'home' }) %>

<h1><%= site.siteTitle %></h1>
<p class="tagline"><%= site.tagline %></p>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 9: Modify `src/routes/index.js` to pass `site` and the AI/SEO meta locals into the view**

```js
const express = require('express');
const router = express.Router();
const site = require('../content/site.json');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.siteTitle,
    jobTitle: 'Certified Flight Instructor',
    description: site.siteDescription,
    worksFor: { '@type': 'Organization', name: 'Brazos Valley Flight Services' },
    url: canonicalUrl(req),
  };

  res.render('index', {
    site,
    pageDescription: site.siteDescription,
    canonicalUrl: canonicalUrl(req),
    structuredData,
  });
});

module.exports = router;
```

- [ ] **Step 10: Verify nav, title, stylesheet, and meta tags all render**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/ | grep -q "Samuel Dvorak"
curl -s http://localhost:3000/ | grep -q "Mechanic-turned-pilot, now teaching others to fly"
curl -s http://localhost:3000/ | grep -q 'href="/articles"'
curl -s http://localhost:3000/ | grep -q 'href="/css/tokens.css"'
curl -s http://localhost:3000/ | grep -q '<meta name="description" content="Samuel Dvorak is a flight instructor'
curl -s http://localhost:3000/ | grep -q '"@type":"Person"'
```
Expected: all greps match.

Stop the server afterward.

- [ ] **Step 11: Commit**

```bash
git add src/content/site.json src/public/css src/services/url.js src/views/partials src/views/404.ejs src/views/index.ejs src/routes/index.js
git commit -m "Add design tokens, stylesheet, shared partials, and AI/SEO meta wiring"
```

---

## Task 3: Full home page — hero, bio, newsletter box + contact

**Files:**
- Create: `src/views/partials/newsletter-box.ejs`
- Create: `src/public/images/samuel-placeholder.svg`
- Create: `src/public/js/contact.js`
- Modify: `src/views/index.ejs`
- Modify: `src/views/partials/foot.ejs`
- Modify: `src/public/css/styles.css`

**Interfaces:**
- Consumes: `site.json` shape from Task 2 (`site.bio`, `site.newsletter`); `subscribeStatus` local (optional, set by Task 4's route — `newsletter-box.ejs` must handle it being `undefined`)
- Produces: `#contact-email-link` element with `data-user`/`data-domain` attributes, wired up by `public/js/contact.js` on `DOMContentLoaded`. The contact control lives inside `newsletter-box.ejs`, whose root `<aside>` carries `id="contact"` — that's what the nav's `/#contact` link (site.json, Task 2) scrolls to.

- [ ] **Step 1: Create `src/views/partials/newsletter-box.ejs`**

```html
<aside class="newsletter-box" id="contact" aria-labelledby="newsletter-heading">
  <h2 id="newsletter-heading"><%= site.newsletter.name %></h2>
  <p><%= site.newsletter.description %></p>
  <% if (typeof subscribeStatus !== 'undefined' && subscribeStatus === 'success') { %>
    <p class="form-message form-message--success" role="status">You're on the list. Check your inbox to confirm.</p>
  <% } else if (typeof subscribeStatus !== 'undefined' && subscribeStatus === 'unavailable') { %>
    <p class="form-message form-message--error" role="alert">Signup isn't connected yet — check back soon.</p>
  <% } else if (typeof subscribeStatus !== 'undefined' && subscribeStatus === 'error') { %>
    <p class="form-message form-message--error" role="alert">Something went wrong. Try again in a bit.</p>
  <% } %>
  <form class="newsletter-form" action="/api/subscribe" method="POST">
    <label for="newsletter-email">Email address</label>
    <input type="email" id="newsletter-email" name="email" required autocomplete="email" placeholder="you@example.com">
    <button type="submit">Subscribe</button>
  </form>
  <a id="contact-email-link" class="button newsletter-box__contact" href="#" data-user="samueldvoraksd" data-domain="gmail.com">Email me</a>
</aside>
```

- [ ] **Step 2: Create `src/public/images/samuel-placeholder.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480" role="img" aria-label="Placeholder for Samuel's photo">
  <rect width="480" height="480" fill="#E2E8F0"/>
  <text x="240" y="240" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="20" fill="#475569">Add your photo here</text>
</svg>
```

Note for Samuel: replace this by adding a real photo file and changing the `src` in `index.ejs` (Step 4 below) from `/images/samuel-placeholder.svg` to your file's path.

- [ ] **Step 3: Create `src/public/js/contact.js`**

```js
document.addEventListener('DOMContentLoaded', function () {
  var link = document.getElementById('contact-email-link');
  if (!link) return;
  var user = link.getAttribute('data-user');
  var domain = link.getAttribute('data-domain');
  link.setAttribute('href', 'mailto:' + user + '@' + domain);
});
```

- [ ] **Step 4: Rewrite `src/views/index.ejs` with the full home page**

```html
<%- include('partials/head', { site: site, pageTitle: 'Home', pageDescription: pageDescription, canonicalUrl: canonicalUrl, structuredData: structuredData, active: 'home' }) %>

<section class="hero">
  <div class="hero__photo">
    <img src="/images/samuel-placeholder.svg" alt="Samuel Dvorak" width="480" height="480">
  </div>
  <div class="hero__intro">
    <h1><%= site.siteTitle %></h1>
    <p class="tagline"><%= site.tagline %></p>
  </div>
</section>

<div class="content-grid">
  <section class="bio" aria-label="About Samuel">
    <% site.bio.forEach(function(paragraph) { %>
      <p><%= paragraph %></p>
    <% }); %>
  </section>
  <%- include('partials/newsletter-box', { site: site, subscribeStatus: typeof subscribeStatus !== 'undefined' ? subscribeStatus : undefined }) %>
</div>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 5: Modify `src/views/partials/foot.ejs` to load `contact.js`**

```html
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <%= new Date().getFullYear() %> <%= site.siteTitle %></p>
    </div>
  </footer>
  <script src="/js/contact.js" defer></script>
</body>
</html>
```

- [ ] **Step 6: Modify `src/public/css/styles.css` — append the contact-link style**

```css
.newsletter-box__contact {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  margin-top: var(--space-2);
}
```

- [ ] **Step 7: Verify the full home page renders and the email is not exposed as raw text**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/ | grep -q "I didn't grow up dreaming about airplanes"
curl -s http://localhost:3000/ | grep -q "Beyond The Pattern"
curl -s http://localhost:3000/ | grep -q 'id="contact"'
curl -s http://localhost:3000/ | grep -q ">Email me<"
curl -s http://localhost:3000/ | grep -c "samueldvoraksd@gmail.com"
```
Expected: first four greps match; the last command prints `0` (the full address never appears as one string — it's split into `data-user="samueldvoraksd"` and `data-domain="gmail.com"`).

Stop the server afterward.

- [ ] **Step 8: Commit**

```bash
git add src/views/partials/newsletter-box.ejs src/public/images src/public/js src/views/index.ejs src/views/partials/foot.ejs src/public/css/styles.css
git commit -m "Build full home page: hero, bio, newsletter box with contact"
```

---

## Task 4: Newsletter signup — ConvertKit integration with graceful degradation

**Files:**
- Create: `src/services/convertkit.js`
- Create: `src/routes/subscribe.js`
- Modify: `server.js`
- Modify: `src/routes/index.js`

**Interfaces:**
- Consumes: `process.env.CONVERTKIT_API_KEY`, `process.env.CONVERTKIT_FORM_ID`; `subscribeStatus` contract from Task 3's `newsletter-box.ejs` (`'success' | 'unavailable' | 'error' | undefined`)
- Produces: `convertkit.subscribe(email)` returning `Promise<{ ok: true } | { ok: false, reason: 'not_configured' | 'request_failed' }>`, used only by `src/routes/subscribe.js`

- [ ] **Step 1: Create `src/services/convertkit.js`**

```js
async function subscribe(email) {
  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    return { ok: false, reason: 'not_configured' };
  }

  const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, email }),
  });

  if (!response.ok) {
    return { ok: false, reason: 'request_failed' };
  }

  return { ok: true };
}

module.exports = { subscribe };
```

- [ ] **Step 2: Create `src/routes/subscribe.js`**

```js
const express = require('express');
const router = express.Router();
const convertkit = require('../services/convertkit');

router.post('/', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) {
    return res.redirect('/?subscribe_error=invalid');
  }

  const result = await convertkit.subscribe(email);

  if (result.ok) {
    return res.redirect('/?subscribed=1');
  }
  if (result.reason === 'not_configured') {
    return res.redirect('/?subscribe_error=unavailable');
  }
  return res.redirect('/?subscribe_error=failed');
});

module.exports = router;
```

- [ ] **Step 3: Modify `src/routes/index.js` to compute `subscribeStatus` from the redirect query params**

```js
const express = require('express');
const router = express.Router();
const site = require('../content/site.json');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  let subscribeStatus;
  if (req.query.subscribed === '1') {
    subscribeStatus = 'success';
  } else if (req.query.subscribe_error === 'unavailable') {
    subscribeStatus = 'unavailable';
  } else if (req.query.subscribe_error) {
    subscribeStatus = 'error';
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.siteTitle,
    jobTitle: 'Certified Flight Instructor',
    description: site.siteDescription,
    worksFor: { '@type': 'Organization', name: 'Brazos Valley Flight Services' },
    url: canonicalUrl(req),
  };

  res.render('index', {
    site,
    subscribeStatus,
    pageDescription: site.siteDescription,
    canonicalUrl: canonicalUrl(req),
    structuredData,
  });
});

module.exports = router;
```

- [ ] **Step 4: Modify `server.js` to mount the subscribe router**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');
const subscribeRouter = require('./src/routes/subscribe');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/api/subscribe', subscribeRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Verify graceful degradation with no ConvertKit credentials set**

Run: `npm run dev &`, wait ~1s (do **not** set `CONVERTKIT_API_KEY`/`CONVERTKIT_FORM_ID` — `.env` doesn't exist yet, which is the real pre-account state), then:
```bash
curl -s -i -X POST -d "email=test@example.com" http://localhost:3000/api/subscribe | grep -i "location: /?subscribe_error=unavailable"
curl -s -L -X POST -d "email=test@example.com" http://localhost:3000/api/subscribe | grep -q "Signup isn't connected yet"
```
Expected: both greps match — the redirect happens and the homepage shows the "not connected yet" message instead of crashing.

Stop the server afterward.

- [ ] **Step 6: Commit**

```bash
git add src/services/convertkit.js src/routes/subscribe.js server.js src/routes/index.js
git commit -m "Wire newsletter signup to ConvertKit with graceful degradation"
```

---

## Task 5: Articles — service, routes, views, and the first post

**Files:**
- Create: `src/services/articles.js`
- Create: `src/routes/articles.js`
- Create: `src/views/articles-list.ejs`
- Create: `src/views/article.ejs`
- Create: `src/content/articles/mechanic-to-pilot.md`
- Modify: `server.js`

**Interfaces:**
- Consumes: `canonicalUrl(req)` from `src/services/url.js` (Task 2)
- Produces: `articlesService.getAll()` returning `Array<{ slug, title, date, excerpt }>` sorted newest-first; `articlesService.getBySlug(slug)` returning `{ slug, title, date, excerpt, html } | null`. Both used only by `src/routes/articles.js`, which Task 8 also imports for `/llms.txt`.

- [ ] **Step 1: Create `src/content/articles/mechanic-to-pilot.md`**

```markdown
---
title: "The Mechanic Who Became a Pilot"
slug: mechanic-to-pilot
date: "2026-09-19"
excerpt: "How one test flight in a Diamond DA-42 flipped what I wanted, from fixing airplanes to flying them, and set me on the path to the airlines."
---

I started at a Part 147 aviation maintenance school, learning to maintain, repair, and inspect aircraft. Growing up, planes never interested me. I liked figuring things out, and I spent hours under the hood of an old Honda Civic, but cars never grabbed me either. Then I found out airplane mechanic school existed, and working on planes sounded a lot cooler than working on cars. That decision pulled me into aviation for good.

I graduated with my Airframe and Powerplant certifications and took a job at a flight school, wrenching on old trainer aircraft. One day, after I finished maintenance on a Diamond DA-42, my boss, who was also a pilot, took me along on the test flight. On that flight, I stopped wanting to fix airplanes and started wanting to fly them.

I moved from Georgia to Texas for a fully sponsored mechanic-to-pilot internship, trading flight school maintenance work for my private, instrument, and commercial ratings. I didn't know a single person in Texas when I packed my truck and left, but the deal was too good to pass up: fix airplanes by day, fly them the rest of the time, and walk away with a commercial certificate without paying for it out of pocket. After earning my commercial, I took a job with a regional airline under contract to United, doing line maintenance at Bush Intercontinental and learning how complex, multi-crew aircraft work under the skin. I kept adding ratings in my off time: commercial multi-engine, flight instructor, instrument flight instructor, and multi-engine flight instructor. Every rating I earned put me one step closer to the airlines, the goal I'd had since that DA-42 flight.

Then I got the job I'd been chasing since that DA-42 flight: teaching, at Brazos Valley Flight Services, where I still work today. I teach private, instrument, and commercial students now, and I want each of them to fall for flying the way I did on that test flight.
```

- [ ] **Step 2: Create `src/services/articles.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');

function loadAll() {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      return {
        slug: data.slug,
        title: data.title,
        date: data.date,
        excerpt: data.excerpt,
        html: marked.parse(content),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getAll() {
  return loadAll().map(({ html, ...rest }) => rest);
}

function getBySlug(slug) {
  return loadAll().find((article) => article.slug === slug) || null;
}

module.exports = { getAll, getBySlug };
```

- [ ] **Step 3: Create `src/routes/articles.js`**

```js
const express = require('express');
const router = express.Router();
const articlesService = require('../services/articles');
const site = require('../content/site.json');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  res.render('articles-list', {
    site,
    articles: articlesService.getAll(),
    pageDescription: 'Writing on aviation, flight training, and the path from aircraft mechanic to airline pilot.',
    canonicalUrl: canonicalUrl(req),
  });
});

router.get('/:slug', (req, res) => {
  const article = articlesService.getBySlug(req.params.slug);
  if (!article) {
    return res.status(404).render('404', { site, pageDescription: 'This page could not be found.', noindex: true });
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: { '@type': 'Person', name: site.siteTitle },
    url: canonicalUrl(req),
  };

  res.render('article', {
    site,
    article,
    pageDescription: article.excerpt,
    canonicalUrl: canonicalUrl(req),
    structuredData,
  });
});

module.exports = router;
```

- [ ] **Step 4: Create `src/views/articles-list.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: 'Articles', pageDescription: pageDescription, canonicalUrl: canonicalUrl, active: 'articles' }) %>

<section class="articles-list">
  <h1>Articles</h1>
  <% if (articles.length === 0) { %>
    <p class="empty-state">Nothing published yet — check back soon.</p>
  <% } else { %>
    <ul>
      <% articles.forEach(function(article) { %>
        <li>
          <article class="article-card">
            <a href="/articles/<%= article.slug %>">
              <h2><%= article.title %></h2>
              <p class="article-card__date"><%= article.date %></p>
              <p><%= article.excerpt %></p>
            </a>
          </article>
        </li>
      <% }); %>
    </ul>
  <% } %>
</section>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 5: Create `src/views/article.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: article.title, pageDescription: pageDescription, canonicalUrl: canonicalUrl, structuredData: structuredData, active: 'articles' }) %>

<article class="article-detail">
  <h1><%= article.title %></h1>
  <p class="article-detail__date"><%= article.date %></p>
  <div class="article-detail__body">
    <%- article.html %>
  </div>
  <p><a href="/articles">&larr; Back to articles</a></p>
</article>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 6: Modify `server.js` to mount the articles router**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');
const articlesRouter = require('./src/routes/articles');
const subscribeRouter = require('./src/routes/subscribe');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/articles', articlesRouter);
app.use('/api/subscribe', subscribeRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 7: Verify the article list, article detail, and missing-slug 404**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/articles | grep -q "The Mechanic Who Became a Pilot"
curl -s http://localhost:3000/articles/mechanic-to-pilot | grep -q "Bush Intercontinental"
curl -s http://localhost:3000/articles/mechanic-to-pilot | grep -q '"@type":"Article"'
curl -s http://localhost:3000/articles/mechanic-to-pilot | grep -q '<meta name="description" content="How one test flight'
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/does-not-exist
```
Expected: first four greps match; the last command prints `404`.

Stop the server afterward.

- [ ] **Step 8: Commit**

```bash
git add src/content/articles src/services/articles.js src/routes/articles.js src/views/articles-list.ejs src/views/article.ejs server.js
git commit -m "Add articles section with first post"
```

---

## Task 6: Catch-all 404 for unmatched routes

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `src/views/404.ejs` from Task 2, `site.json` from Task 2
- Produces: nothing new (final route wiring)

- [ ] **Step 1: Modify `server.js` to add the catch-all 404 handler after all other routes**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');
const articlesRouter = require('./src/routes/articles');
const subscribeRouter = require('./src/routes/subscribe');
const site = require('./src/content/site.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/articles', articlesRouter);
app.use('/api/subscribe', subscribeRouter);

app.use((req, res) => {
  res.status(404).render('404', { site, pageDescription: 'This page could not be found.', noindex: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify an unmatched route returns 404**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/this-page-does-not-exist
curl -s http://localhost:3000/this-page-does-not-exist | grep -q "Page not found"
curl -s http://localhost:3000/this-page-does-not-exist | grep -q '<meta name="robots" content="noindex">'
```
Expected: first command prints `404`; both greps match.

Stop the server afterward.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "Add catch-all 404 handler"
```

---

## Task 7: "Ask AI about me" block

**Files:**
- Create: `src/views/partials/ask-ai.ejs`
- Create: `src/public/js/ask-ai.js`
- Modify: `src/views/partials/foot.ejs`
- Modify: `src/public/css/styles.css`

**Interfaces:**
- Consumes: nothing new (pure client-side; no server route)
- Produces: nothing consumed by later tasks — this is the last content task before manual QA

- [ ] **Step 1: Create `src/views/partials/ask-ai.ejs`**

Each button is an icon button showing that provider's real mark — inlined SVG (sourced from [Simple Icons](https://github.com/simple-icons/simple-icons), MIT-licensed), not a runtime fetch. The icon is `aria-hidden` since the adjacent visible label and the button's own `aria-label` already name it.

```html
<section class="ask-ai" aria-labelledby="ask-ai-heading">
  <h2 id="ask-ai-heading">Ask AI about me</h2>
  <p>Curious about my background? Ask an AI assistant directly — I'll copy the prompt to your clipboard too, in case it doesn't carry over.</p>
  <div class="ask-ai__buttons">
    <div class="ask-ai__item">
      <button type="button" class="ask-ai__btn" data-provider="chatgpt" aria-label="Ask ChatGPT about Samuel">
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>
      </button>
      <span class="ask-ai__label">ChatGPT</span>
    </div>
    <div class="ask-ai__item">
      <button type="button" class="ask-ai__btn" data-provider="claude" aria-label="Ask Claude about Samuel">
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>
      </button>
      <span class="ask-ai__label">Claude</span>
    </div>
    <div class="ask-ai__item">
      <button type="button" class="ask-ai__btn" data-provider="perplexity" aria-label="Ask Perplexity about Samuel">
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true"><path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z"/></svg>
      </button>
      <span class="ask-ai__label">Perplexity</span>
    </div>
  </div>
  <p class="ask-ai__status" data-ask-ai-status role="status" aria-live="polite"></p>
</section>
```

- [ ] **Step 2: Create `src/public/js/ask-ai.js`**

```js
document.addEventListener('DOMContentLoaded', function () {
  var container = document.querySelector('.ask-ai');
  if (!container) return;

  var status = container.querySelector('[data-ask-ai-status]');

  var providers = {
    chatgpt: {
      label: 'ChatGPT',
      buildUrl: function (prompt) {
        return 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
      },
    },
    claude: {
      label: 'Claude',
      buildUrl: function (prompt) {
        return 'https://claude.ai/new?q=' + encodeURIComponent(prompt);
      },
    },
    perplexity: {
      label: 'Perplexity',
      buildUrl: function (prompt) {
        return 'https://www.perplexity.ai/search?q=' + encodeURIComponent(prompt);
      },
    },
  };

  function buildPrompt() {
    var domain = window.location.hostname;
    return 'Tell me about Samuel Dvorak based on ' + domain + '. Summarize who he is, what he does, and how to get in touch.';
  }

  container.querySelectorAll('.ask-ai__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var provider = providers[btn.getAttribute('data-provider')];
      if (!provider) return;

      var prompt = buildPrompt();
      var url = provider.buildUrl(prompt);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(function () {});
      }

      if (status) {
        status.textContent = 'Prompt copied. Opening ' + provider.label + ' in a new tab — paste if it doesn\'t appear automatically.';
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
});
```

- [ ] **Step 3: Modify `src/public/css/styles.css` — append the ask-ai styles**

```css
.ask-ai {
  padding: var(--space-4) 0 var(--space-5);
  border-top: 1px solid var(--color-border);
}

.ask-ai__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.ask-ai__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.ask-ai__btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius);
  background: var(--color-accent);
  color: var(--color-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ask-ai__btn:hover { opacity: 0.9; }

.ask-ai__label {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.ask-ai__status {
  margin-top: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
  min-height: 1.2em;
}
```

- [ ] **Step 4: Modify `src/views/partials/foot.ejs` to include the block and its script on every page**

```html
  </main>
  <%- include('ask-ai') %>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <%= new Date().getFullYear() %> <%= site.siteTitle %></p>
    </div>
  </footer>
  <script src="/js/contact.js" defer></script>
  <script src="/js/ask-ai.js" defer></script>
</body>
</html>
```

- [ ] **Step 5: Verify the block renders on every page type and the prompt has no raw email/instruction text**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/ | grep -q "Ask AI about me"
curl -s http://localhost:3000/articles | grep -q "Ask AI about me"
curl -s http://localhost:3000/articles/mechanic-to-pilot | grep -q "Ask AI about me"
curl -s http://localhost:3000/this-page-does-not-exist | grep -q "Ask AI about me"
curl -s http://localhost:3000/ | grep -q 'data-provider="chatgpt"'
curl -s http://localhost:3000/ | grep -q 'data-provider="claude"'
curl -s http://localhost:3000/ | grep -q 'data-provider="perplexity"'
curl -s http://localhost:3000/ | grep -qi "gemini"
```
Expected: every grep matches except the last one, which must **not** match
(exit code 1) — confirming Gemini isn't present anywhere on the page.

Stop the server afterward.

- [ ] **Step 6: Commit**

```bash
git add src/views/partials/ask-ai.ejs src/public/js/ask-ai.js src/public/css/styles.css src/views/partials/foot.ejs
git commit -m "Add 'Ask AI about me' block to every page"
```

---

## Task 8: AI discoverability — `/llms.txt` and `/robots.txt`

**Files:**
- Create: `src/routes/llms.js`
- Create: `src/public/robots.txt`
- Modify: `server.js`

**Interfaces:**
- Consumes: `articlesService.getAll()` and `site.json` (Task 5, Task 2)
- Produces: `GET /llms.txt` (route); `GET /robots.txt` (static file, served automatically by the existing `express.static` middleware — no route needed)

- [ ] **Step 1: Create `src/routes/llms.js`**

```js
const express = require('express');
const router = express.Router();
const site = require('../content/site.json');
const articlesService = require('../services/articles');

router.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const articles = articlesService.getAll();

  const lines = [
    `# ${site.siteTitle}`,
    '',
    `> ${site.tagline}`,
    '',
    site.siteDescription,
    '',
    '## Pages',
    '',
    `- [Home](${base}/): Bio and background`,
    `- [Articles](${base}/articles): Writing on aviation and flight training`,
  ];

  if (articles.length > 0) {
    lines.push('', '## Articles', '');
    articles.forEach((article) => {
      lines.push(`- [${article.title}](${base}/articles/${article.slug}): ${article.excerpt}`);
    });
  }

  res.type('text/plain').send(lines.join('\n') + '\n');
});

module.exports = router;
```

- [ ] **Step 2: Create `src/public/robots.txt`**

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /
```

- [ ] **Step 3: Modify `server.js` to mount the llms.txt router**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');
const articlesRouter = require('./src/routes/articles');
const subscribeRouter = require('./src/routes/subscribe');
const llmsRouter = require('./src/routes/llms');
const site = require('./src/content/site.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/articles', articlesRouter);
app.use('/api/subscribe', subscribeRouter);
app.use('/llms.txt', llmsRouter);

app.use((req, res) => {
  res.status(404).render('404', { site, pageDescription: 'This page could not be found.', noindex: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Verify both endpoints**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/llms.txt | grep -q "# Samuel Dvorak"
curl -s http://localhost:3000/llms.txt | grep -q "## Articles"
curl -s http://localhost:3000/llms.txt | grep -q "The Mechanic Who Became a Pilot"
curl -s -i http://localhost:3000/llms.txt | grep -qi "content-type: text/plain"
curl -s http://localhost:3000/robots.txt | grep -q "User-agent: GPTBot"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/robots.txt
```
Expected: all greps match; the last command prints `200`.

Stop the server afterward.

- [ ] **Step 5: Commit**

```bash
git add src/routes/llms.js src/public/robots.txt server.js
git commit -m "Add /llms.txt and /robots.txt for AI/search discoverability"
```

---

## Task 9: Manual browser QA pass (run directly, not delegated)

This task needs the Browser pane and is not a fit for a subagent — the orchestrating session runs it directly against `npm run dev` using `preview_start`.

- [ ] Start the dev server via `preview_start` and open `/`
- [ ] Confirm nav (Home/Articles/Contact), hero, bio, and the newsletter box render as expected
- [ ] Confirm the "Email me" button sits directly under "Subscribe" inside the newsletter box, and that clicking the nav's "Contact" link scrolls to that same box
- [ ] Click "Email me" and confirm the resulting `href` is `mailto:samueldvoraksd@gmail.com` (constructed by `contact.js`, not present in the initial HTML)
- [ ] Submit the newsletter form (no ConvertKit credentials yet) and confirm the "Signup isn't connected yet" message appears without a server error
- [ ] Visit `/articles`, confirm the one post is listed; click into it and confirm the full body renders
- [ ] Visit a nonexistent path and confirm the 404 page renders
- [ ] `resize_window` to 375px width: confirm no horizontal scroll, hero stacks to one column, nav wraps cleanly
- [ ] `resize_window` with `colorScheme: "dark"`: confirm text stays readable against the dark background (no light-mode colors leaking through)
- [ ] Reset `resize_window` to `preset: "desktop"` when done
- [ ] Confirm the "Ask AI about me" block appears at the bottom of `/`, `/articles`, an article page, and the 404 page, and that each button shows that provider's real icon (not text)
- [ ] Click each of the three buttons and confirm: a new tab opens to the right provider with the prompt visible in the input (or, if a provider ignores the `?q=` param, confirm the status line says the prompt was copied) — read the clipboard back via `javascript_tool` (`await navigator.clipboard.readText()`) to confirm the copied text matches the expected prompt
- [ ] Confirm there is no Gemini button anywhere on the page
- [ ] View source on `/` and confirm a `<meta name="description">`, a `<link rel="canonical">`, and an `application/ld+json` block with `"@type":"Person"` are present
- [ ] View source on the article page and confirm its JSON-LD is `"@type":"Article"` with the excerpt as `description`, and that its meta description also matches the excerpt
- [ ] View source on the 404 page and confirm `<meta name="robots" content="noindex">` is present
- [ ] Visit `/llms.txt` and confirm it lists the site and the one article; visit `/robots.txt` and confirm it loads and lists the named AI crawlers
- [ ] Report results back to Samuel; fix and re-check anything that fails before calling the build done
