const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Trim a value to a string of at most `max` characters ('' for non-strings).
const cleanString = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Normalise a tag list: lowercase, kebab-ish, unique, at most 6 tags of 24 chars.
const cleanTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const out = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const tag = raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length === 6) break;
  }
  return out;
};

const cleanSubtasks = (subtasks) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .filter((s) => s && typeof s.title === 'string' && s.title.trim())
    .slice(0, 50)
    .map((s) => ({
      ...(s._id ? { _id: s._id } : {}),
      title: s.title.trim().slice(0, 200),
      isCompleted: Boolean(s.isCompleted)
    }));
};

const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || '';

module.exports = { escapeRegex, cleanString, cleanTags, cleanSubtasks, firstName };
