import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';
import { useAuth } from './AuthContext';

export const FocusContext = createContext(null);
export const useFocus = () => useContext(FocusContext);

// Broadcast task changes so open boards can refresh without prop drilling.
export const emitTaskChange = (task) => window.dispatchEvent(new CustomEvent('taskflow:task-changed', { detail: task || null }));

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio is optional */
  }
}

export const FocusProvider = ({ children }) => {
  const { user, setFocus } = useAuth();
  const focus = user?.focus?.endsAt ? user.focus : null;
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stopping = useRef(false);

  const stop = useCallback(async ({ reason = 'manual' } = {}) => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      const { data } = await api.post('/tasks/focus/stop');
      setFocus(null);
      setOverlayOpen(false);
      if (reason === 'complete') {
        chime();
        toast.success(`Focus session complete. ${data.minutes} min logged.`, { duration: 5000 });
      } else if (reason === 'manual') {
        toast.success(data.minutes >= 1 ? `Logged ${data.minutes} min of focus` : 'Focus session ended');
      }
      emitTaskChange();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not stop the session'));
    } finally {
      stopping.current = false;
    }
  }, [setFocus]);

  const start = useCallback(async (task, minutes = 25) => {
    try {
      const { data } = await api.post(`/tasks/${task._id}/focus`, { minutes });
      setFocus(data.focus);
      setOverlayOpen(true);
      emitTaskChange(data.task);
      return data.task;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start focus'));
      return null;
    }
  }, [setFocus]);

  useEffect(() => {
    if (!focus) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focus]);

  const remaining = focus ? new Date(focus.endsAt).getTime() - now : 0;
  const total = focus ? new Date(focus.endsAt).getTime() - new Date(focus.startedAt).getTime() : 0;

  useEffect(() => {
    if (!focus || remaining > 0) return undefined;
    const id = setTimeout(() => stop({ reason: overlayOpen || document.visibilityState === 'visible' ? 'complete' : 'silent' }), 0);
    return () => clearTimeout(id);
  }, [focus, remaining, overlayOpen, stop]);

  const value = useMemo(() => ({
    focus,
    remaining,
    total,
    progress: total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0,
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
    start,
    stop
  }), [focus, remaining, total, overlayOpen, start, stop]);

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
};
