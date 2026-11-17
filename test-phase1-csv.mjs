import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source=fs.readFileSync('workspace.js','utf8');
const start=source.indexOf('function csv(rows,name)');
assert.ok(start>=0,'función csv presente');
let depth=0,end=-1,opened=false;
for(let i=source.indexOf('{',start);i<source.length;i++){
  const c=source[i];
  if(c==='{'){depth++;opened=true;}
  else if(c==='}'){depth--;if(opened&&depth===0){end=i+1;break;}}
}
assert.ok(end>start,'cuerpo de csv completo');
const captured=[];
const ctx={download:(data,name,type)=>captured.push({data,name,type})};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+'\n;globalThis.__csv=csv;',ctx);
ctx.__csv([['Responsable','Observación'],['Ana','información con acento'],['Beto','=SUM(A1)'],['Carla','dice "hola"']],'Sierra-Madre-acciones-2026-11.csv');
assert.equal(captured.length,1);
const {data,name,type}=captured[0];
assert.equal(name,'Sierra-Madre-acciones-2026-11.csv');
assert.equal(type,'text/csv;charset=utf-8;');
assert.ok(data.startsWith('\ufeff'),'BOM UTF-8 para Excel');
assert.ok(data.includes('"información con acento"'),'conserva acentos');
assert.ok(data.includes('"\'=SUM(A1)"'),'neutraliza fórmulas');
assert.ok(data.includes('"dice ""hola"""'),'escapa comillas');
assert.ok(data.includes('\r\n'),'separador de filas CRLF');
console.log('CSV: acentos, comillas, inyección de fórmulas, BOM y descarga: OK');
