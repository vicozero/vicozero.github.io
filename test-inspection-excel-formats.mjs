import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

// Prueba aislada: la API se simula en memoria; no escribe en Firebase.
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,$=id=>w.document.getElementById(id),saved=new Map();
w.AUTH={user:{id:'qa-admin',name:'Responsable QA',role:'admin'}};
w.ACCOUNT_DIRECTORY=[];w.ACCOUNT_USERS=[];w.SM_SCOPE_ACCOUNT='';
w.structuredClone=structuredClone;w.crypto.randomUUID=crypto.randomUUID;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.fetch=async(path,init={})=>{
  if(path==='/api/reports')return {ok:true,json:async()=>[...saved.values()]};
  if(path.startsWith('/api/reports/')&&init.method==='PUT'){
    const body=JSON.parse(init.body),prior=saved.get(body.id);
    if((body.revision||0)!==(prior?.revision||0))return {ok:false,status:409,json:async()=>({error:'Conflicto'})};
    const record={...body,revision:(prior?.revision||0)+1,updated:new Date().toISOString()};
    saved.set(record.id,record);
    return {ok:true,json:async()=>record};
  }
  return {ok:true,json:async()=>[]};
};
for(const file of ['formats.js','extended-formats.js','progress-core.js','supervisor.js'])w.eval(fs.readFileSync(file,'utf8'));
const wait=async(check,label)=>{for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10))}throw Error(label+': '+$('toast').textContent+' / '+$('saveState').textContent)};
const fill=(form,name,value)=>{const control=form.elements[name];assert(control,'Falta el campo '+name);control.value=value;control.dispatchEvent(new w.Event('input',{bubbles:true}))};
const common=form=>{fill(form,'date','2026-11-22');fill(form,'shift','Día / Turno 1');fill(form,'supervisor','Supervisor QA');fill(form,'department','Seguridad');fill(form,'place','Área QA');fill(form,'kpi','2 · Supervisor')};
const definition=id=>w.SAFETY.types.find(item=>item.id===id);

await wait(()=>$('sync').textContent.includes('nube'),'Carga inicial');

// Campos solicitados en formatos existentes.
assert.deepEqual([...definition('inspection').fields[0]],['inspection','Inspección / referencia','text',1],'Hallazgos debe identificar la inspección');
assert(definition('inspection').table.columns.some(column=>[...column].slice(0,2).join('|')==='comment|Comentario del hallazgo'),'Hallazgos debe permitir comentar el hallazgo');
assert(definition('pst').fields.some(field=>[...field].slice(0,2).join('|')==='experienceMonths|Meses de experiencia del trabajador'),'PST debe pedir meses de experiencia');
assert(definition('pst').fields.some(field=>[...field].slice(0,2).join('|')==='jobExperienceMonths|Meses de experiencia en el puesto'),'PST debe pedir meses de experiencia en el puesto');

// Nuevos accesos en CAPTURA EN CAMPO.
assert(w.document.querySelector('[data-template="areaPlanta"]'),'Falta Inspección planta en CAPTURA EN CAMPO');
assert(w.document.querySelector('[data-template="areaMina"]'),'Falta Inspección mina en CAPTURA EN CAMPO');
assert.equal(definition('areaPlanta').name,'Inspección planta');
assert.equal(definition('areaPlanta').checks,'area');
assert.equal(definition('areaPlanta').equipment,true);
assert.equal(definition('areaMina').name,'Inspección mina');
assert.equal(definition('areaMina').checks,'areaMina');
assert.equal(w.SAFETY.areaMina.length,29,'El checklist de mina debe tener los 29 puntos del Excel');

const form=$('reportForm');
for(const kind of ['areaPlanta','areaMina']){
  $('newReport').click();
  w.document.querySelector('[data-template="'+kind+'"]').click();
  assert($('editor').open,kind+' abre');
  const t=definition(kind);
  const checks=[...form.querySelectorAll('[name^="check-"]')];
  assert.equal(checks.length,w.SAFETY[t.checks].length,kind+' muestra todo el checklist del Excel');
  assert(w.document.querySelector('.field-section h3').textContent.includes(t.checkTitle),kind+' rotula la inspección');
  common(form);
  for(const check of checks)check.value='Cumple';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await wait(()=>!$('editor').open&&[...saved.values()].some(record=>record.type===kind&&record.status==='Finalizado'),kind+' finaliza');
  const record=[...saved.values()].find(item=>item.type===kind);
  assert.equal(record.checks.length,w.SAFETY[t.checks].length,kind+' persiste el checklist');
}

// Hallazgos: inspección y comentario del hallazgo se conservan.
$('newReport').click();
w.document.querySelector('[data-template="inspection"]').click();
common(form);
fill(form,'inspection','Inspección de áreas QA');
$('addRow').click();
for(const [key,value] of Object.entries({place:'Área QA',description:'Hallazgo de prueba',comment:'Comentario del hallazgo de prueba',action:'Corrección',owner:'Responsable QA',status:'Completado',due:'2026-11-30'}))$('repeatTable').querySelector('[data-key="'+key+'"]').value=value;
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await wait(()=>!$('editor').open&&[...saved.values()].some(record=>record.type==='inspection'&&record.status==='Finalizado'),'Hallazgos finaliza');
const hallazgo=[...saved.values()].find(record=>record.type==='inspection');
assert.equal(hallazgo.inspection,'Inspección de áreas QA');
assert.equal(hallazgo.findings[0].comment,'Comentario del hallazgo de prueba');

// PST: los meses de experiencia se conservan.
$('newReport').click();
w.document.querySelector('[data-template="pst"]').click();
common(form);
fill(form,'person','Trabajador QA');fill(form,'position','Operador');fill(form,'procedure','PST-01');
fill(form,'experienceMonths','18');fill(form,'jobExperienceMonths','6');
for(const check of form.querySelectorAll('[name^="check-"]'))check.value='Sí';
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await wait(()=>!$('editor').open&&[...saved.values()].some(record=>record.type==='pst'&&record.status==='Finalizado'),'PST finaliza');
const pst=[...saved.values()].find(record=>record.type==='pst');
assert.equal(pst.experienceMonths,'18');
assert.equal(pst.jobExperienceMonths,'6');

assert.deepEqual(errors,[],'Sin errores del DOM');
console.log('Excel de planta/mina, comentario de hallazgo y meses de experiencia en PST: OK');
dom.window.close();
