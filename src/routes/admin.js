const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const csrf = require('../services/csrf');
const articlesService = require('../services/articles');
const github = require('../services/github');

const SITE_JSON_PATH = path.join(__dirname, '..', 'content', 'site.json');
const RESOURCES_JSON_PATH = path.join(__dirname, '..', 'content', 'resources.json');
const DOCUMENTS_DIR = path.join(__dirname, '..', 'public', 'documents');
const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      cb(null, DOCUMENTS_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60) || 'document';
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map(); // ip -> { count, lockedUntil }

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isLockedOut(ip) {
  const entry = loginAttempts.get(ip);
  return Boolean(entry && entry.lockedUntil && entry.lockedUntil > Date.now());
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

function parseContactEmail(value) {
  const [user, ...rest] = String(value || '').trim().split('@');
  return { user: user || '', domain: rest.join('@') || '' };
}

function normalizeRows(rows, fields) {
  if (!rows) return [];
  const list = Array.isArray(rows) ? rows : Object.values(rows);
  return list
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const clean = {};
      fields.forEach((field) => { clean[field] = String(row[field] || '').trim(); });
      return clean;
    })
    .filter((row) => fields.some((field) => row[field]));
}

// Deletes any /documents/* file that was referenced before saving but isn't
// referenced by any row after saving, so replaced/removed uploads don't
// accumulate as orphaned files on disk.
function cleanupOrphanedDocuments(previousDocs, newDocs) {
  const before = new Set((previousDocs || []).map((d) => d.file).filter(Boolean));
  const after = new Set((newDocs || []).map((d) => d.file).filter(Boolean));
  const removed = [];
  before.forEach((file) => {
    if (after.has(file) || !file.startsWith('/documents/')) return;
    const abs = path.join(DOCUMENTS_DIR, path.basename(file));
    try {
      fs.unlinkSync(abs);
      removed.push(file);
    } catch (err) { /* best effort cleanup */ }
  });
  return removed;
}

// Reconciles every piece of admin-editable content against GitHub in one
// pass: commits anything local that's new or changed, and deletes anything
// on GitHub that no longer exists locally (renamed/removed articles or
// documents). Safe to call repeatedly — commitFile/deleteFile no-op when
// there's nothing to change, so batching several unrelated edits into one
// publish only ever produces the commits that actually have content.
async function publishAll() {
  const summary = { changed: [], deleted: [] };

  async function syncFile(repoPath, absPath, message) {
    const result = await github.commitFile(repoPath, fs.readFileSync(absPath), message);
    if (!result.skipped) summary.changed.push(repoPath);
  }

  // Text files get their line endings normalized to LF before comparing —
  // on Windows, git checks these out as CRLF locally while GitHub stores
  // LF, which would otherwise make every publish see a "change" that isn't
  // actually there. Binary files (PDFs) must go through syncFile untouched.
  async function syncTextFile(repoPath, absPath, message) {
    const normalized = fs.readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n');
    const result = await github.commitFile(repoPath, Buffer.from(normalized, 'utf8'), message);
    if (!result.skipped) summary.changed.push(repoPath);
  }

  await syncTextFile('src/content/site.json', SITE_JSON_PATH, 'Update home page content via admin');
  await syncTextFile('src/content/resources.json', RESOURCES_JSON_PATH, 'Update resources page via admin');

  const localArticles = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'))
    : [];
  const remoteArticles = await github.listDir('src/content/articles');
  for (const file of localArticles) {
    await syncTextFile(`src/content/articles/${file}`, path.join(ARTICLES_DIR, file), `Update article: ${file}`);
  }
  for (const entry of remoteArticles) {
    if (entry.type === 'file' && !localArticles.includes(entry.name)) {
      await github.deleteFile(`src/content/articles/${entry.name}`, `Delete article: ${entry.name}`);
      summary.deleted.push(`src/content/articles/${entry.name}`);
    }
  }

  const localDocs = fs.existsSync(DOCUMENTS_DIR) ? fs.readdirSync(DOCUMENTS_DIR) : [];
  const remoteDocs = await github.listDir('src/public/documents');
  for (const file of localDocs) {
    await syncFile(`src/public/documents/${file}`, path.join(DOCUMENTS_DIR, file), `Add document: ${file}`);
  }
  for (const entry of remoteDocs) {
    if (entry.type === 'file' && !localDocs.includes(entry.name)) {
      await github.deleteFile(`src/public/documents/${entry.name}`, `Remove document: ${entry.name}`);
      summary.deleted.push(`src/public/documents/${entry.name}`);
    }
  }

  return summary;
}

