
/* ============================================================
   tanques.js — lista de tanques + detalle del tanque
   ============================================================ */
(function(){
  const {esc,f,fmt,fmtS,pc,num,HOUR,parseDT,dur,countdown,toast,clone} = App.U, C=App.C;
  const loteNum=l=>parseInt(String(l||"").replace(/\D/g,""),10)||0;
  const ORD={rojo:0,naranja:1,verde:2,amarillo:3,gris:4,sin:5};
  const FIL=[["todos","Todos",null],["pendiente","Retiro pendiente",["rojo"]],["proximo","Retiro próximo",["naranja"]],["lista","Lista para retirar",["verde"]],["t0","T0 se aproxima",["amarillo"]],["proceso","En proceso",["gris","sin"]],["sinlev","Sin levadura",["sinlev"]]];
  const SORT=[["lote","Consecutivo F (más antiguo)"],["fv","Número de FV"],["prioridad","Prioridad"],["t0","T0"]];
  let q="", sort="lote";
  App.accionFV=(st)=>["rojo","naranja","verde"].includes(st.k)?"retiro":st.k==="sin"?"datos":"muestra";
  function filas(fil){
    const now=Date.now(), activos=App.tanquesActivos(), act=activos.map(t=>{ const r=App.Calc.tanque(t,now); const st=t.retiro&&t.retiro.fecha?{k:"sinlev",txt:"SIN LEVADURA",cls:"none",ord:4}:App.Calc.estado(r,now); return {t,r,st}; }), F=FIL.find(x=>x[0]===fil)||FIL[0];
    const porTq={}; act.forEach(x=>{ porTq[x.t.tq]=x; });
    let l=F[2]?act.filter(x=>F[2].includes(x.st.k)):act.slice();
    if(q){ const Q=q.toUpperCase().replace(/\s+/g,""); l=l.filter(x=>x.libre?("FV"+x.tq).includes(Q):["FV"+x.t.tq,x.t.lote,(x.t.levadura||{}).nombre,x.r.nombreCosecha,x.t.marca].join(" ").toUpperCase().replace(/\s+/g,"").includes(Q)); }
    const S={lote:(a,b)=>(a.libre-b.libre)||(a.libre?a.tq-b.tq:loteNum(a.t.lote)-loteNum(b.t.lote)),fv:(a,b)=>(a.libre?a.tq:a.t.tq)-(b.libre?b.tq:b.t.tq),prioridad:(a,b)=>(a.libre-b.libre)||(a.libre?a.tq-b.tq:ORD[a.st.k]-ORD[b.st.k]||((a.r.t0||Infinity)-(b.r.t0||Infinity))),t0:(a,b)=>(a.libre-b.libre)||(a.libre?a.tq-b.tq:(a.r.t0?+a.r.t0:Infinity)-(b.r.t0?+b.r.t0:Infinity))};
    return {act,l:l.sort(S[sort]),now};
  }
  const unitank_svg = `<span class="unitank-art" aria-hidden="true">
    <svg viewBox="0 0 140 150" role="img" aria-label="Fermentador unitank">
      <defs>
        <linearGradient id="tankGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="currentColor" stop-opacity=".16"/>
          <stop offset=".52" stop-color="currentColor" stop-opacity=".035"/>
          <stop offset="1" stop-color="currentColor" stop-opacity=".11"/>
        </linearGradient>
      </defs>
      <path class="tank-stroke" d="M56 8h28M62 8v10M78 8v10M70 18v8"/>
      <path class="tank-stroke" d="M51 26h38l7 8H44z"/>
      <path class="tank-stroke tank-fill" d="M43 34h54v62l-9 18H52l-9-18z"/>
      <path class="tank-stroke" d="M43 34h54v62l-9 18H52l-9-18z"/>
      <path d="M47 39h46v55c0 8-5 14-11 18H58c-6-4-11-10-11-18z" fill="url(#tankGlow)"/>
      <path class="tank-stroke" d="M43 57h54M43 82h54"/>
      <path class="tank-stroke" d="M47 95h46" opacity=".55"/>
      <circle class="tank-stroke" cx="70" cy="36" r="5"/>
      <path class="tank-stroke" d="M70 41v12"/>
      <path class="tank-stroke" d="M43 67H27M97 67h16M27 62v10M113 62v10"/>
      <path class="tank-stroke" d="M88 54h13v13"/>
      <rect class="tank-stroke" x="92" y="47" width="12" height="9" rx="2"/>
      <path class="tank-stroke" d="M52 114l-7 22M88 114l7 22M42 137h18M80 137h18"/>
      <path class="tank-stroke" d="M70 118v13M64 131h12"/>
      <circle class="tank-led" cx="101" cy="50" r="2.3"/>
    </svg>
  </span>`;

  function fila(x,now){
    if(x.libre) return `<div class="tank-card tank-free" role="article">
      <div class="tank-top">
        <div>
          <div class="tank-fv"><span style="color:var(--muted)">FV</span> <b>${x.tq}</b></div>
          <div class="tank-lote"><b>Disponible</b><span>Sin lote registrado</span></div>
        </div>
        <span class="unitank-art" aria-hidden="true">
  <svg viewBox="0 0 100 100">
    <path class="tank-stroke" d="M40 12h20M46 12v7M54 12v7M50 19v7"/>
    <path class="tank-stroke tank-fill" d="M29 30c0-5 4-9 9-9h24c5 0 9 4 9 9v40c0 10-8 18-18 18H47c-10 0-18-8-18-18z"/>
    <path class="tank-stroke" d="M38 21h24c5 0 9 4 9 9v40c0 10-8 18-18 18H47c-10 0-18-8-18-18V30c0-5 4-9 9-9z"/>
    <path class="tank-stroke" d="M29 48h42M33 66h34"/>
    <path class="tank-stroke" d="M38 88v5M62 88v5M45 93h-9M55 93h9"/>
    <circle class="tank-stroke" cx="50" cy="30" r="3"/>
    <path class="tank-stroke" d="M50 33v7M68 57h8M24 57h5"/>
  </svg>
</span>
      </div>
      <div class="tank-info">
        <span class="label">Estado</span>
        <b>Sin lote</b>
        <small>Listo para registrar</small>
      </div>
      <div class="tank-bottom">
        <span></span>
        <div class="tank-action">
          <button class="btn sm" type="button" data-reg="${x.tq}">${C.icon("plus")}Registrar</button>
        </div>
      </div>
    </div>`;

    const {t,r}=x,
      st=App.T.estado(x.st),
      sinLev=!!(t.retiro&&t.retiro.fecha),
      L=t.levadura||{},
      gS=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion,
      gR=App.T.genResultante(r),
      av=App.T.genAviso(gR),
      nx=C.siguiente(r,x.st,now),
      acc=App.accionFV(x.st);

    const statusColor=C.stColor(x.st.k);

    return `<div class="tank-card" role="link" tabindex="0" data-go="tanque/${esc(t.lote)}" aria-label="Abrir FV ${t.tq}" style="--tank-color:${statusColor}">
      <div class="tank-top">
        <div>
          <div class="tank-fv">
            <a href="#/tanque/${esc(t.lote)}" data-qv="fv:${esc(t.lote)}">FV ${t.tq}</a>
          </div>
          <div class="tank-lote">
            <b>${esc(t.lote)}</b>
            <span>${esc(t.marca)}</span>
          </div>
        </div>
        ${unitank_svg}
      </div>

      <div class="tank-middle">
        <div class="tank-info">
          <span class="label">Levadura</span>
          <b>${esc(L.nombre||"—")}</b>
          <small>${gS!=null?`Gen ${gS}${av?` → Gen ${gR}`:""}`:"Sin generación"}</small>
        </div>
        <div class="tank-info">
          <span class="label">${sinLev?"Estado de levadura":"T0"}</span>
          ${sinLev
            ?`<b>Retirada</b><small>${fmtS(parseDT(t.retiro.fecha))}</small>`
            :r.t0
              ?`<b>${fmtS(r.t0)}</b><small>${esc(nx.txt)}</small>`
              :`<b class="muted">Sin T0</b><small>Faltan datos</small>`}
        </div>
      </div>

      <div class="tank-bottom">
        <div class="tank-status">
          ${C.status(st)}
          ${r.t0?`<small class="${x.st.k==="rojo"?"past":""}"
            ${nx.when?`data-cdtxt="${+nx.when}" data-cdlab="${esc(nx.lab)}"`:""}>${esc(nx.txt)}</small>`:""}
        </div>
        <div class="tank-action">
          ${sinLev
            ?`<span class="small muted">MES: ${t.mesCerrado===true||t.estadoMES==="CERRADO"?"Cerrado":"Abierto"}</span>`
            :acc==="retiro"
              ?`<button class="btn sm pri" type="button" data-ret="${esc(t.lote)}">Retirar</button>`
              :acc==="datos"
                ?`<a class="btn sm" href="#/tanque/${esc(t.lote)}">Completar</a>`
                :`<button class="btn sm" type="button" data-mue="${esc(t.lote)}">+ Muestra</button>`}
        </div>
      </div>
    </div>`;
  }

  function lista(fil){
    const {l,now}=filas(fil);
    if(!l.length) return `<div class="tank-empty">${C.empty("tank","Sin resultados",q?`Ningún FV coincide con "${q}".`:"No hay fermentadores en este estado.")}</div>`;
    return `<div class="tank-list" aria-label="Fermentadores">${l.map(x=>fila(x,now)).join("")}</div>`;
  }

  App.V.tanques={
    render(fil="todos"){
      const {act}=filas(fil);
      const cnt=F=>F[2]?act.filter(x=>F[2].includes(x.st.k)).length:act.length;
      const pendientes=act.filter(x=>x.st.k==="rojo").length, listos=act.filter(x=>x.st.k==="verde").length;
      const proceso=act.filter(x=>["gris","sin"].includes(x.st.k)).length, libres=Math.max(0,32-act.length);
      const col={pendiente:"var(--st-vencida)",proximo:"var(--st-vence)",lista:"var(--st-lista)",t0:"var(--st-prox)",proceso:"var(--st-espera)",sinlev:"var(--muted)"};

      return `<div class="tanques-v2">
        <div class="page-h">
          <div>
            <h1>Tanques</h1>
            <p>${act.length} fermentadores con seguimiento · ${act.filter(x=>x.st.k!=="sinlev").length} con levadura por retirar · ${act.filter(x=>x.st.k==="sinlev").length} sin levadura.</p>
          </div>
          <div class="acts">
            <button class="btn pri" type="button" id="crear">${C.icon("plus")}Registrar tanque</button>
          </div>
        </div>

        <section class="tank-overview" aria-label="Resumen de tanques">
          <a class="tank-overview-item urgent" href="#/tanques/pendiente"><span class="tank-overview-icon">!</span><span><small>Requieren retiro</small><b>${pendientes}</b></span><em>Ver pendientes →</em></a>
          <a class="tank-overview-item ready" href="#/tanques/lista"><span class="tank-overview-icon">✓</span><span><small>Listos para retirar</small><b>${listos}</b></span><em>Ver tanques →</em></a>
          <a class="tank-overview-item fermenting" href="#/tanques/proceso"><span class="tank-overview-icon">◷</span><span><small>En proceso</small><b>${proceso}</b></span><em>Ver seguimiento →</em></a>
          <div class="tank-overview-item available"><span class="tank-overview-icon">＋</span><span><small>Con seguimiento</small><b>${act.length}</b></span><em>fermentadores registrados</em></div>
        </section>

        <div class="tank-filter-row" role="group" aria-label="Filtrar">
          ${FIL.map(F=>`<button type="button" class="chip" aria-pressed="${fil===F[0]}" data-go="tanques/${F[0]}">
            ${col[F[0]]?`<i style="--c:${col[F[0]]}"></i>`:""}${F[1]}<span class="c">${cnt(F)}</span>
          </button>`).join("")}
        </div>

        <div class="tank-toolbar">
          <label class="search-in">
            ${C.icon("search")}
            <span class="sr-only">Buscar</span>
            <input id="tq" type="search" placeholder="Buscar FV, consecutivo F o levadura" value="${esc(q)}">
          </label>
          <label class="sortsel">Ordenar
            <select class="inp" id="tsort">
              ${SORT.map(([k,l])=>`<option value="${k}" ${sort===k?"selected":""}>${l}</option>`).join("")}
            </select>
          </label>
        </div>

        <div id="tlist">${lista(fil)}</div>
      </div>`;
    },
    mount(fil="todos"){
      document.getElementById("crear").onclick=()=>App.Act.crear();
      const up=()=>{ document.getElementById("tlist").innerHTML=lista(fil); };
      const i=document.getElementById("tq"); i.oninput=()=>{ q=i.value; up(); };
      document.getElementById("tsort").onchange=e=>{ sort=e.target.value; up(); };
      document.getElementById("tlist").addEventListener("click",e=>{
        const b=e.target.closest("button");
        if(!b) return;
        if(b.dataset.ret){ e.preventDefault(); e.stopPropagation(); App.Inv.retiro(b.dataset.ret); return; }
        if(b.dataset.mue){ e.preventDefault(); e.stopPropagation(); App.Act.agregarMuestra(b.dataset.mue); return; }
        if(b.dataset.reg){ e.preventDefault(); e.stopPropagation(); App.Act.crear(null,b.dataset.reg); return; }
        if(b.classList.contains("tank-card") && b.dataset.go){ e.preventDefault(); App.go(b.dataset.go); }
      });
      document.getElementById("tlist").addEventListener("keydown",e=>{
        if(e.key!=="Enter" && e.key!==" ") return;
        const b=e.target.closest(".tank-card");
        if(b?.dataset.go){ e.preventDefault(); App.go(b.dataset.go); }
      });
    }
  };
  function visualV4(r){
    const curva=(r.eo!=null?[{h:0,e:r.eo}]:[]).concat(r.pts.filter(p=>p.h>0||r.eo==null));
    const lp=curva[curva.length-1], pv=curva[curva.length-2];
    const v={p15:null,p75:null,seg:[],proy:r.proy?r.proy.pts:null};
    const vel=(lp&&pv&&lp.h>pv.h&&pv.e>lp.e)?(pv.e-lp.e)/(lp.h-pv.h):null;
    if(r.h15==null&&r.e15!=null&&lp&&lp.e>r.e15){ const h=r.h15proy??(vel?lp.h+(lp.e-r.e15)/vel:null); if(h!=null) v.p15={h,e:r.e15}; }
    if(r.h75==null&&r.e75!=null&&lp&&lp.e>r.e75){ const h=r.h75proy??r.h75proj??(vel?lp.h+(lp.e-r.e75)/vel:null); if(h!=null) v.p75={h,e:r.e75}; }
    if(lp&&r.t0&&r.T.metodo!=="marca"&&r.el!=null&&lp.e>r.el){
      let ini=lp;
      if(r.T.metodo==="curva"){ const eAt=h=>r.e15+(h-r.h15)*(r.e75-r.e15)/(r.h75-r.h15); const h0=Math.max(r.h75,lp.h); ini={h:h0,e:Math.max(eAt(h0),r.el)}; }
      v.seg=[ini]; if(v.p15&&v.p15.h>ini.h) v.seg.push(v.p15); if(v.p75&&v.p75.h>ini.h) v.seg.push(v.p75); if(r.T.horas>ini.h) v.seg.push({h:r.T.horas,e:r.el});
    }
    v.vel=r.T.metodo==="curva"?(r.e15-r.e75)/(r.h75-r.h15):r.T.metodo==="regresion"&&r.T.reg?-1/r.T.reg.b:r.T.metodo==="tendencia"?(r.e15-r.T.tend.e)/(r.T.tend.h-r.h15):(r.proy?-r.proy.vel:vel);
    return v;
  }
  function curvaV4(t,r,v){
    if(!r.fin) return C.empty("tank","Falta el fin de llenado","Sin esa hora no se puede dibujar la curva.");
    const tip=(a,b)=>`<b>${a}</b><br>${b}`, nar=window.innerWidth<640;
    const real=(r.eo!=null?[{x:0,y:r.eo,tip:tip("Fin de llenado",fmt(r.fin)+"<br>Extracto inicial "+f(r.eo)+" °P")}]:[]).concat(r.pts.filter(p=>p.h>0||r.eo==null).map(p=>({x:p.h,y:p.e,tip:tip(fmt(p.t),f(p.h,1)+" h · <b>"+f(p.e)+" °P</b>"+(p.obs?"<br>"+esc(p.obs):""))})));
    const proy=v.proy?v.proy.map(p=>({x:p.h,y:p.e,tip:tip("Proyección",f(p.h,1)+" h · "+f(p.e)+" °P · "+(r.velDia?f(r.velDia,2)+" °P/día":"tendencia"))})):[];
    const pr=[];
    if(r.h15!=null) pr.push({x:r.h15,y:r.e15,tip:tip("15 % de atenuación",f(r.h15,1)+" h · "+f(r.e15,2)+" °P")});
    if(r.h75!=null) pr.push({x:r.h75,y:r.e75,tip:tip("75 % de atenuación",f(r.h75,1)+" h · "+f(r.e75,2)+" °P")});
    const pe=[];
    if(v.p15) pe.push({x:v.p15.h,y:v.p15.e,tip:tip("15 % estimado",f(v.p15.h,1)+" h · "+f(v.p15.e,2)+" °P")});
    if(v.p75) pe.push({x:v.p75.h,y:v.p75.e,tip:tip("75 % estimado",f(v.p75.h,1)+" h · "+f(v.p75.e,2)+" °P")});
    const seg=v.seg.map((p,i)=>({x:p.h,y:p.e,tip:i===v.seg.length-1&&r.t0?tip("T0 "+(r.T.tipo==="proy"?"proyectado":"estimado"),fmt(r.t0)):null}));
    const vx=d=>d?(d-r.fin)/HOUR:null;
    const ahora=(Date.now()-r.fin)/HOUR;
    const hlines=[];
    if(r.e15!=null) hlines.push({y:r.e15,c:"var(--accent)",l:"15 % · "+f(r.e15)});
    if(r.e75!=null) hlines.push({y:r.e75,c:"var(--st-lista)",l:"75 % · "+f(r.e75)});
    if(r.el!=null) hlines.push({y:r.el,c:"var(--st-vencida)",l:"E. límite · "+f(r.el)});
    const vlines=[];
    if(vx(r.t0)!=null) vlines.push({x:vx(r.t0),c:"var(--est)",l:"T0",w:2,dash:true,dy:0});
    if(vx(r.mas12)!=null) vlines.push({x:vx(r.mas12),c:"var(--st-prox)",l:"+12 h",dash:true,dy:18});
    if(vx(r.venc)!=null) vlines.push({x:vx(r.venc),c:"var(--st-vencida)",l:"+24 h",dash:true,dy:36});
    if(isFinite(ahora)&&ahora>=0) vlines.push({x:ahora,c:"var(--muted)",l:"Ahora",dash:true,dy:54});
    const att=r.eo!=null&&r.el!=null&&r.ext!=null?(r.eo-r.ext)/(r.eo-r.el):null;
    const chips=`<div class="curve-summary">
      <div><span>Extracto actual</span><b>${r.ext!=null?f(r.ext,2)+" °P":"—"}</b></div>
      <div><span>Atenuación</span><b>${att!=null?Math.round(att*100)+" %":"—"}</b></div>
      <div><span>15 %</span><b>${r.h15!=null?f(r.h15,1)+" h":"estimado"}</b></div>
      <div><span>75 %</span><b>${r.h75!=null?f(r.h75,1)+" h":"estimado"}</b></div>
      <div><span>T0</span><b>${r.t0?fmtS(r.t0):"pendiente"}</b></div>
    </div>`;
    const chart=App.Chart.html({id:"curva-"+t.lote,h:nar?360:400,w:nar?500:900,fs:nar?12:11,xmin:0,xpad:10,xstep:24,xlab:"Horas desde fin de llenado",ylab:"Extracto (°P)",title:"Evolución del extracto · FV "+t.tq,
      series:[
        {n:"Muestras reales",c:"var(--ink)",w:3,pts:real},
        ...(proy.length?[{n:"Ritmo reciente proyectado",c:"var(--accent)",dash:true,dots:false,w:2.4,pts:proy}]:[]),
        ...(seg.length?[{n:"Ruta usada para calcular T0",c:"var(--est)",dash:true,dots:false,w:2,pts:seg}]:[]),
        ...(pr.length?[{n:"15 % / 75 % reales",c:"var(--st-lista)",line:false,r:6,pts:pr}]:[]),
        ...(pe.length?[{n:"15 % / 75 % estimados",c:"var(--est)",line:false,r:6,hollow:true,pts:pe}]:[])
      ],
      hlines, vlines,
      empty:"Registre una muestra para construir la curva."});
    return `<div class="curve-head"><div><span class="curve-eyebrow">LECTURA DEL PROCESO</span><h2 style="margin:0">Cómo evoluciona el extracto</h2><p class="muted" style="margin:4px 0 0">Los puntos son mediciones; las líneas punteadas son referencias calculadas.</p></div><span class="curve-badge">${r.pts.length} muestra${r.pts.length===1?"":"s"}</span></div>${chips}${chart}
      <section class="curve-guide" aria-label="Cómo leer la gráfica"><div class="curve-guide-title"><span>ⓘ</span><div><b>Cómo leer las líneas</b><small>La curva compara lo medido con estimaciones para planificar el retiro.</small></div></div>
        <div class="curve-guide-grid"><article><i class="guide-line real"></i><div><b>Línea blanca · mediciones reales</b><p>Une los extractos que se registraron en cada muestra.</p></div></article>
        <article><i class="guide-line projection"></i><div><b>Línea azul · ritmo reciente</b><p>Extiende la caída entre las dos últimas muestras. Es una orientación si el ritmo se mantiene; por sí sola no fija el T0.</p></div></article>
        <article><i class="guide-line t0-route"></i><div><b>Línea morada · cálculo del T0</b><p>Muestra el tramo de cálculo que llega al extracto límite. La vertical morada señala el T0 estimado; depende de las mediciones disponibles.</p></div></article>
        <article><i class="guide-line window"></i><div><b>Ventana de retiro · +12 h y +24 h</b><p>Desde el T0: +12 h es el momento ideal y +24 h es el máximo recomendado. La línea gris indica la hora actual.</p></div></article></div>
        <p class="curve-guide-foot">Las líneas horizontales marcan los umbrales del 15 %, 75 % y el extracto límite. Si falta una medición clave, el cálculo puede ser estimado o proyectado.</p></section>`;
  }
  function lineaVidaV4(t,r,v){
    const ret=(t.retiro||{}).fecha, hd=h=>h!=null&&r.fin?new Date(+r.fin+h*HOUR):null;
    const P=[["Llenado",r.fin,"real"],["15 %",r.h15!=null?hd(r.h15):hd(v.p15&&v.p15.h),r.h15!=null?(r.h15tipo==="manual"?"man":"real"):v.p15?"est":"pend"],["75 %",r.h75!=null?hd(r.h75):hd(v.p75&&v.p75.h),r.h75!=null?(r.h75tipo==="manual"?"man":"real"):v.p75?"est":"pend"],["T0",r.t0,r.t0?(r.T.tipo==="proy"?"proy":"est"):"pend"],["Retiro",ret?parseDT(ret):r.mas12,ret?"real":"pend"]];
    return `<ol class="life life-v2" aria-label="Línea de vida del lote">${P.map(([l,d,k])=>`<li class="lv-${k}"><span class="dot" aria-hidden="true"></span><b>${l}</b><span>${d?fmtS(d):"—"}</span><em>${k==="real"?"Real":k==="man"?"Manual":k==="est"?"Estimado":k==="proy"?"Proyectado":l==="Retiro"?"Ideal "+(r.mas12?fmtS(r.mas12):"—"):"Pendiente"}</em></li>`).join("")}</ol>`;
  }
  function tecnicoV4(t,r,v){
    const T=r.T, MET={curva:"Recta del 15 % al 75 % prolongada hasta el extracto límite",regresion:"Regresión de las muestras entre 15 % y 75 % (aún no llega al 75 %)",tendencia:"Tendencia desde el 15 % (aún no llega al 75 %)",marca:"Días por marca (sin datos suficientes)"};
    const kv=(k,x)=>`<div><div class="k">${k}</div><div class="v">${x}</div></div>`;
    const hr=(h,tipo)=>h!=null?f(h,2)+" h "+(tipo==="manual"?App.tipoTag("manual"):'<span class="tag real">REAL</span>'):"—";
    const datos=T.metodo==="regresion"&&T.pares&&T.pares.length?T.pares:r.pts;
    return `<details class="calc sec"><summary>${C.icon("flask")}Ver cálculo técnico<span class="small muted" style="font-weight:400">${esc(MET[T.metodo]||"Sin método")}</span><span class="chev">${C.icon("chev")}</span></summary><div class="in">
      <div class="kv">${kv("Fin de llenado",fmt(r.fin))}${kv("Extracto inicial",r.eo!=null?f(r.eo)+" °P":"—")}${kv("Extracto límite",r.el!=null?f(r.el)+" °P":"—")}
        ${kv("15 % ("+(r.e15!=null?f(r.e15,2)+" °P":"—")+")",r.h15!=null?hr(r.h15,r.h15tipo):v.p15?f(v.p15.h,1)+" h "+App.tipoTag("est"):"—")}
        ${kv("75 % ("+(r.e75!=null?f(r.e75,2)+" °P":"—")+")",r.h75!=null?hr(r.h75,r.h75tipo):v.p75?f(v.p75.h,1)+" h "+App.tipoTag("est"):"—")}
        ${kv("Velocidad de fermentación",v.vel!=null&&isFinite(v.vel)?f(v.vel,3)+" °P/h ("+f(v.vel*24,2)+" °P/día)":"—")}
        ${kv("Llegada al extracto límite",T.horas!=null?f(T.horas,1)+" h desde el llenado":"—")}
        ${kv("Resultado T0",r.t0?fmt(r.t0)+" "+App.tipoTag(T.tipo):"—")}
        ${T.r2!=null?kv("R²",f(T.r2,3)):""}${r.difExcel!=null?kv("Diferencia con el Excel",f(r.difExcel,0)+" min"):""}</div>
      <h3 style="font-size:.92rem;margin:18px 0 0">Cómo se obtuvo</h3><ol class="steps">${T.pasos.map(([k,x])=>`<li><span>${esc(k)}</span><b>${esc(x)}</b></li>`).join("")}</ol>
      ${datos.length?`<h3 style="font-size:.92rem;margin:18px 0 8px">Datos del cálculo</h3><div class="tw card"><table><thead><tr><th class="n">Horas</th><th class="n">Extracto (°P)</th></tr></thead><tbody>${datos.map(p=>`<tr><td class="n">${f(p.h,1)}</td><td class="n">${f(p.e)}</td></tr>`).join("")}</tbody></table></div>`:""}
      <div class="row" style="margin-top:14px"><button class="btn sm" type="button" data-a="bot">🤖 Pedir a Inventario de Levadura que lo explique</button></div></div></details>`;
  }
  App.V.tanque={
    render(lote){
      const t=App.S.tanques[lote];
      if(!t) return `<a class="back" href="#/tanques">${C.icon("arrowl")}Tanques</a>`+C.empty("tank","No se encontró el lote "+lote,"Puede que ya se haya retirado la levadura. Búsquelo en el Historial.");
      const now=Date.now(), r=App.Calc.tanque(t,now), st0=App.Calc.estado(r,now), st=App.T.estado(st0);
      const L=t.levadura||{}, T=r.T, ret=(t.retiro||{}).fecha, v=visualV4(r), sinLev=!!ret, mesCerrado=(t.mesCerrado===true||t.estadoMES==="CERRADO");
      const gS=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion;
      const gR=App.T.genResultante(r), av=App.T.genAviso(gR), nx=C.siguiente(r,st0,now);
      const fase=!r.t0?-1:now<+r.t0?0:now<+r.mas12?1:now<=+r.venc?2:3;
      const step=(i,k,d)=>`<div class="${fase===i?"on":""}" style="--c:${C.stColor(st0.k)};--b:${C.stBg(st0.k)}"><div class="k">${k}</div><div class="v">${fmtS(d)}</div><div class="r${d&&+d<now?" past":""}" ${!ret&&d?`data-cd="${+d}"`:""}>${ret?"":(d?countdown(d,now):"")}</div></div>`;
      const att=r.atenuacion;
      const falta=C.faltantes(t,r), acc=App.accionFV(st0);
      return `<a class="back" href="#/tanques">${C.icon("arrowl")}Tanques</a>
      <header class="fv-hero fade-in" style="--c:${C.stColor(st0.k)}">
        <div class="fv-hero-l">
          <div class="fv-hero-tag">${esc(t.marca)} · Gen ${gS??"—"}</div>
          <h1 class="fv-hero-t">FV ${t.tq} <span class="fv-hero-lote">${esc(t.lote)}</span></h1>
          <div class="fv-hero-lineage"><span><small>Levadura sembrada</small><b>${esc(L.nombre||"Sin levadura")}${L.generacion!=null?" · Gen "+L.generacion:""}</b></span><i aria-hidden="true">→</i><span><small>Próxima cosecha</small><b>${esc(r.nombreCosecha||"Por definir")}${gR!=null?" · Gen "+gR:""}</b></span></div>
          <div class="fv-hero-status">${C.status(st,true)}</div>
        </div>
        <div class="fv-hero-r">
          ${!ret?`<button class="btn ${acc==="retiro"?"pri":""} lg" type="button" data-a="retiro">${C.icon("exit")}Retirar levadura</button>`:`<span class="b">${mesCerrado?"CERRADO":"SIN LEVADURA"}</span>`}
          <button class="btn ${acc==="retiro"?"":"pri"} lg" type="button" data-a="muestra">${C.icon("plus")}Agregar muestra</button>
          ${!ret?`<div class="fv-hero-next"><small>PRÓXIMO PASO</small><b>${acc==="retiro"?"Registrar retiro de levadura":acc==="datos"?"Completar los datos del lote":"Continuar seguimiento con una muestra"}</b><span>${r.t0?esc(nx.txt):"El T0 se mostrará cuando haya datos suficientes"}</span></div>`:""}
        </div>
      </header>
      ${sinLev?`<div class="callout info fade-in"><b>Levadura retirada.</b> El FV permanece abierto en nuestra plataforma hasta que MES Core informe el cierre definitivo.${mesCerrado?` <b>MES Core ya lo cerró.</b>`:""}</div>`:""}
      ${av?`<div class="callout ${av.k==="rojo"?"err":"warn"} fade-in"><b>${esc(av.txt)}</b> Cosecha: ${esc(r.nombreCosecha)}.</div>`:""}
      ${t.borradorRetiro&&!ret?`<div class="callout info fade-in">Hay un <b>borrador de retiro</b> guardado ${fmtS(t.borradorRetiro.t)}. <button class="btn sm" type="button" data-a="retiro">Continuar retiro</button></div>`:""}
      <div class="fv-grid fade-in">
        <section class="fv-t0" style="--c:${C.stColor(st0.k)}" aria-label="T0 de retiro">
          <div class="fv-t0-h"><span class="lbl">RETIRO DE LEVADURA ${r.t0?App.tipoTag(T.tipo):""}</span>${!ret&&r.t0?`<span class="fv-t0-cd" style="color:${C.stColor(st0.k)}" data-cdtxt="${nx.when?+nx.when:""}" data-cdlab="${esc(nx.lab)}">${esc(nx.txt)}</span>`:""}</div>
          ${r.t0?`<div class="fv-clock">${String(r.t0.getHours()).padStart(2,"0")}:${String(r.t0.getMinutes()).padStart(2,"0")}</div><div class="fv-date">${App.U.fmtL(r.t0)}</div>`:`<div class="callout err"><b>No se puede calcular el T0.</b> Falta: ${esc(T.faltan.join(", "))}.</div>`}
          ${att!=null?`<div class="fv-att"><div class="fv-att-top"><span>Atenuación</span><b>${Math.round(att*100)} %</b></div><div class="fv-att-bar" role="progressbar" aria-valuenow="${Math.round(att*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${att*100}%;--c:${C.stColor(st0.k)}"></i><span class="mk" style="left:15%"></span><span class="mk" style="left:75%"></span></div><div class="fv-att-sub">Extracto actual <b>${f(r.ext)} °P</b>${r.falta75!=null?` · faltan <b>${f(r.falta75,2)} °P</b> para el 75 %`:""}${r.velDia?` · velocidad <b>${f(r.velDia,2)} °P/día</b>`:""}</div></div>`:""}
          ${r.t0?`<div class="wsteps">${step(1,"T0 · lista",r.t0)}${step(2,"Ideal · +12 h",r.mas12)}${step(3,"Máximo · +24 h",r.venc)}</div>`:""}
        </section>
        <aside class="fv-side" aria-label="Datos del lote">
          <div class="fv-side-h">Resumen del lote</div>
          <dl class="fv-facts">
            <div><dt>Fin de llenado</dt><dd>${fmt(r.fin)}</dd></div>
            <div><dt>Extracto original</dt><dd>${r.eo!=null?f(r.eo)+" °P":"—"}</dd></div>
            <div><dt>Extracto límite</dt><dd>${r.el!=null?f(r.el)+" °P":"—"}</dd></div>
            <div><dt>Muestras</dt><dd>${r.pts.length}</dd></div>
            <div><dt>Última muestra</dt><dd>${r.extFecha?fmtS(r.extFecha):"—"}</dd></div>
            <div><dt>Velocidad actual</dt><dd>${r.velDia?f(r.velDia,2)+" °P/día":"—"}</dd></div>
          </dl>
          ${falta.length?`<div class="fv-side-miss">${C.icon("alert")}Falta: ${esc(falta.join(", "))} <button class="btn sm ghost" type="button" data-a="editar">Completar</button></div>`:""}
          <div class="fv-side-acts">
            <button class="btn ghost sm" type="button" data-a="editar">${C.icon("edit")}Editar datos</button>
            <button class="btn ghost sm" type="button" data-a="horas">${C.icon("sliders")}Ajustar 15 / 75</button>
          </div>
        </aside>
      </div>
      <section class="card card-p sec fade-in" aria-label="Línea de vida"><div class="sec-h"><h2>Línea de vida</h2><span class="small muted">● real · ◉ manual · ◌ estimado</span></div>${lineaVidaV4(t,r,v)}</section>
      <section class="card card-p sec fade-in curve-panel" aria-label="Curva de fermentación">${curvaV4(t,r,v)}</section>
      <section class="card sec fade-in" aria-label="Muestras de extracto" style="overflow:hidden">
        <div class="sec-h card-p" style="margin:0;padding-bottom:10px"><h2>Muestras de extracto <span class="muted small">(${r.pts.length})</span></h2><span class="spacer"></span><button class="btn sm pri" type="button" data-a="muestra">${C.icon("plus")}Agregar muestra</button></div>
        ${r.pts.length?`<div class="tw"><table><thead><tr><th>Fecha y hora</th><th class="n hide-sm">Horas</th><th class="n">Extracto</th><th class="n hide-sm">Atenuación</th><th class="hide-sm">Observación</th><th class="n">Acciones</th></tr></thead><tbody>${r.pts.slice().reverse().map(p=>`<tr class="row-anim"><td>${fmt(p.t)}</td><td class="n hide-sm">${f(p.h,1)}</td><td class="n"><b>${f(p.e)} °P</b></td><td class="n hide-sm">${r.eo!=null&&r.el!=null?pc((r.eo-p.e)/(r.eo-r.el)):"—"}</td><td class="hide-sm">${esc(p.obs||"")}</td><td class="n"><div class="row-act"><button class="btn sm ghost" type="button" data-edit="${p.i}" title="Editar">${C.icon("edit")}</button><button class="btn sm ghost" type="button" data-del="${p.i}" title="Eliminar">${C.icon("trash")}</button></div></td></tr>`).join("")}</tbody></table></div>`:`<div class="card-p" style="padding-top:0">${C.empty("sample","Aún no hay muestras","Registre la primera muestra con el botón “Agregar muestra”.")}</div>`}
      </section>
      ${tecnicoV4(t,r,v)}
      <div class="row fade-in" style="margin-top:16px"><span class="spacer"></span><button class="btn dan" type="button" data-a="eliminar">${C.icon("trash")}Eliminar tanque</button></div>`;
    },
    mount(lote){
      if(!App.S.tanques[lote]) return;
      document.querySelectorAll("#view [data-a]").forEach(b=>b.onclick=()=>{ const a=b.dataset.a;
        if(a==="muestra") App.Act.agregarMuestra(lote); if(a==="retiro") App.Inv.retiro(lote); if(a==="editar") App.Act.editar(lote); if(a==="horas") App.Act.horas(lote); if(a==="eliminar") App.Act.eliminar(lote); if(a==="bot") App.Bot.abrir({tipo:"fv",lote}); });
      document.querySelectorAll("#view [data-edit]").forEach(b=>b.onclick=()=>App.Act.editarMuestra(lote, +b.dataset.edit));
      document.querySelectorAll("#view [data-del]").forEach(b=>b.onclick=async()=>{ if(!await App.Sec.confirmar("¿Quitar muestra?","La curva y el T0 se recalcularán.","Quitar muestra")) return; const d=clone(App.S.tanques[lote]); d.muestras.splice(+b.dataset.del,1); if(await App.Store.set("tanques",lote,d)) toast("Muestra quitada"); });
    }
  };
})();

