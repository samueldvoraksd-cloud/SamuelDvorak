const express = require('express');
const router = express.Router();
const convertkit = require('../services/convertkit');

router.post('/', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) {
    return res.redirect('/?subscribe_error=invalid');
  }

  const result = await convertkit.subscribe(email);

  if (result.ok) {
    return res.redirect('/?subscribed=1');
  }
  if (result.reason === 'not_configured') {
    return res.redirect('/?subscribe_error=unavailable');
  }
  return res.redirect('/?subscribe_error=failed');
});

module.exports = router;
