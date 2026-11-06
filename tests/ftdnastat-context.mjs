import test from 'node:test';import assert from 'node:assert/strict';
import {compareBranch,prepareOfficialSnapshot} from '../scripts/import-ftdnastat-context.mjs';
import Core from '../public/assets/phylogeny-core.js';
const index=Core.build({id:'Y-ROOT',children:[{id:'R-M207',children:[{id:'R-V88',children:[{id:'R-PF6287'}]}]},{id:'J-M172'}]});
const record=chain=>({k:'y',name:'R-PF6287',chain:chain.map(n=>[n,null,null])});
test('Accept exact official names, ancestry and direct parent',()=>assert.equal(compareBranch(record(['R-M207','R-V88','R-PF6287']),index).status,'matched-pinned-ftdna'));
test('Hold conflicting, collapsed and incomplete source paths',()=>{
 assert.equal(compareBranch(record(['J-M172','R-PF6287']),index).status,'conflicting-ancestry');
 assert.equal(compareBranch(record(['R-M207','R-PF6287']),index).status,'different-direct-parent');
 assert.equal(compareBranch(record(['R-M207','R-V88']),index).status,'collapsed-or-mismatched-source-chain');
 assert.equal(compareBranch(record(['R-V88','R-V88','R-PF6287']),index).status,'duplicate-ancestor');
});
test('Reject same SNP token on a different major lineage and unknown ancestors',()=>{
 assert.equal(compareBranch({...record(['R-V88']),name:'Q-V88'},index).status,'collapsed-or-mismatched-source-chain');
 assert.equal(compareBranch(record(['R-UNKNOWN','R-PF6287']),index).status,'ancestor-not-in-pinned-source');
});
const node=(name,parentId,kitsCount,countryCounts)=>({name,parentId,kitsCount,countryCounts});
test('Official subtree counts exclude unknown origins and include descendants once',()=>{
 const raw=Buffer.from(JSON.stringify({id:1,publishedDate:'2026-11-05',allNodes:{1:node('R-M207',0,3,[{countryCode:'SA',name:'Saudi Arabia',kitsCounts:1},{countryCode:'X',name:'Unknown Origin',kitsCounts:2}]),2:node('R-V88',1,2,[{countryCode:'SA',name:'Saudi Arabia',kitsCounts:2}]),3:node('R-PF6287',2,0,null)}}));
 const d=prepareOfficialSnapshot(raw,['R-V88']);assert.deepEqual(d.rows.map(r=>[r[2],r[3]]),[['R-M207',3],['R-V88',2]]);assert.equal(d.metadata.sourceSHA256.length,64);assert(!JSON.stringify(d).includes('countryCode'));
});
test('Reject malformed source counts and cyclic official graph',()=>{
 const raw=d=>Buffer.from(JSON.stringify({id:1,publishedDate:'2026-11-05',allNodes:d}));
 assert.throws(()=>prepareOfficialSnapshot(raw({1:node('R-V88',0,-1,[])}),['R-V88']),/counts/);
 assert.throws(()=>prepareOfficialSnapshot(raw({1:node('R-V88',2,0,null),2:node('R-M207',1,0,null)}),['R-V88']),/graph/);
});

test('Missing official country counts are not silently treated as zero',()=>{
 const raw=Buffer.from(JSON.stringify({id:1,publishedDate:'2026-11-05',allNodes:{1:node('R-M207',0,0,null),2:node('R-V88',1,1,null)}}));
 const d=prepareOfficialSnapshot(raw,['R-V88']);assert(d.rows.every(r=>r[3]===null));
});
