/* Shared Y/mt topology. No sequence inference or text-prefix ancestry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXPhylogenyCore=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';
const clean=v=>String(v??'').trim().replace(/\s+/g,'').toUpperCase();
const prefix=v=>/^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-/i.exec(String(v||'').trim())?.[1]?.toUpperCase()||'';
function key(v,type='y'){let s=clean(v);if(type==='y')s=s.replace(/^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-/,'').replace(/\((H|T)\)$/,'');return s;}
function callState(v,type='y'){
 const s=clean(v);if(!s||/^(N\/?A|NONE|UNKNOWN|NOT|UNASSIGNED)|TOOFEW|NOTPOSSIBLE|UNDETERMINED/.test(s))return 'unavailable';
 if(s.includes('?'))return 'uncertain';
 if(!/^[A-Z0-9_'*+.,;()\/:-]+$/.test(s))return 'unresolved';
 if(type==='y'&&!/^[A-T]/.test(s))return 'unresolved';
 return 'reported';
}
function major(v){const s=clean(v);return ['BT','CT','DE','CF','IJ','NO'].includes(s)?s:/^[A-T]/.exec(s)?.[0]||'';}
function build(raw,{type='y',meta={},crosswalk={}}={}){
 const nodes=[],byId=new Map(),aliases=new Map();let clock=0;
 function add(k,n){if(!k)return;let a=aliases.get(k);if(!a)aliases.set(k,a=[]);if(!a.includes(n))a.push(n);}
 function visit(item,parent){
  const n={id:item.id||`${type.toUpperCase()}-ROOT`,parent,children:[],tin:clock++,tout:0,ftdna:[],type};nodes.push(n);byId.set(clean(n.id),n);add(key(n.id,type),n);
  // mt substitutions recur on independent branches; search mt haplogroup names only.
  if(type==='y')for(const token of String(item.snps||'').split(/[,/]/)){if(!token.includes('!'))add(key(token,type),n);}
  n.children=(item.children||[]).map(c=>visit(c,n));n.tout=clock;return n;
 }
 const tree=visit(raw,null);const within=(n,a)=>!!n&&!!a&&n.tin>=a.tin&&n.tin<a.tout;
 for(const x of crosswalk.entries||[]){const n=byId.get(clean(x.yfull));if(!n||x.status!=='shared-marker')continue;n.ftdna.push(x);add(key(x.ftdna,type),n);}
 const cache=new Map();
 function find(label,hint=''){
  const k=key(label,type);const cacheKey=k+'|'+hint; if(cache.has(cacheKey))return cache.get(cacheKey);
  const state=callState(label,type);let result;
  if(state!=='reported')result={status:state,node:null,original:String(label||'')};
  else{
   const direct=byId.get(clean(label));let candidates=direct?[direct]:[...(aliases.get(k)||[])];
   if(!candidates.length&&/[,;]/.test(k)){
    const sets=k.split(/[,;]/).map(part=>aliases.get(key(part,type))||[]);
    if(sets.every(s=>s.length===1)&&sets.every(s=>s[0]===sets[0][0]))candidates=[sets[0][0]];
   }
   const scope=type==='y'?(prefix(label)||hint):'';
   const scopeNode=scope&&(byId.get(clean(scope))||null);
   if(scopeNode&&!direct)candidates=candidates.filter(n=>within(n,scopeNode));
   if(candidates.length===1)result={status:'resolved',node:candidates[0],original:String(label||''),basal:k.endsWith('*')};
   else result={status:candidates.length?'ambiguous':'unplaced',node:null,original:String(label||'')};
  }
  cache.set(cacheKey,result);return result;
 }
 function explain(label,input,{mode='descendants',hint=''}={}){
  const q=typeof input==='string'?find(input):input;const r=find(label,hint);
  if(!q.node){const matched=callState(label,type)==='reported'&&key(label,type)===key(q.original,type);return {matched,reason:matched?'direct-unplaced':q.status,placement:r};}
  if(!r.node)return {matched:false,reason:r.status,placement:r};
  const matched=mode==='exact'?r.node===q.node:within(r.node,q.node);
  return {matched,reason:matched?(r.node===q.node?(key(label,type)===key(q.original,type)?'direct':'equivalent-marker'):'descendant'):'outside',placement:r};
 }
 function query(input,mode='descendants'){
  const q=find(input);const unavailable=['unavailable','uncertain','unresolved'].includes(q.status);
  return {known:!unavailable,exact:mode==='exact',fallback:!q.node,ambiguous:q.status==='ambiguous',reason:unavailable?'اسم غير محسوم أو غير صالح للربط المؤكد.':!q.node?'لم يُحسم موضع الاسم في المرجع؛ المعروض مطابقات الاسم المباشرة فقط.':'',sources:[meta.source||'YFull'],version:meta.version,node:q.node,status:q.status,
   matches:(label,hint)=>!unavailable&&explain(label,q,{mode,hint}).matched,
   explain:(label,hint)=>explain(label,q,{mode,hint})};
 }
 function ancestors(label){let n=find(label).node;const path=[];while(n){path.push(n);n=n.parent;}return path;}
 function commonAncestor(labels){if(!labels.length)return {status:'empty',node:null};const paths=labels.map(ancestors);if(paths.some(p=>!p.length))return {status:'unplaced',node:null,unplaced:labels.filter((_,i)=>!paths[i].length)};const node=paths[0].find(n=>paths.every(p=>p.includes(n)));return {status:node?'resolved':'disconnected',node:node||null};}
 return {type,tree,nodes,byId,meta,find,query,within,explain,ancestors,commonAncestor,group:(label,group,hint)=>{if(!group)return true;const g=find(group),r=find(label,hint);return g.node?!!r.node&&within(r.node,g.node):false;}};
}
return {build,key,callState,major,clean};
});
