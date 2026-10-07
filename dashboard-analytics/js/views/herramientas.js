'use strict';
/* ==========================================================================
   views/herramientas.js — Explorador de registros y centro de Reportes
   ========================================================================== */
(() => {
  const S = App.store.state, U = App.ui, { fmt, esc, debounce, toCSV, download, stamp } = App.util;
  const { R, C, LABEL, label, labelsOf } = App.data;

  /* ---------------- Explorador ---------------- */
  const COLS = ['Sede', 'Facultad', 'Programa', 'Sexo', 'Estrato', 'Modalidad', 'TipoInscripcion', 'Institucion', 'Colegio', 'Comuna', 'Barrio', 'Pais', 'Ciudad', 'TipoPrograma'];
  const LOCAL = ['Colegio', 'TipoInscripcion', 'Pais', 'TipoPrograma'];
  const X = { q: '', f: {}, sort: -1, dir: 1, pg: 0, size: 25, hide: new Set([10, 12]), cur: [] };
  let text = null; // texto en minúsculas de cada fila, para búsqueda rápida

  function rows() {
    text = text || R.map(r => COLS.map(c => label(c, r[C[c]])).join(' | ').toLowerCase());
    const q = X.q.trim().toLowerCase(), f = Object.entries(X.f);
    let a = S.idx.filter(i => (!q || text[i].includes(q)) && f.every(([c, v]) => R[i][C[c]] === v));
    if (X.sort >= 0) { const c = COLS[X.sort], k = C[c], L = labelsOf(c); a = a.slice().sort((p, s) => L[R[p][k]].localeCompare(L[R[s][k]], 'es', { numeric: true }) * X.dir); }
    return a;
  }
  function drawTable() {
    const a = (X.cur = rows()), pages = Math.max(1, Math.ceil(a.length / X.size)); X.pg = Math.max(0, Math.min(X.pg, pages - 1));
    const show = COLS.map((_, i) => i).filter(i => !X.hide.has(i));
    document.getElementById('xt').innerHTML = `<div class="table-wrap"><table><thead><tr>${show.map(i => `<th class="sortable" data-s="${i}">${LABEL[COLS[i]]}${X.sort === i ? (X.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
      <tbody>${a.slice(X.pg * X.size, (X.pg + 1) * X.size).map(i => `<tr>${show.map(j => `<td>${esc(label(COLS[j], R[i][C[COLS[j]]]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${show.length}" class="muted">Ningún registro coincide con la búsqueda.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${fmt(a.length)} de ${fmt(S.idx.length)} registros · página ${X.pg + 1} de ${pages}</span><button data-p="-1"${X.pg ? '' : ' disabled'}>‹</button><button data-p="1"${X.pg < pages - 1 ? '' : ' disabled'}>›</button></div>`;
  }

  App.views.add({
    id: 'explorador', label: 'Explorador', group: 'Herramientas', icon: 'explorador', sub: 'Consulta los registros originales uno por uno',
    render() {
      const opt = c => { const set = new Set(S.idx.map(i => R[i][C[c]])); return [...set].map(i => [i, label(c, i)]).sort((a, b) => a[1].localeCompare(b[1], 'es')); };
      return {
        html: U.panel({ title: 'Explorador de registros', sub: 'Parte de los filtros globales y agrega los tuyos: busca texto en todas las columnas, ordena con clic en el encabezado y elige qué columnas ver.',
          body: `<div class="controls" style="margin-bottom:var(--s3)"><label style="flex:1 1 280px">Buscar<input id="xq" class="input" type="search" placeholder="Ejemplo: robledo, virtual, estrato 2" value="${esc(X.q)}"></label>
            ${LOCAL.map(c => `<label style="min-width:140px">${LABEL[c]}${U.select('x-' + c, opt(c), X.f[c], 'Todos')}</label>`).join('')}
            <label style="min-width:90px">Filas${U.select('xs', [10, 25, 50, 100].map(n => [n, n]), X.size)}</label>
            <button class="btn btn-ghost" id="xl">Limpiar</button><button class="btn" id="xe">${U.icon('download')} CSV de la consulta</button></div>
            <details><summary class="hint" style="cursor:pointer;margin-bottom:6px">Columnas visibles</summary><div class="col-toggles">${COLS.map((c, i) => `<label><input type="checkbox" data-h="${i}"${X.hide.has(i) ? '' : ' checked'}>${LABEL[c]}</label>`).join('')}</div></details>
            <div id="xt"></div>` }),
        mount(el) {
          el.oninput = debounce(e => { if (e.target.id === 'xq') { X.q = e.target.value; X.pg = 0; drawTable(); } }, 160);
          el.onchange = e => {
            const t = e.target;
            if (t.id && t.id.startsWith('x-')) { const c = t.id.slice(2); t.value === '' ? delete X.f[c] : (X.f[c] = +t.value); X.pg = 0; }
            else if (t.id === 'xs') { X.size = +t.value; X.pg = 0; }
            else if (t.dataset.h) t.checked ? X.hide.delete(+t.dataset.h) : X.hide.add(+t.dataset.h);
            else return;
            drawTable();
          };
          el.onclick = e => {
            const s = e.target.closest('[data-s]'), p = e.target.closest('[data-p]');
            if (s) { const i = +s.dataset.s; X.dir = X.sort === i ? -X.dir : 1; X.sort = i; drawTable(); }
            else if (p && !p.disabled) { X.pg += +p.dataset.p; drawTable(); }
            else if (e.target.closest('#xl')) { X.q = ''; X.f = {}; X.sort = -1; X.pg = 0; App.render(); }
            else if (e.target.closest('#xe')) download(toCSV(COLS.map(c => LABEL[c]), X.cur.map(i => COLS.map(c => App.data.raw(c, R[i][C[c]])))), `consulta_explorador_${stamp()}.csv`, 'text/csv;charset=utf-8');
          };
          drawTable();
        }
      };
    }
  });

  /* ---------------- Reportes ---------------- */
  const EXPORTS = [
    ['word', 'Informe en Word', 'Documento .docx con hallazgos, gráficas, tablas y preguntas de análisis.', 'Crear informe'],
    ['csv', 'Registros en CSV', 'Todas las columnas del Excel para las filas filtradas. Se abre en Excel.', 'Descargar CSV'],
    ['json', 'Registros en JSON', 'Formato para programación o para cargar en otra aplicación.', 'Descargar JSON'],
    ['qa', 'Preguntas y respuestas', 'Las preguntas de análisis con sus respuestas actuales, en CSV.', 'Descargar CSV'],
    ['link', 'Enlace compartible', 'Copia una dirección que abre el dashboard con esta vista y estos filtros.', 'Copiar enlace'],
    ['print', 'Imprimir o guardar PDF', 'Imprime la vista actual sin menús ni controles.', 'Imprimir']
  ];
  App.views.add({
    id: 'reportes', label: 'Reportes', group: 'Herramientas', icon: 'reportes', sub: 'Descarga y comparte los resultados',
    render() {
      const f = Object.entries(S.filters);
      return {
        html: `${U.panel({ title: 'Selección actual', sub: `Todo lo que descargues incluirá ${fmt(S.idx.length)} registros.`,
          body: f.length ? `<div class="chips" style="margin:0">${f.map(([c, v]) => `<span class="chip"><b>${LABEL[c]}</b> ${esc(label(c, v))}</span>`).join('')}</div>` : '<p class="hint">Sin filtros: se exportan todos los registros.</p>' })}
          <div class="insights">${EXPORTS.map(([id, t, d, b]) => `<article class="insight"><h4>${t}</h4><p>${d}</p><button class="btn btn-ghost" data-x="${id}" style="margin-top:6px">${b}</button></article>`).join('')}</div>
          <p class="note">Cada gráfica del dashboard tiene además botones para ampliarla y descargarla como imagen PNG.</p>`,
        mount(el) {
          el.onclick = e => {
            const b = e.target.closest('[data-x]'); if (!b) return;
            ({ word: App.report.open, csv: () => App.exporter.csv(), json: () => App.exporter.json(), qa: App.questions.exportCSV, link: App.exporter.link, print: () => window.print() })[b.dataset.x]();
          };
        }
      };
    }
  });
})();
