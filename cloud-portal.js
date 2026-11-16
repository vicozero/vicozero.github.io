import {getFirestore,collection,doc,getDoc,getDocs,query,where,or,runTransaction,setDoc,serverTimestamp,updateDoc} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {initializeApp,deleteApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {getAuth,createUserWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
export async function connectPortal(app,user,perms,database=null){
 const db=database||getFirestore(app),authority=await getDoc(doc(db,'security','authority')),profile=await getDoc(doc(db,'profiles',user.uid));
 if(!profile.exists()||profile.data().active!==true)throw Error('Tu cuenta no está autorizada. Contacta al administrador.');
 const isAdmin=authority.exists()&&authority.data().administratorUid===user.uid;
 const me={...profile.data(),id:user.uid,role:isAdmin?'admin':profile.data().role,isOwner:isAdmin};
 if(!isAdmin&&me.role==='admin')throw Error('La administración de esta cuenta ha cambiado. Solicita revisar su perfil.');
 me.permissions={...(perms[me.role]||perms.member),...(me.permissions||{})};
 if(isAdmin)me.permissions={...perms.admin};
 const allProfiles=await getDocs(collection(db,'profiles'));
 const directory=allProfiles.docs.map(d=>({...d.data(),id:d.id})).filter(u=>u.active);
 const clean=x=>JSON.parse(JSON.stringify(x));
 async function list(col){
   let target=collection(db,col);
   const seesAllRecords=isAdmin||!!(me.permissions&&me.permissions.view_all);
   if(col==='notices'){
     if(!isAdmin)target=query(target,or(where('toAccountId','==',me.id),where('fromAccountId','==',me.id)));
   }else if(col==='sessions'){
     if(!isAdmin)target=query(target,where('userId','==',me.id));
   }else if(!seesAllRecords){
     target=query(target,or(where('ownerAccountId','==',me.id),where('assignedAccountId','==',me.id)));
   }
   const rows=await Promise.all((await getDocs(target)).docs.map(async d=>{
     const row={...d.data(),id:d.id};
     if(row.photoChunkIds?.length){let raw='';for(const key of row.photoChunkIds){const chunk=await getDoc(doc(db,'evidenceChunks',key));if(!chunk.exists())throw Error('No se pudo recuperar una evidencia.');raw+=chunk.data().payload;}row.photos=JSON.parse(raw);}
     if(col==='notices'&&Array.isArray(row.attachments)&&row.attachments.length){
       const images=await Promise.all(row.attachments.map(async a=>{
         if(!a||!a.id)return null;
         const snap=await getDoc(doc(db,'noticeImages',a.id));
         return snap.exists()?{id:a.id,name:a.name||snap.data().name||'Imagen',type:a.type||snap.data().type||'image/jpeg',dataUrl:snap.data().dataUrl}:null;
       }));
       row.attachments=images.filter(Boolean);
     }
     return row;
   }));
   if(['reports','actions','plans'].includes(col)&&!isAdmin&&me.restrictUnits&&Array.isArray(me.allowedUnits)&&me.allowedUnits.length){
     const allowed=me.allowedUnits.map(u=>String(u).toLowerCase().trim());
     return rows.filter(r=>{const unit=String(r.unit||r.area||r.unidad||'').toLowerCase().trim();return allowed.includes(unit);});
   }
   return rows;
 }
 const nativeFetch=window.fetch.bind(window);
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 window.fetch=async(input,init={})=>{
   const path=typeof input==='string'?input:input.url;
   if(!path.startsWith('/api/'))return nativeFetch(input,init);
   try{
     const url=new URL(path,location.origin),parts=url.pathname.slice(5).split('/'),[col,id]=parts;
     const method=(init.method||'GET').toUpperCase(),body=init.body?JSON.parse(init.body):{};
     if(col==='me')return response({user:me});
     if(col==='directory')return response(directory.map(u=>({id:u.id,name:u.name,unit:u.unit||'',role:u.role})));
     if(col==='users'){
       if(!isAdmin)return response({error:'Permiso administrativo requerido.'},403);
       if(method==='GET')return response((await getDocs(collection(db,'profiles'))).docs.map(d=>({...d.data(),id:d.id})));
       if(method==='DELETE'){await updateDoc(doc(db,'profiles',id),{active:false});return response({ok:true});}
       const existing=(await getDocs(collection(db,'profiles'))).docs.find(d=>d.data().email?.toLowerCase()===body.email?.toLowerCase());
       let uid=existing?.id;
       if(existing&&body.password)throw Error('Para cambiar una contraseña existente, usa Recuperar contraseña en el acceso. Los permisos se guardan dejando este campo vacío.');
       if(body.role==='admin'&&!(isAdmin&&existing?.id===me.id))throw Error('La administración principal se transfiere desde la configuración central. Selecciona operador o usuario operativo.');
       if(!uid){
         if(!body.password||body.password.length<8)throw Error('La contraseña inicial requiere al menos 8 caracteres.');
         const secondary=initializeApp(app.options,'create-user-'+crypto.randomUUID());
         try{const account=await createUserWithEmailAndPassword(getAuth(secondary),body.email,body.password);uid=account.user.uid;await signOut(getAuth(secondary));}finally{await deleteApp(secondary);}
       }
       const {password,...fields}=body;
       await setDoc(doc(db,'profiles',uid),clean({...existing?.data(),...fields,id:uid,revision:(existing?.data().revision||0)+1,created:existing?.data().created||new Date().toISOString(),updated:new Date().toISOString()}));
       return response({id:uid,...fields});
     }
     if(col==='notices'&&id&&parts[2]==='read'){
       await setDoc(doc(db,'noticeReads',me.id,'items',id),{at:serverTimestamp()});return response({ok:true});
     }
     if(col==='notices'){
       if(method==='GET'){
         const notices=await list(col);
         const result=await Promise.all(notices.map(async n=>({...n,incoming:n.toAccountId===me.id,read:(await getDoc(doc(db,'noticeReads',n.toAccountId,'items',n.id))).exists()})));
         return response(result.sort((a,b)=>String(b.created||'').localeCompare(String(a.created||''))));
       }
       if(!me.permissions.send_notices&&!isAdmin)return response({error:'No tienes permiso para enviar avisos.'},403);
       const targets=[...new Set(body.toAccountIds||[])];
       const attachmentRefs=[];
       for(const a of (Array.isArray(body.attachments)?body.attachments:[]).slice(0,10)){
         if(!a||!a.dataUrl)continue;
         if(String(a.dataUrl).length>900000)throw Error('Una imagen es demasiado grande para la nube. Adjúntala de nuevo para reducirla.');
         const imageRef=doc(collection(db,'noticeImages'));
         await setDoc(imageRef,clean({name:String(a.name||'imagen').slice(0,120),type:String(a.type||'image/jpeg').slice(0,40),dataUrl:String(a.dataUrl),fromAccountId:me.id,toAccountIds:targets,created:new Date().toISOString()}));
         attachmentRefs.push({id:imageRef.id,name:String(a.name||'imagen').slice(0,120),type:String(a.type||'image/jpeg').slice(0,40)});
       }
       for(const target of targets){
         const recipient=directory.find(u=>u.id===target);if(!recipient)throw Error('Destinatario no disponible.');
         const ref=doc(collection(db,'notices'));
         await setDoc(ref,clean({id:ref.id,type:body.type||'Mensaje',severity:body.severity||'normal',text:body.text,fromAccountId:me.id,fromName:me.name,toAccountId:target,toName:recipient.name,created:new Date().toISOString(),referenceId:body.referenceId,referenceCollection:body.referenceCollection,referenceLabel:body.referenceLabel,legacyId:body.legacyId||null,attachments:attachmentRefs}));
       }
       return response({count:targets.length});
     }
     if(['reports','actions','plans'].includes(col)){
       if(method==='GET')return response(await list(col));
       if(method!=='PUT')throw Error('Operación no disponible.');
       if(!isAdmin&&me.restrictUnits&&Array.isArray(me.allowedUnits)&&me.allowedUnits.length){
         const unit=String(body.unit||body.area||body.unidad||'').toLowerCase().trim();
         if(unit&&!me.allowedUnits.map(u=>String(u).toLowerCase().trim()).includes(unit))throw Error('No tienes permiso para esta unidad/área.');
       }
       if(!isAdmin&&col==='reports'&&!me.permissions.edit_reports)throw Error('No tienes permiso para editar formatos.');
       if(!isAdmin&&col==='actions'&&!me.permissions.edit_actions)throw Error('No tienes permiso para editar acciones.');
       if(!isAdmin&&col==='plans')throw Error('El programa mensual solo lo administra la cuenta principal.');
       if(col==='reports'&&['veo','incident','training'].includes(body.type)){
         if(!['Borrador','Finalizado'].includes(body.status))throw Error('Estado de formato inválido.');
         if(body.status==='Finalizado'){
           if(!globalThis.SAFETY?.validateOperationalReport)throw Error('Recarga la página para validar el formato.');
           const error=globalThis.SAFETY.validateOperationalReport(body);if(error)throw Error(error);
         }
       }
       const reference=doc(db,col,id);
       const photoChunkIds=[];
       if(body.photos?.length){
         const raw=JSON.stringify(body.photos),version=crypto.randomUUID();
         for(let offset=0;offset<raw.length;offset+=120000){
           const key=id+'-'+version+'-'+photoChunkIds.length;
           await setDoc(doc(db,'evidenceChunks',key),{ownerAccountId:me.id,recordCollection:col,recordId:id,payload:raw.slice(offset,offset+120000)});photoChunkIds.push(key);
         }
       }
       const saved=await runTransaction(db,async tx=>{
         const prior=await tx.get(reference),old=prior.exists()?prior.data():null;
         if((body.revision||0)!==(old?.revision||0))throw Error('CONFLICT');
         let record={...body,id,ownerAccountId:(isAdmin&&body.ownerAccountId)||old?.ownerAccountId||me.id,revision:(old?.revision||0)+1,updated:new Date().toISOString(),updatedBy:me.name};
         if(col==='actions'){
           record.history=[...(old?.history||[]),{at:record.updated,by:me.name,status:record.status,progress:record.progress,comment:body.newComment||'Actualización de seguimiento.'}];delete record.newComment;
           if(record.status==='Cerrado'){if(!isAdmin)throw Error('El cierre requiere verificación administrativa.');record.verifier=me.name;}
         }
         const safe=clean({...record,photos:[],photoChunkIds});
         if(new TextEncoder().encode(JSON.stringify(safe)).length>850000)throw Error('El registro excede el límite de esta versión. Conserva las fotografías y reduce su tamaño antes de guardar.');
         tx.set(reference,safe);return safe;
       });
       return response({...saved,photos:body.photos||[]});
     }
     if(col==='assignable'&&isAdmin){const name=url.searchParams.get('collection');if(!['reports','actions','plans'].includes(name))throw Error('Colección inválida');return response((await list(name)).map(r=>({id:r.id,label:r.folio||r.person||r.id,detail:r.supervisor||r.owner||'',accountId:r.assignedAccountId||r.ownerAccountId})));}
     if(col==='assign'&&isAdmin){if(!['reports','actions','plans'].includes(body.collection))throw Error('Colección inválida');await updateDoc(doc(db,body.collection,body.id),{assignedAccountId:body.accountId});return response({ok:true});}
     return response({error:'Operación pendiente de integración.'},404);
   }catch(error){return response({error:error.message},error.message==='CONFLICT'?409:403);}
 };
 return {db,me,directory,users:isAdmin?allProfiles.docs.map(d=>({...d.data(),id:d.id})):[],list,updateName:name=>updateDoc(doc(db,'profiles',me.id),{name})};
}

