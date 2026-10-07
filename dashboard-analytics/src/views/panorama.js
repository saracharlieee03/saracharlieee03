'use strict';
/* =========================================================
   Vista: Panorama general
   Resumen narrativo + "si fueran 100 estudiantes" + indicadores + hallazgos
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;
  S.waffle = 'Sexo';
  const WDIMS = [['Sexo', 'Sexo'], ['Estrato', 'Estrato'], ['Modalidad', 'Modalidad'], ['Colegio', 'Colegio'], ['Facultad', 'Facultad'], ['TipoPrograma', 'Nivel']];

  App.views.resumen = {
    title: 'Panorama general', group: 'Panorama', icon: 'panorama',
    desc: 'Quiénes son los estudiantes, en una sola pantalla.',
    render(idx) {
      const n = idx.length, sx = Dt.map('Sexo', idx), md = Dt.map('Modalidad', idx), cg = Dt.map('Colegio', idx), es = Dt.map('Estrato', idx), tp = Dt.map('TipoPrograma', idx);
      const e012 = (es['0'] || 0) + (es['1'] || 0) + (es['2'] || 0);
      const I = App.feat.insights, ins = I.list(idx), filtered = Object.keys(S.f).length > 0;
      const html = `
      <section class="hero">
        <div class="hero-text">
          <p class="hero-k">${filtered ? 'Segmento filtrado' : 'Población estudiantil ' + Dt.D.meta.ano}</p>
          <h2 class="hero-n">${I.narrative(idx, filtered)}</h2>
          <div class="hero-act"><button class="btn" data-ai>${ui.icon('spark', 16)} Preguntar a la IA</button>
          <button class="btn ghost" data-go="tresd">${ui.icon('layers', 16)} Ciudad 3D</button>
          <button class="btn ghost" data-go="mapa">${ui.icon('pin', 16)} Ver mapa</button></div>
        </div>
        <div class="hero-viz">
          <div class="hv-h"><h3>Si fueran 100 estudiantes</h3>${ui.seg('waffle', WDIMS, S.waffle)}</div>
          <div id="waffle"></div>
        </div>
      </section>
      <div class="kpis">
        ${ui.kpi('Estudiantes', U.fmt(n), `de ${U.fmt(Dt.R.length)} en total`, U.pctN(n, Dt.R.length))}
        ${ui.kpi('Mujeres', U.pct(sx.FEMENINO || 0, n), U.fmt(sx.FEMENINO || 0) + ' estudiantes', U.pctN(sx.FEMENINO || 0, n))}
        ${ui.kpi('Estratos 1 a 3', U.pct(e012, n), U.fmt(e012) + ' estudiantes', U.pctN(e012, n))}
        ${ui.kpi('Virtual', U.pct(md.VIRTUAL || 0, n), U.fmt(md.VIRTUAL || 0) + ' estudiantes', U.pctN(md.VIRTUAL || 0, n))}
      </div>
      <div class="grid">
        ${ui.chartCard('Estudiantes por facultad', 'g1', 'c4')}
        ${ui.chartCard('Modalidad de estudio', 'g3', 'c4')}
        ${ui.chartCard('Programas con más estudiantes', 'g4', 'c4', 'Los 8 más grandes', 'tall')}
      </div>`;
      return [html, v => {
        ui.waffle(U.$('#waffle'), S.waffle, idx);
        U.$('[data-seg="waffle"]').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; S.waffle = b.dataset.v; U.$$('[data-seg="waffle"] button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); ui.waffle(U.$('#waffle'), S.waffle, idx); };
        v.querySelectorAll('[data-ins]').forEach(b => { b.onclick = () => { App.setFilters(ins[+b.dataset.ins].f); U.toast('Segmento aplicado: ' + ins[+b.dataset.ins].k); }; });
        v.querySelector('[data-ai]').onclick = () => App.feat.assistant.toggle(true);
        v.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => App.go(b.dataset.go); });
        ui.donut('g1', Dt.count('Facultad', idx).map(x => ({ ...x, name: x.name.replace(/^Facultad de /, '') })), { dim: 'Facultad' });
        ui.donut('g3', Dt.count('Modalidad', idx), { dim: 'Modalidad' });
        ui.bars('g4', Dt.count('Programa', idx), { dim: 'Programa', n: 10, h: true, pctOf: n });
      }];
    }
  };
})();
