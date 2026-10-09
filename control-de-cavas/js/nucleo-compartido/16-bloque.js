

/* ============================================================
   historial-bridge.js — puente de historial para Inicio
   ============================================================ */
App.Hist = App.Hist || (function(){
  const num = App.U.num, fmt = App.U.fmt, parseDT = App.U.parseDT;

  function eventos(){
    const ev = [];
    const vistos = new Set();

    Object.entries(App.S.bdlev || {}).forEach(([id,b])=>{
      if(!b || !b.retiro) return;

      if(b.destino === "DES"){
        ev.push({
          tipo:"descarte",
          t:b.retiro,
          ic:"trash",
          cls:"err",
          t1:"Descarte · FV "+(b.tq||"—")+(b.lote?" · "+b.lote:""),
          t2:["Destino: "+(b.destinoDescarte||"—"), b.nombre||null].filter(Boolean).join(" · "),
          id
        });
      }else{
        const cols=[...new Set((b.colectores||[]).map(c=>"C"+c.colector))];
        const vol=(b.colectores||[]).reduce((a,c)=>a+(num(c.vol)||0),0);
        ev.push({
          tipo:"cosecha",
          t:b.retiro,
          ic:"yeast",
          cls:"ok",
          t1:"Cosecha · "+(b.nombre||"—")+(b.generacion!=null?" · Gen "+b.generacion:""),
          t2:[
            "FV "+(b.tq||"—")+(b.lote?" · "+b.lote:""),
            cols.length?"→ "+cols.join(", "):null,
            vol?fmt(vol,0)+" Hl":null
          ].filter(Boolean).join(" · "),
          id
        });
      }

      (b.siembras||[]).forEach(z=>{
        if(!z.lote || vistos.has(z.lote)) return;
        vistos.add(z.lote);
        ev.push({
          tipo:"siembra",
          t:z.fecha,
          ic:"plus",
          cls:"ok",
          t1:"Siembra · "+(b.nombre||"—")+" → FV "+(z.tq||"—"),
          t2:[z.lote,z.hl!=null?fmt(z.hl,0)+" Hl":null,z.colector?"C"+z.colector:null].filter(Boolean).join(" · "),
          id
        });
      });
    });

    Object.entries(App.S.eventos || {}).forEach(([id,e])=>{
      if(!e || !e.t) return;
      ev.push({
        ...e,
        id,
        ic:e.ic || "history",
        cls:e.cls || "none",
        t1:e.t1 || e.accion || e.tipo || "Evento",
        t2:e.t2 || e.detalle || ""
      });
    });

    return ev
      .filter(x=>x.t && parseDT(x.t))
      .sort((a,b)=>+parseDT(b.t)-+parseDT(a.t));
  }

  return {eventos};
})();

/* ============================================================
   app.js — arranque y enrutamiento
   ============================================================ */
