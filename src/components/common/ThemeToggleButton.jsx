import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggleButton({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Light mode' : 'Dark mode';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <span className="text-base" aria-hidden="true">
          {isDark ? '☀️' : '🌙'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span>{label}</span>
    </button>
  );
}

