import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, Rewind, FastForward, Trophy, AlertTriangle, Activity, Crown, History } from 'lucide-react';
import api from '../api';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import { lcFirst } from '../lib/format';

const SPEEDS = [1, 2, 4];

export default function GhostPlayback({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [playRequested, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    api.get(`/projects/${projectId}/playback-highlights`).then((r) => setData(r.data)).catch(() => setData({ activities: [], highlights: {} }));
  }, [projectId]);

  const total = data?.activities.length || 0;
  const playing = playRequested && index < total;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => setIndex((i) => i + 1), 900 / speed);
    return () => clearTimeout(id);
  }, [playing, index, total, speed]);

  const current = data?.activities[index - 1];
  const h = data?.highlights || {};
  const toggle = () => {
    if (index >= total) setIndex(0);
    setPlaying(!playing);
  };

  return (
    <Modal onClose={onClose} size="xl" title="Ghost playback" subtitle="Replay how this project unfolded, event by event" icon={<History size={18} />} bodyClassName="p-0">
      {!data ? <div className="p-6"><div className="skeleton h-80 !rounded-2xl" /></div> : (
        <div className="grid md:grid-cols-[1fr_280px]">
          <div className="relative min-h-[360px] flex flex-col items-center justify-center p-8 overflow-hidden border-b md:border-b-0 md:border-r border-line"
            style={{ backgroundImage: 'linear-gradient(to right, var(--grid) 1px, transparent 1px), linear-gradient(to bottom, var(--grid) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
            <AnimatePresence mode="popLayout">
              {current ? (
                <motion.div key={current._id} initial={{ opacity: 0, y: 40, scale: 0.85, rotateX: 25 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={{ opacity: 0, y: -40, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }} style={{ transformPerspective: 800 }}
                  className="card p-6 max-w-sm w-full text-center relative z-10">
                  <div className="flex justify-center mb-4"><Avatar name={current.userId?.name || '?'} size="xl" /></div>
                  <p className="font-medium"><span className="font-bold">{current.userId?.name}</span> {lcFirst(current.details)}</p>
                  <p className="text-xs text-subtle mt-2 font-mono">{new Date(current.createdAt).toLocaleString()}</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-subtle relative z-10">
                  <Activity size={40} className="mx-auto mb-3 opacity-50" />
                  <p>{total ? 'Press play to replay the timeline' : 'No activity to replay yet'}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-5 inset-x-6">
              <input type="range" min={0} max={total} value={index} onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }}
                className="w-full accent-[var(--accent)]" aria-label="Timeline position" />
              <p className="text-center text-[11px] text-subtle font-mono mt-1">{index} / {total} events</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <p className="label !mb-0">Highlights</p>
            {[
              { icon: Activity, title: 'Busiest day', value: h.peakActivityDate || 'n/a', sub: h.maxCount ? `${h.maxCount} events` : '' },
              { icon: Trophy, title: 'Biggest completed task', value: h.largestTaskCompleted || 'None yet' },
              { icon: Crown, title: 'Most active', value: h.topContributor?.name || 'n/a', sub: h.topContributor ? `${h.topContributor.count} events` : '' },
              { icon: AlertTriangle, title: 'Missed deadlines', value: `${h.missedDeadlines ?? 0} open and overdue` }
            ].map(({ icon: Icon, title, value, sub }) => (
              <div key={title} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-xs font-semibold text-accent-text flex items-center gap-1.5 mb-1"><Icon size={13} /> {title}</p>
                <p className="text-sm truncate" title={value}>{value}</p>
                {sub && <p className="text-[11px] text-subtle">{sub}</p>}
              </div>
            ))}
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={() => { setPlaying(false); setIndex(0); }} className="btn btn-icon" aria-label="Restart"><Rewind size={16} /></button>
                <button type="button" onClick={toggle} disabled={!total} className="btn btn-primary btn-lg btn-icon !p-4 !rounded-full" aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={22} className="fill-current" /> : <Play size={22} className="fill-current ml-0.5" />}
                </button>
                <button type="button" onClick={() => { setPlaying(false); setIndex(total); }} className="btn btn-icon" aria-label="Jump to end"><FastForward size={16} /></button>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {SPEEDS.map((s) => (
                  <button type="button" key={s} onClick={() => setSpeed(s)} className={`chip font-mono ${speed === s ? 'chip-accent' : ''}`}>{s}x</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
