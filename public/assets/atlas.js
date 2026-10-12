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
  function studyUrl(r) {
    const raw=String(r.doi||'').trim();
    if(/^10\.\d{4,9}\/[\w.()/:;+-]+$/i.test(raw))return 'https://doi.org/'+encodeURI(raw);
    if(/^https:\/\/(doi\.org|dx\.doi\.org)\/10\.\d{4,9}\//i.test(raw))return raw;
    const ref=String(r.reference||'').trim();
    if(/^https:\/\//i.test(ref)){try{const u=new URL(ref);if(u.protocol==='https:')return u.href;}catch(e){}}
    return '';
  }
  function detailMarkup(r) {
    const pairs=[['معرّف السجل',r.id],['AADR Genetic ID',r.geneticId],['AADR Individual ID',r.individualId],['الدولة',r.country],['الموقع الأثري',r.site],['نوع الموقع',r.locationType==='country'?'تقريبي على مستوى الدولة':r.locationType==='site'?'موقع أثري / محلية':'غير محدد'],['دقة الموقع',r.locationAccuracy],['خط العرض',r.lat],['خط الطول',r.lng],['Y-DNA',r.y],['تصنيف Y',r.yRoot],['mtDNA',r.mt],['العمر BP',r.ageBP],['العمر النصي',r.ageText],['طريقة التأريخ',r.dating],['الثقافة الأثرية',r.culture],['الجنس الجزيئي',r.sex],['حالة الربط',r.match],['المصدر',r.source],['المرجع',r.reference],['عنوان الدراسة',r.study],['DOI',r.doi],['ملاحظات',r.notes]];
    const link=studyUrl(r);
    return '<div class="inline-detail-grid">'+pairs.filter(([,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>'<div class="inline-detail-cell"><b>'+esc(k)+'</b><span>'+esc(v)+'</span></div>').join('')+'</div><div class="study-actions">'+(link?'<a class="study-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">فتح الدراسة أو المصدر العلمي ↗</a>':'<span class="study-unavailable">رابط الدراسة غير متوفر لهذه العينة</span>')+'</div>';
  }
  function render() {
    const count=filtered.length;$('all').textContent=fmt(all.length);$('matching').textContent=fmt(count);$('geo').textContent=fmt(filtered.filter(r=>r.lat!==null).length);$('ycount').textContent=fmt(filtered.filter(r=>r.y).length);const start=page*PAGE,subset=filtered.slice(start,start+PAGE);$('range').textContent=count?`${fmt(start+1)}–${fmt(Math.min(start+PAGE,count))} من ${fmt(count)}`:'لا توجد نتائج';$('records').innerHTML=subset.map((r,i)=>`<article class="record-item"><button type="button" class="record record-expand" aria-expanded="false" data-idx="${start+i}"><div><strong>${esc(r.name||r.id)}</strong><span>${esc(r.country||'دولة غير محددة')} · ${esc(r.site||'موقع غير محدد')}</span><small>${esc(r.ageText||'تأريخ غير محدد')} · ${esc(r.match||'')}</small></div><span class="record-right"><span class="y">${esc(r.y||'Y غير محدد')}</span><span class="record-hint">عرض المعلومات والدراسة ⌄</span></span></button><div class="inline-detail" hidden></div></article>`).join('')||'<div class="record">لا توجد سجلات تطابق هذه الفلاتر.</div>';$('pageLabel').textContent=`${fmt(page+1)} / ${fmt(Math.max(1,Math.ceil(count/PAGE)))}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE>=count;renderMap()
  }
  function renderMap() {
    if (!map) return;
    layer.clearLayers();
    const points = filtered.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)) && r.lat !== null && r.lng !== null);
    // Aggregate all geolocated records into viewport-dependent cells rather than discarding all but the first 250.
    const zoom = map.getZoom();
    const cellSize = 52;
    const groups = new Map();
    for (const r of points) {
      const projected = map.project([Number(r.lat), Number(r.lng)], zoom);
      const key = Math.floor(projected.x / cellSize) + ':' + Math.floor(projected.y / cellSize);
      let group = groups.get(key);
      if (!group) { group = { count: 0, lat: 0, lng: 0, sample: r, country: true }; groups.set(key, group); }
      group.count++;
      group.lat += Number(r.lat);
      group.lng += Number(r.lng);
      if (r.locationType !== 'country') group.country = false;
    }
    const visible = [];
    for (const g of groups.values()) {
      const lat = g.lat / g.count, lng = g.lng / g.count;
      if (map.getBounds().pad(.25).contains([lat, lng])) visible.push({ ...g, lat, lng });
    }
    visible.sort((a,b) => b.count-a.count);
    for (const g of visible.slice(0, 1400)) {
      const color = g.country ? '#B08A56' : '#86AFC1';
      const marker = L.circleMarker([g.lat,g.lng], {
        radius: g.count > 1 ? Math.min(19, 6 + Math.log2(g.count) * 1.6) : 5,
        weight: 1.5, color:'#0B1018', fillColor:color, fillOpacity:.86, renderer:canvasRenderer
      });
      marker.bindPopup(g.count > 1
        ? '<b>' + fmt(g.count) + ' عينة متقاربة</b><div>كبّر الخريطة لعرض مواقع أكثر دقة</div>'
        : '<b>' + esc(g.sample.name || g.sample.id) + '</b><div>' + esc(g.sample.site || g.sample.country) + '</div><div>' + esc(g.sample.y || '') + '</div>');
      marker.on('click', () => { if (g.count > 1) map.setView([g.lat,g.lng],Math.min(map.getZoom()+2,16)); else detail(g.sample); });
      marker.addTo(layer);
    }
    $('mapNote').textContent = 'تغطي الخريطة ' + fmt(points.length) + ' سجلًا بإحداثيات، مجمّعة في ' + fmt(groups.size) + ' مجموعة حسب مستوى التكبير. الذهبي: موقع دولة تقريبي. الأزرق: موقع أثري أو منطقة. لا تمثل النقاط قبورًا مؤكدة.';
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
    });layer=L.layerGroup().addTo(map);map.on('moveend zoomend',renderMap);setTimeout(()=>map.invalidateSize(),200)
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
  });function expandRecord(button) {
    const panel=button.parentElement.querySelector('.inline-detail');
    if(!panel)return;
    const opening=panel.hidden;
    document.querySelectorAll('.record-expand[aria-expanded="true"]').forEach(b=>{if(b!==button){b.setAttribute('aria-expanded','false');const p=b.parentElement.querySelector('.inline-detail');if(p)p.hidden=true;}});
    button.setAttribute('aria-expanded',String(opening));
    panel.hidden=!opening;
    if(opening){const record=filtered[Number(button.dataset.idx)];if(record)panel.innerHTML=detailMarkup(record);}
  }
  $('records').addEventListener('click',e=>{const button=e.target.closest('button.record-expand');if(button)expandRecord(button);});
  $('close').addEventListener('click',()=>$('detail').style.display='none');$('detail').addEventListener('click',e=> {
    if(e.target===$('detail'))$('detail').style.display='none'
  });document.addEventListener('keydown',e=> {
    if(e.key==='Escape')$('detail').style.display='none'
  });load()
})();
