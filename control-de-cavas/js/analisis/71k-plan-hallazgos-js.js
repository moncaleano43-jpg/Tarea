/* Pestaña «Hallazgos y guía»: informe, fundamento del llenado y guía, legibles dentro del programa. */
(function () {
  'use strict';
  const A = window.App, AN = A.Analisis;
  if (!AN || !A.DocsHallazgos) return;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  function md(src) {
    const L = src.replace(/\r/g, '').split('\n'); let o = '', i = 0, lista = null;
    const cierra = () => { if (lista) { o += `</${lista}>`; lista = null; } };
    while (i < L.length) {
      const l = L[i];
      if (/^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(L[i + 1] || '')) {
        cierra();
        const cel = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const h = cel(l); i += 2; let b = '';
        while (i < L.length && /^\s*\|/.test(L[i])) { b += '<tr>' + cel(L[i]).map((c) => `<td>${inl(c)}</td>`).join('') + '</tr>'; i++; }
        o += `<div class="hz-tabla"><table><thead><tr>${h.map((c) => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${b}</tbody></table></div>`; continue;
      }
      let m;
      if ((m = /^(#{1,4})\s+(.*)/.exec(l))) { cierra(); const n = Math.min(m[1].length + 1, 5); o += `<h${n} class="hz-h">${inl(m[2])}</h${n}>`; }
      else if (/^\s*---+\s*$/.test(l)) { cierra(); o += '<hr>'; }
      else if ((m = /^\s*[-*]\s+(.*)/.exec(l))) { if (lista !== 'ul') { cierra(); o += '<ul>'; lista = 'ul'; } o += `<li>${inl(m[1])}</li>`; }
      else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(l))) { if (lista !== 'ol') { cierra(); o += '<ol>'; lista = 'ol'; } o += `<li>${inl(m[1])}</li>`; }
      else if ((m = /^>\s?(.*)/.exec(l))) { cierra(); o += `<blockquote>${inl(m[1])}</blockquote>`; }
      else if (!l.trim()) cierra();
      else { cierra(); o += `<p>${inl(l)}</p>`; }
      i++;
    }
    cierra(); return o;
  }
  const D = A.DocsHallazgos; let actual = 'informe';
  function render(ctx, UI) {
    const ks = Object.keys(D);
    return `<p class="an-lead-s">El informe de hallazgos, el fundamento de la prueba de llenado y la guía de las pestañas, para que cualquiera los revise sin salir del programa. Es una <b>foto de los datos al 9 de octubre de 2026</b>; las pestañas de Análisis se recalculan solas, este texto no.</p>
      <div class="hz-bar" data-hz><div class="hz-seg">${ks.map((k) => `<button type="button" data-hz-k="${k}" class="${k === actual ? 'on' : ''}">${esc(D[k].t)}</button>`).join('')}</div><button type="button" class="hz-print" data-hz-print>Imprimir / PDF</button></div>
      <article class="hz-doc" data-hz-doc>${md(D[actual].md)}</article>`;
  }
  function mount(ctx, el) {
    const doc = el.querySelector('[data-hz-doc]');
    el.querySelectorAll('[data-hz-k]').forEach((b) => b.addEventListener('click', () => {
      actual = b.dataset.hzK; doc.innerHTML = md(D[actual].md);
      el.querySelectorAll('[data-hz-k]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    const p = el.querySelector('[data-hz-print]');
    if (p) p.addEventListener('click', () => {
      const w = window.open('', '_blank'); if (!w) return;
      w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(D[actual].t)}</title><style>body{font:14px/1.5 system-ui;max-width:800px;margin:20px auto;padding:0 16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}code{background:#eee;padding:0 3px}</style>${doc.innerHTML}`);
      w.document.close(); w.focus(); w.print();
    });
  }
  AN.registrar({ id: 'hallazgos', label: 'Hallazgos y guía', orden: 0.6, render, mount });
})();
