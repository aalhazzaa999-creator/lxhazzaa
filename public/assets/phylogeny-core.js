/* Shared Y/mt topology. No sequence inference or text-prefix ancestry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LXPhylogenyCore=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';
const clean=v=>String(v??'').trim().replace(/\s+/g,'').toUpperCase();
const prefix=v=>/^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-/i.exec(String(v||'').trim())?.[1]?.toUpperCase()||'';
function key(v,type='y'){let s=clean(v);if(type==='y')s=s.replace(/^([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-/,'').replace(/\((H|T)\)$/,'');return s;}
function callState(v,type='y'){
 const s=clean(v),letters=s.replace(/[^A-Z]/g,'');
 if(!s||/^(N\/?A|NONE|UNKNOWN|UNASSIGNED)$/.test(s)||/TOOFEW|NOTPOSSIBLE|UNDETERMINED/.test(letters))return 'unavailable';
 if(s.includes('?'))return 'uncertain';
 if(!/^[A-Z0-9_'*+.,;()\/:-]+$/.test(s))return 'unresolved';
 if(type==='y'){
  const parts=s.split(/[,;]/);
  if(!parts.every(p=>/^[A-T](?:[0-9A-Z']*)?\*?$/.test(p)||/^(BT|CT|DE|CF|IJ|NO)\*?$/.test(p)||/^(?:([A-T](?:\d+[A-Z0-9]*)?|BT|CT|DE|CF|IJ|NO)-)?[A-Z]{1,12}\d[A-Z0-9_.]*(?:\((?:H|T)\))?\*?$/.test(p)))return 'unresolved';
 }
 return 'reported';
}
function major(v){const s=clean(v);if(/^A00(?:-|$)/.test(s))return 'A00';return ['BT','CT','DE','CF','IJ','NO'].includes(s)?s:/^([A-T])(?:\d|-|$)/.exec(s)?.[1]||'';}
function build(raw,{type='y',meta={},crosswalk={},foreign=null}={}){
 const nodes=[],byId=new Map(),aliases=new Map();let clock=0;
 function add(k,n){if(!k)return;let a=aliases.get(k);if(!a)aliases.set(k,a=[]);if(!a.includes(n))a.push(n);}
 function visit(item,parent){
  const n={id:item.label||item.id||`${type.toUpperCase()}-ROOT`,uid:item.id,parent,children:[],tin:clock++,tout:0,ftdna:[],type};n.root=major(n.id)||parent?.root||'';nodes.push(n);const nk=clean(n.id);byId.set(nk,byId.has(nk)?null:n);add(key(n.id,type),n);for(const alias of item.aliases||[])add(key(alias,type),n);
  // mt substitutions recur on independent branches; search mt haplogroup names only.
  if(type==='y')for(const token of String(item.snps||'').split(/[,/]/)){if(!token.includes('!'))add(key(token,type),n);}
  n.children=(item.children||[]).map(c=>visit(c,n));n.tout=clock;return n;
 }
 const tree=visit(raw,null);const within=(n,a)=>!!n&&!!a&&n.tin>=a.tin&&n.tin<a.tout;
 for(const x of crosswalk.entries||[]){const n=byId.get(clean(x.yfull));if(!n||x.status!=='shared-marker')continue;n.ftdna.push(x);add(key(x.ftdna,type),n);}
 const cache=new Map();
 function find(label,hint=''){
  const k=key(label,type);const cacheKey=clean(label)+'|'+(type==='y'?hint:''); if(cache.has(cacheKey))return cache.get(cacheKey);
  const state=byId.get(clean(label))?'reported':callState(label,type);let result;
  if(state!=='reported')result={status:state,node:null,original:String(label||'')};
  else{
   const direct=byId.get(clean(label));let candidates=direct?[direct]:[...(aliases.get(k)||[])];
   if(!candidates.length&&/[,;]/.test(k)){
    const sets=k.split(/[,;]/).map(part=>aliases.get(key(part,type))||[]);
    if(sets.every(s=>s.length===1)&&sets.every(s=>s[0]===sets[0][0]))candidates=[sets[0][0]];
   }
   const scope=type==='y'?(prefix(label)||hint):'';
   const scopeNode=scope&&(byId.get(clean(scope))||byId.get(major(scope))||null);
   if(scope&&!direct)candidates=candidates.filter(n=>scopeNode?within(n,scopeNode):n.root===major(scope));
   if(candidates.length===1)result={status:'resolved',node:candidates[0],original:String(label||''),basal:k.endsWith('*')};
   else result={status:candidates.length?'ambiguous':'unplaced',node:null,original:String(label||'')};
  }
  cache.set(cacheKey,result);return result;
 }
 function explain(label,input,{mode='descendants',hint=''}={}){
  const q=typeof input==='string'?find(input):input;const r=find(label,hint);
  if(!q.node){const declared=prefix(label)||hint,wanted=prefix(q.original);const matched=callState(label,type)==='reported'&&key(label,type)===key(q.original,type)&&(!wanted||!!declared&&major(wanted)===major(declared));return {matched,reason:matched?'direct-unplaced':q.status,placement:r};}
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
 const api={type,tree,nodes,byId,meta,find,query,within,explain,ancestors,commonAncestor,group:(label,group,hint)=>{if(!group)return true;const g=find(group),r=find(label,hint);return g.node?!!r.node&&within(r.node,g.node):false;}};
 if(type==='y'&&foreign)attachForeign(api,foreign);
 return api;
}
function attachForeign(primary,snapshot){
 const rawNodes=new Map(snapshot.rows.map(r=>[r[0],{id:'ftdna:'+r[0],label:r[2],aliases:[],children:[]}]));
 for(const [alias,ids] of snapshot.aliases||[])for(const id of ids)rawNodes.get(id)?.aliases.push(alias);
 const roots=[];for(const [id,parent] of snapshot.rows){const n=rawNodes.get(id);if(parent!==id&&rawNodes.has(parent))rawNodes.get(parent).children.push(n);else roots.push(n);}
 const ft=build({id:'FTDNA-Y-ROOT',children:roots},{type:'y',meta:{source:'FamilyTreeDNA',version:snapshot.metadata.sourceVersion}});
 if(ft.nodes.length!==snapshot.rows.length+1)throw Error('Invalid FTDNA graph');
 primary.foreign=ft;primary.foreignMeta=snapshot.metadata;
 const placementCache=new Map();
 primary.placement=(label,hint='')=>{
  const cacheKey=clean(label)+'|'+hint;if(placementCache.has(cacheKey))return placementCache.get(cacheKey);
  const p=primary.find(label,hint);if(p.node||p.status!=='unplaced'){placementCache.set(cacheKey,p);return p;}
  const f=ft.find(label,hint);let anchor=null,conflict=false;
  if(f.node)for(let n=f.node;n&&n!==ft.tree;n=n.parent){const shared=primary.find(n.id);if(shared.node){if(!anchor)anchor=shared.node;else if(!primary.within(anchor,shared.node))conflict=true;}}
  const result=anchor&&!conflict?{...p,node:anchor,status:'ancestor-supported',foreignNode:f.node,terminalUnresolved:true,source:snapshot.metadata.sourceVersion}:p;
  placementCache.set(cacheKey,result);return result;
 };
 const baseQuery=primary.query;
 primary.query=(input,mode='descendants')=>{
  const q=baseQuery(input,mode),fq=ft.query(input,mode);
  if(q.node){
   const baseExplain=q.explain;q.explain=(label,hint)=>{const e=baseExplain(label,hint);if(e.matched||e.placement.node||mode==='exact')return e;const p=primary.placement(label,hint);if(p.status==='ancestor-supported'&&primary.within(p.node,q.node))return {matched:true,reason:'foreign-supported-ancestor',placement:p};return e;};q.matches=(label,hint)=>q.explain(label,hint).matched;
  }else if(fq.node){
   q.known=true;q.fallback=false;q.foreignNode=fq.node;q.reference='FTDNA';q.sources=['FamilyTreeDNA'];q.version=snapshot.metadata.sourceVersion;q.reason='موضع FTDNA؛ الموضع التفصيلي في YFull غير محسوم، ولا يُعامل كاسم مكافئ لفرع أوسع.';
   q.explain=(label,hint)=>{const e=fq.explain(label,hint);return {...e,reason:e.matched?'foreign-branch':e.reason,placement:primary.placement(label,hint)};};q.matches=(label,hint)=>q.explain(label,hint).matched;
  }
  if(!q.node&&!fq.node&&fq.ambiguous){q.ambiguous=true;q.reason='الاسم مسجل في أكثر من موضع؛ اكتب السلالة معه مثل R-F3867. المعروض مطابقات الاسم فقط.';}
  return q;
 };
 primary.group=(label,group,hint)=>{if(!group)return true;const g=primary.find(group),r=primary.placement(label,hint);return !!g.node&&!!r.node&&primary.within(r.node,g.node);};
}
return {build,key,callState,major,clean};
});
