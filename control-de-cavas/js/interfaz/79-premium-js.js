/* Capa premium: fondo con burbujas, aparición al hacer scroll, contadores, barra de progreso. Solo decoración. */
(function () {
  'use strict';
  try {
    const root = document.documentElement;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fondo
    const bg = document.createElement('div'); bg.className = 'pm-bg'; bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<span class="pm-orb o1"></span><span class="pm-orb o2"></span><span class="pm-orb o3"></span><canvas class="pm-bubbles"></canvas>';
    document.body.prepend(bg);
    const prog = document.createElement('div'); prog.className = 'pm-prog'; document.body.appendChild(prog);
    root.classList.add('pm-on');

    // Burbujas que suben (se pausan si la pestaña no se ve)
    const cv = bg.querySelector('canvas'), cx = cv.getContext('2d');
    let W = 0, H = 0, bub = [], raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dark = () => root.dataset.theme === 'dark' || (root.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.round(Math.min(46, W / 28)); while (bub.length < n) bub.push(nueva(true)); bub.length = n; }
    function nueva(ini) { return { x: Math.random() * W, y: ini ? Math.random() * H : H + 20, r: 1.5 + Math.random() * 4.5, v: 0.12 + Math.random() * 0.38, o: Math.random() * 6.28, a: 0.15 + Math.random() * 0.35 }; }
    function tick(t) {
      cx.clearRect(0, 0, W, H);
      const c = dark() ? '255,210,122' : '201,138,11';
      for (const b of bub) {
        b.y -= b.v; b.x += Math.sin(t / 1800 + b.o) * 0.25;
        if (b.y < -20) Object.assign(b, nueva(false));
        const g = cx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(255,255,255,${b.a})`); g.addColorStop(1, `rgba(${c},${b.a * .35})`);
        cx.fillStyle = g; cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, 6.283); cx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    size(); addEventListener('resize', size);
    if (!reduce) { raf = requestAnimationFrame(tick); document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); }); }

    // Progreso de scroll
    let pend = false;
    addEventListener('scroll', () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; const h = root.scrollHeight - innerHeight; prog.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; }); }, { passive: true });

    // Aparición escalonada
    const SEL = '.pl-kpi,.acard,.cavas-tank,.an-card,.an-filtros,.turn-card,.fv-progress,.pl-rev,.pl-acc,.v35-in,.hz-doc,.wk-card,.pm-hero';
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      es.forEach((e) => { if (!e.isIntersecting) return; const el = e.target; io.unobserve(el); el.classList.add('pm-in'); setTimeout(() => el.classList.add('pm-done'), 1200); contar(el); });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;
    function marca(scope) {
      if (reduce || !io) return;
      let i = 0;
      (scope || document).querySelectorAll(SEL).forEach((el) => {
        if (el.dataset.pm != null) return;
        el.dataset.pm = ''; el.style.setProperty('--pm-d', Math.min(i++ % 8, 7) * 0.06 + 's'); io.observe(el);
      });
    }

    // Contadores: solo números simples (p. ej. 32, 2,12 o 983); al terminar vuelve al texto original
    function contar(el) {
      if (reduce) return;
      el.querySelectorAll('.pl-k,.v35-big,.num').forEach((n) => {
        if (n.children.length || n.dataset.pmc) return;
        const t = n.textContent.trim(); const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)([.,]\d+)?$/.exec(t); if (!m) return;
        const dec = m[2] ? m[2].length - 1 : 0; const sep = m[2] ? m[2][0] : ','; const miles = m[1].includes('.') && sep === ',' ? '.' : (m[1].includes(',') && sep === '.' ? ',' : '');
        const val = parseFloat((m[1].split(miles || '§').join('') + (m[2] ? '.' + m[2].slice(1) : '')));
        if (!isFinite(val) || val > 1e6 || val === 0) return;
        n.dataset.pmc = '1'; const t0 = performance.now(), D = 900;
        const f = (x) => { const s = x.toFixed(dec).replace('.', sep); return miles && x >= 1000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, miles) : s; };
        (function paso(now) { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); n.textContent = k < 1 ? f(val * e) : t; if (k < 1) requestAnimationFrame(paso); })(t0);
      });
    }

    // Marca el contenido nuevo cada vez que la pantalla cambia
    let tm = 0;
    const app = document.querySelector('.app') || document.body;
    new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => marca(app), 120); }).observe(app, { childList: true, subtree: true });
    addEventListener('hashchange', () => { scrollTo({ top: 0 }); });
    marca(app);
  } catch (e) { console.warn('premium', e); document.documentElement.classList.remove('pm-on'); }
})();
