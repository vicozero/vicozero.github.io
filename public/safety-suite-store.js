import {collection,doc,getDoc,getDocs,query,where,or,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {validateVersion,validateAssessment,officialSource} from './regulatory-core.js';
import {validateSchedule,validateAttendance,sessionToOriginalTalkReport} from './training-core.js';

const clean=value=>JSON.parse(JSON.stringify(value));
export function createSafetySuiteStore(db,me){
 const admin=me.role==='admin',permission=key=>admin||me.permissions?.[key]===true;
 const shared=new Set(['regulatory_versions','standard_requirements','talk_topics','regulatory_standards']);
 const entities=new Set([...shared,'talk_schedules','talk_sessions','compliance_assessments','regulatory_reviews']);
 async function list(name){
  if(!entities.has(name))throw Error('Colección no permitida.');
  const base=collection(db,name),ref=admin||shared.has(name)?base:query(base,or(where('ownerAccountId','==',me.id),where('assignedAccountId','==',me.id)));
  return (await getDocs(ref)).docs.map(d=>({...d.data(),id:d.id}));
 }
 async function save(name,data,proof=null){
  if(!entities.has(name)||!data.id||data.id.includes('/'))throw Error('Entidad o identificador inválido.');
  const target=doc(db,name,data.id),audit=doc(collection(db,'auditLog'));
  return runTransaction(db,async tx=>{
   const previous=await tx.get(target),old=previous.exists()?previous.data():null;
   if(name==='regulatory_versions'||name==='standard_requirements'){
    if(old)throw Error('La versión aprobada es inmutable. Crea otra revisión conservando la anterior.');
   }
   if((data.revision||0)!==(old?.revision||0))throw Error('El registro cambió en otra sesión. Recarga antes de guardar.');
   const record={...clean(data),revision:(old?.revision||0)+1,ownerAccountId:old?.ownerAccountId||me.id,createdBy:old?.createdBy||me.id,createdAt:old?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};
   if(proof){record.evidenceReviewId=data.id+'--'+record.revision;tx.set(doc(db,'compliance_reviews',record.evidenceReviewId),{assessmentId:data.id,requirementId:data.requirementId,evidenceIds:proof.evidenceIds,reviewedBy:me.id,reviewedAt:serverTimestamp()});}
   tx.set(target,record);
   if(name==='talk_topics')tx.set(doc(db,'talk_topic_versions',data.id+'--'+record.revision),{...record,topicId:data.id});
   tx.set(audit,{actorUid:me.id,action:'suite:'+name+':'+(old?'update':'create'),target:data.id,createdAt:serverTimestamp()});
   return record;
  });
 }
 return {
  list,permission,
  async importCatalog(catalog){
   if(!permission('nom_manage'))throw Error('Permiso de gestión normativa requerido.');
   let created=0;
   for(const version of catalog.standards){
    validateVersion(version);
    const exists=await getDoc(doc(db,'regulatory_versions',version.versionId));if(exists.exists())continue;
    await save('regulatory_versions',{...version,id:version.versionId,revision:0});created++;
   }
   return {created,total:catalog.standards.length};
  },
  async saveVersion(version){
   if(!permission('nom_manage'))throw Error('Permiso de gestión normativa requerido.');
   validateVersion(version);
   if(version.status!=='Pendiente de verificar'&&!permission('nom_validate'))throw Error('Permiso de validación normativa requerido.');
   return save('regulatory_versions',{...version,id:version.versionId,...(version.status!=='Pendiente de verificar'?{verifiedBy:me.id}:{} )});
  },
  async saveRequirement(requirement){
   if(!permission('nom_validate')||!officialSource(requirement.sourceUrl)||!requirement.section||!requirement.text?.trim())throw Error('Requisito y fuente oficial requieren validación autorizada.');
   const version=await getDoc(doc(db,'regulatory_versions',requirement.versionId));if(!version.exists())throw Error('La versión no existe.');
   return save('standard_requirements',{...requirement,verifiedBy:me.id,verifiedAt:new Date().toISOString().slice(0,10)});
  },
  async saveTopic(topic){
   if(!permission('training_manage'))throw Error('Permiso de gestión de pláticas requerido.');
   if(!topic.title?.trim())throw Error('Indica el título del tema.');
   if(!['Propuesta','Borrador','En revisión','Aprobado','Archivado'].includes(topic.status))throw Error('Estado del material inválido.');
   if(topic.status==='Aprobado'){
    if(!permission('training_approve'))throw Error('Permiso de aprobación de materiales requerido.');
    if(!topic.objective?.trim()||!topic.introduction?.trim()||!topic.development?.trim()||!topic.criticalPoints?.length||!topic.reviewQuestions?.length)throw Error('Completa objetivo, introducción, desarrollo, puntos críticos y preguntas antes de aprobar.');
    topic={...topic,approver:me.id,reviewedAt:new Date().toISOString().slice(0,10)};
   }
   return save('talk_topics',topic);
  },
  async saveSchedule(schedule,topicIds){
   if(!permission('training_schedule'))throw Error('Permiso de programación requerido.');
   validateSchedule(schedule,topicIds);return save('talk_schedules',{...schedule,assignedAccountId:schedule.instructorId});
  },
  async saveSession(session){
   if(!permission('training_attendance'))throw Error('Permiso de captura de asistencia requerido.');
   session={...session,attendees:validateAttendance(session.attendees)};
   sessionToOriginalTalkReport(session);
   const topic=await getDoc(session.topicRevision?doc(db,'talk_topic_versions',session.topicId+'--'+session.topicRevision):doc(db,'talk_topics',session.topicId));if(!topic.exists()||topic.data().status!=='Aprobado')throw Error('La ejecución requiere un material aprobado.');
   const schedule=await getDoc(doc(db,'talk_schedules',session.scheduleId));if(!schedule.exists()||schedule.data().topicId!==session.topicId||schedule.data().status==='Cancelada')throw Error('La sesión no corresponde a una programación activa.');
   return save('talk_sessions',{...session,assignedAccountId:schedule.data().instructorId,topicRevision:topic.data().revision});
  },
  async saveAssessment(record){
   if(!permission('nom_assess'))throw Error('Permiso de evaluación normativa requerido.');
   validateAssessment(record);
   const requirement=await getDoc(doc(db,'standard_requirements',record.requirementId));if(!requirement.exists()||requirement.data().versionId!==record.versionId)throw Error('El requisito no pertenece a la versión seleccionada.');
   if(record.state==='Cumple, con evidencia revisada'){
    if(!permission('nom_validate')||record.reviewConfirmation!==true)throw Error('Un validador autorizado debe confirmar expresamente la revisión de evidencia.');
    return save('compliance_assessments',{...record,evaluatedBy:me.id},{evidenceIds:record.evidence.map(e=>e.id)});
   }
   return save('compliance_assessments',record);
  },
  async createOriginalTalkDraft(session){
   if(!permission('training_attendance'))throw Error('Permiso de captura requerido.');
   const stored=await getDoc(doc(db,'talk_sessions',session.id));if(!stored.exists())throw Error('La ejecución no está guardada.');
   const report=sessionToOriginalTalkReport({...stored.data(),id:stored.id}),ref=doc(db,'reports',report.id);
   return runTransaction(db,async tx=>{
    const existing=await tx.get(ref);if(existing.exists())return {id:report.id,created:false};
    tx.set(ref,{...report,ownerAccountId:me.id,folio:'SM-PL-'+session.id,revision:1,updated:new Date().toISOString()});
    return {id:report.id,created:true};
   });
  }
 };
}



export function createLocalSafetySuiteStore(me,{directory=[]}={}){
 const admin=me.role==='admin',permission=key=>admin||me.permissions?.[key]===true;
 const KEY='sm-suite-workspace-v1';
 const read=()=>{const raw=localStorage.getItem(KEY);if(!raw)return {};try{const v=JSON.parse(raw);if(v&&typeof v==='object'&&!Array.isArray(v))return v;}catch{}throw Error('El programa local contiene datos dañados. Conserva un respaldo antes de repararlo.');};
 const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
 const ensure=(db,name)=>{db[name]=Array.isArray(db[name])?db[name]:[];return db[name];};
 const clean=value=>JSON.parse(JSON.stringify(value));
 const shared=new Set(['talk_topics','talk_topic_versions']);
 const allowed=new Set([...shared,'talk_schedules','talk_sessions']);
 const owns=record=>record.ownerAccountId===me.id||record.assignedAccountId===me.id;
 async function list(name){if(!allowed.has(name))throw Error('Colección no permitida.');const db=read();return clean(ensure(db,name).filter(x=>admin||shared.has(name)||owns(x)));}
 async function save(name,data){
  const db=read(),list=ensure(db,name),idx=list.findIndex(x=>x.id===data.id);
  const old=idx>=0?list[idx]:null;
  if(old&&!admin&&!shared.has(name)&&!owns(old))throw Error('No tienes acceso a este registro.');
  if(old&&!admin&&old.assignedAccountId!==data.assignedAccountId)throw Error('Solo el administrador puede reasignar este registro.');
  if((data.revision||0)!==(old?.revision||0))throw Error('El registro cambió en otra sesión. Recarga antes de guardar.');
  const record={...clean(data),revision:(old?.revision||0)+1,ownerAccountId:old?.ownerAccountId||me.id,createdBy:old?.createdBy||me.id,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(idx>=0)list[idx]=record;else list.push(record);
  if(name==='talk_topics')ensure(db,'talk_topic_versions').push({...clean(record),id:data.id+'--'+record.revision,topicId:data.id});
  ensure(db,'auditLog').push({actorUid:me.id,action:'suite:'+name+':'+(old?'update':'create'),target:data.id,createdAt:new Date().toISOString()});
  write(db);return record;
 }
 return {
  list,permission,
  async saveTopic(topic){
   if(!permission('training_manage'))throw Error('Permiso de gestión de pláticas requerido.');
   if(!topic.title?.trim())throw Error('Indica el título del tema.');
   if(!['Propuesta','Borrador','En revisión','Aprobado','Archivado'].includes(topic.status))throw Error('Estado del material inválido.');
   if(topic.status==='Aprobado'){
    if(!permission('training_approve'))throw Error('Permiso de aprobación de materiales requerido.');
    if(!topic.objective?.trim()||!topic.introduction?.trim()||!topic.development?.trim()||!topic.criticalPoints?.length||!topic.reviewQuestions?.length)throw Error('Completa objetivo, introducción, desarrollo, puntos críticos y preguntas antes de aprobar.');
    topic={...topic,approver:me.id,reviewedAt:new Date().toISOString().slice(0,10)};
   }
   return save('talk_topics',topic);
  },
  async saveSchedule(schedule,topicIds){
   if(!permission('training_schedule'))throw Error('Permiso de programación requerido.');
   validateSchedule(schedule,topicIds);
   if(!(await list('talk_topics')).some(t=>t.id===schedule.topicId))throw Error('El material debe guardarse antes de programarlo.');
   return save('talk_schedules',{...schedule,assignedAccountId:schedule.instructorId});
  },
  async saveSession(session){
   if(!permission('training_attendance'))throw Error('Permiso de captura de asistencia requerido.');
   session={...session,attendees:validateAttendance(session.attendees)};
   sessionToOriginalTalkReport(session);
   const topics=await list('talk_topics');
   const topic=session.topicRevision?(await list('talk_topic_versions')).find(t=>t.topicId===session.topicId&&t.revision===session.topicRevision):topics.find(t=>t.id===session.topicId);
   if(!topic||topic.status!=='Aprobado')throw Error('La ejecución requiere un material aprobado.');
   const schedules=await list('talk_schedules');
   const schedule=schedules.find(s=>s.id===session.scheduleId);
   if(!schedule||schedule.topicId!==session.topicId||schedule.status==='Cancelada')throw Error('La sesión no corresponde a una programación activa.');
   return save('talk_sessions',{...session,assignedAccountId:schedule.instructorId,topicRevision:topic.revision});
  },
  async createOriginalTalkDraft(session){
   if(!permission('training_attendance'))throw Error('Permiso de captura requerido.');
   const sessions=await list('talk_sessions');
   const stored=sessions.find(s=>s.id===session.id);
   if(!stored)throw Error('La ejecución no está guardada.');
   const report=sessionToOriginalTalkReport({...stored,id:stored.id});
   const WS='sm-workspace-v1';
   let ws;try{ws=JSON.parse(localStorage.getItem(WS)||'{}');if(!ws||typeof ws!=='object'||Array.isArray(ws))throw Error();}catch{throw Error('No se pudo leer el espacio de trabajo. No se sobrescribieron sus datos.');}
   ws.reports=Array.isArray(ws.reports)?ws.reports:[];
   if(ws.reports.some(r=>r.id===report.id))return {id:report.id,created:false};
   let legacy=null;try{legacy=JSON.parse(localStorage.getItem('sm-workspace')||'{}')?.reports?.find(r=>r.id===report.id);}catch{}
   ws.reports.push(legacy||{...report,ownerAccountId:me.id,folio:'SM-PL-'+session.id,revision:1,updated:new Date().toISOString()});
   localStorage.setItem(WS,JSON.stringify(ws));
   return {id:report.id,created:true};
  }
 };
}

