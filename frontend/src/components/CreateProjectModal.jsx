import { useState } from 'react';
import toast from 'react-hot-toast';
import { FolderPlus } from 'lucide-react';
import api, { errorMessage } from '../api';
import Modal from './ui/Modal';
import MemberPicker from './MemberPicker';
import { PROJECT_COLORS } from '../lib/format';

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2.5">
      {Object.entries(PROJECT_COLORS).map(([key, color]) => (
        <button type="button" key={key} onClick={() => onChange(key)} aria-label={key} title={key}
          className={`w-8 h-8 rounded-full transition-transform ${value === key ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface ring-accent' : 'hover:scale-105'}`}
          style={{ background: color, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.25)' }} />
      ))}
    </div>
  );
}

export default function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: 'emerald', members: [] });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/projects', form);
      toast.success('Project created');
      onCreated(data);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the project'));
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg" title="New project" subtitle="Give it a name, a goal and a team." icon={<FolderPlus size={18} />}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="p-name">Name</label>
          <input id="p-name" data-autofocus required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Website relaunch" />
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Goal</label>
          <textarea id="p-desc" required maxLength={500} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" placeholder="What does done look like?" />
        </div>
        <div>
          <span className="label">Colour</span>
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </div>
        <div>
          <span className="label">Team</span>
          <MemberPicker value={form.members} onChange={(members) => setForm({ ...form, members })} />
          <p className="text-xs text-subtle mt-2">You are added automatically.</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Creating…' : 'Create project'}</button>
        </div>
      </form>
    </Modal>
  );
}
