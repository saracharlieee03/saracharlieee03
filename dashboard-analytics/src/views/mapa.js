'use strict';
/* =========================================================
   Vista: Mapa de Colombia por departamento de nacimiento
   Coroplético en SVG propio (sin librerías): cada departamento se colorea
   según cuántos estudiantes nacieron allí y funciona como filtro global.
   Geometría y tabla municipio -> departamento: data/colombia.js
   (se regenera con tools/generar_colombia.py).
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S, G = window.GEO_COL;
  const COL = 'Departamento';
  /* Escala secuencial de un solo tono, por rangos fijos (la distribución es muy desigual:
     Antioquia concentra cerca del 80 %, así que una escala lineal dejaría todo lo demás en blanco) */
  const BINS = [[1, 9], [10, 49], [50, 199], [200, 999], [1000, Infinity]];
  const q = n => (n ? 1 + BINS.findIndex(([a, b]) => n >= a && n <= b) : 0);
  const binLabel = ([a, b]) => (b === Infinity ? U.fmt(a) + ' o más' : `${U.fmt(a)}–${U.fmt(b)}`);

  App.views.mapa = {
    title: 'Mapa de Colombia', group: 'Panorama', icon: 'pin', badge: 'Nuevo',
    desc: 'De qué departamento vienen los estudiantes. Clic en un departamento para filtrar.',
    render(idx) {
      if (!G || !(COL in Dt.C)) return [ui.empty('Faltan los datos geográficos (data/colombia.js).'), () => {}];

      /* El mapa se calcula sin el filtro de departamento para no perder el contexto del país */
      const f = { ...S.f }; delete f[COL];
      const base = Dt.apply(f), nBase = base.length;
      const cnt = Object.fromEntries(Dt.count(COL, base).map(x => [x.raw, x]));
      const sel = S.f[COL] !== undefined ? Dt.raw(COL, +S.f[COL]) : null;
      const deps = G.deptos.map(d => ({ ...d, name: d.n, i: Dt.find(COL, d.raw), n: cnt[d.raw]?.n || 0 }));
      const ranked = deps.filter(d => d.n).sort((a, b) => b.n - a.n);
      const rankOf = Object.fromEntries(ranked.map((d, k) => [d.raw, k + 1]));
      const ext = cnt.EXTERIOR?.n || 0, unk = cnt.DESCONOCIDO?.n || 0;
      const ant = cnt.ANTIOQUIA?.n || 0, otros = ranked.reduce((s, d) => s + d.n, 0) - ant;
      const pais = Dt.count('Pais', base).find(x => x.raw !== 'COLOMBIA');
      const max = ranked[0]?.n || 1;

      const [ix, iy, iw, ih] = G.inset;
      const tip = d => `${d.name}: ${U.fmt(d.n)} estudiantes`;
      const paths = deps.map(d => `<path class="dep${d.raw === sel ? ' on' : ''}" d="${d.d}" data-q="${q(d.n)}" data-r="${U.esc(d.raw)}"` +
        (d.n ? ` data-i="${d.i}" tabindex="0" role="button" aria-pressed="${d.raw === sel}" aria-label="${U.esc(tip(d))}. Clic para ${d.raw === sel ? 'quitar el filtro' : 'filtrar'}"` : ` aria-label="${U.esc(d.name)}: sin estudiantes"`) + '/>').join('');
      const top = ranked.filter(d => d.c !== '88' && d.c !== '11').slice(0, 5);
      const labels = top.map(d => `<text class="geo-lbl" x="${d.lx}" y="${d.ly - 8}">${U.esc(d.name)}<tspan class="v" x="${d.lx}" dy="32">${U.fmt(d.n)}</tspan></text>`).join('');
      const html = `
      <div class="kpis">
        ${ui.kpi('Departamentos de origen', U.fmt(ranked.length), `de ${G.deptos.length} departamentos del país`, U.pctN(ranked.length, G.deptos.length))}
        ${ui.kpi('Nacidos en Antioquia', U.pct(ant, nBase), U.fmt(ant) + ' estudiantes', U.pctN(ant, nBase))}
        ${ui.kpi('De otros departamentos', U.fmt(otros), U.pct(otros, nBase) + ' del total', U.pctN(otros, nBase))}
        ${ui.kpi('Nacidos en el exterior', U.fmt(ext), pais ? `${U.pct(ext, nBase)} · el más frecuente: ${U.esc(pais.name)}` : U.pct(ext, nBase), U.pctN(ext, nBase))}
      </div>
      <div class="grid">
        <section class="card c8"><header class="card-h"><div><h3>¿De dónde vienen los estudiantes?</h3>
          <p>Departamento de nacimiento. Entre más oscuro, más estudiantes. Haz clic en un departamento para filtrar todo el tablero.</p></div></header>
          <div class="geo${sel ? ' has-sel' : ''}" id="geo">
            <svg viewBox="0 0 ${G.w} ${G.h}" role="group" aria-label="Mapa de Colombia por departamento de nacimiento">
              <g class="geo-inset" aria-hidden="true"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="10"/><text x="${ix + 10}" y="${iy + 26}">San Andrés</text></g>
              ${paths}${labels}
            </svg>
            ${sel ? `<div class="geo-sel"><span>Filtrando por</span><b>${U.esc(deps.find(d => d.raw === sel)?.name || U.tc(sel))}</b><button class="btn sm ghost" id="geoClear">${ui.icon('x', 14)} Quitar</button></div>` : ''}
            <div class="geo-legend" aria-label="Leyenda"><p>Estudiantes</p><ol>
              <li><i data-q="0"></i><span>0</span></li>${BINS.map((b, k) => `<li><i data-q="${k + 1}"></i><span>${binLabel(b)}</span></li>`).join('')}</ol></div>
            <div class="d3-tip" id="geoTip" hidden></div>
          </div>
          <p class="note">El departamento se deduce del municipio de nacimiento (DIVIPOLA, DANE). Si un nombre existe en varios departamentos se asigna a Antioquia, salvo excepciones conocidas. ${unk ? U.fmt(unk) + ' registros sin municipio reconocible.' : ''}</p></section>
        <section class="card c4"><header class="card-h"><div><h3>Ranking de departamentos</h3><p>${U.fmt(nBase - ext - unk)} estudiantes nacidos en Colombia${ext ? ` · ${U.fmt(ext)} en el exterior` : ''}.</p></div></header>
          <ol class="rank scroll" id="geoRank">${[...ranked, ...(ext ? [{ raw: 'EXTERIOR', name: 'Exterior (fuera de Colombia)', n: ext, i: Dt.find(COL, 'EXTERIOR'), out: true }] : [])].map(d =>
            `<li><button data-i="${d.i}" data-r="${U.esc(d.raw)}" class="${d.raw === sel ? 'on' : ''}${d.out ? ' out' : ''}" aria-pressed="${d.raw === sel}"><span>${U.esc(d.name)}</span><b>${U.fmt(d.n)}</b><i style="width:${U.pctN(d.n, max)}%"></i></button></li>`).join('')}</ol></section>
        ${sel
          ? ui.tableCard(`Municipios de nacimiento · ${U.esc(deps.find(d => d.raw === sel)?.name || U.tc(sel))}`, 'geoCities', '', 'c6') + ui.tableCard('Programas que estudian', 'geoProg', '', 'c6')
          : ui.tableCard('Estudiantes por departamento de nacimiento', 'geoTable', 'Haz clic en una fila del ranking o en el mapa para ver los municipios de un departamento.', 'c12')}
      </div>`;
      return [html, mount];

      function mount() {
        const host = U.$('#geo'), tipEl = U.$('#geoTip'), byRaw = Object.fromEntries(deps.map(d => [d.raw, d]));
        const toggle = i => {
          const on = String(i) === S.f[COL];
          App.setFilter(COL, on ? '' : i);
          U.toast(on ? 'Filtro de departamento quitado' : 'Filtro aplicado: ' + (deps.find(d => String(d.i) === String(i))?.name || 'Exterior'));
        };
        const hl = (raw, on) => U.$$(`#geo .dep[data-r="${CSS.escape(raw)}"], #geoRank [data-r="${CSS.escape(raw)}"]`).forEach(el => el.classList.toggle('hl', on));

        /* Mapa: tooltip, resaltado, clic y teclado */
        host.addEventListener('pointermove', e => {
          const p = e.target.closest('.dep');
          if (!p) { tipEl.hidden = true; return; }
          const d = byRaw[p.dataset.r], box = host.getBoundingClientRect();
          tipEl.innerHTML = `<b>${U.esc(d.name)}</b><br>` + (d.n
            ? `${U.fmt(d.n)} estudiantes · ${U.pct(d.n, nBase)}<br><span>Puesto ${rankOf[d.raw]} de ${ranked.length}</span> · ${d.raw === sel ? 'clic para quitar el filtro' : 'clic para filtrar'}`
            : 'Ningún estudiante con los filtros actuales');
          tipEl.hidden = false;
          const x = e.clientX - box.left, y = e.clientY - box.top, w = tipEl.offsetWidth;
          tipEl.style.left = Math.min(Math.max(8, x - w / 2), box.width - w - 8) + 'px';
          tipEl.style.top = Math.max(8, y - tipEl.offsetHeight - 14) + 'px';
        });
        host.addEventListener('pointerleave', () => (tipEl.hidden = true));
        host.addEventListener('click', e => { const p = e.target.closest('.dep[data-i]'); if (p) toggle(p.dataset.i); });
        host.addEventListener('keydown', e => { const p = e.target.closest('.dep[data-i]'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(p.dataset.i); } });
        host.addEventListener('focusin', e => { const p = e.target.closest('.dep'); if (p) hl(p.dataset.r, true); });
        host.addEventListener('focusout', e => { const p = e.target.closest('.dep'); if (p) hl(p.dataset.r, false); });
        const clr = U.$('#geoClear'); if (clr) clr.onclick = () => toggle(S.f[COL]);

        /* Ranking: clic filtra; pasar el mouse resalta el departamento en el mapa */
        const rank = U.$('#geoRank');
        rank.onclick = e => { const b = e.target.closest('[data-i]'); if (b) toggle(b.dataset.i); };
        rank.onmouseover = e => { const b = e.target.closest('[data-r]'); if (b) hl(b.dataset.r, true); };
        rank.onmouseout = e => { const b = e.target.closest('[data-r]'); if (b) hl(b.dataset.r, false); };
        const on = rank.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });

        /* Tablas de detalle */
        if (sel) {
          const n = idx.length;
          ui.table('geoCities', ['Municipio', 'Estudiantes', '% del departamento'], Dt.count('Ciudad', idx).map(x => [x.name, x.n, U.pct(x.n, n)]), { bar: 2, name: 'municipios_' + sel.toLowerCase() });
          ui.table('geoProg', ['Programa', 'Estudiantes', '% del departamento'], Dt.count('Programa', idx).map(x => [x.name, x.n, U.pct(x.n, n)]), { bar: 2, name: 'programas_' + sel.toLowerCase() });
        } else {
          const x = Dt.cross(COL, 'Ciudad', base);
          const topCity = r => { let j = 0; r.v.forEach((v, k) => { if (v > r.v[j]) j = k; }); return r.v[j] ? `${x.cols[j].name} (${U.fmt(r.v[j])})` : '—'; };
          ui.table('geoTable', ['Departamento', 'Estudiantes', '% del total', 'Municipio más frecuente'],
            x.rows.map(r => [byRaw[r.raw]?.name || U.tc(r.raw), r.n, U.pct(r.n, nBase), topCity(r)]), { bar: 2, name: 'departamentos_nacimiento' });
        }
      }
    }
  };
})();
