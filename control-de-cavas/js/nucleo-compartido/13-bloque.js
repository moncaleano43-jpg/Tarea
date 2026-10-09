
/* ============================================================
   levabot.js — Cifra, asistente conversacional de la plataforma
   Motor local: no usa IA externa. Flujo: ENTENDER → CONSULTAR → ANALIZAR → RESPONDER
   ============================================================ */
App.errores=App.errores||[];
window.addEventListener("error",e=>{ App.errores.push({t:new Date().toISOString(),msg:String(e.message||e.error||"Error"),src:(e.filename||"").split("/").pop()+":"+(e.lineno||"")}); });
window.addEventListener("unhandledrejection",e=>{ const m=e.reason&&(e.reason.message||e.reason.code)||String(e.reason); if(/cancelled|declined|not_granted/.test(m)) return; App.errores.push({t:new Date().toISOString(),msg:"Promesa rechazada: "+m,src:""}); });

App.Bot=(function(){
  const {esc,f,fmt,fmtS,pc,num,parseDT,HOUR,dur,toast}=App.U, C=App.C;
  const ORD={rojo:0,naranja:1,verde:2,amarillo:3,gris:4,sin:5};
  const POS=id=>String(id).toUpperCase().replace("-","-P");
  const fHl=v=>v==null?"—":f(v,0)+" Hl";
  const pl=(n,s,p)=>n===1?s:(p||s+"s");
  const lista=a=>a.length<=1?a.join(""):a.slice(0,-1).join(", ")+" y "+a[a.length-1];

  /* ------------------------------------------------------------
     1. LENGUAJE: normalización, vocabulario, tolerancia a errores
     ------------------------------------------------------------ */
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s]/g," ").replace(/([a-z])\1{2,}/g,"$1").replace(/\s+/g," ").trim();

  // concepto → palabras (ya normalizadas). Una palabra puede pertenecer a varios conceptos.
  const LEX={
    SALUDO:"hola holi hello hey buenas buenos saludos quiubo quihubo epa ola alo",
    GRACIAS:"gracias grax thanks agradezco agradecido amable",
    OK:"ok okey okay vale dale listo perfecto genial excelente entendido claro super bacano chevere sisas si bueno",
    ADIOS:"chao chau adios bye luego",
    BIEN:"bien",
    LEV:"levadura levaduras leva levas yeast cepa cepas",
    INV:"inventario disponible disponibles stock existencias hay tenemos tengo queda quedan ay",
    COL:"colector colectores posicion posiciones cava cavas",
    FV:"tanque tanques fv fermentador fermentadores tq",
    RET:"retiro retiros retirar retirarla retiro sacar saco sacarla cosecha cosechas cosechar cosechada",
    PRIO:"primero prioridad prioridades urgente urgentes atender pendiente pendientes",
    VENC:"vencida vencidas vencido vencidos atrasada atrasado atrasadas",
    GEN:"generacion generaciones gen",
    FAMILIA:"familia familias",
    MAX:"mayor maximo maxima llena lleno llenas alto alta altas mejor grande mucho mucha",
    MIN:"menor minimo minima baja bajo bajas vacia vacio poca poco peor menos",
    INTENS:"mas",
    PROM:"promedio habitual normal usual debajo encima nivel niveles media",
    CANT:"cuanta cuanto cuantas cuantos cantidad total volumen hl hectolitros suma",
    LISTA:"muestra muestrame lista listado listar cuales ensename dame todas todos",
    ESTADO:"estado situacion panorama resumen status",
    T0:"t0",
    ATEN:"atenuacion atenuado atenuada",
    EXT:"extracto",
    GENEALOGIA:"genealogia arbol ancestro ancestros descendencia descendientes hijas madre padre linaje",
    DETALLE:"completa completo informacion info ficha expediente perfil detalles datos detallame detallado detallada resumeme resumen cuentame",
    USO:"usado usada uso usos utilizo utilizada sembro sembrado sembrada sembraron",
    SIEMBRA:"sembrar siembra resiembra resembrar",
    VIAB:"viabilidad viable",
    CONS:"consistencia",
    DIAG:"error errores falla fallas fallando diagnostico diagnostica analiza bug",
    PWD:"contrasena clave pin password",
    CAMBIAR:"cambiar cambio cambiarla nueva actualizar",
    NAV:"abre abrir llevame ir vete pantalla seccion",
    HIST:"historial historico",
    CONFIG:"configuracion ajustes",
    INICIO:"inicio",
    RECOM:"recomiendas recomienda recomendarias sugieres sugerencia deberia conviene",
    AYUDA:"ayuda ayudame ayudas ayudar",
    DESCARTE:"descarte descartar descartada descartadas descartado",
    TRAZA:"trazabilidad",
    PRON:"ese esa este esta eso esto esos esas estos estas anterior mismo misma",
    WH:"cual cuales que quien donde",
    ACCION:"registrar registra registro registremos haz hacer abreme",
    LOTE:"lote lotes consecutivo",
    NEUTRO:"revisar revisa revisemos revision tiene tienen saber necesito quiero puedo dato datos alguna alguno algun cuando hoy ayer manana ahora hace dias horas hora fecha fechas dia dias turno turnos mes meses semana semanas ayer manana hoy todo primera tardes noches"
  };
  const PHRASES=[
["que hubo","SALUDO"],["buen dia","SALUDO"],
    ["como estas","COMOESTAS"],["como esta usted","COMOESTAS"],["como vas","COMOESTAS"],["que tal","COMOESTAS"],["como te va","COMOESTAS"],["todo bien","COMOESTAS"],["como amaneciste","COMOESTAS"],
    ["quien eres","QUIEN"],["como te llamas","QUIEN"],["que eres","QUIEN"],
    ["que puedes hacer","CAPAZ"],["para que sirves","CAPAZ"],["que sabes hacer","CAPAZ"],["como te uso","CAPAZ"],["que haces","CAPAZ"],
    ["hasta luego","ADIOS"],["nos vemos","ADIOS"],["hasta manana","ADIOS"],
    ["muchas gracias","GRACIAS"],["de una","OK"],["muy bien","OK"],
    ["como va","ESTADO"],["como van","ESTADO"],["como esta","ESTADO"],["como estan","ESTADO"],["como vamos","ESTADO"],["como estamos","ESTADO"],["como anda","ESTADO"],["como andamos","ESTADO"],["que paso con","ESTADO"],["que pasa con","ESTADO"],
    ["estamos de","INV"],["que tenemos","INV"],["que hay","INV"],
    ["que es","QUE_ES"],["que significa","QUE_ES"],["que quiere decir","QUE_ES"],["a que se refiere","QUE_ES"],["significa","QUE_ES"],["define","QUE_ES"],
    ["por que","POR_QUE"],["porque","POR_QUE"],["explica","POR_QUE"],["explicame","POR_QUE"],["como asi","POR_QUE"],["no entiendo","POR_QUE"],["razon","POR_QUE"],
    ["de donde viene","GENEALOGIA"],["de donde salio","GENEALOGIA"],
    ["donde se uso","USO"],["donde se sembro","USO"],["en que tanques","USO"],["a que tanques","USO"],["informacion completa","DETALLE"],["ficha completa","DETALLE"],["dame todo de","DETALLE"],["que sabes de","DETALLE"],["todo sobre","DETALLE"],
    ["que me recomiendas","RECOM"],["que revisar","RECOM"],
    ["que sigue","PRIO"],["que hago","PRIO"],["por donde empiezo","PRIO"],
    ["mas cerca","CERCA"],["mas pronto","CERCA"],["mas proximo","CERCA"],["mas avanzado","AVANCE"],["mas avanzada","AVANCE"],
    ["en colector","COL"],["tiempo en colector","TIEMPOCOL"],["mas tiempo","TIEMPOCOL"],["mas vieja","TIEMPOCOL"],["mas antigua","TIEMPOCOL"],
    ["no lo arregles","GUIA"],["guiame","GUIA"],["solucionalo","FIX"],["arreglalo","FIX"],["corrigelo","FIX"]
  ];
  const VOCAB=new Map();
  Object.entries(LEX).forEach(([k,ws])=>ws.split(" ").forEach(w=>{ if(!VOCAB.has(w)) VOCAB.set(w,new Set()); VOCAB.get(w).add(k); }));
  const FUZZ=[...VOCAB.keys()].filter(w=>w.length>=4);
  function lev(a,b,max){ if(Math.abs(a.length-b.length)>max) return max+1; let p=Array.from({length:b.length+1},(_,j)=>j);
    for(let i=1;i<=a.length;i++){ const c=[i]; let best=i; for(let j=1;j<=b.length;j++){ c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); if(c[j]<best) best=c[j]; } if(best>max) return max+1; p=c; } return p[b.length]; }
  const fzCache=new Map();
  const FUZZ_STOP=new Set("hora hola fecha dia dias ano anos mes meses hoy ayer manana turno semana semanas que como donde cuando cual quien mas hay tengo tenemos para esta este con desde hasta sobre entre una uno los las del por".split(" "));
  function fuzzy(t){ if(t.length<4||/\d/.test(t)||FUZZ_STOP.has(t)) return null; if(fzCache.has(t)) return fzCache.get(t);
    const max=t.length>=7?2:1; let best=null, bd=max+1;
    for(const w of FUZZ){ if(w[0]!==t[0]&&max<2) continue; const d=lev(t,w,max); if(d<bd){ bd=d; best=w; } }
    const r=best?VOCAB.get(best):null; fzCache.set(t,r); return r; }

  function analizar(raw){
    const q=norm(raw), toks=q.split(" ").filter(Boolean), K=new Set(), pad=" "+q+" ";
    PHRASES.forEach(([p,k])=>{ if(pad.includes(" "+p+" ")) K.add(k); });
    toks.forEach(t=>{ const h=VOCAB.get(t)||fuzzy(t); if(h) h.forEach(k=>K.add(k)); });
    if(/[👍👌🙌✅]/u.test(raw)) K.add("OK");
    if(K.has("COMOESTAS")) K.delete("ESTADO");
    if(K.has("NAV")&&!toks.slice(0,3).some(t=>(VOCAB.get(t)||new Set()).has("NAV"))) K.delete("NAV");
    // entidades
    const ent={}; let m, rest=q;
    const quita=re=>{ rest=rest.replace(re," "); };
    if((m=/\b(?:fv|tq|tanque|fermentador)\s*(?:n(?:o|umero)?\s*)?(\d{1,3})\b/.exec(q))){ ent.fv=+m[1]; quita(m[0]); }
    if((m=/\b(20\d{2})\b/.exec(rest))){ ent.year=+m[1]; quita(m[0]); }
    const meses="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" ");
    if((m=/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.exec(rest))){ ent.day=+m[1]; ent.month=meses.indexOf(m[2])+1; quita(m[0]); }
    if((m=/\b(?:en\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.exec(rest))){ ent.month=ent.month||meses.indexOf(m[1])+1; quita(m[0]); }
    if((m=/\b(?:lote\s*)?f\s?(\d{3,4})\b/.exec(rest))&&+m[1]<2020){ ent.lote="F"+m[1]; quita(m[0]); }
    if((m=/\b([a-z]{1,3}\d{1,2}f\d{1,3})\b/.exec(rest))){ ent.lev=m[1].toUpperCase(); quita(m[0]); }
    if((m=/\b(?:c|colector|col)\s*(\d{1,2})(?:\s*p\s*([12]))?\b/.exec(rest))){ ent.col=+m[1]; if(m[2]) ent.pos=+m[2]; quita(m[0]); }
    if((m=/\b(?:generacion|gen|g)\s*(\d{1,2})\b/.exec(rest))){ ent.gen=+m[1]; quita(m[0]); }
    if((m=/\bfamilia\s+(?:numero\s+)?([a-z])\b/.exec(rest))){ ent.fam=m[1].toUpperCase(); quita(m[0]); }
    if((m=/\b(?:t0|t\s0)\b/.exec(rest))) quita(m[0]);
    if((m=/\b(\d{1,4})\b/.exec(rest))){ const n=+m[1]; if(!(n>=2020&&n<=2099)&&n!==ent.day) ent.num=n; }
    // número suelto con palabra clave mal escrita: "el tanqe 27", "colectr 3", "generasion 8"
    if(ent.num!=null){ if(K.has("FV")&&ent.fv==null) { ent.fv=ent.num; delete ent.num; }
      else if(K.has("COL")&&ent.col==null&&ent.num<=12) { ent.col=ent.num; delete ent.num; }
      else if(K.has("GEN")&&ent.gen==null&&ent.num<=15) { ent.gen=ent.num; delete ent.num; }
      else if(K.has("LOTE")&&!ent.lote&&ent.num>=100&&!(ent.num>=2020&&ent.num<=2099)) { ent.lote="F"+ent.num; delete ent.num; } }
    // levadura escrita con el nombre exacto aunque no siga el patrón
    if(!ent.lev){ const nom=App.Traza.nombres().find(n=>n.length>=4&&pad.includes(" "+norm(n)+" ")); if(nom) ent.lev=nom; }
    return {raw,q,toks,K,ent,has:k=>K.has(k)};
  }

  /* ------------------------------------------------------------
     2. ESTADO DE LA CONVERSACIÓN
     ------------------------------------------------------------ */
  let el=null, ctx=null, msgs=[], ocupado=false, diag=null, guia=null, proactiveTimer=null;
  let botPrefs={proactive:true};try{botPrefs=Object.assign(botPrefs,JSON.parse(localStorage.getItem("levabot.preferences.v2")||"{}"));}catch(e){}
  let mem={last:null,list:null,pend:null};   // last: {kind,id};
  const CHAT_KEY="levabot.chat.v2"; let lastOpenAt=null;
  try{const saved=JSON.parse(localStorage.getItem(CHAT_KEY)||"{}");if(Array.isArray(saved.msgs))msgs=saved.msgs.slice(-60).filter(x=>x&&["b","u"].includes(x.r)&&typeof x.h==="string");if(saved.mem)mem=Object.assign(mem,saved.mem);lastOpenAt=saved.lastOpenAt||null;}catch(e){}
  function persist(){try{localStorage.setItem(CHAT_KEY,JSON.stringify({msgs:msgs.slice(-60),mem,lastOpenAt}));}catch(e){}}
  const usados={};
  const pick=(key,arr)=>{ let i=Math.floor(Math.random()*arr.length); if(arr.length>1&&i===usados[key]) i=(i+1)%arr.length; usados[key]=i; return arr[i]; };

  /* ------------------------------------------------------------
     3. CONSULTAS A LOS DATOS
     ------------------------------------------------------------ */
  const pend=()=>App.D.pend().sort((a,b)=>ORD[a.st.k]-ORD[b.st.k]||((a.r.t0||Infinity)-(b.r.t0||Infinity)));
  const tqPorNum=n=>App.pendientes().find(t=>+t.tq===+n);
  const linkFV=t=>`<a href="#/tanque/${esc(t.lote)}" data-bgo="tanque/${esc(t.lote)}">FV ${t.tq} · ${esc(t.lote)}</a>`;
  const colExiste=n=>Object.keys(App.S.colectores).some(k=>k.startsWith("c"+n+"-"))||(n>=1&&n<=6);
  function colItems(){ return App.D.cols().map(x=>({kind:"col",id:x.id,pos:POS(x.id),nombre:x.c.nombre||"—",gen:x.c.generacion,vol:num(x.c.vol),viab:num(x.c.viab),cons:num(x.c.cons),lleva:App.T.tiempoColector(x.c).lleva,estado:App.T.estadoLevColector(x.c).txt,c:x.c})).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true})); }
  function fvItems(){ return pend().map(x=>{ const r=x.r, att=(r.eo!=null&&r.el!=null&&r.ext!=null&&r.eo!==r.el)?(r.eo-r.ext)/(r.eo-r.el):null; return {kind:"fv",id:x.t.lote,t:x.t,r,st:x.st,att,ext:r.ext,t0:r.t0?+r.t0:null,nombre:(x.t.levadura||{}).nombre||null}; }); }
  const ultimoDeFV=n=>Object.values(App.S.bdlev||{}).filter(b=>+b.tq===+n).sort((a,b)=>String(b.retiro||"").localeCompare(String(a.retiro||"")))[0];
  const fvActual=()=>{ if(ctx&&ctx.tipo==="fv") return App.S.tanques[ctx.lote]||null; if(mem.last&&mem.last.kind==="fv") return App.S.tanques[mem.last.id]||null; return null; };
  const levActual=()=>ctx&&ctx.tipo==="lev"?ctx.nombre:mem.last&&mem.last.kind==="lev"?mem.last.id:null;

  function cantidad(){ const it=colItems(); mem.list={kind:"col",items:it};
    if(!it.length) return "Ahora mismo no hay levadura en los colectores.";
    const tot=it.reduce((s,x)=>s+(x.vol||0),0), disp=it.filter(x=>x.estado==="Disponible").length;
    const base=pick("cant",[`Tenemos <b>${fHl(tot)}</b> de levadura en ${it.length} ${pl(it.length,"posición","posiciones")} de colector.`,`Hay <b>${fHl(tot)}</b> repartidos en ${it.length} ${pl(it.length,"posición","posiciones")} de colector.`,`En colectores hay <b>${fHl(tot)}</b> (${it.length} ${pl(it.length,"posición","posiciones")}).`]);
    return base+(disp<it.length?` ${disp===0?"Ninguna está":disp+" "+pl(disp,"está","están")} dentro del tiempo para sembrar.`:""); }
  function inventario(){ const it=colItems(); mem.list={kind:"col",items:it};
    if(!it.length) return "No hay levadura en los colectores en este momento.";
    const o=it.slice().sort((a,b)=>(b.vol||0)-(a.vol||0)), tot=it.reduce((s,x)=>s+(x.vol||0),0);
    const con=o.filter(x=>x.vol!=null), top=con.filter(x=>x.vol===con[0].vol), todasIg=con.length>1&&top.length===con.length;
    return `${pick("invh",["Esto es lo que hay en colectores:","Encontré esto:","Por lo que veo, en colectores tenemos:"])} <b>${fHl(tot)}</b> en ${it.length} ${pl(it.length,"posición","posiciones")}.<ul>${o.map(x=>`<li><b>${esc(x.nombre)}</b> — ${x.vol!=null?fHl(x.vol):'<span class="muted">sin volumen registrado</span>'} · ${x.pos} · Gen ${x.gen??"—"}${x.estado!=="Disponible"?` · <span class="small">${esc(x.estado)}</span>`:""}</li>`).join("")}</ul>${todasIg?`${con.length<o.length?"Las que tienen volumen registrado tienen":"Todas tienen"} el mismo (${fHl(con[0].vol)}).`:top.length===1?`El mayor volumen está en ${esc(top[0].nombre)} (${top[0].pos}).`:""}`; }
  function tanquesConLevadura(){ const it=fvItems(); mem.list={kind:"fv",items:it};
    if(!it.length) return "No hay FV con levadura pendiente de retiro en este momento.";
    const urg=it.filter(x=>x.st.k==="rojo");
    return `Hay <b>${it.length}</b> FV con levadura en fermentación:<ul>${it.map(x=>`<li>${linkFV(x.t)} — ${x.nombre?esc(x.nombre):'<span class="muted">sin levadura registrada</span>'} · ${C.status(App.T.estado(x.st))}</li>`).join("")}</ul>${urg.length?`Ojo: ${lista(urg.map(x=>"FV "+x.t.tq))} ${pl(urg.length,"ya pasó","ya pasaron")} el máximo de retiro.`:""}`; }
  function prioridades(soloVenc){ const l=pend().filter(x=>x.r.t0); mem.list={kind:"fv",items:fvItems()};
    if(!l.length) return "No hay levadura pendiente por retirar en este momento.";
    const now=Date.now(); let acc=l.filter(x=>soloVenc?x.st.k==="rojo":["rojo","naranja","verde"].includes(x.st.k));
    if(soloVenc&&!acc.length) return pick("nov",["No hay retiros vencidos. 👌","Ninguno está vencido ahora mismo."]);
    const fila=x=>{ const st=App.T.estado(x.st), why=x.st.k==="rojo"?`pasó el máximo (T0 + 24 h) ${C.rel(x.r.venc,now)}`:x.st.k==="naranja"?`está entre +12 h y +24 h; el máximo es ${C.rel(x.r.venc,now)}`:x.st.k==="verde"?`ya cumplió T0; lo ideal es ${C.rel(x.r.mas12,now)}`:`su T0 llega ${C.rel(x.r.t0,now)}`; const av=App.T.genAviso(App.T.genResultante(x.r));
      return `<li><b>${linkFV(x.t)}</b> — ${C.status(st)} ${why}.${av?` <span class="small">${esc(av.corto)}.</span>`:""}</li>`; };
    if(acc.length) mem.last={kind:"fv",id:acc[0].t.lote};
    return `${acc.length?(soloVenc?`${acc.length===1?"Hay <b>1</b> retiro vencido:":`Hay <b>${acc.length}</b> retiros vencidos:`}`:acc.length===1?"Hay <b>1</b> retiro para atender:":`Hay <b>${acc.length}</b> retiros para atender, en este orden:`):"Ningún tanque está en ventana de retiro todavía. Lo que viene es:"}<ol>${(acc.length?acc:l.slice(0,3)).map(fila).join("")}</ol>${acc.length>1&&!soloVenc?"Primero los vencidos, luego los próximos al máximo y después los que ya están listos.":""}`; }
  function comoVa(t){ const now=Date.now(), r=App.Calc.tanque(t,now), st=App.T.estado(App.Calc.estado(r,now)), L=t.levadura||{}, gR=App.T.genResultante(r), av=App.T.genAviso(gR);
    mem.last={kind:"fv",id:t.lote};
    const att=(r.eo!=null&&r.el!=null&&r.ext!=null)?(r.eo-r.ext)/(r.eo-r.el):null; let s=`<b>${linkFV(t)}</b> · ${esc(t.marca||"")} — ${C.status(st)}<br>`;
    s+=r.ext!=null?`Extracto actual <b>${f(r.ext)} °P</b>${att!=null?` (atenuación ${pc(att,0)})`:""}, última muestra hace ${dur(now-r.extFecha)}. `:"Aún no tiene muestras de extracto. ";
    s+=r.t0?`T0 ${App.tipoTag(r.T.tipo)} <b>${fmtS(r.t0)}</b> (${C.rel(r.t0,now)}); ideal ${fmtS(r.mas12)}, máximo ${fmtS(r.venc)}.`:`Sin T0: falta ${esc(r.T.faltan.join(", "))}.`;
    s+=`<br>Sembrado con ${esc(L.nombre||"—")}${L.generacion!=null?" (Gen "+L.generacion+")":""} → la cosecha saldrá como <b>${esc(r.nombreCosecha||"—")}</b>${gR!=null?" (Gen "+gR+")":""}.`;
    if(av) s+=`<br><span class="small">${esc(av.txt)}</span>`;
    const que=st.k==="rojo"?"Retírala cuanto antes y deja el motivo de la demora.":st.k==="naranja"?"Retírala antes del máximo.":st.k==="verde"?"Ya se puede retirar; lo ideal es cerca de las +12 h.":st.k==="amarillo"?"Ve preparando el retiro: el T0 está cerca.":r.T.tipo==="proy"?"Faltan extracto límite y muestras para tener un T0 estimado.":"Sigue registrando muestras.";
    return s+`<br><b>Qué hacer:</b> ${que}`; }
  function t0Corto(t){ const r=App.Calc.tanque(t), now=Date.now(); mem.last={kind:"fv",id:t.lote};
    return r.t0?`El T0 de FV ${t.tq} es el <b>${fmtS(r.t0)}</b> (${C.rel(r.t0,now)}).`:`FV ${t.tq} todavía no tiene T0: falta ${esc(r.T.faltan.join(", "))}.`; }
  function explicarT0(t){ const r=App.Calc.tanque(t), T=r.T; mem.last={kind:"fv",id:t.lote}; if(!r.t0) return `${linkFV(t)} no tiene T0 porque falta: ${esc(T.faltan.join(", "))}.`;
    const h=x=>x!=null?f(x,1)+" h":"—"; let s=`${linkFV(t)} tiene T0 el <b>${fmt(r.t0)}</b> porque:<ul><li>Fin de llenado (hora 0): ${fmt(r.fin)}.</li>`;
    if(r.eo!=null&&r.el!=null) s+=`<li>Extracto original ${f(r.eo)} °P y extracto límite ${f(r.el)} °P. El 15 % de atenuación es ${f(r.e15,2)} °P y el 75 % es ${f(r.e75,2)} °P.</li>`;
    const pt=(lab,hh,tp)=>tp==="manual"?`el ${lab} quedó registrado a mano a las ${h(hh)}`:`la curva real cruzó el ${lab} a las ${h(hh)}`;
    if(T.metodo==="curva") s+=`<li>${pt("15 %",r.h15,r.h15tipo).replace(/^./,c=>c.toUpperCase())} y ${pt("75 %",r.h75,r.h75tipo)}.</li><li>Prolongando la recta del 15 % al 75 % hasta el extracto límite se llega en ${h(T.horas)}: fin de llenado + ${h(T.horas)} = T0.</li>`;
    else if(T.metodo==="regresion") s+=`<li>Aún no llega al 75 %: se ajustó una recta con ${T.pares.length} muestras entre el 15 % y el 75 % (R² ${f(T.r2,3)}) y se proyectó al extracto límite: ${h(T.horas)}.</li>`;
    else if(T.metodo==="tendencia") s+=`<li>Aún no llega al 75 %: con la velocidad entre el 15 % y la última muestra, el 75 % llegaría a las ${h(r.h75proj)} y el extracto límite a las ${h(T.horas)}.</li>`;
    else if(T.metodo==="marca") s+=`<li>No hay datos suficientes del tanque (${esc(T.faltan.join(", "))}), así que se usan los días de la marca: es un T0 <b>proyectado</b>, igual que la macro del Excel.</li>`;
    return s+`</ul>Desde el T0 la levadura está lista; lo ideal es retirarla hacia ${fmtS(r.mas12)} (+12 h) y el máximo es ${fmtS(r.venc)} (+24 h).${T.tipo==="est"?" Es una <b>estimación</b>: se ajusta con cada muestra nueva.":""}`; }
  function colector(n,pos,corto){ const now=Date.now(), ids=pos?[pos]:[1,2], ps=ids.map(s=>[`c${n}-${s}`,App.S.colectores[`c${n}-${s}`]]);
    mem.last={kind:"col",id:String(n)};
    if(corto){ const ocup=ps.filter(p=>p[1]); if(!ocup.length) return pos?`C${n}-P${pos} está libre.`:`El colector C${n} está vacío.`;
      const tot=ocup.reduce((s,p)=>s+(num(p[1].vol)||0),0);
      return `${pos?`C${n}-P${pos}`:`C${n}`} tiene <b>${fHl(tot)}</b>: ${lista(ocup.map(([id,c])=>`${esc(c.nombre)} en ${POS(id).split("-")[1]} (${fHl(num(c.vol))})`))}.${!pos&&ocup.length<2?" La otra posición está libre.":""}`; }
    const uso=ps.filter(p=>p[1]).length; let s=pos?"":`<b>Colector C${n}</b>: ${uso}/2 en uso.`; s+="<ul>";
    ps.forEach(([id,c])=>{ if(!c){ s+=`<li>${POS(id)}: libre.</li>`; return; } const tc=App.T.tiempoColector(c,now), e=App.T.estadoLevColector(c,now);
      s+=`<li>${POS(id)}: <b>${esc(c.nombre)}</b> · Gen ${c.generacion??"—"} · ${fHl(num(c.vol))}. ${esc(e.txt)}. Lleva ${tc.lleva!=null?dur(tc.lleva):"—"} en colector; último momento para sembrar ${fmtS(tc.mr)} (${tc.resta!=null?(tc.resta>=0?"quedan "+dur(tc.resta):"pasó hace "+dur(-tc.resta)):"—"}).${c.recosechar?" 🔄 Marcada para recosechar.":""}</li>`; });
    return s+"</ul>"; }
  function perfilLev(nombre){
    nombre=App.Traza.N(nombre); mem.last={kind:"lev",id:nombre};
    const parsed=App.Calc.parseLev(nombre), recs=Object.values(App.S.bdlev||{}).filter(b=>App.Traza.N(b.nombre)===nombre).sort((a,b)=>String(b.retiro||"").localeCompare(String(a.retiro||"")));
    const cols=Object.entries(App.S.colectores||{}).filter(([,c])=>App.Traza.N(c.nombre)===nombre);
    const tanks=Object.values(App.S.tanques||{}).filter(t=>App.Traza.N((t.levadura||{}).nombre)===nombre);
    const uses=App.Traza.usos(nombre), source=App.Traza.origen(nombre), latest=recs[0]||{};
    if(!parsed&&!recs.length&&!cols.length&&!tanks.length) return `No localicé <b>${esc(nombre)}</b> en los datos actuales ni históricos. Revisa el nombre o búscala en el Explorador de levaduras.`;
    const location=[...cols.map(([id,c])=>`${POS(id)} · ${fHl(num(c.vol))}`),...tanks.filter(t=>!(t.retiro||{}).fecha).map(t=>`FV ${t.tq} · en fermentación` )];
    const metric=(v,kind)=>v==null?"No registrado":kind==="pct"?pc(v):kind==="ph"?f(v,2):kind==="temp"?f(v,1)+" °C":String(v);
    const urows=uses.slice().sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))).slice(0,10);
    const history=recs.slice(0,8).map(b=>`<li>FV ${esc(b.tq||"—")} · ${esc(b.lote||"—")} · movimiento ${fmtS(b.retiro)}${b.destino==="DES"?" · descarte":" · cosecha"}${b.levSembrada?` · sembrada con ${esc(b.levSembrada)}`:""}</li>`).join("");
    return `<b>Expediente de ${esc(nombre)}</b>${parsed?`<br>Familia ${esc(parsed.fam)} · Generación ${parsed.gen} · FV de origen ${parsed.tq}.`:""}<br><b>Estado y ubicación:</b> ${location.length?location.map(esc).join("; "):"sin ubicación actual registrada"}.<br><b>Calidad más reciente:</b> viabilidad ${metric(cols[0]?.[1]?.viab??latest.viab,"pct")} · consistencia ${metric(cols[0]?.[1]?.cons??latest.cons,"pct")} · pH ${metric(cols[0]?.[1]?.ph??latest.ph,"ph")} · temperatura ${metric(cols[0]?.[1]?.temp??latest.temp,"temp")} · sensorial ${esc(cols[0]?.[1]?.sensorial??latest.sensorial??"No registrado")} .<br><b>Origen:</b> ${source?`FV ${esc(source.tq||"—")} · ${esc(source.lote||"—")} · ${fmtS(source.retiro)}${source.levSembrada?` · sembrada con ${esc(source.levSembrada)}`:""}`:"No está registrado un origen verificable."}<br><b>Siembras relacionadas:</b> ${uses.length} FV · <b>registros históricos:</b> ${recs.length}.${urows.length?`<br><b>Uso en fermentadores</b><ul>${urows.map(x=>`<li>${x.activo?"<b>Activa</b> · ":""}<a href="#/tanque/${esc(x.lote)}" data-bgo="tanque/${esc(x.lote)}">FV ${esc(x.tq)} · ${esc(x.lote)}</a>${x.fecha?" · "+fmtS(x.fecha):""}${x.salida?" · cosecha "+esc(x.salida.nombre||"descartada"):""}</li>`).join("")}</ul>`:""}${history?`<b>Movimientos anteriores</b><ul>${history}</ul>`:""}<a href="#/levaduras" data-bgo="levaduras">Abrir Explorador de levaduras</a>`;
  }
  function usosLev(nombre){ nombre=App.Traza.N(nombre); mem.last={kind:"lev",id:nombre}; const u=App.Traza.usos(nombre), o=App.Traza.origen(nombre), col=Object.entries(App.S.colectores).filter(([,c])=>App.Traza.N(c.nombre)===nombre);
    if(!u.length&&!o&&!col.length) return `No encuentro registros de la levadura <b>${esc(nombre)}</b>.`; let s=`<b>${esc(nombre)}</b>`; const p=App.Calc.parseLev(nombre); if(p) s+=` (Gen ${p.gen}, familia ${p.fam})`;
    s+=o?`: viene de la cosecha de FV ${esc(o.tq)} · ${esc(o.lote||"")} el ${fmtS(o.retiro)}${o.levSembrada?`, que se había sembrado con ${esc(o.levSembrada)}`:""}.`:".";
    s+=u.length?`<br>Se usó en <b>${u.length}</b> ${pl(u.length,"fermentador","fermentadores")}:<ul>${u.map(x=>`<li>FV ${esc(x.tq)} · ${esc(x.lote)}${x.fecha?" · "+fmtS(x.fecha):""}${x.hl!=null?" · "+f(x.hl,0)+" Hl":""}${x.salida?(x.salida.destino==="DES"?" → descartada en "+esc(x.salida.destinoDescarte||"—"):" → cosecha "+esc(x.salida.nombre)):(x.activo?" → en fermentación":"")}</li>`).join("")}</ul>`:"<br>Todavía no se ha sembrado.";
    if(col.length) s+=`Ahora está en ${lista(col.map(([id,c])=>POS(id)+" ("+fHl(num(c.vol))+")"))}.`;
    return s; }
  function loteInfo(l){ const x=App.Traza.lote(l); if(!x) return `No encuentro el lote <b>${esc(l)}</b> en los registros.`; const s=x.sembrada, sal=x.salida; mem.last={kind:"lote",id:x.lote};
    return `<b>${esc(x.lote)}</b> (FV ${esc(x.tq??"—")}${x.marca?" · "+esc(x.marca):""}): ${s?`se sembró con <b>${esc(s.nombre)}</b>${s.generacion!=null?" (Gen "+s.generacion+")":""}${s.fecha?" el "+fmtS(s.fecha):""}${s.hl!=null?" · "+f(s.hl,0)+" Hl":""}.`:"no tengo registrada la levadura sembrada."}${sal?`<br>${sal.destino==="DES"?`La levadura se <b>descartó</b> en ${esc(sal.destinoDescarte||"—")} el ${fmtS(sal.retiro)}.`:`Se cosechó como <b>${esc(sal.nombre)}</b>${sal.generacion!=null?" (Gen "+sal.generacion+")":""} el ${fmtS(sal.retiro)}${(sal.colectores||[]).length?" hacia "+[...new Set(sal.colectores.map(c=>"C"+c.colector))].join(", "):""}.`}`:x.activo?"<br>La levadura aún está en el fermentador.":""}`; }
  function generacion(min){ const t=pend().filter(x=>{ const g=App.T.genResultante(x.r); return g!=null&&(min===8?g===8:g>=9); });
    const c=App.D.cols().filter(x=>{ const g=num(x.c.generacion); return g!=null&&(min===8?g+1===8:g+1>=9); });
    if(!t.length&&!c.length) return min===8?"Ninguna levadura pasará a <b>Gen 8</b> con las cosechas pendientes ni con lo que hay en colectores.":"Nada va a pasar a <b>Gen 9 o más</b>: no hay usos excepcionales previstos.";
    return `${min===8?"La Gen 8 es el <b>último ciclo recomendado</b>.":"Gen 9 o más es <b>uso excepcional</b> (se advierte, no se bloquea)."}${t.length?`<br>Cosechas pendientes:<ul>${t.map(x=>`<li>${linkFV(x.t)}: sembrada con ${esc((x.t.levadura||{}).nombre)} → saldrá como <b>${esc(x.r.nombreCosecha)}</b> (Gen ${App.T.genResultante(x.r)}).</li>`).join("")}</ul>`:""}${c.length?`En colector:<ul>${c.map(x=>`<li><b>${esc(x.c.nombre)}</b> (Gen ${x.c.generacion}) en ${POS(x.id)}.</li>`).join("")}</ul>`:""}`; }
  function levadurasPorGeneracion(g){ g=+g; const map=new Map();
    const add=(nombre,origen,detalle,estado)=>{ nombre=String(nombre||"").trim(); if(!nombre) return; const k=norm(nombre); if(!map.has(k)) map.set(k,{nombre,origen,detalle,estado}); else { const x=map.get(k); x.detalle=[x.detalle,detalle].filter(Boolean).join(" · "); } };
    Object.entries(App.S.colectores||{}).forEach(([id,c])=>{ if(+c.generacion!==g||!c.nombre) return; add(c.nombre,"En colector",`${POS(id)} · ${fHl(num(c.vol))}`,App.T.estadoLevColector(c).txt); });
    pend().forEach(x=>{ if(App.T.genResultante(x.r)!==g||!x.r.nombreCosecha) return; add(x.r.nombreCosecha,"Próxima cosecha",`FV ${x.t.tq} · ${x.t.lote||""}`,"En fermentación"); });
    const activos=map.size;
    Object.values(App.S.bdlev||{}).forEach(b=>{ if(b.destino==="DES"||+b.generacion!==g) return; add(b.nombre,"Histórico",`FV ${b.tq||"—"}${b.lote?" · "+b.lote:""}`,null); });
    const arr=[...map.values()];
    if(!arr.length) return `No encuentro levaduras de <b>Gen ${g}</b> en los datos registrados.`;
    const act=arr.filter(x=>x.origen!=="Histórico"), hist=arr.length-act.length;
    return `${act.length?`De <b>Gen ${g}</b> hay ${act.length} activa${act.length===1?"":"s"}:<ul>${act.map(x=>`<li><b>${esc(x.nombre)}</b> — ${esc(x.origen)} · ${esc(x.detalle||"")}${x.estado?` · <span class="small">${esc(x.estado)}</span>`:""}</li>`).join("")}</ul>`:`No hay levaduras de <b>Gen ${g}</b> activas ahora.`}${hist?` En el historial hay ${hist} cosecha${hist===1?"":"s"} más de esa generación.`:""}`; }
  function levadurasPorFamilia(fam){
    fam=String(fam||"").toUpperCase(); const levs=App.Traza.nombres().filter(n=>{ const p=App.Calc.parseLev(n); return p&&String(p.fam||"").toUpperCase()===fam; });
    if(!levs.length) return `No encuentro levaduras registradas de la familia <b>${esc(fam)}</b>.`;
    const rows=new Map(); levs.forEach(nombre=>App.Traza.usos(nombre).forEach(u=>{ const key=u.lote||`FV${u.tq}`; if(!rows.has(key)) rows.set(key,{...u,levaduras:new Set()}); rows.get(key).levaduras.add(nombre); }));
    const all=[...rows.values()].sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||"")));
    const activos=all.filter(x=>x.activo), historicos=all.filter(x=>!x.activo);
    const listaFilas=xs=>xs.slice(0,12).map(x=>`<li>${x.activo?`<b>En fermentación</b> · `:""}<a href="#/tanque/${esc(x.lote)}" data-bgo="tanque/${esc(x.lote)}">FV ${esc(x.tq)} · ${esc(x.lote)}</a>${x.fecha?` · ${fmtS(x.fecha)}`:""} · ${[...x.levaduras].map(esc).join(", ")}</li>`).join("");
    mem.last={kind:"fam",id:fam};
    if(!all.length) return `Encontré ${levs.length} levadura${levs.length===1?"":"s"} de la familia <b>${esc(fam)}</b>, pero no hay siembras asociadas en el historial.`;
    return `La familia <b>${esc(fam)}</b> aparece en <b>${all.length}</b> FV${activos.length?`; ${activos.length} siguen activos`:""}.${activos.length?`<br><b>Ahora en fermentación</b><ul>${listaFilas(activos)}</ul>`:""}${historicos.length?`<br><b>Siembras anteriores</b> (${historicos.length})<ul>${listaFilas(historicos)}</ul>`:""}${all.length>12?`<br>Mostré los 12 movimientos más recientes.`:""}`;
  }

  function generacionesActuales(){ const rows={};
    pend().forEach(x=>{ const g=App.T.genResultante(x.r); if(g!=null) (rows[g]??=[]).push(`FV ${x.t.tq}`); });
    App.D.cols().forEach(x=>{ const g=num(x.c.generacion); if(g!=null) (rows[g]??=[]).push(POS(x.id)); });
    const ks=Object.keys(rows).map(Number).sort((a,b)=>b-a);
    if(!ks.length) return "No veo generaciones activas ni proyectadas en este momento.";
    return `Así van las generaciones (activas y próximas cosechas):<ul>${ks.map(g=>`<li><b>Gen ${g}</b> — ${rows[g].slice(0,6).map(esc).join(", ")}${rows[g].length>6?"…":""}${g>=9?' · <span class="small">uso excepcional</span>':g===8?' · <span class="small">último ciclo</span>':""}</li>`).join("")}</ul>`; }
  function genealogiaTexto(nombre){ const target=App.Traza.N(nombre), parents={}, children={}; mem.last={kind:"lev",id:target};
    Object.values(App.S.bdlev||{}).forEach(b=>{ const child=App.Traza.N(b.nombre), parent=App.Traza.N(b.levSembrada); if(!child||!parent) return; (parents[child]??=[]).push({name:parent,gen:b.generacion}); (children[parent]??=[]).push({name:child,gen:b.generacion}); });
    if(!parents[target]&&!children[target]) return `No encuentro relación genética registrada para <b>${esc(target)}</b>. Si ya se cosechó o sembró, revisa que el campo <b>levadura sembrada</b> haya quedado registrado.`;
    const anc=[]; let cur=target; const seen=new Set([cur]);
    for(let i=0;i<8;i++){ const p=(parents[cur]||[])[0]; if(!p||seen.has(p.name)) break; anc.unshift(p); cur=p.name; seen.add(cur); }
    const desc=[], qq=[target], sd=new Set([target]);
    while(qq.length&&desc.length<30){ const n=qq.shift(); for(const c of (children[n]||[])) if(!sd.has(c.name)){ sd.add(c.name); desc.push(c); qq.push(c.name); } }
    return `<b>Genealogía de ${esc(target)}</b><br>${anc.length?`Viene de: ${anc.map(a=>esc(a.name)).join(" → ")} → <b>${esc(target)}</b>.`:"Su origen no está registrado."}<br>${desc.length?`Descendencia (${desc.length}): ${desc.slice(0,12).map(d=>esc(d.name)+(d.gen!=null?" (Gen "+esc(d.gen)+")":"")).join(", ")}${desc.length>12?"…":""}.`:"Todavía no tiene descendencia registrada."}`; }
  function resumenOperacion(){ const P=pend(), ret=P.filter(x=>["rojo","naranja","verde"].includes(x.st.k)), venc=P.filter(x=>x.st.k==="rojo"), cols=colItems(), tot=cols.reduce((s,x)=>s+(x.vol||0),0);
    let s=`${pick("res",["Así vamos:","Te resumo cómo está todo:","Panorama actual:"])}<ul><li><b>${P.length}</b> FV con levadura en fermentación${ret.length?`; <b>${ret.length}</b> en ventana de retiro${venc.length?` (${venc.length} ${pl(venc.length,"vencido","vencidos")})`:""}`:""}.</li><li><b>${fHl(tot)}</b> en ${cols.length} ${pl(cols.length,"posición","posiciones")} de colector.</li></ul>`;
    if(ret.length) s+=`Lo primero sería ${linkFV(ret[0].t)} (${esc(App.T.estado(ret[0].st).txt.toLowerCase())}).`;
    return s; }
  function descartes(){ const it=colItems().filter(x=>x.estado!=="Disponible");
    if(!it.length) return "No hay levaduras marcadas para descarte ni pendientes de decisión.";
    return `${it.length===1?"Hay una":"Hay "+it.length} en colector que ${pl(it.length,"necesita","necesitan")} decisión:<ul>${it.map(x=>`<li><b>${esc(x.nombre)}</b> en ${x.pos} — ${esc(x.estado)}</li>`).join("")}</ul>`; }
  function recomendar(){ const P=pend(), urg=P.filter(x=>["rojo","naranja"].includes(x.st.k)), dec=colItems().filter(x=>x.estado==="Pendiente de decisión");
    const out=[]; urg.slice(0,3).forEach(x=>out.push(`${linkFV(x.t)}: ${esc(App.T.estado(x.st).txt.toLowerCase())}`)); dec.forEach(x=>out.push(`${esc(x.nombre)} en ${x.pos}: pasó el tiempo para sembrar`));
    if(out.length){ if(urg.length) mem.last={kind:"fv",id:urg[0].t.lote}; return `Yo revisaría primero:<ol>${out.map(x=>`<li>${x}</li>`).join("")}</ol>`; }
    const sig=P.filter(x=>x.r.t0).sort((a,b)=>a.r.t0-b.r.t0).find(x=>x.st.k!=="verde")||P.find(x=>x.st.k==="verde");
    if(sig){ mem.last={kind:"fv",id:sig.t.lote}; return `No veo nada urgente. ${sig.st.k==="verde"?`${linkFV(sig.t)} ya está listo para retirar.`:`Lo próximo es ${linkFV(sig.t)}, con T0 ${C.rel(sig.r.t0)}.`}`; }
    return "No veo nada urgente por ahora. 👌"; }

  /* ------------------------------------------------------------
     4. ANÁLISIS: mayor, menor, promedio, nivel habitual
     ------------------------------------------------------------ */
  function conjunto(a){ if(a.has("FV")||a.has("ATEN")||a.has("EXT")||a.has("CERCA")||a.has("AVANCE")) return "fv"; if(a.has("COL")||a.has("LEV")||a.has("INV")||a.has("VIAB")||a.has("CONS")||a.has("TIEMPOCOL")) return "col"; return mem.list?mem.list.kind:"col"; }
  function metrica(a,k){ if(k==="col") return a.has("VIAB")?"viab":a.has("CONS")?"cons":a.has("TIEMPOCOL")?"lleva":"vol";
    return a.has("CERCA")||a.has("T0")?"t0":a.has("EXT")?"ext":a.has("ATEN")||a.has("AVANCE")?"att":"vol"; }
  const MET={vol:{lab:"volumen",fmt:fHl},viab:{lab:"viabilidad",fem:1,fmt:v=>pc(v,1)},cons:{lab:"consistencia",fem:1,fmt:v=>pc(v,1)},lleva:{lab:"tiempo en colector",fmt:v=>dur(v)},att:{lab:"atenuación",fem:1,fmt:v=>pc(v,0)},ext:{lab:"extracto",fmt:v=>f(v)+" °P"},t0:{lab:"T0",fmt:v=>fmtS(v)}};
  const nomItem=x=>x.kind==="col"?`<b>${esc(x.nombre)}</b> (${x.pos})`:`<b>FV ${x.t.tq}</b>${x.nombre?" ("+esc(x.nombre)+")":""}`;
  function extremo(a){ const k=conjunto(a), m=metrica(a,k); let dir=(a.has("MIN")||/\bmenos\b/.test(a.q))?"min":"max";
    if(m==="t0") dir="min"; // "más cerca / más pronto" = el T0 más temprano
    if(k==="fv"&&m==="vol") return {h:`No tengo registrado el volumen de levadura dentro de cada FV; ese dato se conoce cuando se retira. Lo que sí puedo comparar es cuál va más avanzado en atenuación o cuál tiene el T0 más cerca.`,opts:[{label:"Más avanzado en atenuación",q:"cual fv va mas avanzado en atenuacion"},{label:"T0 más cerca",q:"cual fv tiene el t0 mas cerca"}]};
    const items=(mem.list&&mem.list.kind===k?mem.list.items:(k==="col"?colItems():fvItems())), con=items.filter(x=>x[m]!=null);
    if(!items.length) return k==="col"?"No hay levadura en colectores para comparar.":"No hay FV activos para comparar.";
    if(!con.length) return `No tengo ${MET[m].lab} ${MET[m].fem?"registrada":"registrado"} para ${k==="col"?"las levaduras en colector":"los FV activos"}.`;
    const best=dir==="max"?Math.max(...con.map(x=>x[m])):Math.min(...con.map(x=>x[m])), top=con.filter(x=>x[m]===best);
    const sinDato=items.filter(x=>x[m]==null), nota=sinDato.length?` ${lista(sinDato.map(nomItem))} no ${pl(sinDato.length,"tiene","tienen")} ${MET[m].lab} ${MET[m].fem?"registrada":"registrado"}.`:"";
    if(top.length===con.length&&con.length>1) return `${sinDato.length?"Las que tienen dato están":"Todas están"} igual: ${MET[m].fmt(best)} de ${MET[m].lab}.${nota}`;
    mem.last=top[0].kind==="col"?{kind:"lev",id:App.Traza.N(top[0].nombre)}:{kind:"fv",id:top[0].id};
    const verbo=m==="vol"?(dir==="max"?"tiene más":"tiene menos"):m==="t0"?"tiene el T0 más cerca":m==="lleva"?(dir==="max"?"lleva más tiempo":"lleva menos tiempo"):m==="ext"?(dir==="max"?"tiene el extracto más alto":"tiene el extracto más bajo"):(dir==="max"?`tiene mayor ${MET[m].lab}`:`tiene menor ${MET[m].lab}`);
    if(top.length>1) return `Hay empate: ${lista(top.map(nomItem))}, con ${MET[m].fmt(best)} cada una.${nota}`;
    const x=top[0]; return `${x.kind==="col"?"La que":"El que"} ${verbo} es ${nomItem(x)}: ${MET[m].fmt(best)}${m==="t0"?" ("+C.rel(best)+")":""}.${nota}`; }
  function bajoHabitual(a){ const k=conjunto(a)==="fv"&&!a.has("COL")?"fv":"col", m=metrica(a,k);
    if(k==="fv"&&m==="vol") return extremo(a);
    const items=k==="col"?colItems():fvItems(), con=items.filter(x=>x[m]!=null); if(con.length<2) return "No hay suficientes datos para comparar contra un nivel habitual.";
    const cfg=(App.S.config.niveles||{})[m+"Min"]; const ref=cfg!=null?num(cfg):con.reduce((s,x)=>s+x[m],0)/con.length;
    const bajo=con.filter(x=>x[m]<ref-(cfg!=null?0:Math.abs(ref)*0.02));
    const base=cfg!=null?`el mínimo configurado (${MET[m].fmt(ref)})`:`el promedio del grupo (${MET[m].fmt(ref)}), porque no hay un nivel mínimo configurado en la plataforma`;
    mem.list={kind:k,items};
    if(!bajo.length) return `Comparando con ${base}: ninguna está por debajo. 👌`;
    return `Comparando con ${base}, ${bajo.length===1?"está por debajo":"están por debajo"}:<ul>${bajo.map(x=>`<li>${nomItem(x)} — ${MET[m].fmt(x[m])}</li>`).join("")}</ul>`; }

  /* ------------------------------------------------------------
     5. CONCEPTOS
     ------------------------------------------------------------ */
  const CONCEPTOS={ t0:"El <b>T0</b> es el momento en que la levadura queda lista para retirar. Se calcula con la curva de extracto: con los puntos del 15 % y el 75 % de atenuación se traza una recta y se mira cuándo llegaría al extracto límite. Desde ahí empieza la ventana: lo ideal es retirar hacia T0 + 12 h y el máximo es T0 + 24 h.",
    atenuacion:"La <b>atenuación</b> es cuánto ha bajado el extracto respecto a lo que puede bajar: (E.O − extracto actual) / (E.O − extracto límite). El 15 % y el 75 % son los puntos de referencia para calcular el T0.",
    generacion:"Cada cosecha sube una <b>generación</b>: si se siembra Gen 7, la cosecha sale Gen 8. Gen 8 es el último ciclo recomendado; Gen 9 y 10 son uso excepcional (se advierte, no se bloquea).",
    estados:"En colector la levadura puede estar <b>Disponible</b> (dentro del tiempo para sembrar), <b>Marcada para descarte</b>, <b>Pendiente de decisión</b> (pasó el último momento para sembrar) o <b>Descartada</b> (queda en el historial).",
    colector:"Cada colector tiene 2 posiciones. El <b>tiempo en colector</b> cuenta desde el ingreso, y el último momento para sembrar es el fin de remoción + 4 días.",
    trazabilidad:"La <b>trazabilidad</b> une cada levadura con los fermentadores donde se sembró y con la cosecha que salió de cada uno, por ejemplo: LI3F11 → FV 11 · F234 → cosecha LI4F11 → FV 30 · F474.",
    viabilidad:"La <b>viabilidad</b> es el porcentaje de células vivas en la levadura cosechada. Se registra al retirar y la ves en cada posición de colector.",
    consistencia:"La <b>consistencia</b> es la proporción de sólidos de la levadura cosechada; se registra en el retiro junto con la viabilidad." };
  function conceptoDe(a){ if(a.has("T0")) return "t0"; if(a.has("ATEN")) return "atenuacion"; if(a.has("VIAB")) return "viabilidad"; if(a.has("CONS")) return "consistencia"; if(a.has("TRAZA")) return "trazabilidad"; if(a.has("GEN")) return "generacion"; if(/\bestados?\b/.test(a.q)) return "estados"; if(a.has("COL")||a.has("TIEMPOCOL")||a.has("SIEMBRA")) return "colector"; return null; }

  /* ------------------------------------------------------------
     6. DIAGNÓSTICO (sin cambios de fondo; liberar pide autorización)
     ------------------------------------------------------------ */
  function diagnosticar(){ const out=[], now=Date.now(), P=App.pendientes();
    App.errores.slice(-5).forEach(e=>out.push({sev:"rojo",que:"Error de JavaScript: "+e.msg,porque:"Una parte de la aplicación falló al ejecutarse"+(e.src?" ("+e.src+")":"")+".",impacto:"La acción que se estaba haciendo pudo no completarse.",solucion:"Recargar la página y repetir la acción."}));
    const porTq={}; P.forEach(t=>{ (porTq[t.tq]=porTq[t.tq]||[]).push(t.lote); });
    Object.entries(porTq).filter(([,l])=>l.length>1).forEach(([tq,l])=>out.push({sev:"rojo",que:`FV ${tq} tiene ${l.length} lotes activos (${l.join(", ")})`,porque:"Se registró un tanque sin retirar la levadura anterior.",impacto:"El inventario muestra dos levaduras para un mismo fermentador.",solucion:"Retirar la levadura del lote correcto y eliminar el lote sobrante."}));
    P.forEach(t=>{ const r=App.Calc.tanque(t,now);
      if(!(t.levadura||{}).nombre) out.push({sev:"amarillo",que:`FV ${t.tq} · ${t.lote} no tiene levadura sembrada registrada`,porque:"Se creó el tanque con “Registrar después”.",impacto:"No se puede armar el nombre ni la generación de la cosecha.",solucion:"Registrar la levadura sembrada en “Editar”.",fix:{label:"Abrir FV "+t.tq,go:"tanque/"+t.lote}});
      if(r.T.tipo==="proy"&&r.fin&&now-r.fin>36*HOUR) out.push({sev:"amarillo",que:`FV ${t.tq}: T0 proyectado por días de la marca`,porque:"Falta: "+r.T.faltan.join(", ")+".",impacto:"El T0 no refleja la fermentación real.",solucion:"Registrar extracto límite y muestras.",fix:{label:"Abrir FV "+t.tq,go:"tanque/"+t.lote}});
      if(t.borradorRetiro&&now-parseDT(t.borradorRetiro.t)>24*HOUR) out.push({sev:"amarillo",que:`FV ${t.tq} tiene un borrador de retiro sin registrar desde ${fmtS(t.borradorRetiro.t)}`,porque:"Se empezó a diligenciar el retiro y no se terminó.",impacto:"La levadura sigue en el inventario aunque quizá ya se retiró.",solucion:"Abrir “Retirar levadura”, revisar y registrar.",fix:{label:"Abrir retiro",act:"retiro:"+t.lote}});
      const g=App.T.genResultante(r); if(g!=null&&g>=9) out.push({sev:"naranja",que:`FV ${t.tq}: la cosecha pasará a Gen ${g}`,porque:"La levadura sembrada ya tenía Gen "+(g-1)+".",impacto:"Uso excepcional de levadura.",solucion:"Decidir si se cosecha o se descarta al retirar."}); });
    Object.entries(App.S.colectores).forEach(([id,c])=>{ if(num(c.vol)!=null&&num(c.vol)<=0) out.push({sev:"rojo",que:`${POS(id)} figura ocupada con volumen ${f(num(c.vol),0)} Hl`,porque:"El volumen llegó a cero sin liberar la posición.",impacto:"La posición se ve ocupada aunque está vacía.",solucion:"Archivar la ocupación y liberar la posición.",fix:{label:"Liberar "+POS(id),nivel:"pin",run:async()=>{ await App.Act.archivarPosicion(id,c,"Liberada por Cifra (volumen 0)"); await App.Store.del("colectores",id); },verif:()=>!App.S.colectores[id]}});
      const e=App.T.estadoLevColector(c,now); if(e.k==="amarillo") out.push({sev:"naranja",que:`${c.nombre} en ${POS(id)} pasó el último momento para sembrar`,porque:"Se cumplieron los 4 días desde el fin de remoción.",impacto:"Está pendiente de decisión.",solucion:"Marcarla para descarte o liberar el colector.",fix:{label:"Ver colectores",go:"colectores"}}); });
    if(App.Store.mode==="local") out.push({sev:"amarillo",que:"Los datos se guardan solo en este navegador",porque:"La aplicación está en modo local.",impacto:"Otros usuarios no ven los cambios y se pierden si se borra el navegador.",solucion:"Usar la versión publicada o conectar la base de datos."});
    if(!(App.S.config.seguridad||{}).hash) out.push({sev:"amarillo",que:"La contraseña de autorización sigue siendo la inicial",porque:"Nunca se ha cambiado.",impacto:"Cualquiera que conozca la inicial puede autorizar cambios críticos.",solucion:"Cambiarla con el botón 🔒 de Cifra o diciéndome “quiero cambiar la contraseña”."});
    return out.sort((a,b)=>ORD[a.sev]-ORD[b.sev]); }
  function diagHTML(l){ if(!l.length) return "Revisé errores, cálculos, tanques, retiros, borradores, colectores y generaciones: <b>no encontré problemas</b>. 👌";
    return `Revisé la aplicación y encontré <b>${l.length}</b> ${pl(l.length,"punto","puntos")}:<ol class="diag">${l.map((x,i)=>`<li>${C.status({k:x.sev,txt:x.sev==="rojo"?"Acción necesaria":x.sev==="naranja"?"Atención":"Seguimiento"})}<b>${esc(x.que)}</b><br><span class="small"><b>Por qué:</b> ${esc(x.porque)} <b>Impacto:</b> ${esc(x.impacto)} <b>Solución:</b> ${esc(x.solucion)}</span>${x.fix?`<br><button class="btn sm" type="button" data-bact="fix:${i}">${esc(x.fix.run?"Solucionar":x.fix.label)}</button>`:""}</li>`).join("")}</ol>Si quieres, dime <b>“soluciónalo”</b> o <b>“guíame”</b>.`; }
  async function aplicarFix(i){ const x=diag&&diag[i]; if(!x||!x.fix) return; if(x.fix.go){ App.go(x.fix.go); return; } if(x.fix.act){ const [a,l]=x.fix.act.split(":"); if(a==="retiro") App.Inv.retiro(l); return; }
    decir(`Voy a hacer esto: <b>${esc(x.solucion)}</b>`); const ok=x.fix.nivel==="pin"?await App.Sec.pin(x.que):await App.Sec.confirmar("¿Aplicar la solución?",esc(x.solucion),"Aplicar"); if(!ok){ decir("Listo, no cambié nada."); return; }
    try{ await x.fix.run(); const v=x.fix.verif?x.fix.verif():true; decir(v?"✅ Hecho y verificado.":"Se aplicó, pero la verificación no pasó. Revísalo."); }catch(e){ decir("No se pudo aplicar: "+esc(e.message||e)); } }
  function guiar(){ const l=(diag||diagnosticar()).filter(x=>x.solucion); if(!l.length) return "No hay nada que corregir en este momento."; guia={pasos:l,i:0}; return pasoGuia(); }
  function pasoGuia(){ const x=guia.pasos[guia.i]; return `<b>Paso ${guia.i+1} de ${guia.pasos.length}: ${esc(x.que)}</b><br><b>Qué hacer:</b> ${esc(x.solucion)}<br><b>Por qué:</b> ${esc(x.impacto)}<br>${guia.i<guia.pasos.length-1?`<button class="btn sm" type="button" data-bact="sig">Hecho, siguiente</button>`:"Ese era el último."}`; }

  /* ------------------------------------------------------------
     7. CONTRASEÑA (solo cuando se pide; se cambia desde Cifra)
     ------------------------------------------------------------ */
  async function cambiarPwd(){ const v=await App.UI.form({title:"🔒 Cambiar contraseña de autorización",intro:"Se usa solo para cambios críticos.",fields:[{k:"a",l:"Contraseña actual",t:"pwd",req:true},{k:"n",l:"Nueva contraseña (mínimo 6 caracteres)",t:"pwd",req:true},{k:"c",l:"Confirmar nueva contraseña",t:"pwd",req:true}],ok:"Cambiar contraseña"});
    if(!v){ decir("Listo, la dejé como estaba."); return; } const r=await App.Sec.cambiar(v.a,v.n,v.c); decir(r.ok?"✅ "+esc(r.msg):esc(r.msg)+(r.ok?"":" Si quieres, lo intentamos otra vez.")); }

  /* ------------------------------------------------------------
     8. INTERPRETACIÓN → RESPUESTA
     ------------------------------------------------------------ */
  const SOCIAL=["SALUDO","GRACIAS","OK","ADIOS","BIEN","COMOESTAS","QUIEN","WH","PRON","INTENS","NEUTRO"];
  const REF=new Set([...SOCIAL,"POR_QUE","QUE_ES","AYUDA","ESTADO","T0"]);
  const soloRef=a=>[...a.K].every(k=>REF.has(k));
  const RELLENO=new Set("y e o a la el los las lo de del con para por pues bueno oye mira muy tu usted te me mi levabot cifra bot parce parcero hermano amigo man socio igual tambien nada mas todo ok si no ya que como estas esta".split(" "));
  function socialTipo(a){ if(Object.keys(a.ent).length) return null; const fuertes=[...a.K].filter(k=>!SOCIAL.includes(k)); if(fuertes.length) return null;
    if(a.has("QUIEN")) return "quien"; if(a.has("COMOESTAS")) return "comoestas"; if(a.has("GRACIAS")) return "gracias"; if(a.has("ADIOS")) return "adios";
    const raros=a.toks.filter(t=>!RELLENO.has(t)&&!VOCAB.has(t)&&!fuzzy(t)); if(raros.length>1) return null;
    if(a.has("SALUDO")) return "saludo"; if(a.has("BIEN")) return "bien"; if(a.has("OK")) return "ok"; return null; }
  function respSocial(t,a){ switch(t){
    case "saludo": { const mm=/buen(?:os|as)? (dias|tardes|noches)|buen dia/.exec(a.q), h=mm?({dias:"Buenos días",tardes:"Buenas tardes",noches:"Buenas noches"}[mm[1]]||"Buenos días"):null; return h?pick("sh",[`¡${h}! 👋 ¿En qué te ayudo?`,`¡${h}! ¿Qué necesitas revisar?`]):pick("s",["¡Hola! 👋 ¿Cómo estás? ¿En qué te ayudo?","¡Hola! ¿Qué necesitas revisar?","¡Buenas! 👋 Cuéntame, ¿en qué te ayudo?","¡Hola! Aquí estoy. ¿Qué miramos?"]); }
    case "comoestas": return pick("ce",["Muy bien, gracias 😊 ¿Y tú? ¿En qué te ayudo?","Todo en orden por aquí. ¿Qué necesitas?","Bien, con los datos al día. ¿Qué revisamos?"]);
    case "bien": return pick("bn",["¡Qué bien! 😊 ¿En qué te ayudo?","Me alegra. Cuéntame qué necesitas."]);
    case "gracias": return pick("g",["¡Con gusto!","¡Con gusto! 🙌","Para eso estoy.","¡A la orden!"]);
    case "ok": return pick("ok",["👌","Perfecto.","Listo.","👍"]);
    case "adios": return pick("ad",["¡Hasta luego! 👋","Listo, aquí estaré cuando me necesites.","¡Que te rinda el turno! 👋"]);
    case "quien": return "Soy Cifra, el asistente de esta plataforma. Conozco los datos de tanques, colectores y levaduras, así que puedes preguntarme lo que necesites como se lo preguntarías a un compañero."; } }

  function porNumero(n,a){ const c=[];
    if(tqPorNum(n)||ultimoDeFV(n)) c.push({k:"fv",label:`El FV ${n}`,q:`fv ${n}`,kw:["fv","tanque","fermentador"]});
    if(n<=12&&colExiste(n)&&Object.keys(App.S.colectores).some(k=>k.startsWith("c"+n+"-"))) c.push({k:"col",label:`El colector C${n}`,q:`colector ${n}`,kw:["colector","c"]});
    if(n>=100&&App.Traza.lote("F"+n)) c.push({k:"lote",label:`El lote F${n}`,q:`lote f${n}`,kw:["lote","f"]});
    if(!c.length) return `No encuentro nada registrado con el número <b>${n}</b>: ni un FV activo, ni un colector, ni el lote F${n}. ¿Me das un poco más de detalle?`;
    let elegido=c.length===1?c[0]:null;
    if(!elegido&&mem.last){ const lk=mem.last.kind==="lev"?null:mem.last.kind; elegido=c.find(x=>x.k===lk)||null; }
    if(elegido){ const ent=Object.assign({},a.ent); delete ent.num; ent[elegido.k==="lote"?"lote":elegido.k]=elegido.k==="lote"?"F"+n:n; return interpretar(Object.assign({},a,{ent})); }
    return {h:`${pick("amb",["¿Te refieres a","¿Hablas de"])} ${lista(c.map(x=>x.label.replace(/^El/,"el")))}?`,opts:c}; }

  function consultaLocalExtra(a){
    if(/fuera de limites|fuera del limite|que esta fuera/.test(a.q)){
      const rows=App.BDM.registros().filter(r=>r.st!=="anulado"&&r.st!=="incompleto").map(r=>({r,q:App.BDM.calidad(r)})).filter(x=>x.q.length);
      return rows.length?"Fuera de límites según el Excel:<ul>"+rows.slice(0,20).map(x=>"<li><b>"+esc(x.r.nombre||x.r.id)+"</b> · FV "+esc(x.r.tq||"—")+" — "+x.q.map(y=>esc(y.lab)+" "+esc(y.r)).join("; ")+"</li>").join("")+"</ul>":"Revisé los límites del Excel: no encontré registros fuera de límite en lo disponible.";
    }
    const vc=a.q.match(/viabilidad\s+(menor|mayor)\s+a\s+(\d+(?:\.\d+)?)/);
    if(vc&&(a.ent.gen!=null||a.ent.fam)){const limit=+vc[2], rs=App.BDM.registros().filter(r=>r.st!=="anulado"&&r.st!=="incompleto").filter(r=>{const p=App.Calc.parseLev(r.nombre),g=+r.generacion, f=String(p&&p.fam||"").toUpperCase(),v=num(r.viab);if(a.ent.gen!=null&&g!==a.ent.gen)return false;if(a.ent.fam&&f!==a.ent.fam)return false;if(v==null)return false;const n=v<=1?v*100:v;return vc[1]==="menor"?n<limit:n>limit;});
      return rs.length?"Encontré "+rs.length+" registros que cumplen el filtro:<ul>"+rs.slice(0,30).map(r=>"<li><b>"+esc(r.nombre||r.id)+"</b> · "+esc(r.marca||"—")+" · Familia "+esc((App.Calc.parseLev(r.nombre)||{}).fam||"—")+" · Gen "+esc(r.generacion??"—")+" · "+pc(r.viab)+"</li>").join("")+"</ul>":"No encontré levaduras que cumplan ese filtro con los datos registrados.";}
    if(a.ent.gen!=null&&a.ent.gen>=8||/generaciones altas|gen 8 o mas|gen 9/.test(a.q)) return generacion(a.ent.gen===8?8:9);
    const months="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" ");
    const cmp=a.q.match(/viabilidad[^.]*?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[^.]*(?:vs|versus|con|y)[^.]*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
    if(cmp){const avg=name=>{const ix=months.indexOf(name),rs=App.BDM.registros().filter(r=>{if(r.st==="anulado"||num(r.viab)==null)return false;const raw=String(r.retiro||"");const mm=/^\d{4}-\d{2}/.test(raw)?Number(raw.slice(5,7))-1:(parseDT(r.retiro)||new Date(0)).getMonth();return mm===ix;});return rs.length?{n:rs.length,v:rs.reduce((z,r)=>z+num(r.viab),0)/rs.length}:null;},x=avg(cmp[1]),y=avg(cmp[2]);return (x?cmp[1]+": <b>"+pc(x.v)+"</b> ("+x.n+" cosechas).":"No hay datos de "+cmp[1]+".")+"<br>"+(y?cmp[2]+": <b>"+pc(y.v)+"</b> ("+y.n+" cosechas).":"No hay datos de "+cmp[2]+".")+(x&&y?"<br>Diferencia: <b>"+pc(x.v-y.v)+"</b>.":"");}
    let from=null,to=null,period="";
    if(a.ent.year){from=new Date(a.ent.year,0,1);to=new Date(a.ent.year,11,31,23,59,59);period=String(a.ent.year);}
    else if(/esta semana/.test(a.q)){from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-(from.getDay()+6)%7);to=new Date();period="esta semana";}
    else if(/semana pasada/.test(a.q)){to=new Date();to.setHours(0,0,0,0);to.setDate(to.getDate()-(to.getDay()+6)%7);from=new Date(+to-7*86400000);to=new Date(+to-1);period="la semana pasada";}
    else if(a.ent.month){from=new Date(new Date().getFullYear(),a.ent.month-1,1);to=new Date(new Date().getFullYear(),a.ent.month,0,23,59,59);period=from.toLocaleDateString("es-CO",{month:"long",year:"numeric"});}
    else if(/este mes/.test(a.q)){from=new Date(new Date().getFullYear(),new Date().getMonth(),1);to=new Date();period="este mes";}
    if(from&&(a.has("RET")||a.has("SIEMBRA")||a.has("DESCARTE")||a.ent.year||a.ent.month)){
      let mv=App.BDM.movimientos().filter(x=>{const d=parseDT(x.t);return d&&d>=+from&&d<=+to;});
      if(a.has("RET"))mv=mv.filter(x=>x.tipo==="entrada"||/cosech/.test(x.det||""));
      if(a.has("SIEMBRA"))mv=mv.filter(x=>x.tipo==="siembra");
      if(a.has("DESCARTE"))mv=mv.filter(x=>x.tipo==="descarte");
      if(a.ent.fam)mv=mv.filter(x=>String((App.Calc.parseLev(x.nombre)||{}).fam||"").toUpperCase()===a.ent.fam);
      if(/light/.test(a.q))mv=mv.filter(x=>String(x.marca||"").toUpperCase()==="LIGHT");
      return mv.length?"Encontré <b>"+mv.length+"</b> movimientos para "+esc(period)+":<ul>"+mv.slice(0,15).map(x=>"<li>"+esc(x.tipo)+" · <b>"+esc(x.nombre)+"</b> · "+esc(x.det||"")+" · "+fmtS(x.t)+"</li>").join("")+"</ul>":"No hay movimientos registrados para "+esc(period)+".";
    }
    if(/curva/.test(a.q)&&a.ent.fv!=null){
      const t=tqPorNum(a.ent.fv);if(!t)return "No encuentro ese FV activo.";
      const pts=App.Calc.tanque(t).pts.filter(p=>p.e!=null);if(pts.length<2)return "FV "+t.tq+" tiene menos de dos muestras; necesito más datos reales para dibujar su curva.";
      const lo=Math.min(...pts.map(p=>p.e)),hi=Math.max(...pts.map(p=>p.e)),span=hi-lo||1,coords=pts.map((p,i)=>(20+i*280/(pts.length-1))+","+(105-(p.e-lo)/span*80)).join(" ");
      return "<b>Curva real de extracto · FV "+esc(t.tq)+"</b><svg class='bot-chart' viewBox='0 0 320 125' role='img' aria-label='Curva de extracto FV "+esc(t.tq)+"'><polyline points='"+coords+"' fill='none' stroke='var(--accent)' stroke-width='3'/></svg><small>"+pts.length+" muestras registradas · sin proyección.</small>";
    }
    return null;
  }
  function accionLocal(a){
    const raw=a.raw||"",q=a.q;let m;
    if(/registra muestra/.test(q)){
      m=raw.match(/fv\s*(\d{1,2}).*?extracto\s*(\d+(?:[.,]\d+)?)(?:.*?(\d{1,2}:\d{2}))?/i);
      if(!m)return null;const t=tqPorNum(+m[1]);if(!t)return {h:"No encuentro ese FV activo; no guardé cambios."};
      const r=App.Calc.tanque(t),ext=Number(m[2].replace(",",".")),dt=new Date();if(m[3])dt.setHours(+m[3].slice(0,2),+m[3].slice(3,5),0,0);
      if(r.eo!=null&&ext>r.eo)return {h:"No guardé la muestra: supera el E.O. registrado ("+f(r.eo)+" °P)."};
      if(r.fin&&dt<r.fin)return {h:"No guardé la muestra: la hora es anterior al fin de llenado."};
      const prev=(r.pts||[]).filter(x=>x.t<dt).pop(),warn=prev&&ext>prev.e+.3;
      return {h:"<b>Muestra propuesta · FV "+esc(t.tq)+" · "+esc(t.lote)+"</b><br>"+f(ext,2)+" °P · "+fmtS(dt.toISOString())+(warn?"<br>Advertencia: el extracto sube frente a la medición anterior.":""),
        after:async()=>{if(warn&&!await App.Sec.confirmar("Revisar muestra","El extracto sube frente al punto anterior. ¿Confirmas este dato?","Revisar"))return;if(!await App.Sec.confirmar("¿Guardar muestra?","FV "+esc(t.tq)+" · "+f(ext,2)+" °P · "+fmtS(dt.toISOString()),"Guardar"))return;const d=App.U.clone(t);d.muestras=(d.muestras||[]).concat([{t:dt.toISOString(),ext}]);if(await App.Store.set("tanques",t.lote,d)&&App.S.tanques[t.lote].muestras.some(x=>x.t===dt.toISOString()&&num(x.ext)===ext))decir("Muestra guardada y verificada para FV "+esc(t.tq)+".");else decir("No pude verificar el guardado. Revisa el registro antes de intentarlo otra vez.");}};
    }
    if(/marca c\d+ p[12] para descarte/.test(q)){
      m=q.match(/marca (c\d+ p[12])/);if(!m)return null;const id=m[1].replace(/\s*p/i,"-").replace("p","").toLowerCase(),c=App.S.colectores[id];if(!c)return {h:"No encuentro ocupada esa posición de colector."};
      const reason=(q.match(/porque (.+)$/)||[])[1]||"Motivo indicado por el usuario";
      return {h:"Vas a marcar <b>"+esc(c.nombre)+"</b> en "+POS(id)+" para descarte.<br>Motivo: "+esc(reason)+". Se pedirá el motivo en el formulario existente.",after:async()=>{if(await App.Sec.confirmar("¿Marcar para descarte?",esc(c.nombre)+" · "+POS(id)+" · "+esc(reason),"Confirmar")){await App.Act.marcarDescarte(id,{motivo:reason,confirmado:true});if(App.S.colectores[id]?.marcaDescarte?.motivo===reason)decir("Descarte propuesto y guardado en "+POS(id)+".");}}};
    }
    if(/marca c\d+ p[12] para recosecha|marca c\d+ p[12] para recosechar/.test(q)){
      m=q.match(/marca (c\d+ p[12])/);if(!m)return null;const id=m[1].replace(/\s*p/i,"-").replace("p","").toLowerCase(),c=App.S.colectores[id];if(!c)return {h:"No encuentro ocupada esa posición de colector."};
      return {h:"Vas a proponer recosecha de <b>"+esc(c.nombre)+"</b> en "+POS(id)+".",after:async()=>{if(!await App.Sec.confirmar("¿Proponer recosecha?",esc(c.nombre)+" · "+POS(id),"Confirmar"))return;await App.Act.recos(id);if(App.S.colectores[id]?.recosechar)decir("Recosecha propuesta y verificada para "+esc(c.nombre)+" · "+POS(id)+".");}};
    }
    if(/saca \d/.test(q)){
      m=raw.match(/saca\s*(\d+(?:[.,]\d+)?)\s*hl.*?(c\d+\s*p[12]).*?fv\s*(\d+)/i);if(!m)return null;const id=m[2].toLowerCase().replace(/\s*p/i,"-").replace("p",""),vol=Number(m[1].replace(",",".")),c=App.S.colectores[id];
      if(!c)return {h:"No encuentro la posición de colector indicada."};if(vol<=0||vol>num(c.vol))return {h:"No puedo sacar "+fHl(vol)+"; "+POS(id)+" tiene "+fHl(num(c.vol))+"."};
      return {h:"Se abrirá el formulario validado para sacar "+fHl(vol)+" de "+esc(c.nombre)+" desde "+POS(id)+" hacia FV "+m[3]+".",after:async()=>{const ok=await App.BD.salida(id,{tipo:"siembra",hl:vol,tq:+m[3],fromBot:true});if(ok)decir("Salida guardada por el formulario y con PIN.");else decir("No se registró la salida. Revisa el colector antes de volver a intentarlo.");}};
    }
    return null;
  }
  function interpretar(a){ const {ent,has}=a;
    const action=accionLocal(a); if(action)return action;
    const extra=consultaLocalExtra(a); if(extra)return extra;
    // --- acciones y meta ---
    if(has("PWD")&&(has("CAMBIAR")||/cambi/.test(a.q))) return {h:pick("pw",["Claro, te abro el cambio de contraseña.","Listo, cambiemos la contraseña."]),after:cambiarPwd};
    if(has("PWD")) return "La contraseña solo se pide cuando vas a hacer un cambio crítico. Si quieres cambiarla, usa el botón 🔒 de arriba o dime “cambiar contraseña”.";
    if(has("FIX")&&diag&&diag.length){ const i=diag.findIndex(x=>x.fix); if(i<0) return "Ninguno de esos puntos se puede corregir automáticamente; si quieres, te guío paso a paso."; return {h:"Vamos con el primero que se puede corregir.",after:()=>aplicarFix(i)}; }
    if(has("GUIA")) return guiar();
    if(has("DIAG")||/revisa (la )?(app|aplicacion|plataforma)|no (me )?funciona|que esta fallando/.test(a.q)){ diag=diagnosticar(); return diagHTML(diag); }
    if(has("QUE_ES")&&!ent.fv&&!ent.col&&!ent.lote&&!ent.lev){ const c=conceptoDe(a); if(c) return CONCEPTOS[c]; }
    if(has("RET")&&has("ACCION")){ const t=ent.fv!=null?tqPorNum(ent.fv):ent.lote?App.S.tanques[ent.lote]:fvActual(); if(t&&!(t.retiro||{}).fecha) return {h:`Te abro el registro de retiro de FV ${t.tq} · ${esc(t.lote)}.`,after:()=>App.Inv.retiro(t.lote)}; if(!t) return "¿De cuál FV vas a registrar el retiro?"; }
    if(has("NAV")){ const dest=has("COL")?["colectores","Colectores"]:has("FV")?["tanques","Tanques"]:has("HIST")?["historial","Historial"]:has("CONFIG")?["config","Configuración"]:has("INICIO")?["inicio","Inicio"]:(has("LEV")||has("INV"))?["levaduras","Levaduras"]:null;
      if(dest&&ent.fv==null&&!ent.lote&&!ent.lev&&ent.col==null) return {h:`Listo, te llevo a ${dest[1]}.`,after:()=>App.go(dest[0])}; }
    // --- entidades concretas ---
    if(ent.lev){ if(has("GENEALOGIA")) return genealogiaTexto(ent.lev); if(has("DETALLE")) return perfilLev(ent.lev); return usosLev(ent.lev); }
    if(ent.fv!=null){ const t=tqPorNum(ent.fv);
      if(!t){ const b=ultimoDeFV(ent.fv); return b?`FV ${ent.fv} no tiene levadura en fermentación ahora. Lo último registrado es el lote ${esc(b.lote||"—")}, ${b.destino==="DES"?"descartado":"cosechado como <b>"+esc(b.nombre)+"</b>"} el ${fmtS(b.retiro)}.`:`No encuentro el FV ${ent.fv} con datos registrados.`; }
      if(has("POR_QUE")) return explicarT0(t);
      if(has("T0")&&!has("ESTADO")) return t0Corto(t);
      if(has("CANT")&&!has("T0")) return `No tengo registrado cuánta levadura hay dentro del FV ${t.tq}; ese volumen se conoce al retirarla. ${t0Corto(t)}`;
      if((has("LEV")||has("GEN"))&&!has("ESTADO")){ const r=App.Calc.tanque(t), L=t.levadura||{}, g=App.T.genResultante(r); mem.last={kind:"fv",id:t.lote}; return L.nombre?`FV ${t.tq} está sembrado con <b>${esc(L.nombre)}</b>${L.generacion!=null?" (Gen "+L.generacion+")":""}; la cosecha saldrá como <b>${esc(r.nombreCosecha||"—")}</b>${g!=null?" (Gen "+g+")":""}.`:`FV ${t.tq} no tiene registrada la levadura sembrada.`; }
      return comoVa(t); }
    if(ent.lote){ const t=App.S.tanques[ent.lote]; if(t&&!(t.retiro||{}).fecha&&(has("ESTADO")||has("T0")||has("POR_QUE"))) return has("POR_QUE")?explicarT0(t):comoVa(t); return loteInfo(ent.lote); }
    if(ent.col!=null){ if(!colExiste(ent.col)) return `No tengo registrado un colector C${ent.col}.`; return colector(ent.col,ent.pos,has("CANT")&&!has("LISTA")); }
    if(ent.fam) return levadurasPorFamilia(ent.fam);
    if(ent.gen!=null) return has("QUE_ES")?CONCEPTOS.generacion:levadurasPorGeneracion(ent.gen);
    if(ent.num!=null) return porNumero(ent.num,a);
    // --- análisis comparativo ---
    if(has("PROM")) return bajoHabitual(a);
    if(has("MAX")||has("MIN")||(has("INTENS")&&(has("WH")||has("CERCA")||has("AVANCE")||has("TIEMPOCOL")))||has("CERCA")||has("AVANCE")) return extremo(a);
    // --- seguimiento sobre lo último hablado ---
    if((has("POR_QUE")||has("QUE_ES")||has("PRON"))&&soloRef(a)&&a.toks.length<=7){ const t=fvActual(), l=levActual();
      if(has("GENEALOGIA")&&l) return genealogiaTexto(l);
      if(t) return has("POR_QUE")||has("T0")?explicarT0(t):comoVa(t);
      if(l) return usosLev(l);
      if(mem.last&&mem.last.kind==="col") return colector(+mem.last.id);
      if(mem.last&&mem.last.kind==="lote") return loteInfo(mem.last.id);
      if(has("POR_QUE")||has("QUE_ES")) return pick("cual",["¿Cuál dato? Dime el FV, el lote o la levadura y te lo explico.","Claro, ¿de qué dato hablamos? Dime el FV, la levadura o el colector."]); }
    if(has("T0")){ const t=fvActual(); if(t) return t0Corto(t); return prioridades(); }
    if(has("GENEALOGIA")){ const l=levActual(); return l?genealogiaTexto(l):"¿De qué levadura? Puedes decirme su nombre o pedirme que busque una familia."; }
    if(has("USO")){ const l=levActual(); if(l) return usosLev(l); }
    if(has("DESCARTE")) return descartes();
    if(has("VENC")) return prioridades(true);
    if(has("PRIO")&&/que hago|que sigue/.test(a.q)&&fvActual()) return comoVa(fvActual());
    if(has("RET")||has("PRIO")) return prioridades();
    if(has("GEN")) return generacionesActuales();
    if(has("RECOM")) return recomendar();
    // --- inventario / levadura ---
    if(has("DETALLE")&&!ent.lev){ if(mem.last&&mem.last.kind==="lev") return perfilLev(mem.last.id); const opts=App.Traza.nombres().slice(0,4).map(n=>({label:n,q:`dame informacion completa de ${n}`})); return {h:"Claro. ¿De cuál levadura quieres el expediente completo? Puedes escribir su nombre o elegir una de estas registradas.",opts}; }
    const lev=has("LEV"), inv=has("INV"), col=has("COL"), fv=has("FV"), cant=has("CANT"), est=has("ESTADO");
    if(fv) return tanquesConLevadura();
    if(col||inv) return cant&&!has("LISTA")?cantidad():inventario();
    if(lev&&cant) return cantidad();
    if(lev&&has("LISTA")) return inventario();
    if(lev) return {ia:true,h:pick("acl",["Claro. ¿Te refieres al inventario disponible en colectores, a la levadura que está en los tanques o a los próximos retiros?","¿Qué quieres saber de la levadura: lo que hay disponible en colectores, la que está en los tanques o los próximos retiros?"]),
      opts:[{label:"Inventario disponible",q:"muestrame el inventario",kw:["inventario","disponible","colector","colectores","stock"]},{label:"Levadura en los tanques",q:"que tanques tienen levadura",kw:["tanque","tanques","fv","fermentador","fermentadores"]},{label:"Próximos retiros",q:"que retiro primero",kw:["retiro","retiros","proximo","proximos","sacar","cosecha"]}]};
    if(est){ const general=/como (estamos|vamos|andamos|van las cosas)|resumen|panorama|situacion/.test(a.q), t=(ctx&&ctx.tipo==="fv")||!general?fvActual():null; if(t) return comoVa(t); return resumenOperacion(); }
    if(has("AYUDA")||has("CAPAZ")){ const t=fvActual(); if(has("AYUDA")&&has("PRON")&&t) return comoVa(t);
      return has("CAPAZ")?"Puedo resumir el expediente completo de una levadura, buscar dónde se sembró, revisar FV activos e históricos, colectores, generaciones y retiros, y abrir registros relacionados. Si una consulta queda ambigua, te pediré solo el dato que falta.":"Claro. ¿Qué estás revisando? Dime el FV, el lote, la levadura o el colector y lo miramos juntos."; }
    return null; }

  function noEntendi(a){ const k=[...a.K].filter(x=>!SOCIAL.includes(x));
    if(mem.last&&a.toks.length<=3&&!k.length){ return {h:pick("ne1",["No te entendí bien 🤔 ¿Me lo dices de otra forma?","Mmm, esa no la capté. ¿Me das un poco más de detalle?"])}; }
    return {ia:true,h:"No tengo esa respuesta. Prueba con algo como: <b>¿cuál vence primero?</b>, <b>T0 del FV 27</b>, <b>¿qué hay en C5?</b> o <b>¿cuántos Hl tengo?</b>",
      opts:[{label:"Un tanque (FV)",q:"que tanques tienen levadura",kw:["tanque","fv","fermentador"]},{label:"Un colector",q:"muestrame el inventario",kw:["colector","colectores"]},{label:"Una levadura",q:"como van las generaciones",kw:["levadura","leva","generacion"]}]}; }

  const ORDINAL=[["primera","primero","1","uno","1ra","1ro"],["segunda","segundo","2","dos","2da","2do"],["tercera","tercero","3","tres","3ra","3ro"]];
  function resolverPendiente(a){ const p=mem.pend; mem.pend=null; if(!p) return null;
    if(a.toks.includes("ultima")||a.toks.includes("ultimo")) return p[p.length-1];
    if(a.toks.length<=4){ for(let i=0;i<Math.min(3,p.length);i++) if(ORDINAL[i].some(w=>a.toks.includes(w))&&!Object.keys(a.ent).some(k=>k!=="num")) return p[i]; }
    const hit=p.filter(o=>(o.kw||[]).some(w=>a.toks.includes(w)||a.toks.some(t=>t.length>=4&&lev(t,w,1)<=1)));
    return hit.length===1&&a.toks.length<=6&&!Object.keys(a.ent).length?hit[0]:null; }

  function responder(texto){
    { const d=App.BotDirecto&&App.BotDirecto(texto,{ctx,mem}); if(d) return d; }
    let a=analizar(texto);
    const op=resolverPendiente(a); if(op) a=analizar(op.q);
    if(/que mas hay disponible/.test(a.q)){a.K.delete("SALUDO");a.K.delete("INTENS");a.K.delete("MAX");a.K.delete("MIN");a.K.delete("WH");a.K.add("INV");a.K.add("COL");}
    const parts=texto.split(/\s+y\s+(?=(?:que|qué|cu[aá]nt[oa]s?|compara|muestra|dime|revisa|donde|dónde|cual|cuál|como|cómo)(?:\s|$))/i).map(x=>x.trim()).filter(Boolean);
    if(parts.length>1){const blocks=parts.slice(0,4).map((x,i)=>{const z=interpretar(analizar(x));return '<div class="bot-answer-block"><b>'+(i+1)+'.</b> '+(typeof z==="string"?z:(z&&z.h)||"Necesito un poco más de detalle.")+'</div>';});return {h:blocks.join("")};}
    const soc=socialTipo(a); if(soc) return {h:respSocial(soc,a)};
    let r=interpretar(a);
    if(r==null) r=noEntendi(a);
    if(typeof r==="string") r={h:r};
    if(a.has("SALUDO")&&!soc) r.h=pick("pre",["¡Hola! ","Hola 👋 ","¡Buenas! "])+r.h;
    return r; }

  /* ------------------------------------------------------------
     9. INTERFAZ
     ------------------------------------------------------------ */
  function construir(){ el=document.createElement("aside"); el.className="bot"; el.id="levabot"; el.setAttribute("aria-label","Cifra"); el.hidden=true;
    el.innerHTML=`<header class="bot-h"><span class="bot-logo" aria-hidden="true"></span><div><b>Cifra</b><span>Asistente del proceso</span></div><div class="bot-head-actions"><button class="btn sm ghost" type="button" id="botPwd" title="Cambiar contraseña de autorización" aria-label="Cambiar contraseña de autorización">🔒</button><button class="btn sm ghost" type="button" id="botProactive" aria-pressed="true">Avisos ✓</button><button class="btn sm ghost bot-new" type="button" id="botNew">Nuevo chat</button><button class="btn sm ghost" type="button" id="botX" aria-label="Cerrar Cifra">${C.icon("x")}</button></div></header><div class="bot-status"><i class="ai-on"></i><span>Pregúntame por los datos y el proceso de la plataforma</span></div><div class="bot-ctx" id="botCtx" hidden></div><div class="bot-m" id="botM" role="log" aria-live="polite"></div><form class="bot-f" id="botF" autocomplete="off"><textarea id="botI" rows="1" placeholder="Escríbele a Cifra…" aria-label="Mensaje para Cifra"></textarea><button class="btn sm ghost bot-mic" type="button" id="botMic" aria-label="Dictar mensaje" hidden>🎙</button><button class="btn pri send" type="submit" id="botSend" aria-label="Enviar">${C.icon("arrowr")}</button></form>`;
    document.body.appendChild(el);
    el.querySelector("#botX").onclick=cerrar;
    el.querySelector("#botPwd").onclick=()=>cambiarPwd();
    const pbtn=el.querySelector("#botProactive"),syncP=()=>{pbtn.textContent=botPrefs.proactive?"Avisos ✓":"Avisos pausados";pbtn.setAttribute("aria-pressed",String(!!botPrefs.proactive));};syncP();pbtn.onclick=()=>{botPrefs.proactive=!botPrefs.proactive;try{localStorage.setItem("levabot.preferences.v2",JSON.stringify(botPrefs));}catch(e){}syncP();if(botPrefs.proactive)avisosProactivos();};
    const mic=el.querySelector("#botMic"),SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){mic.hidden=false;mic.onclick=()=>{if(!window.confirm("El dictado usa reconocimiento de voz del navegador. En Chrome, el audio puede procesarse en servidores de Google. ¿Continuar?"))return;const rec=new SR();rec.lang="es-CO";rec.onresult=e=>{el.querySelector("#botI").value=e.results[0][0].transcript;};rec.onerror=()=>toast("No pude reconocer la voz.");rec.start();};}
    el.querySelector("#botNew").onclick=()=>{ msgs=[]; mem={last:null,list:null,pend:null}; diag=null; guia=null; pintarCtx(); decir(pick("nc",["Listo, empezamos de nuevo. ¿En qué te ayudo?","Chat nuevo. ¿Qué revisamos?"])); };
    el.querySelector("#botF").addEventListener("submit",e=>{ e.preventDefault(); const i=el.querySelector("#botI"), v=i.value; if(!v.trim()) return; i.value=""; i.style.height="46px"; enviar(v); });
    el.querySelector("#botI").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); el.querySelector("#botF").requestSubmit(); } });
    el.querySelector("#botI").addEventListener("input",e=>{ e.target.style.height="46px"; e.target.style.height=Math.min(130,e.target.scrollHeight)+"px"; });
    el.addEventListener("click",e=>{ const b=e.target.closest("[data-sug]"); if(b){ enviar(b.dataset.lab||b.dataset.sug,b.dataset.sug); return; } const ac=e.target.closest("[data-bact]"); if(ac) accion(ac.dataset.bact); const g=e.target.closest("[data-bgo]"); if(g){ e.preventDefault(); App.go(g.dataset.bgo); } });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!el.hidden&&!document.querySelector("dialog[open]")) cerrar(); }); }
  function ctxDeRuta(){ const h=(location.hash||"").slice(2).split("/"); if(h[0]==="tanque"&&h[1]&&App.S.tanques[decodeURIComponent(h[1])]) return {tipo:"fv",lote:decodeURIComponent(h[1])}; if(h[0]==="colectores"&&h[1]) return {tipo:"col",c:h[1].replace(/\D/g,"")}; return null; }
  const ctxTxt=c=>!c?null:c.tipo==="fv"?(()=>{ const t=App.S.tanques[c.lote]; return t?"FV "+t.tq+" · "+t.lote:null; })():c.tipo==="col"?"Colector C"+c.c:c.tipo==="lev"?"Levadura "+c.nombre:null;
  function pintarCtx(){ const box=el.querySelector("#botCtx"), t=ctxTxt(ctx); box.hidden=!t; box.innerHTML=t?`Hablando de <b>${esc(t)}</b> <button class="btn sm ghost" type="button" data-bact="sinctx">Quitar</button>`:"";
    if(ctx&&ctx.tipo==="col") mem.last={kind:"col",id:ctx.c}; if(ctx&&ctx.tipo==="lev") mem.last={kind:"lev",id:App.Traza.N(ctx.nombre)}; if(ctx&&ctx.tipo==="fv") mem.last={kind:"fv",id:ctx.lote}; }
  function avisosProactivos(){
    if(!botPrefs.proactive||!App.S.ready)return;let seen=[];try{seen=JSON.parse(localStorage.getItem("levabot.noticeKeys")||"[]");}catch(e){}
    const now=Date.now(),fresh=[];pend().forEach(x=>{if(!x.r.t0)return;const h=(+x.r.t0-now)/HOUR,key="t0:"+x.t.lote+":"+String(x.r.t0);
      if(h>=0&&h<=2&&!seen.includes(key)){fresh.push(linkFV(x.t)+" llegará a T0 en "+dur(+x.r.t0)+".");seen.push(key);}
      else if(h<0&&h>=-12&&!seen.includes(key+":12")){fresh.push(linkFV(x.t)+" pasó T0 y está dentro de +12 h.");seen.push(key+":12");}
      else if(h<-12&&h>=-24&&!seen.includes(key+":24")){fresh.push(linkFV(x.t)+" pasó T0 +12 h; revise antes de +24 h.");seen.push(key+":24");}});
    if(fresh.length){decir("<b>Avisos del proceso</b><ul>"+fresh.slice(0,8).map(x=>"<li>"+x+"</li>").join("")+"</ul>");try{localStorage.setItem("levabot.noticeKeys",JSON.stringify(seen.slice(-200)));}catch(e){}}
  }
  function resumenTurno(){
    const now=new Date(),startH=Math.floor(now.getHours()/8)*8,start=new Date(now);start.setHours(startH,0,0,0);const end=new Date(start);end.setHours(startH+8);
    const from=lastOpenAt?parseDT(lastOpenAt):start,recent=App.BDM.movimientos().filter(x=>parseDT(x.t)>from&&parseDT(x.t)<=now);
    const future=pend().filter(x=>x.r.t0&&+x.r.t0>now&&+x.r.t0<=+end);
    lastOpenAt=now.toISOString();persist();
    return "<b>Turno "+String(startH).padStart(2,"0")+":00–"+String(startH+8).padStart(2,"0")+":00</b><br>"+(recent.length?recent.length+" movimientos desde el último ingreso.":"Sin movimientos nuevos desde el último ingreso.")+"<br>"+(future.length?"T0 estimado en "+future.length+" FV durante el turno.":"No hay T0 registrados para el resto del turno.");
  }
  function abrir(c){ if(!el) construir(); const nuevo=c||ctxDeRuta(); const cambio=ctxTxt(nuevo)!==ctxTxt(ctx); ctx=nuevo; el.hidden=false; document.body.classList.add("bot-open"); pintarCtx();
    const t=ctxTxt(ctx);
    if(!msgs.length) decir(t?`Estás en <b>${esc(t)}</b>. Pregúntame lo que necesites.`:`Soy Cifra. Pregúntame lo que quieras del proceso y te respondo directo.`,opcionesInicio());
    else if(cambio&&t) decir(`Ahora hablamos de <b>${esc(t)}</b>. ¿Qué necesitas?`);
    avisosProactivos();if(!proactiveTimer)proactiveTimer=setInterval(()=>{if(el&&!el.hidden)avisosProactivos();},300000);
    setTimeout(()=>el.querySelector("#botI").focus(),50); }
  function opcionesInicio(){ return [{label:"Qué hago primero",q:"que hago primero"},{label:"Resumen de la planta",q:"resumen de la planta"},{label:"Generaciones que tengo",q:"que generaciones tengo en este momento"},{label:"Qué puedes contestar",q:"que puedes contestar"}]; }
  function cerrar(){ if(el){ el.hidden=true; document.body.classList.remove("bot-open"); } }
  function pintar(){ const m=el.querySelector("#botM"); m.innerHTML=msgs.map(x=>`<div class="bm ${x.r}">${x.h}</div>`).join("")+(ocupado?`<div class="bm b typing" aria-label="Cifra está escribiendo"><span class="bot-typing"><i></i><i></i><i></i></span></div>`:""); m.scrollTop=m.scrollHeight; }
  function decir(h,opts){ const stamp=new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
    const ch=opts&&opts.length?`<div class="bot-opts">${opts.map(o=>`<button type="button" class="chip" data-sug="${esc(o.q)}" data-lab="${esc(o.label)}">${esc(o.label)}</button>`).join("")}</div>`:"";
    msgs.push({r:"b",h:h+ch+`<span class="bot-time">${stamp}</span>`}); if(msgs.length>60)msgs=msgs.slice(-60); pintar(); persist(); }
  function usuario(t){ msgs.push({r:"u",h:esc(t)}); if(msgs.length>60)msgs=msgs.slice(-60); pintar(); persist(); }
  function enviar(visible,interno){ if(ocupado) return; usuario(visible);
    if(guia&&/^(hecho|listo|siguiente|ya)\b/.test(norm(visible))){ guia.i++; if(guia.i<guia.pasos.length){ decir(pasoGuia()); return; } guia=null; }
    ocupado=true; pintar();
    const espera=reduce?30:140;
    setTimeout(()=>{ let r; try{ r=responder(interno||visible); }catch(e){ console.error(e); r={h:"Tuve un problema leyendo los datos para responder eso. Intenta de nuevo o dímelo de otra forma."}; }
      const IA=window.App&&App.BotIA; if(IA&&IA.activo()&&!r.directo&&!r.after&&(IA.modo()==="siempre"||r.ia||IA.abierta(String(interno||visible)))){ IA.preguntar(String(interno||visible),msgs).then(h=>{ ocupado=false; mem.pend=null; decir(h); }).catch(e=>{ ocupado=false; mem.pend=r.opts&&r.opts.length?r.opts:null; decir(r.h+'<span class="bot-time">IA no disponible: '+esc(e.message||"error")+'</span>',r.opts); }); return; }
      ocupado=false; mem.pend=r.opts&&r.opts.length?r.opts:null; decir(r.h,r.opts); if(r.after) setTimeout(r.after,250); },espera); }
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  function accion(a){ if(a==="sinctx"){ ctx=null; pintarCtx(); return; } if(a==="sig"&&guia){ guia.i++; if(guia.i<guia.pasos.length) decir(pasoGuia()); else guia=null; return; } if(a.startsWith("fix:")) aplicarFix(+a.split(":")[1]); }
  return {abrir,cerrar,diagnosticar,_enviar:t=>enviar(t),_responder:t=>responder(t),_analizar:analizar,get ctx(){return ctx;}};
})();
