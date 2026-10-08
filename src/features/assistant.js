'use strict';
/* =========================================================
   assistant.js · Asistente de IA que explica los datos
   Dos cerebros:
   1) Motor local (siempre disponible, sin internet ni llaves):
      entiende preguntas como "¿qué programa tiene más mujeres en Robledo?"
      y responde calculando sobre los datos filtrados.
   2) Gemini (opcional): si pegas tu API key de Google AI Studio, el asistente
      envía a Gemini un resumen numérico de los datos filtrados (no los registros)
      y redacta explicaciones más completas.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, S = App.S, I = () => App.feat.insights;
  const KEY = 'dash_gemini_key', MODEL = 'dash_gemini_model';
  const hist = []; // conversación para Gemini
  let busy = false;

  const TOPW = [[/programas?/, 'Programa'], [/sedes?/, 'Sede'], [/facultad(es)?/, 'Facultad'], [/comunas?/, 'Comuna'], [/departamentos?/, 'Departamento'], [/barrios?/, 'Barrio'],
    [/(colegios?|instituci(o|ó)n(es)?)( de procedencia)?/, 'Institucion'], [/pa(i|í)s(es)?/, 'Pais'], [/ciudad(es)?/, 'Ciudad'], [/estratos?/, 'Estrato'],
    [/modalidad(es)?/, 'Modalidad'], [/(a|á)reas?/, 'Area'], [/inscripci(o|ó)n/, 'TipoInscripcion'], [/(sexo|g(e|é)nero)/, 'Sexo']];

  /* ---------- Motor local ---------- */
  function local(text) {
    const q = U.norm(text);
    const base = S.idx, n0 = base.length;
    if (!n0) return { html: 'Con los filtros actuales no hay estudiantes. Quita algún filtro y vuelve a preguntar.' };
    if (/^(hola|buenas|hey|holi)\b/.test(q)) return { html: `¡Hola! Estoy mirando <b>${U.fmt(n0)}</b> estudiantes con los filtros actuales. Pregúntame por programas, sedes, estratos, comunas, colegios o combinaciones como <i>"¿qué programa tiene más mujeres en modalidad virtual?"</i>.` };
    if (/mapa/.test(q)) return { html: 'El mapa de Colombia muestra de qué departamento vienen los estudiantes; al tocar un departamento se filtra todo el tablero.', btn: [['Abrir mapa', () => App.go('mapa')]] };
    if (/\b3d\b|ciudad de datos|tres d/.test(q)) return { html: 'En la ciudad 3D cada torre es un cruce de dos dimensiones y su altura es el número de estudiantes.', btn: [['Abrir vista 3D', () => App.go('tresd')]] };
    if (/compar/.test(q)) return { html: 'Para comparar dos grupos lado a lado usa el comparador: eliges el segmento A y el B y ves sus diferencias en puntos porcentuales.', btn: [['Abrir comparador', () => App.go('comparador')]] };

    const r = I().ask(text), f = r.f;
    const topDim = (TOPW.find(([re, c]) => re.test(q) && !(c in f) && /(m(a|á)s|mayor|menos|menor|top|principal|predomina|frecuente|cu(a|á)l|qu(e|é)|ranking|lista)/.test(q)) || [])[1];
    const chips = Object.entries(f).map(([c, i]) => `<span class="a-chip">${Dt.DIM[c]}: ${U.esc(Dt.label(c, i))}</span>`).join(' ');

    if (topDim) {
      const idx = r.idx, asc = /(menos|menor)/.test(q);
      let it = Dt.count(topDim, idx, { na: true, byLabel: topDim === 'Estrato' && !/m(a|á)s|mayor|menos|menor/.test(q) });
      if (asc) it = it.slice().reverse();
      if (!it.length) return { html: 'No encontré datos para esa combinación.' };
      const list = it.slice(0, 5).map(x => `<li><b>${U.esc(x.name)}</b>: ${U.fmt(x.n)} (${U.pct(x.n, idx.length)})</li>`).join('');
      return {
        html: `${chips ? `Dentro de ${chips} (${U.fmt(idx.length)} estudiantes), ` : ''}${asc ? 'los de menor presencia' : 'los primeros'} por <b>${Dt.DIM[topDim].toLowerCase()}</b> son:<ol>${list}</ol>
          ${it[0] ? `La primera posición concentra el ${U.pct(it[0].n, idx.length)} del grupo.` : ''}`,
        btn: [[`Filtrar por ${U.short(it[0].name, 28)}`, () => App.setFilters({ ...f, [topDim]: it[0].i })]]
      };
    }
    if (Object.keys(f).length) {
      const idx = r.idx, n = idx.length;
      if (!n) return { html: `No hay estudiantes que cumplan ${chips} con los filtros actuales.` };
      const fac = Dt.count('Facultad', idx)[0], pr = Dt.count('Programa', idx)[0], sx = Dt.map('Sexo', idx), es = Dt.count('Estrato', idx)[0];
      return {
        html: `Hay <b>${U.fmt(n)}</b> estudiantes que cumplen ${chips}, el <b>${U.pct(n, n0)}</b> de los ${U.fmt(n0)} que estás viendo.
          <ul><li>Facultad principal: ${U.esc(fac.name)} (${U.pct(fac.n, n)})</li><li>Programa más frecuente: ${U.esc(pr.name)} (${U.fmt(pr.n)})</li>
          <li>Mujeres: ${U.pct(sx.FEMENINO || 0, n)}</li><li>Estrato más común: ${es.raw}</li></ul>`,
        btn: [['Aplicar como filtros', () => App.setFilters(f)]]
      };
    }
    if (/(resum|explic|describ|cuent|general|hallazg|insight|conclusi|que ves|analiza)/.test(q)) {
      const L = I().list(base).slice(0, 3);
      return { html: `${I().narrative(base, Object.keys(S.f).length)}${L.length ? '<br><br><b>Lo que más llama la atención:</b><ul>' + L.map(x => `<li><b>${x.v}</b> ${U.esc(x.t)}</li>`).join('') + '</ul>' : ''}` };
    }
    return { html: `No estoy seguro de haber entendido. Prueba con algo como:<ul><li>¿Qué sede tiene más estudiantes de estrato 1?</li><li>¿Cuántas mujeres estudian virtual?</li><li>¿Qué comunas aportan más estudiantes a Robledo?</li><li>Hazme un resumen</li></ul>${U.store.get(KEY, '') ? '' : 'Si activas Gemini (ícono ⚙) podré responder preguntas más abiertas.'}` };
  }

  /* ---------- Contexto numérico que se envía a Gemini ---------- */
  function context() {
    const idx = S.idx, n = idx.length, dist = (c, k, o) => Dt.count(c, idx, o).slice(0, k).map(x => `${x.name}: ${x.n} (${U.pct(x.n, n)})`);
    return JSON.stringify({
      fuente: `${Dt.D.meta.archivo}, año ${Dt.D.meta.ano}`, vista_actual: App.views[S.view].title,
      filtros_activos: Object.fromEntries(Object.entries(S.f).map(([c, v]) => [Dt.DIM[c], Dt.label(c, v)])),
      estudiantes_filtrados: n, estudiantes_totales: Dt.R.length,
      distribuciones: {
        Facultad: dist('Facultad', 8), Sede: dist('Sede', 10), Programa: dist('Programa', 12), Sexo: dist('Sexo', 3), Estrato: dist('Estrato', 7, { byLabel: true }),
        Modalidad: dist('Modalidad', 3), Colegio: dist('Colegio', 2), Nivel: dist('TipoPrograma', 2), Inscripcion: dist('TipoInscripcion', 3),
        Comuna: dist('Comuna', 10, { na: true }), Pais_nacimiento: dist('Pais', 5), Area: dist('Area', 7)
      },
      hallazgos: I().list(idx).map(x => `${x.k}: ${x.v} ${x.t}`)
    });
  }
  const SYS = 'Eres el asistente de análisis de un tablero de datos de estudiantes universitarios de Medellín. Responde en español, claro y breve (máximo 180 palabras), ' +
    'como un analista de datos que explica a una persona no técnica. Usa SOLO los números del contexto JSON; si algo no está en el contexto, dilo y sugiere qué filtro aplicar en el tablero. ' +
    'Usa **negritas** para cifras clave y listas con "- " cuando ayuden. No inventes datos.';

  async function gemini(text, localHint) {
    const key = U.store.get(KEY, ''), model = U.store.get(MODEL, 'gemini-2.5-flash');
    hist.push({ role: 'user', parts: [{ text: `CONTEXTO DE DATOS:\n${context()}\n\nCÁLCULO DEL MOTOR LOCAL (puede ayudarte): ${localHint}\n\nPREGUNTA: ${text}` }] });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: hist.slice(-8), generationConfig: { temperature: 0.4, maxOutputTokens: 900 } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Error ' + res.status);
    const out = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!out) throw new Error('Gemini no devolvió texto');
    hist.push({ role: 'model', parts: [{ text: out }] });
    return out;
  }
  const md = t => U.esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>').replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>').replace(/<\/li><br>/g, '</li>');

  /* ---------- Interfaz del panel ---------- */
  function mount() {
    document.body.insertAdjacentHTML('beforeend', `
      <button class="ai-fab" id="aiFab" aria-controls="aiPanel" aria-expanded="false">${App.ui.icon('spark', 20)}<span>Asistente IA</span></button>
      <aside class="ai-panel" id="aiPanel" aria-label="Asistente de IA" hidden>
        <header class="ai-h"><div class="ai-av">${App.ui.icon('spark', 18)}</div><div><b>Asistente de datos</b><small id="aiMode"></small></div>
          <button class="icon-btn" id="aiCfg" title="Configurar Gemini" aria-label="Configurar Gemini"><svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>
          <button class="icon-btn" id="aiClose" aria-label="Cerrar asistente">${App.ui.icon('x', 18)}</button></header>
        <div class="ai-msgs" id="aiMsgs" aria-live="polite"></div>
        <div class="ai-sug" id="aiSug"></div>
        <form class="ai-in" id="aiForm"><input id="aiText" placeholder="Pregunta sobre los datos…" autocomplete="off" aria-label="Tu pregunta"><button class="btn" aria-label="Enviar">${App.ui.icon('arrow', 18)}</button></form>
      </aside>`);
    const panel = U.$('#aiPanel'), fab = U.$('#aiFab');
    fab.onclick = () => toggle(); U.$('#aiClose').onclick = () => toggle(false);
    U.$('#aiCfg').onclick = settings;
    U.$('#aiForm').onsubmit = e => { e.preventDefault(); const t = U.$('#aiText').value.trim(); if (t) { U.$('#aiText').value = ''; send(t); } };
    U.$('#aiSug').onclick = e => { const b = e.target.closest('button'); if (b) send(b.textContent); };
    mode();
    bot(`¡Hola! Soy tu asistente de datos. Veo <b>${U.fmt(Dt.R.length)}</b> registros de estudiantes. Pregúntame lo que quieras o toca una sugerencia.`);
    sugg();
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }
  function toggle(force) {
    const p = U.$('#aiPanel'), open = force ?? p.hidden;
    p.hidden = !open; U.$('#aiFab').setAttribute('aria-expanded', open); U.$('#aiFab').classList.toggle('hide', open);
    if (open) { sugg(); setTimeout(() => U.$('#aiText').focus(), 50); }
  }
  const mode = () => { U.$('#aiMode').textContent = U.store.get(KEY, '') ? 'Gemini + motor local' : 'Motor local · sin conexión a IA externa'; };
  function sugg() {
    const v = S.view, extra = { mapa: '¿Qué departamentos aportan más estudiantes?', tresd: '¿Qué facultad tiene más estudiantes de estrato 1?', comparador: '¿En qué se diferencian hombres y mujeres?', sedes: '¿Qué sede tiene más estudiantes virtuales?' }[v];
    const s = ['Hazme un resumen', extra || '¿Qué programa tiene más mujeres?', '¿Cuántos estudiantes de estrato 1 vienen de colegio público?', '¿Qué sede tiene más estudiantes?'];
    U.$('#aiSug').innerHTML = s.map(x => `<button type="button">${x}</button>`).join('');
  }
  function add(cls, html) { const m = U.$('#aiMsgs'), d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; m.append(d); m.scrollTop = m.scrollHeight; return d; }
  const bot = (html, btn) => { const d = add('bot', html); (btn || []).forEach(([t, fn]) => { const b = document.createElement('button'); b.className = 'btn sm ghost'; b.textContent = t; b.onclick = fn; d.append(b); }); return d; };

  async function send(text) {
    if (busy) return; busy = true;
    add('me', U.esc(text));
    const L = local(text), key = U.store.get(KEY, '');
    if (!key) { bot(L.html, L.btn); busy = false; return; }
    const wait = add('bot typing', '<i></i><i></i><i></i>');
    try {
      const hint = L.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const out = await gemini(text, hint);
      wait.remove(); bot(md(out), L.btn);
    } catch (e) {
      wait.remove(); bot(`<span class="muted">Gemini no respondió (${U.esc(e.message)}). Respuesta del motor local:</span><br>${L.html}`, L.btn);
    }
    busy = false;
  }

  function settings() {
    App.ui.modal(`<h3>${App.ui.icon('spark', 20)} Conectar Gemini (opcional)</h3>
      <p class="note">Crea una API key gratis en Google AI Studio y pégala aquí. Se guarda solo en este navegador. El asistente envía a Gemini un <b>resumen numérico</b> de los datos filtrados, nunca los registros individuales.</p>
      <label class="fld"><span>API key de Gemini</span><input id="gk" class="input" type="password" value="${U.esc(U.store.get(KEY, ''))}" placeholder="AIza…"></label>
      <label class="fld"><span>Modelo</span><input id="gm" class="input" value="${U.esc(U.store.get(MODEL, 'gemini-2.5-flash'))}"></label>
      <p class="note warn">No subas tu API key a GitHub ni la escribas en el código.</p>
      <div class="m-act"><button class="btn ghost" id="gdel">Quitar llave</button><button class="btn" id="gok">Guardar</button></div>`, d => {
      d.querySelector('#gok').onclick = () => { U.store.set(KEY, d.querySelector('#gk').value.trim()); U.store.set(MODEL, d.querySelector('#gm').value.trim() || 'gemini-2.5-flash'); mode(); d.close(); U.toast('Configuración del asistente guardada'); };
      d.querySelector('#gdel').onclick = () => { U.store.set(KEY, ''); mode(); d.close(); U.toast('Llave eliminada: el asistente usa el motor local'); };
    });
  }

  App.feat.assistant = { mount, toggle, send };
})();
