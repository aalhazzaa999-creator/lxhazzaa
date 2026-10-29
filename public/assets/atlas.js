(()=> {
  'use strict';const $=id=>document.getElementById(id);let treeIndex=null,queryResult=null,all=[],filtered=[],page=0,map=null,layer=null,manifest=null,canvasRenderer=null,searchCircle=null,mapSelectionRecords=null;const PAGE=25,MAX_MARKERS=250;const fmt=n=>Number(n||0).toLocaleString('ar-SA');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>( {
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }
  [c]));const fields=['q','root','country','sex','locationType','spatialClassification','radius','dnaType','quality','ageMinBP','ageMaxBP'];let timer,mutationToken=0,mutationResolved=null;const spatialLabels={local:'ساكنة محلية',nonlocal:'وافد من خارج المنطقة',genetic_outlier:'مختلف وراثيًا عن المجموعة المقارنة',undetermined:'غير محسوم'};let spatialAnnotations={};
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
    const ids=['q','mutation','root','country','sex','locationType','spatialClassification','radius','dnaType','quality','ageMinBP','ageMaxBP'];
    const signature=ids.map(id=>id==='dnaType'?'':$(id)?.value?.trim()||'').join('|')+'|'+($('withCoordinatesOnly')?.getAttribute('aria-pressed')==='true'?'coordinates':'');
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
    if(!treeIndex)return;
    if(!guestSearchAllowed())return;
    const type=$('dnaType').value||'y',mutation=$('mutation').value.trim(),country=$('country').value,lt=$('locationType').value,coordinatesOnly=$('withCoordinatesOnly').getAttribute('aria-pressed')==='true',spatial=$('spatialClassification').value,radius=Number($('radius').value),center=map?map.getCenter():null;
    queryResult=window.LXResearchQuery.select(all,{type,query:mutation,mode:$('mutationMode').value,root:$('root').value,sex:$('sex').value,quality:$('quality').value,ageMinBP:$('ageMinBP').value,ageMaxBP:$('ageMaxBP').value,text:$('q').value.trim()},treeIndex);
    filtered=queryResult.records.filter(r=>(!country||r.country===country)&&(!lt||r.locationType===lt)&&(!coordinatesOnly||(r.lat!==null&&r.lng!==null))&&(!spatial||spatialFor(r).status===spatial)&&(!radius||(center&&r.lat!==null&&r.lng!==null&&distance(center.lat,center.lng,r.lat,r.lng)<=radius)));
    if(mutation)$('mutationStatus').textContent=queryResult.resolved.reason||('🌿 '+(type==='mt'?'mtDNA':'Y-DNA')+' · YFull '+treeIndex.meta.version+(type==='y'?' · FTDNA '+treeIndex.foreignMeta.sourceVersion:''));
    if(mapSelectionRecords)filtered=filtered.filter(r=>mapSelectionRecords.has(r));page=0;drawSearchCircle();render();finishShareRestore()
  }
  // Share only public search state; never include account or session information.
  const shareKeys={q:'q',mutation:'mutation',root:'root',country:'country',sex:'sex',locationType:'place',spatialClassification:'spatial',radius:'radius',dnaType:'dna',quality:'quality',ageMinBP:'ageMinBP',ageMaxBP:'ageMaxBP'};
  let sharedRecordId='',pendingSharedRecord='',pendingSharedPage=0,selectedGroup=null,pendingGroup=null,sharedIds=null;
  const initialShare=new URLSearchParams(location.search);
  function shareUrl(){
    const url=new URL('/lxhuman/',location.origin);
    for(const [id,key] of Object.entries(shareKeys)){
      const value=$(id)?.value?.trim();
      if(value)url.searchParams.set(key,value);
    }
    if($('mutation')?.value.trim())url.searchParams.set('mode',$('mutationMode').value);
    if($('withCoordinatesOnly').getAttribute('aria-pressed')==='true')url.searchParams.set('coords','1');
    if($('radius').value&&map){
      const center=map.getCenter();
      url.searchParams.set('center',center.lat.toFixed(5)+','+center.lng.toFixed(5));
    }
    if(sharedIds&&sharedIds.length&&sharedIds.length<=300){url.searchParams.set('samples',sharedIds.join(','));}
    if(selectedGroup){url.searchParams.set('point',selectedGroup.lat.toFixed(5)+','+selectedGroup.lng.toFixed(5));url.searchParams.set('zoom',String(selectedGroup.zoom));}
    if(page)url.searchParams.set('page',String(page+1));
    if(sharedRecordId)url.searchParams.set('record',sharedRecordId);
    return url.href;
  }
  function restoreShare(){
    if(!initialShare.size){filter();return;}
    for(const [id,key] of Object.entries(shareKeys)){
      const value=initialShare.get(key);
      if(value!==null&&($(id).tagName==='INPUT'||Array.from($(id).options||[]).some(o=>o.value===value)))$(id).value=value.slice(0,120);
    }
    const mode=initialShare.get('mode');
    if(mode==='exact'||mode==='descendants')$('mutationMode').value=mode;
    $('withCoordinatesOnly').setAttribute('aria-pressed',String(initialShare.get('coords')==='1'));
    const center=initialShare.get('center');
    if(center&&map){
      const match=/^(-?\d{1,2}(?:\.\d{1,5})?),(-?\d{1,3}(?:\.\d{1,5})?)$/.exec(center);
      if(match&&Math.abs(+match[1])<=90&&Math.abs(+match[2])<=180)map.setView([+match[1],+match[2]],map.getZoom());
    }
    const samples=initialShare.get('samples');
    if(samples&&samples.length<6000){const ids=samples.split(',').filter(x=>/^[A-Za-z0-9_.-]{1,80}$/.test(x));if(ids.length&&ids.length<=300){sharedIds=ids;mapSelectionRecords=new Set(all.filter(r=>ids.includes(r.id)));$('mapSelectionTitle').textContent='قائمة العينات المشتركة';$('mapSelectionBody').textContent='العينات التي شاركها الباحث: '+ids.length;$('mapSelection').hidden=false;}}
    const point=initialShare.get('point'),zoom=Number(initialShare.get('zoom'));
    const pointMatch=point&&/^(-?\d{1,2}(?:\.\d{1,5})?),(-?\d{1,3}(?:\.\d{1,5})?)$/.exec(point);
    if(!sharedIds&&pointMatch&&zoom>=1&&zoom<=17&&map){pendingGroup={lat:+pointMatch[1],lng:+pointMatch[2],zoom};map.setView([pendingGroup.lat,pendingGroup.lng],zoom);}
    pendingSharedPage=Math.max(0,Math.min(2000,(Number(initialShare.get('page'))||1)-1));
    pendingSharedRecord=(initialShare.get('record')||'').slice(0,120);
    if($('mutation').value.trim())applyMutation();else filter();
  }
  function finishShareRestore(){
    if(!pendingSharedRecord&&!pendingSharedPage)return;
    const id=pendingSharedRecord;pendingSharedRecord='';
    if(id){
      const index=filtered.findIndex(r=>r.id===id);
      if(index!==-1){page=Math.floor(index/PAGE);sharedRecordId=id;render();selectRecord(filtered[index],null,false);return;}
    }
    page=Math.min(pendingSharedPage,Math.max(0,Math.ceil(filtered.length/PAGE)-1));
    pendingSharedPage=0;
    if(page)render();
  }
  const shareButton=document.createElement('button');
  shareButton.type='button';shareButton.className='btn ghost';
  shareButton.textContent='مشاركة نتائج البحث';shareButton.setAttribute('aria-label','نسخ رابط نتائج البحث الحالية');
  shareButton.hidden=true;document.body.append(shareButton);
  const titleBox=document.querySelector('.atlas-stats-title');
  const shareIcon=document.createElement('button');shareIcon.type='button';shareIcon.className='atlas-title-share';
  shareIcon.setAttribute('aria-label','مشاركة النتائج المعروضة');shareIcon.title='مشاركة النتائج المعروضة';
  shareIcon.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>';
  titleBox.append(shareIcon);
  const exportMenu=document.createElement('div');exportMenu.className='atlas-export-menu';exportMenu.hidden=true;
  exportMenu.innerHTML='<button type="button" data-action="link">مشاركة رابط النتائج</button><button type="button" data-action="json">⤓ بيانات ومصادر JSON</button><button type="button" data-action="print">تصدير PDF / طباعة</button>';
  titleBox.append(exportMenu);
  shareIcon.addEventListener('click',()=>{exportMenu.hidden=!exportMenu.hidden});
  document.addEventListener('click',e=>{if(!titleBox.contains(e.target))exportMenu.hidden=true});
  exportMenu.querySelector('[data-action="link"]').addEventListener('click',()=>{exportMenu.hidden=true;shareButton.click()});
  exportMenu.querySelector('[data-action="print"]').addEventListener('click',()=>{exportMenu.hidden=true;printResults()});
  exportMenu.querySelector('[data-action="json"]').onclick=()=>{exportMenu.hidden=true;if(!treeIndex||!queryResult)return;const type=$('dnaType').value||'y',user=window.LXAuth?.getUser(),role=user?window.LXAuth?.getRole():null,max=['owner','admin'].includes(role)?Infinity:user?100:20;const out={schemaVersion:2,treeType:type,dataSnapshot:manifest.snapshot,source:treeIndex.meta,foreignSource:type==='y'?treeIndex.foreignMeta:undefined,query:shareUrl(),totalResults:filtered.length,exportedAt:new Date().toISOString(),records:filtered.slice(0,max).map(r=>window.LXResearchQuery.exportRecord(r,{...queryResult.decisions.get(r.id),placement:queryResult.placements.get(r.id)},type))};const href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=href;a.download='LXHAZZAA-'+type+'-'+manifest.snapshot+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);shareStatus.textContent='⤓ '+out.records.length+' نتيجة ومصادرها';};
  function printResults(){
    if(!treeIndex||!manifest)return;
    const auth=window.LXAuth,user=auth?.getUser(),role=user?auth?.getRole():'guest';
    const max=role==='owner'||role==='admin'?Infinity:user?100:20;
    const rows=filtered.slice(0,max);
    if(!rows.length){shareStatus.textContent='لا توجد نتائج لتصديرها.';return;}
    const popup=window.open('','_blank');
    if(!popup){shareStatus.textContent='اسمح بفتح نافذة الطباعة لهذا الموقع ثم حاول مجددًا.';return;}
    const total=filtered.length,limit=Number.isFinite(max)?' (الحد '+max+' عينة)':'';const upgrade=!user&&total>20?' اشترك لتحصل على تصدير حتى ١٠٠ نتيجة.':'';
    const body=rows.map((r,i)=>'<tr><td>'+fmt(i+1)+'</td><td dir="ltr">'+esc(r.id)+'</td><td>'+esc([r.site,r.country].filter(Boolean).join(' — ')||'غير متوفر')+'</td><td>'+esc(r.ageText||((r.ageBP!=null)?Math.round(r.ageBP).toLocaleString('ar-SA')+' سنة قبل الحاضر':'غير متوفر'))+'</td><td dir="ltr">'+esc(r[$('dnaType').value||'y']||'غير متوفر')+'</td><td>'+(studyUrl(r)?'<a href="'+esc(studyUrl(r))+'" target="_blank" rel="noopener noreferrer">فتح الدراسة</a>':'غير متوفر')+'</td></tr>').join('');
    const doc='<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>نتائج أطلس الرفات — LXHAZZAA</title><style>@page{size:A4 landscape;margin:12mm}body{font:14px Arial,Tahoma,sans-serif;color:#0b1018;margin:0}header{background:#0b1018;color:#d4af7c;padding:18px 24px;display:flex;align-items:center;gap:24px}header img{width:210px;max-height:100px;object-fit:contain}h1{font-size:23px}main{padding:18px}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#1b2a3a;color:#f1ebd7}td,th{padding:8px 7px;border:1px solid #a6b8b6;text-align:right;overflow-wrap:anywhere}th:first-child,td:first-child{text-align:center;padding-inline:2px}th:last-child,td:last-child{white-space:nowrap;text-align:center;padding-inline:3px}td:nth-child(5){direction:ltr;text-align:right}td:nth-child(6){direction:rtl;text-align:center}tr{break-inside:avoid}thead{display:table-header-group}footer{margin-top:20px;color:#555}.controls{padding:12px;text-align:center}@media print{.controls{display:none}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style><header><img src="/assets/atlas-logo.webp" alt="شعار أطلس الرفات"><div><h1>أطلس الرفات القديمة · نتائج البحث</h1><span>LXHAZZAA · HUMAN REMAINS ATLAS</span></div></header><main><p>النتائج المطابقة: '+total+' · المعروضة في التصدير: '+rows.length+limit+upgrade+'</p><table><colgroup><col style="width:4%"><col style="width:14%"><col style="width:27%"><col style="width:23%"><col style="width:20%"><col style="width:12%"></colgroup><thead><tr><th>#</th><th>معرّف العينة</th><th>الموقع — الدولة</th><th>العمر</th><th>التحور '+esc($('dnaType').value||'y')+'</th><th>الدراسة</th></tr></thead><tbody>'+body+'</tbody></table><footer>نسخة البيانات '+esc(manifest.snapshot)+' · المرجع '+esc(treeIndex.meta.version)+' · '+esc(shareUrl())+'. بيانات أطلس LXHAZZAA حسب النتائج وقت التصدير. الحقول غير المتوفرة لا تُستنتج.</footer></main><div class="controls"><button onclick="window.print()">طباعة / حفظ PDF</button></div></html>';
    popup.document.open();popup.document.write(doc);popup.document.close();
    shareStatus.textContent='جاهز للطباعة: '+rows.length+' من '+total+' عينة'+limit+'.';
  }
  const shareStatus=document.createElement('p');shareStatus.className='smallnote';shareStatus.setAttribute('role','status');titleBox.append(shareStatus);
  shareButton.addEventListener('click',async()=>{
    const url=shareUrl();
    try{
      if(navigator.share&&matchMedia('(pointer:coarse)').matches){
        await navigator.share({title:'نتائج أطلس الرفات القديمة',url});
        shareStatus.textContent='تمت مشاركة النتائج.';
      }else{
        await navigator.clipboard.writeText(url);
        shareStatus.textContent='تم نسخ رابط النتائج. أرسله لمن تريد.';
      }
    }catch(e){
      if(e.name==='AbortError')return;
      shareStatus.innerHTML='';
      const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','رابط نتائج البحث');
      shareStatus.append('انسخ رابط النتائج: ',input);input.select();
    }
  });
  function studyUrl(r) {
    const raw=String(r.doi||'').trim();
    if(/^10\.\d{4,9}\/[\w.()/:;+-]+$/i.test(raw))return 'https://doi.org/'+encodeURI(raw);
    if(/^https:\/\/(doi\.org|dx\.doi\.org)\/10\.\d{4,9}\//i.test(raw))return raw;
    const ref=String(r.reference||'').trim();
    if(/^https:\/\//i.test(ref)){try{const u=new URL(ref);if(u.protocol==='https:')return u.href;}catch(e){}}
    return '';
  }
  function detailMarkup(r) {
    const spatial=spatialFor(r),p=queryResult?.placements.get(r.id);const pairs=[['معرّف السجل',r.id],['AADR Genetic ID',r.geneticId],['AADR Individual ID',r.individualId],['الدولة',r.country],['الموقع الأثري',r.site],['التصنيف المكاني وفق الدراسة أو البيانات المنشورة',spatialLabels[spatial.status]],['أساس التصنيف المكاني',spatial.basis||''],['نص الدليل',spatial.evidence||''],['مصدر التصنيف',spatial.source||''],['نوع الموقع',r.locationType==='country'?'تقريبي على مستوى الدولة':r.locationType==='site'?'موقع أثري / محلية':r.locationType==='city'?'مدينة تقريبية':'غير محدد'],['دقة الموقع',r.locationAccuracy],['خط العرض',r.lat],['خط الطول',r.lng],['Y-DNA',r.y],['تصنيف Y',r.yRoot],['mtDNA',r.mt],['العمر BP',r.ageBP],['العمر النصي',r.ageText],['طريقة التأريخ',r.dating],['الثقافة الأثرية',r.culture],['الجنس الجزيئي',r.sex],['حالة الربط',r.match],['المصدر',r.source],['المرجع',r.reference],['عنوان الدراسة',r.study],['DOI',r.doi],['ملاحظات',r.notes],['الجنس وفق المصدر / المرجع',r.sexEvidence?.effective],['◉ تقييم الجودة الأصلي',r.quality?.assessment||'غير متوفر'],['مصدر الجودة',r.quality?.source],['متوسط العمر BP — قبل 1950',r.dateEvidence?.bp],['تأريخ AADR الأصلي',r.dateEvidence?.reference?.fullDate],['هوية الفرد',r.personId||'غير موحدة؛ لا تُستنتج من تشابه الاسم'],['إصدار البيانات',manifest.snapshot],['◎ موضع المشجرة المختارة',p?.terminalUnresolved?'↥ '+p.node.id+' — الأصل مدعوم والموضع التفصيلي غير محسوم':p?.node?.id||'غير محسوم'],['الجنس الأصلي',r.original?.sex||'غير محدد'],['الجنس في مرجع AADR',r.aadr?.sex||'غير متوفر'],['التغطية في مرجع AADR',r.quality?.coverage],['SNPs 1240K',r.quality?.snps1240K],['تغطية mt في مرجع AADR',r.quality?.mtCoverage],['تلف DNA في المرجع',r.quality?.damage],['تحذيرات المصدر',r.quality?.warnings],['متوسط BP في مرجع AADR',r.dateEvidence?.reference?.meanBP],['طريقة تأريخ المرجع',r.dateEvidence?.reference?.method]];
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
      seen.add(key);studies.push({title,institution,url,doi,scope:record===r?'مرتبط بالعينة':'مرتبط بالموقع؛ لا يثبت دراسة هذه العينة'});
    };
    const relevant=[r,...all.filter(x=>x!==r&&(
      r.site&&x.site&&r.site.trim().toLocaleLowerCase()===x.site.trim().toLocaleLowerCase()&&
      (!r.country||!x.country||r.country===x.country)
    ))];
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
        '<small>'+esc(x.scope)+'</small>'+(x.institution?'<small>الجهة البحثية: '+esc(x.institution)+'</small>':'<small>الجهة البحثية غير مذكورة في السجل</small>')+
        (x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">رابط الدراسة أو المصدر ↗</a>':'<span class="unverified">لا يتوفر رابط موثق في البيانات الحالية</span>')+
        '</article>').join(''):'<p class="smallnote">لا توجد دراسات موثقة مرتبطة بهذه العينة أو الموقع في البيانات المحمّلة.</p>');
    const links=['y','mt'].filter(t=>r[t]).map(t=>'<a class="btn" href="/lxdnatree/?dna='+t+'&mutation='+encodeURIComponent(r.id)+'" aria-label="موضع العينة في مشجرة '+t+'"><span aria-hidden="true">🌿</span> '+(t==='mt'?'mtDNA':'Y-DNA')+'</a>').join(' ');
    const siblings=r.personId?all.filter(x=>x.personId===r.personId&&x!==r):[];
    $('recordDetailBody').insertAdjacentHTML('afterbegin','<p>'+links+'</p><details><summary>ⓘ الربط والملاحظات</summary><p>روابط المشجرتين تعرض التصنيف المبلغ؛ ↥ أصل مدعوم لا يعني حسم الموضع التفصيلي. الجنس مستقل عن نوع المشجرة، والجودة ليست تقييمًا لصحة التحور.</p><p>'+esc((r.dataFlags||[]).join(' · '))+'</p>'+(siblings.length?'<p>تحاليل أخرى لنفس معرّف الفرد في المصدر: '+siblings.map(x=>'<a href="/lxhuman/?record='+encodeURIComponent(x.id)+'">'+esc(x.id)+'</a>').join(' · ')+'</p>':'')+'</details>');
    sharedRecordId=r.id;
    $('recordDetailClose').hidden=false;
    if(scrollToPanel&&window.matchMedia('(max-width:1150px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  let siteSummary={sites:[],excluded:0};
  function renderSiteList() {
    if(!$('siteListDetails')?.open)return;
    const host=$('siteList');
    host.innerHTML=siteSummary.sites.map(site=>'<div class="atlas-site-row"><div><bdi>'+esc(site.name)+'</bdi><small><bdi>'+esc(site.country||'دولة غير محددة')+'</bdi></small></div><div class="atlas-site-samples"><strong>'+fmt(site.count)+'</strong><span>سجل عينة</span></div></div>').join('')||'<p class="smallnote">لا توجد مواقع مسماة في النتائج الحالية.</p>';
    $('siteListNote').innerHTML=siteSummary.excluded?'<span>سجلات دون موقع مسمى أو بإحداثيات دولة فقط:</span> <bdi>'+fmt(siteSummary.excluded)+'</bdi>':'';
  }
  $('siteListDetails')?.addEventListener('toggle',renderSiteList);
  function renderSites() {
    if(!$('siteCount')||!window.LXAtlasSites)return;
    siteSummary=window.LXAtlasSites.summarize(filtered);
    $('siteCount').textContent=fmt(siteSummary.sites.length);
    renderSiteList();
  }
  function render() {
    renderSites();
    const count=filtered.length;$('all').textContent=fmt(all.length);$('matching').textContent=fmt(count);$('geo').textContent=fmt(filtered.filter(r=>r.lat!==null).length);$('ycount').textContent=fmt(filtered.filter(r=>r[$('dnaType').value||'y']).length);const start=page*PAGE,subset=filtered.slice(start,start+PAGE);$('range').textContent=count?`${fmt(start+1)}–${fmt(Math.min(start+PAGE,count))} من ${fmt(count)}`:'لا توجد نتائج';$('records').innerHTML=subset.map((r,i)=>`<article class="record-item"><button type="button" class="record record-expand" aria-expanded="false" data-idx="${start+i}"><div><strong>${fmt(start+i+1)}. ${esc(r.name||r.id)}</strong><span>الدولة: ${esc(r.country||'دولة غير محددة')} · ${esc(r.site||'موقع غير محدد')}</span><small>${esc(r.ageText||'تأريخ غير محدد')} · ${esc(r.match||'')}</small></div><span class="record-right"><span class="y">${esc(r[$('dnaType').value||'y']||'قراءة غير متوفرة')}</span><span class="record-hint">عرض التفاصيل والدراسات ←</span></span></button><div class="record-study">${studyUrl(r)?`<a href="${esc(studyUrl(r))}" target="_blank" rel="noopener noreferrer">فتح الدراسة ↗</a>`:'الدراسة: غير متوفر'}</div><div class="inline-detail" hidden></div></article>`).join('')||'<div class="record">لا توجد سجلات تطابق هذه الفلاتر.</div>';$('pageLabel').textContent=`${fmt(page+1)} / ${fmt(Math.max(1,Math.ceil(count/PAGE)))}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE>=count;renderMap()
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
      if (!group) { group = { count: 0, lat: 0, lng: 0, sample: r, country: true, countryOnly: true, records: [] }; groups.set(key, group); }
      group.records.push(r);
      group.count++;
      group.lat += Number(r.lat);
      group.lng += Number(r.lng);
      if (r.locationType === 'site') group.country = false;
      if (r.locationType !== 'country') group.countryOnly = false;
    }
    const visible = [];
    for (const g of groups.values()) {
      const lat = g.lat / g.count, lng = g.lng / g.count;
      if (map.getBounds().pad(.25).contains([lat, lng])) visible.push({ ...g, lat, lng });
    }
    if(pendingGroup){
      const target=pendingGroup;pendingGroup=null;
      const chosen=[...groups.values()].find(g=>{const p=map.project([target.lat,target.lng],target.zoom);const gp=map.project([g.lat/g.count,g.lng/g.count],target.zoom);return Math.floor(p.x/cellSize)===Math.floor(gp.x/cellSize)&&Math.floor(p.y/cellSize)===Math.floor(gp.y/cellSize)});
      if(chosen){selectedGroup={lat:target.lat,lng:target.lng,zoom:target.zoom};mapSelectionRecords=new Set(chosen.records);filtered=filtered.filter(r=>mapSelectionRecords.has(r));page=0;queueMicrotask(()=>{render();$('mapSelectionTitle').textContent='عينات الموقع المشارك';$('mapSelectionBody').textContent='النتائج المعروضة تخص النقطة المختارة على الخريطة.';$('mapSelection').hidden=false;});}
    }
    visible.sort((a,b) => b.count-a.count);
    for (const g of visible.slice(0, 1400)) {
      const color = !g.country ? '#86AFC1' : g.countryOnly ? '#CE735B' : '#B08A56';
      const marker = L.circleMarker([g.lat,g.lng], {
        radius: g.count > 1 ? Math.min(19, 6 + Math.log2(g.count) * 1.6) : 5,
        weight: 1.5, color:'#0B1018', fillColor:color, fillOpacity:.86, renderer:canvasRenderer
      });
      // Stable map selection: do not open a transient Leaflet popup or auto-zoom.
      marker.on('click', () => selectMapGroup(g));
      marker.addTo(layer);
    }
    $('mapNote').textContent = 'تغطي الخريطة ' + fmt(points.length) + ' سجلًا بإحداثيات، مجمّعة في ' + fmt(groups.size) + ' مجموعة حسب مستوى التكبير. الأحمر الطيني: الدولة معلومة فقط. الذهبي: مدينة تقريبية. الأزرق: موقع أثري. لا تمثل النقاط قبورًا مؤكدة.';
  }
  function selectMapGroup(group) {
    selectedGroup={lat:group.lat,lng:group.lng,zoom:map.getZoom()};sharedIds=group.records.map(r=>r.id);mapSelectionRecords=new Set(group.records);
    const panel=$('mapSelection');
    $('mapSelectionTitle').textContent=group.count===1?'عينة محددة على الخريطة':'مجموعة من '+fmt(group.count)+' عينات على الخريطة';
    const groupSiteCount=window.LXAtlasSites.summarize(group.records).sites.length;
    $('mapSelectionBody').innerHTML=
      '<p class="smallnote">عدد السجلات المرتبطة بالنقطة: <strong>'+fmt(group.count)+'</strong>. تم حصر قائمة نتائج البحث في هذه المجموعة؛ اضغط على أي عينة لقراءة بياناتها ودراساتها.</p>'+
      '<p class="smallnote"><span>عدد المواقع:</span> <strong>'+fmt(groupSiteCount)+'</strong></p>'+
      '<p class="smallnote">تنبيه: قد تضم الدائرة مواقع متقاربة جُمعت بصريًا وفق مستوى تكبير الخريطة، وليست بالضرورة موقعًا أثريًا واحدًا.</p>'+
'<button type="button" id="clearMapGroup" class="btn ghost">إظهار جميع النتائج من جديد</button>';
    panel.hidden=false;
    $('clearMapGroup').addEventListener('click',clearMapGroup);

    filter();
    if(group.count===1)selectRecord(group.sample,null,false);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clearMapGroup() {
    mapSelectionRecords=null;selectedGroup=null;sharedIds=null;
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
  function rootOptions(type){const groups=type==='mt'?['L','L0','L1','L2','L3','L4','L5','L6','M','N','R','H','U','J','T','K','V','W','X','I','A','B','C','D','E','F','G','Z']:[...new Set(all.map(r=>r.yRoot))];$('root').replaceChildren(new Option('🌿 الفروع: الكل',''));opt('root',groups);$('root').previousElementSibling.textContent=type==='mt'?'🌿 فرع mtDNA':'🌿 سلالة Y-DNA';$('mutation').previousElementSibling.textContent='🧬 '+(type==='mt'?'mtDNA':'Y-DNA');$('ycount').nextElementSibling.textContent='بقراءة '+(type==='mt'?'mtDNA':'Y-DNA');}
  async function switchDNA(){const type=$('dnaType').value||'y',token=++mutationToken;treeIndex=null;mutationResolved=null;$('root').value='';$('mutation').value='';$('mutationStatus').textContent='جارٍ تحميل المشجرة…';try{const index=await window.LXPhylogeny.ready(type);if(token!==mutationToken)return;treeIndex=index;rootOptions(type);$('mutationStatus').textContent='🌿 اختر التحور ثم ابحث';filter();}catch(e){if(token===mutationToken)$('mutationStatus').textContent='تعذر تحميل المشجرة: '+e.message;}}
  async function load() {
    try {
      $('loading').textContent='جارٍ تحميل نسخة البيانات والمشجرة…';
      const type=initialShare.get('dna')==='mt'?'mt':'y';$('dnaType').value=type;
      const [data,index]=await Promise.all([window.LXResearchData.load(),window.LXPhylogeny.ready(type)]);manifest=data.manifest;all=data.records;treeIndex=index;
      try{const sr=await fetch('/data/atlas/spatial-classifications.json');if(sr.ok){const parsed=await sr.json();if(parsed&&typeof parsed.records==='object'&&!Array.isArray(parsed.records))spatialAnnotations=parsed.records;}}catch(e){console.warn('تعذر تحميل التصنيف المكاني',e)}
      rootOptions(type);opt('country',[...new Set(all.map(r=>r.country))]);$('loading').style.display='none';document.dispatchEvent(new Event('lx-atlas-data-loaded'));initMap();restoreShare()
    }
    catch(e) {
      $('loading').textContent='خطأ في تحميل البيانات: '+e.message+' — أعد المحاولة لاحقًا.';console.error(e)
    }
}
  // Text queries are committed deliberately, so pauses while typing do not consume the guest allowance.
  const qApply=document.createElement('button');qApply.type='button';qApply.className='btn ghost';qApply.textContent='بحث';qApply.setAttribute('aria-label','تنفيذ البحث بالنص');$('q').after(qApply);
  qApply.addEventListener('click',filter);$('q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();filter();}});
  const mutationMode=document.createElement('select');mutationMode.id='mutationMode';mutationMode.setAttribute('aria-label','طريقة مطابقة التحور');mutationMode.innerHTML='<option value="descendants">التحور وفروعه المتحدرة</option><option value="exact">التحور المكتوب نفسه</option>';
  const modeLabel=document.createElement('label');modeLabel.htmlFor='mutationMode';modeLabel.textContent='طريقة مطابقة التحور';$('mutationStatus').after(modeLabel,mutationMode);
  const mutationApply=document.createElement('button');mutationApply.type='button';mutationApply.className='btn ghost';mutationApply.textContent='بحث التحور';mutationMode.after(mutationApply);
  const coverageNote=document.createElement('p');coverageNote.className='smallnote';mutationApply.after(coverageNote);
  document.addEventListener('lx-atlas-data-loaded',()=>{coverageNote.textContent='🗄 '+manifest.snapshot+' · 👤 '+manifest.knownIndividuals+' معرّف فرد مثبت · '+manifest.unreconciledIdentities+' سجلًا بهوية غير موحدة. الأعداد من معالجتنا وليست إحصاءً رسميًا للمصدر.';});
  const applyMutation=()=>{
    const value=$('mutation').value.trim(),token=++mutationToken;
    mutationResolved=null;mapSelectionRecords=null;selectedGroup=null;sharedIds=null;$('mapSelection').hidden=true;
    clearTimeout(timer);
    if(!value){$('mutationStatus').textContent='يشمل التحور وجميع فروعه المتحدرة عند توفر المشجرة.';filter();return;}
    $('mutationStatus').textContent='جارٍ التحقق من التحور وفروعه في المشجرات…';
    // Fail closed while resolving a mutation: do not show unrelated records.
    timer=setTimeout(async()=>{
      try{
        if(!treeIndex)throw Error('تعذر تشغيل فهرس التحورات.');
        const scopedValue=$('dnaType').value==='y'&&$('root').value&&$('root').value!=='Other'&&!/^[A-T](?:\d+[A-Z0-9]*)?-/i.test(value)?$('root').value+'-'+value:value;
        const result=treeIndex.query(scopedValue,mutationMode.value);
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
    mapSelectionRecords=null;selectedGroup=null;sharedIds=null;$('mapSelection').hidden=true;
    clearTimeout(timer);if(id==='dnaType'){switchDNA();return;}if(id==='root'&&$('mutation').value.trim())applyMutation();else timer=setTimeout(filter,0)
  }));$('withCoordinatesOnly').addEventListener('click',()=>{const button=$('withCoordinatesOnly');button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));mapSelectionRecords=null;selectedGroup=null;sharedIds=null;$('mapSelection').hidden=true;filter()});$('recenter').addEventListener('click',filter);$('reset').addEventListener('click',()=> {
    sharedRecordId='';pendingSharedRecord='';pendingSharedPage=0;history.replaceState(null,'',location.pathname);fields.filter(id=>id!=='dnaType').forEach(id=>$(id).value='');$('withCoordinatesOnly').setAttribute('aria-pressed','false');$('mutation').value='';mutationToken++;mutationResolved=null;$('mutationStatus').textContent='يشمل التحور وجميع فروعه المتحدرة عند توفر المشجرة.';mapSelectionRecords=null;selectedGroup=null;sharedIds=null;$('mapSelection').hidden=true;filter()
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
