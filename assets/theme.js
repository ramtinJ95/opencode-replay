/**
 * OpenCode Replay - Theme Management
 * Handles dark/light mode toggle with localStorage persistence
 */
(function initTheme() {
  const THEME_KEY = 'opencode-replay-theme';
  const THEME_TIME_KEY = 'opencode-replay-theme-time';

  /**
   * Safe localStorage getter (handles private browsing mode)
   */
  function getStorageItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Safe localStorage setter (handles quota exceeded and private browsing)
   */
  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (private browsing, quota exceeded)
    }
  }

  /**
   * Get the user's preferred theme
   * Priority: localStorage > system preference > light
   */
  function getPreferredTheme() {
    var storedTheme = getStorageItem(THEME_KEY);
    
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  }

  /**
   * Apply theme to document
   */
  function setTheme(theme, saveTime) {
    document.documentElement.setAttribute('data-theme', theme);
    setStorageItem(THEME_KEY, theme);
    if (saveTime !== false) {
      setStorageItem(THEME_TIME_KEY, String(Date.now()));
    }
    updateToggleButton(theme);
  }

  /**
   * Update toggle button accessibility attributes
   */
  function updateToggleButton(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', 
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
  }

  // Initialize theme on page load
  document.addEventListener('DOMContentLoaded', function() {
    const theme = getPreferredTheme();
    setTheme(theme, false);

    // Set up toggle button click handler
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
  });

  // Listen for system theme changes (when no explicit preference is set)
  if (window.matchMedia) {
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', function(e) {
      // Only auto-switch if user hasn't set an explicit preference recently
      var lastSet = getStorageItem(THEME_TIME_KEY);
      var now = Date.now();
      
      // If preference was set more than 24 hours ago, follow system
      if (!lastSet || (now - parseInt(lastSet, 10)) > 86400000) {
        setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }
})();
