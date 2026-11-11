import { motion } from 'framer-motion';
import { Plus, ArrowRight, Trash2, MessageSquare, FolderPlus, UserPlus, UserMinus, Pencil, Timer, Heart, Activity } from 'lucide-react';
import { lcFirst, relTime } from '../lib/format';

const ICONS = {
  created_task: Plus, status_change: ArrowRight, deleted_task: Trash2, commented: MessageSquare,
  created_project: FolderPlus, added_member: UserPlus, removed_member: UserMinus, updated_task: Pencil,
  updated_project: Pencil, focus_session: Timer, kudos: Heart
};
const STRONG = new Set(['status_change', 'kudos', 'focus_session', 'created_project']);

export default function ActivityFeed({ items = [], compact = false, empty = 'No activity yet.' }) {
  if (!items.length) {
    return (
      <div className="py-10 text-center text-sm text-subtle">
        <Activity size={24} className="mx-auto mb-2 opacity-50" />{empty}
      </div>
    );
  }
  return (
    <ol className="relative">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-line" aria-hidden />
      {items.map((a, i) => {
        const Icon = ICONS[a.action] || Activity;
        const done = a.action === 'status_change' && a.meta?.to === 'Completed';
        return (
          <motion.li key={a._id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.035 }}
            className={`relative flex gap-3 ${compact ? 'py-2' : 'py-2.5'}`}>
            <span className={`relative z-10 w-[31px] h-[31px] rounded-full grid place-items-center flex-none border ${done || STRONG.has(a.action) ? 'bg-accent text-accent-ink border-accent' : 'bg-surface-2 text-muted border-line-strong'}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm leading-snug text-muted">
                <span className="font-semibold text-fg">{a.userId?.name || 'Someone'}</span> {lcFirst(a.details)}
              </p>
              <p className="text-[11px] text-subtle mt-0.5 font-mono">{relTime(a.createdAt)}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
