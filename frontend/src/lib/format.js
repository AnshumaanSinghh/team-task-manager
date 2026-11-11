export const STATUSES = ['To Do', 'In Progress', 'In Review', 'Completed'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const ESTIMATES = [0, 1, 2, 3, 5, 8, 13];

export const COLUMNS = [
  { key: 'To Do', wip: 'todo', hint: 'Ready to pick up' },
  { key: 'In Progress', wip: 'inProgress', hint: 'Being worked on' },
  { key: 'In Review', wip: 'inReview', hint: 'Waiting for a second pair of eyes' },
  { key: 'Completed', wip: null, hint: 'Shipped' }
];

export const PROJECT_COLORS = {
  emerald: '#22c55e',
  lime: '#a3e635',
  mint: '#6ee7b7',
  forest: '#15803d',
  jade: '#10b981',
  onyx: 'var(--fg)'
};

const DAY = 86400000;

export const taskOrder = (t) => (typeof t.order === 'number' ? t.order : new Date(t.createdAt).getTime());
export const byOrder = (a, b) => taskOrder(a) - taskOrder(b);

export const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || '';

export const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const lcFirst = (s = '') => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function deadlineState(deadline, status) {
  if (status === 'Completed') return { tone: 'done', label: 'Done' };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) {
    const days = Math.max(1, Math.round(-diff / DAY));
    return { tone: 'overdue', label: `${days}d overdue` };
  }
  if (diff < DAY) return { tone: 'soon', label: 'Due today' };
  if (diff < 2 * DAY) return { tone: 'soon', label: 'Due tomorrow' };
  return { tone: 'ok', label: `${Math.ceil(diff / DAY)}d left` };
}

export const fmtDate = (d, opts = { month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(undefined, opts) : '';

export function relTime(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

export function fmtDuration(seconds = 0) {
  const total = Math.round(seconds / 60);
  if (total < 1) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

export const fmtClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// <input type="date"> value <-> end of that day in the user's timezone
export function toDeadlineISO(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 0).toISOString();
}

export function toDateInput(date) {
  const d = date ? new Date(date) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysInput(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}

export function nextWeekdayInput(dow) {
  const d = new Date();
  const diff = ((dow - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + diff);
  return toDateInput(d);
}

export const openBlockers = (task, tasks) => {
  const ids = (task.blockedBy || []).map((b) => String(b._id || b));
  return tasks.filter((t) => ids.includes(String(t._id)) && t.status !== 'Completed');
};

export const isMine = (task, user) => String(task.assignedTo?._id || task.assignedTo || '') === String(user?._id);

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
