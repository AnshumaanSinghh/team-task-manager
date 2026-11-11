import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { StatusIcon } from './ui/Bits';

export default function BlockerPicker({ tasks, value = [], onChange, excludeId }) {
  const [q, setQ] = useState('');
  const options = tasks.filter((t) => t._id !== excludeId && (!q || t.title.toLowerCase().includes(q.toLowerCase())));
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="relative border-b border-line">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a task this one waits on" className="w-full bg-transparent pl-9 pr-3 py-2 text-sm outline-none placeholder:text-subtle" />
      </div>
      <div className="max-h-40 overflow-y-auto scroll-thin p-1">
        {options.length === 0 && <p className="text-xs text-subtle text-center py-4">No other tasks</p>}
        {options.map((t) => {
          const on = value.includes(t._id);
          return (
            <button type="button" key={t._id} onClick={() => toggle(t._id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${on ? 'bg-accent/10' : 'hover:bg-surface-2'}`}>
              <StatusIcon status={t.status} size={13} />
              <span className={`flex-1 truncate ${t.status === 'Completed' ? 'line-through text-subtle' : ''}`}>{t.title}</span>
              <span className={`w-4 h-4 rounded grid place-items-center border ${on ? 'bg-accent border-accent text-accent-ink' : 'border-line-strong'}`}>{on && <Check size={11} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
