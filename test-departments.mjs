import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyBackup} from './verify-migration-backup.mjs';
import {planOperationalImport,prepareOperationalRecords,inspectEvidence} from './import-workspace-operational.mjs';

globalThis.eval(fs.readFileSync('formats.js','utf8'));
globalThis.eval(fs.readFileSync('departments.js','utf8'));
globalThis.eval(fs.readFileSync('progress-core.js','utf8'));

const D=globalThis.SMDepartments;
assert.equal(D.id('Planta'),'planta-beneficio');
assert.equal(D.id(' taller '),'mantenimiento-mecanico');
assert.equal(D.of({unit:'Mina'}),'mina');
assert.equal(D.of({unidad:'Subterránea'}),'mina');
assert.equal(D.of({departmentId:'almacen',unit:'Mina'}),'almacen');
assert.equal(D.name('planta-beneficio'),'Planta de Beneficio');
assert.ok(D.duplicateAliases([...D.defaults,{id:'otro',name:'Otro',aliases:['mina']}]).some(x=>x.alias==='mina'));
assert.equal(D.withoutId([{id:'a',unit:'Mina'},{id:'b',departmentId:'mina'}]).length,1);
assert.equal(SAFETY.departmentId('Planta'),'planta-beneficio');
assert.equal(SAFETY.departmentName('planta-beneficio'),'Planta de Beneficio');

const grouped=D.byDepartment([{id:'a',unit:'Mina'},{id:'b',department:'Planta'},{id:'c'}]);
assert.equal(grouped.length,3);
assert.equal(grouped.find(g=>g.id==='mina').rows.length,1);

const base={plans:[{id:'p1',person:'Ana',unit:'Mina',department:'Mina',period:'2026-11',kpi:2,targets:{inspection:1}}],reports:[],actions:[],types:SAFETY.types,period:'2026-11'};
const rows=SMProgress.matrix(base);
assert.equal(rows[0].department,'Mina','el campo histórico department se conserva');
assert.equal(rows[0].departmentId,'mina');
assert.equal(SMProgress.matrix({...base,department:'mina'}).length,1);
assert.equal(SMProgress.matrix({...base,department:'planta-beneficio'}).length,0);
const groups=SMProgress.departmentMatrix(base);
assert.equal(groups.length,1);
assert.equal(groups[0].id,'mina');
assert.equal(groups[0].name,'Mina');

const backup={format:'sierra-madre-local-workspace',version:1,generatedAt:'2026-11-22T00:00:00.000Z',data:{reports:[{id:'r1',unit:'Mina',department:'Mina',photos:[{data:'data:image/jpeg;base64,AA=='}],photoChunkIds:['chunk-1'],ownerAccountId:'u-old'}],actions:[],plans:[],users:[{id:'u-old',email:'ana@example.test',isOwner:true}],notices:[],reads:{},evidenceChunks:[{id:'chunk-1',payload:'[]'}],departments:D.defaults},sha256:''};
backup.sha256=crypto.createHash('sha256').update(JSON.stringify(backup.data)).digest('hex');
const check=verifyBackup(backup);
assert.equal(check.counts.departments,10);
const existing={users:[{id:'u-new',email:'ana@example.test'}]};
const plan=planOperationalImport(backup,existing);
assert.equal(plan.summary.add,1);
assert.equal(plan.ready,true);
assert.equal(plan.evidence.missing.length,0);
assert.equal(inspectEvidence(backup).inline,1);
const prepared=prepareOperationalRecords(backup,existing);
assert.equal(prepared.length,1);
assert.equal(prepared[0].data.unit,'Mina');
assert.equal(prepared[0].data.department,'Mina');
assert.equal(prepared[0].data.departmentId,'mina');
assert.equal(prepared[0].data.ownerAccountId,'u-new');
assert.deepEqual(prepared[0].data.photoChunkIds,['chunk-1']);
assert.equal(prepared[0].data.photos.length,1);

const missing=JSON.parse(JSON.stringify(backup));
missing.data.evidenceChunks=[];
missing.sha256=crypto.createHash('sha256').update(JSON.stringify(missing.data)).digest('hex');
assert.equal(planOperationalImport(missing).ready,false);

for(const value of [null,{},'texto',[{id:'Mina',name:'Mina'}]]){
  const bad=JSON.parse(JSON.stringify(backup));
  bad.data.departments=value;
  bad.sha256=crypto.createHash('sha256').update(JSON.stringify(bad.data)).digest('hex');
  assert.throws(()=>verifyBackup(bad));
}
const legacy=JSON.parse(JSON.stringify(backup));
delete legacy.data.departments;
legacy.sha256=crypto.createHash('sha256').update(JSON.stringify(legacy.data)).digest('hex');
assert.equal(verifyBackup(legacy).counts.departments,0);

console.log('FASE 2 · departamentos, IDs, agrupamiento e importador en modo planificación: PASS');
