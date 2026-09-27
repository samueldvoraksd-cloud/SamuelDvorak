const express = require('express');
const router = express.Router();
const kit = require('../services/kit');

router.post('/', async (req, res) => {
  const { email, website } = req.body || {};

  // Honeypot: real visitors never fill this hidden field.
  if (website) {
    return res.json({ ok: true });
  }

  if (typeof email !== 'string' || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ ok: false, reason: 'invalid' });
  }

  const result = await kit.subscribe(email.trim());
  if (!result.ok) {
    return res.status(result.reason === 'not_configured' ? 503 : 502).json(result);
  }

  res.json({ ok: true });
});

module.exports = router;
