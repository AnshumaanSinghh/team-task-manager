import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Search, Zap, Wand2, Settings2, Coffee, History, Download, Activity, X,
  Columns3, List, CalendarDays, CornerDownLeft, Share2
} from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFocus } from '../context/FocusContext';
import { useHotkeys } from '../lib/useHotkeys';
import { celebrate } from '../lib/confetti';
import { COLUMNS, PROJECT_COLORS, byOrder, downloadCsv, fmtDate, isMine, openBlockers, taskOrder } from '../lib/format';
import { AvatarStack } from '../components/ui/Avatar';
import { PriorityBars, Segmented } from '../components/ui/Bits';
import KanbanBoard from '../components/board/KanbanBoard';
import ListView from '../components/board/ListView';
import CalendarView from '../components/board/CalendarView';
import ProjectPulse from '../components/ProjectPulse';
import ActivityFeed from '../components/ActivityFeed';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import AIPlannerModal from '../components/AIPlannerModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import StandupModal from '../components/StandupModal';
import GhostPlayback from '../components/GhostPlayback';

const VIEWS = [
  { value: 'board', label: 'Board', icon: <Columns3 size={14} /> },
  { value: 'list', label: 'List', icon: <List size={14} /> },
  { value: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} /> }
];

const readView = () => {
  try {
    return localStorage.getItem('taskflow:view') || 'board';
  } catch {
    return 'board';
  }
};

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { focus } = useFocus();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [view, setViewState] = useState(readView);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [owner, setOwner] = useState('all');
  const [tag, setTag] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [modal, setModal] = useState(null);
  const [createStatus, setCreateStatus] = useState('To Do');
  const [quick, setQuick] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const searchRef = useRef(null);
  const quickRef = useRef(null);
  const dragging = useRef(false);

  const setView = (v) => {
    setViewState(v);
    try { localStorage.setItem('taskflow:view', v); } catch { /* ignore */ }
  };

  const loadTasks = useCallback(async () => {
    const { data } = await api.get('/tasks', { params: { projectId: id } });
    setTasks(data);
  }, [id]);

  const loadActivity = useCallback(() => {
    api.get(`/projects/${id}/activity`, { params: { limit: 60 } }).then((r) => setActivities(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get(`/projects/${id}`), api.get('/tasks', { params: { projectId: id } })])
      .then(([p, t]) => {
        if (!alive) return;
        setProject(p.data);
        setTasks(t.data);
      })
      .catch((error) => {
        if (!alive) return;
        toast.error(errorMessage(error, 'Could not open this project'));
        navigate('/projects', { replace: true });
      });
    return () => { alive = false; };
  }, [id, navigate]);

  useEffect(() => { if (activityOpen) loadActivity(); }, [activityOpen, loadActivity, tasks]);

  // Live refresh: poll while visible, and react to changes made elsewhere (focus sessions etc.)
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && !dragging.current) loadTasks().catch(() => {});
    };
    const intervalId = setInterval(tick, 20000);
    const onChange = () => loadTasks().catch(() => {});
    window.addEventListener('taskflow:task-changed', onChange);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('taskflow:task-changed', onChange);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadTasks]);

  const selectedId = params.get('task');
  const selected = tasks?.find((t) => t._id === selectedId) || null;
  const openTask = (t) => setParams((p) => { p.set('task', t._id); return p; });
  const closeTask = () => setParams((p) => { p.delete('task'); return p; });

  useEffect(() => {
    if (tasks && selectedId && !selected) closeTask();
  }, [tasks, selectedId, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsert = (task) => {
    setTasks((ts) => {
      const keep = ts.find((t) => t._id === task._id);
      const merged = keep ? { ...task, projectId: keep.projectId } : task;
      return keep ? ts.map((t) => (t._id === task._id ? merged : t)) : [...ts, merged];
    });
    setPulseKey((k) => k + 1);
  };

  const members = project?.members || [];
  const allTags = useMemo(() => [...new Set((tasks || []).flatMap((t) => t.tags || []))].sort(), [tasks]);

  const filtered = useMemo(() => (tasks || []).filter((t) => {
    if (priority && t.priority !== priority) return false;
    if (owner === 'me' && !isMine(t, user)) return false;
    if (owner === 'none' && t.assignedTo) return false;
    if (tag && !(t.tags || []).includes(tag)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${t.title} ${t.description} ${(t.tags || []).join(' ')} ${t.assignedTo?.name || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tasks, priority, owner, tag, search, user]);

  const filtersOn = priority || owner !== 'all' || tag || search;

  const moveTask = async (task, status, order) => {
    if (status === 'Completed' && task.status !== 'Completed') {
      const waiting = openBlockers(task, tasks);
      if (waiting.length) {
        toast.error(`Blocked by "${waiting[0].title}"${waiting.length > 1 ? ` and ${waiting.length - 1} more` : ''}. Finish ${waiting.length === 1 ? 'it' : 'them'} first.`);
        return;
      }
    }
    const before = tasks;
    const col = COLUMNS.find((c) => c.key === status);
    const limit = col?.wip ? project.wipLimits?.[col.wip] || 0 : 0;
    if (status !== task.status && limit && tasks.filter((t) => t.status === status).length >= limit) {
      toast(`${status} is over its WIP limit of ${limit}`, { icon: '⚠️' });
    }
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status, ...(order !== undefined ? { order } : {}) } : t)));
    if (status === 'Completed' && task.status !== 'Completed') celebrate();
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status, ...(order !== undefined ? { order } : {}) });
      upsert(data);
    } catch (error) {
      setTasks(before);
      toast.error(errorMessage(error, 'Could not move the task'));
    }
  };

  const onDragEnd = ({ destination, source, draggableId }) => {
    dragging.current = false;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const task = tasks.find((t) => t._id === draggableId);
    const column = filtered.filter((t) => t.status === destination.droppableId && t._id !== draggableId).sort(byOrder);
    const prev = column[destination.index - 1];
    const next = column[destination.index];
    let order;
    if (prev && next) order = (taskOrder(prev) + taskOrder(next)) / 2;
    else if (prev) order = taskOrder(prev) + 1024;
    else if (next) order = taskOrder(next) - 1024;
    else order = Date.now();
    moveTask(task, destination.droppableId, order);
  };

  const submitQuick = async (e) => {
    e.preventDefault();
    if (!quick.trim() || quickBusy) return;
    setQuickBusy(true);
    try {
      const { data } = await api.post('/tasks/ai-create', { prompt: quick, projectId: id, tzOffset: new Date().getTimezoneOffset() });
      upsert(data.task);
      setQuick('');
      const t = data.task;
      const bits = [t.assignedTo ? `for ${t.assignedTo.name.split(' ')[0]}` : null, `due ${fmtDate(t.deadline, { weekday: 'short', month: 'short', day: 'numeric' })}`, t.priority === 'High' ? 'high priority' : null].filter(Boolean);
      toast.success(`Added “${t.title}” ${bits.join(', ')}`, { duration: 4500 });
      if (data.summary.assigneeName && !data.summary.assigneeMatched) {
        toast(`No project member called “${data.summary.assigneeName}”, so it is unassigned.`, { icon: 'ℹ️', duration: 5000 });
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Quick Add failed'));
    } finally {
      setQuickBusy(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    downloadCsv(`${project.name.replace(/[^\w-]+/g, '_')}_tasks.csv`, [
      ['Title', 'Description', 'Status', 'Priority', 'Owner', 'Deadline', 'Estimate', 'Tags', 'Time logged (min)', 'Blocked by'],
      ...filtered.map((t) => [
        t.title, t.description, t.status, t.priority, t.assignedTo?.name || 'Unassigned', new Date(t.deadline).toLocaleDateString(),
        t.estimate || '', (t.tags || []).join(' '), Math.round((t.timeSpent || 0) / 60),
        openBlockers(t, tasks).map((b) => b.title).join('; ')
      ])
    ]);
    toast.success(`Exported ${filtered.length} task${filtered.length === 1 ? '' : 's'}`);
    return undefined;
  };

  const openCreate = (status = 'To Do') => {
    setCreateStatus(status);
    setModal('create');
  };

  useHotkeys({
    n: () => isAdmin && openCreate(),
    q: () => isAdmin && quickRef.current?.focus(),
    '/': () => searchRef.current?.focus(),
    1: () => setView('board'),
    2: () => setView('list'),
    3: () => setView('calendar'),
    a: () => setActivityOpen((v) => !v)
  }, Boolean(project));

  if (!project || !tasks) {
    return (
      <div className="max-w-[1500px] mx-auto">
        <div className="skeleton h-10 w-80 mb-3" />
        <div className="skeleton h-5 w-[28rem] max-w-full mb-6" />
        <div className="skeleton h-[74px] !rounded-2xl mb-5" />
        <div className="flex gap-4 overflow-hidden">{COLUMNS.map((c) => <div key={c.key} className="skeleton h-[420px] w-[300px] flex-none !rounded-2xl" />)}</div>
      </div>
    );
  }

  const color = PROJECT_COLORS[project.color] || PROJECT_COLORS.emerald;

  return (
    <div className="max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end gap-4 mb-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/projects" className="btn btn-icon btn-sm mt-1" aria-label="Back to projects"><ArrowLeft size={16} /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full flex-none" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{project.name}</h1>
            </div>
            <p className="text-muted text-sm mt-1 line-clamp-2 max-w-3xl">{project.description}</p>
            <div className="flex items-center gap-3 mt-2.5">
              <AvatarStack people={members} max={6} />
              <span className="text-xs text-subtle">{members.length} member{members.length === 1 ? '' : 's'} · {tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button type="button" onClick={() => setModal('standup')} className="btn btn-sm"><Coffee size={14} /> Standup</button>
          <button type="button" onClick={() => setModal('playback')} className="btn btn-sm"><History size={14} /> Playback</button>
          <button type="button" onClick={exportCsv} className="btn btn-sm"><Download size={14} /> CSV</button>
          {isAdmin && <button type="button" onClick={() => setModal('share')} className="btn btn-sm"><Share2 size={14} /> Share</button>}
          {isAdmin && <button type="button" onClick={() => setModal('settings')} className="btn btn-sm btn-icon" aria-label="Project settings" title="Settings"><Settings2 size={15} /></button>}
          {isAdmin && <button type="button" onClick={() => setModal('planner')} className="btn btn-sm btn-invert"><Wand2 size={14} /> AI Planner</button>}
          {isAdmin && <button type="button" onClick={() => openCreate()} className="btn btn-sm btn-primary"><Plus size={15} /> New task</button>}
        </div>
      </div>

      {/* Quick add */}
      {isAdmin && (
        <form onSubmit={submitQuick} className="relative mb-5 group">
          <Zap size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${quick ? 'text-accent' : 'text-subtle'}`} />
          <input ref={quickRef} value={quick} onChange={(e) => setQuick(e.target.value)} disabled={quickBusy} maxLength={500}
            placeholder="Quick add: “Design pricing page by Friday @riya #design 3pts urgent”"
            className="input !h-12 !pl-11 !pr-28 sm:!pr-36 !rounded-2xl !text-[0.92rem]" aria-label="Quick add a task" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="hidden sm:inline kbd">Q</span>
            <button type="submit" disabled={!quick.trim() || quickBusy} className="btn btn-primary btn-sm !mb-0">
              {quickBusy ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><CornerDownLeft size={13} /> Add</>}
            </button>
          </div>
        </form>
      )}

      <ProjectPulse projectId={id} refreshKey={pulseKey} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <Segmented id="view" options={VIEWS} value={view} onChange={setView} />
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter tasks" className="input !py-2 !pl-9 !pr-9" aria-label="Filter tasks" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 kbd hidden sm:inline-block">/</span>
        </div>
        <Segmented id="owner" size="sm" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'Everyone' }, { value: 'me', label: 'Mine' }, { value: 'none', label: 'Unassigned' }]} />
        <Segmented id="prio" size="sm" value={priority} onChange={setPriority}
          options={[{ value: '', label: 'Any' }, ...['High', 'Medium', 'Low'].map((p) => ({ value: p, label: p, icon: <PriorityBars priority={p} /> }))]} />
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="input !w-auto !py-2 !text-xs" aria-label="Filter by tag">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        {filtersOn && (
          <button type="button" onClick={() => { setSearch(''); setPriority(''); setOwner('all'); setTag(''); }} className="text-xs font-semibold text-accent-text flex items-center gap-1 hover:underline">
            <X size={13} /> Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-subtle font-mono">{filtered.length}/{tasks.length}</span>
        <button type="button" onClick={() => setActivityOpen((v) => !v)} className={`btn btn-sm ${activityOpen ? 'btn-primary' : ''}`} aria-pressed={activityOpen}><Activity size={14} /> Activity</button>
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              {view === 'board' && (
                <KanbanBoard tasks={filtered} allTasks={tasks} wipLimits={project.wipLimits} focusTaskId={focus?.task?._id}
                  onDragStart={() => { dragging.current = true; }} onDragEnd={onDragEnd} onOpen={openTask} onAdd={openCreate} canAdd={isAdmin} />
              )}
              {view === 'list' && <ListView tasks={filtered} allTasks={tasks} onOpen={openTask} onStatus={(t, s) => moveTask(t, s)} />}
              {view === 'calendar' && <CalendarView tasks={filtered} onOpen={openTask} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {activityOpen && (
            <motion.aside initial={{ opacity: 0, x: 40, width: 0 }} animate={{ opacity: 1, x: 0, width: 320 }} exit={{ opacity: 0, x: 40, width: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="hidden lg:block flex-none overflow-hidden">
              <div className="card w-[320px] p-4 max-h-[calc(100vh-230px)] overflow-y-auto scroll-thin">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Activity size={15} className="text-accent-text" /> Activity</h3>
                  <button type="button" onClick={() => setActivityOpen(false)} className="btn btn-ghost btn-icon btn-sm" aria-label="Close activity"><X size={15} /></button>
                </div>
                <ActivityFeed items={activities} compact />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Activity on small screens */}
      <AnimatePresence>
        {activityOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden card p-4 mt-4 overflow-hidden">
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            <ActivityFeed items={activities.slice(0, 20)} compact />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <TaskDetailsModal key={selected._id} task={selected} tasks={tasks} members={members} onClose={closeTask}
            onChange={upsert} onDelete={(tid) => { setTasks((ts) => ts.filter((t) => t._id !== tid)); closeTask(); setPulseKey((k) => k + 1); }} />
        )}
        {modal === 'create' && (
          <CreateTaskModal projectId={id} members={members} tasks={tasks} initialStatus={createStatus} onClose={() => setModal(null)}
            onCreated={(t) => { upsert(t); setModal(null); }} />
        )}
        {modal === 'planner' && <AIPlannerModal projectId={id} onClose={() => setModal(null)} onCreated={() => { setModal(null); loadTasks(); setPulseKey((k) => k + 1); }} />}
        {(modal === 'settings' || modal === 'share') && (
          <ProjectSettingsModal project={project} initialTab={modal === 'share' ? 'sharing' : 'general'} onClose={() => setModal(null)}
            onSaved={(p) => { setProject(p); setModal(null); }} onDeleted={() => navigate('/projects', { replace: true })} />
        )}
        {modal === 'standup' && <StandupModal projectId={id} projectName={project.name} onClose={() => setModal(null)} />}
        {modal === 'playback' && <GhostPlayback projectId={id} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
