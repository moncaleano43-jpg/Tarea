/* ============================================================
   71b-plan-reduccion.js · «Dónde actuar»: qué hace subir la merma y el agua y cuánto se ahorraría atacando cada causa
   Cada gráfica responde a una decisión: mide una palanca en Hl o m³, dice dónde está y qué hacer.
   Todo se calcula con los datos del periodo y la marca elegidos arriba; no hay cifras fijas.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.An1 || !A.Analisis || !A.Charts || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, C = A.Charts, AN = A.Analisis;
  const { fmt, esc, iso } = AN;
  const { vals, sum, mean, med, W } = An1;
  const WARN = 'var(--warn,#a26a14)', NEG = 'var(--neg,#b0442e)', POS = 'var(--pos,#3b7a59)', EST = 'var(--est,#5d6f8c)', INK = 'var(--ink,#171717)', MUTED = 'var(--muted,#8a8a84)';
  const r1 = (v) => An1.round(v, 1);
  const capit = (t) => String(t).charAt(0) + String(t).slice(1).toLowerCase();
  const pl = (n, a, b) => `${fmt(n, 0)} ${n === 1 ? a : b}`;

  /* ======================= MERMA (fermentación) ======================= */
  // Solo FV: en maduración (SV) las purgas registradas superan a la merma y hay saldos negativos, así que ese balance no sirve para decidir.
  function mermaPlan(ctx) {
    return An1.memo(ctx, 'planMerma', () => {
      const base = (r) => r.phase === 'FV' && r.input > 0 && r.loss != null && r.lossPct != null;
      const hist = An1.sane('merma', ctx.todas('merma')).filter(base);
      const todos = An1.sane('merma', ctx.rows('merma')).filter(base);
      // Tamaño de cada tanque: se deduce del volumen que recibe normalmente (hay tanques de ~3.820 Hl y otros de ~4.500 Hl).
      const porTq = new Map();
      hist.forEach((r) => { if (r.tq != null) { if (!porTq.has(r.tq)) porTq.set(r.tq, []); porTq.get(r.tq).push(r.input); } });
      const cap = new Map([...porTq].map(([k, v]) => [k, med(v)]));
      const refCap = med([...cap.values()]);
      const clase = (tq) => (cap.has(tq) && cap.get(tq) > refCap * 1.08 ? 'grande' : 'normal');
      const habitual = { grande: med([...cap.values()].filter((v) => v > refCap * 1.08)), normal: med([...cap.values()].filter((v) => v <= refCap * 1.08)) };
      // Saldos fuera de -5 %…15 % se tratan como error de medición y no entran a las comparaciones.
      const valido = (r) => r.lossPct > -5 && r.lossPct < 15;
      const rs = todos.filter(valido).map((r) => { const c = clase(r.tq); return { ...r, cls: c, exc: r.input - (habitual[c] || 0) }; });
      const R = { n: rs.length, excluidos: todos.length - rs.length, habitual, rs };
      if (rs.length < 12) return R;
      const rate = (xs) => { const i = sum(vals(xs, 'input')); return i > 0 ? sum(vals(xs, 'loss')) / i : null; };
      R.input = sum(vals(rs, 'input')); R.loss = sum(vals(rs, 'loss')); R.tasa = (R.loss / R.input) * 100;
      R.lote = med(vals(rs, 'input'));
      R.purgas = sum(rs.map((r) => r.purges || 0)); R.sinExp = R.loss - R.purgas;
      R.pctSinExp = R.loss > 0 ? (R.sinExp / R.loss) * 100 : null;

      // --- Palanca 1: marca frente a las demás marcas en el mismo tipo de tanque ---
      R.marcas = [];
      const marcas = [...new Set(rs.map((r) => r.brand))];
      marcas.forEach((b) => {
        const mine = rs.filter((r) => r.brand === b); if (mine.length < 8) return;
        let exceso = 0, cubiertos = 0, esperado = 0;
        ['normal', 'grande'].forEach((c) => {
          const otros = rs.filter((r) => r.brand !== b && r.cls === c), mios = mine.filter((r) => r.cls === c);
          const f = rate(otros); if (otros.length < 8 || f == null || !mios.length) return;
          mios.forEach((r) => { exceso += r.loss - r.input * f; esperado += r.input * f; cubiertos += r.input; });
        });
        if (cubiertos > 0) R.marcas.push({ k: b, n: mine.length, tasa: rate(mine) * 100, ref: (esperado / cubiertos) * 100, exceso });
      });
      R.marcas.sort((a, b) => b.exceso - a.exceso);

      // --- Palanca 2: tanque grande frente al normal, con la misma marca ---
      let exG = 0, nG = 0; const detG = [];
      marcas.forEach((b) => {
        const g = rs.filter((r) => r.brand === b && r.cls === 'grande'), n = rs.filter((r) => r.brand === b && r.cls === 'normal');
        if (g.length < 8 || n.length < 8) return;
        const f = rate(n); const e = sum(vals(g, 'loss')) - sum(vals(g, 'input')) * f;
        detG.push({ marca: b, g: rate(g) * 100, n: f * 100, e }); exG += Math.max(0, e); nG += g.length;
      });
      R.grandes = detG.length ? { exceso: exG, n: nG, det: detG } : null;

      // --- Palanca 3: tanques que pierden más de lo que les toca por su marca y tamaño ---
      const rBC = new Map();
      const kBC = (r) => r.brand + '|' + r.cls;
      new Set(rs.map(kBC)).forEach((k) => { const xs = rs.filter((r) => kBC(r) === k); rBC.set(k, xs.length >= 5 ? rate(xs) : rate(rs.filter((r) => r.cls === xs[0].cls))); });
      rs.forEach((r) => { r.esp = r.input * rBC.get(kBC(r)); r.res = r.loss - r.esp; r.resPct = (r.res / r.input) * 100; });
      const tq = new Map(); rs.forEach((r) => { if (r.tq != null) { if (!tq.has(r.tq)) tq.set(r.tq, []); tq.get(r.tq).push(r); } });
      R.tanques = [...tq].filter(([, x]) => x.length >= 4).map(([k, x]) => {
        const p = x.map((r) => r.resPct), m = mean(p), sd = S.sd(p), z = sd > 0 ? m / (sd / Math.sqrt(p.length)) : 0;
        return { k: String(k), n: x.length, exceso: sum(x.map((r) => r.res)), pp: m, z, real: z > 2.5, cls: x[0].cls, tasa: rate(x) * 100 };
      }).sort((a, b) => b.exceso - a.exceso);
      R.exTanques = sum(R.tanques.filter((t) => t.exceso > 0).map((t) => t.exceso));
      R.nTanquesMal = R.tanques.filter((t) => t.exceso > 0 && t.z > 1.5).length;

      // --- Palanca 4: llenado por encima de lo habitual de su tipo de tanque ---
      const TR = [[-1e9, -30, 'Menos de −30'], [-30, -10, '−30 a −10'], [-10, 10, 'Habitual (±10)'], [10, 30, '+10 a +30'], [30, 50, '+30 a +50'], [50, 1e9, 'Más de +50']];
      R.llenado = TR.map(([a, b, label]) => { const x = rs.filter((r) => r.exc > a && r.exc <= b); return { label, n: x.length, tasa: x.length >= 4 ? rate(x) * 100 : null, x }; });
      const hab = rs.filter((r) => Math.abs(r.exc) <= 10), fHab = hab.length >= 15 ? rate(hab) : null;
      const sobre = rs.filter((r) => r.exc > 30);
      R.fHab = fHab != null ? fHab * 100 : null;
      R.nSobre = sobre.length; R.tasaSobre = sobre.length >= 8 ? rate(sobre) * 100 : null;
      // Se compara dentro de cada marca y tipo de tanque para no confundir el llenado con la marca (Light llena más y pierde más).
      let exL = 0, cubL = 0;
      marcas.forEach((b) => ['normal', 'grande'].forEach((c) => {
        const hi = sobre.filter((r) => r.brand === b && r.cls === c), ok = hab.filter((r) => r.brand === b && r.cls === c);
        if (hi.length >= 5 && ok.length >= 8) { exL += sum(vals(hi, 'loss')) - sum(vals(hi, 'input')) * rate(ok); cubL += hi.length; }
      }));
      const tt = sobre.length >= 8 && hab.length >= 8 ? S.ttest(sobre.map((r) => r.resPct), hab.map((r) => r.resPct)) : null;
      R.pLlenado = tt ? tt.p : null; R.llenadoReal = !!(tt && tt.p < 0.05 && tt.diff > 0 && exL > 0);
      R.exLlenado = cubL >= 8 ? Math.max(0, exL) : null;

      // --- Serie: purgas frente a merma sin explicar ---
      const by = ctx.rango.dias > 200 ? 'month' : 'week';
      R.by = by;
      R.per = An1.recorta(An1.porPeriodo(rs, by), by).map((p) => { const l = sum(vals(p.rows, 'loss')), pg = sum(p.rows.map((r) => r.purges || 0)); return { label: p.label, purgas: Math.max(0, pg), sinExp: l - Math.min(pg, Math.max(l, 0)), loss: l }; });

      // --- Palancas ordenadas (no son sumables: se solapan) ---
      R.palancas = [];
      R.marcas.filter((m) => m.exceso > 0 && m.tasa - m.ref >= 0.3).forEach((m) => R.palancas.push({ label: `${capit(m.k)} como las demás marcas`, value: m.exceso, color: WARN, nota: `${m.k} pierde ${fmt(m.tasa, 1)} % y las otras marcas en el mismo tipo de tanque ${fmt(m.ref, 1)} %` }));
      if (R.grandes && R.grandes.exceso > 0) R.palancas.push({ label: 'Tanques grandes como normales', value: R.grandes.exceso, color: WARN });
      if (R.exTanques > 0 && R.nTanquesMal) R.palancas.push({ label: `${R.nTanquesMal} tanque${R.nTanquesMal === 1 ? '' : 's'} que pierden de más`, value: R.tanques.filter((t) => t.exceso > 0 && t.z > 1.5).reduce((s, t) => s + t.exceso, 0), color: EST });
      if (R.llenadoReal && R.exLlenado) R.palancas.push({ label: 'Llenado: tope de +30 Hl', value: R.exLlenado, color: EST });
      R.palancas.sort((a, b) => b.value - a.value);
      return R;
    });
  }

  function renderMerma(ctx, UI) {
    const R = mermaPlan(ctx), out = [];
    if (R.n < 12) return UI.card('Merma en fermentación', '', UI.vacio('Se necesitan al menos 12 llenados de fermentación con merma calculada en el periodo. Prueba con «Todo el histórico».'));
    const top = R.palancas[0];
    out.push(An1.stats([
      An1.stat('Merma FV del periodo', `${fmt(R.loss, 0)} Hl`, `${fmt(R.tasa, 2)} % de ${fmt(R.input, 0)} Hl · ${fmt(R.loss / R.lote, 1)} lotes perdidos`),
      An1.stat('Sin explicación registrada', R.pctSinExp != null ? `${fmt(R.pctSinExp, 0)} %` : '—', `${fmt(R.sinExp, 0)} Hl que no están en ninguna purga`, R.pctSinExp > 50 ? 'warn' : ''),
      An1.stat('Mayor palanca', top ? `${fmt(top.value, 0)} Hl` : '—', top ? top.label : 'sin diferencias claras', top ? 'ok' : ''),
    ]));

    // 1. Palancas
    out.push((() => {
      if (!R.palancas.length) return UI.card('¿Qué atacar primero?', '', UI.vacio('Ninguna marca, tanque o nivel de llenado se separa lo suficiente del resto en este periodo.'));
      const pctT = (v) => fmt((v / R.loss) * 100, 0);
      const l = `Cada barra es la merma que se habría evitado en este periodo si esa causa se hubiera igualado a lo normal. <b>${esc(R.palancas[0].label)}</b> pesa más: ${fmt(R.palancas[0].value, 0)} Hl, ${pctT(R.palancas[0].value)} % de la merma (≈ ${fmt(R.palancas[0].value / R.lote, 1)} lotes). ` +
        `<b>No las sumes:</b> se solapan (una marca difícil en un tanque malo se cuenta en las dos). Sirven para ordenar el trabajo, no para prometer un ahorro exacto.`;
      return An1.tarjeta(UI, '¿Qué atacar primero? Merma que se evitaría con cada acción', 'Hl del periodo. Comparado siempre con lo que pasa en las mismas condiciones (misma marca o mismo tipo de tanque).',
        C.barsH({ w: W.full, h: Math.max(180, R.palancas.length * 46 + 50), unit: 'Hl', toolbar: true, id: 'ch-pl-palancas', data: R.palancas.map((p) => ({ label: p.label, value: An1.round(p.value, 0), color: p.color })) }), l, { tono: 'warn' });
    })());

    // 2. Tanques + marcas
    const cardTq = (() => {
      const t = R.tanques.filter((x) => x.exceso > 0).slice(0, 8);
      if (R.tanques.length < 3 || !t.length) return UI.card('Tanques para inspeccionar', '', UI.vacio('Se necesitan al menos 3 tanques con 4 llenados en el periodo.'));
      const reales = t.filter((x) => x.real);
      const l = `Cuánta merma de más tuvo cada tanque frente a lo que se esperaría por su marca y su tamaño. ` +
        (reales.length ? `<b>${reales.map((x) => 'TQ ' + x.k).join(', ')}</b> se separa${reales.length > 1 ? 'n' : ''} con evidencia fuerte (*): no es mala suerte. <b>Qué hacer:</b> revisar válvulas, sensor de nivel y mangueras de trasiego en ese tanque, y comparar con un tanque bueno.` :
          'Ninguno se separa con evidencia fuerte; las diferencias pueden ser azar. <b>Qué hacer:</b> no intervenir tanques todavía; vigilar los primeros de la lista el próximo periodo.');
      return An1.tarjeta(UI, 'Tanques para inspeccionar', 'Hl de más frente a lo esperado. * = diferencia real, no casualidad.',
        C.barsH({ w: W.half, h: Math.max(220, t.length * 30 + 50), unit: 'Hl', toolbar: true, id: 'ch-pl-tq', data: t.map((x) => ({ label: `${x.real ? '* ' : ''}TQ ${x.k} (${x.n} llenados)`, value: r1(x.exceso), color: x.real ? NEG : MUTED })) }), l, { tono: reales.length ? 'warn' : '' });
    })();
    const cardMarca = (() => {
      const m = R.marcas.filter((x) => x.n >= 8);
      if (m.length < 2) return UI.card('Marca contra marca', '', UI.vacio('Se necesitan al menos 2 marcas con 8 llenados.'));
      const mal = R.marcas.filter((x) => x.exceso > 0 && x.tasa - x.ref >= 0.3);
      const l = mal.length ? `${mal.map((x) => `<b>${esc(x.k)}</b> pierde ${fmt(x.tasa, 1)} % frente a ${fmt(x.ref, 1)} % de las demás marcas en los mismos tanques`).join('; ')}. <b>Qué hacer:</b> revisar qué cambia en esa marca (espuma al llenar, levadura, extracto, tiempo de llenado) y probar una corrección en 3 o 4 lotes seguidos.` : 'Ninguna marca pierde claramente más que las demás en los mismos tanques.';
      return An1.tarjeta(UI, 'Marca contra marca', 'Merma (%) de cada marca y la de las demás marcas en los mismos tanques.',
        C.bars({ w: W.half, h: 260, unit: '%', toolbar: true, id: 'ch-pl-marca', categories: m.map((x) => x.k), series: [{ name: 'La marca', values: m.map((x) => r1(x.tasa)), color: WARN }, { name: 'Las demás marcas, mismos tanques', values: m.map((x) => r1(x.ref)), color: EST }] }), l, { tono: mal.length ? 'warn' : '' });
    })();
    out.push(UI.grid([cardTq, cardMarca], 2));

    // 3. Llenado + grandes
    const cardLl = (() => {
      const d = R.llenado.filter((x) => x.tasa != null);
      if (d.length < 3 || R.fHab == null) return UI.card('Volumen de llenado', '', UI.vacio('Pocos llenados para comparar niveles.'));
      const util = R.llenadoReal;
      const l = `Merma según cuántos Hl se llenó por encima (+) o por debajo (−) de lo habitual de su tipo de tanque (${fmt(R.habitual.normal, 0)} Hl en los normales${R.habitual.grande ? `, ${fmt(R.habitual.grande, 0)} Hl en los grandes` : ''}). ` +
        (util ? `Pasarse más de 30 Hl sube la merma de ${fmt(R.fHab, 1)} % a ${fmt(R.tasaSobre, 1)} % y, comparando dentro de cada marca, serían unos <b>${fmt(R.exLlenado, 0)} Hl</b> de más (${R.nSobre} llenados; diferencia significativa, p = ${fmt(R.pLlenado, 3)}). <b>Qué hacer:</b> probar un tope de llenado durante unas semanas y ver si la merma baja; no darlo por hecho todavía.` :
          `<b>Posible factor, sin evidencia suficiente.</b> A simple vista los lotes muy llenos pierden más${R.tasaSobre != null ? ` (${fmt(R.tasaSobre, 1)} % frente a ${fmt(R.fHab, 1)} %)` : ''}, pero gran parte es porque son de Light, que ya pierde más. Comparando dentro de cada marca la diferencia ${R.pLlenado != null ? `no es estadísticamente clara (p = ${fmt(R.pLlenado, 2)})` : 'no se puede medir'}. <b>Qué hacer:</b> nada por ahora; se vigila.`);
      return An1.tarjeta(UI, 'Volumen de llenado', 'Merma (%) según el exceso de llenado sobre lo habitual.',
        C.bars({ w: W.half, h: 260, unit: '%', toolbar: true, id: 'ch-pl-llenado', data: d.map((x, i) => ({ label: `${x.label} (${x.n})`, value: r1(x.tasa), color: x.label.startsWith('+30') || x.label.startsWith('Más') ? WARN : MUTED })), refs: [{ y: r1(R.fHab), label: 'Habitual', dashed: true }] }), l, { tono: util ? 'warn' : '' });
    })();
    const cardGr = (() => {
      if (!R.grandes) return UI.card('Tanques grandes', '', UI.vacio('No hay marcas con 8 llenados en tanques grandes y en normales a la vez.'));
      const d = R.grandes.det, mal = R.grandes.exceso > 0;
      const l = `Misma marca, distinto tamaño de tanque: ` + d.map((x) => `<b>${esc(x.marca)}</b> pierde ${fmt(x.g, 1)} % en tanque grande y ${fmt(x.n, 1)} % en normal`).join('; ') + '. ' +
        (mal ? `Igualar los grandes a los normales evitaría ${fmt(R.grandes.exceso, 0)} Hl. <b>Qué hacer:</b> revisar si los tanques grandes tienen distinto sistema de trasiego o de nivel, y programar allí las marcas que menos pierden.` : 'Los tanques grandes no pierden más que los normales.');
      return An1.tarjeta(UI, 'Tanques grandes', 'Merma (%) por marca según el tamaño del tanque.',
        C.bars({ w: W.half, h: 260, unit: '%', toolbar: true, id: 'ch-pl-grandes', categories: d.map((x) => x.marca), series: [{ name: 'Tanque grande', values: d.map((x) => r1(x.g)), color: WARN }, { name: 'Tanque normal', values: d.map((x) => r1(x.n)), color: EST }] }), l, { tono: mal ? 'warn' : '' });
    })();
    out.push(UI.grid([cardLl, cardGr], 2));

    // 4. Sin explicar
    out.push((() => {
      if (R.per.length < 2) return '';
      const peor = R.pctSinExp != null && R.pctSinExp > 50;
      const l = `Cada barra separa la merma de cada ${An1.periodoTxt(R.by)} en lo que sí está en purgas registradas y lo que <b>no tiene explicación</b>. En total solo ${fmt(100 - (R.pctSinExp || 0), 0)} % está en purgas. ` +
        (peor ? `<b>Qué hacer:</b> es la primera acción de todas, porque sin saber por dónde sale la cerveza no se puede cerrar. Registrar el volumen de cada purga y de cada pérdida en trasiego, espuma y arrastre de levadura, y comparar el balance lote por lote durante 2 semanas.` : 'La mayor parte de la merma está respaldada por purgas registradas.');
      return An1.tarjeta(UI, 'Merma sin explicación', 'Hl por periodo: purgas registradas y merma que no aparece en ningún registro.',
        C.stacked({ w: W.full, h: 280, unit: 'Hl', toolbar: true, id: 'ch-pl-sinexp', categories: R.per.map((p) => p.label), series: [{ name: 'Purgas registradas', values: R.per.map((p) => r1(p.purgas)), color: EST }, { name: 'Sin explicación', values: R.per.map((p) => r1(p.sinExp)), color: NEG }] }), l, { tono: peor ? 'bad' : '' });
    })());

    const nota = R.excluidos ? `<p class="an-note"><b>Datos descartados</b> ${pl(R.excluidos, 'llenado', 'llenados')} con saldo fuera de −5 % a 15 % se trataron como error de medición. Solo se analiza fermentación (FV): en maduración (SV) las purgas registradas superan a la merma y hay saldos negativos, así que ese balance no permite decidir. Es la misma causa: falta medir bien lo que sale.</p>` : '';
    return out.join('') + nota;
  }

  /* ======================= AGUA ======================= */
  function aguaPlan(ctx) {
    return An1.memo(ctx, 'planAgua', () => {
      const rs = An1.sane('agua', ctx.rows('agua')).filter((r) => r.valid && r.total != null);
      const R = { n: rs.length, rs };
      if (rs.length < 20) return R;
      const tot = vals(rs, 'total');
      R.m3 = sum(tot); R.med = med(tot); R.p75 = S.quantile(tot, 0.75); R.p90 = S.quantile(tot, 0.9);
      R.comp = { pisos: sum(vals(rs, 'pisos')), cip: sum(vals(rs, 'cip')), gea: sum(vals(rs, 'gea')) };
      const m = (xs, k) => mean(vals(xs, k)) || 0;
      // Turnos pico
      const pico = rs.filter((r) => r.total >= R.p90), resto = rs.filter((r) => r.total < R.p90);
      R.pico = { n: pico.length, m3: sum(vals(pico, 'total')), pisos: m(pico, 'pisos'), cip: m(pico, 'cip'), gea: m(pico, 'gea'), aseos: m(pico, 'aseos') };
      R.resto = { pisos: m(resto, 'pisos'), cip: m(resto, 'cip'), gea: m(resto, 'gea'), aseos: m(resto, 'aseos') };
      R.exPico = sum(rs.map((r) => Math.max(0, r.total - R.p75)));
      R.exPicoMed = sum(rs.map((r) => Math.max(0, r.total - R.med)));
      R.peores = rs.slice().sort((a, b) => b.total - a.total).slice(0, 12).map((r) => ({ fecha: iso(r.t), turno: r.shift, pisos: r.pisos, cip: r.cip, gea: r.gea, total: r.total, aseos: r.aseos, exceso: r.total - R.med, source: r.source }));
      // Dosis-respuesta: m³ según número de aseos en el turno
      const g = new Map(); rs.filter((r) => r.aseos != null).forEach((r) => { const k = Math.min(6, Math.round(r.aseos)); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
      R.dosis = [...g].filter(([, x]) => x.length >= 5).sort((a, b) => a[0] - b[0]).map(([k, x]) => ({ k, n: x.length, pisos: m(x, 'pisos'), cip: m(x, 'cip'), gea: m(x, 'gea'), total: m(x, 'total') }));
      const lr = S.linreg(rs.filter((r) => r.aseos != null).map((r) => r.aseos), rs.filter((r) => r.aseos != null).map((r) => r.total));
      R.porAseo = lr && lr.p != null && lr.p < 0.05 ? lr.b : null;
      const sp = S.spearman(vals(rs, 'pisos'), vals(rs, 'gea')); R.rhoPG = sp && vals(rs, 'pisos').length === vals(rs, 'gea').length ? sp.r : null;
      // Aseos registrados frente al medidor
      const by = ctx.rango.dias > 200 ? 'month' : ctx.rango.dias > 30 ? 'week' : 'day';
      R.by = by;
      const per = An1.recorta(An1.porPeriodo(rs, by), by);
      const aseos = An1.sane('aseos', ctx.rows('aseos')).filter((r) => r.m3 != null);
      R.per = per.map((p, i) => {
        const hasta = i + 1 < per.length ? per[i + 1].t : Infinity;
        const aseoM3 = sum(vals(aseos.filter((a) => a.t >= p.t && a.t < hasta), 'm3'));
        const medidor = sum(vals(p.rows, 'total'));
        return { label: p.label, t: p.t, medidor, aseo: Math.min(aseoM3, medidor), resto: Math.max(0, medidor - aseoM3), n: p.rows.length, pisos: m(p.rows, 'pisos'), cip: m(p.rows, 'cip'), gea: m(p.rows, 'gea'), aseos: m(p.rows, 'aseos') };
      });
      R.aseoM3 = sum(R.per.map((p) => p.aseo)); R.medidorM3 = sum(R.per.map((p) => p.medidor));
      R.pctAseo = R.medidorM3 > 0 ? (R.aseoM3 / R.medidorM3) * 100 : null;
      R.nAseos = aseos.length;
      // Tendencia por componente (m³ por turno)
      const k = Math.min(3, Math.floor(R.per.length / 2));
      if (R.per.length >= 4 && k >= 1) {
        const a = R.per.slice(0, k), b = R.per.slice(-k), mm = (xs, key) => mean(xs.map((p) => p[key]));
        R.tend = ['pisos', 'cip', 'gea'].map((key) => ({ key, antes: mm(a, key), ahora: mm(b, key), cambio: mm(a, key) ? ((mm(b, key) - mm(a, key)) / mm(a, key)) * 100 : null }));
        R.tendAseos = { antes: mm(a, 'aseos'), ahora: mm(b, 'aseos') };
      }
      return R;
    });
  }

  function renderAgua(ctx, UI) {
    const R = aguaPlan(ctx), out = [];
    if (R.n < 20) return UI.card('Consumo de agua', '', UI.vacio('Se necesitan al menos 20 turnos con consumo en el periodo. Prueba con «Todo el histórico».'));
    const compTxt = { pisos: 'Pisos', cip: 'CIP', gea: 'GEA' };
    out.push(An1.stats([
      An1.stat('Agua del periodo', `${fmt(R.m3, 0)} m³`, `${fmt(R.med, 0)} m³ por turno (mediana)`),
      An1.stat('Explicada por aseos registrados', R.pctAseo != null ? `${fmt(R.pctAseo, 0)} %` : '—', R.pctAseo != null ? `${fmt(R.aseoM3, 0)} m³ de ${fmt(R.medidorM3, 0)} m³` : 'sin m³ en los aseos', R.pctAseo != null && R.pctAseo < 40 ? 'warn' : ''),
      An1.stat(`Agua por encima de ${fmt(R.p75, 0)} m³ por turno`, `${fmt(R.exPico, 0)} m³`, `${fmt((R.exPico / R.m3) * 100, 0)} % del total · es lo que se recortaría si ningún turno pasara de ahí`, 'ok'),
    ]));

    // 1. Turnos pico
    out.push((() => {
      const c = ['pisos', 'cip', 'gea'];
      const dif = c.map((k) => ({ k, d: R.pico[k] - R.resto[k] })).sort((a, b) => b.d - a.d);
      const principales = dif.filter((x) => x.d > 0.25 * Math.max(...dif.map((y) => y.d)) && x.d > 5);
      const l = `El 10 % de los turnos con más consumo (${R.pico.n} turnos, ≥ ${fmt(R.p90, 0)} m³) gastaron <b>${fmt((R.pico.m3 / R.m3) * 100, 0)} %</b> del agua. Frente a un turno normal, el consumo extra viene de <b>${principales.map((x) => `${compTxt[x.k]} (+${fmt(x.d, 0)} m³)`).join(' y ')}</b>` +
        (R.rhoPG != null && R.rhoPG > 0.8 && principales.some((x) => x.k === 'pisos') && principales.some((x) => x.k === 'gea') ? `; Pisos y GEA suben juntos (correlación ${fmt(R.rhoPG, 2)}), señal de que son el mismo evento: una limpieza grande de GEA junto con el lavado de pisos, o un mismo consumo medido dos veces.` : '.') +
        ` <b>Qué hacer:</b> sentarse con el jefe de turno a revisar los turnos de la tabla de abajo y responder qué se lavó; si es un aseo programado, repartirlo; si no hay causa, es fuga o manguera abierta.`;
      return An1.tarjeta(UI, '¿Qué tienen los turnos de más consumo?', 'Promedio de cada componente en un turno normal y en un turno pico (m³).',
        C.stacked({ w: W.half, h: 300, unit: 'm³', toolbar: true, id: 'ch-pl-pico', categories: ['Turno normal', 'Turno pico'], series: c.map((k, i) => ({ name: compTxt[k], values: [r1(R.resto[k]), r1(R.pico[k])], color: [EST, WARN, NEG][i] })) }), l, { tono: 'warn' });
    })());

    // 2. Dosis-respuesta
    const cardDosis = (() => {
      if (R.dosis.length < 3) return UI.card('Agua según aseos por turno', '', UI.vacio('Pocos turnos con número de aseos registrado.'));
      const hi = R.dosis[R.dosis.length - 1], lo = R.dosis.find((d) => d.k >= 3) || R.dosis[0], salto = R.dosis.length >= 2 ? hi.total - lo.total : 0;
      const l = `Consumo medio de un turno según cuántos aseos tuvo. ` + (R.porAseo != null ? `Cada aseo adicional se asocia a unos <b>${fmt(R.porAseo, 0)} m³</b> más por turno` + (R.aseoM3 && R.nAseos ? `, mucho más de los ${fmt(R.aseoM3 / R.nAseos, 1)} m³ que anota el propio aseo` : '') + '. ' : '') +
        (salto > 20 ? `Con ${hi.k}${hi.k >= 6 ? ' o más' : ''} aseos el turno llega a ${fmt(hi.total, 0)} m³ y sube sobre todo Pisos y GEA. <b>Qué hacer:</b> no acumular más de ${Math.max(lo.k, 4)} aseos en un mismo turno; mover los demás al turno de menor carga.` : 'No hay un salto claro al juntar muchos aseos.');
      return An1.tarjeta(UI, 'Agua según aseos en el turno', 'm³ promedio por turno según cuántos aseos hubo.',
        C.stacked({ w: W.half, h: 300, unit: 'm³', toolbar: true, id: 'ch-pl-dosis', categories: R.dosis.map((d) => `${d.k}${d.k >= 6 ? '+' : ''} aseos (${d.n})`), series: ['pisos', 'cip', 'gea'].map((k, i) => ({ name: compTxt[k], values: R.dosis.map((d) => r1(d[k])), color: [EST, WARN, NEG][i] })) }), l, { tono: salto > 20 ? 'warn' : '' });
    })();
    out.push(UI.grid([out.pop(), cardDosis], 2));

    // 3. Medidor vs aseos
    out.push((() => {
      if (R.per.length < 2 || R.pctAseo == null) return '';
      const baja = R.pctAseo < 40;
      const l = `Lo azul es el agua que los aseos registrados dicen haber usado; lo ocre, agua del medidor que <b>ningún registro explica</b>. Los aseos registrados explican ${fmt(R.pctAseo, 0)} % (${fmt(R.aseoM3, 0)} m³). ` +
        (baja ? `<b>Qué hacer:</b> o el m³ de cada aseo solo mide el enjuague y no el aseo completo (entonces hay que medir el agua total de cada aseo con un contador), o hay consumo fuera de los aseos (pisos, mangueras, fugas). Un aforo nocturno sin producción ni aseos lo aclara en una noche: lo que el medidor marque es fuga.` : 'La mayor parte del agua tiene un aseo que la respalda.');
      return An1.tarjeta(UI, 'Agua del medidor frente a lo que explican los aseos', `m³ por ${An1.periodoTxt(R.by)}.`,
        C.stacked({ w: W.full, h: 290, unit: 'm³', toolbar: true, id: 'ch-pl-medidor', categories: R.per.map((p) => p.label), series: [{ name: 'Explicada por aseos registrados', values: R.per.map((p) => r1(p.aseo)), color: EST }, { name: 'Sin explicación', values: R.per.map((p) => r1(p.resto)), color: WARN }] }), l, { tono: baja ? 'warn' : '' });
    })());

    // 4. Tendencia por componente
    out.push((() => {
      if (R.per.length < 3) return '';
      const sube = R.tend ? R.tend.filter((t) => t.cambio != null && t.cambio > 10).sort((a, b) => b.cambio - a.cambio) : [];
      const baja = R.tend ? R.tend.filter((t) => t.cambio != null && t.cambio < -10) : [];
      const l = `m³ por turno de cada componente en cada ${An1.periodoTxt(R.by)}. ` + (R.tend ? (sube.length ? `Lo que <b>está subiendo</b>: ${sube.map((t) => `${compTxt[t.key]} (+${fmt(t.cambio, 0)} %)`).join(', ')}. ` : 'Ningún componente sube más de 10 %. ') + (baja.length ? `Lo que bajó: ${baja.map((t) => `${compTxt[t.key]} (${fmt(t.cambio, 0)} %)`).join(', ')}. ` : '') +
        (R.tendAseos && Math.abs(R.tendAseos.ahora - R.tendAseos.antes) > 0.3 ? `Los aseos por turno pasaron de ${fmt(R.tendAseos.antes, 1)} a ${fmt(R.tendAseos.ahora, 1)}. ` : '') +
        (sube.length ? `<b>Qué hacer:</b> investigar primero ${compTxt[sube[0].key]}: qué cambió en el procedimiento, el equipo o el caudal desde que empezó a subir. Si los aseos bajaron y ese componente subió, el agua por aseo está aumentando.` : '') : '');
      return An1.tarjeta(UI, '¿Qué está cambiando en el tiempo?', 'm³ promedio por turno y componente.',
        C.stacked({ w: W.full, h: 280, unit: 'm³', toolbar: true, id: 'ch-pl-tend', categories: R.per.map((p) => p.label), series: ['pisos', 'cip', 'gea'].map((k, i) => ({ name: compTxt[k], values: R.per.map((p) => r1(p[k])), color: [EST, WARN, NEG][i] })) }), l, { tono: sube.length ? 'warn' : '' });
    })());

    // 5. Turnos a revisar
    out.push(UI.card('Turnos para revisar con el jefe de turno', 'Los 12 turnos de mayor consumo del periodo. Para cada uno hay que responder: ¿qué se lavó y por qué gastó tanto?',
      UI.tabla([An1.colFecha('fecha', 'Fecha'), { k: 'turno', t: 'Turno' }, An1.colNum('pisos', 'Pisos', 0), An1.colNum('cip', 'CIP', 0), An1.colNum('gea', 'GEA', 0), An1.colNum('total', 'Total m³', 0), An1.colNum('exceso', 'Sobre lo normal', 0), An1.colNum('aseos', 'Aseos', 1)],
        R.peores.map((r) => ({ ...r, pisos: r1(r.pisos), cip: r1(r.cip), gea: r1(r.gea), total: r1(r.total), exceso: r1(r.exceso) })), { id: 'tb-pl-peores', nombre: 'turnos-mayor-consumo-agua', sort: { k: 'total', dir: -1 }, max: 12 })));
    return out.join('');
  }

  /* ======================= Plan resumido ======================= */
  function planResumen(ctx) {
    const M = mermaPlan(ctx), G = aguaPlan(ctx), pasos = [];
    if (M.palancas && M.palancas.length) {
      if (M.pctSinExp > 50) pasos.push({ t: 'Medir lo que hoy no se registra', d: `${fmt(M.pctSinExp, 0)} % de la merma de fermentación (${fmt(M.sinExp, 0)} Hl) no está en ninguna purga. Registrar volumen de cada purga, trasiego y arrastre de levadura.`, tag: 'Merma' });
      const p = M.palancas[0];
      pasos.push({ t: p.label, d: `${fmt(p.value, 0)} Hl del periodo (${fmt((p.value / M.loss) * 100, 0)} % de la merma, ≈ ${fmt(p.value / M.lote, 1)} lotes).`, tag: 'Merma', hl: p.value });
      const tq = M.tanques.filter((t) => t.real && t.exceso > 0).slice(0, 3);
      if (tq.length) pasos.push({ t: `Inspeccionar ${tq.map((t) => 'TQ ' + t.k).join(', ')}`, d: `Pierden de más con evidencia fuerte: ${fmt(sum(tq.map((t) => t.exceso)), 0)} Hl sobre lo esperado.`, tag: 'Merma' });
    }
    if (G.m3) {
      pasos.push({ t: 'Repartir los turnos pico de agua', d: `${fmt(G.exPico, 0)} m³ (${fmt((G.exPico / G.m3) * 100, 0)} % del agua) se gastan por encima de ${fmt(G.p75, 0)} m³ por turno. Revisar los ${G.peores.length} turnos de mayor consumo.`, tag: 'Agua', m3: G.exPico });
      if (G.pctAseo != null && G.pctAseo < 40) pasos.push({ t: 'Aforar el agua fuera de los aseos', d: `Los aseos registrados explican solo ${fmt(G.pctAseo, 0)} % del medidor. Un aforo nocturno sin producción separa fuga de consumo real.`, tag: 'Agua' });
    }
    (A.PlanPasos || []).forEach((f) => { try { (f(ctx) || []).forEach((x) => pasos.push(x)); } catch (e) { if (window.console) console.error('[Plan]', e); } });
    return pasos.sort((a, b) => (a.tag === 'Agua') - (b.tag === 'Agua'));
  }

  function renderPlan(ctx, UI) {
    const pasos = planResumen(ctx);
    const cab = pasos.length ? `<section class="an-card an-plan"><header class="an-card-h"><div><h3>Qué haría, en este orden</h3><p>Se recalcula con el periodo y la marca elegidos arriba.</p></div></header><div class="an-card-b"><ol class="an-plan-l">${pasos.map((p) => `<li><span class="an-plan-tag ${p.tag === 'Agua' ? 'agua' : ''}">${esc(p.tag)}</span><div><b>${esc(p.t)}</b><p>${esc(p.d)}</p></div></li>`).join('')}</ol></div></section>` : '';
    const extra = (A.PlanExtra || []).map((f) => { try { return f(ctx, UI) || ''; } catch (e) { if (window.console) console.error('[Plan]', e); return ''; } }).join('');
    const nav = `<nav class="an-plan-nav" aria-label="Ir a una sección">${[['plan-s-merma', 'Merma'], ['plan-s-agua', 'Agua'], ['plan-s-cambio', 'Qué cambió'], ['plan-s-rec', 'Recuperación, aseos y trasiegos'], ['plan-s-proy', 'Proyección y datos que faltan']].map(([id, t]) => `<button type="button" class="an-chip" data-go="${id}">${t}</button>`).join('')}</nav>`;
    return `${cab}${nav}<h2 class="an-sec" id="plan-s-merma">Merma · fermentación</h2>${renderMerma(ctx, UI)}<h2 class="an-sec" id="plan-s-agua">Agua</h2>${renderAgua(ctx, UI)}${extra}`;
  }

  const B = (A.PlanBase = { mermaPlan, aguaPlan, capit, pl });
  B.planResumen = planResumen;
  AN.registrar({
    id: 'plan', label: 'Dónde actuar', orden: 1.5, render: renderPlan,
    mount(ctx, el) { el.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { const t = document.getElementById(b.dataset.go); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; }); },
    hallazgos(ctx) {
      const out = [], M = mermaPlan(ctx);
      if (M.pctSinExp > 60) out.push({ sev: 'media', titulo: `${fmt(M.pctSinExp, 0)} % de la merma de fermentación no tiene explicación registrada`, detalle: `${fmt(M.sinExp, 0)} Hl no aparecen en ninguna purga. Ver «Dónde actuar».` });
      return out;
    },
  });
})();
