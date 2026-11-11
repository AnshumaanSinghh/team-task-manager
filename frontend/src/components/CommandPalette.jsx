import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, FolderKanban, LayoutDashboard, Users, Moon, Sun, Keyboard, Folder, CornerDownLeft, Command, LogOut, Timer } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocus } from '../context/FocusContext';
import { StatusIcon } from './ui/Bits';

export default function CommandPalette({ onShowShortcuts }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { focus, openOverlay } = useFocus();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rawIndex, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const openRef = useRef(false);

  useEffect(() => {
    const show = () => {
      setQuery('');
      setTasks([]);
      setIndex(0);
      setOpen(true);
      api.get('/projects').then((r) => setProjects(r.data)).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 60);
    };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    };
    const onOpen = () => show();
    window.addEventListener('keydown', onKey);
    window.addEventListener('taskflow:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('taskflow:palette', onOpen);
    };
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);

  // Debounced task search
  useEffect(() => {
    if (!open || query.trim().length < 2) return undefined;
    const id = setTimeout(() => {
      api.get('/tasks', { params: { search: query.trim(), limit: 8 } }).then((r) => setTasks(r.data)).catch(() => {});
    }, 180);
    return () => clearTimeout(id);
  }, [query, open]);

  const close = () => setOpen(false);
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const commands = [
      { id: 'go-dash', label: 'Go to Dashboard', icon: <LayoutDashboard size={16} />, hint: 'G D', run: () => navigate('/dashboard') },
      { id: 'go-projects', label: 'Go to Projects', icon: <FolderKanban size={16} />, hint: 'G P', run: () => navigate('/projects') },
      { id: 'go-team', label: 'Go to Team workload', icon: <Users size={16} />, hint: 'G T', run: () => navigate('/team') },
      ...(focus ? [{ id: 'focus', label: 'Open focus timer', icon: <Timer size={16} />, run: openOverlay }] : []),
      { id: 'theme', label: `Switch to ${darkMode ? 'light' : 'dark'} theme`, icon: darkMode ? <Sun size={16} /> : <Moon size={16} />, run: () => toggleTheme() },
      { id: 'keys', label: 'Keyboard shortcuts', icon: <Keyboard size={16} />, hint: '?', run: onShowShortcuts },
      { id: 'logout', label: 'Sign out', icon: <LogOut size={16} />, run: () => logout() }
    ].filter((c) => !q || c.label.toLowerCase().includes(q));

    const projectItems = projects
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, q ? 6 : 4)
      .map((p) => ({ id: `p-${p._id}`, label: p.name, sub: `${p.stats?.total ?? 0} tasks`, icon: <Folder size={16} />, run: () => navigate(`/projects/${p._id}`) }));

    const taskItems = (q.length >= 2 ? tasks : []).map((t) => ({
      id: `t-${t._id}`, label: t.title, sub: t.projectId?.name, icon: <StatusIcon status={t.status} size={16} />,
      run: () => navigate(`/projects/${t.projectId?._id || t.projectId}?task=${t._id}`)
    }));

    return [
      { title: 'Tasks', items: taskItems },
      { title: 'Projects', items: projectItems },
      { title: 'Commands', items: commands }
    ].filter((g) => g.items.length);
  }, [q, projects, tasks, darkMode, focus, navigate, toggleTheme, logout, onShowShortcuts, openOverlay]);

  const flat = groups.flatMap((g) => g.items);
  const index = Math.min(rawIndex, Math.max(0, flat.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (item) => {
    close();
    item?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(Math.min(flat.length - 1, index + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(Math.max(0, index - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(flat[index]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  let counter = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <motion.div role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-xl card overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-line">
              <Search size={18} className="text-accent-text flex-none" />
              <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} onKeyDown={onKeyDown}
                placeholder="Search tasks, projects or commands…" className="flex-1 bg-transparent py-4 outline-none text-base placeholder:text-subtle" aria-label="Search" />
              <span className="kbd">esc</span>
            </div>
            <div ref={listRef} className="max-h-[56vh] overflow-y-auto scroll-thin p-2">
              {flat.length === 0 ? (
                <div className="py-12 text-center text-sm text-subtle">
                  <Command size={26} className="mx-auto mb-2 opacity-50" />
                  Nothing matches “{query}”
                </div>
              ) : groups.map((group) => (
                <div key={group.title} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">{group.title}</p>
                  {group.items.map((item) => {
                    counter += 1;
                    const i = counter;
                    const active = i === index;
                    return (
                      <button type="button" key={item.id} data-index={i} onMouseMove={() => setIndex(i)} onClick={() => run(item)}
                        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${active ? 'text-fg' : 'text-muted'}`}>
                        {active && <motion.span layoutId="palette-active" className="absolute inset-0 rounded-xl bg-accent/12 border border-accent/25" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                        <span className={`relative w-7 h-7 rounded-lg grid place-items-center ${active ? 'bg-accent text-accent-ink' : 'bg-surface-3'}`}>{item.icon}</span>
                        <span className="relative flex-1 min-w-0 truncate font-medium">{item.label}</span>
                        {item.sub && <span className="relative text-xs text-subtle truncate max-w-[30%]">{item.sub}</span>}
                        {item.hint && <span className="relative kbd">{item.hint}</span>}
                        {active && <CornerDownLeft size={14} className="relative text-accent-text" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-line text-[11px] text-subtle bg-surface-2">
              <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
              <span><span className="kbd">↵</span> open</span>
              <span className="ml-auto">Type 2+ letters to search tasks</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
