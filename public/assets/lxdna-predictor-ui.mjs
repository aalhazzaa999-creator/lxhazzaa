import {sampleReady} from './lxdna-sample-account.mjs';
import {importProjectCSV,selectTargetCSV} from './lxdna-csv.mjs';
import {parseSTR} from './lxdna-str-input.mjs';
const $=id=>document.getElementById(id),refs=$('predictorRefs'),target=$('predictorTarget'),run=$('predictorRun'),status=$('predictorResultStatus'),outcome=$('predictorOutcome'),detail=$('predictorDetail');
let worker,lastResult;
let projectReferenceOwner='',projectReferenceLoading=false;
async function loadProjectReferences(){
 const auth=window.LXAuth,user=auth?.getUser();if(auth?.getRole()!=='owner'||!user||projectReferenceLoading)return;
 projectReferenceLoading=true;const uid=user.id;
 try{
  const {data,error}=await auth.client.from('lx_dna_project_reference').select('payload').eq('snp_confirmed',true).gte('marker_loci',12).order('kit_id').range(0,999);
  if(error)throw Error('تعذر تحميل مرجع المشاريع الخاص');if(window.LXAuth.getUser()?.id!==uid||window.LXAuth.getRole()!=='owner')return;
  const records=(data||[]).map(({payload:r})=>({kitId:r.kitId,haplogroup:r.haplogroup,snpVerified:r.snpVerified,markers:r.markers}));
  if(!records.length)throw Error('لا توجد مراجع مؤكدة ذات 12 موضعًا مقروءًا على الأقل');
  const source={title:'المشاريع الستة المصرح بها — تأكيد SNP الأخضر في FTDNA',url:'https://www.familytreedna.com/public/Alarab?iframe=ydna-results-overview',version:'ftdna-projects-20261109-v1',date:'2026-11-09'};
  refs.value=JSON.stringify({schemaVersion:1,source,records});fillSource(source);$('predictorTree').value='ftdna';projectReferenceOwner=uid;
  show('حُمّل '+records.length+' مرجعًا مؤكدًا من المشاريع المصرّح بها. الماركرات المتاحة جزئية بسبب قص PDF، والنتائج تقديرية وتحتاج تدقيقًا.');
 }catch(e){show(e.message,'error');}finally{projectReferenceLoading=false;}
}
$('loadProjectReferences').onclick=loadProjectReferences;
$('projectLookupRun').onclick=async()=>{const kit=$('projectKitLookup').value.trim();$('projectLookupResult').textContent='';if(!kit||window.LXAuth?.getRole()!=='owner')return;const uid=window.LXAuth.getUser()?.id;const {data,error}=await window.LXAuth.client.from('lx_dna_project_reference').select('payload').eq('kit_id',kit).maybeSingle();if(window.LXAuth.getUser()?.id!==uid)return;$('projectLookupResult').textContent=error?'تعذر قراءة السجل الخاص':data?JSON.stringify(data.payload,null,2):'لا توجد عينة بهذا الرقم في الملفات المستوردة';};
function refreshProjectReferences(){if(!window.LXAuth?.getUser()||window.LXAuth?.getRole()!=='owner'){if(projectReferenceOwner){stop();clearResult();refs.value='';projectReferenceOwner='';}$('projectLookupResult').textContent='';return;}if(!refs.value&&!projectReferenceLoading)loadProjectReferences();}
document.addEventListener('lx-auth-change',refreshProjectReferences);window.addEventListener('load',refreshProjectReferences);
function controlView(id){
 for(const name of ['predictorLab','referenceManager'])$(name).hidden=name!==id;
 for(const button of document.querySelectorAll('.workspace-switcher button[data-control-view]')){const active=button.dataset.controlView===id;button.setAttribute('aria-pressed',String(active));button.classList.toggle('secondary',!active);}
 if(id==='referenceManager')$('referenceManagerTitle').focus();else $('predictorRun').focus();
}
for(const link of document.querySelectorAll('[data-control-view]'))link.addEventListener('click',e=>{e.preventDefault();controlView(link.dataset.controlView);});

