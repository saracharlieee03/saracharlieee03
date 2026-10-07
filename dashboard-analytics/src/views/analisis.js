'use strict';
/* =========================================================
   Vistas de análisis: Tabla dinámica · Comparador · Preguntas
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;
  const DIMS = ['Facultad', 'Sede', 'Programa', 'Area', 'Sexo', 'Estrato', 'Modalidad', 'TipoInscripcion', 'TipoPrograma', 'Colegio', 'Comuna', 'Departamento', 'Pais'];
  const opts = DIMS.map(d => [d, Dt.DIM[d]]);

  /* ---------- Tabla dinámica con mapa de calor ---------- */
  S.pivot = { a: 'Facultad', b: 'Estrato', mode: 'row', rows: 15 };
  App.views.cruces = {
    title: 'Tabla dinámica', group: 'Análisis', icon: 'grid',
    desc: 'Cruza dos variables y encuentra patrones por color.',
    render(idx) {
      const p = S.pivot;
      return [`<section class="card c12"><header class="card-h wrap"><div><h3>Cruce de variables</h3><p>El color más intenso marca los valores más altos. Clic en una celda para filtrar ese cruce.</p></div>
          <div class="pv-ctl">${ui.select('pa', opts, p.a, 'Filas')}${ui.select('pb', opts.filter(o => o[0] !== p.a), p.b, 'Columnas')}
          ${ui.select('pr', [[10, '10 filas'], [15, '15 filas'], [30, '30 filas'], [100, 'Todas']], p.rows, 'Mostrar')}</div></header>
          <div class="pv-mode">${ui.seg('pmode', [['n', 'Cantidad'], ['row', '% de la fila'], ['col', '% de la columna'], ['tot', '% del total']], p.mode)}
          <button class="btn sm ghost" id="pcsv">${ui.icon('download', 15)} CSV</button></div>
          <div id="heat"></div><p class="note" id="pnote"></p></section>`, () => {
        const r = ui.heatmap(U.$('#heat'), p.a, p.b, idx, p.mode, +p.rows);
        U.$('#pnote').textContent = { n: 'Número de estudiantes en cada cruce.', row: 'Cada fila suma 100%: compara la composición de cada ' + Dt.DIM[p.a].toLowerCase() + '.', col: 'Cada columna suma 100%: de dónde viene cada ' + Dt.DIM[p.b].toLowerCase() + '.', tot: 'Porcentaje sobre todos los estudiantes filtrados.' }[p.mode];
        U.$('#pa').onchange = e => { p.a = e.target.value; if (p.b === p.a) p.b = DIMS.find(d => d !== p.a); App.render(); };
        U.$('#pb').onchange = e => { p.b = e.target.value; App.render(); };
        U.$('#pr').onchange = e => { p.rows = +e.target.value; App.render(); };
        U.$('[data-seg="pmode"]').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { p.mode = b.dataset.v; App.render(); } };
        U.$('#pcsv').onclick = () => {
          const lines = [[Dt.DIM[p.a], ...r.x.cols.map(c => c.name), 'Total'].map(ui.cellCSV).join(',')];
          r.rows.forEach(row => lines.push([row.name, ...row.v.map((_, j) => p.mode === 'n' ? row.v[j] : U.num(r.val(row, j), 2)), row.n].map(ui.cellCSV).join(',')));
          U.download(`tabla_dinamica_${U.stamp()}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8'); U.toast('Tabla dinámica exportada');
        };
      }];
    }
  };

  /* ---------- Comparador de segmentos ---------- */
  S.cmp = { da: 'Sexo', a: null, db: 'Sexo', b: null };
  const METRICS = ['Sexo', 'Estrato', 'Modalidad', 'Colegio', 'TipoPrograma', 'Facultad', 'TipoInscripcion'];
  App.views.comparador = {
    title: 'Comparador', group: 'Análisis', icon: 'compare',
    desc: 'Pon dos grupos frente a frente y mira en qué se diferencian.',
    render(idx) {
      const c = S.cmp;
      const vals = d => Dt.count(d, idx);
      if (c.a === null || !vals(c.da).some(x => x.i === +c.a)) c.a = vals(c.da)[0]?.i ?? 0;
      if (c.b === null || !vals(c.db).some(x => x.i === +c.b)) c.b = (vals(c.db)[1] || vals(c.db)[0])?.i ?? 0;
      const ia = Dt.apply({ [c.da]: c.a }, idx), ib = Dt.apply({ [c.db]: c.b }, idx);
      const la = Dt.label(c.da, c.a), lb = Dt.label(c.db, c.b);
      const side = (k, d, v) => `<div class="cmp-pick ${k}">${ui.select('cd' + k, opts, d, 'Grupo ' + k.toUpperCase() + ': variable')}${ui.select('cv' + k, vals(d).map(x => [x.i, `${x.name} (${U.fmt(x.n)})`]), v, 'Valor')}</div>`;
      const block = m => {
        const ca = Dt.count(m, ia, { byLabel: m === 'Estrato' }), cb = Dt.count(m, ib), all = [...new Set([...ca, ...cb].map(x => x.i))];
        const ma = Object.fromEntries(ca.map(x => [x.i, x.n])), mb = Object.fromEntries(cb.map(x => [x.i, x.n]));
        let rows = all.map(i => ({ name: Dt.label(m, i), raw: Dt.raw(m, i), pa: U.pctN(ma[i] || 0, ia.length), pb: U.pctN(mb[i] || 0, ib.length) }));
        rows.sort(m === 'Estrato' ? (x, y) => x.raw.localeCompare(y.raw, 'es', { numeric: true }) : (x, y) => (y.pa + y.pb) - (x.pa + x.pb));
        rows = rows.slice(0, 6);
        return `<section class="card c6 cmp"><header class="card-h"><div><h3>${Dt.DIM[m]}</h3></div></header>${rows.map(r => {
          const d = r.pa - r.pb;
          return `<div class="cmp-row"><span class="cmp-l" title="${U.esc(r.name)}">${U.esc(U.short(r.name.replace(/^Facultad de /, ''), 26))}</span>
            <span class="cmp-a"><i style="width:${r.pa}%"></i><em>${U.num(r.pa)}%</em></span><span class="cmp-b"><i style="width:${r.pb}%"></i><em>${U.num(r.pb)}%</em></span>
            <span class="cmp-d ${Math.abs(d) >= 5 ? (d > 0 ? 'up' : 'down') : ''}">${d > 0 ? '+' : ''}${U.num(d)} pp</span></div>`;
        }).join('')}</section>`;
      };
      const html = `<section class="card c12 cmp-top"><div class="cmp-picks">${side('a', c.da, c.a)}<span class="vs">vs</span>${side('b', c.db, c.b)}</div>
          <div class="cmp-sum"><div class="a"><b>${U.fmt(ia.length)}</b><span>${U.esc(la)}</span></div><div class="b"><b>${U.fmt(ib.length)}</b><span>${U.esc(lb)}</span></div></div>
          <p class="note">Cada fila muestra el porcentaje dentro de cada grupo. "pp" son puntos porcentuales de diferencia (A menos B); se resaltan las diferencias de 5 pp o más.</p></section>
        <div class="grid">${ia.length && ib.length ? METRICS.filter(m => m !== c.da || m !== c.db).map(block).join('') : `<div class="c12">${ui.empty('Uno de los grupos no tiene estudiantes con los filtros actuales.')}</div>`}</div>`;
      return [html, () => {
        ['a', 'b'].forEach(k => {
          U.$('#cd' + k).onchange = e => { c['d' + k] = e.target.value; c[k] = null; App.render(); };
          U.$('#cv' + k).onchange = e => { c[k] = +e.target.value; App.render(); };
        });
      }];
    }
  };

  /* ---------- Preguntas de análisis + pregunta libre ---------- */
  App.views.preguntas = {
    title: 'Preguntas de análisis', group: 'Análisis', icon: 'help',
    desc: 'Respuestas que se recalculan con los filtros activos.',
    render(idx) {
      const I = App.feat.insights;
      return [`<section class="card c12 askbox"><header class="card-h"><div><h3>Pregúntale a los datos</h3><p>Escribe con tus palabras: detecto sedes, programas, facultades, comunas, sexo, estrato, modalidad y más.</p></div></header>
          <form id="askf" class="ask"><input id="askq" class="input" placeholder="Ej.: mujeres de estrato 2 en modalidad virtual" aria-label="Pregunta"><button class="btn">Calcular</button></form><div id="askr"></div></section>
        <section class="card c12"><header class="card-h"><div><h3>Preguntas del análisis</h3><p>${I.QUESTIONS.length} preguntas calculadas sobre ${U.fmt(idx.length)} estudiantes.</p></div>
          <button class="btn sm ghost" id="qacsv">${ui.icon('download', 15)} Exportar</button></header>
          <div class="qa-list">${I.QUESTIONS.map((x, j) => `<details class="qa"${j < 3 ? ' open' : ''}><summary><span class="qn">${j + 1}</span>${U.esc(x.q)}</summary><p>${U.esc(I.answer(x))}</p>
            <button class="icon-btn" data-copy="${j}" title="Copiar respuesta" aria-label="Copiar respuesta">${ui.icon('copy', 15)}</button></details>`).join('')}</div></section>`, v => {
        U.$('#qacsv').onclick = App.feat.exports.qa;
        v.querySelectorAll('[data-copy]').forEach(b => { b.onclick = async () => { const x = I.QUESTIONS[+b.dataset.copy]; try { await navigator.clipboard.writeText(x.q + '\n' + I.answer(x)); U.toast('Respuesta copiada'); } catch (e) { U.toast('No se pudo copiar', 'warn'); } }; });
        U.$('#askf').onsubmit = e => {
          e.preventDefault(); const t = U.$('#askq').value.trim(); if (!t) return;
          const r = I.ask(t), keys = Object.keys(r.f);
          U.$('#askr').innerHTML = keys.length
            ? `<div class="ask-out"><b>${U.fmt(r.n)}</b><span>estudiantes cumplen ${keys.map(c => `<em>${Dt.DIM[c]}: ${U.esc(Dt.label(c, r.f[c]))}</em>`).join(' ')} · ${U.pct(r.n, r.base)} de los ${U.fmt(r.base)} filtrados</span><button class="btn sm" id="askap">Aplicar como filtros</button></div>`
            : `<p class="note">No reconocí valores en la pregunta. Prueba con nombres de sedes, programas o palabras como "mujeres", "virtual", "estrato 3", "público".</p>`;
          const ap = U.$('#askap'); if (ap) ap.onclick = () => App.setFilters(r.f);
        };
      }];
    }
  };
})();
