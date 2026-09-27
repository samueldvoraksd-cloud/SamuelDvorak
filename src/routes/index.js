const express = require('express');
const router = express.Router();
const { getSite } = require('../services/content');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  const site = getSite();
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
    pageDescription: site.siteDescription,
    canonicalUrl: canonicalUrl(req),
    structuredData,
  });
});

module.exports = router;
