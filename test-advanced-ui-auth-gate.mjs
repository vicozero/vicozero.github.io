import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

// La portada pública no debe consultar /api/ hasta que exista una sesión.
const errors=[],virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window;
w.structuredClone=structuredClone;w.Response=Response;w.Request=Request;w.Headers=Headers;w.crypto.randomUUID=crypto.randomUUID;w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.alert=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
const calls=[];
w.fetch=async(url)=>{
  calls.push(String(url));
  return new Response(JSON.stringify([]),{headers:{'Content-Type':'application/json'}});
};
for(const file of ['advanced-core.js','advanced-pdf.js','advanced-ui.js'])w.eval(fs.readFileSync(file,'utf8'));
await new Promise(r=>setTimeout(r,120));
assert.deepEqual(calls.filter(u=>u.startsWith('/api/')),[],'sin sesión no se debe consultar /api/');
assert.deepEqual(errors,[],'la carga sin sesión no debe generar errores');

w.AUTH={user:{id:'qa-admin',name:'Administrador QA',role:'admin',permissions:{edit_reports:true,edit_actions:true}}};
w.dispatchEvent(new w.Event('sm:auth'));
const until=async condition=>{for(let i=0;i<300;i++){if(condition())return;await new Promise(r=>setTimeout(r,10))}throw Error('UI avanzada no cargó tras sm:auth: '+errors.join('; '))};
await until(()=>calls.some(u=>u==='/api/findings'));
for(const kind of ['findings','inspectionTemplates','advanceAlerts','auditTrail','reports','actions'])assert(calls.includes('/api/'+kind),'debe cargar '+kind+' tras autenticación');
assert.deepEqual(errors,[]);
dom.window.close();
console.log('Puerto de autenticación avanzada: sin sesión no hay /api/, con sm:auth se cargan las seis colecciones: OK');
