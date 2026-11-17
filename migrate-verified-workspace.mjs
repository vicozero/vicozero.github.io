import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {verifyBackup} from './verify-migration-backup.mjs';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js');
const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),check=verifyBackup(backup);
// Validate scope before credentials, account imports or any remote writes.
if(backup.data.reports.length||backup.data.actions.length||backup.data.plans.length)throw Error('Este importador solo admite cuentas y avisos. Usa un importador compatible con registros y evidencias; no se realizó ninguna escritura.');
if(!backup.data.users.some(u=>u.isOwner))throw Error('Falta propietario en el respaldo; no se realizó ninguna escritura.');
const project='sierra-madre-seguridad',cli='node_modules/firebase-tools/lib/bin/firebase.js';
const dir='.qa/migration-'+check.sha256;
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/source.json',JSON.stringify(backup));
function cliRun(args){const r=spawnSync(process.execPath,[cli,...args,'--project',project,'--non-interactive'],{encoding:'utf8'});if(r.status!==0)throw Error('Operación de Firebase fallida. Revisa la autenticación y los permisos.');}
cliRun(['auth:export',dir+'/auth-before.json','--format','json']);
const accounts=JSON.parse(fs.readFileSync(dir+'/auth-before.json','utf8')).users||[];
const mapping=new Map(),pending=[];
for(const user of backup.data.users){
 const old=accounts.find(a=>a.email?.toLowerCase()===user.email?.toLowerCase());
 const uid=old?.localId||old?.uid||user.id;
 mapping.set(user.id,uid);
 if(!old)pending.push({localId:uid,email:user.email,displayName:user.name,disabled:user.active===false});
}
if(pending.length){fs.writeFileSync(dir+'/new-auth.json',JSON.stringify({users:pending}));cliRun(['auth:import',dir+'/new-auth.json']);}
cliRun(['auth:export',dir+'/auth-after.json','--format','json']);
const after=JSON.parse(fs.readFileSync(dir+'/auth-after.json','utf8')).users||[];
for(const user of backup.data.users)if(!after.some(a=>(a.localId||a.uid)===mapping.get(user.id)&&a.email?.toLowerCase()===user.email?.toLowerCase()))throw Error('Cuenta no conciliada.');
const token=await auth.getAccessToken(auth.getGlobalDefaultAccount().tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/';
function value(x){if(x===null)return {nullValue:null};if(Array.isArray(x))return {arrayValue:{values:x.map(value)}};if(typeof x==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(x).map(([k,v])=>[k,value(v)]))}};if(typeof x==='boolean')return {booleanValue:x};if(typeof x==='number')return Number.isInteger(x)?{integerValue:String(x)}:{doubleValue:x};return {stringValue:String(x)};}
async function createAndCheck(path,data){const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,value(v)]));const body=JSON.stringify({fields});const old=await fetch(base+path,{headers});if(old.status===404){const put=await fetch(base+path+'?currentDocument.exists=false',{method:'PATCH',headers,body});if(!put.ok)throw Error('Error guardando '+path+': '+put.status);}else if(!old.ok)throw Error('Error leyendo '+path);const read=await fetch(base+path,{headers});const actual=await read.json();for(const [k,v]of Object.entries(fields))if(!isDeepStrictEqual(actual.fields?.[k],v))throw Error('Conflicto de conciliación en '+path+' campo '+k);}
const owner=backup.data.users.find(u=>u.isOwner);
if(!owner)throw Error('Falta propietario en el respaldo.');
await createAndCheck('security/authority',{administratorUid:mapping.get(owner.id),updatedAt:backup.generatedAt});
for(const u of backup.data.users){const {passwordHash,...profile}=u;await createAndCheck('profiles/'+mapping.get(u.id),{...profile,id:mapping.get(u.id),legacyId:u.id});}
for(const n of backup.data.notices)await createAndCheck('notices/'+n.id,{...n,fromAccountId:mapping.get(n.fromAccountId)||n.fromAccountId,toAccountId:mapping.get(n.toAccountId)||n.toAccountId});
if(backup.data.reports.length||backup.data.actions.length||backup.data.plans.length)throw Error('Este paso requiere el importador de registros y evidencias para colecciones no vacías.');
const result={status:'accounts-and-notices-reconciled',sha256:check.sha256,counts:check.counts,newAccountsRequiringPasswordSetup:pending.length};
fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
