const fs = require('fs');
const path = require('path');

const SITE_PATH = path.join(__dirname, '..', 'content', 'site.json');
const RESOURCES_PATH = path.join(__dirname, '..', 'content', 'resources.json');
const REVIEWS_PATH = path.join(__dirname, '..', 'content', 'reviews.json');

// Reads content JSON fresh from disk on every call instead of caching it via
// require() at module load time, so admin saves show up on the public site
// immediately instead of only after the process next restarts.
function getSite() {
  return JSON.parse(fs.readFileSync(SITE_PATH, 'utf8'));
}

function getResources() {
  return JSON.parse(fs.readFileSync(RESOURCES_PATH, 'utf8'));
}

function getReviews() {
  if (!fs.existsSync(REVIEWS_PATH)) return [];
  return JSON.parse(fs.readFileSync(REVIEWS_PATH, 'utf8'));
}

module.exports = { getSite, getResources, getReviews };
