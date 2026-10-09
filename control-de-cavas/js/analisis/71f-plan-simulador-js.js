/* ============================================================
   71f-plan-simulador.js · Pestaña «Simulador» y valores en pesos
   Mueve palancas (estancia en FV, merma, agua, recuperación) y muestra cuántos lotes, Hl y m³ por mes se ganan,
   y su valor en pesos si se registran los precios. Todo parte de los datos reales del periodo elegido arriba.
   ============================================================ */
(function () {
  'use strict';
  const A = window.App;
  if (!A || !A.PlanBase || !A.PlanBase.tanqueEngine || !A.An1 || !A.Analisis || !A.Stats) return;
  const An1 = A.An1, S = A.Stats, AN = A.Analisis, B = A.PlanBase;
  const { fmt, esc } = AN;
  const { vals, sum, mean, med, DAY } = An1;
  const KEY_P = 'cavas.precios.v1', KEY_S = 'cavas.sim.v1';

  /* ---------- Precios (se guardan solo en este navegador) ---------- */
  const leer = (k, def) => { try { return Object.assign({}, def, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return Object.assign({}, def); } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const precios = { get: () => leer(KEY_P, { hl: null, margen: null, m3: null }), set: (p) => guardar(KEY_P, p) };
  let nf = null;
  const pesos = (v) => { try { nf = nf || new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }); return nf.format(Math.round(v)); } catch (e) { return '$ ' + fmt(v, 0); } };
  /** Texto con el valor en pesos de una cantidad, o '' si no hay precios. hl = Hl de cerveza perdida/rescatada; m3 = agua; cap = Hl de capacidad. */
  B.precios = precios; B.pesos = pesos;
  B.dinero = (o) => {
    const p = precios.get(); let t = 0, hay = false;
    if (o.hl && p.hl > 0) { t += o.hl * p.hl; hay = true; }
    if (o.m3 && p.m3 > 0) { t += o.m3 * p.m3; hay = true; }
    if (o.cap && p.margen > 0) { t += o.cap * p.margen; hay = true; }
    return hay ? pesos(t) : '';
  };

  const span = (rows, k = 't') => { const t = vals(rows, k); return t.length ? Math.max(1, (Math.max(...t) - Math.min(...t)) / DAY + 1) : 1; };

  /* ---------- Base: números reales del periodo ---------- */
  function base(ctx) {
    return An1.memo(ctx, 'planSim', () => {
      const M = B.mermaPlan(ctx), G = B.aguaPlan(ctx), E = B.tanqueEngine(ctx), X = E.T && E.T.length ? B.estanciaSpec(E) : null;
      const core = (E.T || []).filter((t) => t.occ != null && t.occ >= 50 && t.nOcc >= 3);
      const stay = med(core.map((t) => t.stay).filter((v) => v != null)), gap = med(core.map((t) => t.gap).filter((v) => v != null));
      const medIn = med(vals(E.lots || [], 'input')) || 3800;
      const rec = An1.sane('recuperacion', ctx.rows('recuperacion')).filter((r) => r.volume != null && r.yeast > 0 && r.hours != null && r.yieldPct > 20 && r.yieldPct < 110);
      let recExtra = 0;
      if (rec.length >= 12) { const c2 = S.quantile(rec.map((r) => r.hours), 2 / 3), ok = rec.filter((r) => r.hours <= c2), mal = rec.filter((r) => r.hours > c2), yb = mean(vals(ok, 'yieldPct')); recExtra = sum(mal.map((r) => Math.max(0, (yb - r.yieldPct) / 100) * r.yeast)); }
      return {
        nCore: core.length, stay, gap, medIn,
        mesesM: M.rs && M.rs.length ? span(M.rs) / 30 : null, mesesA: G.rs && G.rs.length ? span(G.rs) / 30 : null, mesesR: rec.length ? span(rec, 'begin') / 30 : null,
        lever: (M.palancas || []).map((p) => ({ label: p.label, value: p.value })), loss: M.loss, exPico: G.exPico, m3: G.m3, recExtra, nRec: rec.length, X,
      };
    });
  }

  /* ---------- Cálculo del escenario ---------- */
  function simular(b, st) {
    const o = {};
    const ciclo = b.stay != null ? b.stay + (b.gap || 0) : null;
    if (b.nCore && ciclo) {
      const nuevo = Math.max(1, ciclo - st.dEst - st.dGap), base = (b.nCore * 30) / ciclo;
      o.lotes = (b.nCore * 30) / nuevo - base; o.capHl = o.lotes * b.medIn; o.lotesBase = base;
    }
    if (b.mesesM) {
      const sel = b.lever.filter((p, i) => st.lev[i] !== false).map((p) => (p.value / b.mesesM) * (st.efect / 100));
      o.mermaMin = sel.length ? Math.max(...sel) : 0; o.mermaMax = sum(sel);
    }
    if (b.mesesA) { o.agua = (b.exPico * (st.pico / 100)) / b.mesesA + (b.m3 / b.mesesA) * (st.base / 100); }
    if (b.mesesR && b.recExtra) o.rec = (b.recExtra * (st.rec / 100)) / b.mesesR;
    return o;
  }

  const DEF = { dEst: 0.5, dGap: 0.2, efect: 50, pico: 50, base: 0, rec: 50, lev: [] };
  const estado = () => { const s = leer(KEY_S, DEF); if (!Array.isArray(s.lev)) s.lev = []; return s; };

  function salida(b, st) {
    const o = simular(b, st), p = precios.get();
    const tarj = (t, v, sub, tono) => `<div class="an-stat ${tono ? 't-' + tono : ''}"><span>${esc(t)}</span><b>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const ok = (x) => x != null && Number.isFinite(x);
    let total = 0, falta = [];
    const sumar = (hl, m3, cap) => { if (hl) { if (p.hl > 0) total += hl * p.hl; else falta.push('valor del Hl'); } if (m3) { if (p.m3 > 0) total += m3 * p.m3; else falta.push('costo del m³'); } if (cap) { if (p.margen > 0) total += cap * p.margen; else falta.push('margen por Hl'); } };
    const celdas = [];
    if (ok(o.lotes)) { celdas.push(tarj('Capacidad de fermentación', `+ ${fmt(o.lotes, 1)} lotes/mes`, `≈ ${fmt(o.capHl, 0)} Hl/mes · base ${fmt(o.lotesBase, 0)} lotes/mes`, o.lotes > 0 ? 'ok' : '')); sumar(0, 0, o.capHl); }
    if (ok(o.mermaMax)) { const r = o.mermaMax - o.mermaMin < 1 ? `${fmt(o.mermaMax, 0)} Hl/mes` : `${fmt(o.mermaMin, 0)} a ${fmt(o.mermaMax, 0)} Hl/mes`; celdas.push(tarj('Merma evitada', r, 'entre la mayor palanca sola y la suma (se solapan)', o.mermaMax > 0 ? 'ok' : '')); sumar((o.mermaMin + o.mermaMax) / 2, 0, 0); }
    if (ok(o.agua)) { celdas.push(tarj('Agua ahorrada', `${fmt(o.agua, 0)} m³/mes`, b.m3 && b.mesesA ? `${fmt((o.agua / (b.m3 / b.mesesA)) * 100, 1)} % del consumo mensual` : '', o.agua > 0 ? 'ok' : '')); sumar(0, o.agua, 0); }
    if (ok(o.rec)) { celdas.push(tarj('Cerveza recuperada de más', `${fmt(o.rec, 0)} Hl/mes`, 'menos espera antes de recuperar', o.rec > 0 ? 'ok' : '')); sumar(o.rec, 0, 0); }
    const hayPrecio = p.hl > 0 || p.m3 > 0 || p.margen > 0;
    const dinero = hayPrecio ? `<div class="sim-total"><span>Impacto mensual estimado</span><strong>${pesos(total)}</strong><small>${falta.length ? `No incluye: ${[...new Set(falta)].join(', ')} (falta registrarlos arriba). ` : ''}Para la merma se usa el punto medio del rango.</small></div>` : `<div class="sim-total"><span>Impacto mensual estimado</span><strong>—</strong><small>Registra los valores de arriba para verlo en pesos.</small></div>`;
    return `<div class="an-stats">${celdas.join('')}</div>${dinero}<p class="an-note"><b>Supuestos</b> La capacidad solo se gana si hay mosto y demanda para llenar los tanques. La merma evitada depende de lo bien que se cierren las brechas (control «Qué parte de la brecha cierras»). Son estimaciones sobre datos del periodo, no promesas.</p>`;
  }

  function control(k, label, min, max, step, val, unit, ayuda) {
    return `<label class="sim-c"><span>${esc(label)}</span><div><input type="range" data-sim="${k}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${esc(label)}"><output data-out="${k}">${fmt(val, step < 1 ? 1 : 0)} ${unit}</output></div>${ayuda ? `<small>${ayuda}</small>` : ''}</label>`;
  }

  function render(ctx, UI) {
    const b = base(ctx), st = estado(), p = precios.get();
    if (!b.nCore && !b.mesesM && !b.mesesA) return UI.card('Simulador', '', UI.vacio('Se necesitan datos de fermentación, merma o agua en el periodo.'));
    const precioCard = UI.card('Valores para convertir a pesos', 'Se guardan solo en este navegador. Déjalos vacíos si no quieres ver pesos.',
      `<div class="sim-precios"><label><span>Valor de 1 Hl de cerveza (costo de producir o precio)</span><input type="number" min="0" step="any" inputmode="decimal" data-precio="hl" value="${p.hl || ''}" placeholder="$ por Hl"></label>
      <label><span>Margen de 1 Hl vendido (para la capacidad)</span><input type="number" min="0" step="any" inputmode="decimal" data-precio="margen" value="${p.margen || ''}" placeholder="$ por Hl"></label>
      <label><span>Costo de 1 m³ de agua (con tratamiento)</span><input type="number" min="0" step="any" inputmode="decimal" data-precio="m3" value="${p.m3 || ''}" placeholder="$ por m³"></label></div>`);
    const levs = b.lever.length ? `<div class="sim-levs"><span>Brechas de merma que atacarías</span>${b.lever.map((l, i) => `<label class="sim-chk"><input type="checkbox" data-lev="${i}" ${st.lev[i] === false ? '' : 'checked'}> ${esc(l.label)} <small>(${fmt(l.value / (b.mesesM || 1), 0)} Hl/mes)</small></label>`).join('')}</div>` : '';
    const ctrl = `<div class="sim-grid">
      <fieldset><legend>Capacidad del fermentador</legend>${b.nCore ? control('dEst', 'Días menos de estancia en FV', 0, 2, 0.1, st.dEst, 'd', `hoy: ${fmt(b.stay, 1)} d de estancia y ${fmt(b.gap || 0, 1)} d entre lotes en ${b.nCore} tanques`) + control('dGap', 'Días menos entre un lote y el siguiente', 0, 1, 0.1, st.dGap, 'd', '') : '<p class="an-note">Sin datos de ocupación.</p>'}</fieldset>
      <fieldset><legend>Merma de fermentación</legend>${control('efect', 'Qué parte de la brecha cierras', 0, 100, 5, st.efect, '%', 'qué tanto de la diferencia con lo normal logras eliminar')}${levs}</fieldset>
      <fieldset><legend>Agua</legend>${b.mesesA ? control('pico', 'Recortar el exceso de los turnos pico', 0, 100, 5, st.pico, '%', 'exceso sobre el 75 % de los turnos') + control('base', 'Reducir el consumo base', 0, 15, 1, st.base, '%', 'sobre todo el consumo mensual') : '<p class="an-note">Sin datos de agua.</p>'}</fieldset>
      <fieldset><legend>Recuperación de cerveza</legend>${b.recExtra ? control('rec', 'Recuperaciones lentas que pasan al rendimiento de las rápidas', 0, 100, 5, st.rec, '%', '') : '<p class="an-note">Sin suficientes recuperaciones con horas registradas.</p>'}</fieldset></div>`;
    return `<p class="an-lead-s">Mueve los controles para ver cuánto se gana al mes si atacas cada palanca. Los puntos de partida son los datos reales del periodo y la marca elegidos arriba.</p>${precioCard}
      ${UI.card('¿Qué pasaría si…?', 'El resultado se recalcula al mover cada control.', ctrl + `<div id="simOut">${salida(b, st)}</div>`)}`;
  }

  function montar(ctx, el) {
    const b = base(ctx), st = estado(), out = el.querySelector('#simOut');
    const repintar = () => { if (out) out.innerHTML = salida(b, st); };
    el.querySelectorAll('[data-sim]').forEach((i) => { i.oninput = () => { st[i.dataset.sim] = +i.value; const o = el.querySelector(`[data-out="${i.dataset.sim}"]`); if (o) o.textContent = `${fmt(+i.value, +i.step < 1 ? 1 : 0)} ${i.dataset.sim === 'dEst' || i.dataset.sim === 'dGap' ? 'd' : '%'}`; guardar(KEY_S, st); repintar(); }; });
    el.querySelectorAll('[data-lev]').forEach((c) => { c.onchange = () => { st.lev[+c.dataset.lev] = c.checked; guardar(KEY_S, st); repintar(); }; });
    el.querySelectorAll('[data-precio]').forEach((i) => { i.oninput = () => { const p = precios.get(); p[i.dataset.precio] = i.value === '' ? null : +i.value; precios.set(p); repintar(); }; });
  }

  AN.registrar({ id: 'simulador', label: 'Simulador', orden: 1.8, render, mount: montar });
})();
