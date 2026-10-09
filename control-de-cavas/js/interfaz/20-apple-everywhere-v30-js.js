
/* v30 — pulido en vivo: caja de oración en etiquetas heredadas, sin emojis en títulos,
   versión visible. No toca datos ni lógica: solo el texto mostrado. */
(function(){
  const MARCAS=/^(LIGHT|ESTANDAR|ESTÁNDAR|AZTECA|AGUILA|ÁGUILA|PILSEN|CLUB COLOMBIA)$/;
  const caja=t=>{ const s=t.trim(); if(MARCAS.test(s)) return s.toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
    const l=s.toLowerCase(); return l.charAt(0).toUpperCase()+l.slice(1); };
  const EMO=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{23F0}\u{231A}]\uFE0F?/gu;
  function nodo(n){
    const v=n.nodeValue; if(!v||v.length<2) return;
    const s=v.trim(); if(!s) return;
    // etiquetas heredadas en MAYÚSCULAS (no códigos tipo LI4F13 ni "FV 1 · UTK 19")
    if(/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ·:\-]{3,}$/.test(s) && !/\b(FV|UTK|ABI|COPEC|T0|HL|ID)\b/.test(s) && /[AEIOUÁÉÍÓÚ]/.test(s)){
      n.nodeValue=v.replace(s,caja(s)); return; }
    // emojis decorativos al inicio de un texto con más contenido
    if(EMO.test(s)){ EMO.lastIndex=0; const resto=s.replace(EMO,"").trim();
      if(resto.length>2) n.nodeValue=v.replace(EMO,"").replace(/^\s+/,"");
      else if(!resto){ const p=n.parentElement; if(p&&p.tagName!=="BUTTON"&&p.parentElement&&p.parentElement.textContent.replace(EMO,"").trim().length>3) n.nodeValue=""; } }
    EMO.lastIndex=0;
  }
  function barrer(r){
    if(!r||r.nodeType!==1&&r.nodeType!==11) return;
    const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT,{acceptNode:n=>{ const p=n.parentElement; return !p||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.tagName)||p.closest(".bot,.bm")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT; }});
    const L=[]; while(w.nextNode()) L.push(w.currentNode); L.forEach(nodo);
  }
  // v45: procesar solo nodos modificados, nunca volver a recorrer toda la pantalla.
  const view=()=>document.getElementById('view');
  const allowed=n=>{const e=n.nodeType===1?n:n.parentElement;return !!e&&(!!e.closest('#view')||!!e.closest('dialog[open]'));};
  let queued=new Set(),scheduled=false;
  function flush(){scheduled=false;const roots=[...queued];queued.clear();
    for(const root of roots){if(root.nodeType===3){if(allowed(root))nodo(root);continue;}
      if(root.nodeType===1&&allowed(root))barrer(root);
    }
    const f=document.querySelector('.afoot span:last-child');if(f&&/v29/.test(f.textContent))f.textContent='v30';
  }
  const mo=new MutationObserver(mutations=>{
    for(const m of mutations){
      if(m.type==='characterData'){if(allowed(m.target))queued.add(m.target);continue;}
      for(const n of m.addedNodes){if(n.nodeType===1||n.nodeType===3){if(allowed(n))queued.add(n);}}
    }
    if(queued.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}
  });
  mo.observe(document.body,{childList:true,subtree:true,characterData:true});
  try{barrer(view());}catch(e){}

})();
