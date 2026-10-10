(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('init fail:', name, e); } }

  function initNav() {
    var nav = document.getElementById('nav');
    var burger = document.getElementById('burger');
    function onScroll() { nav.classList.toggle('solid', window.scrollY > 40); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    burger.addEventListener('click', function () {
      var o = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', o);
      document.body.style.overflow = o ? 'hidden' : '';
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open'); document.body.style.overflow = '';
      });
    });
  }

  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    function show(el) { el.classList.add('in'); }
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
    setTimeout(function () { els.forEach(show); }, 6000);
  }

  function initTilt() {
    if (!window.matchMedia('(hover:hover)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(900px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-4px)';
      });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    });
  }

  function initCompare() {
    var r = document.getElementById('cmpRange');
    var b = document.getElementById('cmpBefore');
    var h = document.getElementById('cmpHandle');
    function set() {
      var v = r.value;
      b.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)';
      h.style.left = v + '%';
    }
    r.addEventListener('input', set); set();
  }

  // Vapor: partículas suaves que suben desde abajo
  function initSteam() {
    var cv = document.getElementById('steam');
    var ctx = cv.getContext('2d');
    var W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), P = [], mx = 0.5, running = true;
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(init) {
      return {
        x: Math.random() * W, y: init ? Math.random() * H : H + 60,
        r: 40 + Math.random() * 110, vy: 0.25 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.3, a: 0.04 + Math.random() * 0.07,
        ph: Math.random() * 6.28, hue: 150 + Math.random() * 50
      };
    }
    size();
    var n = W < 700 ? 22 : 40;
    for (var i = 0; i < n; i++) P.push(spawn(true));
    window.addEventListener('resize', size);
    window.addEventListener('mousemove', function (e) { mx = e.clientX / window.innerWidth; }, { passive: true });
    new IntersectionObserver(function (en) { running = en[0].isIntersecting; if (running) loop(); }).observe(cv);
    var t = 0;
    function loop() {
      if (!running) return;
      t += 0.01;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.vy; p.x += p.vx + Math.sin(t + p.ph) * 0.35 + (mx - 0.5) * 0.4;
        p.r += 0.06;
        var life = p.y / H;
        var alpha = p.a * Math.min(1, life * 2.2) * Math.min(1, (H - p.y) / 120 + 0.2);
        if (p.y < -p.r || alpha <= 0) { P[i] = spawn(false); continue; }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, 'hsla(' + p.hue + ',80%,70%,' + alpha + ')');
        g.addColorStop(1, 'hsla(' + p.hue + ',80%,70%,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  safe(initNav, 'nav');
  safe(initReveal, 'reveal');
  safe(initTilt, 'tilt');
  safe(initCompare, 'compare');
  safe(initSteam, 'steam');
  safe(function () { document.getElementById('yr').textContent = new Date().getFullYear(); }, 'year');
})();
