const KIT_API_URL = 'https://api.kit.com/v4';

function config() {
  return {
    apiKey: process.env.KIT_API_KEY,
    formId: process.env.KIT_FORM_ID,
    tagId: process.env.KIT_TAG_ID,
  };
}

function isConfigured() {
  return Boolean(config().apiKey);
}

async function request(path, body) {
  const res = await fetch(`${KIT_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': config().apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Kit ${path} failed: ${res.status} ${detail}`);
  }
  return res.json();
}

// Kit only accepts an existing subscriber on the form and tag endpoints, so the
// upsert has to come first.
async function subscribe(email) {
  const { apiKey, formId, tagId } = config();
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  try {
    await request('/subscribers', { email_address: email });
    if (formId) await request(`/forms/${formId}/subscribers`, { email_address: email });
    if (tagId) await request(`/tags/${tagId}/subscribers`, { email_address: email });
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: 'subscribe_failed' };
  }
}

// Scheduling a minute out rather than immediately, so a send that was a
// mistake can still be stopped from Kit before it goes anywhere.
const SEND_DELAY_MS = 60 * 1000;

// send_at null leaves it as a draft for review in Kit; a timestamp schedules it.
async function createBroadcast({ subject, content, description, sendNow }) {
  const { apiKey, tagId } = config();
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  try {
    const result = await request('/broadcasts', {
      subject,
      content,
      description: description || subject,
      public: false,
      send_at: sendNow ? new Date(Date.now() + SEND_DELAY_MS).toISOString() : null,
      subscriber_filter: tagId
        ? [{ all: [{ type: 'tag', ids: [Number(tagId)] }] }]
        : [],
    });
    return { ok: true, broadcast: result.broadcast };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: 'broadcast_failed' };
  }
}

module.exports = { isConfigured, subscribe, createBroadcast };
