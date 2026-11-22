function validateSafetyReport(r){
 const definition=FORM_META.types.find(t=>t.id===r.type);if(!definition)return 'Tipo de formato inválido.';
 const fields=['date','time','shift','supervisor','department','place','kpi','observations','reviewer',...(definition.fields||[]).map(f=>f[0])];
 for(const key of fields)if(r[key]!==undefined&&(typeof r[key]!=='string'||r[key].length>12000))return 'El campo '+key+' no es válido.';
 const rowObjects=rows=>Array.isArray(rows)&&rows.length<=200&&rows.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.values(row).every(v=>typeof v==='string'&&v.length<=12000));
 if(definition.table&&r[definition.table.key]!==undefined&&!rowObjects(r[definition.table.key]))return 'Las filas del formato no son válidas.';
 if(definition.epp&&r.workers!==undefined&&(!Array.isArray(r.workers)||r.workers.length>200||r.workers.some(w=>!w||typeof w.person!=='string'||typeof w.position!=='string'||!Array.isArray(w.epp)||w.epp.length!==FORM_META[definition.epp].length||w.epp.some(x=>!['','B','M','N/A','E'].includes(x))||typeof w.notes!=='string')))return 'Las revisiones de EPP no son válidas.';
 if(definition.checks==='acts'&&r.acts!==undefined&&(!Array.isArray(r.acts)||r.acts.some(i=>!Number.isInteger(i)||i<0||i>=FORM_META.acts.length)))return 'Los actos seleccionados no son válidos.';
 if(definition.checks&&definition.checks!=='acts'&&r.checks!==undefined){const answers=definition.checks==='pst'?['','Sí','No']:['','Cumple','No cumple','No aplica'];if(!Array.isArray(r.checks)||r.checks.length!==FORM_META[definition.checks].length||r.checks.some(c=>!c||!answers.includes(c.answer)||typeof c.reason!=='string'||c.reason.length>12000))return 'El cuestionario no es válido.';}
 if(definition.equipment&&r.equipment!==undefined&&(!Array.isArray(r.equipment)||r.equipment.length!==FORM_META.equipment.length||r.equipment.some(c=>!c||!['','Bien','Mal','No tiene','No aplica','Urgente cambio'].includes(c.answer)||typeof c.reason!=='string')))return 'La revisión de equipo no es válida.';
 if(r.status!=='Finalizado')return '';
 for(const key of ['date','shift','supervisor','department','place','kpi'])if(!r[key]?.trim())return 'Completa '+key+' antes de finalizar.';
 if(!validDate(r.date)||!['1','2'].includes(r.kpi))return 'Fecha o nivel KPI inválido.';
 for(const [key,label,,required] of definition.fields||[])if(required&&!r[key]?.trim())return 'Completa '+label+' antes de finalizar.';
 if(definition.table){const rows=r[definition.table.key]||[];if(!definition.table.optional&&!rows.length)return 'Agrega registros antes de finalizar.';let required=[];if(r.type==='leadership')required=['person','place','activity','details'];if(r.type==='talk')required=['person'];if(r.type==='inspection')required=['place','description','action','owner','status','due'];if(r.type==='critical')required=['control','response'];if(r.type==='flash')required=['action','owner','due'];if(rows.some(row=>required.some(k=>!row[k]?.trim())))return 'Completa los datos principales de todas las filas.';if(rows.some(row=>row.due&&!validDate(row.due)||row.start&&!validDate(row.start)||row.date&&['inspection','pst'].includes(r.type)&&Number.isNaN(Date.parse(row.date))))return 'Las fechas de las filas no son válidas.';}
 if(r.type==='critical'&&(r.controls||[]).some(c=>!['C · Cumple','NC · No cumple','NA · No aplica'].includes(c.response)||c.response==='NC · No cumple'&&(!c.action?.trim()||!c.owner?.trim()||!validDate(c.due))))return 'Los controles no conformes requieren acción, responsable y fecha.';
 if(r.type==='unsafe'&&!r.acts?.length&&!r.condition?.trim())return 'Identifica el acto o la condición insegura.';
 if(definition.checks&&definition.checks!=='acts'&&(!r.checks||r.checks.some(c=>!c.answer)))return 'Completa el cuestionario antes de finalizar.';
 if(definition.epp&&(!r.workers?.length||r.workers.some(w=>!w.person.trim()||w.epp.some(x=>!x))))return 'Completa la revisión de EPP antes de finalizar.';
 if(r.type==='talk'&&(!Number.isFinite(Number(r.hours))||Number(r.hours)<=0||!validDate(r.endDate)||r.endDate<r.date))return 'Horas o fechas de capacitación inválidas.';
 return '';
}
