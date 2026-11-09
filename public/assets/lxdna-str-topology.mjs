/** Rebuild paths from a pinned topology rather than trusting submitted path text. */
export function bindReferences(records,index,knownAncestor='') {
 const scope=knownAncestor?index.find(knownAncestor):null;
 if(scope&&!scope.node)throw Error('التحور المؤكد غير محسوم في المشجرة المختارة؛ اكتب اسمه الكامل أو غيّر المرجع');
 const references=[],excluded=[];
 for(const r of records){
  const terminal=r?.haplogroup||r?.path?.at(-1),found=index.find(terminal);
  if(r?.snpVerified!==true||!found.node){excluded.push({kitId:r?.kitId||'',reason:'SNP غير مؤكد أو فرع غير محسوم في المرجع'});continue;}
  const node=found.node;
  if(r.path&&(!Array.isArray(r.path)||r.path.some(p=>{const a=index.find(p).node;return !a||!index.within(node,a);} ))){excluded.push({kitId:r.kitId,reason:'المسار المرفق يخالف المشجرة المختارة'});continue;}
  const path=index.ancestors(node.id).reverse().filter(n=>n!==index.tree).map(n=>n.id);
  // Filter in the distance engine AFTER duplicate reconciliation, including off-scope copies.
  references.push({...r,path});
 }
 return {references,excluded,knownAncestor:scope?.node.id||null};
}
