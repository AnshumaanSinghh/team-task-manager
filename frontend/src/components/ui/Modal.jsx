import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

// Wrap conditional renders in <AnimatePresence> so the exit animation plays.
export default function Modal({ onClose, children, size = 'md', title, subtitle, icon, dismissable = true, className = '', bodyClassName = 'p-5 sm:p-6' }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || !dismissable) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === panel.current) {
        e.stopPropagation();
        closeRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTarget = panel.current?.querySelector('[data-autofocus]') || panel.current;
    focusTarget?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [dismissable]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-[6px]" onClick={dismissable ? onClose : undefined} aria-hidden />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size]} card my-auto outline-none overflow-hidden ${className}`}
        style={{ transformPerspective: 1200 }}
        initial={{ opacity: 0, y: 28, scale: 0.96, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, y: 16, scale: 0.97, rotateX: -4 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      >
        {title !== undefined && (
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
            <div className="flex items-start gap-3 min-w-0">
              {icon && <div className="mt-0.5 w-9 h-9 rounded-xl bg-accent/12 text-accent-text grid place-items-center flex-none">{icon}</div>}
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight truncate">{title}</h2>
                {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {dismissable && (
              <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm text-muted" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
