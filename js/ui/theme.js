'use strict';
/* ui/theme.js — Modo claro / oscuro (recuerda la elección en este navegador) */
App.theme = (() => {
  const KEY = 'dashboard-theme';
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const current = () => document.documentElement.dataset.theme || 'light';
  function set(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) { /* almacenamiento no disponible */ }
    const b = document.getElementById('theme');
    if (b) { b.innerHTML = App.ui.icon(t === 'dark' ? 'sun' : 'moon'); b.title = t === 'dark' ? 'Modo claro' : 'Modo oscuro'; }
    App.charts.applyTheme();
    App.store.emit('theme', t);
  }
  const init = () => set(read() || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const toggle = () => set(current() === 'dark' ? 'light' : 'dark');
  return { init, toggle, current };
})();
