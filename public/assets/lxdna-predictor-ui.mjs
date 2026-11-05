import {predictYSTR,PREDICTOR_VERSION} from "./lxdna-predictor.mjs";
const $=id=>document.getElementById(id);
const refs=$("predictorRefs"),target=$("predictorTarget"),
  run=$("predictorRun"),status=$("predictorResultStatus"),
  outcome=$("predictorOutcome"),detail=$("predictorDetail"),file=$("predictorFile");

function show(text,mode="notice"){
  status.textContent=text;status.dataset.state=mode;
}
file?.addEventListener("change",async()=>{
  const f=file.files?.[0];
  if(!f)return;
  if(f.size>5*1024*1024){show("الملف أكبر من 5MB؛ لم يُقرأ.","error");return;}
  try{refs.value=await f.text();show("قُرئ الملف محليًا. لم تُرسل بيانات إلى الخادم.");}
  catch{show("تعذر فتح الملف.","error");}
});
run?.addEventListener("click",()=>{
  show("جارٍ التحليل محليًا…");
  outcome.textContent="";detail.textContent="";
  try{
    if(target.value.length>100000 || refs.value.length>5*1024*1024)throw Error("حجم بيانات الإدخال غير مقبول");
    const t=JSON.parse(target.value),r=JSON.parse(refs.value);
    if(!Array.isArray(r))throw Error("المراجع يجب أن تكون مصفوفة JSON");
    const ancestor=$("predictorAncestor").value.trim();
    const result=predictYSTR({target:t,references:r,knownAncestor:ancestor||null});
    const labels={candidate:"مرشح مدعوم بالمراجع (غير مؤكد)",limited:"ترجيح محدود (غير مؤكد)",unresolved:"غير محسوم"};
    outcome.textContent=(result.proposedHaplogroup||"لا يوجد فرع مرجح")+" — "+labels[result.supportLevel];
    detail.textContent=JSON.stringify({
      methodology:PREDICTOR_VERSION,
      path:result.proposedPath,
      reason:result.reason,
      status:result.status,
      supportLevel:result.supportLevel,
      probability:result.probability,
      matchedLoci:result.matchedLoci,
      referenceKits:result.referenceKits,
      referenceCompared:result.referenceCompared,
      nearbyReferences:result.neighbors,
      branchAudit:result.audit,
      warnings:result.warnings,
      disclaimer:result.caveat
    },null,2);
    show("تم التحليل داخل المتصفح فقط. النتيجة ليست تأكيد SNP ولا تُحفظ أو تُنشر.",result.status==="predicted"?"success":"notice");
  }catch(e){
    show("تعذر التحليل: "+(e?.message||"خطأ غير معروف"),"error");
  }
});
