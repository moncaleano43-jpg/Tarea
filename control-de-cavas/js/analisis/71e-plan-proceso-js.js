/* ============================================================
   71e-plan-proceso.js · Pestaña «Proceso y levadura»: qué hacer con lo que muestran la fermentación y la levadura
   Velocidad frente a la generación · viabilidad y descarte · cambios en el tiempo · cumplimiento por marca.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.An1 || !A.Analisis || !A.Charts || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, C = A.Charts, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, W, DAY } = An1;
  const WARN = 'var(--warn,#a26a14)', NEG = 'var(--neg,#b0442e)', POS = 'var(--pos,#3b7a59)', EST = 'var(--est,#5d6f8c)', MUTED = 'var(--muted,#8a8a84)';
  const r1 = (v) => An1.round(v, 1);
  const sg = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v > 0 ? '+' : '') + fmt(v, d));
  const pTxt = (p) => (p == null ? '—' : p < 0.001 ? 'menor que 0,001' : fmt(p, 3));
  const vacio = (UI, t, msg) => UI.card(t, '', UI.vacio(msg));
  const GEN_BINS = [[0, 3, '1 a 3'], [4, 5, '4 y 5'], [6, 7, '6 y 7'], [8, 99, '8 o más']];

  /* ---------- Fermentación y levadura de TODO el histórico (las relaciones necesitan muestra grande) ---------- */
  function datos(ctx) {
    return An1.memo(ctx, 'planProc', () => {
      const f = An1.sane('ferm', ctx.todas('ferm')).filter((r) => r.h75 != null && r.brand), lev = An1.sane('lev', ctx.todas('lev')).filter((r) => r.gen != null);
      const bm = {}; new Set(f.map((r) => r.brand)).forEach((b) => { bm[b] = med(vals(f.filter((r) => r.brand === b), 'h75')); });
      const rows = f.map((r) => ({ ...r, res75: r.h75 - bm[r.brand] })).sort((a, b) => a.t - b.t);
      return { f: rows, lev, bm };
    });
  }

  /* ======================= 1. Velocidad frente a la generación de levadura ======================= */
  function velocidadGen(ctx, UI) {
    const D = datos(ctx), rs = D.f.filter((r) => r.gen != null);
    if (rs.length < 80) return vacio(UI, 'Velocidad según la generación de levadura', 'Se necesitan al menos 80 fermentaciones con generación registrada.');
    const sp = S.spearman(rs.map((r) => r.gen), rs.map((r) => r.res75)), lr = S.linreg(rs.map((r) => r.gen), rs.map((r) => r.res75));
    const grupos = GEN_BINS.map(([a, b, label]) => ({ label, x: rs.filter((r) => r.gen >= a && r.gen <= b) })).filter((g) => g.x.length >= 8);
    // Por marca para ver si se repite en cada una
    const porMarca = [...new Set(rs.map((r) => r.brand))].map((b) => { const x = rs.filter((r) => r.brand === b); const s = x.length >= 40 ? S.spearman(x.map((r) => r.gen), x.map((r) => r.res75)) : null; return s ? { b, r: s.r, p: s.p, n: x.length } : null; }).filter(Boolean);
    const real = sp && sp.p < 0.05 && lr && lr.p < 0.05;
    const todasIgual = porMarca.length >= 2 && porMarca.filter((m) => m.r < 0).length === porMarca.length;
    const l = `Horas hasta 75 % de atenuación frente a la mediana de la marca (− = más rápido), según la generación de la levadura. ` +
      (real ? `Cada generación adicional se asocia a <b>${fmt(Math.abs(lr.b), 1)} h ${lr.b < 0 ? 'menos' : 'más'}</b> (ρ = ${fmt(sp.r, 2)}, p ${sp.p < 0.001 ? 'menor que 0,001' : '= ' + fmt(sp.p, 3)})` + (porMarca.length ? `; ${todasIgual ? 'se repite en todas las marcas' : 'en cada marca: ' + porMarca.map((m) => `${esc(m.b)} ${fmt(m.r, 2)}${m.p < 0.05 ? '*' : ''}`).join(', ')}` : '') + '. ' : 'No hay una relación clara entre la generación y la velocidad. ') +
      (real && lr.b < 0 ? `<b>Qué hacer:</b> la levadura de generación media y alta no hace más lenta la fermentación; no hay motivo de velocidad para renovarla antes. Como los fermentadores son el cuello de botella, la velocidad solo se convierte en tanques liberados si el plan se ajusta al tiempo real de fermentación, no a un tiempo fijo. ` : '') +
      `<b>Cautela:</b> es una asociación; las generaciones altas también tienen otro manejo (cantidad sembrada, tiempos) que no se registra.`;
    return An1.tarjeta(UI, 'Velocidad según la generación de levadura', 'Horas hasta 75 % frente a la mediana de la marca. Todo el histórico.',
      C.bars({ w: W.half, h: 280, unit: 'h', toolbar: true, id: 'ch-pr-gen', data: grupos.map((g) => ({ label: `Generación ${g.label} (${g.x.length})`, value: r1(mean(vals(g.x, 'res75'))), color: mean(vals(g.x, 'res75')) < 0 ? POS : WARN })), refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: real ? 'ok' : '' });
  }

  /* ======================= 2. Viabilidad y descarte ======================= */
  function viabilidad(ctx, UI) {
    const D = datos(ctx), lev = D.lev.filter((r) => r.viab != null);
    if (lev.length < 60) return vacio(UI, 'Viabilidad de la levadura', 'Se necesitan al menos 60 registros de levadura.');
    const meta = ctx.metas.get('levadura.viabMin', 95);
    const gens = [...new Set(lev.map((r) => r.gen))].sort((a, b) => a - b).filter((g) => lev.filter((r) => r.gen === g).length >= 5);
    const fila = gens.map((g) => { const x = lev.filter((r) => r.gen === g); return { g, n: x.length, viab: mean(vals(x, 'viab')), min: S.quantile(vals(x, 'viab'), 0.1), bajo: (x.filter((r) => r.viab < meta).length / x.length) * 100 }; });
    const lr = S.linreg(lev.map((r) => r.gen), lev.map((r) => r.viab)), sp = S.spearman(lev.map((r) => r.gen), lev.map((r) => r.viab));
    const fv = D.f.filter((r) => r.viab != null), sv = fv.length > 80 ? S.spearman(fv.map((r) => r.viab), fv.map((r) => r.res75)) : null;
    const piso = S.quantile(vals(lev, 'viab'), 0.02), pBajo = (lev.filter((r) => r.viab < meta).length / lev.length) * 100;
    const estado = ['utilizada', 'vaciada', 'descartada', 'inventario'].map((st) => { const x = lev.filter((r) => r.state === st); return x.length ? { st, n: x.length, gen: mean(vals(x, 'gen')), viab: mean(vals(x, 'viab')) } : null; }).filter(Boolean);
    const desc = estado.filter((e) => e.st === 'descartada' || e.st === 'vaciada'), uti = estado.find((e) => e.st === 'utilizada');
    const l = `La viabilidad baja <b>${fmt(Math.abs(lr.b), 2)} puntos por generación</b> (ρ = ${fmt(sp.r, 2)}), pero se mantiene alta: el promedio de la generación ${fila[fila.length - 1].g} es ${fmt(fila[fila.length - 1].viab, 1)} %. ` +
      `${fmt(pBajo, 0)} % de los lotes de levadura quedan bajo la meta de ${fmt(meta, 0)} %. ` +
      (sv && Math.abs(sv.r) < 0.1 ? `Y <b>la viabilidad no se relaciona con la velocidad de fermentación</b> (ρ = ${fmt(sv.r, 2)}), dentro del rango observado (el 98 % de los cultivos está entre ${fmt(piso, 0)} y 99 %). ` : '') +
      (desc.length && uti ? `En la práctica la levadura se retira alrededor de la generación ${fmt(mean(desc.map((e) => e.gen)), 1)} y ${fmt(mean(desc.map((e) => e.viab)), 1)} % de viabilidad, frente a ${fmt(uti.gen, 1)} y ${fmt(uti.viab, 1)} % de la que se sigue usando. ` : '') +
      `<b>Qué hacer:</b> con estos datos no se ve que una viabilidad entre ${fmt(piso, 0)} y 99 % cambie el resultado, así que la regla de descarte se puede basar en la generación y en una viabilidad mínima fijada con el equipo de calidad, no en una cifra heredada. Registrar también el volumen sembrado permitiría saber si el efecto de la generación es real.`;
    return An1.tarjeta(UI, 'Viabilidad de la levadura por generación', 'Viabilidad promedio (%) de cada generación y el nivel bajo el que cae 1 de cada 10 lotes. Todo el histórico.',
      C.line({ w: W.half, h: 280, unit: '%', xType: 'linear', xFmt: (v) => 'Gen ' + v, toolbar: true, id: 'ch-pr-viab', series: [{ name: 'Promedio', points: fila.map((x) => ({ x: x.g, y: r1(x.viab) })) }, { name: 'Percentil 10 (1 de cada 10 lotes está por debajo)', color: 'var(--faint,#c9c9c3)', dashed: true, dots: false, points: fila.map((x) => ({ x: x.g, y: r1(x.min) })) }], refs: [{ y: meta, label: `Meta ${fmt(meta, 0)} %`, color: NEG }] }), l, { tono: '' });
  }

  /* ======================= 3. Cambios de velocidad en el tiempo ======================= */
  function cambios(ctx, UI) {
    const D = datos(ctx), rs = D.f;
    if (rs.length < 100) return vacio(UI, 'Velocidad de fermentación en el tiempo', 'Se necesitan al menos 100 fermentaciones.');
    const mm = new Map(); rs.forEach((r) => { const k = B.mesKey(r.t); if (!mm.has(k)) mm.set(k, []); mm.get(k).push(r.res75); });
    const meses = [...mm].filter(([, v]) => v.length >= 15).sort((a, b) => a[0] - b[0]);
    const cp = S.changePoint(rs.map((r) => r.res75)), real = cp && cp.p < 0.05 && Math.abs(cp.delta) >= 1.5, t0 = real ? rs[cp.idx].t : null;
    const peor = meses.slice().sort((a, b) => mean(b[1]) - mean(a[1]))[0], mejor = meses.slice().sort((a, b) => mean(a[1]) - mean(b[1]))[0];
    const l = `Cada barra es cuánto tardaron en promedio las fermentaciones del mes frente a lo normal de su marca. El mes más lento fue <b>${B.mesLabel(peor[0])}</b> (${sg(mean(peor[1]), 1)} h) y el más rápido <b>${B.mesLabel(mejor[0])}</b> (${sg(mean(mejor[1]), 1)} h). ` +
      (real ? `Hay un cambio de nivel claro desde el ${esc(AN.fmtDate(t0))}: ${sg(cp.delta, 1)} h (probabilidad de casualidad ${fmt(cp.p, 3)}). <b>Qué hacer:</b> averiguar qué cambió esa fecha (levadura, receta, temperatura de control, equipo).` : `No hay un cambio de nivel sostenido: la variación entre meses es de unas pocas horas y se mueve alrededor de lo normal.`);
    return An1.tarjeta(UI, 'Velocidad de fermentación mes a mes', 'Horas hasta 75 % frente a la mediana de su marca (− = más rápido). Todo el histórico.',
      C.bars({ w: W.half, h: 280, unit: 'h', toolbar: true, id: 'ch-pr-mes', categories: meses.map(([k]) => B.mesLabel(k)), series: [{ name: 'Promedio del mes', values: meses.map(([, v]) => r1(mean(v))), color: EST }], refs: [{ y: 0, label: '', dashed: false }] }), l, { tono: real ? 'warn' : '' });
  }

  /* ======================= 4. Cumplimiento por marca ======================= */
  function cumplimiento(ctx, UI) {
    if (!An1.fermR) return '';
    const R = An1.fermR(ctx);
    if (!R || !R.marcas || !R.marcas.length) return vacio(UI, 'Cumplimiento de especificación por marca', 'No hay fermentaciones en el periodo.');
    const pc = (v) => (v == null ? null : An1.round(v, 0));
    const filas = R.marcas.filter((m) => m.n >= 3).map((m) => ({ marca: m.marca, n: m.n, eo: m.eo.mean != null ? An1.round(m.eo.mean, 2) : null, eoD: pc(m.eo.dentro), h75: m.h75.med != null ? An1.round(m.h75.med, 1) : null, h75D: pc(m.h75.dentro), rdf: m.rdf.med != null ? An1.round(m.rdf.med, 2) : null, rdfD: pc(m.rdf.dentro), atten: m.atten != null ? An1.round(m.atten, 1) : null, viab: m.viab != null ? An1.round(m.viab, 1) : null }));
    if (!filas.length) return '';
    const todos = []; filas.forEach((f) => [['E. original', f.eoD], ['Tiempo a 75 %', f.h75D], ['Extracto final', f.rdfD]].forEach(([v, d]) => { if (d != null) todos.push({ marca: f.marca, v, d }); }));
    const peor = todos.sort((a, b) => a.d - b.d)[0];
    const badge = (v) => (v == null ? '—' : UI.badge(`${fmt(v, 0)} %`, v >= 90 ? 'ok' : v >= 75 ? 'warn' : 'bad'));
    const lentos = R.marcas.filter((m) => m.n >= 3 && m.h75.lim && m.h75.lim.sup != null && m.h75.med != null && m.h75.med > m.h75.lim.sup);
    const sistem = lentos.length >= 2 && filas.filter((f) => f.h75D != null && f.h75D < 10).length >= Math.max(2, filas.length - 1);
    const l = sistem ? `<b>Casi ninguna fermentación cumple el tiempo a 75 % en ninguna marca</b> (${filas.filter((f) => f.h75D != null).map((f) => esc(f.marca) + ' ' + fmt(f.h75D, 0) + ' %').join(', ')}). La mediana real supera el límite en ${lentos.map((m) => esc(m.marca) + ' ' + fmt(m.h75.med - m.h75.lim.sup, 0) + ' h').join(', ')}. Eso encaja con que los lotes se pasan del tiempo permitido en el fermentador (ver «Tanques»). <b>Antes de actuar, confirmar</b> desde qué momento cuenta la hoja esas horas (llenado o tiempo cero); si es desde el llenado, la fermentación real es más lenta de lo especificado; una posible causa es la temperatura de fermentación, que no se registra.` : peor && peor.d < 90 ? `El cumplimiento más bajo es <b>${esc(peor.marca)} en ${peor.v.toLowerCase()}</b> (${fmt(peor.d, 0)} % dentro de especificación). <b>Qué hacer:</b> revisar primero esa combinación; las columnas «dentro» son el porcentaje de fermentaciones que cumple el límite de la hoja ESPECIFICACIONES MARCA.` : 'Todas las marcas cumplen sus límites en el periodo.';
    return UI.card('Cumplimiento de especificación por marca', 'Porcentaje de fermentaciones dentro de los límites del Excel, en el periodo y marca elegidos arriba.',
      UI.tabla([{ k: 'marca', t: 'Marca' }, An1.colNum('n', 'Fermentaciones', 0), An1.colNum('eo', 'E.O. medio (°P)', 2), { k: 'eoD', t: 'E.O. dentro', num: true, f: badge }, An1.colNum('h75', 'Horas a 75 % (mediana)', 1), { k: 'h75D', t: '75 % dentro', num: true, f: badge }, An1.colNum('rdf', 'Extracto final (°P)', 2), { k: 'rdfD', t: 'Final dentro', num: true, f: badge }, An1.colNum('atten', 'Atenuación (%)', 1), An1.colNum('viab', 'Viabilidad (%)', 1)], filas, { id: 'tb-pr-marca', nombre: 'cumplimiento-marca', sort: { k: 'marca', dir: 1 }, max: 10 }) + UI.lectura(l, (sistem || (peor && peor.d < 90)) ? 'warn' : 'ok'));
  }

  /* ======================= 5. Levadura: estado y generación ======================= */
  function inventario(ctx, UI) {
    const D = datos(ctx), lev = D.lev;
    if (lev.length < 40) return '';
    const gens = [...new Set(lev.map((r) => r.gen))].sort((a, b) => a - b), n = lev.length;
    const alta = lev.filter((r) => r.gen >= 7).length, util = lev.filter((r) => r.state === 'utilizada').length;
    const fam = [...new Set(lev.map((r) => r.fam).filter(Boolean))].map((f) => { const x = lev.filter((r) => r.fam === f); return x.length >= 10 ? { f, n: x.length, gen: mean(vals(x, 'gen')), viab: mean(vals(x, 'viab')) } : null; }).filter(Boolean).sort((a, b) => a.viab - b.viab);
    const l = `De ${fmt(n, 0)} cultivos de levadura, ${fmt(util, 0)} se usaron y ${fmt((alta / n) * 100, 0)} % llegó a la generación 7 o más. ` +
      (fam.length >= 4 ? `Las familias con menor viabilidad promedio son <b>${fam.slice(0, 3).map((x) => `${esc(x.f)} (${fmt(x.viab, 1)} %, gen ${fmt(x.gen, 1)})`).join(', ')}</b>, y también son las de generación más alta: la diferencia es de edad, no de familia. ` : '') +
      `<b>Qué hacer:</b> si se quiere mantener la viabilidad sobre la meta, el lugar para actuar es el número de generaciones que se reutiliza cada cultivo; los datos de hoy no muestran que una familia sea mejor que otra.`;
    return An1.tarjeta(UI, 'Cuántas veces se reutiliza la levadura', 'Cultivos de levadura por generación.',
      C.bars({ w: W.half, h: 260, unit: '', toolbar: true, id: 'ch-pr-inv', data: gens.map((g) => ({ label: `Gen ${g}`, value: lev.filter((r) => r.gen === g).length, color: g >= 7 ? WARN : EST })) }), l);
  }

  function render(ctx, UI) {
    return `<p class="an-lead-s">Qué hacer con lo que muestran la fermentación y la levadura. Las relaciones de generación, viabilidad y tiempo usan todo el histórico (necesitan muestra grande); el cumplimiento por marca sigue el periodo elegido arriba. Para la velocidad por tanque y la ocupación, ver «Tanques».</p>` +
      UI.grid([velocidadGen(ctx, UI), viabilidad(ctx, UI)], 2) + UI.grid([cambios(ctx, UI), inventario(ctx, UI)].filter(Boolean), 2) + cumplimiento(ctx, UI);
  }

  AN.registrar({ id: 'proceso', label: 'Proceso y levadura', orden: 4.5, render });
})();
