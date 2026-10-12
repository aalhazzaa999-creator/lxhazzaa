/* LXHAZZAA: source-separated Y-DNA tree resolver. Ambiguity fails closed. */
(()=>{'use strict';
 const norm=value=>{
   let s=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
   s=s.replace(/^[A-T]-/,'').replace(/\((?:H|T)\)$/,'');
   return /^[A-Z]{1,8}[0-9]{1,12}$/.test(s)?s:'';
 };
 const explicitRoot=value=>{const m=/^([A-T])-/i.exec(String(value||'').trim());return m?m[1].toUpperCase():null};
 const sources=[],sourceErrors=[];let loading=null;
 function makeSource(name){return {name,nodes:[],byAlias:new Map()}}
 function addAlias(src,node,label){
   const key=norm(label);if(!key)return;
   node.aliases.add(key);let matches=src.byAlias.get(key);
   if(!matches){matches=new Set();src.byAlias.set(key,matches)}matches.add(node);
 }
 function makeNode(src,id,parent){
   const n={id:String(id||''),parent,children:[],aliases:new Set(),root:null};
   if(parent)parent.children.push(n);src.nodes.push(n);addAlias(src,n,id);return n;
 }
 function rootFor(node){
   let n=node;while(n){
     const m=/^([A-T])(?:-|$)/i.exec(n.id);
     if(m)return m[1].toUpperCase();
     n=n.parent;
   }
   return null;
 }
 function finalize(src){
   for(const node of src.nodes)node.root=rootFor(node);
   sources.push(src);
 }
 function addYFull(tree){
   if(!tree||typeof tree!=='object'||!Array.isArray(tree.children))throw Error('YFull tree format invalid');
   const src=makeSource('YFull'),stack=[[tree,null]];
   while(stack.length){
     const [item,parent]=stack.pop();
     const n=makeNode(src,item.id,parent);
     for(const variant of String(item.snps||'').split(',')){
       const part=variant.trim();
       if(!part||part.includes('!'))continue;
       for(const alias of part.split('/'))addAlias(src,n,alias);
     }
     for(const child of item.children||[])stack.push([child,n]);
   }
   finalize(src);
 }
 function addFTDNA(tree){
   if(!tree||!tree.allNodes||typeof tree.allNodes!=='object')throw Error('FTDNA tree format invalid');
   const src=makeSource('FamilyTreeDNA'),nodes=new Map();
   for(const [id,item] of Object.entries(tree.allNodes)){
     if(!item||typeof item!=='object')continue;
     nodes.set(id,makeNode(src,item.name,null));
   }
   for(const [id,item] of Object.entries(tree.allNodes)){
     const node=nodes.get(id);if(!node)continue;
     const parent=nodes.get(String(item.parentId));
     if(parent&&parent!==node){node.parent=parent;parent.children.push(node)}
     for(const variant of item.variants||[])if(variant&&variant.variant)addAlias(src,node,variant.variant);
   }
   finalize(src);
 }
 async function getJSON(url){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
   try{const response=await fetch(url,{signal:controller.signal,mode:'cors'});
     if(!response.ok)throw Error('HTTP '+response.status);return await response.json();
   }finally{clearTimeout(timeout)}
 }
 async function ready(){
   if(loading)return loading;
   loading=(async()=>{
     const jobs=[
       ['YFull','https://raw.githubusercontent.com/YFullTeam/YTree/master/current_tree.json',addYFull],
       ['FamilyTreeDNA','https://www.familytreedna.com/public/y-dna-haplotree/get',addFTDNA]
     ];
     for(const [name,url,parse] of jobs){
       try{parse(await getJSON(url))}
       catch(e){sourceErrors.push(name+': '+e.message);console.warn('Y-DNA source unavailable',name,e)}
     }
     if(!sources.length)throw Error('تعذر تحميل أي مشجرة جينية');
     return sources.map(s=>s.name);
   })().catch(e=>{loading=null;throw e});
   return loading;
 }
 function isDescendant(node,ancestor){
   let n=node;while(n){if(n===ancestor)return true;n=n.parent}return false;
 }
 function sourceQuery(src,key,root){
   const hits=[...(src.byAlias.get(key)||[])].filter(n=>n.root===root);
   if(!hits.length)return null;
   // Different independent nodes sharing the same SNP label are not synonyms.
   const unique=hits.filter(n=>!hits.some(other=>other!==n&&isDescendant(n,other)));
   if(unique.length!==1)return {ambiguous:true};
   return {ancestor:unique[0]};
 }
 async function resolve(input){
   const loaded=await ready(),key=norm(input),wantedRoot=explicitRoot(input);
   if(!key)return {known:false,reason:'اسم التحور غير صالح',sources:loaded,matches:()=>false};
   const possible=new Set();
   for(const src of sources)for(const n of src.byAlias.get(key)||[])if(n.root)possible.add(n.root);
   if(wantedRoot&&!possible.has(wantedRoot))return {known:false,reason:'التحور غير موجود تحت السلالة المختارة',sources:loaded,matches:()=>false};
   if(!wantedRoot&&possible.size>1)return {known:false,ambiguous:true,reason:'التحور مسجل في أكثر من سلالة؛ اكتب اسم السلالة معه',sources:loaded,matches:()=>false};
   const root=wantedRoot||[...possible][0];
   if(!root)return {known:false,reason:'التحور غير موجود في المشجرات المتاحة',sources:loaded,matches:()=>false};
   const queries=[];
   for(const src of sources){
     const q=sourceQuery(src,key,root);
     if(q&&q.ambiguous)return {known:false,ambiguous:true,reason:'تعارض في موضع التحور داخل المشجرة',sources:loaded,matches:()=>false};
     if(q)queries.push({src,ancestor:q.ancestor});
   }
   if(!queries.length)return {known:false,reason:'لا توجد علاقة شجرية موثقة لهذا التحور',sources:loaded,matches:()=>false};
   const matches=(recordLabel,recordRoot)=>{
     if(String(recordRoot||'').toUpperCase()!==root)return false;
     const raw=String(recordLabel||'').trim();
     const recordKey=norm(raw);
     if(!recordKey)return false;
     const declared=explicitRoot(raw);
     if(declared&&declared!==root)return false;
     let positive=false;
     for(const {src,ancestor} of queries){
       const nodes=[...(src.byAlias.get(recordKey)||[])].filter(n=>n.root===root);
       if(!nodes.length)continue;
       // Reject if this label refers to any independent node outside the query branch.
       if(nodes.some(n=>!isDescendant(n,ancestor)))return false;
       if(nodes.some(n=>isDescendant(n,ancestor)))positive=true;
     }
     return positive;
   };
   return {known:true,root,sources:loaded,partial:sourceErrors.length>0,matches};
 }
 window.LXYdna={resolve,norm};
})();