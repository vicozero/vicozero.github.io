/* FASES 3-8 · Núcleo funcional aditivo de Seguridad Industrial.
 * No modifica los 17 formatos existentes ni las reglas de KPI 1/KPI 2.
 * Expone window.SMAdvancedCore.
 */
(function(global){
  'use strict';
  const DAY=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const isoDate=d=>{const x=d instanceof Date?d:new Date(d);return Number.isNaN(x.getTime())?'':x.toISOString().slice(0,10)};
  const today=()=>isoDate(new Date());
  const monthOf=value=>String(value||'').slice(0,7);
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const asList=value=>Array.isArray(value)?value:[];

  function folio(prefix,records,key='folio'){
    const used=new Set(asList(records).map(r=>String(r?.[key]||'')).filter(Boolean));
    const base='SM-'+String(prefix||'GEN').toUpperCase().replace(/[^A-Z0-9]+/g,'')+'-'+today().replace(/-/g,'');
    let n=1,candidate;
    do{candidate=base+'-'+pad(n++)}while(used.has(candidate));
    return candidate;
  }

  function dedupeKey(detail){
    return [detail?.sourceReportId||'',detail?.checkIndex??'',norm(detail?.findingType||'')].join('|');
  }
  function isDuplicate(findings,detail){
    const key=dedupeKey(detail);
    return asList(findings).some(f=>String(f.dedupeKey||dedupeKey(f))===key);
  }

  function riskOf(detail){
    const explicit=String(detail?.risk||'');
    if(['Crítico','Critico','Alto','Medio','Bajo'].includes(explicit))return explicit==='Critico'?'Crítico':explicit;
    const answer=String(detail?.answer||'');
    const text=norm(detail?.title||detail?.description||'');
    if(detail?.criticalControl===true||answer==='No cumple'&&/critic|explos|incendio|altura|maquinaria|bloqueo|energia/.test(text))return 'Crítico';
    if(answer==='No cumple')return 'Alto';
    if(answer==='No aplica')return 'Bajo';
    return 'Medio';
  }

  function trafficLight(action,referenceDate){
    const todayISO=referenceDate||today();
    if(String(action?.status||'')==='Cancelado'||!action?.due)return 'Gris';
    if(String(action?.status)==='Cerrado'&&action.verifiedDate)return 'Verde';
    const due=String(action.due).slice(0,10);
    if(due<todayISO)return 'Rojo';
    const days=Math.round((Date.parse(due+'T00:00:00Z')-Date.parse(todayISO+'T00:00:00Z'))/DAY);
    return days<=3?'Amarillo':'Verde';
  }
  function actionStatus(action,referenceDate){
    return trafficLight(action,referenceDate)==='Rojo'?'Vencido':String(action?.status||'Pendiente');
  }
  function canClose(action,actor,options={}){
    const risk=String(action?.risk||'');
    if(risk==='Crítico'&&!options.safetyReview)return {ok:false,reason:'Un hallazgo crítico requiere revisión y verificación de Seguridad.'};
    if(options.procedureRequiresSafety&&!options.safetyReview)return {ok:false,reason:'El procedimiento exige verificación de Seguridad antes del cierre.'};
    if(actor?.id&&action?.responsibleId&&action.responsibleId===actor.id&&options.procedureRequiresSafety)return {ok:false,reason:'El responsable no puede verificarse a sí mismo.'};
    return {ok:true};
  }
  function reschedule(action,newDue,reason,actor){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(newDue||'')))throw Error('La nueva fecha compromiso debe tener formato YYYY-MM-DD.');
    if(!String(reason||'').trim())throw Error('La reprogramación requiere motivo.');
    return {...action,
      originalStart:String(action.originalStart||action.start||''),
      originalDue:String(action.originalDue||action.due||''),
      due:String(newDue),
      rescheduleReason:String(reason).trim().slice(0,1000),
      rescheduledBy:String(actor?.id||''),
      rescheduledAt:new Date().toISOString(),
      rescheduleCount:num(action.rescheduleCount)+1
    };
  }
  function auditEvent(actor,event,ref,before,after,reason){
    return {
      id:'aud-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
      actorUid:String(actor?.id||actor?.uid||''),
      actorName:String(actor?.name||''),
      event:String(event||''),
      reference:{collection:String(ref?.collection||''),id:String(ref?.id||'')},
      before:before??null,after:after??null,reason:String(reason||'').slice(0,1000),
      createdAt:new Date().toISOString()
    };
  }

  function matches(record,filters){
    if(filters.period&&monthOf(record.date||record.period||record.start||record.due)!==filters.period)return false;
    if(filters.from&&String(record.date||'').slice(0,10)<filters.from)return false;
    if(filters.to&&String(record.date||'').slice(0,10)>filters.to)return false;
    if(filters.unitId&&![record.unitId,record.unit,record.unidad,record.area].some(v=>String(v||'')===String(filters.unitId)))return false;
    if(filters.departmentId&&String(record.departmentId||record.department||'')!==String(filters.departmentId))return false;
    if(filters.supervisor&&!norm(record.supervisor||record.person||record.owner||'').includes(norm(filters.supervisor)))return false;
    if(filters.inspectionType&&String(record.type||record.inspectionType||'')!==String(filters.inspectionType))return false;
    if(filters.risk&&String(record.risk||'')!==String(filters.risk))return false;
    return true;
  }

  function computeKpis(data={},filters={}){
    const reports=asList(data.reports).filter(r=>matches(r,filters));
    const actions=asList(data.actions).filter(a=>matches(a,filters));
    const findings=asList(data.findings).filter(f=>matches(f,filters));
    const plans=asList(data.plans).filter(p=>!filters.period||monthOf(p.period)===filters.period);
    const finalized=reports.filter(r=>r.status==='Finalizado');
    const drafts=reports.filter(r=>r.status==='Borrador');
    const scheduled=plans.reduce((total,plan)=>total+Object.values(plan.targets||{}).reduce((sum,target)=>sum+num(target),0),0);
    const realized=finalized.length;
    const compliance=scheduled>0?Math.min(100,Math.round(realized/scheduled*100)):0;
    const reference=filters.referenceDate||today();
    const overdueSupervisions=drafts.filter(r=>String(r.date||'').slice(0,10)<reference).length;
    return {
      supervisionesProgramadas:scheduled,
      supervisionesRealizadas:realized,
      cumplimientoMensual:compliance,
      supervisionesPendientes:Math.max(0,scheduled-realized),
      supervisionesAtrasadas:overdueSupervisions,
      hallazgosAbiertos:findings.filter(f=>!['Cerrado','Cancelado'].includes(f.status)).length,
      accionesEnProceso:actions.filter(a=>!['Cerrado','Cancelado'].includes(a.status)).length,
      accionesVencidas:actions.filter(a=>trafficLight(a,reference)==='Rojo').length,
      accionesCerradas:actions.filter(a=>a.status==='Cerrado').length,
      hallazgosCriticos:findings.filter(f=>f.risk==='Crítico'&&!['Cerrado','Cancelado'].includes(f.status)).length,
      detalle:{reports,finalized,drafts,actions,findings,plans,reference}
    };
  }

  function complianceMatrix(data={},filters={}){
    const reports=asList(data.reports).filter(r=>matches(r,filters));
    const plans=asList(data.plans).filter(p=>!filters.period||monthOf(p.period)===filters.period);
    const finalized=reports.filter(r=>r.status==='Finalizado');
    const departments=new Map();
    const ensure=key=>{if(!departments.has(key))departments.set(key,{department:key,programado:0,realizado:0,pendiente:0,atrasado:0,cumplimiento:0,supervisores:new Map()});return departments.get(key)};
    for(const plan of plans){
      const dep=String(plan.departmentId||plan.department||'Sin departamento');
      const row=ensure(dep);
      const target=Object.values(plan.targets||{}).reduce((sum,t)=>sum+num(t),0);
      row.programado+=target;
      const sup=String(plan.person||plan.supervisor||'Sin supervisor');
      const sr=row.supervisores.get(sup)||{supervisor:sup,programado:0,realizado:0};
      sr.programado+=target;row.supervisores.set(sup,sr);
    }
    for(const report of finalized){
      const dep=String(report.departmentId||report.department||'Sin departamento');
      const row=ensure(dep);row.realizado++;
      const sup=String(report.supervisor||'Sin supervisor');
      const sr=row.supervisores.get(sup)||{supervisor:sup,programado:0,realizado:0};
      sr.realizado++;row.supervisores.set(sup,sr);
    }
    for(const report of reports.filter(r=>r.status==='Borrador'&&String(r.date||'').slice(0,10)<(filters.referenceDate||today()))){
      const row=ensure(String(report.departmentId||report.department||'Sin departamento'));row.atrasado++;
    }
    return [...departments.values()].map(row=>({
      ...row,
      pendiente:Math.max(0,row.programado-row.realizado),
      cumplimiento:row.programado?Math.min(100,Math.round(row.realizado/row.programado*100)):0,
      supervisores:[...row.supervisores.values()]
    })).sort((a,b)=>a.department.localeCompare(b.department,'es'));
  }

  function chartData(data={},filters={}){
    const kpi=computeKpis(data,filters),matrix=complianceMatrix(data,filters);
    const findings=asList(data.findings).filter(f=>matches(f,filters));
    const actions=asList(data.actions).filter(a=>matches(a,filters));
    const reports=asList(data.reports).filter(r=>matches(r,filters)&&r.status==='Finalizado');
    const byRisk=['Crítico','Alto','Medio','Bajo'].map(label=>({label,value:findings.filter(f=>f.risk===label).length}));
    const months=[...new Set([...reports.map(r=>monthOf(r.date)),...actions.map(a=>monthOf(a.start||a.due))].filter(Boolean))].sort().slice(-6);
    return {
      cumplimientoPorDepartamento:matrix.map(r=>({label:r.department,value:r.cumplimiento})),
      hallazgosPorRiesgo:byRisk,
      evolucionCumplimiento:months.map(m=>{const total=asList(data.plans).filter(p=>monthOf(p.period)===m).reduce((s,p)=>s+Object.values(p.targets||{}).reduce((a,t)=>a+num(t),0),0);const done=asList(data.reports).filter(r=>monthOf(r.date)===m&&r.status==='Finalizado').length;return {label:m,value:total?Math.min(100,Math.round(done/total*100)):0}}),
      programadoContraRealizado:matrix.map(r=>({label:r.department,programado:r.programado,realizado:r.realizado})),
      accionesAbiertasCerradas:[{label:'Abiertas',value:actions.filter(a=>a.status!=='Cerrado').length},{label:'Cerradas',value:actions.filter(a=>a.status==='Cerrado').length}],
      comparativosMensuales:months.map(m=>({label:m,programado:asList(data.plans).filter(p=>monthOf(p.period)===m).reduce((s,p)=>s+Object.values(p.targets||{}).reduce((a,t)=>a+num(t),0),0),realizado:asList(data.reports).filter(r=>monthOf(r.date)===m&&r.status==='Finalizado').length})),
      totales:kpi
    };
  }

  function calendar(records,view='month',anchor=today()){
    const base=new Date(anchor+'T00:00:00Z');
    const start=new Date(base);
    if(view==='week'){const day=(start.getUTCDay()+6)%7;start.setUTCDate(start.getUTCDate()-day)}
    else{start.setUTCDate(1);const day=(start.getUTCDay()+6)%7;start.setUTCDate(start.getUTCDate()-day)}
    const days=view==='week'?7:42;
    const cells=[];
    for(let i=0;i<days;i++){
      const date=new Date(start);date.setUTCDate(start.getUTCDate()+i);
      const key=isoDate(date);
      cells.push({date:key,outside:monthOf(key)!==monthOf(anchor),items:asList(records).filter(r=>String(r.date||r.due||'').slice(0,10)===key).map(r=>({id:r.id||'',label:r.folio||r.description||r.title||'Actividad',status:r.status||'',due:r.due||'',light:r.due?trafficLight(r):'Gris'}))});
    }
    return {view,anchor,cells};
  }

  function excelXml(sheets){
    const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const cell=(value,type)=>`<Cell><Data ss:Type="${type||'String'}">${esc(value)}</Data></Cell>`;
    const xml=sheets.map(sheet=>{
      const columns=sheet.columns||[];
      const rows=sheet.rows||[];
      const totals=columns.map((c,i)=>i===0?cell('TOTAL','String'):c.type==='Number'||columns.every(col=>typeof rows[0]?.[col.key]==='number')?cell(rows.reduce((sum,row)=>sum+num(row[c.key]),0),'Number'):cell('','String')).join('');
      return `<Worksheet ss:Name="${esc(sheet.name||'Datos')}"><Table>${columns.map(c=>cell(c)).join('')}${rows.map(row=>`<Row>${columns.map(c=>{const v=row[c.key];return cell(v,c.type||(typeof v==='number'?'Number':'String'))}).join('')}</Row>`).join('')}<Row>${totals}</Row></Table><AutoFilter x:Range="R1C1:R${rows.length+1}C${columns.length}" xmlns:x="urn:schemas-microsoft-com:office:excel"/><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${xml}</Workbook>`;
  }

  const API={folio,dedupeKey,isDuplicate,riskOf,trafficLight,actionStatus,canClose,reschedule,auditEvent,matches,computeKpis,complianceMatrix,chartData,calendar,excelXml,norm,today,monthOf};
  global.SMAdvancedCore=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
