/* ============================================================
   71i-plan-analista.js · Pestaña «Informe del analista»
   Lo que haría un analista contratado para esto cada día: qué cambió desde la última visita, lo más importante hoy,
   dónde está la variación que todavía no se explica y qué dato nuevo ayudaría a predecir mejor,
   qué experimentos haría, qué preguntas llevaría a planta y un resumen para la reunión.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.PlanBase.lotesFx || !A.PlanBase.alertas || !A.An1 || !A.Analisis || !A.Charts || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, C = A.Charts, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, W, DAY } = An1;
  const WARN = 'var(--warn,#a26a14)', EST = 'var(--est,#5d6f8c)', MUTED = 'var(--muted,#8a8a84)', POS = 'var(--pos,#3b7a59)';
  const r1 = (v) => An1.round(v, 1);
  const lc = (t) => String(t).charAt(0).toLowerCase() + String(t).slice(1);
  const KEY = 'cavas.analista.v1';
  const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };

  /* ======================= Dónde está la variación que no explicamos ======================= */
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /** ω²: parte de la variación que se comparte dentro de cada grupo (corregida por el número de grupos). */
  function grupos(rs, gk, minn) {
    const g = new Map(); rs.forEach((r, i) => { if (r[gk] == null || r.y == null || !Number.isFinite(r.y)) return; if (!g.has(r[gk])) g.set(r[gk], []); g.get(r[gk]).push(i); });
    return [...g.values()].filter((v) => v.length >= minn);
  }
  function omega(ys, gr) {
    const N = sum(gr.map((v) => v.length)), k = gr.length; if (k < 3 || N - k < 10) return null;
    const all = [].concat(...gr).map((i) => ys[i]), gm = mean(all);
    const ssb = sum(gr.map((v) => v.length * (mean(v.map((i) => ys[i])) - gm) ** 2)), sst = sum(all.map((y) => (y - gm) ** 2)), msw = (sst - ssb) / (N - k);
    return Math.max(0, (ssb - (k - 1) * msw) / (sst + msw));
  }
  function evaluar(rs, gk, minn, perm) {
    const gr = grupos(rs, gk, minn), ys = rs.map((r) => r.y), w = omega(ys, gr);
    if (w == null) return null;
    let p = null;
    if (perm) { const el = [].concat(...gr), v = el.map((i) => ys[i]), R = rng(20260101 + el.length); let ge = 0; const B_ = 200; for (let b = 0; b < B_; b++) { for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = v[i]; v[i] = v[j]; v[j] = t; } const yy = ys.slice(); el.forEach((idx, q) => { yy[idx] = v[q]; }); if (omega(yy, gr) >= w - 1e-12) ge++; } p = (ge + 1) / (B_ + 1); }
    return { w, p };
  }
  const sem = (t) => Math.floor(t / (7 * DAY)), dia = (t) => Math.floor(t / DAY);

  function resultados(ctx) {
    return An1.memo(ctx, 'planAnalista', () => {
      const out = [], L = B.lotesFx(ctx).rows, M = B.modeloVel(ctx);
      const mk = (rows, f) => rows.map(f);
      // Velocidad: lo que queda después de los factores medidos
      if (M) {
        const b = M.fit.b, rs = mk(M.L, (r) => ({ y: r.v75 - (b[0] + b[1] * r.gen + b[2] * r.phL * 10 + b[3] * r.alm + b[4] * (r.G ? 1 : 0)), tq: r.tq, dia: dia(r.t), sem: sem(r.t), mes: B.mesKey(r.t) }));
        out.push({ k: 'vel', label: 'Velocidad de fermentación', r2: M.fit.r2, rs, falta: 'Temperatura del mosto al llenar, oxígeno disuelto, células sembradas por ml y la cocción de origen. Son cosas que cambian de un día a otro y hoy no se registran.', unidad: 'h' });
      }
      const simple = (k, label, field, falta, unidad, filt) => { const rs = L.filter((r) => r[field] != null && Number.isFinite(r[field]) && (!filt || filt(r))).map((r) => ({ y: r[field], tq: r.tq, dia: dia(r.t), sem: sem(r.t), mes: B.mesKey(r.t) })); if (rs.length >= 100) out.push({ k, label, r2: null, rs, falta, unidad }); };
      simple('arr', 'Arranque (horas a 15 %)', 'oArr', 'Oxígeno al llenar, temperatura del mosto y células sembradas por ml en el momento de la siembra.', 'h');
      simple('rdf', 'Extracto final', 'oRdf', 'Lote de malta y adjuntos, fermentabilidad del mosto (extracto límite del mosto) y calibración y analista del laboratorio.', '°P');
      simple('mer', 'Merma', 'oMerma', 'Nada del tanque, de la semana ni del día la explica: es ruido de medición. Dato que ayudaría: método, hora y fecha de calibración de cada lectura de volumen de entrada y salida.', 'pp');
      simple('est', 'Estancia en fermentador', 'oEst', 'Motivo de cada estancia (frío, espera de SV, plan) y fecha y hora reales en que termina la fermentación activa.', 'd');
      // Retraso de trasiegos
      const tr = An1.sane('trasiego', ctx.todas('trasiego')).filter((r) => r.kind === 'Trasiego' && r.delay != null && r.delay > -24 && r.delay < 72 && r.actualEnd && r.actualEnd <= Date.now() && r.actualEnd >= Date.now() - 400 * DAY);
      if (tr.length >= 100) out.push({ k: 'tra', label: 'Retraso de trasiegos', r2: null, unidad: 'h', rs: tr.map((r) => ({ y: r.delay, tq: (/UTQ[_ ]?(\d+)/i.exec(r.activity || '') || [])[1] || null, dia: dia(r.actualEnd), sem: sem(r.actualEnd), mes: B.mesKey(r.actualEnd) })), falta: 'Causa de cada retraso, quién estaba disponible y si el tanque o la UTK de destino estaba libre.' });
      // Agua diaria
      const ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null), dias = An1.porPeriodo(ag, 'day').filter((d) => d.rows.length >= 3);
      if (dias.length >= 100) out.push({ k: 'agu', label: 'Agua diaria', r2: null, unidad: 'm³', rs: dias.map((d) => ({ y: sum(vals(d.rows, 'total')), tq: null, dia: null, sem: sem(d.t), mes: B.mesKey(d.t) })), falta: 'Plan de producción y de aseos por turno y lectura de contador por zona (hoy hay unos 170 m³ por día sin actividad que los explique).' });
      out.forEach((o) => {
        o.g = { tq: evaluar(o.rs, 'tq', 3, false), dia: evaluar(o.rs, 'dia', 2, false), sem: evaluar(o.rs, 'sem', 3, false), mes: evaluar(o.rs, 'mes', 3, false) };
        const mejor = ['tq', 'dia', 'sem', 'mes'].filter((g) => o.g[g]).sort((a, b) => o.g[b].w - o.g[a].w)[0];
        o.mejor = mejor; if (mejor) { const e = evaluar(o.rs, mejor, mejor === 'dia' ? 2 : 3, true); o.p = e ? e.p : null; o.w = o.g[mejor].w; }
        o.real = !!(mejor && o.p != null && o.p < 0.01 && o.w >= 0.05);
        o.techo = o.real ? (o.r2 != null ? 1 - (1 - o.r2) * (1 - o.w) : o.w) : null;
      });
      return out;
    });
  }
  const NOMBRE = { tq: 'el tanque', dia: 'el mismo día', sem: 'la misma semana', mes: 'el mismo mes' };

  function dondeEsta(ctx, UI) {
    const R = resultados(ctx);
    if (!R.length) return UI.card('Dónde está lo que no vemos', '', UI.vacio('Se necesitan más datos de fermentación, trasiegos o agua.'));
    const cats = R.map((o) => o.label), serie = (g, name, color) => ({ name, color, values: R.map((o) => (o.g[g] ? r1(o.g[g].w * 100) : 0)) });
    const chart = C.bars({ w: W.full, h: 300, unit: '%', toolbar: true, id: 'ch-an-donde', categories: cats, series: [serie('tq', 'Se comparte en el tanque', MUTED), serie('dia', 'Se comparte el mismo día', WARN), serie('sem', 'Se comparte la misma semana', EST), serie('mes', 'Se comparte el mismo mes', 'var(--faint,#c9c9c3)')] });
    const reales = R.filter((o) => o.real), ruido = R.filter((o) => !o.real);
    const l = `Para cada resultado, después de descontar lo que ya sabemos explicar (marca, tamaño de tanque y los factores medidos), esta gráfica muestra <b>qué parte de lo que queda se parece entre lotes que comparten tanque, día, semana o mes</b>. Si es alta en un grupo, hay algo que cambia con ese grupo y que <b>hoy no se registra</b>. ` +
      (reales.length ? `Con estructura clara: ${reales.map((o) => `<b>${esc(lc(o.label))}</b> (${fmt(o.w * 100, 0)} % por ${NOMBRE[o.mejor].replace('el ', '')})`).join('; ')}. ` : '') +
      (ruido.length ? `Sin estructura: ${ruido.map((o) => `<b>${esc(lc(o.label))}</b>`).join(', ')}: lo que queda es ruido de medición o factores propios de cada lote. ` : '') +
      `<b>Qué hacer:</b> registrar el dato de la tabla de abajo para cada resultado con estructura; para los demás, lo único que mejora la predicción es medir mejor.`;
    const tabla = UI.tabla([{ k: 'res', t: 'Resultado' }, { k: 'r2', t: 'Se explica hoy', num: true, f: (v) => (v == null ? '—' : fmt(v * 100, 0) + ' %') }, { k: 'donde', t: 'Dónde está lo que falta' }, { k: 'techo', t: 'Podría llegar a', num: true, f: (v) => (v == null ? '—' : 'hasta ' + fmt(v * 100, 0) + ' %') }, { k: 'dato', t: 'Dato que ayudaría' }],
      R.map((o) => ({ res: o.label, r2: o.r2, donde: o.real ? ['tq', 'dia', 'sem', 'mes'].filter((g) => o.g[g] && o.g[g].w >= 0.05).sort((a, b) => o.g[b].w - o.g[a].w).map((g) => `${{ tq: 'Tanque', dia: 'Mismo día', sem: 'Misma semana', mes: 'Mismo mes' }[g]} ${fmt(o.g[g].w * 100, 0)} %`).join(' · ') + (o.g.tq && o.g.tq.w < 0.05 ? ' (no es del tanque)' : '') : 'Sin estructura (ruido)', techo: o.techo, dato: o.falta })), { id: 'tb-an-falta', nombre: 'datos-que-faltan-por-resultado', sort: { k: 'res', dir: 1 }, max: 10 });
    return UI.card('Dónde está lo que todavía no vemos', 'Parte (%) de la variación sin explicar que se comparte por tanque, día, semana o mes. Todo el histórico.', chart + UI.lectura(l, reales.length ? 'warn' : '') + tabla +
      UI.lectura('«Podría llegar a» es un techo optimista: supone que el dato nuevo explicaría toda la parte que se comparte por ese grupo. Sirve para ordenar qué registrar primero, no para prometer una precisión.', ''));
  }

  /* ======================= Qué experimentos haría ======================= */
  function experimentos(ctx, UI) {
    const M = B.modeloVel(ctx), E = (() => { try { return B.tanqueEngine(ctx); } catch (e) { return { lots: [] }; } })();
    const meses = (() => { const t = vals(E.lots || [], 't'); return t.length ? Math.max(1, (Math.max(...t) - Math.min(...t)) / DAY / 30) : 9; })(), porMes = (E.lots || []).length / meses || 50;
    const filas = [];
    if (M) {
      const N = M.L.length, mm = (i, nombre) => { const t = Math.abs(M.fit.b[i] / (M.fit.se[i] || 1)), n4 = N * (4 / t) ** 2; return { f: nombre, b: M.fit.b[i], t, n4, mes: Math.max(0, (n4 - N) / porMes) }; };
      [mm(3, 'Días que se guarda la levadura'), mm(2, 'pH de la levadura'), mm(1, 'Generación de la levadura')].forEach((x) => filas.push({ f: x.f, e: `${fmt(x.b, 1)} h por unidad`, t: x.t >= 4 ? 'Confirmado' : `${fmt(x.t, 1)}`, m: x.t >= 4 ? 'ya está' : `~${fmt(x.mes, 0)} meses más de registro` }));
    }
    const tab = filas.length ? UI.tabla([{ k: 'f', t: 'Factor' }, { k: 'e', t: 'Efecto estimado' }, { k: 't', t: 'Seguridad actual (t)' }, { k: 'm', t: 'Para estar seguro (t ≥ 4)' }], filas, { id: 'tb-an-exp', nombre: 'cuando-lo-sabremos', max: 5 }) : '';
    const items = [
      ['Levadura fresca', '¿Guardar la levadura más de 2 días hace más lenta la fermentación?', 'Registrar fecha y hora de colecta y de siembra de cada lote; durante 4 a 6 semanas, planear levadura de ≤ 2 días en la mitad de los lotes de cada marca.', 'Horas hasta 75 % de los dos grupos, dentro de cada marca.'],
      ['Temperatura de fermentación', '¿La temperatura explica por qué se pasan del tiempo permitido en el fermentador?', 'Lectura cada 6 horas por tanque durante 8 semanas y comparar con las horas hasta 75 % y con el límite de la hoja de especificaciones.', 'Relación entre temperatura y horas; tanques fuera del rango de temperatura que pide la hoja para cada marca.'],
      ['Dos métodos de medición', '¿La variación de ±80 Hl entre lotes iguales es de medición?', 'Medir 10 lotes con dos métodos (medidor de flujo y nivel de tanque) a la entrada y a la salida, por la misma persona.', 'Si los dos métodos difieren de un lote a otro tanto como la merma, el problema es de medición.'],
      ['Contador en las redes', '¿Cuánta agua usa de verdad cada aseo de red de mosto, anillos, red de cerveza y red de trasiego?', 'Leer el contador al iniciar y al terminar cada aseo de esas redes durante 2 semanas.', 'Si el consumo real coincide con los ≈ 33–52 m³ estimados por aseo.'],
      ['Cocción y malta de origen', '¿Qué hace que el extracto final cambie por semana?', 'Anotar con cada lote la cocción, el lote de malta y adjuntos, y quién y con qué equipo mide el extracto final.', 'Qué variable acompaña a los cambios semanales del extracto final.'],
    ];
    return UI.card('Qué experimentos haría esta semana', 'Cada uno responde una pregunta concreta con poco esfuerzo. En orden de prioridad.',
      `<ol class="an-plan-l an-plan-n">${items.map(([t, q, c, m]) => `<li><div><b>${esc(t)}</b> · ${esc(q)}<p><b>Cómo:</b> ${esc(c)}<br><b>Sabré que funcionó si:</b> ${esc(m)}</p></div></li>`).join('')}</ol>` +
      (tab ? `<p class="an-sub">Cuánto falta para estar seguro de lo que ya vemos (a ${fmt(porMes, 0)} lotes al mes)</p>${tab}` : ''));
  }

  /* ======================= Preguntas para planta ======================= */
  function preguntas(ctx) {
    const q = [];
    try {
      const fv = B.fvHist(ctx), sm = An1.porPeriodo(fv, 'week').filter((p) => p.rows.length >= 3).map((p) => ({ t: p.t, y: B.rate(p.rows) }));
      const cp = sm.length >= 12 ? S.changePoint(sm.map((x) => x.y)) : null;
      if (cp && cp.p < 0.05 && Math.abs(cp.delta) >= 0.4) q.push(['feb', `¿Qué se hizo distinto la semana del ${AN.fmtDate(sm[cp.idx].t)}, cuando la merma de FV pasó de ${fmt(cp.meanBefore, 1)} % a ${fmt(cp.meanAfter, 1)} % en toda la planta?`]);
    } catch (e) { /* sin datos */ }
    q.push(['rata', '¿Desde qué momento cuenta la hoja de especificaciones las horas de «Rata fermentación»: desde el llenado o desde el tiempo cero? Casi ninguna fermentación cumple ese límite.']);
    try {
      const E = B.tanqueEngine(ctx), X = E.T && E.T.length ? B.estanciaSpec(E) : null;
      if (X && X.marcas.length >= 2 && X.todas) q.push(['tfv', `¿Sigue vigente el «Tiempo máx en FV» de la hoja de especificaciones? Entre el ${fmt(Math.min(...X.marcas.map((m) => m.sobre)), 0)} y el ${fmt(Math.max(...X.marcas.map((m) => m.sobre)), 0)} % de los lotes se pasa.`]);
      const bajo = (E.T || []).filter((t) => t.occ != null && t.occ < 30 && t.nOcc >= 1).map((t) => t.tq);
      if (bajo.length >= 2) q.push(['tqs', `¿Los tanques de uso bajo (${bajo.join(', ')}) se reservan para otro uso o son capacidad ociosa?`]);
    } catch (e) { /* sin datos */ }
    q.push(['recup', '¿La merma de FV ya descuenta la cerveza que se recupera de la levadura? Si no la descuenta, la merma real es menor.']);
    q.push(['tras', '¿Qué pasaba en los meses de mayor retraso de los trasiegos (personal, disponibilidad de tanques o UTK, planificación) y qué cambió después?']);
    q.push(['m3', 'El «m³ por aseo» ¿se mide con contador o se calcula con caudal × minutos? Hoy parece un cálculo.']);
    q.push(['grande', '¿Qué hacen distinto los tanques grandes (29 a 32)? Fermentan varias horas más rápido que los normales.']);
    q.push(['lev', '¿Se puede registrar siempre la fecha y hora de colecta de la levadura y la cantidad sembrada?']);
    q.push(['ph', '¿Quién mide el pH de la levadura y con qué frecuencia? Más alto se asocia a fermentación más rápida.']);
    return q;
  }
  function renderPreguntas(ctx, UI) {
    const st = leer(), resp = st.resp || {}, q = preguntas(ctx);
    const fila = ([id, t]) => { const r = resp[id] || {}; return `<li class="an-q"><label class="sim-chk"><input type="checkbox" data-q="${id}" ${r.ok ? 'checked' : ''}><span>${esc(t)}</span></label><input type="text" class="an-q-n" data-qn="${id}" value="${esc(r.nota || '')}" placeholder="Respuesta o nota (se guarda solo en este navegador)" aria-label="Nota"></li>`; };
    const pend = q.filter(([id]) => !(resp[id] && resp[id].ok)).length;
    return UI.card('Preguntas que llevaría a planta', `${pend} de ${q.length} sin responder. Marca las que ya tengan respuesta y anota qué dijeron.`, `<ul class="an-q-l">${q.map(fila).join('')}</ul>`);
  }

  /* ======================= Desde la última visita ======================= */
  function instantanea(ctx) {
    const fv = B.fvHist(ctx), fin = fv.length ? fv[fv.length - 1].t : null, u = fin ? fv.filter((r) => r.t > fin - 28 * DAY) : [];
    const ag = An1.sane('agua', ctx.todas('agua')).filter((r) => r.valid && r.total != null), fa = ag.length ? Math.max(...vals(ag, 't')) : null, sa = fa ? ag.filter((r) => r.t > fa - 7 * DAY) : [];
    const al = B.alertas(ctx), E = (() => { try { return B.tanqueEngine(ctx); } catch (e) { return { T: [] }; } })();
    return { t: Date.now(), lotes: fv.length, merma28: u.length >= 8 ? B.rate(u) : null, agua7: sa.length >= 10 ? sum(vals(sa, 'total')) / 7 : null, alertas: al.filter((x) => x.sev === 'alta' || x.sev === 'media').length, vigilar: (E.T || []).filter((t) => t.st === 'ambar' || t.st === 'rojo').length, finFv: fin, finAg: fa };
  }
  function renderCambios(ctx, UI) {
    const cur = instantanea(ctx), st = leer(), base = st.last && Date.now() - st.last.t > 6 * 3600e3 ? st.last : st.prev;
    if (!base) return UI.card('Desde la última visita', 'Aquí aparecerá qué cambió desde que abriste este informe por última vez.', UI.vacio(st.last ? `Punto de partida guardado el ${AN.fmtDate(st.last.t)}. Cuando vuelvas a abrir este informe en otra jornada, te muestro qué cambió desde entonces.` : 'Es la primera visita: guardo hoy el punto de partida y la próxima vez te muestro qué cambió.'));
    const d = (a, b, bueno, dec = 1, u = '') => (a == null || b == null ? '<span class="an-delta">—</span>' : Math.abs(a - b) < Math.pow(10, -dec) / 2 ? '<span class="an-delta">sin cambio</span>' : `<span class="an-delta ${(bueno === 'baja') === (a < b) ? 'ok' : 'bad'}">${a > b ? '▲' : '▼'} ${fmt(Math.abs(a - b), dec)}${u}</span>`);
    const fila = (t, a, b, bueno, dec, u) => `<tr><td>${esc(t)}</td><td class="n"><b>${a == null ? '—' : fmt(a, dec) + u}</b></td><td class="n">${b == null ? '—' : fmt(b, dec) + u}</td><td class="n">${d(a, b, bueno, dec, u)}</td></tr>`;
    return UI.card(`Desde la última visita (${AN.fmtDate(base.t)})`, 'Qué cambió en los datos y en las alertas desde entonces.',
      `<div class="an-tabla"><div class="an-tabla-s"><table><thead><tr><th>Indicador</th><th class="n">Ahora</th><th class="n">Antes</th><th class="n">Cambio</th></tr></thead><tbody>${fila('Lotes de FV con merma calculada', cur.lotes, base.lotes, 'sube', 0, '')}${fila('Merma de FV, últimos 28 días', cur.merma28, base.merma28, 'baja', 2, ' %')}${fila('Agua por día, últimos 7 días', cur.agua7, base.agua7, 'baja', 0, ' m³')}${fila('Alertas altas y medias', cur.alertas, base.alertas, 'baja', 0, '')}${fila('Tanques por vigilar o revisar', cur.vigilar, base.vigilar, 'baja', 0, '')}</tbody></table></div></div>` +
      (cur.lotes === base.lotes && cur.finAg === base.finAg ? UI.lectura('No se han cargado datos nuevos desde la última visita.', '') : ''));
  }

  /* ======================= Lo de hoy ======================= */
  function hoy(ctx, UI) {
    const al = B.alertas(ctx), altas = al.filter((x) => x.sev === 'alta'), medias = al.filter((x) => x.sev === 'media'), bien = al.filter((x) => x.sev === 'ok'), pasos = B.planResumen ? B.planResumen(ctx) : [];
    const li = (x) => `<li><span class="an-badge ${x.sev === 'alta' ? 'bad' : x.sev === 'media' ? 'warn' : x.sev === 'ok' ? 'ok' : ''}">${x.sev === 'alta' ? 'Alta' : x.sev === 'media' ? 'Media' : x.sev === 'ok' ? 'Bien' : 'Info'}</span><div><b>${esc(x.titulo)}</b><p>${esc(x.detalle)}</p></div></li>`;
    const top = altas.concat(medias).slice(0, 5);
    const lista = top.length ? `<ul class="wk-al">${top.map(li).join('')}${bien.slice(0, 2).map(li).join('')}</ul>` : UI.vacio('Sin alertas: nada se sale de lo esperado hoy.');
    const ac = pasos.slice(0, 3).map((p) => `<li><div><b>${esc(p.t)}</b><p>${esc(p.d)}</p></div></li>`).join('');
    return UI.card('Lo más importante hoy', 'Las alertas más graves y las tres acciones que más importan.', lista + (ac ? `<p class="an-sub">Las tres acciones que más importan</p><ol class="an-plan-l an-plan-n">${ac}</ol>` : ''));
  }

  function resumenReunion(ctx) {
    const al = B.alertas(ctx).filter((x) => x.sev === 'alta' || x.sev === 'media').slice(0, 4), pasos = B.planResumen ? B.planResumen(ctx) : [], R = resultados(ctx).filter((o) => o.real);
    const st = leer(), resp = st.resp || {}, q = preguntas(ctx).filter(([id]) => !(resp[id] && resp[id].ok)).slice(0, 3);
    const L = ['INFORME DEL ANALISTA', '', 'ALERTAS'];
    if (al.length) al.forEach((x) => L.push(`- ${x.titulo}`)); else L.push('- Sin alertas.');
    L.push('', 'ACCIONES QUE MÁS IMPORTAN'); pasos.slice(0, 3).forEach((p, i) => L.push(`${i + 1}. ${p.t}`));
    L.push('', 'LO QUE NO VEMOS (datos que pido registrar)'); if (R.length) R.forEach((o) => L.push(`- ${o.label}: ${o.falta}`)); else L.push('- Nada con estructura clara.');
    L.push('', 'PREGUNTAS PARA PLANTA'); if (q.length) q.forEach(([, t]) => L.push(`- ${t}`)); else L.push('- Todas respondidas.');
    return L.join('\n');
  }

  function render(ctx, UI) {
    const hoyTxt = AN.fmtDate(Date.now());
    return `<div class="wk-cab"><div><span class="an-kicker">INFORME DEL ANALISTA</span><h2 class="wk-t">${esc(hoyTxt)}</h2><p>Lo que revisaría cada día: qué cambió, qué importa, dónde está lo que todavía no vemos y qué haría.</p></div>
      <div class="wk-btn" data-print-hide><button type="button" class="an-btn" data-an="print">Imprimir o guardar en PDF</button><button type="button" class="an-btn" data-an="copy">Copiar resumen para la reunión</button></div></div>` +
      renderCambios(ctx, UI) + hoy(ctx, UI) + dondeEsta(ctx, UI) + experimentos(ctx, UI) + renderPreguntas(ctx, UI);
  }

  function montar(ctx, el) {
    const st = leer(), cur = instantanea(ctx);
    if (!st.last || Date.now() - st.last.t > 6 * 3600e3) { st.prev = st.last || st.prev || null; st.last = cur; guardar(st); }
    el.querySelectorAll('[data-q]').forEach((c) => { c.onchange = () => { const s = leer(); s.resp = s.resp || {}; s.resp[c.dataset.q] = Object.assign({}, s.resp[c.dataset.q], { ok: c.checked }); guardar(s); }; });
    el.querySelectorAll('[data-qn]').forEach((i) => { i.onchange = () => { const s = leer(); s.resp = s.resp || {}; s.resp[i.dataset.qn] = Object.assign({}, s.resp[i.dataset.qn], { nota: i.value }); guardar(s); }; });
    el.querySelectorAll('[data-an]').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.an === 'print') { window.print(); return; }
        const txt = resumenReunion(ctx), orig = b.textContent;
        try { await navigator.clipboard.writeText(txt); b.textContent = 'Copiado ✓'; } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); b.textContent = 'Copiado ✓'; } catch (e2) { b.textContent = 'No se pudo copiar'; } ta.remove(); }
        setTimeout(() => { b.textContent = orig; }, 2200);
      };
    });
  }

  AN.registrar({ id: 'analista-dia', label: 'Informe del analista', orden: 1.1, render, mount: montar });
})();
