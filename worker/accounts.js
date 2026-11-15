const accountHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Cookie, OAI-Sites-Authorization'};
const accountJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:accountHeaders});
const normalizeEmail=e=>String(e||'').trim().toLowerCase();
async function accountId(email){const data=new TextEncoder().encode(normalizeEmail(email)),hash=await crypto.subtle.digest('SHA-256',data);return 'u-'+Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40)}
async function accountRecord(bucket,id){const file=await bucket.get('accounts/'+id+'.json');return file?{record:await file.json(),etag:file.etag}:null}
function ownerProfile(email,name){return {id:'owner',email,name:name||'Administrador Sierra Madre',role:'admin',active:true,unit:'Sierra Madre',isOwner:true,revision:0}}
async function identify(request,env){
 const subject=request.headers.get('oai-authenticated-user-id'),email=normalizeEmail(request.headers.get('oai-authenticated-user-email'));
 if(!subject||!email)return {error:accountJson({error:'Inicia sesión con tu cuenta de ChatGPT.',code:'SIGN_IN_REQUIRED'},401)};
 if(!env.SM_OWNER_EMAIL)return {error:accountJson({error:'La administración de acceso no está configurada.'},503)};
 let name='';const encoded=request.headers.get('oai-authenticated-user-full-name');if(encoded&&request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(encoded)}catch{}}
 if(email===normalizeEmail(env.SM_OWNER_EMAIL))return {user:ownerProfile(email,name),subject};
 const id=await accountId(email),entry=await accountRecord(env.BUCKET,id);
 if(!entry?.record.active)return {error:accountJson({error:'Tu cuenta aún no está autorizada o fue desactivada. Solicita acceso al administrador de seguridad.',code:'ACCOUNT_NOT_ACTIVE'},403)};
 if(entry.record.subject&&entry.record.subject!==subject)return {error:accountJson({error:'La identidad no coincide con la cuenta registrada.'},403)};
 if(!entry.record.subject){entry.record.subject=subject;const result=await env.BUCKET.put('accounts/'+id+'.json',JSON.stringify(entry.record),{onlyIf:{etagMatches:entry.etag}});if(!result)return {error:accountJson({error:'No se pudo confirmar tu cuenta. Vuelve a iniciar sesión.'},409)}}
 return {user:entry.record,subject};
}
const publicUser=u=>({id:u.id,email:u.email,name:u.name,role:u.role,active:u.active,unit:u.unit||'',isOwner:!!u.isOwner,revision:u.revision||0});
const userCanRead=(user,record,collection)=>user.role==='admin'||(collection==='plans'?record.assignedAccountId===user.id:collection==='actions'?(record.assignedAccountId===user.id||record.ownerAccountId===user.id):record.ownerAccountId===user.id);
async function allUsers(env,me){const saved=await readAll(env.BUCKET,'accounts');return [ownerProfile(normalizeEmail(env.SM_OWNER_EMAIL),me.isOwner?me.name:undefined),...saved]}
async function resolveAccount(env,me,id){return (await allUsers(env,me)).find(u=>u.id===id&&u.active)}
function decodeJsonBody(request){return request.text().then(raw=>{if(raw.length>10000000)throw Error('Registro demasiado grande');return JSON.parse(raw)})}
function canAccessNotice(user,n){return user.role==='admin'||n.toAccountId===user.id||n.fromAccountId===user.id}
async function getNotices(env,me){
 const stored=(await readAll(env.BUCKET,'notices')).filter(n=>canAccessNotice(me,n));
 const actions=(await readAll(env.BUCKET,'actions')).filter(a=>userCanRead(me,a,'actions'));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const automatic=actions.filter(a=>(a.status==='Pendiente'&&a.due<today)||(me.role==='admin'&&a.status==='Por verificar')).map(a=>({id:'auto-'+a.id+'-'+a.due+'-'+a.status,type:'Alerta automática',severity:a.status==='Por verificar'?'normal':'urgent',text:a.status==='Por verificar'?'La acción '+a.folio+' está lista para verificar.':'La acción '+a.folio+' venció el '+a.due+'. Revisa el avance y documenta el seguimiento.',fromAccountId:'system',fromName:'Sierra Madre · Sistema',toAccountId:me.id,toName:me.name,created:a.updated||new Date().toISOString(),referenceCollection:'actions',referenceId:a.id,referenceLabel:a.folio,automatic:true}));
 const result=await Promise.all([...stored,...automatic].map(async n=>{const read=await env.BUCKET.get('reads/'+n.toAccountId+'/'+n.id+'.json');return {...n,read:!!read,incoming:n.toAccountId===me.id}}));
 return result.sort((a,b)=>b.created.localeCompare(a.created));
}
async function accountRoutes(request,env,url,me){
 const path=url.pathname;
 if(path==='/api/me'&&request.method==='GET')return accountJson({user:publicUser(me),signInPath:'/signin-with-chatgpt?return_to=%2F',signOutPath:'/signout-with-chatgpt?return_to=%2F'});
 if(path==='/api/directory'&&request.method==='GET')return accountJson((await allUsers(env,me)).filter(u=>u.active).map(u=>({id:u.id,name:u.name,unit:u.unit||'',role:u.role})));
 if(path==='/api/users'){
  if(me.role!=='admin')return accountJson({error:'Solo el administrador puede gestionar usuarios.'},403);
  if(request.method==='GET')return accountJson((await allUsers(env,me)).map(publicUser));
  if(request.method!=='POST')return accountJson({error:'Método no permitido'},405);
  let input;try{input=await decodeJsonBody(request)}catch{return accountJson({error:'Datos de usuario inválidos.'},400)}
  const email=normalizeEmail(input.email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof input.name!=='string'||!input.name.trim()||input.name.length>150||!['admin','member'].includes(input.role)||typeof input.active!=='boolean'||typeof input.unit!=='string'||input.unit.length>200)return accountJson({error:'Completa nombre, correo válido, unidad y rol.'},400);
  if(email===normalizeEmail(env.SM_OWNER_EMAIL))return accountJson({error:'La cuenta propietaria conserva el acceso administrativo.'},400);
  const id=await accountId(email),prior=await accountRecord(env.BUCKET,id),revision=prior?.record.revision||0;const names=await allUsers(env,me);if(names.some(u=>u.id!==id&&norm(u.name)===norm(input.name)))return accountJson({error:'Ya existe una cuenta con ese nombre. Agrega un apellido o identificador para distinguir a los usuarios.'},409);
  if(input.revision!==revision)return accountJson({error:'La cuenta fue actualizada por otro administrador. Recarga la lista.'},409);
  const record={id,email,name:input.name.trim(),unit:input.unit.trim(),role:input.role,active:input.active,subject:prior?.record.subject||null,revision:revision+1,created:prior?.record.created||new Date().toISOString(),updated:new Date().toISOString(),updatedBy:me.id};
  const saved=await env.BUCKET.put('accounts/'+id+'.json',JSON.stringify(record),{onlyIf:prior?{etagMatches:prior.etag}:{etagDoesNotMatch:'*'}});
  return saved?accountJson(publicUser(record)):accountJson({error:'La cuenta cambió durante el guardado. Recarga la lista.'},409);
 }
 if(path==='/api/assignable'&&request.method==='GET'){
  if(me.role!=='admin')return accountJson({error:'Permiso administrativo requerido.'},403);
  const collection=url.searchParams.get('collection');if(!['reports','actions','plans'].includes(collection))return accountJson({error:'Tipo de registro inválido'},400);
  return accountJson((await readAll(env.BUCKET,collection)).map(r=>({id:r.id,label:r.folio||r.person||r.description||r.id,detail:r.supervisor||r.owner||r.period||'',accountId:r.assignedAccountId||r.ownerAccountId||'owner'})));
 }
 if(path==='/api/assign'&&request.method==='POST'){
  if(me.role!=='admin')return accountJson({error:'Permiso administrativo requerido.'},403);
  let input;try{input=await decodeJsonBody(request)}catch{return accountJson({error:'Solicitud inválida'},400)}
  if(!['reports','actions','plans'].includes(input.collection)||typeof input.id!=='string'||!/^[a-zA-Z0-9-]{1,150}$/.test(input.id))return accountJson({error:'Registro inválido'},400);
  const target=await resolveAccount(env,me,input.accountId);if(!target)return accountJson({error:'La cuenta de destino no está activa.'},400);
  const key=input.collection+'/'+input.id+'.json',file=await env.BUCKET.get(key);if(!file)return accountJson({error:'Registro no encontrado'},404);
  const record=await file.json();record.revision=(record.revision||0)+1;record.updated=new Date().toISOString();record.assignedBy=me.id;
  if(input.collection==='reports'){record.ownerAccountId=target.id;record.originalSupervisor=record.originalSupervisor||record.supervisor;record.supervisor=target.name}
  else{record.assignedAccountId=target.id;if(input.collection==='plans')record.person=target.name;else record.owner=target.name}
  if(input.collection==='plans'){const existing=await readAll(env.BUCKET,'plans');if(existing.some(p=>p.id!==record.id&&p.period===record.period&&(p.assignedAccountId===target.id||norm(p.person)===norm(target.name))))return accountJson({error:'Este usuario ya tiene un programa en el mes seleccionado.'},409)}
  const saved=await env.BUCKET.put(key,JSON.stringify(record),{onlyIf:{etagMatches:file.etag}});return saved?accountJson({ok:true}):accountJson({error:'El registro cambió. Recarga antes de asignar.'},409);
 }
 if(path==='/api/notices'){
  if(request.method==='GET')return accountJson(await getNotices(env,me));
  if(request.method!=='POST')return accountJson({error:'Método no permitido'},405);
  let input;try{input=await decodeJsonBody(request)}catch{return accountJson({error:'Aviso inválido.'},400)}
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>5000||!['Alerta','Mensaje','Observación'].includes(input.type)||!['normal','urgent'].includes(input.severity)||!Array.isArray(input.toAccountIds)||!input.toAccountIds.length||input.toAccountIds.length>100)return accountJson({error:'Selecciona destinatarios y escribe el aviso (máximo 5000 caracteres).'},400);
  if(input.type==='Observación'&&me.role!=='admin')return accountJson({error:'Las observaciones de revisión son emitidas por el administrador.'},403);
  let reference=null;
  if(input.referenceId){if(!['reports','actions','plans'].includes(input.referenceCollection)||!/^[a-zA-Z0-9-]{1,150}$/.test(input.referenceId))return accountJson({error:'Referencia inválida'},400);const file=await env.BUCKET.get(input.referenceCollection+'/'+input.referenceId+'.json');reference=file?await file.json():null;if(!reference||!userCanRead(me,reference,input.referenceCollection))return accountJson({error:'Registro no disponible'},404)}
  const users=await allUsers(env,me),targets=[...new Set(input.toAccountIds)].map(id=>users.find(u=>u.id===id&&u.active));
  if(targets.some(u=>!u))return accountJson({error:'Uno de los destinatarios no está activo.'},400);
  if(reference&&targets.some(u=>!userCanRead(u,reference,input.referenceCollection)))return accountJson({error:'Asigna primero el registro al destinatario para compartir una observación vinculada.'},400);
  const created=new Date().toISOString();let count=0;
  for(const target of targets){const id=crypto.randomUUID(),record={id,type:input.type,severity:input.severity,text:input.text.trim(),fromAccountId:me.id,fromName:me.name,toAccountId:target.id,toName:target.name,created,...(reference?{referenceId:reference.id,referenceCollection:input.referenceCollection,referenceLabel:reference.folio||reference.person||reference.id}:{})};await env.BUCKET.put('notices/'+id+'.json',JSON.stringify(record));count++}
  return accountJson({ok:true,count});
 }
 const readMatch=path.match(/^\/api\/notices\/([a-zA-Z0-9-]{1,250})\/read$/);
 if(readMatch&&request.method==='POST'){
  const notice=(await getNotices(env,me)).find(n=>n.id===readMatch[1]&&n.toAccountId===me.id);if(!notice)return accountJson({error:'Aviso no disponible'},404);
  await env.BUCKET.put('reads/'+me.id+'/'+notice.id+'.json',JSON.stringify({at:new Date().toISOString(),by:me.id}));return accountJson({ok:true});
 }
 return null;
}
