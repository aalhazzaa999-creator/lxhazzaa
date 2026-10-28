/* One versioned, read-only snapshot shared by atlas and tree. */
(()=>{'use strict';let pending;
async function json(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json();}
async function load(){if(!pending)pending=(async()=>{const manifest=await json('/data/research/manifest.json');const parts=await Promise.all(manifest.parts.map(p=>json('/data/research/'+p)));const records=parts.flat();if(records.length!==manifest.total||new Set(records.map(r=>r.id)).size!==records.length||records.some(r=>r.snapshot!==manifest.snapshot))throw Error('فشل التحقق من سلامة نسخة البيانات');return {manifest,records};})().catch(e=>{pending=null;throw e});return pending;}
window.LXResearchData={load};})();
