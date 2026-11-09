// Format/coverage report only. No ancestry, health, trait, kinship, or Y-tree inference.
export function inspectRaw(text){
 if(typeof text!=='string'||text.length>20*1024*1024)throw Error('ملف RAW أكبر من 20MB');
 let delimiter,records=0,called=0,noCall=0,invalid=0,duplicates=0;const seen=new Set(),chromosomes={};let build='غير محدد';
 for(let line of text.split(/\r?\n/)){
  line=line.trim();if(!line)continue;if(line.startsWith('#')){const m=line.match(/(?:build|assembly)\D*(37|38|36)/i);if(m)build=m[1];continue;}
  const cells=line.replace(/^\uFEFF/,'').split(/[,\t ]+/).map(c=>c.replace(/^"|"$/g,''));
  if(/^(rsid|snp|snp_name|marker)$/i.test(cells[0]))continue;
  if(cells.length<4||!/^rs\d+$|^i\d+$/i.test(cells[0])||!/^\d+$/.test(cells[2])){invalid++;continue;}
  const chr=cells[1].replace(/^chr/i,'').toUpperCase();if(!/^(?:[1-9]|1\d|2[0-6]|X|Y|MT|M)$/.test(chr)){invalid++;continue;}
  const key=chr+':'+cells[2];if(seen.has(key)){duplicates++;continue;}seen.add(key);
  const gt=(cells[4]?cells[3]+cells[4]:cells[3]).toUpperCase();if(!/^(?:[ACGTID]{1,2}|--|00|NN|0|N|-)$/.test(gt)){invalid++;continue;}
  records++;chromosomes[chr]=(chromosomes[chr]||0)+1;if(/^(?:--|00|NN|0|N|-)$/.test(gt))noCall++;else called++;
 }
 if(records<100)throw Error('لم أتعرف على ملف RAW مدعوم؛ المطلوب جدول rsid وchromosome وposition وgenotype، أو allele1 وallele2. الملفات المضغوطة وVCF تحتاج مسارًا آخر.');
 const autosomal=Object.entries(chromosomes).filter(([c])=>/^(?:[1-9]|1\d|2[0-2])$/.test(c)).reduce((s,[,n])=>s+n,0);
 if(!autosomal)throw Error('الملف لا يحتوي مواضع على الكروموسومات 1–22');
 return {schemaVersion:1,kind:'autosomal',reportType:'raw_format_coverage_only',generatedAt:new Date().toISOString(),records,called,noCall,invalid,duplicates,callRate:Math.round(called/records*10000)/100,autosomal,chromosomes,build,limitations:['تقرير قراءة وجودة فقط؛ ليس تقرير أصول أو صفات أو صحة.','نسبة القراءة لا تثبت صحة المختبر أو ملكية الملف.','لم تُربط البيانات بالمشجرة ولم تُستخدم لتدريب المتنبئ.']};
}
