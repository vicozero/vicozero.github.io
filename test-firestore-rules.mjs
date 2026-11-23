import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,query,where,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')}});
const principal='Kgwk4gK0yxYJQMZZaggIyl2xtnh2';
try {
  const initial=env.authenticatedContext(principal).firestore();
  const stranger=env.authenticatedContext('stranger').firestore();
  const next=env.authenticatedContext('next-admin').firestore();
  const secondary=env.authenticatedContext('secondary-admin').firestore();
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'security/authority')));
  await assertFails(setDoc(doc(stranger,'security/authority'),{administratorUid:'stranger',updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(initial,'security/authority'),{administratorUid:principal,updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(initial,'profiles',principal),{id:principal,role:'admin',active:true}));
  await assertFails(setDoc(doc(stranger,'reports/example'),{description:'blocked'}));
  await assertFails(deleteDoc(doc(initial,'security/authority')));
  const operator=env.authenticatedContext('operator').firestore();
  await assertSucceeds(setDoc(doc(initial,'profiles/operator'),{role:'operator',active:true}));
  await assertSucceeds(setDoc(doc(operator,'reports/own'),{ownerAccountId:'operator',revision:1,status:'Borrador'}));
  await assertFails(getDoc(doc(stranger,'reports/own')));
  await assertFails(updateDoc(doc(operator,'reports/own'),{ownerAccountId:'stranger',revision:2}));
  await assertSucceeds(updateDoc(doc(operator,'reports/own'),{revision:2,status:'Finalizado'}));
  await assertFails(setDoc(doc(operator,'actions/closed'),{ownerAccountId:'operator',status:'Cerrado'}));
  await assertFails(setDoc(doc(stranger,'profiles/stranger'),{role:'operator',active:true}));
  await assertSucceeds(setDoc(doc(operator,'sessions/own'),{userId:'operator',startedAt:serverTimestamp(),updatedAt:serverTimestamp(),activeMs:0,closed:false}));
  await assertFails(setDoc(doc(operator,'sessions/forged'),{userId:'stranger',startedAt:serverTimestamp(),updatedAt:serverTimestamp(),activeMs:0,closed:false}));
  await assertFails(getDoc(doc(stranger,'sessions/own')));
  await assertSucceeds(getDoc(doc(initial,'sessions/own')));
  await assertSucceeds(updateDoc(doc(operator,'sessions/own'),{activeMs:0,updatedAt:serverTimestamp(),closed:true}));
  await assertFails(updateDoc(doc(operator,'sessions/own'),{activeMs:1,updatedAt:serverTimestamp()}));

  await assertSucceeds(setDoc(doc(initial,'profiles/secondary-admin'),{role:'admin',active:true}));
  await assertSucceeds(getDoc(doc(secondary,'reports/own')));
  await assertSucceeds(setDoc(doc(secondary,'profiles/promoted-by-secondary'),{role:'operator',active:true}));
  await assertFails(setDoc(doc(secondary,'profiles/illegal-admin'),{role:'admin',active:true}));
  await assertFails(updateDoc(doc(secondary,'security/authority'),{administratorUid:'secondary-admin',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(secondary,'profiles',principal),{active:false}));

  await assertSucceeds(updateDoc(doc(initial,'security/authority'),{administratorUid:'next-admin',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(initial,'security/authority'),{administratorUid:principal,updatedAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(next,'security/authority')));
  await assertSucceeds(getDoc(doc(initial,'sessions/own')),'Former principal should keep administrator access');
  await assertSucceeds(getDoc(doc(secondary,'sessions/own')));
  // FASES 3-8: colecciones aditivas. Perfiles con permisos explícitos y sin concesión automática.
  const advanced=env.authenticatedContext('advanced-op').firestore();
  const limited=env.authenticatedContext('limited-op').firestore();
  const recipient=env.authenticatedContext('recipient').firestore();
  await assertSucceeds(setDoc(doc(initial,'profiles/advanced-op'),{role:'operator',active:true,permissions:{edit_reports:true,edit_actions:true,send_notices:true}}));
  await assertSucceeds(setDoc(doc(initial,'profiles/limited-op'),{role:'operator',active:true,permissions:{}}));
  await assertSucceeds(setDoc(doc(initial,'profiles/recipient'),{role:'member',active:true,permissions:{}}));

  const finding={folio:'SM-HAL-0001',dedupeKey:'r1|0|guarda',risk:'Alto',status:'Abierto',revision:1,ownerAccountId:'advanced-op',unit:'Taller',description:'Sin guarda'};
  await assertFails(setDoc(doc(stranger,'findings/f1'),finding));
  await assertFails(setDoc(doc(limited,'findings/no-permission'),finding));
  await assertFails(setDoc(doc(advanced,'findings/bad-risk'),{...finding,risk:'Extremo'}));
  await assertSucceeds(setDoc(doc(advanced,'findings/f1'),finding));
  await assertSucceeds(getDoc(doc(advanced,'findings/f1')));
  await assertFails(getDoc(doc(limited,'findings/f1')));
  await assertSucceeds(getDoc(doc(initial,'findings/f1')));
  await assertFails(getDocs(collection(advanced,'findings')));
  await assertSucceeds(getDocs(collection(initial,'findings')));
  await assertFails(updateDoc(doc(advanced,'findings/f1'),{revision:5,status:'En proceso'}));
  await assertFails(updateDoc(doc(limited,'findings/f1'),{revision:2,status:'En proceso'}));
  await assertFails(updateDoc(doc(advanced,'findings/f1'),{revision:2,ownerAccountId:'limited-op'}));
  await assertSucceeds(updateDoc(doc(advanced,'findings/f1'),{revision:2,status:'En proceso'}));
  await assertSucceeds(updateDoc(doc(initial,'findings/f1'),{revision:3,status:'Cerrado',verifier:'Administrador'}));
  await assertFails(deleteDoc(doc(initial,'findings/f1')));

  const template={id:'general',name:'Supervisión general',checks:['Cumplimiento de controles'],active:true};
  await assertFails(setDoc(doc(limited,'inspectionTemplates/general'),template));
  await assertSucceeds(setDoc(doc(advanced,'inspectionTemplates/general'),template));
  await assertSucceeds(getDoc(doc(limited,'inspectionTemplates/general')));
  await assertFails(getDoc(doc(stranger,'inspectionTemplates/general')));
  await assertSucceeds(setDoc(doc(initial,'inspectionTemplates/general'),{...template,description:'Plantilla revisada'}));
  await assertFails(deleteDoc(doc(initial,'inspectionTemplates/general')));

  const alert={toAccountId:'recipient',fromAccountId:'advanced-op',event:'hallazgo.critico',text:'Revisar hallazgo',createdAt:serverTimestamp(),read:false};
  await assertSucceeds(setDoc(doc(advanced,'advanceAlerts/a1'),alert));
  await assertSucceeds(getDoc(doc(recipient,'advanceAlerts/a1')));
  await assertFails(getDoc(doc(limited,'advanceAlerts/a1')));
  await assertSucceeds(getDocs(query(collection(recipient,'advanceAlerts'),where('toAccountId','==','recipient'))));
  await assertFails(getDocs(collection(recipient,'advanceAlerts')));
  await assertSucceeds(updateDoc(doc(recipient,'advanceAlerts/a1'),{read:true,readAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(limited,'advanceAlerts/a1'),{read:true}));
  await assertFails(updateDoc(doc(recipient,'advanceAlerts/a1'),{read:true,extra:'no permitido'}));
  await assertFails(deleteDoc(doc(initial,'advanceAlerts/a1')));

  await assertSucceeds(setDoc(doc(advanced,'auditTrail/aud1'),{actorUid:'advanced-op',event:'findings.create',targetCollection:'findings',targetId:'f1',createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(advanced,'auditTrail/aud2'),{actorUid:'forged',event:'findings.create',targetCollection:'findings',createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(advanced,'auditTrail/aud3'),{actorUid:'advanced-op',event:'test',targetCollection:'secret',createdAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(initial,'auditTrail/aud1')));
  await assertFails(getDoc(doc(limited,'auditTrail/aud1')));
  await assertFails(updateDoc(doc(initial,'auditTrail/aud1'),{event:'modificado'}));
  await assertFails(deleteDoc(doc(initial,'auditTrail/aud1')));

  console.log('Bootstrap, transferencia, protección de registros y colecciones aditivas (hallazgos, plantillas, alertas y auditoría): OK');
} finally { await env.cleanup(); }
