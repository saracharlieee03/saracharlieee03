'use strict';
/* services/export.js — Exporta los registros filtrados (valores originales del Excel) */
App.exporter = (() => {
  const { R, D } = App.data, { toCSV, download, stamp } = App.util;
  const rowValues = i => R[i].map((v, k) => D.dict[k][v]);

  function csv(idx = App.store.state.idx, name = 'datos_filtrados') {
    download(toCSV(D.labels, idx.map(rowValues)), `${name}_${stamp()}.csv`, 'text/csv;charset=utf-8');
  }
  function json(idx = App.store.state.idx) {
    const out = idx.map(i => Object.fromEntries(rowValues(i).map((v, k) => [D.labels[k], v])));
    download(JSON.stringify(out, null, 1), `datos_filtrados_${stamp()}.json`, 'application/json');
  }
  /* Enlace compartible con la vista y los filtros actuales */
  function link() {
    const url = location.href.split('#')[0] + App.store.toHash();
    const done = () => App.ui.toast('Enlace copiado: incluye la vista y los filtros actuales');
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copia este enlace:', url));
    else prompt('Copia este enlace:', url);
  }
  return { csv, json, link, rowValues };
})();
