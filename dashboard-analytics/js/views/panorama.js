'use strict';
/* ==========================================================================
   views/panorama.js — Resumen (mosaico de 100 estudiantes) y Hallazgos
   ========================================================================== */
(() => {
  const E = App.engine, S = App.store.state, U = App.ui, { fmt, pct, esc } = App.util, { LABEL, indexOf, meta } = App.data;

  /* ---------- Mosaico: reparte 100 cuadros con el método del mayor residuo ---------- */
  const WAFFLE_DIMS = [['Facultad', 'Facultad'], ['Sexo', 'Sexo'], ['Estrato', 'Estrato'], ['Modalidad', 'Modalidad'], ['TipoPrograma', 'Nivel'], ['Colegio', 'Colegio']];
  let waffleDim = 'Facultad';

  function waffleParts(c) {
    let items = E.count(c, c === 'Estrato' ? { byLabel: true } : {});
    if (items.length > 7) { const rest = items.slice(6).reduce((s, x) => s + x.n, 0); items = [...items.slice(0, 6), { key: null, label: 'Otros', n: rest }]; }
    const tot = items.reduce((s, x) => s + x.n, 0);
    const parts = items.map((x, i) => ({ ...x, color: App.charts.PAL[i % App.charts.PAL.length], exact: x.n * 100 / tot }));
    parts.forEach(p => (p.cells = Math.floor(p.exact)));
    let left = 100 - parts.reduce((s, p) => s + p.cells, 0);
    [...parts].sort((a, b) => (b.exact % 1) - (a.exact % 1)).forEach(p => { if (left > 0) { p.cells++; left--; } });
    return parts;
  }

  function hero() {
    const parts = waffleParts(waffleDim), n = S.idx.length;
    const cells = parts.flatMap((p, i) => Array.from({ length: p.cells }, (_, k) => `<span data-part="${i}" style="background:${p.color};animation-delay:${(k * 6 + i * 40) % 600}ms" title="${esc(p.label)}"></span>`)).join('');
    const filtered = Object.keys(S.filters).length;
    return `<section class="panel span-12 hero">
      <div>
        <h2><span class="big">${fmt(n)}</span> estudiantes ${filtered ? 'en tu selección' : 'matriculados en ' + meta.ano}</h2>
        <p class="hero-lead">Cada cuadro representa al 1% de ${filtered ? 'la selección' : 'la población'}. Cambia la variable para ver cómo se reparte y haz clic en un grupo para filtrarlo.</p>
        ${U.seg('waffle', WAFFLE_DIMS, waffleDim, 'Variable del mosaico')}
        <div class="legend">${parts.map((p, i) => `<button data-part="${i}" data-key="${p.key ?? ''}"${p.key === null ? ' disabled' : ''}><i style="background:${p.color}"></i><span>${esc(p.label)}</span><small>${fmt(p.n)} · ${pct(p.n, n)}</small></button>`).join('')}</div>
      </div>
      <div><div class="waffle" aria-hidden="true">${cells}</div><p class="waffle-note">10 × 10 = 100% · agrupado por ${LABEL[waffleDim].toLowerCase()}</p></div>
    </section>`;
  }

  const insightCard = x => `<article class="insight is-${x.tone}"><h4>${esc(x.title)}</h4><div class="fig">${x.fig}</div><p>${esc(x.text)}</p><button data-go="${x.view}">Ver detalle</button></article>`;

  App.views.add({
    id: 'resumen', label: 'Resumen', group: 'Panorama', icon: 'resumen', sub: 'Vista general de la población estudiantil',
    render() {
      const n = S.idx.length, sx = E.count('Sexo'), fem = (sx.find(x => x.label === 'Femenino') || { n: 0 }).n;
      const es = E.countMap('Estrato'), e13 = ['1', '2', '3'].reduce((t, e) => t + (es[indexOf('Estrato', e)] || 0), 0);
      const md = E.count('Modalidad').find(x => x.label === 'Virtual'), pub = E.count('Colegio').find(x => x.label === 'Público');
      const prog = E.count('Programa'), div = E.diversity(prog);
      const ins = App.insights.generate().slice(0, 3);
      return {
        html: `<div class="grid">${hero()}</div>
        <div class="kpis">
          ${U.kpi({ label: 'Programas activos', value: fmt(prog.length), sub: `Diversidad de la oferta: ${div.toFixed(2).replace('.', ',')} de 1`, meter: div })}
          ${U.kpi({ label: 'Sedes con estudiantes', value: fmt(E.count('Sede').length), sub: `${E.countSedeGroups().length} tipos de sede` })}
          ${U.kpi({ label: 'Mujeres', value: pct(fem, n), sub: fmt(fem) + ' estudiantes', meter: fem / n })}
          ${U.kpi({ label: 'Estratos 1 a 3', value: pct(e13, n), sub: fmt(e13) + ' estudiantes', meter: e13 / n, accent: true })}
          ${U.kpi({ label: 'Modalidad virtual', value: pct(md ? md.n : 0, n), sub: fmt(md ? md.n : 0) + ' estudiantes', meter: (md ? md.n : 0) / n })}
          ${U.kpi({ label: 'Colegio público', value: pct(pub ? pub.n : 0, n), sub: fmt(pub ? pub.n : 0) + ' estudiantes', meter: (pub ? pub.n : 0) / n, accent: true })}
        </div>
        ${ins.length ? `<section class="panel"><header class="panel-head"><div><h3>Lo que dicen los datos</h3><p>Conclusiones calculadas automáticamente con los filtros activos.</p></div><div class="panel-tools"><button class="btn btn-ghost" data-go="hallazgos">Ver todos los hallazgos</button></div></header><div class="insights">${ins.map(insightCard).join('')}</div></section>` : ''}
        <div class="grid">
          ${U.chartPanel({ id: 'r1', title: 'Estudiantes por facultad', span: 4 })}
          ${U.chartPanel({ id: 'r2', title: 'Distribución por estrato', span: 4 })}
          ${U.chartPanel({ id: 'r3', title: 'Modalidad de estudio', span: 4 })}
          ${U.chartPanel({ id: 'r4', title: 'Los 10 programas más grandes', span: 6, tall: true })}
          ${U.chartPanel({ id: 'r5', title: 'Las 10 sedes con más estudiantes', span: 6, tall: true })}
        </div>`,
        mount(el) {
          const C = App.charts;
          C.single('r1', 'doughnut', E.count('Facultad'), { dim: 'Facultad' });
          C.single('r2', 'bar', E.count('Estrato', { byLabel: true }), { dim: 'Estrato' });
          C.single('r3', 'doughnut', E.count('Modalidad'), { dim: 'Modalidad' });
          C.single('r4', 'bar', E.count('Programa').slice(0, 10), { dim: 'Programa', horizontal: true, total: n });
          C.single('r5', 'bar', E.count('Sede').slice(0, 10), { dim: 'Sede', horizontal: true, total: n });
          const waffle = el.querySelector('.waffle'), legend = el.querySelector('.legend');
          const hot = i => {
            waffle.classList.toggle('has-hot', i !== null);
            waffle.querySelectorAll('span').forEach(s => s.classList.toggle('is-hot', s.dataset.part === i));
            legend.querySelectorAll('button').forEach(b => b.classList.toggle('is-hot', b.dataset.part === i));
          };
          el.onmouseover = e => { const p = e.target.closest('[data-part]'); hot(p ? p.dataset.part : null); };
          el.onfocusin = e => { const p = e.target.closest('.legend [data-part]'); if (p) hot(p.dataset.part); };
          el.onclick = e => {
            const s = e.target.closest('[data-seg="waffle"]'), b = e.target.closest('.legend button');
            if (s) { waffleDim = s.dataset.val; App.render(); }
            else if (b && b.dataset.key !== '') App.store.toggleFilter(waffleDim, +b.dataset.key);
          };
        }
      };
    }
  });

  App.views.add({
    id: 'hallazgos', label: 'Hallazgos', group: 'Panorama', icon: 'hallazgos', sub: 'Conclusiones automáticas y preguntas de análisis',
    render() {
      const ins = App.insights.generate();
      return {
        html: `<section class="panel"><header class="panel-head"><div><h3>Hallazgos automáticos</h3><p>Se recalculan con cada filtro. Prueba a filtrar una facultad o una sede y observa cómo cambian.</p></div></header>
          <div class="insights">${ins.map(insightCard).join('') || '<p class="hint">No hay suficientes datos para generar hallazgos.</p>'}</div></section>
          <section class="panel"><header class="panel-head"><div><h3>Preguntas de análisis</h3><p>Respuestas calculadas en vivo sobre ${fmt(S.idx.length)} registros.</p></div>
          <div class="panel-tools"><button class="btn btn-ghost" id="qa-csv">${App.ui.icon('download')} Descargar CSV</button></div></header>
          <div class="qa">${App.questions.LIST.map((x, i) => `<details${i < 3 ? ' open' : ''}><summary>${esc(x.q)}</summary><p>${esc(App.questions.answer(x))}</p></details>`).join('')}</div></section>`,
        mount(el) { el.querySelector('#qa-csv').onclick = App.questions.exportCSV; }
      };
    }
  });
})();
