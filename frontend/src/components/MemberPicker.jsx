import { useEffect, useState } from 'react';
import { Check, Search, Lock } from 'lucide-react';
import api from '../api';
import Avatar from './ui/Avatar';

export default function MemberPicker({ value = [], onChange, lockedId }) {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/auth/users').then((r) => setUsers(r.data)).catch(() => setUsers([]));
  }, []);

  const toggle = (id) => {
    if (id === lockedId) return;
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  const shown = (users || []).filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="relative border-b border-line">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-subtle" />
      </div>
      <div className="max-h-56 overflow-y-auto scroll-thin p-1.5">
        {users === null && <div className="p-3 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-9" />)}</div>}
        {users && shown.length === 0 && <p className="text-sm text-subtle text-center py-6">No people found</p>}
        {shown.map((u) => {
          const on = value.includes(u._id) || u._id === lockedId;
          return (
            <button type="button" key={u._id} onClick={() => toggle(u._id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${on ? 'bg-accent/10' : 'hover:bg-surface-2'}`}>
              <Avatar name={u.name} size="md" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{u.name}</span>
                <span className="block text-xs text-subtle truncate">{u.email}</span>
              </span>
              {u.role === 'Admin' && <span className="chip">Admin</span>}
              <span className={`w-5 h-5 rounded-md grid place-items-center border transition-all ${on ? 'bg-accent border-accent text-accent-ink scale-100' : 'border-line-strong scale-90'}`}>
                {u._id === lockedId ? <Lock size={11} /> : on && <Check size={13} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-line text-xs text-subtle">{value.length} selected</div>
    </div>
  );
}
