'use strict';
/* ==========================================================================
   ui/charts.js — Envoltorio de Chart.js: colores del tema, tooltips con %,
   clic para filtrar (drill-down), descarga PNG y vista ampliada.
   ========================================================================== */
App.charts = (() => {
  const PAL = ['#0e7c72', '#e3a21a', '#3e5c9a', '#c2476b', '#7ba05b', '#4fa3c7', '#8a5a9e', '#b08d57', '#5b6e71', '#2f9e8f', '#d0743c', '#6d8fc7'];
  const live = {}, specs = {};
  const { fmt, pct, short } = App.util;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const ok = () => typeof Chart !== 'undefined';

  function applyTheme() {
    if (!ok()) return;
    Chart.defaults.color = css('--muted');
    Chart.defaults.borderColor = css('--line');
    Chart.defaults.font.family = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = css('--ink');
    Chart.defaults.plugins.tooltip.titleColor = css('--bg');
    Chart.defaults.plugins.tooltip.bodyColor = css('--bg');
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.boxHeight = 12;
  }

  /* Construye la configuración de Chart.js a partir de una especificación simple:
     { type, items:[{key,label,n}] | labels+series:[{label,data,key}], dim, dim2, keys,
       horizontal, stacked, percentAxis, config (config cruda para casos especiales) } */
  function build(s) {
    if (s.config) return s.config();
    const round = s.type === 'doughnut';
    const labels = s.items ? s.items.map(x => x.label) : s.labels;
    const series = s.items ? [{ label: 'Estudiantes', data: s.items.map(x => x.n) }] : s.series;
    const total = s.total || (s.items ? s.items.reduce((a, x) => a + x.n, 0) : null);
    const primary = css('--primary');
    return {
      type: s.type,
      data: {
        labels: labels.map(l => short(l, 30)),
        datasets: series.map((d, i) => ({
          label: d.label, data: d.data,
          backgroundColor: round ? labels.map((_, j) => PAL[j % PAL.length]) : d.color || (series.length > 1 ? PAL[i % PAL.length] : primary),
          borderColor: round ? css('--surface') : 'transparent', borderWidth: round ? 2 : 0,
          borderRadius: round ? 0 : 4, maxBarThickness: 38
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: s.horizontal ? 'y' : 'x', cutout: round ? '62%' : undefined,
        plugins: {
          legend: { display: round || series.length > 1, position: 'bottom' },
          tooltip: { callbacks: {
            title: t => labels[t[0].dataIndex],
            label: t => {
              const v = t.raw, tot = s.stacked ? t.chart.data.datasets.reduce((a, d) => a + (d.data[t.dataIndex] || 0), 0) : total;
              return ` ${series.length > 1 ? t.dataset.label + ': ' : ''}${s.percentAxis ? v.toFixed(1).replace('.', ',') + '%' : fmt(v)}${tot && !s.percentAxis ? ' (' + pct(v, tot) + ')' : ''}`;
            } } }
        },
        scales: round ? {} : {
          x: { stacked: !!s.stacked, grid: { display: !!s.horizontal }, ticks: s.horizontal && s.percentAxis ? { callback: v => v + '%' } : {} },
          y: { stacked: !!s.stacked, beginAtZero: true, grid: { display: !s.horizontal }, ticks: !s.horizontal && s.percentAxis ? { callback: v => v + '%' } : {} }
        },
        onClick: (e, els) => drill(s, els),
        onHover: (e, els) => { e.native.target.style.cursor = els.length && s.dim ? 'pointer' : 'default'; }
      }
    };
  }

  /* Clic en una barra o sector → aplica ese valor como filtro */
  function drill(s, els) {
    if (!els.length || !s.dim) return;
    const { index, datasetIndex } = els[0];
    const key = (s.keys || s.items.map(x => x.key))[index];
    if (key === undefined) return;
    if (s.dim2 && s.series && s.series[datasetIndex].key !== undefined) App.store.state.filters[s.dim2] = s.series[datasetIndex].key;
    App.store.toggleFilter(s.dim, key);
  }

  function draw(id, spec) {
    specs[id] = spec;
    if (!ok()) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (live[id]) live[id].destroy();
    live[id] = new Chart(el, build(spec));
  }
  const destroyAll = () => { Object.keys(live).forEach(k => { live[k].destroy(); delete live[k]; }); };

  /* Descarga PNG con título y número de registros */
  function png(id, title) {
    const ch = live[id]; if (!ch) return;
    const cv = ch.canvas, o = document.createElement('canvas'), g = o.getContext('2d'), pad = 56;
    o.width = cv.width; o.height = cv.height + pad;
    g.fillStyle = css('--surface'); g.fillRect(0, 0, o.width, o.height);
    g.fillStyle = css('--ink'); g.font = '600 20px "Bricolage Grotesque", sans-serif'; g.fillText(title, 16, 30);
    g.fillStyle = css('--muted'); g.font = '13px "IBM Plex Sans", sans-serif'; g.fillText(`${fmt(App.store.state.idx.length)} registros filtrados`, 16, 48);
    g.drawImage(cv, 0, pad);
    o.toBlob(b => App.util.download(b, title.replace(/[^\wáéíóúñ]+/gi, '_') + '.png'));
  }

  /* Vista ampliada en una ventana grande */
  function expand(id, title) {
    if (!specs[id] || !ok()) return;
    App.ui.modal(`<div class="panel-head"><h3>${App.util.esc(title)}</h3><button class="tool" data-close aria-label="Cerrar">${App.ui.icon('x')}</button></div><div class="chart-box"><canvas id="zoom"></canvas></div>`, 'wide',
      () => { if (live.zoom) { live.zoom.destroy(); delete live.zoom; } });
    live.zoom = new Chart(document.getElementById('zoom'), build(specs[id]));
  }

  /* Atajos: una variable, o barras apiladas de un cruce a × b */
  const single = (id, type, items, o = {}) => draw(id, { type, items, ...o });
  function stacked(id, a, b, o = {}) {
    const x = App.engine.cross(a, b, o);
    draw(id, { type: 'bar', stacked: true, horizontal: o.horizontal, dim: a, dim2: b, labels: x.rows.map(r => r.label), keys: x.rows.map(r => r.key),
      series: x.cols.map((c, j) => ({ label: c.label, key: c.key, data: x.rows.map(r => r.cells[j]) })) });
  }
  return { PAL, applyTheme, draw, single, stacked, destroyAll, png, expand, css, live };
})();
