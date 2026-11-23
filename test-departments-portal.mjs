import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';

fs.mkdirSync('.qa',{recursive:true});
const source=fs.readFileSync('cloud-portal.js','utf8')
  .replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js','firebase/firestore')
  .replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js','firebase/app')
  .replaceAll('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js','firebase/auth');
fs.writeFileSync('.qa/cloud-portal-departments-test.mjs',source);
const {connectPortal}=await import('./.qa/cloud-portal-departments-test.mjs');
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')}});
globalThis.window={fetch:globalThis.fetch};globalThis.location={origin:'http://app.test'};
const own='Kgwk4gK0yxYJQMZZaggIyl2xtnh2';
const perms={admin:{},operator:{edit_reports:true,edit_actions:true}};
const json=async response=>({status:response.status,body:await response.json()});
try{
  await env.clearFirestore();
  vm.runInThisContext(fs.readFileSync('formats.js','utf8'));
  vm.runInThisContext(fs.readFileSync('departments.js','utf8'));
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(doc(db,'security/authority'),{administratorUid:own});
    await setDoc(doc(db,'profiles',own),{id:own,name:'Admin test',role:'admin',active:true,revision:0});
    await setDoc(doc(db,'profiles','limited'),{id:'limited',email:'limited@example.test',name:'Limited test',role:'operator',active:true,revision:0,restrictUnits:true,allowedUnitIds:['mina']});
    await setDoc(doc(db,'profiles','other'),{id:'other',email:'other@example.test',name:'Other test',role:'operator',active:true,revision:0,restrictUnits:true,allowedUnitIds:['planta-beneficio']});
    await setDoc(doc(db,'departments','mina'),{id:'mina',name:'Mina',aliases:['mina','subterránea'],activo:true});
    await setDoc(doc(db,'departments','planta-beneficio'),{id:'planta-beneficio',name:'Planta de Beneficio',aliases:['planta'],activo:true});
  });

  await connectPortal({}, {uid:own},perms,env.authenticatedContext(own).firestore());
  let result=await json(await window.fetch('/api/departments'));
  assert.equal(result.status,200);assert.equal(result.body.length,2);
  result=await json(await window.fetch('/api/departments',{method:'POST',body:JSON.stringify({id:'transporte',name:'Transporte',aliases:['transporte'],activo:true})}));
  assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.id,'transporte');
  result=await json(await window.fetch('/api/departments',{method:'POST',body:JSON.stringify({id:'duplicado',name:'Duplicado',aliases:['mina'],activo:true})}));
  assert.equal(result.status,403);assert.match(result.body.error,/alias duplicado/i);

  await connectPortal({}, {uid:'limited'},perms,env.authenticatedContext('limited').firestore());
  result=await json(await window.fetch('/api/departments',{method:'POST',body:JSON.stringify({id:'prohibido',name:'Prohibido'})}));
  assert.equal(result.status,403);
  result=await json(await window.fetch('/api/departments'));assert.equal(result.status,200);assert.equal(result.body.length,3);
  const allowed={id:'allowed-dept',revision:0,type:'inspection',status:'Borrador',photos:[],unit:'Mina',department:'Mina',departmentId:'mina',ownerAccountId:'limited',supervisor:'Limited test'};
  result=await json(await window.fetch('/api/reports/allowed-dept',{method:'PUT',body:JSON.stringify(allowed)}));
  assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.departmentId,'mina');
  result=await json(await window.fetch('/api/reports/denied-dept',{method:'PUT',body:JSON.stringify({...allowed,id:'denied-dept',unit:'Planta',department:'Planta',departmentId:'planta-beneficio'})}));
  assert.equal(result.status,403);
  result=await json(await window.fetch('/api/reports'));
  assert.equal(result.status,200,JSON.stringify(result.body));assert.deepEqual(result.body.map(r=>r.id),['allowed-dept']);

  await connectPortal({}, {uid:'other'},perms,env.authenticatedContext('other').firestore());
  result=await json(await window.fetch('/api/reports'));assert.equal(result.status,200);assert.equal(result.body.length,0);
  result=await json(await window.fetch('/api/inconsistencies'));assert.equal(result.status,403);

  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'reports','legacy-dept'),{id:'legacy-dept',revision:0,type:'inspection',status:'Borrador',photos:[],unit:'Mina',department:'Mina',ownerAccountId:'limited',supervisor:'Limited test'});
  });
  await connectPortal({}, {uid:own},perms,env.authenticatedContext(own).firestore());
  result=await json(await window.fetch('/api/users',{method:'POST',body:JSON.stringify({id:'other',email:'other@example.test',name:'Other test',role:'operator',active:true,revision:0,allowedUnitIds:['Planta','mina']})}));
  assert.equal(result.status,200,JSON.stringify(result.body));assert.deepEqual(result.body.allowedUnitIds,['planta-beneficio','mina']);
  result=await json(await window.fetch('/api/inconsistencies'));
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(result.body.counts.departments,3);
  assert.equal(result.body.counts.withoutDepartmentId,1);
  assert.equal(result.body.counts.duplicateAliases,0);
  assert.ok(result.body.issues.some(issue=>issue.type==='departamento_sin_id'&&issue.id==='legacy-dept'));
  assert.ok(result.body.byDepartment.some(group=>group.id==='mina'&&group.rows.length>=2));
  console.log('Portal/departamentos: catálogo admin-only, allowedUnitIds, inconsistencias y normalización: OK');
}finally{await env.cleanup();}
