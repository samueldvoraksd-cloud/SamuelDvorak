const crypto = require('crypto');

const COOKIE_NAME = 'csrf_secret';

// Stateless double-submit pattern: the secret lives in an ordinary cookie
// (survives server restarts), and the token is an HMAC of that secret.
// This avoids depending on the session store, which on Render's free tier
// is wiped every time the instance spins down from inactivity.
function getSecret() {
  return process.env.SESSION_SECRET || 'dev-only-secret-change-me';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function getToken(req, res) {
  let cookieSecret = req.cookies && req.cookies[COOKIE_NAME];
  if (!cookieSecret) {
    cookieSecret = crypto.randomBytes(24).toString('hex');
    res.cookie(COOKIE_NAME, cookieSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  return sign(cookieSecret);
}

function verifyToken(req) {
  const cookieSecret = req.cookies && req.cookies[COOKIE_NAME];
  const submitted = req.body && req.body._csrf;
  if (!cookieSecret || typeof submitted !== 'string') return false;
  const expected = sign(cookieSecret);
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { getToken, verifyToken };
