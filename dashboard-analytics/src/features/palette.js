'use strict';
/* =========================================================
   palette.js · Ventanas modales y paleta de comandos (Ctrl + K)
   La paleta busca vistas, acciones y también valores de los datos:
   escribir "robledo" ofrece filtrar por la sede o la comuna Robledo.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data;

  /* Modal accesible con <dialog>: Esc cierra, el foco queda atrapado adentro */
  App.ui.modal = (html, setup, cls = '') => {
    const d = document.createElement('dialog'); d.className = 'modal ' + cls; d.innerHTML = html;
    document.body.append(d); d.showModal();
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    if (setup) setup(d);
    return d;
  };

  function actions() {
    const E = App.feat.exports;
    return [
      ...App.nav.flatMap(g => g.items).map(v => ({ ic: App.views[v].icon, t: 'Ir a ' + App.views[v].title, s: App.views[v].group, run: () => App.go(v) })),
      { ic: 'word', t: 'Generar informe Word', s: 'Acción', run: E.wordModal },
      { ic: 'download', t: 'Exportar registros filtrados (CSV)', s: 'Acción', run: E.csv },
      { ic: 'link', t: 'Copiar enlace de esta vista', s: 'Acción', run: E.share },
      { ic: 'moon', t: 'Cambiar tema claro/oscuro', s: 'Acción', run: App.toggleTheme },
      { ic: 'x', t: 'Limpiar todos los filtros', s: 'Acción', run: App.clearFilters }
    ];
  }

  function open() {
    if (U.$('dialog.palette')) return;
    const base = actions();
    App.ui.modal(`<div class="pal-in">${App.ui.icon('search', 18)}<input placeholder="Busca una vista, una acción o un valor (ej. Robledo, virtual, estrato 3)" aria-label="Comando"></div>
      <div class="pal-list" role="listbox"></div><footer class="pal-f"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> ejecutar</span><span><kbd>Esc</kbd> cerrar</span></footer>`, d => {
      const inp = d.querySelector('input'), list = d.querySelector('.pal-list');
      let cur = [], sel = 0;
      const draw = () => {
        const q = U.norm(inp.value.trim());
        const vals = App.feat.insights.searchValues(inp.value).map(x => ({ ic: 'filter', t: `Filtrar por ${Dt.label(x.c, x.i)}`, s: Dt.DIM[x.c], run: () => { App.setFilter(x.c, x.i); U.toast('Filtro aplicado: ' + Dt.label(x.c, x.i)); } }));
        cur = [...base.filter(a => !q || U.norm(a.t + ' ' + a.s).includes(q)), ...vals].slice(0, 12);
        sel = Math.min(sel, Math.max(0, cur.length - 1));
        list.innerHTML = cur.length ? cur.map((a, j) => `<button role="option" aria-selected="${j === sel}" data-j="${j}" class="${j === sel ? 'on' : ''}">${App.ui.icon(a.ic, 16)}<span>${U.esc(a.t)}</span><small>${U.esc(a.s)}</small></button>`).join('') : '<p class="muted pad">Nada coincide. Prueba con el nombre de una sede, programa o comuna.</p>';
      };
      const run = j => { const a = cur[j]; if (a) { d.close(); a.run(); } };
      inp.oninput = () => { sel = 0; draw(); };
      inp.onkeydown = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, cur.length); draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + cur.length) % Math.max(1, cur.length); draw(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      };
      list.onclick = e => { const b = e.target.closest('[data-j]'); if (b) run(+b.dataset.j); };
      draw(); inp.focus();
    }, 'palette');
  }

  App.feat.palette = { open };
})();
