import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

// Prueba aislada: la API se simula en memoria y nunca escribe en Firebase.
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

await wait(()=>$('sync').textContent.includes('nube'),'Carga inicial');

const leadership=w.SAFETY.types.find(definition=>definition.id==='leadership');
assert.deepEqual([...leadership.fields[0]],['person','Persona observada','text',1],'Liderazgo visible debe pedir el nombre de la persona observada');

$('newReport').click();
w.document.querySelector('[data-template="leadership"]').click();
assert($('editor').open,'El editor se abre');
const form=$('reportForm');
assert(form.elements.person,'Liderazgo visible muestra el campo de persona observada');
assert(form.elements.person.closest('label').textContent.includes('Persona observada'),'Etiqueta visible del campo');
fill(form,'supervisor','Supervisor QA');
fill(form,'department','Seguridad');
fill(form,'place','Área QA');
fill(form,'shift','Día / Turno 1');
fill(form,'person','Persona observada QA');
fill(form,'activity','Conversación de seguridad QA');

// Guardar avance: cierra el editor y muestra el mensaje exacto.
$('saveDraft').click();
await wait(()=>!$('editor').open&&$('toast').textContent==='Avance Guardado','Guardar avance cierra y avisa');
const record=[...saved.values()].find(item=>item.type==='leadership');
assert(record,'El avance quedó guardado en la API aislada');
assert.equal(record.status,'Borrador');
assert.equal(record.person,'Persona observada QA','El nombre de la persona se persiste');

// Reabrir y finalizar: cierra el editor y muestra el mensaje exacto.
w.document.querySelector('[data-open="'+record.id+'"]').click();
assert($('editor').open,'El borrador se reabre');
assert.equal(form.elements.person.value,'Persona observada QA','La persona observada sobrevive a la reapertura');
$('addRow').click();
for(const control of $('repeatTable').querySelectorAll('[data-key]'))control.value='Dato aislado de prueba';
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await wait(()=>!$('editor').open&&$('toast').textContent==='Finalizado','Finalizar cierra y avisa');
assert.equal(saved.get(record.id).status,'Finalizado');
assert.equal(saved.get(record.id).person,'Persona observada QA');
assert.deepEqual(errors,[],'Sin errores del DOM');

console.log('Guardar avance y finalizar cierran el editor con sus mensajes; Liderazgo visible incluye persona observada: OK');
dom.window.close();
