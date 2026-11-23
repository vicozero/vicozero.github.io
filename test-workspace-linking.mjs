import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window;
const rows={reports:[],actions:[],plans:[],notices:[]};
for(const [index,type] of ['veo','incident','observation'].entries())rows.reports.push({id:'record-'+type,folio:'SM-'+type,type,status:'Finalizado',date:'2026-11-16',updated:new Date(Date.UTC(2026,10,16,8,index,0)).toISOString(),supervisor:'Supervisor QA',place:'Mina',kpi:'2',findings:[{action:'Corregir '+type,responsible:'Supervisor QA',due:'2026-11-20'}]});
w.AUTH={user:{id:'owner',name:'Administrador QA',role:'admin',unit:'Sierra Madre'}};w.ACCOUNT_DIRECTORY=[];w.ACCOUNT_USERS=[];w.SM_SCOPE_ACCOUNT='';w.SM_CLOUD={};w.smStorageKey=k=>k;w.structuredClone=structuredClone;w.crypto.randomUUID=crypto.randomUUID;w.confirm=()=>true;w.matchMedia=()=>({matches:false});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.fetch=async(url,options={})=>{
 const parts=new URL(url,'https://qa.local').pathname.split('/').filter(Boolean),collection=parts[1],id=parts[2];let data=rows[collection]||[];
 if(options.method==='PUT'){
  const body=JSON.parse(options.body),list=rows[collection]||[],i=list.findIndex(row=>row.id===id),old=list[i];
  data={...body,id,revision:(old?.revision||0)+1,history:old?.history||[],updated:new Date().toISOString()};
  if(i<0)list.push(data);else list[i]=data;rows[collection]=list;
 }
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
};
w.eval(['formats.js','extended-formats.js','progress-core.js','supervisor.js','workspace.js','accounts-ui.js'].map(file=>fs.readFileSync(file,'utf8')).join('\n;\n'));
const by=id=>w.document.getElementById(id),until=async predicate=>{for(let i=0;i<300;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('DOM timeout: '+errors.join('; '));};
await until(()=>by('actionTable').textContent.includes('No hay acciones'));
by('period').value='2026-11';
const report=rows.reports[0];
w.dispatchEvent(new w.CustomEvent('sm:action-from-report',{detail:{report}}));
assert(by('actionEditor').open);assert.equal(by('actionForm').elements.description.value,'Corregir veo');assert.equal(by('actionForm').elements.owner.value,'Supervisor QA');
by('actionForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await until(()=>!by('actionEditor').open);assert.equal(rows.actions.length,1);assert.equal(rows.actions[0].sourceReport,report.id);assert.equal(rows.actions[0].linkedReportId,report.id);
w.dispatchEvent(new w.CustomEvent('sm:action-from-report',{detail:{report}}));assert(by('actionEditor').open);assert.equal(rows.actions.length,1);by('actionEditor').close();
by('linkFindings').click();await until(()=>!by('linkFindings').disabled);
assert(rows.actions.some(row=>row.sourceReport==='record-incident'));assert(rows.actions.some(row=>row.sourceReport==='record-observation'));
const count=rows.actions.length;by('linkFindings').click();await until(()=>!by('linkFindings').disabled);assert.equal(rows.actions.length,count);
for(const key of ['nom_manage','nom_validate','nom_assess','training_manage','training_approve','training_schedule','training_attendance'])assert(by('userForm').elements['perm_'+key]);
by('addUser').click();assert.equal(by('userForm').elements.perm_training_manage.checked,false);assert(by('userForm').elements.role.querySelector('option[value="supervisor"]'));
assert.equal(by('userForm').elements.role.querySelector('option[value="admin"]').disabled,true);
assert.deepEqual(errors,[]);dom.window.close();
console.log('Interfaz: acciones vinculadas sin duplicar, VEO/INC/OBS, permisos nuevos sin concesión automática y transferencia administrativa separada: OK');
