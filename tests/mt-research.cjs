const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../public/assets/phylogeny-core.js');
const read=p=>JSON.parse(fs.readFileSync(p));
const meta=read('public/data/phylogeny/mt-source.json'),db=read('public/data/phylogeny/mt-database/manifest.json');
const mt=Core.build(read('public/data/phylogeny/mtree.json'),{type:'mt',meta});
const data=read('public/data/research/manifest.json'),records=data.parts.flatMap(p=>read('public/data/research/'+p));
assert.equal(mt.nodes.length,39865);assert.equal(db.nodeCount,mt.nodes.length);assert.equal(db.edgeCount,db.nodeCount-1);assert.equal(db.sampleSnapshot,data.snapshot);
assert.equal(mt.query('H1').matches('H10'),false,'H1 is not a text-prefix match of H10');
assert(mt.query('H').matches('H1'));assert(mt.query('h1').matches('H1'));assert(!mt.query('H1').matches('R-V88'));
assert(!mt.query('H1').matches('H1?'),'Uncertain calls must not be confirmed automatically');
const lca=mt.commonAncestor(['H1','H3']);assert(lca.node);assert(mt.within(mt.find('H1').node,lca.node));assert(mt.within(mt.find('H3').node,lca.node));
assert.equal(mt.commonAncestor(['H1','MADE-UP-NODE']).status,'unplaced');
assert.equal(mt.commonAncestor(['H1','H1']).node.id,'H1');
for(const n of mt.nodes){assert(n.tin<n.tout);if(n.parent)assert(mt.within(n,n.parent));}
assert.equal(records.length,27264);assert.equal(new Set(records.map(r=>r.id)).size,27264);
assert(records.every(r=>r.recordType==='ancient'&&r.personId===null),'No living people or invented identities');
const mtRecords=records.filter(r=>r.mt),placed=mtRecords.filter(r=>mt.find(r.mt).node);
assert.equal(mtRecords.length,db.sampleCount);assert.equal(placed.length,db.placedSamples);
assert(placed.some(r=>r.sexGroup==='M'));assert(placed.some(r=>r.sexGroup==='F'));assert(placed.some(r=>r.sexGroup==='U'));
const originalManifest=read('public/data/atlas/manifest.json'),originalById=new Map(originalManifest.parts.flatMap(p=>read('public/data/atlas/'+p)).map(r=>[r.id,r]));
for(const row of records){assert.equal(row.original.sex,readOriginalSex(row.id));assert.equal(row.original.mt,originalById.get(row.id).mt||'');}
function readOriginalSex(id){return originalById.get(id)?.sex||''}
// Compatibility: legacy Y resolver remains independent of the new mt engine.
const recurrence=Core.build({id:'L',children:[{id:'H1',snps:'A123G'},{id:'H10',snps:'A123G'}]},{type:'mt'});assert(!recurrence.find('A123G').node,'A repeated mt event must not become a haplogroup synonym');
const manifestNodes=read('public/data/phylogeny/mt-database/nodes.json');assert.equal(new Set(manifestNodes.rows.map(n=>n.id)).size,db.nodeCount);
console.log(JSON.stringify({status:'passed',nodes:mt.nodes.length,records:mtRecords.length,resolved:placed.length,unresolved:db.unplacedSamples,commonAncestorH1H3:lca.node.id,male:placed.filter(r=>r.sexGroup==='M').length,female:placed.filter(r=>r.sexGroup==='F').length,unknown:placed.filter(r=>r.sexGroup==='U').length}));
