import { useState } from 'react';
import { X } from 'lucide-react';

const normalise = (s) => s.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').slice(0, 24);

export default function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Add tag and press Enter', max = 6 }) {
  const [text, setText] = useState('');

  const add = (raw) => {
    const tag = normalise(raw);
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setText('');
  };

  const open = suggestions.filter((s) => !value.includes(s) && (!text || s.includes(normalise(text)))).slice(0, 6);

  return (
    <div>
      <div className="input !p-1.5 flex flex-wrap gap-1.5 items-center min-h-[42px]">
        {value.map((tag) => (
          <span key={tag} className="chip chip-accent">
            #{tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-fg" aria-label={`Remove ${tag}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        {value.length < max && (
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={value.length ? '' : placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
              if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => text && add(text)}
            className="flex-1 min-w-[90px] bg-transparent outline-none text-sm px-1.5 py-1 placeholder:text-subtle" />
        )}
      </div>
      {open.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="chip hover:border-accent hover:text-accent-text transition-colors">#{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
