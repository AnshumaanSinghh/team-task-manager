import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Coffee, Copy, CheckCircle2, CircleDot, Lock } from 'lucide-react';
import api, { errorMessage } from '../api';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import { Segmented } from './ui/Bits';

const WINDOWS = [{ value: 24, label: '24h' }, { value: 72, label: '3 days' }, { value: 168, label: 'Week' }];

function Row({ icon: Icon, label, items, empty, strong }) {
  return (
    <div className="flex gap-2.5 text-sm">
      <Icon size={15} className={`mt-0.5 flex-none ${strong ? 'text-fg' : 'text-accent-text'}`} />
      <div className="min-w-0">
        <span className="font-semibold">{label}: </span>
        {items.length ? <span className="text-muted">{items.join('; ')}</span> : <span className="text-subtle">{empty}</span>}
      </div>
    </div>
  );
}

export default function StandupModal({ projectId, projectName, onClose }) {
  const [hours, setHours] = useState(new Date().getDay() === 1 ? 72 : 24);
  const [result, setResult] = useState({ hours: null, data: null });
  const data = result.hours === hours ? result.data : null;

  useEffect(() => {
    api.get(`/projects/${projectId}/standup`, { params: { hours } })
      .then((r) => setResult({ hours, data: r.data }))
      .catch((e) => toast.error(errorMessage(e, 'Could not build the standup')));
  }, [projectId, hours]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.markdown);
      toast.success('Standup copied. Paste it into Slack or email.');
    } catch {
      toast.error('Clipboard is not available here');
    }
  };

  return (
    <Modal onClose={onClose} size="lg" title="Async standup" subtitle={`${projectName}: generated from the board, no meeting needed`} icon={<Coffee size={18} />}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Segmented id="standup-window" options={WINDOWS} value={hours} onChange={setHours} size="sm" />
        <button type="button" onClick={copy} disabled={!data} className="btn btn-primary btn-sm"><Copy size={14} /> Copy as Markdown</button>
      </div>
      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 !rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3 max-h-[58vh] overflow-y-auto scroll-thin pr-1">
          {data.members.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <Avatar name={m.name} size="md" />
                <span className="font-semibold">{m.name}</span>
                {m.blockers.length > 0 && <span className="chip hazard ml-auto"><Lock size={10} /> {m.blockers.length} blocker{m.blockers.length === 1 ? '' : 's'}</span>}
              </div>
              <div className="space-y-1.5">
                <Row icon={CheckCircle2} label="Done" items={m.done} empty="Nothing completed" />
                <Row icon={CircleDot} label="Doing" items={m.doing} empty="Nothing in progress" />
                <Row icon={Lock} label="Blockers" items={m.blockers} empty="None" strong />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Modal>
  );
}
