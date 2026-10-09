
/* ============================================================
   acciones-retiro.js
   ============================================================ */
(function(){
  const {esc,f,fmt,fmtS,pc,num,toIn,parseDT,HOUR,DAY,toast,clone} = App.U;
  App.Inv={};
  async function exportar(){
    const now=Date.now(), q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
    const rows=[["Estado","Tanque","Lote","Marca","Levadura sembrada","Se cosechará como","T0","Tipo T0","T0+12h","T0+24h"]].concat(App.pendientes().map(t=>{ const r=App.Calc.tanque(t,now); return [App.Calc.estado(r,now).txt,t.tq,t.lote,t.marca,(t.levadura||{}).nombre,r.nombreCosecha,fmt(r.t0),App.TIPO_TXT[r.T.tipo]||"",fmt(r.mas12),fmt(r.venc)]; }));
    try{ await App.downloads.save({filename:"inventario-levadura.csv",data:"\ufeff"+rows.map(r=>r.map(q).join(";")).join("\r\n")}); }catch(e){ if(e&&e.code!=="declined") toast("No se pudo generar el archivo."); }
  }
  App.Inv.exportar=exportar;
  const slotsLibres = () => { const out=[]; for(let c=1;c<=6;c++){ const l=[1,2].filter(s=>!App.S.colectores[`c${c}-${s}`]).length; out.push({c,libres:l}); } return out; };
  App.Inv.retiro = function(lote){
    if(!App.Store.canWrite){ toast("Modo de solo lectura."); return; }
    const t=App.S.tanques[lote], r=App.Calc.tanque(t), L=t.levadura||{}, sl=slotsLibres();
    const colSel=n=>`<select name="${n}"><option value=""></option>${sl.map(x=>`<option value="${x.c}" ${x.libres?"":"disabled"}>Colector ${x.c} ${x.libres?`(${x.libres} posición${x.libres>1?"es":""} libre${x.libres>1?"s":""})`:"(lleno)"}</option>`).join("")}</select>`;
    const gS=(App.Calc.parseLev(L.nombre)||{}).gen??L.generacion, gR=App.T.genResultante(r), av=App.T.genAviso(gR);
    const DESC=["Buffer","UTK 19","UTK 20"];
    const body=`<div class="card card-p" style="background:var(--surface-2);margin-bottom:16px"><div class="kv" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <div><div class="k">Fermentador</div><div class="v">FV ${t.tq} · ${esc(t.lote)}</div></div><div><div class="k">Cerveza</div><div class="v">${esc(t.marca)}</div></div>
        <div><div class="k">Levadura sembrada</div><div class="v">${esc(L.nombre||"—")}${gS!=null?" · Gen "+gS:""}</div></div><div><div class="k">Se cosechará como</div><div class="v">${esc(r.nombreCosecha||"—")}${gR!=null?" · Gen "+gR:""}</div></div>
        <div><div class="k">T0 ${App.tipoTag(r.T.tipo)}</div><div class="v">${r.t0?fmt(r.t0):"sin calcular"}</div></div><div><div class="k">Ideal · máximo</div><div class="v">${fmtS(r.mas12)} · ${fmtS(r.venc)}</div></div></div></div>
      <div id="borr" class="small muted" style="margin:-6px 0 10px" aria-live="polite"></div>
      <fieldset><legend>Destino</legend><div class="dest">
        <label class="destc"><input type="radio" name="destino" value="COS" checked><span class="ico">🧪</span><span><b>Cosecha</b><small>Va a un colector para volver a sembrar</small></span></label>
        <label class="destc"><input type="radio" name="destino" value="DES"><span class="ico">🗑️</span><span><b>Descarte</b><small>Buffer, UTK 19 o UTK 20</small></span></label></div></fieldset>
      <div id="genav"></div>
      <div class="fg"><label class="f req"><span>Fecha y hora real del retiro</span><input name="fecha" type="datetime-local" value="${toIn(new Date())}"></label>
        <label class="f"><span>Fin de remoción</span><input name="finRemocion" type="datetime-local"><small class="muted">Vacío = misma hora del retiro</small></label>
        <label class="f"><span>Volumen de cabeza (Hl)</span><input name="volCabeza" type="number" step="any"></label></div>
      <div id="ventana"></div>
      <div data-d="COS"><fieldset style="margin-top:12px"><legend>Colectores</legend><div class="fg">
        <label class="f"><span>Colector destino 1</span>${colSel("c1")}</label><label class="f"><span>Volumen 1 (Hl)</span><input name="v1" type="number" step="any"></label>
        <label class="f"><span>Colector destino 2</span>${colSel("c2")}</label><label class="f"><span>Volumen 2 (Hl)</span><input name="v2" type="number" step="any"></label></div>
        <p class="small muted">Los datos de análisis y volúmenes son opcionales. Si no necesita asignar colector todavía, puede dejar estos campos vacíos y completar la información después.</p></fieldset>
        <fieldset><legend>Análisis de la levadura</legend><div class="fg">
        <label class="f"><span>Viabilidad (%)</span><input name="viab" type="number" step="any"></label><label class="f"><span>Consistencia (%)</span><input name="cons" type="number" step="any"></label>
        <label class="f"><span>pH</span><input name="ph" type="number" step="any"></label><label class="f"><span>Conteo (Mcel/ml)</span><input name="conteo" type="number" step="any"></label>
        <label class="f"><span>Concentración etanol (%v/v)</span><input name="etanol" type="number" step="any"></label><label class="f"><span>Temperatura de cosecha (°C)</span><input name="temp" type="number" step="any"></label>
        <label class="f"><span>Sensorial</span><select name="sensorial"><option value=""></option><option>OK</option><option>No OK</option></select></label><label class="f"><span>Responsable del sensorial</span><input name="respSensorial"></label></div></fieldset></div>
      <div data-d="DES" class="hidden"><fieldset style="margin-top:12px"><legend>A dónde se descarta</legend><div class="seg" role="radiogroup" aria-label="Destino del descarte">
        ${DESC.map(o=>`<label><input type="radio" name="dondeSel" value="${o}"> ${o}</label>`).join("")}</div></fieldset></div>
      <div class="fg" style="margin-top:12px"><label class="f"><span>Responsable del retiro <small class="muted">(opcional)</small></span><input name="resp"></label><label class="f" style="grid-column:span 2"><span>Observaciones <small class="muted">(opcional)</small></span><input name="obs"></label></div>
      <label class="f req hidden" id="comentL" style="margin-top:10px"><span>Comentario: ¿por qué se sacó fuera de la ventana?</span><textarea name="coment"></textarea></label>`;
    const CAMPOS=["fecha","destino","finRemocion","volCabeza","c1","v1","c2","v2","viab","cons","ph","conteo","etanol","temp","sensorial","respSensorial","dondeSel","resp","obs","coment"];
    let tBorr=null, ultimo="";
    const leerCampos=fm=>{ const o={}; CAMPOS.forEach(k=>{ const el=fm.elements[k]; if(el) o[k]=el.value; }); return o; };
    const guardarBorrador=async fm=>{ clearTimeout(tBorr); if(!fm.dataset.tocado) return; const campos=leerCampos(fm), js=JSON.stringify(campos); if(js===ultimo) return; ultimo=js;
      const cur=App.S.tanques[lote]; if(!cur||(cur.retiro||{}).fecha) return; const d=clone(cur); d.borradorRetiro={campos,t:new Date().toISOString()};
      if(await App.Store.set("tanques",lote,d)){ const b=fm.querySelector&&fm.querySelector("#borr"); if(b) b.textContent="Borrador guardado · "+fmtS(new Date()); } };
    App.UI.modal("Retirar levadura · FV "+t.tq,body,{wide:true,ok:"Registrar retiro de levadura",cancel:"Cerrar y guardar borrador",
      onOpen(fm){
        const br=(App.S.tanques[lote]||{}).borradorRetiro;
        if(br&&br.campos){ Object.entries(br.campos).forEach(([k,v])=>{ const el=fm.elements[k]; if(!el||v==null) return; if(el instanceof RadioNodeList){ [...el].forEach(x=>x.checked=x.value===v); } else el.value=v; });
          ultimo=JSON.stringify(leerCampos(fm)); fm.dataset.tocado="1"; fm.querySelector("#borr").innerHTML=`Borrador recuperado de ${fmtS(parseDT(br.t))} · <button type="button" class="btn sm ghost" id="limpiarBorr">Empezar de nuevo</button>`;
          fm.querySelector("#limpiarBorr").onclick=async()=>{ const d=clone(App.S.tanques[lote]); delete d.borradorRetiro; await App.Store.set("tanques",lote,d); fm.reset(); fm.elements.fecha.value=toIn(new Date()); ultimo=""; fm.querySelector("#borr").textContent="Borrador descartado."; upd(); }; }
        const upd=()=>{ const des=fm.elements.destino.value;
          fm.querySelectorAll("[data-d]").forEach(x=>x.classList.toggle("hidden",x.dataset.d!==des));
          fm.querySelector("#genav").innerHTML=des==="COS"&&av?`<div class="callout ${av.k==="rojo"?"err":"warn"}"><b>${esc(av.txt)}</b></div>`:"";
          const v=App.Calc.ventana(parseDT(fm.elements.fecha.value),r.t0);
          fm.querySelector("#ventana").innerHTML=v?`<div class="${v.coment?(v.k==="demorado"?"errbox":"warn"):"infobox"}"><b>${esc(v.txt)}</b>: ${v.h>=0?"+":"−"}${App.U.dur(Math.abs(v.h)*HOUR)} respecto al T0.</div>`:"";
          fm.querySelector("#comentL").classList.toggle("hidden",!(v&&v.coment)); fm.dataset.coment=v&&v.coment?"1":""; };
        const tocar=e=>{ if(e&&e.isTrusted===false&&!e.target.name) return; fm.dataset.tocado="1"; upd(); clearTimeout(tBorr); tBorr=setTimeout(()=>guardarBorrador(fm),900); };
        fm.addEventListener("input",tocar); fm.addEventListener("change",tocar); upd(); },
      onClose(fm){ guardarBorrador(fm); },
      async onSubmit(fm,showErr){
        const V=(n,ty)=>App.UI.val(fm,n,ty), des=V("destino"), fecha=V("fecha");
        if(!fecha) return showErr("Indique la fecha y hora del retiro."),false;
        if(r.fin&&parseDT(fecha)<r.fin) return showErr("El retiro no puede ser anterior al fin de llenado."),false;
                if(fm.dataset.coment==="1"&&!V("coment")) return showErr("Escriba el comentario de por qué se sacó fuera de la ventana."),false;
        const v=App.Calc.ventana(parseDT(fecha),r.t0);
        const rec={nombre:des==="COS"?r.nombreCosecha:(r.nombreCosecha||L.nombre),marca:t.marca,familia:(App.Calc.parseLev(r.nombreCosecha)||{}).fam,tq:String(t.tq),lote:t.lote,generacion:(App.Calc.parseLev(r.nombreCosecha)||{}).gen,
          levSembrada:L.nombre,t0:r.t0?toIn(r.t0):null,t0tipo:r.T.tipo,retiro:fecha,finRemocion:V("finRemocion")||fecha,volCabeza:V("volCabeza","n"),destino:des,ventana:v?v.k:null,horasDesdeT0:v?Math.round(v.h*10)/10:null,comentario:V("coment"),responsable:V("resp"),obs:V("obs"),origen:"app"};
        const slots=[];
        if(des==="COS"){
          if(!rec.nombre) return showErr("No se puede armar el nombre de la levadura: registre la levadura sembrada del tanque."),false;
                              Object.assign(rec,{viab:V("viab","pct"),cons:V("cons","pct"),ph:V("ph","n"),conteo:V("conteo","n"),etanol:V("etanol","n"),temp:V("temp","n"),sensorial:V("sensorial"),respSensorial:V("respSensorial")});
          const used={}; rec.colectores=[];
          for(const [c,vol] of [[V("c1"),V("v1","n")],[V("c2"),V("v2","n")]]){ if(!c) continue;
            const sid=[1,2].map(s=>`c${c}-${s}`).find(id=>!App.S.colectores[id]&&!used[id]);
            if(!sid) return showErr(`El colector ${c} no tiene posiciones libres. No se puede registrar una tercera levadura.`),false;
            used[sid]=1; slots.push([sid,vol]); rec.colectores.push({colector:c,posicion:sid.split("-")[1],vol}); }
          const fin=parseDT(rec.finRemocion); rec.maxAbi=fin?toIn(new Date(+fin+4*DAY)):null; rec.maxCopec=r.t0?toIn(new Date(+r.t0+2*DAY)):null;
        } else {
          const d=V("dondeSel"); if(!d) return showErr("Indique a dónde se descarta: Buffer, UTK 19 o UTK 20."),false; rec.destinoDescarte=d;
        }
        Object.keys(rec).forEach(k=>rec[k]==null&&delete rec[k]);
        clearTimeout(tBorr);
        if(!await App.Sec.confirmar("¿Registrar el retiro?",des==="COS"?`Vas a registrar la <b>cosecha</b> de <b>${esc(rec.nombre)}</b>${rec.generacion!=null?" (Gen "+rec.generacion+")":""} desde FV ${t.tq} hacia ${slots.map(s=>"C"+s[0].slice(1).replace("-","-P")).join(" y ")}.${av?"<br>"+esc(av.txt):""}`:`Vas a registrar el <b>descarte</b> de la levadura de FV ${t.tq} en <b>${esc(rec.destinoDescarte)}</b>.`,"Registrar retiro")) return false;
        const levId="L-"+t.lote;
        if(!await App.Store.set("bdlev",levId,Object.assign({},App.S.bdlev[levId]||{},rec))) return false;
        for(const [sid,vol] of slots) await App.Store.set("colectores",sid,{levId,nombre:rec.nombre,marca:rec.marca,generacion:rec.generacion,tq:rec.tq,lote:rec.lote,vol,volInicial:vol,viab:rec.viab,cons:rec.cons,ph:rec.ph,sensorial:rec.sensorial,respSensorial:rec.respSensorial,retiro:rec.retiro,finRemocion:rec.finRemocion,maxAbi:rec.maxAbi,maxCopec:rec.maxCopec,t0:rec.t0,ingreso:rec.finRemocion||rec.retiro});
        const d=clone(App.S.tanques[lote]||t); delete d.borradorRetiro; d.retiro={fecha,destino:des,levId,ventana:rec.ventana,comentario:rec.comentario}; Object.keys(d.retiro).forEach(k=>d.retiro[k]==null&&delete d.retiro[k]);
        d.estadoLevadura="RETIRADA";
        d.estadoTanque=d.mesCerrado===true||d.estadoMES==="CERRADO"?"CERRADO":"SIN_LEVADURA";
        if(!await App.Store.set("tanques",lote,d)) return false;
        toast(des==="COS"?`Retiro registrado: ${rec.nombre} en ${slots.map(s=>"C"+s[0].slice(1).replace("-","-P")).join(" y ")}`:"Retiro registrado como descarte en "+rec.destinoDescarte);
        App.go("levaduras"); return true;
      }});
  };
})();

