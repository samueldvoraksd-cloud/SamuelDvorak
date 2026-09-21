const express = require('express');
const router = express.Router();
const site = require('../content/site.json');
const resources = require('../content/resources.json');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  res.render('resources', {
    site,
    resources,
    pageDescription: 'Study guides, photos, and links Samuel shares with his flight students.',
    canonicalUrl: canonicalUrl(req),
    active: 'resources',
  });
});

module.exports = router;
