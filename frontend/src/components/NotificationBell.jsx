import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, AtSign, UserPlus, MessageSquare, ArrowRight, Heart, FolderKanban, CheckCheck, Inbox } from 'lucide-react';
import api from '../api';
import { relTime } from '../lib/format';

const fetchInbox = () => api.get('/notifications').then((r) => r.data);

const ICONS = { assigned: UserPlus, mentioned: AtSign, commented: MessageSquare, status: ArrowRight, kudos: Heart, project: FolderKanban };

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });

  // A failed poll simply leaves the badge stale.
  const load = useCallback(() => fetchInbox().then(setData).catch(() => {}), []);

  useEffect(() => {
    fetchInbox().then(setData).catch(() => {});
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setData((d) => ({ items: d.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)), unread: Math.max(0, d.unread - 1) }));
      api.put(`/notifications/${n._id}/read`).catch(() => {});
    }
    if (n.project) navigate(`/projects/${n.project}${n.task ? `?task=${n.task}` : ''}`);
  };

  const readAll = async () => {
    setData((d) => ({ items: d.items.map((x) => ({ ...x, read: true })), unread: 0 }));
    api.put('/notifications/read-all').catch(() => {});
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) load(); }} className="btn btn-sm btn-icon !mb-0 relative !overflow-visible after:hidden" aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}>
        <motion.span animate={data.unread ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.6, repeat: data.unread ? Infinity : 0, repeatDelay: 6 }} className="grid">
          <Bell size={16} />
        </motion.span>
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold grid place-items-center ring-2 ring-bg font-mono">
              {data.unread > 9 ? '9+' : data.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 card z-50 overflow-hidden origin-top-right">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <h3 className="font-semibold text-sm">Inbox</h3>
                {data.unread > 0 && (
                  <button type="button" onClick={readAll} className="text-xs font-semibold text-accent-text flex items-center gap-1 hover:underline">
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto scroll-thin">
                {data.items.length === 0 ? (
                  <div className="py-12 text-center text-sm text-subtle">
                    <Inbox size={28} className="mx-auto mb-2 opacity-60" />
                    You are all caught up.
                  </div>
                ) : data.items.map((n, i) => {
                  const Icon = ICONS[n.type] || Bell;
                  return (
                    <motion.button type="button" key={n._id} onClick={() => openItem(n)}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.025 }}
                      className={`w-full flex gap-3 px-4 py-3 text-left border-b border-line last:border-0 hover:bg-surface-2 transition-colors ${n.read ? 'opacity-60' : ''}`}>
                      <span className={`w-8 h-8 rounded-lg grid place-items-center flex-none ${n.type === 'kudos' || !n.read ? 'bg-accent/15 text-accent-text' : 'bg-surface-3 text-muted'}`}>
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm leading-snug">{n.message}</span>
                        <span className="block text-[11px] text-subtle mt-0.5">{relTime(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-none" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
