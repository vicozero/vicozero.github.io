/* FASES 3-8 · Interfaz aditiva. No sustituye ningún formulario histórico. */
(function(){
  'use strict';
  const A=globalThis.SMAdvancedCore,PDF=globalThis.SMAdvancedPDF;
  if(!A){console.warn('Núcleo avanzado no disponible.');return;}
  const by=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={findings:[],templates:[],alerts:[],audit:[],reports:null,actions:null,view:'advancedDashboard',filters:{},expanded:new Set(),kanban:false};
  const can=(key)=>{const p=globalThis.AUTH?.user?.permissions||{};return globalThis.AUTH?.user?.role==='admin'||p[key]===true;};
  const toast=message=>{const el=by('toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),4200)};
  const api=async(path,options)=>{const res=await fetch('/api/'+path,options);const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'No se pudo completar la operación.');return data};

  const VIEWS={
    advancedDashboard:['Centro de control ejecutivo','KPIs, matriz y alertas con datos reales.'],
    advancedSupervision:['Supervisión avanzada','Folio único, checklist, evidencias e historial.'],
    advancedFindings:['Hallazgos y acciones','Semáforo, riesgo, responsables y verificación.'],
    advancedReports:['Reportes y calendario','PDF, Excel, programación y reprogramación.']
  };

  function ensureShell(){
    let nav=document.querySelector('#sidebar nav');
    if(!nav)return false;
    if(!by('advancedDashboard')){
      const group=document.createElement('div');group.className='nav-group';group.textContent='GESTIÓN AVANZADA';nav.append(group);
      for(const [view,label,icon] of [['advancedDashboard','Centro ejecutivo','◈'],['advancedSupervision','Supervisión avanzada','▣'],['advancedFindings','Hallazgos y acciones','◉'],['advancedReports','Reportes y calendario','▦']]){
        const button=document.createElement('button');button.type='button';button.dataset.view=view;button.innerHTML=`${icon} <span>${label}</span>`;nav.append(button);
      }
    }
    const main=document.querySelector('main');
    if(!main)return false;
    for(const view of Object.keys(VIEWS)){
      if(by(view))continue;
      const section=document.createElement('section');section.id=view;section.className='advanced-view';section.hidden=true;
      section.innerHTML=`<div class="advanced-head"><span class="eyebrow">SIERRA MADRE · SEGURIDAD INDUSTRIAL</span><h2>${VIEWS[view][0]}</h2><p>${VIEWS[view][1]}</p></div><div id="${view}Body"></div>`;
      main.append(section);
    }
    const base=globalThis.navigate;
    globalThis.navigate=function(view){
      document.querySelectorAll('.advanced-view').forEach(section=>section.hidden=section.id!==view);
      if(view.startsWith('advanced')){
        ['dashboard','reports','program','actions','progress','team','users','notices','departments'].forEach(id=>{const el=by(id);if(el)el.hidden=true});
        document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
        const title=VIEWS[view];if(title){if(by('pageTitle'))by('pageTitle').textContent=title[0];if(by('pageSubtitle'))by('pageSubtitle').textContent=title[1];if(by('crumb'))by('crumb').textContent=title[0]}
        document.body.dataset.view=view;document.body.classList.remove('nav-open');
        render(view);return;
      }
      return base?.(view);
    };
    return true;
  }

  function data(){
    const reports=Array.isArray(globalThis.reports)&&globalThis.reports.length?globalThis.reports:(state.reports||[]);
    const actions=Array.isArray(globalThis.actions)&&globalThis.actions.length?globalThis.actions:(state.actions||[]);
    return {reports,actions,findings:state.findings,plans:Array.isArray(globalThis.plans)?globalThis.plans:[]};
  }
  function currentFilters(){
    const f={...state.filters};
    const period=by('advancedPeriod');if(period?.value)f.period=period.value;
    const unit=by('advancedUnit');if(unit?.value)f.unitId=unit.value;
    const dep=by('advancedDepartment');if(dep?.value)f.departmentId=dep.value;
    const sup=by('advancedSupervisor');if(sup?.value)f.supervisor=sup.value;
    const type=by('advancedType');if(type?.value)f.inspectionType=type.value;
    return f;
  }
  function filterBar(){
    const units=[...new Set(data().reports.map(r=>r.unit||r.unitId||'').filter(Boolean))];
    const deps=[...new Set([...(globalThis.SM_DEPARTMENTS||[]).map(d=>d.id),...data().reports.map(r=>r.departmentId||r.department||'').filter(Boolean)])];
    const sups=[...new Set(data().reports.map(r=>r.supervisor||'').filter(Boolean))];
    const types=[...new Set(data().reports.map(r=>r.type||'').filter(Boolean))];
    return `<div class="advanced-filters">
      <label>Periodo <input type="month" id="advancedPeriod" value="${esc(state.filters.period||A.today().slice(0,7))}"></label>
      <label>Unidad <select id="advancedUnit"><option value="">Todas</option>${units.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>
      <label>Departamento <select id="advancedDepartment"><option value="">Todos</option>${deps.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>
      <label>Supervisor <select id="advancedSupervisor"><option value="">Todos</option>${sups.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>
      <label>Tipo <select id="advancedType"><option value="">Todos</option>${types.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>
    </div>`;
  }
  function bindFilters(){
    ['advancedPeriod','advancedUnit','advancedDepartment','advancedSupervisor','advancedType'].forEach(id=>{const el=by(id);if(el)el.addEventListener('change',()=>{state.filters=currentFilters();render()})});
  }

  function renderDashboard(body){
    const f=currentFilters(),kpi=A.computeKpis(data(),f),charts=A.chartData(data(),f),matrix=A.complianceMatrix(data(),f);
    const cards=[['Supervisiones programadas',kpi.supervisionesProgramadas],['Supervisiones realizadas',kpi.supervisionesRealizadas],['Cumplimiento mensual',kpi.cumplimientoMensual+'%'],['Supervisiones pendientes',kpi.supervisionesPendientes],['Supervisiones atrasadas',kpi.supervisionesAtrasadas],['Hallazgos abiertos',kpi.hallazgosAbiertos],['Acciones en proceso',kpi.accionesEnProceso],['Acciones vencidas',kpi.accionesVencidas],['Acciones cerradas',kpi.accionesCerradas],['Hallazgos críticos',kpi.hallazgosCriticos]];
    body.innerHTML=`${filterBar()}<div class="advanced-kpis">${cards.map(([label,value],i)=>`<article class="advanced-kpi ${i===9?'critical':''}"><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`).join('')}</div>
      <div class="advanced-grid"><div class="advanced-panel"><h3>Cumplimiento por departamento</h3>${bars(charts.cumplimientoPorDepartamento)}</div>
      <div class="advanced-panel"><h3>Hallazgos por riesgo</h3>${bars(charts.hallazgosPorRiesgo)}</div>
      <div class="advanced-panel"><h3>Acciones abiertas y cerradas</h3>${bars(charts.accionesAbiertasCerradas)}</div>
      <div class="advanced-panel"><h3>Evolución del cumplimiento</h3>${bars(charts.evolucionCumplimiento)}</div></div>
      <div class="advanced-panel"><h3>Matriz de cumplimiento</h3><div class="advanced-table-wrap"><table><thead><tr><th>Departamento</th><th>Programado</th><th>Realizado</th><th>Pendiente</th><th>Atrasado</th><th>Cumplimiento</th></tr></thead><tbody>${matrix.map(row=>`<tr><td><button class="link-button" data-expand-dep="${esc(row.department)}">${state.expanded.has(row.department)?'▾':'▸'} ${esc(row.department)}</button>${state.expanded.has(row.department)?`<div class="advanced-sub">${row.supervisores.map(s=>`<span>${esc(s.supervisor)}: ${s.realizado}/${s.programado}</span>`).join('')}</div>`:''}</td><td>${row.programado}</td><td>${row.realizado}</td><td>${row.pendiente}</td><td>${row.atrasado}</td><td>${row.cumplimiento}%</td></tr>`).join('')||'<tr><td colspan="6">Sin datos en el periodo.</td></tr>'}</tbody></table></div></div>
      <div class="advanced-panel"><h3>Alertas internas</h3>${alertsHtml()}</div>`;
    bindFilters();
    body.querySelectorAll('[data-expand-dep]').forEach(button=>button.addEventListener('click',()=>{const dep=button.dataset.expandDep;state.expanded.has(dep)?state.expanded.delete(dep):state.expanded.add(dep);render()}));
  }
  function bars(rows){
    const max=Math.max(1,...rows.map(r=>Number(r.value)||0));
    return `<div class="advanced-bars">${rows.map(r=>`<div class="advanced-bar"><span>${esc(r.label)}</span><i style="width:${Math.max(2,(Number(r.value)||0)/max*100)}%"></i><b>${esc(r.value)}</b></div>`).join('')||'<p class="muted">Sin datos.</p>'}</div>`;
  }
  function alertsHtml(){
    const items=state.alerts.filter(a=>!a.read).slice(0,8);
    return items.length?`<ul class="advanced-alerts">${items.map(a=>`<li><b>${esc(a.event)}</b> ${esc(a.text)} <small>${esc(a.createdAt||'')}</small></li>`).join('')}</ul>`:'<p class="muted">No hay alertas pendientes.</p>';
  }

  function renderSupervision(body){
    body.innerHTML=`${filterBar()}<div class="advanced-grid"><form id="advancedInspectionForm" class="advanced-panel">
      <h3>Nueva supervisión</h3>
      <div class="advanced-form-grid">
        <label>Unidad minera<input name="unit" required></label><label>Departamento<input name="department" required list="advancedDepList"><datalist id="advancedDepList">${(globalThis.SM_DEPARTMENTS||[]).map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</datalist></label>
        <label>Área<input name="area" required></label><label>Fecha<input name="date" type="date" value="${A.today()}" required></label>
        <label>Hora<input name="time" type="time"></label><label>Turno<select name="shift" required><option>Día / Turno 1</option><option>Noche / Turno 2</option></select></label>
        <label>Supervisor<input name="supervisor" value="${esc(globalThis.AUTH?.user?.name||'')}" required ${globalThis.AUTH?.user?.role==='admin'?'':'readonly'}></label>
        <label>Responsable del departamento<input name="responsible" required></label>
        <label>Tipo de inspección<select name="inspectionType" id="advancedTemplateSelect" required>${state.templates.map(t=>`<option value="${esc(t.id||t.name)}">${esc(t.name)}</option>`).join('')||'<option value="general">General</option>'}</select></label>
      </div>
      <h4>Lista de verificación</h4><div id="advancedChecklist"></div>
      <label>Observaciones<textarea name="observations" rows="3"></textarea></label>
      <label>Evidencias fotográficas (máximo 6, se guardan en el registro)<input id="advancedPhotos" type="file" accept="image/*" multiple></label>
      <div id="advancedPhotoPreview" class="advanced-photos"></div>
      <div class="advanced-actions"><button type="button" class="secondary" id="advancedSaveDraft">Guardar borrador</button><button type="submit" class="primary">Finalizar supervisión</button><button type="button" class="secondary" id="advancedSupervisionPdf">Generar PDF</button></div>
      <p id="advancedSupervisionState" class="muted"></p>
    </form>
    <div class="advanced-panel"><h3>Borradores y supervisiones</h3><div id="advancedInspectionList"></div><h4>Historial de modificaciones</h4><div id="advancedInspectionHistory"></div></div></div>`;
    bindFilters();
    const form=by('advancedInspectionForm'),photos=[];
    const template=()=>state.templates.find(t=>(t.id||t.name)===form.elements.inspectionType.value);
    const renderChecks=()=>{const checks=template()?.checks||['Cumplimiento de controles','Condiciones del área','EPP','Documentación'];by('advancedChecklist').innerHTML=checks.map((c,i)=>`<div class="advanced-check"><span>${esc(typeof c==='string'?c:c.label||c.text||'Control '+(i+1))}</span><select name="check-${i}" aria-label="Resultado ${i+1}"><option>Cumple</option><option>No cumple</option><option>No aplica</option></select><input name="reason-${i}" placeholder="Observación"></div>`).join('')};
    renderChecks();form.elements.inspectionType.addEventListener('change',renderChecks);
    by('advancedPhotos').addEventListener('change',async event=>{const files=[...event.target.files];if(photos.length+files.length>6){toast('Máximo 6 fotografías.');event.target.value='';return}for(const file of files){if(file.size>20*1024*1024){toast('Cada fotografía debe pesar menos de 20 MB.');continue}const dataUrl=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)});photos.push({caption:file.name,dataUrl})}event.target.value='';renderPhotoPreview()});
    const renderPhotoPreview=()=>{by('advancedPhotoPreview').innerHTML=photos.map((p,i)=>`<span>${esc(p.caption)} <button type="button" data-remove-adv-photo="${i}">×</button></span>`).join('')};
    by('advancedPhotoPreview').addEventListener('click',event=>{const b=event.target.closest('[data-remove-adv-photo]');if(!b)return;photos.splice(Number(b.dataset.removeAdvPhoto),1);renderPhotoPreview()});
    const collect=status=>{
      const f=new FormData(form),checks=template()?.checks||['Cumplimiento de controles','Condiciones del área','EPP','Documentación'];
      return {id:globalThis.crypto?.randomUUID?.()||'ins-'+Date.now(),folio:A.folio('SUP',state.findings.concat(data().reports),'folio'),unit:f.get('unit'),departmentId:f.get('department'),department:f.get('department'),area:f.get('area'),date:f.get('date'),time:f.get('time'),shift:f.get('shift'),supervisor:f.get('supervisor'),responsible:f.get('responsible'),type:f.get('inspectionType'),observations:f.get('observations'),status,photos:photos.map(p=>({...p})),checks:checks.map((c,i)=>({question:typeof c==='string'?c:c.label||c.text||'Control '+(i+1),answer:f.get('check-'+i),reason:f.get('reason-'+i)||''})),updated:new Date().toISOString(),revision:0,ownerAccountId:globalThis.AUTH?.user?.id||''};
    };
    const save=async(record)=>{try{const saved=await api('reports/'+record.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});by('advancedSupervisionState').textContent=(record.status==='Borrador'?'Borrador guardado.':'Supervisión finalizada.')+' '+saved.folio;await load();toast(record.status==='Borrador'?'Avance Guardado':'Finalizado');return saved}catch(error){toast(error.message);return null}};
    by('advancedSaveDraft').onclick=()=>save(collect('Borrador'));
    form.onsubmit=async event=>{event.preventDefault();const record=collect('Finalizado');const saved=await save(record);if(!saved)return;for(const check of record.checks.filter(c=>c.answer==='No cumple')){await createFinding(saved,check)}};
    by('advancedSupervisionPdf').onclick=async()=>{const record=collect(form.elements.status?.value||'Finalizado');if(!PDF)return toast('PDF no disponible.');try{const bytes=await PDF.generateSupervisionPDF(record);download(new Blob([bytes],{type:'application/pdf'}),'Sierra-Madre-'+record.folio+'.pdf')}catch(error){toast(error.message)}};
    const reports=data().reports.filter(r=>r.type&&state.templates.some(t=>(t.id||t.name)===r.type)||r.area||r.shift);
    by('advancedInspectionList').innerHTML=reports.length?`<div class="advanced-table-wrap"><table><thead><tr><th>Folio</th><th>Fecha</th><th>Área</th><th>Supervisor</th><th>Estado</th><th></th></tr></thead><tbody>${reports.map(r=>`<tr><td>${esc(r.folio)}</td><td>${esc(r.date)}</td><td>${esc(r.area||r.place||'')}</td><td>${esc(r.supervisor||'')}</td><td>${esc(r.status||'')}</td><td><button class="link-button" data-adv-pdf="${esc(r.id)}">PDF</button> <button class="link-button" data-adv-history="${esc(r.id)}">Historial</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Aún no hay supervisiones avanzadas en este periodo.</p>';
    by('advancedInspectionList').querySelectorAll('[data-adv-pdf]').forEach(button=>button.onclick=async()=>{const record=data().reports.find(r=>r.id===button.dataset.advPdf);const bytes=await PDF.generateSupervisionPDF(record);download(new Blob([bytes],{type:'application/pdf'}),'Sierra-Madre-'+record.folio+'.pdf')});
    by('advancedInspectionList').querySelectorAll('[data-adv-history]').forEach(button=>button.onclick=()=>{const id=button.dataset.advHistory;by('advancedInspectionHistory').innerHTML=historyHtml(id)});
  }
  function historyHtml(id){const rows=state.audit.filter(e=>e.reference?.id===id||e.targetId===id);return rows.length?`<ul>${rows.map(e=>`<li>${esc(e.event)} · ${esc(e.actorName||e.actorUid)} · ${esc(e.createdAt)}</li>`).join('')}</ul>`:'<p class="muted">Sin eventos registrados.</p>'}

  async function notifyRisk(finding){
    if(!['Crítico','Alto'].includes(finding.risk))return;
    try{
      const directory=await fetch('/api/directory',{cache:'no-store'}).then(r=>r.ok?r.json():[]);
      const admins=(Array.isArray(directory)?directory:[]).filter(u=>(u.role==='admin'||u.role==='supervisor')&&u.id!==globalThis.AUTH?.user?.id).slice(0,20);
      for(const admin of admins){
        await api('advanceAlerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          toAccountId:admin.id,fromAccountId:globalThis.AUTH?.user?.id||'',
          event:'hallazgo.'+String(finding.risk).toLowerCase(),
          text:String(finding.folio||'')+' · '+String(finding.description||'').slice(0,240),
          read:false
        })});
      }
    }catch(error){console.warn('No se pudo notificar el hallazgo',error)}
  }

  async function createFinding(report,check){
    const detail={sourceReportId:report.id,checkIndex:String(report.checks||[]).indexOf(check),findingType:'No cumple'};
    if(A.isDuplicate(state.findings,detail)){toast('El hallazgo de este control ya existe; no se duplicó.');return}
    const risk=A.riskOf({answer:check.answer,criticalControl:/critic|incendio|explos|energia|altura/i.test(check.question||'')});
    const finding={id:globalThis.crypto?.randomUUID?.()||'hal-'+Date.now(),folio:A.folio('HAL',state.findings,'folio'),...detail,dedupeKey:A.dedupeKey(detail),departmentId:report.departmentId||'',area:report.area||'',description:check.reason||check.question,title:check.question,risk,status:'Abierto',date:report.date,createdAt:new Date().toISOString(),sourceReportId:report.id,ownerAccountId:globalThis.AUTH?.user?.id||''};
    const saved=await api('findings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(finding)});
    state.findings.push(saved);
    await notifyRisk(saved);
    const action={id:globalThis.crypto?.randomUUID?.()||'ac-'+Date.now(),folio:A.folio('AC',data().actions,'folio'),description:saved.description,owner:saved.responsible||report.responsible||'',responsibleId:saved.responsibleId||'',source:'Supervisión '+report.folio,sourceReport:report.id,linkedReportId:report.id,sourceFindingId:saved.id,risk,status:'Pendiente',progress:0,start:report.date,due:'',departmentId:saved.departmentId,revision:0};
    try{await api('actions/'+action.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)})}catch(error){console.warn('No se pudo crear la acción vinculada',error)}
    await load();toast('Hallazgo '+saved.folio+' vinculado a la supervisión.');
  }

  function renderFindings(body){
    const f=currentFilters(),rows=state.findings.filter(item=>A.matches(item,f));
    const lights=['Rojo','Amarillo','Verde','Gris'];
    body.innerHTML=`${filterBar()}<div class="advanced-toolbar">
      <input id="advancedFindingSearch" placeholder="Buscar folio, descripción o responsable" aria-label="Buscar hallazgos">
      <label>Riesgo <select id="advancedRiskFilter"><option value="">Todos</option><option>Crítico</option><option>Alto</option><option>Medio</option><option>Bajo</option></select></label>
      <label>Semáforo <select id="advancedLightFilter"><option value="">Todos</option>${lights.map(l=>`<option>${l}</option>`).join('')}</select></label>
      <button class="secondary" id="advancedToggleKanban">${state.kanban?'Vista tabla':'Vista Kanban'}</button>
      <button class="secondary" id="advancedOverdue">Compromisos vencidos</button>
      <button class="secondary" id="advancedFindingsPdf">PDF</button>
      <button class="secondary" id="advancedExcel">Excel</button>
    </div><div id="advancedFindingsContent"></div>`;
    bindFilters();
    const search=by('advancedFindingSearch'),risk=by('advancedRiskFilter'),light=by('advancedLightFilter');
    const filtered=()=>rows.filter(r=>(!risk.value||r.risk===risk.value)&&(!light.value||A.trafficLight(r.due?{...r,due:r.due}:{...r,due:''})===light.value)&&(!search.value||A.norm([r.folio,r.description,r.title,r.responsible].join(' ')).includes(A.norm(search.value))));
    const draw=()=>{
      const list=filtered();
      if(state.kanban){
        by('advancedFindingsContent').innerHTML=`<div class="advanced-kanban">${lights.map(l=>`<div><h3>${l}</h3>${list.filter(r=>A.trafficLight({...r,due:r.due||''})===l).map(card).join('')||'<p class="muted">Sin registros.</p>'}</div>`).join('')}</div>`;
      }else{
        by('advancedFindingsContent').innerHTML=`<div class="advanced-table-wrap"><table><thead><tr><th>Folio</th><th>Origen</th><th>Departamento</th><th>Descripción</th><th>Riesgo</th><th>Semáforo</th><th>Responsable</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(r=>`<tr class="${r.risk==='Crítico'?'risk-critical':''}"><td>${esc(r.folio)}</td><td>${esc(r.sourceReportId||'')}</td><td>${esc(r.departmentId||'')}</td><td>${esc(r.description||r.title||'')}</td><td><span class="risk risk-${esc(r.risk||'')}">${esc(r.risk||'')}</span></td><td><span class="light light-${esc(A.trafficLight({...r,due:r.due||''}))}">${esc(A.trafficLight({...r,due:r.due||''}))}</span></td><td>${esc(r.responsible||'')}</td><td>${esc(r.status||'')}</td><td>${can('edit_actions')?`<button class="link-button" data-adv-close="${esc(r.id)}">Cerrar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="9">Sin hallazgos con estos filtros.</td></tr>'}</tbody></table></div>`;
        by('advancedFindingsContent').querySelectorAll('[data-adv-close]').forEach(button=>button.onclick=async()=>{const item=state.findings.find(r=>r.id===button.dataset.advClose);const check=A.canClose(item,globalThis.AUTH?.user,{safetyReview:can('admin')||globalThis.AUTH?.user?.role==='admin'});if(!check.ok)return toast(check.reason);await api('findings/'+item.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,status:'Cerrado',closedAt:new Date().toISOString(),verifier:globalThis.AUTH?.user?.name||''})});await load();toast('Hallazgo cerrado y verificado.')});
      }
    };
    const card=r=>`<article class="advanced-card ${r.risk==='Crítico'?'risk-critical':''}"><b>${esc(r.folio)}</b><p>${esc(r.description||r.title||'')}</p><small>${esc(r.risk||'')} · ${esc(r.departmentId||'')}</small></article>`;
    [search,risk,light].forEach(el=>el.addEventListener('input',draw));
    by('advancedToggleKanban').onclick=()=>{state.kanban=!state.kanban;render()};
    by('advancedOverdue').onclick=()=>{light.value='Rojo';draw()};
    by('advancedFindingsPdf').onclick=async()=>{if(!PDF)return toast('PDF no disponible.');const bytes=await PDF.generateMonthlyReportPDF({period:f.period||A.today().slice(0,7),data:{...data(),findings:filtered()},filters:f});download(new Blob([bytes],{type:'application/pdf'}),'Sierra-Madre-Hallazgos.pdf')};
    by('advancedExcel').onclick=()=>exportFindingsExcel(filtered());
    draw();
  }
  function exportFindingsExcel(rows){
    const xml=A.excelXml([{name:'Hallazgos',columns:[{key:'folio',label:'Folio'},{key:'description',label:'Descripción'},{key:'risk',label:'Riesgo'},{key:'status',label:'Estado'},{key:'departmentId',label:'Departamento'},{key:'due',label:'Compromiso'}],rows:rows.map(r=>({...r,description:r.description||r.title||''}))}]);
    download(new Blob([xml],{type:'application/vnd.ms-excel'}),'Sierra-Madre-Hallazgos.xls');
  }
  function download(blob,name){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),3000)}

  function renderReports(body){
    const f=currentFilters(),kpi=A.computeKpis(data(),f),cal=A.calendar([...data().reports,...data().actions,...state.findings],'month',f.period?f.period+'-15':A.today());
    body.innerHTML=`${filterBar()}<div class="advanced-grid"><div class="advanced-panel"><h3>Reporte mensual ejecutivo</h3><p class="muted">KPIs y cifras idénticas al centro de control.</p><button class="primary" id="advancedMonthlyPdf">Generar PDF mensual</button> <button class="secondary" id="advancedMonthlyExcel">Exportar Excel</button></div>
    <div class="advanced-panel"><h3>Calendario</h3><div class="advanced-toolbar"><button class="secondary" id="advancedCalendarMonth">Mensual</button><button class="secondary" id="advancedCalendarWeek">Semanal</button></div><div id="advancedCalendar"></div></div></div>
    <div class="advanced-panel"><h3>Reprogramación controlada</h3><div id="advancedReschedule"></div></div>`;
    bindFilters();
    const drawCalendar=view=>{const grid=A.calendar([...data().reports,...data().actions,...state.findings],view,f.period?f.period+'-15':A.today());by('advancedCalendar').innerHTML=`<div class="advanced-calendar ${view}">${grid.cells.map(c=>`<div class="${c.outside?'outside':''}"><b>${esc(c.date.slice(8))}</b>${c.items.map(i=>`<span class="light-${esc(i.light)}">${esc(i.label)}</span>`).join('')}</div>`).join('')}</div>`};
    drawCalendar('month');
    by('advancedCalendarMonth').onclick=()=>drawCalendar('month');by('advancedCalendarWeek').onclick=()=>drawCalendar('week');
    by('advancedMonthlyPdf').onclick=async()=>{if(!PDF)return toast('PDF no disponible.');const matrix=A.complianceMatrix(data(),f);const bytes=await PDF.generateMonthlyReportPDF({period:f.period||A.today().slice(0,7),kpis:kpi,matrix,data:{...data(),findings:state.findings},filters:f});download(new Blob([bytes],{type:'application/pdf'}),'Sierra-Madre-Reporte-Mensual.pdf')};
    by('advancedMonthlyExcel').onclick=()=>{const xml=A.excelXml([{name:'KPIs',columns:[{key:'indicador',label:'Indicador'},{key:'valor',label:'Valor',type:'Number'}],rows:[['supervisionesProgramadas',kpi.supervisionesProgramadas],['supervisionesRealizadas',kpi.supervisionesRealizadas],['cumplimientoMensual',kpi.cumplimientoMensual],['hallazgosAbiertos',kpi.hallazgosAbiertos],['accionesVencidas',kpi.accionesVencidas],['accionesCerradas',kpi.accionesCerradas],['hallazgosCriticos',kpi.hallazgosCriticos]].map(([indicador,valor])=>({indicador,valor}))},{name:'Matriz',columns:[{key:'department',label:'Departamento'},{key:'programado',label:'Programado',type:'Number'},{key:'realizado',label:'Realizado',type:'Number'},{key:'cumplimiento',label:'Cumplimiento %',type:'Number'}],rows:A.complianceMatrix(data(),f).map(r=>({department:r.department,programado:r.programado,realizado:r.realizado,cumplimiento:r.cumplimiento}))}]);download(new Blob([xml],{type:'application/vnd.ms-excel'}),'Sierra-Madre-Reporte-Mensual.xls')};
    const actions=data().actions.filter(a=>a.due&&!['Cerrado','Cancelado'].includes(a.status));
    by('advancedReschedule').innerHTML=actions.length?`<div class="advanced-table-wrap"><table><thead><tr><th>Acción</th><th>Responsable</th><th>Fecha original</th><th>Compromiso</th><th>Motivo</th><th></th></tr></thead><tbody>${actions.map(a=>`<tr><td>${esc(a.folio||a.id)}</td><td>${esc(a.owner||'')}</td><td>${esc(a.originalDue||a.start||'')}</td><td>${esc(a.due)}</td><td><input data-reschedule-reason="${esc(a.id)}" placeholder="Motivo de la reprogramación"></td><td><button class="secondary" data-reschedule="${esc(a.id)}">Reprogramar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No hay acciones con compromiso pendiente.</p>';
    by('advancedReschedule').querySelectorAll('[data-reschedule]').forEach(button=>button.onclick=async()=>{const action=data().actions.find(a=>a.id===button.dataset.reschedule);const reason=document.querySelector(`[data-reschedule-reason="${action.id}"]`)?.value||'';try{const updated=A.reschedule(action,action.due,reason,globalThis.AUTH?.user);await api('actions/'+action.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});toast('Reprogramación registrada con fecha original e historial.')}catch(error){toast(error.message)}});
  }

  function render(view){
    const target=view||state.view;state.view=target;
    const body=by(target+'Body');if(!body)return;
    if(target==='advancedDashboard')renderDashboard(body);
    if(target==='advancedSupervision')renderSupervision(body);
    if(target==='advancedFindings')renderFindings(body);
    if(target==='advancedReports')renderReports(body);
  }

  async function load(){
    try{
      const [findings,templates,alerts,audit,reports,actions]=await Promise.all([
        fetch('/api/findings',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch('/api/inspectionTemplates',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch('/api/advanceAlerts',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch('/api/auditTrail',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch('/api/reports',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch('/api/actions',{cache:'no-store'}).then(r=>r.ok?r.json():[])
      ]);
      state.reports=Array.isArray(reports)?reports:[];
      state.actions=Array.isArray(actions)?actions:[];
      state.findings=Array.isArray(findings)?findings:[];
      state.templates=Array.isArray(templates)&&templates.length?templates:[{id:'general',name:'Supervisión general',checks:['Cumplimiento de controles','Condiciones del área','EPP','Documentación']}];
      state.alerts=Array.isArray(alerts)?alerts:[];
      state.audit=Array.isArray(audit)?audit:[];
      render();
    }catch(error){console.warn('Carga avanzada diferida',error)}
  }
  function start(){
    if(!ensureShell())return;
    const refresh=()=>{load();setTimeout(load,600)};
    window.addEventListener('sm:live',event=>{if(['findings','inspectionTemplates','advanceAlerts','auditTrail','reports','actions'].includes(event.detail?.collection))load()});
    document.addEventListener('click',event=>{const b=event.target.closest('[data-view]');if(b&&b.dataset.view.startsWith('advanced'))navigate(b.dataset.view)});
    if(globalThis.AUTH?.user){refresh();return;}
    // La portada pública no debe consultar /api/ sin sesión: GitHub Pages devuelve 404.
    let waited=0;
    const wait=setInterval(()=>{if(globalThis.AUTH?.user||++waited>200){clearInterval(wait);if(globalThis.AUTH?.user)refresh()}},300);
    window.addEventListener('sm:auth',()=>{clearInterval(wait);refresh()},{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.SMAdvancedUI={state,load,render,navigate};
})();
