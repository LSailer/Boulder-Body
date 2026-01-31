import { useState, useEffect } from 'react';
import { getTheme, setTheme } from '../logic/StorageManager';

/**
 * Theme toggle button component.
 * Switches between light and dark mode, with preference saved to localStorage.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDark(!isDark);
  };

  useEffect(() => {
    // Apply theme on mount (in case it wasn't initialized)
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px] min-w-[44px]"
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
