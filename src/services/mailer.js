const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendContactMessage({ name, email, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) return { ok: false, reason: 'not_configured' };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Samuel Dvorak <onboarding@resend.dev>',
        to,
        reply_to: email,
        subject: `New message from ${name}`,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return { ok: false, reason: 'send_failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: 'send_failed' };
  }
}

module.exports = { sendContactMessage };
