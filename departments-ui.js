/* UI del catálogo de departamentos. Aditiva: no modifica otros módulos ni campos históricos. */
(()=>{
  const by=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let items=[],loaded=false,editing=null,busy=false;

  function allowed(){
    const user=globalThis.AUTH?.user||{};
    return user.role==='admin'||user.permissions?.departments===true;
  }
  function notify(text){
    const el=by('toast');
    if(el){el.textContent=text;el.hidden=false;}
  }
  async function api(path,body,method){
    const response=await fetch('/api/'+path,{method:method||(body?'POST':'GET'),headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let data;try{data=await response.json()}catch{throw Error('No se pudo leer la respuesta del catálogo.')}
    if(!response.ok)throw Error(data.error||'No se pudo completar la operación.');
    return data;
  }
  function render(){
    const table=by('departmentsTable');
    if(!table)return;
    const canEdit=allowed();
    const summary=by('departmentSummary');
    if(summary){
      const active=items.filter(d=>d.activo!==false).length;
      const alerts=globalThis.SMDepartments?.duplicateAliases(items)||[];
      summary.innerHTML='<article class="kpi-card"><span class="kpi-label">Departamentos activos</span><span class="kpi-value">'+active+'</span></article>'+
        '<article class="kpi-card"><span class="kpi-label">Registrados</span><span class="kpi-value">'+items.length+'</span></article>'+
        '<article class="kpi-card"><span class="kpi-label">Aliases duplicados</span><span class="kpi-value">'+(alerts.length?esc(alerts.length):'0')+'</span></article>';
    }
    table.innerHTML='<thead><tr><th>ID ESTABLE</th><th>NOMBRE</th><th>ALIASES</th><th>VIGENCIA</th><th>ESTADO</th>'+(canEdit?'<th></th>':'')+'</tr></thead><tbody>'+
      (items.length?items.map(dep=>'<tr><td><code>'+esc(dep.id)+'</code></td><td class="row-main"><strong>'+esc(dep.name)+'</strong></td><td>'+esc((dep.aliases||[]).join(', '))+'</td><td>'+esc((dep.validFrom||'—')+' al '+(dep.validTo||'—'))+'</td><td>'+(dep.activo===false?'Inactivo':'Activo')+'</td>'+
        (canEdit?'<td><button class="row-edit" data-edit-department="'+esc(dep.id)+'">Editar</button></td>':'')+'</tr>').join(''):'<tr><td colspan="'+(canEdit?6:5)+'">No hay departamentos registrados.</td></tr>')+'</tbody>';
    table.querySelectorAll('[data-edit-department]').forEach(btn=>btn.onclick=()=>openEditor(items.find(d=>d.id===btn.dataset.editDepartment)));
  }
  function openEditor(dep){
    const form=by('departmentForm');
    if(!form)return;
    editing=dep||null;
    form.elements.id.value=dep?.id||'';
    form.elements.id.readOnly=!!dep;
    form.elements.name.value=dep?.name||'';
    form.elements.aliases.value=(dep?.aliases||[]).join(', ');
    form.elements.activo.value=dep?.activo===false?'false':'true';
    form.elements.validFrom.value=dep?.validFrom||'';
    form.elements.validTo.value=dep?.validTo||'';
    by('departmentEditorTitle').textContent=dep?'Editar departamento':'Nuevo departamento';
    by('departmentEditor').showModal();
  }
  async function load(){
    if(!by('departmentsTable'))return;
    try{
      items=await api('departments');
      if(!Array.isArray(items))items=[];
      loaded=true;
      globalThis.SMDepartments?.setCatalog(items);
      render();
    }catch(error){notify(error.message)}
  }
  async function save(event){
    event.preventDefault();
    if(busy)return;
    const form=event.target,idValue=form.elements.id.value.trim();
    const idKey=globalThis.SMDepartments?.norm(idValue)||idValue.toLowerCase();
    if(!idKey||!form.elements.name.value.trim()){notify('Completa el identificador y el nombre.');return}
    const payload={
      id:idKey,
      name:form.elements.name.value.trim(),
      aliases:form.elements.aliases.value.split(',').map(s=>s.trim()).filter(Boolean),
      activo:form.elements.activo.value==='true',
      validFrom:form.elements.validFrom.value||'',
      validTo:form.elements.validTo.value||''
    };
    busy=true;
    try{
      await api(editing?'departments/'+encodeURIComponent(editing.id):'departments',payload,editing?'PUT':'POST');
      by('departmentEditor').close();
      await load();
      notify('Departamento guardado correctamente.');
    }catch(error){notify(error.message)}finally{busy=false}
  }
  function init(){
    const add=by('addDepartment'),form=by('departmentForm');
    if(add)add.onclick=()=>openEditor(null);
    if(form)form.onsubmit=save;
    const close=by('departmentEditorClose');
    if(close)close.onclick=()=>by('departmentEditor').close();
    load();
  }
  globalThis.renderDepartments=()=>{if(!by('departmentsTable'))return;if(globalThis.SMDepartments&&items.length)globalThis.SMDepartments.setCatalog(items);render();};
  globalThis.loadDepartments=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
