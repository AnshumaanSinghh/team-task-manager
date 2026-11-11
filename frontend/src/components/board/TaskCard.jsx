import { Lock, Timer, Heart, ListChecks } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { DeadlineChip, PriorityBars } from '../ui/Bits';
import { deadlineState, fmtDate, fmtDuration } from '../../lib/format';

export default function TaskCard({ task, blockers = [], focusing = false, dragging = false, readOnly = false, onOpen }) {
  const done = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const total = task.subtasks?.length || 0;
  const state = deadlineState(task.deadline, task.status);
  const completed = task.status === 'Completed';

  return (
    <div
      onClick={onOpen}
      className={`group relative rounded-[14px] border bg-surface p-3.5 ${readOnly ? '' : 'cursor-pointer'} ${dragging
        ? 'border-accent shadow-[0_24px_40px_-16px_rgb(0_0_0/0.7),0_0_0_1px_var(--accent)] rotate-[2deg] scale-[1.03]'
        : 'border-line lift'} ${completed ? 'opacity-75' : ''}`}
      style={{ transition: dragging ? 'transform .2s, box-shadow .2s' : undefined }}
    >
      {focusing && <span className="absolute -top-2 right-3 chip chip-solid !text-[9px] !py-0.5"><span className="live-dot !w-1.5 !h-1.5" /> FOCUS</span>}

      <div className="flex items-center gap-2 mb-2">
        <PriorityBars priority={task.priority} showLabel={task.priority === 'High'} />
        <div className="flex-1" />
        {blockers.length > 0 && (
          <span className="chip hazard !text-[10px]" title={`Waiting on ${blockers.map((b) => b.title).join(', ')}`}>
            <Lock size={10} /> {blockers.length}
          </span>
        )}
        {task.estimate > 0 && <span className="chip font-mono !text-[10px]" title="Story points">{task.estimate}pt</span>}
      </div>

      <h4 className={`text-sm font-semibold leading-snug ${completed ? 'line-through decoration-accent/70 text-muted' : ''}`}>{task.title}</h4>
      {task.description && <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">{task.description}</p>}

      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {task.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] font-semibold text-accent-text">#{t}</span>)}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-subtle flex items-center gap-1"><ListChecks size={11} /> {done}/{total}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
        {task.assignedTo ? <Avatar name={task.assignedTo.name} size="sm" /> : <span className="w-6 h-6 rounded-full border border-dashed border-line-strong" title="Unassigned" />}
        <div className="flex items-center gap-2 text-[10px] text-subtle font-mono">
          {task.timeSpent > 0 && <span className="flex items-center gap-0.5" title="Focus time logged"><Timer size={11} /> {fmtDuration(task.timeSpent)}</span>}
          {task.kudos?.length > 0 && <span className="flex items-center gap-0.5 text-accent-text" title="Kudos"><Heart size={11} className="fill-current" /> {task.kudos.length}</span>}
        </div>
        <div className="flex-1" />
        <DeadlineChip state={state} date={fmtDate(task.deadline)} />
      </div>
    </div>
  );
}
