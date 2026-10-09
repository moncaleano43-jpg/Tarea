/* ============================================================
   71c-plan-profundo.js · Secciones de profundidad de «Dónde actuar»
   Qué cambió y cuándo · Qué NO explica la merma · Recuperación · Aseos y operarios · Trasiegos ·
   Proyección con su margen de error · Qué datos faltan para proyectar mejor.
   Se enchufa a 71b mediante A.PlanExtra (secciones) y A.PlanPasos (pasos del plan).
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.An1 || !A.Analisis || !A.Charts || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, C = A.Charts, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, W, DAY } = An1;
  const WARN = 'var(--warn,#a26a14)', NEG = 'var(--neg,#b0442e)', POS = 'var(--pos,#3b7a59)', EST = 'var(--est,#5d6f8c)', INK = 'var(--ink,#171717)', MUTED = 'var(--muted,#8a8a84)';
  const r1 = (v) => An1.round(v, 1);
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mesKey = (t) => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); };
  const mesLabel = (k) => `${MES[k % 12]} ${String(Math.floor(k / 12)).slice(2)}`;
  const q = (xs, p) => S.quantile(xs, p);
  const pTxt = (p) => (p == null ? '—' : p < 0.001 ? 'menor que 0,001' : fmt(p, 3));
  const sec = (t, id) => `<h2 class="an-sec"${id ? ` id="${id}"` : ''}>${esc(t)}</h2>`;
  const vacio = (UI, t, sub, msg) => UI.card(t, sub || '', UI.vacio(msg));

  /* ---------- Filas de FV creíbles de TODO el histórico (para cambios y pronóstico) ---------- */
  function fvHist(ctx) {
    return An1.memo(ctx, 'planFvHist', () => {
      const base = (r) => r.phase === 'FV' && r.input > 0 && r.loss != null && r.lossPct != null && r.lossPct > -5 && r.lossPct < 15;
      const rows = An1.sane('merma', ctx.todas('merma')).filter(base);
      const porTq = new Map(); rows.forEach((r) => { if (r.tq != null) { if (!porTq.has(r.tq)) porTq.set(r.tq, []); porTq.get(r.tq).push(r.input); } });
      const cap = new Map([...porTq].map(([k, v]) => [k, med(v)])), ref = med([...cap.values()]);
      return rows.map((r) => ({ ...r, cls: cap.has(r.tq) && cap.get(r.tq) > ref * 1.08 ? 'grande' : 'normal' })).sort((a, b) => a.t - b.t);
    });
  }
  const rate = (xs) => { const i = sum(vals(xs, 'input')); return i > 0 ? (sum(vals(xs, 'loss')) / i) * 100 : null; };

  /* ======================= 1. Qué cambió y cuándo ======================= */
  function cambioMerma(ctx, UI) {
    const rows = fvHist(ctx);
    const sem = An1.porPeriodo(rows, 'week').filter((p) => p.rows.length >= 3).map((p) => ({ t: p.t, y: rate(p.rows), rows: p.rows }));
    if (sem.length < 12) return vacio(UI, 'Cambio de nivel en la merma', '', 'Se necesitan al menos 12 semanas de historia de fermentación.');
    const cp = S.changePoint(sem.map((s) => s.y));
    const real = cp && cp.p < 0.05 && Math.abs(cp.delta) >= 0.4;
    const t0 = real ? sem[cp.idx].t : null;
    const ser = [{ name: 'Merma semanal (%)', points: sem.map((s) => ({ x: s.t, y: r1(s.y) })), color: 'var(--faint,#c9c9c3)' }];
    if (real) {
      ser.push({ name: 'Nivel antes', dots: false, dashed: true, color: NEG, points: sem.slice(0, cp.idx).map((s) => ({ x: s.t, y: r1(cp.meanBefore) })) });
      ser.push({ name: 'Nivel después', dots: false, color: POS, points: sem.slice(cp.idx).map((s) => ({ x: s.t, y: r1(cp.meanAfter) })) });
    }
    const chart = C.line({ w: W.half, h: 300, unit: '%', xType: 'time', toolbar: true, id: 'ch-pl-cambio', series: ser, annotations: real ? [{ x: t0, text: 'Cambio' }] : [] });
    let marcasCh = '', lectura;
    if (real) {
      const antes = rows.filter((r) => r.t < t0), desp = rows.filter((r) => r.t >= t0);
      const mArr = [...new Set(rows.map((r) => r.brand))].map((b) => ({ b, a: antes.filter((r) => r.brand === b), d: desp.filter((r) => r.brand === b) })).filter((x) => x.a.length >= 6 && x.d.length >= 6);
      if (mArr.length >= 2) marcasCh = C.bars({ w: W.half, h: 300, unit: '%', toolbar: true, id: 'ch-pl-cambio-m', categories: mArr.map((x) => x.b), series: [{ name: 'Antes', values: mArr.map((x) => r1(rate(x.a))), color: NEG }, { name: 'Después', values: mArr.map((x) => r1(rate(x.d))), color: POS }] });
      const dias = (rows[rows.length - 1].t - rows[0].t) / DAY || 1, inMes = (sum(vals(rows, 'input')) / dias) * 30;
      const ahorro = (-cp.delta / 100) * inMes;
      const todas = mArr.length >= 2 && mArr.every((x) => rate(x.d) < rate(x.a));
      lectura = `La merma de fermentación bajó de <b>${fmt(cp.meanBefore, 1)} %</b> a <b>${fmt(cp.meanAfter, 1)} %</b> a partir de la semana del <b>${esc(AN.fmtDate(t0))}</b> (la probabilidad de que sea casualidad es ${pTxt(cp.p)}). ` +
        (todas ? 'Bajó en <b>todas las marcas</b>, así que no fue un cambio de receta ni de mezcla: algo del proceso, del registro o de la medición cambió para toda la planta. ' : '') +
        `Con el volumen actual eso son unos <b>${fmt(Math.abs(ahorro), 0)} Hl al mes</b>. <b>Qué hacer:</b> averiguar qué se hizo distinto esa semana (purgas, calibración de medidores, procedimiento de trasiego, personal). Si fue una mejora real, documentarla y vigilarla con carta de control para que no se pierda; si fue una recalibración, los datos anteriores estaban inflados y las comparaciones históricas no sirven.`;
    } else {
      lectura = 'En el historial de la merma de fermentación no se detecta un cambio de nivel claro: la planta se mueve alrededor del mismo promedio.';
    }
    return An1.tarjeta(UI, '¿Cambió la merma de nivel? Toda la planta', 'Merma semanal de fermentación (%) en todo el histórico, sin importar el filtro de periodo.', UI.grid([chart, marcasCh].filter(Boolean), marcasCh ? 2 : 1), lectura, { tono: real ? 'ok' : '' });
  }

  /* ======================= 2. Qué NO explica la merma ======================= */
  function noExplica(ctx, UI) {
    const M = B.mermaPlan(ctx), rs = M.rs || [];
    if (rs.length < 40) return vacio(UI, 'Lo que no explica la merma', '', 'Se necesitan al menos 40 llenados de fermentación en el periodo. Prueba con «Todo el histórico».');
    const fm = new Map(); An1.sane('ferm', ctx.todas('ferm')).forEach((f) => { if (f.lote) fm.set(String(f.lote), f); });
    const pd0 = A.ProcesoDatos ? A.ProcesoDatos.byLote() : new Map();
    const j = rs.map((r) => { const f = fm.get(String(r.lote)); return { r, f, pr: pd0.get(String(r.lote)) || null, ciclo: f && f.t ? (r.t - f.t) / DAY : null }; });
    const defs = [
      ['Volumen de entrada', (x) => x.r.input], ['Días en el tanque', (x) => (x.ciclo > 0 && x.ciclo < 40 ? x.ciclo : null)], ['Generación de levadura', (x) => x.f && x.f.gen],
      ['Viabilidad de la levadura', (x) => x.f && x.f.viab], ['Consistencia de la levadura', (x) => x.f && x.f.cons], ['Horas hasta 75 % de atenuación', (x) => x.f && x.f.h75],
      ['Atenuación final', (x) => x.f && x.f.atten], ['Extracto original', (x) => x.f && x.f.eo], ['Tiempo de llenado', (x) => (x.f && x.f.tll > 0 && x.f.tll < 48 ? x.f.tll : null)], ['Hora del cierre', (x) => new Date(x.r.t).getHours()],
      ['Oxígeno del mosto', (x) => x.pr && x.pr.o2], ['Temperatura del mosto', (x) => x.pr && x.pr.wortT], ['Recuento de células a 3 h', (x) => x.pr && x.pr.recM], ['Temperatura de siembra', (x) => x.pr && x.pr.tSie], ['Amargor (BU)', (x) => x.pr && x.pr.bu], ['Color (EBC)', (x) => x.pr && x.pr.ebc],
    ];
    const res = defs.map(([label, fn]) => {
      const pa = j.map((x) => ({ v: fn(x), y: x.r.resPct, y0: x.r.lossPct })).filter((p) => p.v != null && Number.isFinite(+p.v));
      if (pa.length < 30) return null;
      const sa = S.spearman(pa.map((p) => +p.v), pa.map((p) => p.y)), s0 = S.spearman(pa.map((p) => +p.v), pa.map((p) => p.y0));
      return sa ? { label, n: pa.length, r: sa.r, p: sa.p, r0: s0 ? s0.r : null, p0: s0 ? s0.p : null } : null;
    }).filter(Boolean);
    const dow = (() => { const g = {}; rs.forEach((r) => { const k = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(r.t).getDay()]; (g[k] = g[k] || []).push(r.resPct); }); const kw = Object.keys(g).length >= 3 ? S.kruskal(g) : null; return kw ? { label: 'Día de la semana del cierre', n: rs.length, r: 0, p: kw.p, cat: true } : null; })();
    const todos = res.concat(dow ? [dow] : []);
    const sig = todos.filter((x) => x.p < 0.05), pseudo = res.filter((x) => x.p0 < 0.05 && x.p >= 0.05 && Math.abs(x.r0) >= 0.15);
    const rsd = S.sd(rs.map((r) => r.resPct)), medIn = med(vals(rs, 'input')), ruido = ((rsd || 0) / 100) * medIn;
    const neg = rs.filter((r) => r.lossPct < 0).length;
    const chart = C.barsH({ w: W.half, h: Math.max(260, res.length * 30 + 50), unit: '', toolbar: true, id: 'ch-pl-noexp', yFmt: (v) => fmt(v, 2),
      data: res.map((x) => ({ label: `${x.label}${x.p < 0.05 ? ' *' : ''}`, value: An1.round(x.r, 2), color: x.p < 0.05 ? NEG : MUTED })), refs: [{ y: 0.2, label: '', dashed: true }, { y: -0.2, label: '', dashed: true }] });
    const l = `Cada barra es cuánto se mueve la merma de un lote cuando sube esa variable, <b>después de quitar el efecto de la marca y del tamaño del tanque</b> (0 = no hay relación; las líneas punteadas marcan una relación moderada, ±0,2; un * marca relación real). ` +
      (sig.length ? `Con relación clara: <b>${sig.map((x) => esc(x.label)).join(', ')}</b>. ` : '<b>Ninguna es significativa.</b> ') +
      (pseudo.length ? `Ojo: <b>${pseudo.map((x) => `${esc(x.label.toLowerCase())} (ρ = ${fmt(x.r0, 2)} sin ajustar)`).join(', ')}</b> parecían influir, pero era la marca (Light fermenta distinto y pierde más); ya ajustado desaparece. ` : '') +
      `Tampoco hay relación con el día de la semana (p = ${dow ? pTxt(dow.p) : '—'}). <b>Qué hacer:</b> no invertir tiempo en estos factores; la merma varía de lote a lote por algo que no están capturando estos datos.`;
    const ruidoCard = UI.card('Cuánto de la merma de un lote es ruido', 'Dispersión de la merma entre lotes del mismo tipo (misma marca y tamaño de tanque).',
      An1.stats([
        An1.stat('Variación entre lotes iguales', `± ${fmt(ruido, 0)} Hl`, `una desviación estándar (${fmt(rsd, 1)} puntos de %)`, ruido > 60 ? 'warn' : ''),
        An1.stat('Lotes con merma negativa', `${fmt((neg / rs.length) * 100, 0)} %`, 'salió más cerveza de la que entró', neg / rs.length > 0.1 ? 'warn' : ''),
        An1.stat('Merma típica de un lote', `${fmt((M.tasa / 100) * medIn, 0)} Hl`, `${fmt(M.tasa, 1)} % de ${fmt(medIn, 0)} Hl`),
      ]) +
      UI.lectura(`Un lote cualquiera se desvía ±${fmt(ruido, 0)} Hl de lo esperado por su marca y tanque, sin causa que lo explique, y esto es del mismo orden que la merma típica (${fmt((M.tasa / 100) * medIn, 0)} Hl). Un tanque con fuga real repetiría la pérdida lote tras lote, y los datos no lo muestran. Todo apunta a <b>precisión de medición</b> (nivel, flujo, método de lectura). <b>Qué hacer:</b> validar medidores de flujo y de nivel de entrada y salida, medir 10 lotes con dos métodos distintos y comparar. Hasta entonces, una diferencia de ±${fmt(ruido, 0)} Hl en un lote no debe leerse como problema.`, 'warn'));
    return UI.grid([An1.tarjeta(UI, 'Qué factores NO explican la merma', 'Para no perder tiempo. Relación (ρ de Spearman) entre cada variable y la merma ya ajustada.', chart, l), ruidoCard], 2);
  }

  /* ======================= 3. Recuperación ======================= */
  function recuperacion(ctx, UI) {
    const rows = An1.sane('recuperacion', ctx.rows('recuperacion')).filter((r) => r.volume != null && r.yeast > 0);
    const M = B.mermaPlan(ctx);
    if (rows.length < 8) return vacio(UI, 'Recuperación de cerveza', '', 'Se necesitan al menos 8 recuperaciones en el periodo.');
    const yOk = rows.filter((r) => r.yieldPct != null && r.yieldPct > 20 && r.yieldPct < 110);
    const volumen = sum(vals(rows, 'volume')), pond = (volumen / sum(vals(rows, 'yeast'))) * 100;
    const h = yOk.filter((r) => r.hours != null);
    const stats = An1.stats([
      An1.stat('Cerveza recuperada', `${fmt(volumen, 0)} Hl`, `${fmt(rows.length, 0)} recuperaciones · rendimiento ${fmt(pond, 0)} %`),
      An1.stat('Frente a la merma de FV', M.loss ? `${fmt((volumen / M.loss) * 100, 0)} %` : '—', 'hay que confirmar si la merma ya descuenta esta cerveza', 'warn'),
      An1.stat('Pasaron de 72 h', `${fmt((rows.filter((r) => r.over72).length / rows.length) * 100, 0)} %`, 'tiempo máximo del procedimiento', 'warn'),
    ]);
    if (h.length < 12) return UI.card('Recuperación de cerveza', 'Rendimiento y tiempo de espera.', stats + UI.vacio('Pocas recuperaciones con horas registradas para comparar el rendimiento.'));
    const hs = h.map((r) => r.hours), c1 = q(hs, 1 / 3), c2 = q(hs, 2 / 3);
    const grupos = [[`Hasta ${fmt(c1, 0)} h`, h.filter((r) => r.hours <= c1)], [`${fmt(c1, 0)} a ${fmt(c2, 0)} h`, h.filter((r) => r.hours > c1 && r.hours <= c2)], [`Más de ${fmt(c2, 0)} h`, h.filter((r) => r.hours > c2)]];
    const sp = S.spearman(hs, h.map((r) => r.yieldPct));
    const buenos = grupos.slice(0, 2).flatMap((g) => g[1]), malos = grupos[2][1];
    const yb = mean(vals(buenos, 'yieldPct')), ym = mean(vals(malos, 'yieldPct'));
    const extra = sum(malos.map((r) => Math.max(0, (yb - r.yieldPct) / 100) * r.yeast));
    const real = sp && sp.p < 0.05 && sp.r < 0, l = `Rendimiento de cada recuperación (cerveza recuperada ÷ levadura procesada) según las horas que pasaron hasta recuperar. ` +
      (real ? `Más espera = menos rendimiento (ρ = ${fmt(sp.r, 2)}, p = ${pTxt(sp.p)}): pasa de <b>${fmt(yb, 0)} %</b> a <b>${fmt(ym, 0)} %</b> cuando se superan ${fmt(c2, 0)} h. Con el rendimiento de las recuperaciones rápidas se habrían recuperado <b>${fmt(extra, 0)} Hl más</b> en este periodo. <b>Qué hacer:</b> recuperar dentro de ${fmt(c2, 0)} h (programar la recuperación al planear el trasiego) y priorizar las que llevan más horas esperando.` : `No hay una relación clara entre las horas y el rendimiento en este periodo.`) +
      ` Solo ${fmt(h.length, 0)} de ${fmt(rows.length, 0)} recuperaciones tienen horas registradas.`;
    return UI.card('Recuperación de cerveza', 'Cuánta cerveza se rescata de la levadura y qué hace bajar el rendimiento.',
      stats + An1.tarjeta(UI, 'Rendimiento según el tiempo de espera', 'Rendimiento promedio (%) por tercio de horas hasta recuperar.',
        C.bars({ w: W.full, h: 260, unit: '%', toolbar: true, id: 'ch-pl-rec', data: grupos.map((g, i) => ({ label: `${g[0]} (${g[1].length})`, value: r1(mean(vals(g[1], 'yieldPct'))), color: i === 2 ? WARN : EST })) }), l, { tono: real ? 'warn' : '' }));
  }

  /* ======================= 4. Aseos y operarios ======================= */
  const normOp = (s) => String(s || '').toUpperCase().replace(/\./g, '').replace(/SEBASTIAN/g, 'SEBAS').replace(/\s+/g, ' ').trim();
  function aseosOperarios(ctx, UI) {
    const all = An1.sane('aseos', ctx.rows('aseos'));
    const conM3 = all.filter((r) => r.m3 != null && r.m3 > 0 && r.equipment);
    if (conM3.length < 60) return vacio(UI, 'Aseos y operarios', '', 'Se necesitan al menos 60 aseos con m³ registrado en el periodo.');
    const porEq = new Map(); conM3.forEach((r) => { if (!porEq.has(r.equipment)) porEq.set(r.equipment, []); porEq.get(r.equipment).push(r.m3); });
    const medEq = new Map([...porEq].filter(([, v]) => v.length >= 10).map(([k, v]) => [k, med(v)]));
    const rel = conM3.filter((r) => medEq.has(r.equipment) && normOp(r.operator)).map((r) => ({ op: normOp(r.operator), rel: r.m3 / medEq.get(r.equipment), m3: r.m3, ex: Math.max(0, r.m3 - medEq.get(r.equipment)) }));
    const ops = new Map(); rel.forEach((r) => { if (!ops.has(r.op)) ops.set(r.op, []); ops.get(r.op).push(r); });
    const lista = [...ops].filter(([, v]) => v.length >= 25).map(([k, v]) => ({ k, n: v.length, rel: mean(v.map((x) => x.rel)), m3: sum(v.map((x) => x.m3)) })).sort((a, b) => b.rel - a.rel);
    const sinOp = all.filter((r) => !normOp(r.operator)).length, pSin = all.length ? (sinOp / all.length) * 100 : 0;
    const exTot = sum(rel.map((x) => x.ex)), A_ = B.aguaPlan(ctx), pctAgua = A_ && A_.m3 ? (exTot / A_.m3) * 100 : null;
    let cardOp;
    if (lista.length < 3) cardOp = vacio(UI, 'Agua por aseo según el operario', '', 'Pocos operarios con 25 aseos o más.');
    else {
      const cmp = S.compareGroups(Object.fromEntries(lista.map((x) => [x.k, ops.get(x.k).map((y) => y.rel)]))), d = An1.difGrupos(cmp);
      const alto = lista[0], bajo = lista[lista.length - 1];
      const l = `Cada barra es cuánta más (+) o menos (−) agua usa cada operario por aseo, comparado con lo normal <b>del mismo equipo</b>. ${d && d.ok ? `Hay diferencia real entre operarios (${d.test}, p = ${pTxt(d.p)}): ` : 'Las diferencias podrían ser casualidad: '}va de ${fmt((bajo.rel - 1) * 100, 0)} % (${esc(bajo.k)}) a +${fmt((alto.rel - 1) * 100, 0)} % (${esc(alto.k)}). ` +
        `<b>Pero no es dónde está el agua:</b> todo el exceso de aseos sobre lo normal de su equipo suma ${fmt(exTot, 0)} m³${pctAgua != null ? `, apenas ${fmt(pctAgua, 1)} % del agua medida` : ''}. <b>Qué hacer:</b> compartir con el equipo cómo asean los operarios de menor consumo, pero poner el esfuerzo en el agua que no es de aseos (ver arriba).` +
        (pSin > 5 ? ` Además, ${fmt(pSin, 0)} % de los aseos no tienen operario y hay nombres escritos de varias formas (por ejemplo «IVAN / SEBAS» e «IVAN / SEBASTIAN»), lo que impide comparar bien.` : '');
      cardOp = An1.tarjeta(UI, 'Agua por aseo según el operario', 'Diferencia frente a lo normal del mismo equipo (%). Operarios con 25 aseos o más.',
        C.barsH({ w: W.half, h: Math.max(240, lista.length * 28 + 50), unit: '%', toolbar: true, id: 'ch-pl-ops', data: lista.map((x) => ({ label: `${x.k} (${x.n})`, value: r1((x.rel - 1) * 100), color: x.rel > 1.04 ? WARN : x.rel < 0.97 ? POS : MUTED })), refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: d && d.ok ? 'warn' : '' });
    }
    const eqs = [...porEq].map(([k, v]) => ({ equipo: k, n: v.length, m3: r1(sum(v)), med: r1(med(v)), cv: r1((S.sd(v) / mean(v)) * 100) })).sort((a, b) => b.m3 - a.m3).slice(0, 10);
    const tot = sum(conM3.map((r) => r.m3));
    const cardEq = UI.card('Equipos que más agua usan en aseos', `Los 10 primeros suman ${fmt((sum(eqs.map((e) => e.m3)) / tot) * 100, 0)} % del agua que anotan los aseos. «Variación» alta = el mismo aseo gasta cosas distintas cada vez, se puede estandarizar.`,
      UI.tabla([{ k: 'equipo', t: 'Equipo' }, An1.colNum('n', 'Aseos', 0), An1.colNum('m3', 'm³ totales', 0), An1.colNum('med', 'm³ por aseo (mediana)', 1), An1.colNum('cv', 'Variación (%)', 0)], eqs, { id: 'tb-pl-eq', nombre: 'equipos-agua-aseos', sort: { k: 'm3', dir: -1 }, max: 10 }));
    return cardOp + cardEq;
  }

  /* ======================= 5. Trasiegos ======================= */
  function trasiegos(ctx, UI) {
    const all = An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > -24 && r.delay < 72 && r.actualEnd);
    const hoy = Date.now(), rs = all.filter((r) => r.actualEnd <= hoy && r.actualEnd >= hoy - 365 * DAY);
    if (rs.length < 40) return vacio(UI, 'Trasiegos', '', 'Se necesitan al menos 40 trasiegos terminados.');
    const g = new Map(); rs.forEach((r) => { const k = mesKey(r.actualEnd); if (!g.has(k)) g.set(k, []); g.get(k).push(r.delay); });
    const meses = [...g].filter(([, v]) => v.length >= 8).sort((a, b) => a[0] - b[0]).slice(-10);
    const retrasados = rs.filter((r) => r.delay > 2), sinCausa = retrasados.filter((r) => !r.cause || /sin causa/i.test(r.cause)).length;
    const pSin = retrasados.length ? (sinCausa / retrasados.length) * 100 : 0, pRet = (retrasados.length / rs.length) * 100;
    const pico = meses.slice().sort((a, b) => med(b[1]) - med(a[1]))[0], ult = meses.slice(-3).flatMap(([, v]) => v);
    const mejora = pico && ult.length >= 10 && med(pico[1]) - med(ult) > 3;
    const l = `Cada mes, la mitad de los trasiegos terminó con menos del retraso de la barra azul y el 75 % con menos del de la barra ocre (horas frente al fin planeado). ` +
      `En total, <b>${fmt(pRet, 0)} %</b> de los trasiegos terminan con más de 2 h de retraso. ` +
      (mejora ? `El peor mes fue <b>${mesLabel(pico[0])}</b> (mediana ${fmt(med(pico[1]), 1)} h) y los últimos 3 meses van en ${fmt(med(ult), 1)} h: <b>algo mejoró y conviene saber qué</b> (disponibilidad de tanques o UTK, turnos, programación) para sostenerlo. ` : '') +
      `<b>${fmt(pSin, 0)} %</b> de los trasiegos retrasados no tienen causa registrada. <b>Qué hacer:</b> exigir la causa cuando el retraso pase de 2 h (tanque no disponible, falla, espera de personal); sin eso no se puede saber qué mejorar ni proyectar.`;
    return An1.tarjeta(UI, 'Retraso de los trasiegos mes a mes', 'Horas de retraso frente al fin planeado (mediana y 75 %). Últimos 12 meses, sin importar el filtro.',
      C.bars({ w: W.full, h: 280, unit: 'h', toolbar: true, id: 'ch-pl-tras', categories: meses.map(([k]) => mesLabel(k)), series: [{ name: 'Mediana', values: meses.map(([, v]) => r1(med(v))), color: EST }, { name: '75 % de los trasiegos', values: meses.map(([, v]) => r1(q(v, 0.75))), color: WARN }] }), l, { tono: pSin > 70 ? 'warn' : '' });
  }

  let ERR = { m: null, a: null };

  /* ======================= 6. Proyección con su margen de error ======================= */
  function proyeccion(ctx, UI) {
    // --- Merma FV: prueba hacia atrás mes a mes ---
    const fv = fvHist(ctx), mm = new Map(); fv.forEach((r) => { const k = mesKey(r.t); if (!mm.has(k)) mm.set(k, []); mm.get(k).push(r); });
    const ks = [...mm.keys()].sort((a, b) => a - b), tM = [];
    for (let i = 3; i < ks.length; i++) {
      const te = mm.get(ks[i]); if (te.length < 15 || i === ks.length - 1 && new Date().getMonth() === ks[i] % 12) continue;
      const tr = ks.slice(0, i).flatMap((k) => mm.get(k)), g = rate(tr) / 100, bc = (b, c) => { const x = tr.filter((r) => r.brand === b && r.cls === c); return x.length >= 8 ? rate(x) / 100 : g; };
      tM.push({ k: ks[i], real: sum(vals(te, 'loss')), glob: g * sum(vals(te, 'input')), bc: sum(te.map((r) => r.input * bc(r.brand, r.cls))) });
    }
    // --- Agua: prueba hacia atrás mes a mes ---
    const ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null);
    const dias = An1.porPeriodo(ag, 'day').filter((d) => d.rows.length >= 3).map((d) => ({ t: d.t, y: sum(vals(d.rows, 'total')), a: sum(vals(d.rows, 'aseos')) }));
    const am = new Map(); dias.forEach((d) => { const k = mesKey(d.t); if (!am.has(k)) am.set(k, []); am.get(k).push(d); });
    const kA = [...am.keys()].sort((a, b) => a - b), tA = [];
    for (let i = 3; i < kA.length; i++) {
      const te = am.get(kA[i]); if (te.length < 25) continue;
      const prev = kA.slice(0, i).flatMap((k) => am.get(k)), u30 = prev.slice(-30);
      tA.push({ k: kA[i], real: sum(te.map((d) => d.y)), prom: mean(prev.map((d) => d.y)) * te.length, u30: mean(u30.map((d) => d.y)) * te.length });
    }
    const err = (xs, k) => mean(xs.map((x) => Math.abs((x[k] - x.real) / x.real) * 100));
    const eM = tM.length >= 3 ? err(tM, 'bc') : null, eMg = tM.length >= 3 ? err(tM, 'glob') : null;
    const eA = tA.length >= 3 ? Math.min(err(tA, 'prom'), err(tA, 'u30')) : null, mejorA = tA.length >= 3 ? (err(tA, 'u30') < err(tA, 'prom') ? 'u30' : 'prom') : null;
    // Los aseos ya no explican el agua diaria: R² fuera de muestra (últimos 90 días)
    let r2 = null;
    if (dias.length > 150) {
      const tr = dias.slice(0, -90), te = dias.slice(-90), lr = S.linreg(tr.map((d) => d.a), tr.map((d) => d.y));
      if (lr) { const mu = mean(te.map((d) => d.y)), sst = sum(te.map((d) => (d.y - mu) ** 2)), sse = sum(te.map((d) => (d.y - lr.predict(d.a)) ** 2)); r2 = sst > 0 ? 1 - sse / sst : null; }
    }
    // --- Proyección de los próximos 30 días ---
    const fin = fv.length ? fv[fv.length - 1].t : null, ult = fin ? fv.filter((r) => r.t > fin - 30 * DAY) : [];
    const gAll = fv.length ? rate(fv) / 100 : null;
    const bcAll = (b, c) => { const x = fv.filter((r) => r.brand === b && r.cls === c); return x.length >= 8 ? rate(x) / 100 : gAll; };
    const proyM = ult.length >= 10 ? sum(ult.map((r) => r.input * bcAll(r.brand, r.cls))) : null;
    const proyA = dias.length >= 30 ? mean(dias.slice(-30).map((d) => d.y)) * 30 : null;
    ERR = { m: eM, a: eA };
    const rango = (v, e) => (v == null || e == null ? '' : `${fmt(v * (1 - e / 100), 0)} a ${fmt(v * (1 + e / 100), 0)}`);
    const stats = An1.stats([
      An1.stat('Próximos 30 días · merma FV', proyM != null ? `${fmt(proyM, 0)} Hl` : '—', eM != null ? `rango ${rango(proyM, eM)} Hl · error típico ±${fmt(eM, 0)} %` : 'sin historia suficiente'),
      An1.stat('Próximos 30 días · agua', proyA != null ? `${fmt(proyA, 0)} m³` : '—', eA != null ? `rango ${rango(proyA, eA)} m³ · error típico ±${fmt(eA, 0)} %` : 'sin historia suficiente'),
      An1.stat('Supuesto', 'Todo sigue igual', 'mismo volumen y mezcla de marcas del último mes, sin cambios de proceso'),
    ]);
    const cM = tM.length >= 3 ? An1.tarjeta(UI, 'Merma FV: ¿qué tan bien se habría proyectado?', 'Cada mes se predice solo con los meses anteriores, desde el cuarto mes (prueba hacia atrás). Hl.',
      C.bars({ w: W.half, h: 260, unit: 'Hl', toolbar: true, id: 'ch-pl-bt-m', categories: tM.map((x) => mesLabel(x.k)), series: [{ name: 'Real', values: tM.map((x) => Math.round(x.real)), color: INK }, { name: 'Predicho (marca y tanque)', values: tM.map((x) => Math.round(x.bc)), color: EST }] }),
      `Conocer la marca y el tamaño de tanque de cada lote baja el error medio de ${fmt(eMg, 0)} % (tasa global) a <b>${fmt(eM, 0)} %</b>. ${eM > 10 ? `Un error de ±${fmt(eM, 0)} % al mes es lo mejor que dan hoy los datos: <b>sirve para fijar un rango, no una cifra</b>. Para bajarlo hace falta medir mejor (ver «Qué datos faltan»).` : 'Es un error razonable para planear.'}`) : '';
    const cA = tA.length >= 3 ? An1.tarjeta(UI, 'Agua: ¿qué tan bien se habría proyectado?', 'Cada mes se predice solo con los anteriores (prueba hacia atrás). m³.',
      C.bars({ w: W.half, h: 260, unit: 'm³', toolbar: true, id: 'ch-pl-bt-a', categories: tA.map((x) => mesLabel(x.k)), series: [{ name: 'Real', values: tA.map((x) => Math.round(x.real)), color: INK }, { name: mejorA === 'u30' ? 'Predicho (últimos 30 días)' : 'Predicho (promedio histórico)', values: tA.map((x) => Math.round(x[mejorA])), color: EST }] }),
      `El mejor método simple (${mejorA === 'u30' ? 'repetir los últimos 30 días' : 'el promedio histórico'}) se equivoca <b>${fmt(eA, 0)} %</b> en promedio al mes. ` + (r2 != null && r2 < 0.2 ? `Además, el número de aseos <b>ya no explica el agua diaria</b> (R² = ${fmt(r2, 2)} en los últimos 90 días): usar el plan de aseos para proyectar hoy no mejora la cifra. <b>Qué hacer:</b> proyectar con el promedio reciente y revisar por qué se rompió la relación.` : '')) : '';
    return UI.card('Proyección y qué tan confiable es', 'Qué se puede esperar los próximos 30 días y cuánto margen de error tiene, medido contra lo que habría pasado en meses anteriores.',
      stats + UI.grid([cM, cA].filter(Boolean), 2) + (cM || cA ? '' : UI.vacio('Se necesitan al menos 3 meses completos de historia.')));
  }

  /* ======================= 7. Qué datos faltan ======================= */
  function datosFaltan(ctx, UI) {
    const hoy = Date.now(), reciente = (rs) => rs.filter((r) => r.t != null && r.t <= hoy && r.t >= hoy - 365 * DAY);
    const aseos = reciente(An1.sane('aseos', ctx.todas('aseos'))), agua = reciente(An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid)), rec = reciente(An1.sane('recuperacion', ctx.todas('recuperacion')));
    const lev = reciente(An1.sane('lev', ctx.todas('lev'))), fvAll = reciente(An1.sane('merma', ctx.todas('merma')).filter((r) => r.phase === 'FV' && r.input > 0));
    const svAll = reciente(An1.sane('merma', ctx.todas('merma')).filter((r) => r.phase === 'SV' && r.input > 0 && r.loss != null));
    const tr = reciente(An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > 2 && r.actualEnd));
    const pc = (n, d) => (d ? (n / d) * 100 : null);
    const fila = (area, dato, v, para, accion) => ({ area, dato, v: v == null ? null : An1.round(v, 0), para, accion });
    const rows = [
      fila('Merma', 'Volumen de cada purga / pérdida', pc(fvAll.filter((r) => r.purges > 0).length, fvAll.length), 'Explicar el 75 % de merma que hoy no tiene origen. Sin esto no se puede ni atacar ni proyectar la merma.', 'Registrar Hl de cada purga, trasiego y arrastre de levadura por lote.'),
      fila('Merma', 'Balance de maduración (SV) coherente', svAll.length ? 100 - pc(svAll.filter((r) => r.loss < 0).length, svAll.length) : null, 'Hoy casi la mitad de los lotes de SV «gana» volumen: ese balance no sirve para decidir.', 'Medir con el mismo método la entrada y la salida del tanque SV.'),
      fila('Aseos', 'm³ de agua por aseo', pc(aseos.filter((r) => r.m3 != null).length, aseos.length), 'Saber cuánta agua gasta cada aseo completo (hoy los aseos explican solo ~14 % del agua).', 'Leer el contador al iniciar y al terminar cada aseo.'),
      fila('Aseos', 'Operario', pc(aseos.filter((r) => normOp(r.operator)).length, aseos.length), 'Comparar operarios y entrenar. Los nombres también están escritos de varias formas.', 'Usar una lista fija de operarios en la captura.'),
      fila('Agua', 'Producción / Hl procesados por turno', pc(agua.filter((r) => r.production > 0).length, agua.length), 'Calcular m³ por Hl y saber si el consumo sube por producir más o por desperdicio.', 'Registrar los Hl producidos en cada turno en la planilla de agua.'),
      fila('Trasiego', 'Causa del retraso', pc(tr.filter((r) => r.cause && !/sin causa/i.test(r.cause)).length, tr.length), 'Saber por qué se retrasan los trasiegos y proyectar la ocupación de tanques.', 'Pedir causa obligatoria cuando el retraso pase de 2 h.'),
      fila('Recuperación', 'Horas hasta recuperar', pc(rec.filter((r) => r.hours != null).length, rec.length), 'Controlar el tiempo de espera que baja el rendimiento.', 'Registrar la fecha y hora de la recuperación siempre.'),
      fila('Levadura', 'Etanol de la levadura', pc(lev.filter((r) => r.etanol != null).length, lev.length), 'Seguir la calidad de la levadura de forma más completa.', 'Medir etanol en cada colecta, o dejar de pedir el campo.'),
    ].filter((r) => r.v != null).sort((a, b) => a.v - b.v);
    if (!rows.length) return '';
    const tono = (v) => (v < 50 ? 'bad' : v < 80 ? 'warn' : 'ok');
    const tabla = UI.tabla([{ k: 'area', t: 'Área' }, { k: 'dato', t: 'Dato' }, { k: 'v', t: 'Completo', num: true, f: (v) => UI.badge(`${fmt(v, 0)} %`, tono(v)) }, { k: 'para', t: 'Para qué sirve y qué hacer', f: (v, r) => `${esc(v)}<br><b>Qué hacer:</b> ${esc(r.accion)}` }], rows, { id: 'tb-pl-faltan', nombre: 'datos-que-faltan', sort: { k: 'v', dir: 1 }, max: 10 });
    const nuevos = ['<b>Plan de producción por turno</b> (Hl y marcas por día): es lo único que permite proyectar merma y agua con un plan y no con el promedio del pasado.',
      '<b>Lectura de contador de agua por aseo</b> (inicio y fin) y sub-contadores por zona (pisos, GEA, CIP): separa fuga de consumo real.',
      '<b>Método y hora de medición</b> del volumen de entrada y de salida de cada tanque, y fecha de la última calibración de medidores.',
      '<b>Registro de cada pérdida</b> (purga, espuma, arrastre, derrame) con volumen y causa.',
      '<b>Causa de cada retraso</b> de trasiego y disponibilidad de tanques/UTK.'];
    return UI.card('Qué datos faltan para proyectar mejor', 'Qué tan completo está cada dato clave (últimos 12 meses) y qué se desbloquea al completarlo.',
      tabla + `<p class="an-sub">Datos nuevos que más ayudarían, en orden</p><ol class="an-plan-l an-plan-n">${nuevos.map((x) => `<li><div>${x}</div></li>`).join('')}</ol>` +
      UI.lectura(`Con lo que hoy se registra, el mes siguiente se proyecta con un error de ${ERR.a != null ? `±${fmt(ERR.a, 0)} % en agua` : 'margen desconocido en agua'} y ${ERR.m != null ? `±${fmt(ERR.m, 0)} % en merma` : 'margen desconocido en merma'}. Bajar el de la merma requiere los datos de arriba, no un modelo más sofisticado.`, 'warn'));
  }

  /* ======================= Registro ======================= */
  B.fvHist = fvHist; B.rate = rate; B.mesKey = mesKey; B.mesLabel = mesLabel;
  B.errProy = (ctx) => An1.memo(ctx, 'planErrProy', () => { const stub = { card: () => '', grid: () => '', vacio: () => '', lectura: () => '', badge: () => '', tabla: () => '' }; try { proyeccion(ctx, stub); } catch (e) { /* sin datos */ } return Object.assign({}, ERR); });
  A.PlanExtra = A.PlanExtra || [];
  A.PlanExtra.push((ctx, UI) => sec('Qué cambió y qué no explica la merma', 'plan-s-cambio') + cambioMerma(ctx, UI) + noExplica(ctx, UI));
  A.PlanExtra.push((ctx, UI) => sec('Recuperación, aseos y trasiegos', 'plan-s-rec') + recuperacion(ctx, UI) + aseosOperarios(ctx, UI) + trasiegos(ctx, UI));
  A.PlanExtra.push((ctx, UI) => sec('Proyección y datos que faltan', 'plan-s-proy') + proyeccion(ctx, UI) + datosFaltan(ctx, UI));

  A.PlanPasos = A.PlanPasos || [];
  A.PlanPasos.push((ctx) => {
    const out = [], rows = fvHist(ctx);
    const sem = An1.porPeriodo(rows, 'week').filter((p) => p.rows.length >= 3).map((p) => ({ t: p.t, y: rate(p.rows) }));
    const cp = sem.length >= 12 ? S.changePoint(sem.map((s) => s.y)) : null;
    if (cp && cp.p < 0.05 && Math.abs(cp.delta) >= 0.4) out.push({ t: `Averiguar qué cambió la semana del ${AN.fmtDate(sem[cp.idx].t)}`, d: `La merma de FV pasó de ${fmt(cp.meanBefore, 1)} % a ${fmt(cp.meanAfter, 1)} % en toda la planta. Documentar la causa y sostenerla.`, tag: 'Merma' });
    const M = B.mermaPlan(ctx);
    if (M.rs && M.rs.length >= 40) { const rsd = S.sd(M.rs.map((r) => r.resPct)), noise = ((rsd || 0) / 100) * med(vals(M.rs, 'input')); if (noise > 50) out.push({ t: 'Validar los medidores de flujo y de nivel', d: `Entre lotes iguales la merma varía ±${fmt(noise, 0)} Hl sin causa visible: parece ruido de medición. Medir 10 lotes con dos métodos y comparar.`, tag: 'Merma' }); }
    return out;
  });
})();
