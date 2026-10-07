'use strict';
/* ==========================================================================
   ui/filters.js — Barra de filtros globales (dependientes entre sí) y chips.
   Para agregar un filtro, añade la columna a FILTERS.
   ========================================================================== */
App.filters = (() => {
  const FILTERS = ['Sede', 'Facultad', 'Programa', 'Sexo', 'Estrato', 'Modalidad', 'TipoPrograma', 'Colegio'];
  const { LABEL, label } = App.data, { esc } = App.util, S = App.store.state;

  function mount(el) {
    el.innerHTML = `<div class="filter-grid">${FILTERS.map(c => `<label>${LABEL[c]}<select data-f="${c}" aria-label="Filtrar por ${LABEL[c]}"></select></label>`).join('')}</div><div class="chips" id="chips" aria-live="polite"></div>`;
    el.addEventListener('change', e => { const c = e.target.dataset.f; if (c) App.store.setFilter(c, e.target.value); });
    el.addEventListener('click', e => {
      const chip = e.target.closest('[data-remove]');
      if (chip) App.store.setFilter(chip.dataset.remove, null);
      if (e.target.closest('[data-clear]')) App.store.clearFilters();
    });
  }

  /* Rellena cada lista solo con valores que existen dados los demás filtros */
  function refresh() {
    document.querySelectorAll('[data-f]').forEach(sel => {
      const c = sel.dataset.f, ok = App.engine.available(c), cur = S.filters[c];
      const opts = [...ok].map(i => [i, label(c, i)]).sort((a, b) => a[1].localeCompare(b[1], 'es', { numeric: true }));
      sel.innerHTML = '<option value="">Todos</option>' + opts.map(([i, n]) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
      sel.classList.toggle('is-set', cur !== undefined);
    });
    const f = Object.entries(S.filters);
    document.getElementById('chips').innerHTML = f.length
      ? f.map(([c, v]) => `<button class="chip" data-remove="${c}" title="Quitar filtro"><b>${LABEL[c]}</b> ${esc(label(c, v))} ✕</button>`).join('') + `<button class="chip" data-clear style="background:none">Limpiar todo</button>`
      : `<span class="hint">Consejo: haz clic en cualquier barra o sector de una gráfica para filtrar por ese valor. Pulsa <span class="kbd">Ctrl</span> + <span class="kbd">K</span> para buscar.</span>`;
  }
  return { FILTERS, mount, refresh };
})();
