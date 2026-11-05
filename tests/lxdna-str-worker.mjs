import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
if(!isMainThread){
 const require=createRequire(import.meta.url);globalThis.self=globalThis;
 globalThis.importScripts=()=>{globalThis.LXPhylogenyCore=require('../public/assets/phylogeny-core.js');};
 globalThis.fetch=async path=>{if(!path.startsWith('/data/phylogeny/'))throw Error('Unexpected network request');return {ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../public'+path.split('?')[0],import.meta.url),'utf8'))};};
 globalThis.postMessage=data=>parentPort.postMessage(data);
 await import('../public/assets/lxdna-predictor-worker.js');
 parentPort.on('message',data=>self.onmessage({data}));
}else{
 const {default:assert}=await import('node:assert/strict'),{ORDER,COPIES}=await import('../public/assets/lxdna-str-input.mjs');
 const markers=Object.fromEntries(ORDER.slice(0,20).map(n=>[n,Array(COPIES[n]||1).fill(n==='DYS389II'?29:13)]));
 const worker=new Worker(fileURLToPath(import.meta.url));
 const send=data=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage(data);});
 try{
  const records=['a','b','c'].map(kitId=>({kitId,haplogroup:'J-M47',snpVerified:true,markers}));
  const input={text:JSON.stringify({markers}),references:JSON.stringify({schemaVersion:1,source:{title:'Synthetic test fixture',url:'https://example.org/synthetic',version:'test',date:'2026-11-05'},records}),ancestor:'M172',panel:'named',layout:'grouped',tree:'yfull',kitId:'a'};
  for(const tree of ['yfull','ftdna']){
   const r=await send({...input,tree});assert.equal(r.ok,true,r.error);assert.equal(r.result.referenceKits,2);assert.equal(r.result.proposedHaplogroup,'J-M47');assert.equal(r.result.probability,null);assert.ok(r.result.treeSource);assert.ok(r.result.treePath.includes(r.result.knownAncestor));assert.equal(r.result.alternatives[0].kits,2);
  }
  const bad=await send({...input,ancestor:'FAKE123'});assert.equal(bad.ok,false);
  const missing=await send({...input,references:'[]'});assert.equal(missing.ok,false);
  console.log('Worker integration passed: real pinned YFull/FTDNA, alias restriction, self-exclusion, provenance and unresolved scope. Synthetic STR profiles only.');
 }finally{await worker.terminate();}
}
