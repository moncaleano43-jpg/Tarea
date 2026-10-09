
(function(){
  const {esc,clone,parseDT,fmtS,toast}=App.U,HOUR=3600000;
  const previous=App.V.fv,targets={ESTANDAR:10,STD:10,LIGHT:9.5,AZTECA:9,'CLUB COLOMBIA':9,CLUB:9};
  const n=App.FVRegistration.num,fmt=v=>v==null?'—':new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(v);
  const brand=r=>({S:'ESTANDAR',L:'LIGHT',Z:'AZTECA',CC:'CLUB COLOMBIA',PS:'PILSEN',A:'AGUILA'}[r.brand]||String(r.brand||'').toUpperCase());
  function model(r){
    const source=r.fermentation||App.S.tanques?.[r.consecutive]||{},registration=r.fvRegistration||{};
    return Object.assign({},source,{eo:n(source.eo)??App.FVRegistration.totals(registration).extract,eLim:n(source.eLim),marca:brand(r),fin:registration.fillEnd||r.fill||null,lote:r.consecutive,tq:r.tq,muestras:source.muestras||[]});
  }
  function crossing(points,target){
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(a.e>=target&&b.e<=target&&a.e>b.e)return {time:a.time+(a.e-target)/(a.e-b.e)*(b.time-a.time),kind:'interpolada'};}
    const p=points.find(p=>p.e<=target);return p?{time:p.time,kind:'observada'}:null;
  }
  function analyze(t,record){
    const fin=+parseDT(t.fin),eo=n(t.eo),el=n(t.eLim);
    const pts=(t.muestras||[]).map((m,i)=>({time:+parseDT(m.t),e:n(m.ext),i,obs:m.obs||''})).filter(p=>p.time&&p.e!=null&&(!fin||p.time>=fin)).sort((a,b)=>a.time-b.time);
    const curve=fin&&eo!=null?[{time:fin,e:eo,initial:true},...pts.filter(p=>p.time!==fin)]:pts;
    const target=targets[t.marca]??null,last=pts.at(-1),valid=eo!=null&&el!=null&&eo>el;
    const target15=valid?eo-(eo-el)*.15:null,target75=valid?eo-(eo-el)*.75:null;
    let alta=target!=null?crossing(curve,target):null,rate=null;
    if(!alta&&target!=null&&pts.length>=2){
      const p=pts.slice(-3),base=p[0].time,x=p.map(p=>(p.time-base)/HOUR),y=p.map(p=>p.e),mx=x.reduce((a,b)=>a+b,0)/x.length,my=y.reduce((a,b)=>a+b,0)/y.length;
      const den=x.reduce((s,v)=>s+(v-mx)**2,0),slope=den?x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/den:0;
      if(slope<0&&last.e>target){rate=-slope;alta={time:last.time+(target-last.e)/slope*HOUR,kind:'proyectada',points:p.length};}
    }
    let calc=null,t0=null;
    if(valid&&fin){calc=App.Calc.tanque(Object.assign({},t,{h15Man:null,h75Man:null}));if(calc.T?.metodo!=='marca'&&calc.t0)t0=+calc.t0;}
    const result={pts,curve,target,last,eo,el,fin,valid,target15,target75,at15:target15!=null?crossing(curve,target15):null,at75:target75!=null?crossing(curve,target75):null,attenuation:valid&&last?(eo-last.e)/(eo-el)*100:null,apparent:eo>0&&last?(eo-last.e)/eo*100:null,alta,rate,t0,calc};const history=historical(t,result);if(history){result.alta=history;result.history=history;}return App.TankProcess?App.TankProcess.enhance(t,result,record):result;
  }
  function historical(t,a){
    if(!App.Hist2?.hist||!a.fin||a.target==null||a.pts.length<2||a.last.e<=a.target)return null;
    const key=v=>brand({brand:v}).replace(/\s+/g,' '),interp=(p,h)=>{for(let i=1;i<p.length;i++)if(h>=p[i-1].h&&h<=p[i].h&&p[i].h>p[i-1].h)return p[i-1].e+(p[i].e-p[i-1].e)*(h-p[i-1].h)/(p[i].h-p[i-1].h);return null;};
    const recent=a.pts.slice(-4),cases=[];
    for(const c of App.Hist2.hist()){
      if(key(c.marca)!==key(t.marca)||!c.finT||c.finT>=a.fin||c.pts?.length<4)continue;
      const differences=recent.map(p=>{const e=interp(c.pts,(p.time-a.fin)/HOUR);return e==null?null:Math.abs(e-p.e);}).filter(v=>v!=null);
      if(differences.length<2||differences.length<Math.ceil(recent.length*.6))continue;
      const distance=differences.reduce((x,y)=>x+y,0)/differences.length+.3*Math.abs((c.eo??a.eo)-a.eo);
      if(!Number.isFinite(distance)||distance>1.2)continue;
      const curve=c.pts.map(p=>({time:p.h*HOUR,e:p.e})),end=crossing(curve,a.target),current=crossing(curve,a.last.e);
      if(!end||!current||end.time<current.time)continue;
      cases.push({lote:c.lote,tq:c.tq,fin:c.finT,distance,hours:(end.time-current.time)/HOUR});
    }
    cases.sort((a,b)=>a.distance-b.distance);const selected=cases.slice(0,15);if(selected.length<5)return null;
    const values=selected.map(c=>c.hours).sort((a,b)=>a-b),q=f=>{const i=(values.length-1)*f,j=Math.floor(i);return values[j]+(values[Math.min(j+1,values.length-1)]-values[j])*(i-j);};
    return {time:a.last.time+q(.5)*HOUR,lo:a.last.time+q(.25)*HOUR,hi:a.last.time+q(.75)*HOUR,kind:'proyectada',historical:true,n:selected.length,cases:selected};
  }
  function chart(a){
    if(App.TankProcess&&a.processRecord)return App.TankProcess.chart(model(a.processRecord),a);
    if(!a.curve.length)return '<p class="fv-helper">Registra extracto original y muestras para construir la curva.</p>';
    const actual=a.curve,forecast=a.alta?.kind==='proyectada'?{time:a.alta.time,e:a.target}:null;
    const lo=actual[0].time,hi=Math.max(actual.at(-1).time,forecast?.time||0,a.t0||0,lo+HOUR),max=Math.max(...actual.map(p=>p.e),a.target||0,1)*1.08;
    const X=t=>60+(t-lo)/(hi-lo)*670,Y=e=>260-e/max*220;
    const path=p=>p.map((q,i)=>(i?'L':'M')+X(q.time).toFixed(2)+','+Y(q.e).toFixed(2)).join(' ');
    return `<div class="fv-curve"><svg viewBox="0 0 800 320" role="img" aria-label="Curva de extracto aparente en grados Plato"><text x="60" y="22">Extracto aparente (°P)</text>${Array.from({length:5},(_,i)=>{const v=max*i/4;return `<line x1="60" x2="730" y1="${Y(v)}" y2="${Y(v)}" class="fv-gridline"/><text x="48" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}).join('')}${a.target!=null?`<line x1="60" x2="730" y1="${Y(a.target)}" y2="${Y(a.target)}" class="fv-targetline"/><text x="734" y="${Y(a.target)-5}">Alta ${fmt(a.target)}</text>`:''}${[[a.target15,'15 %'],[a.target75,'75 %'],[a.el,'E. límite']].filter(([v])=>v!=null).map(([v,label])=>`<line x1="60" x2="730" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--muted)" stroke-dasharray="3 6" opacity=".5"/><text x="65" y="${Y(v)-5}">${label} · ${fmt(v)}</text>`).join('')}${a.t0?`<line x1="${X(a.t0)}" x2="${X(a.t0)}" y1="40" y2="260" stroke="#af52de" stroke-dasharray="5 4"/><text x="${X(a.t0)}" y="35" text-anchor="middle">T0</text>`:''}${a.at15&&a.at75&&a.t0?`<path d="${path([{time:a.at15.time,e:a.target15},{time:a.at75.time,e:a.target75},{time:a.t0,e:a.el}])}" fill="none" stroke="#af52de" stroke-width="2" stroke-dasharray="5 4"/>`:''}<path d="${path(actual)}" class="fv-curveline"/>${forecast?`<path d="${path([actual.at(-1),forecast])}" class="fv-forecastline"/>`:''}${actual.map(p=>`<circle cx="${X(p.time)}" cy="${Y(p.e)}" r="4" class="fv-curvepoint"><title>${esc(fmtS(new Date(p.time)))} · ${fmt(p.e)} °P${p.initial?' · Extracto original':''}</title></circle>`).join('')}${[0,.25,.5,.75,1].map(f=>{const t=lo+(hi-lo)*f,d=new Date(t);return `<text x="${X(t)}" y="285" text-anchor="middle">${d.getDate()}/${d.getMonth()+1}</text><text x="${X(t)}" y="303" text-anchor="middle">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</text>`;}).join('')}</svg></div><p class="fv-helper">Línea azul: extracto aparente registrado. Línea azul punteada: proyección a la meta de alta. Morada: cálculo del T0. Horizontales: 15 %, 75 % y extracto límite.</p>`;
  }
  const time=t=>t?fmtS(new Date(t)):'Pendiente de datos';
  const stat=(label,value,help='')=>`<div class="fv-metric"><span>${label}</span><b>${value}</b><small>${help}</small></div>`;
  function view(tq){
    const r=App.Cavas.records().find(r=>r.tq===+tq&&r.operation==='F');if(!r)return '<p>FV no encontrado.</p>';
    const t=model(r),a=analyze(t,r),alta=a.alta;
    const L=r.fvRegistration||{},legacy=App.S.tanques?.[r.consecutive]||{},yeast=L.yeastName||r.yeast||legacy.levadura?.nombre||'Sin dato';
    const stage=a.target!=null&&a.last?.e<=a.target?'Meta de alta alcanzada':a.last?'Seguimiento de fermentación':'Pendiente de muestras';
    const milestone=(label,date,kind)=>`<li class="lv-${date?'est':'pend'}"><span class="dot" aria-hidden="true"></span><b>${label}</b><span>${time(date)}</span><em>${date?kind:'Pendiente'}</em></li>`;
    return `<div class="fv-detail"><a class="back" href="#/tanques/fermentadores">← Fermentadores</a>
    <header class="fv-hero fade-in" style="--c:var(--accent)"><div class="fv-hero-l"><div class="fv-hero-tag">${esc(brand(r))} · Fermentación</div><h1 class="fv-hero-t">FV ${r.tq} <span class="fv-hero-lote">${esc(r.consecutive)}</span></h1><div class="fv-hero-lineage"><span><small>Levadura sembrada</small><b>${esc(yeast)}</b></span><span><small>Colector de procedencia</small><b>${L.collector!=null?'C'+esc(L.collector):'Sin dato'}</b></span></div><div class="fv-hero-status"><span class="tag">${stage}</span></div></div><div class="fv-hero-r"><a class="btn lg" href="#/fv/registro/${r.tq}">Editar registro FV</a>${App.Store.canWrite?'<button class="btn pri lg" id="fvSampleAdd">+ Muestra de extracto</button>':''}<div class="fv-hero-next"><small>PRÓXIMO PASO</small><b>${a.last?'Continuar seguimiento del extracto':'Registrar la primera muestra'}</b><span>${a.alta?'Alta: '+time(a.alta.time):'La proyección aparecerá con datos suficientes'}</span></div></div></header>
    <div class="fv-grid fade-in"><section class="fv-t0" style="--c:var(--accent)" aria-label="Tiempo cero"><div class="fv-t0-h"><span class="lbl">TIEMPO 0 · RETIRO DE LEVADURA</span><span class="tag">${a.t0?'Calculado':'Pendiente'}</span></div>${a.t0?`<div class="fv-clock">${String(new Date(a.t0).getHours()).padStart(2,'0')}:${String(new Date(a.t0).getMinutes()).padStart(2,'0')}</div><div class="fv-date">${time(a.t0)}</div>`:'<p class="fv-helper">Se necesitan extracto original, extracto límite y muestras suficientes.</p>'}<div class="fv-att"><div class="fv-att-top"><span>Atenuación del descenso</span><b>${fmt(a.attenuation)}${a.attenuation!=null?' %':''}</b></div><div class="fv-att-bar"><i style="width:${Math.max(0,Math.min(100,a.attenuation||0))}%;--c:var(--accent)"></i><span class="mk" style="left:15%"></span><span class="mk" style="left:75%"></span></div><div class="fv-att-sub">Extracto actual <b>${a.last?fmt(a.last.e)+' °P':'Sin muestra'}</b> · referencias 15 % y 75 %</div></div>${a.t0?`<div class="wsteps">${[['T0',a.t0],['T0 +12 h',a.t0+12*HOUR],['T0 +24 h',a.t0+24*HOUR]].map(([label,date])=>`<div><div class="k">${label}</div><div class="v">${time(date)}</div></div>`).join('')}</div><p class="fv-helper">Referencias de retiro del proyecto original; confirmar la programación del turno.</p>`:''}</section><aside class="fv-side"><div class="fv-side-h">Resumen del lote</div><dl class="fv-facts">${[['Fin de llenado',time(a.fin)],['Extracto original',fmt(a.eo)+' °P'],['Extracto límite',fmt(a.el)+' °P'],['Volumen',fmt(r.volume)+' Hl'],['Muestras',a.pts.length],['Última muestra',time(a.last?.time)],['Meta de alta',fmt(a.target)+' °P'],['Alta prevista',time(a.alta?.time)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><div class="fv-side-acts"><a class="btn ghost sm" href="#/fv/registro/${r.tq}">Editar datos del tanque</a></div></aside></div>
    <section class="card card-p sec fade-in"><div class="sec-h"><h2>Línea de vida del FV</h2></div><ol class="life life-v2">${milestone('Fin llenado',a.fin,'Registrado')}${milestone('15 %',a.at15?.time,'Interpolado')}${milestone('Alta',a.alta?.time,a.alta?.kind==='proyectada'?'Proyectado':'Según muestras')}${milestone('75 %',a.at75?.time,'Interpolado')}${milestone('T0',a.t0,'Calculado')}</ol></section>
    <div class="fv-metrics">${stat('Último extracto aparente',a.last?fmt(a.last.e)+' °P':'Sin muestras',a.last?time(a.last.time):'')}${stat('Atenuación del descenso',fmt(a.attenuation)+(a.attenuation!=null?' %':''),'(EO − EA) / (EO − E. límite)')}${stat('Atenuación aparente',fmt(a.apparent)+(a.apparent!=null?' %':''),'(EO − EA) / EO')}${stat('Tiempo 0 (T0)',time(a.t0),a.t0?'Estimado al extracto límite':'Necesita EO, extracto límite y muestras suficientes')}</div>
    <section class="fv-detail-section"><h2>Alta de fermentación</h2><div class="fv-alta"><div><span>Meta de ${esc(brand(r))}</span><b>${a.target!=null?fmt(a.target)+' °P':'Sin meta definida'}</b></div><div><span>${alta?.kind==='proyectada'?'Hora estimada de alta':alta?.kind==='interpolada'?'Cruce de alta interpolado':'Alta observada en muestra'}</span><b>${time(alta?.time)}</b><small>${alta?.historical?`Comparación con ${alta.n} fermentaciones anteriores de la misma marca. Rango central histórico: ${time(alta.lo)} a ${time(alta.hi)}. Confirmar con una muestra; no es un alta automática.`:alta?.kind==='proyectada'?`Tendencia de las últimas ${alta.points} muestras · ${fmt(a.rate)} °P/h. Confirmar con una nueva muestra.`:alta?'Según los valores de extracto registrados.':'Añade al menos dos muestras con caída de extracto para proyectar.'}</small></div></div></section>
    ${App.Store.canWrite?`<section class="fv-detail-section"><h2>Registrar extracto aparente</h2><form id="fvInlineSample" class="fv-reference"><label class="f"><span>Fecha y hora de la muestra</span><input name="t" type="datetime-local" value="${esc(App.U.toIn(new Date()))}" required></label><label class="f"><span>Extracto aparente (°P)</span><input name="ext" type="text" inputmode="decimal" placeholder="Ej. 10,5" required></label><label class="f"><span>Observación del turno</span><input name="obs" type="text"></label><button class="btn pri" type="submit">Guardar muestra</button><small>Al guardar se actualizan la curva, las atenuaciones, el T0 y la proyección de alta.</small></form></section>`:''}
    ${a.history?`<section class="fv-detail-section"><h2>Fermentaciones anteriores comparables</h2><p class="fv-helper">Se comparan hasta cuatro muestras recientes y el extracto original. Solo se utilizan llenados anteriores a este FV; mínimo cinco curvas similares. El rango corresponde a los percentiles 25 y 75 del tiempo restante observado.</p><div class="fv-table-scroll"><table class="fv-progress-table"><thead><tr><th>Consecutivo</th><th>FV</th><th>Fin llenado</th><th>Horas desde el EA actual hasta la meta</th></tr></thead><tbody>${a.history.cases.map(c=>`<tr><td>${esc(c.lote)}</td><td>${esc(c.tq)}</td><td>${time(c.fin)}</td><td>${fmt(c.hours)} h</td></tr>`).join('')}</tbody></table></div></section>`:'<p class="fv-helper">Cuando no hay cinco fermentaciones históricas similares, la proyección usa la tendencia reciente de este FV.</p>'}
    <section class="fv-detail-section curve-panel"><div class="curve-head"><div><span class="curve-eyebrow">LECTURA DEL PROCESO</span><h2>Curva de fermentación · Extracto aparente</h2><p class="muted">Mediciones reales y referencias calculadas del FV.</p></div><span class="curve-badge">${a.pts.length} muestras</span></div>${chart(a)}</section>
    <section class="fv-detail-section"><h2>Extractos de referencia y atenuaciones</h2><div class="fv-reference"><label class="f"><span>Extracto original EO (°P)</span><input id="fvEO" type="text" inputmode="decimal" value="${esc(t.eo??'')}" ${App.Store.canWrite?'':'disabled'}></label><label class="f"><span>Extracto límite (°P)</span><input id="fvEL" type="text" inputmode="decimal" value="${esc(t.eLim??'')}" ${App.Store.canWrite?'':'disabled'}></label>${App.Store.canWrite?'<button class="btn" id="fvRefsSave">Guardar referencias</button>':''}</div><div class="fv-metrics">${stat('15 % del descenso',fmt(a.target15)+(a.target15!=null?' °P':''),time(a.at15?.time))}${stat('75 % del descenso',fmt(a.target75)+(a.target75!=null?' °P':''),time(a.at75?.time))}${stat('Velocidad 15 % → 75 %',a.at15&&a.at75&&a.at75.time>a.at15.time?fmt((a.target15-a.target75)/((a.at75.time-a.at15.time)/HOUR))+' °P/h':'Pendiente','Descenso de extracto / horas transcurridas')}</div><p class="fv-helper">El T0 usa la recta entre los puntos de 15 % y 75 %, o la tendencia disponible antes de llegar al 75 %. Se actualiza con las muestras.</p></section>
    <details class="calc sec fv-detail-section"><summary>Ver cálculo técnico del T0</summary><div class="in"><p class="fv-helper">${esc(({curva:'Recta del 15 % al 75 % prolongada al extracto límite',regresion:'Regresión de las muestras disponibles',tendencia:'Tendencia desde el 15 %'})[a.calc?.T?.metodo]||'Datos insuficientes')}</p>${a.t0?`<ol class="steps">${(a.calc?.T?.pasos||[]).map(([label,value])=>`<li><span>${esc(label)}</span><b>${esc(value)}</b></li>`).join('')}</ol>`:''}</div></details>
    <section class="fv-detail-section"><h2>Muestras de extracto aparente</h2><div class="fv-table-scroll"><table class="fv-progress-table"><thead><tr><th>Fecha y hora</th><th>Horas desde llenado</th><th>EA (°P)</th><th>Atenuación (°P/h)</th><th>Atenuación del descenso (%)</th><th>Atenuación aparente (%)</th><th>Observación</th><th></th></tr></thead><tbody>${a.pts.map((p,j)=>`<tr><td>${time(p.time)}</td><td>${a.fin?fmt((p.time-a.fin)/HOUR):'—'}</td><td>${fmt(p.e)}</td><td>${j&&p.time>a.pts[j-1].time?fmt((a.pts[j-1].e-p.e)/((p.time-a.pts[j-1].time)/HOUR)):'—'}</td><td>${a.valid?fmt((a.eo-p.e)/(a.eo-a.el)*100):'—'}</td><td>${a.eo>0?fmt((a.eo-p.e)/a.eo*100):'—'}</td><td>${esc(p.obs)}</td><td>${App.Store.canWrite?`<button class="btn sm" data-fv-sample="${p.i}">Editar</button>`:''}</td></tr>`).join('')}</tbody></table></div>${a.pts.length?'':'<p class="fv-helper">Todavía no hay muestras registradas.</p>'}</section></div>`;
  }
  async function saveModel(r,t){const snapshot=clone(App.S.config.inventarioCavas||App.CAVAS_SEED);snapshot.records=App.Cavas.records().map(x=>x.tq===r.tq?Object.assign({},x,{fermentation:clone(t),manualUpdatedAt:new Date().toISOString()}):x);return App.Store.set('config','inventarioCavas',snapshot);}
  async function sample(tq,index){
    const r=App.Cavas.records().find(r=>r.tq===+tq),t=model(r),old=index!=null?t.muestras[index]:null;
    const d=await App.UI.form({title:old?'Editar muestra de extracto':'Registrar muestra de extracto',values:old||{t:App.U.toIn(new Date())},fields:[{k:'t',l:'Fecha y hora',t:'dt',req:true},{k:'ext',l:'Extracto aparente (°P)',t:'n',req:true},{k:'obs',l:'Observación'}],validate:v=>v.ext==null||v.ext<0?'El extracto debe ser mayor o igual a cero.':+parseDT(v.t)<+parseDT(t.fin)?'La muestra debe ser posterior al fin de llenado.':t.muestras.some((m,i)=>i!==index&&+parseDT(m.t)===+parseDT(v.t))?'Ya hay una muestra en esa fecha y hora.':null});
    if(!d)return;if(index!=null)t.muestras[index]=d;else t.muestras.push(d);
    if(await saveModel(r,t)){toast('Muestra guardada');App.render(true);}
  }
  App.V.fv={render(action,tq){return action==='detalle'?view(tq):previous.render(action,tq);},mount(action,tq){
    if(action!=='detalle')return previous.mount(action,tq);
    const r=App.Cavas.records().find(r=>r.tq===+tq&&r.operation==='F');if(!r)return;
    document.getElementById('fvInlineSample')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,t=model(r),date=form.elements.t.value,ext=n(form.elements.ext.value),timestamp=+parseDT(date);
      if(!Number.isFinite(timestamp)||!timestamp||ext==null||ext<0)return toast('Indica una fecha válida y extracto mayor o igual a cero.');
      if(timestamp<+parseDT(t.fin))return toast('La muestra debe ser posterior al fin de llenado.');
      if(t.muestras.some(m=>+parseDT(m.t)===timestamp))return toast('Ya existe una muestra en esa fecha. Usa Editar en la tabla.');
      t.muestras.push({t:date,ext,obs:form.elements.obs.value.trim()});
      if(await saveModel(r,t)){toast('Muestra guardada · curva y proyecciones actualizadas');App.render(true);}
    });
    document.getElementById('fvSampleAdd')?.addEventListener('click',()=>sample(tq));
    document.querySelectorAll('[data-fv-sample]').forEach(b=>b.onclick=()=>sample(tq,+b.dataset.fvSample));
    document.getElementById('fvRefsSave')?.addEventListener('click',async()=>{const eo=n(document.getElementById('fvEO').value),el=n(document.getElementById('fvEL').value);if(eo==null||el==null||el<0||eo<=el)return toast('Indica EO mayor que el extracto límite, y límite mayor o igual a cero.');const t=model(r);t.eo=eo;t.eLim=el;if(await saveModel(r,t)){toast('Referencias guardadas');App.render(true);}});
  }};
  App.FVDetail={analyze,targets,model,historical};
})();

