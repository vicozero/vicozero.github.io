import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';
fs.mkdirSync('.qa',{recursive:true});
const source=fs.readFileSync('cloud-portal.js','utf8').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js','firebase/firestore').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js','firebase/app').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js','firebase/auth');
fs.writeFileSync('.qa/cloud-portal-test.mjs',source);
const {connectPortal}=await import('./.qa/cloud-portal-test.mjs');
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')}});
globalThis.window={fetch:globalThis.fetch};globalThis.location={origin:'http://app.test'};
const own='Kgwk4gK0yxYJQMZZaggIyl2xtnh2';
try{
 await env.clearFirestore();
 vm.runInThisContext(fs.readFileSync('formats.js','utf8'));
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'security/authority'),{administratorUid:own});
  await setDoc(doc(db,'profiles',own),{id:own,name:'Admin test',role:'admin',active:true});
  await setDoc(doc(db,'profiles','operator'),{id:'operator',name:'Operator test',role:'operator',active:true});
 });
 const perms={admin:{},operator:{edit_reports:true,edit_actions:true,send_notices:true}};
 const db=env.authenticatedContext('operator').firestore();
 await connectPortal({}, {uid:'operator'},perms,db);
 let result=await window.fetch('/api/reports/test-record',{method:'PUT',body:JSON.stringify({revision:0,type:'inspection',status:'Borrador',photos:[]})});
 const saved=await result.json();assert.equal(result.status,200,JSON.stringify(saved));assert.equal(saved.revision,1);
 result=await window.fetch('/api/reports');assert.equal(result.status,200);assert.equal((await result.json()).length,1);
 const photo='data:image/jpeg;base64,'+'x'.repeat(1100000);
 result=await window.fetch('/api/reports/with-evidence',{method:'PUT',body:JSON.stringify({revision:0,type:'inspection',status:'Borrador',photos:[{data:photo,caption:'Large evidence'}]})});assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
 result=await window.fetch('/api/reports');assert.equal((await result.json()).find(r=>r.id==='with-evidence').photos[0].data,photo);
 result=await window.fetch('/api/reports/test-record',{method:'PUT',body:JSON.stringify({revision:0,status:'Borrador'})});assert.equal(result.status,409);
 result=await window.fetch('/api/notices',{method:'POST',body:JSON.stringify({toAccountIds:[own],text:'Integration test',type:'Mensaje'})});assert.equal(result.status,200);
 result=await window.fetch('/api/notices');assert.equal(result.status,200);assert.equal((await result.json()).length,1);
 await assert.rejects(()=>connectPortal({}, {uid:'unknown'},perms,env.authenticatedContext('unknown').firestore()));
 const operational=JSON.parse(fs.readFileSync('.qa/operational/records.json','utf8'));
 for(const record of operational){
  const body={...record,id:'module-'+record.type,revision:0,ownerAccountId:'operator'};
  let r=await window.fetch('/api/reports/'+body.id,{method:'PUT',body:JSON.stringify(body)});
  assert.equal(r.status,200,JSON.stringify(await r.clone().json()));
  const saved=await r.json();assert.equal(saved.status,'Finalizado');
  r=await window.fetch('/api/reports/'+body.id,{method:'PUT',body:JSON.stringify({...saved,status:'Borrador'})});assert.equal(r.status,200);
 }
 const invalid={...operational.find(r=>r.type==='training'),id:'invalid-training',revision:0,hours:'0',ownerAccountId:'operator'};
 const rejected=await window.fetch('/api/reports/invalid-training',{method:'PUT',body:JSON.stringify(invalid)});assert.equal(rejected.status,403);
 console.log('Portal/Firestore: guardado, consulta, conflicto, avisos y cuenta no autorizada: OK');
}finally{await env.cleanup();}
