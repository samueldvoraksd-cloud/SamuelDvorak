# Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Task 7 is a manual browser QA pass and must be run by the orchestrating session directly (it needs the Browser pane), not delegated to a subagent.

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

## Task 2: Design tokens, stylesheet, and shared partials

**Files:**
- Create: `src/content/site.json`
- Create: `src/public/css/tokens.css`
- Create: `src/public/css/styles.css`
- Create: `src/views/partials/head.ejs`
- Create: `src/views/partials/foot.ejs`
- Create: `src/views/404.ejs`
- Modify: `src/routes/index.js`
- Modify: `src/views/index.ejs`

**Interfaces:**
- Consumes: Express app/static middleware from Task 1 (serves `src/public` at `/`)
- Produces: `site.json` shape `{ siteTitle, tagline, bio: string[], nav: [{label, href}], newsletter: {name, description} }`, required by every later view. `partials/head.ejs` expects locals `{ site, pageTitle?, active? }`; `partials/foot.ejs` expects `{ site }`. `views/404.ejs` expects `{ site }` — later tasks (articles 404, catch-all 404) render this same view.

- [ ] **Step 1: Create `src/content/site.json` with the final approved copy**

```json
{
  "siteTitle": "Samuel Dvorak",
  "tagline": "Mechanic-turned-pilot, now teaching others to fly",
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

- [ ] **Step 4: Create `src/views/partials/head.ejs`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= typeof pageTitle !== 'undefined' && pageTitle ? pageTitle + ' — ' + site.siteTitle : site.siteTitle %></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/styles.css">
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

- [ ] **Step 5: Create `src/views/partials/foot.ejs`**

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

- [ ] **Step 6: Create `src/views/404.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: 'Page not found', active: '' }) %>

<section class="not-found">
  <h1>Page not found</h1>
  <p>The page you're looking for doesn't exist. <a href="/">Go back home</a>.</p>
</section>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 7: Rewrite `src/views/index.ejs` to use the partials (content still minimal — full hero/bio arrives in Task 3)**

```html
<%- include('partials/head', { site: site, pageTitle: 'Home', active: 'home' }) %>

<h1><%= site.siteTitle %></h1>
<p class="tagline"><%= site.tagline %></p>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 8: Modify `src/routes/index.js` to pass `site` into the view**

```js
const express = require('express');
const router = express.Router();
const site = require('../content/site.json');

router.get('/', (req, res) => {
  res.render('index', { site });
});

module.exports = router;
```

- [ ] **Step 9: Verify nav, title, and stylesheet all render**

Run: `npm run dev &`, wait ~1s, then:
`curl -s http://localhost:3000/`
Expected: response contains `Samuel Dvorak`, `Mechanic-turned-pilot, now teaching others to fly`, `href="/articles"`, and `href="/css/tokens.css"`

Stop the server afterward.

- [ ] **Step 10: Commit**

```bash
git add src/content/site.json src/public/css src/views/partials src/views/404.ejs src/views/index.ejs src/routes/index.js
git commit -m "Add design tokens, stylesheet, and shared page partials"
```

---

## Task 3: Full home page — hero, bio, newsletter box, contact

**Files:**
- Create: `src/views/partials/newsletter-box.ejs`
- Create: `src/public/images/samuel-placeholder.svg`
- Create: `src/public/js/contact.js`
- Modify: `src/views/index.ejs`
- Modify: `src/views/partials/foot.ejs`

