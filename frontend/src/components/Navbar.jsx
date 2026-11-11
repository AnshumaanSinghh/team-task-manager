import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, FolderKanban, Users, LogOut, Moon, Sun, Menu, X, Search, Timer, Keyboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocus } from '../context/FocusContext';
import { fmtClock } from '../lib/format';
import Avatar from './ui/Avatar';
import { Logo } from './ui/Bits';
import NotificationBell from './NotificationBell';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users }
];

export default function Navbar({ onShowShortcuts }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { focus, remaining, openOverlay } = useFocus();
  const location = useLocation();
  const [mobilePath, setMobilePath] = useState(null);
  const [menuPath, setMenuPath] = useState(null);
  const mobileOpen = mobilePath === location.pathname;
  const menuOpen = menuPath === location.pathname;
  const setMobileOpen = (fn) => setMobilePath((typeof fn === 'function' ? fn(mobileOpen) : fn) ? location.pathname : null);
  const setMenuOpen = (fn) => setMenuPath((typeof fn === 'function' ? fn(menuOpen) : fn) ? location.pathname : null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const openPalette = () => window.dispatchEvent(new Event('taskflow:palette'));

  return (
    <header className="sticky top-0 z-50 border-b border-line panel-glass">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
        <Link to="/dashboard" className="flex-none" aria-label="TaskFlow home"><Logo size={30} /></Link>

        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Main">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="relative px-3.5 py-2 rounded-xl text-sm font-semibold">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-accent/12 border border-accent/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <span className={`relative flex items-center gap-2 transition-colors ${isActive ? 'text-accent-text' : 'text-muted hover:text-fg'}`}>
                    <Icon size={16} /> {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <button type="button" onClick={openPalette}
          className="hidden lg:flex items-center gap-2 h-9 pl-3 pr-2 rounded-xl border border-line bg-surface-2 text-subtle text-sm hover:border-line-strong hover:text-muted transition-colors w-56 whitespace-nowrap">
          <Search size={15} /> <span className="flex-1 text-left">Search or jump to…</span>
          <span className="kbd">{isMac ? '⌘' : 'Ctrl'} K</span>
        </button>

        <AnimatePresence>
          {focus && (
            <motion.button type="button" onClick={openOverlay}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="btn btn-sm btn-primary !mb-0 font-mono" title={`Focusing on ${focus.task?.title || 'a task'}`}>
              <Timer size={14} /> {fmtClock(remaining)}
            </motion.button>
          )}
        </AnimatePresence>

        <button type="button" onClick={openPalette} className="lg:hidden btn btn-sm btn-icon !mb-0" aria-label="Search"><Search size={16} /></button>
        <NotificationBell />
        <button type="button" onClick={toggleTheme} className="btn btn-sm btn-icon !mb-0" aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
          <motion.span key={darkMode ? 'sun' : 'moon'} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} className="grid">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.span>
        </button>

        <div className="relative hidden sm:block">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-surface-3 transition-colors" aria-haspopup="menu" aria-expanded={menuOpen}>
            <Avatar name={user?.name} size="md" live={Boolean(focus)} />
            <span className="hidden xl:block text-left leading-tight">
              <span className="block text-sm font-semibold">{user?.name}</span>
              <span className="block text-[11px] text-subtle">{user?.role}</span>
            </span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16 }} className="absolute right-0 mt-2 w-60 card p-2 z-50 origin-top-right">
                  <div className="px-3 py-2.5 mb-1 border-b border-line">
                    <p className="text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-subtle truncate">{user?.email}</p>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onShowShortcuts(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface-3 hover:text-fg">
                    <Keyboard size={15} /> Keyboard shortcuts <span className="kbd ml-auto">?</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface-3 hover:text-fg">
                    <LogOut size={15} /> Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button type="button" onClick={() => setMobileOpen((v) => !v)} className="md:hidden btn btn-sm btn-icon !mb-0" aria-label="Menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-line" aria-label="Mobile">
            <div className="p-3 space-y-1">
              <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-surface-2 border border-line">
                <Avatar name={user?.name} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-subtle">{user?.role}</p>
                </div>
              </div>
              {LINKS.map(({ to, label, icon: Icon }, i) => (
                <motion.div key={to} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${isActive ? 'bg-accent/12 text-accent-text' : 'text-muted'}`}>
                    <Icon size={18} /> {label}
                  </NavLink>
                </motion.div>
              ))}
              <button type="button" onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted">
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
