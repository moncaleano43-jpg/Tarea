
/* ============================================================
   v32 — Extracto de alta por marca (editable en Ajustes), proyección
   de curva, Análisis ampliado y Cifra con IA opcional.
   ============================================================ */
(function(){
  if(!window.App||!App.V31||!App.D) return;
  const {esc,fmtS,f,parseDT,HOUR}=App.U, C=App.C, V=App.V31, LS=V.LS;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const rel=(t,n)=>C.rel(t,n||Date.now());
  const pend=()=>App.D.pend(Date.now());
  const {tit,hl,pct,COL}=V;
  const key=m=>String(m||"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
  const MARCAS=App.MARCAS||["AGUILA","ESTANDAR","LIGHT","AZTECA","PILSEN","CLUB COLOMBIA"];

  /* ---------- 1. Extracto de alta por marca ---------- */
  const ALTA_DEF={"ESTANDAR":10,"LIGHT":9.5,"AZTECA":9,"CLUB COLOMBIA":9};
  function altaDe(m){ const k=key(m), cfg=(App.S.config&&App.S.config.alta)||{};
    if(k in cfg) return cfg[k]===null||cfg[k]===""?null:+cfg[k];
    return ALTA_DEF[k]!==undefined?ALTA_DEF[k]:null; }
  function altaMapa(){ const o={}; MARCAS.forEach(m=>o[m]=altaDe(m)); return o; }

  /* ---------- 2. Proyección de la curva ---------- */
  function reg(p){ const n=p.length; if(n<2) return null; let sx=0,sy=0,sxx=0,sxy=0; p.forEach(q=>{ sx+=q.h; sy+=q.e; sxx+=q.h*q.h; sxy+=q.h*q.e; });
    const d=n*sxx-sx*sx; if(!d) return null; const m=(n*sxy-sx*sy)/d, b=(sy-m*sx)/n, ym=sy/n; let st=0,sr=0; p.forEach(q=>{ st+=(q.e-ym)**2; sr+=(q.e-(m*q.h+b))**2; });
    return {slope:-m,b,r2:st?1-sr/st:1}; }
  function puntos(r){ const a=[]; if(r.eo!=null) a.push({h:0,e:+r.eo}); (r.pts||[]).forEach(p=>{ if(p.h>0||r.eo==null) a.push({h:+p.h,e:+p.e}); }); return a.sort((x,y)=>x.h-y.h); }
  function proy(x){ const {t,r}=x, A=altaDe(t.marca), fin=r.fin?+parseDT(r.fin):null, base={A,marca:t.marca,fin};
    if(A==null) return Object.assign(base,{estado:"sin-meta"});
    const P=puntos(r); if(!fin||!P.length) return Object.assign(base,{estado:"sin-datos"});
    const n=P.length, last=P[n-1], ms=h=>fin+h*HOUR;
    Object.assign(base,{n,last,pts:P,aten:r.atenuacion,falta:Math.max(0,last.e-A)});
    if(last.e<=A){ let i=P.findIndex(q=>q.e<=A), h=P[i].h; if(i>0){ const a=P[i-1],b=P[i]; h=a.h+(a.e-A)/(a.e-b.e)*(b.h-a.h); }
      return Object.assign(base,{estado:"alcanzada",t:ms(h),h}); }
    const cand=[]; if(n>=2) cand.push((P[n-2].e-last.e)/(last.h-P[n-2].h));
    const R=n>=3?reg(P.slice(-Math.min(4,n))):null; if(R) cand.push(R.slope);
    if(n>=3) cand.push((P[0].e-last.e)/(last.h-P[0].h));
    let ok=cand.filter(s=>s>1e-4), metodo="muestras";
    if(!ok.length){ const T=r.T||{}; const t0=r.t0?+parseDT(r.t0):null, hT=T.horas||(t0?(t0-fin)/HOUR:null), elf=r.el!=null?r.el:1.8;
      if(hT&&r.eo>elf&&r.eo>A){ ok=[(r.eo-elf)/hT]; metodo="marca"; } else return Object.assign(base,{estado:"sin-tendencia"}); }
    let central=ok[0];
    if(n>=3){ const li=(P[n-2].e-last.e)/(last.h-P[n-2].h), pi=(P[n-3].e-P[n-2].e)/(P[n-2].h-P[n-3].h); central=li>1e-4&&li<pi*.8?li*.92:(R&&R.slope>1e-4?R.slope:ok[0]); }
    else if(metodo==="muestras") central=ok[0];
    let fast=Math.max(...ok,central), slow=Math.min(...ok,central); if(fast/slow<1.15){ fast=central*1.2; slow=central*.8; }
    const at=s=>ms(last.h+(last.e-A)/s);
    const dias=central*24, hSin=(Date.now()-ms(last.h))/HOUR;
    const conf=metodo==="marca"?"baja":(n>=4&&R&&R.r2>=.98&&hSin<30)?"alta":(n>=3?"media":"baja");
    return Object.assign(base,{estado:"proyectada",t:at(central),lo:at(fast),hi:at(slow),slope:central,dias,fast,slow,conf,metodo,r2:R?R.r2:null,hSin,vencida:at(central)<Date.now()}); }
  const todas=()=>pend().map(x=>({x,p:proy(x)}));
  App.Alta={de:altaDe,mapa:altaMapa,proy};

  /* ---------- 3. Etiquetas ---------- */
  const confTxt={alta:"Confianza alta",media:"Confianza media",baja:"Confianza baja"};
  function cuando(p,now){ if(p.estado==="alcanzada") return `Alcanzó la alta ${rel(p.t,now)}`; if(p.estado==="proyectada") return `${p.vencida?"Debería haber llegado":"Llegará"} ${rel(p.t,now)}`; return {"sin-meta":"Sin extracto de alta definido","sin-datos":"Sin muestras todavía","sin-tendencia":"Sin tendencia de caída"}[p.estado]; }
  function spark(p,w=120,h=36){ if(!p.pts||p.pts.length<2) return ""; const P=p.pts, xs=P.map(q=>q.h), mx=Math.max(...xs,1), ys=P.map(q=>q.e), top=Math.max(...ys,p.A||0)*1.05, bot=Math.min(...ys,p.A||0)*.9;
    const X=v=>2+(w-4)*v/mx, Y=v=>2+(h-4)*(1-(v-bot)/((top-bot)||1)); const d=P.map((q,i)=>`${i?"L":"M"}${X(q.h).toFixed(1)},${Y(q.e).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" class="v32-sp" aria-hidden="true"><line x1="2" x2="${w-2}" y1="${Y(p.A)}" y2="${Y(p.A)}" stroke="#af52de" stroke-dasharray="3 3" stroke-width="1.2"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(P[P.length-1].h)}" cy="${Y(P[P.length-1].e)}" r="3" fill="var(--accent)"/></svg>`; }

  /* ---------- 4. Pestaña: Proyección de altas ---------- */
  let aTab=LS.get("inventarioLevadura:v32tab","alta"), aFV=null, aSim=100, aK=2;
  function tabAlta(){ const now=Date.now(), L=todas();
    const ya=L.filter(o=>o.p.estado==="alcanzada"), prox=L.filter(o=>o.p.estado==="proyectada"&&o.p.t-now<=24*HOUR), sin=L.filter(o=>!["alcanzada","proyectada"].includes(o.p.estado));
    L.sort((a,b)=>{ const ra={alcanzada:0,proyectada:1}[a.p.estado]??2, rb={alcanzada:0,proyectada:1}[b.p.estado]??2; return ra-rb||(a.p.t||9e15)-(b.p.t||9e15); });
    const tarjetas=L.map(({x,p})=>{ const pctAv=p.A!=null&&x.r.eo!=null?Math.max(0,Math.min(100,(x.r.eo-(p.last?p.last.e:x.r.eo))/(x.r.eo-p.A)*100)):0, k=p.estado==="alcanzada"?"ok":p.estado==="proyectada"?(p.vencida?"warn":"go"):"na";
      return `<a class="v32-ac ${k}" href="#/analisis" data-fv="${esc(x.t.lote)}"><div class="h"><b>FV ${x.t.tq}</b><span>${esc(tit(x.t.marca))}</span></div>
        <div class="big">${p.estado==="alcanzada"?"En alta":p.estado==="proyectada"?fmtS(p.t):"—"}</div><p class="w">${esc(cuando(p,now))}</p>
        <div class="bar"><i style="width:${pctAv}%"></i></div>
        <div class="kv"><span>Extracto <b>${p.last?f(p.last.e,2):"—"} °P</b></span><span>Alta <b>${p.A!=null?f(p.A,1):"—"} °P</b></span>${p.dias?`<span>Ritmo <b>${f(p.dias,1)} °P/d</b></span>`:""}</div>
        ${p.estado==="proyectada"?`<p class="rg">Rango ${fmtS(p.lo)} – ${fmtS(p.hi)} · ${confTxt[p.conf]}${p.metodo==="marca"?" · por días de referencia":""}</p>`:""}
        ${p.vencida?`<p class="rg warn">La última muestra es de hace ${f(p.hSin,0)} h: tome una nueva.</p>`:""}
        <div class="sp">${spark(p)}</div></a>`; }).join("");
    return `<div class="v32-kp"><div><b>${ya.length}</b><span>Ya en alta</span></div><div class="g"><b>${prox.length}</b><span>Llegan en 24 h</span></div><div><b>${L.filter(o=>o.p.estado==="proyectada").length}</b><span>Con proyección</span></div><div class="n"><b>${sin.length}</b><span>Sin datos suficientes</span></div></div>
      <div class="v31-card"><div class="v31-ch"><h2>Extracto de alta por marca</h2><p>Se da de alta el tanque cuando el extracto aparente baja hasta este valor. <a href="#/config">Cambiar en Ajustes ›</a></p></div>
        <div class="v32-chips">${MARCAS.map(m=>`<span><small>${esc(tit(m))}</small><b>${altaDe(m)!=null?f(altaDe(m),1)+" °P":"sin definir"}</b></span>`).join("")}</div></div>
      <div class="v32-grid">${tarjetas||'<p class="v31-none">No hay fermentadores con levadura.</p>'}</div>
      <p class="v31-foot">La proyección usa el ritmo de caída de las últimas muestras (regresión lineal y último intervalo) y muestra el rango entre el ritmo más rápido y el más lento. Mientras más muestras recientes, más confiable.</p>`; }

  /* ---------- 5. Pestaña: Curva por FV con simulador ---------- */
  function curva(x,p,k){ const W=900,H=380,L=46,R=18,T=18,B=40, P=p.pts||[]; if(!P.length||p.A==null) return '<p class="v31-none">Sin datos para dibujar la curva.</p>';
    const last=P[P.length-1], el=x.r.el, now=(Date.now()-p.fin)/HOUR, s=p.slope?p.slope*k:null;
    const hA=p.estado==="proyectada"&&s?last.h+(last.e-p.A)/s:p.estado==="alcanzada"?p.h:null, hF=Math.max(last.h,now,hA||0)*1.12+6;
    const eMax=Math.max(...P.map(q=>q.e),p.A)*1.06, X=h=>L+(W-L-R)*h/hF, Y=e=>T+(H-T-B)*(1-e/eMax);
    const real=P.map((q,i)=>`${i?"L":"M"}${X(q.h).toFixed(1)},${Y(q.e).toFixed(1)}`).join(" ");
    let proj="", band="", marc="";
    if(p.estado==="proyectada"&&s){ const lim=el!=null&&el<p.A?el:0, hEnd=last.h+(last.e-lim)/s; proj=`<path d="M${X(last.h)},${Y(last.e)} L${X(hEnd)},${Y(lim)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="7 5" stroke-linecap="round"/>`;
      const hf=last.h+(last.e-p.A)/(p.fast*k), hs=last.h+(last.e-p.A)/(p.slow*k); band=`<path d="M${X(last.h)},${Y(last.e)} L${X(hf)},${Y(p.A)} L${X(hs)},${Y(p.A)} Z" fill="var(--accent)" opacity=".12"/>`; }
    if(hA!=null) marc=`<g><path d="M${X(hA)-8},${Y(p.A)} l8,-9 l8,9 l-8,9 z" fill="#af52de"/><text x="${X(hA)+14}" y="${Y(p.A)-12}" text-anchor="start" class="lb" fill="#af52de">Alta ${fmtS(p.fin+hA*HOUR)}</text></g>`;
    const gx=[],gy=[]; for(let h=0;h<=hF;h+=24) gx.push(`<line x1="${X(h)}" x2="${X(h)}" y1="${T}" y2="${H-B}" stroke="var(--line)"/><text x="${X(h)}" y="${H-16}" text-anchor="middle" class="ax">${h}</text>`);
    const st=eMax>12?2:1; for(let e=0;e<=eMax;e+=st) gy.push(`<line x1="${L}" x2="${W-R}" y1="${Y(e)}" y2="${Y(e)}" stroke="var(--line)"/><text x="${L-8}" y="${Y(e)+4}" text-anchor="end" class="ax">${e}</text>`);
    return `<svg viewBox="0 0 ${W} ${H}" class="v32-cv" role="img" aria-label="Curva proyectada FV ${x.t.tq}">${gx.join("")}${gy.join("")}
      <line x1="${L}" x2="${W-R}" y1="${Y(p.A)}" y2="${Y(p.A)}" stroke="#af52de" stroke-dasharray="6 4" stroke-width="1.6"/><text x="${W-R-4}" y="${Y(p.A)-6}" text-anchor="end" class="lb" fill="#af52de">Alta · ${f(p.A,1)} °P</text>
      ${el!=null?`<line x1="${L}" x2="${W-R}" y1="${Y(el)}" y2="${Y(el)}" stroke="var(--st-vencida)" stroke-dasharray="5 4" stroke-width="1.2" opacity=".7"/><text x="${W-R-4}" y="${Y(el)-6}" text-anchor="end" class="lb" fill="var(--st-vencida)">E. límite · ${f(el,2)}</text>`:""}
      <line x1="${X(now)}" x2="${X(now)}" y1="${T}" y2="${H-B}" stroke="var(--muted)" stroke-dasharray="2 3"/><text x="${X(now)}" y="${T+10}" text-anchor="middle" class="ax">Ahora</text>
      ${band}${proj}<path d="${real}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${P.map(q=>`<circle cx="${X(q.h)}" cy="${Y(q.e)}" r="5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.6"><title>${f(q.h,0)} h · ${f(q.e,2)} °P</title></circle>`).join("")}${marc}
      <text x="${W/2}" y="${H-1}" text-anchor="middle" class="ax">Horas desde fin de llenado</text></svg>`; }
  function tabCurva(){ const L=todas().filter(o=>o.p.n); if(!L.length) return '<div class="v31-card"><p class="v31-none">No hay fermentadores con muestras.</p></div>';
    if(!aFV||!L.find(o=>o.x.t.lote===aFV)) aFV=L[0].x.t.lote; const o=L.find(o=>o.x.t.lote===aFV), {x,p}=o, k=aSim/100, now=Date.now();
    const s=p.slope?p.slope*k:null, tA=p.estado==="proyectada"&&s?p.fin+(p.last.h+(p.last.e-p.A)/s)*HOUR:p.t;
    const t0=x.r.t0?+parseDT(x.r.t0):null, lastMs=p.fin+(p.last?p.last.h:0)*HOUR, t0s=t0&&t0>lastMs&&k?lastMs+(t0-lastMs)/k:t0;
    return `<div class="v31-card"><div class="v31-ch"><h2>Curva proyectada</h2><p>Los puntos son las muestras; la línea punteada es la proyección y la franja es el rango entre el ritmo más rápido y el más lento.</p>
      <div class="v31-seg" role="group" aria-label="FV">${L.map(q=>`<button data-fv="${esc(q.x.t.lote)}" class="${q.x.t.lote===aFV?"on":""}">FV ${q.x.t.tq}</button>`).join("")}</div></div>
      <div class="v32-cwrap">${curva(x,p,k)}</div></div>
      <div class="v32-two"><div class="v31-card"><div class="v31-ch"><h2>FV ${x.t.tq} · ${esc(tit(x.t.marca))}</h2><p>Lote ${esc(x.t.lote)} · ${esc(x.t.levadura&&x.t.levadura.nombre||"sin levadura")}</p></div>
        <dl class="v32-dl"><div><dt>Extracto actual</dt><dd>${p.last?f(p.last.e,2):"—"} °P</dd></div><div><dt>Alta objetivo</dt><dd>${p.A!=null?f(p.A,1):"—"} °P</dd></div><div><dt>Faltan</dt><dd>${p.falta!=null?f(p.falta,2):"—"} °P</dd></div>
        <div><dt>Ritmo reciente</dt><dd>${p.dias?f(p.dias,2)+" °P/día":"—"}</dd></div><div><dt>Muestras</dt><dd>${p.n||0}</dd></div><div><dt>Ajuste de la recta</dt><dd>${p.r2!=null?"R² "+f(p.r2,3):"—"}</dd></div></dl>
        <p class="v32-res"><b>${p.estado==="alcanzada"?"Alta alcanzada":"Alta estimada"}:</b> ${tA?fmtS(tA)+" ("+rel(tA,now)+")":"sin proyección"}${p.estado==="proyectada"&&p.conf?` · ${confTxt[p.conf].toLowerCase()}`:""}</p></div>
        <div class="v31-card"><div class="v31-ch"><h2>Simulador</h2><p>¿Y si la fermentación va más rápida o más lenta que el ritmo actual?</p></div>
          ${p.estado==="proyectada"?`<label class="v32-sl">Ritmo de caída <b id="v32SimV">${aSim} %</b><input id="v32Sim" type="range" min="50" max="150" step="5" value="${aSim}"></label>
          <dl class="v32-dl one"><div><dt>Alta</dt><dd id="v32SimA">${fmtS(tA)}</dd></div><div><dt>Cambio</dt><dd id="v32SimD">${f((tA-p.t)/HOUR,1)} h</dd></div>${t0s?`<div><dt>T0 aprox.</dt><dd id="v32SimT">${fmtS(t0s)}</dd></div>`:""}</dl>
          <button class="btn sm" id="v32SimR">Volver al ritmo actual</button>`:'<p class="v31-none">El simulador aplica a tanques que aún no llegan a la alta.</p>'}</div></div>`; }

  /* ---------- 6. Pestaña: Capacidad de colectores ---------- */
  function tabCap(){ const now=Date.now(), H=72, ev=[], ocup=[]; let libres=0;
    [1,2,3,4,5,6].forEach(n=>[1,2].forEach(s=>{ const c=App.S.colectores[`c${n}-${s}`]; if(!c){ libres++; return; } const tc=App.T.tiempoColector(c,now); ocup.push({n,s,c,tc}); }));
    ocup.forEach(o=>ev.push({t:Math.max(now,o.tc&&o.tc.mr?+o.tc.mr:now),d:1,txt:`Se libera C${o.n}-P${o.s} (${o.c.nombre}) al sembrarla`,warn:o.tc&&+o.tc.mr<now}));
    pend().filter(x=>x.r.t0).forEach(x=>{ const t=Math.max(now,+parseDT(x.r.t0)+12*HOUR); if(t<=now+H*HOUR) ev.push({t,d:-aK,txt:`Llega la cosecha de FV ${x.t.tq} (${tit(x.t.marca)}) · ${aK} pos.`}); });
    ev.sort((a,b)=>a.t-b.t); let cur=libres; const steps=[{t:now,v:cur}]; ev.forEach(e=>{ cur+=e.d; e.v=cur; steps.push({t:e.t,v:cur}); });
    const W=900,Ht=260,L=40,R=12,T=14,B=34, mn=Math.min(0,...steps.map(s=>s.v)), mx=Math.max(12,...steps.map(s=>s.v)), X=t=>L+(W-L-R)*(t-now)/(H*HOUR), Y=v=>T+(Ht-T-B)*(1-(v-mn)/((mx-mn)||1));
    let path=`M${X(now)},${Y(steps[0].v)}`; for(let i=1;i<steps.length;i++) path+=` L${X(steps[i].t)},${Y(steps[i-1].v)} L${X(steps[i].t)},${Y(steps[i].v)}`; path+=` L${X(now+H*HOUR)},${Y(steps[steps.length-1].v)}`;
    const falta=ev.find(e=>e.v<0), minV=Math.min(...steps.map(s=>s.v)), ticks=[0,12,24,36,48,60,72].map(h=>`<text x="${X(now+h*HOUR)}" y="${Ht-12}" text-anchor="middle" class="ax">${h===0?"Ahora":"+"+h+" h"}</text><line x1="${X(now+h*HOUR)}" x2="${X(now+h*HOUR)}" y1="${T}" y2="${Ht-B}" stroke="var(--line)"/>`).join("");
    return `<div class="v31-card"><div class="v31-ch"><h2>Capacidad de colectores · 72 h</h2><p>Posiciones libres a lo largo del tiempo: suben cuando se siembra una levadura (al límite) y bajan cuando llega una cosecha.</p>
      <label class="v32-row">Posiciones que ocupa cada cosecha <select id="v32K"><option value="1" ${aK===1?"selected":""}>1</option><option value="2" ${aK===2?"selected":""}>2 (lo habitual)</option></select></label></div>
      <ul class="v31-ins"><li>${falta?(falta.t<=now+60000?`Ya hoy no alcanzan: hay <b>${ev.filter(e=>e.d<0&&e.t<=now+60000).length}</b> cosechas por recibir (~${aK} pos. c/u) y solo <b>${libres}</b> posiciones libres. Siembre o descarte las levaduras fuera de tiempo para hacer espacio.`:`Faltarían posiciones el <b>${fmtS(falta.t)}</b> (${rel(falta.t,now)}): quedarían en <b>${falta.v}</b>. Conviene sembrar o descartar antes.`):`<b>Alcanzan las posiciones</b> en las próximas 72 h (mínimo previsto: ${minV} libres).`}</li><li>Hoy hay <b>${libres}</b> de 12 posiciones libres${ocup.filter(o=>o.tc&&+o.tc.mr<now).length?` y <b>${ocup.filter(o=>o.tc&&+o.tc.mr<now).length}</b> fuera de tiempo para sembrar`:""}.</li></ul>
      <svg viewBox="0 0 ${W} ${Ht}" class="v32-cv" role="img" aria-label="Posiciones libres en 72 horas">${ticks}<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--a-red)" stroke-dasharray="4 4"/><text x="${L-6}" y="${Y(0)+4}" text-anchor="end" class="ax">0</text><text x="${L-6}" y="${Y(mx)+4}" text-anchor="end" class="ax">${mx}</text>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>${ev.map(e=>`<circle cx="${X(e.t)}" cy="${Y(e.v)}" r="4.5" fill="${e.v<0?"var(--a-red)":e.d>0?"#34c759":"#ff9500"}"><title>${esc(e.txt)}</title></circle>`).join("")}</svg></div>
      <div class="v31-card"><div class="v31-ch"><h2>Movimientos previstos</h2></div>${ev.length?ev.map(e=>`<div class="v32-ev ${e.d>0?"in":"out"}"><i></i><span><b>${esc(e.txt)}</b><small>${fmtS(e.t)} · ${rel(e.t,now)}${e.warn?" · ya fuera de tiempo":""}</small></span><em class="${e.v<0?"neg":""}">${e.v===1||e.v===-1?e.v+" libre":e.v+" libres"}</em></div>`).join(""):'<p class="v31-none">Sin movimientos previstos.</p>'}
      <p class="v31-foot">Supone que cada levadura se siembra justo en su límite y que cada cosecha llega a T0 + 12 h. Es una guía para anticipar, no una orden.</p></div>`; }

  /* ---------- 7. Pestaña: Tendencias ampliadas ---------- */
  function tabTen(){ const R=App.BDM.registros()||[], porMarca=MARCAS.map(m=>{ const l=R.filter(r=>key(r.marca)===m); return {m,n:l.length,v:V.mean(l.map(r=>r.viab)),c:V.mean(l.map(r=>r.cons)),ph:V.mean(l.map(r=>r.ph))}; }).filter(o=>o.n);
    const gc=Object.assign({seguimiento:6,alerta:8},App.S.config.generaciones||{}), act=[]; pend().forEach(x=>{ const g=x.t.levadura&&x.t.levadura.generacion; if(g!=null) act.push({g:+g,n:x.t.levadura.nombre,w:"FV "+x.t.tq}); }); [1,2,3,4,5,6].forEach(n=>[1,2].forEach(s=>{ const c=App.S.colectores[`c${n}-${s}`]; if(c&&c.generacion!=null) act.push({g:+c.generacion,n:c.nombre,w:`C${n}-P${s}`}); }));
    const riesgo=act.filter(a=>a.g+1>=gc.alerta).sort((a,b)=>b.g-a.g);
    return V.tendencias()+`<div class="v32-two"><div class="v31-card"><div class="v31-ch"><h2>Rendimiento por marca</h2><p>Promedio de todos los registros.</p></div>
      <table class="v32-tb"><thead><tr><th>Marca</th><th>Registros</th><th>Viabilidad</th><th>Consistencia</th><th>pH</th></tr></thead><tbody>${porMarca.map(o=>`<tr><td><b>${esc(tit(o.m))}</b></td><td>${o.n}</td><td>${pct(o.v)}</td><td>${pct(o.c)}</td><td>${o.ph!=null?f(o.ph,2):"—"}</td></tr>`).join("")}</tbody></table></div>
      <div class="v31-card"><div class="v31-ch"><h2>Generaciones en riesgo</h2><p>Líneas cuya próxima cosecha llega a Gen ${gc.alerta} o más (alerta crítica en Ajustes).</p></div>
      ${riesgo.length?riesgo.slice(0,8).map(a=>`<div class="v32-ev out"><i></i><span><b>${esc(a.n)} · Gen ${a.g}</b><small>${a.w} · la próxima cosecha será Gen ${a.g+1}</small></span></div>`).join(""):'<p class="v31-none">Ninguna línea cerca de la generación crítica.</p>'}${riesgo.length>8?`<p class="v31-foot">y ${riesgo.length-8} líneas más.</p>`:""}</div></div>`; }

  /* ---------- 8. Página Análisis ---------- */
  const TABS=[["alta","Proyección de altas"],["curva","Curva por FV"],["cal","Calendario de T0"],["cap","Capacidad"],["ten","Tendencias"]];
  App.V.analisis={ render(){ if(!TABS.find(t=>t[0]===aTab)) aTab="alta";
      return `<div class="v31-an v32-an"><div class="page-h"><div><h1>Análisis</h1><p>Proyecciones de la curva, calendario, capacidad de colectores y tendencias de la levadura.</p></div></div>
      <div class="v31-seg big v32-tabs" role="tablist">${TABS.map(([k,l])=>`<button data-t="${k}" class="${aTab===k?"on":""}" role="tab">${l}</button>`).join("")}</div>
      ${aTab==="alta"?tabAlta():aTab==="curva"?tabCurva():aTab==="cap"?tabCap():aTab==="ten"?tabTen():V.calendario()}</div>`; },
    mount(){ $$("#view [data-t]").forEach(b=>b.onclick=()=>{ aTab=b.dataset.t; LS.set("inventarioLevadura:v32tab",aTab); App.render(true); });
      $$("#view [data-m]").forEach(b=>b.onclick=()=>{ V.setMarca(b.dataset.m); App.render(true); });
      $$("#view .v32-ac").forEach(a=>a.onclick=e=>{ e.preventDefault(); aFV=a.dataset.fv; aTab="curva"; LS.set("inventarioLevadura:v32tab",aTab); App.render(true); });
      $$("#view [data-fv]:not(.v32-ac)").forEach(b=>b.onclick=()=>{ aFV=b.dataset.fv; aSim=100; App.render(true); });
      const k=$("#v32K"); if(k) k.onchange=()=>{ aK=+k.value; App.render(true); };
      const sim=$("#v32Sim"); if(sim){ const L=todas().find(o=>o.x.t.lote===aFV); sim.oninput=()=>{ aSim=+sim.value; const p=L.p, s=p.slope*aSim/100, tA=p.fin+(p.last.h+(p.last.e-p.A)/s)*HOUR; $("#v32SimV").textContent=aSim+" %"; $("#v32SimA").textContent=fmtS(tA); $("#v32SimD").textContent=f((tA-p.t)/HOUR,1)+" h"; const t0=L.x.r.t0?+parseDT(L.x.r.t0):null, lm=p.fin+p.last.h*HOUR, tt=$("#v32SimT"); if(tt&&t0&&t0>lm) tt.textContent=fmtS(lm+(t0-lm)/(aSim/100)); }; sim.onchange=()=>App.render(true); }
      const r=$("#v32SimR"); if(r) r.onclick=()=>{ aSim=100; App.render(true); }; } };

  /* ---------- 9. Ajustes: extracto de alta + Cifra IA ---------- */
  const IAK="inventarioLevadura:v32ia";
  const iaCfg=()=>Object.assign({on:false,url:"/api/levabot",token:"",modo:"auto"},LS.get(IAK,{}));
  function ajustes(){ const page=$(".config-page"); if(!page||$("#v32Alta")) return; const anchor=$(".config-grid",page); if(!anchor) return; const ia=iaCfg();
    const sec=document.createElement("div"); sec.className="config-grid"; sec.id="v32Alta";
    sec.innerHTML=`<section class="config-section"><div class="config-section-head"><div><h2>Extracto de alta por marca</h2><p>Se da de alta el tanque cuando el extracto aparente baja hasta este valor. Alimenta las proyecciones de Análisis y a Cifra.</p></div></div>
        <div class="fg">${MARCAS.map(m=>`<label class="f"><span>${esc(m)}</span><input class="inp" type="number" step="0.1" min="0" inputmode="decimal" placeholder="sin definir" data-alta="${esc(m)}" value="${altaDe(m)!=null?altaDe(m):""}"></label>`).join("")}</div>
        <p class="config-help" style="margin-top:12px">Valores en °P (extracto aparente). Déjelo vacío para una marca sin extracto de alta.</p><button class="btn pri" type="button" id="v32SaveAlta" style="margin-top:6px">Guardar extracto de alta</button></section>
      <section class="config-section"><div class="config-section-head"><div><h2>Cifra con IA</h2><p>Para entender cualquier pregunta con sus propias palabras. Las cifras exactas las sigue respondiendo la plataforma; la IA se usa para lo demás.</p></div></div>
        <label class="v32-chk"><input type="checkbox" id="v32IaOn" ${ia.on?"checked":""}> Usar IA en Cifra</label>
        <div class="fg" style="margin-top:10px"><label class="f"><span>Dirección del servicio</span><input class="inp" id="v32IaUrl" type="text" value="${esc(ia.url)}" placeholder="https://su-sitio.netlify.app/api/levabot"></label>
        <label class="f"><span>Clave de acceso (opcional)</span><input class="inp" id="v32IaTok" type="password" value="${esc(ia.token)}" autocomplete="off"></label>
        <label class="f"><span>Cuándo usarla</span><select class="inp" id="v32IaModo"><option value="auto" ${ia.modo==="auto"?"selected":""}>Solo si no sabe</option><option value="siempre" ${ia.modo==="siempre"?"selected":""}>Siempre que pueda</option></select></label></div>
        <p class="config-help" id="v32IaMsg" style="margin-top:12px">La clave de Anthropic nunca va en este archivo: vive en el servicio. Mientras no esté conectado, Cifra sigue funcionando como hasta ahora.</p>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn pri" type="button" id="v32IaSave">Guardar</button><button class="btn" type="button" id="v32IaTest">Probar conexión</button></div></section>`;
    anchor.after(sec);
    $("#v32SaveAlta").onclick=async()=>{ const antes=altaMapa(), o={}; $$("[data-alta]").forEach(i=>{ const v=i.value.trim()===""?null:Math.max(0,Math.min(40,+String(i.value).replace(",","."))); o[key(i.dataset.alta)]=isNaN(v)?null:v; });
      const cambios=MARCAS.filter(m=>(antes[m]??null)!==(o[key(m)]??null)); if(!cambios.length){ App.U.toast("Sin cambios"); return; }
      if(await App.Store.set("config","alta",o)){ for(const m of cambios){ try{ await App.Sec.auditar("Extracto de alta · "+m,(antes[m]??"—")+" °P",(o[key(m)]??"—")+" °P"); }catch(e){} } App.U.toast("Extracto de alta guardado"); } };
    const saveIa=()=>{ LS.set(IAK,{on:$("#v32IaOn").checked,url:$("#v32IaUrl").value.trim(),token:$("#v32IaTok").value,modo:$("#v32IaModo").value}); };
    $("#v32IaSave").onclick=()=>{ saveIa(); App.U.toast("Ajustes de IA guardados"); };
    $("#v32IaTest").onclick=async()=>{ saveIa(); const m=$("#v32IaMsg"); m.textContent="Probando…"; try{ const h=await App.BotIA.preguntar("Responde solo con la palabra: conectado",[],true); m.textContent="Conectado. Respuesta: "+h.replace(/<[^>]+>/g,"").slice(0,80); }catch(e){ m.textContent="No se pudo conectar: "+(e.message||e); } }; }

  /* ---------- 10. Cifra con IA ---------- */
  const iso=ms=>ms?fmtS(ms):null, r2=(v,d=2)=>v==null||isNaN(v)?null:Math.round(v*10**d)/10**d;
  function snapshot(){ const now=Date.now(), P=pend(), gc=Object.assign({seguimiento:6,alerta:8},App.S.config.generaciones||{});
    const tanques=P.map(x=>{ const {t,r,st}=x, L=t.levadura||{}, p=proy(x); return {fv:t.tq,marca:t.marca,lote:t.lote,levadura:L.nombre,gen:L.generacion,saldra_como:r.nombreCosecha,extracto_actual_P:r2(r.ext),atenuacion_pct:r.atenuacion!=null?Math.round(r.atenuacion*100):null,muestras:(t.muestras||[]).length,estado:st.k,
      t0:iso(r.t0&&+parseDT(r.t0)),retiro_ideal:r.t0?iso(+parseDT(r.t0)+12*HOUR):null,maximo_retiro:iso(r.venc&&+parseDT(r.venc)),extracto_alta_P:p.A,alta:p.estado,alta_estimada:iso(p.t),alta_rango:p.lo?[iso(p.lo),iso(p.hi)]:null,ritmo_P_por_dia:r2(p.dias),confianza_proyeccion:p.conf||null}; });
    const usados=new Set(P.map(x=>+x.t.tq)), libres=Array.from({length:32},(_,i)=>i+1).filter(n=>!usados.has(n));
    const colectores=[]; [1,2,3,4,5,6].forEach(n=>[1,2].forEach(s=>{ const c=App.S.colectores[`c${n}-${s}`]; if(!c) return colectores.push({pos:`C${n}-P${s}`,estado:"libre"}); const tc=App.T.tiempoColector(c,now); colectores.push({pos:`C${n}-P${s}`,levadura:c.nombre,gen:c.generacion,vol_hl:c.vol,viabilidad_pct:c.viab!=null?r2(c.viab*100,1):null,consistencia_pct:c.cons!=null?r2(c.cons*100,1):null,ph:c.ph,limite_siembra:iso(tc.mr&&+tc.mr),estado:tc.k}); }));
    const R=App.BDM.registros()||[], gens=[...new Set(R.map(r=>+r.generacion).filter(g=>!isNaN(g)))].sort((a,b)=>a-b).map(g=>{ const l=R.filter(r=>+r.generacion===g); return {gen:g,registros:l.length,viabilidad_pct:r2(V.mean(l.map(r=>r.viab))*100,1),consistencia_pct:r2(V.mean(l.map(r=>r.cons))*100,1),ph:r2(V.mean(l.map(r=>r.ph)))}; });
    let ev=[]; try{ ev=App.Hist.eventos().slice(0,12).map(e=>({tipo:e.tipo,cuando:fmtS(e.t),detalle:[e.t1,e.t2].filter(Boolean).join(" · ")})); }catch(e){}
    return {ahora:fmtS(now),tanques_con_levadura:tanques,fv_libres:libres,colectores,config:{extracto_alta_por_marca:altaMapa(),gen_vigilar:gc.seguimiento,gen_critica:gc.alerta},calidad_por_generacion:gens,ultimos_movimientos:ev}; }
  const plano=h=>String(h||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
  function html(t){ let h=esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[-•]\s+/gm,"• ").replace(/\n/g,"<br>"); return h; }
  const ABIERTA=/compar|contra el|versus|\bvs\b|diferencia|conviene|recomiend|por que|porque|explica|analiza|deberia|que pasaria|que pasa si|riesgo|priorid|estrategia|plan para|sugier|aconsej|opinas|mejor opcion|que harias/;
  const abierta=t=>{ const q=V.norm(t); return ABIERTA.test(q)||((q.match(/\b(?:fv|tanque)\s*\d+/g)||[]).length>=2); };
  App.BotIA={ activo(){ const c=iaCfg(); return !!(c.on&&c.url); }, modo(){ return iaCfg().modo; }, abierta, snapshot,
    async preguntar(pregunta,msgs,prueba){ const c=iaCfg(); if(!c.url) throw new Error("falta la dirección del servicio");
      const hist=(msgs||[]).slice(-9,-1).map(m=>({r:m.r==="u"?"u":"b",t:plano(m.h).slice(0,600)})).filter(m=>m.t);
      const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),30000);
      try{ const res=await fetch(c.url,{method:"POST",signal:ctl.signal,headers:Object.assign({"Content-Type":"application/json"},c.token?{"x-levabot-token":c.token}:{}),body:JSON.stringify({pregunta:String(pregunta).slice(0,800),historial:prueba?[]:hist,contexto:prueba?{}:snapshot()})});
        let j=null; try{ j=await res.json(); }catch(e){} if(!res.ok||!j||j.error) throw new Error((j&&j.error)||("HTTP "+res.status)); return html(j.respuesta)+'<span class="bot-time v32-ia">Respuesta con IA</span>'; }
      catch(e){ throw new Error(e.name==="AbortError"?"tardó demasiado":e.message); } finally{ clearTimeout(to); } } };

  /* ---------- 11. Cifra: preguntas de alta (exactas) ---------- */
  const prev=App.BotDirecto;
  App.BotDirecto=function(texto,env){ try{ if(App.BotIA.activo()&&App.BotIA.abierta(texto)) return null; const q=V.norm(texto), now=Date.now();
      if(/\balta\b|\baltas\b|dar de alta|darle alta/.test(q)){ const fv=V.findFV(q,env&&env.ctx);
        if(fv&&fv.libre==null){ const p=proy(fv), n=`<a href="#/tanque/${esc(fv.t.lote)}">FV ${fv.t.tq}</a>`;
          if(p.estado==="sin-meta") return {directo:true,h:`${n} es ${esc(tit(fv.t.marca))} y no tiene extracto de alta definido. Puede ponerlo en Ajustes.`};
          if(p.estado==="alcanzada") return {directo:true,h:`${n} <b>ya llegó a la alta</b> (${f(p.A,1)} °P) ${rel(p.t,now)}, hacia el ${fmtS(p.t)}.`};
          if(p.estado==="proyectada") return {directo:true,h:`${n} llegará a la alta (<b>${f(p.A,1)} °P</b>) el <b>${fmtS(p.t)}</b> (${rel(p.t,now)}).<br>Rango: ${fmtS(p.lo)} – ${fmtS(p.hi)} · ritmo ${f(p.dias,1)} °P/día · ${confTxt[p.conf].toLowerCase()}.${p.vencida?"<br>La última muestra es vieja: tome una nueva.":""}`};
          return {directo:true,h:`Aún no hay datos para proyectar la alta de ${n}: ${p.estado==="sin-datos"?"faltan muestras de extracto":"el extracto no muestra caída"}.`}; }
        const mc=q.match(/\b(estandar|light|azteca|aguila|pilsen|club colombia|club)\b/);
        if(mc&&/extracto|cuanto|cual|que|grados|nivel/.test(q)){ const m=mc[1]==="club"?"CLUB COLOMBIA":mc[1].toUpperCase(), a=altaDe(m); return {directo:true,h:a!=null?`El extracto de alta de <b>${esc(tit(m))}</b> es <b>${f(a,1)} °P</b>.`:`<b>${esc(tit(m))}</b> no tiene extracto de alta definido (se cambia en Ajustes).`}; }
        if(/extracto|cuanto|cuales|que/.test(q)&&/(marca|marcas|todas|cada)/.test(q)) return {directo:true,h:"Extracto de alta por marca:<br>"+MARCAS.map(m=>`${esc(tit(m))}: <b>${altaDe(m)!=null?f(altaDe(m),1)+" °P":"sin definir"}</b>`).join("<br>")};
        const L=todas();
        if(/ya (llego|llegaron|estan|alcanz)|cuales? (llego|llegaron|estan|ya)|cuantos? (llego|llegaron|estan)|en alta/.test(q)){ const ya=L.filter(o=>o.p.estado==="alcanzada"); return {directo:true,h:ya.length?`<b>${ya.length}</b> ${ya.length===1?"fermentador ya está":"fermentadores ya están"} en alta: ${V.lst(ya.map(o=>`<a href="#/tanque/${esc(o.x.t.lote)}">FV ${o.x.t.tq}</a>`))}.`:"<b>Ninguno</b> ha llegado a la alta todavía."}; }
        if(/(proximo|siguiente|primero|cual|cuando|quien)/.test(q)){ const fut=L.filter(o=>o.p.estado==="proyectada"&&o.p.t>now).sort((a,b)=>a.p.t-b.p.t), nx=fut[0], vie=L.filter(o=>o.p.estado==="proyectada"&&o.p.t<=now);
          if(nx) return {directo:true,h:`El próximo en llegar a la alta es <a href="#/tanque/${esc(nx.x.t.lote)}">FV ${nx.x.t.tq}</a>: <b>${fmtS(nx.p.t)}</b> (${rel(nx.p.t,now)}).${vie.length?`<br>${V.lst(vie.map(o=>"FV "+o.x.t.tq))} ${vie.length===1?"debería haberla alcanzado ya":"deberían haberla alcanzado ya"}, pero su última muestra es vieja.`:""}`};
          return {directo:true,h:vie.length?`Ninguno a futuro. ${V.lst(vie.map(o=>"FV "+o.x.t.tq))} ${vie.length===1?"debería haberla alcanzado ya":"deberían haberla alcanzado ya"}: tome una muestra nueva para confirmarlo.`:"Ningún fermentador tiene una alta proyectada por ahora."}; } }
    }catch(e){ console.error("alta",e); }
    return prev?prev(texto,env):null; };

  /* ---------- 12. Detalle de tanque: línea de alta ---------- */
  function detalleAlta(){ const h=(location.hash||"").slice(2).split("/"); if(h[0]!=="tanque"||!h[1]) return; const side=$("#view .fv-side"); if(!side||$("#v32Line",side)) return;
    const x=pend().find(q=>q.t.lote===decodeURIComponent(h[1])); if(!x) return; const p=proy(x), now=Date.now(); const d=document.createElement("div"); d.id="v32Line"; d.className="v32-line";
    d.innerHTML=p.estado==="sin-meta"?`<small>Extracto de alta</small><b>Sin definir</b>`:`<small>Extracto de alta · ${f(p.A,1)} °P</small><b>${p.estado==="alcanzada"?"Alcanzada "+rel(p.t,now):p.estado==="proyectada"?"Estimada "+fmtS(p.t):"Sin proyección"}</b>${p.estado==="proyectada"?`<small>${rel(p.t,now)} · ${confTxt[p.conf].toLowerCase()}</small>`:""}<a href="#/analisis" data-tab="curva">Ver curva proyectada ›</a>`;
    side.appendChild(d); const a=$("a",d); if(a) a.onclick=()=>{ aFV=x.t.lote; aTab="curva"; LS.set("inventarioLevadura:v32tab",aTab); }; }

  let busy=false; new MutationObserver(()=>{ if(busy) return; busy=true; requestAnimationFrame(()=>{ try{ ajustes(); detalleAlta(); }catch(e){} busy=false; }); }).observe(document.body,{childList:true,subtree:true});
  try{ ajustes(); detalleAlta(); }catch(e){}
})();
