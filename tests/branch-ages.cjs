const {test}=require('node:test'),assert=require('node:assert/strict'),Ages=require('../public/assets/branch-ages.js'),Core=require('../public/assets/phylogeny-core.js');
test('preserve published formed, TMRCA and bounds without changing units',()=>{
 assert.deepEqual(Ages.fromSource({formed:28200,tmrca:22800,formedlowage:25900,formedhighage:30500,tmrcalowage:20500,tmrcahighage:25100}),{formed:28200,tmrca:22800,formedRange:[25900,30500],tmrcaRange:[20500,25100],unit:'ybp',method:'published-source-estimate'});
});
test('zero, absent, negative and nonnumeric values are unavailable',()=>{
 for(const value of [0,null,undefined,-1,'100',NaN,Infinity])assert.equal(Ages.fromSource({formed:value,tmrca:value}),null);
 const r=Ages.fromSource({formed:0,tmrca:28200,formedlowage:100,formedhighage:200});assert.equal(r.formed,null);assert.equal(r.formedRange,null);assert.equal(r.tmrca,28200);
});
test('do not invent a confidence range or assign a confidence level',()=>{
 const r=Ages.fromSource({formed:1000,tmrca:500,formedlowage:1100,formedhighage:900,tmrcalowage:0,tmrcahighage:700});assert.equal(r.formedRange,null);assert.equal(r.tmrcaRange,null);assert(!Object.hasOwn(r,'confidenceLevel'));
});
test('node ages remain node-specific and are not inherited by children or basal nodes',()=>{
 const a=Ages.fromSource({formed:28200,tmrca:22800});const tree=Core.build({id:'R',ageEstimate:a,children:[{id:'R*'},{id:'R-M173'}]});assert.deepEqual(tree.find('R').node.ageEstimate,a);assert.equal(tree.find('R*').node.ageEstimate,null);assert.equal(tree.find('R-M173').node.ageEstimate,null);
});
test('optional age fields do not change tree relationships or SNP alias resolution',()=>{
 const tree=Core.build({id:'Y-ROOT',children:[{id:'R-M173',snps:'M173',ageEstimate:Ages.fromSource({formed:28200,tmrca:22800}),children:[{id:'R-M420',snps:'M420'}]}]});assert.equal(tree.find('M173').node.id,'R-M173');assert(tree.query('M173').matches('R-M420'));assert.equal(tree.find('R-M420').node.ageEstimate,null);
});
