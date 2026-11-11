import { useState } from 'react';
import toast from 'react-hot-toast';
import { Settings2, Copy, Link2, Trash2, Ban } from 'lucide-react';
import api, { errorMessage } from '../api';
import Modal from './ui/Modal';
import MemberPicker from './MemberPicker';
import { ColorPicker } from './CreateProjectModal';
import { Segmented } from './ui/Bits';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'members', label: 'Members' },
  { value: 'board', label: 'Board' },
  { value: 'sharing', label: 'Sharing' },
  { value: 'danger', label: 'Delete' }
];

export default function ProjectSettingsModal({ project, initialTab = 'general', onClose, onSaved, onDeleted }) {
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    color: project.color || 'emerald',
    members: project.members.map((m) => m._id),
    wipLimits: { todo: 0, inProgress: 0, inReview: 0, ...(project.wipLimits || {}) }
  });
  const [shareId, setShareId] = useState(project.shareId || null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState('');

  const shareUrl = shareId ? `${window.location.origin}/public/${shareId}` : '';

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/projects/${project._id}`, form);
      toast.success('Project updated');
      onSaved(data);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save changes'));
    } finally {
      setSaving(false);
    }
  };

  const createLink = async () => {
    try {
      const { data } = await api.post(`/projects/${project._id}/share`);
      setShareId(data.shareId);
      await navigator.clipboard?.writeText(`${window.location.origin}/public/${data.shareId}`).catch(() => {});
      toast.success('Public link created and copied');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create a link'));
    }
  };

  const revokeLink = async () => {
    try {
      await api.delete(`/projects/${project._id}/share`);
      setShareId(null);
      toast.success('Link revoked. The old URL no longer works.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not revoke the link'));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/projects/${project._id}`);
      toast.success('Project deleted');
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete the project'));
    }
  };

  const wipField = (key, label) => (
    <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-line bg-surface-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-subtle">{form.wipLimits[key] ? `Warn above ${form.wipLimits[key]} tasks` : 'No limit'}</p>
      </div>
      <input type="number" min={0} max={99} value={form.wipLimits[key]} aria-label={`${label} limit`}
        onChange={(e) => setForm({ ...form, wipLimits: { ...form.wipLimits, [key]: Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)) } })}
        className="input !w-20 text-center font-mono" />
    </div>
  );

  return (
    <Modal onClose={onClose} size="lg" title="Project settings" subtitle={project.name} icon={<Settings2 size={18} />}>
      <div className="overflow-x-auto scroll-thin -mx-1 px-1 pb-1 mb-5">
        <Segmented id="settings-tabs" options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'general' && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="s-name">Name</label>
            <input id="s-name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="s-desc">Goal</label>
            <textarea id="s-desc" rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" />
          </div>
          <div>
            <span className="label">Colour</span>
            <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </div>
        </div>
      )}

      {tab === 'members' && (
        <MemberPicker value={form.members} onChange={(members) => setForm({ ...form, members })} lockedId={project.createdBy?._id} />
      )}

      {tab === 'board' && (
        <div className="space-y-3">
          <p className="text-sm text-muted mb-1">Work-in-progress limits keep the team finishing work before starting more. Columns over their limit get a striped warning.</p>
          {wipField('todo', 'To Do')}
          {wipField('inProgress', 'In Progress')}
          {wipField('inReview', 'In Review')}
        </div>
      )}

      {tab === 'sharing' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Anyone with the link sees a read-only board: titles, status, priority, deadlines and assignee names. Emails, comments and time logs stay private.</p>
          {shareId ? (
            <>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="input font-mono !text-xs" onFocus={(e) => e.target.select()} />
                <button type="button" className="btn btn-icon" aria-label="Copy link" onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => toast.success('Copied'))}><Copy size={16} /></button>
              </div>
              <button type="button" onClick={revokeLink} className="btn btn-invert"><Ban size={16} /> Revoke link</button>
            </>
          ) : (
            <button type="button" onClick={createLink} className="btn btn-primary"><Link2 size={16} /> Create public link</button>
          )}
        </div>
      )}

      {tab === 'danger' && (
        <div className="rounded-xl hazard border p-4 space-y-3">
          <p className="text-sm font-semibold">Delete this project permanently</p>
          <p className="text-sm text-muted">All tasks, comments and activity in <b className="text-fg">{project.name}</b> are removed. This cannot be undone.</p>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" placeholder={`Type "${project.name}" to confirm`} aria-label="Confirm project name" />
          <button type="button" disabled={confirm !== project.name} onClick={remove} className="btn btn-invert"><Trash2 size={16} /> Delete project</button>
        </div>
      )}

      {['general', 'members', 'board'].includes(tab) && (
        <div className="flex justify-end gap-3 pt-6">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="button" onClick={save} disabled={saving || !form.name.trim() || !form.description.trim()} className="btn btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </Modal>
  );
}
