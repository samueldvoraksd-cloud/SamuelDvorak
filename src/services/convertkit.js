async function subscribe(email) {
  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    return { ok: false, reason: 'not_configured' };
  }

  let response;
  try {
    response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, email }),
    });
  } catch (err) {
    return { ok: false, reason: 'request_failed' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'request_failed' };
  }

  return { ok: true };
}

module.exports = { subscribe };
