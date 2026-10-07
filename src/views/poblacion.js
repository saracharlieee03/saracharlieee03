'use strict';
/* =========================================================
   Vistas de población: Demografía · Procedencia · Colegios
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui;

  App.views.demografia = {
    title: 'Demografía', group: 'Población', icon: 'users',
    desc: 'Sexo, estrato socioeconómico y nivel de formación.',
    render(idx) {
      const n = idx.length, sx = Dt.map('Sexo', idx), es = Dt.map('Estrato', idx), tp = Dt.map('TipoPrograma', idx);
      const e3 = ['1', '2', '3'].reduce((s, k) => s + (es[k] || 0), 0), e56 = (es['5'] || 0) + (es['6'] || 0);
      return [`<div class="kpis">
          ${ui.kpi('Mujeres', U.pct(sx.FEMENINO || 0, n), U.fmt(sx.FEMENINO || 0) + ' estudiantes', U.pctN(sx.FEMENINO || 0, n))}
          ${ui.kpi('Hombres', U.pct(sx.MASCULINO || 0, n), U.fmt(sx.MASCULINO || 0) + ' estudiantes', U.pctN(sx.MASCULINO || 0, n))}
          ${ui.kpi('Estratos 1 a 3', U.pct(e3, n), U.fmt(e3) + ' estudiantes', U.pctN(e3, n))}
          ${ui.kpi('Estratos 5 y 6', U.pct(e56, n), U.fmt(e56) + ' estudiantes', U.pctN(e56, n))}
          ${ui.kpi('Pregrado', U.pct(tp.PREGRADO || 0, n), U.fmt(tp.PREGRADO || 0) + ' estudiantes', U.pctN(tp.PREGRADO || 0, n))}
        </div>
        <div class="grid">
          ${ui.chartCard('Pirámide por estrato y sexo', 'g1', 'c8', 'Mujeres a la izquierda, hombres a la derecha', 'tall')}
          ${ui.chartCard('Sexo', 'g2', 'c4')}
          ${ui.chartCard('Estrato por nivel de formación', 'g3', 'c6', 'Porcentaje dentro de cada estrato')}
          ${ui.chartCard('Pregrado y posgrado', 'g4', 'c6')}
          ${ui.tableCard('Estrato por sexo', 't1')}
        </div>`, () => {
        ui.pyramid('g1', 'Estrato', 'Sexo', 'FEMENINO', 'MASCULINO', idx);
        ui.donut('g2', Dt.count('Sexo', idx), { dim: 'Sexo' });
        ui.stack('g3', 'Estrato', 'TipoPrograma', idx, { percent: true });
        ui.donut('g4', Dt.count('TipoPrograma', idx), { dim: 'TipoPrograma' });
        ui.crossTable('t1', 'Estrato', 'Sexo', idx, { byLabel: true });
      }];
    }
  };

  App.views.procedencia = {
    title: 'Procedencia', group: 'Población', icon: 'globe',
    desc: 'Lugar de nacimiento y de residencia.',
    render(idx) {
      const n = idx.length, ps = Dt.count('Pais', idx), ext = ps.filter(x => x.raw !== 'COLOMBIA').reduce((s, x) => s + x.n, 0);
      const med = Dt.map('Ciudad', idx)['MEDELLÍN'] || 0, com = Dt.count('Comuna', idx, { na: true }).length;
      return [`<div class="kpis">
          ${ui.kpi('Nacidos en Medellín', U.pct(med, n), U.fmt(med) + ' estudiantes', U.pctN(med, n))}
          ${ui.kpi('Nacidos fuera de Colombia', U.pct(ext, n), U.fmt(ext) + ' estudiantes', U.pctN(ext, n))}
          ${ui.kpi('Países de nacimiento', U.fmt(ps.length), 'distintos')}
          ${ui.kpi('Comunas o municipios', U.fmt(com), 'de residencia, sin contar desconocidos')}
        </div>
        <div class="grid">
          ${ui.chartCard('Países de nacimiento (sin Colombia)', 'g1', 'c6')}
          ${ui.chartCard('Ciudades de nacimiento', 'g2', 'c6', 'Las 10 más frecuentes')}
          ${ui.chartCard('Comunas de residencia', 'g3', 'c6', 'Las 10 más frecuentes')}
          ${ui.chartCard('Barrios de residencia', 'g4', 'c6', 'Los 10 más frecuentes')}
          ${ui.tableCard('Barrios y comunas de residencia', 't1', Dt.sumNA('Barrio', idx) ? `Se excluyen ${U.fmt(Dt.sumNA('Barrio', idx))} registros sin barrio.` : '')}
        </div>`, () => {
        ui.bars('g1', ps.filter(x => x.raw !== 'COLOMBIA'), { dim: 'Pais', n: 10, h: true, pctOf: n });
        ui.bars('g2', Dt.count('Ciudad', idx), { dim: 'Ciudad', n: 10, h: true, color: U.css('--c2'), pctOf: n });
        ui.bars('g3', Dt.count('Comuna', idx, { na: true }), { dim: 'Comuna', n: 10, h: true, color: U.css('--c4'), pctOf: n });
        ui.bars('g4', Dt.count('Barrio', idx, { na: true }), { dim: 'Barrio', n: 10, h: true, color: U.css('--c5'), pctOf: n });
        const m = new Map(), R = Dt.R, kb = Dt.C.Barrio, kc = Dt.C.Comuna; // un barrio puede repetirse en varias comunas
        for (const i of idx) { const b = Dt.raw('Barrio', R[i][kb]); if (Dt.NA.has(b)) continue; const k = R[i][kb] + '|' + R[i][kc]; m.set(k, (m.get(k) || 0) + 1); }
        ui.table('t1', ['Barrio', 'Comuna', 'Estudiantes', '% del total'], [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => { const [b, c] = k.split('|'); return [Dt.label('Barrio', b), Dt.label('Comuna', c), v, U.pct(v, n)]; }), { bar: 3, name: 'barrios' });
      }];
    }
  };

  App.views.colegios = {
    title: 'Colegios de procedencia', group: 'Población', icon: 'school',
    desc: 'De qué instituciones educativas llegan los estudiantes.',
    render(idx) {
      const n = idx.length, cg = Dt.map('Colegio', idx), ins = Dt.count('Institucion', idx, { na: true });
      return [`<div class="kpis">
          ${ui.kpi('Instituciones distintas', U.fmt(ins.length), 'sin contar desconocidas')}
          ${ui.kpi('Colegio público', U.pct(cg['PÚBLICO'] || 0, n), U.fmt(cg['PÚBLICO'] || 0) + ' estudiantes', U.pctN(cg['PÚBLICO'] || 0, n))}
          ${ui.kpi('Colegio privado', U.pct(cg.PRIVADO || 0, n), U.fmt(cg.PRIVADO || 0) + ' estudiantes', U.pctN(cg.PRIVADO || 0, n))}
          ${ui.kpi('Institución más frecuente', ins[0] ? U.fmt(ins[0].n) : '—', ins[0] ? U.esc(ins[0].name) : '')}
        </div>
        <div class="grid">
          ${ui.chartCard('Público y privado', 'g1', 'c4')}
          ${ui.chartCard('Instituciones con más estudiantes', 'g2', 'c8', 'Las 15 más frecuentes', 'tall')}
          ${ui.chartCard('Tipo de colegio por estrato', 'g3', 'c6', 'Porcentaje dentro de cada estrato')}
          ${ui.chartCard('Tipo de colegio por facultad', 'g4', 'c6', 'Porcentaje dentro de cada facultad')}
          ${ui.tableCard('Instituciones de procedencia', 't1', Dt.sumNA('Institucion', idx) ? `Se excluyen ${U.fmt(Dt.sumNA('Institucion', idx))} registros sin institución.` : '')}
        </div>`, () => {
        ui.donut('g1', Dt.count('Colegio', idx), { dim: 'Colegio' });
        ui.bars('g2', ins, { dim: 'Institucion', n: 15, h: true, pctOf: n });
        ui.stack('g3', 'Estrato', 'Colegio', idx, { percent: true });
        ui.stack('g4', 'Facultad', 'Colegio', idx, { percent: true, h: true });
        ui.crossTable('t1', 'Institucion', 'Colegio', idx, { na: true });
      }];
    }
  };
})();
