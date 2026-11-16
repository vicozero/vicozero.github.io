import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';
const main='https://asinom.stps.gob.mx/centro/CentroMarcoNormativo.aspx';
const products='https://www.stps.gob.mx/bp/secciones/dgsst/normatividad/g_5.html';
async function page(url){const r=await fetch(url);if(!r.ok)throw Error('Fuente no disponible: '+r.status);return new JSDOM(Buffer.from(await r.arrayBuffer()),{url}).window.document;}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export async function buildCatalog(){
 const records=new Map(),doc=await page(main);
 for(const anchor of doc.querySelectorAll('a[href]')){
  const identifier=clean(anchor.textContent);if(!/^NOM-\d{3}-STPS-\d{4}$/.test(identifier))continue;
  const group=anchor.id.match(/Repeater(\d)/)?.[1];
  const cells=anchor.closest('tr')?.querySelectorAll('td')||[];
  const title=clean(cells[cells.length-1]?.textContent)||identifier;
  records.set(identifier,{standardId:identifier.replace(/-\d{4}$/,''),versionId:identifier,identifier,catalogTitle:title,name:title,category:({'1':'Seguridad','2':'Salud','3':'Organización','4':'Actividades específicas'})[group]||'Pendiente de clasificar',year:Number(identifier.slice(-4)),publicationDate:null,effectiveDate:null,status:'Pendiente de verificar',replaces:null,objective:null,scope:null,sections:[],requirements:[],sourceUrl:anchor.href,catalogSource:main,lastSourceConsulted:'2026-11-16',verifiedAt:null,verifiedBy:null,keywords:clean(title).toLowerCase().split(' ').filter(w=>w.length>3),amendments:[]});
 }
 const productDoc=await page(products);
 const text=clean(productDoc.body.textContent);
 for(const identifier of [...new Set(text.match(/NOM-(?:100|101|102|103|104|106|113|115|116)-STPS-\d{4}/g)||[])]){
  const anchor=[...productDoc.querySelectorAll('a[href]')].find(a=>clean(a.textContent).includes(identifier));
  const container=anchor?.closest('tr');
  const title=clean(container?.textContent).slice(0,600)||identifier;
  records.set(identifier,{standardId:identifier.replace(/-\d{4}$/,''),versionId:identifier,identifier,catalogTitle:title,name:title,category:'Normas de producto',year:Number(identifier.slice(-4)),publicationDate:null,effectiveDate:null,status:'Pendiente de verificar',replaces:null,objective:null,scope:null,sections:[],requirements:[],sourceUrl:anchor?.href||products,catalogSource:products,lastSourceConsulted:'2026-11-16',verifiedAt:null,verifiedBy:null,keywords:['producto'],amendments:[]});
 }
 if(records.size<35)throw Error('El catálogo recuperado está incompleto. No se genera una actualización.');
 return {schemaVersion:1,consultedAt:'2026-11-16',sources:[main,products],standards:[...records.values()].sort((a,b)=>a.identifier.localeCompare(b.identifier)),notes:'Referencias recuperadas de STPS. La vigencia, los numerales y su aplicabilidad requieren cotejo y validación independiente. No constituye una evaluación de cumplimiento.'};
}
if(process.argv.includes('--json'))console.log(JSON.stringify(await buildCatalog(),null,2));
