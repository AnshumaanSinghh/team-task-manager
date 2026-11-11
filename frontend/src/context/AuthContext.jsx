import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const read = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const write = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(read);

  const save = useCallback((next) => {
    write(next);
    setUser(next);
  }, []);

  const logout = useCallback((silent = false) => {
    save(null);
    if (!silent) toast.success('Signed out');
  }, [save]);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...data, token: prev.token };
        write(next);
        return next;
      });
    } catch {
      /* 401s are handled by the interceptor */
    }
  }, []);

  useEffect(() => {
    if (read()?.token) {
      api.get('/auth/me').then(({ data }) => {
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...data, token: prev.token };
          write(next);
          return next;
        });
      }).catch(() => {});
    }
    const onUnauthorized = () => {
      if (!read()) return;
      save(null);
      toast.error('Your session expired. Please sign in again.');
    };
    window.addEventListener('taskflow:unauthorized', onUnauthorized);
    return () => window.removeEventListener('taskflow:unauthorized', onUnauthorized);
  }, [save]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      save(data);
      toast.success(`Welcome back, ${data.name.split(' ')[0]}`);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Sign in failed'));
      return false;
    }
  }, [save]);

  const signup = useCallback(async (name, email, password, role) => {
    try {
      const { data } = await api.post('/auth/signup', { name, email, password, role });
      save(data);
      toast.success('Account created');
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Sign up failed'));
      return false;
    }
  }, [save]);

  const setFocus = useCallback((focus) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, focus };
      write(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.role === 'Admin',
    login,
    signup,
    logout,
    refreshMe,
    setFocus
  }), [user, login, signup, logout, refreshMe, setFocus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
