const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const csrf = require('../services/csrf');
const articlesService = require('../services/articles');

const SITE_JSON_PATH = path.join(__dirname, '..', 'content', 'site.json');
const RESOURCES_JSON_PATH = path.join(__dirname, '..', 'content', 'resources.json');

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

// --- Dashboard ---

router.get('/', requireAuth, (req, res) => {
  res.render('admin/dashboard', { articleCount: articlesService.getAll().length });
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
    csrfToken: csrf.getToken(req, res),
  });
});

router.post('/resources', requireAuth, (req, res) => {
  if (!csrf.verifyToken(req)) return res.status(403).send('Session expired, please go back and try again.');
  const { linksDescription, documents, links } = req.body || {};

  const updated = {
    documents: normalizeRows(documents, ['title', 'description', 'file']),
    linksDescription: (linksDescription || '').trim(),
    links: normalizeRows(links, ['title', 'description', 'url']),
  };
  writeJsonFile(RESOURCES_JSON_PATH, updated);

  res.render('admin/resources-edit', {
    linksDescription: updated.linksDescription,
    documents: updated.documents,
    links: updated.links,
    saved: true,
    csrfToken: csrf.getToken(req, res),
  });
});

// --- Articles ---

router.get('/articles', requireAuth, (req, res) => {
  res.render('admin/articles-list', { articles: articlesService.getAll(), csrfToken: csrf.getToken(req, res) });
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
