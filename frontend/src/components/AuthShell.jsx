import { motion } from 'framer-motion';
import { Check, Timer, Users, Lock, Sparkles } from 'lucide-react';
import { Logo } from './ui/Bits';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const FEATURES = [
  { icon: Lock, text: 'Blockers that stop work from closing too early' },
  { icon: Timer, text: 'Focus sessions that log real time to each task' },
  { icon: Users, text: 'Live team workload and one-click async standups' },
  { icon: Sparkles, text: 'Type a sentence, get a task with owner and due date' }
];

// Decorative mini board: a card glides from To Do to Done on a loop.
function BoardIllustration() {
  const columns = ['To Do', 'Doing', 'Done'];
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm" aria-hidden>
      <div className="grid grid-cols-3 gap-3">
        {columns.map((c, i) => (
          <div key={c}>
            <div className="flex items-center gap-1.5 mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              <span className={`w-1.5 h-1.5 rounded-full ${i === 2 ? 'bg-[#22c55e]' : 'bg-white/40'}`} /> {c}
            </div>
            {[0, 1].map((j) => (
              <div key={j} className="h-11 mb-2 rounded-lg border border-white/10 bg-white/[0.04] p-2"
                style={{ animation: `${(i + j) % 2 ? 'float-a' : 'float-b'} ${5 + i + j}s ease-in-out infinite` }}>
                <div className="h-1.5 w-3/4 rounded bg-white/25 mb-1.5" />
                <div className="h-1.5 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="absolute left-4 top-[46px] w-[calc((100%-56px)/3)] h-11 rounded-lg bg-[#22c55e] p-2 shadow-[0_4px_0_0_#0f6b31,0_12px_30px_-6px_rgb(34_197_94/0.6)]"
        style={{ animation: 'slide-card 6s cubic-bezier(0.65,0,0.35,1) infinite' }}>
        <div className="h-1.5 w-3/4 rounded bg-black/40 mb-1.5" />
        <div className="h-1.5 w-1/2 rounded bg-black/25" />
      </div>
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer }) {
  const { darkMode, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative overflow-hidden bg-[#030403] text-white p-12 xl:p-16 flex-col justify-between border-r border-white/10">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(700px 400px at 20% 10%, rgb(34 197 94 / 0.22), transparent 60%), linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)',
          backgroundSize: 'auto, 40px 40px, 40px 40px'
        }} />
        <div className="relative"><span className="[--accent:#22c55e] [--accent-ink:#021208] [--accent-edge:#0f6b31] [--accent-text:#4ade80]"><Logo size={34} /></span></div>
        <div className="relative max-w-lg">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl xl:text-5xl font-bold leading-[1.05] mb-5">
            Ship work together.<br /><span className="text-[#4ade80]">Without the noise.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }} className="text-white/60 text-lg leading-relaxed mb-9">
            One place for your team’s board, deadlines, focus time and standups.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <BoardIllustration />
          </motion.div>
          <ul className="mt-9 space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-center gap-3 text-sm text-white/75">
                <span className="w-7 h-7 rounded-lg bg-[#22c55e]/15 text-[#4ade80] grid place-items-center border border-[#22c55e]/25"><Icon size={14} /></span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/35 flex items-center gap-2"><Check size={13} className="text-[#22c55e]" /> Role-based access · Shareable read-only boards · CSV export</p>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <span className="lg:hidden"><Logo size={30} /></span>
          <button type="button" onClick={toggleTheme} className="btn btn-sm btn-icon !mb-0" aria-label="Toggle theme">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 pb-12">
          <motion.div initial={{ opacity: 0, y: 24, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1000 }} className="w-full max-w-md">
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="text-muted mt-2 mb-8">{subtitle}</p>
            {children}
            <div className="mt-8 text-center text-sm text-muted">{footer}</div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />}
        {children}
      </span>
    </label>
  );
}
