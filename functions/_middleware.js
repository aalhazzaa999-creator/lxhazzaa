// Cloudflare Pages _headers does not cover Function-generated responses.
export async function onRequest(context){
 const path=new URL(context.request.url).pathname;
 // Development artifacts must never be served by the production site.
 if(/(?:^|\/)\.(?:git|env)(?:[./]|$)/i.test(path)||/\.map$/i.test(path)){
  return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 const response=await context.next();
 const headers=new Headers(response.headers);
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('X-Frame-Options','SAMEORIGIN');
 headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 // Add only restrictions safe for existing external scripts, login and maps.
 if(!headers.has('Content-Security-Policy'))headers.set('Content-Security-Policy',"frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
 if(path.startsWith('/api/'))headers.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
