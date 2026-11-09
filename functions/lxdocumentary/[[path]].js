import {authorized} from '../api/documentary-session.js';

export async function onRequest(context){
 const url=new URL(context.request.url);
 if(url.pathname==='/lxdocumentary/'||url.pathname==='/lxdocumentary/index.html'||url.pathname==='/lxdocumentary')return context.next();
 const cookie=context.request.headers.get('Cookie')||'';
 const token=cookie.match(/(?:^|;\s*)lx_docs_token=([^;]+)/)?.[1];
 try{
  if(!await authorized(token))return Response.redirect(`${url.origin}/lxdocumentary/`,302);
 }catch{return new Response('تعذر التحقق من الصلاحية مؤقتًا',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})}
 const response=await context.next();
 const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
