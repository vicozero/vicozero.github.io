from pathlib import Path
p=Path('public/supervisor.js');s=p.read_text(encoding='utf8')
s=s.replace('function render(){if(globalThis.renderWorkspace)globalThis.renderWorkspace();const list=', 'function render(){const list=')
needle="}).join('')}async function init()"
assert needle in s
s=s.replace(needle,"}).join('');if(globalThis.renderWorkspace)globalThis.renderWorkspace();}async function init()",1)
s=s.replace("$('specificFields').innerHTML=`<div class=\"fields\">", "$('specificFields').innerHTML=(t.id==='critical'?'<div class=\"editor-banner\" id=\"criticalSummary\">Cumplimiento: sin controles evaluados. C = Cumple · NC = No cumple · NA = No aplica.</div>':'')+`<div class=\"fields\">")
p.write_text(s,encoding='utf8')
p=Path('public/workspace.js');s=p.read_text(encoding='utf8');needle='drawActions();drawMatrix();drawTeam()}'
replacement='''drawActions();drawMatrix();drawTeam();const allRows=P.matrix({plans,reports,actions,types:S.types,period:by('period').value,query:by('supervisorFilter').value});by('programTable').innerHTML='<div class="form-help">Las metas de esta vista proceden de Responsables y metas. Consulta el Reporte de avances para ver el desglose P / E / A y descargarlo.</div>'+by('progressTable').innerHTML;by('kpis').innerHTML=P.groups.map(([g,n])=>{const cells=allRows.map(r=>r.cells.find(c=>c.id===g)),goal=cells.reduce((s,c)=>s+c.p,0),executed=cells.reduce((s,c)=>s+c.e,0),credit=cells.reduce((s,c)=>s+Math.min(c.e,c.p),0),percent=goal?Math.round(credit/goal*100):null;return `<article class="kpi"><div class="kpi-top"><span class="kpi-icon">${S.types.find(t=>t.group===g)?.icon||'▥'}</span><small>PROGRAMA MENSUAL</small></div><h3>${n}</h3><div class="ratio">${String(executed).padStart(2,'0')} <span>/ ${goal||'—'} programados</span></div><div class="bar"><i style="width:${percent??0}%"></i></div><div class="kpi-foot"><span>${percent===null?'Sin programa asignado':percent+'% de cumplimiento'}</span><span>${goal?Math.max(0,goal-credit)+' pendientes':'Asigna metas al equipo'}</span></div></article>`}).join('')}
'''
assert needle in s;s=s.replace(needle,replacement)
s=s.replace("document.addEventListener('click',e=>", "document.addEventListener('change',e=>{if(active?.type==='critical'&&by('criticalSummary')){const rows=Array.from(document.querySelectorAll('#repeatTable [data-row]')).map(row=>({response:row.querySelector('[data-key=\"response\"]')?.value}));const score=S.criticalCompliance(rows);by('criticalSummary').textContent='Cumplimiento: '+(score===null?'sin controles aplicables':score+' %')+'. C = Cumple · NC = No cumple · NA = No aplica. Se calcula C / (C + NC).';}});document.addEventListener('click',e=>")
p.write_text(s,encoding='utf8')
p=Path('public/index.html');s=p.read_text(encoding='utf8').replace('Solo formatos finalizados · Metas mensuales del documento','Solo formatos finalizados · Metas asignadas al equipo');p.write_text(s,encoding='utf8')
