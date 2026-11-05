/** Explicit FTDNA panel order; grouped and expanded copies. No numeric coercion. */
export const ORDER = 'DYS393 DYS390 DYS19 DYS391 DYS385 DYS426 DYS388 DYS439 DYS389I DYS392 DYS389II DYS458 DYS459 DYS455 DYS454 DYS447 DYS437 DYS448 DYS449 DYS464 DYS460 Y-GATA-H4 YCAII DYS456 DYS607 DYS576 DYS570 CDY DYS442 DYS438 DYS531 DYS578 DYF395S1 DYS590 DYS537 DYS641 DYS472 DYF406S1 DYS511 DYS425 DYS413 DYS557 DYS594 DYS436 DYS490 DYS534 DYS450 DYS444 DYS481 DYS520 DYS446 DYS617 DYS568 DYS487 DYS572 DYS640 DYS492 DYS565 DYS710 DYS485 DYS632 DYS495 DYS540 DYS714 DYS716 DYS717 DYS505 DYS556 DYS549 DYS589 DYS522 DYS494 DYS533 DYS636 DYS575 DYS638 DYS462 DYS452 DYS445 Y-GATA-A10 DYS463 DYS441 Y-GGAAT-1B07 DYS525 DYS712 DYS593 DYS650 DYS532 DYS715 DYS504 DYS513 DYS561 DYS552 DYS726 DYS635 DYS587 DYS643 DYS497 DYS510 DYS434 DYS461 DYS435'.split(' ');
export const COPIES = {DYS385:2,DYS459:2,DYS464:4,YCAII:2,CDY:2,DYF395S1:2,DYS413:2};
const aliases = new Map(ORDER.map(x=>[x.replace(/[-_\s.]/g,''),x]));
aliases.set('DYS394','DYS19');
export const markerName = name => aliases.get(String(name).toUpperCase().replace(/[-_\s.]/g,'')) || null;
export function parseAllele(value) {
 const s=Array.isArray(value)?value.join('-'):String(value).trim();
 if(/^(?:0|NA|N\/A|NULL|\?|—|-)$/i.test(s))return null;
 if(!/^\d{1,3}(?:\.\d)?(?:\s*[-/]\s*\d{1,3}(?:\.\d)?){0,7}$/.test(s))throw Error('قيمة STR غير صالحة: '+s);
 const a=s.split(/\s*[-/]\s*/).map(Number);
 if(a.some(x=>x<1||x>100))throw Error('قيمة STR خارج النطاق المدعوم 1–100: '+s);
 return a.sort((a,b)=>a-b);
}
export function parseSTR(text,{panel='named',layout='grouped'}={}) {
 if(typeof text!=='string'||text.length>100000)throw Error('حجم الإدخال غير صالح');
 const markers={},warnings=[];let meta={},format=panel;
 const add=(name,value)=>{
  const k=markerName(name);if(!k)throw Error('ماركر غير مدعوم: '+name);
  if(Object.hasOwn(markers,k))throw Error('ماركر مكرر: '+k);
  const a=value===null?null:parseAllele(value);markers[k]=a;
  if(a&&a.length!==(COPIES[k]||1))throw Error('عدد نسخ غير مطابق للماركر '+k);
  if(!a)warnings.push(k+': قراءة مفقودة');
  else if(a.some(x=>!Number.isInteger(x)))warnings.push(k+': محفوظ كما ورد؛ مستبعد من مسافة التكرارات الصحيحة');
 };
 const source=text.trim();if(!source)throw Error('أدخل قيم STR أولًا');
 if(source.startsWith('{')) {
  const data=JSON.parse(source);meta=data.markers?data:{};
  const obj=data.markers||data;if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error('markers يجب أن يكون كائنًا');
  for(const [k,v] of Object.entries(obj))add(k,v);format='JSON';
 } else if(panel==='named') {
  const lines=source.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length===2&&!/[=:]/.test(source)){
   const names=lines[0].split(/[\t,; ]+/),values=lines[1].split(/[\t,; ]+/);
   if(names.length!==values.length)throw Error('عدد أسماء الماركرات لا يطابق عدد القيم');
   names.forEach((n,i)=>add(n,values[i]));
  }else{
   for(const line of source.split(/[\n;,]+/).map(x=>x.trim()).filter(Boolean)){
    const m=/^([A-Za-z0-9_.-]+)\s*(?:[:=]|\s)\s*(.+)$/.exec(line);
    if(!m)throw Error('اكتب اسم الماركر وقيمته، مثل DYS393=13');add(m[1],m[2]);
   }
  }
 }else{
  const size=Number(panel);if(![12,25,37,67,111].includes(size))throw Error('لوحة غير مدعومة');
  const tokens=source.split(/[\s,;]+/).filter(Boolean);let slots=0,names=[];
  for(const name of ORDER){names.push(name);slots+=COPIES[name]||1;if(slots===size)break;}
  const expected=layout==='expanded'?size:names.length;
  if(tokens.length!==expected)throw Error('اللوحة المحددة تتطلب '+expected+' قيمة؛ المستلم '+tokens.length);
  let p=0;for(const name of names){const n=layout==='expanded'?(COPIES[name]||1):1;add(name,tokens.slice(p,p+n).join('-'));p+=n;}
  format='FTDNA '+size+' / '+layout;
 }
 return {target:{...meta,markers},format,warnings,loci:Object.values(markers).filter(Boolean).length,slots:Object.values(markers).reduce((n,a)=>n+(a?.length||0),0)};
}
