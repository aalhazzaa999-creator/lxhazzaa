(()=> {
  'use strict';const $=id=>document.getElementById(id);let all=[],filtered=[],page=0,map=null,layer=null,manifest=null,canvasRenderer=null,searchCircle=null,mapSelectionRecords=null;const PAGE=25,MAX_MARKERS=250;const fmt=n=>Number(n||0).toLocaleString('ar-SA');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>( {
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }
  [c]));const fields=['q','root','country','sex','locationType','spatialClassification','radius'];let timer,mutationToken=0,mutationResolved=null;const spatialLabels={local:'ساكنة محلية',nonlocal:'وافد من خارج المنطقة',genetic_outlier:'مختلف وراثيًا عن المجموعة المقارنة',undetermined:'غير محسوم'};let spatialAnnotations={};
  function spatialFor(r){const annotation=spatialAnnotations[r.id];return annotation&&Object.hasOwn(spatialLabels,annotation.status)&&annotation.status!=='undetermined'&&typeof annotation.evidence==='string'&&annotation.evidence.trim()&&typeof annotation.source==='string'&&/^https:\/\/[^\s]+$/i.test(annotation.source)?annotation:{status:'undetermined'};}
  function distance(a,b,c,d) {
    const R=6371,rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;return 2*R*Math.asin(Math.sqrt(Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2))
  }
  function opt(id,arr) {
    const el=$(id);arr.filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar')).forEach(v=> {
      const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)
    })
  }
  // A daily guest allowance. Once exhausted, the research atlas stays locked until the
  // next local calendar day or until Supabase confirms an authenticated account.
  // Client-side storage is a UX allowance, not a tamper-proof server-side rate limit.
  const GUEST_DAILY_SEARCHES=30;
  let lastGuestSearch='';
  const guestDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const guestKey=()=> 'lxhazzaa-guest-searches-'+guestDay();
  const guestUsed=()=>{try{return Math.max(0,Number(localStorage.getItem(guestKey())||0)||0)}catch(e){return 0}};
  const isGuestLocked=()=>!window.LXAuth?.getUser()&&guestUsed()>=GUEST_DAILY_SEARCHES;
  function removeGuestLock(){
    document.getElementById('lxGuestDailyLock')?.remove();
    document.body.classList.remove('lx-guest-locked');
  }
  function showGuestLock(){
    if(!isGuestLocked()){removeGuestLock();return false;}
    if(document.getElementById('lxGuestDailyLock'))return true;
    const wrap=document.createElement('div');
    wrap.id='lxGuestDailyLock';
    wrap.className='lx-guest-limit-overlay';
    wrap.innerHTML='<div class="lx-guest-limit-card" role="dialog" aria-modal="true" aria-labelledby="lxGuestLockTitle" dir="rtl"><h2 id="lxGuestLockTitle">استهلكت الحد المجاني لليوم</h2><p>استخدمت '+GUEST_DAILY_SEARCHES+' عملية بحث مجانية. تتجدد فرص البحث غدًا، أو يمكنك تسجيل الدخول أو إنشاء حساب مجاني لمواصلة البحث الآن.</p><div class="lx-guest-limit-actions"><button type="button" data-lx-guest-signup>إنشاء حساب مجاني</button><button type="button" data-lx-guest-login>تسجيل الدخول</button></div><p class="lx-guest-limit-note">ستُفتح صلاحيات حسابك تلقائيًا بعد إكمال تسجيل الدخول.</p></div>';
    document.body.appendChild(wrap);
    document.body.classList.add('lx-guest-locked');
    wrap.querySelector('[data-lx-guest-signup]').onclick=()=>window.LXAuth?.open('signup');
    wrap.querySelector('[data-lx-guest-login]').onclick=()=>window.LXAuth?.open('login');
    return true;
  }
  function guestSearchAllowed(){
    if(window.LXAuth?.getUser()){removeGuestLock();return true;}
    if(showGuestLock())return false;
    const ids=['q','mutation','root','country','sex','locationType','spatialClassification','radius'];
    const signature=ids.map(id=>$(id)?.value?.trim()||'').join('|')+'|'+($('withCoordinatesOnly')?.getAttribute('aria-pressed')==='true'?'coordinates':'');
    if(!signature.replaceAll('|','')||signature===lastGuestSearch)return true;
    const used=guestUsed();
    if(used>=GUEST_DAILY_SEARCHES){showGuestLock();return false;}
    try{localStorage.setItem(guestKey(),String(used+1))}catch(e){}
    lastGuestSearch=signature;
    return true;
  }
  document.addEventListener('lx-auth-change',e=>{
    if(e.detail?.signedIn){removeGuestLock();lastGuestSearch='';}
    else showGuestLock();
  });
  // Reopen access when the local day changes, even if the page was left open overnight.
  setInterval(()=>{if(!isGuestLocked())removeGuestLock();else showGuestLock()},60000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showGuestLock,{once:true});
  else showGuestLock();
  function filter() {
    if(!guestSearchAllowed())return;
    const mutation=$('mutation').value.trim(),q=$('q').value.trim().toLocaleLowerCase(),root=$('root').value,country=$('country').value,sex=$('sex').value,lt=$('locationType').value,coordinatesOnly=$('withCoordinatesOnly').getAttribute('aria-pressed')==='true',spatial=$('spatialClassification').value,radius=Number($('radius').value),center=map?map.getCenter():null;filtered=all.filter(r=>(!q||[r.id,r.name,r.site,r.country,r.y,r.mt,r.geneticId,r.individualId].some(s=>(s||'').toLocaleLowerCase().includes(q)))&&(!root||r.yRoot===root)&&(!mutation||(mutationResolved&&mutationResolved.known&&mutationResolved.matches(r.y,r.yRoot)))&&(!country||r.country===country)&&(!sex||r.sex===sex)&&(!lt||r.locationType===lt)&&(!coordinatesOnly||(r.lat!==null&&r.lng!==null))&&(!spatial||spatialFor(r).status===spatial)&&(!radius||(center&&r.lat!==null&&distance(center.lat,center.lng,r.lat,r.lng)<=radius)));if(mapSelectionRecords)filtered=filtered.filter(r=>mapSelectionRecords.has(r));page=0;drawSearchCircle();render()
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
    const spatial=spatialFor(r);const pairs=[['معرّف السجل',r.id],['AADR Genetic ID',r.geneticId],['AADR Individual ID',r.individualId],['الدولة',r.country],['الموقع الأثري',r.site],['التصنيف المكاني وفق الدراسة أو البيانات المنشورة',spatialLabels[spatial.status]],['أساس التصنيف المكاني',spatial.basis||''],['نص الدليل',spatial.evidence||''],['مصدر التصنيف',spatial.source||''],['نوع الموقع',r.locationType==='country'?'تقريبي على مستوى الدولة':r.locationType==='site'?'موقع أثري / محلية':'غير محدد'],['دقة الموقع',r.locationAccuracy],['خط العرض',r.lat],['خط الطول',r.lng],['Y-DNA',r.y],['تصنيف Y',r.yRoot],['mtDNA',r.mt],['العمر BP',r.ageBP],['العمر النصي',r.ageText],['طريقة التأريخ',r.dating],['الثقافة الأثرية',r.culture],['الجنس الجزيئي',r.sex],['حالة الربط',r.match],['المصدر',r.source],['المرجع',r.reference],['عنوان الدراسة',r.study],['DOI',r.doi],['ملاحظات',r.notes]];
    const link=studyUrl(r);
    return '<div class="inline-detail-grid">'+pairs.filter(([,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>'<div class="inline-detail-cell"><b>'+esc(k)+'</b><span>'+esc(v)+'</span></div>').join('')+'</div><div class="study-actions">'+(link?'<a class="study-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">فتح الدراسة أو المصدر العلمي ↗</a>':'<span class="study-unavailable">رابط الدراسة غير متوفر لهذه العينة</span>')+'</div>';
  }

  function researchFor(r) {
    const studies=[],seen=new Set();
    const add=(item,record)=>{
      if(!item)return;
      if(typeof item==='string')item={title:item};
      const title=String(item.title||item.study||item.name||record.study||record.reference||'مرجع علمي مرتبط بالعينة').trim();
      const institution=String(item.institution||item.organization||item.university||item.museum||item.researchTeam||item.team||item.publisher||record.institution||record.organization||record.researchTeam||'').trim();
      const doi=String(item.doi||record.doi||'').trim();
      const raw=String(item.url||item.link||item.studyUrl||'').trim();
      let url='';
      if(/^https:\/\//i.test(raw)){try{const u=new URL(raw);if(u.protocol==='https:')url=u.href}catch(e){}}
      if(!url&&/^10\.\d{4,9}\/[\w.()/:;+-]+$/i.test(doi))url='https://doi.org/'+encodeURI(doi);
      if(!url&&!item.url)url=studyUrl(record);
      const key=(doi||url||title).toLocaleLowerCase();
      if(!key||seen.has(key))return;
      seen.add(key);studies.push({title,institution,url,doi});
    };
    const relevant=all.filter(x=>x===r||(
      r.site&&x.site&&r.site.trim().toLocaleLowerCase()===x.site.trim().toLocaleLowerCase()&&
      (!r.country||!x.country||r.country===x.country)
    ));
    for(const record of relevant){
      const collections=[record.studies,record.publications,record.references,record.research];
      for(const items of collections){
        if(Array.isArray(items))items.forEach(item=>add(item,record));
        else if(items&&typeof items==='object')add(items,record);
      }
      if(record.study||record.doi||record.reference)add({title:record.study||record.reference||'مرجع علمي',doi:record.doi},record);
    }
    return studies;
  }
  function selectRecord(r,button,scrollToPanel=true) {
    const panel=$('recordDetailPanel');if(!panel)return;
    document.querySelectorAll('.record-expand').forEach(b=>{
      b.setAttribute('aria-selected',String(b===button));
      b.setAttribute('aria-expanded',String(b===button));
    });
    $('recordDetailTitle').textContent=r.name||r.id||'تفاصيل الرفاة';
    const studies=researchFor(r);
    $('recordDetailBody').innerHTML=detailMarkup(r).replace(/<div class="study-actions">[\s\S]*?<\/div>$/,'')+
      '<h4 class="research-heading">الدراسات والجهات البحثية المرتبطة ('+fmt(studies.length)+')</h4>'+
      (studies.length?studies.map(x=>'<article class="research-item"><strong>'+esc(x.title)+'</strong>'+
        (x.institution?'<small>الجهة البحثية: '+esc(x.institution)+'</small>':'<small>الجهة البحثية غير مذكورة في السجل</small>')+
        (x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">رابط الدراسة أو المصدر ↗</a>':'<span class="unverified">لا يتوفر رابط موثق في البيانات الحالية</span>')+
        '</article>').join(''):'<p class="smallnote">لا توجد دراسات موثقة مرتبطة بهذه العينة أو الموقع في البيانات المحمّلة.</p>');
    $('recordDetailClose').hidden=false;
    if(scrollToPanel&&window.matchMedia('(max-width:1150px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function render() {
    const count=filtered.length;$('all').textContent=fmt(all.length);$('matching').textContent=fmt(count);$('geo').textContent=fmt(filtered.filter(r=>r.lat!==null).length);$('ycount').textContent=fmt(filtered.filter(r=>r.y).length);const start=page*PAGE,subset=filtered.slice(start,start+PAGE);$('range').textContent=count?`${fmt(start+1)}–${fmt(Math.min(start+PAGE,count))} من ${fmt(count)}`:'لا توجد نتائج';$('records').innerHTML=subset.map((r,i)=>`<article class="record-item"><button type="button" class="record record-expand" aria-expanded="false" data-idx="${start+i}"><div><strong>${esc(r.name||r.id)}</strong><span>${esc(r.country||'دولة غير محددة')} · ${esc(r.site||'موقع غير محدد')}</span><small>${esc(r.ageText||'تأريخ غير محدد')} · ${esc(r.match||'')}</small></div><span class="record-right"><span class="y">${esc(r.y||'Y غير محدد')}</span><span class="record-hint">عرض التفاصيل والدراسات ←</span></span></button><div class="inline-detail" hidden></div></article>`).join('')||'<div class="record">لا توجد سجلات تطابق هذه الفلاتر.</div>';$('pageLabel').textContent=`${fmt(page+1)} / ${fmt(Math.max(1,Math.ceil(count/PAGE)))}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE>=count;renderMap()
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
    }).addTo(map);
    // LXHAZZAA editorial label. This overlay does not modify scientific source records.
    const palestineLabel=L.divIcon({
      className:'lx-palestine-label',
      html:'<span lang="ar" dir="rtl">فلسطين المحتلة</span>',
      iconSize:[130,30],iconAnchor:[65,15]
    });
    L.marker([31.55,34.85],{icon:palestineLabel,interactive:false,keyboard:false,zIndexOffset:1000}).addTo(map);
    canvasRenderer=L.canvas( {
      padding:0.3
    });layer=L.layerGroup().addTo(map);map.on('moveend',()=>{drawSearchCircle();renderMap()});map.on('zoomend',renderMap);setTimeout(()=>map.invalidateSize(),200)
  }
  async function load() {
    try {
      const r=await fetch('/data/atlas/manifest.json');if(!r.ok)throw Error('تعذر تحميل فهرس البيانات');manifest=await r.json();$('loading').textContent=`جارٍ تحميل ${manifest.parts.length} أجزاء من البيانات…`;all=[];for(let i=0;i<manifest.parts.length;i++) {
        const p=manifest.parts[i];$('loading').textContent=`جارٍ تحميل البيانات (${i+1} من ${manifest.parts.length})…`;const response=await fetch('/data/atlas/'+encodeURIComponent(p));if(!response.ok)throw Error('تعذر تحميل '+p+' (HTTP '+response.status+')');const part=await response.json();if(!Array.isArray(part))throw Error('صيغة بيانات غير صحيحة في '+p);for(const record of part){if(/^israel$/i.test(String(record.country||'').trim())||String(record.country||'').trim()==='إسرائيل')record.country='Palestine Occupied';}all.push(...part);await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(all.length!==manifest.total)throw Error('عدد السجلات لا يطابق الفهرس');try{const sr=await fetch('/data/atlas/spatial-classifications.json');if(sr.ok){const parsed=await sr.json();if(parsed&&typeof parsed.records==='object'&&!Array.isArray(parsed.records))spatialAnnotations=parsed.records;}}catch(e){console.warn('تعذر تحميل التصنيف المكاني:',e)}opt('root',[...new Set(all.map(r=>r.yRoot))]);opt('country',[...new Set(all.map(r=>r.country))]);$('loading').style.display='none';document.dispatchEvent(new Event('lx-atlas-data-loaded'));initMap();filter()
    }
    catch(e) {
      $('loading').textContent='خطأ في تحميل البيانات: '+e.message+' — تأكد من رفع مجلد data/atlas كاملًا إلى GitHub.';console.error(e)
    }
}
  // Text queries are committed deliberately, so pauses while typing do not consume the guest allowance.
  const qApply=document.createElement('button');qApply.type='button';qApply.className='btn ghost';qApply.textContent='بحث';qApply.setAttribute('aria-label','تنفيذ البحث بالنص');$('q').after(qApply);
  qApply.addEventListener('click',filter);$('q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();filter();}});
  const mutationMode=document.createElement('select');mutationMode.id='mutationMode';mutationMode.setAttribute('aria-label','طريقة مطابقة التحور');mutationMode.innerHTML='<option value="exact">التحور المكتوب نفسه</option><option value="descendants">التحور وفروعه المتحدرة</option>';
  const modeLabel=document.createElement('label');modeLabel.htmlFor='mutationMode';modeLabel.textContent='طريقة مطابقة التحور';$('mutationStatus').after(modeLabel,mutationMode);
  const mutationApply=document.createElement('button');mutationApply.type='button';mutationApply.className='btn ghost';mutationApply.textContent='بحث التحور';mutationMode.after(mutationApply);
  const coverageNote=document.createElement('p');coverageNote.className='smallnote';mutationApply.after(coverageNote);
  document.addEventListener('lx-atlas-data-loaded',()=>{const broad=all.filter(r=>r.y&&!window.LXYdna?.norm(r.y)).length;coverageNote.textContent=broad.toLocaleString('ar-SA')+' سجلًا يحمل وصف Y عامًا أو صيغة غير قابلة للمطابقة برقم تحور؛ ابحث عنها عبر فلتر السلالة أو معرّف العينة.';});
  const applyMutation=()=>{
    const value=$('mutation').value.trim(),token=++mutationToken;
    mutationResolved=null;mapSelectionRecords=null;$('mapSelection').hidden=true;
    clearTimeout(timer);
    if(!value){$('mutationStatus').textContent='يشمل التحور وجميع فروعه المتحدرة عند توفر المشجرة.';filter();return;}
    $('mutationStatus').textContent='جارٍ التحقق من التحور وفروعه في المشجرات…';
    // Fail closed while resolving a mutation: do not show unrelated records.
    timer=setTimeout(async()=>{
      try{
        if(!window.LXYdna)throw Error('تعذر تشغيل فهرس التحورات.');
        const scopedValue=$('root').value&&!/^[A-T](?:\d+[A-Z0-9]*)?-/i.test(value)?$('root').value+'-'+value:value;
        const result=await window.LXYdna.resolve(scopedValue,mutationMode.value);
        if(token!==mutationToken)return;
        mutationResolved=result;
        $('mutationStatus').textContent=result.reason||(
          result.exact?'مطابقة اسم التحور نفسه فقط — المصدر: سجل الأطلس.':
          'يشمل التحور وفروعه المتحدرة — المصادر: '+result.sources.join('، ')+(result.partial?'؛ إحدى المشجرات غير متاحة، وقد تنقص النتائج.':''));
      }catch(e){
        if(token!==mutationToken)return;
        mutationResolved={known:false,matches:()=>false};
        $('mutationStatus').textContent='تعذر التحقق من المشجرة؛ لا تُعرض نتائج غير مؤكدة. '+e.message;
      }
      filter();
    },0);
  };
  mutationApply.addEventListener('click',applyMutation);
  $('mutation').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyMutation();}});
  $('mutation').addEventListener('input',()=>{$('mutationStatus').textContent='اضغط «بحث التحور» لتطبيق الاسم الجديد.';});
  mutationMode.addEventListener('change',applyMutation);
  fields.filter(id=>id!=='q').forEach(id=>$(id).addEventListener('change',()=> {
    mapSelectionRecords=null;$('mapSelection').hidden=true;
    clearTimeout(timer);if(id==='root'&&$('mutation').value.trim())applyMutation();else timer=setTimeout(filter,0)
  }));$('withCoordinatesOnly').addEventListener('click',()=>{const button=$('withCoordinatesOnly');button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));mapSelectionRecords=null;$('mapSelection').hidden=true;filter()});$('recenter').addEventListener('click',filter);$('reset').addEventListener('click',()=> {
    fields.forEach(id=>$(id).value='');$('withCoordinatesOnly').setAttribute('aria-pressed','false');$('mutation').value='';mutationToken++;mutationResolved=null;$('mutationStatus').textContent='يشمل التحور وجميع فروعه المتحدرة عند توفر المشجرة.';mapSelectionRecords=null;$('mapSelection').hidden=true;filter()
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
