'use strict';
/* ==========================================================================
   app.js — Arranque: construye el menú, conecta eventos globales y define el
   ciclo de renderizado  (estado → cálculo → filtros → vista → gráficas).
   ========================================================================== */
(() => {
  const S = App.store.state, U = App.ui, { fmt, esc } = App.util, $ = s => document.querySelector(s);

  function buildNav() {
    $('#nav').innerHTML = App.views.GROUPS.map(g => {
      const items = App.views.list().filter(v => v.group === g);
      return `<div class="nav-group"><h4>${g}</h4>${items.map(v => `<button class="nav-btn" data-view="${v.id}">${U.icon(v.icon)}<span>${v.label}</span>${v.tag ? `<span class="tag">${v.tag}</span>` : ''}</button>`).join('')}</div>`;
    }).join('');
  }

  function render() {
    const t0 = performance.now();
    const main = $('#view');
    App.charts.destroyAll();
    ['onclick', 'onchange', 'oninput', 'onmouseover', 'onfocusin'].forEach(k => (main[k] = null));
    App.engine.recompute();
    App.filters.refresh();

    let v = App.views.get(S.view);
    if (!v) { S.view = 'resumen'; v = App.views.get('resumen'); }
    document.querySelectorAll('.nav-btn').forEach(b => (b.dataset.view === v.id ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    $('#crumb').textContent = v.group;
    $('#title').textContent = v.label;
    $('#subtitle').textContent = v.sub || '';
    document.title = `${v.label} · Observatorio estudiantil`;
    const n = S.idx.length, total = App.data.R.length;
    $('#lens-bar').style.width = (n / total * 100).toFixed(2) + '%';
    $('#lens-text').textContent = n === total ? `${fmt(total)} registros · año ${App.data.meta.ano}` : `${fmt(n)} de ${fmt(total)} registros (${App.util.pct(n, total)})`;

    if (!n && v.group !== 'Proyecto') {
      main.innerHTML = U.empty('Ningún estudiante cumple estos filtros', 'Quita uno de los filtros activos para volver a ver datos.', '<p style="margin-top:12px"><button class="btn" data-clear-all>Limpiar filtros</button></p>');
    } else {
      const out = v.render();
      main.innerHTML = out.html;
      out.mount && out.mount(main);
    }
    document.body.classList.remove('nav-open');
    $('#perf').textContent = `Calculado en ${Math.round(performance.now() - t0)} ms`;
  }
  App.render = render;

  function init() {
    App.store.init();
    App.theme.init();
    buildNav();
    App.filters.mount($('#filters'));
    $('#src').innerHTML = `Fuente: ${esc(App.data.meta.archivo)}<br>${fmt(App.data.R.length)} registros · ${App.data.COLS.length} columnas<br><span id="perf"></span>`;
    if (typeof Chart === 'undefined') $('#filters').insertAdjacentHTML('afterend', '<p class="warn">No se pudo cargar la librería de gráficas (Chart.js). Revisa la conexión a internet: las tablas y los indicadores siguen funcionando.</p>');

    /* Eventos globales (delegados) */
    $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) { App.store.setView(b.dataset.view); scrollTo(0, 0); } });
    document.addEventListener('click', e => {
      if (document.body.classList.contains('nav-open') && !e.target.closest('.side, [data-action="menu"]')) document.body.classList.remove('nav-open');
      const t = e.target.closest('[data-chart], [data-go], [data-clear-all], [data-action]');
      if (!t) return;
      if (t.dataset.chart === 'png') App.charts.png(t.dataset.id, t.dataset.title);
      else if (t.dataset.chart === 'expand') App.charts.expand(t.dataset.id, t.dataset.title);
      else if (t.dataset.go) { App.store.setView(t.dataset.go); scrollTo(0, 0); }
      else if (t.hasAttribute('data-clear-all')) App.store.clearFilters();
      else ({ word: App.report.open, csv: () => App.exporter.csv(), link: App.exporter.link, theme: App.theme.toggle, palette: App.palette.open, menu: () => document.body.classList.toggle('nav-open') })[t.dataset.action]();
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); App.palette.open(); }
    });
    window.addEventListener('resize', App.util.debounce(() => { if (S.view === 'programas') render(); }, 250));
    App.store.on('change', render);
    App.store.on('theme', () => { if ($('#view').children.length) render(); });
    render();
  }
  init();
})();
