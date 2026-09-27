const express = require('express');
const router = express.Router();
const { getSite, getReviews } = require('../services/content');
const { canonicalUrl } = require('../services/url');

router.get('/', (req, res) => {
  res.render('reviews', {
    site: getSite(),
    reviews: getReviews(),
    pageDescription: 'What students have to say about training with Samuel Dvorak at Brazos Valley Flight Services.',
    canonicalUrl: canonicalUrl(req),
    active: 'reviews',
  });
});

module.exports = router;
