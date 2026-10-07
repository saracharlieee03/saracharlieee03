'use strict';
/* =========================================================
   app.js · Arranque: menú lateral, encabezado, tema, atajos y render
   Es el único archivo que conecta todas las capas.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;

  App.nav = [
    { g: 'Panorama', items: ['resumen', 'mapa', 'tresd'] },
    { g: 'Población', items: ['demografia', 'procedencia'] },
    { g: 'Oferta académica', items: ['academico', 'sedes', 'modalidad'] },
    { g: 'Análisis', items: ['cruces', 'comparador', 'preguntas'] },
    { g: 'Datos', items: ['explorador', 'reportes'] }
  ];

  /* ---------- Tema claro / oscuro ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t; U.store.set('dash_theme', t);
    const b = U.$('#theme'); if (b) { b.innerHTML = ui.icon(t === 'dark' ? 'sun' : 'moon', 18); b.setAttribute('aria-label', t === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'); }
    ui.theme();
  }
  App.toggleTheme = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); App.render(); };

  /* ---------- Estructura fija ---------- */
  function layout() {
    U.$('#nav').innerHTML = App.nav.map(g => `<div class="nav-g"><p>${g.g}</p>${g.items.map(v => {
      const w = App.views[v];
      return `<a href="#${v}" data-v="${v}">${ui.icon(w.icon, 18)}<span>${w.title}</span>${w.badge ? `<em>${w.badge}</em>` : ''}</a>`;
    }).join('')}${g.g === 'Análisis' ? `<button class="nav-ai" id="navAI">${ui.icon('spark', 18)}<span>Asistente IA</span><em>IA</em></button>` : ''}</div>`).join('');
    U.$('#nav').onclick = e => {
      const a = e.target.closest('a[data-v]');
      if (a) { e.preventDefault(); App.go(a.dataset.v); document.body.classList.remove('nav-open'); }
      if (e.target.closest('#navAI')) { App.feat.assistant.toggle(true); document.body.classList.remove('nav-open'); }
    };
    U.$('#src').innerHTML = `<b>${U.esc(Dt.D.meta.archivo)}</b><br>${U.fmt(Dt.D.meta.total)} registros · ${Dt.D.cols.length} columnas · año ${Dt.D.meta.ano}`;
    U.$('#menu').onclick = () => document.body.classList.toggle('nav-open');
    U.$('#scrim').onclick = () => document.body.classList.remove('nav-open');
    U.$('#cmdk').onclick = App.feat.palette.open;
    U.$('#theme').onclick = App.toggleTheme;
    U.$('#share').onclick = App.feat.exports.share;
    U.$('#word').onclick = App.feat.exports.wordModal;
    U.$('#csv').onclick = App.feat.exports.csv;
    /* Botones de imagen de cualquier gráfica (delegación) */
    U.$('#view').addEventListener('click', e => { const b = e.target.closest('[data-png]'); if (b) ui.png(b.dataset.png, b.closest('.card').querySelector('h3').textContent); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); App.feat.palette.open(); }
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); App.feat.assistant.toggle(true); }
    });
    window.addEventListener('hashchange', () => { App.readHash(); App.render(); });
    App.feat.filters.mount();
  }

  /* ---------- Dibujo de cada vista ---------- */
  let last = null;
  App.onRender(() => {
    const v = App.views[S.view];
    (App.onBeforeView || []).forEach(fn => fn());
    ui.destroyAll();
    App.feat.filters.refresh();
    U.$$('#nav a').forEach(a => { const on = a.dataset.v === S.view; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    U.$('#crumb').textContent = v.group;
    U.$('#title').textContent = v.title;
    U.$('#desc').textContent = v.desc;
    U.$('#count').innerHTML = `<b>${U.fmt(S.idx.length)}</b> de ${U.fmt(Dt.R.length)} estudiantes`;
    U.$('#count').classList.toggle('filtered', S.idx.length !== Dt.R.length);
    document.title = `${v.title} · Analítica estudiantil`;
    const host = U.$('#view');
    if (!S.idx.length) {
      host.innerHTML = ui.empty('Ningún estudiante cumple esta combinación de filtros.', '<button class="btn" id="emptyclear">Limpiar filtros</button>');
      U.$('#emptyclear').onclick = App.clearFilters; return;
    }
    const [html, after] = v.render(S.idx);
    host.innerHTML = html;
    if (last !== S.view) { host.classList.remove('enter'); void host.offsetWidth; host.classList.add('enter'); last = S.view; }
    after(host);
    countUp(host);
  });

  /* Anima los indicadores numéricos una sola vez por render */
  function countUp(host) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    host.querySelectorAll('.kpi-v').forEach(b => {
      const txt = b.textContent.trim(), m = txt.match(/^([\d.]+)(,\d+)?(%?)$/); if (!m) return;
      const isPct = !!m[3], to = parseFloat(txt.replace(/\./g, '').replace(',', '.')), t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 700), v = to * (1 - Math.pow(1 - k, 3)); b.textContent = isPct ? U.num(v) + '%' : U.fmt(Math.round(v)); if (k < 1) requestAnimationFrame(step); else b.textContent = txt; };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Inicio ---------- */
  layout();
  setTheme(U.store.get('dash_theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  App.feat.assistant.mount();
  if (!ui.chartsReady()) U.toast('No se pudo cargar Chart.js: las gráficas necesitan conexión a internet.', 'warn');
  App.readHash();
  App.render();
})();
