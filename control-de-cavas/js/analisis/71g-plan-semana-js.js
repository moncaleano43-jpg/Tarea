/* ============================================================
   71g-plan-semana.js · Alertas automáticas y pestaña «Resumen semanal»
   Compara la última semana con la anterior, lista lo que requiere atención, los tanques por vigilar y las acciones pendientes.
   Se puede imprimir o guardar en PDF y copiar como texto. Las alertas también alimentan «Qué requiere atención» del Resumen.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.PlanBase.tanqueEngine || !A.An1 || !A.Analisis || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, DAY } = An1;
  const rate = B.rate;
  const sg = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v > 0 ? '+' : '') + fmt(v, d));

  /* ---------- Fechas de referencia: hasta dónde llegan los datos ---------- */
  function hasta(name) {
    try {
      const rows = A.DL.get(name) || [], k = name === 'trasiego' ? 'actualEnd' : 't', lim = Date.now() + DAY; let m = null;
      for (const r of rows) { if (name === 'merma' && r.phase !== 'FV') continue; const v = r[k]; if (v != null && Number.isFinite(v) && v <= lim && (m == null || v > m)) m = v; }
      return m;
    } catch (e) { return null; }
  }
  function referencia() {
    const fin = ['agua', 'merma', 'trasiego', 'recuperacion', 'ferm', 'lev'].map(hasta).filter(Boolean);
    return fin.length ? Math.max(...fin) : Date.now();
  }
  const ventana = (rows, t0, t1, k = 't') => rows.filter((r) => r[k] != null && r[k] > t0 && r[k] <= t1);

  /* ---------- Alertas ---------- */
  function alertas(ctx) {
    return An1.memo(ctx, 'planAlertas', () => {
      const out = [], ref = referencia(), add = (sev, area, titulo, detalle, tab) => out.push({ sev, area, titulo, detalle, tab });
      // Tanques
      try {
        const E = B.tanqueEngine(ctx), rojos = E.T.filter((t) => t.st === 'rojo'), ambar = E.T.filter((t) => t.st === 'ambar');
        rojos.forEach((t) => add('alta', 'Tanques', `TQ ${t.tq}: merma por encima de lo esperado`, `Sus últimos ${t.last.length} lotes perdieron ${fmt(t.m8, 1)} puntos más de lo esperado por marca y tamaño (${fmt(t.z, 1)} errores estándar).`, 'tanques'));
        if (ambar.length) add('media', 'Tanques', `${ambar.length} tanque${ambar.length === 1 ? '' : 's'} para vigilar: ${ambar.slice(0, 5).map((t) => 'TQ ' + t.tq).join(', ')}`, 'Su merma reciente está algo por encima de lo esperado; con tantos tanques algunos aparecen así por azar. Se confirma con los próximos lotes.', 'tanques');
      } catch (e) { /* sin datos */ }
      // Merma reciente frente a los 4 meses anteriores
      try {
        const fv = B.fvHist(ctx), fin = fv.length ? fv[fv.length - 1].t : null;
        if (fin) {
          const a = ventana(fv, fin - 28 * DAY, fin), b = ventana(fv, fin - 148 * DAY, fin - 28 * DAY);
          if (a.length >= 10 && b.length >= 30) {
            const tt = S.ttest(vals(a, 'lossPct'), vals(b, 'lossPct'));
            if (tt && tt.p < 0.05 && Math.abs(tt.diff) >= 0.5) {
              if (tt.diff > 0) add(tt.diff >= 1 ? 'alta' : 'media', 'Merma', `La merma de FV de las últimas 4 semanas subió a ${fmt(rate(a), 1)} %`, `Frente a ${fmt(rate(b), 1)} % de los 4 meses previos (${tt.diff > 0 ? '+' : ''}${fmt(tt.diff, 1)} puntos, p = ${fmt(tt.p, 3)}). Revisar qué cambió: purgas, medidores, procedimiento.`, 'plan');
              else add('ok', 'Merma', `La merma de FV bajó a ${fmt(rate(a), 1)} % en las últimas 4 semanas`, `Frente a ${fmt(rate(b), 1)} % de los 4 meses previos. Conviene identificar qué se hizo distinto y sostenerlo.`, 'plan');
            }
          }
        }
      } catch (e) { /* sin datos */ }
      // Agua: picos de la última semana y nivel
      try {
        const ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null), fin = ag.length ? Math.max(...vals(ag, 't')) : null;
        if (fin) {
          const hist = ventana(ag, fin - 365 * DAY, fin - 7 * DAY), sem = ventana(ag, fin - 7 * DAY, fin);
          if (hist.length >= 60 && sem.length >= 10) {
            const p90 = S.quantile(vals(hist, 'total'), 0.9), picos = sem.filter((r) => r.total >= p90);
            if (picos.length >= 5) add('alta', 'Agua', `${picos.length} turnos pico de agua en la última semana`, `Se esperan unos ${fmt(sem.length * 0.1, 0)}. Turnos de ≥ ${fmt(p90, 0)} m³: ${picos.slice(0, 4).map((r) => `${AN.fmtDate(r.t)} ${r.shift}`).join(', ')}. Preguntar al jefe de turno qué se lavó.`, 'plan');
            else if (picos.length >= 4) add('media', 'Agua', `${picos.length} turnos pico de agua en la última semana`, `Se esperan unos ${fmt(sem.length * 0.1, 0)} (≥ ${fmt(p90, 0)} m³ por turno).`, 'plan');
            const tt = S.ttest(vals(sem, 'total'), vals(ventana(ag, fin - 97 * DAY, fin - 7 * DAY), 'total'));
            if (tt && tt.p < 0.05 && tt.diff > 10) add('media', 'Agua', `El consumo de la última semana está ${fmt(tt.diff, 0)} m³ por turno sobre el de los 3 meses previos`, `p = ${fmt(tt.p, 3)}. Revisar aseos y consumo fuera de aseos.`, 'plan');
          }
        }
      } catch (e) { /* sin datos */ }
      // Trasiegos
      try {
        const tr = An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > -24 && r.delay < 72 && r.actualEnd && r.actualEnd <= Date.now()), fin = tr.length ? Math.max(...vals(tr, 'actualEnd')) : null;
        if (fin) {
          const a = ventana(tr, fin - 14 * DAY, fin, 'actualEnd'), b = ventana(tr, fin - 104 * DAY, fin - 14 * DAY, 'actualEnd');
          if (a.length >= 8 && b.length >= 30) {
            const ma = med(vals(a, 'delay')), mb = med(vals(b, 'delay'));
            if (ma >= 8 && ma >= 2 * Math.max(mb, 1)) add('media', 'Trasiegos', `Los trasiegos de las últimas 2 semanas terminan ${fmt(ma, 1)} h tarde (mediana)`, `Antes eran ${fmt(mb, 1)} h. Ver causas en «Dónde actuar».`, 'plan');
            const lar = a.filter((r) => r.delay > 6), sin = lar.filter((r) => !r.cause || /sin causa/i.test(r.cause));
            if (lar.length >= 5 && sin.length / lar.length >= 0.9) add('info', 'Trasiegos', `${lar.length} trasiegos con más de 6 h de retraso sin causa registrada`, 'Sin la causa no se puede saber qué mejorar. Registrarla cuando el retraso pase de 2 h.', 'plan');
          }
        }
      } catch (e) { /* sin datos */ }
      // Recuperación
      try {
        const rc = An1.sane('recuperacion', ctx.todas('recuperacion')).filter((r) => r.hours != null).sort((a, b) => a.t - b.t).slice(-6);
        const lentas = rc.filter((r) => r.hours > 84);
        if (rc.length >= 5 && lentas.length >= 3) add('media', 'Recuperación', `${lentas.length} de las últimas ${rc.length} recuperaciones pasaron de 84 h`, 'Más de 84 h de espera baja el rendimiento. Programar la recuperación al planear el trasiego.', 'plan');
      } catch (e) { /* sin datos */ }
      // Datos sin actualizar
      [['agua', 'Agua'], ['merma', 'Merma'], ['trasiego', 'Trasiegos'], ['ferm', 'Fermentación'], ['lev', 'Levadura'], ['recuperacion', 'Recuperación']].forEach(([k, n]) => {
        const f = hasta(k); if (f && ref - f > 7 * DAY) add('media', 'Datos', `${n}: sin datos nuevos desde el ${AN.fmtDate(f)}`, `Hace ${fmt((ref - f) / DAY, 0)} días frente al dato más reciente de otras áreas. El análisis de esa área puede estar desactualizado.`, 'calidad');
      });
      const orden = { alta: 0, media: 1, info: 2, ok: 3 };
      return out.sort((a, b) => (orden[a.sev] ?? 9) - (orden[b.sev] ?? 9));
    });
  }

  /* ---------- Indicadores de la semana ---------- */
  function semana(ctx) {
    return An1.memo(ctx, 'planSemana', () => {
      const fv = B.fvHist(ctx), ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null);
      const tr = An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > -24 && r.delay < 72 && r.actualEnd && r.actualEnd <= Date.now());
      const as = An1.sane('aseos', ctx.todas('aseos')).filter((r) => r.t != null && r.t <= Date.now()), rc = An1.sane('recuperacion', ctx.todas('recuperacion'));
      const fin = { fv: fv.length ? fv[fv.length - 1].t : null, ag: ag.length ? Math.max(...vals(ag, 't')) : null, tr: tr.length ? Math.max(...vals(tr, 'actualEnd')) : null, as: as.length ? Math.max(...vals(as, 't')) : null, rc: hasta('recuperacion') };
      const E = B.tanqueEngine(ctx), ref = referencia();
      const p90 = fin.ag ? (() => { const h = ventana(ag, fin.ag - 372 * DAY, fin.ag - 7 * DAY); return h.length >= 60 ? S.quantile(vals(h, 'total'), 0.9) : null; })() : null;
      const ocup = (a, b) => (E.lots ? sum(E.lots.filter((r) => r.fill != null && r.t > a && r.fill < b).map((r) => Math.max(0, Math.min(r.t, b) - Math.max(r.fill, a)))) / (b - a) : null);
      const par = (e, f) => (e == null ? { a: null, p: null } : { a: f(e - 7 * DAY, e), p: f(e - 14 * DAY, e - 7 * DAY) });
      const F = par(fin.fv, (a, b) => { const f = ventana(fv, a, b); return { lotes: f.length, merma: f.length ? rate(f) : null, hl: sum(vals(f, 'loss')), fvOcup: ocup(a, b) }; });
      const G = par(fin.ag, (a, b) => { const g = ventana(ag, a, b); return { agua: g.length >= 3 ? sum(vals(g, 'total')) / 7 : null, picos: p90 != null ? g.filter((x) => x.total >= p90).length : null }; });
      const T = par(fin.tr, (a, b) => { const t = ventana(tr, a, b, 'actualEnd'); return { tras: t.length, retraso: t.length >= 3 ? med(vals(t, 'delay')) : null }; });
      const Z = par(fin.as, (a, b) => ({ aseos: ventana(as, a, b).length }));
      const R = par(fin.rc, (a, b) => ({ rec: ventana(rc, a, b).length }));
      const a = Object.assign({}, F.a, G.a, T.a, Z.a, R.a), p = Object.assign({}, F.p, G.p, T.p, Z.p, R.p);
      return { ref, a, p, p90, fin, nLotes: a.lotes };
    });
  }

  const FILAS = [
    ['Lotes de FV cerrados', 'lotes', 0, 'sube', '', 'fv'], ['Merma de FV', 'merma', 2, 'baja', ' %', 'fv'], ['Hl perdidos en FV', 'hl', 0, 'baja', ' Hl', 'fv'],
    ['Agua por día', 'agua', 0, 'baja', ' m³', 'ag'], ['Turnos pico de agua', 'picos', 0, 'baja', '', 'ag'],
    ['Trasiegos terminados', 'tras', 0, 'sube', '', 'tr'], ['Retraso mediano de trasiegos', 'retraso', 1, 'baja', ' h', 'tr'], ['Aseos registrados', 'aseos', 0, 'sube', '', 'as'], ['Recuperaciones', 'rec', 0, 'sube', '', 'rc'],
  ];

  function resumenTexto(ctx) {
    const W = semana(ctx), al = alertas(ctx), E = B.tanqueEngine(ctx), pasos = B.planResumen ? B.planResumen(ctx) : [];
    const L = ['RESUMEN SEMANAL (última semana de datos de cada área)', ''];
    FILAS.forEach(([t, k, d, , u, src]) => { const v = W.a[k], p = W.p[k]; L.push(`${t}: ${v == null ? '—' : fmt(v, d) + u} (semana anterior: ${p == null ? '—' : fmt(p, d) + u}) · datos hasta ${W.fin[src] ? AN.fmtDate(W.fin[src]) : '—'}`); });
    L.push('', 'ALERTAS'); if (!al.length) L.push('Sin alertas.'); al.filter((x) => x.sev !== 'ok').slice(0, 10).forEach((x) => L.push(`- [${x.sev}] ${x.titulo}`));
    const vig = (E.T || []).filter((t) => t.st === 'rojo' || t.st === 'ambar'); L.push('', 'TANQUES POR VIGILAR'); L.push(vig.length ? vig.map((t) => `TQ ${t.tq} (${t.st === 'rojo' ? 'revisar' : 'vigilar'}, ${sg(t.m8, 1)} pp)`).join(', ') : 'Ninguno.');
    L.push('', 'ACCIONES PENDIENTES'); pasos.slice(0, 6).forEach((p, i) => L.push(`${i + 1}. ${p.t}`));
    return L.join('\n');
  }

  function render(ctx, UI) {
    const W = semana(ctx), al = alertas(ctx), E = B.tanqueEngine(ctx), pasos = B.planResumen ? B.planResumen(ctx) : [];
    const delta = (k, v, p, bueno) => {
      if (v == null || p == null) return '<span class="an-delta">—</span>';
      if (k === 'retraso') { const d = v - p, ok = (bueno === 'baja') === (d < 0); return Math.abs(d) < 0.05 ? '<span class="an-delta">sin cambio</span>' : `<span class="an-delta ${ok ? 'ok' : 'bad'}">${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d), 1)} h</span>`; }
      return UI.delta(v, p, { bueno, dec: 0 });
    };
    const pocos = W.nLotes != null && W.nLotes < 5;
    const filas = FILAS.map(([t, k, d, bueno, u, src]) => { const flag = pocos && (k === 'merma' || k === 'hl') && W.a[k] != null ? ' *' : ''; return `<tr><td>${esc(t)}<small class="wk-src"> · hasta ${W.fin[src] ? esc(AN.fmtDate(W.fin[src])) : '—'}</small></td><td class="n"><b>${W.a[k] == null ? '—' : fmt(W.a[k], d) + u + flag}</b></td><td class="n">${W.p[k] == null ? '—' : fmt(W.p[k], d) + u}</td><td class="n">${delta(k, W.a[k], W.p[k], bueno)}</td></tr>`; }).join('');
    const cab = `<div class="wk-cab"><div><span class="an-kicker">RESUMEN SEMANAL</span><h2 class="wk-t">Última semana de datos</h2><p>Cada área se compara con su semana anterior, hasta el último día que tiene datos (se indica en cada fila).</p></div>
      <div class="wk-btn" data-print-hide><button type="button" class="an-btn" data-wk="print">Imprimir o guardar en PDF</button><button type="button" class="an-btn" data-wk="copy">Copiar resumen</button></div></div>`;
    const kpis = UI.card('La semana en números', 'Verde = cambio a favor, rojo = en contra.',
      `<div class="an-tabla"><div class="an-tabla-s"><table><thead><tr><th>Indicador</th><th class="n">Esta semana</th><th class="n">Semana anterior</th><th class="n">Cambio</th></tr></thead><tbody>${filas}</tbody></table></div></div>
      <p class="an-note"><b>Ojo</b> ${pocos ? '* Esta semana hay muy pocos lotes cerrados: la merma de una semana con tan pocos lotes no es una tendencia. ' : ''}Las semanas varían mucho de una a otra; mira las alertas y la tendencia de «Dónde actuar» antes de reaccionar a un solo número.</p>`);
    const sev = { alta: ['Alta', 'bad'], media: ['Media', 'warn'], info: ['Info', ''], ok: ['Bien', 'ok'] };
    const lista = al.length ? `<ul class="wk-al">${al.map((x) => `<li><span class="an-badge ${sev[x.sev][1]}">${sev[x.sev][0]}</span><div><b>${esc(x.titulo)}</b><p>${esc(x.detalle)}</p></div>${x.tab ? `<a class="an-link" href="#/analisis/${x.tab}" data-print-hide>Ver →</a>` : ''}</li>`).join('')}</ul>` : UI.vacio('Sin alertas: nada se sale de lo esperado.');
    const alertasCard = UI.card('Alertas', 'Se calculan solas cada vez que se cargan datos. Ordenadas por gravedad.', lista);
    const vig = (E.T || []).filter((t) => t.st === 'rojo' || t.st === 'ambar');
    const tanques = UI.card('Tanques por vigilar', 'Tanques cuya merma reciente supera lo esperado por su marca y tamaño.', vig.length ?
      UI.tabla([{ k: 'tq', t: 'Tanque', num: true }, { k: 'estado', t: 'Estado' }, An1.colNum('m8', 'Últimos 8 lotes (pp)', 2), An1.colNum('z', 'Errores estándar', 1), { k: 'ult', t: 'Último lote' }],
        vig.map((t) => ({ tq: t.tq, estado: t.st === 'rojo' ? 'Revisar' : 'Vigilar', m8: An1.round(t.m8, 2), z: An1.round(t.z, 1), ult: `${t.ult.lote} · ${t.ult.brand} · ${AN.fmtDate(t.ult.t)}` })), { id: 'tb-wk-tq', nombre: 'tanques-vigilar', sort: { k: 'z', dir: -1 }, max: 10 }) : UI.vacio('Ningún tanque sale de lo esperado.'));
    const acc = UI.card('Acciones pendientes', 'En el orden de «Dónde actuar». Si registraste valores en pesos en «Simulador», aparecen aquí.', pasos.length ?
      `<ol class="an-plan-l an-plan-n">${pasos.slice(0, 6).map((p) => { const din = p.hl || p.m3 || p.cap ? B.dinero({ hl: p.hl, m3: p.m3, cap: p.cap }) : ''; return `<li><div><b>${esc(p.t)}</b><p>${esc(p.d)}${din ? ` <b>≈ ${esc(din)} en el periodo.</b>` : ''}</p></div></li>`; }).join('')}</ol>` : UI.vacio('Sin acciones pendientes.'));
    return `<div class="wk-root">${cab}${kpis}${alertasCard}${UI.grid([tanques, acc], 2)}</div>`;
  }

  function montar(ctx, el) {
    el.querySelectorAll('[data-wk]').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.wk === 'print') { window.print(); return; }
        const txt = resumenTexto(ctx);
        try { await navigator.clipboard.writeText(txt); b.textContent = 'Copiado ✓'; } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); b.textContent = 'Copiado ✓'; } catch (e2) { b.textContent = 'No se pudo copiar'; } ta.remove(); }
        setTimeout(() => { b.textContent = 'Copiar resumen'; }, 2200);
      };
    });
  }

  AN.registrar({
    id: 'semana', label: 'Resumen semanal', orden: 1.2, render, mount: montar,
    hallazgos(ctx) { return alertas(ctx).filter((x) => x.area !== 'Tanques').map((x) => ({ sev: x.sev, titulo: x.titulo, detalle: x.detalle })); },
  });
  B.alertas = alertas;
})();
