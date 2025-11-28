import { useEffect } from 'react';

/**
 * Hook to handle keyboard shortcuts
 * @param {object} shortcuts - Object mapping key combinations to callbacks
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      // Ignore if typing in input, textarea, or contenteditable
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // Build key string
      const parts = [];
      if (ctrl) parts.push('ctrl');
      if (shift) parts.push('shift');
      if (alt) parts.push('alt');
      parts.push(key);

      const keyCombo = parts.join('+');

      // Check for exact match
      if (shortcuts[keyCombo]) {
        e.preventDefault();
        shortcuts[keyCombo](e);
        return;
      }

      // Check for pattern match (e.g., 'ctrl+k' matches 'ctrl+k' or 'ctrl+shift+k')
      for (const [pattern, callback] of Object.entries(shortcuts)) {
        if (keyCombo.includes(pattern) || pattern.includes(keyCombo)) {
          e.preventDefault();
          callback(e);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Common keyboard shortcuts for the app
 */
export const commonShortcuts = {
  'ctrl+k': (e) => {
    // Focus search (if available)
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  },
  'escape': (e) => {
    // Close modals/drawers
    const closeButtons = document.querySelectorAll('[data-close-on-escape]');
    closeButtons.forEach((btn) => btn.click());
  },
};

