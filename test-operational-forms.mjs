import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,$=id=>w.document.getElementById(id);
w.AUTH={user:{id:'qa-admin',name:'Revisor de prueba',role:'admin'}};
w.ACCOUNT_DIRECTORY=[];w.ACCOUNT_USERS=[];w.SM_SCOPE_ACCOUNT='';w.structuredClone=structuredClone;w.crypto.randomUUID=crypto.randomUUID;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
const saved=new Map();
w.fetch=async(path,init={})=>{
 if(path==='/api/reports')return {ok:true,json:async()=>[...saved.values()]};
 if(path.startsWith('/api/reports/')&&init.method==='PUT'){
  const body=JSON.parse(init.body),prior=saved.get(body.id);
  if((body.revision||0)!==(prior?.revision||0))return {ok:false,status:409,json:async()=>({error:'Conflicto'})};
  const record={...body,revision:(prior?.revision||0)+1,updated:new Date().toISOString()};saved.set(record.id,record);
  return {ok:true,json:async()=>record};
 }
 return {ok:true,json:async()=>[]};
};
for(const file of ['formats.js','extended-formats.js','progress-core.js','supervisor.js'])w.eval(fs.readFileSync(file,'utf8'));
const wait=async check=>{for(let i=0;i<100;i++){if(check()){await new Promise(r=>setTimeout(r,0));return;}await new Promise(r=>setTimeout(r,10));}throw Error('Timeout: '+$('toast').textContent+' / '+$('saveState').textContent+' / '+JSON.stringify([...saved.values()].map(r=>({type:r.type,status:r.status,revision:r.revision,observations:r.observations}))));};
const form=$('reportForm'),fill=(name,value)=>{const el=form.elements[name];assert(el&&el.tagName,'Control único: '+name);el.value=value;};
await wait(()=>$('sync').textContent.includes('nube'));
const records=[];
for(const kind of ['veo','incident','training']){
 $('newReport').click();w.document.querySelector('[data-template="'+kind+'"]').click();
 assert($('editor').open,kind+' abre');
 const names=[...form.elements].map(el=>el.name).filter(Boolean);assert.equal(new Set(names).size,names.length,kind+' sin campos repetidos');
 fill('date','2026-11-16');fill('shift','Día / Turno 1');fill('supervisor','Revisor de prueba');fill('department','Seguridad');fill('place','Área de prueba');fill('kpi','2 · Supervisor');
 if(kind==='veo'){
  fill('activity','Verificar actividad');fill('standard','Estándar de prueba');fill('area','Área de prueba');fill('location','Ubicación de prueba');
  const template=Object.keys(w.SAFETY.areaTemplates)[0];fill('areaTemplate',template);form.elements.areaTemplate.dispatchEvent(new w.Event('change',{bubbles:true}));
  const checks=[...form.querySelectorAll('[name^="check-"]')];assert.equal(checks.length,w.SAFETY.areaTemplates[template].length);
  for(const check of checks)check.value='Cumple';
  checks[0].value='No cumple';
 }
 if(kind==='incident'){
  fill('eventDate','2026-11-15T10:00');fill('reportDate','2026-11-16');fill('location','Ubicación');fill('eventType','Incidente');fill('severity','Leve');fill('description','Descripción del evento');fill('immediate','Medidas inmediatas');fill('eventStatus','En investigacion');
 }
 if(kind==='training'){
  fill('course','Curso de prueba');fill('instructor','Instructor de prueba');fill('hours','1.5');fill('evaluation','Si');
  $('addRow').click();const row=$('repeatTable');row.querySelector('[data-key="person"]').value='Participante de prueba';row.querySelector('[data-key="score"]').value='90';row.querySelector('[data-key="status"]').value='Aprobado';
 }
 if(kind!=='training'){
  $('addRow').click();const row=$('repeatTable');
  for(const [key,value] of Object.entries({place:'Lugar de prueba',description:'Hallazgo de prueba',action:'Acción correctiva de prueba',responsible:'Responsable de prueba',due:'2026-11-30'}))row.querySelector('[data-key="'+key+'"]').value=value;
 }
 $('saveDraft').click();await wait(()=>saved.size===records.length+1&&$('saveState').textContent.includes('Guardado'));
 let record=[...saved.values()].find(r=>r.type===kind);assert.equal(record.status,'Borrador');
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>saved.get(record.id).status==='Finalizado'&&form.elements.supervisor.disabled);
 assert(form.elements.supervisor.disabled,'Finalizado bloquea la edición');
 $('reopen').click();await wait(()=>saved.get(record.id).status==='Borrador'&&!form.elements.supervisor.disabled);
 fill('observations','Edición conservada');$('saveDraft').click();await wait(()=>saved.get(record.id).observations==='Edición conservada');
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>saved.get(record.id).status==='Finalizado'&&form.elements.supervisor.disabled);
 record=saved.get(record.id);assert.equal(record.observations,'Edición conservada');
 if(kind==='incident')assert.equal(record.eventStatus,'En investigacion');
 if(kind==='training')assert.equal(record.attendees[0].score,'90');
 if(kind==='veo')assert.equal(record.checks.length,record.checkLabels.length);
 if(kind!=='training')assert.equal(record.findings[0].responsible,'Responsable de prueba');
 records.push(record);$('editor').close();
}
assert.equal(errors.length,0,errors.join('\n'));
assert.equal(w.SAFETY.validateOperationalReport({...records[2],hours:'0'}).includes('horas'),true);
assert(w.SAFETY.validateOperationalReport({...records[2],attendees:[{person:'Prueba',score:'101'}]}));
assert(w.SAFETY.validateOperationalReport({...records[0],checks:[]}));
assert(w.SAFETY.validateOperationalReport({...records[0],findings:[]}));
assert(w.SAFETY.validateOperationalReport({...records[1],reportDate:'2026-11-01'}));
for(const group of ['Verificación de Estándares','Incidentes','Capacitacion']){
 const kpi=[...w.document.querySelectorAll('#kpis .kpi')].find(el=>el.querySelector('h3').textContent.includes(group));
 assert(kpi);assert(kpi.querySelector('.ratio').textContent.trim().startsWith('01'));
}
fs.mkdirSync('.qa/operational',{recursive:true});fs.writeFileSync('.qa/operational/records.json',JSON.stringify(records,null,2));
console.log('VEO, INC y TRN: apertura, listas, campos únicos, borrador, finalizar, bloqueo, reapertura y edición: OK');
dom.window.close();
