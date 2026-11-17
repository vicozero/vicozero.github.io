import fs from 'node:fs';
import crypto from 'node:crypto';

function scanSensitive(value, path='', hits=new Set()){
  if(!value||typeof value!=='object')return hits;
  for(const [key,val] of Object.entries(value)){
    const here=path?path+'.'+key:key;
    const lower=String(key).toLowerCase();
    if(['password','passwordhash','token','accesstoken','refreshtoken','idtoken','credential','secret','apikey'].includes(lower) && val!==undefined && val!==null && val!=='') hits.add(here);
    if(val&&typeof val==='object') scanSensitive(val, here, hits);
  }
  return hits;
}

// Read-only preflight: never changes the source backup or live data.
export function verifyBackup(backup) {
  if (backup?.format !== 'sierra-madre-local-workspace' || backup.version !== 1 || !backup.data) throw Error('Formato de respaldo no compatible.');
  const digest = crypto.createHash('sha256').update(JSON.stringify(backup.data)).digest('hex');
  if (digest !== backup.sha256) throw Error('La huella del respaldo no coincide.');
  const sensitive=[...scanSensitive(backup.data)];
  if(sensitive.length) throw Error('El respaldo contiene campos sensibles o credenciales: '+sensitive.slice(0,5).join(', '));
  const counts = {};
  const warnings = [];
  for (const collection of ['reports', 'actions', 'plans', 'users', 'notices']) {
    const records = backup.data[collection];
    if (!Array.isArray(records)) throw Error('Colección inválida: ' + collection);
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !record.id) throw Error('Identificador ausente en ' + collection);
      if (ids.has(record.id)) throw Error('Identificador duplicado en ' + collection + ': ' + record.id);
      ids.add(record.id);
    }
    counts[collection] = records.length;
  }
  const evidenceRefs=new Set();
  for(const report of backup.data.reports||[]){
    if(Array.isArray(report.photoChunkIds)) for(const id of report.photoChunkIds) evidenceRefs.add(id);
    if(Array.isArray(report.photos)) for(const photo of report.photos){ if(photo && typeof photo.data==='string' && !photo.data.startsWith('data:image/')) warnings.push('reports:'+report.id+': fotografía con formato inesperado'); }
  }
  for(const action of backup.data.actions||[]){
    if(Array.isArray(action.photoChunkIds)) for(const id of action.photoChunkIds) evidenceRefs.add(id);
  }
  return {sha256: digest, counts, status: 'verified', cloudImportPerformed: false, warnings, evidenceChunkReferences:evidenceRefs.size};
}

export function planImport(backup, existing={}){
  const plan={add:[],skip:[],conflict:[],warnings:[]};
  for(const collection of ['reports','actions','plans','notices','users']){
    const incoming=Array.isArray(backup.data?.[collection])?backup.data[collection]:[];
    const currentIds=new Set((Array.isArray(existing[collection])?existing[collection]:[]).map(r=>r&&r.id).filter(Boolean));
    for(const record of incoming){
      if(!record||!record.id){plan.conflict.push({collection,id:'',reason:'sin_id'});continue;}
      if(currentIds.has(record.id)){plan.skip.push({collection,id:record.id,reason:'ya_existe'});continue;}
      plan.add.push({collection,id:record.id});
    }
  }
  plan.summary={add:plan.add.length,skip:plan.skip.length,conflict:plan.conflict.length};
  return plan;
}

if (process.argv[1] && import.meta.url === new URL('file:///' + process.argv[1].replaceAll('\\', '/')).href) {
  try {
    if (!process.argv[2]) throw Error('Indica la ruta del respaldo JSON.');
    console.log(JSON.stringify(verifyBackup(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
