// ===== FFF efeitos/hover/tilt (sem dependências) =====
(function () {
  const TILT_ATTR = 'data-tilt-wired';

  function wireCard(card){
    if (!card || card.getAttribute(TILT_ATTR)) return;
    const art = card.querySelector('.art');

    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 100;
      const py = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--px', px + '%');
      card.style.setProperty('--py', py + '%');
      if (art){
        const tx = (px - 50) / 5, ty = (py - 50) / 5;
        art.style.transform = `translate3d(${tx*3}px, ${ty*3}px, 0) scale(1.06)`;
      }
    });

    card.addEventListener('mouseleave', ()=>{
      if (art) art.style.transform = 'translate3d(0,0,0)';
    });

    card.setAttribute(TILT_ATTR, '1');
  }

  function scan(scope=document){
    scope.querySelectorAll('.card').forEach(wireCard);
  }

  // observa o DOM por novas cartas renderizadas
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.type === 'childList'){
        m.addedNodes.forEach((n)=>{
          if (!(n instanceof HTMLElement)) return;
          if (n.classList?.contains('card')) wireCard(n);
          else scan(n);
        });
      }
    }
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    scan(document);
    mo.observe(document.body, { childList:true, subtree:true });
  });
})();
