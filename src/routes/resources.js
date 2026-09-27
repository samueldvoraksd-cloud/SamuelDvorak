const express = require('express');
const router = express.Router();
const { getSite, getResources } = require('../services/content');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  res.render('resources', {
    site: getSite(),
    resources: getResources(),
    pageDescription: 'Study guides, photos, and links Samuel shares with his flight students.',
    canonicalUrl: canonicalUrl(req),
    active: 'resources',
  });
});

module.exports = router;
