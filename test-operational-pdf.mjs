import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
globalThis.self=globalThis;
vm.runInThisContext(fs.readFileSync('assets/pdf-lib.min.js','utf8'));
for(const path of ['formats.js','extended-formats.js','report-pdf.js'])vm.runInThisContext(fs.readFileSync(path,'utf8'));
const records=JSON.parse(fs.readFileSync('.qa/operational/records.json','utf8'));
fs.mkdirSync('output/pdf/operational-qa',{recursive:true});
for(const record of records){
 const bytes=await generateSafetyPDF([{...record,observations:'PRUEBA AISLADA - SIN VALIDEZ OPERATIVA'}],{logoBytes:fs.readFileSync('assets/sierra-madre.png')});
 const pdf=await PDFLib.PDFDocument.load(bytes);assert(pdf.getPageCount()>0);
 fs.writeFileSync('output/pdf/operational-qa/'+record.type+'.pdf',bytes);
 console.log(record.type+': PDF válido, '+pdf.getPageCount()+' páginas');
}
