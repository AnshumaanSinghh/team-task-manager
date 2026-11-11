import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Timer, AlertTriangle, CheckCircle2, Heart, Coffee, Radio, ListTodo, Gauge } from 'lucide-react';
import api from '../api';
import Tilt from '../components/ui/Tilt';
import Avatar from '../components/ui/Avatar';
import { AnimatedNumber, Empty } from '../components/ui/Bits';
import StandupModal from '../components/StandupModal';
import { fmtClock } from '../lib/format';

const LOAD = {
  light: { label: 'Has capacity', pct: 30 },
  balanced: { label: 'Balanced', pct: 62 },
  heavy: { label: 'Overloaded', pct: 100 }
};

function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function Team() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [result, setResult] = useState({ key: null, data: null });
  const data = result.key === projectId ? result.data : null;
  const [standup, setStandup] = useState(false);
  const now = useNow(Boolean(data?.totals.focusingNow));

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    api.get('/team/workload', { params: projectId ? { projectId } : {} })
      .then((r) => setResult({ key: projectId, data: r.data }))
      .catch(() => setResult({ key: projectId, data: { members: [], totals: {} } }));
  }, [projectId]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const live = data?.members.filter((m) => m.focus) || [];
  const selectedProject = projects.find((p) => p._id === projectId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Team</h1>
          <p className="text-muted mt-1">Who is working on what, who has room, and who needs help.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input !w-auto min-w-[200px]" aria-label="Project">
            <option value="">All my projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button type="button" onClick={() => setStandup(true)} disabled={!projectId} className="btn btn-primary" title={projectId ? '' : 'Pick a project first'}>
            <Coffee size={16} /> Standup
          </button>
        </div>
      </div>

      {!data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 !rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'People', value: data.totals.members, icon: Users },
              { label: 'Focusing now', value: data.totals.focusingNow, icon: Radio, live: data.totals.focusingNow > 0 },
              { label: 'Open tasks', value: data.totals.open, icon: ListTodo },
              { label: 'Shipped this week', value: data.totals.completed7d, icon: CheckCircle2 }
            ].map(({ label, value, icon: Icon, live: isLive }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl grid place-items-center bg-accent/12 text-accent-text border border-accent/25 relative">
                  <Icon size={18} />
                  {isLive && <span className="absolute -top-1 -right-1"><span className="live-dot block" /></span>}
                </span>
                <div>
                  <p className="text-2xl font-bold font-display tabular-nums leading-none"><AnimatedNumber value={value || 0} /></p>
                  <p className="text-[11px] text-subtle uppercase tracking-wider font-semibold mt-1">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {live.length > 0 && (
              <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                <p className="label flex items-center gap-2"><span className="live-dot" /> Live now</p>
                <div className="flex gap-3 overflow-x-auto scroll-thin pb-2">
                  {live.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] pl-2 pr-4 py-2 flex-none">
                      <Avatar name={m.name} size="lg" live />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-muted truncate max-w-[220px]">{m.focus.task?.title}</p>
                      </div>
                      <span className="font-mono text-sm text-accent-text tabular-nums">{fmtClock(new Date(m.focus.endsAt).getTime() - now)}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {data.members.length === 0 ? (
            <div className="card"><Empty icon={<Users size={24} />} title="No teammates yet">Join or create a project to see your team here.</Empty></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.members.map((m, i) => {
                const load = LOAD[m.load];
                return (
                  <motion.div key={m._id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 9) * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                    <Tilt className={`card p-5 h-full ${m.load === 'heavy' ? 'hazard-soft' : ''}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar name={m.name} size="lg" live={Boolean(m.focus)} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{m.name}</p>
                          <p className="text-xs text-subtle truncate">{m.role} · {m.email}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1.5 font-semibold"><Gauge size={13} className="text-accent-text" /> {load.label}</span>
                          <span className="font-mono text-subtle">{m.openPoints}pt open</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: m.load === 'heavy' ? 'var(--fg)' : 'var(--accent)' }}
                            initial={{ width: 0 }} animate={{ width: `${load.pct}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center mb-4">
                        {[['Open', m.open], ['Active', m.active], ['Overdue', m.overdue], ['To do', m.todo]].map(([label, value]) => (
                          <div key={label} className={`rounded-lg border py-2 ${label === 'Overdue' && value > 0 ? 'bg-fg text-bg border-transparent' : 'border-line bg-surface-2'}`}>
                            <p className="font-bold font-mono">{value}</p>
                            <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="chip"><CheckCircle2 size={11} /> {m.completed7d} shipped</span>
                        <span className="chip"><Timer size={11} /> {m.focusMinutes7d}m focus</span>
                        {m.kudos7d > 0 && <span className="chip chip-accent"><Heart size={11} className="fill-current" /> {m.kudos7d} kudos</span>}
                        {m.overdue > 0 && <span className="chip hazard"><AlertTriangle size={11} /> needs help</span>}
                      </div>

                      {m.focus && (
                        <div className="mt-4 rounded-xl bg-accent text-accent-ink px-3 py-2 text-xs font-semibold flex items-center gap-2">
                          <Timer size={13} /> <span className="truncate flex-1">{m.focus.task?.title}</span>
                          <span className="font-mono">{fmtClock(new Date(m.focus.endsAt).getTime() - now)}</span>
                        </div>
                      )}
                    </Tilt>
                  </motion.div>
                );
              })}
            </div>
          )}
          {selectedProject && (
            <p className="text-xs text-subtle mt-6">Showing workload for <Link to={`/projects/${selectedProject._id}`} className="text-accent-text font-semibold hover:underline">{selectedProject.name}</Link>. Weekly numbers cover the last 7 days.</p>
          )}
        </>
      )}

      <AnimatePresence>
        {standup && selectedProject && <StandupModal projectId={selectedProject._id} projectName={selectedProject.name} onClose={() => setStandup(false)} />}
      </AnimatePresence>
    </div>
  );
}
