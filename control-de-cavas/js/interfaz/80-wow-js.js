/* Capa «wow»: intro, tanques y colectores con líquido animado, inclinación 3D, luz que sigue al cursor y portada de Inicio.
   Solo presentación: no lee ni cambia datos. Si falla, se desactiva sola. */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia && matchMedia('(hover: none)').matches;
  let uid = 0;
  const num = (t) => { const m = /([\d.]+(?:,\d+)?)/.exec(String(t || '')); return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : NaN; };

  /* ---------- Recipientes con líquido ---------- */
  const GEO = {
    tank: { vb: '0 0 100 140', body: 'M28 18 H72 Q79 18 79 26 V93 Q79 97 75 101 L55 120 H45 L25 101 Q21 97 21 93 V26 Q21 18 28 18Z', dome: 'M30 18 Q50 3 70 18', top: 18, bot: 120, x0: 20, x1: 80,
      extra: 'M46 9 V5 H54 V9 M50 5 V2 H83 Q91 2 91 12 V78 H79 M26 96 H74 M28 104 V133 H22 M72 104 V133 H78 M46 120 V125 H54', ring: [50, 82, 13], hl: 25, ticks: [36, 58, 80] },
    col: { vb: '0 0 90 140', body: 'M30 22 Q30 15 38 15 H52 Q60 15 60 22 V99 Q60 104 56 109 L48 120 H42 L34 109 Q30 104 30 99Z', dome: '', top: 15, bot: 120, x0: 29, x1: 61,
      extra: 'M41 15 V8 H49 V15 M45 8 V4 H68 Q75 4 75 12 V25 M75 25 H79 M60 92 H73 V99 H60 M42 120 V127 H48 V120', ring: null, hl: 33, ticks: [38, 62, 86] }
  };
  const PAL = {
    ferm: ['#FFE08A', '#FFB020', '#D96A00'], mad: ['#9BE7FF', '#3AA0FF', '#1B4FD8'], levadura: ['#FFF1C9', '#E8C77A', '#B98A3E'], vacio: null
  };
  function vessel(kind, tone, fill, calm, glow, div) {
    const g = GEO[kind], id = 'pmv' + (++uid), p = PAL[tone];
    const H = g.bot - g.top, f = Math.max(0, Math.min(1, fill)), y = g.bot - f * H;
    const w = (dy, amp, op, cls) => `<g class="pmv-w ${cls}" opacity="${op}" transform="translate(0 ${dy})"><path d="M-50 0 q12.5 -${amp} 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V140 H-50Z" fill="url(#${id}l)"/></g>`;
    let liquid = '';
    if (p && f > 0.02) {
      const bub = Array.from({ length: calm ? 4 : 9 }, (_, i) => { const x = g.x0 + 6 + ((i * 37 + 11) % (g.x1 - g.x0 - 12)); const r = 0.9 + (i % 3) * 0.55; return `<circle class="pmv-b" cx="${x}" cy="${g.bot - 6}" r="${r}" style="--rise:${Math.max(8, g.bot - 6 - y)}px;--d:${(i * 0.7).toFixed(1)}s;--t:${(calm ? 6 : 3.2) + (i % 4) * 0.8}s"/>`; }).join('');
      liquid = `<defs><linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".45" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <g clip-path="url(#${id}c)">${w(y + 1.5, 3.2, 0.55, 'b')}${w(y, 4, 1, 'a')}${bub}
        <rect x="${g.x0}" y="${y}" width="${g.x1 - g.x0}" height="${g.bot - y}" fill="url(#${id}l)" opacity="0" /></g>`;
    } else {
      liquid = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
    }
    const ticks = g.ticks.map((t) => `<path d="M${g.x1 - 1} ${t} h5" stroke-width="1.4" opacity=".5"/>`).join('');
    return `<svg viewBox="${g.vb}" class="pmv ${p ? 'on' : 'off'}" style="${glow ? `--vc:${glow}` : ''}" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <defs><clipPath id="${id}c"><path d="${g.body}"/></clipPath></defs>${liquid}
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b6372"/><stop offset=".18" stop-color="#d9dee8"/><stop offset=".42" stop-color="#8e97a8"/><stop offset=".72" stop-color="#4a5262"/><stop offset="1" stop-color="#9aa3b4"/></linearGradient>
        <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6fa"/><stop offset=".5" stop-color="#8d96a8"/><stop offset="1" stop-color="#e2e6ee"/></linearGradient></defs>
      <path class="pmv-glass" d="${g.body}" fill="url(#${id}s)" fill-opacity="${p ? '.16' : '.28'}" stroke="url(#${id}t)" stroke-width="2.6" ${p ? '' : 'stroke-dasharray="3 4"'}/>
      ${div ? `<path d="M${g.x0 + 2} ${((g.top + g.bot) / 2).toFixed(1)} H${g.x1 - 2}" stroke="#fff" stroke-width="1" stroke-dasharray="2 3" opacity=".55"/>` : ''}
      <ellipse class="pmv-floor" cx="${(g.x0 + g.x1) / 2}" cy="${g.bot + (kind === 'tank' ? 14 : 8)}" rx="${(g.x1 - g.x0) / 2 + 4}" ry="3" fill="#000" opacity=".35" stroke="none"/>
      ${g.dome ? `<path d="${g.dome}" stroke="url(#${id}t)" stroke-width="2.6"/>` : ''}<path d="${g.extra}" stroke="url(#${id}t)" stroke-width="1.8" opacity=".85"/>
      ${g.ring ? `<circle cx="${g.ring[0]}" cy="${g.ring[1]}" r="${g.ring[2]}" stroke-width="1.4" opacity=".5"/><circle cx="${g.ring[0]}" cy="${g.ring[1]}" r="2" stroke-width="1.4" opacity=".5"/>` : ''}
      ${ticks}<rect x="${g.hl}" y="${g.top + 6}" width="4" height="${H * 0.55}" rx="2" fill="url(#${id}g)" stroke="none"/></svg>`;
  }


  /* ---------- Semáforos (en lugar de texto) ---------- */
  const SEM_TXT = { red: 'Atención / fuera de tiempo', yellow: 'Próximo / revisar', green: 'En tiempo', idle: 'En espera' };
  function sem(estado, titulo) {
    return `<span class="pm-sem" data-s="${estado}" role="img" aria-label="${(titulo || SEM_TXT[estado]).replace(/"/g, '')}" title="${(titulo || SEM_TXT[estado]).replace(/"/g, '')}"><i class="r"></i><i class="y"></i><i class="g"></i></span>`;
  }
  const HORAS_PRONTO = 24; // cosecha: amarillo si faltan menos de estas horas
  function fechaDM(t) {
    const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})/.exec(String(t || '')); if (!m) return null;
    const now = new Date(); let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
    let d = new Date(y, +m[2] - 1, +m[1], +m[4], +m[5]);
    if (!m[3] && d - now > 200 * 864e5) d = new Date(y - 1, +m[2] - 1, +m[1], +m[4], +m[5]);
    return d;
  }
  function dur(h) { h = Math.abs(h); if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min'; if (h < 48) return Math.round(h) + ' h'; const d = Math.floor(h / 24), r = Math.round(h - d * 24); return d + ' d' + (r && d < 10 ? ' ' + r + ' h' : ''); }
  function celdas(card) { const m = {}; card.querySelectorAll('dl > div').forEach((d) => { const k = (d.querySelector('dt') || {}).textContent, v = (d.querySelector('dd') || {}).textContent; if (k) m[k.trim().toLowerCase()] = (v || '').trim(); }); return m; }
  function infoTanque(card, ferm, mad) {
    if (card.querySelector('.pmt-info')) return;
    const c = celdas(card), now = Date.now();
    const ini = fechaDM(c['llenado']), fin = fechaDM(c['recolección'] || c['recoleccion']);
    const vol = num(c['volumen inventario']); const lev = c['levadura']; const temp = c['temperatura'];
    const has = (v) => v && !/sin dato/i.test(v);
    const tiles = [];
    // Progreso hacia la recolección
    let prog = '';
    if (ini && fin && fin > ini) {
      const tot = (fin - ini) / 36e5, el = (now - ini) / 36e5, pct = Math.max(0, Math.min(100, el / tot * 100));
      const left = (fin - now) / 36e5;
      prog = `<div class="pmt-prog"><div class="pmt-prog-h"><span>${mad ? 'Maduración' : 'Fermentación'}</span><b>${Math.round(pct)} %</b></div><div class="pmt-bar"><i style="--w:${pct.toFixed(1)}%"></i></div>
        <div class="pmt-prog-f"><span>${dur(el)} en tanque</span><span class="pmt-harv"><em>Recolección ${left < 0 ? 'hace ' + dur(left) : 'en ' + dur(left)}</em></span></div></div>`;
    } else if (ini) {
      prog = `<div class="pmt-prog" data-s="idle"><div class="pmt-prog-h"><span>En tanque</span><b>${dur((now - ini) / 36e5)}</b></div></div>`;
    }
    if (isFinite(vol) && vol > 0) tiles.push(`<div class="pmt-t"><small>Volumen</small><b>${vol.toLocaleString('es-CO', { maximumFractionDigits: 0 })}<u>Hl</u></b><div class="pmt-bar thin"><i style="--w:${Math.min(100, vol / 4800 * 100).toFixed(0)}%"></i></div></div>`);
    if (has(lev)) tiles.push(`<div class="pmt-t"><small>Levadura</small><b class="mono">${lev}</b></div>`);
    if (has(temp)) tiles.push(`<div class="pmt-t"><small>Temperatura</small><b>${temp}</b></div>`);
    if (ini) tiles.push(`<div class="pmt-t"><small>Llenado</small><b>${ini.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}<u>${ini.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</u></b></div>`);
    const dl = card.querySelector('dl'); if (!dl || (!prog && !tiles.length)) return;
    const w = document.createElement('div'); w.className = 'pmt-info'; w.innerHTML = prog + (tiles.length ? `<div class="pmt-tiles">${tiles.join('')}</div>` : '');
    dl.after(w); dl.classList.add('pmt-dl-hide');
  }

  /* ---------- Semáforo por especificación: verde = dentro, amarillo = cerca del límite, rojo = fuera ---------- */
  const CERCA = 0.2;      // franja de «casi sale»: 20 % del ancho de la banda en cada borde
  const CERCA_MAX = 0.85; // límites de un solo lado (p. ej. tiempo máximo): amarillo desde 85 % del máximo
  function estadoBanda(v, inf, sup) {
    if (v == null || !isFinite(v)) return 'idle';
    if (inf != null && sup != null && sup > inf) { if (v < inf || v > sup) return 'red'; const m = (sup - inf) * CERCA; return v < inf + m || v > sup - m ? 'yellow' : 'green'; }
    if (sup != null) return v > sup ? 'red' : v > sup * CERCA_MAX ? 'yellow' : 'green';
    if (inf != null) return v < inf ? 'red' : v < inf * (2 - CERCA_MAX) ? 'yellow' : 'green';
    return 'idle';
  }
  const rangoTxt = (sp) => !sp ? '' : sp.inf != null && sp.sup != null ? `${sp.inf}–${sp.sup}` : sp.sup != null ? `máx. ${sp.sup}` : `mín. ${sp.inf}`;
  function semaforosDe(r, ferm) {
    const out = []; let worst = '';
    try {
      if (App.ExcelCavas && App.ExcelCavas.enrich) r = App.ExcelCavas.enrich(r);
      const item = (nombre, estado, valor, ayuda) => { out.push(`<div class="pmt-sem" data-s="${estado}" title="${(ayuda || '').replace(/"/g, '')}"><b>${nombre}</b><small>${valor || ''}</small></div>`); if (estado === 'red') worst = 'red'; else if (estado === 'yellow' && worst !== 'red') worst = 'yellow'; else if (estado === 'green' && !worst) worst = 'green'; };
      if (ferm) {
        const a = App.FVDetail.analyze(App.FVDetail.model(r), r), h = App.TankOperations.harvest(r, a);
        const est = h.color === 'done' ? 'green' : h.color === 'neutral' ? 'idle' : h.color;
        item('Cosecha', est, h.color === 'done' ? 'registrada' : h.color === 'neutral' ? 'sin T0' : h.color === 'green' ? 'ventana verde' : h.color === 'yellow' ? 'ventana amarilla' : 'fuera de tiempo', `${h.label}. ${h.help}`);
        const f = (App.ExcelCavas.data().fermentations || []).find((x) => x.lote === r.consecutive);
        const marca = (f && f.marca) || r.brand, sp = App.Hist2 && App.Hist2.spec ? App.Hist2.spec(marca) : null;
        if (sp) {
          const t0 = r.fvRegistration && r.fvRegistration.fillEnd || r.fill; const ini = t0 ? +App.U.parseDT(t0) : NaN;
          if (sp.tmax && isFinite(ini)) { const hs = (Date.now() - ini) / 36e5; item('Tiempo en FV', estadoBanda(hs, null, sp.tmax.sup), `${Math.round(hs)} / ${sp.tmax.sup} h`, `Tiempo máximo en fermentador según la hoja de especificaciones (${sp.tmax.sup} h). Se calcula con la hora actual.`); }
          if (sp.eo && f && f.eo != null) item('E.O.', estadoBanda(+f.eo, sp.eo.inf, sp.eo.sup), `${(+f.eo).toFixed(2)} °P`, `Extracto original frente a la especificación ${rangoTxt(sp.eo)} °P.`);
          const tmp = parseFloat(String(r.temperature || '').replace(',', '.'));
          if (sp.tfer && isFinite(tmp)) item('Temp.', estadoBanda(tmp, sp.tfer.inf, sp.tfer.sup), `${tmp} °C`, `Temperatura frente a la especificación de fermentación ${rangoTxt(sp.tfer)} °C.`);
        }
      } else if (App.PlatformRules && App.PlatformRules.maturity) {
        const mt = App.PlatformRules.maturity(r);
        if (mt && mt.minimum) item('Maduración', mt.elapsed >= mt.minimum ? 'green' : 'idle', `${Math.round(mt.elapsed)} / ${Math.round(mt.minimum)} h`, `Horas de maduración frente al mínimo (${Math.round(mt.minimum)} h).`);
      }
    } catch (e) { return { html: '', worst: '' }; }
    return { html: out.join(''), worst };
  }
  function semaforosTanque(card, ferm) {
    if (card.querySelector('.pmt-sems') || !window.App || !App.Cavas) return;
    const m = /detalle\/(\d+)/.exec(card.dataset.go || ''); if (!m) return;
    const r = App.Cavas.records().find((x) => x.tq === +m[1]); if (!r) return;
    const R = semaforosDe(r, ferm); if (!R.html) return;
    if (R.worst) card.dataset.worst = R.worst;
    const w = document.createElement('div'); w.className = 'pmt-sems'; w.innerHTML = R.html;
    const where = card.querySelector('.pmt-info'); if (where) where.before(w); else { const dl = card.querySelector('dl'); if (dl) dl.before(w); }
  }
  function semaforoPill(pill, estado) {
    if (pill.dataset.pms) return; pill.dataset.pms = '1';
    pill.dataset.s = estado; pill.title = pill.textContent.trim();
    const box = pill.closest('article, button.flow-collector'); if (box) box.dataset.s = estado;
  }
  /* Explosión en colectores en rojo: ondas de choque, chispas y destello. */
  function explosion(btn) {
    if (reduce || btn.querySelector('.pm-boom')) return;
    const v = btn.querySelector('.pmv-col'); if (!v) return;
    const b = document.createElement('span'); b.className = 'pm-boom'; b.setAttribute('aria-hidden', 'true');
    let sp = ''; for (let i = 0; i < 26; i++) { const a = Math.round(i * (360 / 26) + (i % 2 ? 5 : -5)); sp += `<i style="--a:${a}deg;--d:${44 + (i * 37) % 52}px;--s:${(2.6 + (i % 4) * 1.3).toFixed(1)}px;--dl:${(-(i * 0.071)).toFixed(2)}s"></i>`; }
    b.innerHTML = '<u class="f"></u><u class="r1"></u><u class="r2"></u><u class="r3"></u>' + sp;
    btn.appendChild(b);
    const place = () => { if (!document.contains(btn)) return; const r = v.getBoundingClientRect(), q = btn.getBoundingClientRect(); b.style.left = (r.left - q.left + r.width / 2) + 'px'; b.style.top = (r.top - q.top + r.height * 0.55) + 'px'; };
    requestAnimationFrame(place); addEventListener('resize', place);
    btn.classList.add('pm-bang');
  }
  function decorarCosechas() {
    document.querySelectorAll('.harvest-list article').forEach((a) => {
      const pill = a.querySelector('.turn-pill'); if (!pill) return;
      const e = a.classList.contains('red') ? 'red' : a.classList.contains('yellow') ? 'yellow' : a.classList.contains('green') ? 'green' : 'idle';
      semaforoPill(pill, e);
    });
    document.querySelectorAll('button.flow-collector').forEach((b) => {
      const pill = b.querySelector('.flow-collector-top .turn-pill'); if (!pill) return;
      const st = b.dataset.vesselStatus; const e = st === 'late' ? 'red' : st === 'soon' ? 'yellow' : st === 'healthy' ? 'green' : st === 'recover' || st === 'discard' ? 'yellow' : /fuera|vencid/i.test(pill.textContent) ? 'red' : 'idle';
      semaforoPill(pill, e);
      if (e === 'red') explosion(b);
    });
  }

  function decorarTanque(card) {
    if (card.dataset.pmv) return; card.dataset.pmv = '1';
    const art = card.querySelector('.cavas-tank-art'); if (!art) return;
    const ferm = card.classList.contains('fermentation'), mad = card.classList.contains('maturation');
    let vol = NaN; card.querySelectorAll('dl > div').forEach((d) => { if (/volumen/i.test(d.textContent)) vol = num(d.querySelector('dd') && d.querySelector('dd').textContent); });
    const fill = ferm || mad ? (isFinite(vol) && vol > 0 ? Math.min(0.97, 0.18 + vol / 5200 * 0.8) : 0.7) : 0;
    art.innerHTML = vessel('tank', ferm ? 'ferm' : mad ? 'mad' : 'vacio', fill, mad, ferm ? '#ffa31a' : mad ? '#3aa0ff' : '#7b8499');
    card.style.setProperty('--tone', ferm ? '#ffa31a' : mad ? '#3aa0ff' : '#7b8499');
    if (ferm || mad) { infoTanque(card, ferm, mad); semaforosTanque(card, ferm); }
  }
  function decorarColector(btn) {
    if (btn.dataset.pmv) return; btn.dataset.pmv = '1';
    const old = btn.querySelector('svg.studio-vessel'); const color = btn.style.getPropertyValue('--collector-status') || '#e8c77a';
    const slots = [...btn.querySelectorAll('.collector-slots span')]; const used = slots.filter((s) => !/disponible/i.test(s.textContent)).length;
    const fill = slots.length ? Math.max(used ? 0.28 : 0, used / slots.length * 0.86) : 0;
    const svg = vessel('col', 'levadura', fill, true, color, slots.length > 1);
    const tmp = document.createElement('div'); tmp.innerHTML = svg; const el = tmp.firstElementChild; el.classList.add('pmv-col');
    if (old) { old.style.display = 'none'; old.after(el); } else btn.prepend(el);
    btn.style.setProperty('--tone', color);
  }

  /* ---------- Portada de Inicio ---------- */
  function statsDOM() {
    const val = (re) => { const el = [...document.querySelectorAll('main.content *')].find((e) => !e.children.length && re.test(e.textContent.trim())); const p = el && el.previousElementSibling; const n = p ? parseInt(p.textContent, 10) : NaN; return isFinite(n) ? n : null; };
    const f = val(/^Fermentadores$/i), m = val(/^Maduradores$/i), l = val(/^Sin operaci[oó]n$/i); if (f == null && m == null) return '';
    const o = (n, c, t) => n == null ? '' : `<div class="pm-st" style="--c:${c}"><i></i><b data-n="${n}">${n}</b><span>${t}</span></div>`;
    return o(f, '#ffa31a', 'fermentando') + o(m, '#3aa0ff', 'madurando') + o(l, '#8e97ab', 'libres');
  }
  function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
  function hero() {
    if (!/^#\/?(inicio)?$/.test(location.hash || '#/inicio') && location.hash !== '') return;
    const host = document.querySelector('main.content > *:first-child'); if (!host || document.querySelector('.pm-hero')) return;
    const wave = (c, d) => `<svg class="pm-hw ${c}" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 q75 -40 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V120 H0Z" style="animation-duration:${d}s"/></svg>`;
    const s = document.createElement('section'); s.className = 'pm-hero';
    s.innerHTML = `<div class="pm-hero-in"><p class="pm-eye"><i></i> Control de Cavas · en vivo</p><h1><span class="pm-w">${saludo()},</span> <span class="pm-w acc">planta</span><span class="pm-w">.</span></h1>
      <p class="pm-sub">Fermentación, maduración, levaduras y agua en una sola vista. Cada tanque respira: míralos llenarse.</p>
      <div class="pm-cta"><a class="btn pm-glow" href="#/tanques">Ver tanques</a><a class="pm-lnk" href="#/analisis">Ver el análisis</a><a class="pm-lnk" href="#/colectores">Levaduras</a></div></div>
      <div class="pm-hero-glass">${vessel('tank', 'ferm', 0.78, false, '#ffa31a')}</div><div class="pm-clock"><b data-pm-clock>--:--</b><small></small></div>${wave('w1', 11)}${wave('w2', 17)}`;
    host.parentNode.insertBefore(s, host);
    const st = statsDOM(); if (st) { const b = document.createElement('div'); b.className = 'pm-stats'; b.innerHTML = st; s.querySelector('.pm-hero-glass').after(b); }
    const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }); s.querySelector('.pm-clock small').textContent = fecha;
    const tick = () => { const c = s.querySelector('[data-pm-clock]'); if (!c || !document.contains(s)) return; c.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); setTimeout(tick, 15000); }; tick();
  }

  /* ---------- Intro ---------- */
  function intro() {
    let vista = false; try { vista = sessionStorage.getItem('cavas.intro') === '1'; } catch (e) {}
    if (reduce || vista || /nointro/.test(location.search)) return;
    try { sessionStorage.setItem('cavas.intro', '1'); } catch (e) {}
    const d = document.createElement('div'); d.className = 'pm-intro';
    d.innerHTML = `<div class="pm-i-glow"></div><div class="pm-i-v">${vessel('tank', 'ferm', 0.9, false, '#ffa31a')}</div>
      <h2 class="pm-i-t"><span>C</span><span>O</span><span>N</span><span>T</span><span>R</span><span>O</span><span>L</span><i></i><span>D</span><span>E</span><i></i><span>C</span><span>A</span><span>V</span><span>A</span><span>S</span></h2><p class="pm-i-s">Fermentación · Maduración · Levaduras</p><div class="pm-i-bar"><b></b></div>`;
    document.body.appendChild(d);
    const fin = () => { d.classList.add('out'); setTimeout(() => d.remove(), 900); };
    d.addEventListener('click', fin); setTimeout(fin, 2900);
  }

  /* ---------- Luz del cursor e inclinación 3D ---------- */
  function interactividad() {
    if (touch) return;
    let raf = 0, mx = 0, my = 0;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; root.style.setProperty('--mx', mx + 'px'); root.style.setProperty('--my', my + 'px'); });
      const c = e.target.closest && e.target.closest('.cavas-tank,.flow-collector,.acard,.pl-kpi,.an-card,.v35-in');
      if (c) {
        const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        c.style.setProperty('--cx', x + 'px'); c.style.setProperty('--cy', y + 'px');
        if (c.matches('.cavas-tank,.flow-collector')) c.style.transform = `perspective(900px) rotateX(${((y / r.height) - 0.5) * -7}deg) rotateY(${((x / r.width) - 0.5) * 9}deg) translateY(-6px)`;
      }
    }, { passive: true });
    addEventListener('pointerout', (e) => { const c = e.target.closest && e.target.closest('.cavas-tank,.flow-collector'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; }, { passive: true });
    document.body.insertAdjacentHTML('beforeend', '<div class="pm-cursor" aria-hidden="true"></div>');
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest && e.target.closest('.pm-cta .btn,.cavas-card-bottom .btn,.btn.pri');
      document.querySelectorAll('.pm-mag').forEach((x) => { if (x !== b) { x.classList.remove('pm-mag'); x.style.transform = ''; } });
      if (!b) return; const r = b.getBoundingClientRect(); b.classList.add('pm-mag');
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
    }, { passive: true });
  }

  function pasada() {
    document.querySelectorAll('article.cavas-tank').forEach(decorarTanque);
    document.querySelectorAll('button.flow-collector').forEach(decorarColector);
    decorarCosechas(); hero();
  }

  addEventListener('scroll', () => { const g = document.querySelector('.pm-hero-glass'); if (g) { const k = Math.min(1, scrollY / 700); g.style.setProperty('--py', (scrollY * 0.18).toFixed(1) + 'px'); g.style.setProperty('--hs', (1 - k * 0.22).toFixed(3)); g.style.setProperty('--ho', (1 - k * 0.7).toFixed(3)); } }, { passive: true });
  window.App = window.App || {}; App.Wow = { vessel, semaforosDe };
  try {
    try { if (!localStorage.getItem('cavas.wowtema')) { localStorage.setItem('cavas.wowtema', '1'); if (window.App && App.Tema) App.Tema.set('dark'); } } catch (e) {}
    root.classList.add('pm-wow');
    intro(); interactividad(); pasada();
    let t = 0; const app = document.querySelector('.app') || document.body;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(pasada, 60); }).observe(app, { childList: true, subtree: true });
    addEventListener('hashchange', () => setTimeout(pasada, 80));
  } catch (e) { console.warn('wow', e); root.classList.remove('pm-wow'); }
})();
