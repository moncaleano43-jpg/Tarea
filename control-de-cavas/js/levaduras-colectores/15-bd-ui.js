
/* ============================================================
   bd-ui.js — módulo "Base de datos" integrado a la plataforma
   ============================================================ */
(function(){
  const {esc,f,fmt,fmtS,pc,num,toIn,parseDT,HOUR,DAY,toast,clone,dur,mean}=App.U, C=App.C, M=App.BDM;
  const POS=id=>String(id).toUpperCase().replace("-","-P");
  const tag=(k)=>{ const e=M.ESTADOS[k]||[k,"pend"]; return `<span class="tag ${e[1]}">${esc(e[0])}</span>`; };
  const TIPOS={entrada:["Entrada","real"],siembra:["Resiembra","manual"],descarte:["Descarte","err"],salida:["Otra salida","pend"]};
  const tTag=t=>`<span class="tag ${(TIPOS[t]||["",""])[1]}">${esc((TIPOS[t]||[t])[0])}</span>`;
  const hl=v=>v==null?'<span class="muted">—</span>':f(v,0)+" Hl";
  const FIL0={marca:"",fam:"",gen:"",estado:"",col:"",fv:"",resp:"",desde:"",hasta:"",calidad:"",origen:""};
  const S={more:false,tab:"resumen",q:"",selected:"",explorerPeriod:0,explorerStatus:"all",explorerSort:"recent",explorerMode:"table",explorerRows:60,tableSelectedId:"",tableDetailTab:"harvest",explorerTableFilters:{marca:"",familia:"",gen:"",fv:"",col:""},fil:Object.assign({},FIL0),sort:"fecha-desc",max:60,mv:{tipo:"",q:"",desde:"",hasta:"",col:""},mvMax:100,lq:"",lMax:60};

  /* ---------- Integración con el resto de la plataforma ---------- */
  // 1) Guardado masivo (importación / migración) sin reescribir el almacenamiento por cada registro.
  // 2) Al liberar una posición del colector, la base de datos marca esa posición como "Vacío" (igual que las columnas O/R del Excel).
  const archivarOriginal=App.Act.archivarPosicion;
  App.Act.archivarPosicion=async function(id,c,motivo){
    await archivarOriginal(id,c,motivo);
    try{ if(c&&c.levId&&App.S.bdlev[c.levId]){ const b=clone(App.S.bdlev[c.levId]), n=+String(id).replace(/^c(\d+).*/,"$1"), slot=String(id).split("-")[1];
      const cols=b.colectores||[]; let e=cols.find(x=>+x.colector===n&&String(x.posicion)===slot&&!x.vacio)||cols.find(x=>+x.colector===n&&!x.vacio);
      if(e){ e.vacio=true; e.fechaVaciado=new Date().toISOString(); e.motivoVaciado=motivo||"Posición liberada"; await App.Store.set("bdlev",c.levId,b); } } }catch(err){ console.warn(err); }
  };

  /* ---------- Revisión de consistencia ---------- */
  function revisar(r){ const o=[]; const pn=M.parseNombre(r.nombre);
    if(r.incompleto) o.push("Fila incompleta del Excel (sin levadura)");
    if(r.retiro&&r.finRemocion&&parseDT(r.finRemocion)<parseDT(r.retiro)) o.push("El fin de remoción es anterior al inicio");
    if(pn&&r.generacion!=null&&pn.gen!==+r.generacion) o.push(`El nombre indica Gen ${pn.gen} pero la generación registrada es ${r.generacion}`);
    if(pn&&r.tq!=null&&pn.tq!==+r.tq) o.push(`El nombre indica FV ${pn.tq} pero el UTQ fuente es ${r.tq}`);
    if((r.colectores||[]).some(c=>c.vol==null)) o.push("Hay un colector sin volumen registrado");
    if((r.siembras||[]).length>(r.colectores||[]).length&&r.destino!=="DES") o.push("Tiene más resiembras que colectores");
    return o; }
  function atencion(){ const out=[], now=Date.now();
    Object.entries(App.S.colectores).forEach(([id,c])=>{ const e=App.T.estadoLevColector(c,now);
      if(c.marcaDescarte) out.push({nivel:"naranja",txt:`${c.nombre} en ${POS(id)} está marcada para descarte`,acc:`col:${id}`});
      else if(e.k==="amarillo") out.push({nivel:"rojo",txt:`${c.nombre} en ${POS(id)} pasó el último momento para sembrar`,acc:`col:${id}`});
      const b=c.levId&&App.S.bdlev[c.levId]; if(b){ M.calidad(b).forEach(q=>out.push({nivel:"naranja",txt:`${c.nombre} (${POS(id)}): ${q.lab.toLowerCase()} ${q.r}`,acc:`rec:${c.levId}`})); }
      if(c.vol==null) out.push({nivel:"amarillo",txt:`${POS(id)} (${c.nombre}) no tiene volumen registrado`,acc:`col:${id}`}); });
    const regs=M.registros(), vivos=new Set(Object.values(App.S.colectores).map(c=>c.levId));
    const bdAbiertas=regs.filter(r=>r.st!=="anulado"&&(r.colectores||[]).some(c=>!c.vacio)&&!vivos.has(r.id));
    if(bdAbiertas.length) out.push({nivel:"amarillo",txt:`${bdAbiertas.length} ${bdAbiertas.length===1?"registro figura":"registros figuran"} con levadura en colector en la base de datos, pero no ${bdAbiertas.length===1?"está":"están"} en Colectores: ${bdAbiertas.slice(0,4).map(r=>r.nombre).join(", ")}`,acc:"fil:estado:inventario"});
    const obs=regs.filter(r=>r.st!=="anulado"&&revisar(r).length);
    if(obs.length) out.push({nivel:"amarillo",txt:`${obs.length} registros tienen datos para revisar (fechas, generación o volúmenes)`,acc:"fil:calidad:datos"});
    return out; }

  /* ---------- Filtros ---------- */
  function filtrar(regs){ const q=App.Traza.N(S.q).replace(/\s+/g,""), F=S.fil;
    let l=regs.filter(r=>{
      if(q){ const hay=[r.nombre,r.lote,"FV"+r.tq,r.respSensorial,r.responsable,r.marca,...(r.siembras||[]).flatMap(s=>[s.lote,"FV"+s.tq])].map(x=>App.Traza.N(x||"").replace(/\s+/g,"")).join("|"); if(!hay.includes(q)) return false; }
      if(F.marca&&r.marca!==F.marca) return false; if(F.fam&&r.familia!==F.fam) return false; if(F.gen&&String(r.generacion)!==F.gen) return false;
      if(F.estado&&r.st!==F.estado) return false; if(F.col&&!(r.colectores||[]).some(c=>String(c.colector)===F.col)) return false;
      if(F.fv&&String(r.tq)!==F.fv&&!(r.siembras||[]).some(s=>String(s.tq)===F.fv)) return false;
      if(F.resp&&String(r.respSensorial||r.responsable||"").trim().toUpperCase()!==F.resp) return false;
      const fe=String(r.finRemocion||r.retiro||"").slice(0,10); if(F.desde&&(!fe||fe<F.desde)) return false; if(F.hasta&&(!fe||fe>F.hasta)) return false;
      if(F.calidad==="fuera"&&!M.calidad(r).length) return false; if(F.calidad==="ok"&&M.calidad(r).length) return false; if(F.calidad==="datos"&&!revisar(r).length) return false;
      if(F.origen&&(r.origen==="excel"?"excel":"app")!==F.origen) return false;
      return true; });
    const [k,dir]=S.sort.split("-"), sg=dir==="asc"?1:-1, val=r=>k==="fecha"?String(r.finRemocion||r.retiro||""):k==="nombre"?String(r.nombre||""):k==="gen"?(r.generacion??-1):k==="viab"?(r.viab??-1):k==="cons"?(r.cons??-1):k==="vol"?(r.d.volEntrada||0):k==="fv"?(+r.tq||0):"";
    return l.sort((a,b)=>{ const x=val(a), y=val(b); return (x>y?1:x<y?-1:0)*sg; }); }
  const filtrosActivos=()=>Object.values(S.fil).filter(Boolean).length+(S.q?1:0);

  /* ---------- Render ---------- */
  function kpis(regs,mv){ const now=Date.now(), d30=toIn(new Date(now-30*DAY)), cols=Object.values(App.S.colectores);
    const tot=cols.reduce((s,c)=>s+(num(c.vol)||0),0), disp=cols.filter(c=>App.T.estadoLevColector(c,now).txt==="Disponible");
    const ult=mv.filter(m=>m.t&&String(m.t)>=d30&&!m.info), ent=ult.filter(m=>m.tipo==="entrada"), sie=ult.filter(m=>m.tipo==="siembra"), des=ult.filter(m=>m.tipo==="descarte"), at=atencion();
    const k=(lab,v,sub,cls="",go="")=>`<button type="button" class="lev-kpi bd-kpi ${cls}" ${go?`data-go="${go}"`:""}><span>${lab}</span><b>${v}</b><small>${sub}</small></button>`;
    return `<div class="lev-kpis bd-kpis">${k("Inventario actual",f(tot,0)+" Hl",`${cols.length} ${cols.length===1?"posición":"posiciones"} de colector`,"","tab:inventario")}${k("Disponible para sembrar",disp.length,f(disp.reduce((s,c)=>s+(num(c.vol)||0),0),0)+" Hl dentro de tiempo","","tab:inventario")}${k("Entradas · 30 días",f(ent.reduce((s,m)=>s+(m.hl||0),0),0)+" Hl",`${new Set(ent.map(m=>m.id)).size} cosechas`,"","mv:entrada")}${k("Resiembras · 30 días",sie.length,"salidas a fermentadores","","mv:siembra")}${k("Descartes · 30 días",des.length,f(des.reduce((s,m)=>s+(m.hl||0),0),0)+" Hl",des.length?"warning":"","mv:descarte")}${k("Necesita atención",at.length,at.length?"revisar ahora":"todo en orden",at.length?"critical":"","tab:resumen")}</div>`; }
  function tabs(regs){ const T=[["resumen","Resumen"],["inventario","Inventario actual"],["registros",`Registros · ${regs.filter(r=>!r.incompleto).length}`],["movimientos","Movimientos"],["lotes","Lotes"],["calidad","Calidad"]];
    return `<div class="seg bd-tabs" role="radiogroup" aria-label="Secciones de la base de datos">${T.map(([k,l])=>`<label><input type="radio" name="bdtab" value="${k}" ${S.tab===k?"checked":""}>${l}</label>`).join("")}</div>`; }

  function vResumen(regs,mv){ const at=atencion(), now=Date.now(), cols=Object.entries(App.S.colectores).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}));
    const porEst={}; regs.forEach(r=>porEst[r.st]=(porEst[r.st]||0)+1);
    const genInv={}; cols.forEach(([,c])=>{ if(c.generacion!=null) genInv[c.generacion]=(genInv[c.generacion]||0)+(num(c.vol)||0); });
    return `<div class="bd-grid2">
      <section class="card card-p"><div class="sec-h"><div><h2>¿Qué necesita atención?</h2><span class="small muted">Inventario, calidad y consistencia de datos</span></div></div>
        ${at.length?`<ul class="bd-att">${at.map(x=>`<li class="${x.nivel}"><span class="dot"></span><span>${esc(x.txt)}</span>${x.acc?`<button type="button" class="btn sm ghost" data-acc="${esc(x.acc)}">Ver</button>`:""}</li>`).join("")}</ul>`:`<p class="muted">Nada pendiente. 👌</p>`}</section>
      <section class="card card-p"><div class="sec-h"><div><h2>¿Qué tengo?</h2><span class="small muted">Levadura en colectores ahora</span></div><button type="button" class="more btn sm ghost" data-go="tab:inventario">Ver inventario</button></div>
        ${cols.length?`<div class="bd-mini">${cols.map(([id,c])=>{ const e=App.T.estadoLevColector(c,now); return `<button type="button" class="bd-mini-it" data-acc="${c.levId&&App.S.bdlev[c.levId]?"rec:"+esc(c.levId):"col:"+esc(id)}"><b>${esc(c.nombre)}</b><span>${POS(id)} · Gen ${c.generacion??"—"}</span><span>${hl(num(c.vol))}</span><span class="small ${e.txt==="Disponible"?"":"bd-warn"}">${esc(e.txt)}</span></button>`; }).join("")}</div>`:`<p class="muted">No hay levadura en colectores.</p>`}
        ${Object.keys(genInv).length?`<div class="small muted" style="margin-top:10px">Por generación: ${Object.entries(genInv).sort((a,b)=>a[0]-b[0]).map(([g,v])=>`Gen ${g}: ${f(v,0)} Hl`).join(" · ")}</div>`:""}</section>
    </div>
    <div class="bd-grid2">
      <section class="card card-p"><div class="sec-h"><div><h2>Últimos movimientos</h2><span class="small muted">Qué entró y qué salió</span></div><button type="button" class="more btn sm ghost" data-go="tab:movimientos">Ver todos</button></div>
        <ul class="bd-feed">${mv.filter(m=>m.t&&!m.info).slice(0,8).map(m=>`<li><span>${tTag(m.tipo)}</span><span><b>${esc(m.nombre)}</b> <span class="muted small">${esc(m.det)}</span></span><span class="r">${m.hl!=null?f(m.hl,0)+" Hl":""}<small>${fmtS(m.t)}</small></span></li>`).join("")}</ul></section>
      <section class="card card-p"><div class="sec-h"><div><h2>Registros por estado</h2><span class="small muted">${regs.length} registros en la base de datos</span></div></div>
        <div class="bd-est">${Object.keys(M.ESTADOS).filter(k=>porEst[k]).map(k=>`<button type="button" class="bd-est-it" data-acc="fil:estado:${k}">${tag(k)}<b>${porEst[k]}</b></button>`).join("")}</div>
        <p class="small muted" style="margin:12px 0 0">“Vaciada sin resiembra” son cosechas cuyo colector quedó marcado como vacío en el Excel sin registrar en qué FV se sembró.</p></section>
    </div>`; }

  function vInventario(){ const now=Date.now(), ent=Object.entries(App.S.colectores).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}));
    const libres=[]; for(let c=1;c<=6;c++) [1,2].forEach(s=>{ if(!App.S.colectores[`c${c}-${s}`]) libres.push(`C${c}-P${s}`); });
    return `<p class="small muted" style="margin:0 0 12px">La cantidad disponible es la de cada posición del colector: entra con la cosecha y baja con cada salida registrada (resiembra, descarte u otra).</p>
      ${ent.length?`<div class="bd-inv">${ent.map(([id,c])=>{ const tc=App.T.tiempoColector(c,now), e=App.T.estadoLevColector(c,now), b=c.levId&&App.S.bdlev[c.levId], q=b?M.calidad(b):[];
        const usado=c.volInicial!=null&&c.vol!=null?Math.max(0,c.volInicial-c.vol):null, pct=c.volInicial?Math.max(0,Math.min(100,(c.vol||0)/c.volInicial*100)):100;
        return `<article class="card card-p bd-inv-c"><header><div><span class="small muted">${POS(id)}</span><h3>${esc(c.nombre)}</h3></div>${C.status({k:e.k==="amarillo"?"rojo":c.marcaDescarte?"naranja":"verde",txt:e.txt})}</header>
          <div class="bd-vol"><b>${hl(num(c.vol))}</b><span class="small muted">${c.volInicial!=null?"de "+f(c.volInicial,0)+" Hl"+(usado?` · salieron ${f(usado,0)} Hl`:""):""}</span><div class="bd-bar"><i style="width:${pct}%"></i></div></div>
          <div class="kv bd-kv"><div><div class="k">Generación</div><div class="v">${c.generacion??"—"}</div></div><div><div class="k">Origen</div><div class="v">FV ${esc(c.tq||"—")} · ${esc(c.lote||"—")}</div></div><div><div class="k">Viabilidad</div><div class="v">${pc(c.viab)}</div></div><div><div class="k">Consistencia</div><div class="v">${pc(c.cons)}</div></div><div><div class="k">En colector</div><div class="v">${tc.lleva!=null?dur(tc.lleva):"—"}</div></div><div><div class="k">Máx. resiembra ABI</div><div class="v">${fmtS(tc.mr)}</div></div></div>
          ${q.length?`<div class="callout warn small">${q.map(x=>esc(x.lab+" "+x.r)).join(" · ")}</div>`:""}
          <footer class="row">${b?`<button type="button" class="btn sm" data-acc="rec:${esc(c.levId)}">Ficha</button>`:""}<button type="button" class="btn sm pri" data-salida="${id}">Registrar salida</button><button type="button" class="btn sm ghost" data-ajuste="${id}">Ajustar volumen</button></footer></article>`; }).join("")}</div>`:C.empty("check","No hay levadura en colectores","Las cosechas registradas aparecerán aquí.")}
      <p class="small muted" style="margin-top:12px">Posiciones libres: ${libres.length?libres.join(", "):"ninguna"}.</p>`; }

  function opciones(vals,sel,lab){ return `<option value="">${lab}</option>`+vals.map(v=>{ const [x,y]=Array.isArray(v)?v:[v,v]; return `<option value="${esc(x)}" ${String(x)===String(sel)?"selected":""}>${esc(y)}</option>`; }).join(""); }
  function vRegistros(regs){ const l=filtrar(regs.filter(r=>!r.incompleto||S.fil.estado==="incompleto")), F=S.fil, uniq=a=>[...new Set(a.filter(x=>x!=null&&x!==""))];
    const marcas=uniq(regs.map(r=>r.marca)).sort(), fams=uniq(regs.map(r=>r.familia)).sort(), gens=uniq(regs.map(r=>r.generacion)).sort((a,b)=>a-b), resps=uniq(regs.map(r=>String(r.respSensorial||r.responsable||"").trim().toUpperCase())).sort(), fvs=uniq(regs.map(r=>r.tq)).sort((a,b)=>a-b);
    const n=filtrosActivos(), mas=S.more||!!(F.fam||F.fv||F.resp||F.calidad||F.origen||F.desde||F.hasta);
    return `<div class="bd-tools"><label class="search-in">${C.icon("search")}<span class="sr-only">Buscar</span><input id="bdq" type="search" placeholder="Levadura, consecutivo F, FV o responsable" value="${esc(S.q)}"></label>
      <select class="inp" data-f="estado" aria-label="Estado">${opciones(Object.entries(M.ESTADOS).map(([k,v])=>[k,v[0]]),F.estado,"Todos los estados")}</select>
      <select class="inp" data-f="marca" aria-label="Marca">${opciones(marcas,F.marca,"Todas las marcas")}</select>
      <select class="inp" data-f="gen" aria-label="Generación">${opciones(gens.map(g=>[g,"Gen "+g]),F.gen,"Todas las gen.")}</select>
      <select class="inp" data-f="col" aria-label="Colector">${opciones([1,2,3,4,5,6].map(c=>[c,"Colector "+c]),F.col,"Todos los colectores")}</select>
      <button type="button" class="btn sm ghost" id="bdmore" aria-expanded="${mas}">${C.icon("sliders")}${mas?"Menos filtros":"Más filtros"}</button>
      ${n?`<button type="button" class="btn sm" id="bdclr">${C.icon("x")}Limpiar filtros (${n})</button>`:""}</div>
      <div class="bd-tools ${mas?"":"hidden"}">
      <select class="inp" data-f="fam" aria-label="Familia">${opciones(fams,F.fam,"Todas las familias")}</select>
      <select class="inp" data-f="fv" aria-label="Tanque">${opciones(fvs.map(v=>[v,"FV "+v]),F.fv,"Todos los FV")}</select>
      <select class="inp" data-f="resp" aria-label="Responsable">${opciones(resps,F.resp,"Todos los responsables")}</select>
      <select class="inp" data-f="calidad" aria-label="Calidad">${opciones([["ok","Dentro de límites"],["fuera","Fuera de límites"],["datos","Datos para revisar"]],F.calidad,"Calidad: todas")}</select>
      <select class="inp" data-f="origen" aria-label="Origen">${opciones([["excel","Excel"],["app","Plataforma"]],F.origen,"Todos los orígenes")}</select>
      <label class="bd-date">Desde<input class="inp" type="date" data-f="desde" value="${esc(F.desde)}"></label><label class="bd-date">Hasta<input class="inp" type="date" data-f="hasta" value="${esc(F.hasta)}"></label>
      </div>
      <div class="bd-count row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="small muted">${l.length} de ${regs.filter(r=>!r.incompleto).length} registros${n?" con los filtros actuales":""} · toca una fila para ver el detalle</span><select class="inp" id="bdsort" aria-label="Ordenar" style="min-height:36px">${opciones([["fecha-desc","Más recientes primero"],["fecha-asc","Más antiguos primero"],["nombre-asc","Levadura A→Z"],["gen-desc","Generación mayor"],["viab-desc","Mayor viabilidad"],["viab-asc","Menor viabilidad"],["cons-desc","Mayor consistencia"],["vol-desc","Mayor volumen"],["fv-asc","FV origen"]],S.sort,"Ordenar")}</select></div>
      ${l.length?`<div class="card tw bd-tw"><table class="bd-t"><thead><tr><th>Fin remoción</th><th>Levadura</th><th class="n">Gen</th><th>Marca</th><th>Origen</th><th>Colectores</th><th class="n">Viab.</th><th class="n">Cons.</th><th class="n">pH</th><th>Resiembras</th><th>Estado</th></tr></thead><tbody>${l.slice(0,S.max).map(r=>{ const q=M.calidad(r), o=revisar(r);
        return `<tr class="bd-row" data-acc="rec:${esc(r.id)}" tabindex="0"><td>${fmt(r.finRemocion||r.retiro)}</td><td><b>${esc(r.nombre||"—")}</b>${o.length?` <span class="bd-flag" title="${esc(o.join(". "))}">!</span>`:""}</td><td class="n">${r.generacion??"—"}</td><td>${esc(r.marca||"—")}</td><td>FV ${esc(r.tq||"—")} · ${esc(r.lote||"—")}</td><td>${r.destino==="DES"?`<span class="muted">${esc((r.descarteDirecto||[]).map(x=>x.destino).join(", ")||r.destinoDescarte||"Descarte")}</span>`:(r.colectores||[]).map(c=>`<span class="bd-c ${c.vacio?"v":""}" title="${c.vacio?"Colector vaciado":"En colector"}">C${esc(c.colector)} · ${c.vol!=null?f(c.vol,0):"?"}</span>`).join(" ")}</td><td class="n ${q.some(x=>x.k==="viab")?"bd-bad":""}">${pc(r.viab)}</td><td class="n ${q.some(x=>x.k==="cons")?"bd-bad":""}">${pc(r.cons)}</td><td class="n ${q.some(x=>x.k==="ph")?"bd-bad":""}">${r.ph!=null?f(r.ph,2):"—"}</td><td>${(r.siembras||[]).map(s=>"FV "+esc(s.tq)).join(", ")||'<span class="muted">—</span>'}</td><td>${tag(r.st)}</td></tr>`; }).join("")}</tbody></table></div>
        ${l.length>S.max?`<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" id="bdmas">Ver ${Math.min(60,l.length-S.max)} más</button></div>`:""}`:C.empty("search","Sin resultados","Cambia la búsqueda o limpia los filtros.")}`; }

  function filtrarMv(mv){ const q=App.Traza.N(S.mv.q).replace(/\s+/g,""), V=S.mv; return mv.filter(m=>{ if(V.tipo&&m.tipo!==V.tipo) return false; if(V.col&&String(m.col)!==V.col) return false;
      const d=String(m.t||"").slice(0,10); if(V.desde&&(!d||d<V.desde)) return false; if(V.hasta&&(!d||d>V.hasta)) return false;
      if(q){ const hay=[m.nombre,m.loteOrigen,m.lote,"FV"+m.fv,"FV"+m.fvOrigen,m.destino].map(x=>App.Traza.N(x||"").replace(/\s+/g,"")).join("|"); if(!hay.includes(q)) return false; } return true; }); }
  function vMovimientos(mv){ const l=filtrarMv(mv), V=S.mv, sum=t=>l.filter(m=>m.tipo===t&&!m.info).reduce((s,m)=>s+(m.hl||0),0), cnt=t=>mv.filter(m=>m.tipo===t).length;
    return `<div class="bd-tools"><div class="chips" role="group" aria-label="Tipo de movimiento">${[["","Todos",mv.length],["entrada","Entradas",cnt("entrada")],["siembra","Resiembras",cnt("siembra")],["descarte","Descartes",cnt("descarte")],["salida","Otras salidas",cnt("salida")]].map(([k,lab,c])=>`<button type="button" class="chip" aria-pressed="${V.tipo===k}" data-mvt="${k}">${lab}<span class="c">${c}</span></button>`).join("")}</div></div>
      <div class="bd-tools"><label class="search-in">${C.icon("search")}<span class="sr-only">Buscar</span><input id="mvq" type="search" placeholder="Levadura, FV, consecutivo o destino" value="${esc(V.q)}"></label>
        <select class="inp" data-mv="col" aria-label="Colector">${opciones([1,2,3,4,5,6].map(c=>[c,"Colector "+c]),V.col,"Todos los colectores")}</select>
        <label class="bd-date">Desde<input class="inp" type="date" data-mv="desde" value="${esc(V.desde)}"></label><label class="bd-date">Hasta<input class="inp" type="date" data-mv="hasta" value="${esc(V.hasta)}"></label>
        ${V.tipo||V.q||V.col||V.desde||V.hasta?`<button type="button" class="btn sm" id="mvclr">${C.icon("x")}Limpiar filtros</button>`:""}</div>
      <div class="bd-sum"><div><span>Entradas</span><b>${f(sum("entrada"),0)} Hl</b></div><div><span>Salen por resiembra</span><b>${f(sum("siembra"),0)} Hl</b></div><div><span>Descartes</span><b>${f(sum("descarte"),0)} Hl</b></div><div><span>Otras salidas</span><b>${f(sum("salida"),0)} Hl</b></div></div>
      <div class="small muted bd-count">${l.length} movimientos. En el Excel la resiembra no registra cuántos Hl se usaron: cuando el colector quedó marcado como vacío se muestra el volumen que salió del colector (“vaciado”).</div>
      ${l.length?`<div class="card tw bd-tw"><table class="bd-t"><thead><tr><th>Fecha</th><th>Tipo</th><th>Levadura</th><th class="n">Gen</th><th>Colector</th><th>Detalle</th><th class="n">Hl</th></tr></thead><tbody>${l.slice(0,S.mvMax).map(m=>`<tr class="bd-row ${m.info?"bd-info":""}" data-acc="rec:${esc(m.id)}" tabindex="0"><td>${m.t?fmt(m.t):'<span class="muted">Sin fecha</span>'}</td><td>${tTag(m.tipo)}</td><td><b>${esc(m.nombre)}</b></td><td class="n">${m.gen??"—"}</td><td>${m.col?"C"+esc(m.col):"—"}</td><td>${esc(m.det)}</td><td class="n">${m.hl!=null?f(m.hl,0)+(m.hlTipo==="vaciado"?' <span class="small muted">vaciado</span>':""):'<span class="muted">sin dato</span>'}</td></tr>`).join("")}</tbody></table></div>
        ${l.length>S.mvMax?`<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" id="mvmas">Ver más</button></div>`:""}`:C.empty("search","Sin movimientos","Cambia los filtros.")}`; }

  function vLotes(regs){ const all=M.lotes(regs), q=App.Traza.N(S.lq).replace(/\s+/g,""), l=all.filter(x=>!q||[x.lote,"FV"+x.fv,x.marca,...x.cosecha.map(r=>r.nombre),...x.sembrado.map(z=>z.r.nombre)].map(v=>App.Traza.N(v||"").replace(/\s+/g,"")).join("|").includes(q));
    return `<div class="bd-tools"><label class="search-in">${C.icon("search")}<span class="sr-only">Buscar lote</span><input id="lq" type="search" placeholder="Consecutivo F, FV o levadura" value="${esc(S.lq)}"></label></div>
      <div class="small muted bd-count">${l.length} lotes. Cada consecutivo F muestra con qué levadura se sembró y qué levadura salió de él.</div>
      ${l.length?`<div class="card tw bd-tw"><table class="bd-t"><thead><tr><th>Lote</th><th>FV</th><th>Marca</th><th>Fecha</th><th>Sembrado con</th><th>Cosechado como</th><th>Estado</th></tr></thead><tbody>${l.slice(0,S.lMax).map(x=>{ const co=x.cosecha[0];
        return `<tr class="bd-row" ${co?`data-acc="rec:${esc(co.id)}"`:x.sembrado[0]?`data-acc="rec:${esc(x.sembrado[0].r.id)}"`:""} tabindex="0"><td><b>${esc(x.lote)}</b> <span class="small muted">${esc(x.anio||"")}</span></td><td>${x.fv?"FV "+esc(x.fv):"—"}</td><td>${esc(x.marca||"—")}</td><td>${fmt(x.fecha)}</td><td>${x.sembrado.map(z=>esc(z.r.nombre)+(z.r.generacion!=null?` <span class="small muted">Gen ${z.r.generacion}</span>`:"")).join(", ")||(x.tanque&&(x.tanque.levadura||{}).nombre?esc(x.tanque.levadura.nombre):'<span class="muted">—</span>')}</td><td>${co?`<b>${esc(co.nombre)}</b>${co.generacion!=null?` <span class="small muted">Gen ${co.generacion}</span>`:""}`:x.tanque&&!(x.tanque.retiro||{}).fecha?'<span class="muted">En fermentación</span>':'<span class="muted">—</span>'}</td><td>${co?tag(co.st):x.tanque&&!(x.tanque.retiro||{}).fecha?'<span class="tag est">Activo</span>':""}</td></tr>`; }).join("")}</tbody></table></div>
        ${l.length>S.lMax?`<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" id="lmas">Ver más</button></div>`:""}`:C.empty("search","Sin lotes","Cambia la búsqueda.")}`; }

  function vCalidad(regs){ const L=M.LIM(), act=regs.filter(r=>r.st!=="anulado"&&!r.incompleto&&r.destino!=="DES"), ult=act.slice().sort((a,b)=>String(b.finRemocion||"").localeCompare(String(a.finRemocion||""))).slice(0,30);
    const fm=(k,v)=>v==null?"—":L[k].t==="p"?pc(v):L[k].t==="c"?f(v,1)+" °C":L[k].t==="h"?f(v,0)+" h":f(v,2);
    const vals=(k,lista)=>k==="tempColector"?lista.flatMap(r=>(r.siembras||[]).map(s=>num(s.tempColector))):k==="horasColector"?lista.flatMap(r=>r.d.siembras.map(s=>s.horasColector)):lista.map(r=>num(r[k]));
    const fuera=act.filter(r=>M.calidad(r).length).sort((a,b)=>String(b.finRemocion||"").localeCompare(String(a.finRemocion||""))).slice(0,40);
    return `<section class="card card-p"><div class="sec-h"><div><h2>Límites de control</h2><span class="small muted">Tomados de las filas UCL / TG / LCL de la hoja B.D LEVADURA · promedio de las últimas 30 cosechas</span></div></div>
      <div class="tw"><table class="bd-t"><thead><tr><th>Parámetro</th><th class="n">LCL</th><th class="n">Objetivo</th><th class="n">UCL</th><th class="n">Rechazo</th><th class="n">Promedio (30)</th><th class="n">Dentro de límites</th></tr></thead><tbody>${Object.entries(L).map(([k,x])=>{ const v=vals(k,ult).filter(z=>z!=null&&isFinite(z)), all=vals(k,act).filter(z=>z!=null&&isFinite(z)), ok=all.filter(z=>!M.fuera(k,z)).length;
        return `<tr><td>${esc(x.lab)}</td><td class="n">${x.lcl!=null?fm(k,x.lcl):"—"}</td><td class="n">${x.tg!=null?fm(k,x.tg):"—"}</td><td class="n">${x.ucl!=null?fm(k,x.ucl):"—"}</td><td class="n">${x.url!=null?fm(k,x.url):"—"}</td><td class="n">${v.length?fm(k,mean(v)):"—"}</td><td class="n">${all.length?pc(ok/all.length,0)+` <span class="small muted">(${all.length-ok} fuera)</span>`:"—"}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="small muted" style="margin:10px 0 0">El Excel también trae límites para “% retiro previo” (15 / 18 / 21 %) y etanol (4,5), pero no coinciden con las unidades de esas columnas, así que no se aplican automáticamente.</p></section>
      <section class="card card-p" style="margin-top:14px"><div class="sec-h"><div><h2>Cosechas fuera de límites</h2><span class="small muted">${fuera.length?"Las más recientes":"Ninguna"}</span></div><button type="button" class="btn sm ghost" data-acc="fil:calidad:fuera">Ver en registros</button></div>
      ${fuera.length?`<div class="tw"><table class="bd-t"><thead><tr><th>Fin remoción</th><th>Levadura</th><th>Fuera de límite</th></tr></thead><tbody>${fuera.map(r=>`<tr class="bd-row" data-acc="rec:${esc(r.id)}" tabindex="0"><td>${fmt(r.finRemocion)}</td><td><b>${esc(r.nombre)}</b></td><td>${M.calidad(r).map(q=>`${esc(q.lab)} ${fm(q.k,q.v)} <span class="small muted">(${esc(q.r)})</span>`).join(" · ")}</td></tr>`).join("")}</tbody></table></div>`:""}</section>`; }

  /* ============================================================
     NUEVA EXPERIENCIA · Explorador de levaduras
     La base de datos sigue existiendo, pero deja de presentarse
     como una hoja de cálculo. El usuario busca una levadura y
     recibe su ficha, estado y trazabilidad en una sola vista.
     ============================================================ */
  function normBD(v){ return App.Traza.N(v||"").replace(/\s+/g,""); }
  function explorerRegs(){
    const map=new Map();
    const add=(r)=>{
      if(!r||r.incompleto||!r.nombre) return;
      const k=normBD(r.nombre); if(!k) return;
      if(!map.has(k)) map.set(k,{name:r.nombre,records:[],gens:new Set(),marcas:new Set(),fvs:new Set(),lots:new Set(),collectors:new Set()});
      const x=map.get(k); x.records.push(r); if(r.generacion!=null)x.gens.add(+r.generacion); if(r.marca)x.marcas.add(r.marca); if(r.tq!=null)x.fvs.add(String(r.tq)); if(r.lote)x.lots.add(r.lote); (r.colectores||[]).forEach(c=>{ if(c){ x.collectors=x.collectors||new Set(); x.collectors.add("C"+String(c.colector)+(c.posicion?"-P"+String(c.posicion).replace(/.*-P/i,""):"")); } });
    };
    M.registros().forEach(add);
    Object.values(App.S.tanques||{}).forEach(t=>{ const L=t.levadura||{}; if(L.nombre){ add({nombre:L.nombre,generacion:L.generacion,marca:t.marca,tq:t.tq,lote:t.lote,siembras:[],origen:"plataforma",__tanque:t}); }});
    return [...map.values()].map(x=>{ x.records.sort((a,b)=>String(b.finRemocion||b.retiro||b.__tanque?.fin||"").localeCompare(String(a.finRemocion||a.retiro||a.__tanque?.fin||""))); return x; }).sort((a,b)=>a.name.localeCompare(b.name));
  }
  function explorerCurrent(name){
    const q=normBD(name), cols=[];
    Object.entries(App.S.colectores||{}).forEach(([id,c])=>{ if(c&&normBD(c.nombre)===q) cols.push({id,c}); });
    const tanks=[];
    Object.values(App.S.tanques||{}).forEach(t=>{ if(t&&normBD(t.levadura&&t.levadura.nombre)===q) tanks.push(t); });
    return {cols,tanks};
  }
  function explorerState(name,cur){
    if(cur.cols.length){
      const es=cur.cols.map(x=>App.T.estadoLevColector(x.c,Date.now()));
      if(es.some(e=>e.k==="rojo")) return {txt:"FUERA DE TIEMPO",cl:"danger"};
      if(es.some(e=>e.k==="naranja"||e.k==="amarillo")) return {txt:"CERCA DEL LÍMITE",cl:"warn"};
      return {txt:"DISPONIBLE",cl:""};
    }
    if(cur.tanks.some(t=>!(t.retiro||{}).fecha)) return {txt:"EN FERMENTACIÓN",cl:""};
    return {txt:"HISTÓRICA",cl:"neutral"};
  }
  function explorerLatestDate(x){
    const dates=[];
    (x.records||[]).forEach(r=>{
      [r.finRemocion,r.retiro,r.t0].forEach(v=>{ if(v) dates.push(v); });
      (r.siembras||[]).forEach(z=>{ if(z.fecha) dates.push(z.fecha); });
    });
    const cur=explorerCurrent(x.name);
    cur.cols.forEach(({c})=>{ if(c.ingreso) dates.push(c.ingreso); });
    cur.tanks.forEach(t=>{ if(t.fin) dates.push(t.fin); });
    return dates.filter(Boolean).sort((a,b)=>String(b).localeCompare(String(a)))[0]||null;
  }
  function explorerLatestHarvestDate(x){
    const dates=(x.records||[]).flatMap(r=>[r.finRemocion,r.retiro,r.t0].filter(Boolean));
    return dates.sort((a,b)=>String(b).localeCompare(String(a)))[0]||null;
  }
  function explorerPeriodMatch(x,days){
    if(!days) return true;
    const d=explorerLatestHarvestDate(x); if(!d) return false;
    const cutoff=Date.now()-days*DAY;
    return parseDT(d)>=cutoff;
  }
  function explorerFmtDate(v){ return v?fmtS(v):"—"; }
  function explorerMeaning(label){
    const meanings={
      "Hora 0 remoción":"Momento de referencia desde el que se calculan las ventanas de resiembra.",
      "Límite COPEC":"Fecha/hora máxima de resiembra según la ventana COPEC registrada.",
      "Límite ABI":"Fecha/hora máxima de resiembra según la ventana ABI registrada.",
      "Volumen de cabeza":"Volumen de levadura retirado inicialmente del fermentador.",
      "% retiro previo":"Porcentaje de retiro previo registrado antes de la cosecha.",
      "Generación":"Número de generación de la levadura dentro de su línea.",
      "Consistencia":"Indicador de consistencia de la levadura registrado en la cosecha.",
      "Viabilidad":"Porcentaje de células viables registrado para la levadura."
    };
    return meanings[label]||"Dato proveniente del registro operativo.";
  }
  function explorerTrace(x){
    const recs=x.records||[], cur=explorerCurrent(x.name), harvests=[], sowings=[];
    recs.forEach(r=>{
      const cols=(r.colectores||[]).filter(c=>!c.vacio);
      if(r.retiro||r.finRemocion) harvests.push({date:r.retiro||r.finRemocion,fv:r.tq,lote:r.lote,cols,source:r});
      (r.siembras||[]).forEach(z=>sowings.push({date:z.fecha,fv:z.tq,lote:z.lote,collector:z.colector,source:r}));
    });
    cur.tanks.forEach(t=>{const L=t.levadura||{};sowings.push({date:t.fin,fv:t.tq,lote:t.lote,collector:L.colector||null,source:t,active:!(t.retiro||{}).fecha});});
    harvests.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    sowings.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    const routeFor=(kind,value,meta={})=>{
      if(kind==="collector"){const m=String(value||"").match(/C?(\d+)/i);return m?`colectores/${m[1]}`:"";}
      if(kind==="fv"||kind==="lot"){if(meta.lote)return `tanque/${meta.lote}`;const raw=String(value||"").replace(/^FV\s*/i,"");const t=Object.values(App.S.tanques||{}).find(t=>String(t.tq)===raw);return t?.lote?`tanque/${t.lote}`:"";}
      return "";
    };
    const link=(kind,value,title,meta={})=>{const go=routeFor(kind,value,meta);return go?`<button type="button" class="bd-trace-link" data-trace-kind="${kind}" data-trace-value="${esc(value)}" data-trace-go="${esc(go)}">${esc(title)} ↗</button>`:`<b>${esc(title)}</b>`;};
    const originBlocks=harvests.slice(0,8).map(h=>`<article class="bd-trace-card"><div class="bd-trace-card-head"><div><span class="bd-trace-kicker">COSECHA REGISTRADA</span><h4>${link("fv","FV "+String(h.fv||""),"FV "+String(h.fv||"—"),{lote:h.lote})}</h4></div><span class="bd-trace-date">${explorerFmtDate(h.date)}</span></div><div class="bd-trace-card-meta"><span>Consecutivo</span><b>${esc(h.lote||"No registrado")}</b></div><div class="bd-trace-card-dest"><span>Se guardó en</span>${h.cols.length?h.cols.map(c=>`<div class="bd-trace-dest-item">${link("collector","C"+c.colector,"Colector C"+c.colector+(c.posicion?" · Posición "+c.posicion:""),{lote:h.lote})}<b>${c.vol!=null?f(c.vol,0)+" Hl":"Volumen no registrado"}</b></div>`).join(""):`<p>No hay un colector asociado a esta cosecha.</p>`}</div></article>`).join("");
    const useBlocks=sowings.slice(0,10).map(z=>`<article class="bd-trace-card ${z.active?"is-active":""}"><div class="bd-trace-card-head"><div><span class="bd-trace-kicker">${z.active?"SIEMBRA ACTUAL":"SIEMBRA REGISTRADA"}</span><h4>${link("fv","FV "+String(z.fv||""),"FV "+String(z.fv||"—"),{lote:z.lote})}</h4></div><span class="bd-trace-date">${explorerFmtDate(z.date)}</span></div><div class="bd-trace-card-meta"><span>Consecutivo</span><b>${esc(z.lote||"No registrado")}</b></div><div class="bd-trace-card-dest"><span>Levadura tomada de</span>${z.collector?link("collector","C"+String(z.collector),"Colector C"+String(z.collector),{lote:z.lote}):`<p>Origen no especificado en el registro.</p>`}</div></article>`).join("");
    return `<section class="bd-panel bd-trace-panel" id="bdTracePanel"><div class="bd-section-title"><div><h3>🔗 Recorrido de la levadura</h3><span>Primero, su cosecha y almacenamiento. Después, las siembras realizadas con ella.</span></div></div><div class="bd-trace-summary"><div><b>${harvests.length}</b><span>cosechas de origen</span></div><div><b>${harvests.reduce((n,h)=>n+h.cols.length,0)}</b><span>destinos en colectores</span></div><div><b>${sowings.length}</b><span>siembras registradas</span></div><div><b>${harvests[0]?explorerFmtDate(harvests[0].date):"—"}</b><span>cosecha más reciente</span></div></div><section class="bd-trace-section"><h4>1. ¿De qué FV se cosechó y dónde se almacenó?</h4><p>La levadura salió de un fermentador (FV) y pudo distribuirse entre uno o varios colectores.</p>${originBlocks?`<div class="bd-trace-cards">${originBlocks}</div>`:`<div class="bd-trace-empty">No hay cosechas de origen registradas.</div>`}</section><section class="bd-trace-section"><h4>2. ¿En qué FV se sembró después?</h4><p>Estas son las fermentaciones donde se registró el uso de esta levadura.</p>${useBlocks?`<div class="bd-trace-cards">${useBlocks}</div>`:`<div class="bd-trace-empty">No hay siembras registradas para esta levadura.</div>`}</section><div class="bd-trace-footer"><span>Los botones con ↗ abren el colector o fermentador asociado.</span><span>Actividad más reciente: <b>${explorerLatestDate(x)?explorerFmtDate(explorerLatestDate(x)):"—"}</b></span></div></section>`;
  }
  function explorerDetail(x){
    const recs=x.records||[], cur=explorerCurrent(x.name), st=explorerState(x.name,cur);
    const gens=[...x.gens].sort((a,b)=>b-a), gen=gens[0];
    const allS=[]; const allC=[];
    recs.forEach(r=>{
      (r.siembras||[]).forEach(z=>allS.push({fecha:z.fecha,tq:z.tq,lote:z.lote,hl:z.hl,temp:z.tempSiembra,origen:z.colector?"C"+z.colector:(r.colectores||[]).length?"Colector":"—",activo:false,source:r}));
      if(r.retiro||r.finRemocion) allC.push({fecha:r.retiro||r.finRemocion,tq:r.tq,lote:r.lote,vol:(r.colectores||[]).reduce((a,c)=>a+(num(c.vol)||0),0),colectores:r.colectores||[],ventana:r.ventana,source:r});
    });
    cur.tanks.forEach(t=>allS.push({fecha:t.fin,tq:t.tq,lote:t.lote,hl:null,temp:null,origen:(t.levadura||{}).colector?"C"+t.levadura.colector:(t.levadura||{}).origen||"—",activo:!(t.retiro||{}).fecha,source:t}));
    allS.sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))); allC.sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||"")));
    const latest=recs[0]||{};
    const currentVol=cur.cols.reduce((a,x)=>a+(num(x.c.vol)||0),0);
    const fvSet=new Set([...allS.map(z=>z.tq),...allC.map(z=>z.tq)].filter(v=>v!=null));
    const viab=cur.cols.length?cur.cols[0].c.viab:latest.viab, cons=cur.cols.length?cur.cols[0].c.cons:latest.cons, ph=cur.cols.length?cur.cols[0].c.ph:latest.ph;
    const temp=cur.cols.length?cur.cols[0].c.temp:latest.temp, et=latest.etanol, sensor=cur.cols.length?cur.cols[0].c.sensorial:latest.sensorial;
    const parent=[...new Set(recs.map(r=>r.levSembrada).filter(Boolean))];
    const analysisRows=recs.slice().sort((a,b)=>String(b.finRemocion||b.retiro||b.t0||"").localeCompare(String(a.finRemocion||a.retiro||a.t0||""))).slice(0,24);
    const observations=[...new Set(recs.flatMap(r=>[r.obs,r.comentario].filter(Boolean)))];

    const qualityBadge=(v,kind)=>{ if(v==null)return "—"; const n=kind==="p"?v*100:v; return kind==="p"?pc(v):kind==="ph"?f(v,2):kind==="temp"?f(v,1)+" °C":f(n,2); };
    const data=(lab,v,help)=>`<div class="bd-data" title="${esc(help||explorerMeaning(lab))}"><span>${lab}${help||explorerMeaning(lab)?` <i class="bd-help" aria-hidden="true">?</i>`:""}</span><b>${v==null||v===""?"No registrado":v}</b></div>`;
    const flow=[];
    const firstS=allS[allS.length-1];
    if(firstS&&firstS.origen&&firstS.origen!=="—") flow.push(`<div class="bd-flow-node"><b>${esc(firstS.origen)}</b><span>Origen registrado</span></div>`);
    flow.push(`<div class="bd-flow-node"><b>${esc(x.name)}</b><span>${gen!=null?"Generación "+gen:"Levadura"}</span></div>`);
    if(allC.slice(0,4).length) allC.slice(0,4).forEach(c=>flow.push(`<span class="bd-flow-arrow">→</span><div class="bd-flow-node"><b>FV ${esc(c.tq)}</b><span>${esc(c.lote||"—")} · ${explorerFmtDate(c.fecha)}</span></div>`));
    const actionLinks=cur.cols.map(({id})=>`<button type="button" class="btn sm" data-explorer-go="colectores/${esc(id.replace(/^c(\d+)-.*$/,'$1'))}">Ver C${esc(id.replace(/^c(\d+)-.*$/,'$1'))}</button>`).join("");
    return `<section class="bd-detail fade-in">
      <div class="bd-detail-hero">
        <div class="bd-detail-title"><div><div class="bd-eyebrow">Expediente de levadura</div><h2>${esc(x.name)}</h2><div class="bd-detail-sub">${esc([...x.marcas][0]||latest.marca||"—")} · Familia ${esc((App.Calc.parseLev(x.name)||{}).fam||latest.familia||"—")} · ${gen!=null?"Generación "+gen:"Generación no registrada"}</div></div><div class="bd-detail-actions"><span class="bd-yeast-state ${st.cl}">${st.txt}</span>${actionLinks}</div></div>
        <div class="bd-detail-kpis"><div class="bd-dkpi"><span>Ubicación actual</span><b>${cur.cols.length?cur.cols.map(x=>POS(x.id)).join(" · "):cur.tanks.some(t=>!(t.retiro||{}).fecha)?"En FV":"Sin ubicación"}</b></div><div class="bd-dkpi"><span>Volumen actual</span><b>${currentVol?f(currentVol,0)+" Hl":"—"}</b></div><div class="bd-dkpi"><span>Viabilidad</span><b>${qualityBadge(viab,"p")}</b></div><div class="bd-dkpi"><span>Consistencia</span><b>${qualityBadge(cons,"p")}</b></div><div class="bd-dkpi"><span>Actividad registrada</span><b>${fvSet.size} FV · ${allS.length} siembras</b></div></div>
      </div>
      <nav class="bd-exp-nav" aria-label="Secciones del expediente"><span>Ir a:</span><button type="button" data-exp-target="bd-exp-origin">Resumen</button><button type="button" data-exp-target="bd-exp-analysis">Análisis</button><button type="button" data-exp-target="bd-exp-sowings">Siembras</button><button type="button" data-exp-target="bd-exp-harvests">Cosechas</button><button type="button" data-exp-target="bd-exp-life">Recorrido</button><button type="button" data-exp-target="bd-exp-tech">Datos técnicos</button></nav>
      ${explorerTrace(x)}
      <div class="bd-section-grid bd-exp-section" id="bd-exp-origin">
        <section class="bd-panel"><h3>📍 ¿Dónde está y de dónde viene?</h3><div class="bd-panel-sub">Primero: dónde está ahora. Después: de qué registro viene.</div><div class="bd-data-grid">${data("Origen / familia",parent.length?parent.join(", "):(latest.familia||"No registrado"))}${data("Última cosecha",latest.retiro?explorerFmtDate(latest.retiro):"—")}${data("FV origen",latest.tq!=null?"FV "+latest.tq:"—")}${data("Consecutivo",latest.lote||"—")}${data("Colector actual",cur.cols.length?cur.cols.map(x=>POS(x.id)).join(", "):"—")}${data("Último momento ABI",cur.cols[0]?.c.maxAbi?explorerFmtDate(cur.cols[0].c.maxAbi):latest.maxAbi?explorerFmtDate(latest.maxAbi):"—")}</div><div class="bd-origin-flow" style="margin-top:14px">${flow.join("")}</div></section>
        <section class="bd-panel"><h3>🧪 Calidad de la levadura</h3><div class="bd-panel-sub">Últimos valores disponibles para esta cepa</div><div class="bd-data-grid">${data("Viabilidad",qualityBadge(viab,"p"))}${data("Consistencia",qualityBadge(cons,"p"))}${data("pH",qualityBadge(ph,"ph"))}${data("Temperatura",qualityBadge(temp,"temp"))}${data("Etanol",et!=null?esc(et):"—")}${data("Sensorial",sensor||"—")}</div><div class="bd-mini-note">Los valores se toman del colector actual cuando existe; de lo contrario, de la cosecha más reciente registrada.</div></section>
      </div>
      <section class="bd-panel bd-exp-section" id="bd-exp-analysis">
        <div class="bd-section-title"><h3>📊 Análisis registrados</h3><span>Resultados de las cosechas de esta levadura · más reciente primero</span></div>
        <div class="bd-analysis-table"><table><thead><tr><th>Fecha</th><th>FV · lote</th><th>Viabilidad</th><th>Consistencia</th><th>pH</th><th>T°</th><th>Sensorial</th></tr></thead><tbody>${analysisRows.length?analysisRows.map(r=>`<tr><td>${explorerFmtDate(r.finRemocion||r.retiro||r.t0)}</td><td><b>FV ${esc(r.tq??"—")}</b> · ${esc(r.lote||"—")}</td><td>${r.viab!=null?pc(r.viab):"—"}</td><td>${r.cons!=null?pc(r.cons):"—"}</td><td>${r.ph!=null?f(r.ph,2):"—"}</td><td>${r.temp!=null?f(r.temp,1)+" °C":"—"}</td><td>${esc(r.sensorial||"—")}</td></tr>`).join(""):`<tr><td colspan="7" class="muted">No hay análisis históricos registrados.</td></tr>`}</tbody></table></div>
        ${observations.length?`<div class="bd-analysis-note"><b>Observaciones registradas:</b> ${observations.map(esc).join(" · ")}</div>`:""}
      </section>
      <div class="bd-section-grid">
        <section class="bd-panel bd-exp-section" id="bd-exp-sowings"><h3>🌱 ¿Dónde fue sembrada?</h3><div class="bd-panel-sub">Fermentadores donde se registró una siembra de esta levadura.</div><div class="bd-timeline">${allS.length?allS.slice(0,20).map(z=>`<div class="bd-event"><div class="bd-event-date">${z.fecha?fmtS(z.fecha).replace(" ","<br>"):"—"}</div><div class="bd-event-dot"></div><div class="bd-event-body"><b>FV ${esc(z.tq||"—")} · ${esc(z.lote||"—")}${z.activo?` <span class="tag est">ACTIVO</span>`:""}</b><span>${z.hl!=null?f(z.hl,0)+" Hl · ":""}${esc(z.origen||"Sin origen registrado")}${z.temp!=null?" · T° "+f(z.temp,1)+" °C":""}</span></div></div>`).join(""):`<div class="bd-empty-search">No hay siembras registradas.</div>`}</div></section>
        <section class="bd-panel bd-exp-section" id="bd-exp-harvests"><h3>🧪 ¿De qué fermentadores salió?</h3><div class="bd-panel-sub">Aquí ves cada cosecha que originó esta levadura.</div><div class="bd-history-card">${allC.length?allC.slice(0,20).map(c=>`<div class="bd-history-row"><div><b>FV ${esc(c.tq||"—")} · ${esc(c.lote||"—")}</b><div class="small muted">${explorerFmtDate(c.fecha)}${c.colectores.length?" · "+c.colectores.map(x=>"C"+x.colector).join(", "):""}</div></div><span>${c.vol?f(c.vol,0)+" Hl":"—"}</span></div>`).join(""):`<div class="bd-empty-search">No hay cosechas registradas.</div>`}</div></section>
      </div>
      <section class="bd-panel bd-exp-section" id="bd-exp-life"><h3>🧬 Línea de vida</h3><div class="bd-panel-sub">De la actividad más reciente a la más antigua. Así puedes seguir su recorrido sin leer una tabla.</div><div class="bd-timeline">${[...allC.map(c=>({t:c.fecha,k:"Cosecha",d:`FV ${c.tq} · ${c.lote||"—"} · ${c.vol?f(c.vol,0)+" Hl":"volumen no registrado"}`})),...allS.map(z=>({t:z.fecha,k:z.activo?"Siembra actual":"Siembra",d:`FV ${z.tq||"—"} · ${z.lote||"—"}${z.origen?" · desde "+z.origen:""}`}))].sort((a,b)=>String(b.t||"").localeCompare(String(a.t||""))).slice(0,30).map(e=>`<div class="bd-event"><div class="bd-event-date">${e.t?fmtS(e.t).replace(" ","<br>"):"—"}</div><div class="bd-event-dot"></div><div class="bd-event-body"><b>${esc(e.k)}</b><span>${esc(e.d)}</span></div></div>`).join("")||`<div class="bd-empty-search">Sin movimientos registrados.</div>`}</div></section>
      ${recs.length?`<section class="bd-panel bd-exp-section" id="bd-exp-tech"><h3>📋 Datos técnicos</h3><div class="bd-panel-sub">Información útil del registro original. Pasa el cursor sobre <b>?</b> para entender qué significa cada campo.</div><div class="bd-data-grid">${data("Marca",latest.marca)}${data("Familia",latest.familia)}${data("Generación",latest.generacion!=null?"Gen "+latest.generacion:null)}${data("Hora 0 remoción",latest.t0?explorerFmtDate(latest.t0):null)}${data("Inicio remoción",latest.retiro?explorerFmtDate(latest.retiro):null)}${data("Fin remoción",latest.finRemocion?explorerFmtDate(latest.finRemocion):null)}${data("Vol. cabeza",latest.volCabeza!=null?f(latest.volCabeza,0)+" Hl":null)}${data("% retiro previo",latest.pctRetiro!=null?pc(latest.pctRetiro):null)}${data("Límite COPEC",latest.maxCopec?explorerFmtDate(latest.maxCopec):null)}${data("Límite ABI",latest.maxAbi?explorerFmtDate(latest.maxAbi):null)}${data("Responsable",latest.respSensorial||latest.responsable)}${data("Levadura sembrada",latest.levSembrada)}</div></section>`:""}
    </section>`;
  }
  function vExplorer(){
    const all=explorerRegs(), q=normBD(S.q);
    const period=S.explorerPeriod===0?0:(S.explorerPeriod||0);
    const requestedStatus=S.explorerStatus||"all";
    const sort=S.explorerSort||"recent";

    const stateOf=x=>explorerState(x.name,explorerCurrent(x.name));
    const groupOf=x=>{
      const cur=explorerCurrent(x.name), st=stateOf(x);
      if(cur.cols.length || st.txt==="DISPONIBLE" || st.txt==="CERCA DEL LÍMITE" || st.txt==="FUERA DE TIEMPO") return "colectores";
      if(cur.tanks.some(t=>!(t.retiro||{}).fecha)) return "fermentacion";
      return "historicas";
    };
    const hayDe=x=>{
      const cur=explorerCurrent(x.name);
      return [x.name,[...x.marcas].join(" "),[...x.gens].join(" "),[...x.fvs].map(v=>"FV"+v).join(" "),[...x.fvs].join(" "),[...x.lots].join(" "),[...(x.collectors||[])].join(" "),cur.tanks.map(t=>t.tq).join(" ")].join(" ").toUpperCase().replace(/\s+/g,"");
    };
    const groupLabel={colectores:"En colectores",fermentacion:"En fermentación",historicas:"Históricas"};
    const groupDesc={
      colectores:"Levadura actualmente almacenada y disponible en colectores.",
      fermentacion:"Levadura que ya fue sembrada y está asociada a un fermentador activo.",
      historicas:"Registros que ya no están en colector ni en fermentación activa."
    };
    const dateFor=(x,group)=>{
      if(group==="colectores") return explorerLatestHarvestDate(x) || explorerLatestDate(x);
      if(group==="fermentacion"){
        const cur=explorerCurrent(x.name);
        const d=cur.tanks.map(t=>t.fin).filter(Boolean).sort((a,b)=>String(b).localeCompare(String(a)))[0];
        return d || explorerLatestHarvestDate(x) || explorerLatestDate(x);
      }
      return explorerLatestHarvestDate(x) || explorerLatestDate(x);
    };
    const latestRecord=x=>(x.records||[])[0]||{};
    const currentInfo=x=>{
      const cur=explorerCurrent(x.name), rec=latestRecord(x);
      const cols=cur.cols;
      const tanks=cur.tanks.filter(t=>!(t.retiro||{}).fecha);
      const volume=cols.reduce((a,z)=>a+(num(z.c.vol)||0),0);
      return {cur,rec,cols,tanks,volume};
    };

    let base=all.filter(x=>{
      if(q && !hayDe(x).includes(q)) return false;
      if(!q && period && !explorerPeriodMatch(x,period)) return false;
      const g=groupOf(x);
      if(requestedStatus!=="all" && requestedStatus!==g) return false;
      return true;
    });

    const sortGroup=(arr,g)=>arr.slice().sort((a,b)=>{
      if(sort==="az") return a.name.localeCompare(b.name);
      if(sort==="gen") return (Math.max(...b.gens,-1)-Math.max(...a.gens,-1)) || a.name.localeCompare(b.name);
      if(sort==="state") return groupOf(a).localeCompare(groupOf(b)) || String(dateFor(b,g)||"").localeCompare(String(dateFor(a,g)||""));
      return String(dateFor(b,g)||"").localeCompare(String(dateFor(a,g)||"")) || a.name.localeCompare(b.name);
    });

    const groups={
      colectores:sortGroup(base.filter(x=>groupOf(x)==="colectores"),"colectores"),
      fermentacion:sortGroup(base.filter(x=>groupOf(x)==="fermentacion"),"fermentacion"),
      historicas:sortGroup(base.filter(x=>groupOf(x)==="historicas"),"historicas")
    };
    const totalCounts={colectores:all.filter(x=>groupOf(x)==="colectores").length,fermentacion:all.filter(x=>groupOf(x)==="fermentacion").length,historicas:all.filter(x=>groupOf(x)==="historicas").length};
    const selected=all.find(x=>normBD(x.name)===normBD(S.selected||""))||null;
    const selectedGroup=selected?groupOf(selected):null;
    const activeGroup=requestedStatus!=="all"?requestedStatus:null;
    const periodLabel=period?`Últimos ${period} días`:`Todo el historial`;

    const card=(x,g)=>{
      const info=currentInfo(x), rec=info.rec, st=stateOf(x), last=dateFor(x,g), gen=x.gens.size?Math.max(...x.gens):null;
      const brand=[...x.marcas][0]||rec.marca||"Sin marca";
      let primary="",secondary="",tertiary="";
      if(g==="colectores"){
        primary=info.cols.length?info.cols.map(z=>POS(z.id)).join(" · "):"Disponible";
        secondary=last?explorerFmtDate(last):"Sin fecha de cosecha";
        tertiary=info.volume?f(info.volume,0)+" Hl":"Volumen no registrado";
      }else if(g==="fermentacion"){
        primary=info.tanks.length?info.tanks.map(t=>"FV "+t.tq).join(" · "):"En FV";
        secondary=last?explorerFmtDate(last):"Sin fecha de siembra";
        tertiary=info.tanks.length&&info.tanks[0].lote?info.tanks[0].lote:"Fermentación activa";
      }else{
        primary=rec.tq!=null?"FV "+rec.tq:"Sin FV";
        secondary=last?explorerFmtDate(last):"Sin fecha";
        tertiary=rec.lote||"Sin consecutivo";
      }
      const viab=info.cols[0]?.c.viab!=null?info.cols[0].c.viab:rec.viab;
      const cons=info.cols[0]?.c.cons!=null?info.cols[0].c.cons:rec.cons;
      return `<button type="button" class="bd-final-card ${selected&&normBD(selected.name)===normBD(x.name)?"selected":""}" data-explorer-select="${esc(x.name)}">
        <div class="bd-final-card-top"><div><div class="bd-final-name">${esc(x.name)}</div><div class="bd-final-meta">${esc(brand)} · ${gen!=null?"Gen "+gen:"Gen —"}</div></div><span class="bd-yeast-state ${st.cl}">${esc(st.txt)}</span></div>
        <div class="bd-final-main"><div><span>${g==="colectores"?"📦 Ubicación":g==="fermentacion"?"🌱 Fermentador":"🧪 Última cosecha"}</span><b>${esc(primary)}</b></div><div><span>${g==="fermentacion"?"🕐 Última siembra":"🕐 Última cosecha"}</span><b>${esc(secondary)}</b></div></div>
        <div class="bd-final-foot"><span>${esc(tertiary)}</span><span>${viab!=null?"Viabilidad "+pc(viab):"Viabilidad —"}${cons!=null?" · Consistencia "+pc(cons):""}</span><strong>Ver ficha →</strong></div>
      </button>`;
    };

    const section=(g,arr)=>{
      if(!arr.length) return "";
      const shown=selected?arr.slice(0,24):arr.slice(0,40);
      return `<section class="bd-final-group" data-final-group="${g}">
        <div class="bd-final-group-head"><div><div class="bd-final-group-title"><span class="bd-final-group-icon">${g==="colectores"?"📦":g==="fermentacion"?"🌱":"📜"}</span>${groupLabel[g]} <em>${arr.length}</em></div><p>${groupDesc[g]}</p></div><span class="bd-final-order">${sort==="recent"?"Más reciente primero":"Orden seleccionado"}</span></div>
        <div class="bd-final-cards">${shown.map(x=>card(x,g)).join("")}</div>
        ${arr.length>shown.length&&!selected?`<div class="bd-final-more">Mostrando ${shown.length} de ${arr.length} · Usa la búsqueda o filtros para ver más.</div>`:""}
      </section>`;
    };

    // Vista tabular basada en una fila por cosecha, como en B.D LEVADURA.
    const tf=S.explorerTableFilters||(S.explorerTableFilters={marca:"",familia:"",gen:"",fv:"",col:""});
    const rawRows=M.registros().filter(r=>r&&!r.incompleto&&r.nombre);
    const uniq=k=>[...new Set(rawRows.map(r=>r[k]).filter(v=>v!=null&&String(v).trim()!=="").map(String))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
    const tableRows=rawRows.filter(r=>{
      if(q){const hay=[r.nombre,r.marca,r.familia,r.generacion,r.tq,r.lote,r.colectores?.map(c=>"C"+c.colector).join(" "),r.retiro,r.finRemocion].join(" ").toUpperCase().replace(/\s+/g,"");if(!hay.includes(q))return false;}
      const grp=groupOf({name:r.nombre}); if(requestedStatus!=="all"&&grp!==requestedStatus)return false;
      if(!q&&period){const d=r.finRemocion||r.retiro||r.t0;if(!d||parseDT(d)<Date.now()-period*DAY)return false;}
      if(tf.marca&&String(r.marca||"")!==tf.marca)return false;
      if(tf.familia&&String(r.familia||"")!==tf.familia)return false;
      if(tf.gen&&String(r.generacion??"")!==tf.gen)return false;
      if(tf.fv&&String(r.tq??"")!==tf.fv)return false;
      if(tf.col&&!(r.colectores||[]).some(c=>String(c.colector)===tf.col))return false;
      return true;
    }).sort((a,b)=>{
      if(sort==="az")return String(a.nombre).localeCompare(String(b.nombre),"es");
      if(sort==="gen")return (num(b.generacion)||0)-(num(a.generacion)||0)||String(a.nombre).localeCompare(String(b.nombre));
      if(sort==="state"){const rank=x=>({"FUERA DE TIEMPO":0,"CERCA DEL LÍMITE":1,"EN FERMENTACIÓN":2,"DISPONIBLE":3,"HISTÓRICA":4})[explorerState(x.nombre,explorerCurrent(x.nombre)).txt]??5;const diff=rank(a)-rank(b);if(diff)return diff;}
      const da=a.finRemocion||a.retiro||a.t0||"", db=b.finRemocion||b.retiro||b.t0||"";
      return sort==="recent"?String(db).localeCompare(String(da)):String(a.nombre).localeCompare(String(b.nombre));
    });
    const tableOptions=(label,items,value,key)=>`<label>${label}<select data-explorer-table-filter="${key}"><option value="">Todas</option>${items.map(v=>`<option value="${esc(v)}" ${String(value)===String(v)?"selected":""}>${esc(v)}</option>`).join("")}</select></label>`;
    const colOptions=[...new Set(rawRows.flatMap(r=>(r.colectores||[]).map(c=>String(c.colector))))].sort((a,b)=>+a-+b);
    const selectedRaw=rawRows.find(r=>String(r.id)===String(S.tableSelectedId))||null;
    const activeDetailTab=S.tableDetailTab||"harvest";
    const tableHtml=`<section class="bd-record-browser"><div class="bd-record-toolbar"><div><b>Base de datos · una fila por cosecha</b><span>${tableRows.length} registros encontrados · ordenados según los controles superiores</span></div><div class="bd-record-filters">${tableOptions("Marca",uniq("marca"),tf.marca,"marca")}${tableOptions("Familia",uniq("familia"),tf.familia,"familia")}${tableOptions("Generación",uniq("generacion"),tf.gen,"gen")}${tableOptions("FV origen",uniq("tq"),tf.fv,"fv")}${tableOptions("Colector",colOptions,tf.col,"col")}${tf.marca||tf.familia||tf.gen||tf.fv||tf.col?'<button class="btn sm ghost" type="button" id="bdExplorerClearTableFilters">Limpiar filtros</button>':""}</div></div><div class="bd-record-scroll"><table class="bd-record-table"><thead><tr class="bd-table-groups"><th colspan="6">Identificación y origen</th><th colspan="3">Cosecha y destino</th><th colspan="3">Calidad</th><th colspan="2">Seguimiento</th></tr><tr><th>Levadura</th><th>Marca</th><th>Familia</th><th>Gen.</th><th>FV cosecha</th><th>Consecutivo</th><th>Fecha cosecha</th><th>Colector · Hl</th><th>Ubicación actual</th><th class="n">Viabilidad</th><th class="n">Consistencia</th><th class="n">pH</th><th>Estado</th><th></th></tr></thead><tbody>${tableRows.slice(0,S.explorerRows||60).map(r=>{const cur=explorerCurrent(r.nombre),st=explorerState(r.nombre,cur),loc=cur.cols.length?cur.cols.map(z=>POS(z.id)).join(" · "):cur.tanks.some(t=>!(t.retiro||{}).fecha)?cur.tanks.map(t=>"FV "+t.tq).join(" · "):"—",harvestCols=(r.colectores||[]).filter(c=>!c.vacio),dest=harvestCols.length?harvestCols.map(c=>"C"+c.colector+(c.posicion?"-P"+c.posicion:"")).join("/"):"—",harvestVol=harvestCols.reduce((a,c)=>a+(num(c.vol)||0),0),viab=cur.cols[0]?.c.viab??r.viab,cons=cur.cols[0]?.c.cons??r.cons;return `<tr class="${String(S.tableSelectedId)===String(r.id)?"row-selected":""}"><td><b>${esc(r.nombre)}</b></td><td>${esc(r.marca||"—")}</td><td>${esc(r.familia||"—")}</td><td>${r.generacion!=null?"Gen "+esc(r.generacion):"—"}</td><td>${r.tq!=null?"FV "+esc(r.tq):"—"}</td><td>${esc(r.lote||"—")}</td><td>${explorerFmtDate(r.finRemocion||r.retiro||r.t0)}</td><td>${esc(dest)}${harvestVol?" · "+f(harvestVol,0)+" Hl":""}</td><td>${esc(loc)}</td><td class="n">${viab!=null?pc(viab):"—"}</td><td class="n">${cons!=null?pc(cons):"—"}</td><td class="n">${r.ph!=null?f(r.ph,2):"—"}</td><td><span class="bd-yeast-state ${st.cl}">${esc(st.txt)}</span></td><td><button class="bd-table-open" type="button" data-table-select="${esc(r.id)}">Ver registro</button></td></tr>`;}).join("")||`<tr><td colspan="14" class="muted" style="text-align:center;padding:28px">No hay registros con estos filtros.</td></tr>`}</tbody></table></div>${tableRows.length>(S.explorerRows||60)?`<div class="bd-record-more"><span>Mostrando ${Math.min(S.explorerRows||60,tableRows.length)} de ${tableRows.length}</span><button class="btn sm" type="button" id="bdExplorerMoreRows">Mostrar más</button></div>`:""}</section>${selectedRaw?(()=>{const d=selectedRaw, vals={harvest:[["Hora 0 remoción",explorerFmtDate(d.t0)],["Inicio de remoción",explorerFmtDate(d.retiro)],["Fin de remoción",explorerFmtDate(d.finRemocion)],["Volumen de cabeza",d.volCabeza!=null?f(d.volCabeza,0)+" Hl":"—"],["Máx. resiembra COPEC",explorerFmtDate(d.maxCopec)],["Máx. resiembra ABI",explorerFmtDate(d.maxAbi)]],quality:[["Viabilidad",d.viab!=null?pc(d.viab):"—"],["Consistencia",d.cons!=null?pc(d.cons):"—"],["pH",d.ph!=null?f(d.ph,2):"—"],["Temperatura",d.temp!=null?f(d.temp,1)+" °C":"—"],["Etanol",d.etanol??"—"],["Sensorial",d.sensorial||"—"]],sowings:(d.siembras||[]).length?d.siembras.slice(0,6).map((z,i)=>["Resiembra "+(i+1),"FV "+(z.tq||"—")+" · "+(z.lote||"—")+" · "+explorerFmtDate(z.fecha)]):[["Resiembras","No hay resiembras registradas"],["Consecutivo",d.lote||"—"]]};const titles={harvest:"Cosecha",quality:"Calidad",sowings:"Resiembras"};return `<section class="bd-row-detail"><div class="bd-row-detail-head"><div><div class="bd-eyebrow">Registro seleccionado · Fila de origen ${esc(d.excel?.fila||"—")}</div><h3>${esc(d.nombre)} <span class="muted">· FV ${esc(d.tq||"—")} / ${esc(d.lote||"—")}</span></h3></div><button class="btn sm" type="button" data-table-full-record="${esc(d.nombre)}">Abrir expediente completo ↗</button></div><div class="bd-row-tabs" role="tablist" aria-label="Datos del registro">${Object.entries(titles).map(([k,v])=>`<button type="button" class="${activeDetailTab===k?"active":""}" data-table-detail-tab="${k}" role="tab" aria-selected="${activeDetailTab===k}">${v}</button>`).join("")}</div><div class="bd-row-detail-grid">${(vals[activeDetailTab]||vals.harvest).map(([lab,val])=>`<div><span>${lab}</span><b>${esc(val)}</b></div>`).join("")}</div></section>`;})():`<div class="bd-row-detail-empty">Selecciona una fila para ver sus datos de cosecha, calidad y resiembras.</div>`}`;

    let detailHtml="";
    if(selected){
      const info=currentInfo(selected), st=stateOf(selected), last=dateFor(selected,selectedGroup), rec=info.rec;
      const gen=selected.gens.size?Math.max(...selected.gens):null;
      detailHtml=`<section class="bd-final-detail">
        <div class="bd-final-detail-top"><button class="btn sm ghost" type="button" id="bdDetailBack">← Volver al explorador</button><div class="bd-breadcrumb">Levaduras <span>›</span> ${groupLabel[selectedGroup]} <span>›</span> <b>${esc(selected.name)}</b></div></div>
        ${explorerDetail(selected)}
      </section>`;
    }

    const searchSummary=S.explorerMode==="table"?`${tableRows.length} registros de cosecha${q?` · búsqueda “${esc(S.q)}”`:""}`:q?`Resultados para “${esc(S.q)}” · ${base.length} coincidencias`:`${base.length} levaduras en esta vista · ${periodLabel}`;
    const dashboard=`<section class="bd-final-dashboard"><div class="bd-final-dashboard-copy"><div class="bd-eyebrow">Centro de consulta</div><h1>Explorador de levaduras</h1><p>Consulta por tarjetas o revisa la base en una tabla de registros. La ficha añade estado actual, ubicación y trazabilidad a cada registro.</p></div><div class="bd-final-search"><label>${C.icon("search")}<input id="bdExplorerQ" type="search" autocomplete="off" placeholder="Buscar levadura, FV, consecutivo o colector..." value="${esc(S.q)}"></label><div class="bd-search-hint"><button type="button" data-search-chip="EK7F2">EK7F2</button><button type="button" data-search-chip="F471">F471</button><button type="button" data-search-chip="FV 14">FV 14</button><button type="button" data-search-chip="C3-P1">C3-P1</button></div></div></section>`;
    const overview=`<section class="bd-final-overview"><button type="button" class="bd-final-stat ${requestedStatus==="colectores"?"active":""}" data-final-filter="colectores"><span>📦</span><div><b>${totalCounts.colectores}</b><small>En colectores</small></div><i>Levadura disponible</i></button><button type="button" class="bd-final-stat ${requestedStatus==="fermentacion"?"active":""}" data-final-filter="fermentacion"><span>🌱</span><div><b>${totalCounts.fermentacion}</b><small>En fermentación</small></div><i>Actualmente sembrada</i></button><button type="button" class="bd-final-stat ${requestedStatus==="historicas"?"active":""}" data-final-filter="historicas"><span>📜</span><div><b>${totalCounts.historicas}</b><small>Históricas</small></div><i>Archivo de trazabilidad</i></button><button type="button" class="bd-final-stat ${requestedStatus==="all"?"active":""}" data-final-filter="all"><span>🧬</span><div><b>${all.length}</b><small>Total</small></div><i>Todos los registros</i></button></section>`;
    const controls=`<section class="bd-final-controls"><div><b>${searchSummary}</b><span>${S.explorerMode==="table"?"Filtra por marca, familia o generación; busca también por FV y consecutivo.":q?"La búsqueda consulta todo el historial.":"Selecciona un estado para trabajar con una vista limpia."}</span></div><div class="bd-final-selects"><div class="bd-view-switch" role="group" aria-label="Forma de ver el inventario"><button type="button" data-explorer-mode="cards" class="${S.explorerMode!=="table"?"active":""}">Tarjetas</button><button type="button" data-explorer-mode="table" class="${S.explorerMode==="table"?"active":""}">Tabla de registros</button></div><label>Ordenar<select id="bdExplorerSort"><option value="recent" ${sort==="recent"?"selected":""}>Más reciente</option><option value="state" ${sort==="state"?"selected":""}>Estado</option><option value="gen" ${sort==="gen"?"selected":""}>Generación</option><option value="az" ${sort==="az"?"selected":""}>A → Z</option></select></label><label>Periodo<select id="bdExplorerPeriod"><option value="0" ${period===0?"selected":""}>Todo</option><option value="7" ${period===7?"selected":""}>7 días</option><option value="30" ${period===30?"selected":""}>30 días</option><option value="90" ${period===90?"selected":""}>90 días</option></select></label></div></section>`;
    const body=selected?detailHtml:S.explorerMode==="table"?tableHtml:(base.length?`<div class="bd-final-groups">${requestedStatus==="all"?(section("colectores",groups.colectores)+section("fermentacion",groups.fermentacion)+section("historicas",groups.historicas)):section(requestedStatus,groups[requestedStatus])}</div>`:`<div class="bd-empty-search"><b>No encontré una levadura con esos criterios.</b><br>Prueba con el nombre, FV, consecutivo, colector o cambia el periodo a “Todo”.</div>`);
    return `<div class="bd-explorer bd-final-explorer">${dashboard}${overview}${controls}${body}${!selected?`<section class="bd-final-how"><div><span>1</span><b>Busca</b><small>Por levadura, FV, consecutivo o colector.</small></div><div><span>2</span><b>Selecciona</b><small>Abre un registro para consultar su expediente.</small></div><div><span>3</span><b>Entiende</b><small>Estado, origen y análisis primero.</small></div><div><span>4</span><b>Explora</b><small>Recorre la trazabilidad y abre cada registro.</small></div></section>`:""}</div>`;
  }

  App.V.bd={
    render(){
      const regs=M.registros(), mv=M.movimientos(regs);
      return `<div class="page-h"><div><h1>Levaduras</h1><p>Consulta la base en tarjetas o por filas, con estado actual y trazabilidad.</p></div><div class="acts"><button class="btn" type="button" id="bdImp">${C.icon("download").replace("<svg",'<svg style="transform:rotate(180deg)"')}Importar Excel</button><button class="btn" type="button" id="bdExp">${C.icon("download")}Exportar Excel</button>${App.Store.canWrite?`<button class="btn pri" type="button" id="bdNew">${C.icon("plus")}Nuevo registro</button>`:""}</div></div>${vExplorer()}`;
    },
    mount(){
      const v=document.getElementById("view"); if(!v) return;
      const deb=(fn)=>{ let t; return e=>{ clearTimeout(t); const el=e.target; t=setTimeout(()=>{ fn(el.value); App.render(true); const n=document.getElementById(el.id); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },180); }; };
      const q=document.getElementById("bdExplorerQ"); if(q) q.oninput=deb(x=>{ S.q=x; S.selected=""; S.tableSelectedId=""; });
      const detailBack=document.getElementById("bdDetailBack"); if(detailBack) detailBack.onclick=()=>{ S.selected=""; App.render(true); window.scrollTo({top:0,behavior:"smooth"}); };
      const period=document.getElementById("bdExplorerPeriod"); if(period) period.onchange=e=>{ S.explorerPeriod=+e.target.value; S.selected=""; S.tableSelectedId=""; App.render(true); };
      const sort=document.getElementById("bdExplorerSort"); if(sort) sort.onchange=e=>{ S.explorerSort=e.target.value; App.render(true); };
      v.querySelectorAll("[data-explorer-mode]").forEach(b=>b.onclick=()=>{ S.explorerMode=b.dataset.explorerMode; S.selected=""; App.render(true); });
      v.querySelectorAll("[data-explorer-table-filter]").forEach(x=>x.onchange=()=>{ S.explorerTableFilters=S.explorerTableFilters||{marca:"",familia:"",gen:"",fv:"",col:""}; S.explorerTableFilters[x.dataset.explorerTableFilter]=x.value; S.explorerRows=60; S.tableSelectedId=""; App.render(true); });
      const clearTF=document.getElementById("bdExplorerClearTableFilters"); if(clearTF) clearTF.onclick=()=>{ S.explorerTableFilters={marca:"",familia:"",gen:"",fv:"",col:""}; S.explorerRows=60; S.tableSelectedId=""; App.render(true); };
      const moreRows=document.getElementById("bdExplorerMoreRows"); if(moreRows) moreRows.onclick=()=>{ S.explorerRows=(S.explorerRows||60)+60; App.render(true); };
      v.querySelectorAll("[data-exp-target]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.expTarget)?.scrollIntoView({behavior:"smooth",block:"start"}));
      v.querySelectorAll("[data-table-select]").forEach(b=>b.onclick=()=>{ S.tableSelectedId=b.dataset.tableSelect; App.render(true); requestAnimationFrame(()=>document.querySelector(".bd-row-detail")?.scrollIntoView({behavior:"smooth",block:"center"})); });
      v.querySelectorAll("[data-table-detail-tab]").forEach(b=>b.onclick=()=>{ S.tableDetailTab=b.dataset.tableDetailTab; App.render(true); });
      v.querySelectorAll("[data-table-full-record]").forEach(b=>b.onclick=()=>{ S.selected=b.dataset.tableFullRecord; S.tableSelectedId=""; App.render(true); window.scrollTo({top:0,behavior:"smooth"}); });
      v.querySelectorAll("[data-final-filter]").forEach(b=>b.onclick=()=>{ S.explorerStatus=b.dataset.finalFilter; S.selected=""; S.tableSelectedId=""; App.render(true); window.scrollTo({top:0,behavior:"smooth"}); });
      v.querySelectorAll("[data-search-chip]").forEach(b=>b.onclick=()=>{ S.q=b.dataset.searchChip; S.selected=""; S.tableSelectedId=""; App.render(true); });
      v.querySelectorAll("[data-explorer-select]").forEach(b=>b.onclick=()=>{ S.selected=b.dataset.explorerSelect; App.render(true); requestAnimationFrame(()=>{ const d=document.querySelector(".bd-final-detail"); if(window.matchMedia("(max-width:1100px)").matches && d) d.scrollIntoView({behavior:"smooth",block:"start"}); }); });
      v.querySelectorAll("[data-trace-kind]").forEach(b=>b.onclick=e=>{
        e.preventDefault(); e.stopPropagation();
        const kind=b.dataset.traceKind||"", value=b.dataset.traceValue||"", go=b.dataset.traceGo||"";
        if(kind==="yeast"){
          S.q=value; S.selected=value; App.render(true);
          requestAnimationFrame(()=>document.querySelector(".bd-v3-detail")?.scrollIntoView({behavior:"smooth",block:"start"}));
          return;
        }
        if(go){ App.go(go); return; }
      });
      v.querySelectorAll("[data-explorer-go]").forEach(b=>b.onclick=()=>App.go(b.dataset.explorerGo));
      const ex=document.getElementById("bdExp"); if(ex) ex.onclick=exportarDialogo;
      const im=document.getElementById("bdImp"); if(im) im.onclick=importarDialogo;
      const nw=document.getElementById("bdNew"); if(nw) nw.onclick=()=>formRegistro();
      const searchKey=e=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); document.getElementById("bdExplorerQ")?.focus(); } };
      if(window.__bdExplorerKey) window.removeEventListener("keydown",window.__bdExplorerKey); window.__bdExplorerKey=searchKey; window.addEventListener("keydown",searchKey);
    }
  };

  function accion(acc){ const [a,b,c]=acc.split(":"); if(a==="rec") ficha(b); else if(a==="col") App.go("colectores/"+b); else if(a==="fil"){ S.tab="registros"; S.fil=Object.assign({},FIL0); S.q=""; S.fil[b]=c; App.render(true); window.scrollTo({top:0}); } }
  App.BD={abrir:(id)=>ficha(id),filtrar:(k,v)=>{ App.go("bd"); accion("fil:"+k+":"+v); },S};

  /* ---------- Ficha de un registro ---------- */
  function ficha(id){ const b=App.S.bdlev[id]; if(!b) return; const r=Object.assign({id,st:M.estado(b,id),d:M.derivar(b)},b), q=M.calidad(b), o=revisar(r), mv=M.movimientos([r]).sort((x,y)=>String(x.t||"").localeCompare(String(y.t||""))), vivos=Object.entries(App.S.colectores).filter(([,c])=>c.levId===id);
    const fact=(k,v,bad)=>`<div class="yd-fact ${bad?"bd-badf":""}"><div class="k">${k}</div><div class="v">${v==null||v===""?"—":v}</div></div>`, qk=k=>q.some(x=>x.k===k);
    let saldo=0; const led=mv.map(m=>{ if(!m.info&&m.hl!=null) saldo+=m.tipo==="entrada"?m.hl:-m.hl; return `<tr><td>${m.t?fmt(m.t):'<span class="muted">Sin fecha</span>'}</td><td>${tTag(m.tipo)}</td><td>${esc(m.det)}</td><td class="n">${m.hl!=null?(m.tipo==="entrada"?"+":"−")+f(m.hl,0):"—"}</td><td class="n">${m.info?'<span class="muted">—</span>':f(Math.max(0,saldo),0)}</td></tr>`; }).join("");
    const body=`<div class="yeast-detail"><section class="yd-hero"><div class="yd-kicker">${r.origen==="excel"?`Excel B.D LEVADURA · fila ${esc((r.excel||{}).fila||"—")}`:"Registrado en la plataforma"}</div>
      <div class="yd-title"><h2>${esc(r.nombre||"Registro incompleto")}</h2>${r.generacion!=null?`<span class="yd-gen">GENERACIÓN ${esc(r.generacion)}</span>`:""}</div>
      <div class="yd-sub">${esc(r.marca||"—")} · familia ${esc(r.familia||"—")} · origen FV ${esc(r.tq||"—")} · ${esc(r.lote||"—")}</div>
      <div class="yd-metrics"><div class="yd-metric"><div class="k">Estado</div><div class="v">${tag(r.st)}</div></div><div class="yd-metric"><div class="k">Entró</div><div class="v">${f(r.d.volEntrada,0)} Hl</div></div><div class="yd-metric"><div class="k">En colector ahora</div><div class="v">${vivos.length?f(vivos.reduce((s,[,c])=>s+(num(c.vol)||0),0),0)+" Hl":"0 Hl"}</div></div><div class="yd-metric"><div class="k">Resiembras</div><div class="v">${(r.siembras||[]).length}</div></div></div></section>
      ${r.estadoRegistro==="anulado"?`<div class="callout err">Registro anulado el ${fmt((r.anulado||{}).t)}: ${esc((r.anulado||{}).motivo||"")}. No cuenta en inventario ni en movimientos.</div>`:""}
      ${o.length?`<div class="callout warn"><b>Datos para revisar:</b> ${o.map(esc).join(". ")}.</div>`:""}
      <section class="yd-section"><div class="yd-section-h"><h4>Cosecha</h4><span>Columnas G a L, AB y AC del Excel</span></div><div class="yd-facts">
        ${fact("Hora 0 remoción",fmt(r.t0))}${fact("Inicio remoción",fmt(r.retiro))}${fact("Fin remoción",fmt(r.finRemocion),o.some(x=>/anterior/.test(x)))}
        ${fact("Tiempo de remoción",r.d.tiempoRemocion!=null?f(r.d.tiempoRemocion,1)+" h":null)}${fact("Vol. cabeza",r.volCabeza!=null?f(r.volCabeza,0)+" Hl":null)}${fact("% retiro previo",r.d.pctRetiro!=null?pc(r.d.pctRetiro):null)}
        ${fact("Máx. resiembra COPEC",fmt(r.d.maxCopec))}${fact("Máx. resiembra ABI",fmt(r.d.maxAbi))}${fact("Destino",r.destino==="DES"?"Descarte"+(r.destinoDescarte?" · "+esc(r.destinoDescarte):""):"Colector")}</div></section>
      <section class="yd-section"><div class="yd-section-h"><h4>Calidad</h4><span>${q.length?q.length+" fuera de límite":"Dentro de límites"}</span></div><div class="yd-facts">
        ${fact("Viabilidad",r.viab!=null?pc(r.viab):null,qk("viab"))}${fact("Consistencia",r.cons!=null?pc(r.cons):null,qk("cons"))}${fact("pH",r.ph!=null?f(r.ph,2):null,qk("ph"))}
        ${fact("Temp. cosecha",r.temp!=null?f(r.temp,1)+" °C":null,qk("temp"))}${fact("Etanol",r.etanol!=null?esc(r.etanol):null)}${fact("Conteo",r.conteo!=null?esc(r.conteo)+" Mcel/ml":null)}
        ${fact("Sensorial",esc(r.sensorial||""))}${fact("Responsable",esc(r.respSensorial||r.responsable||""))}${fact("Levadura sembrada",esc(r.levSembrada||""))}</div></section>
      <section class="yd-section"><div class="yd-section-h"><h4>Colectores y resiembras</h4><span>Columnas M a R y AD a AT</span></div><div class="yd-tables">
        <div><div class="yd-table-title">Colectores</div>${(r.colectores||[]).length||(r.descarteDirecto||[]).length?`<div class="yd-table-wrap"><table><thead><tr><th>Colector</th><th class="n">Hl</th><th>Estado</th></tr></thead><tbody>${(r.colectores||[]).map(c=>`<tr><td>C${esc(c.colector)}</td><td class="n">${c.vol!=null?f(c.vol,0):"—"}</td><td>${c.vacio?`Vacío${c.fechaVaciado?" · "+fmtS(c.fechaVaciado):""}`:"<b>Con levadura</b>"}</td></tr>`).join("")}${(r.descarteDirecto||[]).map(x=>`<tr><td>${esc(x.destino)}</td><td class="n">${x.vol!=null?f(x.vol,0):"—"}</td><td>Descarte</td></tr>`).join("")}</tbody></table></div>`:`<div class="yd-empty">Sin colectores.</div>`}</div>
        <div><div class="yd-table-title">Resiembras</div>${r.d.siembras.length?`<div class="yd-table-wrap"><table><thead><tr><th>FV</th><th>Lote</th><th>Fecha</th><th class="n">T° col.</th><th class="n">T° siem.</th><th class="n">h en colector</th><th class="n">h desde hora 0</th></tr></thead><tbody>${r.d.siembras.map(s=>`<tr><td>FV ${esc(s.tq)}</td><td>${esc(s.lote||"—")}</td><td>${fmtS(s.fecha)}</td><td class="n ${M.fuera("tempColector",num(s.tempColector))?"bd-bad":""}">${s.tempColector!=null?f(s.tempColector,1):"—"}</td><td class="n">${s.tempSiembra!=null?f(s.tempSiembra,1):"—"}</td><td class="n ${M.fuera("horasColector",s.horasColector)?"bd-bad":""}">${s.horasColector!=null?f(s.horasColector,0):"—"}</td><td class="n">${s.horasDesdeHora0!=null?f(s.horasDesdeHora0,0):"—"}</td></tr>`).join("")}</tbody></table></div>`:`<div class="yd-empty">Sin resiembras registradas.</div>`}</div></div></section>
      <section class="yd-section"><div class="yd-section-h"><h4>Movimientos y saldo</h4><span>Entradas menos salidas</span></div>${led?`<div class="yd-table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th class="n">Hl</th><th class="n">Saldo</th></tr></thead><tbody>${led}</tbody></table></div>`:`<div class="yd-empty">Sin movimientos.</div>`}</section>
      ${(r.cambios||[]).length?`<section class="yd-section"><div class="yd-section-h"><h4>Historial de cambios</h4><span>${r.cambios.length}</span></div><ul class="bd-feed">${r.cambios.slice().reverse().map(c=>`<li><span class="small muted">${fmtS(c.t)}</span><span>${esc(c.txt)}</span></li>`).join("")}</ul></section>`:""}</div>`;
    const W=App.Store.canWrite, acts=`${W&&vivos.length?`<button class="btn" type="button" data-fa="salida">Registrar salida</button>`:""}${W&&!r.incompleto?`<button class="btn" type="button" data-fa="editar">${C.icon("edit")}Editar</button>`:""}${W?(r.estadoRegistro==="anulado"?`<button class="btn" type="button" data-fa="reactivar">Reactivar</button>`:`<button class="btn" type="button" data-fa="anular">Anular</button>`):""}${W&&r.origen!=="excel"?`<button class="btn dan" type="button" data-fa="eliminar">${C.icon("trash")}Eliminar</button>`:""}${r.nombre?`<button class="btn" type="button" data-fa="traza">Ver trazabilidad</button>`:""}`;
    const d=App.UI.info("Registro · "+(r.nombre||"incompleto"),body,{wide:true,actions:acts});
    d.addEventListener("click",async e=>{ const x=e.target.closest("[data-fa]"); if(!x) return; const a=x.dataset.fa; d.close();
      if(a==="salida") salida(vivos[0][0]); if(a==="editar") formRegistro(id); if(a==="anular") anular(id,true); if(a==="reactivar") anular(id,false); if(a==="eliminar") eliminar(id); if(a==="traza") App.V.historial.buscar(r.nombre); }); }

  /* ---------- Formularios ---------- */
  const MARCAS_BD=new Proxy([],{get:(t,k)=>{const a=App.MARCAS.filter(m=>m!=="PILSEN");return typeof a[k]==="function"?a[k].bind(a):a[k];}});
  function formRegistro(id){ if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    const b=id?clone(App.S.bdlev[id]):{}, c1=(b.colectores||[])[0]||{}, c2=(b.colectores||[])[1]||{}, dd=(b.descarteDirecto||[])[0]||{};
    const colOpts=v=>`<option value=""></option>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${String(v)===String(n)?"selected":""}>Colector ${n}</option>`).join("")}${["Buffer","UTK 19","UTK 20"].map(n=>`<option value="${n}" ${v===n?"selected":""}>${n} (descarte)</option>`).join("")}`;
    const vin=(n,v,extra="")=>`<input name="${n}" value="${esc(v??"")}" ${extra}>`;
    const body=`<fieldset><legend>Identificación</legend><div class="fg">
      <label class="f req"><span>Levadura</span>${vin("nombre",b.nombre,'style="text-transform:uppercase" placeholder="Ej.: EK7F2" required')}<small class="muted" id="fnHint">Marca, familia, generación y FV se completan desde el nombre (fórmulas del Excel).</small></label>
      <label class="f"><span>Marca</span><select name="marca"><option value=""></option>${MARCAS_BD.map(m=>`<option ${b.marca===m?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="f"><span>Familia</span>${vin("familia",b.familia,'maxlength="2" style="text-transform:uppercase"')}</label>
      <label class="f req"><span>Generación</span><input name="generacion" type="number" step="1" min="0" value="${esc(b.generacion??"")}"></label>
      <label class="f req"><span>UTQ fuente de cosecha (FV)</span><input name="tq" type="number" step="1" min="1" max="32" value="${esc(b.tq??"")}"></label>
      <label class="f req"><span>Consecutivo UTQ fuente</span>${vin("lote",b.lote,'style="text-transform:uppercase" placeholder="F123"')}</label></div></fieldset>
      <fieldset><legend>Cosecha</legend><div class="fg">
      <label class="f"><span>Hora 0 remoción</span><input name="t0" type="datetime-local" value="${esc(b.t0||"")}"></label>
      <label class="f req"><span>Inicio remoción</span><input name="retiro" type="datetime-local" value="${esc(b.retiro||"")}"></label>
      <label class="f req"><span>Fin remoción</span><input name="finRemocion" type="datetime-local" value="${esc(b.finRemocion||"")}"></label>
      <label class="f"><span>Vol. cabeza (Hl)</span><input name="volCabeza" type="number" step="any" min="0" value="${esc(b.volCabeza??"")}"></label>
      <label class="f"><span>Destino 1</span><select name="c1">${colOpts(c1.colector??dd.destino)}</select></label><label class="f"><span>Vol. destino 1 (Hl)</span><input name="v1" type="number" step="any" min="0" value="${esc(c1.vol??dd.vol??"")}"></label>
      <label class="f"><span>Destino 2</span><select name="c2">${colOpts(c2.colector)}</select></label><label class="f"><span>Vol. destino 2 (Hl)</span><input name="v2" type="number" step="any" min="0" value="${esc(c2.vol??"")}"></label>
      ${!id?`<label class="f" style="grid-column:1/-1"><span><input type="checkbox" name="alInv" checked style="width:auto;min-height:0;margin-right:6px">Ingresar al inventario actual (ocupa posiciones libres de los colectores elegidos)</span></label>`:""}</div></fieldset>
      <fieldset><legend>Calidad</legend><div class="fg">
      <label class="f req"><span>Viabilidad (%)</span><input name="viab" type="number" step="any" value="${b.viab!=null?Math.round(b.viab*1000)/10:""}"></label>
      <label class="f req"><span>Consistencia (%)</span><input name="cons" type="number" step="any" value="${b.cons!=null?Math.round(b.cons*1000)/10:""}"></label>
      <label class="f"><span>pH</span><input name="ph" type="number" step="any" value="${esc(b.ph??"")}"></label>
      <label class="f"><span>Temp. cosecha (°C)</span><input name="temp" type="number" step="any" value="${esc(b.temp??"")}"></label>
      <label class="f"><span>Concentración etanol</span><input name="etanol" type="number" step="any" value="${esc(b.etanol??"")}"></label>
      <label class="f"><span>Conteo (Mcel/ml)</span><input name="conteo" type="number" step="any" value="${esc(b.conteo??"")}"></label>
      <label class="f"><span>Sensorial</span><select name="sensorial"><option value=""></option>${["OK","No OK"].map(x=>`<option ${b.sensorial===x?"selected":""}>${x}</option>`).join("")}</select></label>
      <label class="f"><span>Responsable</span>${vin("respSensorial",b.respSensorial,'style="text-transform:uppercase" maxlength="6"')}</label>
      <label class="f" style="grid-column:1/-1"><span>Observaciones</span><input name="obs" value="${esc(b.obs||"")}"></label></div></fieldset><div id="fwarn" aria-live="polite"></div>`;
    App.UI.modal(id?"Editar registro · "+b.nombre:"Nuevo registro de cosecha",body,{wide:true,ok:id?"Guardar cambios":"Guardar registro",
      onOpen(fm){ const nm=fm.elements.nombre; const auto=()=>{ const p=M.parseNombre(nm.value); if(!p) return; if(!fm.elements.marca.value) fm.elements.marca.value=p.marca==="AGUILA"&&!MARCAS_BD.includes("AGUILA")?"":p.marca; if(!fm.elements.familia.value) fm.elements.familia.value=p.fam; if(!fm.elements.generacion.value) fm.elements.generacion.value=p.gen; if(!fm.elements.tq.value) fm.elements.tq.value=p.tq; };
        nm.addEventListener("change",auto); fm.addEventListener("input",()=>{ const r=leer(fm), w=advertencias(r,id); fm.querySelector("#fwarn").innerHTML=w.length?`<div class="warn"><b>Revisa:</b> ${w.map(esc).join(" ")}</div>`:""; }); },
      async onSubmit(fm,showErr){ const r=leer(fm), err=errores(r,id); if(err) return showErr(err),false;
        const nuevo=Object.assign({},b,r.rec); Object.keys(nuevo).forEach(k=>(nuevo[k]==null||nuevo[k]==="")&&delete nuevo[k]); if(!r.rec.colectores) delete nuevo.colectores; if(!r.rec.descarteDirecto) delete nuevo.descarteDirecto;
        if(id&&nuevo.colectores&&b.colectores) nuevo.colectores=nuevo.colectores.map((c,i)=>{ const o=b.colectores[i]; return o&&+o.colector===+c.colector?Object.assign({},o,{vol:c.vol}):c; });
        if(id){ const ch=App.U.diff(App.S.bdlev[id],nuevo).filter(x=>!["cambios"].includes(x.campo.split(".")[0]));
          if(!ch.length){ toast("No hay cambios para guardar."); return true; }
          if(!await App.Sec.pin("Editar el registro "+b.nombre)) return false;
          const txt=ch.slice(0,8).map(x=>`${x.campo}: ${typeof x.antes==="object"?JSON.stringify(x.antes):x.antes??"—"} → ${typeof x.despues==="object"?JSON.stringify(x.despues):x.despues??"—"}`).join("; ");
          nuevo.cambios=(b.cambios||[]).concat([{t:new Date().toISOString(),txt:"Editado: "+txt}]); nuevo.editado=new Date().toISOString();
          if(!await App.Store.set("bdlev",id,nuevo)) return false; await App.Sec.auditar("Registro de levadura editado ("+b.nombre+")",ch.length+" campos",txt);
          toast("Registro actualizado"); return true; }
        nuevo.origen="manual"; nuevo.estadoRegistro="activo"; nuevo.creado=new Date().toISOString(); nuevo.cambios=[{t:nuevo.creado,txt:"Registro creado en la plataforma"}];
        const nid="M-"+nuevo.lote+"-"+Date.now().toString(36);
        const slots=[]; if(fm.elements.alInv&&fm.elements.alInv.checked&&nuevo.colectores){ const used={}; for(const c of nuevo.colectores){ const sid=[1,2].map(s=>`c${c.colector}-${s}`).find(x=>!App.S.colectores[x]&&!used[x]); if(!sid) return showErr(`El colector ${c.colector} no tiene posiciones libres (máximo 2 levaduras).`),false; used[sid]=1; slots.push([sid,c]); c.posicion=sid.split("-")[1]; } }
        else if(nuevo.colectores) nuevo.colectores.forEach(c=>c.vacio=true);
        if(!await App.Sec.confirmar("¿Guardar el registro?",`Vas a registrar la cosecha de <b>${esc(nuevo.nombre)}</b> (Gen ${esc(nuevo.generacion)}) desde FV ${esc(nuevo.tq)} · ${esc(nuevo.lote)}.${slots.length?" Entra al inventario en "+slots.map(s=>POS(s[0])).join(" y ")+".":""}`,"Guardar")) return false;
        if(!await App.Store.set("bdlev",nid,nuevo)) return false;
        for(const [sid,c] of slots) await App.Store.set("colectores",sid,{levId:nid,nombre:nuevo.nombre,marca:nuevo.marca,generacion:nuevo.generacion,tq:nuevo.tq,lote:nuevo.lote,vol:c.vol,volInicial:c.vol,viab:nuevo.viab,cons:nuevo.cons,ph:nuevo.ph,sensorial:nuevo.sensorial,respSensorial:nuevo.respSensorial,retiro:nuevo.retiro,finRemocion:nuevo.finRemocion,maxAbi:M.derivar(nuevo).maxAbi,maxCopec:M.derivar(nuevo).maxCopec,t0:nuevo.t0,ingreso:nuevo.finRemocion});
        await App.Sec.evento("registroBD",{levId:nid,nombre:nuevo.nombre,detalle:"Nuevo registro manual"}); toast("Registro guardado"); return true; }});
  }
  function leer(fm){ const V=(n,t)=>App.UI.val(fm,n,t), up=x=>x?String(x).trim().toUpperCase():null;
    const rec={nombre:up(V("nombre")),marca:V("marca"),familia:up(V("familia")),generacion:V("generacion","n"),tq:V("tq")!=null?String(V("tq","n")):null,lote:up(V("lote")),t0:V("t0"),retiro:V("retiro"),finRemocion:V("finRemocion"),volCabeza:V("volCabeza","n"),
      viab:V("viab","pct"),cons:V("cons","pct"),ph:V("ph","n"),temp:V("temp","n"),etanol:V("etanol","n"),conteo:V("conteo","n"),sensorial:V("sensorial"),respSensorial:up(V("respSensorial")),obs:V("obs")};
    const cols=[], desc=[]; [[V("c1"),V("v1","n"),1],[V("c2"),V("v2","n"),2]].forEach(([c,v,o])=>{ if(!c) return; if(/^\d$/.test(c)) cols.push({colector:+c,posicion:String(o),vol:v,vacio:false}); else desc.push({orden:o,destino:c,vol:v}); });
    rec.colectores=cols.length?cols:null; rec.descarteDirecto=desc.length?desc:null; rec.destino=desc.length&&!cols.length?"DES":"COS"; rec.destinoDescarte=desc.length?desc[0].destino:null;
    if(rec.t0) rec.maxCopec=M.derivar(rec).maxCopec; if(rec.finRemocion) rec.maxAbi=M.derivar(rec).maxAbi;
    return {rec,vols:[V("v1","n"),V("v2","n")]}; }
  function errores({rec,vols},id){ if(!rec.nombre) return "Escribe el nombre de la levadura.";
    if(!/^[A-Z]{2}\d{1,2}F\d{1,3}$/.test(rec.nombre)) return "El nombre debe tener el formato del Excel: letra de marca + familia + generación + F + tanque (ej.: EK7F2).";
    if(rec.generacion==null||rec.generacion<0||!Number.isInteger(rec.generacion)) return "La generación debe ser un número entero positivo.";
    if(!rec.tq||+rec.tq<1||+rec.tq>32) return "El UTQ fuente debe estar entre FV 1 y FV 32.";
    if(!rec.lote||!/^F\d{1,4}$/.test(rec.lote)) return "El consecutivo debe tener el formato F seguido del número (ej.: F483).";
    if(!rec.retiro||!rec.finRemocion) return "Indica el inicio y el fin de la remoción.";
    if(parseDT(rec.finRemocion)<parseDT(rec.retiro)) return "El fin de remoción no puede ser anterior al inicio.";
    if(rec.t0&&parseDT(rec.retiro)<parseDT(rec.t0)) return "El inicio de remoción no puede ser anterior a la hora 0.";
    if(parseDT(rec.finRemocion)>Date.now()+HOUR) return "La fecha de fin de remoción está en el futuro.";
    if(vols.some(v=>v!=null&&v<0)||(rec.volCabeza!=null&&rec.volCabeza<0)) return "Los volúmenes no pueden ser negativos.";
    if(!rec.colectores&&!rec.descarteDirecto) return "Indica al menos un destino (colector o descarte) con su volumen.";
    if((rec.colectores||[]).some(c=>c.vol==null||c.vol<=0)) return "Cada colector necesita un volumen mayor que cero.";
    if(rec.viab==null||rec.viab<0||rec.viab>1) return "La viabilidad debe estar entre 0 y 100 %.";
    if(rec.cons==null||rec.cons<0||rec.cons>1) return "La consistencia debe estar entre 0 y 100 %.";
    if(rec.ph!=null&&(rec.ph<0||rec.ph>14)) return "El pH debe estar entre 0 y 14.";
    const dup=Object.entries(App.S.bdlev).find(([k,x])=>k!==id&&x.estadoRegistro!=="anulado"&&x.nombre===rec.nombre&&x.lote===rec.lote&&String(x.retiro||"").slice(0,4)===String(rec.retiro||"").slice(0,4));
    if(dup) return `Ya existe un registro de ${rec.nombre} con el consecutivo ${rec.lote}.`;
    return null; }
  function advertencias({rec},id){ const w=[], p=M.parseNombre(rec.nombre);
    if(p&&rec.generacion!=null&&p.gen!==rec.generacion) w.push(`El nombre indica Gen ${p.gen}.`); if(p&&rec.tq&&p.tq!==+rec.tq) w.push(`El nombre indica FV ${p.tq}.`);
    ["viab","cons","ph","temp","generacion"].forEach(k=>{ const r=M.fuera(k,rec[k]); if(r) w.push(`${M.LIM()[k].lab} ${r}.`); }); return w; }

  async function salida(posId,defaults){ defaults=defaults||{}; if(!App.Store.canWrite) return toast("Modo de solo lectura."); const c=App.S.colectores[posId]; if(!c) return;
    const v=await App.UI.form({title:"Registrar salida · "+POS(posId)+" · "+c.nombre,intro:`Disponible: <b>${hl(num(c.vol))}</b>. La salida se descuenta del colector y queda en los movimientos de la base de datos.`,
      fields:[{k:"tipo",l:"Tipo de salida",t:"sel",req:true,opts:[["siembra","Resiembra en un FV"],["descarte","Descarte"],["otro","Otra salida"]]},{k:"fecha",l:"Fecha y hora",t:"dt",req:true},{k:"hl",l:"Hl que salen",t:"n",req:true},
        {k:"tq",l:"FV destino (resiembra)",t:"n"},{k:"lote",l:"Consecutivo destino (resiembra)",t:"t",upper:true,ph:"F484"},{k:"tempColector",l:"Temp. colector (°C)",t:"n"},{k:"tempSiembra",l:"Temp. siembra (°C)",t:"n"},
        {k:"destino",l:"Destino del descarte",t:"sel",opts:["Buffer","UTK 19","UTK 20","Otro"]},{k:"obs",l:"Observación",t:"t"}],values:Object.assign({fecha:toIn(new Date()),hl:c.vol},defaults),ok:"Registrar salida",
      validate(o){ if(o.hl==null||o.hl<=0) return "Los Hl que salen deben ser mayores que cero."; if(c.vol!=null&&o.hl>c.vol+0.001) return `No puedes sacar más de lo disponible (${f(c.vol,0)} Hl).`;
        const d=parseDT(o.fecha); if(!d) return "Indica una fecha válida."; if(d>Date.now()+HOUR) return "La fecha está en el futuro."; if(c.ingreso&&d<parseDT(c.ingreso)) return "La fecha es anterior al ingreso al colector.";
        if(o.tipo==="siembra"&&(!o.tq||o.tq<1||o.tq>32)) return "Indica el FV destino (1 a 32)."; if(o.tipo==="siembra"&&o.lote&&!/^F\d{1,4}$/.test(o.lote)) return "El consecutivo debe ser F seguido del número.";
        if(o.tipo==="descarte"&&!o.destino) return "Indica a dónde se descarta."; return null; }});
    if(!v) return; const quedan=Math.round(((c.vol||0)-v.hl)*100)/100;
    if(!await App.Sec.confirmar("¿Registrar la salida?",`Salen <b>${f(v.hl,0)} Hl</b> de ${esc(c.nombre)} (${POS(posId)}) por ${v.tipo==="siembra"?"resiembra en FV "+esc(v.tq):v.tipo==="descarte"?"descarte en "+esc(v.destino):"otra salida"}. ${quedan<=0?"La posición queda <b>vacía</b> y disponible.":"Quedan "+f(quedan,0)+" Hl."}`,"Registrar")) return false;
    if(defaults.fromBot&&!await App.Sec.pin("Registrar salida desde Cifra en "+POS(posId))) return false;
    if(c.levId&&App.S.bdlev[c.levId]){ const b=clone(App.S.bdlev[c.levId]), n=+posId.replace(/^c(\d+).*/,"$1"), slot=posId.split("-")[1], cols=b.colectores||[];
      const idx=cols.findIndex(x=>+x.colector===n&&String(x.posicion)===slot&&!x.vacio), ix=idx>=0?idx:cols.findIndex(x=>+x.colector===n&&!x.vacio);
      if(v.tipo==="siembra") b.siembras=(b.siembras||[]).concat([{orden:ix>=0?ix+1:null,tq:String(v.tq),lote:v.lote,fecha:v.fecha,hl:v.hl,tempColector:v.tempColector,tempSiembra:v.tempSiembra,colector:posId,obs:v.obs}].map(x=>{ Object.keys(x).forEach(k=>x[k]==null&&delete x[k]); return x; }));
      else b.salidas=(b.salidas||[]).concat([{colector:posId,posicion:slot,fecha:v.fecha,hl:v.hl,motivo:v.tipo==="descarte"?"Descartada":"Otra salida",destino:v.destino||null,obs:v.obs||null}]);
      b.cambios=(b.cambios||[]).concat([{t:new Date().toISOString(),txt:`Salida de ${f(v.hl,0)} Hl desde ${POS(posId)} (${v.tipo})`}]);
      await App.Store.set("bdlev",c.levId,b); }
    const cc=clone(c); cc.vol=quedan;
    if(quedan<=0){ await App.Act.archivarPosicion(posId,cc,(v.tipo==="siembra"?"Sembrada en FV "+v.tq:v.tipo==="descarte"?"Descartada en "+v.destino:"Otra salida")+" (salida registrada en Base de datos)"); await App.Store.del("colectores",posId); }
    else await App.Store.set("colectores",posId,cc);
    await App.Sec.evento("salidaBD",{pos:posId,nombre:c.nombre,levId:c.levId||null,tipo:v.tipo,hl:v.hl,tq:v.tq||null,destino:v.destino||null});
    toast(quedan<=0?`${POS(posId)} queda vacía y disponible`:`Salida registrada · quedan ${f(quedan,0)} Hl`); return true; }

  App.BD.salida=salida;
  async function anular(id,anula){ const b=clone(App.S.bdlev[id]); if(!b) return;
    const v=await App.UI.form({title:(anula?"Anular":"Reactivar")+" registro · "+(b.nombre||id),intro:anula?"El registro no se borra: queda en la base de datos marcado como anulado y deja de contar en inventario y movimientos.":"El registro vuelve a contar en inventario y movimientos.",fields:[{k:"motivo",l:"Motivo",t:"t",req:true}],ok:anula?"Anular":"Reactivar"}); if(!v) return;
    if(!await App.Sec.pin((anula?"Anular":"Reactivar")+" el registro "+(b.nombre||""))) return;
    if(anula){ b.estadoRegistro="anulado"; b.anulado={t:new Date().toISOString(),motivo:v.motivo}; } else { b.estadoRegistro="activo"; delete b.anulado; }
    b.cambios=(b.cambios||[]).concat([{t:new Date().toISOString(),txt:(anula?"Anulado: ":"Reactivado: ")+v.motivo}]);
    if(await App.Store.set("bdlev",id,b)){ await App.Sec.auditar((anula?"Registro anulado":"Registro reactivado")+" ("+(b.nombre||id)+")",anula?"activo":"anulado",anula?"anulado":"activo",v.motivo); toast(anula?"Registro anulado":"Registro reactivado"); } }
  async function eliminar(id){ const b=App.S.bdlev[id]; if(!b) return; if(b.origen==="excel"){ toast("Los registros del Excel no se eliminan: puedes anularlos."); return; }
    if(Object.values(App.S.colectores).some(c=>c.levId===id)){ toast("Esta levadura sigue en un colector. Registra su salida antes de eliminarla."); return; }
    if(!await App.Sec.confirmar("¿Eliminar el registro?",`Vas a eliminar definitivamente <b>${esc(b.nombre)}</b> (${esc(b.lote||"")}). Esta acción no se puede deshacer. Si solo fue un error de uso, es mejor anularlo.`,"Eliminar")) return;
    if(!await App.Sec.pin("Eliminar el registro "+b.nombre)) return;
    await App.Sec.auditar("Registro de levadura eliminado ("+b.nombre+")",JSON.stringify({nombre:b.nombre,lote:b.lote,retiro:b.retiro}),"—");
    if(await App.Store.del("bdlev",id)) toast("Registro eliminado"); }

  /* ---------- Exportar a Excel ---------- */
  const COLS_REG=[["Levadura","s",r=>r.nombre],["Marca","s",r=>r.marca],["Familia","s",r=>r.familia],["UTQ fuente de cosecha","i",r=>num(r.tq)],["Generación","i",r=>num(r.generacion)],["Hora 0 remoción","d",r=>r.t0],["Inicio remoción","d",r=>r.retiro],["Fin remoción","d",r=>r.finRemocion],["Vol cabeza (Hl)","n",r=>num(r.volCabeza)],["% retiro previo cosecha","p",r=>r.d.pctRetiro],["Tiempo de remoción (h)","n",r=>r.d.tiempoRemocion],
    ["Colector 1 destino","s",r=>r.colectores&&r.colectores[0]?r.colectores[0].colector:((r.descarteDirecto||[]).find(x=>x.orden===1)||{}).destino],["Vol 1 (Hl)","n",r=>r.colectores&&r.colectores[0]?num(r.colectores[0].vol):num(((r.descarteDirecto||[]).find(x=>x.orden===1)||{}).vol)],["Vacío 1","s",r=>r.colectores&&r.colectores[0]?(r.colectores[0].vacio?"SI":"NO"):null],
    ["Colector 2 destino","s",r=>r.colectores&&r.colectores[1]?r.colectores[1].colector:((r.descarteDirecto||[]).find(x=>x.orden===2)||{}).destino],["Vol 2 (Hl)","n",r=>r.colectores&&r.colectores[1]?num(r.colectores[1].vol):num(((r.descarteDirecto||[]).find(x=>x.orden===2)||{}).vol)],["Vacío 2","s",r=>r.colectores&&r.colectores[1]?(r.colectores[1].vacio?"SI":"NO"):null],
    ["Consistencia","p",r=>num(r.cons)],["Conteo (Mcel/ml)","n",r=>num(r.conteo)],["Concentración etanol","n",r=>num(r.etanol)],["Viabilidad","p",r=>num(r.viab)],["pH","n",r=>num(r.ph)],["Temp cosecha (°C)","n",r=>num(r.temp)],["Sensorial","s",r=>r.sensorial],["Responsable","s",r=>r.respSensorial||r.responsable],["Consecutivo UTQ fuente","s",r=>r.lote],
    ["Fecha máxima resiembra COPEC","d",r=>r.d.maxCopec],["Fecha máxima resiembra ABI","d",r=>r.d.maxAbi],
    ...[1,2].flatMap(o=>[[`TQ resiembra ${o}`,"i",r=>num(((r.siembras||[])[o-1]||{}).tq)],[`Consecutivo resiembra ${o}`,"s",r=>((r.siembras||[])[o-1]||{}).lote],[`Fecha resiembra ${o}`,"d",r=>((r.siembras||[])[o-1]||{}).fecha],[`Temp colector resiembra ${o} (°C)`,"n",r=>num(((r.siembras||[])[o-1]||{}).tempColector)],[`Temp siembra resiembra ${o} (°C)`,"n",r=>num(((r.siembras||[])[o-1]||{}).tempSiembra)],[`Horas en colector resiembra ${o}`,"n",r=>(r.d.siembras[o-1]||{}).horasColector],[`Horas desde hora 0 resiembra ${o}`,"n",r=>(r.d.siembras[o-1]||{}).horasDesdeHora0]]),
    ["Resiembras adicionales","s",r=>(r.siembras||[]).slice(2).map(s=>"FV"+s.tq+" "+(s.lote||"")+" "+fmt(s.fecha)).join(" | ")],
    ["Levadura restante retirada para descarte (Hl)","n",r=>num(r.volDescarte)],["FV destino colector 1","i",r=>num(r.fvDestino1)],["FV destino colector 2","i",r=>num(r.fvDestino2)],
    ["Estado","s",r=>(M.ESTADOS[r.st]||[r.st])[0]],["Fuera de límites","s",r=>M.calidad(r).map(q=>q.lab).join(", ")],["Datos para revisar","s",r=>revisar(r).join(". ")],["Origen","s",r=>r.origen==="excel"?"Excel":"Plataforma"],["Fila Excel","i",r=>num((r.excel||{}).fila)],["Observaciones","s",r=>r.obs]];
  const hojaRegs=(nombre,regs)=>({nombre,cols:COLS_REG.map(([h,t])=>({h,t})),rows:regs.map(r=>COLS_REG.map(c=>c[2](r)))});
  const COLS_MV=[["Fecha","d",m=>m.t],["Tipo","s",m=>(TIPOS[m.tipo]||[m.tipo])[0]],["Levadura","s",m=>m.nombre],["Generación","i",m=>num(m.gen)],["Marca","s",m=>m.marca],["Colector","i",m=>num(m.col)],["FV origen","i",m=>num(m.fvOrigen)],["Lote origen","s",m=>m.loteOrigen],["FV destino","i",m=>num(m.fv)],["Lote destino","s",m=>m.lote],["Destino descarte","s",m=>m.destino],["Hl","n",m=>m.hl],["Cómo se obtuvo el Hl","s",m=>m.info?"Dato informativo (no descuenta)":m.hlTipo==="vaciado"?"Volumen del colector vaciado":m.hl!=null?"Registrado":"Sin dato"],["Detalle","s",m=>m.det]];
  const hojaMv=(nombre,l)=>({nombre,cols:COLS_MV.map(([h,t])=>({h,t})),rows:l.map(m=>COLS_MV.map(c=>c[2](m)))});
  function hojaInv(){ const now=Date.now(), cols=[["Posición","s"],["Levadura","s"],["Generación","i"],["Marca","s"],["FV origen","i"],["Lote origen","s"],["Vol actual (Hl)","n"],["Vol inicial (Hl)","n"],["Viabilidad","p"],["Consistencia","p"],["pH","n"],["Ingreso al colector","d"],["Horas en colector","n"],["Máx. resiembra ABI","d"],["Máx. resiembra COPEC","d"],["Estado","s"],["Fuera de límites","s"]];
    const rows=Object.entries(App.S.colectores).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([id,c])=>{ const tc=App.T.tiempoColector(c,now), b=c.levId&&App.S.bdlev[c.levId]; return [POS(id),c.nombre,num(c.generacion),c.marca,num(c.tq),c.lote,num(c.vol),num(c.volInicial),num(c.viab),num(c.cons),num(c.ph),c.ingreso,tc.lleva!=null?Math.round(tc.lleva/HOUR*10)/10:null,tc.mr?toIn(new Date(tc.mr)):null,c.maxCopec,App.T.estadoLevColector(c,now).txt,b?M.calidad(b).map(q=>q.lab).join(", "):""]; });
    return {nombre:"Inventario actual",cols:cols.map(([h,t])=>({h,t})),rows}; }
  function hojaLotes(regs){ const cols=[["Lote","s"],["Año","s"],["FV","i"],["Marca","s"],["Fecha","d"],["Sembrado con","s"],["Gen sembrada","s"],["Cosechado como","s"],["Gen cosechada","i"],["Estado cosecha","s"]];
    return {nombre:"Lotes",cols:cols.map(([h,t])=>({h,t})),rows:M.lotes(regs).map(x=>{ const co=x.cosecha[0]; return [x.lote,x.anio,num(x.fv),x.marca,x.fecha,x.sembrado.map(z=>z.r.nombre).join(", ")||(x.tanque&&(x.tanque.levadura||{}).nombre)||"",x.sembrado.map(z=>z.r.generacion).join(", "),co?co.nombre:"",co?num(co.generacion):null,co?(M.ESTADOS[co.st]||[co.st])[0]:(x.tanque&&!(x.tanque.retiro||{}).fecha?"En fermentación":"")]; })}; }
  function hojaResumen(regs,mv){ const now=Date.now(), cols=Object.values(App.S.colectores), porEst={}; regs.forEach(r=>porEst[r.st]=(porEst[r.st]||0)+1);
    const rows=[["Fecha del reporte",fmt(new Date())],["Inventario actual (Hl)",cols.reduce((s,c)=>s+(num(c.vol)||0),0)],["Posiciones ocupadas",cols.length],["Disponibles para sembrar",cols.filter(c=>App.T.estadoLevColector(c,now).txt==="Disponible").length],["Registros en la base de datos",regs.length],
      ...Object.keys(M.ESTADOS).filter(k=>porEst[k]).map(k=>["Registros · "+M.ESTADOS[k][0],porEst[k]]),["Entradas totales (Hl)",mv.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+(m.hl||0),0)],["Resiembras registradas",mv.filter(m=>m.tipo==="siembra").length],["Descartes registrados",mv.filter(m=>m.tipo==="descarte").length],["Necesita atención",atencion().map(x=>x.txt).join(" | ")||"Nada pendiente"]];
    return {nombre:"Resumen",titulo:"Inventario de levadura · Resumen",sub:"Generado por la plataforma el "+fmt(new Date()),cols:[{h:"Indicador",t:"b"},{h:"Valor",t:"n"}],rows,sinFiltro:true}; }
  async function descargar(nombre,bytes){ const blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    if(App.downloads){ try{ await App.downloads.save({filename:nombre,data:blob}); toast("Excel generado"); }catch(e){ if(e&&e.code==="declined") return; toast(e&&e.code==="rejected_extension"?"Este entorno no permite descargar archivos de Excel.":"No se pudo descargar el archivo."); } return; }
    try{ const u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); toast("Excel generado"); }catch(e){ toast("No se pudo descargar el archivo."); } }
  async function exportarDialogo(){ const regs=M.registros(), mv=M.movimientos(regs), filtr=filtrar(regs.filter(r=>!r.incompleto||S.fil.estado==="incompleto")), mvF=filtrarMv(mv);
    const hayFil=filtrosActivos()>0, hayMvF=!!(S.mv.tipo||S.mv.q||S.mv.col||S.mv.desde||S.mv.hasta);
    const OP=[["resumen","Resumen con indicadores",true],["inv","Inventario actual",true],["regs","Registros (estructura B.D LEVADURA)",true],["mv","Historial de movimientos",true],["ent","Entradas (cosechas)",false],["sal","Salidas (resiembras y descartes)",false],["lotes","Lotes",false],["filt",`Datos filtrados actualmente (${S.tab==="movimientos"?mvF.length+" movimientos":filtr.length+" registros"})`,S.tab==="movimientos"?hayMvF:hayFil]];
    const body=`<p class="muted" style="margin-top:0">Elige qué quieres exportar. Cada opción sale en su propia hoja, con encabezados fijos, filtros y fechas y porcentajes con formato.</p><div class="bd-exp">${OP.map(([k,l,on])=>`<label><input type="checkbox" name="${k}" ${on?"checked":""}> ${esc(l)}</label>`).join("")}</div><div class="row" style="gap:8px;margin-top:10px"><button type="button" class="btn sm" id="expAll">Reporte completo</button><button type="button" class="btn sm ghost" id="expNone">Ninguno</button></div>`;
    App.UI.modal("Exportar a Excel",body,{ok:"Generar Excel",onOpen(fm){ fm.querySelector("#expAll").onclick=()=>OP.forEach(([k])=>{ if(k!=="filt") fm.elements[k].checked=true; }); fm.querySelector("#expNone").onclick=()=>OP.forEach(([k])=>fm.elements[k].checked=false); },
      async onSubmit(fm,showErr){ const on=k=>fm.elements[k].checked, H=[];
        if(on("resumen")) H.push(hojaResumen(regs,mv)); if(on("inv")) H.push(hojaInv()); if(on("regs")) H.push(hojaRegs("Registros",regs.filter(r=>!r.incompleto)));
        if(on("mv")) H.push(hojaMv("Movimientos",mv)); if(on("ent")) H.push(hojaMv("Entradas",mv.filter(m=>m.tipo==="entrada"))); if(on("sal")) H.push(hojaMv("Salidas",mv.filter(m=>m.tipo!=="entrada")));
        if(on("lotes")) H.push(hojaLotes(regs)); if(on("filt")) H.push(S.tab==="movimientos"?hojaMv("Movimientos filtrados",mvF):hojaRegs("Registros filtrados",filtr));
        if(!H.length) return showErr("Elige al menos una opción."),false;
        const d=new Date(), p=n=>String(n).padStart(2,"0");
        await descargar(`levadura_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.xlsx`,M.libro(H)); return true; }}); }

  /* ---------- Importar desde Excel ---------- */
  const L2I=s=>{ let n=0; for(const ch of s) n=n*26+(ch.charCodeAt(0)-64); return n-1; };
  const normH=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  function valFecha(v){ if(v==null||v==="") return null; if(typeof v==="number") return v>20000&&v<80000?M.localDeSerial(v):undefined; const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(v).trim()); if(m){ const p=n=>String(n).padStart(2,"0"); return `${m[3]}-${p(m[2])}-${p(m[1])}T${p(m[4]||0)}:${p(m[5]||0)}`; } const d=parseDT(v); return d?toIn(d):undefined; }
  const valNum=v=>{ if(v==null||v===""||(typeof v==="string"&&!v.trim())) return null; if(typeof v==="number") return v; const n=num(String(v).trim()); return n==null?undefined:n; };
  const valTxt=v=>v==null?null:(String(v).trim()||null);
  // Formato 1: hoja original "B.D LEVADURA" (encabezado en fila 11, datos desde fila 12, columnas por letra)
  function filasExcelOriginal(F){ const hdr=F[10]||[]; if(normH(hdr[L2I("B")])!=="levadura"||!/utq fuente/.test(normH(hdr[L2I("E")]))) return null;
    const g=(r,c)=>r[L2I(c)], out=[]; for(let i=11;i<F.length;i++){ const r=F[i]; if(!r) continue; if(!r.some((x,j)=>j>=4&&x!=null&&x!==""&&x!==0)&&!g(r,"B")) continue; out.push({fila:i+1,get:c=>g(r,c)}); } return {formato:"Excel original (B.D LEVADURA)",filas:out}; }
  // Formato 2: hoja "Registros" exportada por esta plataforma
  function filasExport(F){ const hdr=(F[0]||[]).map(normH); const ix=h=>hdr.indexOf(normH(h)); if(ix("Levadura")!==0||ix("Consecutivo UTQ fuente")<0) return null;
    const MAP={B:"Levadura",C:"Marca",D:"Familia",E:"UTQ fuente de cosecha",F:"Generación",G:"Hora 0 remoción",H:"Inicio remoción",I:"Fin remoción",J:"Vol cabeza (Hl)",M:"Colector 1 destino",N:"Vol 1 (Hl)",O:"Vacío 1",P:"Colector 2 destino",Q:"Vol 2 (Hl)",R:"Vacío 2",S:"Consistencia",T:"Conteo (Mcel/ml)",U:"Concentración etanol",V:"Viabilidad",W:"pH",X:"Temp cosecha (°C)",Y:"Sensorial",Z:"Responsable",AA:"Consecutivo UTQ fuente",AD:"TQ resiembra 1",AE:"Consecutivo resiembra 1",AF:"Fecha resiembra 1",AG:"Temp colector resiembra 1 (°C)",AH:"Temp siembra resiembra 1 (°C)",AJ:"TQ resiembra 2",AK:"Consecutivo resiembra 2",AL:"Fecha resiembra 2",AM:"Temp colector resiembra 2 (°C)",AN:"Temp siembra resiembra 2 (°C)",AP:"Levadura restante retirada para descarte (Hl)",AQ:"FV destino colector 1",AR:"FV destino colector 2"};
    const out=[]; for(let i=1;i<F.length;i++){ const r=F[i]; if(!r||!r.some(x=>x!=null&&x!=="")) continue; out.push({fila:i+1,get:c=>{ const k=MAP[c]; if(!k) return null; const j=ix(k); return j<0?null:r[j]; }}); } return {formato:"Exportación de esta plataforma",filas:out}; }
  function convertir(x){ const e=[], w=[], g=x.get, n=valTxt(g("B"));
    const fechas={t0:valFecha(g("G")),retiro:valFecha(g("H")),finRemocion:valFecha(g("I"))}; Object.entries(fechas).forEach(([k,v])=>{ if(v===undefined){ e.push("Fecha no válida en "+({t0:"Hora 0",retiro:"Inicio remoción",finRemocion:"Fin remoción"}[k])); fechas[k]=null; } });
    if(!n){ return {incompleto:true,e,w}; }
    const nombre=n.toUpperCase(); if(!/^[A-Z]{2}\d{1,2}F\d{1,3}$/.test(nombre)) w.push("El nombre no sigue el formato habitual");
    const N=(c,lab)=>{ const v=valNum(g(c)); if(v===undefined){ w.push(lab+" no es un número; se deja vacío"); return null; } return v; };
    const rec={nombre,marca:valTxt(g("C"))||M.marcaDeNombre(nombre),familia:valTxt(g("D"))||M.familiaDeNombre(nombre),tq:valNum(g("E"))!=null?String(valNum(g("E"))):null,generacion:N("F","Generación"),t0:fechas.t0,retiro:fechas.retiro,finRemocion:fechas.finRemocion,volCabeza:N("J","Vol cabeza"),
      cons:N("S","Consistencia"),conteo:N("T","Conteo"),etanol:N("U","Etanol"),viab:N("V","Viabilidad"),ph:N("W","pH"),temp:N("X","Temp cosecha"),sensorial:valTxt(g("Y")),respSensorial:valTxt(g("Z")),lote:valTxt(g("AA"))?valTxt(g("AA")).toUpperCase():null,
      volDescarte:N("AP","Levadura restante para descarte"),fvDestino1:N("AQ","FV destino 1"),fvDestino2:N("AR","FV destino 2")};
    if(rec.cons!=null&&rec.cons>1) rec.cons/=100; if(rec.viab!=null&&rec.viab>1) rec.viab/=100;
    const cols=[], desc=[]; [["M","N","O",1],["P","Q","R",2]].forEach(([c,v,va,o])=>{ const cv=g(c); if(cv==null||cv==="") return; const vol=N(v,"Volumen colector "+o);
      const t=String(cv).trim().toUpperCase(); if(M.DESC_DEST[t]){ desc.push({orden:o,destino:M.DESC_DEST[t],vol}); return; } const cn=valNum(cv); if(cn==null||cn===undefined||cn<1||cn>6){ w.push(`Destino ${o} “${cv}” no es un colector (1 a 6) ni un destino de descarte conocido`); return; }
      if(vol!=null&&vol<0) e.push("Volumen negativo en colector "+o); cols.push({colector:cn,posicion:String(o),vol,vacio:String(g(va)||"").trim().toUpperCase()==="SI"}); });
    if(cols.length) rec.colectores=cols; if(desc.length){ rec.descarteDirecto=desc; rec.destinoDescarte=desc[0].destino; } rec.destino=desc.length&&!cols.length?"DES":"COS";
    const sv=[]; [["AD","AE","AF","AG","AH",1],["AJ","AK","AL","AM","AN",2]].forEach(([a,b,c,d,ee,o])=>{ const tq=valNum(g(a)); if(tq==null||tq===undefined) return; const fe=valFecha(g(c)); if(fe===undefined) e.push("Fecha de resiembra "+o+" no válida"); sv.push({orden:o,tq:String(tq),lote:valTxt(g(b)),fecha:fe||null,tempColector:N(d,"Temp colector "+o),tempSiembra:N(ee,"Temp siembra "+o)}); });
    if(sv.length) rec.siembras=sv.map(s=>{ Object.keys(s).forEach(k=>s[k]==null&&delete s[k]); return s; });
    if(!rec.finRemocion&&!rec.retiro) e.push("Sin fechas de remoción"); if(!rec.lote) w.push("Sin consecutivo UTQ fuente");
    if(rec.retiro&&rec.finRemocion&&parseDT(rec.finRemocion)<parseDT(rec.retiro)) w.push("Fin de remoción anterior al inicio");
    if(rec.volCabeza!=null&&rec.volCabeza<0) e.push("Vol cabeza negativo");
    const p=M.parseNombre(nombre); if(p&&rec.generacion!=null&&p.gen!==rec.generacion) w.push(`El nombre indica Gen ${p.gen} y la columna dice ${rec.generacion}`);
    if(rec.t0) rec.maxCopec=M.derivar(rec).maxCopec; if(rec.finRemocion) rec.maxAbi=M.derivar(rec).maxAbi;
    Object.keys(rec).forEach(k=>rec[k]==null&&delete rec[k]);
    return {rec,e,w}; }
  const CMP=["nombre","marca","familia","tq","generacion","t0","retiro","finRemocion","volCabeza","cons","conteo","etanol","viab","ph","temp","sensorial","respSensorial","lote","volDescarte","fvDestino1","fvDestino2","colectores","descarteDirecto","siembras","destino"];
  const r6=x=>{ const n=num(x); return n==null?null:Math.round(n*1e6)/1e6; };
  const normCmp=(k,v)=>{ if(v==null) return null; if(k==="colectores") return v.map(c=>[+c.colector,r6(c.vol),!!c.vacio]); if(k==="siembras") return v.map(s=>[String(s.tq),s.lote||null,s.fecha||null,r6(s.tempColector),r6(s.tempSiembra)]); if(k==="descarteDirecto") return v.map(x=>[x.destino,r6(x.vol)]); if(typeof v==="number") return Math.round(v*1e6)/1e6; return String(v); };
  function comparar(viejo,nuevo){ return CMP.filter(k=>JSON.stringify(normCmp(k,viejo[k]))!==JSON.stringify(normCmp(k,nuevo[k]))); }
  function fusionar(viejo,nuevo,fila){ const out=Object.assign({},viejo,nuevo,{origen:viejo.origen||"excel",excel:{fila},estadoRegistro:viejo.estadoRegistro||"activo"});
    // conserva lo que la plataforma agregó: salidas, resiembras con Hl y vaciados con fecha
    if(viejo.colectores&&out.colectores) out.colectores=out.colectores.map((c,i)=>{ const o=viejo.colectores[i]; return o&&o.vacio&&o.fechaVaciado&&!c.vacio?Object.assign({},c,{vacio:true,fechaVaciado:o.fechaVaciado,motivoVaciado:o.motivoVaciado}):c; });
    const extra=(viejo.siembras||[]).filter(s=>s.hl!=null&&!(out.siembras||[]).some(x=>x.lote===s.lote&&String(x.tq)===String(s.tq))); if(extra.length) out.siembras=(out.siembras||[]).concat(extra);
    return out; }
  async function importarDialogo(){ if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    const body=`<p class="muted" style="margin-top:0">Selecciona el Excel <b>CONTROL PROCESO CAVAS</b> (.xlsm o .xlsx) o un Excel exportado desde esta plataforma. Se leerá la hoja <b>B.D LEVADURA</b> (o <b>Registros</b>), se validará y verás una vista previa antes de guardar. Nada se borra ni se sobrescribe sin tu confirmación.</p>
      <label class="f"><span>Archivo de Excel</span><input type="file" name="file" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"></label><div id="impOut" aria-live="polite"></div>`;
    let plan=null;
    const d=App.UI.modal("Importar desde Excel",body,{wide:true,ok:"Importar",onOpen(fm){ const out=fm.querySelector("#impOut"); fm.querySelector("button[type=submit]").disabled=true;
        fm.elements.file.onchange=async()=>{ const file=fm.elements.file.files[0]; plan=null; fm.querySelector("button[type=submit]").disabled=true; if(!file) return; out.innerHTML=`<p class="muted">Leyendo ${esc(file.name)}…</p>`;
          try{ plan=await analizar(file); out.innerHTML=vistaPrevia(plan); const sync=()=>{ const n=(fm.elements.addNew&&fm.elements.addNew.checked?plan.nuevos.length:0)+(fm.elements.upd&&fm.elements.upd.checked?plan.cambios.length:0); fm.querySelector("button[type=submit]").disabled=!n; fm.querySelector("button[type=submit]").textContent=n?`Importar ${n} registro${n===1?"":"s"}`:"Nada para importar"; }; out.addEventListener("change",sync); sync(); }
          catch(e){ console.warn(e); out.innerHTML=`<div class="errbox">${esc(e.message==="NAVEGADOR"?"Este navegador no puede leer archivos de Excel. Usa Chrome, Edge o Safari actualizados.":e.message==="HOJA"?"El archivo no tiene la hoja B.D LEVADURA ni una hoja Registros exportada desde la plataforma.":e.message==="ESTRUCTURA"?"La hoja no tiene la estructura esperada: revisa que el encabezado “Levadura” esté en la columna B, fila 11 (Excel original) o en la columna A, fila 1 (exportación).":"No se pudo leer el archivo. Verifica que sea un Excel .xlsx o .xlsm válido.")}</div>`; } }; },
      async onSubmit(fm,showErr){ if(!plan) return showErr("Selecciona un archivo."),false; const addN=fm.elements.addNew&&fm.elements.addNew.checked, upd=fm.elements.upd&&fm.elements.upd.checked;
        const ops=[]; if(addN) plan.nuevos.forEach(x=>ops.push(x)); if(upd) plan.cambios.forEach(x=>ops.push(x)); if(!ops.length) return showErr("No hay registros seleccionados para importar."),false;
        if(!await App.Sec.confirmar("¿Importar?",`Se van a <b>agregar ${addN?plan.nuevos.length:0}</b> y <b>actualizar ${upd?plan.cambios.length:0}</b> registros desde ${esc(plan.archivo)}. Ningún registro se elimina.`,"Importar")) return false;
        if(!await App.Sec.pin("Importar datos desde Excel")) return false;
        const lote={}; const ahora=new Date().toISOString();
        ops.forEach(x=>{ if(x.id){ const v=App.S.bdlev[x.id]; lote[x.id]=Object.assign(fusionar(v,x.rec,x.fila),{cambios:(v.cambios||[]).concat([{t:ahora,txt:"Actualizado por importación ("+x.campos.join(", ")+")"}])}); }
          else lote["L-"+(x.rec.lote||"SIN")+"-"+String(x.rec.retiro||"").slice(0,4)+"-"+x.fila]=Object.assign({},x.rec,{origen:"excel",excel:{fila:x.fila},estadoRegistro:"activo",cambios:[{t:ahora,txt:"Agregado por importación de "+plan.archivo}]}); });
        if(!await App.Store.setMany("bdlev",lote)) return false;
        await App.Sec.auditar("Importación de Excel ("+plan.archivo+")",(addN?plan.nuevos.length:0)+" nuevos",(upd?plan.cambios.length:0)+" actualizados",plan.formato);
        toast(`Importación lista: ${addN?plan.nuevos.length:0} nuevos, ${upd?plan.cambios.length:0} actualizados`); return true; }}); }
  async function analizar(file){ const buf=await file.arrayBuffer(), libro=await M.leerLibro(buf);
    let datos=null; for(const h of ["B.D LEVADURA","Registros","Registros filtrados"]){ if(!libro.hojas.includes(h)) continue; const F=await libro.filas(h); datos=h==="B.D LEVADURA"?filasExcelOriginal(F):filasExport(F); if(datos) break; if(h==="B.D LEVADURA") throw new Error("ESTRUCTURA"); }
    if(!datos){ if(!libro.hojas.some(h=>["B.D LEVADURA","Registros"].includes(h))) throw new Error("HOJA"); throw new Error("ESTRUCTURA"); }
    const idx={}; Object.entries(App.S.bdlev).forEach(([id,b])=>{ if(b.nombre) idx[b.nombre+"|"+(b.lote||"")]=(idx[b.nombre+"|"+(b.lote||"")]||[]).concat([id]); });
    const plan={archivo:file.name,formato:datos.formato,total:datos.filas.length,nuevos:[],cambios:[],iguales:0,errores:[],avisos:[],incompletas:[],anulados:0}; const vistos={};
    datos.filas.forEach(x=>{ const c=convertir(x); if(c.incompleto){ plan.incompletas.push(x.fila); return; }
      if(c.e.length){ plan.errores.push({fila:x.fila,nombre:c.rec&&c.rec.nombre,msg:c.e.join(". ")}); return; }
      const k=c.rec.nombre+"|"+(c.rec.lote||""); if(vistos[k]){ plan.errores.push({fila:x.fila,nombre:c.rec.nombre,msg:`Duplicado en el archivo (también en la fila ${vistos[k]})`}); return; } vistos[k]=x.fila;
      if(c.w.length) plan.avisos.push({fila:x.fila,nombre:c.rec.nombre,msg:c.w.join(". ")});
      const ids=(idx[k]||[]).filter(id=>{ const b=App.S.bdlev[id]; return !c.rec.retiro||!b.retiro||Math.abs(parseDT(b.retiro)-parseDT(c.rec.retiro))<120*DAY; });
      if(!ids.length){ plan.nuevos.push({fila:x.fila,rec:c.rec}); return; }
      plan._ult=plan._ult||{}; plan._ult[x.fila]={nuevo:c.rec,id:ids[0]};
      const v=App.S.bdlev[ids[0]]; if(v.estadoRegistro==="anulado"){ plan.anulados++; return; }
      const campos=comparar(v,c.rec); if(campos.length) plan.cambios.push({id:ids[0],fila:x.fila,rec:c.rec,campos}); else plan.iguales++; });
    App.BD._plan=plan; return plan; }
  const LAB={nombre:"Levadura",marca:"Marca",familia:"Familia",tq:"UTQ",generacion:"Generación",t0:"Hora 0",retiro:"Inicio remoción",finRemocion:"Fin remoción",volCabeza:"Vol cabeza",cons:"Consistencia",conteo:"Conteo",etanol:"Etanol",viab:"Viabilidad",ph:"pH",temp:"Temp cosecha",sensorial:"Sensorial",respSensorial:"Responsable",lote:"Consecutivo",volDescarte:"Descarte restante",fvDestino1:"FV destino 1",fvDestino2:"FV destino 2",colectores:"Colectores",descarteDirecto:"Descarte directo",siembras:"Resiembras",destino:"Destino"};
  function vistaPrevia(p){ const ch=(lab,n,cls="")=>`<div class="bd-imp-k ${cls}"><b>${n}</b><span>${lab}</span></div>`;
    return `<div class="bd-imp"><div class="small muted" style="margin:10px 0">${esc(p.archivo)} · ${esc(p.formato)} · ${p.total} filas leídas</div>
      <div class="bd-imp-ks">${ch("Nuevos",p.nuevos.length,"ok")}${ch("Con cambios",p.cambios.length,"warn")}${ch("Sin cambios",p.iguales)}${ch("Con errores (se omiten)",p.errores.length,p.errores.length?"err":"")}${ch("Advertencias",p.avisos.length)}${p.incompletas.length?ch("Filas sin levadura (se omiten)",p.incompletas.length):""}${p.anulados?ch("Anulados (no se tocan)",p.anulados):""}</div>
      ${p.nuevos.length?`<label class="bd-chk"><input type="checkbox" name="addNew" checked> Agregar los ${p.nuevos.length} registros nuevos</label>`:""}
      ${p.cambios.length?`<label class="bd-chk"><input type="checkbox" name="upd"> Actualizar los ${p.cambios.length} registros existentes que cambiaron <span class="small muted">(conserva salidas y resiembras registradas en la plataforma)</span></label>`:""}
      ${!p.nuevos.length&&!p.cambios.length?`<div class="infobox">La base de datos ya está al día con este archivo. No hay nada para importar.</div>`:""}
      ${p.nuevos.length||p.cambios.length?`<div class="yd-table-wrap" style="max-height:260px;margin-top:10px"><table><thead><tr><th>Fila</th><th>Acción</th><th>Levadura</th><th>Consecutivo</th><th>Fin remoción</th><th>Qué cambia</th></tr></thead><tbody>${p.nuevos.slice(0,150).map(x=>`<tr><td>${x.fila}</td><td><span class="tag real">Nuevo</span></td><td><b>${esc(x.rec.nombre)}</b></td><td>${esc(x.rec.lote||"—")}</td><td>${fmt(x.rec.finRemocion)}</td><td>—</td></tr>`).join("")}${p.cambios.slice(0,150).map(x=>`<tr><td>${x.fila}</td><td><span class="tag est">Actualizar</span></td><td><b>${esc(x.rec.nombre)}</b></td><td>${esc(x.rec.lote||"—")}</td><td>${fmt(x.rec.finRemocion)}</td><td>${x.campos.map(k=>LAB[k]||k).join(", ")}</td></tr>`).join("")}</tbody></table></div>`:""}
      ${p.errores.length?`<details style="margin-top:10px" open><summary><b>Errores (${p.errores.length})</b></summary><ul class="small">${p.errores.slice(0,60).map(x=>`<li>Fila ${x.fila}${x.nombre?" · "+esc(x.nombre):""}: ${esc(x.msg)}</li>`).join("")}</ul></details>`:""}
      ${p.avisos.length?`<details style="margin-top:6px"><summary>Advertencias (${p.avisos.length}) · se importan igual</summary><ul class="small">${p.avisos.slice(0,80).map(x=>`<li>Fila ${x.fila} · ${esc(x.nombre)}: ${esc(x.msg)}</li>`).join("")}</ul></details>`:""}</div>`; }
})();
