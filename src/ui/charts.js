'use strict';
/* =========================================================
   charts.js · Capa sobre Chart.js
   - Toma colores del tema (claro/oscuro) desde variables CSS
   - Clic en barra o sector = filtra por ese valor (drill-down exacto por índice)
   ========================================================= */
(() => {
  const U = App.util, CH = {};
  const ok = () => typeof Chart !== 'undefined';
  const pal = () => [1, 2, 3, 4, 5, 6, 7, 8].map(i => U.css('--c' + i));

  function theme() {
    if (!ok()) return;
    Chart.defaults.font.family = U.css('--font-ui') || 'system-ui';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = U.css('--muted');
    Chart.defaults.borderColor = U.css('--line');
    Chart.defaults.plugins.tooltip.backgroundColor = U.css('--ink');
    Chart.defaults.plugins.tooltip.titleColor = U.css('--surface');
    Chart.defaults.plugins.tooltip.bodyColor = U.css('--surface');
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
  }

  function destroyAll() { Object.keys(CH).forEach(k => { CH[k].destroy(); delete CH[k]; }); }

  /* Construye la gráfica. meta[k] guarda qué filtro aplicar al hacer clic en el elemento k */
  function make(id, cfg, onPick) {
    if (!ok()) return;
    const el = document.getElementById(id); if (!el) return;
    if (CH[id]) CH[id].destroy();
    cfg.options = Object.assign({
      responsive: true, maintainAspectRatio: false,
      animation: { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 },
      onHover: (e, els) => { e.native.target.style.cursor = els.length && onPick ? 'pointer' : 'default'; },
      onClick: (_, els) => { if (els.length && onPick) onPick(els[0]); }
    }, cfg.options || {});
    CH[id] = new Chart(el, cfg);
  }

  const fullTitle = labels => ({ title: t => labels[t[0].dataIndex] });
  const drill = (dim, items) => el => {
    const it = items[el.index]; if (!it) return;
    App.setFilter(dim, it.i); U.toast(`Filtro aplicado: ${App.data.DIM[dim]} = ${it.name}`);
  };

  /* Barras simples. o: { dim, n, h (horizontal), color, pctOf } */
  function bars(id, items, o = {}) {
    const it = items.slice(0, o.n || 10), labels = it.map(x => x.name), tot = o.pctOf || it.reduce((s, x) => s + x.n, 0);
    const color = o.color || U.css('--c1');
    make(id, {
      type: 'bar',
      data: { labels: labels.map(l => U.short(l, o.h ? 30 : 16)), datasets: [{ label: 'Estudiantes', data: it.map(x => x.n), backgroundColor: color, hoverBackgroundColor: U.css('--accent'), borderRadius: 4, maxBarThickness: 34 }] },
      options: {
        indexAxis: o.h ? 'y' : 'x',
        plugins: { legend: { display: false }, tooltip: { callbacks: { ...fullTitle(labels), label: c => ` ${U.fmt(c.raw)} estudiantes · ${U.pct(c.raw, tot)}` } } },
        scales: { x: { grid: { display: !!o.h }, ticks: { autoSkip: !o.h ? false : true, maxRotation: 45 } }, y: { grid: { display: !o.h }, beginAtZero: true } }
      }
    }, o.dim ? drill(o.dim, it) : null);
  }

  /* Dona. Agrupa lo que no cabe en "Otros" */
  function donut(id, items, o = {}) {
    const n = o.n || 6; let it = items.slice(0, n);
    const rest = items.slice(n).reduce((s, x) => s + x.n, 0);
    if (rest) it = [...it, { i: null, name: 'Otros', n: rest }];
    const tot = it.reduce((s, x) => s + x.n, 0), labels = it.map(x => x.name), P = pal();
    make(id, {
      type: 'doughnut',
      data: { labels: labels.map(l => U.short(l, 26)), datasets: [{ data: it.map(x => x.n), backgroundColor: it.map((_, j) => P[j % P.length]), borderColor: U.css('--surface'), borderWidth: 2, hoverOffset: 6 }] },
      options: { cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { ...fullTitle(labels), label: c => ` ${U.fmt(c.raw)} · ${U.pct(c.raw, tot)}` } } } }
    }, o.dim ? el => { const x = it[el.index]; if (x && x.i !== null) { App.setFilter(o.dim, x.i); U.toast(`Filtro aplicado: ${App.data.DIM[o.dim]} = ${x.name}`); } } : null);
  }

  /* Barras apiladas a × b. o: { n, h, percent } — percent normaliza cada barra al 100% */
  function stack(id, a, b, idx, o = {}) {
    const x = App.data.cross(a, b, idx, o), rows = x.rows.slice(0, o.n || 10), P = pal(), labels = rows.map(r => r.name);
    const val = (r, j) => (o.percent ? U.pctN(r.v[j], r.n) : r.v[j]);
    make(id, {
      type: 'bar',
      data: { labels: labels.map(l => U.short(l, o.h ? 28 : 16)), datasets: x.cols.map((c, j) => ({ label: c.name, data: rows.map(r => val(r, j)), backgroundColor: P[j % P.length], borderWidth: 0, maxBarThickness: 34 })) },
      options: {
        indexAxis: o.h ? 'y' : 'x',
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { ...fullTitle(labels), label: c => ` ${c.dataset.label}: ${o.percent ? U.num(c.raw) + '%' : U.fmt(c.raw)}` } } },
        scales: { x: { stacked: true, grid: { display: !!o.h }, max: o.percent && o.h ? 100 : undefined }, y: { stacked: true, beginAtZero: true, max: o.percent && !o.h ? 100 : undefined, grid: { display: !o.h } } }
      }
    }, el => { const r = rows[el.index], c = x.cols[el.datasetIndex]; if (!r || !c) return; App.setFilters({ [a]: r.i, [b]: c.i }); U.toast(`Filtros: ${r.name} + ${c.name}`); });
  }

  /* Pirámide: dos series enfrentadas (izquierda negativa) */
  function pyramid(id, rowsDim, sideDim, left, right, idx) {
    const x = App.data.cross(rowsDim, sideDim, idx, { byLabel: true });
    const jl = x.cols.findIndex(c => c.raw === left), jr = x.cols.findIndex(c => c.raw === right);
    const rows = x.rows.slice().reverse(), labels = rows.map(r => r.name);
    make(id, {
      type: 'bar',
      data: { labels, datasets: [
        { label: App.util.tc(left), data: rows.map(r => -(jl >= 0 ? r.v[jl] : 0)), backgroundColor: U.css('--c1'), borderRadius: 3 },
        { label: App.util.tc(right), data: rows.map(r => (jr >= 0 ? r.v[jr] : 0)), backgroundColor: U.css('--c3'), borderRadius: 3 }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.fmt(Math.abs(c.raw))}` } } },
        scales: { x: { stacked: true, ticks: { callback: v => U.fmt(Math.abs(v)) } }, y: { stacked: true, grid: { display: false } } }
      }
    }, el => { const r = rows[el.index]; if (r) { App.setFilter(rowsDim, r.i); U.toast(`Filtro aplicado: ${r.name}`); } });
  }

  /* Exporta el canvas con fondo y título a PNG */
  function png(id, title) {
    const cv = document.getElementById(id); if (!cv) return;
    const o = document.createElement('canvas'), g = o.getContext('2d'), pad = 56, sc = 2;
    o.width = cv.width; o.height = cv.height + pad * sc / 1.2;
    g.fillStyle = U.css('--surface'); g.fillRect(0, 0, o.width, o.height);
    g.fillStyle = U.css('--ink'); g.font = `600 ${16 * sc}px ${U.css('--font-display') || 'sans-serif'}`;
    g.fillText(title, 16 * sc, 26 * sc);
    g.fillStyle = U.css('--muted'); g.font = `${11 * sc}px sans-serif`;
    g.fillText(`${U.fmt(App.S.idx.length)} estudiantes con los filtros actuales`, 16 * sc, 42 * sc);
    g.drawImage(cv, 0, pad * sc / 1.2);
    o.toBlob(b => U.download(title.replace(/[^\wÁÉÍÓÚáéíóúñÑ]+/g, '_') + '.png', b));
  }

  Object.assign(App.ui, { chartsReady: ok, theme, destroyAll, bars, donut, stack, pyramid, png, palette: pal });
})();
