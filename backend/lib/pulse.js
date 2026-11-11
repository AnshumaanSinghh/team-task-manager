// Project health score (0-100) from completion, overdue work, blockers and activity.
function computePulse({ tasks, recentActivityCount, now = new Date() }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed');
  const open = tasks.filter((t) => t.status !== 'Completed');
  const overdue = open.filter((t) => new Date(t.deadline) < now);
  const statusById = new Map(tasks.map((t) => [String(t._id), t.status]));
  const blocked = open.filter((t) => (t.blockedBy || []).some((id) => statusById.has(String(id)) && statusById.get(String(id)) !== 'Completed'));
  const staleReview = open.filter((t) => t.status === 'In Review' && now - new Date(t.updatedAt) > 3 * 86400000);

  const insights = [];
  const burnoutWarnings = [];
  let score;

  if (total === 0) {
    score = 60;
    insights.push('No tasks yet. Add a few to start measuring project health.');
  } else {
    score = 50;
    score += (completed.length / total) * 30;
    score -= (overdue.length / total) * 40;
    score -= (blocked.length / total) * 10;
    if (recentActivityCount > 20) score += 20;
    else if (recentActivityCount > 5) score += 10;
    else if (recentActivityCount === 0) score -= 15;
    else score -= 5;
  }

  const workload = {};
  for (const t of open) {
    if (!t.assignedTo) continue;
    const name = t.assignedTo.name || 'Someone';
    workload[name] = workload[name] || { total: 0, overdue: 0 };
    workload[name].total += 1;
    if (new Date(t.deadline) < now) workload[name].overdue += 1;
  }
  for (const [name, data] of Object.entries(workload)) {
    if (data.total > 8 || data.overdue >= 3) {
      burnoutWarnings.push(`${name} may be overloaded: ${data.total} open, ${data.overdue} overdue`);
      score -= 5;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (total > 0) {
    if (score >= 80) insights.push('Strong momentum. The team is shipping steadily.');
    else if (score >= 50) insights.push('Progressing steadily. Keep an eye on deadlines.');
    else insights.push('Project is slowing down and needs attention.');
  }
  if (total > 0 && overdue.length / total > 0.2) insights.push(`${overdue.length} task${overdue.length === 1 ? ' is' : 's are'} overdue.`);
  if (blocked.length > 0) insights.push(`${blocked.length} task${blocked.length === 1 ? ' is' : 's are'} waiting on blockers.`);
  if (staleReview.length > 0) insights.push(`${staleReview.length} task${staleReview.length === 1 ? ' has' : 's have'} sat in review for 3+ days.`);
  if (total > 0 && recentActivityCount === 0) insights.push('No activity in the last 7 days.');

  let status = 'healthy';
  if (score < 40) status = 'critical';
  else if (score < 75) status = 'warning';

  return {
    score,
    status,
    insights: insights.slice(0, 3),
    burnoutWarnings,
    metrics: {
      total,
      completed: completed.length,
      overdue: overdue.length,
      blocked: blocked.length,
      recentActivityCount
    }
  };
}

module.exports = { computePulse };
