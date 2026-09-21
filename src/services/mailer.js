const nodemailer = require('nodemailer');

function getTransport() {
  const user = process.env.CONTACT_EMAIL_USER;
  const pass = process.env.CONTACT_EMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendContactMessage({ name, email, message }) {
  const transport = getTransport();
  if (!transport) return { ok: false, reason: 'not_configured' };

  const to = process.env.CONTACT_EMAIL_USER;
  try {
    await transport.sendMail({
      from: `"${name} (via site contact form)" <${process.env.CONTACT_EMAIL_USER}>`,
      to,
      replyTo: email,
      subject: `New message from ${name}`,
      text: message,
    });
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: 'send_failed' };
  }
}

module.exports = { sendContactMessage };
