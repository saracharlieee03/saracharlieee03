'use strict';
/* =========================================================
   state.js · Estado único de la aplicación + enlace compartible
   S.f   -> filtros activos { columna: índiceValor }
   S.idx -> filas que cumplen los filtros (se recalcula en cada render)
   El estado se refleja en la URL (#vista?Sede=3) para compartir la vista exacta.
   ========================================================= */
(() => {
  const { C } = App.data;
  const S = App.S = { f: {}, view: 'resumen', idx: [] };
  const listeners = [];

  App.onRender = fn => listeners.push(fn);
  App.render = () => {
    S.idx = App.data.apply(S.f);
    listeners.forEach(fn => fn(S));
    writeHash();
  };

  App.setFilter = (c, i, silent) => {
    if (i === '' || i === null || i === undefined) delete S.f[c]; else S.f[c] = String(i);
    if (!silent) App.render();
  };
  App.setFilters = obj => { Object.entries(obj).forEach(([c, i]) => App.setFilter(c, i, true)); App.render(); };
  App.clearFilters = () => { S.f = {}; App.render(); };
  App.go = v => { if (!App.views[v]) v = 'resumen'; S.view = v; App.render(); window.scrollTo({ top: 0 }); };

  function writeHash() {
    const q = new URLSearchParams(S.f).toString();
    const h = '#' + S.view + (q ? '?' + q : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  App.readHash = () => {
    const [v, q] = location.hash.replace(/^#/, '').split('?');
    if (v && App.views[v]) S.view = v;
    S.f = {};
    new URLSearchParams(q || '').forEach((val, key) => { if (key in C && val !== '') S.f[key] = val; });
  };
})();
