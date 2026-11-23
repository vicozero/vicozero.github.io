import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
globalThis.self=globalThis;
vm.runInThisContext(fs.readFileSync('assets/pdf-lib.min.js','utf8'));
const PDFLib=globalThis.PDFLib;
require('./advanced-core.js');
const PDF=require('./advanced-pdf.js');

const supervision=await PDF.generateSupervisionPDF({
  folio:'SM-SUP-20261123-01',date:'2026-11-23',time:'09:30',shift:'Día / Turno 1',unit:'Unidad Norte',department:'seguridad',area:'Taller',supervisor:'Ana García',responsible:'Luis Ruiz',type:'general',status:'Finalizado',
  checks:[{question:'Cumplimiento de controles',answer:'No cumple',reason:'Sin guarda'},{question:'Condiciones del área',answer:'Cumple',reason:''}],
  observations:'Corregir de inmediato.',photos:[{caption:'Evidencia 1'}],actions:[{folio:'SM-AC-01',description:'Instalar guarda',risk:'Alto',due:'2026-11-30'}]
});
assert.equal(Buffer.from(supervision).subarray(0,5).toString(),'%PDF-');
const loadedSupervision=await PDFLib.PDFDocument.load(supervision);
assert.equal(loadedSupervision.getPageCount(),1);
assert(loadedSupervision.getTitle().includes('SM-SUP-20261123-01'));
const sizeSupervision=loadedSupervision.getPage(0).getSize();
assert.equal(Math.round(sizeSupervision.width),612);
assert.equal(Math.round(sizeSupervision.height),792);

const monthly=await PDF.generateMonthlyReportPDF({
  period:'2026-11',
  data:{reports:[],actions:[],findings:[]},
  filters:{period:'2026-11'},
  matrix:[]
});
assert.equal(Buffer.from(monthly).subarray(0,5).toString(),'%PDF-');
const loadedMonthly=await PDFLib.PDFDocument.load(monthly);
assert.equal(loadedMonthly.getPageCount(),1);
assert(loadedMonthly.getTitle().includes('2026-11'));
const sizeMonthly=loadedMonthly.getPage(0).getSize();
assert.equal(Math.round(sizeMonthly.width),612);
assert.equal(Math.round(sizeMonthly.height),792);
console.log('PDF avanzado: supervisión carta y reporte mensual ejecutivo válidos, con folio y periodo verificables: OK');
