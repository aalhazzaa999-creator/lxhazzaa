import fs from 'node:fs';
import crypto from 'node:crypto';
const meta=JSON.parse(fs.readFileSync('public/data/phylogeny/source.json'));
const response=await fetch('https://raw.githubusercontent.com/YFullTeam/YTree/bdc9bb4d8db72abc7658362f258dbc2a63e34789/current_tree.json');
if(!response.ok)throw Error('YFull source HTTP '+response.status);
const raw=Buffer.from(await response.arrayBuffer());
if(crypto.createHash('sha256').update(raw).digest('hex')!==meta.sourceSHA256)throw Error('YFull checksum mismatch');
let count=0;
function clean(n){count++;return {id:n.id||'Y-ROOT',snps:n.snps||'',children:(n.children||[]).map(clean)}}
const tree=clean(JSON.parse(raw));if(count!==meta.nodes)throw Error('Node count mismatch');
fs.writeFileSync('public/data/phylogeny/ytree.json',JSON.stringify(tree));
console.log('Prepared local YFull tree:',count,'nodes; version',meta.version);
