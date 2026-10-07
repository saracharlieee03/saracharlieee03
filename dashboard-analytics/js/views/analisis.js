'use strict';
/* ==========================================================================
   views/analisis.js — Análisis avanzado:
   · Cruces: tabla dinámica con mapa de calor y V de Cramér
   · Comparador: dos grupos lado a lado, diferencias en puntos porcentuales
   · Calidad de datos: completitud y diversidad de cada columna
   ========================================================================== */
(() => {
  const E = App.engine, S = App.store.state, U = App.ui, CH = App.charts;
  const { fmt, pct, pp, esc, short } = App.util, { LABEL, label, R, C, COLS, isMissing } = App.data;
  const N = () => S.idx.length;
  const opts = list => list.map(c => [c, LABEL[c]]);
  const dec = (v, d = 1) => v.toFixed(d).replace('.', ',');

  /* ---------------- Cruces (tabla dinámica) ---------------- */
  const PIVOT_DIMS = ['Facultad', 'Area', 'Programa', 'Sede', 'Sexo', 'Estrato', 'Modalidad', 'TipoPrograma', 'TipoInscripcion', 'Colegio', 'Pais', 'Comuna'];
  const MODES = [['n', 'Conteo'], ['row', '% por fila'], ['col', '% por columna'], ['lift', 'Índice vs. promedio']];
  const pv = { a: 'Facultad', b: 'Modalidad', mode: 'row' };
  const ordered = c => c === 'Estrato';

  App.views.add({
    id: 'cruces', label: 'Cruces', group: 'Análisis avanzado', icon: 'cruces', sub: 'Tabla dinámica: cruza dos variables y mide su relación',
    render() {
      const o = { byLabel: ordered(pv.a), byLabelB: ordered(pv.b), na: true, naB: true };
      const full = E.cross(pv.a, pv.b, o), x = E.cross(pv.a, pv.b, { ...o, maxRows: 40, maxCols: 12 });
      const { v } = E.cramerV(full), n = full.total;
      const colTot = x.cols.map((_, j) => x.rows.reduce((s, r) => s + r.cells[j], 0));
      const val = (r, j) => { const c = r.cells[j];
        return pv.mode === 'n' ? c : pv.mode === 'row' ? c * 100 / r.total : pv.mode === 'col' ? (colTot[j] ? c * 100 / colTot[j] : 0) : (r.total && colTot[j] ? (c / r.total) / (colTot[j] / x.total) : 0); };
      const max = Math.max(1e-9, ...x.rows.flatMap(r => r.cells.map((_, j) => val(r, j))));
      const show = v => pv.mode === 'n' ? fmt(v) : pv.mode === 'lift' ? dec(v, 2) : dec(v) + '%';
      const bg = v => {
        if (pv.mode === 'lift') { const a = Math.min(1, Math.abs(Math.log(Math.max(v, .01))) / 1.2); return v >= 1 ? `rgba(14,124,114,${a * .75})` : `rgba(227,162,26,${a * .75})`; }
        return `rgba(14,124,114,${(v / max) * .8})`;
      };
      const trimmed = full.rows.length > x.rows.length || full.cols.length > x.cols.length;
      return {
        html: `<section class="panel"><div class="controls">
            <label>Filas${U.select('pa', opts(PIVOT_DIMS), pv.a)}</label>
            <button class="btn btn-ghost btn-icon" id="pswap" title="Intercambiar filas y columnas" aria-label="Intercambiar">${U.icon('swap')}</button>
            <label>Columnas${U.select('pb', opts(PIVOT_DIMS), pv.b)}</label>
            <div style="display:grid;gap:3px"><span class="hint">Mostrar</span>${U.seg('pmode', MODES, pv.mode, 'Medida')}</div>
          </div></section>
        ${pv.a === pv.b ? U.empty('Elige dos variables distintas', 'Una variable cruzada consigo misma no aporta información.') : `
        <section class="panel"><header class="panel-head"><div><h3>¿Qué tan relacionadas están ${esc(LABEL[pv.a].toLowerCase())} y ${esc(LABEL[pv.b].toLowerCase())}?</h3>
          <p>V de Cramér = ${dec(v, 3)}: asociación <b>${E.strength(v)}</b>. Va de 0 (sin relación: conocer una variable no dice nada de la otra) a 1 (una determina por completo a la otra).</p></div></header>
          <div class="assoc"><span class="hint">0</span><div class="assoc-scale"><i style="left:${Math.min(100, v * 100)}%"></i></div><span class="hint">1</span></div></section>
        <section class="panel"><header class="panel-head"><div><h3>Tabla de calor</h3><p>${pv.mode === 'lift' ? 'Índice 1,00 = igual al promedio. Verde: más frecuente de lo esperado; amarillo: menos frecuente.' : pv.mode === 'row' ? 'Cada fila suma 100%.' : pv.mode === 'col' ? 'Cada columna suma 100%.' : 'Número de estudiantes en cada combinación.'} Haz clic en una celda para filtrar.${trimmed ? ' Se muestran las 40 filas y 12 columnas más grandes.' : ''}</p></div>
          <div class="panel-tools"><button class="btn btn-ghost" id="pcsv">${U.icon('download')} CSV</button></div></header>
          <div class="table-wrap"><table class="heat"><thead><tr><th>${esc(LABEL[pv.a])} \\ ${esc(LABEL[pv.b])}</th>${x.cols.map(c => `<th class="n" title="${esc(c.label)}">${esc(short(c.label, 18))}</th>`).join('')}<th class="n">Total</th></tr></thead>
          <tbody>${x.rows.map(r => `<tr><td title="${esc(r.label)}">${esc(short(r.label, 40))}</td>${r.cells.map((_, j) => { const v = val(r, j); return `<td class="h" data-r="${r.key}" data-c="${x.cols[j].key}" style="background:${bg(v)};cursor:pointer" title="${fmt(r.cells[j])} estudiantes">${show(v)}</td>`; }).join('')}<td class="n"><b>${fmt(r.total)}</b></td></tr>`).join('')}</tbody></table></div></section>
        ${U.chartPanel({ id: 'x1', title: `Composición de ${LABEL[pv.a].toLowerCase()} según ${LABEL[pv.b].toLowerCase()}`, sub: 'Barras al 100%: compara proporciones aunque los grupos tengan tamaños distintos', span: 12, tall: true })}`}`,
        mount(el) {
          if (pv.a !== pv.b) {
            const rows = x.rows.slice(0, 15);
            CH.draw('x1', { type: 'bar', stacked: true, horizontal: true, percentAxis: true, dim: pv.a, dim2: pv.b, labels: rows.map(r => r.label), keys: rows.map(r => r.key),
              series: x.cols.map((c, j) => ({ label: c.label, key: c.key, data: rows.map(r => r.cells[j] * 100 / r.total) })) });
          }
          el.onchange = e => { if (e.target.id === 'pa') pv.a = e.target.value; if (e.target.id === 'pb') pv.b = e.target.value; App.render(); };
          el.onclick = e => {
            const s = e.target.closest('[data-seg="pmode"]'), cell = e.target.closest('td[data-r]');
            if (s) { pv.mode = s.dataset.val; App.render(); }
            else if (e.target.closest('#pswap')) { [pv.a, pv.b] = [pv.b, pv.a]; App.render(); }
            else if (cell) { S.filters[pv.b] = +cell.dataset.c; App.store.setFilter(pv.a, +cell.dataset.r); }
            else if (e.target.closest('#pcsv')) App.util.download(App.util.toCSV([LABEL[pv.a], ...full.cols.map(c => c.label), 'Total'], full.rows.map(r => [r.label, ...r.cells, r.total])), `cruce_${pv.a}_${pv.b}_${App.util.stamp()}.csv`, 'text/csv;charset=utf-8');
          };
        }
      };
    }
  });

  /* ---------------- Comparador de grupos ---------------- */
  const SEG_DIMS = ['Facultad', 'Programa', 'Sede', 'Area', 'Modalidad', 'TipoPrograma', 'Colegio', 'Sexo'];
  const BY_DIMS = ['Sexo', 'Estrato', 'Modalidad', 'Colegio', 'TipoPrograma', 'TipoInscripcion', 'Facultad', 'Area'];
  const cmp = { dim: 'Facultad', a: null, b: null, by: 'Estrato' };

  App.views.add({
    id: 'comparador', label: 'Comparador', group: 'Análisis avanzado', icon: 'comparador', sub: 'Pon dos grupos frente a frente', tag: 'Nuevo',
    render() {
      const groups = E.count(cmp.dim);
      if (groups.length < 2) return { html: U.empty('Se necesitan al menos dos grupos', `Con los filtros actuales solo hay un valor de ${esc(LABEL[cmp.dim].toLowerCase())}. Quita algún filtro o elige otra variable para comparar.`) };
      if (!groups.some(g => g.key === cmp.a)) cmp.a = groups[0].key;
      if (!groups.some(g => g.key === cmp.b) || cmp.b === cmp.a) cmp.b = groups.find(g => g.key !== cmp.a).key;
      if (cmp.by === cmp.dim) cmp.by = BY_DIMS.find(d => d !== cmp.dim);
      const k = C[cmp.dim], ia = S.idx.filter(i => R[i][k] === cmp.a), ib = S.idx.filter(i => R[i][k] === cmp.b);
      const byLabel = cmp.by === 'Estrato';
      const ca = E.count(cmp.by, { idx: ia, byLabel }), cb = E.count(cmp.by, { idx: ib, byLabel });
      const cats = [...new Map([...ca, ...cb].map(x => [x.key, x.label]))].map(([key, lab]) => ({ key, label: lab }));
      if (byLabel) cats.sort((x, y) => x.label.localeCompare(y.label, 'es', { numeric: true }));
      const sa = cats.map(c => ((ca.find(x => x.key === c.key) || { n: 0 }).n) * 100 / (ia.length || 1));
      const sb = cats.map(c => ((cb.find(x => x.key === c.key) || { n: 0 }).n) * 100 / (ib.length || 1));
      const diffs = cats.map((c, j) => ({ ...c, d: sa[j] - sb[j] }));
      const big = diffs.slice().sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
      const maxD = Math.max(1, ...diffs.map(d => Math.abs(d.d)));
      const la = label(cmp.dim, cmp.a), lb = label(cmp.dim, cmp.b), gopts = groups.map(g => [g.key, `${g.label} (${fmt(g.n)})`]);
      const segSel = (id, cur) => U.select(id, gopts, cur);
      return {
        html: `<section class="panel"><div class="controls" style="margin-bottom:var(--s3)"><label>Comparar grupos de${U.select('cdim', opts(SEG_DIMS), cmp.dim)}</label><label>Según${U.select('cby', opts(BY_DIMS.filter(d => d !== cmp.dim)), cmp.by)}</label></div>
          <div class="vs"><label style="display:grid;gap:3px"><span class="seg-a" style="font-weight:600;font-size:var(--fs-xs)">Grupo A</span>${segSel('ca', cmp.a)}</label><span class="vs-mid">vs</span><label style="display:grid;gap:3px"><span class="seg-b" style="font-weight:600;font-size:var(--fs-xs)">Grupo B</span>${segSel('cb', cmp.b)}</label></div></section>
        <div class="kpis">
          ${U.kpi({ label: 'Grupo A', value: fmt(ia.length), sub: esc(la) })}
          ${U.kpi({ label: 'Grupo B', value: fmt(ib.length), sub: esc(lb), accent: true })}
          ${U.kpi({ label: 'Mayor diferencia', value: big ? pp(big.d) : '—', sub: big ? `en ${esc(big.label)} (${big.d >= 0 ? 'más en A' : 'más en B'})` : '' })}
        </div>
        <div class="grid">
          ${U.chartPanel({ id: 'k1', title: `${LABEL[cmp.by]}: porcentaje dentro de cada grupo`, sub: 'Se comparan porcentajes para que el tamaño del grupo no distorsione la lectura', span: 7, tall: true })}
          ${U.panel({ span: 5, title: 'Diferencia en puntos porcentuales', sub: `Derecha: más frecuente en <span class="seg-a">A</span>. Izquierda: más frecuente en <span class="seg-b">B</span>.`,
            body: `<div class="diff">${diffs.map(d => { const w = Math.abs(d.d) / maxD * 50; return `<span title="${esc(d.label)}">${esc(short(d.label, 26))}</span><div class="diff-track"><i style="${d.d >= 0 ? `left:50%;width:${w}%;background:${CH.PAL[0]}` : `left:${50 - w}%;width:${w}%;background:${CH.PAL[1]}`}"></i></div><b class="n ${d.d >= 0 ? 'seg-a' : 'seg-b'}">${pp(d.d)}</b>`; }).join('')}</div>` })}
        </div>`,
        mount(el) {
          CH.draw('k1', { type: 'bar', percentAxis: true, horizontal: cats.length > 6, labels: cats.map(c => c.label), keys: cats.map(c => c.key), dim: cmp.by,
            series: [{ label: 'A · ' + la, data: sa, color: CH.PAL[0] }, { label: 'B · ' + lb, data: sb, color: CH.PAL[1] }] });
          el.onchange = e => {
            const t = e.target;
            if (t.id === 'cdim') { cmp.dim = t.value; cmp.a = cmp.b = null; }
            else if (t.id === 'cby') cmp.by = t.value;
            else if (t.id === 'ca') cmp.a = +t.value;
            else if (t.id === 'cb') cmp.b = +t.value;
            else return;
            App.render();
          };
        }
      };
    }
  });

  /* ---------------- Calidad de datos ---------------- */
  App.views.add({
    id: 'calidad', label: 'Calidad de datos', group: 'Análisis avanzado', icon: 'calidad', sub: 'Completitud, valores únicos y diversidad de cada columna',
    render() {
      const n = N();
      const rows = COLS.map(c => {
        const list = E.count(c), miss = list.filter(x => isMissing(c, x.key)).reduce((s, x) => s + x.n, 0);
        const valid = list.filter(x => !isMissing(c, x.key));
        return { c, distinct: valid.length, miss, complete: n ? (n - miss) / n : 0, top: valid[0], div: E.diversity(valid) };
      });
      const cells = n * COLS.length, missCells = rows.reduce((s, r) => s + r.miss, 0), full = rows.filter(r => !r.miss).length;
      return {
        html: `<div class="kpis">
          ${U.kpi({ label: 'Celdas analizadas', value: fmt(cells), sub: `${fmt(n)} filas × ${COLS.length} columnas` })}
          ${U.kpi({ label: 'Completitud global', value: pct(cells - missCells, cells, 2), sub: `${fmt(missCells)} celdas sin dato`, meter: (cells - missCells) / (cells || 1) })}
          ${U.kpi({ label: 'Columnas 100% completas', value: `${full} de ${COLS.length}`, sub: 'sin valores desconocidos', meter: full / COLS.length, accent: true })}
        </div>
        ${U.panel({ title: 'Perfil de cada columna', sub: 'Se consideran sin dato los valores «DESCONOCIDO» y «NO REGISTRA». La diversidad va de 0 (un solo valor domina) a 1 (valores repartidos por igual).',
          body: `<div class="table-wrap"><table class="quality"><thead><tr><th>Columna</th><th class="n">Valores únicos</th><th class="n">Sin dato</th><th>Completitud</th><th>Valor más frecuente</th><th class="n">Diversidad</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td><b>${esc(LABEL[r.c])}</b></td><td class="n">${fmt(r.distinct)}</td><td class="n">${r.miss ? fmt(r.miss) : '—'}</td>
            <td><div style="display:flex;gap:8px;align-items:center"><div class="qwrap"><div class="qfill" style="width:${(r.complete * 100).toFixed(2)}%"></div></div><span class="num">${pct(r.complete, 1)}</span></div></td>
            <td>${r.top ? `${esc(short(r.top.label, 34))} <span class="muted">(${pct(r.top.n, n)})</span>` : '—'}</td><td class="n">${dec(r.div, 2)}</td></tr>`).join('')}
          </tbody></table></div>` })}
        <div class="grid">${U.chartPanel({ id: 'q1', title: 'Registros sin dato por columna', span: 12 })}</div>`,
        mount() {
          const withMiss = rows.filter(r => r.miss).sort((a, b) => b.miss - a.miss);
          CH.draw('q1', { type: 'bar', horizontal: true, labels: withMiss.length ? withMiss.map(r => LABEL[r.c]) : ['Todas las columnas están completas'], total: n,
            series: [{ label: 'Sin dato', data: withMiss.length ? withMiss.map(r => r.miss) : [0], color: CH.css('--danger') }] });
        }
      };
    }
  });
})();
