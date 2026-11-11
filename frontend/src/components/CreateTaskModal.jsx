import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ListPlus } from 'lucide-react';
import api, { errorMessage } from '../api';
import Modal from './ui/Modal';
import TagInput from './ui/TagInput';
import BlockerPicker from './BlockerPicker';
import { PriorityBars, Segmented } from './ui/Bits';
import { ESTIMATES, STATUSES, addDaysInput, nextWeekdayInput, toDateInput, toDeadlineISO } from '../lib/format';

export default function CreateTaskModal({ projectId, members, tasks = [], initialStatus = 'To Do', onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium', status: initialStatus, assignedTo: '',
    deadline: addDaysInput(3), estimate: 0, tags: [], blockedBy: []
  });
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const tagSuggestions = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags || []))].slice(0, 12), [tasks]);
  const quickDates = [
    ['Today', toDateInput(new Date())],
    ['Tomorrow', addDaysInput(1)],
    ['Friday', nextWeekdayInput(5)],
    ['Next week', addDaysInput(7)]
  ];

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/tasks', { ...form, projectId, assignedTo: form.assignedTo || null, deadline: toDeadlineISO(form.deadline) });
      toast.success('Task created');
      onCreated(data);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the task'));
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg" title="New task" subtitle="Tip: Quick Add on the board turns one sentence into a task." icon={<ListPlus size={18} />}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="t-title">Title</label>
          <input id="t-title" data-autofocus required maxLength={200} value={form.title} onChange={(e) => set({ title: e.target.value })} className="input !text-base" placeholder="Design the onboarding checklist" />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Details <span className="normal-case tracking-normal font-normal">(optional, Markdown works)</span></label>
          <textarea id="t-desc" rows={3} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} className="input resize-none" placeholder="Context, acceptance criteria, links…" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <span className="label">Priority</span>
            <Segmented id="new-priority" value={form.priority} onChange={(priority) => set({ priority })}
              options={['Low', 'Medium', 'High'].map((p) => ({ value: p, label: p, icon: <PriorityBars priority={p} /> }))} />
          </div>
          <div>
            <label className="label" htmlFor="t-assignee">Owner</label>
            <select id="t-assignee" value={form.assignedTo} onChange={(e) => set({ assignedTo: e.target.value })} className="input">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="t-deadline">Due date</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="t-deadline" type="date" required min={toDateInput(new Date())} value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} className="input sm:!w-48 font-mono" />
            <div className="flex flex-wrap gap-1.5">
              {quickDates.map(([label, value]) => (
                <button type="button" key={label} onClick={() => set({ deadline: value })} className={`chip !py-1.5 !px-2.5 transition-colors ${form.deadline === value ? 'chip-accent' : 'hover:text-fg'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setMore((v) => !v)} className="text-sm font-semibold text-accent-text hover:underline">
          {more ? 'Hide' : 'Show'} status, estimate, tags and blockers
        </button>

        {more && (
          <div className="space-y-5 animate-rise">
            <div>
              <span className="label">Column</span>
              <Segmented id="new-status" value={form.status} onChange={(status) => set({ status })} options={STATUSES.filter((s) => s !== 'Completed')} size="sm" />
            </div>
            <div>
              <span className="label">Estimate (story points)</span>
              <div className="flex flex-wrap gap-1.5">
                {ESTIMATES.map((n) => (
                  <button type="button" key={n} onClick={() => set({ estimate: n })}
                    className={`w-10 h-9 rounded-lg font-mono text-sm border transition-all ${form.estimate === n ? 'bg-accent text-accent-ink border-accent shadow-[0_3px_0_0_var(--accent-edge)]' : 'border-line bg-surface-2 hover:border-line-strong'}`}>
                    {n || '–'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Tags</span>
              <TagInput value={form.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} />
            </div>
            <div>
              <span className="label">Blocked by</span>
              <BlockerPicker tasks={tasks} value={form.blockedBy} onChange={(blockedBy) => set({ blockedBy })} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" disabled={loading || !form.title.trim()} className="btn btn-primary">{loading ? 'Creating…' : 'Create task'}</button>
        </div>
      </form>
    </Modal>
  );
}
