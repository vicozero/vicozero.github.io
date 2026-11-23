import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

// supervisor.js se carga después de advanced-ui.js y redefine globalThis.navigate.
// Las vistas avanzadas deben seguir funcionando aunque eso ocurra.
const supervisor=fs.readFileSync('supervisor.js','utf8');
assert.match(supervisor,/startsWith\('advanced'\)/, 'supervisor.js debe delegar las vistas avanzadas');

const errors=[],virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window;
w.structuredClone=structuredClone;w.Response=Response;w.Request=Request;w.Headers=Headers;w.crypto.randomUUID=crypto.randomUUID;w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.alert=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
const memory={findings:[],inspectionTemplates:[],advanceAlerts:[],auditTrail:[],reports:[],actions:[]};
w.fetch=async(url)=>{
  const kind=new URL(url,'https://qa.local').pathname.slice(5).split('/')[0];
  return new Response(JSON.stringify(memory[kind]||[]),{headers:{'Content-Type':'application/json'}});
};
w.AUTH={user:{id:'qa-admin',name:'Administrador QA',role:'admin',permissions:{}}};
for(const file of ['advanced-core.js','advanced-pdf.js','advanced-ui.js'])w.eval(fs.readFileSync(file,'utf8'));
const by=id=>w.document.getElementById(id);
const until=async condition=>{for(let i=0;i<300;i++){if(condition())return;await new Promise(r=>setTimeout(r,10))}throw Error('timeout: '+errors.join('; '))};
await until(()=>by('advancedDashboardBody'));

// Simula la carga dinámica de supervisor.js: sobrescribe el navigate global.
const legacyCalls=[];
w.navigate=function(view){
  if(String(view).startsWith('advanced'))throw Error('supervisor.js recibió una vista avanzada');
  legacyCalls.push(view);
};

for(const view of ['advancedSupervision','advancedFindings','advancedReports','advancedDashboard']){
  w.document.querySelector(`[data-view="${view}"]`).click();
  assert.equal(by(view).hidden,false,'debe mostrar '+view);
  assert.equal(w.document.body.dataset.view,view);
  assert.deepEqual(errors,[],'sin errores al abrir '+view);
}
assert.deepEqual(legacyCalls,[],'las vistas avanzadas no deben llamar al navigate histórico');
assert.equal(w.document.querySelectorAll('.advanced-view:not([hidden])').length,1);

// La delegación explícita sigue funcionando para vistas históricas.
w.SMAdvancedUI.navigate('reports');
assert.deepEqual(legacyCalls,['reports']);
assert.equal(w.document.querySelectorAll('.advanced-view:not([hidden])').length,0);
assert.deepEqual(errors,[]);
dom.window.close();
console.log('Navegación avanzada tras carga de supervisor.js: 4 vistas sin TypeError y delegación histórica: OK');
