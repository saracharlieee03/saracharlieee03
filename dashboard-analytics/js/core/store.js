'use strict';
/* ==========================================================================
   core/store.js — Estado único de la aplicación + bus de eventos + URL.
   Los filtros viven en la URL (#/vista?Columna=indice) para poder compartir enlaces.
   Eventos: 'change' (filtros o vista cambiaron), 'theme'.
   ========================================================================== */
App.store = (() => {
  const state = { view: 'resumen', filters: {}, idx: [] };
  const handlers = {};
  const on = (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn);
  const emit = (ev, p) => (handlers[ev] || []).forEach(fn => fn(p));

  function toHash() {
    const q = new URLSearchParams(Object.entries(state.filters).map(([c, v]) => [c, String(v)])).toString();
    return '#/' + state.view + (q ? '?' + q : '');
  }
  function readHash() {
    const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
    const filters = {};
    new URLSearchParams(query || '').forEach((v, c) => {
      if (App.data.C[c] !== undefined && /^\d+$/.test(v) && +v < App.data.size(c)) filters[c] = +v;
    });
    return { view: path || 'resumen', filters };
  }
  /* Escribe la URL sin disparar otra navegación */
  let silent = false;
  function commit() {
    const h = toHash();
    if (location.hash !== h) { silent = true; location.hash = h; }
    emit('change', state);
  }
  window.addEventListener('hashchange', () => {
    if (silent) { silent = false; return; }
    Object.assign(state, readHash()); emit('change', state);
  });

  const setFilter = (c, v) => { if (v === null || v === '' || v === undefined) delete state.filters[c]; else state.filters[c] = +v; commit(); };
  const toggleFilter = (c, v) => setFilter(c, state.filters[c] === v ? null : v);
  const clearFilters = () => { state.filters = {}; commit(); };
  const setView = v => { state.view = v; commit(); };
  const init = () => Object.assign(state, readHash());

  return { state, on, emit, setFilter, toggleFilter, clearFilters, setView, init, toHash };
})();