// Makes githubConfigured available to every view under /admin without
// having to thread it through each individual render() call.
router.use((req, res, next) => {
  res.locals.githubConfigured = github.isConfigured();
  next();
});

// --- Auth ---

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null, csrfToken: csrf.getToken(req, res) });
});

router.post('/login', (req, res) => {
  const ip = req.ip;

  if (isLockedOut(ip)) {
    return res.status(429).render('admin/login', {
      error: 'Too many failed attempts. Try again in a few minutes.',
      csrfToken: csrf.getToken(req, res),
    });
  }

  if (!csrf.verifyToken(req)) {
    return res.status(403).render('admin/login', { error: 'Session expired, please try again.', csrfToken: csrf.getToken(req, res) });
  }

  const { username, password } = req.body || {};
  const adminUsername = process.env.ADMIN_USERNAME || '';
  const adminHash = process.env.ADMIN_PASSWORD_HASH || '';

  const validUsername = typeof username === 'string' && username === adminUsername;
  const validPassword = typeof password === 'string' && adminHash && bcrypt.compareSync(password, adminHash);

  if (!validUsername || !validPassword) {
    recordFailedAttempt(ip);
    return res.status(401).render('admin/login', { error: 'Incorrect username or password.', csrfToken: csrf.getToken(req, res) });
  }

  clearAttempts(ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Something went wrong. Please try again.');
    req.session.isAdmin = true;
    res.redirect('/admin');
  });
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- Publish (syncs everything to GitHub in one batch) ---

router.post('/publish', requireAuth, async (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  try {
    const summary = await publishAll();
    const total = summary.changed.length + summary.deleted.length;
    const message = total === 0
      ? 'Nothing to publish — GitHub already matches your latest saves.'
      : `Published: ${summary.changed.length} file(s) updated, ${summary.deleted.length} removed. Render will redeploy shortly.`;
    res.redirect(`/admin?publishResult=${encodeURIComponent(message)}`);
  } catch (err) {
    console.error('Publish failed:', err.message);
    res.redirect(`/admin?publishResult=${encodeURIComponent(`Publish failed: ${err.message}`)}`);
  }
});

// --- Dashboard ---

router.get('/', requireAuth, (req, res) => {
  res.render('admin/dashboard', {
    articleCount: articlesService.getAll().length,
    githubConfigured: github.isConfigured(),
    publishResult: req.query.publishResult || null,
    csrfToken: csrf.getToken(req, res),
  });
});

// --- Home / bio content ---

router.get('/home', requireAuth, (req, res) => {
  const site = readJsonFile(SITE_JSON_PATH);
  res.render('admin/home-edit', {
    form: {
      siteTitle: site.siteTitle || '',
      navBrand: site.navBrand || '',
      tagline: site.tagline || '',
      siteDescription: site.siteDescription || '',
      bioText: (site.bio || []).join('\n\n'),
      contactEmail: site.contact ? `${site.contact.user}@${site.contact.domain}` : '',
    },
    saved: false,
    githubConfigured: github.isConfigured(),
    csrfToken: csrf.getToken(req, res),
  });
});

router.post('/home', requireAuth, (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  const existing = readJsonFile(SITE_JSON_PATH);
  const { siteTitle, navBrand, tagline, siteDescription, bioText, contactEmail } = req.body || {};

  const updated = {
    siteTitle: (siteTitle || '').trim(),
    navBrand: (navBrand || '').trim(),
    tagline: (tagline || '').trim(),
    siteDescription: (siteDescription || '').trim(),
    bio: String(bioText || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    nav: existing.nav,
    contact: parseContactEmail(contactEmail),
  };
  writeJsonFile(SITE_JSON_PATH, updated);

  res.render('admin/home-edit', {
    form: { siteTitle: updated.siteTitle, navBrand: updated.navBrand, tagline: updated.tagline, siteDescription: updated.siteDescription, bioText: updated.bio.join('\n\n'), contactEmail },
    saved: true,
    githubConfigured: github.isConfigured(),
    csrfToken: csrf.getToken(req, res),
  });
});

// --- Resources ---

router.get('/resources', requireAuth, (req, res) => {
  const resources = readJsonFile(RESOURCES_JSON_PATH);
  res.render('admin/resources-edit', {
    linksDescription: resources.linksDescription || '',
    documents: resources.documents || [],
    links: resources.links || [],
    saved: false,
    githubConfigured: github.isConfigured(),
    csrfToken: csrf.getToken(req, res),
  });
});

router.post('/resources', requireAuth, upload.any(), (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  const { linksDescription, documents, links } = req.body || {};

  // multer/append-field already parses `documents[N][field]` into a real
  // nested array on req.body — just splice in any uploaded files by index.
  (req.files || []).forEach((file) => {
    const match = file.fieldname.match(/^documents\[(\d+)\]\[fileUpload\]$/);
    if (!match || !documents || !documents[match[1]]) return;
    documents[match[1]].file = `/documents/${file.filename}`;
  });

  const previous = readJsonFile(RESOURCES_JSON_PATH);
  const updated = {
    documents: normalizeRows(documents, ['title', 'description', 'file']),
    linksDescription: (linksDescription || '').trim(),
    links: normalizeRows(links, ['title', 'description', 'url']),
  };
  cleanupOrphanedDocuments(previous.documents, updated.documents);
  writeJsonFile(RESOURCES_JSON_PATH, updated);

  res.render('admin/resources-edit', {
    linksDescription: updated.linksDescription,
    documents: updated.documents,
    links: updated.links,
    saved: true,
    githubConfigured: github.isConfigured(),
    csrfToken: csrf.getToken(req, res),
  });
});

// --- Articles ---

router.get('/articles', requireAuth, (req, res) => {
  res.render('admin/articles-list', {
    articles: articlesService.getAll(),
    csrfToken: csrf.getToken(req, res),
  });
});

router.get('/articles/new', requireAuth, (req, res) => {
  res.render('admin/article-form', {
    mode: 'new',
    article: { slug: '', title: '', date: new Date().toISOString().slice(0, 10), excerpt: '', body: '' },
    error: null,
    csrfToken: csrf.getToken(req, res),
  });
});

router.post('/articles/new', requireAuth, (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  const { slug, title, date, excerpt, body } = req.body || {};
  try {
    articlesService.save({ slug, title, date, excerpt, body }, null);
    res.redirect('/admin/articles');
  } catch (err) {
    res.status(400).render('admin/article-form', {
      mode: 'new',
      article: { slug, title, date, excerpt, body },
      error: err.message,
      csrfToken: csrf.getToken(req, res),
    });
  }
});

router.get('/articles/:slug/edit', requireAuth, (req, res) => {
  const article = articlesService.getRawBySlug(req.params.slug);
  if (!article) return res.status(404).send('Article not found.');
  res.render('admin/article-form', { mode: 'edit', article, error: null, csrfToken: csrf.getToken(req, res) });
});

router.post('/articles/:slug/edit', requireAuth, (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  const originalSlug = req.params.slug;
  const { slug, title, date, excerpt, body } = req.body || {};
  try {
    articlesService.save({ slug, title, date, excerpt, body }, originalSlug);
    res.redirect('/admin/articles');
  } catch (err) {
    res.status(400).render('admin/article-form', {
      mode: 'edit',
      article: { slug, title, date, excerpt, body },
      error: err.message,
      csrfToken: csrf.getToken(req, res),
    });
  }
});

router.post('/articles/:slug/delete', requireAuth, (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  articlesService.remove(req.params.slug);
  res.redirect('/admin/articles');
});

module.exports = router;
