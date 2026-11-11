import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FocusProvider } from './context/FocusContext';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import ShortcutsHelp from './components/ShortcutsHelp';
import FocusOverlay from './components/FocusOverlay';
import { useHotkeys } from './lib/useHotkeys';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Team = lazy(() => import('./pages/Team'));
const PublicProject = lazy(() => import('./pages/PublicProject'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-[50vh]">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-2xl border-2 border-line-strong" />
      <div className="absolute inset-0 rounded-2xl border-2 border-accent border-t-transparent animate-spin" />
    </div>
  </div>
);

// Freezes the outgoing page so it can animate out while the next one animates in.
function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function Shell() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  useHotkeys({
    '?': () => setHelpOpen(true),
    'g d': () => navigate('/dashboard'),
    'g p': () => navigate('/projects'),
    'g t': () => navigate('/team')
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onShowShortcuts={() => setHelpOpen(true)} />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <AnimatedOutlet />
      </main>
      <CommandPalette onShowShortcuts={() => setHelpOpen(true)} />
      <FocusOverlay />
      <AnimatePresence>{helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={redirectTo} replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/public/:shareId" element={<PublicProject />} />
        <Route element={<RequireAuth><FocusProvider><Shell /></FocusProvider></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/team" element={<Team />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          position="bottom-center"
          gutter={10}
          toastOptions={{
            duration: 3200,
            style: {
              background: 'var(--surface-2)',
              color: 'var(--fg)',
              border: '1px solid var(--line-strong)',
              borderRadius: '14px',
              fontSize: '0.85rem',
              fontWeight: 500,
              boxShadow: '0 4px 0 0 var(--neutral-edge), 0 18px 40px -16px rgb(0 0 0 / 0.6)'
            },
            success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--accent-ink)' } },
            error: { iconTheme: { primary: 'var(--fg)', secondary: 'var(--bg)' } }
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
