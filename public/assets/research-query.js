/* Shared, side-effect-free record selection used by atlas, Y and mt. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXResearchQuery=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';const lower=v=>String(v||'').toLocaleLowerCase();
function select(records,options,index){const {type='y',query='',mode='descendants',root='',sex='',quality='',placement='',ageMinBP='',ageMaxBP='',text='',auto=false,recordType=''}=options;const call=r=>type==='mt'?r.mt:r.y;
 let input=String(query||'').trim();if(type==='y'&&root&&root!=='Other'&&input&&!/^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-/i.test(input))input=root+'-'+input;
 const resolved=input?index.query(input,mode):null;const branch=!!resolved?.node||!!resolved?.foreignNode;
 const names=auto&&input&&!branch?new Set(records.filter(r=>[r.id,r.sampleId,r.geneticId,r.individualId,r.displayName,r.name].some(s=>lower(s).includes(lower(query))))):new Set();
 const byName=names.size>0,decisions=new Map(),placements=new Map(),selected=[];
 for(const r of records){if(recordType&&r.recordType!==recordType||sex&&r.sexGroup!==sex||quality&&(r.quality?.status||'unknown')!==quality)continue;
  if(root&&(root==='Other'?r.yRoot!=='Other':!index.group(call(r),root,r.yRoot)))continue;
  if(ageMinBP!==''&&(r.ageBP===null||r.ageBP===undefined||r.ageBP<Number(ageMinBP)))continue;if(ageMaxBP!==''&&(r.ageBP===null||r.ageBP===undefined||r.ageBP>Number(ageMaxBP)))continue;
  if(text&&![r.id,r.name,r.site,r.country,r.y,r.mt,r.geneticId,r.individualId].some(v=>lower(v).includes(lower(text))))continue;
  const p=index.placement?index.placement(call(r),r.yRoot):index.find(call(r),r.yRoot);
  if(placement==='resolved'&&(!p.node||p.terminalUnresolved)||placement==='unplaced'&&p.node&&!p.terminalUnresolved||placement==='supported'&&p.status!=='ancestor-supported')continue;
  let decision={matched:true,reason:p.status,placement:p};
  if(input){if(byName){if(!names.has(r))continue;decision={...decision,reason:'sample-name'};}else{decision=resolved.explain(call(r),r.yRoot);if(!decision.matched)continue;}}
  selected.push(r);decisions.set(r.id,decision);placements.set(r.id,p);
 }
 const knownPeople=new Set(selected.map(r=>r.personId).filter(Boolean));return {records:selected,decisions,placements,resolved,byName,counts:{records:selected.length,knownIndividuals:knownPeople.size,unreconciledIdentities:selected.filter(r=>!r.personId).length,resolved:selected.filter(r=>placements.get(r.id).node&&!placements.get(r.id).terminalUnresolved).length,supported:selected.filter(r=>placements.get(r.id).status==='ancestor-supported').length,unplaced:selected.filter(r=>!placements.get(r.id).node).length}};
}
function exportRecord(r,decision,type){return {sampleId:r.id,displayName:r.displayName||r.name||r.id,recordType:r.recordType,personId:r.personId,identityStatus:r.identityStatus,reportedCall:type==='mt'?r.mt:r.y,originalCall:type==='mt'?r.original?.mt:r.original?.y,sexOriginal:r.original?.sex,sexGroup:r.sexGroup,placementStatus:decision?.placement?.status||null,canonicalNode:decision?.placement?.terminalUnresolved?null:decision?.placement?.node?.id||null,supportedAncestor:decision?.placement?.terminalUnresolved?decision.placement.node?.id:null,matchingReason:decision?.reason,quality:r.quality,dateEvidence:r.dateEvidence,provenance:r.provenance?.[type==='mt'?'mt':'y'],doi:r.doi,reference:r.reference,publications:r.publications||[],flags:r.dataFlags||[]};}
return {select,exportRecord};
});
