// Deterministic natural-language task parser.
// "Build login page by Friday, assign to Raj #auth 3pts urgent" ->
//   { title: 'Build login page', deadline: <Fri 23:59 local>, assignee: Raj, tags: ['auth'], estimate: 3, priority: 'High' }
// Works with no AI keys at all; the AI providers only refine its output.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_ABBR = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const LEAD = '(?:(?:by|on|due|before|until|till)\\s+)?';

// Calendar maths happens on the user's local calendar. tzOffset is the value of
// Date#getTimezoneOffset() in the user's browser (minutes, UTC - local).
function localDay(now, tzOffset) {
  const d = new Date(now.getTime() - tzOffset * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay() };
}

function addDays(day, n) {
  const t = new Date(Date.UTC(day.y, day.m, day.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() };
}

function endOfDay(day, tzOffset) {
  return new Date(Date.UTC(day.y, day.m, day.d, 23, 59, 0) + tzOffset * 60000);
}

const daysUntil = (fromDow, toDow) => ((toDow - fromDow + 7) % 7) || 7;

const normalise = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function findMember(words, members) {
  if (!Array.isArray(members)) return null;
  // Try "first last" before "first" so two people called Raj can be told apart.
  for (let count = Math.min(words.length, 2); count >= 1; count--) {
    const token = normalise(words.slice(0, count).join(''));
    const match = members.find((m) => {
      const full = normalise(m.name);
      const first = normalise(String(m.name || '').split(/\s+/)[0]);
      const local = normalise(String(m.email || '').split('@')[0]);
      return token === full || (count === 1 && (token === first || token === local));
    });
    if (match) return { member: match, used: count };
  }
  return null;
}

function parseDeadline(text, now, tzOffset) {
  const today = localDay(now, tzOffset);
  const rules = [
    {
      re: new RegExp(`\\b${LEAD}(\\d{4})-(\\d{2})-(\\d{2})\\b`, 'i'),
      day: (m) => ({ y: +m[1], m: +m[2] - 1, d: +m[3] })
    },
    {
      re: new RegExp(`\\b${LEAD}(${MONTHS.join('|')})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'),
      day: (m) => rollYear({ y: today.y, m: MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)), d: +m[2] }, today)
    },
    {
      re: new RegExp(`\\b${LEAD}(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join('|')})[a-z]*\\b`, 'i'),
      day: (m) => rollYear({ y: today.y, m: MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)), d: +m[1] }, today)
    },
    { re: new RegExp(`\\b${LEAD}(?:today|tonight|eod|end of (?:the )?day)\\b`, 'i'), day: () => today },
    { re: new RegExp(`\\b${LEAD}(?:tomorrow|tmrw|tmr)\\b`, 'i'), day: () => addDays(today, 1) },
    {
      re: /\b(?:in|within)\s+(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten)\s+(days?|weeks?)\b/i,
      day: (m) => {
        const n = NUMBER_WORDS[m[1].toLowerCase()] ?? parseInt(m[1], 10);
        return addDays(today, m[2].toLowerCase().startsWith('week') ? n * 7 : n);
      }
    },
    { re: new RegExp(`\\b${LEAD}next\\s+week\\b`, 'i'), day: () => addDays(today, 7) },
    {
      re: new RegExp(`\\b${LEAD}(?:end of (?:the |this )?week|eow|this week)\\b`, 'i'),
      day: () => addDays(today, today.dow <= 5 ? 5 - today.dow : 6)
    },
    {
      re: new RegExp(`\\b${LEAD}(?:end of (?:the |this )?month|eom)\\b`, 'i'),
      day: () => {
        const last = new Date(Date.UTC(today.y, today.m + 1, 0));
        return { y: last.getUTCFullYear(), m: last.getUTCMonth(), d: last.getUTCDate() };
      }
    },
    {
      re: new RegExp(`\\b${LEAD}(?:this\\s+)?(next\\s+)?(${WEEKDAYS.join('|')})\\b`, 'i'),
      day: (m) => {
        const dow = WEEKDAYS.indexOf(m[2].toLowerCase());
        return addDays(today, daysUntil(today.dow, dow) + (m[1] ? 7 : 0));
      }
    },
    {
      // Abbreviations need a preposition ("by fri") so words like "sat" are not misread.
      re: new RegExp(`\\b(?:by|on|due|before|until|till)\\s+(next\\s+)?(${Object.keys(WEEKDAY_ABBR).join('|')})\\b\\.?`, 'i'),
      day: (m) => addDays(today, daysUntil(today.dow, WEEKDAY_ABBR[m[2].toLowerCase()]) + (m[1] ? 7 : 0))
    }
  ];

  for (const rule of rules) {
    const match = text.match(rule.re);
    if (!match) continue;
    const day = rule.day(match);
    if (!day || Number.isNaN(new Date(Date.UTC(day.y, day.m, day.d)).getTime())) continue;
    return { deadline: endOfDay(day, tzOffset), matched: match[0] };
  }
  return null;
}

function rollYear(day, today) {
  // "Jan 5" written in December means next January.
  const candidate = Date.UTC(day.y, day.m, day.d);
  const todayUtc = Date.UTC(today.y, today.m, today.d);
  return candidate < todayUtc ? { ...day, y: day.y + 1 } : day;
}

function parsePriority(text) {
  const high = /(?:\b(?:urgent(?:ly)?|asap|high[ -]priority|priority[: ]+high|hi-pri|p0|p1)\b|!!+)/i;
  const highSoft = /\b(?:critical|blocker|important)\b/i; // sets priority but stays in the title
  const low = /\b(?:low[ -]priority|priority[: ]+low|whenever|someday|nice[ -]to[ -]have|p3|p4)\b/i;
  const medium = /\b(?:medium[ -]priority|priority[: ]+medium|p2)\b/i;

  let m;
  if ((m = text.match(high))) return { priority: 'High', matched: m[0] };
  if ((m = text.match(low))) return { priority: 'Low', matched: m[0] };
  if ((m = text.match(medium))) return { priority: 'Medium', matched: m[0] };
  if (highSoft.test(text)) return { priority: 'High', matched: null };
  return { priority: 'Medium', matched: null };
}

function parseAssignee(text, members) {
  const patterns = [
    /\b(?:assign(?:ed)?(?:\s+it)?\s+to|owner[:\s]+|give\s+(?:it\s+)?to)\s*@?([\p{L}][\p{L}\p{N}._'-]*(?:\s+[\p{L}][\p{L}\p{N}._'-]*)?)/iu,
    /(?:^|\s)@([\p{L}\p{N}._-]{2,40})/u
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (!match) continue;
    const words = match[1].split(/\s+/);
    const found = findMember(words, members);
    const usedWords = found ? found.used : 1;
    const prefix = match[0].slice(0, match[0].indexOf(match[1]));
    return {
      member: found?.member || null,
      name: words.slice(0, usedWords).join(' '),
      matched: (prefix + words.slice(0, usedWords).join(' ')).trim()
    };
  }
  return null;
}

function parseQuickTask(prompt, { now = new Date(), tzOffset = 0, members = [] } = {}) {
  const original = String(prompt || '').trim().slice(0, 500);
  let rest = original;
  const strip = (fragment) => {
    if (fragment) rest = rest.replace(fragment, ' ');
  };

  const tags = [];
  rest = rest.replace(/(^|\s)#([\p{L}\p{N}_-]{1,24})/gu, (_, lead, tag) => {
    if (!tags.includes(tag.toLowerCase()) && tags.length < 6) tags.push(tag.toLowerCase());
    return lead;
  });

  let estimate = 0;
  const est = rest.match(/\b(?:estimate[:\s]+)?(\d{1,3})\s*(?:pts?|points?|sp)\b|\bestimate[:\s]+(\d{1,3})\b/i);
  if (est) {
    estimate = Math.min(100, parseInt(est[1] || est[2], 10));
    strip(est[0]);
  }

  const assignee = parseAssignee(rest, members);
  if (assignee) strip(assignee.matched);

  const due = parseDeadline(rest, now, tzOffset);
  if (due) strip(due.matched);

  const priority = parsePriority(rest);
  if (priority.matched) strip(priority.matched);

  let title = rest
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;.!?])/g, '$1')
    .replace(/([,;:])\s*(?=[,;:])/g, '')
    .replace(/^(?:please|pls|can you|could you|we need to|need to|todo:?|task:?)\s+/i, '')
    .replace(/[\s,;:.\-–—]+(?:and|with|by|due|on|to|for)?[\s,;:.\-–—]*$/i, '')
    .replace(/[\s,;:.\-–—]+$/, '')
    .trim();
  if (!title) title = original;
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 120) title = `${title.slice(0, 117)}...`;

  const fallback = endOfDay(addDays(localDay(now, tzOffset), 3), tzOffset);

  return {
    title,
    description: original,
    priority: priority.priority,
    deadline: due ? due.deadline : fallback,
    deadlineParsed: Boolean(due),
    assigneeId: assignee?.member ? assignee.member._id : null,
    assigneeName: assignee?.member ? assignee.member.name : assignee?.name || null,
    tags,
    estimate
  };
}

module.exports = { parseQuickTask, parseDeadline, localDay, addDays, endOfDay };
