'use strict';
/* =========================================================
   Vista: Ciudad de datos 3D (Three.js)
   Cada torre es un cruce de dos dimensiones; su altura es el número
   de estudiantes. Arrastra para girar, rueda para acercar,
   pasa el cursor para ver el valor y haz clic para filtrar.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;
  S.d3 = { a: 'Facultad', b: 'Estrato', mode: 'n', auto: true };
  const DIMS = ['Facultad', 'Estrato', 'Sexo', 'Modalidad', 'Colegio', 'TipoPrograma', 'TipoInscripcion', 'Sede', 'Area'];
  let T = null; // escena activa

  App.views.tresd = {
    title: 'Ciudad de datos 3D', group: 'Panorama', icon: 'layers', badge: '3D',
    desc: 'La población convertida en una ciudad: cada torre es un grupo de estudiantes.',
    render(idx) {
      const o = S.d3, opt = DIMS.map(d => [d, Dt.DIM[d]]);
      const html = `<section class="card c12 d3-card">
        <header class="card-h wrap"><div><h3>Ciudad de datos</h3><p>Arrastra para girar · rueda para acercar · clic en una torre para filtrar</p></div>
          <div class="d3-ctl">${ui.select('d3a', opt, o.a, 'Filas')}${ui.select('d3b', opt.filter(x => x[0] !== o.a), o.b, 'Columnas')}
          ${ui.seg('d3m', [['n', 'Cantidad'], ['row', '% por fila']], o.mode)}
          <button class="btn sm ghost" id="d3auto" aria-pressed="${o.auto}">${o.auto ? 'Pausar giro' : 'Girar sola'}</button></div></header>
        <div class="d3" id="d3"><div class="d3-labels" id="d3l"></div><div class="d3-tip" id="d3tip" hidden></div></div>
        <div class="d3-legend" id="d3leg"></div>
      </section>`;
      return [html, () => {
        U.$('#d3a').onchange = e => { o.a = e.target.value; if (o.b === o.a) o.b = DIMS.find(d => d !== o.a); App.render(); };
        U.$('#d3b').onchange = e => { o.b = e.target.value; App.render(); };
        U.$('[data-seg="d3m"]').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { o.mode = b.dataset.v; App.render(); } };
        U.$('#d3auto').onclick = e => { o.auto = !o.auto; e.currentTarget.textContent = o.auto ? 'Pausar giro' : 'Girar sola'; e.currentTarget.setAttribute('aria-pressed', o.auto); if (T) T.auto = o.auto; };
        build(U.$('#d3'), idx);
      }];
    }
  };

  function dispose() { if (!T) return; cancelAnimationFrame(T.raf); T.ro && T.ro.disconnect(); T.ren.dispose(); T.ren.domElement.remove(); T = null; }
  App.onBeforeView = App.onBeforeView || [];
  App.onBeforeView.push(dispose);

  function build(host, idx) {
    dispose();
    if (typeof THREE === 'undefined') { host.innerHTML = ui.empty('No se pudo cargar Three.js. Revisa tu conexión a internet y recarga.'); return; }
    const o = S.d3, x = Dt.cross(o.a, o.b, idx, { maxCols: 8 }), rows = x.rows.slice(0, 8), cols = x.cols;
    if (!rows.length) { host.innerHTML = ui.empty('No hay datos para dibujar.'); return; }
    const val = (r, j) => (o.mode === 'row' ? U.pctN(r.v[j], r.n) : r.v[j]);
    let max = 0; rows.forEach(r => r.v.forEach((_, j) => { max = Math.max(max, val(r, j)); }));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const W = host.clientWidth, H = host.clientHeight;
    let ren;
    try { ren = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { host.insertAdjacentHTML('beforeend', ui.empty('Tu navegador no tiene WebGL activo.')); return; }
    ren.setPixelRatio(Math.min(2, devicePixelRatio)); ren.setSize(W, H); host.prepend(ren.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 500);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(6, 14, 8); scene.add(sun);

    const gap = 1.35, nx = cols.length, nz = rows.length, P = ui.palette();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(nx * gap + 2, nz * gap + 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(U.css('--line')), roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; scene.add(floor);
    const geo = new THREE.BoxGeometry(0.92, 1, 0.92); geo.translate(0, 0.5, 0);
    const bars = [];
    rows.forEach((r, i) => cols.forEach((c, j) => {
      const v = val(r, j), h = Math.max(0.03, (6 * v) / (max || 1));
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(P[i % P.length]), roughness: 0.42, metalness: 0.08 }));
      m.position.set((j - (nx - 1) / 2) * gap, 0, (i - (nz - 1) / 2) * gap);
      m.scale.y = reduce ? h : 0.001;
      m.userData = { h, r, c, n: r.v[j], v, delay: (i + j) * 55 };
      scene.add(m); bars.push(m);
    }));

    /* Etiquetas HTML que siguen a la cámara */
    const lab = U.$('#d3l');
    lab.innerHTML = rows.map((r, i) => `<span class="d3-lr" data-k="r${i}">${U.esc(U.short(r.name.replace(/^Facultad de /, ''), 22))}</span>`).join('') + cols.map((c, j) => `<span class="d3-lc" data-k="c${j}">${U.esc(U.short(c.name, 16))}</span>`).join('');
    const anchors = [...rows.map((_, i) => new THREE.Vector3(-(nx / 2) * gap - 0.4, 0, (i - (nz - 1) / 2) * gap)), ...cols.map((_, j) => new THREE.Vector3((j - (nx - 1) / 2) * gap, 0, (nz / 2) * gap + 0.4))];
    const spans = [...lab.children];
    U.$('#d3leg').innerHTML = `<span>Filas: <b>${Dt.DIM[o.a]}</b> · Columnas: <b>${Dt.DIM[o.b]}</b> · Altura: <b>${o.mode === 'row' ? '% dentro de cada fila' : 'número de estudiantes'}</b></span><span>Torre más alta: <b>${U.fmt(Math.max(...bars.map(b => b.userData.n)))}</b> estudiantes</span>`;

    /* Órbita manual: ángulos esféricos alrededor del centro */
    const st = { th: -0.72, ph: 0.98, rad: Math.max(nx, nz) * gap * 1.2 + 4, drag: false, moved: 0, lx: 0, ly: 0 };
    const tgt = new THREE.Vector3(0, 1.1, 0), ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = U.$('#d3tip');
    let hover = null;
    const el = ren.domElement;
    el.addEventListener('pointerdown', e => { st.drag = true; st.moved = 0; st.lx = e.clientX; st.ly = e.clientY; el.setPointerCapture(e.pointerId); if (T) T.auto = false; });
    el.addEventListener('pointerup', e => { st.drag = false; if (st.moved < 5 && hover) { const d = hover.userData; App.setFilters({ [o.a]: d.r.i, [o.b]: d.c.i }); U.toast(`Filtros: ${d.r.name} + ${d.c.name}`); } });
    el.addEventListener('pointermove', e => {
      const rc = el.getBoundingClientRect();
      if (st.drag) { const dx = e.clientX - st.lx, dy = e.clientY - st.ly; st.moved += Math.abs(dx) + Math.abs(dy); st.th -= dx * 0.008; st.ph = Math.min(1.45, Math.max(0.25, st.ph - dy * 0.006)); st.lx = e.clientX; st.ly = e.clientY; }
      mouse.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hit = ray.intersectObjects(bars)[0];
      if (hover && (!hit || hit.object !== hover)) { hover.material.emissive.setHex(0x000000); hover = null; }
      if (hit) {
        hover = hit.object; hover.material.emissive.set(U.css('--accent')); hover.material.emissiveIntensity = 0.35;
        const d = hover.userData;
        tip.hidden = false; tip.style.left = e.clientX - rc.left + 14 + 'px'; tip.style.top = e.clientY - rc.top + 14 + 'px';
        tip.innerHTML = `<b>${U.esc(d.r.name)}</b><br>${U.esc(d.c.name)}<br><span>${U.fmt(d.n)} estudiantes${o.mode === 'row' ? ` · ${U.num(d.v)}% de la fila` : ''}</span>`;
        el.style.cursor = 'pointer';
      } else { tip.hidden = true; el.style.cursor = st.drag ? 'grabbing' : 'grab'; }
    });
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
    el.addEventListener('wheel', e => { e.preventDefault(); st.rad = Math.min(60, Math.max(6, st.rad * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });

    const t0 = performance.now(), v3 = new THREE.Vector3();
    T = { ren, raf: 0, auto: o.auto && !reduce };
    const loop = now => {
      if (!T) return;
      if (T.auto) st.th += 0.0022;
      cam.position.set(tgt.x + st.rad * Math.sin(st.ph) * Math.sin(st.th), tgt.y + st.rad * Math.cos(st.ph), tgt.z + st.rad * Math.sin(st.ph) * Math.cos(st.th));
      cam.lookAt(tgt);
      if (!reduce) bars.forEach(b => { const k = Math.min(1, Math.max(0, (now - t0 - b.userData.delay) / 900)); b.scale.y = Math.max(0.001, b.userData.h * (1 - Math.pow(1 - k, 3))); });
      ren.render(scene, cam);
      const w = el.clientWidth, h = el.clientHeight;
      anchors.forEach((a, k) => { v3.copy(a).project(cam); const s = spans[k]; s.style.transform = `translate(-50%,-50%) translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h}px)`; s.style.opacity = v3.z < 1 ? 1 : 0; });
      T.raf = requestAnimationFrame(loop);
    };
    T.raf = requestAnimationFrame(loop);
    T.ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); });
    T.ro.observe(host);
  }
})();
