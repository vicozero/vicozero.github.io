import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';
import {installTrainingSuite} from './training-suite.js';
import {validateSchedule,validateAttendance,sessionToOriginalTalkReport} from './training-core.js';
const dom=new JSDOM('<aside id="sidebar"><nav><button data-view="dashboard">Inicio</button></nav></aside><main><h1 id="pageTitle"></h1><p id="pageSubtitle"></p><span id="crumb"></span><section id="dashboard"></section></main>');
const {window:w}=dom;globalThis.FormData=w.FormData;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
const topics=JSON.parse(fs.readFileSync('safety-talk-topics.json','utf8')).topics;
const memory={talk_topics:[],talk_schedules:[],talk_sessions:[]},reports=new Map();
const store={permission:()=>true,list:async name=>structuredClone(memory[name]),saveTopic:async topic=>{const saved={...topic,revision:(topic.revision||0)+1};memory.talk_topics=memory.talk_topics.filter(t=>t.id!==saved.id);memory.talk_topics.push(saved);return saved;},saveSchedule:async(s,ids)=>{validateSchedule(s,ids);memory.talk_schedules.push({...s,revision:1});},saveSession:async s=>{validateAttendance(s.attendees);memory.talk_sessions.push({...s,revision:1});},createOriginalTalkDraft:async s=>{const report=sessionToOriginalTalkReport(s),created=!reports.has(report.id);reports.set(report.id,report);return {created,id:report.id};}};
const settle=()=>new Promise(r=>setTimeout(r,0));
const submit=async form=>{form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();};
try{
 await installTrainingSuite({store,me:{id:'qa-admin',role:'admin'},directory:[{id:'qa-admin',name:'Instructor QA'}],topics,document:w.document});
 w.document.querySelector('[data-training-suite-view]').click();await settle();
 assert.equal(w.document.querySelectorAll('[data-talk-edit]').length,52);
 const id=topics[0].id;w.document.querySelector('[data-talk-edit="'+id+'"]').click();
 let form=w.document.querySelector('dialog form');
 for(const key of ['objective','introduction','development','criticalPoints','reviewQuestions'])form.elements[key].value='Contenido aislado de prueba';form.elements.status.value='Aprobado';await submit(form);
 assert.equal(memory.talk_topics[0].status,'Aprobado');
 w.document.querySelector('[data-talk-schedule="'+id+'"]').click();form=w.document.querySelector('dialog form');form.elements.department.value='QA';form.elements.place.value='Área QA';await submit(form);
 assert.equal(memory.talk_schedules.length,1);
 w.document.querySelector('[data-talk-attendance]').click();form=w.document.querySelector('dialog form');form.elements.attendees.value='worker | Persona QA | QA | Operación';await submit(form);
 assert.equal(memory.talk_sessions.length,1);assert.equal(memory.talk_sessions[0].attendees[0].personId,'worker');
 w.document.querySelector('[data-talk-report]').click();await settle();w.document.querySelector('[data-talk-report]').click();await settle();
 assert.equal(reports.size,1);assert.equal([...reports.values()][0].status,'Borrador');
 w.document.querySelector('[data-view]').click();assert(w.document.getElementById('trainingSuite').hidden);
 console.log('Pláticas UI: 52 temas, edición, aprobación, programación, asistencia y vínculo único al formato original: OK');
}finally{dom.window.close();}
