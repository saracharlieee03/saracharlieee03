'use strict';
/* ==========================================================================
   views/poblacion.js — Estudiantes, Programas, Sedes, Facultades, Procedencia,
   Colegios e Inscripción. Cada vista = HTML (paneles) + mount (dibuja gráficas).
   ========================================================================== */
(() => {
  const E = App.engine, S = App.store.state, U = App.ui, CH = App.charts, T = App.table;
  const { fmt, pct, esc, short } = App.util, { LABEL, label, indexOf, R, C, sedeGroupOf, SEDE_GROUPS } = App.data;
  const N = () => S.idx.length;
  const naNote = c => { const n = E.count(c).filter(x => App.data.isNA(c, x.key)).reduce((s, x) => s + x.n, 0); return n ? `Se excluyen ${fmt(n)} registros sin dato.` : ''; };
  const add = App.views.add;

  /* ---------------- Estudiantes ---------------- */
  add({
    id: 'estudiantes', label: 'Estudiantes', group: 'Población', icon: 'estudiantes', sub: 'Sexo, estrato y nivel de formación',
    render: () => ({
      html: `<div class="grid">
        ${U.chartPanel({ id: 'e1', title: 'Pirámide socioeconómica', sub: 'Mujeres a la izquierda, hombres a la derecha, por estrato', span: 8, tall: true })}
        ${U.chartPanel({ id: 'e2', title: 'Sexo', span: 4, tall: true })}
        ${U.chartPanel({ id: 'e3', title: 'Pregrado y posgrado', span: 4 })}
        ${U.chartPanel({ id: 'e4', title: 'Sexo según modalidad', sub: 'Haz clic en un segmento para filtrar ambas variables', span: 8 })}
        ${U.panel({ title: 'Estrato por sexo', sub: 'Valores absolutos', body: '<div id="e5"></div>' })}
      </div>`,
      mount() {
        const x = E.cross('Estrato', 'Sexo', { byLabel: true }), rows = x.rows.slice().reverse();
        const col = l => x.cols.findIndex(c => c.label === l), f = col('Femenino'), m = col('Masculino');
        CH.draw('e1', { dim: 'Estrato', keys: rows.map(r => r.key), config: () => ({
          type: 'bar',
          data: { labels: rows.map(r => r.label), datasets: [
            { label: 'Femenino', data: rows.map(r => -(f >= 0 ? r.cells[f] : 0)), backgroundColor: CH.PAL[0], borderRadius: 4 },
            { label: 'Masculino', data: rows.map(r => (m >= 0 ? r.cells[m] : 0)), backgroundColor: CH.PAL[1], borderRadius: 4 }] },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true, ticks: { callback: v => fmt(Math.abs(v)) } }, y: { stacked: true, grid: { display: false } } },
            plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: t => ` ${t.dataset.label}: ${fmt(Math.abs(t.raw))} (${pct(Math.abs(t.raw), rows[t.dataIndex].total)} del estrato)` } } },
            onClick: (e, els) => els.length && App.store.toggleFilter('Estrato', rows[els[0].index].key) }
        }) });
        CH.single('e2', 'doughnut', E.count('Sexo'), { dim: 'Sexo' });
        CH.single('e3', 'doughnut', E.count('TipoPrograma'), { dim: 'TipoPrograma' });
        CH.stacked('e4', 'Modalidad', 'Sexo', { horizontal: true });
        T.crossTable(document.getElementById('e5'), 'Estrato', 'Sexo', { byLabel: true });
      }
    })
  });

  /* ---------------- Programas: Pareto + treemap ---------------- */
  function squarify(items, x, y, w, h) {
    const total = items.reduce((s, i) => s + i.n, 0), out = [];
    if (!total || w <= 0 || h <= 0) return out;
    let rest = items.map(i => ({ ...i, area: i.n / total * w * h })), r = { x, y, w, h };
    const worst = (row, s) => { const sum = row.reduce((a, i) => a + i.area, 0), mx = Math.max(...row.map(i => i.area)), mn = Math.min(...row.map(i => i.area)); return Math.max(s * s * mx / (sum * sum), (sum * sum) / (s * s * mn)); };
    while (rest.length) {
      const side = Math.min(r.w, r.h); let row = [rest[0]], k = 1;
      while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) row.push(rest[k++]);
      const sum = row.reduce((a, i) => a + i.area, 0);
      if (r.w >= r.h) { const cw = sum / r.h; let yy = r.y; row.forEach(i => { const hh = i.area / cw; out.push({ ...i, x: r.x, y: yy, w: cw, h: hh }); yy += hh; }); r.x += cw; r.w -= cw; }
      else { const rh = sum / r.w; let xx = r.x; row.forEach(i => { const ww = i.area / rh; out.push({ ...i, x: xx, y: r.y, w: ww, h: rh }); xx += ww; }); r.y += rh; r.h -= rh; }
      rest = rest.slice(k);
    }
    return out;
  }
  function treemap(el) {
    const W = el.clientWidth, H = el.clientHeight, n = N();
    const fac = E.count('Facultad'), x = E.cross('Facultad', 'Programa');
    const html = squarify(fac, 0, 0, W, H).map((f, fi) => {
      const row = x.rows.find(r => r.key === f.key);
      const progs = x.cols.map((c, j) => ({ key: c.key, label: c.label, n: row.cells[j] })).filter(p => p.n > 0).sort((a, b) => b.n - a.n);
      return squarify(progs, f.x, f.y, f.w, f.h).map(p => `<div class="tm-node" data-key="${p.key}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;background:${CH.PAL[fi % CH.PAL.length]};filter:saturate(${0.55 + 0.45 * p.n / progs[0].n})" title="${esc(p.label)} · ${fmt(p.n)} (${pct(p.n, n)}) · ${esc(f.label)}">${p.w > 74 && p.h > 36 ? `<b>${fmt(p.n)}</b>${esc(short(p.label, Math.max(12, Math.floor(p.w / 6.5))))}` : ''}</div>`).join('');
    }).join('');
    el.innerHTML = html;
    el.onclick = e => { const t = e.target.closest('.tm-node'); if (t) App.store.toggleFilter('Programa', +t.dataset.key); };
  }

  add({
    id: 'programas', label: 'Programas', group: 'Población', icon: 'programas', sub: 'Oferta académica y concentración de la matrícula',
    render() {
      const p = E.count('Programa'), n = N();
      let acc = 0, k80 = 0; for (const x of p) { acc += x.n; k80++; if (acc / n >= .8) break; }
      const lv = E.count('TipoPrograma'), fac = E.count('Facultad');
      return {
        html: `<div class="kpis">
          ${U.kpi({ label: 'Programas con estudiantes', value: fmt(p.length), sub: lv.map(x => `${x.label}: ${fmt(x.n)}`).join(' · ') })}
          ${U.kpi({ label: 'Regla 80/20', value: `${k80} programas`, sub: `reúnen el 80% de la matrícula (${pct(k80, p.length)} de la oferta)`, meter: k80 / p.length, accent: true })}
          ${U.kpi({ label: 'Programa más grande', value: p[0] ? pct(p[0].n, n) : '—', sub: p[0] ? esc(p[0].label) : '' })}
          ${U.kpi({ label: 'Diversidad de la oferta', value: E.diversity(p).toFixed(2).replace('.', ','), sub: '0 = todo en un programa · 1 = reparto parejo', meter: E.diversity(p) })}
        </div>
        <div class="grid">
          ${U.chartPanel({ id: 'p1', title: 'Análisis de Pareto', sub: 'Barras: estudiantes por programa (25 mayores). Línea: porcentaje acumulado.', span: 12, tall: true })}
          ${U.panel({ title: 'Mapa de la oferta académica', sub: `Cada rectángulo es un programa; su tamaño es proporcional a los estudiantes. Color por facultad: ${fac.map((f, i) => `<span style="color:${CH.PAL[i % CH.PAL.length]}">■</span> ${esc(f.label)}`).join(' &nbsp; ')}`, body: '<div class="treemap" id="p2"></div>' })}
          ${U.panel({ title: 'Todos los programas', body: '<div id="p3"></div>' })}
        </div>`,
        mount() {
          const top = p.slice(0, 25); let a = 0; const cum = top.map(x => (a += x.n) * 100 / n);
          CH.draw('p1', { dim: 'Programa', keys: top.map(x => x.key), config: () => ({
            type: 'bar',
            data: { labels: top.map(x => short(x.label, 22)), datasets: [
              { type: 'line', label: '% acumulado', data: cum, yAxisID: 'y1', borderColor: CH.PAL[1], backgroundColor: CH.PAL[1], pointRadius: 2.5, tension: .25, borderWidth: 2 },
              { label: 'Estudiantes', data: top.map(x => x.n), backgroundColor: CH.css('--primary'), borderRadius: 4, maxBarThickness: 30 }] },
            options: { responsive: true, maintainAspectRatio: false,
              scales: { x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } }, y: { beginAtZero: true }, y1: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { callback: v => v + '%' } } },
              plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { title: t => top[t[0].dataIndex].label, label: t => t.dataset.yAxisID === 'y1' ? ` Acumulado: ${t.raw.toFixed(1).replace('.', ',')}%` : ` ${fmt(t.raw)} estudiantes (${pct(t.raw, n)})` } } },
              onClick: (e, els) => els.length && App.store.toggleFilter('Programa', top[els[0].index].key),
              onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; } }
          }) });
          treemap(document.getElementById('p2'));
          const facOf = {}; for (const i of S.idx) facOf[R[i][C.Programa]] = label('Facultad', R[i][C.Facultad]);
          const x = E.cross('Programa', 'Modalidad');
          T.mount(document.getElementById('p3'), { name: 'programas', columns: [{ label: 'Programa' }, { label: 'Facultad' }, { label: 'Total', num: true, bar: true }, { label: '% del total', num: true, fmt: v => v.toFixed(1).replace('.', ',') + '%' }, ...x.cols.map(c => ({ label: c.label, num: true }))],
            rows: x.rows.map(r => [r.label, facOf[r.key], r.total, r.total * 100 / n, ...r.cells]) });
        }
      };
    }
  });

  /* ---------------- Sedes ---------------- */
  add({
    id: 'sedes', label: 'Sedes', group: 'Población', icon: 'sedes', sub: 'Presencia territorial: campus, unidades en Medellín y regiones',
    render: () => ({
      html: `<div class="grid">
        ${U.chartPanel({ id: 's1', title: 'Tipo de sede', sub: 'Agrupación según el nombre de la sede', span: 4, tall: true })}
        ${U.chartPanel({ id: 's2', title: 'Las 12 sedes más grandes', span: 8, tall: true })}
        ${U.chartPanel({ id: 's3', title: 'Sexo en las 8 sedes más grandes', span: 6 })}
        ${U.chartPanel({ id: 's4', title: 'Nivel de formación en las 8 sedes más grandes', span: 6 })}
        ${U.panel({ title: 'Todas las sedes', body: '<div id="s5"></div>' })}
      </div>`,
      mount() {
        CH.single('s1', 'doughnut', E.countSedeGroups());
        CH.single('s2', 'bar', E.count('Sede').slice(0, 12), { dim: 'Sede', horizontal: true, total: N() });
        CH.stacked('s3', 'Sede', 'Sexo', { maxRows: 8, horizontal: true });
        CH.stacked('s4', 'Sede', 'TipoPrograma', { maxRows: 8, horizontal: true });
        const x = E.cross('Sede', 'Modalidad'), n = N();
        T.mount(document.getElementById('s5'), { name: 'sedes', columns: [{ label: 'Sede' }, { label: 'Tipo de sede' }, { label: 'Total', num: true, bar: true }, { label: '% del total', num: true, fmt: v => v.toFixed(1).replace('.', ',') + '%' }, ...x.cols.map(c => ({ label: c.label, num: true }))],
          rows: x.rows.map(r => [r.label, SEDE_GROUPS[sedeGroupOf[r.key]], r.total, r.total * 100 / n, ...r.cells]) });
      }
    })
  });

  /* ---------------- Facultades ---------------- */
  add({
    id: 'facultades', label: 'Facultades', group: 'Población', icon: 'facultades', sub: 'Facultades y áreas de conocimiento',
    render: () => ({
      html: `<div class="grid">
        ${U.chartPanel({ id: 'f1', title: 'Estudiantes por facultad', span: 6 })}
        ${U.chartPanel({ id: 'f2', title: 'Área de conocimiento', span: 6 })}
        ${U.chartPanel({ id: 'f3', title: 'Facultad por sexo', span: 6 })}
        ${U.chartPanel({ id: 'f4', title: 'Facultad por modalidad', span: 6 })}
        ${U.panel({ title: 'Facultades y nivel de formación', body: '<div id="f5"></div>' })}
      </div>`,
      mount() {
        CH.single('f1', 'bar', E.count('Facultad'), { dim: 'Facultad', horizontal: true, total: N() });
        CH.single('f2', 'bar', E.count('Area'), { dim: 'Area', horizontal: true, total: N() });
        CH.stacked('f3', 'Facultad', 'Sexo', { horizontal: true });
        CH.stacked('f4', 'Facultad', 'Modalidad', { horizontal: true });
        T.crossTable(document.getElementById('f5'), 'Facultad', 'TipoPrograma');
      }
    })
  });

  /* ---------------- Procedencia ---------------- */
  add({
    id: 'procedencia', label: 'Procedencia', group: 'Población', icon: 'procedencia', sub: 'Lugar de nacimiento y de residencia',
    render() {
      const n = N(), med = indexOf('Ciudad', 'MEDELLÍN');
      let inMed = 0; for (const i of S.idx) if (R[i][C.Ciudad] === med) inMed++;
      const ext = E.count('Pais').filter(x => x.label !== 'Colombia'), ne = ext.reduce((s, x) => s + x.n, 0);
      return {
        html: `<div class="kpis">
          ${U.kpi({ label: 'Nacidos en Medellín', value: pct(inMed, n), sub: fmt(inMed) + ' estudiantes', meter: inMed / n })}
          ${U.kpi({ label: 'Nacidos en otro municipio', value: pct(n - inMed - ne, n), sub: fmt(E.count('Ciudad').length - 1) + ' ciudades distintas', meter: (n - inMed - ne) / n, accent: true })}
          ${U.kpi({ label: 'Nacidos en otro país', value: pct(ne, n), sub: `${fmt(ne)} estudiantes de ${ext.length} países` })}
          ${U.kpi({ label: 'Comunas de residencia', value: fmt(E.count('Comuna', { na: true }).length), sub: fmt(E.count('Barrio', { na: true }).length) + ' barrios' })}
        </div>
        <div class="grid">
          ${U.chartPanel({ id: 'o1', title: 'Países de nacimiento distintos a Colombia', span: 6 })}
          ${U.chartPanel({ id: 'o2', title: 'Las 10 ciudades de nacimiento más frecuentes', span: 6 })}
          ${U.chartPanel({ id: 'o3', title: 'Las 10 comunas de residencia más frecuentes', sub: naNote('Comuna'), span: 6 })}
          ${U.chartPanel({ id: 'o4', title: 'Los 10 barrios de residencia más frecuentes', sub: naNote('Barrio'), span: 6 })}
          ${U.panel({ title: 'Barrios y comunas de residencia', sub: 'Un mismo barrio puede aparecer en varias comunas, por eso se agrupa por el par barrio–comuna.', body: '<div id="o5"></div>' })}
        </div>`,
        mount() {
          CH.single('o1', 'bar', ext.slice(0, 10), { dim: 'Pais', horizontal: true, total: n });
          CH.single('o2', 'bar', E.count('Ciudad').slice(0, 10), { horizontal: true, total: n });
          CH.single('o3', 'bar', E.count('Comuna', { na: true }).slice(0, 10), { horizontal: true, total: n });
          CH.single('o4', 'bar', E.count('Barrio', { na: true }).slice(0, 10), { horizontal: true, total: n });
          const m = new Map(), kb = C.Barrio, kc = C.Comuna;
          for (const i of S.idx) { const b = R[i][kb]; if (App.data.isNA('Barrio', b)) continue; const k = b + '|' + R[i][kc]; m.set(k, (m.get(k) || 0) + 1); }
          T.mount(document.getElementById('o5'), { name: 'barrios', columns: [{ label: 'Barrio' }, { label: 'Comuna' }, { label: 'Total', num: true, bar: true }, { label: '% del total', num: true, fmt: v => v.toFixed(1).replace('.', ',') + '%' }],
            rows: [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => { const [b, c] = k.split('|'); return [label('Barrio', +b), label('Comuna', +c), v, v * 100 / n]; }) });
        }
      };
    }
  });

  /* ---------------- Colegios ---------------- */
  add({
    id: 'colegios', label: 'Colegios', group: 'Población', icon: 'colegios', sub: 'Colegio de procedencia y tipo de colegio',
    render() {
      const n = N(), cg = E.count('Colegio'), get = l => (cg.find(x => x.label === l) || { n: 0 }).n, ins = E.count('Institucion', { na: true });
      return {
        html: `<div class="kpis">
          ${U.kpi({ label: 'Colegios distintos', value: fmt(ins.length), sub: 'sin contar registros desconocidos' })}
          ${U.kpi({ label: 'Colegio público', value: pct(get('Público'), n), sub: fmt(get('Público')) + ' estudiantes', meter: get('Público') / n })}
          ${U.kpi({ label: 'Colegio privado', value: pct(get('Privado'), n), sub: fmt(get('Privado')) + ' estudiantes', meter: get('Privado') / n, accent: true })}
          ${U.kpi({ label: 'Colegio más frecuente', value: ins[0] ? fmt(ins[0].n) : '—', sub: ins[0] ? esc(ins[0].label) : '' })}
        </div>
        <div class="grid">
          ${U.chartPanel({ id: 'c1', title: 'Público y privado', span: 4, tall: true })}
          ${U.chartPanel({ id: 'c2', title: 'Los 15 colegios con más egresados', sub: naNote('Institucion'), span: 8, tall: true })}
          ${U.chartPanel({ id: 'c3', title: 'Tipo de colegio por facultad', span: 6 })}
          ${U.chartPanel({ id: 'c4', title: 'Tipo de colegio por estrato', span: 6 })}
          ${U.panel({ title: 'Colegios de procedencia', body: '<div id="c5"></div>' })}
        </div>`,
        mount() {
          CH.single('c1', 'doughnut', cg, { dim: 'Colegio' });
          CH.single('c2', 'bar', ins.slice(0, 15), { horizontal: true, total: n });
          CH.stacked('c3', 'Facultad', 'Colegio', { horizontal: true });
          CH.stacked('c4', 'Estrato', 'Colegio', { byLabel: true });
          T.crossTable(document.getElementById('c5'), 'Institucion', 'Colegio', { na: true, name: 'colegios' });
        }
      };
    }
  });

  /* ---------------- Inscripción ---------------- */
  add({
    id: 'inscripcion', label: 'Inscripción', group: 'Población', icon: 'inscripcion', sub: 'Tipo de inscripción y modalidad',
    render: () => ({
      html: `<div class="grid">
        ${U.chartPanel({ id: 'i1', title: 'Tipo de inscripción', span: 4 })}
        ${U.chartPanel({ id: 'i2', title: 'Modalidad por facultad', span: 8 })}
        ${U.panel({ title: 'Tipo de inscripción por modalidad', sub: 'Lee los valores absolutos: los tipos minoritarios pueden ser muy pequeños frente al total.', body: '<div id="i3"></div>' })}
      </div>`,
      mount() {
        CH.single('i1', 'doughnut', E.count('TipoInscripcion'), { dim: 'TipoInscripcion' });
        CH.stacked('i2', 'Facultad', 'Modalidad');
        T.crossTable(document.getElementById('i3'), 'TipoInscripcion', 'Modalidad');
      }
    })
  });
})();
