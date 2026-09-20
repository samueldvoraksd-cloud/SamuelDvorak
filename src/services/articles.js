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

module.exports = { getAll, getBySlug };
