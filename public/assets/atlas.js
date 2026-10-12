(()=> {
  'use strict';const $=id=>document.getElementById(id);let all=[],filtered=[],page=0,map=null,layer=null,manifest=null,canvasRenderer=null;const PAGE=25,MAX_MARKERS=250;const fmt=n=>Number(n||0).toLocaleString('ar-SA');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>( {
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }
  [c]));const fields=['q','root','country','sex','locationType','radius'];let timer;function distance(a,b,c,d) {
    const R=6371,rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;return 2*R*Math.asin(Math.sqrt(Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2))
  }
  function opt(id,arr) {
    const el=$(id);arr.filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar')).forEach(v=> {
      const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)
    })
  }
  function filter() {
    const q=$('q').value.trim().toLocaleLowerCase(),root=$('root').value,country=$('country').value,sex=$('sex').value,lt=$('locationType').value,radius=Number($('radius').value),center=map?map.getCenter():null;filtered=all.filter(r=>(!q||[r.id,r.name,r.site,r.country,r.y,r.mt,r.geneticId,r.individualId].some(s=>(s||'').toLocaleLowerCase().includes(q)))&&(!root||r.yRoot===root)&&(!country||r.country===country)&&(!sex||r.sex===sex)&&(!lt||r.locationType===lt)&&(!radius||(center&&r.lat!==null&&distance(center.lat,center.lng,r.lat,r.lng)<=radius)));page=0;render()
  }
  function render() {
    const count=filtered.length;$('all').textContent=fmt(all.length);$('matching').textContent=fmt(count);$('geo').textContent=fmt(filtered.filter(r=>r.lat!==null).length);$('ycount').textContent=fmt(filtered.filter(r=>r.y).length);const start=page*PAGE,subset=filtered.slice(start,start+PAGE);$('range').textContent=count?`${fmt(start+1)}–${fmt(Math.min(start+PAGE,count))} من ${fmt(count)}`:'لا توجد نتائج';$('records').innerHTML=subset.map((r,i)=>`<div class="record" role="button" tabindex="0" data-idx="${start+i}"><div><strong>${esc(r.name||r.id)}</strong><span>${esc(r.country||'دولة غير محددة')} · ${esc(r.site||'موقع غير محدد')}</span><small>${esc(r.ageText||'تأريخ غير محدد')} · ${esc(r.match||'')}</small></div><span class="y">${esc(r.y||'Y غير محدد')}</span></div>`).join('')||'<div class="record">لا توجد سجلات تطابق هذه الفلاتر.</div>';$('pageLabel').textContent=`${fmt(page+1)} / ${fmt(Math.max(1,Math.ceil(count/PAGE)))}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE>=count;renderMap()
  }
  function renderMap() {
    if(!map)return;layer.clearLayers();let points=filtered.filter(r=>r.lat!==null);let shown=points.slice(0,MAX_MARKERS);shown.forEach(r=> {
      const country=r.locationType==='country';const marker=L.circleMarker([r.lat,r.lng], {
        radius:country?5:4,weight:1,color:country?'#f0c454':'#8ddac7',fillColor:country?'#e8bd44':'#39a894',fillOpacity:.68,renderer:canvasRenderer
      });marker.bindPopup(`<b>${esc(r.name||r.id)}</b><div>${esc(r.site||r.country)}</div><div>${country?'نقطة دولة تقريبية':'موقع أثري / محلية'}</div><div>${esc(r.y)}</div>`);marker.on('click',()=>detail(r));marker.addTo(layer)
    });$('mapNote').textContent=`تعرض الخريطة ${fmt(shown.length)} نقطة من أصل ${fmt(points.length)} نتيجة ذات إحداثيات. ${points.length>MAX_MARKERS?'استخدم البحث والفلاتر لتضييق النتائج.':''} الأصفر: نقطة دولة تقريبية؛ الأخضر: موقع أثري. النقاط لا تمثل إحداثيات قبور مؤكدة.`
  }
  function detail(r) {
    $('detailTitle').textContent=r.name||r.id;const pairs=[['معرّف السجل',r.id],['AADR Genetic ID',r.geneticId],['AADR Individual ID',r.individualId],['الدولة',r.country],['الموقع الأثري',r.site],['نوع الموقع',r.locationType==='country'?'تقريبي على مستوى الدولة':r.locationType==='site'?'موقع أثري / محلية':'غير محدد'],['دقة الموقع',r.locationAccuracy],['خط العرض',r.lat],['خط الطول',r.lng],['Y-DNA',r.y],['تصنيف Y',r.yRoot],['mtDNA',r.mt],['العمر BP',r.ageBP],['العمر النصي',r.ageText],['طريقة التأريخ',r.dating],['الثقافة الأثرية',r.culture],['الجنس الجزيئي',r.sex],['حالة الربط',r.match],['المصدر',r.source],['المرجع',r.reference],['عنوان الدراسة',r.study],['DOI',r.doi],['ملاحظات',r.notes]];$('detailBody').innerHTML=pairs.filter(([,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>`<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');$('detail').style.display='grid'
  }
  function initMap() {
    if(typeof L==='undefined') {
      $('map').textContent='تعذر تحميل مكتبة الخرائط؛ ما زال البحث في السجلات متاحًا.';return
    }
    map=L.map('map', {
      preferCanvas:true,worldCopyJump:true
    }).setView([29,34],3);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap contributors',maxZoom:17
    }).addTo(map);canvasRenderer=L.canvas( {
      padding:0.3
    });layer=L.layerGroup().addTo(map)
  }
  async function load() {
    try {
      const r=await fetch('/data/atlas/manifest.json');if(!r.ok)throw Error('تعذر تحميل فهرس البيانات');manifest=await r.json();$('loading').textContent=`جارٍ تحميل ${manifest.parts.length} أجزاء من البيانات…`;all=[];for(let i=0;i<manifest.parts.length;i++) {
        const p=manifest.parts[i];$('loading').textContent=`جارٍ تحميل البيانات (${i+1} من ${manifest.parts.length})…`;const response=await fetch('/data/atlas/'+encodeURIComponent(p));if(!response.ok)throw Error('تعذر تحميل '+p+' (HTTP '+response.status+')');const part=await response.json();if(!Array.isArray(part))throw Error('صيغة بيانات غير صحيحة في '+p);all.push(...part);await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(all.length!==manifest.total)throw Error('عدد السجلات لا يطابق الفهرس');opt('root',[...new Set(all.map(r=>r.yRoot))]);opt('country',[...new Set(all.map(r=>r.country))]);$('loading').style.display='none';initMap();filtered=all;render()
    }
    catch(e) {
      $('loading').textContent='خطأ في تحميل البيانات: '+e.message+' — تأكد من رفع مجلد data/atlas كاملًا إلى GitHub.';console.error(e)
    }
}
  fields.forEach(id=>$(id).addEventListener(id==='q'?'input':'change',()=> {
    clearTimeout(timer);timer=setTimeout(filter,id==='q'?250:0)
  }));$('recenter').addEventListener('click',filter);$('reset').addEventListener('click',()=> {
    fields.forEach(id=>$(id).value='');filter()
  });$('prev').addEventListener('click',()=> {
    page--;render();$('records').scrollIntoView( {
      behavior:'smooth'
    })
  });$('next').addEventListener('click',()=> {
    page++;render();$('records').scrollIntoView( {
      behavior:'smooth'
    })
  });$('records').addEventListener('click',e=> {
    const row=e.target.closest('[data-idx]');if(row)detail(filtered[Number(row.dataset.idx)])
  });$('records').addEventListener('keydown',e=> {
    if(e.key==='Enter') {
      const row=e.target.closest('[data-idx]');if(row)detail(filtered[Number(row.dataset.idx)])
    }
});$('close').addEventListener('click',()=>$('detail').style.display='none');$('detail').addEventListener('click',e=> {
    if(e.target===$('detail'))$('detail').style.display='none'
  });document.addEventListener('keydown',e=> {
    if(e.key==='Escape')$('detail').style.display='none'
  });load()
})();
