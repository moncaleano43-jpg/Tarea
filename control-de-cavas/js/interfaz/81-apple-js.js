/* Iconos al estilo SF Symbols para el menú y mejoras de navegación. Solo presentación. */
(function () {
  'use strict';
  const I = {
    inicio: '<path d="M4 11.2 12 4l8 7.2"/><path d="M6 10v9.2h12V10"/><path d="M10 19.2v-5h4v5"/>',
    tanques: '<path d="M8 4h8a2 2 0 0 1 2 2v7.5l-4 3.5h-4l-4-3.5V6a2 2 0 0 1 2-2Z"/><path d="M8 20l1.5-3M16 20l-1.5-3M6 9.5h12"/>',
    levaduras: '<path d="M12 3.5c3 3.6 5.5 6.2 5.5 9.3a5.5 5.5 0 0 1-11 0C6.5 9.7 9 7.1 12 3.5Z"/><path d="M9.6 13.4a2.6 2.6 0 0 0 2.4 2.4"/>',
    bd: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6"/>',
    aseos: '<path d="M12 3.5l1.6 4.2 4.2 1.6-4.2 1.6L12 15l-1.6-4.1L6.2 9.3l4.2-1.6L12 3.5Z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>',
    recuperacion: '<path d="M19 12a7 7 0 0 1-12 4.9"/><path d="M5 12a7 7 0 0 1 12-4.9"/><path d="M17.5 4v3.4H14M6.5 20v-3.4H10"/>',
    programa: '<path d="M4 8h14l-3.2-3.2M20 16H6l3.2 3.2"/>',
    merma: '<path d="M4 6l5.5 6 3.5-3.5L20 17"/><path d="M15 17h5v-5"/>',
    analisis: '<path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/>'
  };
  function aplicar() {
    document.querySelectorAll('#nav a[href^="#/"], .anav a[href^="#/"]').forEach((a) => {
      const k = (a.getAttribute('href') || '').replace('#/', '').split('/')[0];
      const svg = a.querySelector('svg.i'); if (!svg || !I[k] || svg.dataset.sf) return;
      svg.dataset.sf = '1'; svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.innerHTML = I[k];
    });
  }
  try { aplicar(); const o = new MutationObserver(() => { clearTimeout(aplicar.t); aplicar.t = setTimeout(aplicar, 80); }); o.observe(document.body, { childList: true, subtree: true }); } catch (e) { console.warn('apple', e); }
})();
