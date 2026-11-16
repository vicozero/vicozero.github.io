import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js');
const account=auth.getGlobalDefaultAccount();
if(!account?.tokens?.refresh_token)throw Error('Falta sesión local de Firebase.');
const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const root='https://firestore.googleapis.com/v1/projects/sierra-madre-seguridad/databases/(default)/documents';
const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
const documents=[],counts={};
async function json(url,options={}){const r=await fetch(url,{headers,...options});if(!r.ok)throw Error('Lectura de respaldo fallida: HTTP '+r.status);return r.json();}
async function walk(parent){
 let next;
 do{
  const groups=await json(parent+':listCollectionIds',{method:'POST',body:JSON.stringify({pageSize:1000,...(next?{pageToken:next}:{})})});
  for(const name of groups.collectionIds||[]){
   let pageToken;
   do{
    const page=await json(parent+'/'+encodeURIComponent(name)+'?pageSize=1000&showMissing=true'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''));
    for(const document of page.documents||[]){
     if(document.fields){documents.push(document);counts[name]=(counts[name]||0)+1;}
     const path='https://firestore.googleapis.com/v1/'+document.name;
     await walk(path);
    }
    pageToken=page.nextPageToken;
   }while(pageToken);
  }
  next=groups.nextPageToken;
 }while(next);
}
await walk(root);
const snapshot={format:'sierra-madre-firestore-readonly-backup',version:1,project:'sierra-madre-seguridad',createdAt:new Date().toISOString(),documents};
const raw=JSON.stringify(snapshot),sha256=crypto.createHash('sha256').update(raw).digest('hex');
fs.mkdirSync('.qa/cloud-backups',{recursive:true});
const file='.qa/cloud-backups/'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
fs.writeFileSync(file,raw,{flag:'wx'});
if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==sha256)throw Error('El respaldo no pasó la verificación de lectura.');
fs.writeFileSync(file+'.manifest.json',JSON.stringify({file,sha256,counts,verified:true},null,2));
console.log(JSON.stringify({file,sha256,counts,verified:true},null,2));
