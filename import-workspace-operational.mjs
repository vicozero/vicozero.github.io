/* Importador operativo (FASE 2). Por defecto solo PLANIFICA: requiere --apply para escribir.
   Nunca elimina, sobrescribe ni asigna registros al administrador por defecto. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {verifyBackup} from './verify-migration-backup.mjs';
import './departments.js';

const OPERATIONAL=['reports','actions','plans'];
const OWNER_FIELDS=['ownerAccountId','assignedAccountId','verifierAccountId','supervisorAccountId','personAccountId'];

export function buildAccountMapping(backup,existing={}){
  const mapping=new Map(),warnings=[];
  const current=Array.isArray(existing.users)?existing.users:[];
  const byUid=new Map(current.map(u=>[u.id,u])),byEmail=new Map(current.map(u=>[String(u.email||'').toLowerCase(),u]));
  for(const user of backup.data.users||[]){
    const direct=byUid.get(user.id);
    const byMail=user.email?byEmail.get(String(user.email).toLowerCase()):null;
    if(direct&&(!byMail||byMail.id===direct.id)){mapping.set(user.id,direct.id);continue}
    if(byMail&&(!direct||direct.id===byMail.id)){mapping.set(user.id,byMail.id);continue}
    if(direct&&byMail&&direct.id!==byMail.id){
      warnings.push({type:'identidad_ambigua',id:user.id,detail:'El UID y el correo apuntan a cuentas distintas; se conserva el identificador original.'});
      continue;
    }
    warnings.push({type:'cuenta_no_resuelta',id:user.id,detail:'No hay cuenta destino equivalente; se conserva el identificador original. No se asigna al administrador.'});
  }
  return {mapping,warnings};
}

export function inspectEvidence(backup){
  const referenced=new Set(),withInlinePhotos=new Set();
  for(const collection of OPERATIONAL){
    for(const record of backup.data?.[collection]||[]){
      if(Array.isArray(record.photoChunkIds))for(const id of record.photoChunkIds)referenced.add(id);
      if(Array.isArray(record.photos)&&record.photos.length)withInlinePhotos.add(collection+':'+record.id);
    }
  }
  const available=new Set((backup.data?.evidenceChunks||[]).map(c=>c.id));
  const missing=[...referenced].filter(id=>!available.has(id));
  return {referenced:referenced.size,available:available.size,missing,inline:withInlinePhotos.size};
}

export function planOperationalImport(backup,existing={},options={}){
  const check=verifyBackup(backup);
  const {mapping,warnings:identityWarnings}=buildAccountMapping(backup,existing);
  const currentUsers=Array.isArray(existing.users)?existing.users:[];
  const evidence=inspectEvidence(backup);
  const warnings=[...identityWarnings];
  if(evidence.missing.length){
    warnings.push({type:'evidencia_incompleta',count:evidence.missing.length,detail:'Faltan fragmentos referenciados en el respaldo. Se conservan las fotos en línea, pero los fragmentos ausentes no se inventan.'});
  }
  const plan={add:[],skip:[],conflict:[],warnings,evidence,sha256:check.sha256,
    ready:evidence.missing.length===0||!!options.allowMissingChunks,
    note:'(sin escritura) Ejecuta con --apply para importar; usa --allow-missing-chunks solo con autorización y documentación.'};
  for(const collection of OPERATIONAL){
    const currentIds=new Set((Array.isArray(existing[collection])?existing[collection]:[]).map(r=>r&&r.id).filter(Boolean));
    for(const record of backup.data?.[collection]||[]){
      if(!record||!record.id){plan.conflict.push({collection,id:'',reason:'sin_id'});continue}
      if(currentIds.has(record.id)){plan.skip.push({collection,id:record.id,reason:'ya_existe'});continue}
      const unresolved=OWNER_FIELDS.filter(field=>record[field]&&!mapping.has(record[field])&&!currentUsers.some(u=>u.id===record[field]));
      if(unresolved.length)warnings.push({type:'responsable_original_conservado',collection,id:record.id,fields:unresolved});
      plan.add.push({collection,id:record.id,photos:Array.isArray(record.photos)?record.photos.length:0,chunks:Array.isArray(record.photoChunkIds)?record.photoChunkIds.length:0});
    }
  }
  plan.summary={add:plan.add.length,skip:plan.skip.length,conflict:plan.conflict.length,warnings:plan.warnings.length,evidence:evidence.referenced};
  return plan;
}

export function prepareOperationalRecords(backup,existing={}){
  const {mapping}=buildAccountMapping(backup,existing);
  const output=[];
  const departments=globalThis.SMDepartments;
  for(const collection of OPERATIONAL){
    for(const original of backup.data?.[collection]||[]){
      const record={...original};
      for(const field of OWNER_FIELDS){
        if(record[field]&&mapping.has(record[field]))record[field]=mapping.get(record[field]);
      }
      // Mirror only: the historical text is never removed.
      if(!record.departmentId){
        const resolved=departments?.of(record)||'';
        if(resolved)record.departmentId=resolved;
      }
      output.push({collection,id:record.id,data:record});
    }
  }
  return output;
}

function value(x){
  if(x===null)return {nullValue:null};
  if(Array.isArray(x))return {arrayValue:{values:x.map(value)}};
  if(typeof x==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(x).map(([k,v])=>[k,value(v)]))}};
  if(typeof x==='boolean')return {booleanValue:x};
  if(typeof x==='number')return Number.isInteger(x)?{integerValue:String(x)}:{doubleValue:x};
  return {stringValue:String(x)};
}

async function createOnly(fetchImpl,base,headers,path,data){
  const url=base+path;
  const existing=await fetchImpl(url,{headers});
  if(existing.status===404){
    const body=JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,value(v)]))});
    const put=await fetchImpl(url+'?currentDocument.exists=false',{method:'PATCH',headers,body});
    if(!put.ok)throw Error('Error guardando '+path+': '+put.status);
  }else if(!existing.ok)throw Error('Error leyendo '+path+': '+existing.status);
  const read=await fetchImpl(url,{headers});
  const actual=await read.json();
  for(const [key,val]of Object.entries(data)){
    if(!isDeepStrictEqual(actual.fields?.[key],value(val)))throw Error('Conflicto de conciliación en '+path+' campo '+key);
  }
}

export async function applyOperationalImport(backup,existing={},options={}){
  const plan=planOperationalImport(backup,existing,options);
  if(!plan.ready)throw Error('El respaldo referencia fragmentos de evidencia ausentes. No se realizó ninguna escritura.');
  const {createRequire}=await import('node:module');
  const require=createRequire(import.meta.url);
  const auth=require('firebase-tools/lib/auth.js');
  const token=await auth.getAccessToken(auth.getGlobalDefaultAccount().tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
  const base='https://firestore.googleapis.com/v1/projects/sierra-madre-seguridad/databases/(default)/documents/';
  const written={evidenceChunks:0,reports:0,actions:0,plans:0};
  for(const chunk of backup.data?.evidenceChunks||[]){
    if(!chunk?.id)throw Error('Fragmento de evidencia sin identificador; no se realizó ninguna escritura.');
    await createOnly(fetch,base,headers,'evidenceChunks/'+chunk.id,chunk);
    written.evidenceChunks++;
  }
  for(const item of prepareOperationalRecords(backup,existing)){
    await createOnly(fetch,base,headers,item.collection+'/'+item.id,item.data);
    written[item.collection]++;
  }
  return {status:'operational-records-reconciled',sha256:plan.sha256,written,skipped:plan.summary.skip,warnings:plan.warnings};
}

if(process.argv[1]&&import.meta.url===new URL('file:///'+process.argv[1].replaceAll('\\','/')).href){
  try{
    const file=process.argv[2];
    if(!file)throw Error('Indica la ruta del respaldo JSON.');
    const backup=JSON.parse(fs.readFileSync(file,'utf8'));
    const apply=process.argv.includes('--apply');
    const allowMissing=process.argv.includes('--allow-missing-chunks');
    if(apply&&!allowMissing){
      const plan=planOperationalImport(backup,{}, {allowMissing:false});
      if(!plan.ready)throw Error('Evidencia incompleta: revisa el plan antes de autorizar --allow-missing-chunks.');
    }
    const result=apply?await applyOperationalImport(backup,{}, {allowMissing:allowMissing}):planOperationalImport(backup,{}, {allowMissing:allowMissing});
    console.log(JSON.stringify(result,null,2));
    if(apply){
      const dir='.qa/operational-import-'+(result.sha256||crypto.createHash('sha256').update(JSON.stringify(backup.data)).digest('hex'));
      fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
