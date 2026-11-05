const $=id=>document.getElementById(id),refs=$('predictorRefs'),target=$('predictorTarget'),run=$('predictorRun'),status=$('predictorResultStatus'),outcome=$('predictorOutcome'),detail=$('predictorDetail');
let worker,lastResult;
const show=(text,mode='notice')=>{status.textContent=text;status.dataset.state=mode;};
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function clearResult(){lastResult=null;$('predictorSource').textContent='';$('predictorWarnings').textContent='';outcome.textContent='';detail.textContent='';$('predictorAlternatives').replaceChildren();$('predictorPath').replaceChildren();$('predictorExport').disabled=true;}
function stop(){worker?.terminate();worker=null;run.disabled=false;$('predictorCancel').hidden=true;}
$('predictorFile').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 clearResult();if(f.size>5*1024*1024){show('الملف أكبر من 5MB؛ لم يُقرأ.','error');return;}
 try{refs.value=await f.text();show('قُرئ المرجع داخل المتصفح.');}catch{show('تعذر فتح الملف.','error');}
});
for(const id of ['predictorRefs','predictorTarget','predictorAncestor','predictorPanel','predictorLayout','predictorTree','predictorKit'])$(id).addEventListener('input',()=>{if(run.disabled){stop();show('توقف التحليل لتغير المدخلات؛ شغّله من جديد.');}clearResult();});
$('predictorCancel').onclick=()=>{stop();clearResult();show('أُلغي التحليل.');};
$('predictorClear').onclick=()=>{stop();clearResult();target.value='';refs.value='';$('predictorFile').value='';$('predictorKit').value='';$('predictorAncestor').value='';show('مُسحت المدخلات والنتائج من الأداة.');};
$('predictorTemplate').onclick=()=>download({schemaVersion:1,source:{title:'',url:'https://',version:'',date:'YYYY-MM-DD'},records:[{kitId:'',haplogroup:'',snpVerified:false,markers:{DYS393:13,DYS390:24}}]},'LXDNA-reference-template.json');
$('predictorExport').onclick=()=>{if(lastResult)download({...lastResult,exportedAt:new Date().toISOString()},'LXDNA-STR-review.json');};
run.addEventListener('click',()=>{
 clearResult();if(target.value.length>100000||refs.value.length>5*1024*1024){show('حجم الإدخال أكبر من الحد المدعوم.','error');return;}
 run.disabled=true;$('predictorCancel').hidden=false;show('جارٍ قراءة الإدخال وتحميل المشجرة العامة والمقارنة محليًا…');
 worker??=new Worker('/assets/lxdna-predictor-worker.js');
 worker.onerror=()=>{stop();show('تعذر تشغيل التحليل؛ تحقق من الاتصال لتحميل المشجرة العامة ثم أعد المحاولة.','error');};
 worker.onmessage=({data})=>{
  run.disabled=false;$('predictorCancel').hidden=true;
  if(!data.ok){show(data.error,'error');return;}
  const r=data.result;lastResult=r;$('predictorExport').disabled=false;
  const labels={candidate:'مرشح للمراجعة',limited:'دعم محدود',unresolved:'غير محسوم'};
  outcome.textContent=(r.proposedHaplogroup||'لا يوجد فرع مرجح')+' · '+labels[r.supportLevel];
  show(`${r.input.format} · ${r.input.loci} موضعًا / ${r.input.slots} قراءة · ${r.referenceKits} مرجعًا مقبولًا · ${r.referenceCompared||0} قابلًا للمقارنة. ${r.commonAncestor?'السلف المشترك لأقرب النتائج: '+r.commonAncestor+'. ':''}درجة الدعم ليست نسبة دقة.`);
  $('predictorSource').textContent=`المصدر المصرّح به: ${r.source.title} · ${r.source.version} · ${r.source.date}. ${r.provenanceNotice}`;
  $('predictorWarnings').textContent=[r.reviewNote,...r.input.warnings,...r.warnings, ...(r.excludedCount?[r.excludedCount+' سجلًا مستبعدًا أو غير صالح؛ راجع تفاصيل المقارنة.']:[])].join(' · ');
  const table=document.createElement('table'),head=document.createElement('thead');
  const tr=document.createElement('tr');for(const label of ['الفرع','عدد أقرب المراجع','متوسط فرق التكرارات','المواضع المشتركة']){const th=document.createElement('th');th.textContent=label;tr.append(th);}head.append(tr);table.append(head);
  const body=document.createElement('tbody');for(const a of r.alternatives){const row=document.createElement('tr');for(const value of [a.branch,a.kits,a.distance,a.overlap]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}table.append(body);$('predictorAlternatives').append(table);
  for(const node of r.treePath){const a=document.createElement('a');a.textContent=node;a.dir='ltr';a.href='/lxdnatree/?dna=y&mutation='+encodeURIComponent(node);a.target='_blank';a.rel='noopener noreferrer';$('predictorPath').append(a);}
  detail.textContent=JSON.stringify(r,null,2);
 };
 worker.postMessage({text:target.value,references:refs.value,ancestor:$('predictorAncestor').value,panel:$('predictorPanel').value,layout:$('predictorLayout').value,tree:$('predictorTree').value,kitId:$('predictorKit').value});
});
