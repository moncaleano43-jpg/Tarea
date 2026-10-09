
/* ============================================================
   calc.js — cálculo del T0 y estados
   ============================================================ */
App.MARCAS = ["AGUILA","ESTANDAR","LIGHT","AZTECA","PILSEN","CLUB COLOMBIA"];
App.Calc = (function(){
  const {num,parseDT,HOUR,DAY,fmt,f} = App.U;
  const A15=0.15, A75=0.75, TOL=0.5;
  function regression(xs,ys){ const n=xs.length; if(n<2) return null; const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n; let sxy=0,sxx=0,syy=0;
    for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; syy+=(ys[i]-my)**2; } if(!sxx) return null; const b=sxy/sxx; return {a:my-b*mx,b,r2:syy===0?1:sxy*sxy/(sxx*syy)}; }
  function cruce(pts,target){ for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; if(a.e>=target&&b.e<=target&&a.e!==b.e) return a.h+(a.e-target)*(b.h-a.h)/(a.e-b.e); } return null; }
  const diasMarca = m => { const d=((App.S.config.marcas||{}).dias||{})[m]; return d!=null?d:(m==="LIGHT"?4.5:5); };
  function tanque(t, now=Date.now()){
    const r={}; r.fin=parseDT(t.fin); r.eo=num(t.eo); r.el=num(t.eLim);
    r.e15=(r.eo!=null&&r.el!=null)?r.eo-(r.eo-r.el)*A15:null;
    r.e75=(r.eo!=null&&r.el!=null)?r.eo-(r.eo-r.el)*A75:null;
    r.pts=(t.muestras||[]).map((m,i)=>{ const d=parseDT(m.t), e=num(m.ext); return d&&e!=null&&r.fin?{i,t:d,e,h:(d-r.fin)/HOUR,obs:m.obs}:null; }).filter(Boolean).sort((a,b)=>a.t-b.t);
    const curva=r.eo!=null?[{h:0,e:r.eo}].concat(r.pts.filter(p=>p.h>0)):r.pts;
    r.h15auto=r.e15!=null?cruce(curva,r.e15):null; r.h75auto=r.e75!=null?cruce(curva,r.e75):null;
    r.h15=num(t.h15Man)!=null?num(t.h15Man):r.h15auto; r.h15tipo=num(t.h15Man)!=null?"manual":(r.h15auto!=null?"auto":null);
    r.h75=num(t.h75Man)!=null?num(t.h75Man):r.h75auto; r.h75tipo=num(t.h75Man)!=null?"manual":(r.h75auto!=null?"auto":null);
    const lp=r.pts.length?r.pts[r.pts.length-1]:null; r.ext=lp?lp.e:null; r.extFecha=lp?lp.t:null;
    r.falta75=(r.ext!=null&&r.e75!=null)?Math.max(0,r.ext-r.e75):null;
    r.horasSinMuestra=r.extFecha?(now-r.extFecha)/HOUR:(r.fin?(now-r.fin)/HOUR:null);
    r.horas=r.fin?(now-r.fin)/HOUR:null;
    const T={pasos:[],faltan:[]};
    T.pasos.push(["Fin de llenado (hora 0)",r.fin?fmt(r.fin):"falta"],["Extracto original (E.O)",r.eo!=null?f(r.eo)+" °P":"falta"],["Extracto límite",r.el!=null?f(r.el)+" °P":"falta"]);
    if(r.e15!=null) T.pasos.push(["Extracto al 15 % = E.O − (E.O − E.lím) × 0,15",f(r.e15,3)+" °P"],["Extracto al 75 % = E.O − (E.O − E.lím) × 0,75",f(r.e75,3)+" °P"]);
    if(r.fin&&r.e15!=null&&r.h15!=null&&r.h75!=null&&r.h75!==r.h15){
      T.horas=r.h15+(r.el-r.e15)*(r.h75-r.h15)/(r.e75-r.e15); T.metodo="curva"; T.tipo="est";
      T.pasos.push(["Hora del 15 % ("+(r.h15tipo==="manual"?"ajuste manual":"automática")+")",f(r.h15,1)+" h"],["Hora del 75 % ("+(r.h75tipo==="manual"?"ajuste manual":"automática")+")",f(r.h75,1)+" h"],
        ["Método","Recta entre el 15 % y el 75 % prolongada hasta el extracto límite: horas = H15 + (E.lím − E15) × (H75 − H15) / (E75 − E15)"],["Horas hasta T0",f(T.horas,2)+" h"]);
    } else if(r.fin&&r.e15!=null){
      const w=r.pts.filter(p=>p.e<=r.e15+TOL&&p.e>=r.e75-TOL); T.pares=w;
      const g=w.length>=2?regression(w.map(p=>p.e),w.map(p=>p.h)):null;
      if(g){ T.horas=g.a+g.b*r.el; T.reg=g; T.metodo="regresion"; T.tipo="est"; r.h75proj=g.a+g.b*r.e75;
        T.pasos.push(["Método","Aún no llega al 75 %: regresión de horas vs extracto con "+w.length+" muestras entre "+f(r.e75-TOL)+" y "+f(r.e15+TOL)+" °P, proyectada al extracto límite"],["R²",f(g.r2,3)],["75 % proyectado",f(r.h75proj,1)+" h"],["Horas hasta T0",f(T.horas,2)+" h"]); }
      else if(r.h15!=null&&r.ext!=null&&r.ext<r.e15&&r.extFecha){
        const hl=(r.extFecha-r.fin)/HOUR, vel=(r.e15-r.ext)/(hl-r.h15);
        if(vel>0){ r.h75proj=r.h15+(r.e15-r.e75)/vel; T.horas=r.h15+(r.e15-r.el)/vel; T.metodo="tendencia"; T.tipo="est"; T.tend={h:hl,e:r.ext};
          T.pasos.push(["Método","Aún no llega al 75 %: se proyecta con la velocidad entre el punto del 15 % y la última muestra ("+f(vel,3)+" °P/h), prolongada hasta el extracto límite"],["75 % proyectado",f(r.h75proj,1)+" h"],["Horas hasta T0",f(T.horas,2)+" h"]); }
      }
      if(!T.metodo&&r.e15!=null) T.faltan.push(r.h15==null?"que una muestra pase el 15 % de atenuación ("+f(r.e15,2)+" °P)":"una muestra por debajo del 15 % para proyectar");
    }
    if(T.metodo&&!(T.horas>=0&&isFinite(T.horas))){ T.faltan=["la proyección dio un valor no válido; revise las muestras"]; T.metodo=null; T.horas=null; }
    if(!T.metodo){
      if(r.el==null) T.faltan.unshift("extracto límite"); if(r.eo==null) T.faltan.unshift("extracto original"); if(!r.fin) T.faltan.unshift("fin de llenado");
      if(r.fin){ const d=diasMarca(t.marca); T.horas=d*24; T.metodo="marca"; T.tipo="proy";
        T.pasos.push(["Método","Sin datos suficientes: fin de llenado + "+f(d,1)+" días de la marca (igual que la macro del Excel, levadura marcada (P))"]); }
    }
    if(T.metodo) { T.t0=new Date(+r.fin+T.horas*HOUR); T.pasos.push(["T0 "+(T.tipo==="proy"?"proyectado":"estimado"),fmt(T.t0)]); }
    r.T=T; r.t0=T.t0||null;
    r.mas12=r.t0?new Date(+r.t0+12*HOUR):null; r.venc=r.t0?new Date(+r.t0+24*HOUR):null;
    if(t.excelT0&&r.t0) r.difExcel=(r.t0-parseDT(t.excelT0))/60000;
    r.nombreCosecha=nombreCosecha(t);
    r.atenuacion = (r.eo!=null && r.el!=null && r.ext!=null && r.eo!==r.el)
      ? Math.max(0, Math.min(1, (r.eo - r.ext) / (r.eo - r.el))) : null;
    r.proy = null;
    const pts2 = r.pts.filter(p=>p.h>=0);
    if(pts2.length >= 2){
      const a = pts2[pts2.length-2], b = pts2[pts2.length-1];
      const dh = b.h - a.h, de = b.e - a.e;
      if(dh > 0 && de < 0){
        const vel = de / dh;
        const hProy = [], hFin = b.h + 24;
        for(let h=b.h; h<=hFin; h+=2){
          const e = b.e + vel * (h - b.h);
          if(r.el!=null && e < r.el - 0.5) break;
          hProy.push({h, e});
        }
        r.proy = {vel, pts:hProy, desde:b.h};
      }
    }
    if(r.e15!=null && r.h15==null && r.proy){
      const p = r.proy.pts.find(x=>x.e<=r.e15);
      if(p){ r.h15proy = p.h; r.e15proy = r.e15; }
    }
    if(r.e75!=null && r.h75==null && r.proy){
      const p = r.proy.pts.find(x=>x.e<=r.e75);
      if(p){ r.h75proy = p.h; r.e75proy = r.e75; }
    }
    r.velDia = r.proy ? Math.abs(r.proy.vel) * 24 : null;
    return r;
  }
  function estado(r, now=Date.now()){
    if(!r.t0) return {k:"sin",txt:"SIN T0",cls:"none",ord:5};
    if(now>+r.venc) return {k:"rojo",txt:"VENCIDA",cls:"crit",ord:0};
    if(now>=+r.mas12) return {k:"naranja",txt:"POR VENCER",cls:"att",ord:1};
    if(now>=+r.t0) return {k:"verde",txt:"LISTA PARA SACAR",cls:"ok",ord:2};
    if(now>=+r.t0-12*HOUR) return {k:"amarillo",txt:"T0 PRÓXIMO",cls:"prox",ord:3};
    return {k:"gris",txt:"EN ESPERA",cls:"none",ord:4};
  }
  function ventana(retiro,t0){
    if(!retiro||!t0) return null; const h=(retiro-t0)/HOUR;
    if(h<0) return {k:"anticipado",txt:"Retiro anticipado (antes del T0)",cls:"att",h,coment:true};
    if(h<=12) return {k:"v1",txt:"Dentro de la ventana (T0 a +12 h)",cls:"ok",h,coment:false};
    if(h<=24) return {k:"v2",txt:"Dentro de la ventana (+12 h a +24 h)",cls:"ok",h,coment:false};
    return {k:"demorado",txt:"Retiro demorado (después de T0 + 24 h)",cls:"crit",h,coment:true};
  }
  function parseLev(nombre){ const m=/^([A-Z])([A-Z])(\d+)F(\d+)$/.exec(String(nombre||"").toUpperCase().replace(/^\(P\)\s*/,"").trim()); return m?{fam:m[2],gen:Number(m[3]),tq:Number(m[4])}:null; }
  function nombreCosecha(t){
    const L=t.levadura||{}, m=t.marca||"", tq=t.tq; if(!m||!tq||!L.nombre) return null;
    const ini=m==="AZTECA"?"Z":m.charAt(0), sem=String(L.nombre).toUpperCase().trim();
    if(L.origen==="propagador") return ini+sem.slice(0,2)+"1F"+tq;
    const p=parseLev(sem), fam=p?p.fam:sem.charAt(1), g=num(L.generacion)!=null?num(L.generacion):(p?p.gen:null);
    return g!=null&&fam?ini+fam+(g+1)+"F"+tq:null;
  }
  function estadoColector(c, now=Date.now()){
    const mr=parseDT(c.maxAbi); if(!mr) return {txt:"SIN FECHA",cls:"none"};
    if(now>+mr) return {txt:"VENCIDA PARA RESIEMBRA",cls:"crit"};
    if(now>=+mr-12*HOUR) return {txt:"VENCE PRONTO",cls:"att"};
    return {txt:"DISPONIBLE",cls:"ok"};
  }
  return {tanque,estado,ventana,parseLev,nombreCosecha,estadoColector,diasMarca};
})();
