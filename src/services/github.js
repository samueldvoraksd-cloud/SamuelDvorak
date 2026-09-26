const OWNER = 'samueldvoraksd-cloud';
const REPO = 'SamuelDvorak';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function isConfigured() {
  return Boolean(process.env.GITHUB_TOKEN);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Returns { sha, content } for a file, or null if it doesn't exist.
async function getFile(repoPath) {
  const res = await fetch(`${API_BASE}/${repoPath}?ref=${BRANCH}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${repoPath} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (Array.isArray(data)) return null; // it's a directory, not a file
  return { sha: data.sha, content: Buffer.from(data.content, 'base64') };
}

// Lists the files in a repo directory (empty array if the directory doesn't exist).
async function listDir(repoPath) {
  const res = await fetch(`${API_BASE}/${repoPath}?ref=${BRANCH}`, { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list ${repoPath} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Creates or updates a file in the repo with the given content, committing
// directly to `main` so Render's auto-deploy picks it up on the next build.
// Skips the API call entirely if the content already matches what's on
// GitHub, so repeated publishes don't create empty no-op commits.
async function commitFile(repoPath, content, message) {
  if (!isConfigured()) return { skipped: true };
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const existing = await getFile(repoPath);
  if (existing && existing.content.equals(buffer)) {
    return { skipped: true, unchanged: true };
  }
  const res = await fetch(`${API_BASE}/${repoPath}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: buffer.toString('base64'),
      branch: BRANCH,
      ...(existing ? { sha: existing.sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`GitHub commit failed for ${repoPath}: ${res.status} ${await res.text()}`);
  return { skipped: false };
}

async function deleteFile(repoPath, message) {
  if (!isConfigured()) return { skipped: true };
  const existing = await getFile(repoPath);
  if (!existing) return { skipped: true };
  const res = await fetch(`${API_BASE}/${repoPath}`, {
    method: 'DELETE',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha: existing.sha, branch: BRANCH }),
  });
  if (!res.ok) throw new Error(`GitHub delete failed for ${repoPath}: ${res.status} ${await res.text()}`);
  return { skipped: false };
}

module.exports = { isConfigured, commitFile, deleteFile, listDir };
