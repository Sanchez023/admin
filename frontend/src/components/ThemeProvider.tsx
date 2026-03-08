'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/auth-client';

type Theme = 'light' | 'dark';

const defaultThemeValue = {
  theme: 'light' as Theme,
  setTheme: (_t: Theme) => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}>(defaultThemeValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem(STORAGE_KEYS.theme) as Theme) || 'light';
    setThemeState(stored);
    document.documentElement.classList.toggle('dark', stored === 'dark');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.theme, t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = mounted
    ? { theme, setTheme, toggleTheme }
    : defaultThemeValue;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
