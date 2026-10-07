'use strict';
/* =========================================================
   viz.js · Visualizaciones propias (sin librerías)
   - waffle:  "si la universidad fuera 100 estudiantes"
   - treemap: facultades → programas, área proporcional a estudiantes
   - heatmap: tabla dinámica coloreada por intensidad
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data;

  /* ---------- Waffle de 100 personas (método del mayor residuo) ---------- */
  function waffle(host, dim, idx, maxGroups = 6) {
    const items = Dt.count(dim, idx, dim === 'Estrato' ? { byLabel: true } : {});
    let groups = items.slice(0, maxGroups);
    const rest = items.slice(maxGroups).reduce((s, x) => s + x.n, 0);
    if (rest) groups.push({ i: null, name: 'Otros', n: rest });
    const tot = groups.reduce((s, x) => s + x.n, 0) || 1;
    const exact = groups.map(g => (g.n * 100) / tot), base = exact.map(Math.floor);
    let left = 100 - base.reduce((s, x) => s + x, 0);
    exact.map((v, j) => [v - Math.floor(v), j]).sort((a, b) => b[0] - a[0]).forEach(([, j]) => { if (left-- > 0) base[j]++; });
    const P = App.ui.palette();
    let cells = '', k = 0;
    groups.forEach((g, j) => { for (let t = 0; t < base[j]; t++, k++) cells += `<i class="w" data-g="${j}" style="--c:${P[j % P.length]};--d:${k * 7}ms"></i>`; });
    host.innerHTML = `<div class="waffle" role="img" aria-label="Distribución de 100 estudiantes por ${Dt.DIM[dim]}">${cells}</div>
      <ul class="wlegend">${groups.map((g, j) => `<li data-g="${j}" ${g.i !== null ? `data-dim="${dim}" data-i="${g.i}" tabindex="0" role="button" title="Filtrar por ${U.esc(g.name)}"` : ''}>
        <i style="background:${P[j % P.length]}"></i><span class="wl-n">${base[j]}</span><span class="wl-t">${U.esc(g.name)}</span><small>${U.fmt(g.n)}</small></li>`).join('')}</ul>`;
    const wf = host.querySelector('.waffle');
    host.querySelectorAll('.wlegend li').forEach(li => {
      li.onmouseenter = li.onfocus = () => { wf.dataset.hl = li.dataset.g; };
      li.onmouseleave = li.onblur = () => { delete wf.dataset.hl; };
      const pick = () => { if (li.dataset.dim) { App.setFilter(li.dataset.dim, li.dataset.i); U.toast('Filtro aplicado: ' + li.querySelector('.wl-t').textContent); } };
      li.onclick = pick; li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    });
    wf.querySelectorAll('.w').forEach(c => { c.onmouseenter = () => { wf.dataset.hl = c.dataset.g; }; });
    wf.onmouseleave = () => { delete wf.dataset.hl; };
  }

  /* ---------- Treemap cuadriculado (algoritmo squarified de Bruls et al.) ---------- */
  function squarify(items, x, y, w, h) {
    const total = items.reduce((s, a) => s + a.v, 0); if (!total || w <= 0 || h <= 0) return [];
    const nodes = items.filter(a => a.v > 0).map(a => ({ ...a, a: (a.v * w * h) / total }));
    const out = []; let row = [], rc = { x, y, w, h }, i = 0;
    const worst = (r, side) => { const s = r.reduce((t, q) => t + q.a, 0); let mx = 0, mn = Infinity; r.forEach(q => { mx = Math.max(mx, q.a); mn = Math.min(mn, q.a); }); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
    const lay = r => {
      const s = r.reduce((t, q) => t + q.a, 0);
      if (rc.w >= rc.h) { const cw = s / rc.h; let yy = rc.y; r.forEach(q => { const hh = q.a / cw; out.push({ ...q, x: rc.x, y: yy, w: cw, h: hh }); yy += hh; }); rc = { x: rc.x + cw, y: rc.y, w: rc.w - cw, h: rc.h }; }
      else { const ch = s / rc.w; let xx = rc.x; r.forEach(q => { const ww = q.a / ch; out.push({ ...q, x: xx, y: rc.y, w: ww, h: ch }); xx += ww; }); rc = { x: rc.x, y: rc.y + ch, w: rc.w, h: rc.h - ch }; }
    };
    while (i < nodes.length) {
      const side = Math.min(rc.w, rc.h), n = nodes[i];
      if (!row.length || worst([...row, n], side) <= worst(row, side)) { row.push(n); i++; } else { lay(row); row = []; }
    }
    if (row.length) lay(row);
    return out;
  }

  function treemap(host, idx) {
    const W = host.clientWidth || 800, H = host.clientHeight || 440, P = App.ui.palette(), tot = idx.length;
    const x = Dt.cross('Facultad', 'Programa', idx);
    const fac = x.rows.map((r, j) => ({ v: r.n, r, color: P[j % P.length] }));
    let html = '';
    squarify(fac, 0, 0, W, H).forEach(F => {
      const progs = x.cols.map((c, j) => ({ v: F.r.v[j], c })).filter(p => p.v > 0).sort((a, b) => b.v - a.v);
      const head = F.h > 60 && F.w > 90 ? 22 : 0;
      html += `<div class="tm-f" style="left:${F.x}px;top:${F.y}px;width:${F.w}px;height:${F.h}px;--c:${F.color}">${head ? `<span class="tm-fl">${U.esc(F.r.name.replace(/^Facultad de /, ''))} · ${U.pct(F.r.n, tot, 0)}</span>` : ''}</div>`;
      squarify(progs, F.x + 2, F.y + head + 2, F.w - 4, F.h - head - 4).forEach(p => {
        const big = p.w > 78 && p.h > 34;
        html += `<button class="tm-p" style="left:${p.x}px;top:${p.y}px;width:${Math.max(0, p.w - 2)}px;height:${Math.max(0, p.h - 2)}px;--c:${F.color}" data-i="${p.c.i}"
          title="${U.esc(p.c.name)}: ${U.fmt(p.v)} estudiantes (${U.pct(p.v, tot)})" aria-label="${U.esc(p.c.name)}, ${U.fmt(p.v)} estudiantes">
          ${big ? `<b>${U.esc(U.short(p.c.name, Math.floor(p.w / 7)))}</b><small>${U.fmt(p.v)}</small>` : ''}</button>`;
      });
    });
    host.innerHTML = html;
    host.onclick = e => { const b = e.target.closest('.tm-p'); if (b) { App.setFilter('Programa', b.dataset.i); U.toast('Filtro aplicado: ' + b.title.split(':')[0]); } };
  }

  /* ---------- Mapa de calor (tabla dinámica) ----------
     mode: 'n' conteo · 'row' % de la fila · 'col' % de la columna · 'tot' % del total */
  function heatmap(host, a, b, idx, mode = 'n', maxRows = 15, maxCols = 10) {
    const x = Dt.cross(a, b, idx, { maxCols, na: false }), rows = x.rows.slice(0, maxRows), tot = idx.length;
    const colTot = x.cols.map((_, j) => x.rows.reduce((s, r) => s + r.v[j], 0));
    const val = (r, j) => mode === 'row' ? U.pctN(r.v[j], r.n) : mode === 'col' ? U.pctN(r.v[j], colTot[j]) : mode === 'tot' ? U.pctN(r.v[j], tot) : r.v[j];
    let mx = 0; rows.forEach(r => r.v.forEach((_, j) => { mx = Math.max(mx, val(r, j)); }));
    const show = v => (mode === 'n' ? U.fmt(v) : U.num(v) + '%');
    host.innerHTML = `<div class="tw"><table class="heat"><thead><tr><th>${Dt.DIM[a]} \\ ${Dt.DIM[b]}</th>${x.cols.map(c => `<th class="n" title="${U.esc(c.name)}">${U.esc(U.short(c.name, 18))}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>
      ${rows.map(r => `<tr><th title="${U.esc(r.name)}">${U.esc(U.short(r.name, 40))}</th>${r.v.map((_, j) => {
        const v = val(r, j), t = mx ? v / mx : 0;
        return `<td class="n hc${t > 0.55 ? ' dark' : ''}" style="--t:${(t * 100).toFixed(1)}%" data-a="${r.i}" data-b="${x.cols[j].i}" title="${U.esc(r.name)} × ${U.esc(x.cols[j].name)}: ${U.fmt(r.v[j])}">${r.v[j] ? show(v) : '·'}</td>`;
      }).join('')}<td class="n tot">${U.fmt(r.n)}</td></tr>`).join('')}</tbody></table></div>`;
    host.onclick = e => { const td = e.target.closest('td[data-a]'); if (td) { App.setFilters({ [a]: td.dataset.a, [b]: td.dataset.b }); U.toast('Filtros aplicados desde la tabla dinámica'); } };
    return { x, rows, val, show };
  }

  Object.assign(App.ui, { waffle, treemap, heatmap });
})();
