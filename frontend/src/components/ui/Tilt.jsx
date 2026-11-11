import { forwardRef, useRef } from 'react';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 3D tilt-on-hover surface with a green glare that follows the pointer.
const Tilt = forwardRef(function Tilt({ as: Tag = 'div', max = 7, className = '', children, glare = true, ...rest }, forwarded) {
  const local = useRef(null);
  const frame = useRef(0);

  const setRef = (el) => {
    local.current = el;
    if (typeof forwarded === 'function') forwarded(el);
    else if (forwarded) forwarded.current = el;
  };

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || reduced()) return;
    const el = local.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(frame.current);
    const el = local.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <Tag ref={setRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={`tilt ${className}`} {...rest}>
      {children}
      {glare && <span className="tilt-glare" aria-hidden />}
    </Tag>
  );
});

export default Tilt;
