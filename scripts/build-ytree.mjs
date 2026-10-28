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
const mtMeta=JSON.parse(fs.readFileSync('public/data/phylogeny/mt-source.json'));
const mtResponse=await fetch(`https://raw.githubusercontent.com/YFullTeam/MTree/${mtMeta.sourceCommit}/${mtMeta.sourcePath}`);
if(!mtResponse.ok)throw Error('MTree source HTTP '+mtResponse.status);
const mtRaw=Buffer.from(await mtResponse.arrayBuffer());
if(crypto.createHash('sha256').update(mtRaw).digest('hex')!==mtMeta.sourceSHA256)throw Error('MTree checksum mismatch');
count=0;const mtTree=clean(JSON.parse(mtRaw));if(count!==mtMeta.nodes)throw Error('MTree node count mismatch');
fs.writeFileSync('public/data/phylogeny/mtree.json',JSON.stringify(mtTree));
await import('./build-research-data.mjs');
const {spawnSync}=await import('node:child_process');
const mtBuild=spawnSync('python3',['scripts/build-mt-database.py'],{stdio:'inherit'});if(mtBuild.status!==0)throw Error('mt database validation failed');

for(const [command,args] of [[process.execPath,['tests/mt-research.cjs']],['python3',['tests/mt-sqlite.py']]]){const check=spawnSync(command,args,{stdio:'inherit'});if(check.status!==0)throw Error('mt regression checks failed');}
