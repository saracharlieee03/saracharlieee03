'use strict';
/* ==========================================================================
   services/insights.js — Hallazgos automáticos.
   Lee los datos filtrados y redacta conclusiones con cifras. Cada regla devuelve
   { tone, title, fig, text, view } o null si no aplica con los filtros actuales.
   ========================================================================== */
App.insights = (() => {
  const E = App.engine, S = App.store.state, { fmt, pct } = App.util, { indexOf, R, C } = App.data;
  const N = () => S.idx.length;
  const MIN = 30; // tamaño mínimo de grupo para comparar proporciones

  /* Proporción de una categoría dentro de cada grupo de otra columna */
  function shareBy(group, col, rawValue) {
    const target = indexOf(col, rawValue);
    if (target < 0) return [];
    const x = E.cross(group, col);
    const j = x.cols.findIndex(c => c.key === target);
    if (j < 0) return [];
    return x.rows.filter(r => r.total >= MIN).map(r => ({ label: r.label, share: r.cells[j] / r.total, n: r.total }));
  }

  const RULES = [
    () => { // Concentración de programas
      const p = E.count('Programa'); if (p.length < 6) return null;
      const top5 = p.slice(0, 5).reduce((s, x) => s + x.n, 0), h = E.hhi(p);
      return { tone: h > 1500 ? 'accent' : 'primary', title: 'Concentración de la matrícula', fig: pct(top5, N()),
        text: `de los estudiantes está en solo 5 de ${p.length} programas. El más grande es ${p[0].label}. Índice HHI: ${fmt(Math.round(h))} (${h > 2500 ? 'muy concentrado' : h > 1500 ? 'concentrado' : 'diversificado'}).`, view: 'programas' };
    },
    () => { // Brecha de género por facultad
      const g = shareBy('Facultad', 'Sexo', 'FEMENINO'); if (g.length < 2) return null;
      g.sort((a, b) => a.share - b.share);
      const lo = g[0], hi = g[g.length - 1], gap = (hi.share - lo.share) * 100;
      return { tone: gap > 20 ? 'danger' : 'primary', title: 'Brecha de género entre facultades', fig: gap.toFixed(0) + ' pp',
        text: `separan a ${hi.label} (${pct(hi.share, 1)} mujeres) de ${lo.label} (${pct(lo.share, 1)}).`, view: 'facultades' };
    },
    () => { // Estratos 1 a 3
      const m = E.countMap('Estrato'), s = ['1', '2', '3'].reduce((t, e) => t + (m[indexOf('Estrato', e)] || 0), 0);
      const low = ['0', '1'].reduce((t, e) => t + (m[indexOf('Estrato', e)] || 0), 0);
      return { tone: 'accent', title: 'Perfil socioeconómico', fig: pct(s, N()),
        text: `pertenece a los estratos 1, 2 y 3. Los estratos 0 y 1 suman ${pct(low, N())}.`, view: 'estudiantes' };
    },
    () => { // Colegio público
      const cg = E.count('Colegio'), pub = cg.find(x => x.label === 'Público'); if (!pub || cg.length < 2) return null;
      const by = shareBy('Facultad', 'Colegio', 'PÚBLICO').sort((a, b) => b.share - a.share);
      return { tone: 'primary', title: 'Origen escolar', fig: pct(pub.n, N()),
        text: `viene de colegio público.` + (by.length > 1 ? ` La facultad con más egresados de colegio público es ${by[0].label} (${pct(by[0].share, 1)}).` : ''), view: 'colegios' };
    },
    () => { // Virtualidad
      const by = shareBy('Facultad', 'Modalidad', 'VIRTUAL').sort((a, b) => b.share - a.share);
      const v = E.count('Modalidad').find(x => x.label === 'Virtual'); if (!v) return null;
      return { tone: 'primary', title: 'Educación virtual', fig: pct(v.n, N()),
        text: `estudia en modalidad virtual.` + (by.length > 1 && by[0].share > 0 ? ` Donde más pesa es en ${by[0].label} (${pct(by[0].share, 1)}).` : ''), view: 'inscripcion' };
    },
    () => { // Movilidad: nacidos fuera de Medellín / Colombia
      const med = indexOf('Ciudad', 'MEDELLÍN'), k = C.Ciudad; if (med < 0) return null;
      let out = 0; for (const i of S.idx) if (R[i][k] !== med) out++;
      const ext = E.count('Pais').filter(x => x.label !== 'Colombia'), ne = ext.reduce((s, x) => s + x.n, 0);
      return { tone: 'primary', title: 'Lugar de nacimiento', fig: pct(out, N()),
        text: `nació fuera de Medellín. ${fmt(ne)} estudiantes (${pct(ne, N())}) nacieron en otro país` + (ext[0] ? `, sobre todo en ${ext[0].label}.` : '.'), view: 'procedencia' };
    },
    () => { // Red de sedes
      const g = E.countSedeGroups(); if (g.length < 2) return null;
      const reg = g.find(x => x.label.startsWith('Unidades regionales'));
      return { tone: 'primary', title: 'Alcance territorial', fig: pct(g[0].n, N()),
        text: `estudia en ${g[0].label.toLowerCase()}.` + (reg ? ` Las unidades regionales atienden a ${fmt(reg.n)} estudiantes en ${E.count('Sede', { idx: S.idx }).filter(s => App.data.sedeGroupOf[s.key] === 2).length} municipios.` : ''), view: 'sedes' };
    },
    () => { // Calidad de datos
      const miss = c => E.count(c).filter(x => App.data.isNA(c, x.key)).reduce((s, x) => s + x.n, 0);
      const mc = miss('Comuna'), mi = miss('Institucion'); if (!mc && !mi) return null;
      const worst = Math.max(mc, mi);
      return { tone: worst / N() > .05 ? 'danger' : 'primary', title: 'Calidad del dato', fig: pct(worst, N()),
        text: `de los registros no tiene ${mc >= mi ? 'comuna registrada' : 'colegio de procedencia registrado'}. Tenlo en cuenta al leer esos rankings.`, view: 'calidad' };
    }
  ];

  const generate = () => (N() ? RULES.map(r => { try { return r(); } catch (e) { return null; } }).filter(Boolean) : []);
  return { generate };
})();
