
/* ============================================================
   components-ext.js — iconos SVG estilo SF Symbols
   ============================================================ */
App.C = (function(){
  const {esc,f,pc,num,fmtS,HOUR,dur} = App.U;
  const P={
    home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    tank:'<rect x="6" y="3" width="12" height="15" rx="3"/><path d="M8 21l1-3M16 21l-1-3M6 9h12"/>',
    /* Icono de tanque con nivel de líquido (usado en las cards) */
    tankLevel:'<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M6 15h12"/><path d="M6 15v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-3"/>',
    /* Icono de colector horizontal con 2 posiciones (para las cards de colector) */
    colector:'<rect x="2" y="6" width="20" height="12" rx="4"/><circle cx="9" cy="12" r="2.2"/><circle cx="15" cy="12" r="2.2"/>',
    yeast:'<circle cx="9" cy="10" r="4"/><circle cx="16" cy="15" r="3.5"/><circle cx="15.5" cy="6.5" r="2"/>',
    dna:'<path d="M5 3c4 4 10 4 14 0M5 21c4-4 10-4 14 0M7 3v18M17 3v18"/><path d="M9 7h6M9 12h6M9 17h6"/>',
    grid:'<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alarm:'<circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 1.5M5 4L2.5 6.5M19 4l2.5 2.5"/>',
    alert:'<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
    xc:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    minus:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    drop:'<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/>',
    flask:'<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    chev:'<path d="M6 9l6 6 6-6"/>',
    arrowl:'<path d="M15 6l-6 6 6 6"/>',
    arrowr:'<path d="M9 6l6 6-6 6"/>',
    edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    exit:'<path d="M14 4h5v16h-5M10 12h10M6 8l-4 4 4 4"/>',
    sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    sample:'<path d="M9 3v13a3 3 0 0 0 6 0V3"/><path d="M8 3h8M9 10h6"/>',
    bot:'<rect x="5" y="7" width="14" height="12" rx="4"/><path d="M12 3v4M8 13h.01M16 13h.01M9 17h6"/>'
  };
  const icon=(n,cls="")=>`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||""}</svg>`;
  const ALIAS={ok:"verde",prox:"amarillo",att:"naranja",crit:"rojo",none:"sin"};
  const kk=k=>ALIAS[k]||k;
  const ST={gris:["espera","clock"],amarillo:["prox","alarm"],verde:["lista","check"],naranja:["vence","alert"],rojo:["vencida","xc"],sin:["sin","minus"]};
  const stCls=k=>"st-"+((ST[kk(k)]||ST.sin)[0]);
  const stColor=k=>"var(--st-"+((ST[kk(k)]||ST.sin)[0])+")";
  const stBg=k=>"var(--st-"+((ST[kk(k)]||ST.sin)[0])+"-bg)";
  function status(st,lg){ const s=ST[kk(st.k)]||ST.sin; return `<span class="st st-${s[0]}${lg?" lg":""}" role="status">${icon(s[1])}${esc(st.txt)}</span>`; }
  const colKey=st=>({ok:"verde",att:"naranja",crit:"rojo",none:"sin"})[st.cls]||"sin";
  const statusCol=(st,lg)=>status({k:colKey(st),txt:st.txt},lg);
  const TIPO={est:"ESTIMADO",proy:"PROYECTADO",real:"REAL",manual:"MANUAL",pend:"PENDIENTE"};
  const tipo=t=>`<span class="tag ${t}" title="${esc({est:"Calculado con los datos del tanque",proy:"Calculado con los días de la marca: faltan datos del tanque",real:"Dato registrado",manual:"Ajustado a mano",pend:"Pendiente de confirmar"}[t]||"")}">${TIPO[t]||esc(t)}</span>`;
  const rel=(d,now=Date.now())=>{ if(!d) return ""; const ms=+d-now; return ms>=0?"en "+dur(ms):"hace "+dur(ms); };
  function siguiente(r,st,now=Date.now()){
    if(!r.t0) return {lab:"Sin T0",when:null,txt:"Faltan datos para calcular"};
    if(st.k==="rojo") return {lab:"Vencida",when:r.venc,txt:"Vencida "+rel(r.venc,now)};
    if(st.k==="naranja") return {lab:"Vence",when:r.venc,txt:"Vence "+rel(r.venc,now)};
    if(st.k==="verde") return {lab:"Ideal",when:r.mas12,txt:"Ideal "+rel(r.mas12,now)};
    return {lab:"T0",when:r.t0,txt:"T0 "+rel(r.t0,now)};
  }
  const kpi=({label,value,color,go,sub,id})=>`<button type="button" class="kpi${value===0?" zero":""}" ${go?`data-go="${esc(go)}"`:""} ${id?`id="${id}"`:""} aria-label="${esc(label)}: ${esc(value)}"><span class="k"><i style="--c:${color||"var(--faint)"}"></i>${esc(label)}</span><span class="v">${esc(value)}</span>${sub?`<span class="s">${esc(sub)}</span>`:""}</button>`;
  function tankCard(t,r,st,now=Date.now()){
    const L=t.levadura||{}, nx=siguiente(r,st,now), falta=faltantes(t,r);
    const att=(r.eo!=null&&r.el!=null&&r.ext!=null&&r.eo!==r.el)?Math.max(0,Math.min(1,(r.eo-r.ext)/(r.eo-r.el))):null;
    return `<button type="button" class="tcard" style="--c:${stColor(st.k)}" data-go="tanque/${esc(t.lote)}" aria-label="FV ${t.tq}, ${esc(st.txt)}">
      <div class="row1"><div><div class="fv">FV ${t.tq}</div><div class="sub">${esc(t.marca)} · ${esc(t.lote)}</div></div>${status(st)}</div>
      <div class="t0"><div class="k">${r.t0?"T0 "+(r.T.tipo==="proy"?"proyectado":"estimado"):"T0"}</div>
        ${r.t0?`<div class="row" style="gap:8px"><span class="big">${fmtS(r.t0)}</span>${tipo(r.T.tipo)}</div><div class="rel ${st.k==="gris"?"muted":""}" ${nx.when?`data-cdtxt="${+nx.when}" data-cdlab="${esc(nx.lab)}"`:""}>${esc(nx.txt)}</div>`:`<div class="rel muted">${esc(r.T.faltan.join(", ")||"Faltan datos")}</div>`}</div>
      ${att!=null?`<div class="bar" aria-label="Atenuación ${Math.round(att*100)} %"><i style="width:${att*100}%;--c:${stColor(st.k)}"></i></div>`:""}
      <dl><div><dt>Levadura</dt><dd>${esc(L.nombre||"—")}</dd></div><div><dt>Extracto</dt><dd>${r.ext!=null?f(r.ext)+" °P":"—"}</dd></div><div><dt>Fin llenado</dt><dd>${fmtS(r.fin)}</dd></div></dl>
      ${falta.length?`<div class="miss">${icon("alert")}Falta: ${esc(falta.join(", "))}</div>`:""}</button>`;
  }
  function faltantes(t,r){ return [r.eo==null?"E.O":null,r.el==null?"E. límite":null,!r.pts.length?"muestras":null,!(t.levadura||{}).nombre?"levadura":null].filter(Boolean); }
  function slot(id,c,bd){
    const [col,pos]=id.slice(1).split("-");
    if(!c) return `<div class="slot free" aria-label="Colector ${col} posición ${pos} libre"><span class="pos">C${col}.${pos}</span>${icon("plus")}<span class="small">Libre</span></div>`;
    const st=App.Calc.estadoColector(c);
    return `<button type="button" class="slot occ" style="--c:${stColor(colKey(st))}" data-slot="${id}" aria-label="Colector ${col} posición ${pos}: ${esc(c.nombre)}, ${esc(st.txt)}">
      <span class="pos">C${col}.${pos}</span><span class="nm">${esc(c.nombre)}</span>
      <span class="meta">Gen ${c.generacion??"—"} · ${f(num(c.vol),0)} Hl · Viab ${pc(c.viab,1)}</span>${statusCol(st)}</button>`;
  }
  function yeastCard(id,c){
    const st=App.Calc.estadoColector(c), [col,pos]=id.slice(1).split("-");
    return `<article class="ycard" aria-label="Levadura ${esc(c.nombre)}">
      <div class="row1"><div><div class="nm">${esc(c.nombre)}</div><div class="sub">Colector ${col}.${pos} · ${esc(c.marca||"—")} · Gen ${c.generacion??"—"}</div></div>${statusCol(st)}</div>
      <div class="stats"><div><div class="k">Volumen</div><div class="v">${f(num(c.vol),0)} Hl</div></div><div><div class="k">Viabilidad</div><div class="v">${pc(c.viab,1)}</div></div><div><div class="k">Consistencia</div><div class="v">${pc(c.cons,1)}</div></div><div><div class="k">pH</div><div class="v">${f(num(c.ph))}</div></div></div>
      <div class="exp"><span>Resiembra máx.: <b>${fmtS(c.maxAbi)}</b></span><span class="cd${c.maxAbi&&App.U.parseDT(c.maxAbi)<Date.now()?" past":""}" style="display:inline" ${c.maxAbi?`data-cd="${+App.U.parseDT(c.maxAbi)}"`:""}>${c.maxAbi?App.U.countdown(App.U.parseDT(c.maxAbi)):""}</span></div>
      <div class="acts"><button class="btn sm" type="button" data-ydet="${id}">Ver detalle</button><button class="btn sm pri" type="button" data-ysem="${id}">${icon("plus")}Sembrar</button><button class="btn sm" type="button" data-vol="${id}">Ajustar volumen</button><button class="btn sm dan" type="button" data-quitar="${id}">Quitar</button></div></article>`;
  }
  const empty=(ic,title,text,action="")=>`<div class="empty"><span class="ic">${icon(ic)}</span><b>${esc(title)}</b><span class="small">${esc(text)}</span>${action}</div>`;
  const quick=(ic,title,sub,act)=>`<button type="button" data-qa="${esc(act)}"><span class="ic">${icon(ic)}</span><span><b>${esc(title)}</b><span>${esc(sub)}</span></span></button>`;
  const searchResult=({ic,t1,t2,go,badge})=>`<button type="button" class="sres" data-go="${esc(go)}" role="option"><span class="ic">${icon(ic)}</span><span><span class="t1">${esc(t1)}</span><span class="t2">${esc(t2||"")}</span></span>${badge||""}</button>`;
  const timeline=items=>items.length?`<ul class="tl">${items.map(x=>`<li><span class="ic ${x.cls||""}">${icon(x.ic||"clock")}</span>${x.go?`<button type="button" class="m" data-go="${esc(x.go)}"><b>${esc(x.t1)}</b><span>${esc(x.t2||"")}</span></button>`:`<div class="m"><b>${esc(x.t1)}</b><span>${esc(x.t2||"")}</span></div>`}<time>${esc(x.time||"")}</time></li>`).join("")}</ul>`:"";
  return {icon,status,statusCol,stCls,stColor,stBg,colKey,tipo,rel,siguiente,kpi,tankCard,faltantes,slot,yeastCard,empty,quick,searchResult,timeline};
})();
App.tipoTag = t => App.C.tipo(t);
App.TIPO_TXT = {est:"ESTIMADO",proy:"PROYECTADO",real:"REAL",manual:"MANUAL",pend:"PENDIENTE"};
(function(){
  let t; const bad=/^(no |modo de solo|el navegador|la base|escriba|indique|escoja|se perdió)/i;
  App.U.toast=function(m){ const el=document.getElementById("toast"); if(!el) return;
    el.innerHTML=(bad.test(m)?"":`<span class="ok">${App.C.icon("check")}</span>`)+`<span>${App.U.esc(m)}</span>`;
    el.classList.add("show"); clearTimeout(t); t=setTimeout(()=>el.classList.remove("show"),3200); };
  setInterval(()=>{ const now=Date.now(); document.querySelectorAll("[data-cdtxt]").forEach(el=>{ const t=+el.dataset.cdtxt; if(!t) return; el.textContent=el.dataset.cdlab+" "+App.C.rel(t,now); }); },30000);
})();
