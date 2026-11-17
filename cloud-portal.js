import {getFirestore,collection,doc,getDoc,getDocs,query,where,or,runTransaction,setDoc,serverTimestamp,updateDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {initializeApp,deleteApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {and} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {getAuth,createUserWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
export async function connectPortal(app,user,perms,database=null){
 const db=database||getFirestore(app),authority=await getDoc(doc(db,'security','authority')),profile=await getDoc(doc(db,'profiles',user.uid));
 if(!profile.exists()||profile.data().active!==true)throw Error('Tu cuenta no está autorizada. Contacta al administrador.');
 const principalUid=authority.exists()?authority.data().administratorUid:null;
 const isPrincipal=!!principalUid&&principalUid===user.uid;
 const isAdmin=isPrincipal||profile.data().role==='admin';
 const me={...profile.data(),id:user.uid,role:isAdmin?'admin':profile.data().role,isOwner:isPrincipal,isPrincipal};
 if(!isAdmin&&profile.data().role==='admin')throw Error('Tu perfil requiere revisión. Contacta al encargado de la administración.');
 me.permissions={...(perms[me.role]||perms.member),...(me.permissions||{})};
 if(isAdmin)me.permissions={...perms.admin};
 const allProfiles=await getDocs(collection(db,'profiles'));
 const directory=allProfiles.docs.map(d=>({...d.data(),id:d.id})).filter(u=>u.active);
 const clean=x=>JSON.parse(JSON.stringify(x));
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
 const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const unitAllowed=record=>isAdmin||!me.restrictUnits||!me.allowedUnits?.length||me.allowedUnits.some(unit=>normalize(unit)===normalize(record.unit||record.area||record.unidad));
 const owns=record=>record.ownerAccountId===me.id||record.assignedAccountId===me.id;
 async function currentDirectory(){return (await getDocs(collection(db,'profiles'))).docs.map(d=>({...d.data(),id:d.id})).filter(p=>p.active===true);}
 function resolvePerson(people,record,idField,nameField){
  if(!isAdmin)return null;
  const byId=record[idField]&&people.find(p=>p.id===record[idField]);
  if(byId)return {target:byId,matchedBy:'uid',ambiguous:false,missing:false};
  const wanted=normalize(record[nameField]);
  if(!wanted)return {target:null,matchedBy:'none',ambiguous:false,missing:true};
  const matches=people.filter(p=>normalize(p.name)===wanted);
  if(matches.length===1)return {target:matches[0],matchedBy:'name',ambiguous:false,missing:false};
  if(matches.length>1)return {target:null,matchedBy:'name',ambiguous:true,missing:false,matches:matches.map(p=>({id:p.id,name:p.name,unit:p.unit||''}))};
  return {target:null,matchedBy:'name',ambiguous:false,missing:true};
 }
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
   let documents;
   if(['reports','actions','plans'].includes(col)&&!isAdmin&&me.restrictUnits&&me.allowedUnits?.length){
     // Legacy unit aliases remain readable; query constraints enforce the same server rules.
     const found=new Map();
     for(const unit of me.allowedUnits)for(const field of ['unit','area','unidad']){
       const constraints=[where(field,'==',unit)];
       if(!seesAllRecords)constraints.push(or(where('ownerAccountId','==',me.id),where('assignedAccountId','==',me.id)));
       for(const document of (await getDocs(query(collection(db,col),and(...constraints)))).docs)found.set(document.id,document);
     }
     documents=[...found.values()];
   }else documents=(await getDocs(target)).docs;
   const rows=await Promise.all(documents.map(async d=>{
     const row={...d.data(),id:d.id};
     if(row.photoChunkIds?.length){
       let raw='';const missingChunks=[];
       for(const key of row.photoChunkIds){
         const chunk=await getDoc(doc(db,'evidenceChunks',key));
         if(!chunk.exists()){missingChunks.push(key);continue;}
         raw+=chunk.data().payload||'';
       }
       if(raw){
         try{row.photos=JSON.parse(raw);}catch{row._photoRecoveryError='Los datos de evidencia están dañados o incompletos.';}
       }
       if(missingChunks.length){
         row._missingPhotoChunks=missingChunks;
         row._photoRecoveryError=row._photoRecoveryError||('No se pudieron recuperar '+missingChunks.length+' fragmento(s) de evidencia. Se conservaron los fragmentos disponibles.');
       }
     }
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
     if(col==='directory')return response((await currentDirectory()).map(u=>({id:u.id,name:u.name,unit:u.unit||'',role:u.role})));
     if(col==='users'){
       if(!isAdmin)return response({error:'Permiso administrativo requerido.'},403);
       if(method==='GET')return response((await getDocs(collection(db,'profiles'))).docs.map(d=>({...d.data(),id:d.id,isOwner:d.id===principalUid})));
       if(method==='DELETE'){
         if(id===principalUid)throw Error('No puedes desactivar la cuenta del encargado principal. Transfiere la administración primero.');
         if(id===me.id)throw Error('No puedes desactivar tu propia cuenta administrativa.');
         await updateDoc(doc(db,'profiles',id),{active:false});return response({ok:true});
       }
       if(!['POST','PUT'].includes(method))return response({error:'Método no permitido.'},405);
       const profiles=(await getDocs(collection(db,'profiles'))).docs;
       const email=String(body.email||'').trim().toLowerCase();
       const existing=body.id?profiles.find(d=>d.id===body.id):profiles.find(d=>d.data().email?.toLowerCase()===email);
       if(body.id&&!existing)throw Error('Usuario no encontrado. Recarga la lista.');
       if(!email||!String(body.name||'').trim())throw Error('Completa el nombre y el correo.');
       if(profiles.some(d=>d.id!==existing?.id&&d.data().email?.toLowerCase()===email))throw Error('Ese correo ya está asignado.');
       if(existing&&existing.data().email?.toLowerCase()!==email)throw Error('El correo de acceso debe cambiarse mediante Firebase Authentication antes de actualizar el perfil.');
       let uid=existing?.id;
       if(existing&&body.password)throw Error('Para cambiar una contraseña existente, usa Recuperar contraseña en el acceso. Los permisos se guardan dejando este campo vacío.');
       if(body.role==='admin'&&!isPrincipal)throw Error('Solo el encargado principal puede asignar el rol de administrador.');
       if(!uid){
         if(!body.password||body.password.length<8)throw Error('La contraseña inicial requiere al menos 8 caracteres.');
         const secondary=initializeApp(app.options,'create-user-'+crypto.randomUUID());
         try{const account=await createUserWithEmailAndPassword(getAuth(secondary),body.email,body.password);uid=account.user.uid;await signOut(getAuth(secondary));}finally{await deleteApp(secondary);}
       }
       const {password,...fields}=body;
       const saved=await runTransaction(db,async tx=>{
         const ref=doc(db,'profiles',uid),snap=await tx.get(ref),prior=snap.exists()?snap.data():null;
         if((body.revision||0)!==(prior?.revision||0))throw Error('CONFLICT');
         if(uid===principalUid&&(fields.active===false||fields.role!=='admin'))throw Error('Transfiere la administración antes de cambiar el rol o desactivar la cuenta del encargado principal.');
         const record=clean({...prior,...fields,email,id:uid,isOwner:uid===principalUid,revision:(prior?.revision||0)+1,created:prior?.created||new Date().toISOString(),updated:new Date().toISOString()});
         tx.set(ref,record);return record;
       });
       return response(saved);
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
       if(method==='DELETE')return response({error:'Los avisos conservan su historial y no se eliminan de la nube.'},405);
       if(method!=='POST')return response({error:'Método no permitido.'},405);
       if(!me.permissions.send_notices&&!isAdmin)return response({error:'No tienes permiso para enviar avisos.'},403);
       const targets=[...new Set(Array.isArray(body.toAccountIds)?body.toAccountIds:[])];
       const recipients=await currentDirectory();
       if(!targets.length||targets.length>300||targets.some(id=>!recipients.some(p=>p.id===id)))throw Error('Selecciona destinatarios activos válidos.');
       if(typeof body.text!=='string'||!body.text.trim()||body.text.length>5000)throw Error('Escribe un aviso de hasta 5000 caracteres.');
       if(body.type==='Observación'&&!isAdmin)throw Error('Las observaciones requieren permiso administrativo.');
       const batch=writeBatch(db);
       const attachmentRefs=[];
       for(const a of (Array.isArray(body.attachments)?body.attachments:[]).slice(0,10)){
         if(!a||!a.dataUrl)continue;
         if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(a.dataUrl))throw Error('Adjunta una imagen JPEG, PNG o WebP válida.');
         if(String(a.dataUrl).length>900000)throw Error('Una imagen es demasiado grande para la nube. Adjúntala de nuevo para reducirla.');
         const imageRef=doc(collection(db,'noticeImages'));
         batch.set(imageRef,clean({name:String(a.name||'imagen').slice(0,120),type:String(a.type||'image/jpeg').slice(0,40),dataUrl:String(a.dataUrl),fromAccountId:me.id,toAccountIds:targets,created:new Date().toISOString()}));
         attachmentRefs.push({id:imageRef.id,name:String(a.name||'imagen').slice(0,120),type:String(a.type||'image/jpeg').slice(0,40)});
       }
       for(const target of targets){
         const recipient=recipients.find(u=>u.id===target);
         const ref=doc(collection(db,'notices'));
         batch.set(ref,clean({id:ref.id,type:body.type||'Mensaje',severity:body.severity||'normal',text:body.text.trim(),fromAccountId:me.id,fromName:me.name,toAccountId:target,toName:recipient.name,created:new Date().toISOString(),referenceId:body.referenceId,referenceCollection:body.referenceCollection,referenceLabel:body.referenceLabel,legacyId:body.legacyId||null,attachments:attachmentRefs}));
       }
       await batch.commit();
       return response({count:targets.length});
     }
     if(['reports','actions','plans'].includes(col)){
       if(method==='GET'){const rows=await list(col);return response(id?rows.find(row=>row.id===id)||null:rows);}
              if(method==='DELETE'&&id){
         return response({error:'Los registros y su historial se conservan en la nube; no se eliminan.'},405);
       }
       if(!['PUT','POST'].includes(method))return response({error:'Método no permitido.'},405);
       
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
       const recordId=id||body.id;
       if(typeof recordId!=='string'||!recordId||recordId.includes('/'))throw Error('El registro requiere un identificador válido.');
       const reference=doc(db,col,recordId);
       const photoChunkIds=[];
       if(body.photos?.length){
         const raw=JSON.stringify(body.photos),version=crypto.randomUUID();
         for(let offset=0;offset<raw.length;offset+=120000){
           const key=recordId+'-'+version+'-'+photoChunkIds.length;
           await setDoc(doc(db,'evidenceChunks',key),{ownerAccountId:me.id,recordCollection:col,recordId,payload:raw.slice(offset,offset+120000)});photoChunkIds.push(key);
         }
       }
       const people=isAdmin?await currentDirectory():[];
       const saved=await runTransaction(db,async tx=>{
         const prior=await tx.get(reference),old=prior.exists()?prior.data():null;
         if((body.revision||0)!==(old?.revision||0))throw Error('CONFLICT');
         if(!isAdmin&&old&&(!owns(old)||!unitAllowed(old)))throw Error('No tienes acceso a este registro.');
         let record={...body,id:recordId,ownerAccountId:(isAdmin&&body.ownerAccountId)||old?.ownerAccountId||me.id,revision:(old?.revision||0)+1,updated:new Date().toISOString(),updatedBy:me.name};
         if(!isAdmin){
           if(old?.assignedAccountId)record.assignedAccountId=old.assignedAccountId;else if(col!=='reports')record.assignedAccountId=me.id;else delete record.assignedAccountId;
           if(col==='reports'&&!old)record.supervisor=me.name;
           if(col==='actions'&&old){
             if(old.status==='Cerrado')throw Error('La acción cerrada requiere revisión administrativa.');
             for(const key of ['description','owner','unit','requester','source','start','due','priority'])record[key]=old[key];
           }
         }else if(col!=='reports'){
           const resolved=resolvePerson(people,record,'assignedAccountId',col==='plans'?'person':'owner');
           if(resolved?.target){record.assignedAccountId=resolved.target.id;record[col==='plans'?'person':'owner']=resolved.target.name;}
           else if(resolved?.ambiguous){
             // No reasignar automáticamente cuando la identidad es ambigua; conservar UID/nombre existentes.
             record._identityWarning='Responsable ambiguo: existen varias cuentas con el mismo nombre. Revisa y asigna por UID.';
           }
         }
         if(col==='actions'){
           if(!['Pendiente','Por verificar','Cerrado'].includes(record.status)||!Number.isInteger(record.progress)||record.progress<0||record.progress>100)throw Error('Estado o avance de acción inválido.');
           if(!validDate(record.start)||!validDate(record.due)||record.start>record.due)throw Error('Revisa las fechas de inicio y compromiso.');
           if(record.status!=='Pendiente'&&record.progress!==100)throw Error('Completa el 100% antes de solicitar verificación.');
           if(record.status==='Cerrado'&&(!validDate(record.verifiedDate)||record.verifiedDate<record.start))throw Error('El cierre requiere una fecha de verificación válida.');
           record.history=[...(old?.history||[]),{at:record.updated,by:me.name,status:record.status,progress:record.progress,comment:body.newComment||'Actualización de seguimiento.'}];delete record.newComment;
           if(record.status==='Cerrado'){if(!isAdmin)throw Error('El cierre requiere verificación administrativa.');record.verifier=me.name;}
           else{record.verifier='';record.verifiedDate='';}
         }
         const safe=clean({...record,photos:body.photos===undefined?(old?.photos||[]):[],photoChunkIds:body.photos===undefined?(old?.photoChunkIds||[]):photoChunkIds});
         if(new TextEncoder().encode(JSON.stringify(safe)).length>850000)throw Error('El registro excede el límite de esta versión. Conserva las fotografías y reduce su tamaño antes de guardar.');
         tx.set(reference,safe);return safe;
       });
       if(body.photos===undefined)return response((await list(col)).find(row=>row.id===recordId)||saved);
       return response({...saved,photos:body.photos});
     }
     if(col==='assignable'&&isAdmin){const name=url.searchParams.get('collection');if(!['reports','actions','plans'].includes(name))throw Error('Colección inválida');return response((await list(name)).map(r=>({id:r.id,label:r.folio||r.person||r.id,detail:r.supervisor||r.owner||'',accountId:r.assignedAccountId||r.ownerAccountId})));}
     if(col==='assign'&&isAdmin){
       if(!['reports','actions','plans'].includes(body.collection))throw Error('Colección inválida');
       const target=(await currentDirectory()).find(p=>p.id===body.accountId);if(!target)throw Error('Selecciona una cuenta activa.');
       await runTransaction(db,async tx=>{const ref=doc(db,body.collection,body.id),snap=await tx.get(ref);if(!snap.exists())throw Error('Registro no encontrado.');const old=snap.data();
         const fields={assignedAccountId:target.id,updated:new Date().toISOString(),updatedBy:me.name,revision:(old.revision||0)+1};
         if(body.collection==='reports'){fields.ownerAccountId=target.id;fields.supervisor=target.name;}
         else fields[body.collection==='plans'?'person':'owner']=target.name;
         tx.update(ref,fields);
       });return response({ok:true});
     }
     if(col==='inconsistencies'){
       if(!isAdmin)return response({error:'Permiso administrativo requerido.'},403);
       const people=await currentDirectory();
       const [reports,actions,plans]=await Promise.all([list('reports'),list('actions'),list('plans')]);
       const nameGroups={}; for(const p of people){const k=normalize(p.name);if(!k)continue;(nameGroups[k]=nameGroups[k]||[]).push({id:p.id,name:p.name,unit:p.unit||''});}
       const homonyms=Object.values(nameGroups).filter(g=>g.length>1);
       const issues=[];
       const referencedChunks=new Set();
       const check=(collection,rows,idField,nameField)=>{
         for(const row of rows){
           if(Array.isArray(row.photoChunkIds)) for(const id of row.photoChunkIds) referencedChunks.add(id);
           if(row._missingPhotoChunks?.length) issues.push({collection,id:row.id,label:row.folio||row.id,type:'evidencia_incompleta',detail:'Faltan '+row._missingPhotoChunks.length+' fragmento(s) de evidencia referenciados.',chunks:row._missingPhotoChunks.slice(0,20)});
           const wanted=normalize(row[nameField]);
           const byId=row[idField]&&people.find(p=>p.id===row[idField]);
           const matches=wanted?people.filter(p=>normalize(p.name)===wanted):[];
           if(row[idField]&&!byId)issues.push({collection,id:row.id,label:row.folio||row.id,type:'uid_sin_perfil',detail:'El UID asignado no corresponde a un perfil activo.',name:row[nameField]||'',uid:row[idField]});
           if(!row[idField]&&wanted&&matches.length===0)issues.push({collection,id:row.id,label:row.folio||row.id,type:'responsable_sin_cuenta',detail:'El nombre no coincide con una cuenta activa.',name:row[nameField]||''});
           if(!wanted)issues.push({collection,id:row.id,label:row.folio||row.id,type:'responsable_vacio',detail:'No tiene responsable/nombre válido.',name:''});
           if(!row[idField]&&matches.length>1)issues.push({collection,id:row.id,label:row.folio||row.id,type:'homonimo',detail:'Varias cuentas activas tienen el mismo nombre normalizado.',name:row[nameField]||'',matches:matches.map(p=>({id:p.id,name:p.name,unit:p.unit||''}))});
         }
       };
       check('reports',reports,'ownerAccountId','supervisor');
       check('actions',actions,'assignedAccountId','owner');
       check('plans',plans,'assignedAccountId','person');
       let orphanChunks=[];
       try{
         const chunks=await getDocs(collection(db,'evidenceChunks'));
         orphanChunks=chunks.docs.filter(d=>!referencedChunks.has(d.id)).map(d=>({id:d.id,recordCollection:d.data().recordCollection||'',recordId:d.data().recordId||'',ownerAccountId:d.data().ownerAccountId||''})).slice(0,500);
       }catch(e){ issues.push({collection:'evidenceChunks',id:'',label:'evidenceChunks',type:'orphan_scan_unavailable',detail:'No se pudo listar fragmentos para detectar huérfanos: '+(e.message||e)}); }
       return response({generatedAt:new Date().toISOString(),homonyms,issues,orphanChunks,counts:{reports:reports.length,actions:actions.length,plans:plans.length,issues:issues.length,referencedChunks:referencedChunks.size,orphanChunks:orphanChunks.length}});
     }
     return response({error:'Operación pendiente de integración.'},404);
   }catch(error){return response({error:error.message},error.message==='CONFLICT'?409:403);}
 };
 return {db,me,directory,users:isAdmin?allProfiles.docs.map(d=>({...d.data(),id:d.id})):[],list,updateName:name=>updateDoc(doc(db,'profiles',me.id),{name})};
}

