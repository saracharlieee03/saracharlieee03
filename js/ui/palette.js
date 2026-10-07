'use strict';
/* ==========================================================================
   ui/palette.js — Buscador de comandos (Ctrl+K): navega a vistas, ejecuta
   acciones y aplica filtros escribiendo cualquier valor ("virtual", "robledo"…).
   ========================================================================== */
App.palette = (() => {
  const SEARCHABLE = ['Facultad', 'Programa', 'Sede', 'Area', 'Sexo', 'Estrato', 'Modalidad', 'TipoPrograma', 'Colegio', 'TipoInscripcion'];
  const { esc } = App.util, { LABEL, labelsOf } = App.data;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function actions(q) {
    const nq = norm(q), out = [];
    App.views.list().forEach(v => out.push({ group: 'Ir a', text: v.label, hint: v.group, run: () => App.store.setView(v.id) }));
    [['Descargar informe Word', App.report.open], ['Exportar CSV filtrado', () => App.exporter.csv()], ['Copiar enlace con filtros', App.exporter.link],
      ['Cambiar modo claro / oscuro', App.theme.toggle], ['Limpiar filtros', App.store.clearFilters]].forEach(([text, run]) => out.push({ group: 'Acciones', text, run }));
    let list = nq ? out.filter(a => norm(a.text).includes(nq)) : out;
    if (nq.length >= 2) {
      const vals = [];
      SEARCHABLE.forEach(c => labelsOf(c).forEach((l, i) => { if (norm(l).includes(nq)) vals.push({ group: 'Filtrar', text: l, hint: LABEL[c], run: () => App.store.setFilter(c, i) }); }));
      const rank = v => (norm(v.text) === nq ? 0 : norm(v.text).startsWith(nq) ? 1 : 2) * 1000 + v.text.length;
      list = list.concat(vals.sort((a, b) => rank(a) - rank(b)).slice(0, 12));
    }
    return list;
  }

  function open() {
    if (document.querySelector('.palette')) return;
    const d = App.ui.modal(`<input class="input" placeholder="Busca una vista, una acción o un valor para filtrar" aria-label="Buscar comando"><div class="palette-list" role="listbox"></div>`, 'palette');
    const input = d.el.querySelector('input'), box = d.el.querySelector('.palette-list');
    let items = [], sel = 0;
    const draw = () => {
      items = actions(input.value.trim()); sel = Math.min(sel, Math.max(0, items.length - 1));
      let g = '';
      box.innerHTML = items.map((a, i) => (a.group !== g ? `<div class="group">${(g = a.group)}</div>` : '') +
        `<button role="option" data-i="${i}" class="${i === sel ? 'is-active' : ''}">${esc(a.text)}${a.hint ? `<small>${esc(a.hint)}</small>` : ''}</button>`).join('') || '<p class="hint" style="padding:10px">Sin resultados.</p>';
      const act = box.querySelector('.is-active'); act && act.scrollIntoView && act.scrollIntoView({ block: 'nearest' });
    };
    const run = i => { const a = items[i]; if (a) { d.close(); a.run(); } };
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') run(sel);
    });
    box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
    draw();
  }
  return { open };
})();
