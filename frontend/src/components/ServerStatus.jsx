import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import api, { errorMessage } from '../api';

// Checks /api/health so a broken deployment explains itself instead of every
// sign in or sign up failing with a vague error.
export default function ServerStatus() {
  const [problem, setProblem] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get('/health', { timeout: 12000 })
      .then(() => alive && setProblem(null))
      .catch((error) => {
        if (!alive) return;
        const checks = error.response?.data?.checks;
        if (checks?.database === 'error') setProblem(`The database is offline. ${checks.databaseError}`);
        else if (checks?.jwtSecret === 'missing') setProblem('The server is missing its JWT_SECRET setting.');
        else setProblem(errorMessage(error, 'The server is not responding.'));
      });
    return () => { alive = false; };
  }, [attempt]);

  return (
    <AnimatePresence>
      {problem && (
        <motion.div role="alert" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden mb-6">
          <div className="hazard-soft border rounded-xl p-3.5 flex gap-3 text-sm">
            <AlertTriangle size={18} className="flex-none mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Sign in and sign up will not work right now</p>
              <p className="text-muted mt-0.5">{problem}</p>
            </div>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-sm btn-icon !mb-0 self-start" aria-label="Check again" title="Check again">
              <RotateCcw size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
