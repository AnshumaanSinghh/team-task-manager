import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, FolderKanban, AlertTriangle, ArrowUpRight, ListTodo } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Tilt from '../components/ui/Tilt';
import { AvatarStack } from '../components/ui/Avatar';
import { Empty, Ring, Segmented } from '../components/ui/Bits';
import CreateProjectModal from '../components/CreateProjectModal';
import { PROJECT_COLORS, relTime } from '../lib/format';

const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'progress', label: 'Progress' },
  { value: 'risk', label: 'At risk' }
];

export default function Projects() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recent');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => setProjects([]));
  }, []);

  const shown = useMemo(() => {
    const list = (projects || []).filter((p) => !q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase()));
    const pct = (p) => (p.stats.total ? p.stats.completed / p.stats.total : 0);
    if (sort === 'progress') list.sort((a, b) => pct(b) - pct(a));
    if (sort === 'risk') list.sort((a, b) => b.stats.overdue - a.stats.overdue);
    return list;
  }, [projects, q, sort]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-7">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Projects</h1>
          <p className="text-muted mt-1">{projects ? `${projects.length} project${projects.length === 1 ? '' : 's'} you can see` : 'Loading…'}</p>
        </div>
        {isAdmin && <button type="button" onClick={() => setCreating(true)} className="btn btn-primary self-start"><Plus size={18} /> New project</button>}
      </div>

      {projects && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="input !pl-10" aria-label="Search projects" />
          </div>
          <Segmented id="project-sort" options={SORTS} value={sort} onChange={setSort} className="self-start" />
        </div>
      )}

      {projects === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 !rounded-2xl" />)}</div>
      ) : projects.length === 0 ? (
        <div className="card">
          <Empty icon={<FolderKanban size={26} />} title="No projects yet"
            action={isAdmin && <button type="button" onClick={() => setCreating(true)} className="btn btn-primary"><Plus size={16} /> Create the first project</button>}>
            {isAdmin ? 'Projects hold your board, team and deadlines. Start with one.' : 'An admin needs to add you to a project. It will appear here as soon as they do.'}
          </Empty>
        </div>
      ) : shown.length === 0 ? (
        <div className="card"><Empty icon={<Search size={24} />} title="No matches">Try a different search.</Empty></div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {shown.map((p, i) => {
              const pct = p.stats.total ? Math.round((p.stats.completed / p.stats.total) * 100) : 0;
              const color = PROJECT_COLORS[p.color] || PROJECT_COLORS.emerald;
              return (
                <motion.div key={p._id} layout initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i, 9) * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                  <Tilt as={Link} to={`/projects/${p._id}`} className="card block p-6 h-full group overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold truncate group-hover:text-accent-text transition-colors">{p.name}</h3>
                        <p className="text-sm text-muted line-clamp-2 mt-1 min-h-[40px]">{p.description}</p>
                      </div>
                      <Ring value={pct} size={58} stroke={6}><span className="text-xs font-bold font-mono">{pct}%</span></Ring>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="chip"><ListTodo size={11} /> {p.stats.total - p.stats.completed} open</span>
                      {p.stats.inProgress > 0 && <span className="chip chip-accent">{p.stats.inProgress} active</span>}
                      {p.stats.overdue > 0 && <span className="chip hazard"><AlertTriangle size={11} /> {p.stats.overdue} overdue</span>}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-line">
                      <AvatarStack people={p.members} max={4} />
                      <span className="text-xs text-subtle flex items-center gap-1">Updated {relTime(p.updatedAt)} <ArrowUpRight size={14} className="text-accent-text transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                    </div>
                  </Tilt>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {creating && <CreateProjectModal onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); navigate(`/projects/${p._id}`); }} />}
      </AnimatePresence>
    </div>
  );
}
