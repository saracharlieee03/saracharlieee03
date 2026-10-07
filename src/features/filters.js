'use strict';
/* =========================================================
   filters.js · Barra de filtros dependientes + chips de filtros activos
   Cada lista solo muestra opciones que existen con los demás filtros.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, S = App.S;
  const MAIN = ['Sede', 'Facultad', 'Modalidad', 'Sexo'];
  const MORE = ['Estrato', 'TipoPrograma', 'Area', 'TipoInscripcion'];
  let open = false;

  function mount() {
    const box = U.$('#filters');
    const sel = c => `<label class="fld"><span>${Dt.DIM[c]}</span><select data-c="${c}"></select></label>`;
    box.innerHTML = `<div class="f-main">${MAIN.map(sel).join('')}</div>
      <div class="f-more" id="fmore" hidden>${MORE.map(sel).join('')}</div>
      <div class="f-foot"><div id="chips" class="chips"></div>
        <div class="f-act"><button class="btn sm ghost" id="fmoreBtn" aria-expanded="false" aria-controls="fmore">${App.ui.icon('filter', 15)} Más filtros</button>
        <button class="btn sm ghost" id="fclear">${App.ui.icon('x', 15)} Limpiar</button></div></div>`;
    box.onchange = e => { const c = e.target.dataset.c; if (c) App.setFilter(c, e.target.value); };
    U.$('#fclear').onclick = () => { App.clearFilters(); U.toast('Filtros limpios'); };
    U.$('#fmoreBtn').onclick = e => { open = !open; U.$('#fmore').hidden = !open; e.currentTarget.setAttribute('aria-expanded', open); };
    U.$('#chips').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) App.setFilter(b.dataset.rm, ''); };
  }

  function refresh() {
    const R = Dt.R;
    U.$$('#filters select').forEach(sel => {
      const c = sel.dataset.c, k = Dt.C[c], okSet = new Set();
      const e = Object.entries(S.f).filter(([x]) => x !== c).map(([x, v]) => [Dt.C[x], +v]);
      for (const r of R) { let ok = true; for (const [j, v] of e) if (r[j] !== v) { ok = false; break; } if (ok) okSet.add(r[k]); }
      const cur = S.f[c] ?? '';
      const opts = [...okSet].map(i => [i, Dt.label(c, i), Dt.raw(c, i)]).sort((a, b) => a[2].localeCompare(b[2], 'es', { numeric: true }));
      sel.innerHTML = `<option value="">Todos (${opts.length})</option>` + opts.map(([i, n]) => `<option value="${i}"${String(i) === String(cur) ? ' selected' : ''}>${U.esc(n)}</option>`).join('');
      sel.classList.toggle('active', cur !== '');
    });
    const active = Object.entries(S.f);
    if (active.some(([c]) => MORE.includes(c)) && !open) { open = true; U.$('#fmore').hidden = false; U.$('#fmoreBtn').setAttribute('aria-expanded', 'true'); }
    U.$('#chips').innerHTML = active.length
      ? active.map(([c, v]) => `<button class="chip" data-rm="${c}" title="Quitar filtro"><span>${Dt.DIM[c]}</span>${U.esc(Dt.label(c, v))}${App.ui.icon('x', 13)}</button>`).join('')
      : `<span class="hint">${App.ui.icon('spark', 14)} Consejo: haz clic en cualquier barra, sector o celda para filtrar por ese valor.</span>`;
  }

  App.feat.filters = { mount, refresh };
})();
