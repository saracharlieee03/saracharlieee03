'use strict';
/* ==========================================================================
   core/engine.js — Motor analítico. Solo cálculos, nunca toca el DOM.
   Trabaja con "idx": la lista de números de fila que cumplen los filtros.
   ========================================================================== */
App.engine = (() => {
  const { R, C, label, isNA, size, sedeGroupOf, SEDE_GROUPS } = App.data;
  const S = App.store.state;

  /* Filas que cumplen un conjunto de filtros { columna: índice } */
  function filterIdx(filters, except) {
    const e = Object.entries(filters).filter(([c]) => c !== except).map(([c, v]) => [C[c], v]);
    const out = [];
    for (let i = 0; i < R.length; i++) {
      const r = R[i]; let ok = true;
      for (let j = 0; j < e.length; j++) if (r[e[j][0]] !== e[j][1]) { ok = false; break; }
      if (ok) out.push(i);
    }
    return out;
  }
  const recompute = () => (S.idx = filterIdx(S.filters));

  /* Conteo por columna → [{ key, label, n }] ordenado de mayor a menor (o por etiqueta)
     o.na: excluye "sin dato" · o.byLabel: orden alfabético/numérico · o.idx: otro subconjunto */
  function count(c, o = {}) {
    const idx = o.idx || S.idx, k = C[c], a = new Array(size(c)).fill(0);
    for (const i of idx) a[R[i][k]]++;
    const out = [];
    a.forEach((n, key) => { if (n > 0 && !(o.na && isNA(c, key))) out.push({ key, label: label(c, key), n }); });
    out.sort(o.byLabel ? (x, y) => x.label.localeCompare(y.label, 'es', { numeric: true }) : (x, y) => y.n - x.n);
    return out;
  }
  const countMap = (c, idx) => Object.fromEntries(count(c, { idx }).map(x => [x.key, x.n]));

  /* Conteo por grupo de sede (derivado) */
  function countSedeGroups(idx = S.idx) {
    const a = SEDE_GROUPS.map(() => 0), k = C.Sede;
    for (const i of idx) a[sedeGroupOf[R[i][k]]]++;
    return SEDE_GROUPS.map((label, key) => ({ key, label, n: a[key] })).filter(x => x.n).sort((x, y) => y.n - x.n);
  }

  /* Tabla cruzada a × b → { cols:[{key,label,n}], rows:[{key,label,total,cells}], total } */
  function cross(a, b, o = {}) {
    const idx = o.idx || S.idx, ka = C[a], kb = C[b], na = size(a), nb = size(b);
    const m = Array.from({ length: na }, () => new Array(nb).fill(0));
    for (const i of idx) m[R[i][ka]][R[i][kb]]++;
    const colTot = new Array(nb).fill(0);
    m.forEach(r => r.forEach((v, j) => (colTot[j] += v)));
    let cols = colTot.map((n, key) => ({ key, label: label(b, key), n })).filter(x => x.n > 0 && !(o.naB && isNA(b, x.key)));
    cols.sort(o.byLabelB ? (x, y) => x.label.localeCompare(y.label, 'es', { numeric: true }) : (x, y) => y.n - x.n);
    if (o.maxCols) cols = cols.slice(0, o.maxCols);
    let rows = m.map((r, key) => ({ key, label: label(a, key), cells: cols.map(c => r[c.key]) }))
      .map(r => ({ ...r, total: r.cells.reduce((s, x) => s + x, 0) }))
      .filter(r => r.total > 0 && !(o.na && isNA(a, r.key)));
    rows.sort(o.byLabel ? (x, y) => x.label.localeCompare(y.label, 'es', { numeric: true }) : (x, y) => y.total - x.total);
    if (o.maxRows) rows = rows.slice(0, o.maxRows);
    return { cols, rows, total: rows.reduce((s, r) => s + r.total, 0) };
  }

  /* ---- Estadística descriptiva para categorías ---- */
  /* Índice de diversidad de Shannon normalizado (0 = todo en una categoría, 1 = reparto perfecto) */
  function diversity(list) {
    const t = list.reduce((s, x) => s + x.n, 0);
    if (!t || list.length < 2) return 0;
    const h = -list.reduce((s, x) => s + (x.n / t) * Math.log(x.n / t), 0);
    return h / Math.log(list.length);
  }
  /* Índice Herfindahl–Hirschman (0–10.000): concentración */
  function hhi(list) {
    const t = list.reduce((s, x) => s + x.n, 0);
    return t ? list.reduce((s, x) => s + Math.pow(100 * x.n / t, 2), 0) : 0;
  }
  /* V de Cramér: fuerza de asociación entre dos variables categóricas (0 a 1) */
  function cramerV(x) {
    const N = x.total, r = x.rows.length, k = x.cols.length;
    if (!N || r < 2 || k < 2) return { v: 0, chi2: 0 };
    const colT = x.cols.map((_, j) => x.rows.reduce((s, row) => s + row.cells[j], 0));
    let chi2 = 0;
    x.rows.forEach(row => row.cells.forEach((o, j) => { const e = row.total * colT[j] / N; if (e > 0) chi2 += (o - e) ** 2 / e; }));
    return { v: Math.sqrt(chi2 / (N * (Math.min(r, k) - 1))), chi2 };
  }
  const strength = v => v < .1 ? 'muy débil' : v < .2 ? 'débil' : v < .35 ? 'moderada' : v < .5 ? 'fuerte' : 'muy fuerte';

  /* Opciones disponibles para un filtro dado el resto de filtros (filtros dependientes) */
  function available(c) {
    const set = new Set(), k = C[c];
    for (const i of filterIdx(S.filters, c)) set.add(R[i][k]);
    return set;
  }

  return { filterIdx, recompute, count, countMap, countSedeGroups, cross, diversity, hhi, cramerV, strength, available };
})();
