import {markerName,parseSTR} from './lxdna-str-input.mjs';
// Standard, single-header CSV/TSV. Never guess positions from a full web page.
export function readTable(text){
 if(typeof text!=='string'||text.length>5*1024*1024)throw Error('الملف يتجاوز 5MB');
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];const delimiter=first.includes('\t')?'\t':first.includes(';')?';':',';
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell!=='')throw Error('اقتباس CSV غير صالح');else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('اقتباس CSV غير مغلق');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2||rows.length>10001)throw Error('يلزم صف عناوين وصف بيانات، وبحد أقصى 10000 عينة');
 const headers=rows.shift().map(x=>x.trim());if(rows.some(r=>r.length!==headers.length))throw Error('عدد الخانات لا يطابق العناوين؛ صدّر جدولًا كاملًا دون دمج خلايا');
 return {headers,rows};
}
const key=s=>s.toLowerCase().replace(/[\s_#-]/g,'');
export function importProjectCSV(text){
 const {headers,rows}=readTable(text),markers=headers.map(markerName),kit=headers.findIndex(h=>['kit','kitid','kitnumber','sampleid'].includes(key(h))),hap=headers.findIndex(h=>['haplogroup','snp','terminalsnp'].includes(key(h))),verified=headers.findIndex(h=>key(h)==='snpverified');
 if(kit<0)throw Error('أضف عمود kitId أو Kit Number؛ لا تستخدم الاسم بدل رقم العينة');
 if(markers.filter(Boolean).length<12)throw Error('يلزم 12 موضع STR مسمى على الأقل؛ لا نخمّن ترتيب الأعمدة');
 const seen=new Set();return rows.map((r,i)=>{
  const kitId=r[kit].trim();if(!kitId||seen.has(kitId))throw Error('رقم عينة فارغ أو مكرر في الصف '+(i+2));seen.add(kitId);
  const m={};for(let j=0;j<headers.length;j++)if(markers[j]){if(Object.hasOwn(m,markers[j]))throw Error('ماركر مكرر أو مرادف مكرر: '+headers[j]);m[markers[j]]=r[j].trim()||null;}
  const parsed=parseSTR(JSON.stringify({markers:m}));
  return {kitId,haplogroup:hap>=0?r[hap].trim():'',snpVerified:verified>=0&&r[verified].trim().toLowerCase()==='true',markers:parsed.target.markers};
 });
}
export function selectTargetCSV(text,kitId=''){
 const {headers,rows}=readTable(text);
 if(headers.length===2&&['marker','locus'].includes(key(headers[0]))&&['value','allele','result'].includes(key(headers[1]))){const seen=new Set(),m={};for(const [name,value] of rows){const k=markerName(name);if(!k||seen.has(k))throw Error('ماركر غير مدعوم أو مكرر: '+name);seen.add(k);m[k]=value.trim()||null;}return parseSTR(JSON.stringify({markers:m})).target;}
 if(headers.every(h=>markerName(h))){if(new Set(headers.map(markerName)).size!==headers.length)throw Error('ماركر مكرر أو مرادف مكرر');if(rows.length!==1)throw Error('ملف الفرد يحتوي أكثر من صف؛ أضف kitId واختر رقم عينتك');return parseSTR(JSON.stringify({markers:Object.fromEntries(headers.map((h,i)=>[h,rows[0][i].trim()||null]))})).target;}
 const records=importProjectCSV(text),selected=kitId?records.filter(r=>r.kitId===kitId.trim()):records;
 if(selected.length!==1)throw Error('اكتب رقم العينة المطابق في خانة معرّف العينة لاختيار صف واحد فقط');
 return {kitId:selected[0].kitId,markers:selected[0].markers,snpVerified:selected[0].snpVerified};
}