**Interfaces:**
- Consumes: `site.json` shape from Task 2 (`site.bio`, `site.newsletter`); `subscribeStatus` local (optional, set by Task 4's route — `newsletter-box.ejs` must handle it being `undefined`)
- Produces: `#contact-email-link` element with `data-user`/`data-domain` attributes, wired up by `public/js/contact.js` on `DOMContentLoaded`

- [ ] **Step 1: Create `src/views/partials/newsletter-box.ejs`**

```html
<aside class="newsletter-box" aria-labelledby="newsletter-heading">
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
<%- include('partials/head', { site: site, pageTitle: 'Home', active: 'home' }) %>

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
  <article class="bio">
    <% site.bio.forEach(function(paragraph) { %>
      <p><%= paragraph %></p>
    <% }); %>
  </article>
  <%- include('partials/newsletter-box', { site: site, subscribeStatus: typeof subscribeStatus !== 'undefined' ? subscribeStatus : undefined }) %>
</div>

<section id="contact" class="contact">
  <h2>Get in touch</h2>
  <p>Questions about flight training, or just want to say hi?</p>
  <a id="contact-email-link" class="button" href="#" data-user="samueldvoraksd" data-domain="gmail.com">Email me</a>
</section>

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

- [ ] **Step 6: Verify the full home page renders and the email is not exposed as raw text**

Run: `npm run dev &`, wait ~1s, then:
```bash
curl -s http://localhost:3000/ | grep -q "I didn't grow up dreaming about airplanes"
curl -s http://localhost:3000/ | grep -q "Beyond The Pattern"
curl -s http://localhost:3000/ | grep -q "Get in touch"
curl -s http://localhost:3000/ | grep -c "samueldvoraksd@gmail.com"
```
Expected: first three greps match; the last command prints `0` (the full address never appears as one string — it's split into `data-user="samueldvoraksd"` and `data-domain="gmail.com"`).

Stop the server afterward.

- [ ] **Step 7: Commit**

```bash
git add src/views/partials/newsletter-box.ejs src/public/images src/public/js src/views/index.ejs src/views/partials/foot.ejs
git commit -m "Build full home page: hero, bio, newsletter box, contact"
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

router.get('/', (req, res) => {
  let subscribeStatus;
  if (req.query.subscribed === '1') {
    subscribeStatus = 'success';
  } else if (req.query.subscribe_error === 'unavailable') {
    subscribeStatus = 'unavailable';
  } else if (req.query.subscribe_error) {
    subscribeStatus = 'error';
  }

  res.render('index', { site, subscribeStatus });
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
- Consumes: nothing new
- Produces: `articlesService.getAll()` returning `Array<{ slug, title, date, excerpt }>` sorted newest-first; `articlesService.getBySlug(slug)` returning `{ slug, title, date, excerpt, html } | null`. Both used only by `src/routes/articles.js`.

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

router.get('/', (req, res) => {
  res.render('articles-list', { site, articles: articlesService.getAll() });
});

router.get('/:slug', (req, res) => {
  const article = articlesService.getBySlug(req.params.slug);
  if (!article) {
    return res.status(404).render('404', { site });
  }
  res.render('article', { site, article });
});

module.exports = router;
```

- [ ] **Step 4: Create `src/views/articles-list.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: 'Articles', active: 'articles' }) %>

<section class="articles-list">
  <h1>Articles</h1>
  <% if (articles.length === 0) { %>
    <p class="empty-state">Nothing published yet — check back soon.</p>
  <% } else { %>
    <ul>
      <% articles.forEach(function(article) { %>
        <li class="article-card">
          <a href="/articles/<%= article.slug %>">
            <h2><%= article.title %></h2>
            <p class="article-card__date"><%= article.date %></p>
            <p><%= article.excerpt %></p>
          </a>
        </li>
      <% }); %>
    </ul>
  <% } %>
</section>

<%- include('partials/foot', { site: site }) %>
```

- [ ] **Step 5: Create `src/views/article.ejs`**

```html
<%- include('partials/head', { site: site, pageTitle: article.title, active: 'articles' }) %>

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
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/does-not-exist
```
Expected: first two greps match; the last command prints `404`.

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
  res.status(404).render('404', { site });
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
```
Expected: first command prints `404`; second grep matches.

Stop the server afterward.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "Add catch-all 404 handler"
```

---

## Task 7: Manual browser QA pass (run directly, not delegated)

This task needs the Browser pane and is not a fit for a subagent — the orchestrating session runs it directly against `npm run dev` using `preview_start`.

- [ ] Start the dev server via `preview_start` and open `/`
- [ ] Confirm nav (Home/Articles/Contact), hero, bio, newsletter box, and contact button all render as expected
- [ ] Click "Email me" and confirm the resulting `href` is `mailto:samueldvoraksd@gmail.com` (constructed by `contact.js`, not present in the initial HTML)
- [ ] Submit the newsletter form (no ConvertKit credentials yet) and confirm the "Signup isn't connected yet" message appears without a server error
- [ ] Visit `/articles`, confirm the one post is listed; click into it and confirm the full body renders
- [ ] Visit a nonexistent path and confirm the 404 page renders
- [ ] `resize_window` to 375px width: confirm no horizontal scroll, hero stacks to one column, nav wraps cleanly
- [ ] `resize_window` with `colorScheme: "dark"`: confirm text stays readable against the dark background (no light-mode colors leaking through)
- [ ] Reset `resize_window` to `preset: "desktop"` when done
- [ ] Report results back to Samuel; fix and re-check anything that fails before calling the build done
