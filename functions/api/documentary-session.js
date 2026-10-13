const SUPABASE_URL='https://qzmuolixptmcmfbepjmv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_Pejyw0VQAdeDeJBvBVLPRQ_oH2Xw7H1';
const ALLOWED=new Set(['verified_researcher','scientific_moderator','admin','owner']);

export async function authorized(token){
 if(!token||token.length>4096||!/^[A-Za-z0-9_.-]+$/.test(token))return false;
 const headers={apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};
 const user=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers,cache:'no-store'});
 if(!user.ok)return false;
 const identity=await user.json();
 if(!/^[0-9a-f-]{36}$/i.test(identity.id||''))return false;
 const profile=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${identity.id}&select=role`,{headers,cache:'no-store'});
 if(!profile.ok)return false;
 const rows=await profile.json();
 return ALLOWED.has(rows?.[0]?.role);
}

export async function onRequestPost({request}){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 let token;
 try{({token}=await request.json());}catch{return new Response('Bad request',{status:400})}
 try{if(!await authorized(token))return new Response('Forbidden',{status:403});}catch{return new Response('Authorization unavailable',{status:503})}
 return new Response(null,{status:204,headers:{'Set-Cookie':`lx_docs_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/lxdocumentary; Max-Age=3300`,'Cache-Control':'no-store'}});
}

export function onRequestDelete({request}){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 return new Response(null,{status:204,headers:{'Set-Cookie':'lx_docs_token=; HttpOnly; Secure; SameSite=Lax; Path=/lxdocumentary; Max-Age=0','Cache-Control':'no-store'}});
}
