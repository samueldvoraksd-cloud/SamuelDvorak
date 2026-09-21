const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../services/mailer');

const MAX_LENGTH = { name: 100, email: 200, message: 5000 };

router.post('/', async (req, res) => {
  const { name, email, message, website } = req.body || {};

  // Honeypot: real visitors never fill this hidden field.
  if (website) {
    return res.json({ ok: true });
  }

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof message !== 'string' || !message.trim()
  ) {
    return res.status(400).json({ ok: false, reason: 'invalid' });
  }

  if (
    name.length > MAX_LENGTH.name ||
    email.length > MAX_LENGTH.email ||
    message.length > MAX_LENGTH.message
  ) {
    return res.status(400).json({ ok: false, reason: 'too_long' });
  }

  const result = await sendContactMessage({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  });

  if (!result.ok) {
    return res.status(502).json(result);
  }

  res.json({ ok: true });
});

module.exports = router;