function inputMode(paste){
 $('predictorFileArea').hidden=paste;$('predictorPasteArea').hidden=!paste;
 for(const [id,active] of [['predictorFileMode',!paste],['predictorPasteMode',paste]]){const b=$(id);b.setAttribute('aria-pressed',String(active));b.classList.toggle('secondary',!active);}
 if(paste)target.focus();
}
$('predictorFileMode').onclick=()=>inputMode(false);$('predictorPasteMode').onclick=()=>inputMode(true);
$('predictorPanel').addEventListener('change',()=>{$('predictorLayoutLabel').hidden=$('predictorPanel').value==='named';});
function sourceFields(){return {title:$('referenceTitle').value.trim(),url:$('referenceUrl').value.trim(),version:$('referenceVersion').value.trim(),date:$('referenceDate').value};}
function fillSource(source={}){for(const [id,key] of [['referenceTitle','title'],['referenceUrl','url'],['referenceVersion','version'],['referenceDate','date']])$(id).value=source[key]||'';}
for(const id of ['referenceTitle','referenceUrl','referenceVersion','referenceDate'])$(id).addEventListener('input',()=>{
 stop();clearResult();try{const bundle=JSON.parse(refs.value);bundle.source=sourceFields();refs.value=JSON.stringify(bundle,null,2);}catch{}
});
const show=(text,mode='notice')=>{status.textContent=text;status.dataset.state=mode;};
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function clearResult(){lastResult=null;$('predictorSource').textContent='';$('predictorWarnings').textContent='';outcome.textContent='';detail.textContent='';$('predictorAlternatives').replaceChildren();$('predictorPath').replaceChildren();$('predictorExport').disabled=true;$('predictorExport').hidden=true;}
function stop(){worker?.terminate();worker=null;run.disabled=false;$('predictorCancel').hidden=true;}
$('predictorFile').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 stop();clearResult();if(f.size>5*1024*1024){refs.value='';show('الملف أكبر من 5MB؛ لم يُقرأ.','error');return;}
 try{const text=await f.text();if(/\.(csv|tsv)$/i.test(f.name)){const source=sourceFields();if(Object.values(source).some(v=>!v))throw Error('أكمل اسم المرجع ورابطه وإصداره وتاريخه ثم اختر الجدول مجددًا');const records=importProjectCSV(text);refs.value=JSON.stringify({schemaVersion:1,source,records},null,2);show('استوردت '+records.length+' عينة. لا يدخل مرجع المقارنة إلا صف يحمل snpVerified=true بعد تدقيق الدليل.');}else{const bundle=JSON.parse(text);if(!Array.isArray(bundle.records)||!bundle.source)throw Error('ملف المرجع يحتاج سجلات وبيانات مصدر؛ راجع القالب');refs.value=text;fillSource(bundle.source);show('قُرئ المرجع محليًا؛ بيانات مصدره تصريحات تحتاج تدقيقًا.');}}catch(e){refs.value='';show(e.message||'تعذر فتح الملف.','error');}
});
$('predictorTargetFile').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;stop();clearResult();
 target.value='';$('targetPreview').hidden=true;$('targetPreviewText').textContent='';if(f.size>100000){show('ملف الفرد يتجاوز 100KB؛ اختر صف العينة فقط.','error');return;}
 try{const text=await f.text();const row=/\.json$/i.test(f.name)?parseSTR(text).target:selectTargetCSV(text,$('predictorKit').value);if(row.kitId&&$('predictorKit').value.trim()&&row.kitId!==$('predictorKit').value.trim())throw Error('رقم العينة في الملف يختلف عن الرقم المدخل؛ راجع الرقم والملف');target.value=JSON.stringify(row);$('targetPreviewText').textContent=JSON.stringify(row,null,2);$('targetPreview').hidden=false;$('predictorPanel').value='named';$('predictorLayoutLabel').hidden=true;if(row.kitId)$('predictorKit').value=row.kitId;show('قُرئت عينة واحدة محليًا؛ راجع رقمها وقيمها قبل التحليل.');}catch(e){show(e.message,'error');}
});
for(const id of ['predictorRefs','predictorTarget','predictorAncestor','predictorPanel','predictorLayout','predictorTree','predictorKit'])$(id).addEventListener('input',()=>{if(run.disabled){stop();show('توقف التحليل لتغير المدخلات؛ شغّله من جديد.');}clearResult();if(id==='predictorTarget'){$('targetPreview').hidden=true;}if(id==='predictorKit'&&!$('targetPreview').hidden){target.value='';$('targetPreview').hidden=true;$('predictorTargetFile').value='';show('تغير رقم العينة؛ أعد اختيار ملفها لضمان مطابقة القيم للرقم.');}});
$('predictorCancel').onclick=()=>{stop();clearResult();show('أُلغي التحليل.');};
$('predictorClear').onclick=()=>{stop();clearResult();target.value='';$('targetPreview').hidden=true;$('targetPreviewText').textContent='';$('predictorTargetFile').value='';$('predictorKit').value='';$('predictorAncestor').value='';show('جاهز لعينة جديدة؛ احتُفظ بمرجع المقارنة.');};
$('predictorTemplate').onclick=()=>download({schemaVersion:1,source:{title:'',url:'https://',version:'',date:'YYYY-MM-DD'},records:[{kitId:'',haplogroup:'',snpVerified:false,markers:{DYS393:13,DYS390:24}}]},'LXDNA-reference-template.json');
$('predictorExport').onclick=()=>{if(lastResult)download({...lastResult,exportedAt:new Date().toISOString()},'LXDNA-STR-review.json');};
run.addEventListener('click',()=>{
 if(!sampleReady())return;
 clearResult();if(!target.value.trim()){show('أضف ملف النتيجة أو الصق قيم STR أولًا.','error');return;}if(!refs.value.trim()){show('التنبؤ غير متاح لهذه الجلسة: لم يُجهّز مرجع المقارنة المعتمد بعد. لم تُحفظ أو تُنشر عينة.','error');return;}if(target.value.length>100000||refs.value.length>5*1024*1024){show('حجم الإدخال أكبر من الحد المدعوم.','error');return;}
 run.disabled=true;$('predictorCancel').hidden=false;show('جارٍ قراءة الإدخال وتحميل المشجرة العامة والمقارنة محليًا…');
 worker??=new Worker('/assets/lxdna-predictor-worker.js?v=str-neighbors-1.2.1');
 worker.onerror=()=>{stop();show('تعذر تشغيل التحليل؛ تحقق من الاتصال لتحميل المشجرة العامة ثم أعد المحاولة.','error');};
 worker.onmessage=({data})=>{
  run.disabled=false;$('predictorCancel').hidden=true;
  if(!data.ok){show(data.error,'error');return;}
  const r=data.result;lastResult=r;$('predictorExport').disabled=false;$('predictorExport').hidden=false;
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
 document.dispatchEvent(new CustomEvent('lx-dna-result',{detail:r}));
 };
 let text=target.value;try{if(!text.trim().startsWith('{')&&/kit(?:id| number)?|sample.?id|marker[,;\t]|locus[,;\t]/i.test(text.split(/\r?\n/)[0]))text=JSON.stringify(selectTargetCSV(text,$('predictorKit').value));}catch(e){stop();show(e.message,'error');return;}
 worker.postMessage({text,references:refs.value,ancestor:$('predictorAncestor').value,panel:$('predictorPanel').value,layout:$('predictorLayout').value,tree:$('predictorTree').value,kitId:$('predictorKit').value});
});

