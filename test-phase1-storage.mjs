import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';
import {ref,uploadBytes,getMetadata,deleteObject} from 'firebase/storage';
const env=await initializeTestEnvironment({projectId:'demo-sierra-madre',firestore:{host:'127.0.0.1',port:8087},storage:{host:'127.0.0.1',port:9199,rules:fs.readFileSync('storage.rules','utf8')}});
try{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,'security/authority'),{administratorUid:'admin-test'});
  for(const [id,extra] of [['owner-test',{}],['other-test',{}],['inactive-test',{active:false}],['unit-test',{restrictUnits:true,allowedUnits:['Mina']}],['readonly-test',{permissions:{edit_reports:false}}]])await setDoc(doc(db,'profiles',id),{active:true,role:'operator',...extra});
  await setDoc(doc(db,'reports/evidence-test'),{ownerAccountId:'owner-test',assignedAccountId:'readonly-test',unit:'Taller'});
  await setDoc(doc(db,'reports/unit-test'),{ownerAccountId:'unit-test',unit:'Taller'});
  await setDoc(doc(db,'notices/notice-test'),{fromAccountId:'owner-test',toAccountId:'readonly-test'});
 });
 const object=(id,path)=>ref((id?env.authenticatedContext(id):env.unauthenticatedContext()).storage(),path);
 const path='evidence/reports/evidence-test/photo.png',bytes=new Uint8Array([1,2,3]),options={contentType:'image/png'};
 await assertSucceeds(uploadBytes(object('owner-test',path),bytes,options));
 await assertSucceeds(getMetadata(object('readonly-test',path)));
 for(const id of [null,'other-test','inactive-test'])await assertFails(getMetadata(object(id,path)));
 await assertFails(uploadBytes(object('readonly-test','evidence/reports/evidence-test/other.png'),bytes,options));
 await assertFails(uploadBytes(object('owner-test',path),new Uint8Array([4,5,6,7]),options));
 await assertFails(deleteObject(object('owner-test',path)));
 await assertFails(uploadBytes(object('unit-test','evidence/reports/unit-test/photo.png'),bytes,options));
 await assertSucceeds(uploadBytes(object('owner-test','notices/notice-test/photo.png'),bytes,options));
 await assertSucceeds(getMetadata(object('readonly-test','notices/notice-test/photo.png')));
 await assertFails(getMetadata(object('other-test','notices/notice-test/photo.png')));
 await assertFails(uploadBytes(object('readonly-test','notices/notice-test/reply.png'),bytes,options));
 console.log('Storage: aislamiento, cuentas inactivas, unidad, solo lectura, destinatarios y evidencias inmutables: OK');
}finally{await env.cleanup();}
