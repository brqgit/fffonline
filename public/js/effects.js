(function(){
  if(window.__fffEffectsUI) return; window.__fffEffectsUI = true;
  const listId = 'effectsList';
  function makeId(name){ return 'ef-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now(); }
  window.addActiveEffect = function(effect){
    if(!effect) return null;
    const list = document.getElementById(listId);
    if(!list) return null;
    const id = effect.id || makeId(effect.name||'effect');
    const pill = document.createElement('div');
    pill.className = 'effect-pill';
    pill.dataset.effectId = id;
    const icon = document.createElement('div'); icon.className='effect-icon'; icon.textContent = effect.icon || '✨';
    const name = document.createElement('div'); name.className='effect-name'; name.textContent = effect.name || 'Efeito';
    pill.appendChild(icon); pill.appendChild(name);
    if(effect.count){ const c = document.createElement('div'); c.className='effect-count'; c.textContent = '×'+effect.count; pill.appendChild(c); }
    list.appendChild(pill);
    return id;
  }
  window.removeActiveEffect = function(id){
    const list = document.getElementById(listId); if(!list) return;
    const el = list.querySelector('[data-effect-id="'+id+'"]'); if(el) el.remove();
  }
  window.clearActiveEffects = function(){
    const list = document.getElementById(listId); if(!list) return; list.innerHTML = '';
  }
})();
