'use strict';
/* =========================================================
   data.js · Motor de consultas sobre window.DATA
   Las filas llegan codificadas como enteros (índices de diccionario),
   así filtrar 29.000 registros toma milisegundos y no hace falta servidor.
   ========================================================= */
(() => {
  const U = App.util, D = window.DATA, R = D.rows, C = {};
  D.cols.forEach((c, i) => (C[c] = i));
  const NA = new Set(['DESCONOCIDO', '** DESCONOCIDO **']);

  /* Nombre legible de cada dimensión */
  const DIM = {
    Sede: 'Sede', Facultad: 'Facultad', Area: 'Área de conocimiento', Programa: 'Programa',
    Sexo: 'Sexo', Estrato: 'Estrato', Modalidad: 'Modalidad', TipoInscripcion: 'Tipo de inscripción',
    TipoPrograma: 'Nivel', Colegio: 'Tipo de colegio', Institucion: 'Institución de procedencia',
    Pais: 'País de nacimiento', Ciudad: 'Ciudad de nacimiento', Comuna: 'Comuna', Barrio: 'Barrio'
  };

  const raw = (c, i) => D.dict[C[c]][i];
  const LC = {}; // caché de etiquetas legibles por columna
  const label = (c, i) => { const m = LC[c] || (LC[c] = []); if (m[i] === undefined) { const v = raw(c, i); m[i] = c === 'Estrato' ? 'Estrato ' + v : U.tc(v); } return m[i]; };
  const find = (c, value) => D.dict[C[c]].indexOf(value);

  /* Índices de fila que cumplen todos los filtros { columna: índiceValor }. base = subconjunto opcional */
  function apply(f, base) {
    const e = Object.entries(f).map(([c, v]) => [C[c], +v]);
    const out = [], n = base ? base.length : R.length;
    for (let j = 0; j < n; j++) {
      const i = base ? base[j] : j, r = R[i];
      let ok = true;
      for (let t = 0; t < e.length; t++) if (r[e[t][0]] !== e[t][1]) { ok = false; break; }
      if (ok) out.push(i);
    }
    return out;
  }

  /* Conteo por dimensión -> [{ i, raw, name, n }]
     o.na: excluye DESCONOCIDO · o.byLabel: ordena por etiqueta en vez de por cantidad */
  function count(c, idx, o = {}) {
    const k = C[c], d = D.dict[k], a = new Array(d.length).fill(0);
    for (const i of idx) a[R[i][k]]++;
    const out = [];
    for (let j = 0; j < d.length; j++) if (a[j] > 0 && !(o.na && NA.has(d[j]))) out.push({ i: j, raw: d[j], name: label(c, j), n: a[j] });
    out.sort(o.byLabel ? (x, y) => x.raw.localeCompare(y.raw, 'es', { numeric: true }) : (x, y) => y.n - x.n);
    return out;
  }
  const map = (c, idx) => Object.fromEntries(count(c, idx).map(x => [x.raw, x.n]));
  const sumNA = (c, idx) => count(c, idx).filter(x => NA.has(x.raw)).reduce((s, x) => s + x.n, 0);

  /* Tabla cruzada a × b -> { cols:[{i,raw,name}], rows:[{i,raw,name,n,v:[...]}] } */
  function cross(a, b, idx, o = {}) {
    const ka = C[a], kb = C[b], da = D.dict[ka], db = D.dict[kb];
    const m = da.map(() => new Array(db.length).fill(0));
    for (const i of idx) m[R[i][ka]][R[i][kb]]++;
    let colIdx = db.map((_, j) => j).filter(j => m.some(r => r[j] > 0) && !(o.na && NA.has(db[j])));
    colIdx = colIdx.map(j => [j, m.reduce((s, r) => s + r[j], 0)]).sort((x, y) => y[1] - x[1]).map(x => x[0]);
    if (o.maxCols) colIdx = colIdx.slice(0, o.maxCols);
    if (b === 'Estrato' || o.byLabelCols) colIdx.sort((x, y) => db[x].localeCompare(db[y], 'es', { numeric: true }));
    const rows = da.map((_, i) => ({ i, raw: da[i], name: label(a, i), n: m[i].reduce((s, x) => s + x, 0), v: colIdx.map(j => m[i][j]) }))
      .filter(r => r.n > 0 && !(o.na && NA.has(r.raw)));
    rows.sort(o.byLabel || a === 'Estrato' ? (x, y) => x.raw.localeCompare(y.raw, 'es', { numeric: true }) : (x, y) => y.n - x.n);
    return { cols: colIdx.map(j => ({ i: j, raw: db[j], name: label(b, j) })), rows };
  }

  const rowRaw = i => R[i].map((v, k) => D.dict[k][v]);

  App.data = { D, R, C, NA, DIM, raw, label, find, apply, count, map, sumNA, cross, rowRaw };
})();
