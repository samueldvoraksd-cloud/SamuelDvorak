function canonicalUrl(req) {
  return `${req.protocol}://${req.get('host')}${req.path}`;
}

module.exports = { canonicalUrl };
