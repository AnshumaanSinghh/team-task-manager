import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minimize2, Square, Timer } from 'lucide-react';
import { useFocus } from '../context/FocusContext';
import { fmtClock } from '../lib/format';

const SIZE = 300;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function FocusOverlay() {
  const { focus, remaining, progress, overlayOpen, closeOverlay, openOverlay, stop } = useFocus();

  return createPortal(
    <>
      <AnimatePresence>
        {focus && overlayOpen && (
          <motion.div className="fixed inset-0 z-[95] flex flex-col items-center justify-center px-6 text-center"
            style={{ background: 'radial-gradient(800px 500px at 50% 40%, rgb(34 197 94 / 0.16), #030403 70%)' }}
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}
            role="dialog" aria-modal="true" aria-label="Focus timer">
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#4ade80] flex items-center gap-2 mb-8">
              <span className="live-dot" /> Focus mode
            </motion.p>

            <motion.div className="relative" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.05 }}>
              <motion.div className="absolute inset-6 rounded-full" style={{ boxShadow: '0 0 80px 10px rgb(34 197 94 / 0.25)' }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
              <svg width={SIZE} height={SIZE} className="-rotate-90 max-w-[78vw] h-auto" viewBox={`0 0 ${SIZE} ${SIZE}`}>
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1d2420" strokeWidth={STROKE} />
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#22c55e" strokeWidth={STROKE} strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * progress} style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 8px rgb(34 197 94 / 0.6))' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-6xl sm:text-7xl font-semibold text-white tabular-nums">{fmtClock(remaining)}</span>
                <span className="text-xs text-[#a3ada6] mt-2 uppercase tracking-widest">remaining</span>
              </div>
            </motion.div>

            <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="mt-10 text-2xl sm:text-3xl font-bold text-white max-w-xl leading-tight">
              {focus.task?.title || 'Deep work'}
            </motion.h2>
            <p className="text-sm text-[#a3ada6] mt-2">Notifications can wait. Time is logged to the task when you finish.</p>

            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-3 mt-9">
              <button type="button" onClick={closeOverlay} className="btn btn-dark btn-lg"><Minimize2 size={17} /> Minimise</button>
              <button type="button" onClick={() => stop()} className="btn btn-primary btn-lg"><Square size={15} className="fill-current" /> Finish and log time</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focus && !overlayOpen && (
          <motion.button type="button" onClick={openOverlay}
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed z-[60] bottom-5 right-5 btn btn-invert !rounded-2xl !py-3 !px-4 max-w-[min(360px,calc(100vw-40px))]">
            <span className="live-dot" />
            <Timer size={16} />
            <span className="font-mono tabular-nums">{fmtClock(remaining)}</span>
            <span className="truncate font-medium opacity-80">{focus.task?.title}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