/* ============================================================
   acciones-levadura.js
   ============================================================ */
App.Act = App.Act || {};
(function(){
  const {esc,f,fmt,fmtS,pc,num,toIn,parseDT,HOUR,toast,clone} = App.U;
  App.Act.archivarPosicion = async function(id,c,motivo){
    if(!c) return; const hid="h"+Date.now()+Math.random().toString(36).slice(2,6);
    await App.Store.set("colhist",hid,{pos:id,levId:c.levId||null,nombre:c.nombre,generacion:c.generacion??null,marca:c.marca||null,tq:c.tq||null,lote:c.lote||null,
      ingreso:c.ingreso||c.retiro||c.finRemocion||null,salida:new Date().toISOString(),motivo,volInicial:c.volInicial??null,volFinal:c.vol??null,
      notas:c.notas||[],recosechar:!!c.recosechar,recosechaAprobada:!!c.recosechaAprobada,okRecosechaEn:c.okRecosechaEn||null,marcaDescarte:c.marcaDescarte||null,maxAbi:c.maxAbi||null});
  };
  App.Act.quitar = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    const x=App.S.colectores[id]; if(!x) return;
    const v=await App.UI.form({title:"Liberar colector C"+id.slice(1).replace("-","-P"),intro:`La levadura <b>${esc(x.nombre)}</b> sale de la posición y la posición queda disponible. La ocupación queda en la bitácora del colector y en el historial.`,fields:[{k:"motivo",l:"Motivo",t:"sel",req:true,opts:["Sembrada","Descartada","Vencida","Otro"]},{k:"obs",l:"Observación",t:"t"}],ok:"Continuar"});
    if(!v) return;
    if(!await App.Sec.confirmar("¿Liberar el colector?",`Vas a liberar <b>C${id.slice(1).replace("-","-P")}</b> (${esc(x.nombre)}). Motivo: ${esc(v.motivo)}.`,"Liberar colector")) return;
    if(x.levId&&App.S.bdlev[x.levId]){ const bd=clone(App.S.bdlev[x.levId]); bd.salidas=(bd.salidas||[]).concat([{colector:id,fecha:new Date().toISOString(),motivo:v.motivo,obs:v.obs,volRestante:x.vol}]); await App.Store.set("bdlev",x.levId,bd); }
    await App.Act.archivarPosicion(id,x,v.motivo+(v.obs?" · "+v.obs:""));
    if(await App.Store.del("colectores",id)) toast("C"+id.slice(1).replace("-","-P")+" liberado");
  };
  App.Act.marcarDescarte = async function(id,opt){
    if(!App.Store.canWrite) return toast("Modo de solo lectura."); const x=clone(App.S.colectores[id]); if(!x) return false;
    const v=opt&&opt.confirmado?{motivo:opt.motivo}:await App.UI.form({title:"Marcar para descarte",intro:"Vas a marcar "+esc(x.nombre)+" en C"+id.slice(1).replace("-","-P")+" para descarte. La levadura sigue en el colector hasta que se libere.",fields:[{k:"motivo",l:"Motivo",t:"t",req:true,ph:"Ej.: viabilidad baja, generación alta"}],ok:"Confirmar"});
    if(!v) return false; x.marcaDescarte={t:new Date().toISOString(),motivo:v.motivo}; x.recosechar=false; delete x.recosechaAprobada; delete x.okRecosechaEn; delete x.recosechaMarcadaEn;
    if(await App.Store.set("colectores",id,x)){ await App.Sec.evento("marcaDescarte",{pos:id,nombre:x.nombre,generacion:x.generacion??null,levId:x.levId||null,motivo:v.motivo}); toast(x.nombre+" marcada para descarte"); return true; } return false;
  };
  App.Act.recuperar = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura."); const x=clone(App.S.colectores[id]); if(!x||!x.marcaDescarte) return;
    if(!await App.Sec.confirmar("¿Recuperar levadura?",`Vas a retirar la marca de descarte de <b>${esc(x.nombre)}</b>. Volverá a estar disponible para sembrar.`,"Recuperar")) return;
    const antes=x.marcaDescarte; delete x.marcaDescarte;
    if(await App.Store.set("colectores",id,x)){ await App.Sec.evento("recuperada",{pos:id,nombre:x.nombre,generacion:x.generacion??null,levId:x.levId||null,motivo:antes.motivo||""}); toast(x.nombre+" recuperada: disponible"); }
  };
  App.Act.recos = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    const x=clone(App.S.colectores[id]); if(!x) return;
    if(x.marcaDescarte) return toast("Retira primero la marca de descarte para proponer una recosecha.");
    x.recosechar=!x.recosechar;
    if(x.recosechar){ x.recosechaMarcadaEn=new Date().toISOString(); delete x.recosechaAprobada; delete x.okRecosechaEn; }
    else { delete x.recosechaMarcadaEn; delete x.recosechaAprobada; delete x.okRecosechaEn; }
    if(await App.Store.set("colectores",id,x)) toast(x.recosechar?"Recosecha propuesta; falta dar el OK":"Marca de recosecha retirada");
  };
  App.Act.okRecosecha = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    const x=clone(App.S.colectores[id]); if(!x||!x.recosechar) return toast("Primero marca esta levadura para recosecha.");
    if(x.recosechaAprobada){
      if(!await App.Sec.confirmar("¿Retirar el OK de recosecha?",`La recosecha de <b>${esc(x.nombre)}</b> en ${id.toUpperCase().replace("-","-P")} volverá a quedar pendiente.` ,"Retirar OK")) return;
      delete x.recosechaAprobada; delete x.okRecosechaEn;
      if(await App.Store.set("colectores",id,x)) toast("Recosecha vuelve a quedar pendiente");
      return;
    }
    if(!await App.Sec.confirmar("¿Dar OK a la recosecha?",`Confirmas la recosecha de <b>${esc(x.nombre)}</b> en ${id.toUpperCase().replace("-","-P")}. Quedará identificada como aprobada.` ,"Dar OK")) return;
    x.recosechaAprobada=true; x.okRecosechaEn=new Date().toISOString();
    if(await App.Store.set("colectores",id,x)){ await App.Sec.evento("recosechaAprobada",{pos:id,nombre:x.nombre,generacion:x.generacion??null,levId:x.levId||null}); toast("Recosecha aprobada"); }
  };
  App.Act.agregarRecosecha = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura.");
    if(!/^c\d+-[12]$/.test(id)) return toast("Abre P1 o P2 del colector para registrar la recosecha.");
    const origenId=id.replace(/-[12]$/, "-1");
    const origen=clone(App.S.colectores[origenId]);
    if(!origen||!origen.recosechar||!origen.recosechaAprobada) return toast("Marca la recosecha y dale OK antes de agregar más levadura.");
    const destinoId=origenId.slice(0,-1)+"2", destinoActual=App.S.colectores[destinoId];
    const misma=destinoActual&&((origen.levId&&destinoActual.levId===origen.levId)||(String(destinoActual.nombre||"").trim().toUpperCase()===String(origen.nombre||"").trim().toUpperCase()&&String(destinoActual.generacion??"")===String(origen.generacion??"")&&String(destinoActual.marca||"")===String(origen.marca||"")));
    if(destinoActual&&!misma) return toast(`${destinoId.toUpperCase().replace("-","-P")} ya contiene otra levadura; libera P2 antes de agregar esta recosecha.`);
    if(destinoActual&&destinoActual.marcaDescarte) return toast("P2 está marcada para descarte y no puede recibir más volumen.");
    const pos=(x)=>x.toUpperCase().replace("-","-P");
    const disponible=num(destinoActual?.vol)||0;
    const v=await App.UI.form({title:"Agregar recosecha en P2",intro:`Se agregará más volumen de <b>${esc(origen.nombre)}</b> en <b>${pos(destinoId)}</b>. <b>${pos(id)} conservará sus ${f(num(origen.vol)||0,2)} Hl actuales</b>; este volumen nuevo se sumará al inventario.`,fields:[{k:"hl",l:"Nuevo volumen para P2 (Hl)",t:"n",req:true,ph:"Ej.: 60"}],ok:"Agregar volumen"});
    if(!v) return;
    const hl=num(v.hl);
    if(hl==null||hl<=0) return toast("Indica un volumen nuevo mayor que 0 Hl.");
    const fecha=new Date(), iso=fecha.toISOString();
    let destinoNuevo;
    if(destinoActual){
      destinoNuevo=Object.assign({},destinoActual,{vol:Math.round(((num(destinoActual.vol)||0)+hl)*100)/100,volInicial:Math.round(((num(destinoActual.volInicial)??(num(destinoActual.vol)||0))+hl)*100)/100,recosechaUltimoIngreso:iso});
    }else{
      destinoNuevo=Object.assign({},origen,{vol:hl,volInicial:hl,t0:iso,retiro:iso,finRemocion:iso,ingreso:iso,maxCopec:new Date(+fecha+2*86400000).toISOString(),maxAbi:new Date(+fecha+4*86400000).toISOString(),recosechaOrigen:id,recosechaAgregadaEn:iso});
      delete destinoNuevo.marcaDescarte; delete destinoNuevo.recosechar; delete destinoNuevo.recosechaAprobada;
      delete destinoNuevo.recosechaMarcadaEn; delete destinoNuevo.okRecosechaEn;
    }
    const totalAntes=(num(App.S.colectores[id]?.vol)||0)+(num(destinoActual?.vol)||0);
    const ok=await App.Sec.confirmar("¿Agregar volumen a P2?",`Entrarán <b>${f(hl,2)} Hl nuevos</b> de ${esc(origen.nombre)} en ${pos(destinoId)}. ${pos(id)} conservará <b>${f(num(origen.vol)||0,2)} Hl</b>. El inventario total aumentará de ${f(totalAntes,2)} a <b>${f(totalAntes+hl,2)} Hl</b>.`,"Confirmar recosecha");
    if(!ok) return;
    if(!await App.Store.set("colectores",destinoId,destinoNuevo)) return;
    if(origen.levId&&App.S.bdlev[origen.levId]){
      const b=clone(App.S.bdlev[origen.levId]), rows=b.colectores||[], colector=Number(id.match(/^c(\d+)-1$/)[1]), fila=rows.find(x=>Number(x.colector)===colector&&String(x.posicion||"")==="2");
      if(fila){ fila.vol=fila.vacio?hl:(num(fila.vol)||0)+hl; fila.vacio=false; delete fila.fechaVaciado; delete fila.motivoVaciado; }
      else rows.push({colector,posicion:"2",vol:hl,vacio:false});
      b.colectores=rows;
      b.recosechas=(b.recosechas||[]).concat([{fecha:iso,colector,posicion:"2",vol:hl,origenPosicion:id}]);
      if(!await App.Store.set("bdlev",origen.levId,b)){
        if(destinoActual) await App.Store.set("colectores",destinoId,destinoActual); else await App.Store.del("colectores",destinoId);
        return;
      }
    }
    await App.Sec.evento("recosechaAgregada",{pos:id,destino:destinoId,nombre:origen.nombre,generacion:origen.generacion??null,levId:origen.levId||null,hl});
    toast(`${f(hl,2)} Hl nuevos agregados a ${pos(destinoId)}; ${pos(id)} no cambió`);
  };
  App.Act.recosechar = App.Act.recos;
  App.Act.nota = async function(id){
    const x=clone(App.S.colectores[id]); if(!x) return;
    const v=await App.UI.form({title:"Nota · C"+id.slice(1).replace("-","-P")+" · "+x.nombre,fields:[{k:"txt",l:"Nota",t:"t",req:true,ph:"Ej.: Recosechar para FV 31"}],ok:"Agregar nota"});
    if(!v) return; x.notas=(x.notas||[]).concat([{t:new Date().toISOString(),txt:v.txt}]);
    if(await App.Store.set("colectores",id,x)) toast("Nota agregada");
  };
  App.Act.ajustarVolumen = async function(id){
    if(!App.Store.canWrite) return toast("Modo de solo lectura."); const x=clone(App.S.colectores[id]); if(!x) return;
    const v=await App.UI.form({title:"Actualizar volumen · "+x.nombre,values:{vol:x.vol},fields:[{k:"vol",l:"Volumen actual (Hl)",t:"n",req:true}]}); if(!v) return; x.vol=v.vol;
    if(await App.Store.set("colectores",id,x)) toast("Volumen actualizado");
  };
  const VENT={anticipado:["Anticipado","naranja"],v1:["T0 a +12 h","verde"],v2:["+12 a +24 h","verde"],demorado:["Demorado","rojo"]};
  const CAMPOS=[["nombre","Levadura"],["marca","Marca"],["familia","Familia"],["tq","UTQ fuente de cosecha"],["lote","Consecutivo UTQ fuente"],["generacion","Generación"],["levSembrada","Levadura que se sembró"],["t0","Hora 0 remoción (T0)","d"],["retiro","Fecha retiro / inicio remoción","d"],["finRemocion","Fin remoción","d"],["volCabeza","Vol cabeza (Hl)"],["destino","Destino"],["destinoDescarte","Destino del descarte"],["cons","Consistencia","p"],["conteo","Conteo (Mcel/ml)"],["etanol","Concentración etanol (%v/v)"],["viab","Viabilidad","p"],["ph","pH"],["temp","Temp cosecha (°C)"],["sensorial","Sensorial"],["respSensorial","Responsable sensorial"],["responsable","Responsable"],["maxCopec","Fecha máxima resiembra COPEC","d"],["maxAbi","Fecha máxima resiembra ABI","d"],["ventana","Ventana de retiro"],["horasDesdeT0","Horas desde T0"],["comentario","Comentario fuera de ventana"],["obs","Observaciones"]];
  App.Act.VENT=VENT; App.Act.CAMPOS=CAMPOS;
  App.Act.detalle = function(id){ const b=App.S.bdlev[id]; if(!b) return;
    const val=(k,t)=>t==="d"?fmt(b[k]):t==="p"?pc(b[k]):k==="ventana"?(VENT[b[k]]||[""])[0]:esc(b[k]??"—");
    const safe=(x)=>esc(x==null||x===""?"—":x);
    const metric=(k,v)=>`<div class="yd-metric"><div class="k">${k}</div><div class="v">${v}</div></div>`;
    const fact=(k,v)=>`<div class="yd-fact"><div class="k">${k}</div><div class="v">${v}</div></div>`;
    const table=(title,head,rows,empty)=>`<div><div class="yd-table-title">${title}</div>${rows.length?`<div class="yd-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:`<div class="yd-empty">${empty}</div>`}</div>`;
    const p=App.Calc.parseLev(b.nombre)||{};
    const gen=p.gen??b.generacion;
    const colCount=(b.colectores||[]).length;
    const siem=(b.siembras||[]);
    const sal=(b.salidas||[]);
    const volume=(b.volCabeza!=null?f(b.volCabeza,0)+" Hl":colCount?f((b.colectores||[]).reduce((a,c)=>a+(num(c.vol)||0),0),0)+" Hl":"—");
    const body=`<div class="yeast-detail">
      <section class="yd-hero">
        <div class="yd-kicker">${b.destino==="DES"?"Levadura descartada":"Cosecha de levadura"}</div>
        <div class="yd-title"><h2>${esc(b.nombre||"Levadura")}</h2>${gen!=null?`<span class="yd-gen">GENERACIÓN ${esc(gen)}</span>`:""}</div>
        <div class="yd-sub">Familia ${safe(b.familia||p.fam)} · ${safe(b.marca)}${b.tq?` · origen FV ${esc(b.tq)}`:""}${b.lote?` · ${esc(b.lote)}`:""}</div>
        <div class="yd-metrics">
          ${metric("Estado",b.destino==="DES"?'<span class="tag err">DESCARTE</span>':'<span class="tag real">COSECHA</span>')}
          ${metric("T0",b.t0?fmt(b.t0):"—")}
          ${metric("Volumen",volume)}
          ${metric("Viabilidad",b.viab!=null?pc(b.viab):"—")}
        </div>
      </section>

      <section class="yd-section">
        <div class="yd-section-h"><h4>Resumen operativo</h4><span>Información clave de la cosecha</span></div>
        <div class="yd-facts">
          ${fact("UTQ fuente",safe(b.tq))}${fact("Consecutivo",safe(b.lote))}${fact("Generación",gen!=null?"Gen "+esc(gen):"—")}
          ${fact("Inicio remoción",b.retiro?fmt(b.retiro):"—")}${fact("Fin remoción",b.finRemocion?fmt(b.finRemocion):"—")}${fact("Destino",safe(b.destino))}
          ${fact("Consistencia",b.cons!=null?pc(b.cons):"—")}${fact("Viabilidad",b.viab!=null?pc(b.viab):"—")}${fact("pH",safe(b.ph))}
          ${fact("Temperatura",b.temp!=null?esc(b.temp)+" °C":"—")}${fact("Conteo",safe(b.conteo))}${fact("Etanol",b.etanol!=null?esc(b.etanol)+" %v/v":"—")}
        </div>
      </section>

      <section class="yd-section yd-gene">
        ${genealogiaLevadura(b.nombre)}
      </section>

      <section class="yd-section">
        <div class="yd-section-h"><h4>Movimiento de la levadura</h4><span>${siem.length} resiembra${siem.length===1?"":"s"} · ${colCount} colector${colCount===1?"":"es"}</span></div>
        <div class="yd-tables">
          ${table("Resiembras",`<th>Tanque</th><th>Lote</th><th>Fecha</th><th class="n">Hl</th>`,siem.map(z=>`<tr><td><b>FV ${esc(z.tq)}</b></td><td>${safe(z.lote)}</td><td>${fmt(z.fecha)}</td><td class="n">${z.hl!=null?f(z.hl,0):"—"}</td></tr>`),"Aún no se ha sembrado.")}
          ${table("Salidas del colector",`<th>Colector</th><th>Fecha</th><th>Motivo</th>`,sal.map(z=>`<tr><td>${safe(String(z.colector||"").slice(1).replace("-","-P"))}</td><td>${fmt(z.fecha)}</td><td>${safe(z.motivo)}</td></tr>`),"No hay salidas registradas.")}
        </div>
      </section>

      ${(b.colectores||[]).length?`<section class="yd-section"><div class="yd-section-h"><h4>Ubicación en colector</h4><span>${b.colectores.length} posición${b.colectores.length===1?"":"es"}</span></div><div class="yd-facts">${b.colectores.map(c=>fact("Colector",`${safe(c.colector)} · ${safe(c.posicion)} · ${f(c.vol,0)} Hl`)).join("")}</div></section>`:""}
    </div>`;
    const d=App.UI.info("Ficha de levadura · "+(b.nombre||""),body,{wide:true});
    const gene=d.querySelector("#genealogy"); if(gene) gene.addEventListener("click",e=>{ const btn=e.target.closest("[data-genealogy]"); if(!btn) return; const name=btn.dataset.genealogy; d.close(); d.remove(); setTimeout(()=>{ hq=name; hTipo="todos"; hGen=""; hFV=""; hCol=""; hDesde=""; hHasta=""; hOpen=-1; App.render(true); setTimeout(()=>{ const q=document.getElementById("hq"); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } },30); },20); });
  };
  App.Act.exportarBD = async function(){ const q2=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
    const rows=[CAMPOS.map(c=>c[1]).concat(["Colectores","Resiembras"])].concat(Object.values(App.S.bdlev).map(b=>CAMPOS.map(([k,,t])=>t==="d"?fmt(b[k]).replace("—",""):t==="p"&&b[k]!=null?Math.round(b[k]*1000)/10:(b[k]??"")).concat([(b.colectores||[]).map(c=>"C"+c.colector+" "+(c.vol??"")+"Hl").join(" | "),(b.siembras||[]).map(z=>"FV"+z.tq+" "+(z.lote||"")).join(" | ")])));
    if(!App.downloads){ toast("No se puede descargar en este entorno."); return; }
    try{ await App.downloads.save({filename:"base-datos-levadura.csv",data:"\ufeff"+rows.map(r=>r.map(q2).join(";")).join("\r\n")}); toast("Archivo CSV generado"); }catch(e){ if(e&&e.code!=="declined") toast("No se pudo generar el archivo."); } };
  function auditoria(){ const l=Object.values(App.S.eventos).filter(e=>e.tipo==="critico").sort((a,b)=>String(b.t).localeCompare(String(a.t)));
    return l.length?`<div class="card" style="overflow:hidden">${l.slice(0,50).map(e=>`<div class="lrow" style="cursor:default"><span class="m"><b>${esc(e.accion)}</b><span>Antes: ${esc(e.antes)} → Después: ${esc(e.despues)}</span></span><span class="r">${fmt(e.t)}<small>${esc(e.autorizacion||"")}</small></span></div>`).join("")}</div>`:'<p class="small muted">Sin cambios críticos registrados.</p>'; }
  App.V.config={
    render(){ const dias=(App.S.config.marcas||{}).dias||{}; const gc=Object.assign({alerta:8,seguimiento:6},App.S.config.generaciones||{});
      const totalTanques=Object.keys(App.S.tanques||{}).length, totalLevaduras=Object.keys(App.S.bdlev||{}).length, totalColectores=Object.keys(App.S.colectores||{}).length;
      const tema=App.Tema?App.Tema.actual():"dark", modo=App.Store.mode==="db"?"Base compartida":"Modo local";
      return `<div class="config-page"><header class="config-hero"><div><span class="config-eyebrow">PREFERENCIAS Y CONTROL</span><h1>Configuración</h1><p>Ajusta cómo trabaja la plataforma, revisa el estado de los datos y consulta los cambios importantes.</p></div><div class="config-mode"><span class="config-mode-dot"></span><div><small>Conexión de datos</small><b>${modo}</b></div></div></header>
      <section class="config-section"><div class="config-section-head"><span class="config-icon">◐</span><div><h2>Experiencia de uso</h2><p>Personaliza la apariencia de la plataforma.</p></div></div><div class="config-theme-card"><div><b>Apariencia</b><small id="themeModeLabel">Tema actual: ${tema==="dark"?"Oscuro":"Claro"}</small></div><button class="btn" type="button" id="configTheme">Cambiar a tema ${tema==="dark"?"claro":"oscuro"}</button></div></section>
      <div class="config-grid"><section class="config-section"><div class="config-section-head"><span class="config-icon">◷</span><div><h2>Días de referencia por marca</h2><p>Se usan solo cuando no hay mediciones suficientes para calcular T0.</p></div></div><div class="config-help">Equivale al cálculo de respaldo configurado en el Excel. Cambiar estos valores requiere autorización.</div>
        <div class="fg">${App.MARCAS.map(m=>`<label class="f"><span>${m}</span><input class="inp" type="number" step="any" data-dia="${m}" value="${dias[m]??(m==="LIGHT"?4.5:5)}"></label>`).join("")}</div><button class="btn pri" type="button" id="saveDias" style="margin-top:14px">Guardar referencias</button></section>
      <section class="config-section"><div class="config-section-head"><span class="config-icon">↗</span><div><h2>Alertas por generación</h2><p>Define cuándo empezar a vigilar y cuándo marcar una generación como crítica.</p></div></div><div class="fg"><label class="f"><span>Vigilar desde Gen</span><input class="inp" type="number" min="1" max="19" step="1" id="genSeguimiento" value="${gc.seguimiento}"></label><label class="f"><span>Alerta crítica desde Gen</span><input class="inp" type="number" min="2" max="20" step="1" id="genAlerta" value="${gc.alerta}"></label></div><button class="btn pri" type="button" id="saveGenConfig" style="margin-top:14px">Guardar alertas</button></section></div>
      <section class="config-section"><div class="config-section-head"><span class="config-icon">▤</span><div><h2>Datos y exportaciones</h2><p>Consulta cuántos registros hay y descarga archivos para revisar o compartir.</p></div></div><div class="config-data-stats"><div><small>Fermentadores</small><b>${totalTanques}</b></div><div><small>Registros de levadura</small><b>${totalLevaduras}</b></div><div><small>Posiciones ocupadas</small><b>${totalColectores}</b></div></div><div class="config-export-actions">${App.downloads?`<button class="btn" type="button" id="configExportInv">${App.C.icon("download")}Exportar inventario CSV</button><button class="btn" type="button" id="configExportBd">${App.C.icon("download")}Exportar base de levaduras</button>`:`<span class="small muted">Las descargas no están disponibles en este entorno.</span>`}</div></section>
      <section class="config-section"><div class="config-section-head"><span class="config-icon">⌘</span><div><h2>Seguridad y auditoría</h2><p>Los cambios críticos se autorizan y quedan registrados.</p></div></div><p class="config-help">Las consultas son libres. Las operaciones piden confirmación. Los cambios críticos de cálculo y la eliminación requieren contraseña.</p><button class="btn" type="button" id="cambiarPwd">${App.C.icon("settings")}Cambiar contraseña</button><details class="config-audit"><summary>Ver auditoría de cambios críticos</summary>${auditoria()}</details></section>
      <details class="config-danger"><summary><span>Zona avanzada</span><small>Restablecer todos los datos</small></summary><div><p>Elimina tanques, colectores e historial de levadura. Esta acción no se puede deshacer y requiere contraseña.</p><button class="btn dan" type="button" id="borrar">${App.C.icon("trash")}Eliminar todos los datos</button></div></details>
      <details class="config-method"><summary>Cómo se calcula el T0 y qué significan sus referencias</summary><p>Extracto al 15 % = E.O − (E.O − E. límite) × 0,15 y al 75 % = E.O − (E.O − E. límite) × 0,75. Las horas se calculan interpolando las muestras registradas y se pueden ajustar a mano. Con los puntos del 15 % y 75 %, la tendencia se prolonga hasta el extracto límite para estimar T0. Antes de llegar al 75 %, se utiliza una regresión o la tendencia desde el punto del 15 %. Sin datos suficientes, T0 = fin de llenado + días de la marca. T0 marca el inicio de la ventana; +12 h es el momento ideal y +24 h es el máximo recomendado.</p></details></div>`; },
    mount(){
      const themeBtn=document.getElementById("configTheme");
      themeBtn.onclick=()=>{ App.Tema.toggle(); const dark=App.Tema.actual()==="dark"; document.getElementById("themeModeLabel").textContent="Tema actual: "+(dark?"Oscuro":"Claro"); themeBtn.textContent="Cambiar a tema "+(dark?"claro":"oscuro"); };
      const expInv=document.getElementById("configExportInv"), expBd=document.getElementById("configExportBd");
      if(expInv) expInv.onclick=()=>App.Inv.exportar(); if(expBd) expBd.onclick=()=>App.Act.exportarBD();
      document.getElementById("saveGenConfig").onclick=async()=>{ const seguimiento=Math.max(1,Math.min(19,num(document.getElementById("genSeguimiento").value)||6)); const alerta=Math.max(seguimiento+1,Math.min(20,num(document.getElementById("genAlerta").value)||8)); if(await App.Store.set("config","generaciones",{seguimiento,alerta})){ toast(`Control guardado: aviso Gen ${seguimiento} · alerta Gen ${alerta}`); App.go("levaduras"); } };
      document.getElementById("cambiarPwd").onclick=()=>App.Sec.cambiarDialogo();
      document.getElementById("saveDias").onclick=async()=>{ const d={}; document.querySelectorAll("[data-dia]").forEach(i=>{ const x=num(i.value); if(x!=null) d[i.dataset.dia]=x; });
        const antes=(App.S.config.marcas||{}).dias||{}, cambios=App.MARCAS.filter(m=>(antes[m]??(m==="LIGHT"?4.5:5))!==d[m]); if(!cambios.length){ toast("Sin cambios"); return; }
        if(!await App.Sec.pin("Modificar los días hasta T0 por marca")) return;
        if(await App.Store.set("config","marcas",{dias:d})){ for(const m of cambios) await App.Sec.auditar("Días hasta T0 · "+m,(antes[m]??(m==="LIGHT"?4.5:5))+" d",d[m]+" d"); toast("Días guardados"); } };
      document.getElementById("borrar").onclick=async()=>{ const v=await App.UI.form({title:"Eliminar todos los datos",intro:"Escriba BORRAR para confirmar. No se puede deshacer.",fields:[{k:"c",l:"Confirmación",t:"t",req:true}],ok:"Eliminar todo"});
        if(!v||v.c!=="BORRAR") return; if(!await App.Sec.pin("Eliminar todos los datos")) return; await App.Sec.auditar("Todos los datos eliminados",Object.keys(App.S.tanques).length+" tanques · "+Object.keys(App.S.bdlev).length+" registros","(vacío)"); for(const c of ["tanques","colectores","bdlev","colhist"]) for(const id of Object.keys(App.S[c])) await App.Store.del(c,id); toast("Datos eliminados"); App.go("inicio"); };
    }
  };
})();
