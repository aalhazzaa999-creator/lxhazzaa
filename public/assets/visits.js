(()=>{
 const current=document.currentScript?.dataset.platform;
 const output=document.getElementById('lxVisitTotals');
 const timer=document.getElementById('lxVisitTimer');
 if(timer){
  const started=Date.now();
  const tick=()=>{const seconds=Math.floor((Date.now()-started)/1000);timer.textContent=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');};
  tick();setInterval(tick,1000);
 }
 if(!current)return;
 fetch('/api/visits',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:current})})
  .then(r=>{if(!r.ok)throw Error('visits');return r.json();})
  .then(data=>{if(output){for(const name of ['home','remains','documents']){const el=output.querySelector(`[data-visits="${name}"]`);if(el&&Number.isFinite(data[name]))el.textContent=new Intl.NumberFormat(document.documentElement.lang||'ar').format(data[name]);}const total=output.querySelector('[data-visits="total"]');if(total&&['home','remains','documents'].every(n=>Number.isFinite(data[n])))total.textContent=new Intl.NumberFormat(document.documentElement.lang||'ar').format(data.home+data.remains+data.documents);}})
  .catch(()=>{if(output)output.hidden=true;});
})();
