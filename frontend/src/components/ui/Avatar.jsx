import { initials } from '../../lib/format';

// Deterministic black / green / white avatar tones.
const TONES = [
  { bg: '#22c55e', fg: '#021208' },
  { bg: '#f6f8f7', fg: '#030403' },
  { bg: '#15803d', fg: '#f6f8f7' },
  { bg: '#0b0d0c', fg: '#4ade80' },
  { bg: '#86efac', fg: '#021208' },
  { bg: '#1f2a23', fg: '#f6f8f7' }
];

const hash = (s = '') => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const SIZES = { xs: 'w-5 h-5 text-[9px]', sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-14 h-14 text-lg' };

export default function Avatar({ name, size = 'md', live = false, className = '', title }) {
  const tone = TONES[hash(name) % TONES.length];
  return (
    <span className={`relative inline-grid place-items-center rounded-full font-bold font-display flex-none ring-2 ring-bg ${SIZES[size]} ${className}`}
      style={{ background: tone.bg, color: tone.fg, boxShadow: 'inset 0 0 0 1px rgb(127 127 127 / 0.25)' }}
      title={title ?? name}>
      {initials(name)}
      {live && <span className="absolute -right-0.5 -bottom-0.5"><span className="live-dot block" /></span>}
    </span>
  );
}

export function AvatarStack({ people = [], max = 4, size = 'sm' }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => <Avatar key={p._id || p.name} name={p.name} size={size} />)}
      {extra > 0 && (
        <span className={`inline-grid place-items-center rounded-full ring-2 ring-bg bg-surface-3 text-muted font-semibold ${SIZES[size]}`}>+{extra}</span>
      )}
    </div>
  );
}
