import confetti from 'canvas-confetti';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function celebrate(origin = { y: 0.65 }) {
  if (reduced()) return;
  confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin, colors: ['#22c55e', '#4ade80', '#ffffff', '#15803d', '#0a0c0b'], scalar: 0.9 });
}

export function celebrateBig() {
  if (reduced()) return;
  const end = Date.now() + 700;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#22c55e', '#ffffff', '#4ade80'] });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#22c55e', '#ffffff', '#4ade80'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
