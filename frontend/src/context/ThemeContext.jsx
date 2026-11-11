import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const PALETTES = {
  dark: { accent: '#22c55e', accentStrong: '#4ade80', fg: '#f6f8f7', muted: '#a3ada6', subtle: '#6b756f', line: '#1d2420', surface: '#0a0c0b', surface3: '#191d1a' },
  light: { accent: '#16a34a', accentStrong: '#15803d', fg: '#050706', muted: '#4a544e', subtle: '#7b857f', line: '#e0e7e2', surface: '#ffffff', surface3: '#e8ede9' }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#030403' : '#f4f7f5');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* storage can be unavailable */
    }
  }, [theme]);

  // Circular reveal from the click position using the View Transitions API.
  const toggleTheme = useCallback((event) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }
    const x = event?.clientX ?? window.innerWidth - 60;
    const y = event?.clientY ?? 30;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    darkMode: theme === 'dark',
    toggleTheme,
    toggleDarkMode: toggleTheme,
    palette: PALETTES[theme]
  }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
