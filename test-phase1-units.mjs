import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')}});
try{
 await env.withSecurityRulesDisabled(async c=>{
  for(const [id,permissions] of [['restricted',{}],['readonly',{edit_reports:false}],['hidden',{reports:false}]])await setDoc(doc(c.firestore(),'profiles',id),{active:true,role:'supervisor',restrictUnits:true,allowedUnits:['Mina'],permissions});
  for(const id of ['restricted','readonly','hidden'])for(const unit of ['Mina','Taller'])await setDoc(doc(c.firestore(),'reports',id+'-'+unit),{ownerAccountId:id,unit,revision:1,status:'Borrador'});
 });
 const db=env.authenticatedContext('restricted').firestore();
 await assertSucceeds(getDoc(doc(db,'reports/restricted-Mina')));
 await assertFails(getDoc(doc(db,'reports/restricted-Taller')));
 await assertFails(setDoc(doc(db,'reports/forbidden'),{ownerAccountId:'restricted',unit:'Taller',revision:1,status:'Borrador'}));
 await assertFails(updateDoc(doc(db,'reports/restricted-Mina'),{unit:'Taller',revision:2}));
 const read=env.authenticatedContext('readonly').firestore();await assertSucceeds(getDoc(doc(read,'reports/readonly-Mina')));await assertFails(updateDoc(doc(read,'reports/readonly-Mina'),{revision:2}));
 await assertFails(getDoc(doc(env.authenticatedContext('hidden').firestore(),'reports/hidden-Mina')));
 fs.mkdirSync('.qa',{recursive:true});
 fs.writeFileSync('.qa/phase1-portal.mjs',fs.readFileSync('cloud-portal.js','utf8').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js','firebase/firestore').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js','firebase/app').replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js','firebase/auth'));
 globalThis.window={fetch:globalThis.fetch};globalThis.location={origin:'https://qa.invalid'};
 const {connectPortal}=await import('./.qa/phase1-portal.mjs');
 await connectPortal({}, {uid:'restricted'},{member:{}},db);
 const response=await window.fetch('/api/reports');assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.deepEqual((await response.json()).map(r=>r.id),['restricted-Mina']);
 console.log('Firestore y portal: aislamiento por unidad, tipo de operación, consultas compatibles y rechazo de cambio de unidad: OK');
}finally{await env.cleanup();}
