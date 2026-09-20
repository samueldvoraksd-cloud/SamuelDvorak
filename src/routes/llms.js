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

  lines.push('', 'To get in touch with Samuel, use the "Email me" button in the Get in Touch section on the homepage.');

  if (articles.length > 0) {
    lines.push('', '## Articles', '');
    articles.forEach((article) => {
      lines.push(`- [${article.title}](${base}/articles/${article.slug}): ${article.excerpt}`);
    });
  }

  res.type('text/plain').send(lines.join('\n') + '\n');
});

module.exports = router;
