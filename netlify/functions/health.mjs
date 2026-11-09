export default async () => new Response(JSON.stringify({service:'lxhazzaa',status:'ok',dataset:'public-static-snapshot',authentication:'not-configured',database:'schema-prepared-not-connected'}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export const config={path:'/api/health'};
