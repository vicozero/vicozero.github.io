import {searchStandards,officialSource} from './regulatory-core.js';
const by=id=>document.getElementById(id);
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let versions=[],selected='';
function setTheme(value){
  document.documentElement.dataset.theme=value;
  const dark=value==='dark';
  const button=by('libraryTheme');
  button.textContent=dark?'☀ Día':'☾ Noche';
  button.setAttribute('aria-label',dark?'Activar modo día':'Activar modo noche');
  button.setAttribute('aria-pressed',String(dark));
}
let theme='light';try{theme=localStorage.getItem('sm-theme')==='dark'?'dark':'light';}catch{}
setTheme(theme);
by('libraryTheme').onclick=()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(value);try{localStorage.setItem('sm-theme',value);}catch{}};
function render(){
  const matches=searchStandards(versions,by('nomSearch').value,by('nomCategory').value);
  by('nomList').innerHTML=matches.length?matches.map(({version:v})=>`<button type="button" class="nom-item${selected===v.versionId?' active':''}" data-id="${E(v.versionId)}" aria-pressed="${selected===v.versionId}"><span class="nom-id">${E(v.identifier)}</span><span class="nom-name">${E(v.name)}</span><span class="nom-cat">${E(v.category)} · ${E(v.status)}</span></button>`).join(''):'<p class="nom-empty">Sin resultados.</p>';
  by('nomCount').textContent=matches.length+' referencias encontradas';
}
function showDetail(id){
  const v=versions.find(item=>item.versionId===id);if(!v)return;
  selected=id;
  const source=officialSource(v.sourceUrl)?`<a href="${E(v.sourceUrl)}" target="_blank" rel="noopener">Consultar fuente oficial ↗</a>`:'Fuente pendiente de revisión';
  const pdf=/^\/assets\/nom-pdfs\/[A-Za-z0-9.-]+\.pdf$/.test(v.localPdf||'')?`<a href="${E(v.localPdf)}" target="_blank" rel="noopener">Abrir copia local del PDF ↗</a><br>`:'';
  by('nomDetail').innerHTML=`<h2>${E(v.identifier)}</h2><p>${E(v.name)}</p><span class="nom-status">${E(v.status)}</span><dl class="nom-meta"><dt>Categoría</dt><dd>${E(v.category)}</dd><dt>Versión de referencia</dt><dd>${E(v.year)}</dd><dt>Revisión autorizada</dt><dd>${E(v.verifiedAt||'Pendiente')}</dd><dt>Fuente consultada</dt><dd>${E(v.lastSourceConsulted||'Sin registrar')}</dd></dl><p>Confirma vigencia, aplicabilidad y numerales con la fuente oficial y el responsable de seguridad. Una copia del PDF no acredita cumplimiento.</p><div class="nom-source">${pdf}${source}</div>`;
  render();
}
by('nomSearch').addEventListener('input',render);
by('nomCategory').addEventListener('change',render);
by('nomList').addEventListener('click',e=>{const button=e.target.closest('[data-id]');if(button)showDetail(button.dataset.id);});
async function load(){
  try{
    const response=await fetch('./normative-catalog.json');if(!response.ok)throw Error('HTTP '+response.status);
    const catalog=await response.json();if(!Array.isArray(catalog.standards))throw Error('Catálogo inválido');
    versions=catalog.standards;
    by('nomCategory').innerHTML='<option value="">Todas las categorías</option>'+[...new Set(versions.map(v=>v.category))].map(category=>`<option>${E(category)}</option>`).join('');
    by('nomError').hidden=true;render();
  }catch(error){by('nomError').hidden=false;by('nomErrorText').textContent='No se pudo cargar la biblioteca: '+error.message;}
}
by('nomRetry').onclick=load;
await load();
