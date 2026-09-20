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
