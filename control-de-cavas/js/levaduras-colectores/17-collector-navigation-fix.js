
/* Los colectores son botones navegables: la delegación global original ignoraba los botones. */
document.addEventListener("click",function(e){
  const g=e.target.closest&&e.target.closest("[data-go]");
  if(!g || g.closest("dialog")) return;
  if(g.tagName==="BUTTON" || g.tagName==="A") {
    e.preventDefault();
    const dest=g.dataset.go;
    if(dest) App.go(dest);
  }
},{capture:true});

/* Actualiza el tiempo en colector cada minuto mientras la ficha está abierta. */
setInterval(function(){
  const path=(location.hash||"").slice(2).split("/");
  if(path[0]!=="colectores" || !path[1]) return;
  const el=document.querySelector(".collector-detail");
  if(!el) return;
  App.render(true);
},60000);
