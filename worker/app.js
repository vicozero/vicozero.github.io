const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const required=(r,keys)=>keys.every(k=>typeof r[k]==='string'&&r[k].trim()&&r[k].length<=12000);
async function readAll(bucket,collection){let cursor,items=[];do{const result=await bucket.list({prefix:collection+'/',cursor,limit:100});const fetched=await Promise.all(result.objects.map(async obj=>{const file=await bucket.get(obj.key);return file?file.json():null}));items.push(...fetched.filter(Boolean));cursor=result.truncated?result.cursor:undefined}while(cursor);return items;}
function validate(record,collection){
 if(!Number.isInteger(record.revision)||record.revision<0)return 'La revisión del registro es inválida.';
 if(collection==='reports'){const safetyError=validateSafetyReport(record);if(safetyError)return safetyError;if(!Array.isArray(record.photos)||record.photos.length>6||record.photos.some(p=>!p||typeof p.data!=='string'||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]*={0,2}$/.test(p.data)||typeof p.caption!=='string'||p.caption.length>1500))return 'Las fotografías del formato no son válidas.';if(!['Borrador','Finalizado'].includes(record.status)||!['leadership','unsafe','inspection','pst','talk','area','eppPlant','eppWelder','risk','critical','flash'].includes(record.type)||typeof record.supervisor!=='string'||!Array.isArray(record.photos)||record.photos.length>6)return 'Formato inválido.';return ''}
 if(collection==='actions'){
  if(!required(record,['folio','description','owner','unit','requester','source','start','due','priority']))return 'Completa descripción, responsable, unidad, solicitante y fechas.';
  if(!validDate(record.start)||!validDate(record.due)||record.start>record.due)return 'Las fechas de la acción son inválidas.';
  if(!['Pendiente','Por verificar','Cerrado'].includes(record.status)||!Number.isInteger(record.progress)||record.progress<0||record.progress>100)return 'Estado o porcentaje de avance inválido.';
  if(record.status!=='Pendiente'&&record.progress!==100)return 'La acción debe tener 100% de avance antes de verificar o cerrar.';
  if(record.status==='Cerrado'&&(!required(record,['verifier'])||!validDate(record.verifiedDate)||record.verifiedDate<record.start||record.verifiedDate>new Date().toISOString().slice(0,10)))return 'El cierre requiere responsable y fecha de verificación válidos.';
  if(!Array.isArray(record.photos)||record.photos.length>6||record.photos.some(p=>!p||typeof p.data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]*={0,2}$/.test(p.data)||typeof p.caption!=='string'||p.caption.length>1500))return 'Evidencias inválidas.';
  if(record.newComment!==undefined&&(typeof record.newComment!=='string'||record.newComment.length>12000))return 'El comentario excede el límite permitido.';
  return '';
 }
 if(!required(record,['person','unit','department','period'])||!/^\d{4}-(0[1-9]|1[0-2])$/.test(record.period)||!['1','2'].includes(String(record.kpi)))return 'Completa responsable, unidad, departamento, periodo y nivel KPI.';
 const groups=['inspection','leadership','pst','unsafe','talk','epp'];
 if(!record.targets||groups.some(k=>!Number.isInteger(record.targets[k])||record.targets[k]<0||record.targets[k]>500))return 'Las metas deben ser enteros entre 0 y 500.';
 if(String(record.kpi)==='1'&&(record.targets.talk||record.targets.epp))return 'KPI 1 no incluye pláticas ni inspecciones de EPP.';
 return '';
}
export default{async fetch(request,env){
 const url=new URL(request.url);
 try{
  if(url.pathname.startsWith('/api/')){
   if(!env.BUCKET)return json({error:'Almacenamiento no disponible'},503);
   if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Origen no permitido'},403);
   const auth=await identify(request,env);if(auth.error)return auth.error;const me=auth.user;const accountResponse=await accountRoutes(request,env,url,me);if(accountResponse)return accountResponse;const match=url.pathname.match(/^\/api\/(reports|actions|plans)(?:\/([a-zA-Z0-9-]{1,150}))?$/);
   if(!match)return json({error:'Ruta no encontrada'},404);
   const [,collection,id]=match;
   if(request.method==='GET'&&!id){let all=(await readAll(env.BUCKET,collection)).filter(r=>userCanRead(me,r,collection));const accountNames=new Map((await allUsers(env,me)).filter(u=>u.id!=='owner').map(u=>[u.id,u.name]));all=all.map(r=>{const name=accountNames.get(r.assignedAccountId||r.ownerAccountId);if(!name)return r;return {...r,...(collection==='reports'?{supervisor:name}:collection==='plans'?{person:name}:{owner:name})}});const scope=url.searchParams.get('accountId');if(scope&&me.role==='admin')all=all.filter(r=>(r.assignedAccountId||r.ownerAccountId||'owner')===scope);return json(all);}
   if(request.method!=='PUT'||!id)return json({error:'Método no permitido'},405);
   if(Number(request.headers.get('Content-Length'))>10000000)return json({error:'Archivo demasiado grande'},413);
   const raw=await request.text();if(raw.length>10000000)return json({error:'Registro demasiado grande'},413);
   let record;try{record=JSON.parse(raw)}catch{return json({error:'JSON inválido'},400)}
   if(!record||record.id!==id)return json({error:'Identificador inválido'},400);
   
   const key=collection+'/'+id+'.json',prior=await env.BUCKET.get(key),previous=prior?await prior.json():null,revision=previous?.revision||0;
   if(collection==='plans'&&me.role!=='admin')return json({error:'Solo el administrador puede asignar o editar metas.'},403);
   if(previous&&!userCanRead(me,previous,collection))return json({error:'Registro no disponible'},404);
   if(collection==='reports')delete record.assignedAccountId;if(me.role!=='admin'){
    if(collection==='reports'){record.ownerAccountId=me.id;record.supervisor=me.name;}
    if(collection==='actions'){
     if(record.status==='Cerrado')return json({error:'El cierre debe ser verificado por un administrador de seguridad.'},403);
     if(previous&&previous.status==='Cerrado')return json({error:'Solicita al administrador la reapertura de esta acción.'},403);
     if(previous){const editable={progress:record.progress,status:record.status,photos:record.photos,newComment:record.newComment};record={...previous,...editable};}
     record.ownerAccountId=previous?.ownerAccountId||me.id;record.assignedAccountId=previous?.assignedAccountId||me.id;record.owner=me.name;record.requester=previous?.requester||me.name;
    }
   }else{
    record.ownerAccountId=previous?(previous.ownerAccountId||'owner'):me.id;
    if(previous?.assignedAccountId)record.assignedAccountId=previous.assignedAccountId;else delete record.assignedAccountId;
    if(!previous&&collection!=='reports'){
     const targetName=collection==='plans'?record.person:record.owner;
     const matches=(await allUsers(env,me)).filter(u=>u.active&&norm(u.name)===norm(targetName));
     if(matches.length===1)record.assignedAccountId=matches[0].id;
    }
    if(collection==='actions'&&record.status==='Cerrado')record.verifier=me.name;if(record.assignedAccountId){const assigned=await resolveAccount(env,me,record.assignedAccountId);if(assigned){if(collection==='actions')record.owner=assigned.name;if(collection==='plans')record.person=assigned.name;}}
   }
   record.updatedBy=me.name;record.updatedByAccountId=me.id;
   const error=validate(record,collection);if(error)return json({error},400);

   if((me.role!=='admin'&&collection==='actions'?JSON.parse(raw).revision:record.revision)!==revision)return json({error:'Este registro cambió en otra sesión. Vuelve a cargarlo antes de guardar para conservar ambos avances.'},409);
   if(collection==='plans'){
    const all=await readAll(env.BUCKET,'plans');if(all.some(p=>p.id!==id&&p.period===record.period&&norm(p.person)===norm(record.person)))return json({error:'El responsable ya tiene un programa en este mes. Edita el existente.'},409);
   }
   record.revision=revision+1;record.updated=new Date().toISOString();
   if(collection==='actions'){
    record.history=[...(previous?.history||[]),{at:record.updated,by:record.updatedBy||record.requester,status:record.status,progress:record.progress,comment:record.newComment||'Actualización de datos del compromiso.',owner:record.owner,due:record.due,verifier:record.status==='Cerrado'?record.verifier:''}];delete record.newComment;
    if(record.status!=='Cerrado'){record.verifier='';record.verifiedDate=''}
   }
   const saved=await env.BUCKET.put(key,JSON.stringify(record),{httpMetadata:{contentType:'application/json'},onlyIf:prior?{etagMatches:prior.etag}:{etagDoesNotMatch:'*'}});
   if(!saved)return json({error:'Conflicto de edición. Otro usuario guardó primero. Recarga el registro antes de actualizar.'},409);
   return collection==='reports'?json({revision:record.revision,updated:record.updated,ownerAccountId:record.ownerAccountId,supervisor:record.supervisor}):json(record);
  }
  if(['/acciones.html','/app.js','/style.css'].includes(url.pathname))return new Response('Este módulo fue integrado al panel.',{status:404});const key=url.pathname==='/'?'/index.html':url.pathname,asset=ASSETS[key];
  if(!asset)return new Response('Página no encontrada',{status:404});
  const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':key.includes('/assets/')?'public, max-age=3600':'no-cache'}});
 }catch(error){console.error('Request failed',error?.message);return json({error:'No se pudo completar la operación'},500)}
}};
