const copy=value=>JSON.parse(JSON.stringify(value));
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function validateSchedule(schedule,topicIds){
 if(!schedule.id||!topicIds.has(schedule.topicId)||!validDate(schedule.date)||!schedule.shift?.trim()||!schedule.department?.trim()||!schedule.place?.trim()||!schedule.instructorId?.trim())throw Error('Completa tema, fecha, turno, departamento, lugar e instructor.');
 if(!Number.isFinite(schedule.minutes)||schedule.minutes<=0)throw Error('La duración debe ser positiva.');
 if(!['Programada','Reprogramada','Cancelada','Ejecutada'].includes(schedule.status))throw Error('Estado de programación inválido.');
 return copy(schedule);
}
export function validateAttendance(attendees){
 if(!Array.isArray(attendees)||!attendees.length)throw Error('Registra al menos un asistente.');
 const ids=new Set();const people=copy(attendees);for(const person of people){if(typeof person.personId!=='string'||!person.personId.trim()||!person.name?.trim())throw Error('Cada asistente requiere identificador y nombre.');person.personId=person.personId.trim();if(ids.has(person.personId))throw Error('Participante duplicado en la sesión.');ids.add(person.personId);}
 return people;
}
export function trainingIndicators({schedules=[],sessions=[],eligiblePersonIds=[],period}){
 const planned=[...new Map(schedules.filter(s=>s.id&&s.date?.startsWith(period)&&s.status!=='Cancelada').map(s=>[s.id,s])).values()];
 const completed=[...new Map(sessions.filter(s=>s.id&&s.date?.startsWith(period)&&s.status==='Ejecutada').map(s=>[s.id,s])).values()];
 const unique=new Set(completed.flatMap(s=>(s.attendees||[]).filter(p=>p.present!==false).map(p=>p.personId).filter(Boolean)));
 const denominator=new Set(eligiblePersonIds);
 const covered=[...unique].filter(id=>denominator.has(id)).length;
 return {planned:planned.length,completed:completed.length,uniqueAttendees:unique.size,attendances:completed.reduce((sum,s)=>sum+(s.attendees||[]).filter(p=>p.present!==false).length,0),eligiblePeople:denominator.size,coveragePercent:denominator.size?Math.round(covered/denominator.size*100):null,completedScheduleIds:[...new Set(completed.map(s=>s.scheduleId).filter(Boolean))]};
}
export function gradeAssessment(questions,answers,{passPercent=80}={}){
 if(!questions.length||!Number.isFinite(passPercent)||passPercent<0||passPercent>100)throw Error('Configura la evaluación y su criterio de aprobación.');
 if(new Set(questions.map(q=>q.id)).size!==questions.length||questions.some(q=>!q.id||!Array.isArray(q.options)||!q.options.includes(q.correctAnswer)))throw Error('Pregunta o respuesta configurada inválida.');
 const correct=questions.filter(q=>answers[q.id]===q.correctAnswer).length,score=Math.round(correct/questions.length*100);
 return {correct,total:questions.length,score,result:score>=passPercent?'Aprobado':'Reprobado',passPercent};
}
export function sessionToOriginalTalkReport(session){
 const attendees=validateAttendance(session.attendees).filter(p=>p.present!==false);
 if(!session.id||session.status!=='Ejecutada'||!validDate(session.date)||!session.title?.trim()||!session.instructor?.trim()||!session.department?.trim()||!session.place?.trim()||!session.shift?.trim()||!Number.isFinite(session.minutes)||session.minutes<=0||!attendees.length)throw Error('Completa la ejecución antes de vincularla al formato original.');
 return {id:'talk-session-'+session.id,sourceTalkSessionId:session.id,type:'talk',status:'Borrador',revision:0,date:session.date,endDate:session.date,supervisor:session.instructor,instructor:session.instructor,instructorType:session.instructorType||'Interno',department:session.department,place:session.place,shift:session.shift,kpi:'2',topic:session.title,hours:String(session.minutes/60),attendees:attendees.map(p=>({employee:p.personId,person:p.name,department:p.department||session.department,position:p.position||'',signature:''})),photos:[],normativeReferences:copy(session.normativeReferences||[])};
}
