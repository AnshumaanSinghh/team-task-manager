import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, LayoutTemplate, Moon, Sun } from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import TaskCard from '../components/board/TaskCard';
import { Logo, Ring, StatusIcon } from '../components/ui/Bits';
import { AvatarStack } from '../components/ui/Avatar';
import { COLUMNS, byOrder } from '../lib/format';

export default function PublicProject() {
  const { shareId } = useParams();
  const { darkMode, toggleTheme } = useTheme();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api.get(`/projects/public/${shareId}`)
      .then((r) => setState({ project: r.data.project, tasks: r.data.tasks }))
      .catch(() => setState({ error: true }));
  }, [shareId]);

  const pct = useMemo(() => {
    const t = state.tasks || [];
    return t.length ? Math.round((t.filter((x) => x.status === 'Completed').length / t.length) * 100) : 0;
  }, [state.tasks]);

  const header = (
    <header className="sticky top-0 z-10 border-b border-line panel-glass">
      <div className="flex items-center gap-3 px-4 sm:px-8 h-16">
        <Link to="/"><Logo size={28} /></Link>
        <span className="chip"><Eye size={11} /> Read-only</span>
        <div className="flex-1" />
        <button type="button" onClick={toggleTheme} className="btn btn-sm btn-icon !mb-0" aria-label="Toggle theme">{darkMode ? <Sun size={15} /> : <Moon size={15} />}</button>
        <Link to="/login" className="btn btn-sm btn-primary !mb-0">Sign in</Link>
      </div>
    </header>
  );

  if (state.loading) {
    return <div className="min-h-screen">{header}<div className="p-8"><div className="skeleton h-10 w-72 mb-6" /><div className="flex gap-4">{COLUMNS.map((c) => <div key={c.key} className="skeleton h-96 w-[300px] !rounded-2xl" />)}</div></div></div>;
  }

  if (state.error) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <LayoutTemplate size={44} className="mx-auto text-subtle mb-4" />
          <h1 className="text-2xl font-bold mb-2">This board is not available</h1>
          <p className="text-muted mb-6">The link may have been revoked or mistyped.</p>
          <Link to="/" className="btn btn-primary">Go to TaskFlow</Link>
        </div>
      </div>
    );
  }

  const { project, tasks } = state;
  return (
    <div className="min-h-screen">
      {header}
      <main className="px-4 sm:px-8 py-8 max-w-[1500px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
          <Ring value={pct} size={76} stroke={8}><span className="text-sm font-bold font-mono">{pct}%</span></Ring>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted mt-1 max-w-3xl">{project.description}</p>
            <div className="flex items-center gap-3 mt-3"><AvatarStack people={project.members} max={6} /><span className="text-xs text-subtle">{tasks.length} tasks · shared by {project.createdBy?.name}</span></div>
          </div>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto scroll-thin pb-4">
          {COLUMNS.map((col, i) => {
            const items = tasks.filter((t) => t.status === col.key).sort(byOrder);
            return (
              <motion.section key={col.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="w-[82vw] sm:w-[300px] xl:flex-1 flex-none rounded-2xl border border-line bg-surface-2/60">
                <header className="flex items-center gap-2 px-3.5 py-3 border-b border-line">
                  <StatusIcon status={col.key} size={15} />
                  <h3 className="text-sm font-semibold">{col.key}</h3>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-surface-3 text-muted">{items.length}</span>
                </header>
                <div className="p-2.5 space-y-2.5">
                  {items.length === 0 && <p className="text-xs text-subtle text-center py-8">Nothing here</p>}
                  {items.map((t) => <TaskCard key={t._id} task={t} readOnly />)}
                </div>
              </motion.section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