(function(){
  const {$,esc,fmtS,f} = App.U, C=App.C;
  const NAV=[{g:null,items:[["inicio","Inicio","home"],["tanques","Tanques","tank"],["levaduras","Levaduras","yeast"],["bd","Base de datos","db"],["aseos","Aseos","tank"],["recuperacion","Recuperación","yeast"],["programa","Programa de trasiego","tank"],["merma","Merma","db"],["analisis","Análisis","db"]]}];
  const ALIAS={operacion:"tanques",fv:"tanques",sv:"tanques",inventario:"levaduras",bdlev:"historial",tanque:"tanques",historico:"historico",comparar:"analista",analisis:"analista",ficha:"analista"};
  const route=()=>{ const h=(location.hash||"#/inicio").slice(2).split("/"); return {name:h[0]||"inicio",arg:h.slice(1).map(decodeURIComponent)}; };
  App.go=p=>{ location.hash="#/"+p; };
  function shell(){ document.body.innerHTML=`<a class="sr-only" href="#view">Ir al contenido</a><div class="app"><aside class="side" id="side" aria-label="Navegación principal"><div class="brand"><span class="logo">${C.icon("yeast")}</span><div><b>Control de Cavas</b><span>Fermentación · Maduración</span></div></div><nav class="nav" id="nav"></nav><div class="side-foot" id="sideFoot"></div></aside><div class="scrim" id="scrim"></div><div class="main"><header class="topbar"><button class="btn ghost menu-btn" type="button" id="menuBtn" aria-label="Abrir menú" aria-controls="side" aria-expanded="false">${C.icon("menu")}</button><div class="gsearch" role="search"><div class="box">${C.icon("search")}<input id="gq" type="search" placeholder="Busca un FV, familia, levadura, lote o colector…" autocomplete="off" aria-label="Buscar en toda la plataforma" aria-autocomplete="list" aria-controls="gres" aria-expanded="false"><kbd>/</kbd></div><div class="gres hidden" id="gres" role="listbox" aria-label="Resultados"></div></div><div class="top-status" id="topStatus"></div><button class="btn botbtn" type="button" id="botBtn" aria-label="Abrir Cifra"><span class="bot-trigger-avatar" aria-hidden="true"></span><span class="bb-txt"> Cifra</span></button></header><main class="content" id="view" tabindex="-1"><div class="empty">Cargando datos…</div></main></div></div><button class="fab" type="button" id="fab" aria-label="Registrar muestra">${C.icon("plus")}Muestra</button><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
    const side=$("#side"), scrim=$("#scrim"), mb=$("#menuBtn");
    const setDrawer = o => {
      side.classList.toggle("open", o);
      scrim.classList.toggle("open", o);
      document.body.classList.toggle("drawer-open", o);
      mb.setAttribute("aria-expanded", o ? "true" : "false");
    };
    if (window.matchMedia("(max-width:900px)").matches) setDrawer(false);
    const esMovil = () => window.matchMedia("(max-width:900px)").matches;
    const KEY_SIDE = "inventarioLevadura:sideCollapsed";
    try { if (!esMovil() && localStorage.getItem(KEY_SIDE) === "1") document.body.classList.add("side-collapsed"); } catch(e) {}
    const toggleSide = () => {
      if (esMovil()) setDrawer(!side.classList.contains("open"));
      else { const colapsado = document.body.classList.toggle("side-collapsed"); try { localStorage.setItem(KEY_SIDE, colapsado ? "1" : "0"); } catch(e) {} }
    };
    mb.onclick = toggleSide;
    scrim.onclick = () => setDrawer(false);
    document.getElementById("nav").addEventListener("click", e => { if (e.target.closest("a") && esMovil()) setDrawer(false); });
    window.addEventListener("resize", () => {
      if (esMovil()) { document.body.classList.remove("side-collapsed"); setDrawer(false); }
      else { setDrawer(false); try { if (localStorage.getItem(KEY_SIDE) === "1") document.body.classList.add("side-collapsed"); } catch(e) {} }
    });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&side.classList.contains("open")) setDrawer(false); });
    App.closeDrawer=()=>setDrawer(false);
    $("#fab").onclick=()=>App.Quick.muestra();
    $("#botBtn").onclick=()=>App.Bot.abrir();
    inyectarV4();
    wireSearch();
  }
  function inyectarV4(){
    const KEY="inventarioLevadura:theme"; const root=document.documentElement; let saved=null; try{saved=localStorage.getItem(KEY)}catch(e){}; if(saved==="light"||saved==="dark") root.setAttribute("data-theme",saved); else root.setAttribute("data-theme","dark");
    App.Tema={ actual(){ return root.getAttribute("data-theme")||"dark"; }, set(t){ root.classList.add("theme-anim"); root.setAttribute("data-theme",t); try{ localStorage.setItem(KEY,t); }catch(e){} setTimeout(()=>root.classList.remove("theme-anim"),400); }, toggle(){ this.set(this.actual()==="dark"?"light":"dark"); } };
    const topbar=document.querySelector(".topbar"); if(topbar && !document.querySelector(".theme-btn")){
      const btn=document.createElement("button"); btn.className="btn theme-btn"; btn.type="button"; btn.setAttribute("aria-label","Cambiar tema");
      btn.innerHTML=`<svg class="i ic-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="i ic-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
      btn.onclick=()=>App.Tema.toggle();
      const botBtn=topbar.querySelector("#botBtn"); if(botBtn) topbar.insertBefore(btn,botBtn); else topbar.appendChild(btn); }
    const fabActual=document.getElementById("fab"); if(fabActual && !document.querySelector(".fab-wrap")){
      const wrap=document.createElement("div"); wrap.className="fab-wrap";
      wrap.innerHTML=`<button class="fab-item" type="button" data-fab="retiro">${C.icon("exit")}Retirar levadura</button><button class="fab-item" type="button" data-fab="muestra">${C.icon("sample")}Agregar muestra</button><button class="fab-item" type="button" data-fab="crear">${C.icon("plus")}Registrar tanque</button><button class="fab-main" type="button" aria-label="Acciones rápidas">${C.icon("plus")}</button>`;
      fabActual.parentNode.insertBefore(wrap, fabActual.nextSibling);
      const main=wrap.querySelector(".fab-main"); main.onclick=()=>wrap.classList.toggle("open");
      wrap.querySelectorAll("[data-fab]").forEach(b=>{ b.onclick=()=>{ wrap.classList.remove("open"); const a=b.dataset.fab; if(a==="retiro") App.Quick.retiro(); if(a==="muestra") App.Quick.muestra(); if(a==="crear") App.Quick.crear(); }; });
      document.addEventListener("click",e=>{ if(!e.target.closest(".fab-wrap")) wrap.classList.remove("open"); }); } }
  function navHTML(cur){ const now=Date.now(), p=App.D.pend(now), cols=App.D.cols(now); const crit=p.filter(x=>x.st.k==="rojo").length, warn=p.filter(x=>x.st.k==="naranja").length; const colV=cols.filter(x=>x.st.cls==="crit").length;
    const badge={tanques:null,colectores:colV?[colV,""]:null};
    $("#nav").innerHTML=NAV.map(gr=>(gr.g?`<div class="nav-g">${gr.g}</div>`:"")+gr.items.map(([k,l,ic])=>{ const b=badge[k]; return `<a href="#/${k}" ${cur===k?'aria-current="page"':""}>${C.icon(ic)}<span>${l}</span>${b?`<span class="cnt ${b[1]}" aria-label="${b[0]} requieren atención">${b[0]}</span>`:""}</a>`; }).join("")).join("");
    const upd=App.S.config.meta&&App.S.config.meta.actualizado;
    $("#topStatus").innerHTML=`<span class="dot-live" aria-hidden="true"></span>${App.Store.mode==="db"?"Datos compartidos":"Datos en este navegador"}${upd?" · act. "+fmtS(upd):""}${App.Store.canWrite?"":' · <b>solo lectura</b>'}`;
    $("#sideFoot").textContent="v36 · "+(App.Store.mode==="db"?"base compartida":"modo local"); }
  function render(force){ const a=document.activeElement, v=$("#view");
    if(!force&&(document.querySelector("dialog[open]")||(a&&v.contains(a)&&["INPUT","SELECT","TEXTAREA"].includes(a.tagName)))) return;
    let {name,arg}=route(); const cur=ALIAS[name]||name;
    if(name==="inventario") name="levaduras"; if(name==="bdlev") name="historial";
    const view=App.V[name]||App.V.inicio||{render:()=>C.empty("alert","No se pudo mostrar esta pantalla","Vista no disponible")};
    navHTML(cur); const fab=document.getElementById("fab"); if(fab) fab.classList.toggle("hidden",!App.Store.canWrite||!App.pendientes().length);
    const fabWrap=document.querySelector(".fab-wrap"); if(fabWrap) fabWrap.style.display=(!App.Store.canWrite||!App.pendientes().length)?"none":"";
    const y=window.scrollY;
    try{ v.innerHTML=view.render(...arg); view.mount&&view.mount(...arg); }
    catch(e){ console.error(e); v.innerHTML=C.empty("alert","No se pudo mostrar esta pantalla",e.message); }
    if(!force) window.scrollTo(0,y);
    App.UI.tickCountdowns(); }
  App.render=render;
  window.addEventListener("hashchange",()=>{ if(App.closeDrawer) App.closeDrawer(); render(true); window.scrollTo(0,0); const v=$("#view"); v&&v.focus({preventScroll:true}); });
  document.addEventListener("click",e=>{ const target=e.target.closest&&e.target.closest("button,a,input,select,textarea"); if(target) return; const g=e.target.closest&&e.target.closest("[data-go]"); if(g&&!g.closest("dialog")){ e.preventDefault(); App.go(g.dataset.go); } });
  document.addEventListener("keydown",e=>{ if(e.key!=="Enter"&&e.key!==" ") return; const target=e.target.closest&&e.target.closest("[data-go]"); if(!target||e.target.closest("button,a,input,select,textarea")) return; e.preventDefault(); App.go(target.dataset.go); });
  function searchNorm(v){ return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim().replace(/\s+/g," "); }
  function buscar(q){
    const raw=String(q||"").trim(), Q=searchNorm(raw), compact=Q.replace(/\s/g,""); if(!Q) return [];
    const n=(Q.match(/\d+/)||[])[0], soloTq=/^(FV|TQ|TANQUE)?\s*\d+$/.test(Q), colQ=/^(C|COL|COLECTOR)\s*(\d)(?:\s*(?:P|-)\s*(\d))?$/.exec(Q), now=Date.now(), G=[];
    const match=(...vals)=>{ const hay=searchNorm(vals.filter(Boolean).join(" ")), hc=hay.replace(/\s/g,""); return hay.includes(Q)||hc.includes(compact); };
    const fm=/^(?:FAMILIA|FAM)\s+([A-Z])$/.exec(Q), fam=fm&&fm[1];
    if(fam){
      const ns=App.Traza.nombres().filter(name=>{ const z=App.Calc.parseLev(name); return z&&String(z.fam||"").toUpperCase()===fam; }), rows=new Map();
      ns.forEach(name=>App.Traza.usos(name).forEach(u=>{ if(!rows.has(u.lote)) rows.set(u.lote,{u,names:new Set()}); rows.get(u.lote).names.add(name); }));
      const entries=[...rows.values()].sort((x,y)=>String(y.u.fecha||"").localeCompare(String(x.u.fecha||""))).slice(0,8).map(({u,names})=>({ic:"tank",t1:`FV ${u.tq} · ${u.lote}`,t2:`Familia ${fam} · ${[...names].join(", ")}${u.activo?" · en fermentación":" · registro anterior"}`,go:"tanque/"+u.lote}));
      if(entries.length) G.push([`Familia ${fam} · FV relacionados`,entries]);
      const strains=ns.slice(0,6).map(name=>({ic:"yeast",t1:name,t2:`Levadura · Familia ${fam}`,go:"__traza:"+name}));
      if(strains.length) G.push([`Levaduras de la familia ${fam}`,strains]);
    }
    const tq=App.D.pend(now).filter(({t,r})=>soloTq?+t.tq===+n:match(t.lote,"FV "+t.tq,t.marca,(t.levadura||{}).nombre,r.nombreCosecha))
      .map(({t,r,st})=>({ic:"tank",t1:"FV "+t.tq+" · "+t.lote,t2:t.marca+" · "+((t.levadura||{}).nombre||"sin levadura")+(r.t0?" · T0 "+fmtS(r.t0):""),go:"tanque/"+t.lote,badge:C.status(App.T.estado(st))}));
    if(tq.length) G.push(["Fermentación activa",tq.slice(0,8)]);
    const ly=App.D.cols(now).filter(({id,c})=>!soloTq&&(match(c.nombre,id.replace("-","-P"))||(colQ&&id.startsWith("c"+colQ[2]+"-")&&(!colQ[3]||id.endsWith("-"+colQ[3])))))
      .map(({id,c,st})=>({ic:"yeast",t1:c.nombre+" · Gen "+(c.generacion??"—"),t2:id.toUpperCase().replace("-","-P")+" · "+f(c.vol,0)+" Hl",go:"colectores/"+id.split("-")[0].slice(1),badge:C.status(App.T.estadoLevColector(c))}));
    if(ly.length) G.push(["Levadura disponible",ly.slice(0,8)]);
    if(colQ){ const c=colQ[2]; G.push(["Colectores",[{ic:"grid",t1:"Colector C"+c,t2:[1,2].map(s=>App.S.colectores[`c${c}-${s}`]?App.S.colectores[`c${c}-${s}`].nombre:"libre").join(" · "),go:"colectores/"+c}]]); }
    const hi=Object.entries(App.S.bdlev||{}).filter(([id,b])=>soloTq?String(b.tq)===String(+n):match(b.nombre,b.lote,b.levSembrada,"FV "+b.tq,b.marca))
      .sort((a,b)=>String(b[1].retiro||"").localeCompare(String(a[1].retiro||""))).slice(0,8)
      .map(([id,b])=>({ic:"history",t1:b.nombre+" · "+(b.destino==="DES"?"descarte":"cosecha"),t2:"De FV "+b.tq+" · "+(b.lote||"")+" · retiro "+fmtS(b.retiro),go:"historial/"+id}));
    const tz=/^[A-Z]{2}\d{1,2}F\d{1,3}$|^F\d{3,4}$/.test(compact)?[{ic:"history",t1:"Ver trazabilidad de "+compact,t2:"Ficha completa y dónde se usó",go:"__traza:"+compact}]:[];
    if(tz.length) G.unshift(["Trazabilidad",tz]); if(hi.length) G.push(["Cosechas anteriores",hi]); return G;
  }
  function wireSearch(){ const q=$("#gq"), res=$("#gres"); let sel=-1;
    const sugerencias=()=>{ const lev=App.Traza.nombres().find(n=>App.Calc.parseLev(n)), fv=App.D.pend()[0]?.t?.tq, col=Object.keys(App.S.colectores||{})[0]; const chips=[]; if(lev) chips.push(`<button type="button" data-q="${esc(lev)}">${esc(lev)}</button>`); if(fv!=null) chips.push(`<button type="button" data-q="FV ${esc(fv)}">FV ${esc(fv)}</button>`); if(col) chips.push(`<button type="button" data-q="${esc(col.toUpperCase().replace("-","-P"))}">${esc(col.toUpperCase().replace("-","-P"))}</button>`); return `<div class="gquick"><span>Accesos rápidos · datos de tu inventario</span>${chips.join("")||"<span>Escribe un FV, lote, levadura o colector.</span>"}</div>`; };
    const show=()=>{ const G=buscar(q.value); sel=-1; const searching=!!q.value.trim(); res.innerHTML=G.length?G.map(([h,items])=>`<h4>${esc(h)}</h4>${items.map(C.searchResult).join("")}`).join(""):(searching?`<div class="none"><b>No encontré “${esc(q.value)}”.</b><span>Prueba con el nombre de una levadura, un FV, lote F o colector.</span>${sugerencias()}</div>`:`<div class="gintro"><b>Busca en toda la plataforma</b><span>Encuentra tanques activos, levadura disponible e historial.</span></div>${sugerencias()}`); const open=searching||document.activeElement===q; res.classList.toggle("hidden",!open); q.setAttribute("aria-expanded",open); };
    q.addEventListener("input",show); q.addEventListener("focus",show);
    res.addEventListener("click",e=>{ const chip=e.target.closest("[data-q]"); if(chip){ q.value=chip.dataset.q; q.focus(); show(); return; } const b=e.target.closest(".sres"); if(!b) return; e.stopPropagation(); res.classList.add("hidden"); q.value=""; q.blur(); if(b.dataset.go.startsWith("__traza:")) App.V.historial.buscar(b.dataset.go.slice(8)); else App.go(b.dataset.go); });
    q.addEventListener("keydown",e=>{ const bs=[...res.querySelectorAll(".sres")];
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); if(!bs.length) return; sel=(sel+(e.key==="ArrowDown"?1:-1)+bs.length)%bs.length; bs.forEach((b,i)=>b.classList.toggle("sel",i===sel)); bs[sel].scrollIntoView({block:"nearest"}); }
      if(e.key==="Enter"){ const b=bs[sel>=0?sel:0]; if(b){ e.preventDefault(); b.click(); } }
      if(e.key==="Escape"){ res.classList.add("hidden"); q.blur(); } });
    document.addEventListener("click",e=>{ if(!e.target.closest(".gsearch")) res.classList.add("hidden"); });
    document.addEventListener("keydown",e=>{ if(e.key==="/"&&! ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)&&!document.querySelector("dialog[open]")){ e.preventDefault(); q.focus(); } }); }

  let t; const refresh=()=>{ clearTimeout(t); t=setTimeout(()=>render(false),80); };
  (async function(){ shell(); await App.Store.init(refresh); if(!location.hash) location.hash="#/inicio"; render(true); setInterval(()=>{if(document.hidden)return;const name=(location.hash||'').slice(2).split('/')[0];if(['inicio','tanques','colectores','pantalla'].includes(name))render(false);else App.UI.tickCountdowns();},60000); })();
})();
