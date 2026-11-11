// Resolve @mentions in a comment to project members.
// "@riya", "@RiyaSharma", "@riya.sharma" and "@riya_sharma" all match "Riya Sharma";
// the email local part ("@rsharma" for rsharma@x.com) matches too.
const normalise = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function extractMentions(text, members) {
  if (!text || !Array.isArray(members) || members.length === 0) return [];
  const tokens = [...String(text).matchAll(/(^|[^\w@])@([\p{L}\p{N}._-]{2,40})/gu)].map((m) => normalise(m[2]));
  if (tokens.length === 0) return [];

  const found = new Set();
  for (const token of tokens) {
    for (const member of members) {
      const name = String(member.name || '');
      const first = normalise(name.split(/\s+/)[0]);
      const full = normalise(name);
      const local = normalise(String(member.email || '').split('@')[0]);
      if (token && (token === first || token === full || (local && token === local))) {
        found.add(String(member._id));
      }
    }
  }
  return [...found];
}

module.exports = { extractMentions };
