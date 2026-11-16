const clone=value=>JSON.parse(JSON.stringify(value));
export const STANDARD_STATES=['Vigente','Sustituida','Cancelada','Proyecto','Pendiente de verificar'];
export const COMPLIANCE_STATES=['Pendiente de evaluar','Cumple, con evidencia revisada','No cumple','No aplica, con justificación','Información insuficiente'];
export const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function officialSource(url){try{const u=new URL(url);return u.protocol==='https:'&&['stps.gob.mx','dof.gob.mx','diariooficial.gob.mx','sidof.segob.gob.mx'].some(host=>u.hostname===host||u.hostname.endsWith('.'+host));}catch{return false;}}
const themes=[['mineria mina subterranea ventilacion refugio','NOM-023-STPS'],['epp proteccion personal respiratoria','NOM-017-STPS'],['maquinaria equipo bloqueo mantenimiento','NOM-004-STPS'],['incendio emergencia extintor','NOM-002-STPS'],['altura caida andamio','NOM-009-STPS'],['soldadura corte caliente','NOM-027-STPS'],['electricidad electrico energias','NOM-029-STPS'],['confinado atmosfera','NOM-033-STPS'],['comision higiene','NOM-019-STPS'],['capacitacion prevencion programa','NOM-030-STPS'],['ruido auditiva','NOM-011-STPS']];
export function searchStandards(versions,query='',category=''){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 const related=new Set(themes.filter(([words])=>terms.some(t=>words.split(' ').some(w=>w.startsWith(t)||t.startsWith(w)))).map(([,id])=>id));
 return versions.filter(v=>!category||v.category===category).map(v=>{
  const haystack=normalize([v.identifier,v.standardId,v.name,v.category,...(v.keywords||[]),...(v.sections||[]).map(s=>s.title)].join(' '));
  const matches=terms.filter(t=>haystack.includes(t)).length;
  return {version:v,relevance:terms.length?matches*10+(related.has(v.standardId)?5:0):1,suggestionOnly:true};
 }).filter(r=>r.relevance>0).sort((a,b)=>b.relevance-a.relevance||a.version.identifier.localeCompare(b.version.identifier));
}
export function validateVersion(version){
 if(!version.standardId||!version.versionId||!version.name)throw Error('Falta identificador, versión o nombre.');
 if(!STANDARD_STATES.includes(version.status))throw Error('Estado normativo inválido.');
 if(!officialSource(version.sourceUrl))throw Error('Se requiere una fuente oficial HTTPS.');
 if(version.status!=='Pendiente de verificar'&&(!version.verifiedAt||!version.verifiedBy))throw Error('El estado requiere fecha y responsable de validación.');
 return clone(version);
}
export function referenceSnapshot(version,requirement,{applicabilityNote='',consultedAt}={}){
 if(!consultedAt)throw Error('Indica la fecha de consulta.');
 validateVersion(version);
 if(requirement&&(!requirement.id||requirement.versionId!==version.versionId||!requirement.section||!requirement.verifiedAt||!requirement.verifiedBy||!officialSource(requirement.sourceUrl)))throw Error('El numeral no está verificado o pertenece a otra versión.');
 return clone({standardId:version.standardId,versionId:version.versionId,identifier:version.identifier,name:version.name,status:version.status,section:requirement?.section||null,requirementId:requirement?.id||null,requirement:requirement?.text||null,sourceUrl:requirement?.sourceUrl||version.sourceUrl,verifiedAt:requirement?.verifiedAt||version.verifiedAt,consultedAt,applicabilityNote,referenceOnly:!requirement});
}
export function validateAssessment(record){
 if(!COMPLIANCE_STATES.includes(record.state))throw Error('Estado de evaluación inválido.');
 if(!record.versionId||!record.requirementId||!record.department||!record.responsibleId)throw Error('Falta requisito, departamento o responsable.');
 if(record.state==='No aplica, con justificación'&&!record.applicabilityJustification?.trim())throw Error('Justifica la no aplicabilidad.');
 if(record.state==='Cumple, con evidencia revisada'&&(!record.evaluatedAt||!record.evaluatedBy||!record.evidence?.length||record.evidence.some(e=>!e.id||!e.reviewedBy||!e.reviewedAt)))throw Error('Se requiere evidencia revisada y evaluador; cargar un archivo no acredita cumplimiento.');
 return clone(record);
}
export function assertNoOrphans({versions=[],requirements=[],references=[]}){
 const ids=new Set(versions.map(v=>v.versionId)),req=new Map(requirements.map(r=>[r.id,r]));
 if(ids.size!==versions.length)throw Error('Versión duplicada.');
 for(const r of requirements)if(!ids.has(r.versionId))throw Error('Requisito sin versión.');
 for(const r of references){if(!ids.has(r.versionId))throw Error('Referencia sin versión.');if(r.requirementId&&req.get(r.requirementId)?.versionId!==r.versionId)throw Error('Referencia huérfana o de otra versión.');}
 return true;
}
