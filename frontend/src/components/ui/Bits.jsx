import { useEffect, useRef } from 'react';
import { animate, motion } from 'framer-motion';
import { Circle, CircleDot, CircleCheck, Eye } from 'lucide-react';

const LEVEL = { Low: 1, Medium: 2, High: 3 };

export function PriorityBars({ priority = 'Medium', showLabel = false, className = '' }) {
  const level = LEVEL[priority] || 2;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={`${priority} priority`}>
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className="w-[3px] rounded-sm transition-colors"
            style={{ height: `${4 + i * 3}px`, background: i <= level ? 'var(--accent)' : 'var(--line-strong)' }} />
        ))}
      </span>
      {showLabel && (
        <span className={`text-[10px] font-bold uppercase tracking-wider ${priority === 'High' ? 'text-fg' : 'text-muted'}`}>{priority}</span>
      )}
    </span>
  );
}

export function StatusIcon({ status, size = 14, className = '' }) {
  if (status === 'Completed') return <CircleCheck size={size} className={`text-accent ${className}`} />;
  if (status === 'In Review') return <Eye size={size} className={`text-accent-text ${className}`} />;
  if (status === 'In Progress') return <CircleDot size={size} className={`text-accent-text ${className}`} />;
  return <Circle size={size} className={`text-subtle ${className}`} />;
}

export function AnimatedNumber({ value = 0, duration = 0.9, className = '' }) {
  const ref = useRef(null);
  const previous = useRef(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = Math.round(v).toLocaleString(); }
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration]);
  return <span ref={ref} className={className}>0</span>;
}

// Segmented control with a sliding green pill.
export function Segmented({ options, value, onChange, id, size = 'md', className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((opt) => {
        const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={active} data-active={active}
            onClick={() => onChange(o.value)} disabled={o.disabled}
            className={`${size === 'sm' ? '!px-2.5 !py-1 !text-[11px]' : ''} flex items-center gap-1.5 disabled:opacity-40`}
            title={o.title}>
            {active && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[9px] bg-accent"
                style={{ boxShadow: '0 2px 0 0 var(--accent-edge)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{o.icon}{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Ring({ value = 0, size = 56, stroke = 6, children, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value / 100))) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Logo({ size = 32, withText = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="drop-shadow-[0_4px_0_var(--accent-edge)]">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--accent)" />
        <path d="M17 33.5 27 43l20-22" fill="none" stroke="var(--accent-ink)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && <span className="font-display font-bold text-lg tracking-tight">Task<span className="text-accent-text">Flow</span></span>}
    </span>
  );
}

export function Empty({ icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent-text grid place-items-center mb-4 border border-accent/20">{icon}</div>}
      <h3 className="font-semibold text-base">{title}</h3>
      {children && <p className="text-sm text-muted mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DeadlineChip({ state, date, className = '' }) {
  const tone = state.tone === 'overdue' ? 'hazard' : state.tone === 'soon' ? 'chip-solid' : state.tone === 'done' ? 'chip-accent' : '';
  return (
    <span className={`chip font-mono !text-[10px] ${tone} ${className}`}>
      {date}
      {state.tone !== 'ok' && state.tone !== 'done' && <span className="opacity-80">· {state.label}</span>}
    </span>
  );
}
