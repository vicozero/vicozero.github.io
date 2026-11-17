import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

// Isolated DOM and in-memory API: never writes test records to Firebase.
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,$=id=>w.document.getElementById(id),saved=new Map(),actionRequests=[];
w.AUTH={user:{id:'qa-admin',name:'Responsable QA',role:'admin'}};
w.ACCOUNT_DIRECTORY=[];w.ACCOUNT_USERS=[];w.SM_SCOPE_ACCOUNT='';w.structuredClone=structuredClone;w.crypto.randomUUID=crypto.randomUUID;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.fetch=async(path,init={})=>{
 if(path==='/api/reports')return {ok:true,json:async()=>[...saved.values()]};
 if(path.startsWith('/api/actions'))actionRequests.push({path,init});
 if(path.startsWith('/api/reports/')&&init.method==='PUT'){
  const body=JSON.parse(init.body),prior=saved.get(body.id);
  if((body.revision||0)!==(prior?.revision||0))return {ok:false,status:409,json:async()=>({error:'Conflicto'})};
  const record={...body,revision:(prior?.revision||0)+1,updated:new Date().toISOString()};saved.set(record.id,record);
  return {ok:true,json:async()=>record};
 }
 return {ok:true,json:async()=>[]};
};
for(const file of ['formats.js','extended-formats.js','progress-core.js','supervisor.js'])w.eval(fs.readFileSync(file,'utf8'));
const wait=async(check,label)=>{for(let i=0;i<150;i++){if(check()){await new Promise(resolve=>setTimeout(resolve,0));return;}await new Promise(resolve=>setTimeout(resolve,10));}throw Error(label+': '+$('toast').textContent+' / '+$('saveState').textContent);};
const form=$('reportForm');
function fillControl(control){
 if(control.dataset.key==='score'){control.value='90';return;}
 if(control.tagName==='SELECT'){control.value=[...control.options].find(option=>option.value)?.value||'';return;}
 if(control.type==='checkbox'){control.checked=true;return;}
 if(['file','button','submit'].includes(control.type))return;
 control.value=control.type==='date'?'2026-11-16':control.type==='datetime-local'?'2026-11-16T10:00':control.type==='time'?'10:00':control.type==='number'?'1.5':'Dato de prueba aislada';
}
await wait(()=>$('sync').textContent.includes('nube'),'Carga inicial');
const ids=w.SAFETY.types.map(definition=>definition.id);
assert.equal(ids.length,new Set(ids).size,'Cada formato aparece una sola vez');
for(const definition of w.SAFETY.types){
 for(const field of definition.fields)if(field[2]==='select')assert(Array.isArray(field[4]),definition.id+': opciones válidas de '+field[0]);
 $('newReport').click();w.document.querySelector('[data-template="'+definition.id+'"]').click();
 assert($('editor').open,definition.id+' abre');
 const names=[...form.elements].map(control=>control.name).filter(Boolean);assert.equal(names.length,new Set(names).size,definition.id+': nombres de control únicos');
 if(['area','veo'].includes(definition.id)){
  form.elements.areaTemplate.value=Object.keys(w.SAFETY.areaTemplates)[0];
  form.elements.areaTemplate.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(form.querySelectorAll('[name^="check-"]').length,10,'La plantilla seleccionada actualiza las preguntas');
 }
 for(const control of form.querySelectorAll('input[name],select[name],textarea[name]')){
  if(control.name!=='areaTemplate')fillControl(control);
 }
 if(definition.table){$('addRow').click();for(const control of $('repeatTable').querySelectorAll('[data-key]'))fillControl(control);}
 if(definition.epp){$('addWorker').click();for(const control of $('eppRows').querySelectorAll('[data-key],[data-epp]'))fillControl(control);}
 // Both date fields refer to the same test day. All checks are conforming.
 $('saveDraft').click();await wait(()=>[...saved.values()].some(record=>record.type===definition.id),definition.id+' guarda borrador');
 let record=[...saved.values()].find(record=>record.type===definition.id);assert.equal(record.status,'Borrador');
 $('editor').close();w.document.querySelector('[data-open="'+record.id+'"]').click();
 assert($('editor').open,definition.id+' reabre su borrador');
 if(['area','veo'].includes(definition.id))assert.equal(form.querySelectorAll('[name^="check-"]').length,record.checks.length,'Plantilla y respuestas sobreviven a la reapertura');
 assert(form.checkValidity(),definition.id+': validación nativa de '+[...form.elements].filter(control=>control.validity&&!control.validity.valid).map(control=>control.name+': '+control.validationMessage).join(', '));
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await wait(()=>saved.get(record.id).status==='Finalizado'&&form.elements.supervisor.disabled,definition.id+' finaliza');
 $('reopen').click();await wait(()=>saved.get(record.id).status==='Borrador'&&!form.elements.supervisor.disabled,definition.id+' reabre finalizado');
 form.elements.observations.value='Edición conservada';$('saveDraft').click();
 await wait(()=>saved.get(record.id).observations==='Edición conservada',definition.id+' conserva edición');
 $('editor').close();
}
assert.equal(actionRequests.length,0,'Guardar formatos no crea acciones silenciosas ni duplicadas');
assert.deepEqual(errors,[],'Sin errores del DOM');
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/all-forms-records.json',JSON.stringify([...saved.values()],null,2));
console.log(ids.length+' formatos: controles únicos, listas válidas, borrador, reapertura, finalización, bloqueo y edición: OK; sin acciones automáticas duplicadas.');
dom.window.close();
