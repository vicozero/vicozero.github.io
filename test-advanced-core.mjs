import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const A=require('./advanced-core.js');

const reports=[
  {id:'r1',folio:'SM-A',date:'2026-11-03',status:'Finalizado',supervisor:'Ana',departmentId:'seguridad',type:'leadership',unit:'Norte'},
  {id:'r2',folio:'SM-B',date:'2026-11-04',status:'Borrador',supervisor:'Ana',departmentId:'seguridad',type:'pst',unit:'Norte'},
  {id:'r3',folio:'SM-C',date:'2026-11-05',status:'Finalizado',supervisor:'Luis',departmentId:'operaciones',type:'leadership',unit:'Centro'}
];
const plans=[
  {id:'p1',period:'2026-11',person:'Ana',departmentId:'seguridad',targets:{leadership:2,pst:1}},
  {id:'p2',period:'2026-11',person:'Luis',departmentId:'operaciones',targets:{leadership:1}}
];
const findings=[
  {id:'f1',folio:'SM-HAL-001',sourceReportId:'r1',checkIndex:2,findingType:'No cumple',risk:'Crítico',status:'Abierto',date:'2026-11-03',departmentId:'seguridad'},
  {id:'f2',folio:'SM-HAL-002',sourceReportId:'r1',checkIndex:3,findingType:'No cumple',risk:'Alto',status:'Cerrado',date:'2026-11-03',departmentId:'seguridad'}
];
const actions=[
  {id:'a1',folio:'SM-AC-001',start:'2026-11-03',due:'2026-11-20',status:'Por verificar',risk:'Crítico',responsibleId:'u1',owner:'Ana',departmentId:'seguridad'},
  {id:'a2',folio:'SM-AC-002',start:'2026-11-03',due:'2026-11-24',status:'Cerrado',verifiedDate:'2026-11-25',risk:'Bajo',owner:'Luis',departmentId:'operaciones'},
  {id:'a3',folio:'SM-AC-003',start:'2026-11-03',due:'2026-11-01',status:'Pendiente',risk:'Alto',owner:'Ana',departmentId:'seguridad'},
  {id:'a4',folio:'SM-AC-004',status:'Pendiente',risk:'Medio',owner:'Luis',departmentId:'operaciones'}
];
const filters={period:'2026-11',referenceDate:'2026-11-22'};

const folioBase='SM-HAL-'+A.today().replace(/-/g,'');
assert.equal(A.folio('HAL',findings,'folio'),folioBase+'-01');
assert.equal(A.folio('HAL',[...findings,{folio:folioBase+'-01'}],'folio'),folioBase+'-02');
assert.equal(A.dedupeKey(findings[0]),'r1|2|no cumple');
assert.equal(A.dedupeKey(findings[0]),A.dedupeKey({sourceReportId:'r1',checkIndex:2,findingType:'No cumple',title:'Sin control'}));
assert(A.isDuplicate(findings,{sourceReportId:'r1',checkIndex:2,findingType:'No cumple'}));
assert.equal(A.isDuplicate(findings,{sourceReportId:'r1',checkIndex:9,findingType:'No cumple'}),false);
assert.equal(A.riskOf({answer:'No cumple',criticalControl:true}),'Crítico');
assert.equal(A.riskOf({answer:'No cumple'}),'Alto');
assert.equal(A.riskOf({risk:'Bajo'}),'Bajo');

assert.equal(A.trafficLight({status:'Cerrado',verifiedDate:'2026-11-25',due:'2026-11-20'},'2026-11-22'),'Verde');
assert.equal(A.trafficLight({status:'Pendiente',due:'2026-11-24'},'2026-11-22'),'Amarillo');
assert.equal(A.trafficLight({status:'Pendiente',due:'2026-11-20'},'2026-11-22'),'Rojo');
assert.equal(A.trafficLight({status:'Cancelado',due:'2026-11-20'},'2026-11-22'),'Gris');
assert.equal(A.actionStatus({status:'Por verificar',due:'2026-11-20'},'2026-11-22'),'Vencido');
assert.equal(A.canClose({risk:'Crítico'},{id:'u1'}).ok,false);
assert.equal(A.canClose({risk:'Crítico'},{id:'u2'},{safetyReview:true}).ok,true);
assert.equal(A.canClose({risk:'Bajo',responsibleId:'u1'},{id:'u1'},{procedureRequiresSafety:true}).ok,false);

const changed=A.reschedule(actions[0],'2026-12-10','Espera de permiso',{id:'u2'});
assert.equal(changed.originalDue,'2026-11-20');
assert.equal(changed.due,'2026-12-10');
assert.equal(changed.rescheduledBy,'u2');
assert.equal(changed.rescheduleCount,1);
assert.throws(()=>A.reschedule(actions[0],'no-fecha','motivo',{}));

const kpi=A.computeKpis({reports,actions,findings,plans},filters);
assert.equal(kpi.supervisionesProgramadas,4);
assert.equal(kpi.supervisionesRealizadas,2);
assert.equal(kpi.cumplimientoMensual,50);
assert.equal(kpi.supervisionesPendientes,2);
assert.equal(kpi.supervisionesAtrasadas,1);
assert.equal(kpi.hallazgosAbiertos,1);
assert.equal(kpi.accionesEnProceso,2);
assert.equal(kpi.accionesVencidas,2);
assert.equal(kpi.accionesCerradas,1);
assert.equal(kpi.hallazgosCriticos,1);
assert.equal(kpi.detalle.drafts.length,1,'Los borradores no cuentan como finalizados');

const matrix=A.complianceMatrix({reports,plans},filters);
assert.equal(matrix.length,2);
assert.equal(matrix.find(r=>r.department==='seguridad').cumplimiento,33);
assert.equal(matrix.find(r=>r.department==='seguridad').supervisores.length,1);
assert.equal(matrix.find(r=>r.department==='operaciones').programado,1);

const charts=A.chartData({reports,actions,findings,plans},filters);
assert.equal(charts.hallazgosPorRiesgo.find(r=>r.label==='Crítico').value,1);
assert.equal(charts.programadoContraRealizado.length,2);
assert.equal(charts.accionesAbiertasCerradas.length,2);
assert(charts.evolucionCumplimiento.length>=1);

const month=A.calendar([{id:'x',date:'2026-11-22',status:'Finalizado'}],'month','2026-11-22');
assert.equal(month.cells.length,42);
assert.equal(month.cells.filter(c=>c.items.length).length,1);
const week=A.calendar([{id:'x',date:'2026-11-22'}],'week','2026-11-22');
assert.equal(week.cells.length,7);

const xml=A.excelXml([{name:'KPIs',columns:[{key:'indicador',label:'Indicador'},{key:'valor',label:'Valor',type:'Number'}],rows:[{indicador:'Realizadas',valor:2},{indicador:'Vencidas',valor:2}]}]);
assert(xml.includes('AutoFilter'));
assert(xml.includes('<Data ss:Type="Number">4</Data>'));
assert(xml.includes('TOTAL'));

const event=A.auditEvent({id:'u1',name:'Ana'},'action.reschedule',{collection:'actions',id:'a1'},{due:'2026-11-20'},{due:'2026-12-10'},'Permiso');
assert.equal(event.actorUid,'u1');
assert.equal(event.reference.collection,'actions');
assert(event.createdAt);
console.log('Núcleo avanzado: folio único, deduplicación, riesgo, semáforo, cierres, reprogramación, 10 KPIs, matriz, gráficos, calendario, Excel y auditoría: OK');
