const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');

function loadAll() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
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

function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function filePathForSlug(slug) {
  return path.join(ARTICLES_DIR, `${slug}.md`);
}

function getRawBySlug(slug) {
  if (!isValidSlug(slug)) return null;
  const filePath = filePathForSlug(slug);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { slug, title: data.title, date: data.date, excerpt: data.excerpt, body: content.trim() };
}

function save({ slug, title, date, excerpt, body }, originalSlug) {
  if (!isValidSlug(slug)) {
    throw new Error('Slug must be lowercase letters, numbers, and hyphens only.');
  }
  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }
  const targetPath = filePathForSlug(slug);
  if (slug !== originalSlug && fs.existsSync(targetPath)) {
    throw new Error(`An article with the slug "${slug}" already exists.`);
  }
  const fileContents = matter.stringify(`${body.trim()}\n`, { slug, title, date, excerpt });
  fs.writeFileSync(targetPath, fileContents, 'utf8');
  if (originalSlug && originalSlug !== slug) {
    const oldPath = filePathForSlug(originalSlug);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
}

function remove(slug) {
  if (!isValidSlug(slug)) return;
  const filePath = filePathForSlug(slug);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { getAll, getBySlug, getRawBySlug, save, remove, isValidSlug };
