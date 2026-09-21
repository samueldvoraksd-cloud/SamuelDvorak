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

## Structure

- `src/content/` — site copy (`site.json`), articles (Markdown), resources (`resources.json`)
- `src/routes/` — Express routes (home, articles, resources, llms.txt)
- `src/views/` — EJS templates
- `src/public/` — static assets (CSS, JS, images, downloadable documents)
- `src/services/` — helpers (canonical URL, article loading)

## Deployment

Deployed on Render as a Node web service. Build command `npm install`, start command `npm start`. Render injects `PORT` automatically.
