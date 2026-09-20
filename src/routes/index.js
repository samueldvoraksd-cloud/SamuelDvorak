const express = require('express');
const router = express.Router();
const site = require('../content/site.json');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  let subscribeStatus;
  if (req.query.subscribed === '1') {
    subscribeStatus = 'success';
  } else if (req.query.subscribe_error === 'unavailable') {
    subscribeStatus = 'unavailable';
  } else if (req.query.subscribe_error) {
    subscribeStatus = 'error';
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.siteTitle,
    jobTitle: 'Certified Flight Instructor',
    description: site.siteDescription,
    worksFor: { '@type': 'Organization', name: 'Brazos Valley Flight Services' },
    url: canonicalUrl(req),
  };

  res.render('index', {
    site,
    subscribeStatus,
    pageDescription: site.siteDescription,
    canonicalUrl: canonicalUrl(req),
    structuredData,
  });
});

module.exports = router;
