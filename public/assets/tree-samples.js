/* Public sample IDs and evidence states only; no person names or inferred confirmations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXTreeSamples=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 function state(r){
  if(r.recordType==='ancient')return {kind:'ancient',icon:'ancient',label:'رفات قديمة'};
  if(r.resultType==='prediction'||['source_prediction','lx_prediction'].includes(r.verification))return {kind:'predicted',icon:'predicted',label:r.verification==='source_prediction'?'توقع من المصدر — غير مؤكد':r.verification==='lx_prediction'||r.predictionSource==='LX'?'ترجيح متنبئ LX — غير مؤكد':'نتيجة متوقعة — غير مؤكدة'};
  const verified=r.resultType==='confirmed'||['confirmed_bam','confirmed_non_bam'].includes(r.verification);
  if(!verified)return {kind:'unverified',icon:'living',label:'عينة حيّة — التأكيد غير متاح'};
  const developed=/\bBIG[\s-]*Y(?:[\s-]*(?:500|700))?\b|\bWGS\b/i.test(String(r.testType||''))||r.verification==='confirmed_bam';
  return {kind:developed?'developed':'nondeveloped',icon:'living',label:developed?'حيّة · مطوّرة بحسب الفحص المنشور':'حيّة · تحور مؤكد؛ فحص غير مطوّر'};
 }
 function publicId(r){return String(r.sampleId||r.geneticId||r.id||'');}
 function index(records,tree,type,{foreign=false}={}){
  const byNode=new Map(),unplaced=[],seen=new Set();
  for(const r of records){if(!r.id||seen.has(r.id))continue;seen.add(r.id);
   const p=foreign?tree.foreign.find(r[type],r.yRoot):tree.placement?tree.placement(r[type],r.yRoot):tree.find(r[type],r.yRoot);
   if(!p.node){unplaced.push(r);continue;}
   const row={record:r,id:publicId(r),state:state(r),placement:p.status,terminalUnresolved:!!p.terminalUnresolved};
   if(!byNode.has(p.node))byNode.set(p.node,[]);byNode.get(p.node).push(row);
  }
  return {byNode,unplaced};
 }
 const countryAliases={'Saudi Arabia':'SA','Turkey':'TR','Türkiye':'TR','Palestine Occupied':'PS','Palestine':'PS','Iran':'IR','Russia':'RU','Syria':'SY','South Korea':'KR','North Korea':'KP','United States':'US','Unknown':null,'Not specified':null};
 let countries;
 function country(r){const name=String(r.country||'').trim();if(!name)return {code:null,name:'البلد غير مذكور',flag:'🌐'};if(!countries){countries=new Map();if(typeof Intl.DisplayNames==='function'){for(const locale of ['en','ar']){const names=new Intl.DisplayNames([locale],{type:'region'});for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b);if(new Intl.Locale('und-'+code).region!==code||code==='ZZ')continue;const label=names.of(code);if(label!==code)countries.set(label.toLowerCase(),code);}}}for(const [label,code] of Object.entries(countryAliases))countries.set(label.toLowerCase(),code);}
 const code=countries.get(name.toLowerCase())||null;return {code,name,flag:code?Array.from(code,c=>String.fromCodePoint(127397+c.charCodeAt(0))).join(''):'🌐'};}
 return {state,publicId,index,country};
});
