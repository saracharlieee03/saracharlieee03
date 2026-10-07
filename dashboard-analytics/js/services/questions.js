'use strict';
/* ==========================================================================
   services/questions.js — Preguntas de análisis con respuesta calculada en vivo.
   Para agregar una pregunta: añade un objeto { q: 'texto', a: () => 'respuesta' }.
   ========================================================================== */
App.questions = (() => {
  const E = App.engine, S = App.store.state, { fmt, pct } = App.util, { indexOf } = App.data;
  const N = () => S.idx.length;
  const top1 = (c, na) => { const t = E.count(c, { na })[0]; return t ? `${t.label} (${fmt(t.n)} registros, ${pct(t.n, N())})` : 'sin datos'; };
  const list = (c, k = 4, na) => E.count(c, { na }).slice(0, k).map(x => `${x.label}: ${fmt(x.n)} (${pct(x.n, N())})`).join(' · ');
  const excluded = c => { const n = E.count(c).filter(x => App.data.isNA(c, x.key)).reduce((s, x) => s + x.n, 0); return n ? ` Registros sin dato excluidos: ${fmt(n)}.` : ''; };

  const LIST = [
    { q: '¿Cuántos registros hay y cuántos son de pregrado y posgrado?', a: () => `${fmt(N())} registros. ${list('TipoPrograma')}.` },
    { q: '¿Qué facultad concentra más estudiantes?', a: () => `${top1('Facultad')}. Distribución: ${list('Facultad')}.` },
    { q: '¿Qué área de conocimiento es predominante?', a: () => top1('Area') + '.' },
    { q: '¿Cuál es el programa con mayor número de estudiantes?', a: () => top1('Programa') + '.' },
    { q: '¿Qué sede tiene más estudiantes?', a: () => top1('Sede') + '.' },
    { q: '¿Cómo se distribuyen los estudiantes por sexo?', a: () => list('Sexo') + '.' },
    { q: '¿Cuál es el estrato predominante y qué proporción pertenece a los estratos 1 a 3?', a: () => {
      const m = E.countMap('Estrato'), s = ['1', '2', '3'].reduce((t, e) => t + (m[indexOf('Estrato', e)] || 0), 0);
      return `Predominante: ${top1('Estrato')}. Estratos 1 a 3: ${fmt(s)} (${pct(s, N())}).`; } },
    { q: '¿Qué proporción estudia en modalidad presencial, virtual o semipresencial?', a: () => list('Modalidad') + '.' },
    { q: '¿Qué proporción proviene de colegios públicos y privados?', a: () => list('Colegio') + '.' },
    { q: '¿Cuál es la institución de procedencia más frecuente?', a: () => top1('Institucion', true) + '.' + excluded('Institucion') },
    { q: '¿Cuáles son las comunas de residencia más frecuentes?', a: () => list('Comuna', 3, true) + '.' + excluded('Comuna') },
    { q: '¿Qué proporción nació fuera de Colombia y de qué país?', a: () => {
      const ex = E.count('Pais').filter(x => x.label !== 'Colombia'), n = ex.reduce((s, x) => s + x.n, 0);
      return `${fmt(n)} registros (${pct(n, N())})` + (ex[0] ? `; el país más frecuente es ${ex[0].label} (${fmt(ex[0].n)}).` : '.'); } },
    { q: '¿Cuál es el tipo de inscripción predominante?', a: () => list('TipoInscripcion') + '.' }
  ];
  const answer = x => { try { return N() ? x.a() : 'Sin datos con los filtros actuales.'; } catch (e) { return 'No se pudo calcular.'; } };
  function exportCSV() {
    const { toCSV, download, stamp } = App.util;
    download(toCSV(['Pregunta', 'Respuesta'], LIST.map(x => [x.q, answer(x)])), `preguntas_analisis_${stamp()}.csv`, 'text/csv;charset=utf-8');
  }
  return { LIST, answer, exportCSV };
})();
