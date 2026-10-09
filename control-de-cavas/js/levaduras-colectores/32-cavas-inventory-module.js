
/* v36 · Inventario de UTQ con operación de fermentación o maduración. */
(function(){
  const {esc, fmtS, parseDT, toast, clone}=App.U;
  const previous=App.V.tanques;
  const filters={todos:'Todos',fermentadores:'Fermentadores',maduradores:'Maduradores',sinoperacion:'Sin operación'};
  const labels={F:'Fermentador',M:'Madurador','':'Sin operación indicada'};
  const brands={S:'ESTANDAR',L:'LIGHT',PS:'PILSEN',Z:'AZTECA',CC:'CLUB COLOMBIA',A:'AGUILA'};
  let query='';
  const state=()=>App.ExcelCavas?.inventory()||App.S.config.inventarioCavas||App.CAVAS_SEED;
  const records=()=>(state().records||[]).map(r=>{
    const seed=App.CAVAS_SEED.records.find(s=>s.tq===r.tq&&s.operation===r.operation&&s.fill===r.fill&&(!r.consecutive||r.consecutive===s.consecutive));
    const record=!seed?r:Object.assign({},r,{consecutive:r.consecutive||seed.consecutive,fermentation:r.fermentation||seed.fermentation,fvRegistration:r.fvRegistration||(!r.manualUpdatedAt?seed.fvRegistration:undefined)});return App.TankPurges?.apply(record)||record;
  });
  const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const nf=new Intl.NumberFormat('es-CO',{maximumFractionDigits:2});
  const qty=(v,unit='')=>number(v)==null?'Sin dato':nf.format(v)+(unit?' '+unit:'');
  const date=v=>v&&parseDT(v)?fmtS(parseDT(v)):'Sin dato';
  const brand=r=>brands[r.brand]||r.brand||'Marca sin dato';
  const counts=()=>({todos:records().length,fermentadores:records().filter(r=>r.operation==='F').length,maduradores:records().filter(r=>r.operation==='M').length,sinoperacion:records().filter(r=>!r.operation).length});
  const match=(r,filter)=>filter==='fermentadores'?r.operation==='F':filter==='maduradores'?r.operation==='M':filter==='sinoperacion'?!r.operation:true;
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const active=r=>r.operation==='F'?App.tanquesActivos().find(t=>+t.tq===r.tq&&t.fin&&r.fill&&Math.abs(+parseDT(t.fin)-+parseDT(r.fill))<60000):null;
  const summary=()=>{
    const c=counts();
    return `<section class="cavas-summary" aria-label="Inventario de cavas">${Object.entries(filters).map(([k,label])=>`<a href="#/tanques/${k}"><strong>${c[k]}</strong><span>${label}</span></a>`).join('')}</section>`;
  };
  function draftTable(){
    const drafts=App.FVRegistration?.listDrafts()||[];
    return `<section class="fv-progress"><div class="sec-h"><div><h2>Registro FV · En curso</h2><p class="fv-helper">Completa el registro entre turnos. Cada avance se guarda automáticamente.</p></div></div>${drafts.length?`<div class="fv-table-scroll"><table class="fv-progress-table"><thead><tr><th>FV</th><th>Consecutivo</th><th>Marca</th><th>Inicio llenado</th><th>Último avance</th><th></th></tr></thead><tbody>${drafts.sort((a,b)=>String(a.data.consecutive||'').localeCompare(String(b.data.consecutive||''),undefined,{numeric:true})).map(({id,data:d})=>`<tr><td>${d.tq?'FV '+esc(d.tq):'Por seleccionar'}</td><td>${esc(d.consecutive||'Pendiente')}</td><td>${esc(d.brand||'Pendiente')}</td><td>${date(d.fillStart)}</td><td>${date(d.draftUpdatedAt)}</td><td><a class="btn sm" href="#/fv/registro${id==='new'?'':'/'+encodeURIComponent(id)}">Continuar registro</a></td></tr>`).join('')}</tbody></table></div>`:'<p class="fv-helper">Al comenzar un FV, aparecerá aquí para que el siguiente turno pueda continuarlo.</p>'}</section>`;
  }
  function list(filter){
    const operationOrder={F:0,M:1,'':2};
    const sequence=r=>/^([FM])(\d+)$/i.test(r.consecutive||'')?Number(r.consecutive.slice(1)):Infinity;
    const rows=records().filter(r=>match(r,filter)&&(!query||norm([r.consecutive,`UTQ ${r.tq}`,labels[r.operation],brand(r),r.yeast].join(' ')).includes(norm(query)))).sort((a,b)=>operationOrder[a.operation]-operationOrder[b.operation]||sequence(a)-sequence(b));
    return rows.length?`<div class="cavas-grid">${rows.map(r=>`<article ${r.operation?`role="link" tabindex="0" data-go="${r.operation==='F'?'fv':'sv'}/detalle/${r.tq}" aria-label="Abrir ${r.operation==='F'?'FV':'SV'} ${r.tq}, ${esc(r.consecutive||'sin consecutivo')}"`:''} class="cavas-tank ${r.operation==='M'?'maturation':r.operation==='F'?'fermentation':'unassigned'}">
      <div class="cavas-card-top"><div class="cavas-card-heading"><h2>${esc(r.consecutive||'UTQ '+r.tq)}</h2><span class="cavas-stage">${esc(labels[r.operation])}</span></div><span class="cavas-tank-art" aria-hidden="true">${App.V31.unitankArt('utq-'+r.tq)}</span></div>
      ${App.TankOperations?App.TankOperations.card(r):''}<p class="cavas-brand">${r.consecutive?'UTQ '+r.tq+' · ':''}${esc(brand(r))}</p>
      <dl><div><dt>Llenado</dt><dd>${date(r.operation==='M'?r.maturation?.fin||r.fill:r.fill)}</dd></div><div><dt>Volumen inventario</dt><dd>${qty(r.volume,'Hl')}</dd></div><div><dt>Temperatura</dt><dd>${qty(r.temperature,'°C')}</dd></div>
      ${r.operation==='F'?`<div><dt>Levadura</dt><dd>${esc(r.yeast||'Sin dato')}</dd></div><div><dt>Recolección</dt><dd>${date(r.collection)}</dd></div>`:''}</dl>
      ${App.TankOperations?'':(App.TankProcess?App.TankProcess.card(r):'')+(App.TankPurges?App.TankPurges.card(r):'')}<div class="cavas-card-bottom"><small>${r.manualUpdatedAt?'Actualizado en plataforma':'Dato del Excel'}</small>${r.operation==='F'?`<a class="btn sm" href="#/fv/detalle/${r.tq}">Abrir FV</a>`:r.operation==='M'?`<a class="btn sm" href="#/sv/detalle/${r.tq}">Abrir SV</a>`:`<a class="btn sm" href="#/fv/registro/${r.tq}">Usar como FV</a><button type="button" class="btn sm" data-cavas-detail="${r.tq}">Ver tanque</button>`}</div>
    </article>`).join('')}</div>`:App.C.empty('tank','Sin resultados','Prueba otra operación o búsqueda.');
  }
  function fields(r){
    const pair=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
    return `<dl class="cavas-detail">${pair('Consecutivo',esc(r.consecutive||'Sin dato'))}${pair('UTQ',r.tq)}${pair('Operación',esc(labels[r.operation]))}${pair('Marca',esc(brand(r)))}${pair('Fecha y hora de llenado',date(r.fill))}${pair('Volumen inventario',qty(r.volume,'Hl'))}${pair('Temperatura',qty(r.temperature,'°C'))}${pair('Volumen real',qty(r.real,'Hl'))}${pair('Volumen depósito',qty(r.deposit,'Hl'))}${r.operation==='F'?pair('Levadura',esc(r.yeast||'Sin dato'))+pair('Fecha y hora de recolección',date(r.collection)):''}</dl>`;
  }
  function detail(tq){
    const r=records().find(x=>x.tq===+tq); if(!r)return;
    const t=active(r), s=state();
    const d=App.UI.info(`UTQ ${r.tq} · ${labels[r.operation]}`,fields(r)+`<p class="muted cavas-origin">${r.manualUpdatedAt?`Último cambio en plataforma: ${date(r.manualUpdatedAt)}.`:`Fuente: ${esc(s.source)} · ${esc(s.sheet)} · fila ${r.sourceRow}. Fecha del Excel: ${date(s.sourceDate)}.`}</p>`,{wide:true,actions:`${t?`<a class="btn" id="cavasFollow" href="#/tanque/${esc(t.lote)}">Seguimiento ${esc(t.lote)}</a>`:''}${App.Store.canWrite?'<button type="button" class="btn pri" id="cavasEdit">Actualizar tanque</button>':''}`});
    const b=d.querySelector('#cavasEdit'); if(b)b.onclick=()=>{d.close(); edit(r);};
    const a=d.querySelector('#cavasFollow'); if(a)a.onclick=()=>d.close();
  }
  async function edit(r){
    const data=await App.UI.form({title:`Actualizar UTQ ${r.tq}`,values:r,fields:[
      {k:'operation',l:'Operación',opts:[['F','Fermentación (F)'],['M','Maduración (M)']]},
      {k:'consecutive',l:'Consecutivo del proceso (F o M)',upper:true},
      {k:'brand',l:'Marca',upper:true},{k:'fill',l:'Fecha y hora de llenado',t:'dt'},
      {k:'volume',l:'Volumen inventario (Hl)',t:'n'},{k:'temperature',l:'Temperatura (°C)',t:'n'},
      {k:'real',l:'Volumen real (Hl)',t:'n'},{k:'deposit',l:'Volumen depósito (Hl)',t:'n'},
      {k:'yeast',l:'Levadura (fermentación)',upper:true},{k:'collection',l:'Fecha y hora de recolección (fermentación)',t:'dt'}
    ],validate:x=>['volume','real','deposit'].some(k=>x[k]!=null&&x[k]<0)?'Los volúmenes deben ser mayores o iguales a cero.':null});
    if(!data)return;
    if(data.consecutive&&!new RegExp('^'+(data.operation||'[FM]')+'\\d+$').test(data.consecutive)){toast('El consecutivo debe coincidir con la operación: F345 o M345.');return;}
    const s=clone(state());if(r.operation==='F'&&(data.operation!=='F'||data.consecutive!==r.consecutive||data.fill!==r.fill))App.TankProcess?.archiveInto(s,r); s.records=s.records.map(x=>x.tq===r.tq?Object.assign({},x,data,{operation:data.operation||'',manualUpdatedAt:new Date().toISOString()}):x);
    if(await App.Store.set('config','inventarioCavas',s)){toast('Tanque actualizado');App.render(true);}
  }
  function parseInventory(rows,filename){
    const headerIndex=rows.findIndex(row=>row&&row.some(v=>norm(v)==='utq')&&row.some(v=>norm(v)==='operacion'));
    if(headerIndex<0)throw new Error('No se encontró el encabezado UTQ / Operación en la hoja INVENTARIO.');
    const h=rows[headerIndex].map(norm), index=name=>h.indexOf(norm(name));
    const columns={tq:index('UTQ'),operation:index('Operación'),fill:index('Fecha y hora de llenado'),brand:index('Marca'),volume:index('Volúmen inventario'),temperature:index('Temperatura'),yeast:index('Levadura'),collection:index('Fecha y hora Recolección'),real:index('Volúmen real'),deposit:index('Volúmen deposito')};
    if(Object.values(columns).some(i=>i<0))throw new Error('La hoja INVENTARIO no contiene todos los campos esperados de llenado, marca y volumen.');
    const text=v=>v==null?'':String(v).trim(), seen=new Set(), out=[];
    const dt=v=>typeof v==='number'?App.BDM.localDeSerial(v):typeof v==='string'&&parseDT(v)?v:null;
    for(let i=headerIndex+1;i<rows.length;i++){
      const row=rows[i]; if(!row)continue; const tq=row[columns.tq];
      if(typeof tq!=='number')continue;
      if(!Number.isInteger(tq)||tq<1||tq>32)throw new Error(`UTQ no válido en fila ${i+1}. Se esperan UTQ 1 a 32.`);
      if(seen.has(tq))throw new Error(`UTQ ${tq} duplicado en el Excel.`); seen.add(tq);
      const operation=text(row[columns.operation]).toUpperCase();
      if(!['','F','M'].includes(operation))throw new Error(`Operación no válida en UTQ ${tq}: ${operation}.`);
      const r={tq,operation,sourceRow:i+1};
      for(const [k,j] of Object.entries(columns)){
        if(['tq','operation'].includes(k))continue;
        r[k]=['fill','collection'].includes(k)?dt(row[j]):['volume','temperature','real','deposit'].includes(k)?number(row[j]):text(row[j])||null;
        if(['volume','real','deposit'].includes(k)&&r[k]!=null&&r[k]<0)throw new Error(`Volumen negativo en UTQ ${tq}.`);
      }
      out.push(r);
    }
    if(out.length!==32)throw new Error(`Se encontraron ${out.length} UTQ. Se necesitan los 32 para actualizar el inventario completo.`);
    let sourceDate=null;
    for(const row of rows.slice(0,headerIndex)){
      if(!row)continue;const i=row.findIndex(v=>norm(v)==='fecha actualizacion');
      if(i>=0){const v=row.slice(i+1).find(v=>typeof v==='number'&&v>25569||typeof v==='string'&&parseDT(v));sourceDate=dt(v);break;}
    }
    return {records:out,source:filename,sheet:'INVENTARIO',sourceDate,importedAt:new Date().toISOString()};
  }
  async function attachSequences(plan,book){
    for(const [operation,name,dateName] of [['F','B.D FERMENTACIÓN','Fecha fin llenado (D/M/A)'],['M','B.D MADURACIÓN','Fecha fin llenado (D/M/A)']]){
      if(!book.hojas.includes(name))continue;
      const rows=await book.filas(name);
      const hi=rows.findIndex(r=>r&&r.some(v=>norm(v)==='cons')&&r.some(v=>norm(v)==='tq')&&r.some(v=>norm(v)===norm(dateName)));
      if(hi<0)continue;
      const h=rows[hi].map(norm),ci=h.indexOf('cons'),ti=h.indexOf('tq'),di=h.indexOf(norm(dateName));
      for(const row of rows.slice(hi+1)){
        if(!row||!new RegExp('^'+operation+'\\d+$').test(row[ci]||''))continue;
        const filled=typeof row[di]==='number'?App.BDM.localDeSerial(row[di]):row[di];
        if(!filled)continue;
        const r=plan.records.find(r=>r.operation===operation&&r.tq===row[ti]&&r.fill&&Math.abs(+parseDT(r.fill)-+parseDT(filled))<60000);
        if(r){
          r.consecutive=row[ci];
          if(operation==='F'){
            const dt=v=>typeof v==='number'?App.BDM.localDeSerial(v):v||null;
            r.fermentation={eo:number(row[67]),eLim:number(row[68]),muestras:Array.from({length:18},(_,j)=>81+j*5).filter(i=>row[i]!=null&&number(row[i+2])!=null).map(i=>({t:dt(row[i]),ext:number(row[i+2])}))};
            r.fvRegistration={tq:r.tq,consecutive:r.consecutive,brand:row[3],collector:row[51]??null,yeastName:row[52]??null,yeastTemperature:number(row[59]),initialPressure:number(row[62]),pnc:row[49]??null,fillStart:dt(row[60]),fillEnd:dt(row[61]),brews:Array.from({length:5},(_,i)=>({coc:number(row[9+7*i]),temperature:number(row[10+7*i]),volume:number(row[11+7*i]),extract:number(row[12+7*i]),oxygen:number(row[13+7*i]),yeast:number(row[14+7*i])}))};
          }
        }
      }
    }
  }
  function importInventory(){
    let plan=null;
    App.UI.modal('Actualizar inventario desde Excel',`<p>Selecciona el archivo CONTROL PROCESO CAVAS. Se leerá la hoja <b>INVENTARIO</b> para actualizar los 32 UTQ y su operación F/M.</p><label class="f"><span>Archivo Excel</span><input name="file" type="file" accept=".xlsm,.xlsx"></label><div id="cavasPreview" aria-live="polite"></div>`,{wide:true,ok:'Actualizar inventario',onOpen(fm){
      const b=fm.querySelector('[type=submit]');b.disabled=true;const preview=fm.querySelector('#cavasPreview');let request=0;
      fm.elements.file.onchange=async()=>{
        const id=++request,file=fm.elements.file.files[0];plan=null;b.disabled=true;if(!file){preview.innerHTML='';return;}
        preview.innerHTML='<p>Leyendo el Excel…</p>';
        try{
          const book=await App.BDM.leerLibro(await file.arrayBuffer());
          if(!book.hojas.includes('INVENTARIO'))throw new Error('El archivo no contiene la hoja INVENTARIO.');
          const next=parseInventory(await book.filas('INVENTARIO'),file.name);await attachSequences(next,book);if(id!==request)return;plan=next;
          const c={F:0,M:0,empty:0};plan.records.forEach(r=>c[r.operation||'empty']++);
          const manual=records().filter(r=>r.manualUpdatedAt).length;
          preview.innerHTML=`<p><b>32 UTQ:</b> ${c.F} fermentadores · ${c.M} maduradores · ${c.empty} sin operación.</p><p>Fecha del Excel: ${date(plan.sourceDate)}.</p><p>Al actualizar, estos datos sustituirán el inventario mostrado${manual?`, incluidos ${manual} tanques modificados en la plataforma`:''}.</p>`;
          b.disabled=false;
        }catch(e){if(id!==request)return;preview.innerHTML=`<div class="errbox">${esc(e.message==='NAVEGADOR'?'Este navegador no puede leer el Excel. Usa una versión actual de Chrome, Edge o Safari.':e.message)}</div>`;}
      };
    },async onSubmit(fm,error){
      if(!plan){error('Selecciona un Excel válido.');return false;}
      if(!await App.Store.set('config','inventarioCavas',plan))return false;
      toast('Inventario de cavas actualizado');App.render(true);return true;
    }});
  }
  App.V.tanques={
    render(filter='todos'){
      if(!Object.hasOwn(filters,filter))return previous.render(filter==='retiros'?'todos':filter);
      const c=counts(),s=state();
      return `<div class="cavas-inventory"><div class="page-h"><div><h1>Tanques</h1><p>Fermentación y maduración · UTQ 1 a 32</p></div><div class="acts">${App.Store.canWrite?'<a class="btn pri" href="#/fv/registro">Registrar FV</a><button class="btn" id="cavasImport" type="button">Actualizar desde Excel</button>':''}<a class="btn" href="#/tanques/retiros">Seguimiento de levadura</a></div></div>
      ${filter==='todos'||filter==='fermentadores'?draftTable():''}${summary()}<div class="cavas-source"><span>Fuente: ${esc(s.source)} · ${esc(s.sheet)}</span><span>Fecha del Excel: ${date(s.sourceDate)}</span></div>
      <div class="tank-filter-row" role="group" aria-label="Filtrar por operación">${Object.entries(filters).map(([k,label])=>`<a class="chip" href="#/tanques/${k}" ${filter===k?'aria-current="page"':''}>${label}<span class="c">${c[k]}</span></a>`).join('')}</div>
      <label class="search-in cavas-search">${App.C.icon('search')}<span class="sr-only">Buscar UTQ, marca o levadura</span><input id="cavasSearch" type="search" value="${esc(query)}" placeholder="Buscar consecutivo F/M, UTQ o marca"></label>
      <div id="cavasList">${list(filter)}</div></div>`;
    },
    mount(filter='todos'){
      if(!Object.hasOwn(filters,filter)){
        previous.mount(filter==='retiros'?'todos':filter);
        const h=document.querySelector('#view h1');if(h)h.textContent='Seguimiento de levadura';
        return;
      }
      const i=document.getElementById('cavasSearch');i.oninput=()=>{query=i.value;document.getElementById('cavasList').innerHTML=list(filter);};
      document.getElementById('cavasList').onclick=e=>{const b=e.target.closest('[data-cavas-detail]');if(b)detail(b.dataset.cavasDetail);};
      const b=document.getElementById('cavasImport');if(b)b.onclick=()=>App.ExcelCavas?App.ExcelCavas.importDialog():importInventory();
    }
  };
  const home=App.V.inicio.render;
  App.V.inicio.render=function(...args){return `<div class="cavas-home"><div class="sec-h"><h2>Inventario de cavas</h2><a class="more" href="#/tanques">Ver tanques →</a></div>${summary()}</div>`+home.apply(this,args);};
  App.Cavas={records,counts,parseInventory};
  setTimeout(()=>App.render(true),0);
})();
