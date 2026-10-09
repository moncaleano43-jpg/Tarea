/* ============================================================
   71h-plan-factores.js · Pestaña «Qué afecta a qué»
   Cruza muchos factores con cada resultado (merma, arranque, velocidad, extracto final, estancia, agua, retraso de trasiegos,
   rendimiento de recuperación) y dice cuáles afectan de verdad, con qué fuerza y cuáles no. Todo el histórico: estas relaciones
   necesitan muestra grande, por eso no dependen del periodo elegido arriba.
   Son asociaciones; los factores se comparan siempre dentro de la misma marca y tamaño de tanque.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.PlanBase.fvHist || !A.An1 || !A.Analisis || !A.Charts || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, C = A.Charts, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, W, DAY } = An1;
  const WARN = 'var(--warn,#a26a14)', NEG = 'var(--neg,#b0442e)', POS = 'var(--pos,#3b7a59)', EST = 'var(--est,#5d6f8c)', MUTED = 'var(--muted,#8a8a84)';
  const r1 = (v) => An1.round(v, 1);
  const sg = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v > 0 ? '+' : '') + fmt(v, Math.abs(v) < 0.95 && d < 2 ? 2 : d));
  const pTxt = (p) => (p == null ? '—' : p < 0.001 ? 'menor que 0,001' : fmt(p, 3));
  const vacio = (UI, t, msg) => UI.card(t, '', UI.vacio(msg));
  const lc = (t) => String(t).charAt(0).toLowerCase() + String(t).slice(1);

  /* ---------- Mínimos cuadrados (pocas variables, sin dependencias) ---------- */
  function ols(X, y) {
    const n = X.length, k = X[0].length, A_ = Array.from({ length: k }, () => new Array(2 * k).fill(0));
    for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) { let s = 0; for (let r = 0; r < n; r++) s += X[r][i] * X[r][j]; A_[i][j] = s; } A_[i][k + i] = 1; }
    for (let c = 0; c < k; c++) {
      let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A_[r][c]) > Math.abs(A_[p][c])) p = r;
      if (Math.abs(A_[p][c]) < 1e-12) return null;
      [A_[c], A_[p]] = [A_[p], A_[c]]; const d = A_[c][c]; for (let j = 0; j < 2 * k; j++) A_[c][j] /= d;
      for (let r = 0; r < k; r++) if (r !== c) { const f = A_[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A_[r][j] -= f * A_[c][j]; }
    }
    const inv = A_.map((row) => row.slice(k)), b = new Array(k).fill(0);
    for (let i = 0; i < k; i++) { let s = 0; for (let r = 0; r < n; r++) s += X[r].reduce((a, v, j) => a + v * inv[i][j], 0) * y[r]; b[i] = s; }
    let sse = 0; for (let r = 0; r < n; r++) { const e = y[r] - X[r].reduce((a, v, j) => a + v * b[j], 0); sse += e * e; }
    const my = mean(y), sst = sum(y.map((v) => (v - my) ** 2)), s2 = sse / Math.max(1, n - k);
    return { b, se: b.map((_, i) => Math.sqrt(Math.max(0, s2 * inv[i][i]))), r2: sst > 0 ? 1 - sse / sst : null, n };
  }

  /* ======================= Datos por lote ======================= */
  function lotes(ctx) {
    return An1.memo(ctx, 'planFactores', () => {
      const fe = An1.sane('ferm', ctx.todas('ferm')).filter((r) => r.brand && r.tq != null && r.t != null);
      const cap = new Map(); fe.forEach((r) => { if (r.vol > 0) { if (!cap.has(r.tq)) cap.set(r.tq, []); cap.get(r.tq).push(r.vol); } });
      const capM = new Map([...cap].map(([k, v]) => [k, med(v)])), ref = med([...capM.values()]);
      const grande = (tq) => capM.has(tq) && capM.get(tq) > ref * 1.08;
      const mm = new Map(); B.fvHist(ctx).forEach((r) => { if (r.lote) mm.set(String(r.lote), r); });
      const lev = new Map(); An1.sane('lev', ctx.todas('lev')).forEach((l) => { if (l.nombre) lev.set(l.nombre, l); });
      const pd0 = A.ProcesoDatos ? A.ProcesoDatos.byLote() : new Map();
      const as = new Map(); An1.sane('aseos', ctx.todas('aseos')).forEach((a) => { const m = /^FV\s*(\d+)/i.exec(a.equipment || ''); if (m && a.sheet === '1. Cada uso' && a.t != null) { const k = +m[1]; if (!as.has(k)) as.set(k, []); as.get(k).push(a); } });
      as.forEach((v) => v.sort((a, b) => a.t - b.t));
      const rows = fe.map((r) => {
        const l = lev.get(r.levadura), m = mm.get(String(r.lote)), G = grande(r.tq), pr = pd0.get(String(r.lote)) || {}, alm = l && l.t != null ? (r.t - l.t) / DAY : null;
        let pre = null; const xs = as.get(r.tq); if (xs) for (let i = xs.length - 1; i >= 0; i--) if (xs[i].t <= r.t) { if (r.t - xs[i].t <= 10 * DAY) pre = xs[i]; break; }
        return {
          brand: r.brand, G, tq: r.tq, t: r.t, key: r.brand + '|' + (G ? 'G' : 'N'), gen: r.gen, viab: r.viab, cons: r.cons, h15: r.h15, h75: r.h75, rdf: r.rdf, eo: r.eo, vol: r.vol,
          tll: r.tll > 3 && r.tll < 24 ? r.tll : null, phL: l ? l.ph : null, alm: alm != null && alm >= 0 && alm < 30 ? alm : null,
          wortT: pr.wortT, o2: pr.o2, aire: pr.aire, tSie: pr.tSie, presion: pr.presion, nCoc: pr.nCoc, bu: pr.bu, ebc: pr.ebc, phMosto: pr.phMosto, recM: pr.recM,
          gapAs: pre ? (r.t - pre.t) / DAY : null, minAs: pre ? pre.minutes : null, flowAs: pre ? pre.flow : null,
          loss: m ? m.loss : null, input: m ? m.input : null, stay: m && m.t > r.t && (m.t - r.t) / DAY < 40 ? (m.t - r.t) / DAY : null,
        };
      });
      // Resultados «limpios»: cada uno menos lo normal de su marca y tamaño de tanque
      const med0 = (k, f) => { const g = new Map(); rows.forEach((r) => { const v = r[f]; if (v != null && Number.isFinite(v)) { if (!g.has(r[k])) g.set(r[k], []); g.get(r[k]).push(v); } }); return new Map([...g].map(([a, v]) => [a, v.length >= 8 ? med(v) : null])); };
      const m15 = med0('key', 'h15'), m75 = med0('key', 'h75'), mrdf = med0('key', 'rdf'), mst = med0('key', 'stay');
      const rate = new Map(); const gm = new Map(); rows.forEach((r) => { if (r.loss != null && r.input > 0) { if (!gm.has(r.key)) gm.set(r.key, []); gm.get(r.key).push(r); } });
      gm.forEach((v, k) => { if (v.length >= 8) rate.set(k, sum(vals(v, 'loss')) / sum(vals(v, 'input'))); });
      const eoM = med0('brand', 'eo');
      rows.forEach((r) => {
        r.oMerma = r.loss != null && r.input > 0 && rate.has(r.key) ? ((r.loss - r.input * rate.get(r.key)) / r.input) * 100 : null;
        r.oArr = r.h15 != null && m15.get(r.key) != null ? r.h15 - m15.get(r.key) : null;
        r.oVel = r.h75 != null && m75.get(r.key) != null ? r.h75 - m75.get(r.key) : null;
        // El extracto final solo vale en lotes ya cerrados: en los que siguen fermentando todavía no es el final
        r.oRdf = r.stay != null && r.rdf != null && mrdf.get(r.key) != null ? r.rdf - mrdf.get(r.key) : null;
        r.oEst = r.stay != null && mst.get(r.key) != null ? r.stay - mst.get(r.key) : null;
        r.eoDev = r.eo != null && eoM.get(r.brand) != null ? r.eo - eoM.get(r.brand) : null;
        const b = m75.get(r.brand + '|N'); r.vel0 = r.h75 != null ? r.h75 : null;
      });
      const mb = new Map(); [...new Set(rows.map((r) => r.brand))].forEach((b) => { mb.set(b, med(vals(rows.filter((r) => r.brand === b), 'h75'))); });
      rows.forEach((r) => { r.v75 = r.h75 != null && mb.get(r.brand) != null ? r.h75 - mb.get(r.brand) : null; });
      return { rows };
    });
  }

  const FACTORES = [
    ['Generación de la levadura', 'gen'], ['Viabilidad de la levadura', 'viab'], ['Consistencia de la levadura', 'cons'], ['pH de la levadura', 'phL'], ['Días guardada antes de usar', 'alm'],
    ['Desvío del extracto original', 'eoDev'], ['Temperatura del mosto', 'wortT'], ['Oxígeno del mosto (ppm)', 'o2'], ['Aire (g/Hl)', 'aire'], ['Temperatura de siembra', 'tSie'], ['Presión de llenado', 'presion'], ['Número de cocimientos', 'nCoc'], ['Amargor (BU)', 'bu'], ['Color (EBC)', 'ebc'], ['pH del mosto', 'phMosto'], ['Recuento de células a 3 h', 'recM'], ['Tiempo de llenado', 'tll'], ['Volumen de llenado', 'vol'], ['Aseo previo: días desde el aseo', 'gapAs'], ['Aseo previo: minutos', 'minAs'], ['Aseo previo: caudal', 'flowAs'],
  ];
  const RESULT = [['Merma', 'oMerma'], ['Arranque (h a 15 %)', 'oArr'], ['Velocidad (h a 75 %)', 'oVel'], ['Extracto final', 'oRdf'], ['Estancia en FV', 'oEst']];

  /* Modelo de velocidad: generación, pH de la levadura, días guardada y tanque grande; cada factor extra se prueba por separado. */
  function modeloVel(ctx) {
    return An1.memo(ctx, 'planFxModelo', () => {
      const L = lotes(ctx).rows.filter((r) => r.v75 != null && r.gen != null && r.phL != null && r.alm != null && r.recM != null && r.ebc != null);
      if (L.length < 120) return null;
      const base = (r) => [1, r.gen, r.phL * 10, r.alm, r.G ? 1 : 0, r.recM, r.ebc], fit = ols(L.map(base), L.map((r) => r.v75));
      if (!fit) return null;
      const extra = {};
      [['viab', 'viab'], ['tll', 'tll'], ['cons', 'cons'], ['eoDev', 'eoDev'], ['vol', 'vol'], ['o2', 'o2'], ['wortT', 'wortT'], ['bu', 'bu'], ['tSie', 'tSie'], ['phMosto', 'phMosto'], ['presion', 'presion']].forEach(([k, f]) => {
        const M = L.filter((r) => r[f] != null && Number.isFinite(r[f]));
        if (M.length < 120) return;
        const f2 = ols(M.map((r) => base(r).concat([r[f]])), M.map((r) => r.v75));
        if (f2) extra[k] = f2.b[7] / (f2.se[7] || 1);
      });
      return { L, fit, extra };
    });
  }

  /* Modelo del arranque (horas hasta 15 %): oxígeno, pH de la levadura, días guardada, generación y recuento */
  function modeloArr(ctx) {
    return An1.memo(ctx, 'planFxArr', () => {
      const L = lotes(ctx).rows.filter((r) => r.h15 != null && r.o2 != null && r.phL != null && r.alm != null && r.gen != null && r.recM != null);
      if (L.length < 120) return null;
      const by = new Map(); [...new Set(L.map((r) => r.brand))].forEach((b) => by.set(b, med(vals(L.filter((r) => r.brand === b), 'h15'))));
      const y = L.map((r) => r.h15 - by.get(r.brand)), fit = ols(L.map((r) => [1, r.o2, r.phL * 10, r.alm, r.gen, r.recM]), y);
      return fit ? { L, fit } : null;
    });
  }

  /* Modelo del extracto final (solo lotes cerrados): amargor, oxígeno y temperatura del mosto */
  function modeloRdf(ctx) {
    return An1.memo(ctx, 'planFxRdf', () => {
      const L = lotes(ctx).rows.filter((r) => r.oRdf != null && r.bu != null && r.o2 != null && r.wortT != null && r.gen != null);
      if (L.length < 120) return null;
      const fit = ols(L.map((r) => [1, r.bu, r.o2, r.wortT, r.gen]), L.map((r) => r.oRdf));
      return fit ? { L, fit } : null;
    });
  }

  /* ======================= 1. Mapa de factores ======================= */
  function mapa(ctx, UI) {
    const L = lotes(ctx).rows;
    if (L.length < 120) return vacio(UI, 'Mapa de factores', 'Se necesitan al menos 120 fermentaciones.');
    const cel = FACTORES.map(([n, f]) => RESULT.map(([, o]) => { const pa = L.filter((r) => r[f] != null && r[o] != null && Number.isFinite(r[f]) && Number.isFinite(r[o])); if (pa.length < 60) return null; const s = S.spearman(pa.map((r) => r[f]), pa.map((r) => r[o])); return s ? { r: s.r, p: s.p, n: pa.length } : null; }));
    const real = []; cel.forEach((row, i) => row.forEach((c, j) => { if (c && c.p < 0.01 && Math.abs(c.r) >= 0.1) real.push({ f: FACTORES[i][0], o: RESULT[j][0], r: c.r, n: c.n }); }));
    real.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const matrix = cel.map((row) => row.map((c) => (c && c.p < 0.01 && Math.abs(c.r) >= 0.1 ? r1(c.r * 100) / 100 : null)));
    const M = modeloVel(ctx), enModelo = M ? { gen: Math.abs(M.fit.b[1] / M.fit.se[1]) > 2.6, phL: Math.abs(M.fit.b[2] / M.fit.se[2]) > 2.6, alm: Math.abs(M.fit.b[3] / M.fit.se[3]) > 2.6, recM: Math.abs(M.fit.b[5] / M.fit.se[5]) > 2.6, ebc: Math.abs(M.fit.b[6] / M.fit.se[6]) > 2.6 } : {};
    const Ma = modeloArr(ctx), Mr = modeloRdf(ctx);
    if (Ma) { if (Math.abs(Ma.fit.b[1] / Ma.fit.se[1]) > 2.6) enModelo.o2 = true; if (Math.abs(Ma.fit.b[3] / Ma.fit.se[3]) > 2.6) enModelo.alm = true; }
    if (Mr) { if (Math.abs(Mr.fit.b[1] / Mr.fit.se[1]) > 2.6) enModelo.bu = true; if (Math.abs(Mr.fit.b[2] / Mr.fit.se[2]) > 2.6) enModelo.o2 = true; if (Math.abs(Mr.fit.b[3] / Mr.fit.se[3]) > 2.6) enModelo.wortT = true; }
    const sinEfecto = FACTORES.filter((f, i) => cel[i].every((c) => !c || !(c.p < 0.01 && Math.abs(c.r) >= 0.1)) && !enModelo[f[1]]).map((f) => f[0]);
    const nombre = { viab: 'Viabilidad de la levadura', tll: 'Tiempo de llenado', cons: 'Consistencia de la levadura', eoDev: 'Desvío del extracto original', vol: 'Volumen de llenado', o2: 'Oxígeno del mosto (ppm)', wortT: 'Temperatura del mosto', bu: 'Amargor (BU)', tSie: 'Temperatura de siembra', phMosto: 'pH del mosto', presion: 'Presión de llenado' };
    const espurias = M ? Object.keys(M.extra).filter((k) => Math.abs(M.extra[k]) < 2.6 && real.some((x) => x.f === nombre[k] && x.o.startsWith('Velocidad'))).map((k) => nombre[k]) : [];
    const l = `Cada celda de color es una relación real (p &lt; 0,01) entre un factor y un resultado, ya descontando lo normal de cada marca y tamaño de tanque: <b>azul = al subir el factor baja el resultado, gris oscuro = sube</b>; las celdas vacías son «no se ve relación». ` +
      (real.length ? `Las más fuertes: ${real.slice(0, 5).map((x) => `<b>${esc(lc(x.f))}</b> con ${esc(lc(x.o))} (ρ = ${fmt(x.r, 2)})`).join('; ')}. ` : '<b>Ninguna relación clara.</b> ') +
      (espurias.length ? `<b>Ojo:</b> ${espurias.map((x) => esc(lc(x))).join(' y ')} parece${espurias.length > 1 ? 'n' : ''} influir en la velocidad, pero ya no al controlar la generación de la levadura y el tamaño del tanque (se confunden con ellos: la viabilidad baja con la generación y los tanques grandes se llenan más despacio). ` : '') + (sinEfecto.length ? `<b>No se ve que afecten a nada de lo medido:</b> ${sinEfecto.map((x) => esc(lc(x))).join(', ')}. ` : '') + `<b>Qué hacer:</b> actuar sobre los factores con color y dejar tranquilos los demás. El efecto en horas de cada factor, separando los que se confunden entre sí, está en la tarjeta de abajo.`;
    return An1.tarjeta(UI, 'Mapa de factores', `Relación (ρ de Spearman) entre cada factor y cada resultado, ${L.length} fermentaciones, todo el histórico.`,
      C.heatmap({ w: W.full, rows: FACTORES.map((f) => f[0]), cols: RESULT.map((r) => r[0]), matrix, domain: [-0.4, 0.4], fmt: (v) => sg(v, 2), toolbar: true, id: 'ch-fx-mapa' }), l, { tono: real.length ? 'ok' : '' });
  }

  /* ======================= 2. Qué mueve la velocidad (efecto en horas) ======================= */
  function efectos(ctx, UI) {
    const M = modeloVel(ctx);
    if (!M) return vacio(UI, 'Qué mueve la velocidad', 'Se necesitan al menos 120 fermentaciones con levadura identificada.');
    const L = M.L, fit = M.fit;
    const def = [['Una generación más de la levadura', 1, '1 gen'], ['+0,1 de pH de la levadura', 2, '+0,1 pH'], ['Un día más guardada la levadura', 3, '1 día'], ['Fermentar en tanque grande', 4, 'tanque grande'], ['+1 millón de células/ml a las 3 h', 5, '+1 M/ml'], ['+1 de color (EBC) del mosto', 6, '+1 EBC']];
    const f = def.map(([label, i, u]) => ({ label, u, b: fit.b[i], ic: 1.96 * fit.se[i], t: fit.b[i] / (fit.se[i] || 1) }));
    const l = `Horas hasta 75 % de atenuación que se asocian a cada factor, <b>controlando los demás a la vez</b> (R² = ${fmt(fit.r2, 2)}, ${L.length} fermentaciones). Negativo = fermenta más rápido. ` +
      f.map((x) => `<b>${esc(lc(x.label))}</b>: ${sg(x.b, 1)} h (±${fmt(x.ic, 1)})${Math.abs(x.t) > 2.6 ? ' *' : ''}`).join('; ') + '. ' +
      `<b>Qué hacer:</b> <b>usar la levadura pronto</b> (cada día guardada se asocia a unas ${fmt(Math.max(0, f[2].b), 1)} h más de fermentación; ${fmt((L.filter((r) => r.alm > 3).length / L.length) * 100, 0)} % de los lotes se siembra con levadura de más de 3 días); medir y vigilar el <b>pH de la levadura</b> (más alto = más rápido); vigilar el <b>recuento de células a las 3 horas</b> (más células = más rápido; es la siembra efectiva); y entender qué hacen distinto los <b>tanques grandes</b> para replicarlo. <b>Cautela:</b> son asociaciones, y R² bajo significa que queda mucha variación sin explicar (el resto no está en estos datos; lo más probable es la temperatura de fermentación del tanque, que no se registra).`;
    return An1.tarjeta(UI, 'Qué mueve la velocidad de fermentación', 'Efecto en horas de cada factor, controlando los otros. * = diferencia real. Barra = estimación, intervalo de confianza 95 % en el texto.',
      C.barsH({ w: W.half, h: 300, unit: 'h', toolbar: true, id: 'ch-fx-efec', data: f.map((x) => ({ label: x.label, value: r1(x.b), color: Math.abs(x.t) > 2.6 ? (x.b < 0 ? POS : WARN) : MUTED })), refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: 'ok' });
  }

  /* ======================= 2b. Arranque y extracto final ======================= */
  function efectosArr(ctx, UI) {
    const M = modeloArr(ctx);
    if (!M) return vacio(UI, 'Qué mueve el arranque', 'Se necesitan al menos 120 fermentaciones con oxígeno y recuento de células.');
    const b = M.fit.b, se = M.fit.se, tt = (i) => b[i] / (se[i] || 1);
    const def = [['+1 ppm de oxígeno del mosto', 1], ['+0,1 de pH de la levadura', 2], ['Un día más guardada la levadura', 3], ['Una generación más', 4], ['+1 millón de células/ml a las 3 h', 5]].map(([label, i]) => ({ label, b: b[i], ic: 1.96 * se[i], t: tt(i) }));
    const real = def.filter((x) => Math.abs(x.t) > 2.6);
    const l = `Horas hasta 15 % de atenuación (el arranque de la fermentación) que se asocian a cada factor, controlando los demás (R² = ${fmt(M.fit.r2, 2)}, ${M.L.length} fermentaciones). ` +
      (real.length ? `Con efecto claro: ${real.map((x) => `<b>${esc(lc(x.label))}</b>: ${sg(x.b, 1)} h (±${fmt(x.ic, 1)})`).join('; ')}. ` : 'Ningún factor se separa con claridad. ') +
      (def[0].b > 0 && Math.abs(def[0].t) > 2.6 ? '<b>El oxígeno más alto se asocia a un arranque más lento</b>, al revés de lo que se esperaría; conviene revisar cómo y dónde se mide el oxígeno y si hay un valor óptimo en vez de «más es mejor». ' : '') +
      `<b>Qué hacer:</b> mirar la relación entre el oxígeno y el arranque lote por lote antes de cambiar la aireación; es una asociación, no una causa comprobada.`;
    return An1.tarjeta(UI, 'Qué mueve el arranque', 'Efecto en horas hasta 15 % de cada factor, controlando los otros.',
      C.barsH({ w: W.half, h: 260, unit: 'h', toolbar: true, id: 'ch-fx-arr', data: def.map((x) => ({ label: x.label, value: r1(x.b), color: Math.abs(x.t) > 2.6 ? (x.b < 0 ? POS : WARN) : MUTED })), refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: real.length ? 'warn' : '' });
  }
  function efectosRdf(ctx, UI) {
    const M = modeloRdf(ctx);
    if (!M) return vacio(UI, 'Qué mueve el extracto final', 'Se necesitan al menos 120 lotes cerrados con amargor y oxígeno.');
    const b = M.fit.b, se = M.fit.se, def = [['+10 BU de amargor', 1, 10], ['+1 ppm de oxígeno del mosto', 2, 1], ['+1 °C de temperatura del mosto', 3, 1]].map(([label, i, k]) => ({ label, b: b[i] * k, ic: 1.96 * se[i] * k, t: b[i] / (se[i] || 1) }));
    const real = def.filter((x) => Math.abs(x.t) > 2.6), L = lotes(ctx).rows.filter((r) => r.oRdf != null);
    const om = (() => {
      const g = new Map(); L.forEach((r) => { const k = Math.floor(r.t / (7 * DAY)); if (!g.has(k)) g.set(k, []); g.get(k).push(r.oRdf); });
      const gr = [...g.values()].filter((v) => v.length >= 3), N = sum(gr.map((v) => v.length)), k = gr.length; if (k < 3 || N - k < 10) return null;
      const all = [].concat(...gr), gm = mean(all), ssb = sum(gr.map((v) => v.length * (mean(v) - gm) ** 2)), sst = sum(all.map((y) => (y - gm) ** 2)), msw = (sst - ssb) / (N - k);
      return Math.max(0, (ssb - (k - 1) * msw) / (sst + msw));
    })();
    const l = `Diferencia del extracto final frente a lo normal de su marca y tamaño de tanque (°P), solo en lotes ya cerrados, según cada factor (R² = ${fmt(M.fit.r2, 2)}). ` +
      (real.length ? `Con efecto claro: ${real.map((x) => `<b>${esc(lc(x.label))}</b>: ${sg(x.b, 2)} °P (±${fmt(x.ic, 2)})`).join('; ')}. ` : 'Ningún factor se separa con claridad. ') +
      (om != null && om > 0.15 ? `Aun así, <b>cerca de ${fmt(om * 100, 0)} % de lo que queda se parece entre lotes de la misma semana</b>: algo que cambia por semana y no está en el Excel, como el lote de malta y adjuntos o la calibración del laboratorio. ` : '') + `<b>Qué hacer:</b> registrar el lote de malta y adjuntos y quién y con qué equipo mide el extracto final.`;
    return An1.tarjeta(UI, 'Qué mueve el extracto final', 'Efecto en °P de cada factor, controlando los otros. Lotes cerrados.',
      C.barsH({ w: W.half, h: 220, unit: '°P', toolbar: true, id: 'ch-fx-rdf', yFmt: (v) => fmt(v, 2), data: def.map((x) => ({ label: x.label, value: An1.round(x.b, 3), color: Math.abs(x.t) > 2.6 ? (x.b < 0 ? POS : WARN) : MUTED })), refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: real.length ? 'ok' : '' });
  }

  /* ======================= 3. Agua: qué actividad la mueve ======================= */
  function grupoEquipo(e) {
    e = String(e || '').toUpperCase();
    if (/^(FV|SV|UTK|UTQ)/.test(e)) return null;
    if (e.includes('SIEMBRA')) return 'Red de siembra'; if (e.includes('COSECHA')) return 'Red de cosecha'; if (e.includes('MOSTO')) return 'Red de mosto'; if (e.includes('TRASIEGO')) return 'Red de trasiego';
    if (e.includes('ANILLO')) return 'Anillos'; if (e.includes('CERVEZA')) return 'Red de cerveza'; if (e.includes('CENTRIF')) return 'Centrífuga'; if (e.includes('PURGA')) return 'Red de purgas';
    return 'Otros equipos';
  }
  function agua(ctx, UI) {
    return An1.memo(ctx, 'planFxAgua', () => {
      const ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null), dias = An1.porPeriodo(ag, 'day').filter((d) => d.rows.length >= 3);
      const as = An1.sane('aseos', ctx.todas('aseos')).filter((a) => a.t != null && a.t <= Date.now());
      if (dias.length < 60) return null;
      const gs = new Map(); as.forEach((a) => { const g = grupoEquipo(a.equipment); if (g) { if (!gs.has(g)) gs.set(g, []); gs.get(g).push(a); } });
      const grupos = [...gs].filter(([, v]) => v.length >= 40).map(([k]) => k);
      const t0 = dias[0].t, t1 = dias[dias.length - 1].t + DAY, idx = new Map(dias.map((d, i) => [Math.floor(d.t / DAY), i]));
      const cnt = grupos.map((g) => { const c = new Array(dias.length).fill(0); gs.get(g).forEach((a) => { const i = idx.get(Math.floor(a.t / DAY)); if (i != null && a.t >= t0 && a.t < t1) c[i]++; }); return c; });
      const y = dias.map((d) => sum(vals(d.rows, 'total'))), X = dias.map((d, i) => [1].concat(cnt.map((c) => c[i]))), fit = ols(X, y);
      if (!fit) return null;
      const med3 = (g) => med(vals(gs.get(g), 'm3'));
      const filas = grupos.map((g, i) => ({ g, b: fit.b[i + 1], t: fit.b[i + 1] / (fit.se[i + 1] || 1), n: sum(cnt[i]), anota: med3(g), tot: fit.b[i + 1] * sum(cnt[i]) })).sort((a, b) => b.tot - a.tot);
      const clar = filas.filter((x) => x.t > 3 && x.b > 0 && x.n >= 40), totalAgua = sum(y), atr = sum(clar.map((x) => x.tot));
      const co = As(as);
      return { filas, clar, totalAgua, atr, base: fit.b[0], r2: fit.r2, co, n: dias.length };
    });
    function As(as) { const x = as.filter((a) => a.m3 > 0 && a.flow > 0 && a.minutes > 0); if (x.length < 50) return null; const lr = S.linreg(x.map((a) => (a.flow * a.minutes) / 1000), x.map((a) => a.m3)); return lr ? { r: lr.r, n: x.length } : null; }
  }
  function renderAgua(ctx, UI) {
    const R = agua(ctx, UI);
    if (!R) return vacio(UI, 'Agua: qué actividad la mueve', 'Se necesitan al menos 60 días con consumo y aseos registrados.');
    const f = R.filas.filter((x) => x.n >= 40);
    const rojos = R.clar.map((x) => esc(lc(x.g)));
    const l = `Agua diaria que se asocia a cada aseo según el equipo (azul), junto al m³ que anota el propio aseo (gris), con ${R.n} días y R² = ${fmt(R.r2, 2)}. ` +
      (R.clar.length ? `<b>Los aseos de ${rojos.join(', ')} arrastran de ${fmt(Math.min(...R.clar.map((x) => x.b / x.anota)), 0)} a ${fmt(Math.max(...R.clar.map((x) => x.b / x.anota)), 0)} veces más agua de la que anotan</b> (${R.clar.map((x) => `${esc(lc(x.g))} ≈ ${fmt(x.b, 0)} m³ frente a ${fmt(x.anota, 1)} anotados`).join('; ')}): lo más probable es que limpien con CIP GEA y vayan acompañados de lavado de pisos, que explicaría por qué Pisos y GEA suben juntos. Suman unos ${fmt(R.atr, 0)} m³, ${fmt((R.atr / R.totalAgua) * 100, 0)} % del agua. ` : 'Ningún tipo de equipo se separa con claridad del resto. ') +
      `Aparte de los aseos quedan unos <b>${fmt(R.base, 0)} m³ por día</b> que no dependen de ninguna actividad registrada. ` +
      (R.co ? `Además, el «m³ por aseo» es un <b>cálculo</b> (caudal × minutos, correlación ${fmt(R.co.r, 2)}), no una lectura de contador; por eso los aseos «explican» tan poca agua. ` : '') +
      `<b>Qué hacer:</b> medir con contador el agua de los aseos de ${rojos.length ? rojos.join(', ') : 'las redes'} (inicio y fin; ahí está lo que no se ve hoy), revisar su receta de CIP y el lavado de pisos que los acompaña, y priorizar estos equipos antes que otros.`;
    return An1.tarjeta(UI, 'Agua: qué actividad la mueve', 'm³ del día asociados a cada aseo, por tipo de equipo. Todo el histórico.',
      C.bars({ w: W.full, h: 300, unit: 'm³', toolbar: true, id: 'ch-fx-agua', categories: f.map((x) => `${x.g} (${x.n})`), series: [{ name: 'Agua asociada por aseo', values: f.map((x) => r1(Math.max(0, x.b))), color: EST }, { name: 'm³ que anota el aseo', values: f.map((x) => r1(x.anota || 0)), color: MUTED }] }), l, { tono: R.clar.length ? 'warn' : '' });
  }

  /* ======================= 4. Trasiegos: ¿qué explica el retraso? ======================= */
  function trasiegos(ctx, UI) {
    const tr = An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > -24 && r.delay < 72 && r.actualEnd && r.actualEnd <= Date.now() && r.actualEnd >= Date.now() - 400 * DAY);
    if (tr.length < 100) return vacio(UI, 'Trasiegos: qué explica el retraso', 'Se necesitan al menos 100 trasiegos terminados.');
    const grp = (fn) => { const g = {}; tr.forEach((r) => { const k = fn(r); if (k != null) (g[k] = g[k] || []).push(r.delay); }); Object.keys(g).forEach((k) => { if (g[k].length < 12) delete g[k]; }); return g; };
    const org = (r) => { const m = /UTQ[_ ]?(\d+)/i.exec(r.activity || ''); return m ? +m[1] : null; };
    const defs = [['Mes', (r) => B.mesKey(r.actualEnd)], ['Hora planeada de fin', (r) => (r.plannedEnd ? new Date(r.plannedEnd).getHours() : null)], ['Día de la semana', (r) => (r.plannedEnd ? new Date(r.plannedEnd).getDay() : null)], ['Marca', (r) => r.brand || null], ['Tanque de origen', org], ['Tanque de destino', (r) => (Number.isFinite(+r.destination) ? +r.destination : null)]];
    const res = defs.map(([n, fn]) => { const g = grp(fn); const k = Object.keys(g).length >= 2 ? S.kruskal(g) : null; return k ? { n, p: k.p, k: Object.keys(g).length } : null; }).filter(Boolean);
    const reales = res.filter((x) => x.p < 0.01), dur = med(tr.map((r) => r.duration).filter((v) => v != null && v < 48));
    const chart = C.barsH({ w: W.half, h: 240, unit: '', toolbar: true, id: 'ch-fx-tras', yFmt: (v) => fmt(v, 1), data: res.map((x) => ({ label: `${x.n}${x.p < 0.01 ? ' *' : ''}`, value: r1(Math.min(30, -Math.log10(Math.max(x.p, 1e-30)))), color: x.p < 0.01 ? WARN : MUTED })), refs: [{ y: 2, label: '', dashed: true }] });
    const l = `Qué tan fuerte es la evidencia de que cada factor cambia el retraso del trasiego (a la derecha de la línea punteada = diferencia real; más largo = más claro). ` +
      (reales.length ? `<b>Solo ${reales.map((x) => esc(x.n === 'Mes' ? 'el mes' : lc(x.n))).join(' y ')} ${reales.length > 1 ? 'explican' : 'explica'} el retraso</b>` : '<b>Ningún factor explica el retraso</b>') +
      `; no hay diferencia por ${res.filter((x) => x.p >= 0.01).map((x) => esc(lc(x.n))).join(', ')}. ` +
      `La duración del trasiego es casi fija (${fmt(dur, 1)} h), así que el retraso viene de que <b>empieza tarde</b>. ${reales.some((x) => x.n === 'Mes') ? 'Como lo que cambia es el mes, no es un tanque, una marca ni un turno el problema: fue un <b>periodo</b> (ver el retraso mes a mes en «Dónde actuar»). ' : ''}<b>Qué hacer:</b> averiguar qué pasaba en los meses de más retraso (personal, disponibilidad de tanques o UTK, planificación) y qué cambió después; no tiene sentido intervenir por tanque, marca u hora.`;
    return An1.tarjeta(UI, 'Trasiegos: qué explica el retraso', 'Evidencia (−log10 de p) de cada factor sobre el retraso. Últimos 13 meses.', chart, l, { tono: reales.length ? 'warn' : '' });
  }

  /* ======================= 5. Recuperación: qué influye en el rendimiento ======================= */
  function recuperacion(ctx, UI) {
    const rc = An1.sane('recuperacion', ctx.todas('recuperacion')).filter((r) => r.yieldPct > 20 && r.yieldPct < 110 && r.yeast > 0);
    if (rc.length < 30) return vacio(UI, 'Recuperación: qué influye en el rendimiento', 'Se necesitan al menos 30 recuperaciones.');
    const defs = [['Horas hasta recuperar', (r) => r.hours], ['Levadura procesada (Hl)', (r) => r.yeast], ['Agua añadida (Hl)', (r) => r.waterHl], ['Agua por Hl de levadura', (r) => (r.waterHl != null ? r.waterHl / r.yeast : null)], ['pH', (r) => r.ph], ['Temperatura', (r) => r.temp]];
    const filas = defs.map(([n, fn]) => { const pa = rc.map((r) => [fn(r), r.yieldPct]).filter((p) => p[0] != null && Number.isFinite(p[0])); if (pa.length < 25) return null; const s = S.spearman(pa.map((p) => p[0]), pa.map((p) => p[1])); return s ? { n, r: s.r, p: s.p, k: pa.length } : null; }).filter(Boolean);
    const utk = [...new Set(rc.map((r) => String(r.utk || '').replace(/\D/g, '')).filter(Boolean))];
    const g = {}; rc.forEach((r) => { const k = String(r.utk || '').replace(/\D/g, ''); if (k) (g[k] = g[k] || []).push(r.yieldPct); });
    const ku = Object.values(g).every((v) => v.length >= 8) && utk.length >= 2 ? S.kruskal(g) : null;
    const reales = filas.filter((x) => x.p < 0.05);
    const l = reales.length ? `Con relación real: <b>${reales.map((x) => `${esc(lc(x.n))} (ρ = ${fmt(x.r, 2)})`).join(', ')}</b>. El tiempo de espera es lo único que se puede controlar directamente. ` : 'Ningún factor medido se relaciona con claridad con el rendimiento. ';
    const sin = filas.filter((x) => x.p >= 0.05).map((x) => esc(lc(x.n)));
    return UI.card('Recuperación: qué influye en el rendimiento', 'Relación (ρ de Spearman) de cada factor con el rendimiento de la recuperación. Todo el histórico.',
      UI.tabla([{ k: 'n', t: 'Factor' }, An1.colNum('k', 'Recuperaciones', 0), An1.colNum('r', 'ρ', 2), { k: 'p', t: 'p', num: true, f: (v) => pTxt(v) }, { k: 'v', t: '¿Influye?', f: (v) => UI.badge(v, v === 'Sí' ? 'warn' : '') }],
        filas.map((x) => ({ n: x.n, k: x.k, r: An1.round(x.r, 2), p: x.p, v: x.p < 0.05 ? 'Sí' : 'No se ve' })), { id: 'tb-fx-rec', nombre: 'recuperacion-factores', sort: { k: 'p', dir: 1 }, max: 10 }) +
      UI.lectura(`${l}${sin.length ? `No se ve relación con ${sin.join(', ')}. ` : ''}${ku ? `Entre UTK 19 y 20 ${ku.p < 0.05 ? 'sí hay diferencia' : 'no hay diferencia clara'} (p = ${fmt(ku.p, 2)}). ` : ''}Son pocas recuperaciones (${rc.length}); un efecto pequeño no se detectaría.`, reales.length ? 'warn' : ''));
  }

  function render(ctx, UI) {
    return `<p class="an-lead-s">Qué factores afectan a qué resultado, y cuáles no. Todo el histórico (estas relaciones necesitan muestra grande). Son asociaciones: indican por dónde investigar, no prueban la causa.</p>` +
      mapa(ctx, UI) + UI.grid([efectos(ctx, UI), efectosArr(ctx, UI)], 2) + UI.grid([efectosRdf(ctx, UI), trasiegos(ctx, UI)], 2) + renderAgua(ctx, UI) + recuperacion(ctx, UI) +
      `<h2 class="an-sec">Más comprobaciones</h2>` + (A.FactoresExtra || []).map((f) => { try { return f(ctx, UI) || ''; } catch (e) { console.error(e); return ''; } }).join('');
  }

  A.FactoresExtra = A.FactoresExtra || [];
  AN.registrar({ id: 'factores', label: 'Qué afecta a qué', orden: 1.7, render });
  B.lotesFx = lotes; B.modeloVel = modeloVel; B.modeloArr = modeloArr; B.modeloRdf = modeloRdf; B.ols = ols; B.grupoEquipo = grupoEquipo;

  A.PlanPasos = A.PlanPasos || [];
  A.PlanPasos.push((ctx) => {
    const out = [], M = modeloVel(ctx);
    if (M && M.fit.b[3] / (M.fit.se[3] || 1) > 2.6) out.push({ t: 'Usar la levadura dentro de 2 días de la colecta', d: `Cada día guardada se asocia a ${fmt(M.fit.b[3], 1)} h más de fermentación, y ${fmt((M.L.filter((r) => r.alm > 3).length / M.L.length) * 100, 0)} % de los lotes se siembra con levadura de más de 3 días.`, tag: 'Proceso' });
    const R = agua(ctx, null);
    if (R && R.clar.length) out.push({ t: `Medir con contador el agua de los aseos de ${R.clar.slice(0, 3).map((x) => lc(x.g)).join(', ')}`, d: `Arrastran ≈ ${fmt(R.atr, 0)} m³ (${fmt((R.atr / R.totalAgua) * 100, 0)} % del agua), de ${fmt(Math.min(...R.clar.map((x) => x.b / x.anota)), 0)} a ${fmt(Math.max(...R.clar.map((x) => x.b / x.anota)), 0)} veces más de lo que anotan.`, tag: 'Agua' });
    return out;
  });
})();
