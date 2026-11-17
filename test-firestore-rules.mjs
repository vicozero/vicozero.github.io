import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
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
  console.log('Bootstrap, varios administradores, transferencia, revocación y protección de registros: OK');
} finally { await env.cleanup(); }
