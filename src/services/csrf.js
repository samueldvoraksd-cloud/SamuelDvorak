const crypto = require('crypto');

function getToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function verifyToken(req) {
  const submitted = req.body && req.body._csrf;
  return typeof submitted === 'string' && submitted === req.session.csrfToken;
}

module.exports = { getToken, verifyToken };
