'use strict';
/* =========================================================
   Vista: Mapa interactivo (Leaflet + OpenStreetMap/CARTO)
   Burbujas proporcionales al número de estudiantes:
   - "Dónde viven": comunas de Medellín y municipios cercanos
   - "Dónde estudian": campus y unidades regionales
   Las coordenadas son aproximadas (centro de cada comuna o municipio).
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;
  S.mapa = 'Comuna';

  const GEO_COMUNA = {
    'POPULAR': [6.297, -75.546], 'SANTA CRUZ': [6.297, -75.556], 'MANRIQUE': [6.280, -75.548], 'ARANJUEZ': [6.281, -75.558],
    'CASTILLA': [6.293, -75.572], 'DOCE DE OCTUBRE': [6.305, -75.582], 'ROBLEDO': [6.277, -75.593], 'VILLA HERMOSA': [6.255, -75.547],
    'BUENOS AIRES': [6.238, -75.553], 'LA CANDELARIA': [6.249, -75.568], 'LAURELES': [6.245, -75.591], 'LA AMERICA': [6.253, -75.604],
    'SAN JAVIER': [6.258, -75.617], 'EL POBLADO': [6.209, -75.570], 'GUAYABAL': [6.213, -75.587], 'BELEN': [6.230, -75.600],
    'PALMITAS': [6.345, -75.690], 'SAN CRISTOBAL': [6.279, -75.637], 'ALTAVISTA': [6.225, -75.628], 'SAN ANTONIO DE PRADO': [6.184, -75.655], 'SANTA ELENA': [6.232, -75.502],
    'BELLO': [6.337, -75.558], 'ITAGUI': [6.172, -75.611], 'ENVIGADO': [6.171, -75.587], 'SABANETA': [6.151, -75.616], 'LA ESTRELLA': [6.158, -75.643],
    'CALDAS': [6.091, -75.636], 'COPACABANA': [6.348, -75.509], 'GIRARDOTA': [6.378, -75.445], 'BARBOSA': [6.438, -75.333],
    'GUARNE': [6.280, -75.444], 'RIONEGRO': [6.155, -75.374], 'MARINILLA': [6.174, -75.336], 'EL PEÑOL': [6.219, -75.242], 'SAN PEDRO': [6.460, -75.557],
    'LA CEJA': [6.031, -75.431], 'SANTUARIO': [6.137, -75.264], 'RETIRO': [6.061, -75.502], 'SAN JERÓNIMO': [6.448, -75.727], 'EBEJICO': [6.326, -75.768]
  };
  const GEO_SEDE = {
    'FRATERNIDAD MEDELLÍN': [6.2466, -75.5566], 'ROBLEDO': [6.2729, -75.5895], 'FLORESTA': [6.2598, -75.6010], 'CASTILLA': [6.2945, -75.5720], 'CAMPUS C4TA': [6.2650, -75.5660],
    'ANDES': [5.657, -75.879], 'BELLO': [6.337, -75.558], 'BELMIRA': [6.605, -75.666], 'BETANIA': [5.746, -75.977], 'BRICEÑO': [7.112, -75.550], 'CAREPA': [7.758, -76.655],
    'CAROLINA DEL PRINCIPE': [6.726, -75.283], 'CAÑAS GORDAS': [6.749, -75.990], 'CISNEROS': [6.538, -75.089], 'DONMATÍAS': [6.486, -75.393], 'EL PEÑOL': [6.219, -75.242],
    'ITUANGO': [7.172, -75.764], 'JARDÍN': [5.598, -75.819], 'MACEO': [6.552, -74.787], 'NODO GÓMEZ PLATA': [6.683, -75.220], 'NODO VEGACHI': [6.773, -74.799],
    'SAN JERONIMO': [6.448, -75.727], 'SONSÓN': [5.711, -75.311], 'TARAZA': [7.580, -75.401], 'TARSO': [5.864, -75.823], 'URRAO': [6.317, -76.134], 'VALDIVIA': [7.165, -75.439],
    'YOLOMBO': [6.598, -75.013], 'ANGOSTURA': [6.886, -75.335], 'BETULIA': [6.115, -75.984], 'CAUCASIA': [7.986, -75.193], 'EBEJICO': [6.326, -75.768], 'HISPANIA': [5.799, -75.907], 'VALPARAISO': [5.615, -75.624]
  };
  const UEMB = [6.244, -75.574]; // unidades en colegios de Medellín: se agrupan en un solo punto

  /* Convierte cada valor de la dimensión en un punto del mapa */
  function points(dim, idx) {
    const items = Dt.count(dim, idx), pts = [], out = [];
    let uemb = { n: 0, ids: [] };
    items.forEach(x => {
      if (dim === 'Comuna') { const g = GEO_COMUNA[x.raw]; g ? pts.push({ ...x, ll: g }) : out.push(x); return; }
      if (/^UEMB/.test(x.raw)) { uemb.n += x.n; uemb.ids.push(x); return; }
      const key = x.raw.replace(/^UEMR\s*-\s*/, '').trim(), g = GEO_SEDE[x.raw] || GEO_SEDE[key];
      g ? pts.push({ ...x, ll: g }) : out.push(x);
    });
    if (uemb.n) pts.push({ i: null, raw: 'UEMB', name: `Unidades en colegios de Medellín (${uemb.ids.length})`, n: uemb.n, ll: UEMB });
    return { pts, out };
  }

  let MAP = null, LAYER = null, TILES = null;

  App.views.mapa = {
    title: 'Mapa', group: 'Panorama', icon: 'pin', badge: 'Nuevo',
    desc: 'Dónde viven y dónde estudian los estudiantes.',
    render(idx) {
      const html = `<div class="grid">
        <section class="card c8 map-card"><header class="card-h"><div><h3>${S.mapa === 'Comuna' ? 'Dónde viven los estudiantes' : 'Dónde estudian los estudiantes'}</h3><p>El tamaño de cada burbuja es proporcional al número de estudiantes. Haz clic en una para filtrar.</p></div>
          ${ui.seg('mapa', [['Comuna', 'Dónde viven'], ['Sede', 'Dónde estudian']], S.mapa)}</header>
          <div id="map" class="map" role="region" aria-label="Mapa de estudiantes"></div>
          <p class="note">Ubicaciones aproximadas: centro de cada comuna o municipio. Mapa base © OpenStreetMap y CARTO.</p></section>
        <section class="card c4"><header class="card-h"><div><h3>Ranking del mapa</h3><p id="maptot"></p></div></header><ol class="rank" id="maprank"></ol></section>
        ${ui.tableCard('Lugares sin coordenadas', 'mapout', 'Municipios lejanos, ciudades de otros departamentos, modalidad virtual o registros sin dato.', 'c12')}
      </div>`;
      return [html, () => {
        U.$('[data-seg="mapa"]').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { S.mapa = b.dataset.v; App.render(); } };
        const { pts, out } = points(S.mapa, idx), tot = idx.length, mapped = pts.reduce((s, p) => s + p.n, 0);
        U.$('#maptot').textContent = `${U.fmt(mapped)} estudiantes ubicados (${U.pct(mapped, tot)} del total filtrado).`;
        U.$('#maprank').innerHTML = pts.slice().sort((a, b) => b.n - a.n).slice(0, 14).map(p => `<li><button ${p.i !== null ? `data-i="${p.i}"` : 'disabled'}><span>${U.esc(p.name)}</span><b>${U.fmt(p.n)}</b><i style="width:${U.pctN(p.n, pts[0] ? Math.max(...pts.map(q => q.n)) : 1)}%"></i></button></li>`).join('');
        U.$('#maprank').onclick = e => { const b = e.target.closest('[data-i]'); if (b) App.setFilter(S.mapa, b.dataset.i); };
        ui.table('mapout', [S.mapa === 'Comuna' ? 'Comuna / municipio' : 'Sede', 'Estudiantes', '% del total'], out.map(x => [x.name, x.n, U.pct(x.n, tot)]), { bar: 2, name: 'sin_coordenadas' });
        draw(pts);
      }];
    }
  };

  function draw(pts) {
    const host = U.$('#map');
    if (typeof L === 'undefined') { host.innerHTML = ui.empty('No se pudo cargar la librería del mapa (Leaflet). Revisa tu conexión a internet y recarga la página.'); return; }
    if (MAP) { MAP.remove(); MAP = null; }
    MAP = L.map(host, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    const dark = document.documentElement.dataset.theme === 'dark';
    TILES = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`, { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18 }).addTo(MAP);
    const max = Math.max(1, ...pts.map(p => p.n)), c1 = U.css('--c1'), acc = U.css('--accent');
    LAYER = L.layerGroup().addTo(MAP);
    pts.sort((a, b) => b.n - a.n).forEach((p, j) => {
      const r = 5 + 24 * Math.sqrt(p.n / max);
      const m = L.circleMarker(p.ll, { radius: r, color: j < 3 ? acc : c1, weight: 2, fillColor: j < 3 ? acc : c1, fillOpacity: 0.55 })
        .bindTooltip(`<b>${U.esc(p.name)}</b><br>${U.fmt(p.n)} estudiantes`, { direction: 'top' }).addTo(LAYER);
      if (p.i !== null) m.on('click', () => { App.setFilter(S.mapa, p.i); U.toast('Filtro aplicado: ' + p.name); });
    });
    if (pts.length) MAP.fitBounds(L.latLngBounds(pts.map(p => p.ll)).pad(0.15)); else MAP.setView([6.25, -75.57], 11);
    MAP.on('click', () => MAP.scrollWheelZoom.enable());
    setTimeout(() => MAP && MAP.invalidateSize(), 60);
  }
  App.onBeforeView = App.onBeforeView || [];
  App.onBeforeView.push(() => { if (MAP) { MAP.remove(); MAP = null; } });
})();
