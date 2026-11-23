(function(root){
 // Additional modules contribute only when the administrator explicitly programs a target.
 const groups=[['inspection','Inspecciones',5],['leadership','Liderazgo',6],['pst','Evaluación PST',3],['unsafe','Actos / condiciones',6],['talk','Pláticas RIT',5],['epp','Inspección EPP',5],['veo','Verificación de Estándares',0],['observation','Observaciones preventivas',0],['incident','Incidentes y accidentes',0],['training','Capacitación',0]];
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
 const date=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function actionStatus(a,today=date()){return a.status==='Cerrado'?'Cerrado':a.status==='Por verificar'?'Por verificar':a.due<today?'Vencido':'Pendiente'}
 function inPeriod(a,period){if(!period)return true;const end=new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate();return a.start<=period+'-'+end&&(a.due>=period+'-01'||a.status!=='Cerrado')}
 function matrix({plans=[],reports=[],actions=[],types=[],period,query='',unit='',department='',today=date()}){const relevantPlans=plans.filter(p=>p.period===period),relevantReports=reports.filter(r=>r.date?.startsWith(period)&&r.supervisor?.trim()),relevantActions=actions.filter(a=>inPeriod(a,period));const deptId=r=>globalThis.SAFETY?.departmentOf?.(r)||'';const names=new Map();[...relevantPlans.map(p=>p.person),...relevantReports.map(r=>r.supervisor),...relevantActions.map(a=>a.owner)].forEach(n=>{if(norm(n)&&!names.has(norm(n)))names.set(norm(n),n.trim())});return [...names].map(([key,name])=>{const plan=relevantPlans.find(p=>norm(p.person)===key),personReports=relevantReports.filter(r=>norm(r.supervisor)===key&&r.status==='Finalizado'),personActions=relevantActions.filter(a=>norm(a.owner)===key);const cells=groups.map(([id,label,target])=>{const applicable=plan&&(Number(plan.kpi)===2||!['talk','epp','veo','observation','incident','training'].includes(id));const p=applicable?Number(plan.targets?.[id]??target):0,e=personReports.filter(r=>types.find(t=>t.id===r.type)?.group===id).length;return{id,label,p,e,a:period<today.slice(0,7)?Math.max(0,p-e):0,applicable:!!applicable}});const p=cells.reduce((s,c)=>s+c.p,0),e=cells.reduce((s,c)=>s+c.e,0),credit=cells.reduce((s,c)=>s+Math.min(c.e,c.p),0),a=cells.reduce((s,c)=>s+c.a,0);return{key,name,unit:plan?.unit||personActions[0]?.unit||'Sin unidad asignada',department:plan?.department||relevantReports.find(r=>norm(r.supervisor)===key)?.department||'',departmentId:deptId(plan||relevantReports.find(r=>norm(r.supervisor)===key)),plan,kpi:plan?.kpi,cells,p,e,a,percent:p?Math.round(credit/p*100):null,actions:personActions.length,closed:personActions.filter(a=>a.status==='Cerrado').length,overdue:personActions.filter(a=>actionStatus(a,today)==='Vencido').length,verification:personActions.filter(a=>a.status==='Por verificar').length};}).filter(r=>(!query||norm(r.name+' '+r.department).includes(norm(query)))&&(!unit||r.unit===unit)&&(!department||r.departmentId===department)).sort((a,b)=>a.name.localeCompare(b.name,'es'))}
 function departmentMatrix(options={}){
  const rows=matrix(options),groups=new Map();
  for(const row of rows){
    const key=row.departmentId||'';
    const label=key?(globalThis.SAFETY?.departmentName?.(key)||key):'Sin departamento asignado';
    if(!groups.has(key))groups.set(key,{id:key,name:label,rows:[],p:0,e:0,a:0,percent:null});
    const group=groups.get(key);group.rows.push(row);group.p+=row.p;group.e+=row.e;group.a+=row.a;
  }
  for(const group of groups.values())group.percent=group.p?Math.round(Math.min(group.e,group.p)/group.p*100):null;
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 }
 root.SMProgress={groups,norm,date,actionStatus,inPeriod,matrix,departmentMatrix};
})(globalThis);