/* ============================================================
   levaduras.js — Levaduras + Colectores + Historial
   ============================================================ */
(function(){
  const {esc,f,fmt,fmtS,pc,num,parseDT,HOUR,DAY,dur,toast} = App.U, C=App.C;
  const ORD={rojo:0,naranja:1,verde:2,amarillo:3,gris:4,sin:5};
  const P=id=>id.toUpperCase().replace("-","-P");
  const colorT=k=>({verde:"var(--st-lista)",naranja:"var(--st-vence)",rojo:"var(--st-vencida)",sin:"var(--st-sin)"})[k];
  document.addEventListener("click",e=>{ const b=e.target.closest&&e.target.closest("[data-pa]"); if(!b) return; const [a,id]=b.dataset.pa.split("|");
    const d=b.closest("dialog"); if(d&&a!=="nota"&&a!=="recos"){ d.close(); d.remove(); }
    ({sembrar:()=>App.Store.canWrite?App.Act.crear(id):toast("Modo de solo lectura."),marcar:()=>App.Act.marcarDescarte(id),recuperar:()=>App.Act.recuperar(id),vol:()=>App.Act.ajustarVolumen(id),liberar:()=>App.Act.quitar(id),recos:()=>App.Act.recos(id),okrecos:()=>App.Act.okRecosecha(id),agregarrecosecha:()=>App.Act.agregarRecosecha(id),nota:()=>App.Act.nota(id),bot:()=>App.Bot.abrir({tipo:"lev",nombre:App.S.colectores[id].nombre,pos:id})}[a]||(()=>0))(); });
  function posicion(id,c,now=Date.now()){
    if(!c){
      const origenId=id.endsWith("-2")?id.slice(0,-1)+"1":null, origen=origenId&&App.S.colectores[origenId], aprobada=!!(origen&&origen.recosechar&&origen.recosechaAprobada);
      return `<div class="posx libre"><span class="pos">${P(id)}</span>${C.status({k:"verde",txt:"Disponible"})}<span class="small muted">Posición libre para la próxima cosecha.</span><div class="collector-empty-note">${aprobada?`P1 tiene una recosecha aprobada. Puedes agregar aquí el volumen nuevo sin modificar P1.`:"Aquí aparecerá automáticamente la próxima levadura que sea enviada a este colector."}</div>${aprobada?`<button class="btn sm decision-btn-add" type="button" data-pa="agregarrecosecha|${origenId}">＋ Agregar recosecha desde P1</button>`:""}</div>`;
    }
    const tc=App.T.tiempoColector(c,now), e=App.T.estadoLevColector(c,now), av=App.T.genAvisoColector(c);
    const inicio=parseDT(c.retiro), fin=parseDT(c.finRemocion||c.ingreso), ingreso=parseDT(c.ingreso||c.finRemocion||c.retiro), t0=parseDT(c.t0), maxCopec=parseDT(c.maxCopec), maxAbi=parseDT(c.maxAbi);
    const durCosecha=(inicio&&fin)?Math.max(0,fin-inicio):null;
    const tiempoCol=ingreso?Math.max(0,now-ingreso):null;
    const desdeT0=t0?Math.max(0,now-t0):null;
    const pctTiempo=maxAbi&&ingreso?Math.max(0,Math.min(100,((now-ingreso)/(maxAbi-ingreso))*100)):null;
    const fecha=(d)=>d?fmtS(d):"—";
    const restante=(d)=>d?(+d-now>=0?"quedan "+dur(+d-now):"fuera de tiempo hace "+dur(now-+d)):"—";
    const decisionClass=c.marcaDescarte?"decision-discard":c.recosechar?(c.recosechaAprobada?"decision-approved":"decision-reharvest"):"";
    const siblingId=id.endsWith("-1")?id.slice(0,-1)+"2":id.slice(0,-1)+"1", sibling=App.S.colectores[siblingId];
    const siblingSame=sibling&&((c.levId&&sibling.levId===c.levId)||(String(sibling.nombre||"").trim().toUpperCase()===String(c.nombre||"").trim().toUpperCase()&&String(sibling.generacion??"")===String(c.generacion??"")&&String(sibling.marca||"")===String(c.marca||"")));
    const origenRecId=id.endsWith("-2")?siblingId:id, origenRec=id.endsWith("-2")?sibling:c;
    const destinoRecId=id.endsWith("-2")?id:siblingId, destinoRec=id.endsWith("-2")?c:sibling;
    const destinoSame=destinoRec&&((origenRec?.levId&&destinoRec.levId===origenRec.levId)||(String(destinoRec.nombre||"").trim().toUpperCase()===String(origenRec?.nombre||"").trim().toUpperCase()&&String(destinoRec.generacion??"")===String(origenRec?.generacion??"")&&String(destinoRec.marca||"")===String(origenRec?.marca||"")));
    const canAdd=!!(origenRec&&origenRec.recosechar&&origenRec.recosechaAprobada&&(!destinoRec||destinoSame)&&!(destinoRec&&destinoRec.marcaDescarte));
    return `<div class="posx collector-detail ${decisionClass}" style="--c:${colorT(tc.k)}">
      <div class="collector-detail-head">
        <div><span class="pos">${P(id)}</span><div class="nm">${esc(c.nombre)}</div><div class="collector-sub">${esc(c.marca||"—")} · Generación ${c.generacion??"—"} · FV ${esc(c.tq||"—")}${c.lote?` · Lote ${esc(c.lote)}`:""}</div></div>
        <div class="collector-detail-status">${C.status(e)}${c.recosechar?'<span class="tag manual">🔄 RECOSECHAR</span>':""}</div>
      </div>

      <div class="collector-time-hero">
        <div class="collector-time-main"><span class="ey">TIEMPO ACTUAL EN COLECTOR</span><strong>${tiempoCol!=null?dur(tiempoCol):"Sin fecha de ingreso"}</strong><span>${ingreso?`Desde ${fecha(ingreso)}`:"No hay ingreso registrado"}</span></div>
        <div class="collector-time-track"><div class="track-label"><span>Ingreso al colector</span><span>${maxAbi?"Límite ABI":"Sin límite ABI"}</span></div><div class="track"><i style="width:${pctTiempo!=null?pctTiempo:0}%"></i></div><div class="track-foot"><span>${ingreso?fecha(ingreso):"—"}</span><b>${maxAbi?restante(maxAbi):"—"}</b></div></div>
      </div>

      <div class="collector-section-title">🕐 Cronología de la cosecha</div>
      <div class="collector-timeline">
        <div class="ct-step"><span class="ct-dot"></span><div><b>Inicio de cosecha</b><strong>${fecha(inicio)}</strong><small>Momento en que comenzó el retiro desde el FV</small></div></div>
        <div class="ct-line"></div>
        <div class="ct-step"><span class="ct-dot"></span><div><b>Fin de cosecha</b><strong>${fecha(fin)}</strong><small>${durCosecha!=null?`Duración de cosecha: <b>${dur(durCosecha)}</b>`:"Sin duración calculable"}</small></div></div>
        <div class="ct-line"></div>
        <div class="ct-step active"><span class="ct-dot"></span><div><b>Ingreso al colector</b><strong>${fecha(ingreso)}</strong><small>Tiempo transcurrido desde el ingreso: <b>${tiempoCol!=null?dur(tiempoCol):"—"}</b></small></div></div>
      </div>

      <div class="collector-section-title">📊 Estado y calidad de la levadura</div>
      <div class="collector-metrics">
        <div><span>Volumen actual</span><b>${f(num(c.vol),0)} Hl</b>${c.volInicial!=null?`<small>Inicial: ${f(num(c.volInicial),0)} Hl</small>`:""}</div>
        <div><span>Viabilidad</span><b>${pc(c.viab)}</b><small>Último valor registrado</small></div>
        <div><span>Consistencia</span><b>${pc(c.cons)}</b><small>Último valor registrado</small></div>
        <div><span>pH</span><b>${f(num(c.ph))}</b><small>Último valor registrado</small></div>
        <div><span>Sensorial</span><b>${esc(c.sensorial||"—")}</b><small>${c.respSensorial?"Responsable: "+esc(c.respSensorial):"Sin responsable"}</small></div>
        <div><span>Desde T0</span><b>${desdeT0!=null?dur(desdeT0):"—"}</b><small>${t0?"T0: "+fecha(t0):"Sin T0"}</small></div>
      </div>

      <div class="collector-deadlines">
        <div><span>Máximo COPeC</span><b>${fecha(maxCopec)}</b><small>${maxCopec?restante(maxCopec):"Sin fecha registrada"}</small></div>
        <div><span>Máximo ABI / resiembra</span><b>${fecha(maxAbi)}</b><small>${maxAbi?restante(maxAbi):"Sin fecha registrada"}</small></div>
      </div>

      ${av?`<div class="callout ${av.k==="rojo"?"err":"warn"}" style="margin:12px 0">Al sembrarla: ${esc(av.txt.replace("Esta cosecha","la próxima cosecha"))}</div>`:""}
      ${c.marcaDescarte?`<div class="decision-banner decision-banner-discard"><b>⚠ Marcada para descarte</b><span>${c.marcaDescarte.t?fecha(c.marcaDescarte.t):""}${c.marcaDescarte.motivo?" · "+esc(c.marcaDescarte.motivo):""}</span></div>`:""}
      ${c.recosechar?`<div class="decision-banner ${c.recosechaAprobada?"decision-banner-approved":"decision-banner-reharvest"}"><b>${c.recosechaAprobada?"✓ Recosecha aprobada":"↻ Recosecha pendiente de aprobación"}</b><span>${c.recosechaAprobada?`${id.endsWith("-1")?`P1 conserva su volumen; puedes agregar más a ${P(siblingId)} · `:"Para agregar volumen, aprueba desde P1 · "}${c.okRecosechaEn?"Aprobada el "+fecha(c.okRecosechaEn):""}`:c.recosechaMarcadaEn?"Marcada el "+fecha(c.recosechaMarcadaEn):""}</span></div>`:""}
      ${(c.notas||[]).length?`<div class="collector-notes"><b>Bitácora / notas</b><ul class="notas">${c.notas.map(n=>`<li>📝 ${esc(n.txt)} <span class="muted small">${fecha(n.t)}</span></li>`).join("")}</ul></div>`:""}
      <div class="acts"><button class="btn sm pri" type="button" data-pa="sembrar|${id}">${C.icon("plus")}Sembrar</button>${c.marcaDescarte?`<button class="btn sm" type="button" data-pa="recuperar|${id}">↩︎ Recuperar</button>`:`<button class="btn sm" type="button" data-pa="marcar|${id}">🟠 Marcar para descarte</button>`}<button class="btn sm ${c.recosechar?"decision-btn-reharvest":""}" type="button" data-pa="recos|${id}">${c.recosechar?"Quitar marca":"↻ Marcar recosecha"}</button>${c.recosechar?`<button class="btn sm ${c.recosechaAprobada?"decision-btn-approved":"decision-btn-approve"}" type="button" data-pa="okrecos|${id}">${c.recosechaAprobada?"✓ OK aprobado · Retirar OK":"✓ Dar OK a recosecha"}</button>`:""}${origenRec&&origenRec.recosechar&&origenRec.recosechaAprobada?`<button class="btn sm decision-btn-add" type="button" data-pa="agregarrecosecha|${origenRecId}" ${canAdd?"":"disabled"}>＋ Agregar más a ${P(destinoRecId)}</button>${destinoRec&&!destinoSame?`<span class="small muted">${P(destinoRecId)} está ocupada por otra levadura. Libérala antes de agregar esta recosecha.</span>`:""}`:""}<button class="btn sm" type="button" data-pa="nota|${id}">+ Agregar nota</button><button class="btn sm" type="button" data-pa="vol|${id}">Actualizar volumen</button><button class="btn sm dan" type="button" data-pa="liberar|${id}">Liberar colector</button><button class="btn sm ghost" type="button" data-pa="bot|${id}" title="Preguntar a Cifra" aria-label="Preguntar a Cifra">${C.icon("bot")}</button></div>
    </div>`;
  }

  App.posicionHTML=posicion;
  App.V.levaduras={
    render(){
      const now=Date.now();
      const pend=App.D.pend(now).sort((a,b)=>ORD[a.st.k]-ORD[b.st.k]||((a.r.t0||Infinity)-(b.r.t0||Infinity)));
      const activos=pend.length;
      const urgentes=pend.filter(x=>["rojo","naranja","verde"].includes(x.st.k)).length;
      const sinT0=pend.filter(x=>!x.r.t0).length;
      const desc=Object.values(App.S.bdlev).filter(b=>b.destino==="DES").concat(Object.values(App.S.colhist).filter(h=>/descart/i.test(h.motivo||"")).map(h=>({nombre:h.nombre,retiro:h.salida,destinoDescarte:"desde "+P(h.pos),tq:h.tq,generacion:h.generacion}))).sort((a,b)=>String(b.retiro).localeCompare(String(a.retiro))).slice(0,4);

      const gens={};
      pend.forEach(({t})=>{
        const L=t.levadura||{}, g=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion;
        if(g!=null) gens[g]=(gens[g]||0)+1;
      });
      const genRows=Object.entries(gens).map(([g,n])=>[Number(g),n]).sort((a,b)=>a[0]-b[0]);
      const maxGen=Math.max(1,...genRows.map(x=>x[1]));
      const conT0=pend.filter(x=>x.r.t0).length;
      const totalMuestras=pend.reduce((n,x)=>n+(x.r.pts||[]).length,0);
      const promGen=genRows.length?genRows.reduce((a,[g,n])=>a+g*n,0)/activos:null;
      const genCfg=Object.assign({alerta:8,seguimiento:6},App.S.config.generaciones||{});
      const genActual=[];
      Object.values(App.S.tanques||{}).forEach(t=>{ const L=t.levadura||{}, g=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion; if(g!=null&&L.nombre) genActual.push({nombre:L.nombre,g:+g,ubicacion:`FV ${t.tq}`,lote:t.lote,activo:true}); });
      Object.entries(App.S.colectores||{}).forEach(([id,c])=>{ if(c&&c.nombre&&c.generacion!=null) genActual.push({nombre:c.nombre,g:+c.generacion,ubicacion:id.toUpperCase().replace("-","-P"),lote:c.lote,activo:true}); });
      const genByName={}; genActual.forEach(x=>{ const k=String(x.nombre).toUpperCase(); if(!genByName[k]) genByName[k]={nombre:x.nombre,g:x.g,loc:[],count:0}; genByName[k].g=Math.max(genByName[k].g,x.g); genByName[k].loc.push(x.ubicacion); genByName[k].count++; });
      const genActualRows=Object.values(genByName).sort((a,b)=>b.g-a.g||a.nombre.localeCompare(b.nombre));
      const genCrit=genActualRows.filter(x=>x.g>=genCfg.alerta);
      const genWarn=genActualRows.filter(x=>x.g>=genCfg.seguimiento&&x.g<genCfg.alerta);
      const futuras=[]; pend.forEach(({t,r})=>{ const g=App.T.genResultante(r); if(g!=null&&g>=genCfg.alerta) futuras.push({fv:t.tq,nombre:r.nombreCosecha,g}); });
      const totalGenAlert=genCrit.length;

      return `<div class="page-h yeast-page-head"><div><span class="yeast-eyebrow">BANCO DE LEVADURA</span><h1>Levaduras</h1><p>Disponibilidad, retiros próximos y generaciones en un solo lugar.</p><div class="yeast-followup">${activos?`${conT0} de ${activos} lotes con T0 · ${totalMuestras} muestras registradas${sinT0?` · ${sinT0} lotes sin T0`:""}`:"Todavía no hay lotes activos."}</div></div>
        <div class="acts">${App.downloads?`<button class="btn" type="button" id="expInv">${C.icon("download")}Exportar</button>`:""}</div></div>

      <section class="sec lev-bank-overview">
        <div class="sec-h"><div><h2>Estado del banco</h2><span class="small muted">Resumen operativo de las levaduras activas</span></div></div>
        <div class="lev-kpis">
          <div class="lev-kpi"><span>En fermentadores</span><b>${activos}</b><small>lotes activos</small></div>
          <div class="lev-kpi critical"><span>Atención</span><b>${pend.filter(x=>x.st.k==="rojo").length}</b><small>retiro vencido</small></div>
          <div class="lev-kpi warning"><span>Próximas</span><b>${pend.filter(x=>x.st.k==="naranja").length}</b><small>entre +12 h y +24 h</small></div>
          <div class="lev-kpi"><span>Generación media</span><b>${promGen!=null?f(promGen,1):"—"}</b><small>entre lotes activos</small></div>
        </div>
      </section>

      <section class="sec gen-counter">
        <div class="sec-h"><div><h2>Seguimiento de generaciones</h2><span class="small muted">Cuenta las generaciones activas para que tengas presente cómo está el banco.</span></div><span class="gen-counter-total">${genRows.reduce((a,[g,n])=>a+n,0)} líneas</span></div>
        ${genRows.length?`<div class="gen-counter-main">
          <div class="gen-counter-current"><span class="small muted">Generación más alta activa</span><strong>Gen ${Math.max(...genRows.map(([g])=>g))}</strong><span class="small muted">${genRows.filter(([g])=>g===Math.max(...genRows.map(([g])=>g))).reduce((a,[g,n])=>a+n,0)} línea${genRows.filter(([g])=>g===Math.max(...genRows.map(([g])=>g))).reduce((a,[g,n])=>a+n,0)!==1?'s':''}</span></div>
          <div class="gen-counter-list">${genRows.map(([g,n])=>{const highest=Math.max(...genRows.map(([x])=>x)); const near=g>=Math.max(1,highest-1); return `<div class="gen-count-row"><span class="gen-count-label">Gen ${g}</span><div class="gen-count-track"><i style="width:${Math.max(8,n/maxGen*100)}%"></i></div><b>${n}</b><span class="gen-count-state ${near?'watch':''}">${near?'Vigilar':'Activa'}</span></div>`}).join('')}</div>
        </div>`:`<div class="muted small">No hay generaciones registradas.</div>`}
      </section>

      <section class="sec"><div class="sec-h"><div><h2>Prioridad de retiro</h2><span class="small muted">Ordenada automáticamente por T0 y ventana de retiro</span></div></div>
        ${pend.length?`<div class="lev-priority-grid" role="list">
        ${pend.map(({t,r,st},idx)=>{ const L=t.levadura||{}, gS=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion, gR=App.T.genResultante(r), av=App.T.genAviso(gR), age=r.t0?Math.max(0,now-r.t0):0, pct=r.t0?Math.min(100,Math.max(0,age/(24*HOUR)*100)):0, rank=r.t0?idx+1:null, urgent=st.k, label=urgent==="rojo"?"RETIRAR AHORA":urgent==="naranja"?"PRÓXIMA":urgent==="verde"?"EN VENTANA":"SIN T0", color=urgent==="rojo"?"rojo":urgent==="naranja"?"naranja":urgent==="verde"?"verde":"gris", over=r.t0&&age>24*HOUR?dur(age-24*HOUR):null;
          return `<a class="lev-priority-item ${color}" role="listitem" href="#/tanque/${esc(t.lote)}" data-qv="fv:${esc(t.lote)}" style="--p:${pct}%">
            <div class="lp-top"><span class="lp-rank">${rank||"—"}</span><b>FV ${esc(t.tq)}</b><span class="lp-status">${label}</span></div>
            <div class="lp-meta"><span>${esc(L.nombre||"Sin levadura")}</span>${gS!=null?`<span>Gen ${gS}${gR!=null?` → Gen ${gR}`:""}</span>`:""}</div>
            <div class="lp-age">${r.t0?dur(age):"Sin T0"} ${r.t0?"desde T0":""}</div>
            <div class="lp-bar"><i style="width:${pct}%"></i></div>
            <div class="lp-foot"><span>T0 ${r.t0?fmtS(r.t0):"—"}</span><span>${over?`+${over} sobre máximo`:r.t0?`${Math.round(pct)}% de la ventana`:"Falta referencia"}</span></div>
          </a>`; }).join("")}</div>`:C.empty("check","No hay levaduras activas","Los fermentadores aparecerán aquí al registrar un lote.")}</section>

      <section class="sec"><div class="sec-h"><div><h2>Cadena de generaciones</h2><span class="small muted">Origen → generación resultante por fermentador</span></div><a class="more" href="#/tanques">Ver tanques</a></div>
        <div class="lev-chain-list">${pend.slice(0,8).map(({t,r})=>{ const L=t.levadura||{}, gS=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion, gR=App.T.genResultante(r); return `<a class="lev-chain" href="#/tanque/${esc(t.lote)}"><span class="chain-fv">FV ${esc(t.tq)}</span><span class="chain-lev">${esc(L.nombre||"Sin levadura")}</span><span class="chain-gen">${gS!=null?`Gen ${gS}`:"—"} <i>→</i> ${gR!=null?`Gen ${gR}`:"pendiente"}</span><span class="chain-t0">${r.t0?fmtS(r.t0):"Sin T0"}</span></a>`; }).join("")}</div>
      </section>

      ${desc.length?`<section class="sec"><div class="sec-h"><div><h2>Descartadas recientemente</h2><span class="small muted">Últimos movimientos del banco</span></div><a class="more" href="#/historial">Historial</a></div><div class="card card-p" style="padding-top:4px;padding-bottom:4px">${C.timeline(desc.map(b=>({ic:"trash",cls:"err",t1:(b.nombre||"Levadura")+(b.generacion!=null?" · Gen "+b.generacion:"")+" · Descartada",t2:"FV "+(b.tq||"—")+" · "+(b.destinoDescarte||""),time:fmtS(b.retiro)})))}</div></section>`:""}`;
    },
    mount(){ document.querySelectorAll("#view [data-ret]").forEach(b=>b.onclick=()=>App.Inv.retiro(b.dataset.ret)); const e=document.getElementById("expInv"); if(e) e.onclick=()=>App.Inv.exportar(); }
  };
  App.V.colectores={
    render(sel){
      const now=Date.now(); sel=sel?String(sel).replace(/\D/g,""):null;
      const collectorVisual=(n,uso,accent)=>{
        const fill=uso===2?100:uso===1?50:0;
        return `<span class="ccard-visual" aria-label="Colector C${n}, ${uso} de 2 posiciones ocupadas">
          <svg viewBox="0 0 92 112" role="img" aria-hidden="true">
            <defs>
              <clipPath id="ccClip${n}"><rect x="17" y="23" width="58" height="75" rx="10"/></clipPath>
              <linearGradient id="ccGlow${n}" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="${accent}" stop-opacity=".98"/><stop offset="1" stop-color="${accent}" stop-opacity=".58"/>
              </linearGradient>
            </defs>
            <rect x="17" y="23" width="58" height="75" rx="10" fill="none" stroke="currentColor" stroke-width="3"/>
            <rect x="25" y="10" width="42" height="15" rx="6" fill="none" stroke="currentColor" stroke-width="3"/>
            <path d="M46 4v7M39 4h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            <path d="M17 43h58M17 73h58" fill="none" stroke="currentColor" stroke-width="2" opacity=".48"/>
            <rect x="17" y="${98-fill*.75}" width="58" height="${fill*.75}" fill="url(#ccGlow${n})" clip-path="url(#ccClip${n})"/>
            <circle cx="46" cy="39" r="5" fill="${accent}" opacity="${uso?0.98:0.25}"/>
            <path d="M46 98v9M39 107h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </span>`;
      };
      const card=n=>{ const ps=[1,2].map(s=>[`c${n}-${s}`,App.S.colectores[`c${n}-${s}`]]), uso=ps.filter(p=>p[1]).length;
        const peor=ps.filter(p=>p[1]).map(([,c])=>App.T.tiempoColector(c,now).k).sort((a,b)=>({rojo:0,naranja:1,verde:2,sin:3}[a]-{rojo:0,naranja:1,verde:2,sin:3}[b]))[0];
        const marc=ps.some(p=>p[1]&&p[1].marcaDescarte);
        const recosPend=ps.some(p=>p[1]&&p[1].recosechar&&!p[1].recosechaAprobada);
        const recosOk=ps.some(p=>p[1]&&p[1].recosechar&&p[1].recosechaAprobada);
        const decision=marc?"flag-discard":recosPend?"flag-reharvest":recosOk?"flag-approved":"";
        const est=!uso?{k:"verde",txt:"Disponible"}:peor==="rojo"?{k:"rojo",txt:"Fuera de tiempo"}:peor==="naranja"?{k:"naranja",txt:"Cerca del límite"}:marc?{k:"naranja",txt:"Con marca de descarte"}:{k:"verde",txt:uso===2?"Lleno · en tiempo":"En uso · en tiempo"};
        const col={verde:"var(--st-lista)",naranja:"var(--st-vence)",rojo:"var(--st-vencida)",sin:"var(--st-sin)"}[est.k];
        const colBg={verde:"var(--st-lista-bg)",naranja:"var(--st-vence-bg)",rojo:"var(--st-vencida-bg)",sin:"var(--st-sin-bg)"}[est.k];
        return `<button type="button" class="ccard ${decision}${sel===String(n)?" on":""}" data-go="colectores/${n}" data-qv="col:${n}" aria-pressed="${sel===String(n)}" style="--c:${col};--c-bg:${colBg}">
          <div class="ccard-top">
            <div class="ccard-title"><div class="cn">C${n}</div><div class="cap">${uso}/2 posiciones</div></div>
            <span class="status-chip">${C.status(est)}</span>
          </div>
          <div class="ccard-body">
            ${collectorVisual(n,uso,col)}
            <div class="ccard-info">
              <div class="ccard-fill-label">${uso===0?"Colector vacío":uso===1?"1 levadura en colector":"2 levaduras · completo"}</div>
              <div class="ccard-fill-track"><i style="width:${uso===2?100:uso===1?50:0}%;background:${col}"></i></div>
              <div class="ccard-names">${ps.map(([id,c])=>c?`${esc(c.nombre)}${c.marcaDescarte?'<span class="ccard-decision discard">Descarte</span>':c.recosechar?`<span class="ccard-decision ${c.recosechaAprobada?"approved":"reharvest"}">${c.recosechaAprobada?"Recosecha OK":"Recosechar"}</span>`:""}`:"libre").join(" · ")}</div>
            </div>
          </div>
        </button>`; };
      let h=`<div class="page-h"><div><h1>Colectores</h1><p>6 colectores de 2 posiciones. Seleccione uno para ver sus posiciones, el tiempo en colector y su bitácora.</p></div></div>
        <div class="cgrid">${[1,2,3,4,5,6].map(card).join("")}</div>`;
      if(sel){ const hist=Object.values(App.S.colhist).filter(x=>String(x.pos||"").startsWith(`c${sel}-`)).sort((a,b)=>String(b.salida).localeCompare(String(a.salida)));
        h+=`<section class="card card-p sec cpanel" aria-label="Colector C${sel}"><div class="sec-h"><h2>Colector C${sel}</h2><span class="spacer"></span><a class="btn sm ghost" href="#/colectores">${C.icon("x")}Cerrar</a></div>
          <div class="posgrid">${[1,2].map(s=>posicion(`c${sel}-${s}`,App.S.colectores[`c${sel}-${s}`],now)).join("")}</div>
          <h3 style="font-size:.95rem;margin:18px 0 8px">Bitácora del colector</h3>
          ${hist.length?`<ul class="tl">${hist.slice(0,30).map(x=>`<li><span class="ic">${C.icon("history")}</span><div class="m"><b>${P(x.pos)} · ${esc(x.nombre)}${x.generacion!=null?" · Gen "+x.generacion:""}</b><span>Ingreso ${fmtS(x.ingreso)} · Salida ${fmtS(x.salida)} · FV origen ${esc(x.tq||"—")} · ${esc(x.motivo||"")}${x.recosechar?" · 🔄 Recosechar":""}${(x.notas||[]).length?" · Nota: "+x.notas.map(n=>"“"+esc(n.txt)+"”").join(", "):""}</span></div></li>`).join("")}</ul>`:'<p class="small muted">Sin ocupaciones anteriores registradas.</p>'}</section>`; }
      return h;
    }
  };
  let hq="", hTipo="todos", hGen="", hDesde="", hHasta="", hFV="", hCol="", hMax=150, hOpen=-1;
  const TIPOS=[["todos","Todos"],["cosecha","Cosechas"],["descarte","Descartes"],["siembra","Siembras"],["colector","Colectores"],["marca","Marcas y recuperaciones"]];
  function eventos(){
    const ev=[], vistos=new Set();
    Object.entries(App.S.bdlev).forEach(([id,b])=>{ if(!b.retiro) return;
      if(b.destino==="DES") ev.push({tipo:"descarte",t:b.retiro,ic:"trash",cls:"err",t1:"Descarte · levadura de FV "+(b.tq||"—")+(b.lote?" · "+b.lote:""),t2:[b.levSembrada?"Sembrada: "+b.levSembrada:null,"Destino: "+(b.destinoDescarte||"—"),b.ventana==="demorado"?"retiro demorado":null].filter(Boolean).join(" · "),gen:b.generacion,fv:b.tq,lote:b.lote,col:"",lev:[b.nombre,b.levSembrada],id});
      else { const cols=[...new Set((b.colectores||[]).map(c=>"C"+c.colector))]; const vol=(b.colectores||[]).reduce((a,c)=>a+(num(c.vol)||0),0);
        ev.push({tipo:"cosecha",t:b.retiro,ic:"yeast",cls:"ok",t1:"Cosecha · "+b.nombre+(b.generacion!=null?" · Gen "+b.generacion:""),t2:["De FV "+(b.tq||"—")+(b.lote?" · "+b.lote:""),b.levSembrada?"sembrada con "+b.levSembrada:null,cols.length?"→ "+cols.join(", "):null,vol?f(vol,0)+" Hl":null].filter(Boolean).join(" · "),gen:b.generacion,fv:b.tq,lote:b.lote,col:cols.join(","),lev:[b.nombre,b.levSembrada],id}); }
      (b.siembras||[]).forEach(z=>{ if(!z.lote||vistos.has(z.lote)) return; vistos.add(z.lote); ev.push({tipo:"siembra",t:z.fecha,ic:"plus",t1:"Siembra · "+b.nombre+(b.generacion!=null?" · Gen "+b.generacion:"")+" → FV "+z.tq,t2:[z.lote,z.hl!=null?f(z.hl,0)+" Hl":null,z.colector?"desde "+P(z.colector):null].filter(Boolean).join(" · "),gen:b.generacion,fv:z.tq,lote:z.lote,lev:[b.nombre]}); });
    });
    Object.values(App.S.tanques).forEach(t=>{ const L=t.levadura||{}; if(!L.nombre||vistos.has(t.lote)) return; vistos.add(t.lote); const g=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion;
      ev.push({tipo:"siembra",t:t.fin,ic:"plus",t1:"Siembra · "+L.nombre+(g!=null?" · Gen "+g:"")+" → FV "+t.tq,t2:[t.lote,t.marca,L.origen==="propagador"?"desde propagador":L.colector?"desde C"+L.colector:null].filter(Boolean).join(" · "),gen:g,fv:String(t.tq),lote:t.lote,col:L.colector?String(L.colector):"",lev:[L.nombre]}); });
    Object.values(App.S.colhist).forEach(x=>ev.push({tipo:"colector",t:x.salida,ic:"grid",t1:"Colector liberado · "+P(x.pos)+" · "+x.nombre+(x.generacion!=null?" · Gen "+x.generacion:""),t2:[x.motivo,"ingreso "+fmtS(x.ingreso),x.tq?"FV origen "+x.tq:null].filter(Boolean).join(" · "),gen:x.generacion,fv:x.tq,lote:x.lote,col:x.pos||"",lev:[x.nombre]}));
    Object.values(App.S.eventos).filter(x=>["marcaDescarte","recuperada","recosechaAprobada","divisionRecosecha","recosechaAgregada"].includes(x.tipo)).forEach(x=>{
      const movimiento=x.tipo==="divisionRecosecha"||x.tipo==="recosechaAgregada", ok=x.tipo==="recuperada"||x.tipo==="recosechaAprobada"||movimiento;
      const etiqueta=x.tipo==="recuperada"?"Recuperada · ":x.tipo==="recosechaAprobada"?"Recosecha aprobada · ":x.tipo==="recosechaAgregada"?"Recosecha agregada · ":x.tipo==="divisionRecosecha"?"Volumen dividido · ":"Marcada para descarte · ";
      ev.push({tipo:"marca",t:x.t,ic:ok?"check":"alert",cls:ok?"ok":"warn",t1:etiqueta+x.nombre+(x.generacion!=null?" · Gen "+x.generacion:""),t2:movimiento?`${P(x.pos||"")} → ${P(x.destino||"")} · ${f(x.hl,2)} Hl${x.tipo==="recosechaAgregada"?" nuevos":""}`:[P(x.pos||""),x.motivo].filter(Boolean).join(" · "),gen:x.generacion,col:movimiento?[x.pos,x.destino].filter(Boolean).join(","):x.pos||"",lev:[x.nombre]});
    });
    return ev.filter(x=>x.t).sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  }
  function filtrar(ev){
    const Q=App.Traza.N(hq).replace(/\s+/g,""), D=hDesde?new Date(hDesde+"T00:00"):null, H=hHasta?new Date(hHasta+"T23:59"):null;
    return ev.filter(x=>(hTipo==="todos"||x.tipo===hTipo)&&(!hGen||String(x.gen)===hGen)&&(!hFV||String(x.fv||"")===String(hFV))&&(!hCol||String(x.col||"").toUpperCase().includes(String(hCol).toUpperCase()))&&(!D||parseDT(x.t)>=D)&&(!H||parseDT(x.t)<=H)&&
      (!Q||[x.t1,x.t2,"FV"+x.fv,x.lote,x.col,...(x.lev||[])].join(" ").toUpperCase().replace(/\s+/g,"").includes(Q)));
  }
  function construirIndice(){
    const idx={}, N=App.Traza.N;
    const asegurar=nombre=>{ nombre=N(nombre); if(!nombre) return null; if(!idx[nombre]) idx[nombre]={nombre,siembras:[],cosechas:[],descartes:[],colectores:[],generaciones:new Set(),primeraFecha:null,ultimaFecha:null}; return idx[nombre]; };
    const tocarFecha=(reg,fecha)=>{ if(!fecha) return; const t=+parseDT(fecha); if(!isFinite(t)) return; if(reg.primeraFecha==null||t<reg.primeraFecha) reg.primeraFecha=t; if(reg.ultimaFecha==null||t>reg.ultimaFecha) reg.ultimaFecha=t; };
    Object.values(App.S.tanques||{}).forEach(t=>{ const L=t.levadura||{}; if(!L.nombre) return; const reg=asegurar(L.nombre); if(!reg) return; if(L.generacion!=null) reg.generaciones.add(+L.generacion); reg.siembras.push({tq:String(t.tq),lote:t.lote,fecha:t.fin,hl:null,colector:L.colector||null,marca:t.marca,origen:L.origen||"colector",activo:!(t.retiro||{}).fecha}); tocarFecha(reg,t.fin); });
    Object.values(App.S.bdlev||{}).forEach(b=>{ const nombre=N(b.nombre); if(!nombre) return; const reg=asegurar(nombre); if(!reg) return; if(b.generacion!=null) reg.generaciones.add(+b.generacion);
      const cols=(b.colectores||[]).map(c=>({colector:c.colector,posicion:c.posicion,vol:c.vol})); const volHl=cols.reduce((a,c)=>a+(num(c.vol)||0),0);
      if(b.destino==="DES") reg.descartes.push({fecha:b.retiro,destino:b.destinoDescarte||"—",motivo:b.comentario||b.obs||"",desdeFV:b.tq,desdeLote:b.lote});
      else reg.cosechas.push({tq:String(b.tq||"—"),lote:b.lote||"",fecha:b.retiro,volHl,colectores:cols,levSembrada:b.levSembrada||null,ventana:b.ventana||null});
      tocarFecha(reg,b.retiro);
      (b.siembras||[]).forEach(z=>{ if(!z.lote) return; reg.siembras.push({tq:String(z.tq),lote:z.lote,fecha:z.fecha,hl:z.hl,colector:z.colector||null,marca:null,origen:"colector",activo:false}); tocarFecha(reg,z.fecha); }); });
    Object.entries(App.S.colectores||{}).forEach(([id,c])=>{ const reg=asegurar(c.nombre); if(!reg) return; if(c.generacion!=null) reg.generaciones.add(+c.generacion); reg.colectores.push({pos:id,vol:num(c.vol),volInicial:num(c.volInicial),ingreso:c.ingreso||c.retiro||c.finRemocion,maxAbi:c.maxAbi,marcaDescarte:c.marcaDescarte||null,recosechar:!!c.recosechar}); tocarFecha(reg,c.ingreso||c.retiro||c.finRemocion); });
    Object.values(idx).forEach(reg=>{ reg.generaciones=[...reg.generaciones].sort((a,b)=>a-b); reg.siembras.sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))); reg.cosechas.sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))); reg.descartes.sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))); });
    return idx;
  }
  function genealogiaLevadura(nombre){
    const norm=s=>String(s||"").trim().toUpperCase();
    const target=norm(nombre);
    const parents={}, children={};
    Object.values(App.S.bdlev||{}).forEach(b=>{
      const child=norm(b.nombre), parent=norm(b.levSembrada);
      if(!child) return;
      if(parent){
        parents[child]=parents[child]||[];
        if(!parents[child].some(x=>x.parent===parent)) parents[child].push({parent,t:b.retiro,tq:b.tq,lote:b.lote,gen:b.generacion});
        children[parent]=children[parent]||[];
        if(!children[parent].some(x=>x.child===child)) children[parent].push({child,t:b.retiro,tq:b.tq,lote:b.lote,gen:b.generacion});
      }
    });
    const byName={};
    Object.values(App.S.bdlev||{}).forEach(b=>{ const n=norm(b.nombre); if(n && !byName[n]) byName[n]=b; });
    Object.values(App.S.tanques||{}).forEach(t=>{ const n=norm(t.levadura&&t.levadura.nombre); if(n && !byName[n]) byName[n]=t.levadura; });

    const ancestors=[]; let cur=target; const seenA=new Set([cur]);
    for(let i=0;i<8;i++){
      const p0=(parents[cur]||[])[0]; if(!p0 || !p0.parent || seenA.has(p0.parent)) break;
      ancestors.unshift({name:p0.parent,meta:p0}); cur=p0.parent; seenA.add(cur);
    }
    const direct=(children[target]||[]).slice().sort((a,b)=>String(b.t||"").localeCompare(String(a.t||"")));
    const next=[];
    direct.forEach(d=>{
      const kids=(children[d.child]||[]).slice().sort((a,b)=>String(b.t||"").localeCompare(String(a.t||"")));
      next.push({root:d,kids});
    });
    const p=App.Calc.parseLev(nombre)||{};
    const totalDesc=(function(){ const q=[target], seen=new Set([target]), out=[]; while(q.length && out.length<40){ const n=q.shift(); (children[n]||[]).forEach(c=>{if(!seen.has(c.child)){seen.add(c.child);out.push(c);q.push(c.child);}});} return out.length; })();
    const parentCount=(parents[target]||[]).length;
    const family=ancestors.length+1+totalDesc;
    if(!ancestors.length && !direct.length) return `<section class="genealogy card card-p" id="genealogy"><div class="gene-head"><div><div class="ey">GENEALOGÍA</div><h3>Sin conexiones registradas</h3><p>Esta levadura tiene actividad registrada, pero todavía no hay una relación padre → cosecha suficiente para construir su árbol.</p></div></div></section>`;
    const node=(n,meta={},current=false)=>{
      const b=byName[n]||{}; const gp=App.Calc.parseLev(n)||{}; const gen=gp.gen??b.generacion??meta.gen;
      return `<button type="button" class="gene-node ${current?'current':''}" data-genealogy="${esc(n)}">
        <span class="gene-dot"></span><b>${esc(n)}</b><span>${gen!=null?'Gen '+esc(gen):'Generación —'}</span>${meta.tq?`<small>FV ${esc(meta.tq)}${meta.lote?' · '+esc(meta.lote):''}</small>`:`<small>${current?'Levadura seleccionada':'Línea genética'}</small>`}
      </button>`;
    };
    return `<section class="genealogy card card-p fade-in" id="genealogy">
      <div class="gene-head"><div><div class="ey">GENEALOGÍA DE LA LEVADURA</div><h2>De dónde viene y qué produjo</h2><p>Seguimiento de la línea genética a partir de las siembras y cosechas registradas.</p></div><div class="gene-stats"><span><b>${ancestors.length}</b> ancestro${ancestors.length===1?'':'s'}</span><span><b>${direct.length}</b> descendiente${direct.length===1?'':'s'} directo${direct.length===1?'':'s'}</span><span><b>${family}</b> nodos relacionados</span></div></div>
      <div class="gene-tree">
        <div class="gene-zone"><div class="gene-zone-title">ANCESTROS <span>origen de la línea</span></div><div class="gene-line">${ancestors.length?ancestors.map((a,i)=>`${node(a.name,a.meta)}${i<ancestors.length-1?'<i class="gene-arrow">→</i>':''}`).join(''):`<div class="gene-empty">No hay ancestro registrado para esta levadura.</div>`}</div></div>
        <div class="gene-center"><div class="gene-zone-title">LEVADURA SELECCIONADA <span>punto de referencia</span></div>${node(target,{},true)}</div>
        <div class="gene-zone"><div class="gene-zone-title">DESCENDENCIA <span>cosechas que generó</span></div><div class="gene-desc-grid">${next.length?next.map(d=>`<div class="gene-branch"><div class="gene-branch-main">${node(d.root.child,d.root)}</div>${d.kids.length?`<div class="gene-branch-kids"><span class="gene-kids-label">Siguiente generación</span>${d.kids.slice(0,5).map(k=>node(k.child,k.meta)).join('')}${d.kids.length>5?`<span class="gene-more">+${d.kids.length-5} más</span>`:''}</div>`:''}</div>`).join(''):`<div class="gene-empty">Aún no hay cosechas registradas como descendencia.</div>`}</div></div>
      </div>
      <div class="gene-footer"><span>🧬 <b>Gen ${p.gen!=null?p.gen:'—'}</b></span><span>${parentCount?'Origen registrado':'Origen no registrado'}</span><span>${totalDesc} descendiente${totalDesc===1?'':'s'} en la línea</span><span class="gene-hint">Haz clic en cualquier nodo para seguir su genealogía</span></div>
    </section>`;
  }

  function fichaLevadura(nombre){
    const N=App.Traza.N, idx=construirIndice(); const reg=idx[N(nombre)];
    if(!reg) return C.empty("yeast","Sin registros de "+esc(nombre),"Esta levadura no aparece en ningún tanque, colector o cosecha.");
    const p=App.Calc.parseLev(reg.nombre)||{}; const totalHl=reg.cosechas.reduce((a,c)=>a+(c.volHl||0),0); const fvUsados=[...new Set(reg.siembras.map(s=>s.tq))].length; const colsAhora=reg.colectores.length;
    const dias=(reg.primeraFecha&&reg.ultimaFecha)?Math.round((reg.ultimaFecha-reg.primeraFecha)/DAY):null;
    const est=App.T.estadoLevColector({maxAbi:reg.colectores[0]&&reg.colectores[0].maxAbi});
    return `<div class="lev-card">
      <div class="lev-hero fade-in"><div class="fv-hero-tag">Levadura · Familia ${p.fam||"—"}</div><h2>${esc(reg.nombre)}</h2><div class="sub">${p.gen!=null?`Generación actual: <b>Gen ${p.gen}</b>`:"Generación no identificable"}${colsAhora?` · <b>${colsAhora} posición${colsAhora>1?"es":""}</b> en colector`:" · No está en colector"}</div>
        <div class="stats"><div><div class="k">Siembras</div><div class="v">${reg.siembras.length}</div></div><div><div class="k">Cosechas</div><div class="v">${reg.cosechas.length}</div></div><div><div class="k">FVs usados</div><div class="v">${fvUsados}</div></div><div><div class="k">Volumen total</div><div class="v">${f(totalHl,0)} Hl</div></div></div>
        ${dias!=null?`<div class="small muted" style="margin-top:12px">Primera actividad: <b>${fmt(reg.primeraFecha)}</b> · Última: <b>${fmt(reg.ultimaFecha)}</b> (${dias} días)</div>`:""}</div>
      <div class="lev-hero fade-in" style="background:var(--surface-2)"><div class="fv-side-h" style="margin-bottom:10px">Cadena de trazabilidad</div>
        <div class="chain-v2">${reg.siembras.length?reg.siembras.slice(0,1).map(s=>`<span class="nd-v2">${esc(s.origen==="propagador"?"Propagador":"Origen")}<small>${s.colector?"C"+esc(s.colector):""}</small></span><span class="ar" style="color:var(--faint)">→</span>`).join(""):""}<span class="nd-v2 fv">${esc(reg.nombre)}<small>${reg.cosechas.length?"cosechada":"actual"}</small></span>${reg.cosechas.slice(0,3).map(c=>`<span class="ar" style="color:var(--faint)">→</span><span class="nd-v2">FV ${esc(c.tq)}<small>${esc(c.lote)} · ${fmtS(c.fecha)}</small></span>`).join("")}${reg.descartes.length?`<span class="ar" style="color:var(--faint)">→</span><span class="nd-v2 des">Descartada<small>${esc(reg.descartes[0].destino)} · ${fmtS(reg.descartes[0].fecha)}</small></span>`:""}</div>
        <div class="small muted" style="margin-top:12px">${reg.colectores.length?`Ubicación actual: <b>${reg.colectores.map(c=>c.pos.toUpperCase().replace("-","-P")).join(", ")}</b>`:"No está actualmente en ningún colector."}${est.k==="verde"?" · <span style='color:var(--st-lista)'>Disponible para sembrar</span>":""}${est.k==="naranja"?" · <span style='color:var(--st-vence)'>Vence pronto</span>":""}${est.k==="rojo"?" · <span style='color:var(--st-vencida)'>Vencida</span>":""}</div></div>
      </div>
      <div class="tabs" role="tablist" id="levTabs"><button role="tab" aria-selected="true" data-lt="siembras">Siembras (${reg.siembras.length})</button><button role="tab" aria-selected="false" data-lt="cosechas">Cosechas (${reg.cosechas.length})</button>${reg.descartes.length?`<button role="tab" aria-selected="false" data-lt="descartes">Descartes (${reg.descartes.length})</button>`:""}${reg.colectores.length?`<button role="tab" aria-selected="false" data-lt="colectores">En colector (${reg.colectores.length})</button>`:""}</div>
      <div id="levPanel">${panelSiembras(reg)}</div>
      ${genealogiaLevadura(reg.nombre)}
    </div>`;
  }
  function panelSiembras(reg){ if(!reg.siembras.length) return C.empty("plus","Sin siembras registradas","Esta levadura aún no se ha sembrado en ningún fermentador.");
    return `<div class="card" style="overflow:hidden"><table><thead><tr><th>FV</th><th>Lote</th><th>Marca</th><th>Fecha</th><th class="n">Hl</th><th>Origen</th><th>Estado</th></tr></thead><tbody>${reg.siembras.map(s=>`<tr class="row-anim"><td><a href="#/tanque/${esc(s.lote)}" data-bgo="tanque/${esc(s.lote)}"><b>FV ${esc(s.tq)}</b></a></td><td>${esc(s.lote)}</td><td>${esc(s.marca||"—")}</td><td>${fmtS(s.fecha)}</td><td class="n">${s.hl!=null?f(s.hl,0):"—"}</td><td>${esc(s.origen==="propagador"?"Propagador":s.colector?"C"+s.colector:"—")}</td><td>${s.activo?'<span class="tag est">EN FERMENTACIÓN</span>':'<span class="tag pend">HISTÓRICO</span>'}</td></tr>`).join("")}</tbody></table></div>`; }
  function panelCosechas(reg){ if(!reg.cosechas.length) return C.empty("yeast","Sin cosechas registradas","Esta levadura aún no ha sido cosechada.");
    return `<div class="card" style="overflow:hidden"><table><thead><tr><th>Origen</th><th>Lote</th><th>Fecha</th><th class="n">Volumen</th><th>Colectores</th><th>Ventana</th></tr></thead><tbody>${reg.cosechas.map(c=>`<tr class="row-anim"><td><b>FV ${esc(c.tq)}</b></td><td>${esc(c.lote||"—")}</td><td>${fmtS(c.fecha)}</td><td class="n">${c.volHl?f(c.volHl,0)+" Hl":"—"}</td><td>${c.colectores.length?c.colectores.map(x=>"C"+esc(x.colector)).join(", "):"—"}</td><td>${c.ventana?(c.ventana==="v1"||c.ventana==="v2"?'<span class="tag real">OK</span>':'<span class="tag err status-dot">'+esc(c.ventana)+'</span>'):"—"}</td></tr>`).join("")}</tbody></table></div>`; }
  function panelDescartes(reg){ if(!reg.descartes.length) return "";
    return `<div class="card" style="overflow:hidden"><table><thead><tr><th>Desde</th><th>Lote</th><th>Fecha</th><th>Destino</th><th>Motivo</th></tr></thead><tbody>${reg.descartes.map(d=>`<tr class="row-anim"><td><b>FV ${esc(d.desdeFV||"—")}</b></td><td>${esc(d.desdeLote||"—")}</td><td>${fmtS(d.fecha)}</td><td>${esc(d.destino)}</td><td>${esc(d.motivo||"—")}</td></tr>`).join("")}</tbody></table></div>`; }
  function panelColectores(reg){ if(!reg.colectores.length) return "";
    return `<div class="card" style="overflow:hidden"><table><thead><tr><th>Posición</th><th class="n">Volumen</th><th>Ingreso</th><th>Último momento</th><th>Estado</th></tr></thead><tbody>${reg.colectores.map(c=>{ const est=App.T.estadoLevColector({maxAbi:c.maxAbi,marcaDescarte:c.marcaDescarte}); return `<tr class="row-anim"><td><b>${esc(c.pos.toUpperCase().replace("-","-P"))}</b></td><td class="n">${f(c.vol,0)} Hl${c.volInicial!=null&&c.volInicial!==c.vol?` <span class="muted">de ${f(c.volInicial,0)}</span>`:""}</td><td>${fmtS(c.ingreso)}</td><td>${fmtS(c.maxAbi)}</td><td>${C.status(est)}${c.recosechar?' <span class="tag manual">🔄</span>':""}</td></tr>`; }).join("")}</tbody></table></div>`; }
  function detalleEvento(x){
    if(!x) return "";
    const tipo={cosecha:"Cosecha",siembra:"Siembra",descarte:"Descarte",colector:"Colector",marca:"Marca"}[x.tipo]||x.tipo||"Evento";
    const lev=(x.lev||[]).filter(Boolean).join(" · ")||"—";
    const extra=[];
    if(x.t2) extra.push(x.t2);
    return `<div class="hist-detail" data-hdetail>
      <div class="row" style="justify-content:space-between;gap:10px"><div><b>${esc(tipo)}</b><div class="small muted">${fmtS(x.t)}</div></div><button class="btn mini" type="button" data-close-hd>Cerrar</button></div>
      <div class="hd-grid">
        <div><div class="hd-k">Levadura</div><div class="hd-v">${esc(lev)}</div></div>
        <div><div class="hd-k">Generación</div><div class="hd-v">${x.gen!=null?"Gen "+esc(x.gen):"—"}</div></div>
        <div><div class="hd-k">Fermentador</div><div class="hd-v">${x.fv?"FV "+esc(x.fv):"—"}</div></div>
        <div><div class="hd-k">Consecutivo</div><div class="hd-v">${esc(x.lote||"—")}</div></div>
        <div><div class="hd-k">Colector / posición</div><div class="hd-v">${esc(x.col||"—")}</div></div>
        <div><div class="hd-k">Tipo de evento</div><div class="hd-v">${esc(tipo)}</div></div>
      </div>
      ${extra.length?`<div class="hd-note">${esc(extra.join(" · "))}</div>`:""}
    </div>`;
  }
  function traza(){
    const Q=App.Traza.N(hq).replace(/\s+/g,""); if(!Q) return "";
    if(/^[A-Z]{2}\d{1,2}F\d{1,2}$/.test(Q)){ return `<div class="sec fade-in trz-overview">${fichaLevadura(Q)}</div>`; }
    if(/^F\d{3,4}$/.test(Q)){ const x=App.Traza.lote(Q); if(!x) return ""; const s=x.sembrada, sal=x.salida;
      return `<section class="card card-p sec trz trz-overview"><div class="sec-h"><div><h2>${esc(Q)} → trazabilidad</h2><span class="small muted">Origen, uso y salida del lote</span></div>${x.activo?'<span class="tag est">EN FERMENTACIÓN</span>':""}</div><div class="chain">${s?`<span class="nd">${esc(s.nombre)}${s.generacion!=null?" · Gen "+s.generacion:""}<small>Origen de la siembra</small></span><span class="ar">→</span>`:""}<span class="nd fv">FV ${esc(x.tq??"—")} · ${esc(Q)}${s&&s.fecha?"<small>"+fmtS(s.fecha)+(s.hl!=null?" · "+f(s.hl,0)+" Hl":"")+"</small>":""}</span>${sal?`<span class="ar">→</span><span class="nd ${sal.destino==="DES"?"des":""}">${sal.destino==="DES"?"Descarte · "+esc(sal.destinoDescarte||""):"Cosecha · "+esc(sal.nombre)+(sal.generacion!=null?" · Gen "+sal.generacion:"")}<small>${fmtS(sal.retiro)}${(sal.colectores||[]).length?" · "+[...new Set(sal.colectores.map(c=>"C"+c.colector))].join(", "):""}</small></span>`:""}</div></section>`; }
    return "";
  }
  App.Hist={eventos};
  App.V.historial={
    render(id){
      const ev=eventos(), l=filtrar(ev), gens=[...new Set(ev.map(x=>x.gen).filter(x=>x!=null))].sort((a,b)=>a-b);
      const fvs=[...new Set(ev.map(x=>x.fv).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
      const cols=[...new Set(ev.map(x=>x.col).filter(Boolean).flatMap(v=>String(v).split(",")).filter(Boolean))].sort();
      const count=t=>ev.filter(x=>x.tipo===t).length;
      let lastDay="", body="";
      l.slice(0,hMax).forEach((x,ix)=>{ const d=parseDT(x.t), day=d?d.toLocaleDateString("es-CO",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"";
        if(day!==lastDay){ if(lastDay) body+="</ul>"; body+=`<h3 class="day">${esc(day)}</h3><ul class="tl">`; lastDay=day; }
        body+=`<li class="hist-click ${hOpen===ix?"open":""}" data-he="${ix}"><span class="ic ${x.cls||""}">${C.icon(x.ic)}</span>${x.id?`<button type="button" class="m" data-bd="${esc(x.id)}"><b>${esc(x.t1)}</b><span>${esc(x.t2||"")}</span></button>`:`<div class="m"><b>${esc(x.t1)}</b><span>${esc(x.t2||"")}</span></div>`}<time>${d?String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"):""}</time></li>${hOpen===ix?detalleEvento(x):""}`; });
      if(lastDay) body+="</ul>";
      const rango=(hDesde||hHasta)?`${hDesde||"inicio"} → ${hHasta||"hoy"}`:"Todo el período";
      return `<div class="page-h"><div><h1>Historial</h1><p>Consulta movimientos por levadura, fermentador o fecha. Abre cada registro para ver su contexto y reconstruir la trazabilidad.</p></div><div class="acts">${App.downloads?`<button class="btn" type="button" id="expB">${C.icon("download")}Exportar registros (CSV)</button>`:""}</div></div>
      <section class="hist-overview" aria-label="Resumen de actividad">
        <button type="button" class="hist-overview-card ${hTipo==="todos"?"is-active":""}" data-ht="todos"><span class="hist-overview-icon">↻</span><span><b>${ev.length}</b><small>Movimientos</small></span></button>
        <button type="button" class="hist-overview-card ${hTipo==="cosecha"?"is-active":""}" data-ht="cosecha"><span class="hist-overview-icon harvest">↓</span><span><b>${count("cosecha")}</b><small>Cosechas</small></span></button>
        <button type="button" class="hist-overview-card ${hTipo==="siembra"?"is-active":""}" data-ht="siembra"><span class="hist-overview-icon sowing">↑</span><span><b>${count("siembra")}</b><small>Siembras</small></span></button>
        <button type="button" class="hist-overview-card ${hTipo==="descarte"?"is-active":""}" data-ht="descarte"><span class="hist-overview-icon discard">×</span><span><b>${count("descarte")}</b><small>Descartes</small></span></button>
      </section>
      <section class="hist-tools" aria-label="Buscar y filtrar movimientos">
        <div class="hist-search-row"><label class="search-in hist-search" aria-label="Buscar movimientos del historial">${C.icon("search")}<span class="sr-only">Buscar en el historial</span><input id="hq" type="search" autocomplete="off" placeholder="Nombre de levadura, FV, consecutivo, colector…" value="${esc(hq)}">${hq?`<button type="button" class="hist-query-clear" id="hqclear" aria-label="Borrar búsqueda" title="Borrar búsqueda">×</button>`:""}</label></div>
        <div class="hist-search-help"><span>Busca en levaduras, FV, lotes, colectores y generación.</span><span>${hq?`${l.length} coincidencia${l.length===1?"":"s"}`:"Ej.: LI4F13 · FV 13 · F472 · C6"}</span></div>
        <details class="hist-advanced" ${hGen||hFV||hCol||hDesde||hHasta?"open":""}><summary>Filtros avanzados <span>Generación · FV · colector · fechas</span></summary>
          <div class="hist-filters"><label class="sortsel">Generación <select class="inp" id="hg"><option value="">Todas</option>${gens.map(g=>`<option value="${g}" ${String(g)===hGen?"selected":""}>${g}</option>`).join("")}</select></label>
          <label class="sortsel">FV <select class="inp" id="hf"><option value="">Todos</option>${fvs.map(v=>`<option value="${esc(v)}" ${String(v)===String(hFV)?"selected":""}>FV ${esc(v)}</option>`).join("")}</select></label>
          <label class="sortsel">Colector <select class="inp" id="hc"><option value="">Todos</option>${cols.map(v=>`<option value="${esc(v)}" ${String(v)===String(hCol)?"selected":""}>${esc(v)}</option>`).join("")}</select></label>
          <label class="sortsel">Desde <input class="inp" type="date" id="hd" value="${esc(hDesde)}"></label><label class="sortsel">Hasta <input class="inp" type="date" id="hh" value="${esc(hHasta)}"></label></div>
        </details>
        <div class="hist-type-filters" role="group" aria-label="Tipo de movimiento">${TIPOS.map(([k,lab])=>`<button type="button" class="hist-type-btn ${hTipo===k?"active":""}" aria-pressed="${hTipo===k}" data-ht="${k}">${lab}<span>${k==="todos"?ev.length:ev.filter(x=>x.tipo===k).length}</span></button>`).join("")}<button type="button" class="hist-clear" id="hclear" ${hq||hTipo!=="todos"||hGen||hFV||hCol||hDesde||hHasta?"":"disabled"}>Restablecer todo</button></div>
      </section>
      <div class="hist-list-heading"><div><h2>Registro de actividad</h2><p>${l.length} de ${ev.length} movimientos · ordenados del más reciente al más antiguo</p></div>${l.length>hMax?`<span class="hist-visible-count">Mostrando ${Math.min(l.length,hMax)}</span>`:""}</div>
      <div id="trz">${traza()}</div>
      <section class="card card-p hist" aria-label="Bitácora"><div class="small muted" style="margin-bottom:6px">Selecciona un movimiento para consultar su contexto y trazabilidad.</div>${l.length?body:C.empty("history","Sin eventos","Cambie la búsqueda o los filtros.")}${l.length>hMax?`<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" type="button" id="hmas">Cargar más movimientos (${l.length-hMax})</button></div>`:""}</section>`;
    },
    mount(id){
      let t; const i=document.getElementById("hq"); if(i) i.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>{ hq=i.value; hOpen=-1; App.render(true); const n=document.getElementById("hq"); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },250); };
      const hg=document.getElementById("hg"); if(hg) hg.onchange=e=>{ hGen=e.target.value; hOpen=-1; App.render(true); };
      const hf=document.getElementById("hf"); if(hf) hf.onchange=e=>{ hFV=e.target.value; hOpen=-1; App.render(true); };
      const hc=document.getElementById("hc"); if(hc) hc.onchange=e=>{ hCol=e.target.value; hOpen=-1; App.render(true); };
      const hd=document.getElementById("hd"); if(hd) hd.onchange=e=>{ hDesde=e.target.value; hOpen=-1; App.render(true); };
      const hh=document.getElementById("hh"); if(hh) hh.onchange=e=>{ hHasta=e.target.value; hOpen=-1; App.render(true); };
      document.querySelectorAll("[data-ht]").forEach(b=>b.onclick=()=>{ hTipo=b.dataset.ht; hOpen=-1; App.render(true); });
      const m=document.getElementById("hmas"); if(m) m.onclick=()=>{ hMax+=150; App.render(true); };
      const clear=document.getElementById("hclear"); if(clear) clear.onclick=()=>{ hq=""; hTipo="todos"; hGen=""; hFV=""; hCol=""; hDesde=""; hHasta=""; hOpen=-1; App.render(true); };
      const qclear=document.getElementById("hqclear"); if(qclear) qclear.onclick=()=>{ hq=""; hOpen=-1; App.render(true); const q=document.getElementById("hq"); if(q) q.focus(); };
      const tabs=document.getElementById("levTabs");
      if(tabs){ const Q=(hq||"").replace(/\s/g,""), reg=construirIndice()[App.Traza.N(Q)];
        if(reg) tabs.addEventListener("click",e=>{ const b=e.target.closest("[data-lt]"); if(!b) return; tabs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x===b?"true":"false")); const tipo=b.dataset.lt, panel=document.getElementById("levPanel"); if(!panel) return; panel.innerHTML=tipo==="cosechas"?panelCosechas(reg):tipo==="descartes"?panelDescartes(reg):tipo==="colectores"?panelColectores(reg):panelSiembras(reg); }); }
      const hist=document.querySelector("#view .hist");
      if(hist) hist.addEventListener("click",e=>{
        const r=e.target.closest("[data-bd]"); if(r){ App.Act.detalle(r.dataset.bd); return; }
        const close=e.target.closest("[data-close-hd]"); if(close){ hOpen=-1; App.render(true); return; }
        const row=e.target.closest("[data-he]"); if(row){ const idx=Number(row.dataset.he); hOpen=hOpen===idx?-1:idx; App.render(true); }
      });
      const trz=document.getElementById("trz"); if(trz) trz.addEventListener("click",e=>{ const tb=e.target.closest("[data-trzbot]"); if(tb) App.Bot.abrir({tipo:"lev",nombre:tb.dataset.trzbot}); });
      const gene=document.getElementById("genealogy"); if(gene) gene.addEventListener("click",e=>{ const b=e.target.closest("[data-genealogy]"); if(!b) return; hq=b.dataset.genealogy; hTipo="todos"; hGen=""; hFV=""; hCol=""; hDesde=""; hHasta=""; hOpen=-1; App.render(true); setTimeout(()=>{ const q=document.getElementById("hq"); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } },30); });
      const ex=document.getElementById("expB"); if(ex) ex.onclick=()=>App.Act.exportarBD();
      if(id&&App.S.bdlev[id]) setTimeout(()=>App.Act.detalle(id),50);
    },
    buscar(q){ hq=q; hTipo="todos"; if(location.hash==="#/historial") App.render(true); else App.go("historial"); }
  };
})();
