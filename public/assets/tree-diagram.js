/* View-only pan/zoom; topology and record selection remain in the shared resolver. */
(()=>{'use strict';const mounted=new WeakMap();
function mount(host,root,{ancestors=[],navigate}={}){
 mounted.get(host)?.();host.replaceChildren();
 const trail=document.createElement('nav');trail.className='tree-trail';trail.setAttribute('aria-label','مسار الآباء إلى التحور');
 for(const n of ancestors){const b=document.createElement('button');b.type='button';b.textContent=n.id;b.dir='ltr';b.onclick=()=>navigate(n.id);trail.append(b);}
 const toolbar=document.createElement('div');toolbar.className='tree-diagram-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','التحكم في عرض المشجرة');
 const viewport=document.createElement('div');viewport.className='tree-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label','المشجرة المتشعبة — اسحب المساحة الفارغة للتحريك');
 const surface=document.createElement('div'),canvas=document.createElement('div');surface.className='tree-surface';canvas.className='tree-canvas';canvas.append(root);surface.append(canvas);viewport.append(surface);
 let scale=1,disposed=false,frame=0;
 const percent=document.createElement('output');percent.setAttribute('aria-label','نسبة تكبير المشجرة');
 function layout(){if(disposed)return;surface.style.width=Math.ceil(canvas.offsetWidth*scale)+'px';surface.style.height=Math.ceil(canvas.offsetHeight*scale)+'px';canvas.style.transform=`scale(${scale})`;canvas.style.left=Math.max(0,(viewport.clientWidth-canvas.offsetWidth*scale)/2)+'px';percent.textContent=Math.round(scale*100)+'٪';}
 function zoom(next){const x=(viewport.scrollLeft+viewport.clientWidth/2)/scale,y=(viewport.scrollTop+viewport.clientHeight/2)/scale;scale=Math.max(.4,Math.min(1.6,next));layout();viewport.scrollLeft=x*scale-viewport.clientWidth/2;viewport.scrollTop=y*scale-viewport.clientHeight/2;}
 function center(){layout();viewport.scrollLeft=Math.max(0,(surface.offsetWidth-viewport.clientWidth)/2);viewport.scrollTop=0;}
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;toolbar.append(b);}
 button('− تصغير',()=>zoom(scale-.1));toolbar.append(percent);button('+ تكبير',()=>zoom(scale+.1));button('١٠٠٪',()=>{scale=1;center();});button('توسيط',center);
 const hint=document.createElement('span');hint.textContent='الأب فوق أبنائه · الإخوة على مستوى واحد';toolbar.append(hint);host.append(trail,toolbar,viewport);
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);});observer.observe(canvas);
 canvas.addEventListener('click',e=>{const summary=e.target.closest('summary');if(!summary||e.target.closest('button'))return;const x=summary.getBoundingClientRect().left;requestAnimationFrame(()=>{layout();viewport.scrollLeft+=summary.getBoundingClientRect().left-x;});});
 let drag=null;
 viewport.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch'||e.target.closest('summary,button,a,details:not(.tree-node)'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
 viewport.addEventListener('pointermove',e=>{if(!drag)return;viewport.scrollLeft=drag.left-(e.clientX-drag.x);viewport.scrollTop=drag.top-(e.clientY-drag.y);});
 function end(){drag=null;viewport.classList.remove('dragging');}viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
 frame=requestAnimationFrame(center);mounted.set(host,()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);});
}
window.LXTreeDiagram={mount};})();
