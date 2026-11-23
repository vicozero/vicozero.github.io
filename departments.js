/* Catálogo aditivo de departamentos. No sustituye los campos históricos department/unit/area/unidad. */
(function(root){
  if(root.SMDepartments)return;

  const defaults=[
    {id:'mina',name:'Mina',aliases:['mina','minas','subterránea','subterranea','obra minera'],activo:true},
    {id:'mantenimiento-mecanico',name:'Mantenimiento Mecánico',aliases:['mantenimiento mecanico','mantenimiento','mecánico','mecanico','taller','taller de mantenimiento'],activo:true},
    {id:'mantenimiento-electrico',name:'Mantenimiento Eléctrico',aliases:['mantenimiento electrico','eléctrico','electrico','instalaciones electricas','instalaciones eléctricas'],activo:true},
    {id:'planta-beneficio',name:'Planta de Beneficio',aliases:['planta','planta de beneficio','beneficio','inspeccion planta','inspección planta'],activo:true},
    {id:'almacen',name:'Almacén',aliases:['almacen','almacén'],activo:true},
    {id:'transporte',name:'Transporte',aliases:['transporte'],activo:true},
    {id:'seguridad-industrial',name:'Seguridad Industrial',aliases:['seguridad industrial','seguridad','ssma','hse'],activo:true},
    {id:'medio-ambiente',name:'Medio Ambiente',aliases:['medio ambiente','ambiente'],activo:true},
    {id:'servicios-generales',name:'Servicios Generales',aliases:['servicios generales','servicios'],activo:true},
    {id:'contratistas',name:'Contratistas',aliases:['contratistas','contratista','empresas contratistas'],activo:true}
  ];

  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
  let active=null;

  function catalog(){
    const list=active||root.SM_DEPARTMENTS||root.SAFETY?.departments||defaults;
    return Array.isArray(list)&&list.length?list:defaults;
  }
  function id(value){
    const key=norm(value);
    if(!key)return '';
    return catalog().find(d=>d.activo!==false&&(norm(d.id)===key||norm(d.name)===key||(d.aliases||[]).some(a=>norm(a)===key)))?.id||'';
  }
  function of(record){
    if(!record||typeof record!=='object')return '';
    return id(record.departmentId||record.department||record.unit||record.area||record.unidad||'');
  }
  function name(value){
    const key=id(value);
    if(key)return catalog().find(d=>d.id===key)?.name||key;
    return String(value||'').trim();
  }
  function byDepartment(rows){
    const out=new Map();
    for(const row of rows||[]){
      const key=of(row)||'(sin departamento)';
      if(!out.has(key))out.set(key,{id:key==='(sin departamento)'?'':key,name:key==='(sin departamento)'?key:name(key),rows:[]});
      out.get(key).rows.push(row);
    }
    return [...out.values()];
  }
  function duplicateAliases(list){
    const seen=new Map(),duplicates=[];
    for(const dep of list||catalog()){
      for(const alias of [dep.name,...(Array.isArray(dep.aliases)?dep.aliases:[])]){
        const key=norm(alias);
        if(!key)continue;
        if(seen.has(key)&&seen.get(key)!==dep.id)duplicates.push({alias:String(alias),ids:[seen.get(key),dep.id]});
        else seen.set(key,dep.id);
      }
    }
    return duplicates;
  }
  function withoutId(rows){
    return (rows||[]).filter(row=>!norm(row?.departmentId)&&!!norm(row?.department||row?.unit||row?.area||row?.unidad));
  }
  function setCatalog(list){
    active=Array.isArray(list)&&list.length?list:null;
    const value=catalog();
    root.SM_DEPARTMENTS=value;
    if(root.SAFETY)root.SAFETY.departments=value;
    return value;
  }

  root.SMDepartments={defaults,norm,catalog,id,of,name,byDepartment,duplicateAliases,withoutId,setCatalog};
})(globalThis);
