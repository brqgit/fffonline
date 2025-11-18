// Particle Animation System
(function(){
  if(window.__particleSystem) return;
  window.__particleSystem = true;

  // Effect catalog with frame counts
  const EFFECTS = {
    'fire-arrow': { frames: 8, fps: 24, path: 'Fire Arrow', name: 'Fire Arrow' },
    'fire-ball': { frames: 8, fps: 20, path: 'Fire Ball', name: 'Fire Ball' },
    'fire-spell': { frames: 8, fps: 22, path: 'Fire Spell', name: 'Fire Spell' },
    'water-arrow': { frames: 8, fps: 24, path: 'Water Arrow', name: 'Water Arrow' },
    'water-ball': { frames: 12, fps: 24, path: 'Water Ball', name: 'Water Ball' },
    'water-spell': { frames: 8, fps: 22, path: 'Water Spell', name: 'Water Spell' }
  };

  // Preload effect frames
  const frameCache = {};
  function preloadEffect(effectKey){
    const effect = EFFECTS[effectKey];
    if(!effect || frameCache[effectKey]) return;
    
    frameCache[effectKey] = [];
    for(let i = 1; i <= effect.frames; i++){
      const img = new Image();
      const frameNum = String(i).padStart(2, '0');
      img.src = `img/particles/effects/${effect.path}/PNG/${effect.name}_Frame_${frameNum}.png`;
      frameCache[effectKey].push(img);
    }
  }

  // Preload all effects on page load
  Object.keys(EFFECTS).forEach(preloadEffect);

  // Play animated particle effect
  window.playParticleEffect = function(effectKey, x, y, options = {}){
    const effect = EFFECTS[effectKey];
    if(!effect || !frameCache[effectKey]) {
      console.warn(`Effect "${effectKey}" not found`);
      return;
    }

    const {
      loop = false,
      scale = 1,
      onComplete = null,
      duration = null // override default FPS timing
    } = options;

    const container = document.createElement('div');
    container.className = 'particle-effect';
    container.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, -50%) scale(${scale});
      pointer-events: none;
      z-index: 10000;
      will-change: transform;
    `;

    const img = document.createElement('img');
    img.style.cssText = `
      display: block;
      width: auto;
      height: auto;
      max-width: 200px;
      max-height: 200px;
      image-rendering: crisp-edges;
    `;
    container.appendChild(img);
    document.body.appendChild(container);

    const frames = frameCache[effectKey];
    let currentFrame = 0;
    const frameTime = duration ? duration / frames.length : 1000 / effect.fps;
    
    function nextFrame(){
      if(currentFrame >= frames.length){
        if(loop){
          currentFrame = 0;
        } else {
          container.remove();
          if(onComplete) onComplete();
          return;
        }
      }
      img.src = frames[currentFrame].src;
      currentFrame++;
      setTimeout(nextFrame, frameTime);
    }

    nextFrame();
    return container;
  };

  // Enhanced versions of existing functions
  window.particleOnCard = function(cardId, effectKey, options = {}){
    const card = document.querySelector(`.card[data-id="${cardId}"]`);
    if(!card) return;
    const rect = card.getBoundingClientRect();
    return playParticleEffect(effectKey, rect.left + rect.width/2, rect.top + rect.height/2, options);
  };

  window.particleAtPosition = function(effectKey, x, y, options = {}){
    return playParticleEffect(effectKey, x, y, options);
  };

  // Map game actions to effects
  window.PARTICLE_MAP = {
    // Physical attacks
    'attack': 'fire-arrow',
    'attack-physical': 'fire-arrow',
    'attack-fire': 'fire-ball',
    
    // Magic/Spells
    'spell': 'fire-spell',
    'buff': 'water-spell',
    'magic': 'fire-spell',
    'summon': 'fire-spell',
    'mana': 'water-ball',
    
    // Healing/Water
    'heal': 'water-ball',
    'healing': 'water-ball',
    'water': 'water-arrow',
    
    // Special
    'explosion': 'fire-ball',
    'death': 'fire-ball'
  };

  // Convenience function using particle map
  window.playGameEffect = function(actionType, cardId, options = {}){
    const effectKey = PARTICLE_MAP[actionType] || 'fire-ball';
    return particleOnCard(cardId, effectKey, options);
  };

  console.log('✨ Particle system loaded. Available effects:', Object.keys(EFFECTS));
})();
