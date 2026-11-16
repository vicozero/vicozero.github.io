import fs from 'node:fs';
const source=fs.readFileSync('C:/Users/Dell/.codex/attachments/1c03b635-697f-439e-8689-865043d39e8f/Texto pegado.txt','utf8');
const content=source.split('## 5.2 Temario base anual')[1]?.split('## 5.3')[0];
if(!content)throw Error('No se encontró el temario autorizado.');
let month='';const topics=[];
for(const line of content.split(/\r?\n/)){
 if(line.startsWith('### '))month=line.slice(4).split(' — ')[0];
 const match=line.match(/^(\d+)\. (.+)$/);if(!match)continue;
 const week=Number(match[1]);topics.push({id:'SM-PL-'+String(week).padStart(3,'0'),week,month,title:match[2].replace(/\.$/,''),status:'Propuesta',suggestedMinutes:[5,10,15,30],objective:'',audience:[],department:'',risks:[],introduction:'',development:'',criticalPoints:[],practicalExamples:[],reviewQuestions:[],recommendations:[],normativeReferences:[],internalProcedures:[],materials:[],reviewedAt:null,author:null,approver:null,revision:0});
}
if(topics.length!==52||new Set(topics.map(t=>t.id)).size!==52)throw Error('El temario no contiene 52 temas únicos.');
console.log(JSON.stringify({schemaVersion:1,source:'Temario propuesto por el usuario; contenido y aplicabilidad pendientes de aprobación del centro de trabajo.',topics},null,2));
