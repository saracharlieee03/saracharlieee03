'use strict';
/* =========================================================
   Vistas de oferta académica: Facultades y programas · Sedes · Modalidad e inscripción
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui;

  App.views.academico = {
    title: 'Facultades y programas', group: 'Oferta académica', icon: 'book',
    desc: 'Cómo se reparte la población entre facultades y programas.',
    render(idx) {
      const n = idx.length, pr = Dt.count('Programa', idx);
      return [`<div class="grid">
          <section class="card c12"><header class="card-h"><div><h3>Mapa de programas</h3><p>Cada bloque es un programa; su área es proporcional a sus estudiantes y el color indica la facultad. Clic para filtrar.</p></div></header>
            <div class="treemap" id="tm" role="group" aria-label="Mapa de programas por facultad"></div></section>
          ${ui.chartCard('Programas con más estudiantes', 'g1', 'c8', 'Los 15 más grandes', 'xtall')}
          ${ui.chartCard('Área de conocimiento', 'g2', 'c4', '', 'xtall')}
          ${ui.chartCard('Nivel por facultad', 'g3', 'c6')}
          ${ui.chartCard('Sexo por facultad', 'g4', 'c6', 'Porcentaje dentro de cada facultad')}
          ${ui.tableCard('Todos los programas', 't1')}
        </div>`, () => {
        const host = U.$('#tm'); ui.treemap(host, idx);
        let w = host.clientWidth; const ro = new ResizeObserver(U.debounce(() => { if (host.isConnected && host.clientWidth !== w) { w = host.clientWidth; ui.treemap(host, idx); } }, 120)); ro.observe(host);
        ui.bars('g1', pr, { dim: 'Programa', n: 15, h: true, pctOf: n });
        ui.donut('g2', Dt.count('Area', idx), { dim: 'Area', n: 7 });
        ui.stack('g3', 'Facultad', 'TipoPrograma', idx, { h: true });
        ui.stack('g4', 'Facultad', 'Sexo', idx, { h: true, percent: true });
        const fac = {}, R = Dt.R; for (const i of idx) fac[R[i][Dt.C.Programa]] = Dt.label('Facultad', R[i][Dt.C.Facultad]);
        const x = Dt.cross('Programa', 'Modalidad', idx);
        ui.table('t1', ['Programa', 'Facultad', 'Estudiantes', '% del total', ...x.cols.map(c => c.name)], x.rows.map(r => [r.name, fac[r.i], r.n, U.pct(r.n, n), ...r.v]), { bar: 3, name: 'programas' });
      }];
    }
  };

  /* Agrupa las sedes por tipo a partir de su nombre */
  const sedeTipo = raw => /^UEMB/.test(raw) ? 'Unidades en colegios de Medellín' : /^UEMR/.test(raw) ? 'Unidades en regiones' : /^MOVILIDAD/.test(raw) ? 'Movilidad académica' : raw === 'VIRTUAL' ? 'Virtual' : 'Campus';

  App.views.sedes = {
    title: 'Sedes', group: 'Oferta académica', icon: 'pin',
    desc: 'Campus, unidades en barrios y regiones, y virtualidad.',
    render(idx) {
      const n = idx.length, sd = Dt.count('Sede', idx), g = {};
      sd.forEach(x => { const t = sedeTipo(x.raw); g[t] = (g[t] || 0) + x.n; });
      const groups = Object.entries(g).map(([name, v]) => ({ i: null, name, n: v })).sort((a, b) => b.n - a.n);
      return [`<div class="kpis">
          ${ui.kpi('Sedes activas', U.fmt(sd.length), 'con al menos un estudiante')}
          ${ui.kpi('En campus', U.pct(g.Campus || 0, n), U.fmt(g.Campus || 0) + ' estudiantes', U.pctN(g.Campus || 0, n))}
          ${ui.kpi('En regiones', U.pct(g['Unidades en regiones'] || 0, n), U.fmt(g['Unidades en regiones'] || 0) + ' estudiantes', U.pctN(g['Unidades en regiones'] || 0, n))}
          ${ui.kpi('Sede más grande', sd[0] ? U.pct(sd[0].n, n) : '—', sd[0] ? U.esc(sd[0].name) : '')}
        </div>
        <div class="grid">
          ${ui.chartCard('Tipo de sede', 'g1', 'c4')}
          ${ui.chartCard('Sedes con más estudiantes', 'g2', 'c8', 'Las 12 más grandes', 'tall')}
          ${ui.chartCard('Modalidad por sede', 'g3', 'c6', 'Las 8 sedes más grandes')}
          ${ui.chartCard('Estrato por sede', 'g4', 'c6', 'Porcentaje dentro de cada sede')}
          ${ui.tableCard('Todas las sedes por sexo', 't1')}
        </div>`, () => {
        ui.donut('g1', groups, {});
        ui.bars('g2', sd, { dim: 'Sede', n: 12, h: true, pctOf: n });
        ui.stack('g3', 'Sede', 'Modalidad', idx, { n: 8, h: true });
        ui.stack('g4', 'Sede', 'Estrato', idx, { n: 8, h: true, percent: true });
        ui.crossTable('t1', 'Sede', 'Sexo', idx);
      }];
    }
  };

  App.views.modalidad = {
    title: 'Modalidad e inscripción', group: 'Oferta académica', icon: 'layers',
    desc: 'Presencial, virtual o semipresencial, y tipo de inscripción.',
    render(idx) {
      return [`<div class="grid">
          ${ui.chartCard('Modalidad', 'g1', 'c4')}
          ${ui.chartCard('Tipo de inscripción', 'g2', 'c4')}
          ${ui.chartCard('Nivel por modalidad', 'g3', 'c4', 'Porcentaje dentro de cada modalidad')}
          ${ui.chartCard('Modalidad por facultad', 'g4', 'c12', 'Número de estudiantes')}
          ${ui.tableCard('Tipo de inscripción por modalidad', 't1', 'Lee los valores absolutos: los tipos minoritarios son muy pequeños frente al total.')}
        </div>`, () => {
        ui.donut('g1', Dt.count('Modalidad', idx), { dim: 'Modalidad' });
        ui.donut('g2', Dt.count('TipoInscripcion', idx), { dim: 'TipoInscripcion' });
        ui.stack('g3', 'Modalidad', 'TipoPrograma', idx, { percent: true });
        ui.stack('g4', 'Facultad', 'Modalidad', idx, { h: true });
        ui.crossTable('t1', 'TipoInscripcion', 'Modalidad', idx);
      }];
    }
  };
})();
