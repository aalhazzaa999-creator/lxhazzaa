import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';
const lock=JSON.parse(fs.readFileSync('reference-sources/ftdna-source.json'));const archive=fs.readFileSync(lock.archive);
if(crypto.createHash('sha256').update(archive).digest('hex')!==lock.archiveSHA256)throw Error('FTDNA archive checksum mismatch');
const raw=zlib.gunzipSync(archive);if(crypto.createHash('sha256').update(raw).digest('hex')!==lock.normalizedSHA256)throw Error('FTDNA normalized checksum mismatch');
const source=JSON.parse(raw);if(source.rows.length!==lock.nodeCount||new Set(source.rows.map(n=>n[0])).size!==source.rows.length)throw Error('FTDNA node count mismatch');
fs.writeFileSync('public/data/phylogeny/ftdna-reference.json',raw);fs.writeFileSync('public/data/phylogeny/ftdna-aliases.json',JSON.stringify({source:source.metadata,entries:source.crosswalk}));console.log('Validated offline FTDNA topology',source.rows.length);
