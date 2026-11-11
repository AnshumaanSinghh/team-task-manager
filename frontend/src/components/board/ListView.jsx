import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { DeadlineChip, PriorityBars, StatusIcon } from '../ui/Bits';
import { STATUSES, deadlineState, fmtDate, fmtDuration, openBlockers } from '../../lib/format';

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
const STATUS_RANK = { 'To Do': 1, 'In Progress': 2, 'In Review': 3, Completed: 4 };

const COLS = [
  { key: 'title', label: 'Task', get: (t) => t.title.toLowerCase() },
  { key: 'status', label: 'Status', get: (t) => STATUS_RANK[t.status] },
  { key: 'assignee', label: 'Owner', get: (t) => t.assignedTo?.name || '~' },
  { key: 'priority', label: 'Priority', get: (t) => PRIORITY_RANK[t.priority] },
  { key: 'deadline', label: 'Due', get: (t) => new Date(t.deadline).getTime() },
  { key: 'estimate', label: 'Pts', get: (t) => t.estimate || 0 },
  { key: 'time', label: 'Time', get: (t) => t.timeSpent || 0 }
];

export default function ListView({ tasks, allTasks, onOpen, onStatus }) {
  const [sort, setSort] = useState({ key: 'deadline', dir: 1 });

  const rows = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key);
    return [...tasks].sort((a, b) => {
      const x = col.get(a);
      const y = col.get(b);
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
  }, [tasks, sort]);

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left">
              {COLS.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-subtle">
                  <button type="button" onClick={() => toggle(c.key)} className={`flex items-center gap-1 hover:text-fg ${sort.key === c.key ? 'text-accent-text' : ''}`}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const blockers = openBlockers(t, allTasks);
              return (
                <motion.tr key={t._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}
                  onClick={() => onOpen(t)} className="border-b border-line last:border-0 hover:bg-accent/[0.05] cursor-pointer transition-colors">
                  <td className="px-4 py-3 max-w-[340px]">
                    <div className="flex items-center gap-2">
                      {blockers.length > 0 && <Lock size={13} className="text-fg flex-none" aria-label="Blocked" />}
                      <span className={`font-medium truncate ${t.status === 'Completed' ? 'line-through text-muted' : ''}`}>{t.title}</span>
                    </div>
                    {t.tags?.length > 0 && <div className="text-[11px] text-accent-text mt-0.5 truncate">{t.tags.map((x) => `#${x}`).join(' ')}</div>}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex items-center gap-2">
                      <StatusIcon status={t.status} size={14} />
                      <select value={t.status} onChange={(e) => onStatus(t, e.target.value)} aria-label="Status"
                        className="bg-transparent text-sm font-medium outline-none cursor-pointer appearance-none pr-2 hover:text-accent-text">
                        {STATUSES.map((s) => <option key={s} value={s} className="bg-surface text-fg">{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.assignedTo ? <span className="flex items-center gap-2"><Avatar name={t.assignedTo.name} size="sm" /><span className="truncate max-w-[120px]">{t.assignedTo.name}</span></span> : <span className="text-subtle">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3"><PriorityBars priority={t.priority} showLabel /></td>
                  <td className="px-4 py-3"><DeadlineChip state={deadlineState(t.deadline, t.status)} date={fmtDate(t.deadline)} /></td>
                  <td className="px-4 py-3 font-mono text-muted">{t.estimate || '–'}</td>
                  <td className="px-4 py-3 font-mono text-muted">{t.timeSpent ? fmtDuration(t.timeSpent) : '–'}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-center text-sm text-subtle py-12">No tasks match these filters.</p>}
    </div>
  );
}
