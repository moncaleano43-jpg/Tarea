
/* ============================================================
   v29 — Estilo tienda Apple
   · Barra superior con navegación (computador)
   · Inicio en carruseles: urgente, colectores, fermentación, Cifra
   · Tema claro por defecto (el botón de tema sigue funcionando)
   ============================================================ */
(function(){
  const {esc,fmtS,f,parseDT,HOUR}=App.U, C=App.C;
  const ORD={rojo:0,naranja:1,verde:2,amarillo:3,gris:4,sin:5};

  /* ---- Tema claro por defecto una sola vez (respeta cambios posteriores) ---- */
  try{ if(!localStorage.getItem("inventarioLevadura:v29tema")){ localStorage.setItem("inventarioLevadura:v29tema","1"); App.Tema&&App.Tema.set("light"); } }catch(e){}

  /* ---- Barra superior: marca + navegación copiada del menú lateral ---- */
  function barra(){
    const top=document.querySelector(".topbar"); if(!top||top.querySelector(".anav")) return;
    const brand=document.createElement("a"); brand.className="abrand"; brand.href="#/inicio";
    brand.innerHTML=`${C.icon("yeast")}<span>Inventario de Levadura</span>`;
    const nav=document.createElement("nav"); nav.className="anav"; nav.setAttribute("aria-label","Secciones");
    const gs=top.querySelector(".gsearch"); top.insertBefore(brand,gs); top.insertBefore(nav,gs);
    const src=document.getElementById("nav");
    const sync=()=>{ const html=[...src.querySelectorAll("a")].filter(a=>["#/inicio","#/tanques","#/levaduras","#/bd"].includes(a.getAttribute("href"))).map(a=>{
        const lab=(a.querySelector("span:not(.cnt)")||a).textContent.trim(), cnt=a.querySelector(".cnt");
        return `<a href="${a.getAttribute("href")}" ${a.getAttribute("aria-current")?'aria-current="page"':""}>${esc(lab.replace("Explorar levaduras","Explorar").replace("Configuración","Ajustes"))}${cnt?`<span class="cnt ${cnt.classList.contains("warn")?"warn":""}">${esc(cnt.textContent)}</span>`:""}</a>`; }).join(""); if(nav.innerHTML!==html)nav.innerHTML=html; };
    sync(); new MutationObserver(sync).observe(src,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-current']});
  }

  /* ---- utilidades de la vista ---- */
  const tit=s=>String(s||"").toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  const ICO={
    tanques:'<path d="M9 4h6M8 6.5h8V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zM8 12h8"/>',
    levaduras:'<circle cx="9" cy="10" r="4"/><circle cx="15.5" cy="15" r="3"/><circle cx="16" cy="7" r="1.6"/>',
    colectores:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    muestra:'<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
    retiro:'<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
    explorar:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"/>',
    historial:'<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/><path d="M12 8v4l3 2"/>'
  };
  const svg=k=>k==="inicio"?C.icon("home"):`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
  const avatar='<span class="bot-trigger-avatar" aria-hidden="true"></span>';
  function linea(r,now){ // posición del punto en la ventana T0 → +12 → +24
    const t0=parseDT(r.t0); if(!t0) return null; const h=(now-+t0)/HOUR;
    const pos=h<=0?0:h<=24?h/24*60:Math.min(100,60+(h-24)/48*40);
    return `<div class="atl" aria-hidden="true"><div class="atl-bar"><i class="z1"></i><i class="z2"></i><i class="z3"></i><b style="left:${pos.toFixed(1)}%"></b></div>
      <div class="atl-lab"><span style="left:0">T0</span><span style="left:30%">+12 h</span><span style="left:60%">+24 h</span></div></div>`;
  }
  function vaso(u,color,id){ const fill=u*37;
    return `<svg viewBox="0 0 120 190" class="avessel" aria-hidden="true">
      <rect x="52" y="4" width="16" height="10" rx="3" fill="currentColor" opacity=".45"/>
      <clipPath id="av${id}"><path d="M20 40Q20 18 60 16Q100 18 100 40V150Q100 166 60 168Q20 166 20 150Z"/></clipPath>
      <path d="M20 40Q20 18 60 16Q100 18 100 40V150Q100 166 60 168Q20 166 20 150Z" fill="var(--surface-2)" stroke="currentColor" stroke-width="2.5"/>
      <rect x="18" y="${168-fill*2}" width="84" height="${fill*2}" fill="${color}" opacity=".85" clip-path="url(#av${id})"/>
      <line x1="20" y1="92" x2="100" y2="92" stroke="var(--surface)" stroke-width="2" stroke-dasharray="4 4" opacity=".9"/>
      <path d="M40 168l-6 18M80 168l6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`; }
  const COLK={rojo:"#ff3b30",naranja:"#ff9500",verde:"#34c759",sin:"#8e8e93"};
  const arrows=id=>`<div class="aarrows"><button type="button" data-rail="${id}" data-dir="-1" aria-label="Anteriores">‹</button><button type="button" data-rail="${id}" data-dir="1" aria-label="Siguientes">›</button></div>`;

  App.V.inicio={
    render(){
      const now=Date.now(), p=App.D.pend(now);
      const atn=p.filter(x=>["rojo","naranja","verde","amarillo"].includes(x.st.k)).sort((a,b)=>ORD[a.st.k]-ORD[b.st.k]||((a.r.t0||Infinity)-(b.r.t0||Infinity)));
      const ferm=p.filter(x=>["gris","sin"].includes(x.st.k)).sort((a,b)=>((a.r.t0||Infinity)-(b.r.t0||Infinity)));
      const nRojo=atn.filter(x=>x.st.k==="rojo").length;
      const occ=Object.keys(App.S.colectores).length;

      /* tarjetas urgentes */
      const urg=atn.map(({t,r,st})=>{
        const nx=C.siguiente(r,st,now), av=App.T.genAviso(App.T.genResultante(r)), lev=t.levadura||{};
        const ret=["rojo","naranja","verde"].includes(st.k);
        return `<article class="acard aurg">
          <p class="ast k-${st.k}"><i></i><span data-cdtxt="${nx.when?+parseDT(nx.when):""}" data-cdlab="${esc(nx.lab)}">${esc(nx.txt)}</span></p>
          <h3 class="afv" data-go="tanque/${esc(t.lote)}">FV ${esc(t.tq)}</h3>
          <p class="asub">${esc(tit(t.marca))} · Lote ${esc(t.lote)}</p>
          ${lev.nombre?`<div class="alev"><span class="ln">${esc(lev.nombre)}</span>${lev.generacion!=null?`<span class="g">Gen ${esc(lev.generacion)}</span>`:""}${r.nombreCosecha?`<span class="ar">cosecha como</span><span class="ln nx">${esc(r.nombreCosecha)}</span>`:""}</div>`:`<div class="alev"><span class="g">Sin levadura registrada</span></div>`}
          ${av?`<span class="awarn k-${av.k==="rojo"?"naranja":"amarillo"}">${esc(av.corto)}</span>`:""}
          <div class="k-${st.k}">${linea(r,now)||'<div class="atl"></div>'}</div>
          <div class="arow">${ret?`<button class="abtn" type="button" data-ret="${esc(t.lote)}">Retirar levadura</button>`:`<button class="abtn sec" type="button" data-mue="${esc(t.lote)}">Agregar muestra</button>`}<a class="alnk" href="#/tanque/${encodeURIComponent(t.lote)}">Ver tanque ›</a></div>
        </article>`; }).join("");

      /* colectores */
      const cols=[1,2,3,4,5,6].map(n=>{
        const ps=[1,2].map(s=>App.S.colectores[`c${n}-${s}`]), u=ps.filter(Boolean).length;
        const tiempos=ps.map(x=>x?App.T.tiempoColector(x,now):null);
        const peor=tiempos.filter(Boolean).sort((a,b)=>({rojo:0,naranja:1,verde:2,sin:3}[a.k]??4)-({rojo:0,naranja:1,verde:2,sin:3}[b.k]??4))[0];
        const k=u?(peor?peor.k:"verde"):"verde", color=COLK[k]||COLK.verde;
        const sinVol=ps.some(x=>x&&(x.vol==null||+x.vol<=0));
        const nota=!u?"Listo para recibir cosecha":k==="rojo"?"Pasó el límite de siembra":k==="naranja"?`Sembrar antes de ${fmtS(peor.mr)}`:sinVol?"Revisar volumen registrado":"Dentro del tiempo";
        const filas=u?ps.map((x,i)=>x?`<li><span class="pp">P${i+1}</span><b>${esc(x.nombre)}</b><span>${x.generacion!=null?"Gen "+esc(x.generacion):""}</span><span class="v ${x.vol==null||+x.vol<=0?"no":""}">${x.vol==null||+x.vol<=0?"Sin volumen":f(x.vol,0)+" Hl"}</span></li>`:`<li><span class="pp">P${i+1}</span><span>Libre</span><span></span><span></span></li>`).join(""):`<li class="empty">Dos posiciones libres</li>`;
        return `<article class="acard acol" data-go="colectores/${n}" tabindex="0" aria-label="Colector C${n}">
          <div class="acol-top"><div><h3>C${n}</h3><p class="aocc">${u} de 2 posiciones</p></div>${vaso(u,color,n)}</div>
          <ul class="apos">${filas}</ul>
          <p class="anote"><i style="background:${color}"></i>${esc(nota)}</p></article>`; }).join("");

      /* fermentación */
      const fer=ferm.map(({t,r,st})=>{ const lev=t.levadura||{}, t0=parseDT(r.t0), nx=C.siguiente(r,st,now);
        return `<article class="acard aferm">
          <p class="ast k-gris"><i></i>En fermentación</p>
          <h3 class="afv sm" data-go="tanque/${esc(t.lote)}">FV ${esc(t.tq)}</h3>
          <p class="asub">${esc(tit(t.marca))} · Lote ${esc(t.lote)}${lev.nombre?" · "+esc(lev.nombre)+(lev.generacion!=null?" Gen "+esc(lev.generacion):""):""}</p>
          ${t0?`<div class="at0"><span>T0 ${r.proy?"proyectado":"estimado"}</span><b>${fmtS(t0)}</b><em data-cdtxt="${+t0}" data-cdlab="">${esc(C.rel(t0,now))}</em></div>`:`<div class="at0"><span>T0</span><b>Sin datos aún</b></div>`}
          <p class="ahint">${r.ext!=null?`Extracto ${f(r.ext,2)} °P${r.atenuacion!=null?" · atenuación "+Math.round(r.atenuacion*100)+" %":""}`:"Aún sin muestras de extracto"}</p>
          <div class="arow"><button class="alnk" type="button" data-mue="${esc(t.lote)}">Agregar muestra ›</button></div>
        </article>`; }).join("");

      /* Cifra */
      const fv1=atn[0]?atn[0].t.tq:(p[0]&&p[0].t.tq);
      const asks=[["¿Qué atiendo primero?","Ordena los retiros por urgencia.","que me recomiendas hacer primero"],
        ["¿Qué levadura hay para sembrar?","Colectores, generación y volumen.","que levaduras hay disponibles"],
        fv1!=null?[`¿Cómo va el FV ${fv1}?`,"Extracto, atenuación, T0 y qué hacer.",`como va el tanque ${fv1}`]:null,
        ["¿Cuál tiene mejor viabilidad?","Compara las levaduras en colectores.","cual levadura tiene mayor viabilidad"]].filter(Boolean)
        .map(([h,d,q])=>`<button class="acard aask" type="button" data-ask="${esc(q)}">${avatar}<h4>${esc(h)}</h4><p>${esc(d)}</p><span class="alnk">Preguntar ›</span></button>`).join("");

      const ops=App.Hist.eventos().filter(x=>x.tipo!=="siembra"||parseDT(x.t)<=now).slice(0,6);
      const cats=[["inicio","Vista general","#/inicio"],["tanques","Fermentación y maduración","#/tanques"],["levaduras","En uso","#/levaduras"],["explorar","Registros","#/bd"]];
      const NOMB={inicio:"Inicio",tanques:"Tanques",levaduras:"Levaduras",explorar:"Base de datos"};
      const upd=App.S.config.meta&&App.S.config.meta.actualizado;

      return `<div class="ahome">
        <section class="ahero">
          <h1>Inventario. <span>Todo lo que pasa en las cavas, de un vistazo.</span></h1>
          <div class="ahelp">${avatar}<div><b>¿Dudas en el turno?</b>Pregúntale a Cifra como le preguntarías a un compañero.<br><button type="button" data-bot>Abrir Cifra ›</button></div></div>
        </section>
        <nav class="acats" aria-label="Accesos rápidos">
          ${cats.map(([k,s,go,b])=>`<button class="acat" type="button" data-cat="${go}"><span class="ico">${svg(k)}</span><b>${NOMB[k]}</b><small>${esc(s)}</small>${b?`<span class="pill">${b} vencidos</span>`:""}</button>`).join("")}
        </nav>

        <section class="asec" aria-labelledby="h-urg">
          <div class="asec-h"><h2 id="h-urg">Lo urgente. <span>${atn.length?(nRojo?"Retiros vencidos y por vencer.":"Retiros en ventana o por llegar."):"Todo al día."}</span></h2><a href="#/tanques">Ver todos los tanques ›</a></div>
          ${atn.length?`<div class="arail" id="rail-urg">${urg}</div>${atn.length>3?arrows("rail-urg"):""}`:`<div class="acard aempty"><div><b>Ningún tanque necesita retiro ahora.</b><span>Cuando un FV llegue a su T0 aparecerá aquí.</span></div></div>`}
        </section>

        <section class="asec" aria-labelledby="h-col">
          <div class="asec-h"><h2 id="h-col">Colectores. <span>${occ} de 12 posiciones ocupadas.</span></h2><a href="#/colectores">Abrir colectores ›</a></div>
          <div class="arail" id="rail-col">${cols}</div>${arrows("rail-col")}
        </section>

        ${ferm.length?`<section class="asec" aria-labelledby="h-fer">
          <div class="asec-h"><h2 id="h-fer">En fermentación. <span>Su T0 llega en los próximos días.</span></h2><a href="#/tanques/proceso">Ver todos ›</a></div>
          <div class="arail" id="rail-fer">${fer}</div>${ferm.length>3?arrows("rail-fer"):""}
        </section>`:""}

        <section class="asec" aria-labelledby="h-bot">
          <div class="asec-h"><h2 id="h-bot">Cifra te ayuda. <span>Pregúntale con tus propias palabras.</span></h2></div>
          <div class="arail">${asks}</div>
        </section>

        <section class="asec" aria-labelledby="h-ops">
          <div class="asec-h"><h2 id="h-ops">Últimas operaciones. <span>Lo registrado en los turnos recientes.</span></h2><a href="#/historial">Ver historial ›</a></div>
          ${ops.length?`<div class="acard aops">${C.timeline(ops.map(x=>({ic:x.ic,cls:x.cls,t1:x.t1,t2:x.t2,time:fmtS(x.t),go:x.id?"historial/"+x.id:null})))}</div>`:`<div class="acard aempty"><div><b>Aún no hay operaciones.</b><span>Las cosechas, siembras y descartes aparecerán aquí.</span></div></div>`}
        </section>

        <footer class="afoot"><span>${App.Store.mode==="db"?"Datos compartidos":"Datos guardados en este navegador"}${upd?" · actualizado "+fmtS(upd):""}${App.Store.canWrite?"":" · solo lectura"}</span><span>v34</span></footer>
      </div>`;
    },
    mount(){
      const v=document.getElementById("view");
      v.querySelectorAll("[data-ret]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); App.Inv.retiro(b.dataset.ret); });
      v.querySelectorAll("[data-mue]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); App.Act.agregarMuestra(b.dataset.mue); });
      v.querySelectorAll("[data-bot]").forEach(b=>b.onclick=()=>App.Bot.abrir());
      v.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{ const g=b.dataset.cat; if(g==="qa:muestra") App.Quick.muestra(); else if(g==="qa:retiro") App.Quick.retiro(); else location.hash=g; });
      v.querySelectorAll("[data-ask]").forEach(b=>b.onclick=()=>{ App.Bot.abrir(); setTimeout(()=>App.Bot._enviar(b.dataset.ask),120); });
      v.querySelectorAll(".acol").forEach(c=>c.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); App.go(c.dataset.go); } }));
      v.querySelectorAll("[data-rail]").forEach(b=>b.onclick=()=>{ const r=document.getElementById(b.dataset.rail); if(r) r.scrollBy({left:(+b.dataset.dir)*r.clientWidth*.8,behavior:"smooth"}); });
    }
  };
  barra();
  if(App.render) App.render(true);
})();
