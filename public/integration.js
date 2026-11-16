// Integracion Fase 4 (aditiva): plantillas por area + generacion de acciones correctivas
// No modifica supervisor.js ni workspace.js; usa los endpoints /api existentes.
(function(){
  'use strict';

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function by(id){ return document.getElementById(id); }

  // --- 1. Plantillas por area: selector que muestra los items de verificacion ---
  function injectAreaTemplateSelector(){
    const editor = by('editor');
    if (!editor || !editor.open) return;
    if (editor.dataset.areaTemplateInjected === '1') return;
    const typeSel = editor.querySelector('select[name="type"], #type, [data-field="type"]');
    const specific = by('specificFields');
    if (!specific) return;
    const S = window.SAFETY;
    if (!S || !S.areaTemplates) return;
    // Solo para formatos de inspeccion/VEO
    const allowed = ['inspection','area','veo'];
    const currentType = (typeSel && typeSel.value) || (window.active && window.active.type) || '';
    if (!allowed.includes(currentType)) return;

    const wrap = document.createElement('div');
    wrap.className = 'form-section';
    wrap.style.marginBottom = '12px';
    const label = document.createElement('label');
    label.style.display = 'grid';
    label.style.gap = '4px';
    label.style.fontSize = '12px';
    label.innerHTML = '<span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700">Plantilla por área</span>';
    const sel = document.createElement('select');
    sel.className = 'area-template-select';
    sel.innerHTML = '<option value="">— Sin plantilla —</option>' +
      Object.keys(S.areaTemplates).map(a => '<option value="'+a+'">'+a+'</option>').join('');
    label.appendChild(sel);
    wrap.appendChild(label);

    const preview = document.createElement('div');
    preview.className = 'area-template-preview';
    preview.style.marginTop = '8px';
    preview.style.fontSize = '11px';
    preview.style.color = 'var(--muted)';
    wrap.appendChild(preview);

    sel.addEventListener('change', function(){
      const items = S.areaTemplates[sel.value];
      if (!items) { preview.innerHTML = ''; return; }
      preview.innerHTML = '<b style="color:var(--ink)">Ítems de verificación:</b><ul style="margin:4px 0 0 16px;padding:0;">' +
        items.map(i => '<li>'+i+'</li>').join('') + '</ul>';
    });

    // Insertar al inicio de specificFields
    specific.insertBefore(wrap, specific.firstChild);
    editor.dataset.areaTemplateInjected = '1';
  }

  // Reset flag when editor closes
  function watchEditor(){
    const editor = by('editor');
    if (!editor) return;
    const obs = new MutationObserver(function(){
      if (!editor.open) {
        editor.dataset.areaTemplateInjected = '0';
      } else {
        // pequeño delay para que supervisor.js renderice specificFields
        setTimeout(injectAreaTemplateSelector, 120);
      }
    });
    obs.observe(editor, { attributes: true, attributeFilter: ['open'] });
  }

  // --- 2. Generar acción correctiva desde el registro abierto ---
  function injectGenerateAction(){
    const editor = by('editor');
    if (!editor || !editor.open) return;
    if (editor.dataset.genActionInjected === '1') return;
    const footer = editor.querySelector('.editor-footer');
    if (!footer) return;
    // Solo si hay un registro activo (edición, no creación nueva)
    const active = window.SM_ACTIVE;
    if (!active || !active.id) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.textContent = 'Generar acción correctiva';
    btn.title = 'Crea una acción correctiva vinculada a este registro';
    btn.addEventListener('click', async function(){
      btn.disabled = true;
      try {
        const rec = active;
        const action = {
          id: 'SM-AC-' + Date.now().toString(36).toUpperCase(),
          folio: 'SM-AC-' + Date.now().toString(36).toUpperCase(),
          description: (rec.description || rec.finding || rec.title || 'Acción derivada del registro ' + (rec.folio||rec.id)).slice(0,500),
          owner: rec.supervisor || rec.owner || (window.AUTH && window.AUTH.user && window.AUTH.user.name) || '',
          unit: rec.unit || rec.area || '',
          source: rec.type ? (S_typeName(rec.type)) : 'Manual',
          start: rec.date || new Date().toISOString().slice(0,10),
          due: rec.due || rec.dueDate || rec.date || new Date().toISOString().slice(0,10),
          priority: (rec.severity === 'Alta' || rec.severity === 'Grave') ? 'Alta' : 'Media',
          progress: 0,
          status: 'Pendiente',
          photos: [],
          history: [{date: new Date().toISOString(), note: 'Generada desde registro ' + (rec.folio||rec.id), by: (window.AUTH && window.AUTH.user && window.AUTH.user.name) || ''}],
          revision: 0
        };
        const res = await fetch('/api/actions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
        if (!res.ok) throw new Error('No se pudo crear la acción.');
        if (window.toast) window.toast('Acción correctiva creada y vinculada a este registro.');
        else console.log('Acción creada:', action.id);
      } catch (err) {
        alert('No se pudo generar la acción: ' + (err.message || err));
      } finally {
        btn.disabled = false;
      }
    });
    footer.insertBefore(btn, footer.firstChild);
    editor.dataset.genActionInjected = '1';
  }

  function S_typeName(typeId){
    const S = window.SAFETY;
    if (!S || !S.types) return typeId;
    const t = S.types.find(x => x.id === typeId);
    return t ? t.name : typeId;
  }

  function watchEditorForAction(){
    const editor = by('editor');
    if (!editor) return;
    const obs = new MutationObserver(function(){
      if (!editor.open) {
        editor.dataset.genActionInjected = '0';
      } else {
        setTimeout(injectGenerateAction, 150);
      }
    });
    obs.observe(editor, { attributes: true, attributeFilter: ['open'] });
  }

  ready(function(){
    // Exponer active globalmente si supervisor.js lo define en window (no-op si no)
    watchEditor();
    watchEditorForAction();
  });
})();
