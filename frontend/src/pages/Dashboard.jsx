import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ListTodo, CheckCircle2, Eye, AlertTriangle, UserRound, Flame, Timer, TrendingUp, ArrowUpRight, CalendarClock, RotateCcw, FolderKanban } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Tilt from '../components/ui/Tilt';
import { AnimatedNumber, DeadlineChip, Empty, PriorityBars, Ring, StatusIcon } from '../components/ui/Bits';
import ActivityFeed from '../components/ActivityFeed';
import { deadlineState, firstName, fmtDate, PROJECT_COLORS } from '../lib/format';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

function StatTile({ label, value, icon: Icon, hint, emphasis }) {
  return (
    <motion.div variants={rise}>
      <Tilt className={`card p-5 h-full ${emphasis ? 'hazard-soft' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <span className={`w-10 h-10 rounded-xl grid place-items-center border ${emphasis ? 'bg-fg text-bg border-transparent' : 'bg-accent/12 text-accent-text border-accent/25'}`}><Icon size={19} /></span>
          {hint && <span className="text-[11px] text-subtle font-medium">{hint}</span>}
        </div>
        <p className="text-3xl font-bold font-display tabular-nums"><AnimatedNumber value={value} /></p>
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle mt-1">{label}</p>
      </Tilt>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="skeleton h-9 w-72 mb-2" />
      <div className="skeleton h-5 w-96 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-36 !rounded-2xl" />)}</div>
      <div className="grid lg:grid-cols-3 gap-5"><div className="skeleton h-72 lg:col-span-2 !rounded-2xl" /><div className="skeleton h-72 !rounded-2xl" /></div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  const fetchStats = () => api.get('/tasks/dashboard', { params: { tz: new Date().getTimezoneOffset() } })
    .then((r) => setStats(r.data))
    .catch(() => setError(true));
  useEffect(() => { fetchStats(); }, []);
  const load = () => {
    setError(false);
    fetchStats();
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  if (error) {
    return (
      <div className="max-w-xl mx-auto card mt-10">
        <Empty icon={<AlertTriangle size={24} />} title="Couldn't load your dashboard" action={<button type="button" onClick={load} className="btn btn-primary"><RotateCcw size={16} /> Try again</button>}>
          The server did not respond. Check your connection and try again.
        </Empty>
      </div>
    );
  }
  if (!stats) return <Skeleton />;

  const velocityTotal = stats.velocity.reduce((n, d) => n + d.count, 0);
  const chartData = stats.velocity.map((d) => ({ ...d, label: new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  const maxStatus = Math.max(1, ...stats.statusBreakdown.map((s) => s.value));

  return (
    <motion.div className="max-w-7xl mx-auto" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-text mb-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-3xl sm:text-4xl font-bold">{greeting}, <span className="text-gradient">{firstName(user?.name)}</span></h1>
          <p className="text-muted mt-1.5">
            {stats.overdue > 0
              ? `${stats.overdue} task${stats.overdue === 1 ? ' is' : 's are'} overdue across your projects.`
              : stats.total > 0 ? 'Nothing is overdue. Nice and steady.' : 'Create a project to get your team moving.'}
          </p>
        </div>
        <Link to="/projects" className="btn btn-invert self-start sm:self-auto"><FolderKanban size={16} /> Open projects</Link>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatTile label="Open tasks" value={stats.pending} icon={ListTodo} hint={`${stats.total} total`} />
        <StatTile label="Completed" value={stats.completed} icon={CheckCircle2} hint={`${stats.completionRate}%`} />
        <StatTile label="In review" value={stats.inReview} icon={Eye} />
        <StatTile label="Overdue" value={stats.overdue} icon={AlertTriangle} emphasis={stats.overdue > 0} />
        <StatTile label="Assigned to me" value={stats.myTasks} icon={UserRound} hint="open" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <motion.section variants={rise} className="card p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp size={17} className="text-accent-text" /> Team velocity</h3>
              <p className="text-xs text-subtle mt-0.5">Tasks completed per day, last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-display tabular-nums"><AnimatedNumber value={velocityTotal} /></p>
              <p className="text-[11px] text-subtle">shipped</p>
            </div>
          </div>
          <div className="h-56 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={palette.line} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.subtle }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: palette.subtle }} axisLine={false} tickLine={false} width={32} />
                <Tooltip cursor={{ stroke: palette.accent, strokeDasharray: '4 4' }}
                  contentStyle={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12, color: palette.fg, fontSize: 12 }}
                  labelStyle={{ color: palette.muted }} formatter={(v) => [v, 'Completed']} />
                <Area type="monotone" dataKey="count" stroke={palette.accent} strokeWidth={2.5} fill="url(#velocityFill)"
                  activeDot={{ r: 5, fill: palette.accent, stroke: palette.surface, strokeWidth: 2 }} animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={rise} className="card p-5 sm:p-6">
          <h3 className="font-semibold mb-5">Where work stands</h3>
          <div className="flex items-center gap-5 mb-6">
            <Ring value={stats.completionRate} size={104} stroke={10}>
              <div className="text-center">
                <p className="text-2xl font-bold font-display tabular-nums">{stats.completionRate}%</p>
                <p className="text-[10px] uppercase tracking-wider text-subtle">done</p>
              </div>
            </Ring>
            <div className="space-y-2 text-sm flex-1">
              {['High', 'Medium', 'Low'].map((p) => (
                <div key={p} className="flex items-center justify-between">
                  <PriorityBars priority={p} showLabel />
                  <span className="font-mono text-muted">{stats[`${p.toLowerCase()}Priority`]}</span>
                </div>
              ))}
              <p className="text-[11px] text-subtle pt-1">open, by priority</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.statusBreakdown.map((s, i) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-muted"><StatusIcon status={s.name} size={13} /> {s.name}</span>
                  <span className="font-mono">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: s.name === 'Completed' ? 'var(--accent)' : s.name === 'To Do' ? 'var(--line-strong)' : 'color-mix(in oklab, var(--accent) 55%, var(--fg))' }}
                    initial={{ width: 0 }} animate={{ width: `${(s.value / maxStatus) * 100}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <motion.section variants={rise} className="card p-5 sm:p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><CalendarClock size={17} className="text-accent-text" /> My next deadlines</h3>
          {stats.upcoming.length === 0 ? (
            <Empty title="Clear runway">Nothing of yours is due in the next 7 days.</Empty>
          ) : (
            <ul className="space-y-2">
              {stats.upcoming.map((t) => (
                <li key={t._id}>
                  <Link to={`/projects/${t.project?._id}?task=${t._id}`} className="lift flex items-center gap-3 p-3 rounded-xl border border-line bg-surface-2">
                    <StatusIcon status={t.status} size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-[11px] text-subtle truncate">{t.project?.name}</p>
                    </div>
                    <DeadlineChip state={deadlineState(t.deadline, t.status)} date={fmtDate(t.deadline)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section variants={rise} className="card p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
          <h3 className="font-semibold mb-5 relative">Your week</h3>
          <div className="grid grid-cols-2 gap-3 relative">
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <Flame size={18} className="text-accent-text mb-3" />
              <p className="text-3xl font-bold font-display tabular-nums"><AnimatedNumber value={stats.streak} /></p>
              <p className="text-xs text-subtle mt-0.5">day shipping streak</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <Timer size={18} className="text-accent-text mb-3" />
              <p className="text-3xl font-bold font-display tabular-nums"><AnimatedNumber value={stats.focusMinutesWeek} /></p>
              <p className="text-xs text-subtle mt-0.5">focus minutes (7d)</p>
            </div>
          </div>
          <div className="mt-5 relative">
            <p className="label">Projects</p>
            <div className="space-y-2.5">
              {stats.tasksByProject.length === 0 && <p className="text-sm text-subtle">No tasks yet.</p>}
              {stats.tasksByProject.slice(0, 4).map((p, i) => {
                const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1"><span className="truncate pr-3">{p.name}</span><span className="font-mono text-subtle">{p.completed}/{p.total}</span></div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: Object.values(PROJECT_COLORS)[i % 5] }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.08 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section variants={rise} className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Recent activity</h3>
            <Link to="/team" className="text-xs font-semibold text-accent-text flex items-center gap-1 hover:underline">Team <ArrowUpRight size={13} /></Link>
          </div>
          <div className="max-h-[330px] overflow-y-auto scroll-thin pr-1">
            <ActivityFeed items={stats.recentActivity} compact empty="Activity from your projects shows up here." />
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
