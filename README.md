# Samuel Dvorak — Personal Site

Personal brand site for Samuel Dvorak, a flight instructor and former aircraft mechanic. Built with Node.js, Express, and EJS (server-rendered, no frontend framework).

## Stack

- Node.js + Express
- EJS templates
- Markdown articles via `gray-matter` + `marked`
- Dark glassmorphic "Bento Grid" design system (see `src/public/css/`)

## Running locally

```bash
npm install
npm run dev   # nodemon, auto-restarts on change
# or
npm start     # plain node
```

Copy `.env.example` to `.env` and fill in values before running.

## Content admin

Visit `/admin/login` to edit the home page bio, resources, and articles without touching code. Requires three env vars:

- `SESSION_SECRET` — any long random string
- `ADMIN_USERNAME` — your login username
- `ADMIN_PASSWORD_HASH` — a bcrypt hash, generated with `node scripts/hash-password.js <your-password>`

**Important:** content edits write to `src/content/*.json` and `src/content/articles/*.md` on disk. Render's free/starter web services do not persist disk writes across restarts or redeploys — anything edited through `/admin` will be lost the next time the service restarts unless the underlying files are also committed to git, or the service has a persistent disk attached. Treat `/admin` as a convenience for drafting, and commit the resulting files if you want them to stick.

## Structure

- `src/content/` — site copy (`site.json`), articles (Markdown), resources (`resources.json`)
- `src/routes/` — Express routes (home, articles, resources, llms.txt)
- `src/views/` — EJS templates
- `src/public/` — static assets (CSS, JS, images, downloadable documents)
- `src/services/` — helpers (canonical URL, article loading)

## Deployment

Deployed on Render as a Node web service. Build command `npm install`, start command `npm start`. Render injects `PORT` automatically.
