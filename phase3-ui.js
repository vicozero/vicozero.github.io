// FASE 3 - Mejoras de UI aditivas (no toca la logica existente)
(function(){
  'use strict';
  const KEY = 'sm-sidebar-collapsed';

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  ready(function(){
    const body = document.body;
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    try { if (localStorage.getItem(KEY) === '1') body.classList.add('sidebar-collapsed'); } catch (e) {}

    let backdrop = document.querySelector('.mobile-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', function(){ body.classList.remove('sidebar-open'); });
    }

    if (toggle) {
      toggle.addEventListener('click', function(e){
        e.preventDefault();
        if (window.innerWidth <= 800) {
          body.classList.toggle('sidebar-open');
        } else {
          body.classList.toggle('sidebar-collapsed');
          try { localStorage.setItem(KEY, body.classList.contains('sidebar-collapsed') ? '1' : '0'); } catch (e) {}
        }
      });
    }

    document.querySelectorAll('#sidebar nav button').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (window.innerWidth <= 800) body.classList.remove('sidebar-open');
      });
    });

    const tools = document.querySelector('.header-tools');
    const searchInput = document.getElementById('search');
    if (tools && searchInput) {
      const wrap = document.createElement('label');
      wrap.className = 'header-search';
      wrap.innerHTML = '<span>&#8981;</span><input type="search" placeholder="Buscar en esta vista..." aria-label="Busqueda global">';
      const inp = wrap.querySelector('input');
      inp.addEventListener('input', function(){
        searchInput.value = inp.value;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      searchInput.addEventListener('input', function(){ inp.value = searchInput.value; });
      const bell = document.getElementById('noticeBell');
      if (bell) bell.insertAdjacentElement('beforebegin', wrap);
      else tools.prepend(wrap);
    }

    window.SM_UI = window.SM_UI || {};
    window.SM_UI.loading = function(show){
      let ov = document.querySelector('.loading-overlay');
      if (show) {
        if (!ov) {
          ov = document.createElement('div');
          ov.className = 'loading-overlay';
          ov.innerHTML = '<div class="spinner"></div>';
          document.body.appendChild(ov);
        }
      } else if (ov) {
        ov.remove();
      }
    };
  });
})();