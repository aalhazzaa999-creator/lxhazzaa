(()=> {
  'use strict';const $=id=>document.getElementById(id);let all=[],filtered=[],page=0,map=null,layer=null,manifest=null,canvasRenderer=null,searchCircle=null,mapSelectionRecords=null;const PAGE=25,MAX_MARKERS=250;const fmt=n=>Number(n||0).toLocaleString('ar-SA');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>( {
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
    const q=$('q').value.trim().toLocaleLowerCase(),root=$('root').value,country=$('country').value,sex=$('sex').value,lt=$('locationType').value,radius=Number($('radius').value),center=map?map.getCenter():null;filtered=all.filter(r=>(!q||[r.id,r.name,r.site,r.country,r.y,r.mt,r.geneticId,r.individualId].some(s=>(s||'').toLocaleLowerCase().includes(q)))&&(!root||r.yRoot===root)&&(!country||r.country===country)&&(!sex||r.sex===sex)&&(!lt||r.locationType===lt)&&(!radius||(center&&r.lat!==null&&distance(center.lat,center.lng,r.lat,r.lng)<=radius)));if(mapSelectionRecords)filtered=filtered.filter(r=>mapSelectionRecords.has(r));page=0;drawSearchCircle();render()
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

  function researchFor(r) {
    const studies=[],seen=new Map();
    const clean=v=>String(v??'').trim();
    const validUrl=raw=>{
      try{const u=new URL(raw);return u.protocol==='https:'?u.href:'';}catch(e){return '';}
    };
    const add=(raw,record,scope)=>{
      if(!raw)return;
      const item=typeof raw==='string'?{title:raw}:raw;
      if(!item||typeof item!=='object')return;
      const title=clean(item.title||item.study||item.name||item.paperTitle||record.study||record.reference||'مرجع علمي');
      const doi=clean(item.doi||((record===r||!raw.doi)?record.doi:''));
      const institution=clean(item.institution||item.organization||item.university||item.museum||item.researchTeam||item.team||item.publisher||record.institution||record.organization||record.researchTeam);
      const date=clean(item.publicationDate||item.publishedAt||item.published||item.datePublished||item.date||item.publicationYear||item.year||item.studyYear||item.yearPublished||record.publicationDate||record.publishedAt||record.publicationYear||record.studyYear||record.yearPublished||record.year);
      const rawLink=clean(item.url||item.link||item.studyUrl||item.doiUrl);
      let url=validUrl(rawLink);
      if(!url&&/^10\.\d{4,9}\/[\w.()/:;+-]+$/i.test(doi))url='https://doi.org/'+encodeURI(doi);
      if(!url&&record===r)url=studyUrl(record);
      const key=clean(doi||url||title).toLocaleLowerCase();
      if(!key)return;
      const old=seen.get(key);
      if(old){
        if(!old.date&&date)old.date=date;
        if(!old.institution&&institution)old.institution=institution;
        if(!old.url&&url)old.url=url;
        if(scope==='sample')old.scope='sample';
        return;
      }
      const study={title,institution,date,url,doi,scope};
      seen.set(key,study);studies.push(study);
    };
    // Only publications explicitly attached to this individual remain.
    // A shared archaeological site does NOT establish that a study examined this sample.
    const sameId=(a,b)=>String(a??'').trim()!==''&&String(a).trim()===String(b??'').trim();
    const related=all.filter(x=>x===r||
      (sameId(r.individualId,x.individualId))||
      (sameId(r.geneticId,x.geneticId))||
      (sameId(r.id,x.id)));
    for(const record of related){
      for(const items of [record.studies,record.publications,record.references,record.research]){
        if(Array.isArray(items))items.forEach(item=>add(item,record,'sample'));
        else if(items)add(items,record,'sample');
      }
      if(record.study||record.doi||record.reference)add({
        title:record.study||record.reference||'مرجع علمي',
        doi:record.doi,url:studyUrl(record),
        publicationDate:record.publicationDate,
        publicationYear:record.publicationYear,
        year:record.studyYear||record.yearPublished||record.year
      },record,'sample');
    }
    return studies.sort((a,b)=>Number(b.scope==='sample')-Number(a.scope==='sample')||
      (parseInt(b.date,10)||0)-(parseInt(a.date,10)||0));
  }
  function siteResearchFor(r,sampleStudies) {
    if(!r.site||!String(r.site).trim())return [];
    const norm=v=>String(v??'').trim().toLocaleLowerCase();
    const sampleKeys=new Set(sampleStudies.map(x=>norm(x.doi||x.url||x.title)));
    const seen=new Set(),studies=[];
    for(const record of all){
      if(norm(record.site)!==norm(r.site)||
        (r.country&&record.country&&norm(record.country)!==norm(r.country)))continue;
      const rawStudies=[...(Array.isArray(record.studies)?record.studies:record.studies?[record.studies]:[]),
        ...(Array.isArray(record.publications)?record.publications:record.publications?[record.publications]:[]),
        ...(Array.isArray(record.references)?record.references:record.references?[record.references]:[]),
        ...(Array.isArray(record.research)?record.research:record.research?[record.research]:[])];
      if(record.study||record.doi)rawStudies.push({title:record.study||record.reference||'مرجع علمي',doi:record.doi,url:studyUrl(record),year:record.publicationYear||record.studyYear||record.year});
      for(const raw of rawStudies){
        const item=typeof raw==='string'?{title:raw}:raw;
        if(!item||typeof item!=='object')continue;
        const title=String(item.title||item.study||item.name||item.paperTitle||'مرجع علمي').trim();
        const doi=String(item.doi||'').trim();
        const date=String(item.publicationDate||item.publishedAt||item.datePublished||item.date||item.publicationYear||item.year||record.publicationYear||record.studyYear||'').trim();
        const institution=String(item.institution||item.organization||item.university||item.museum||item.team||item.publisher||record.institution||'').trim();
        let url='';try{const u=new URL(String(item.url||item.link||item.studyUrl||''));if(u.protocol==='https:')url=u.href;}catch(e){}
        if(!url&&/^10\\.\\d{4,9}\\/[\\w.()/:;+-]+$/i.test(doi))url='https://doi.org/'+encodeURI(doi);
        const key=norm(doi||url||title);
        if(!key||sampleKeys.has(key)||seen.has(key))continue;
        seen.add(key);studies.push({title,doi,date,institution,url,scope:'site'});
      }
    }
    return studies.sort((a,b)=>(parseInt(b.date,10)||0)-(parseInt(a.date,10)||0));
  }
  function studyCards(studies,siteOnly=false) {
    return studies.map((x,i)=>'<article class="research-item"><div class="research-study-head"><strong>'+fmt(i+1)+'. '+esc(x.title)+'</strong><span class="research-year">'+esc(x.date||'تاريخ غير موثق')+'</span></div>'+
      (siteOnly?'<small class="research-scope">مرجع مرتبط بالموقع الأثري؛ لا يعني بالضرورة أنه فحص هذه الرفاة</small>':'')+
      (x.institution?'<small>الجهة البحثية: '+esc(x.institution)+'</small>':'<small>الجهة البحثية غير مذكورة في السجل</small>')+
      (x.doi?'<small>DOI: '+esc(x.doi)+'</small>':'')+
      (x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">فتح الدراسة ↗</a>':'<span class="unverified">رابط الدراسة غير موثق في البيانات الحالية</span>')+
      '</article>').join('');
  }
  function selectRecord(r,button,scrollToPanel=true) {
    const panel=$('recordDetailPanel');if(!panel)return;
    document.querySelectorAll('.record-expand').forEach(b=>{
      b.setAttribute('aria-selected',String(b===button));
      b.setAttribute('aria-expanded',String(b===button));
    });
    $('recordDetailTitle').textContent=r.name||r.id||'تفاصيل الرفاة';
    const studies=researchFor(r);
    const siteStudies=siteResearchFor(r,studies);
    $('recordDetailBody').innerHTML=detailMarkup(r).replace(/<div class="study-actions">[\\s\\S]*?<\\/div>$/,'')+
      '<h4 class="research-heading">الدراسات الخاصة بهذه الرفاة ('+fmt(studies.length)+')</h4>'+
      (studies.length?studyCards(studies):'<p class="smallnote">لا توجد دراسات موثقة لهذه العينة في البيانات المحمّلة.</p>')+
      '<h4 class="research-heading">الموقع الأثري: '+esc(r.site||'غير محدد')+'</h4>'+
      '<p class="smallnote">دراسات أخرى مرتبطة بالموقع الأثري ('+fmt(siteStudies.length)+')، ولا يُفترض أنها فحصت هذه الرفاة.</p>'+
      (siteStudies.length?studyCards(siteStudies,true):'<p class="smallnote">لا توجد دراسات إضافية موثقة للموقع في البيانات المحمّلة.</p>');
    $('recordDetailClose').hidden=false;
    if(scrollToPanel&&window.matchMedia('(max-width:1150px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function studyPreview(r) {
    const studies=researchFor(r);
    if(!studies.length)return '<small class="record-study-preview">لا توجد دراسة موثقة في البيانات الحالية</small>';
    const first=studies[0];
    return '<small class="record-study-preview">الدراسة: '+esc(first.title)+
      (first.date?' ('+esc(first.date)+')':'')+
      (studies.length>1?' · +'+fmt(studies.length-1)+' دراسات أخرى':'')+'</small>';
  }
  function render() {
    const count=filtered.length;$('all').textContent=fmt(all.length);$('matching').textContent=fmt(count);$('geo').textContent=fmt(filtered.filter(r=>r.lat!==null).length);$('ycount').textContent=fmt(filtered.filter(r=>r.y).length);const start=page*PAGE,subset=filtered.slice(start,start+PAGE);$('range').textContent=count?`${fmt(start+1)}–${fmt(Math.min(start+PAGE,count))} من ${fmt(count)}`:'لا توجد نتائج';$('records').innerHTML=subset.map((r,i)=>`<article class="record-item"><button type="button" class="record record-expand" aria-expanded="false" data-idx="${start+i}"><div><strong>${esc(r.name||r.id)}</strong><span>${esc(r.country||'دولة غير محددة')} · ${esc(r.site||'موقع غير محدد')}</span><small>${esc(r.ageText||'تأريخ غير محدد')} · ${esc(r.match||'')}</small>${studyPreview(r)}</div><span class="record-right"><span class="y">${esc(r.y||'Y غير محدد')}</span><span class="record-hint">عرض التفاصيل والدراسات ←</span></span></button><div class="inline-detail" hidden></div></article>`).join('')||'<div class="record">لا توجد سجلات تطابق هذه الفلاتر.</div>';$('pageLabel').textContent=`${fmt(page+1)} / ${fmt(Math.max(1,Math.ceil(count/PAGE)))}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE>=count;renderMap()
  }
  function drawSearchCircle() {
    if(!map || typeof L==='undefined')return;
    const radius=Number($('radius').value);
    if(searchCircle){map.removeLayer(searchCircle);searchCircle=null;}
    if(!radius)return;
    searchCircle=L.circle(map.getCenter(),{
      radius:radius*1000,color:'#D4AF7C',weight:2,
      opacity:.9,fillColor:'#D4AF7C',fillOpacity:.10,
      interactive:false,dashArray:'8 6'
    }).addTo(map);
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
      if (!group) { group = { count: 0, lat: 0, lng: 0, sample: r, country: true, records: [] }; groups.set(key, group); }
      group.records.push(r);
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
      // Stable map selection: do not open a transient Leaflet popup or auto-zoom.
      marker.on('click', () => selectMapGroup(g));
      marker.addTo(layer);
    }
    $('mapNote').textContent = 'تغطي الخريطة ' + fmt(points.length) + ' سجلًا بإحداثيات، مجمّعة في ' + fmt(groups.size) + ' مجموعة حسب مستوى التكبير. الذهبي: موقع دولة تقريبي. الأزرق: موقع أثري أو منطقة. لا تمثل النقاط قبورًا مؤكدة.';
  }
  function selectMapGroup(group) {
    mapSelectionRecords=new Set(group.records);
    const panel=$('mapSelection');
    $('mapSelectionTitle').textContent=group.count===1?'عينة محددة على الخريطة':'مجموعة من '+fmt(group.count)+' عينات على الخريطة';
    const siteNames=[...new Set(group.records.map(r=>r.site||r.country).filter(Boolean))];
    $('mapSelectionBody').innerHTML=
      '<p class="smallnote">عدد السجلات المرتبطة بالنقطة: <strong>'+fmt(group.count)+'</strong>. تم حصر قائمة نتائج البحث في هذه المجموعة؛ اضغط على أي عينة لقراءة بياناتها ودراساتها.</p>'+
      '<p class="smallnote">المواقع الممثلة: '+esc(siteNames.slice(0,6).join('، ')||'غير محددة')+
      (siteNames.length>6?'، وغيرها':'')+'</p>'+
      '<p class="smallnote">تنبيه: قد تضم الدائرة مواقع متقاربة جُمعت بصريًا وفق مستوى تكبير الخريطة، وليست بالضرورة موقعًا أثريًا واحدًا.</p>'+
      '<button type="button" id="clearMapGroup" class="btn ghost">إظهار جميع النتائج من جديد</button>';
    panel.hidden=false;
    $('clearMapGroup').addEventListener('click',clearMapGroup);
    filter();
    if(group.count===1)selectRecord(group.sample,null,false);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clearMapGroup() {
    mapSelectionRecords=null;
    $('mapSelection').hidden=true;
    filter();
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
    });layer=L.layerGroup().addTo(map);map.on('moveend',()=>{drawSearchCircle();renderMap()});map.on('zoomend',renderMap);setTimeout(()=>map.invalidateSize(),200)
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
    mapSelectionRecords=null;$('mapSelection').hidden=true;
    clearTimeout(timer);timer=setTimeout(filter,id==='q'?250:0)
  }));$('recenter').addEventListener('click',filter);$('reset').addEventListener('click',()=> {
    fields.forEach(id=>$(id).value='');mapSelectionRecords=null;$('mapSelection').hidden=true;filter()
  });$('prev').addEventListener('click',()=> {
    page--;render();$('records').scrollIntoView( {
      behavior:'smooth'
    })
  });$('next').addEventListener('click',()=> {
    page++;render();$('records').scrollIntoView( {
      behavior:'smooth'
    })
  });function expandRecord(button) {
    const record=filtered[Number(button.dataset.idx)];
    if(record)selectRecord(record,button);
  }
  $('records').addEventListener('click',e=>{const button=e.target.closest('button.record-expand');if(button)expandRecord(button);});
  $('recordDetailClose').addEventListener('click',()=>{ $('recordDetailTitle').textContent='تفاصيل الرفاة والدراسات';$('recordDetailBody').innerHTML='<p class="smallnote">اختر عينة من نتائج البحث لعرض بياناتها ومراجعها هنا.</p>';$('recordDetailClose').hidden=true;document.querySelectorAll('.record-expand').forEach(b=>{b.setAttribute('aria-selected','false');b.setAttribute('aria-expanded','false')}); });
  $('mapSelectionClose').addEventListener('click',clearMapGroup);$('close').addEventListener('click',()=>$('detail').style.display='none');$('detail').addEventListener('click',e=> {
    if(e.target===$('detail'))$('detail').style.display='none'
  });document.addEventListener('keydown',e=> {
    if(e.key==='Escape')$('detail').style.display='none'
  });load()
})();
