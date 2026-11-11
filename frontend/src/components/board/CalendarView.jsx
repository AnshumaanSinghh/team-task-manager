import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateInput } from '../../lib/format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ tasks, onOpen }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dir, setDir] = useState(0);

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = toDateInput(t.deadline);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  const today = toDateInput(new Date());
  const move = (n) => {
    setDir(n);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-line">
        <h3 className="text-lg font-bold">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} className="btn btn-sm btn-icon" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => { const d = new Date(); setDir(0); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="btn btn-sm">Today</button>
          <button type="button" onClick={() => move(1)} className="btn btn-sm btn-icon" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2">
            {WEEKDAYS.map((d) => <div key={d} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-subtle">{d}</div>)}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cursor.toISOString()} className="grid grid-cols-7"
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.25 }}>
              {days.map((day) => {
                const key = toDateInput(day);
                const list = byDay.get(key) || [];
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = key === today;
                return (
                  <div key={key} className={`min-h-[112px] border-b border-r border-line p-1.5 ${inMonth ? '' : 'bg-surface-2/50'} ${isToday ? 'bg-accent/[0.06]' : ''}`}>
                    <div className={`text-xs font-mono mb-1 w-6 h-6 grid place-items-center rounded-full ${isToday ? 'bg-accent text-accent-ink font-bold' : inMonth ? 'text-muted' : 'text-subtle/60'}`}>{day.getDate()}</div>
                    <div className="space-y-1">
                      {list.slice(0, 3).map((t) => {
                        const overdue = t.status !== 'Completed' && new Date(t.deadline) < new Date();
                        return (
                          <button type="button" key={t._id} onClick={() => onOpen(t)} title={t.title}
                            className={`w-full text-left text-[11px] font-medium px-1.5 py-1 rounded-md truncate border transition-transform hover:-translate-y-px ${t.status === 'Completed'
                              ? 'bg-accent/10 border-accent/20 text-muted line-through'
                              : overdue ? 'hazard' : t.priority === 'High' ? 'bg-accent text-accent-ink border-transparent' : 'bg-surface-3 border-line'}`}>
                            {t.title}
                          </button>
                        );
                      })}
                      {list.length > 3 && <p className="text-[10px] text-subtle px-1.5">+{list.length - 3} more</p>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
