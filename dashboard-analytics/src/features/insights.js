'use strict';
/* =========================================================
   insights.js · Inteligencia del tablero
   - narrative(): resume la población filtrada en lenguaje natural
   - list(): hallazgos automáticos (cada uno se puede aplicar como filtro)
   - QUESTIONS: preguntas de análisis con respuesta calculada en vivo
   - ask(): interpreta preguntas escritas ("¿cuántas mujeres virtuales en Robledo?")
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data;

  const top = (c, idx, o) => Dt.count(c, idx, o)[0];
  const deCada10 = p => Math.round(p / 10);

  function narrative(idx, filtered) {
    const n = idx.length; if (!n) return '';
    const sx = Dt.map('Sexo', idx), cg = Dt.map('Colegio', idx), md = top('Modalidad', idx), es = top('Estrato', idx), fa = top('Facultad', idx);
    const muj = U.pctN(sx.FEMENINO || 0, n), pub = U.pctN(cg['PÚBLICO'] || 0, n);
    const lead = filtered ? `Con los filtros actuales hay <b>${U.fmt(n)}</b> estudiantes.` : `En ${Dt.D.meta.ano} la institución registra <b>${U.fmt(n)}</b> estudiantes.`;
    return `${lead} El <b>${U.num(muj, 0)}%</b> son mujeres, <b>${deCada10(pub)} de cada 10</b> vienen de colegio público y el estrato más común es el <b>${es.raw}</b>.
      La mayoría estudia en modalidad <b>${md.name.toLowerCase()}</b> (${U.pct(md.n, n, 0)}) y la facultad más grande es <b>${U.esc(fa.name.replace(/^Facultad de /, ''))}</b>, con el ${U.pct(fa.n, n, 0)}.`;
  }

  function list(idx) {
    const n = idx.length, out = []; if (n < 20) return out;
    const sx = Dt.map('Sexo', idx), fem = U.pctN(sx.FEMENINO || 0, n);

    /* 1. Concentración de la oferta */
    const pr = Dt.count('Programa', idx), t5 = pr.slice(0, 5).reduce((s, x) => s + x.n, 0);
    if (pr.length > 5) out.push({ k: 'Concentración', v: U.pct(t5, n, 0), t: `de los estudiantes está en solo 5 de ${pr.length} programas. El más grande es ${pr[0].name}.`, f: { Programa: pr[0].i } });

    /* 2. Brecha de género por facultad */
    const xf = Dt.cross('Facultad', 'Sexo', idx), jf = xf.cols.findIndex(c => c.raw === 'FEMENINO');
    if (jf >= 0 && xf.rows.length > 1) {
      const g = xf.rows.filter(r => r.n >= 50).map(r => ({ r, p: U.pctN(r.v[jf], r.n) })).sort((a, b) => Math.abs(b.p - fem) - Math.abs(a.p - fem))[0];
      if (g) out.push({ k: 'Brecha de género', v: U.num(g.p, 0) + '%', t: `de mujeres en ${g.r.name.replace(/^Facultad de /, '')}, frente al ${U.num(fem, 0)}% general (${g.p > fem ? '+' : ''}${U.num(g.p - fem, 0)} puntos).`, f: { Facultad: g.r.i } });
    }

    /* 3. Sede con mayor proporción de estratos 0 a 2 */
    const xs = Dt.cross('Sede', 'Estrato', idx), low = xs.cols.map((c, j) => (['0', '1', '2'].includes(c.raw) ? j : -1)).filter(j => j >= 0);
    const sd = xs.rows.filter(r => r.n >= 100).map(r => ({ r, p: U.pctN(low.reduce((s, j) => s + r.v[j], 0), r.n) })).sort((a, b) => b.p - a.p)[0];
    if (sd && xs.rows.length > 1) out.push({ k: 'Vulnerabilidad', v: U.num(sd.p, 0) + '%', t: `de los estudiantes de ${sd.r.name} son de estratos 0 a 2, la proporción más alta entre sedes con 100 o más estudiantes.`, f: { Sede: sd.r.i } });

    /* 4. Nacidos fuera de Colombia */
    const ps = Dt.count('Pais', idx).filter(x => x.raw !== 'COLOMBIA'), ext = ps.reduce((s, x) => s + x.n, 0);
    if (ext) out.push({ k: 'Internacional', v: U.fmt(ext), t: `estudiantes nacieron fuera de Colombia (${U.pct(ext, n)}). El país más frecuente es ${ps[0].name}.`, f: { Pais: ps[0].i } });

    /* 5. Programa más virtual */
    const xv = Dt.cross('Programa', 'Modalidad', idx), jv = xv.cols.findIndex(c => c.raw === 'VIRTUAL');
    if (jv >= 0) {
      const pv = xv.rows.filter(r => r.n >= 40).map(r => ({ r, p: U.pctN(r.v[jv], r.n) })).sort((a, b) => b.p - a.p || b.r.n - a.r.n)[0];
      if (pv && pv.p > 0) out.push({ k: 'Virtualidad', v: U.num(pv.p, 0) + '%', t: `de ${pv.r.name} estudia de forma virtual: es el programa más virtual con 40 o más estudiantes.`, f: { Programa: pv.r.i } });
    }

    /* 6. Posgrado */
    const tp = Dt.map('TipoPrograma', idx);
    if (tp.POSGRADO && tp.PREGRADO) out.push({ k: 'Posgrado', v: U.pct(tp.POSGRADO, n), t: `de la población está en posgrado: ${U.fmt(tp.POSGRADO)} estudiantes frente a ${U.fmt(tp.PREGRADO)} de pregrado.`, f: { TipoPrograma: Dt.find('TipoPrograma', 'POSGRADO') } });
    return out;
  }

  /* ---------- Preguntas de análisis (edita o agrega { q, a }) ---------- */
  const S = App.S;
  const top1 = (c, na) => { const t = Dt.count(c, S.idx, { na })[0]; return t ? `${t.name} (${U.fmt(t.n)} estudiantes, ${U.pct(t.n, S.idx.length)})` : 'sin datos'; };
  const lista = (c, k = 4, na) => Dt.count(c, S.idx, { na }).slice(0, k).map(x => `${x.name}: ${U.fmt(x.n)} (${U.pct(x.n, S.idx.length)})`).join('; ');
  const excl = c => { const k = Dt.sumNA(c, S.idx); return k ? ` Se excluyen ${U.fmt(k)} registros sin dato.` : ''; };

  const QUESTIONS = [
    { q: '¿Cuántos estudiantes hay y cuántos son de pregrado y posgrado?', a: () => `${U.fmt(S.idx.length)} estudiantes. ${lista('TipoPrograma')}.` },
    { q: '¿Qué facultad concentra más estudiantes?', a: () => `${top1('Facultad')}. Distribución completa: ${lista('Facultad')}.` },
    { q: '¿Qué área de conocimiento predomina?', a: () => top1('Area') + '.' },
    { q: '¿Cuál es el programa con más estudiantes?', a: () => top1('Programa') + '.' },
    { q: '¿Qué sede tiene más estudiantes?', a: () => top1('Sede') + '.' },
    { q: '¿Cómo se distribuyen los estudiantes por sexo?', a: () => lista('Sexo') + '.' },
    { q: '¿Cuál es el estrato predominante y qué proporción pertenece a los estratos 1 a 3?', a: () => { const m = Dt.map('Estrato', S.idx), s = ['1', '2', '3'].reduce((t, e) => t + (m[e] || 0), 0); return `Predomina ${top1('Estrato')}. Estratos 1 a 3: ${U.fmt(s)} estudiantes (${U.pct(s, S.idx.length)}).`; } },
    { q: '¿Qué proporción estudia en modalidad presencial, virtual o semipresencial?', a: () => lista('Modalidad') + '.' },
    { q: '¿Qué proporción proviene de colegios públicos y privados?', a: () => lista('Colegio') + '.' },
    { q: '¿Cuál es la institución de procedencia más frecuente?', a: () => top1('Institucion', true) + '.' + excl('Institucion') },
    { q: '¿Cuáles son las comunas de residencia más frecuentes?', a: () => lista('Comuna', 3, true) + '.' + excl('Comuna') },
    { q: '¿Qué proporción nació fuera de Colombia y de qué país?', a: () => { const ex = Dt.count('Pais', S.idx).filter(x => x.raw !== 'COLOMBIA'), k = ex.reduce((s, x) => s + x.n, 0); return `${U.fmt(k)} estudiantes (${U.pct(k, S.idx.length)})` + (ex[0] ? `; el país más frecuente es ${ex[0].name} (${U.fmt(ex[0].n)}).` : '.'); } },
    { q: '¿Cuál es el tipo de inscripción predominante?', a: () => lista('TipoInscripcion') + '.' }
  ];
  const answer = x => { try { return S.idx.length ? x.a() : 'Sin datos con los filtros actuales.'; } catch (e) { return 'No se pudo calcular.'; } };

  /* ---------- Pregunta libre: detecta valores de las dimensiones dentro del texto ---------- */
  const SYN = [
    [/\b(mujer(es)?|femenin[oa]s?|estudiantes? mujeres)\b/, 'Sexo', 'FEMENINO'], [/\b(hombres?|masculin[oa]s?|varones)\b/, 'Sexo', 'MASCULINO'],
    [/\bpublic[oa]s?\b/, 'Colegio', 'PÚBLICO'], [/\bprivad[oa]s?\b/, 'Colegio', 'PRIVADO'],
    [/\bvirtual(es)?\b/, 'Modalidad', 'VIRTUAL'], [/\bsemipresencial(es)?\b/, 'Modalidad', 'SEMIPRESENCIAL'], [/\bpresencial(es)?\b/, 'Modalidad', 'PRESENCIAL'],
    [/\bposgrados?\b/, 'TipoPrograma', 'POSGRADO'], [/\bpregrados?\b/, 'TipoPrograma', 'PREGRADO'],
    [/\bantigu[oa]s?\b/, 'TipoInscripcion', 'ANTIGUO'], [/\breingresos?\b/, 'TipoInscripcion', 'REINGRESO'], [/\btransferencias?\b/, 'TipoInscripcion', 'TRANSFERENCIA INTERNA']
  ];
  const SCAN = ['Sede', 'Facultad', 'Programa', 'Area', 'Comuna', 'Pais', 'Ciudad'];
  let INDEX = null;
  const buildIndex = () => (INDEX = SCAN.flatMap(c => Dt.D.dict[Dt.C[c]].map((v, i) => ({ c, i, t: U.norm(v).replace(/facultad de /, '') })).filter(x => x.t.length >= 4 && !/desconocido/.test(x.t))).sort((a, b) => b.t.length - a.t.length));

  function ask(text) {
    const q = ' ' + U.norm(text).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const f = {}, used = [];
    SYN.forEach(([re, c, v]) => { if (!(c in f) && re.test(q)) { f[c] = Dt.find(c, v); used.push(U.norm(v)); } });
    const em = q.match(/estrato\s*(\d)/); if (em && Dt.find('Estrato', em[1]) >= 0) f.Estrato = Dt.find('Estrato', em[1]);
    if (!INDEX) buildIndex();
    for (const x of INDEX) {
      if (x.c in f) continue;
      if (q.includes(' ' + x.t + ' ') && !used.some(u => u.includes(x.t))) { f[x.c] = x.i; used.push(x.t); }
    }
    Object.keys(f).forEach(k => { if (f[k] < 0) delete f[k]; });
    const idx = Dt.apply(f, App.S.idx);
    return { f, n: idx.length, idx, base: App.S.idx.length };
  }

  /* Búsqueda de valores para la paleta de comandos */
  function searchValues(text, k = 8) {
    const q = U.norm(text).trim(); if (q.length < 3) return [];
    if (!INDEX) buildIndex();
    const extra = ['Sexo', 'Modalidad', 'Colegio', 'TipoPrograma', 'Estrato', 'TipoInscripcion'].flatMap(c => Dt.D.dict[Dt.C[c]].map((v, i) => ({ c, i, t: U.norm(c === 'Estrato' ? 'estrato ' + v : v) })));
    return [...extra, ...INDEX].filter(x => x.t.includes(q)).sort((a, b) => a.t.indexOf(q) - b.t.indexOf(q) || a.t.length - b.t.length).slice(0, k);
  }

  App.feat.insights = { narrative, list, QUESTIONS, answer, ask, searchValues };
})();
