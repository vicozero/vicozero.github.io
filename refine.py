from pathlib import Path
p=Path('public/supervisor.js');s=p.read_text(encoding='utf8')
s=s.replace("let reports=[],active=null,cloud=true,dirty=false,saving=false,saveTimer,view='dashboard'","let reports=[],active=null,cloud=true,dirty=false,saving=false,saveTimer,editVersion=0,view='dashboard'")
s=s.replace("dirty=true;$('saveState').textContent='Modifications en cours…'.replace('Modifications en cours…','Modificaciones sin guardar')","dirty=true;editVersion++;$('saveState').textContent='Modificaciones sin guardar'")
s=s.replace('saving=true;const snapshot=structuredClone(active);','saving=true;const savedVersion=editVersion;const snapshot=structuredClone(active);')
s=s.replace('dirty=false;success=true;','dirty=editVersion!==savedVersion;success=true;')
s=s.replace('finally{saving=false}return success','finally{saving=false;if(dirty&&success)saveTimer=setTimeout(()=>persist(false),1000)}return success')
s=s.replace("$('typeFilter').innerHTML+S.types.map(t=>`<option value=\"${t.id}\">${t.name}</option>`).join('');",'')
s=s.replace("const saved=await res.json();snapshot.revision=saved.revision;","const saved=await res.json();snapshot.pendingSync=false;snapshot.updated=saved.updated;snapshot.revision=saved.revision;")
s=s.replace("else sync('Guardado local · Sin conexión',true);","else {snapshot.pendingSync=true;sync('Guardado local · Sin conexión',true);}")
s=s.replace("}catch(e){dirty=true;const i=reports.findIndex", "}catch(e){dirty=true;snapshot.pendingSync=true;const i=reports.findIndex")
s=s.replace("sync('Guardado en la nube')}catch{cloud=false;", "sync('Guardado en la nube');let local=[];try{local=JSON.parse(localStorage.getItem('sm-reports-backup')||'[]')}catch{}const pending=local.filter(r=>r.pendingSync);for(const r of pending){const i=reports.findIndex(x=>x.id===r.id);if(i<0)reports.unshift(r);else if(reports[i].revision===r.revision)reports[i]=r;}if(pending.length)toast('Hay avances locales pendientes. Abre cada formato y pulsa Guardar avance para sincronizar.');}catch{cloud=false;")
p.write_text(s,encoding='utf8')
p=Path('public/report-pdf.js');s=p.read_text(encoding='utf8')
old="for(let i=0;i<rows.length;i++){if(i) section('Registro '+(i+1));for(const [key,label] of t.table.columns)block(label,rows[i][key]||'-',title,sub)}"
new="if(t.id==='leadership')table(t.table.columns.map(c=>c[1]),rows.map(row=>t.table.columns.map(c=>row[c[0]]||'-')),[.17,.17,.2,.46],title,sub);else for(let i=0;i<rows.length;i++){if(i) section('Registro '+(i+1));for(const [key,label] of t.table.columns)block(label,rows[i][key]||'-',title,sub)}"
s=s.replace(old,new)
p.write_text(s,encoding='utf8')
