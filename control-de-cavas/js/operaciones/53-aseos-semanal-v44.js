/* Control de Cavas v44 — Vistas semanales (solo presentación, sin escribir registros).
   Extiende Aseos v43 y reutiliza su edición, historial, importación y exportación. */
(function () {
  'use strict';
  const view = App.V && App.V.aseos;
  if (!view || !App.OperationSources) return;
  const originalRender = view.render;
  const originalMount = view.mount;
  const S = App.OperationSources;
  const U = App.U;
  const SHEET = '2. Semanal';
  const E = v => U.esc(String(v == null ? '' : v));
  const WEEK_MS = 7 * 86400000;
  let mode = 'matriz', weekAnchor = null, shift = 'todos', selected = null;
  let tablePage = 0, tableLimit = 20, showAllEquipment = false;
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const statusLabels = {
    finalizados: 'Finalizado', encurso: 'En curso', programados: 'Programado',
    pendientes: 'Pendiente', revisar: 'Revisar', borradores: 'Borrador'
  };
  const statusSymbols = {finalizados:'✓',encurso:'◉',programados:'•',pendientes:'!',revisar:'!',borradores:'◷'};
  function ms(v) {
    const parsed = S.date(v);
    if (!parsed) return null;
    const date = U.parseDT(parsed);
    return date && Number.isFinite(+date) && date.getFullYear() >= 2020 && date.getFullYear() <= 2040 ? +date : null;
  }
  function monday(t) {
    const d = new Date(t);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return +d;
  }
  function dateKey(t) {
    const d = new Date(t);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function dateShort(t) {return new Date(t).toLocaleDateString('es-CO',{day:'2-digit',month:'short'});}
  function datetime(t) {return t ? new Date(t).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';}
  function fields() {
    const cols = S.schema('aseos', SHEET).cols;
    const get = rx => cols.find(c => rx.test(c.label));
    return {
      scheduled: get(/fecha.*(programada|propuesta)/i),
      start: get(/fecha.*inicio/i), end: get(/fecha.*fin/i),
      actual: get(/fecha.*(aseo|realizad)/i),
      equipment: get(/tipo tanque|equipo|tinas aseadas|línea/i),
      responsible: get(/operario|responsable|ejecutado por/i),
      state: get(/^estado$/i)
    };
  }
  function loadDrafts() {
    try {return JSON.parse(localStorage.getItem('cavas:aseo-grid:'+SHEET)||'{}');}
    catch (_) {return {};}
  }
  function normalize(r, f, drafts) {
    const c = {...r.cells, ...(drafts[r.id]||{})};
    const planned = ms(c[f.scheduled?.i]), started = ms(c[f.start?.i]) || ms(c[f.actual?.i]);
    const ended = ms(c[f.end?.i]) || ms(c.__ended);
    const when = planned || started;
    if (!when) return null; // sin fecha fiable: permanece consultable en la hoja completa
    const sourceState = String(c[f.state?.i]||'').trim().toUpperCase();
    let state;
    if (started && ended && ended < started) state = 'revisar';
    else if (ended || /REALIZADO|FINALIZADO|COMPLETADO|EJECUTADO/.test(sourceState)) state = 'finalizados';
    else if (/URGENTE|VENCIDO|REVISAR|ERROR/.test(sourceState)) state = 'revisar';
    else if (drafts[r.id]) state = 'borradores';
    else if (started) state = 'encurso';
    else if (/PENDIENTE/.test(sourceState) || (planned && planned < Date.now())) state = 'pendientes';
    else state = 'programados';
    const at = planned || started;
    const hour = new Date(at).getHours();
    const turn = hour < 8 ? '00–08' : hour < 16 ? '08–16' : '16–24';
    const equipment = String(c[f.equipment?.i] || '').trim() || 'Equipo sin identificar';
    const responsible = String(c[f.responsible?.i] || '').trim() || '—';
    return {id:r.id,row:r.row||null,equipment,responsible,when:at,planned,started,ended,day:dateKey(at),week:monday(at),turn,state,sourceState};
  }
  let recordsMemo = null;
  function allRecords() {
    const source=S.raw('aseos')[SHEET],edits=App.S.config.aseoCellEdits,captures=App.S.config.opCaptures_aseos;
    const draftJSON=localStorage.getItem('cavas:aseo-grid:'+SHEET)||'{}';
    const minute=Math.floor(Date.now()/60000);
    if(recordsMemo&&recordsMemo.source===source&&recordsMemo.edits===edits&&recordsMemo.captures===captures&&recordsMemo.draftJSON===draftJSON&&recordsMemo.minute===minute)return recordsMemo.list;
    const f = fields(),drafts = loadDrafts();
    const list = S.records('aseos',SHEET).map(r=>normalize(r,f,drafts)).filter(Boolean);
    // Borradores nuevos aún no guardados en la fuente
    for (const [id,cells] of Object.entries(drafts)) {
      if (!id.startsWith('new:')) continue;
      const rec = normalize({id,cells,row:null},f,drafts);
      if (rec) list.push(rec);
    }
    recordsMemo={source,edits,captures,draftJSON,minute,list};
    return list;
  }
  function isWeekly(html) {
    const t = document.createElement('template');t.innerHTML=html;
    const active = t.content.querySelector('[data-aseo-module][aria-pressed="true"]');
    return active && active.getAttribute('data-aseo-module') === SHEET ? t : null;
  }
  function statusBadge(s) {return `<span class="aseo-w44-status aseo-w44-${s}">${statusSymbols[s]||'•'} ${E(statusLabels[s]||s)}</span>`;}
  function actions(r) {return `<span class="aseo-w44-actions"><button type="button" data-aseo-guide="${E(r.id)}" ${App.Store.canWrite?'':'disabled'}>Editar</button><button type="button" data-aseo-history="${E(r.id)}">Historial</button></span>`;}
  function filtered(all, search, filter) {
    const q = (search||'').trim().toLowerCase();
    return all.filter(r=>(shift==='todos'||r.turn===shift)
      && (filter==='todos'||r.state===filter||(filter==='pendientes'&&r.state==='programados'))
      && (!q||[r.equipment,r.responsible,r.sourceState,r.turn,r.row,r.day].join(' ').toLowerCase().includes(q)));
  }
  function weekDays() {return Array.from({length:7},(_,i)=>{const d=new Date(weekAnchor);d.setDate(d.getDate()+i);return +d;});}
  function getWeek(list) {return list.filter(r=>r.week===weekAnchor).sort((a,b)=>a.when-b.when || a.equipment.localeCompare(b.equipment,'es'));}
  function stats(rows) {
    const count=k=>rows.filter(r=>r.state===k).length;
    return `<div class="aseo-w44-stats"><div><span>Registros de esta semana</span><strong>${rows.length}</strong></div><div><span>Finalizados</span><strong>${count('finalizados')}</strong></div><div><span>En curso</span><strong>${count('encurso')}</strong></div><div><span>Por atender / revisar</span><strong>${count('pendientes')+count('revisar')+count('programados')+count('borradores')}</strong></div></div>`;
  }
  function controls(all) {
    const start=weekAnchor,end=weekDays()[6];
    const latest=all.length?Math.max(...all.map(r=>r.week)):null;
    return `<div class="aseo-w44-weekbar"><div class="aseo-w44-weeknav">
      <button type="button" data-w44-nav="prev" aria-label="Semana anterior">‹</button>
      <strong>${E(dateShort(start))} – ${E(dateShort(end))} ${new Date(end).getFullYear()}</strong>
      <button type="button" data-w44-nav="next" aria-label="Semana siguiente">›</button>
      <button type="button" data-w44-nav="today">Esta semana</button>
      ${latest!=null?`<button type="button" data-w44-nav="latest">Última con registros</button>`:''}
      </div><label class="aseo-w44-shift">Turno <select id="aseoW44Shift"><option value="todos">Todos</option>${['00–08','08–16','16–24'].map(x=>`<option value="${x}" ${shift===x?'selected':''}>${x}</option>`).join('')}</select></label></div>`;
  }
  function matrix(rows) {
    const byEquipment = new Map();
    rows.forEach(r=>{const k=r.equipment.toLocaleUpperCase('es');if(!byEquipment.has(k))byEquipment.set(k,{label:r.equipment,records:[]});byEquipment.get(k).records.push(r);});
    const eqs=[...byEquipment.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'es'));
    const visible=showAllEquipment?eqs:eqs.slice(0,35),days=weekDays();
    return `<div class="aseo-w44-scroller" role="region" aria-label="Matriz de aseos por equipo y día" tabindex="0"><table class="aseo-w44-matrix"><thead><tr><th>Equipo / línea</th>${days.map((t,i)=>`<th>${daysOfWeek[i]}<small>${E(dateShort(t))}</small></th>`).join('')}<th>Total</th></tr></thead><tbody>${visible.map(([,group])=>`<tr><th>${E(group.label)}</th>${days.map(t=>{const key=dateKey(t),items=group.records.filter(r=>r.day===key);if(!items.length)return '<td><span class="aseo-w44-none">—</span></td>';const s=items.some(r=>r.state==='revisar')?'revisar':items.some(r=>r.state==='pendientes')?'pendientes':items.some(r=>r.state==='encurso')?'encurso':items.some(r=>r.state==='borradores')?'borradores':items.some(r=>r.state==='programados')?'programados':'finalizados';return `<td><button type="button" class="aseo-w44-cell aseo-w44-${s}" data-w44-day="${key}" data-w44-eq="${E(group.label)}" title="${items.length} registro(s). Abrir detalle">${statusSymbols[s]}${items.length>1?` <b>${items.length}</b>`:''}</button></td>`;}).join('')}<td class="aseo-w44-total">${group.records.length}</td></tr>`).join('')||'<tr><td colspan="9" class="aseo-w44-empty">No hay aseos con estos filtros durante la semana seleccionada.</td></tr>'}</tbody></table></div>${eqs.length>35?`<div class="aseo-w44-more"><button type="button" id="aseoW44More">${showAllEquipment?'Mostrar menos':'Mostrar los '+eqs.length+' equipos'}</button></div>`:''}<p class="aseo-w44-footnote">✓ Finalizado · ◉ En curso · • Programado · ! Pendiente o revisar. Selecciona una celda para ver registros y acceder a edición o historial.</p>`;
  }
  function calendar(rows) {
    const days=weekDays(),shifts=['00–08','08–16','16–24'];
    return `<div class="aseo-w44-scroller" role="region" aria-label="Calendario semanal por turno" tabindex="0"><div class="aseo-w44-calendar"><div class="aseo-w44-corner">Turno</div>${days.map((t,i)=>`<div class="aseo-w44-dayhead">${daysOfWeek[i]} <small>${E(dateShort(t))}</small></div>`).join('')}${shifts.map(sh=>`<div class="aseo-w44-shiftname">${sh}</div>${days.map(t=>{const key=dateKey(t),list=rows.filter(r=>r.day===key&&r.turn===sh);return `<button type="button" class="aseo-w44-calendar-cell" data-w44-day="${key}" data-w44-turn="${sh}" ${list.length?'':'disabled'}>${list.length?`<strong>${list.length} aseo${list.length===1?'':'s'}</strong>${list.slice(0,2).map(r=>`<span class="aseo-w44-mini aseo-w44-${r.state}">${E(r.equipment)}</span>`).join('')}${list.length>2?`<small>+${list.length-2} más</small>`:''}`:'<span class="aseo-w44-none">Sin registros</span>'}</button>`;}).join('')}`).join('')}</div></div><p class="aseo-w44-footnote">Las horas se agrupan por el turno estimado de la fecha programada (o inicio, si no existe programación).</p>`;
  }
  function board(rows) {
    const groups=[['pendientes','Pendientes'],['programados','Programados'],['encurso','En curso'],['finalizados','Finalizados'],['revisar','Por revisar'],['borradores','Borradores']];
    return `<div class="aseo-w44-board">${groups.map(([key,label])=>{const list=rows.filter(r=>r.state===key);return `<section class="aseo-w44-column"><header><span>${E(label)}</span><b>${list.length}</b></header><div class="aseo-w44-column-scroll">${list.map(r=>`<article class="aseo-w44-board-card"><strong>${E(r.equipment)}</strong><small>${E(dateShort(r.when))} · ${E(r.turn)}</small><small>${E(r.responsible)}</small>${actions(r)}</article>`).join('')||'<p class="aseo-w44-empty">Sin registros</p>'}</div></section>`;}).join('')}</div>`;
  }
  function weeklyTable(rows) {
    const pages=Math.max(1,Math.ceil(rows.length/tableLimit));tablePage=Math.min(tablePage,pages-1);
    const current=rows.slice(tablePage*tableLimit,(tablePage+1)*tableLimit);
    return `<div class="aseo-w44-scroller" role="region" aria-label="Tabla semanal" tabindex="0"><table class="aseo-w44-table"><thead><tr><th>Fecha</th><th>Equipo / línea</th><th>Turno*</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${current.map(r=>`<tr><td>${E(datetime(r.when))}</td><td><strong>${E(r.equipment)}</strong></td><td>${E(r.turn)}</td><td>${E(r.responsible)}</td><td>${E(datetime(r.started))}</td><td>${E(datetime(r.ended))}</td><td>${statusBadge(r.state)}</td><td>${actions(r)}</td></tr>`).join('')||'<tr><td colspan="8" class="aseo-w44-empty">Sin registros para esta semana y filtros.</td></tr>'}</tbody></table></div><div class="aseo-w44-pager"><span>${rows.length?tablePage*tableLimit+1:0}–${Math.min((tablePage+1)*tableLimit,rows.length)} de ${rows.length}</span><div><button type="button" data-w44-page="prev" ${tablePage===0?'disabled':''}>Anterior</button><span>${tablePage+1} / ${pages}</span><button type="button" data-w44-page="next" ${tablePage+1>=pages?'disabled':''}>Siguiente</button></div></div>`;
  }
  function detail(rows) {
    if (!selected) return '';
    const items=rows.filter(r=>r.day===selected.day&&(!selected.eq||r.equipment===selected.eq)&&(!selected.turn||r.turn===selected.turn));
    return `<section class="aseo-w44-detail"><header><div><h3>Detalle · ${E(selected.eq||selected.turn||'Aseos del día')}</h3><p>${E(selected.day)} · ${items.length} registro(s)</p></div><button type="button" data-w44-close aria-label="Cerrar detalle">✕</button></header>${items.map(r=>`<article><div><strong>${E(r.equipment)}</strong><small>${E(r.turn)} · ${E(r.responsible)} · ${E(datetime(r.when))}</small></div>${statusBadge(r.state)}${actions(r)}</article>`).join('')||'<p class="aseo-w44-empty">No hay registros con estos filtros.</p>'}</section>`;
  }
  function renderWeekly() {
    const original=originalRender();
    const template=isWeekly(original);
    if (!template) return original;
    const root=template.content;
    const all=allRecords();
    if (weekAnchor==null) {
      const current=monday(Date.now()),withCurrent=all.some(r=>r.week===current);
      const previous=all.filter(r=>r.week<=current).map(r=>r.week);
      weekAnchor=withCurrent?current:previous.length?Math.max(...previous):all.length?Math.min(...all.map(r=>r.week)):current;
    }
    const search=root.querySelector('#aseoSearch')?.value||'';
    const filter=root.querySelector('#aseoStatus')?.value||'todos';
    const rows=getWeek(filtered(all,search,filter));
    const section=root.querySelector('.aseo-table-section');
    const top=section.querySelector('.aseo-view-actions');
    top.classList.add('aseo-w44-switch');
    // Mantener los botones originales para conservar la vista Hoja completa y su guardado.
    const originalButtons=document.createElement('span');originalButtons.className='aseo-w44-original-buttons';
    while(top.firstChild)originalButtons.appendChild(top.firstChild);
    top.appendChild(originalButtons);
    top.insertAdjacentHTML('beforeend',[
      ['matriz','Matriz'],['calendario','Calendario'],['estados','Estados'],['tabla','Tabla'],['hoja','Hoja completa']
    ].map(([id,label])=>`<button type="button" class="aseo-w44-tab" data-w44-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join(''));
    const toolbar=section.querySelector('.aseo-toolbar');
    if (toolbar) toolbar.insertAdjacentHTML('afterend',`<div class="aseo-w44-week">${controls(all)}${mode==='hoja'?'<p class="aseo-w44-footnote">Hoja completa muestra todo el histórico y permite la captura original; no está limitada a la semana seleccionada.</p>':stats(rows)}</div>`);
    if (mode!=='hoja') {
      const content=mode==='matriz'?matrix(rows):mode==='calendario'?calendar(rows):mode==='estados'?board(rows):weeklyTable(rows);
      const draft=section.querySelector('#aseoDraftState');
      if(draft) {
        // Quitar únicamente el contenido de tabla original; conservar barra, filtros y borradores.
        let node=draft.nextSibling;
        while(node) {const next=node.nextSibling;node.remove();node=next;}
        draft.insertAdjacentHTML('afterend',`<div class="aseo-w44-content">${content}${detail(rows)}</div>`);
      }
    }
    const heading=section.querySelector('.aseo-table-top > div > span');
    if(heading)heading.textContent=`${rows.length.toLocaleString('es-CO')} registros en la semana · ${all.length.toLocaleString('es-CO')} con fecha en el histórico`;
    section.classList.add('aseo-w44-section');
    return template.innerHTML;
  }
  function mountWeekly() {
    // Al entrar de nuevo en Semanal, iniciar con la matriz recomendada.
    document.querySelector('[data-aseo-module="2. Semanal"]')?.addEventListener('click',()=>{
      mode='matriz';selected=null;shift='todos';tablePage=0;weekAnchor=null;
    },true);
    originalMount();
    if(!document.querySelector('[data-aseo-module="2. Semanal"][aria-pressed="true"]'))return;
    const rerender=()=>App.render(true);
    document.querySelectorAll('[data-w44-mode]').forEach(b=>b.addEventListener('click',()=>{
      const next=b.dataset.w44Mode;
      mode=next;selected=null;tablePage=0;
      // La vista de hoja usa el editor original de v43, sin replicar su lógica de guardado.
      const originalButton=document.querySelector(`[data-aseo-view="${next==='hoja'?'completa':'resumen'}"]`);
      if(originalButton)originalButton.click();else rerender();
    }));
    document.querySelectorAll('[data-w44-nav]').forEach(b=>b.addEventListener('click',()=>{
      const action=b.dataset.w44Nav;
      if(action==='prev')weekAnchor=monday(new Date(weekAnchor).setDate(new Date(weekAnchor).getDate()-7));
      if(action==='next')weekAnchor=monday(new Date(weekAnchor).setDate(new Date(weekAnchor).getDate()+7));
      if(action==='today')weekAnchor=monday(Date.now());
      if(action==='latest'){const all=allRecords();weekAnchor=all.length?Math.max(...all.map(r=>r.week)):monday(Date.now());}
      selected=null;tablePage=0;rerender();
    }));
    document.getElementById('aseoW44Shift')?.addEventListener('change',e=>{shift=e.target.value;selected=null;tablePage=0;rerender();});
    document.querySelectorAll('[data-w44-day]').forEach(b=>b.addEventListener('click',()=>{
      const next={day:b.dataset.w44Day,eq:b.dataset.w44Eq||null,turn:b.dataset.w44Turn||null};
      selected=selected&&selected.day===next.day&&selected.eq===next.eq&&selected.turn===next.turn?null:next;
      rerender();
      document.querySelector('.aseo-w44-detail')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }));
    document.querySelector('[data-w44-close]')?.addEventListener('click',()=>{selected=null;rerender();});
    document.getElementById('aseoW44More')?.addEventListener('click',()=>{showAllEquipment=!showAllEquipment;rerender();});
    document.querySelectorAll('[data-w44-page]').forEach(b=>b.addEventListener('click',()=>{tablePage+=b.dataset.w44Page==='next'?1:-1;rerender();}));
  }
  view.render=renderWeekly;
  view.mount=mountWeekly;
})();
