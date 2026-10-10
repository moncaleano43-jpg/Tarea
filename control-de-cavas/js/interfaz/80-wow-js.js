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
  function vessel(kind, tone, fill, calm, glow) {
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
      <path class="pmv-glass" d="${g.body}" stroke-width="2.2" ${p ? '' : 'stroke-dasharray="3 4"'}/>
      ${g.dome ? `<path d="${g.dome}" stroke-width="2.2"/>` : ''}<path d="${g.extra}" stroke-width="1.8" opacity=".7"/>
      ${g.ring ? `<circle cx="${g.ring[0]}" cy="${g.ring[1]}" r="${g.ring[2]}" stroke-width="1.4" opacity=".5"/><circle cx="${g.ring[0]}" cy="${g.ring[1]}" r="2" stroke-width="1.4" opacity=".5"/>` : ''}
      ${ticks}<rect x="${g.hl}" y="${g.top + 6}" width="4" height="${H * 0.55}" rx="2" fill="url(#${id}g)" stroke="none"/></svg>`;
  }

  function decorarTanque(card) {
    if (card.dataset.pmv) return; card.dataset.pmv = '1';
    const art = card.querySelector('.cavas-tank-art'); if (!art) return;
    const ferm = card.classList.contains('fermentation'), mad = card.classList.contains('maturation');
    let vol = NaN; card.querySelectorAll('dl > div').forEach((d) => { if (/volumen/i.test(d.textContent)) vol = num(d.querySelector('dd') && d.querySelector('dd').textContent); });
    const fill = ferm || mad ? (isFinite(vol) && vol > 0 ? Math.min(0.97, 0.18 + vol / 5200 * 0.8) : 0.7) : 0;
    art.innerHTML = vessel('tank', ferm ? 'ferm' : mad ? 'mad' : 'vacio', fill, mad, ferm ? '#ffa31a' : mad ? '#3aa0ff' : '#7b8499');
    card.style.setProperty('--tone', ferm ? '#ffa31a' : mad ? '#3aa0ff' : '#7b8499');
  }
  function decorarColector(btn) {
    if (btn.dataset.pmv) return; btn.dataset.pmv = '1';
    const old = btn.querySelector('svg.studio-vessel'); const color = btn.style.getPropertyValue('--collector-status') || '#e8c77a';
    const slots = [...btn.querySelectorAll('.collector-slots span')]; const used = slots.filter((s) => !/disponible/i.test(s.textContent)).length;
    const fill = slots.length ? Math.max(used ? 0.28 : 0, used / slots.length * 0.86) : 0;
    const svg = vessel('col', 'levadura', fill, true, color);
    const tmp = document.createElement('div'); tmp.innerHTML = svg; const el = tmp.firstElementChild; el.classList.add('pmv-col');
    if (old) { old.style.display = 'none'; old.after(el); } else btn.prepend(el);
    btn.style.setProperty('--tone', color);
  }

  /* ---------- Portada de Inicio ---------- */
  function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
  function hero() {
    if (!/^#\/?(inicio)?$/.test(location.hash || '#/inicio') && location.hash !== '') return;
    const host = document.querySelector('main.content > *:first-child'); if (!host || document.querySelector('.pm-hero')) return;
    const wave = (c, d) => `<svg class="pm-hw ${c}" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 q75 -40 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V120 H0Z" style="animation-duration:${d}s"/></svg>`;
    const s = document.createElement('section'); s.className = 'pm-hero';
    s.innerHTML = `<div class="pm-hero-in"><p class="pm-eye"><i></i> CONTROL DE CAVAS · EN VIVO</p><h1>${saludo()}, <span>planta</span>.</h1>
      <p class="pm-sub">Fermentación, maduración, levaduras y agua en una sola vista. Cada tanque respira: míralos llenarse.</p>
      <div class="pm-cta"><a class="btn pm-glow" href="#/tanques">Ver tanques</a><a class="btn" href="#/analisis">Análisis</a><a class="btn" href="#/colectores">Levaduras</a></div></div>
      <div class="pm-hero-glass">${vessel('tank', 'ferm', 0.78, false, '#ffa31a')}</div><div class="pm-clock"><b data-pm-clock>--:--</b><small></small></div>${wave('w1', 11)}${wave('w2', 17)}`;
    host.parentNode.insertBefore(s, host);
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
  }

  function pasada() {
    document.querySelectorAll('article.cavas-tank').forEach(decorarTanque);
    document.querySelectorAll('button.flow-collector').forEach(decorarColector);
    hero();
  }

  try {
    try { if (!localStorage.getItem('cavas.wowtema')) { localStorage.setItem('cavas.wowtema', '1'); if (window.App && App.Tema) App.Tema.set('dark'); } } catch (e) {}
    root.classList.add('pm-wow');
    intro(); interactividad(); pasada();
    let t = 0; const app = document.querySelector('.app') || document.body;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(pasada, 60); }).observe(app, { childList: true, subtree: true });
    addEventListener('hashchange', () => setTimeout(pasada, 80));
  } catch (e) { console.warn('wow', e); root.classList.remove('pm-wow'); }
})();
