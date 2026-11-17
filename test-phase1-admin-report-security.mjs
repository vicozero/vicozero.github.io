import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,collection,getDocs,getDoc} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';

// Verifica que los datos usados por /api/inconsistencies estén protegidos por
// Firestore/Storage rules, no solo por la comprobación isAdmin del portal.
const env=await initializeTestEnvironment({
  projectId:'demo-sierra-madre',
  firestore:{host:'127.0.0.1',port:8087,rules:fs.readFileSync('firestore.rules','utf8')},
  storage:{host:'127.0.0.1',port:9199,rules:fs.readFileSync('storage.rules','utf8')}
});
const admin='qa-admin',operator='qa-op',outsider='qa-out';
const restricted={reports:false,actions:false,plans:false,view_all:false};
try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await setDoc(doc(db,'security/authority'),{administratorUid:admin});
    await setDoc(doc(db,'profiles',admin),{id:admin,name:'Admin QA',role:'admin',active:true});
    await setDoc(doc(db,'profiles',operator),{id:operator,name:'Op QA',role:'operator',active:true,permissions:restricted});
    await setDoc(doc(db,'profiles',outsider),{id:outsider,name:'Out QA',role:'operator',active:true,permissions:restricted});
    for(const kind of ['reports','actions','plans']){
      const base={id:'r-'+kind,status:'Borrador',revision:1,ownerAccountId:admin,unit:'Mina'};
      if(kind==='reports')Object.assign(base,{type:'inspection',date:'2026-11-01',supervisor:'Admin QA'});
      if(kind==='actions')Object.assign(base,{progress:0,start:'2026-11-01',due:'2026-11-20',description:'Acción QA'});
      await setDoc(doc(db,kind,'r-'+kind),base);
    }
    await setDoc(doc(db,'evidenceChunks','chunk-1'),{ownerAccountId:admin,recordCollection:'reports',recordId:'r-reports',payload:'x'});
  });

  const adminDb=env.authenticatedContext(admin).firestore();
  const opDb=env.authenticatedContext(operator).firestore();
  const outDb=env.authenticatedContext(outsider).firestore();
  const anonDb=env.unauthenticatedContext().firestore();

  for(const kind of ['reports','actions','plans']){
    await assertSucceeds(getDocs(collection(adminDb,kind)),'admin debe listar '+kind);
    await assertFails(getDocs(collection(opDb,kind)),'operador sin permisos no debe listar '+kind);
    await assertFails(getDocs(collection(outDb,kind)),'otro operador no debe listar '+kind);
    await assertFails(getDocs(collection(anonDb,kind)),'anónimo no debe listar '+kind);
  }
  await assertSucceeds(getDoc(doc(adminDb,'reports/r-reports')),'admin debe leer el registro');
  await assertFails(getDoc(doc(opDb,'reports/r-reports')),'operador no debe leer registro ajeno');

  await assertSucceeds(getDocs(collection(adminDb,'evidenceChunks')),'admin debe listar fragmentos');
  await assertFails(getDocs(collection(opDb,'evidenceChunks')),'operador no debe listar fragmentos');
  await assertFails(getDocs(collection(anonDb,'evidenceChunks')),'anónimo no debe listar fragmentos');

  const path='evidence/reports/r-reports/photo.png';
  await env.withSecurityRulesDisabled(async c=>{
    await uploadBytes(ref(c.storage(),path),new Uint8Array([1,2,3]),{contentType:'image/png'});
  });
  await assertSucceeds(getBytes(ref(env.authenticatedContext(admin).storage(),path)),'admin debe leer evidencia');
  await assertFails(getBytes(ref(env.authenticatedContext(operator).storage(),path)),'operador sin view_all no debe leer evidencia ajena');
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),path)),'anónimo no debe leer evidencia');

  console.log('Reporte admin: fuentes protegidas por reglas (Firestore + Storage), no solo por JS del navegador: OK');
}finally{await env.cleanup();}
