/* LXHAZZAA Y-DNA descendant search. Optional, loaded only when a mutation is entered. */
(()=>{'use strict';
 const norm=s=>String(s||'').trim().toUpperCase().replace(/^[A-Z0-9]+-(?=[A-Z]+[0-9])/,'').replace(/\s+/g,'');
 const index=new Map();const trees=[];let loading=null;
 function add(key,node){key=norm(key);if(!key)return;let arr=index.get(key);if(!arr){arr=[];index.set(key,arr)}if(!arr.includes(node))arr.push(node)}
 function addYFull(root){
  const stack=[[root,null]];
  while(stack.length){const [item,parent]=stack.pop();if(!item||typeof item!=='object')continue;
   const node={parent,children:[],name:String(item.id||'')};if(parent)parent.children.push(node);trees.push(node);
   add(item.id,node);
   for(const part of String(item.snps||'').split(',')){for(const alias of part.trim().split('/'))add(alias.replace(/\s.*$/,''),node)}
   for(const child of (Array.isArray(item.children)?item.children:[]))stack.push([child,node]);
  }
 }
 function addFTDNA(tree){
  const nodes=tree&&tree.allNodes;if(!nodes||typeof nodes!=='object')throw Error('تنسيق FTDNA غير مدعوم');
  const lookup=new Map();
  for(const [id,v] of Object.entries(nodes)){if(!v||typeof v!=='object')continue;lookup.set(String(id),{parent:null,children:[],name:String(v.name||'')})}
  for(const [id,v] of Object.entries(nodes)){const n=lookup.get(String(id));if(!n)continue;const p=lookup.get(String(v.parentId));if(p){n.parent=p;p.children.push(n)}trees.push(n);add(v.name,n);for(const a of v.variants||[])if(a&&a.variant)add(a.variant,n)}
 }
 async function getJSON(url){const c=new AbortController(),timeout=setTimeout(()=>c.abort(),25000);
  try{const r=await fetch(url,{signal:c.signal,mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timeout)}
 }
 async function ready(){
  if(loading)return loading;
  loading=(async()=>{
   const sources=[];
   const jobs=[
    ['YFull', 'https://raw.githubusercontent.com/YFullTeam/YTree/master/current_tree.json',addYFull],
    ['FamilyTreeDNA','https://www.familytreedna.com/public/y-dna-haplotree/get',addFTDNA]
   ];
   for(const [name,url,fn] of jobs){try{fn(await getJSON(url));sources.push(name)}catch(e){console.warn('LXHAZZAA Y-DNA source unavailable:',name,e)}}
   if(!sources.length)throw Error('تعذر تحميل المشجرات الجينية. جرّب لاحقًا.');
   return sources;
  })().catch(e=>{loading=null;throw e});
  return loading;
 }
 async function resolve(input){
  const sources=await ready(),key=norm(input),found=index.get(key)||[];
  if(!found.length)return {known:false,aliases:new Set(),sources};
  const aliases=new Set(),nodes=new Set(),stack=[...found];
  while(stack.length){const n=stack.pop();if(nodes.has(n))continue;nodes.add(n);for(const child of n.children)stack.push(child)}
  for(const [alias,matching] of index){if(matching.some(n=>nodes.has(n)))aliases.add(alias)}
  return {known:true,aliases,sources};
 }
 window.LXYdna={resolve,norm};
})();