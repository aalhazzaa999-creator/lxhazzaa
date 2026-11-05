import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const code=await fs.readFile('functions/_middleware.js','utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const call=(path,next=async()=>new Response('ok'))=>onRequest({request:new Request('https://example.invalid'+path),next});
for(const p of ['/.env','/.env.local','/.git/config','/assets/app.js.map'])assert.equal((await call(p,()=>{throw Error('must not serve')})).status,404);
for(const p of ['/','/lxhuman/','/lxdnatree/','/assets/atlas.js']){const r=await call(p);assert.equal(r.status,200);assert.equal(await r.text(),'ok');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert(r.headers.get('Content-Security-Policy').includes("frame-ancestors 'self'"));}
assert.equal((await call('/api/control-session')).headers.get('Cache-Control'),'no-store');
const protectedResponse=await call('/lxdnacontrole/workspace/',async()=>new Response(null,{status:302,headers:{Location:'/lxdnacontrole/','Set-Cookie':'test=1; HttpOnly','Cache-Control':'private, no-store'}}));
assert.equal(protectedResponse.status,302);assert.equal(protectedResponse.headers.get('Location'),'/lxdnacontrole/');assert.equal(protectedResponse.headers.get('Set-Cookie'),'test=1; HttpOnly');assert.equal(protectedResponse.headers.get('Cache-Control'),'private, no-store');
console.log('Passed: artifact rejection, public pages, headers, API caching and preservation of auth redirects/cookies.');
