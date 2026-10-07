'use strict';
/* ==========================================================================
   core/data.js — Capa de datos: lee window.DATA (generado desde el Excel)
   y ofrece nombres legibles, etiquetas y grupos derivados.
   Estructura de DATA: { cols, labels, dict: [[valores únicos por columna]], rows: [[índices]] , meta }
   ========================================================================== */
App.data = (() => {
  const D = window.DATA;
  if (!D || !D.rows) throw new Error('No se encontró data/datos.js');
  const { pretty } = App.util;
  const R = D.rows;
  const C = {}; D.cols.forEach((c, i) => (C[c] = i));

  /* Nombre visible de cada columna */
  const LABEL = {
    Sede: 'Sede', Facultad: 'Facultad', Area: 'Área de conocimiento', Programa: 'Programa', Sexo: 'Sexo',
    Estrato: 'Estrato', Modalidad: 'Modalidad', TipoInscripcion: 'Tipo de inscripción', TipoPrograma: 'Nivel',
    Colegio: 'Tipo de colegio', Institucion: 'Colegio de procedencia', Pais: 'País de nacimiento',
    Ciudad: 'Ciudad de nacimiento', Comuna: 'Comuna', Barrio: 'Barrio'
  };
  /* Valores que significan "sin dato" */
  const NA_VALUES = new Set(['DESCONOCIDO', '** DESCONOCIDO **']);
  const MISSING_VALUES = new Set([...NA_VALUES, 'NO REGISTRA']);

  /* Etiqueta legible (cacheada por columna) */
  const cache = {};
  function labelsOf(c) {
    if (cache[c]) return cache[c];
    const dict = D.dict[C[c]];
    return (cache[c] = dict.map(v => {
      if (c === 'Estrato') return 'Estrato ' + v;
      let p = pretty(v);
      if (c === 'Facultad') p = p.replace(/^Facultad de /, '');
      return p;
    }));
  }
  const label = (c, i) => labelsOf(c)[i];
  const raw = (c, i) => D.dict[C[c]][i];
  const size = c => D.dict[C[c]].length;
  const isNA = (c, i) => NA_VALUES.has(raw(c, i));
  const isMissing = (c, i) => MISSING_VALUES.has(raw(c, i));
  const indexOf = (c, rawValue) => D.dict[C[c]].indexOf(rawValue);

  /* Grupo derivado: tipo de sede según el prefijo del nombre */
  const SEDE_GROUPS = ['Campus principales', 'Unidades en Medellín (UEMB)', 'Unidades regionales (UEMR)', 'Virtual', 'Movilidad académica'];
  const sedeGroupOf = D.dict[C.Sede].map(s =>
    s.startsWith('UEMB') ? 1 : s.startsWith('UEMR') ? 2 : s === 'VIRTUAL' ? 3 : s.startsWith('MOVILIDAD') ? 4 : 0);

  return { D, R, C, COLS: D.cols, LABEL, meta: D.meta, label, labelsOf, raw, size, isNA, isMissing, indexOf, SEDE_GROUPS, sedeGroupOf };
})();
