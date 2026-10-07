'use strict';
/* ==========================================================================
   ui/table.js — Tabla interactiva: búsqueda, orden por columna, paginación,
   barras dentro de las celdas y descarga CSV de lo que se ve.
   Uso: App.table.mount(elemento, { columns:[{label, num, bar}], rows:[[...]], pageSize, name })
   ========================================================================== */
App.table = (() => {
  const { fmt, esc, toCSV, download, stamp, debounce } = App.util;

  function mount(el, cfg) {
    const t = { q: '', sort: -1, dir: -1, pg: 0, size: cfg.pageSize || 10, ...cfg };
    const maxOf = t.columns.map((c, i) => c.bar ? Math.max(1, ...t.rows.map(r => r[i])) : 0);
    el.innerHTML = `<div class="table-tools"><input class="input" type="search" placeholder="Buscar en la tabla" aria-label="Buscar en la tabla">
      <button class="btn btn-ghost" data-t="csv">${App.ui.icon('download')} CSV</button></div><div class="table-wrap"></div><div class="pager"></div>`;
    const wrap = el.querySelector('.table-wrap'), pager = el.querySelector('.pager');

    function view() {
      let rows = t.q ? t.rows.filter(r => r.join(' ').toLowerCase().includes(t.q)) : t.rows;
      if (t.sort >= 0) {
        const k = t.sort, num = t.columns[k].num;
        rows = rows.slice().sort((a, b) => (num ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]), 'es', { numeric: true })) * t.dir);
      }
      return rows;
    }
    function draw() {
      const rows = view(), pages = Math.max(1, Math.ceil(rows.length / t.size));
      t.pg = Math.min(t.pg, pages - 1);
      const cell = (v, i) => {
        const c = t.columns[i];
        if (!c.num) return `<td>${esc(v)}</td>`;
        const txt = c.fmt ? c.fmt(v) : fmt(v);
        return c.bar ? `<td class="n"><div class="cell-bar"><span>${txt}</span><i style="width:${(v / maxOf[i] * 70).toFixed(1)}px"></i></div></td>` : `<td class="n">${txt}</td>`;
      };
      wrap.innerHTML = `<table><thead><tr>${t.columns.map((c, i) => `<th class="sortable${c.num ? ' n' : ''}" data-s="${i}" aria-sort="${t.sort === i ? (t.dir > 0 ? 'ascending' : 'descending') : 'none'}">${esc(c.label)}${t.sort === i ? (t.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${rows.slice(t.pg * t.size, (t.pg + 1) * t.size).map(r => '<tr>' + r.map(cell).join('') + '</tr>').join('') || `<tr><td colspan="${t.columns.length}" class="muted">Sin coincidencias.</td></tr>`}</tbody></table>`;
      pager.innerHTML = `<span>${fmt(rows.length)} filas · página ${t.pg + 1} de ${pages}</span><button data-p="-1"${t.pg ? '' : ' disabled'} aria-label="Anterior">‹</button><button data-p="1"${t.pg < pages - 1 ? '' : ' disabled'} aria-label="Siguiente">›</button>`;
    }
    el.querySelector('input').addEventListener('input', debounce(e => { t.q = e.target.value.toLowerCase(); t.pg = 0; draw(); }, 150));
    el.addEventListener('click', e => {
      const s = e.target.closest('[data-s]'), p = e.target.closest('[data-p]'), c = e.target.closest('[data-t="csv"]');
      if (s) { const i = +s.dataset.s; t.dir = t.sort === i ? -t.dir : (t.columns[i].num ? -1 : 1); t.sort = i; draw(); }
      else if (p && !p.disabled) { t.pg += +p.dataset.p; draw(); }
      else if (c) download(toCSV(t.columns.map(x => x.label), view().map(r => r.map((v, i) => t.columns[i].fmt ? t.columns[i].fmt(v) : v))), `${t.name || 'tabla'}_${stamp()}.csv`, 'text/csv;charset=utf-8');
    });
    draw();
  }

  /* Tabla estándar de un cruce: Nombre | Total | % | desglose por columnas */
  function crossTable(el, a, b, o = {}) {
    const x = App.engine.cross(a, b, o), n = App.store.state.idx.length;
    mount(el, {
      name: o.name || a.toLowerCase(), pageSize: o.pageSize || 10,
      columns: [{ label: o.label || App.data.LABEL[a] }, { label: 'Total', num: true, bar: true }, { label: '% del total', num: true, fmt: v => v.toFixed(1).replace('.', ',') + '%' }, ...x.cols.map(c => ({ label: c.label, num: true }))],
      rows: x.rows.map(r => [r.label, r.total, r.total * 100 / n, ...r.cells])
    });
  }
  return { mount, crossTable };
})();
