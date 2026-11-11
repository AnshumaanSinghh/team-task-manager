import { useEffect, useLayoutEffect, useRef } from 'react';

const isTyping = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

// useHotkeys({ n: fn, '/': fn, 'g d': fn, '?': fn }, enabled)
// Single keys and two-key sequences ("g d"). Ignored while typing or with Ctrl/Cmd/Alt.
export function useHotkeys(bindings, enabled = true) {
  const ref = useRef(bindings);
  useLayoutEffect(() => { ref.current = bindings; });

  useEffect(() => {
    if (!enabled) return undefined;
    let pending = null;
    let timer = null;

    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const map = ref.current;

      if (pending) {
        const combo = `${pending} ${key}`;
        pending = null;
        clearTimeout(timer);
        if (map[combo]) {
          e.preventDefault();
          map[combo](e);
          return;
        }
      }
      if (Object.keys(map).some((k) => k.startsWith(`${key} `))) {
        pending = key;
        timer = setTimeout(() => { pending = null; }, 900);
        return;
      }
      const fn = map[e.key] || map[key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [enabled]);
}
