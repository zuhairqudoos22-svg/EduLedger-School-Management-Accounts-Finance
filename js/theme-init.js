/**
 * Early theme initializer (runs before first paint to prevent theme flash).
 * Reads saved preference from localStorage inside try/catch; falls back to
 * dark theme by default (or system light preference when explicitly set).
 */
(function () {
  var STORAGE_KEY = 'nextgenai_theme';
  var theme = 'dark';

  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      theme = 'light';
    }
  } catch (err) {
    theme = 'dark';
  }

  document.documentElement.setAttribute('data-theme', theme);
})();
