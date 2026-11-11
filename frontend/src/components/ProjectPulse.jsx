import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, Lock, AlertTriangle, ChevronDown } from 'lucide-react';
import api from '../api';

const LABEL = { healthy: 'Healthy', warning: 'At risk', critical: 'Critical' };
const SPEED = { healthy: '1.6s', warning: '2.6s', critical: '4s' };

export default function ProjectPulse({ projectId, refreshKey }) {
  const [pulse, setPulse] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => api.get(`/projects/${projectId}/pulse`).then((r) => alive && setPulse(r.data)).catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    return () => { alive = false; clearInterval(id); };
  }, [projectId, refreshKey]);

  if (!pulse) return <div className="skeleton h-[74px] !rounded-2xl mb-5" />;
  const { score, status, insights, burnoutWarnings, metrics } = pulse;

  return (
    <motion.section layout className={`card mb-5 overflow-hidden ${status === 'critical' ? 'hazard-soft' : ''}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 text-left" aria-expanded={open}>
        <div className="relative w-14 h-14 rounded-2xl grid place-items-center flex-none bg-surface-2 border border-line">
          <span className="text-xl font-bold font-mono tabular-nums">{score}</span>
          <svg className="absolute inset-0" viewBox="0 0 56 56" aria-hidden>
            <circle cx="28" cy="28" r="26" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${(score / 100) * 163} 163`} strokeLinecap="round" transform="rotate(-90 28 28)" opacity={status === 'healthy' ? 1 : 0.6} />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity size={15} className="text-accent-text" />
            <h3 className="font-semibold text-sm">Project pulse</h3>
            <span className={`chip !text-[10px] ${status === 'healthy' ? 'chip-accent' : status === 'warning' ? 'chip-solid' : 'hazard'}`}>{LABEL[status]}</span>
          </div>
          <p className="text-xs text-muted truncate mt-1">{insights[0]}</p>
        </div>
        <svg className="hidden sm:block w-40 h-10 flex-none" viewBox="0 0 120 30" fill="none" aria-hidden>
          <path d="M0 15 H34 L40 6 L48 25 L54 2 L60 20 L64 15 H120" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 240, animation: `ecg ${SPEED[status]} linear infinite`, filter: 'drop-shadow(0 0 4px var(--accent))' }} />
        </svg>
        <ChevronDown size={18} className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 sm:px-5 pb-4 grid md:grid-cols-[1fr_auto] gap-4">
          <ul className="space-y-1.5">
            {insights.slice(1).map((s) => <li key={s} className="text-sm text-muted flex gap-2"><span className="text-accent-text">›</span>{s}</li>)}
            {burnoutWarnings.map((w) => <li key={w} className="text-sm font-semibold flex gap-2 items-center"><Flame size={14} className="text-accent-text" />{w}</li>)}
            {insights.length <= 1 && burnoutWarnings.length === 0 && <li className="text-sm text-subtle">No warnings right now.</li>}
          </ul>
          <div className="flex gap-2 flex-wrap md:justify-end self-start">
            <span className="chip font-mono">{metrics.completed}/{metrics.total} done</span>
            <span className={`chip font-mono ${metrics.overdue ? 'hazard' : ''}`}><AlertTriangle size={11} /> {metrics.overdue} overdue</span>
            <span className={`chip font-mono ${metrics.blocked ? 'chip-solid' : ''}`}><Lock size={11} /> {metrics.blocked} blocked</span>
            <span className="chip font-mono">{metrics.recentActivityCount} events / 7d</span>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
