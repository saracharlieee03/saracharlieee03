'use strict';
/* =========================================================
   table.js · Tabla con búsqueda, orden por columna, paginación,
   barra de proporción en la columna % y exportación a CSV.
   ========================================================= */
(() => {
  const U = App.util, T = {};

  /* heads: nombres de columna · rows: arreglos de valores (números se alinean a la derecha)
     o.bar: índice de la columna que se dibuja como barra · o.name: nombre del CSV */
  function table(id, heads, rows, o = {}) {
    T[id] = { heads, rows, q: '', pg: 0, size: o.size || 10, sort: -1, dir: -1, bar: o.bar ?? -1, name: o.name || id };
    const host = document.getElementById(id); if (!host) return;
    host.innerHTML = `<div class="tbar"><label class="tsearch">${App.ui.icon('search', 15)}<input placeholder="Buscar en la tabla" aria-label="Buscar en la tabla"></label>
      <button class="btn sm ghost" data-tcsv>${App.ui.icon('download', 15)} CSV</button></div><div class="tw"></div><div class="pager"></div>`;
    host.querySelector('input').oninput = e => { T[id].q = U.norm(e.target.value); T[id].pg = 0; draw(id); };
    host.querySelector('[data-tcsv]').onclick = () => csv(id);
    host.onclick = e => {
      const th = e.target.closest('th[data-s]'), pb = e.target.closest('[data-pg]');
      if (th) { const s = +th.dataset.s, t = T[id]; t.dir = t.sort === s ? -t.dir : (typeof t.rows[0]?.[s] === 'number' ? -1 : 1); t.sort = s; draw(id); }
      if (pb) { T[id].pg += +pb.dataset.pg; draw(id); }
    };
    draw(id);
  }

  function view(id) {
    const t = T[id];
    let f = t.q ? t.rows.filter(r => U.norm(r.join(' ')).includes(t.q)) : t.rows.slice();
    if (t.sort >= 0) {
      const s = t.sort, parse = v => (typeof v === 'number' ? v : parseFloat(String(v).replace('%', '').replace(',', '.')));
      f.sort((a, b) => {
        const x = a[s], y = b[s], nx = parse(x), ny = parse(y);
        return (!isNaN(nx) && !isNaN(ny) ? nx - ny : String(x).localeCompare(String(y), 'es', { numeric: true })) * t.dir;
      });
    }
    return f;
  }

  function draw(id) {
    const t = T[id], host = document.getElementById(id); if (!host) return;
    const f = view(id), pages = Math.max(1, Math.ceil(f.length / t.size));
    t.pg = Math.max(0, Math.min(t.pg, pages - 1));
    const isNum = i => typeof t.rows[0]?.[i] === 'number' || /%$/.test(String(t.rows[0]?.[i]));
    const head = t.heads.map((h, i) => `<th data-s="${i}" class="${isNum(i) ? 'n' : ''}" aria-sort="${t.sort === i ? (t.dir > 0 ? 'ascending' : 'descending') : 'none'}">${U.esc(h)}<span class="sort">${t.sort === i ? (t.dir > 0 ? '▲' : '▼') : ''}</span></th>`).join('');
    const cell = (v, i) => {
      if (i === t.bar) { const p = parseFloat(String(v).replace(',', '.')) || 0; return `<td class="n barcell"><i style="width:${Math.min(100, p * (100 / (t.max || 100)))}%"></i><span>${U.esc(v)}</span></td>`; }
      return typeof v === 'number' ? `<td class="n">${U.fmt(v)}</td>` : `<td>${U.esc(v)}</td>`;
    };
    if (t.bar >= 0) t.max = Math.max(...t.rows.map(r => parseFloat(String(r[t.bar]).replace(',', '.')) || 0), 1);
    const body = f.slice(t.pg * t.size, (t.pg + 1) * t.size).map(r => '<tr>' + r.map(cell).join('') + '</tr>').join('');
    host.querySelector('.tw').innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${t.heads.length}" class="muted">Sin coincidencias para esa búsqueda.</td></tr>`}</tbody></table>`;
    host.querySelector('.pager').innerHTML = `<span>${U.fmt(f.length)} filas</span><span class="pg">Página ${t.pg + 1} de ${pages}</span>
      <button class="icon-btn" data-pg="-1" aria-label="Página anterior" ${t.pg === 0 ? 'disabled' : ''}>‹</button><button class="icon-btn" data-pg="1" aria-label="Página siguiente" ${t.pg >= pages - 1 ? 'disabled' : ''}>›</button>`;
  }

  const cellCSV = v => (/[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v);
  function csv(id) {
    const t = T[id], f = view(id);
    U.download(`${t.name}_${U.stamp()}.csv`, '\ufeff' + [t.heads, ...f].map(r => r.map(cellCSV).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    U.toast('Tabla exportada a CSV');
  }

  /* Atajo: tabla de una dimensión con desglose por otra -> Nombre | Total | % | desglose… */
  function crossTable(id, a, b, idx, o = {}) {
    const x = App.data.cross(a, b, idx, o), n = idx.length;
    table(id, [App.data.DIM[a], 'Total', '% del total', ...x.cols.map(c => c.name)], x.rows.map(r => [r.name, r.n, U.pct(r.n, n), ...r.v]), { bar: 2, name: a + '_por_' + b, ...o });
  }

  App.ui.table = table; App.ui.crossTable = crossTable; App.ui.cellCSV = cellCSV;
})();
