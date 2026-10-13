const BASE='https://qzmuolixptmcmfbepjmv.supabase.co/rest/v1/rpc/';
const KEY='sb_publishable_Pejyw0VQAdeDeJBvBVLPRQ_oH2Xw7H1';
const NAMES=new Set(['home','remains','documents']);
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
async function rpc(name,body){
 const r=await fetch(BASE+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw new Error('Visit database unavailable');
 return r.json();
}
async function totals(){
 const rows=await rpc('lx_visit_totals',{});
 return Object.fromEntries(rows.map(row=>[row.platform,Number(row.visits)]));
}
export async function onRequestGet(){
 try{return json(await totals());}catch{return json({error:'unavailable'},503);}
}
export async function onRequestPost({request}){
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'forbidden'},403);
 let platform;
 try{({platform}=await request.json());}catch{return json({error:'invalid'},400);}
 if(!NAMES.has(platform))return json({error:'invalid'},400);
 const name=`lx_visit_${platform}`;
 const already=new RegExp(`(?:^|;\\s*)${name}=1(?:;|$)`).test(request.headers.get('Cookie')||'');
 try{
  if(!already)await rpc('lx_record_visit',{p_platform:platform});
  return json(await totals(),200,already?{}:{'Set-Cookie':`${name}=1; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax`});
 }catch{return json({error:'unavailable'},503);}
}
