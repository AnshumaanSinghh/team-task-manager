import { useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Wand2, Check, ArrowLeft, Sparkles } from 'lucide-react';
import api, { errorMessage } from '../api';
import Modal from './ui/Modal';
import { PriorityBars } from './ui/Bits';
import { celebrateBig } from '../lib/confetti';

const EXAMPLES = [
  'Relaunch our marketing website before the holiday sale',
  'Ship the mobile app MVP to the app stores',
  'Hire a senior backend engineer',
  'Run a two-day team offsite in Goa'
];

export default function AIPlannerModal({ projectId, onClose, onCreated }) {
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const generate = async (e) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/tasks/ai-plan', { prompt, projectId });
      setPlan(data);
      setSelected(data.tasks.map((_, i) => i));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not build a plan'));
    } finally {
      setLoading(false);
    }
  };

  const edit = (i, patch) => setPlan((p) => ({ ...p, tasks: p.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

  const create = async () => {
    setCreating(true);
    try {
      const tasks = plan.tasks.filter((_, i) => selected.includes(i));
      const { data } = await api.post('/tasks/bulk', { projectId, tasks, tzOffset: new Date().getTimezoneOffset() });
      celebrateBig();
      toast.success(`${data.created} tasks added to the board`);
      onCreated();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the tasks'));
      setCreating(false);
    }
  };

  return (
    <Modal onClose={onClose} size="xl" dismissable={!loading && !creating} title="AI Planner" icon={<Wand2 size={18} />}
      subtitle={plan ? 'Review the plan, edit anything, then add it to the board.' : 'Describe a goal. Get a plan of tasks with estimates, checklists and dates.'}>
      <AnimatePresence mode="wait">
        {!plan ? (
          <motion.form key="prompt" onSubmit={generate} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <textarea data-autofocus rows={4} maxLength={1000} value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={loading}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(e); }}
              className="input resize-none !text-base" placeholder="What are you trying to get done?" aria-label="Goal" />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button type="button" key={ex} onClick={() => setPrompt(ex)} className="chip !py-1.5 !px-3 hover:border-accent hover:text-accent-text transition-colors">{ex}</button>
              ))}
            </div>
            {loading ? (
              <div className="relative h-28 rounded-2xl border border-accent/30 bg-accent/[0.05] overflow-hidden grid place-items-center">
                <motion.div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent/25 to-transparent" animate={{ x: ['-120%', '320%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} />
                <p className="relative text-sm font-semibold text-accent-text flex items-center gap-2"><Sparkles size={16} className="animate-pulse" /> Breaking the goal into tasks…</p>
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn">Cancel</button>
                <button type="submit" disabled={!prompt.trim()} className="btn btn-primary"><Wand2 size={16} /> Build plan</button>
              </div>
            )}
          </motion.form>
        ) : (
          <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <button type="button" onClick={() => setPlan(null)} className="btn btn-sm btn-ghost"><ArrowLeft size={15} /> Change goal</button>
              <span className="chip chip-accent">{plan.source === 'templates' ? 'Built-in playbook' : `Planned with ${plan.source}`}</span>
            </div>
            <ul className="space-y-2 max-h-[52vh] overflow-y-auto scroll-thin pr-1">
              {plan.tasks.map((t, i) => {
                const on = selected.includes(i);
                return (
                  <motion.li key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`flex gap-3 p-3.5 rounded-xl border transition-colors ${on ? 'border-accent/40 bg-accent/[0.05]' : 'border-line opacity-60'}`}>
                    <button type="button" onClick={() => setSelected((s) => (on ? s.filter((x) => x !== i) : [...s, i]))} aria-label={on ? 'Exclude task' : 'Include task'}
                      className={`mt-1 w-5 h-5 rounded-md grid place-items-center border flex-none ${on ? 'bg-accent border-accent text-accent-ink' : 'border-line-strong'}`}>
                      {on && <Check size={13} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <input value={t.title} onChange={(e) => edit(i, { title: e.target.value })} className="w-full bg-transparent font-semibold text-sm outline-none rounded px-1 -mx-1 hover:bg-surface-2 focus:bg-surface-2" aria-label="Task title" />
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{t.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <PriorityBars priority={t.priority} showLabel />
                        {t.estimate > 0 && <span className="chip font-mono">{t.estimate}pt</span>}
                        <span className="chip font-mono">due in {t.dueInDays}d</span>
                        {t.subtasks?.length > 0 && <span className="chip">{t.subtasks.length} checklist items</span>}
                        {t.tags?.map((tag) => <span key={tag} className="text-[11px] text-accent-text font-semibold">#{tag}</span>)}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-3 pt-5">
              <button type="button" onClick={onClose} className="btn">Cancel</button>
              <button type="button" onClick={create} disabled={creating || selected.length === 0} className="btn btn-primary">
                {creating ? 'Adding…' : `Add ${selected.length} task${selected.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
