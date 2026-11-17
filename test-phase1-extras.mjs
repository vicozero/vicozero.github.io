import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';

fs.mkdirSync('.qa',{recursive:true});
const source=fs.readFileSync('cloud-portal.js','utf8').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js','firebase/firestore').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js','firebase/app').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js','firebase/auth');
fs.writeFileSync('.qa/cloud-portal-extras.mjs',source);
const {connectPortal}=await import('./.qa/cloud-portal-extras.mjs');
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')}});
const own='Kgwk4gK0yxYJQMZZaggIyl2xtnh2';
try{
  await env.clearFirestore();
  vm.runInThisContext(fs.readFileSync('formats.js','utf8'));
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(doc(db,'security/authority'),{administratorUid:own});
    await setDoc(doc(db,'profiles',own),{id:own,name:'Admin test',role:'admin',active:true});
    await setDoc(doc(db,'profiles','op1'),{id:'op1',name:'Juan Perez',role:'operator',active:true});
    await setDoc(doc(db,'profiles','op2'),{id:'op2',name:'Juan P\u00e9rez',role:'operator',active:true});
    await setDoc(doc(db,'evidenceChunks','rec1-0'),{ownerAccountId:own,recordCollection:'reports',recordId:'rec1',payload:JSON.stringify([{data:'data:image/jpeg;base64,YWJj',caption:'evidencia disponible'}])});
    await setDoc(doc(db,'reports','rec1'),{id:'rec1',type:'inspection',date:'2026-11-01',status:'Borrador',supervisor:'Admin test',revision:1,ownerAccountId:own,photos:[],photoChunkIds:['rec1-0','missing-chunk']});
    await setDoc(doc(db,'evidenceChunks','orphan-0'),{ownerAccountId:own,recordCollection:'reports',recordId:'none',payload:'x'});
  });
  globalThis.window={fetch:globalThis.fetch};globalThis.location={origin:'http://app.test'};
  await connectPortal({}, {uid:own}, {}, env.authenticatedContext(own).firestore());
  let r=await window.fetch('/api/reports/rec1');const recovered=await r.json();
  assert.equal(r.status,200);
  assert.equal(recovered.photos[0].caption,'evidencia disponible');
  assert.ok(recovered._missingPhotoChunks?.includes('missing-chunk'),'debe avisar del fragmento faltante');
  assert.ok(recovered._photoRecoveryError,'debe exponer aviso de recuperación');

  r=await window.fetch('/api/inconsistencies');assert.equal(r.status,200);const inc=await r.json();
  assert.ok(inc.homonyms.some(g=>g.length===2),'debe detectar homónimos');
  assert.ok(inc.issues.some(i=>i.type==='evidencia_incompleta'),'debe reportar evidencia incompleta');
  assert.ok(inc.orphanChunks.some(c=>c.id==='orphan-0'),'debe reportar fragmentos huérfanos sin eliminarlos');
  assert.ok(inc.counts.issues>0);

  await connectPortal({}, {uid:'op1'}, {}, env.authenticatedContext('op1').firestore());
  r=await window.fetch('/api/inconsistencies');assert.equal(r.status,403,'solo administradores');

  await connectPortal({}, {uid:own}, {}, env.authenticatedContext(own).firestore());
  const action={id:'amb-action',revision:0,description:'Revisar guarda',owner:'Juan Perez',unit:'Mina',requester:'Admin test',source:'Inspección',start:'2026-11-01',due:'2026-11-20',priority:'Media',progress:0,status:'Pendiente',photos:[]};
  r=await window.fetch('/api/actions/amb-action',{method:'PUT',body:JSON.stringify(action)});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));
  const ambiguous=await r.json();
  assert.equal(ambiguous.assignedAccountId,undefined,'no debe reasignar con homónimos');
  assert.ok(ambiguous._identityWarning,'debe marcar advertencia de identidad');

  const byUid={...action,id:'uid-action',assignedAccountId:'op2'};
  r=await window.fetch('/api/actions/uid-action',{method:'PUT',body:JSON.stringify(byUid)});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));
  const resolved=await r.json();
  assert.equal(resolved.assignedAccountId,'op2','debe respetar responsable por UID');
  assert.equal(resolved.owner,'Juan P\u00e9rez');
  console.log('Fase 1 extras: evidencia recuperada/avisada, homónimos sin reasignación, UID respetado e inconsistencias solo admin: OK');
}finally{await env.cleanup();}
