/* Private input stays in this worker. Only public, same-origin tree snapshots are fetched. */
importScripts('/assets/phylogeny-core.js');
let topology;
async function json(path){const r=await fetch(path);if(!r.ok)throw Error('تعذر تحميل المشجرة HTTP '+r.status);return r.json();}
async function trees(){
 if(!topology)topology=(async()=>{
  const [meta,foreign]=await Promise.all([json('/data/phylogeny/source.json'),json('/data/phylogeny/ftdna-reference.json')]);
  const raw=await json('/data/phylogeny/ytree.json?v='+meta.sourceSHA256);
  return self.LXPhylogenyCore.build(raw,{type:'y',meta,foreign,crosswalk:{entries:foreign.crosswalk}});
 })().catch(e=>{topology=null;throw e;});
 return topology;
}
self.onmessage=async({data})=>{
 try{
  const [{predictYSTR},{bindReferences},{parseSTR},index]=await Promise.all([import('./lxdna-predictor.mjs?v=1.2.1'),import('./lxdna-str-topology.mjs'),import('./lxdna-str-input.mjs'),trees()]);
  const parsed=parseSTR(data.text,{panel:data.panel,layout:data.layout});
  if(data.kitId)parsed.target.kitId=data.kitId.trim();
  const bundle=JSON.parse(data.references),source=bundle?.source,rows=bundle?.records;
  if(bundle?.schemaVersion!==1||!source||!Array.isArray(rows))throw Error('المرجع يحتاج source وrecords؛ استخدم قالب المرجع');
  if(!source.title||!source.version||!/^https:\/\//.test(source.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(source.date||''))throw Error('أكمل عنوان المرجع ورابط HTTPS والإصدار وتاريخ المصدر YYYY-MM-DD');
  if(!rows.length||rows.length>10000)throw Error('المرجع يقبل من 1 إلى 10000 سجل');
  const active=data.tree==='ftdna'?index.foreign:index;
  const invalid=[],referenceWarnings=[],clean=[];
  for(const r of rows){try{
   const input=parseSTR(JSON.stringify({markers:r.markers}));clean.push({...r,markers:input.target.markers});
   referenceWarnings.push(...input.warnings.map(reason=>({kitId:r.kitId,reason})));
  }catch(e){invalid.push({kitId:r?.kitId,reason:e.message});}}
  const bound=bindReferences(clean,active,data.ancestor.trim());
  const result=predictYSTR({target:parsed.target,references:bound.references,knownAncestor:bound.knownAncestor});
  const alternatives=new Map();
  for(const r of result.neighbors){const label=r.path.at(-1);const a=alternatives.get(label)||{branch:label,kits:0,distance:r.distance,overlap:r.overlap};a.kits++;alternatives.set(label,a);}
  const labels=result.neighbors.map(r=>r.path.at(-1));
  const common=active.commonAncestor(labels).node;
  const path=result.proposedHaplogroup?active.ancestors(result.proposedHaplogroup).reverse().filter(n=>n!==active.tree).map(n=>n.id):[];
  self.postMessage({ok:true,result:{...result,source,tree:data.tree,treeSource:data.tree==='ftdna'?index.foreignMeta:index.meta,
   input:{format:parsed.format,loci:parsed.loci,slots:parsed.slots,warnings:parsed.warnings},
   referenceWarnings:referenceWarnings.slice(0,100),referenceInput:rows.length,excludedCount:bound.excluded.length+invalid.length,excluded:[...bound.excluded,...invalid].slice(0,100),
   alternatives:[...alternatives.values()],commonAncestor:common?.id||null,treePath:path,knownAncestor:bound.knownAncestor,
   reviewNote:result.status==='unresolved'?'لم تتوفر أدلة كافية لاقتراح فرع؛ راجع عدد المواضع المشتركة والمراجع المقبولة وأي تأكيد SNP موجود للعينة.':'اقتراح مبني على تشابه STR ضمن المراجع المدخلة، ويحتاج تأكيدًا بفحص SNP.',
   provenanceNotice:'بيانات المصدر وتأكيد SNP مقدمة من مستورد المرجع؛ لم تتحقق المنصة مستقلًا من صحتها.'}});
 }catch(e){self.postMessage({ok:false,error:e.message});}
};
