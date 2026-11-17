import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {verifyBackup,planImport} from './verify-migration-backup.mjs';

const data={reports:[],actions:[],plans:[],users:[],notices:[],reads:{}};
const make=value=>({format:'sierra-madre-local-workspace',version:1,data:value,sha256:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')});
assert.equal(verifyBackup(make(data)).status,'verified');
const dup=structuredClone(data);dup.reports=[{id:'x'},{id:'x'}];
assert.throws(()=>verifyBackup(make(dup)),/duplicado/);
const secret=structuredClone(data);secret.users=[{id:'u',passwordHash:'abc'}];
assert.throws(()=>verifyBackup(make(secret)),/sensibles|credenciales/);
const token=structuredClone(data);token.notices=[{id:'n',accessToken:'abc'}];
assert.throws(()=>verifyBackup(make(token)),/sensibles|credenciales/);
const plan=planImport(make({...data,reports:[{id:'a'},{id:'b'}],actions:[{id:'c'}]}),{reports:[{id:'a'}],actions:[]});
assert.deepEqual(plan.summary,{add:2,skip:1,conflict:0});

const source=fs.readFileSync('firebase-auth.js','utf8');
const start=source.indexOf('async function importLocalWorkspace');
assert.ok(start>=0,'función de importación presente');
const bodyStart=source.indexOf('){',start)+1;
assert.ok(bodyStart>start,'inicio del cuerpo');
let depth=0,end=-1,opened=false;
for(let i=bodyStart;i<source.length;i++){
  const c=source[i];
  if(c==='{'){depth++;opened=true;}
  else if(c==='}'){depth--;if(opened&&depth===0){end=i+1;break;}}
}
assert.ok(end>start,'cuerpo de función completo');
const fnSource=source.slice(start,end);
const calls=[];
const ctx={
  SM_CLOUD:{me:{id:'admin'}},
  readWS:()=>({reports:[{id:'r1',status:'Borrador'}],actions:[],plans:[],notices:[],users:[]}),
  fetch:async(url,init={})=>{calls.push({url,method:(init.method||'GET').toUpperCase()});return {ok:true,json:async()=>[]};},
  console
};
vm.createContext(ctx);
vm.runInContext(fnSource+'\n;globalThis.__importLocalWorkspace=importLocalWorkspace;',ctx);
const preview=await ctx.__importLocalWorkspace(ctx.SM_CLOUD.me,{preview:true});
assert.equal(preview.counts.toAdd,1);
assert.equal(preview.counts.toSkip,0);
assert.equal(preview.counts.conflicts,0);
assert.ok(!calls.some(c=>c.method!=='GET'),'la previsualización no debe escribir');
calls.length=0;
await ctx.__importLocalWorkspace(ctx.SM_CLOUD.me);
assert.ok(calls.some(c=>c.method==='PUT'),'la importación confirmada sí escribe');
console.log('Respaldos y previsualización: duplicados/credenciales detectados, plan y preview sin escrituras: OK');
