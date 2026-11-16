import {searchStandards,referenceSnapshot,officialSource} from './regulatory-core.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function installNormativeLibrary({catalog,document:dom=document}={}){
 if(dom.getElementById('normativeLibrary'))return;
 if(!catalog){const response=await fetch('./normative-catalog.json');if(!response.ok)throw Error('No se pudo cargar el catálogo normativo.');catalog=await response.json();}
 const versions=catalog.standards;
 const panel=dom.createElement('section');panel.id='normativeLibrary';panel.hidden=true;
 panel.innerHTML=`<div class="panel"><div class="eyebrow">BIBLIOTECA NORMATIVA · NOM Y SEGURIDAD LABORAL</div><h2>Normas y fuentes oficiales</h2><p>Las referencias del catálogo requieren revisión de vigencia y aplicabilidad. Una selección temática no constituye una conclusión legal ni acredita cumplimiento.</p><div class="filter-bar"><input id="nomQuery" type="search" placeholder="Buscar por NOM, riesgo, equipo o actividad…" aria-label="Buscar norma"><select id="nomCategory" aria-label="Categoría"><option value="">Todas las categorías</option>${[...new Set(versions.map(v=>v.category))].map(category=>`<option>${escape(category)}</option>`).join('')}</select></div><p id="nomCount" role="status"></p><div id="nomResults"></div><div id="nomDetails"></div></div>`;
 dom.querySelector('main').append(panel);
 const button=dom.createElement('button');button.dataset.normativeView='library';button.textContent='NOM · Biblioteca normativa';dom.querySelector('#sidebar nav').append(button);
 function render(){const results=searchStandards(versions,dom.getElementById('nomQuery').value,dom.getElementById('nomCategory').value);dom.getElementById('nomCount').textContent=results.length+' referencias · Estado y aplicabilidad requieren validación.';dom.getElementById('nomResults').innerHTML=results.map(({version:v})=>`<article class="report-card"><div><h3>${escape(v.identifier)}</h3><p>${escape(v.name)}</p><span class="status">${escape(v.status)}</span><p>${escape(v.category)} · Fuente consultada: ${escape(v.lastSourceConsulted||'Pendiente')}</p></div><div class="card-controls"><button class="secondary" data-nom-detail="${escape(v.versionId)}">Consultar ficha</button><a class="secondary" href="${escape(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fuente oficial ↗</a></div></article>`).join('');}
 function open(){dom.querySelectorAll('main > section').forEach(section=>section.hidden=true);panel.hidden=false;dom.getElementById('pageTitle').textContent='Biblioteca normativa';dom.getElementById('pageSubtitle').textContent='Referencias oficiales y versiones consultadas.';dom.getElementById('crumb').textContent='Normatividad';dom.querySelectorAll('#sidebar nav button').forEach(b=>b.classList.toggle('active',b===button));render();}
 button.onclick=open;
 dom.addEventListener('click',event=>{if(event.target.closest('[data-view]'))panel.hidden=true;const detail=event.target.closest('[data-nom-detail]');if(!detail)return;const version=versions.find(v=>v.versionId===detail.dataset.nomDetail);if(!version)return;const box=dom.getElementById('nomDetails');box.innerHTML=`<div class="report-note"><h3>${escape(version.identifier)}</h3><p>${escape(version.name)}</p><dl><dt>Estado</dt><dd>${escape(version.status)}</dd><dt>Publicación DOF</dt><dd>${escape(version.publicationDate||'Pendiente de cotejo')}</dd><dt>Inicio de vigencia</dt><dd>${escape(version.effectiveDate||'Pendiente de cotejo')}</dd><dt>Responsable de validación</dt><dd>${escape(version.verifiedBy||'Pendiente')}</dd><dt>Numerales verificados</dt><dd>${(version.requirements||[]).length}</dd></dl><a href="${escape(version.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consultar documento oficial</a><p>El contenido oficial no se modifica. Los resúmenes del catálogo no sustituyen la publicación.</p></div>`;box.scrollIntoView?.({block:'nearest'});});
 dom.getElementById('nomQuery').oninput=render;dom.getElementById('nomCategory').onchange=render;

 // All existing supervisor formats share this editor. References are snapshots,
 // so future catalogue updates cannot silently alter historical records.
 const editor=dom.getElementById('editor');
 function mountSelector(){
  if(!editor.open)return;
  const record=globalThis.SM_ACTIVE;if(!record?.id)return;
  let host=editor.querySelector('#normativeSelector');if(host)host.remove();
  host=dom.createElement('div');host.id='normativeSelector';host.className='field-section';
  host.innerHTML=`<h3>Fundamento normativo</h3><p>Selecciona la versión consultada y documenta por qué se relaciona con el registro. Solo se ofrecen numerales previamente verificados.</p><label>Buscar NOM<input data-nom-search type="search" placeholder="NOM, actividad o riesgo"></label><label>Norma y versión<select data-nom-select></select></label><label>Numeral verificado<select data-nom-section><option value="">Referencia general a la norma</option></select></label><p data-nom-state></p><a data-nom-source target="_blank" rel="noopener noreferrer">Abrir fuente oficial ↗</a><label>Observaciones de aplicabilidad<textarea data-nom-note maxlength="2000"></textarea></label><label><input type="checkbox" data-nom-confirm> Revisé la fuente y confirmo la relación temática con este registro.</label><button type="button" class="secondary" data-nom-add>Agregar referencia</button><div data-nom-linked></div><p data-nom-error role="status"></p>`;
  editor.querySelector('.editor-scroll').append(host);
  const query=host.querySelector('[data-nom-search]'),select=host.querySelector('[data-nom-select]'),section=host.querySelector('[data-nom-section]');
  function selected(){return versions.find(v=>v.versionId===select.value);}
  function state(){const version=selected();if(!version)return;host.querySelector('[data-nom-state]').textContent=version.status+' · La referencia no acredita cumplimiento.';host.querySelector('[data-nom-source]').href=version.sourceUrl;section.innerHTML='<option value="">Referencia general a la norma</option>'+(version.requirements||[]).filter(r=>r.verifiedAt&&r.verifiedBy&&officialSource(r.sourceUrl)).map(r=>`<option value="${escape(r.id)}">${escape(r.section)} · ${escape(r.title||r.text)}</option>`).join('');}
  function options(){select.innerHTML=searchStandards(versions,query.value).map(({version:v})=>`<option value="${escape(v.versionId)}">${escape(v.identifier)} · ${escape(v.status)}</option>`).join('');state();}
  function linked(){host.querySelector('[data-nom-linked]').innerHTML=(record.normativeReferences||[]).map((ref,i)=>`<div class="report-note"><strong>${escape(ref.identifier)}</strong> · ${escape(ref.section||'Referencia general')}<p>${escape(ref.status)} · Consulta: ${escape(ref.consultedAt)}</p><p>${escape(ref.applicabilityNote)}</p><button type="button" class="text" data-nom-remove="${i}">Retirar vínculo</button></div>`).join('');host.querySelectorAll('[data-nom-remove]').forEach(b=>b.onclick=()=>{record.normativeReferences.splice(Number(b.dataset.nomRemove),1);linked();host.dispatchEvent(new Event('input',{bubbles:true}));});}
  query.oninput=options;select.onchange=state;
  host.querySelector('[data-nom-add]').onclick=()=>{
   const error=host.querySelector('[data-nom-error]');try{
    if(record.status==='Finalizado')throw Error('Reabre el formato para modificar sus referencias.');
    if(!host.querySelector('[data-nom-confirm]').checked)throw Error('Confirma la revisión de la fuente.');
    const version=selected();if(!version)throw Error('Selecciona una norma.');
    const requirement=(version.requirements||[]).find(r=>r.id===section.value);
    const snapshot=referenceSnapshot(version,requirement,{consultedAt:new Date().toISOString().slice(0,10),applicabilityNote:host.querySelector('[data-nom-note]').value.trim()});
    if(!snapshot.applicabilityNote)throw Error('Documenta la relación con la actividad.');
    record.normativeReferences??=[];
    if(record.normativeReferences.some(r=>r.versionId===snapshot.versionId&&r.requirementId===snapshot.requirementId))throw Error('La referencia ya está vinculada.');
    record.normativeReferences.push(snapshot);linked();error.textContent='Referencia agregada. Guarda el formato para conservarla.';host.dispatchEvent(new Event('input',{bubbles:true}));
   }catch(e){error.textContent=e.message;}
  };
  options();linked();
  if(record.status==='Finalizado')host.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
 }
 new MutationObserver(mountSelector).observe(editor,{attributes:true,attributeFilter:['open']});
 return {open,catalog};
}
