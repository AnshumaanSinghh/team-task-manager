// Async standup builder: what each member finished, what they are on, what blocks them.
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function buildStandup({ project, members, tasks, activities, now = new Date(), hours = 24 }) {
  const since = new Date(now.getTime() - hours * 3600000);
  const byId = new Map(tasks.map((t) => [String(t._id), t]));

  const rows = members.map((member) => {
    const id = String(member._id);
    const done = new Set();

    for (const a of activities) {
      if (String(a.userId?._id || a.userId) !== id) continue;
      if (new Date(a.createdAt) < since) continue;
      if (a.action === 'status_change' && a.meta?.to === 'Completed') {
        const task = byId.get(String(a.taskId));
        done.add(task ? task.title : a.details.replace(/^Changed "(.+)" from .*$/, '$1'));
      }
    }
    for (const t of tasks) {
      if (String(t.assignedTo?._id || t.assignedTo) === id && t.completedAt && new Date(t.completedAt) >= since) {
        done.add(t.title);
      }
    }

    const mine = tasks.filter((t) => String(t.assignedTo?._id || t.assignedTo) === id && t.status !== 'Completed');
    const doing = mine.filter((t) => t.status === 'In Progress' || t.status === 'In Review')
      .map((t) => (t.status === 'In Review' ? `${t.title} (in review)` : t.title));

    const blockers = [];
    for (const t of mine) {
      const waiting = (t.blockedBy || [])
        .map((b) => byId.get(String(b._id || b)))
        .filter((b) => b && b.status !== 'Completed');
      if (waiting.length) blockers.push(`${t.title}: waiting on ${waiting.map((b) => `"${b.title}"`).join(', ')}`);
      else if (new Date(t.deadline) < now) blockers.push(`${t.title}: overdue since ${fmtDate(t.deadline)}`);
    }

    return { id, name: member.name, done: [...done], doing, blockers };
  });

  const lines = [`## Standup: ${project.name} (${fmtDate(now)})`, ''];
  for (const r of rows) {
    lines.push(`### ${r.name}`);
    lines.push(`- **Done:** ${r.done.length ? r.done.join('; ') : 'Nothing completed'}`);
    lines.push(`- **Doing:** ${r.doing.length ? r.doing.join('; ') : 'Nothing in progress'}`);
    lines.push(`- **Blockers:** ${r.blockers.length ? r.blockers.join('; ') : 'None'}`);
    lines.push('');
  }

  return { generatedAt: now, windowHours: hours, members: rows, markdown: lines.join('\n').trim() };
}

module.exports = { buildStandup };
