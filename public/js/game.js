(function(){const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));const logBox=$('#log');const log=t=>{if(!logBox)return;const d=document.createElement('div');d.textContent=t;logBox.prepend(d)};const rand=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),uid=()=>(Math.random().toString(36).slice(2));
function ensureCardBase(card){
  if(!card) return;
  if(card.baseAtk===undefined) card.baseAtk = card.atk;
  if(card.baseHp===undefined) card.baseHp = card.hp;
}

function addBuffBadge(card, stat, amount, { icon, sourceId, sourceType, temporary }={}){
  if(!card || !amount) return;
  card.buffBadges = card.buffBadges || { atk:[], hp:[] };
  const list = card.buffBadges[stat] || (card.buffBadges[stat]=[]);
  list.push({ amount, icon: icon || '✨', sourceId: sourceId || null, sourceType: sourceType || null, temporary: !!temporary });
}

function removeBuffBadges(card, predicate, opts={ adjustStats:true }){
  if(!card || !card.buffBadges) return;
  const adjust = opts && opts.adjustStats !== false;
  ['atk','hp'].forEach(stat=>{
    const list = card.buffBadges[stat];
    if(!list || !list.length) return;
    const keep=[];
    list.forEach(entry=>{
      if(predicate(entry, stat)){
        if(adjust && typeof entry.amount==='number'){
          const current = typeof card[stat]==='number' ? card[stat] : 0;
          const next = current - entry.amount;
          card[stat] = stat==='hp' ? Math.max(0,next) : next;
        }
      }else{
        keep.push(entry);
      }
    });
    if(keep.length){ card.buffBadges[stat]=keep; }
    else{ delete card.buffBadges[stat]; }
  });
  if(card.buffBadges && !Object.keys(card.buffBadges).some(k=>card.buffBadges[k] && card.buffBadges[k].length)){
    delete card.buffBadges;
  }
}

function buffIconFor(card, stat){
  if(!card || !card.buffBadges) return '';
  const list = card.buffBadges[stat];
  if(!list || !list.length) return '';
  const icons = list.map(entry => entry && entry.icon ? entry.icon : '?').filter(Boolean);
  return icons.join(' ');
}

function emitCardStatChange(card,{ atk=0, hp=0, icon=null, sourceId=null, sourceType=null, permanent=false, temporary=false }={}){
  if(!card || (!atk && !hp)) return;
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      const type = (atk < 0 || hp < 0) ? 'card:debuffed' : 'card:buffed';
      window.FFFEvents.emit(type, {
        id: card.id,
        name: card.name,
        side: getCardSide(card),
        atk,
        hp,
        icon,
        sourceId,
        sourceType,
        permanent: !!permanent,
        temporary: !!temporary,
        deck: card.deck || null,
        tribe: card.tribe || null,
        combatStyle: card.combatStyle || null,
        currentAtk: card.atk,
        currentHp: card.hp,
        baseAtk: card.baseAtk || card.atk,
        baseHp: card.baseHp || card.hp
      });
    }
  }catch(_){ }
}

function applyCardBuff(card,{ atk=0, hp=0, icon, sourceId, sourceType, permanent=false }={}){
  if(!card) return;
  ensureCardBase(card);
  if(atk){
    card.atk += atk;
    addBuffBadge(card,'atk',atk,{icon,sourceId,sourceType,temporary:!permanent});
    if(permanent) card.baseAtk = card.atk;
  }
  if(hp){
    card.hp += hp;
    addBuffBadge(card,'hp',hp,{icon,sourceId,sourceType,temporary:!permanent});
    if(permanent) card.baseHp = card.hp;
  }
  emitCardStatChange(card,{ atk, hp, icon, sourceId, sourceType, permanent, temporary:!permanent });
  try{ handleCardBuffTriggers(card,{atk,hp,icon,sourceId,sourceType,permanent}); }catch(_){ }
}
function ensureTurnState(){
  if(!G.turnState){
    G.turnState = {
      player:{ drawn:0, played:0, battlecryEchoUsed:false },
      ai:{ drawn:0, played:0, battlecryEchoUsed:false }
    };
  }
  return G.turnState;
}
function getTurnState(side){
  const state = ensureTurnState();
  if(!state[side]) state[side] = { drawn:0, played:0, battlecryEchoUsed:false };
  return state[side];
}
function resetTurnState(side){
  ensureTurnState()[side] = { drawn:0, played:0, battlecryEchoUsed:false };
}
function getCardSide(card){
  if(!card) return null;
  if(G.playerBoard.includes(card) || G.playerHand.includes(card) || G.playerDeck.includes(card) || G.playerDiscard.includes(card)) return 'player';
  if(G.aiBoard.includes(card) || G.aiHand.includes(card) || G.aiDeck.includes(card) || G.aiDiscard.includes(card)) return 'ai';
  return null;
}
function applyTurnBuff(card,{atk=0,hp=0,icon='✨',sourceId=null,sourceType='turnBuff'}={}){
  if(!card) return;
  if(atk){ card.atk += atk; addBuffBadge(card,'atk',atk,{icon,sourceId,sourceType,temporary:true}); }
  if(hp){ card.hp += hp; addBuffBadge(card,'hp',hp,{icon,sourceId,sourceType,temporary:true}); }
  emitCardStatChange(card,{ atk, hp, icon, sourceId, sourceType, permanent:false, temporary:true });
}
function healUnit(card, amount, sourceCard=null){
  if(!card || !amount) return 0;
  const before=card.hp;
  card.hp=Math.min((card.baseHp||card.hp)+5, card.hp + amount);
  const healed=Math.max(0, card.hp - before);
  if(healed){
    try{
      if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
        window.FFFEvents.emit('card:healed', {
          id: card.id,
          name: card.name,
          side: getCardSide(card),
          amount: healed,
          hp: card.hp,
          maxHp: card.baseHp || card.hp,
          sourceId: sourceCard && sourceCard.id ? sourceCard.id : null,
          sourceType: sourceCard && sourceCard.type ? sourceCard.type : null,
          deck: (sourceCard && sourceCard.deck) || card.deck || null,
          tribe: (sourceCard && sourceCard.tribe) || card.tribe || null,
          combatStyle: (sourceCard && sourceCard.combatStyle) || card.combatStyle || null
        });
      }
    }catch(_){ }
  }
  if(healed && card.onHealedGainAtk){
    applyCardBuff(card,{atk:card.onHealedGainAtk,icon:(sourceCard&&sourceCard.emoji)||'💧',sourceId:(sourceCard&&sourceCard.id)||card.id,sourceType:'healTrigger',permanent:true});
  }
  return healed;
}
function cardsOnSide(side){ return side==='player' ? G.playerBoard : G.aiBoard; }
function opponentSide(side){ return side==='player' ? 'ai' : 'player'; }
function hasBoardTotemWith(side, prop){ return (G.totems||[]).some(t=>t && t.owner===side && t[prop]); }
function handleCardBuffTriggers(card,{atk=0,hp=0,sourceType=''}={}){
  if(!card || (!atk && !hp)) return;
  const side = getCardSide(card);
  if(!side) return;
  const turnState = getTurnState(side);
  if(card.drawOnFirstBuffEachTurn && card._buffDrawTurn !== G.turn){
    card._buffDrawTurn = G.turn;
    draw(side,1);
  }
  if(card.buffAuraHpBonus && sourceType !== 'auraBonus'){
    applyCardBuff(card,{ hp: card.buffAuraHpBonus, icon:'🌳', sourceId:card.id, sourceType:'auraBonus', permanent:true });
  }
  cardsOnSide(side).forEach(unit=>{
    if(unit && unit.id!==card.id && unit.onBuffTempAtk){
      applyTurnBuff(unit,{ atk: unit.onBuffTempAtk, icon:'🐺', sourceId:card.id, sourceType:'turnBuff' });
    }
  });
  const avatar = cardsOnSide(side).find(unit=>unit && unit.doubleBuffAura && unit.id!==card.id);
  if(avatar && !turnState._doubleBuffLock){
    const others = cardsOnSide(side).filter(unit=>unit && unit.id!==card.id && unit.id!==avatar.id);
    const bonusTarget = others[0];
    if(bonusTarget){
      turnState._doubleBuffLock = true;
      applyCardBuff(bonusTarget,{ atk, hp, icon:'🌲', sourceId:avatar.id, sourceType:'avatarEcho', permanent:true });
      turnState._doubleBuffLock = false;
    }
  }
}
const setAriaHidden=(node,hidden)=>{if(!node)return;try{if(hidden){const ae=document.activeElement; if(ae && node.contains(ae)){ try{ae.blur()}catch(_){ } } node.setAttribute('inert','');} else { node.removeAttribute('inert'); }}catch(_){ } node.setAttribute('aria-hidden',hidden?'true':'false')};
const focusDialog=node=>{if(!node)return;const target=node.querySelector('[autofocus],button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');if(target&&typeof target.focus==='function'){target.focus()}};
const AUDIO_ENABLED = false;
const AudioCtor = (typeof window!=='undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
const AudioCtx = AUDIO_ENABLED ? AudioCtor : null;
let actx = null,
    master = null,
    sfxMuted = false,
    sfxVolume = 1,
    allMuted = false;

const SFX_ROOT = 'sfx/';
const SFX_DIRECTORIES = ['GameSFX','Instruments','Voices'];

const SFX_CLIPS = {
  start: [],
  end: ['Voices/Time Out.wav'],
  play: {
    default: ['GameSFX/Retro Blip 07.wav'],
    spell: ['GameSFX/Retro Alarmed 10.wav'],
    totem: ['GameSFX/Retro Alarm 02.wav']
  },
  defense: ['GameSFX/Retro Alarm Long 02.wav'],
  attack: {
    heavy: ['GameSFX/Retro Alarmed 06.wav', 'GameSFX/Retro Alarmed StereoUP 03.wav'],
    flame: ['GameSFX/Retro Alarmed 10.wav'],
    storm: ['GameSFX/Retro Alarm Long 02.wav', 'GameSFX/Retro Alarmed StereoUP 03.wav'],
    feral: ['GameSFX/Retro Beeep 20.wav'],
    mystic: ['GameSFX/Retro Blip 15.wav'],
    totem: ['GameSFX/Retro Alarm 02.wav'],
    frost: ['Instruments/Retro Instrument - choir bass - C03.wav'],
    poison: ['GameSFX/Retro Beeep 06.wav'],
    tidal: ['GameSFX/Retro Ring 01.wav'],
    default: ['GameSFX/Retro Blip 07.wav', 'GameSFX/Retro Blip 15.wav']
  },
  hit: {
    default: ['GameSFX/Retro Alarmed 06.wav']
  },
  overflow: ['GameSFX/Retro Alarmed StereoUP 03.wav'],
  death: ['Voices/Game Over.wav', 'Voices/Nightmare Mode.wav'],
  crit: ['GameSFX/Retro Alarmed 10.wav'],
  error: ['Voices/Malfunction.wav'],
  mana: ['GameSFX/Retro Ring 01.wav'],
  reward: ['Voices/Mission Completed.wav', 'Voices/Level Completed.wav'],
  reroll: ['GameSFX/Retro Beeep 06.wav']
};

const CHARACTER_ATTACK_CUES = {
  male: ['Voices/Mission Completed.wav'],
  female: ['Voices/Level Completed.wav'],
  human: ['GameSFX/Retro Blip 15.wav'],
  beast: ['GameSFX/Retro Beeep 20.wav'],
  spirit: ['Instruments/Retro Instrument - choir bass - C04.wav'],
  fire: ['GameSFX/Retro Alarmed 10.wav'],
  storm: ['GameSFX/Retro Alarmed StereoUP 03.wav'],
  frost: ['Instruments/Retro Instrument - choir bass - C03.wav'],
  nature: ['Instruments/Retro Instrument - choir bass - C01.wav'],
  water: ['GameSFX/Retro Ring 01.wav'],
  shadow: ['Voices/Nightmare Mode.wav'],
  totem: ['GameSFX/Retro Alarm 02.wav'],
  default: ['GameSFX/Retro Blip 07.wav']
};

const CHARACTER_HIT_CUES = {
  male: ['Voices/Deactivated.wav'],
  female: ['Voices/Time Out.wav'],
  human: ['GameSFX/Retro Alarmed 06.wav'],
  beast: ['GameSFX/Retro Alarm 02.wav'],
  spirit: ['Instruments/Retro Instrument - choir bass - C02.wav'],
  shadow: ['Voices/Nightmare Mode.wav'],
  totem: ['GameSFX/Retro Alarm 02.wav'],
  default: ['GameSFX/Retro Alarmed 06.wav']
};

const CHARACTER_DEATH_CUES = {
  male: ['Voices/Game Over.wav'],
  female: ['Voices/Time Out.wav'],
  human: ['Voices/Game Over.wav'],
  beast: ['Voices/Nightmare Mode.wav'],
  spirit: ['Voices/Nightmare Mode.wav'],
  shadow: ['Voices/Nightmare Mode.wav'],
  totem: ['GameSFX/Retro Alarm 02.wav'],
  default: ['Voices/Game Over.wav']
};

const ABILITY_CUES = {
  heal: [],
  buff: ['GameSFX/Retro Blip 15.wav'],
  mana: ['GameSFX/Retro Ring 01.wav'],
  draw: ['GameSFX/Retro Beeep 06.wav'],
  debuff: ['GameSFX/Retro Alarmed StereoUP 03.wav'],
  totem: ['GameSFX/Retro Alarm 02.wav'],
  spell: ['GameSFX/Retro Alarmed 10.wav'],
  fire: ['GameSFX/Retro Alarmed 10.wav'],
  storm: ['GameSFX/Retro Alarm Long 02.wav'],
  frost: ['Instruments/Retro Instrument - choir bass - C03.wav'],
  nature: ['Instruments/Retro Instrument - choir bass - C01.wav'],
  water: ['GameSFX/Retro Ring 01.wav'],
  shadow: ['Voices/Nightmare Mode.wav'],
  default: ['GameSFX/Retro Blip 07.wav']
};

const BATTLE_THEME_AUDIO = {
  vikings: 'Instruments/Retro Instrument - choir bass - C05.wav',
  pescadores: 'Instruments/Retro Instrument - choir bass - C04.wav',
  animais: 'GameSFX/Retro Beeep 20.wav',
  floresta: 'Instruments/Retro Instrument - choir bass - C01.wav',
  sombras: 'Instruments/Retro Instrument - choir bass - C08.wav',
  furioso: 'Instruments/Retro Instrument - choir bass - C06.wav',
  percepcao: 'Instruments/Retro Instrument - choir bass - C03.wav',
  default: 'Instruments/Retro Instrument - choir bass - C02.wav'
};

const audioBufferCache = new Map();
let ambientLoop = null;

function stopMenuMusic(){
  try{ setBattleAmbience(null); }
  catch(_){ }
}

function startMenuMusic(preset){
  // Music removed - only SFX remain
}

function tryStartMenuMusicImmediate(){
  // Music removed - only SFX remain
}

try{
  window.startMenuMusic = startMenuMusic;
  window.stopMenuMusic = stopMenuMusic;
  window.tryStartMenuMusicImmediate = tryStartMenuMusicImmediate;
}catch(_){ }

function initAudio(){
  if(!AudioCtx) return;
  if(!actx){
    actx = new AudioCtx();
    master = actx.createGain();
    master.gain.value = sfxMuted ? 0 : 1;
    master.connect(actx.destination);
  }
}

function ensureRunning(){
  if(actx && actx.state==='suspended'){
    try{ actx.resume(); }catch(_){ }
  }
}

function loadSfxBuffer(file){
  initAudio();
  if(!actx) return Promise.resolve(null);
  if(audioBufferCache.has(file)) return audioBufferCache.get(file);
  const url = encodeURI(SFX_ROOT + file);
  const pending = fetch(url)
    .then(res=>{ if(!res.ok) throw new Error('SFX load failed'); return res.arrayBuffer(); })
    .then(buf=>actx.decodeAudioData(buf))
    .catch(err=>{ 
      try{ audioBufferCache.set(file, Promise.resolve(null)); }catch(_){ }
      console.warn('Falha ao carregar SFX', file);
      return null; 
    });
  audioBufferCache.set(file, pending);
  return pending;
}

function playBufferedClip(file,{ volume=1, loop=false, fade=.3, rate=1 }={}){
  if(!AudioCtx || sfxMuted) return Promise.resolve(null);
  initAudio();
  ensureRunning();
  if(!actx) return Promise.resolve(null);
  return loadSfxBuffer(file).then(buffer=>{
    if(!buffer || !actx) return null;
    const source = actx.createBufferSource();
    source.buffer = buffer;
    if(rate && rate!==1){ try{ source.playbackRate.value = rate; }catch(_){ } }
    source.loop = !!loop;
    const gain = actx.createGain();
    const target = Math.max(0, volume * sfxVolume * (sfxMuted?0:1));
    if(loop && fade>0){ gain.gain.value = .0001; } else { gain.gain.value = target; }
    source.connect(gain);
    gain.connect(master);
    try{ source.start(); }catch(_){ return null; }
    if(loop && fade>0){
      try{ gain.gain.exponentialRampToValueAtTime(Math.max(.0001,target), actx.currentTime + fade); }
      catch(_){ gain.gain.value = target; }
    }else{
      gain.gain.value = target;
    }
    if(!loop){
      source.addEventListener('ended',()=>{
        try{ source.disconnect(); }catch(_){ }
        try{ gain.disconnect(); }catch(_){ }
      });
    }
    return { source, gain, base: volume, loop };
  });
}

function pickClip(entry,variant){
  if(!entry) return null;
  if(Array.isArray(entry)) return entry.length ? rand(entry) : null;
  if(variant && entry[variant]){
    const arr = entry[variant];
    if(Array.isArray(arr) && arr.length) return rand(arr);
  }
  if(entry.default){
    const arr = entry.default;
    if(Array.isArray(arr) && arr.length) return rand(arr);
  }
  const keys = Object.keys(entry);
  for(const key of keys){
    const arr = entry[key];
    if(Array.isArray(arr) && arr.length) return rand(arr);
  }
  return null;
}

function sfx(name,variant,opts){
  // SFX temporarily disabled
  return Promise.resolve();
  // if(!AudioCtx) return Promise.resolve();
  // const clip = pickClip(SFX_CLIPS[name], variant);
  // if(!clip) return Promise.resolve();
  // return playBufferedClip(clip, opts||{});
}

function stopAmbientLoop(fade=.25){
  if(!ambientLoop){ return; }
  if(!actx){ ambientLoop = null; return; }
  const { source, gain } = ambientLoop;
  try{
    if(gain && fade>0){
      gain.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + fade);
      setTimeout(()=>{
        try{ source.stop(); }catch(_){ }
        try{ source.disconnect(); }catch(_){ }
        try{ gain.disconnect(); }catch(_){ }
      }, Math.max(150, fade*1000 + 100));
    }else{
      try{ source.stop(); }catch(_){ }
      try{ source.disconnect(); }catch(_){ }
      try{ gain.disconnect(); }catch(_){ }
    }
  }catch(_){ }
  ambientLoop = null;
}

function setBattleAmbience(theme){
  // Music removed - function is now a no-op
}

function setSfxVolume(v){
  sfxVolume = clamp(v,0,1);
  if(master) master.gain.value = sfxMuted ? 0 : 1;
}

window.setSfxVolume = setSfxVolume;
window.playSfx = sfx;
window.sfx = sfx;

const FEMALE_NAME_HINTS = ['sacerdotisa','ceifeira','guardia','matriarca','rainha','feiticeira','curandeir','batedora','ladra','arqueira','dama','herbalista','valquir','guardia','defensora'];
const BEAST_NAME_HINTS = ['lobo','urso','raposa','coruja','cervo','alce','javali','texugo','lince','foca','falca','corvo','serpente','fera','animal','bode','touro','esquilo','cabrito','morcego','fenrir'];
const SPIRIT_NAME_HINTS = ['espirito','espírito','convergente','etereo','etéreo','totem','ancestral','fantasma','sombra','runa','mistico','místico','aparic'];
const FIRE_HINTS = ['fogo','chama','bras','brasa','ardente','inferno','forja','incendio','labared','brasero'];
const FROST_HINTS = ['gelo','neve','artico','ártico','frio','glacial','inverno','geada','gelado','aurora'];
const STORM_HINTS = ['raio','tempest','trov','relamp','storm','furacao','vento','ciclone','tormenta','turbilh'];
const WATER_HINTS = ['mar','oceano','onda','mare','maré','rio','pesc','navio','corsario','marinho','porto','tide'];
const NATURE_HINTS = ['bosque','florest','raiz','folha','vinha','trigo','terra','musgo','selva','campo','carvalho','seiva'];
const SHADOW_HINTS = ['sombra','noite','noturno','luna','oculto','escuro','sombrio'];

function normalizeAudioText(str){
  return (str||'').normalize('NFD').replace(/[^a-z0-9\s]/gi,'').toLowerCase();
}

function deriveAudioProfile(card){
  if(!card) return { gender:'male', race:'human', element:'' };
  const nameTxt = normalizeAudioText(card.name);
  const tribeTxt = normalizeAudioText(card.tribe);
  const textTxt = normalizeAudioText(card.text);
  const combined = `${nameTxt} ${tribeTxt} ${textTxt}`;
  let race = 'human';
  if(card.type === 'totem') race = 'totem';
  if(tribeTxt.includes('animal') || BEAST_NAME_HINTS.some(h=>combined.includes(h))) race = 'beast';
  else if(tribeTxt.includes('converg') || SPIRIT_NAME_HINTS.some(h=>combined.includes(h))) race = 'spirit';
  else if(tribeTxt.includes('totem')) race = 'totem';
  let gender = 'male';
  if(race === 'beast' || race === 'totem'){ gender = 'male'; }
  else if(FEMALE_NAME_HINTS.some(h=>combined.includes(h))){ gender = 'female'; }
  else {
    const words = nameTxt.split(' ').filter(Boolean);
    if(words.length){
      const last = words[words.length-1];
      if(last.endsWith('a') && !last.endsWith('da') && !last.endsWith('ma')) gender = 'female';
    }
  }
  let element = '';
  if(FIRE_HINTS.some(h=>combined.includes(h))) element = 'fire';
  else if(FROST_HINTS.some(h=>combined.includes(h))) element = 'frost';
  else if(STORM_HINTS.some(h=>combined.includes(h))) element = 'storm';
  else if(WATER_HINTS.some(h=>combined.includes(h))) element = 'water';
  else if(NATURE_HINTS.some(h=>combined.includes(h))) element = 'nature';
  else if(SHADOW_HINTS.some(h=>combined.includes(h))) element = 'shadow';
  else if(race === 'totem') element = 'totem';
  return { gender, race, element };
}

function emitVisualEvent(name, payload={}){
  try{
    if(!name || !window.FFFEvents || typeof window.FFFEvents.emit !== 'function') return false;
    window.FFFEvents.emit(name, payload);
    return true;
  }catch(_){ }
  return false;
}

function isPixiVisualActive(){
  try{
    const visualRoot = document.getElementById('visualRoot');
    return !!(visualRoot && visualRoot.dataset && visualRoot.dataset.pixiActive === 'true');
  }catch(_){ }
  return false;
}

function shouldUseLegacyVisualFallback(){
  return !isPixiVisualActive();
}

let lastTurnUiVisualState = null;

function syncTurnUiVisuals(side){
  const currentSide = side === 'ai' ? 'ai' : 'player';
  if(lastTurnUiVisualState === currentSide) return;
  lastTurnUiVisualState = currentSide;
  emitVisualEvent('visual:turn-ui', {
    side: currentSide,
    yourTurn: currentSide === 'player',
    source: 'turn-indicator'
  });
}

function playCharacterCue(card,stage){
  emitVisualEvent('visual:character-cue', {
    stage: stage || 'idle',
    id: card && card.id ? card.id : null,
    name: card && card.name ? card.name : null,
    type: card && card.type ? card.type : null,
    side: card ? getCardSide(card) : null,
    deck: card && card.deck ? card.deck : null,
    tribe: card && card.tribe ? card.tribe : null,
    combatStyle: card && card.combatStyle ? card.combatStyle : null,
    source: 'playCharacterCue'
  });
}
function playBurnDestroySfx(){
  try{
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    master.connect(ctx.destination);
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i+=1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(980, now);
    band.frequency.exponentialRampToValueAtTime(240, now + 0.55);
    band.Q.value = 0.8;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'highpass';
    hiss.frequency.value = 1200;
    noise.connect(band);
    band.connect(hiss);
    hiss.connect(master);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.32);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(oscGain);
    oscGain.connect(master);
    noise.start(now);
    noise.stop(now + 0.62);
    osc.start(now);
    osc.stop(now + 0.38);
    setTimeout(()=>{ try{ ctx.close(); }catch(_){ } }, 900);
  }catch(_){ }
}

function playAbilityCue(effect,card){
  emitVisualEvent('visual:ability-cue', {
    effect: effect || 'ability',
    id: card && card.id ? card.id : null,
    name: card && card.name ? card.name : null,
    type: card && card.type ? card.type : null,
    side: card ? getCardSide(card) : null,
    deck: card && card.deck ? card.deck : null,
    tribe: card && card.tribe ? card.tribe : null,
    combatStyle: card && card.combatStyle ? card.combatStyle : null,
    source: 'playAbilityCue'
  });
}

function setSrcFallback(el,urls,onFail){
  const tried = urls.slice();
  const tryNext = ()=>{
    if(!urls.length){
      tried.forEach(u=>{ IMG_CACHE[u] = { failed:true }; });
      try{ if(typeof onFail==='function') onFail(); }catch(_){ }
      return;
    }
    const u = urls.shift();
    if(IMG_CACHE[u] && IMG_CACHE[u].failed) return tryNext();
    el.onerror = ()=>{
      try{ IMG_CACHE[u] = { failed:true }; }catch(_){ }
      tryNext();
    };
    el.onload = ()=>{
      try{
        IMG_CACHE[u] = el.cloneNode();
        IMG_CACHE[u].complete = true;
      }catch(_){ }
    };
    el.src = u;
  };
  tryNext();
}

function pickEnemyName(deck,boss=false){
  const pools = (window.ENEMY_NAMES || {});
  const list = pools[deck] || [];
  const filtered = list.filter(entry=>boss ? entry.boss : !entry.boss);
  const choice = filtered.length ? rand(filtered) : (list.length ? rand(list) : null);
  return choice && choice.name ? choice.name : 'Inimigo';
}

const KW={P:'Protetor',F:'Furioso',A:'Absorver',M:'Mutável'},
      KW_TIPS={Protetor:'Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mirá-los.',Furioso:'Pode atacar no turno em que é jogada.',Absorver:'Ao entrar, copia uma palavra-chave de um aliado.',Mutável:'No fim do turno, troca ATK e HP.'},
      BC={D1:'draw1',H2:'heal2',P1:'ping1',BR1:'buffRandom1',BA1:'buffAlliesAtk1',M1:'mana1',M2:'mana2',SM:'sacMana'},
      BC_NAMES={draw1:'Percepcao',heal2:'Cura',ping1:'Golpe',buffRandom1:'Bencao',buffAlliesAtk1:'Comando',mana1:'Canalizar',mana2:'Fluxo',sacMana:'Sacrificio',buffTargetAtk1DrawIfAttack:'Ritmo',sacDraw2BuffAtkAll1:'Banquete',duelBuffOnKill:'Duelo',stunEnemy1:'Rede',draw1DiscountSpell:'Nevoa',hitDamaged2:'Arpao',freeze2Draw1:'Tempestade',lockStrongestEnemy:'Kraken',draw1IfWideGainMana1:'Orvalho',buffAll1_1DrawIf4:'Cancao',rootEnemyDrawIfProtector:'Enredar',gainFuriousIfDamagedEnemy:'Emboscada',scoutDrawUnit:'Cacada',buffHuntersVsDamaged:'Bando',duelBuffIfSurvive:'Mordida',aoeVsDamaged2:'Fenrir',discoverNeutral:'Mercador',draw1Or2IfLowHand:'Remendo',triggerTotemNow:'Eco',buffHp3DrawIfTotem:'Pedraviva',buffAllIfTotem:'Arauto',buffAlliesAtk2Temp:'Massacre'},
      BC_TIPS={draw1:'Compra 1 carta ao entrar',heal2:'Cura 2 de um aliado ao entrar',ping1:'Causa 1 de dano aleatório ao entrar',buffRandom1:'Concede +1/+1 a um aliado aleatório ao entrar',buffAlliesAtk1:'Aliados ganham +1 ATK',mana1:'Ganha 1 de mana ao entrar',mana2:'Ganha 2 de mana ao entrar',sacMana:'Sacrifica um aliado e ganha mana igual ao custo',buffTargetAtk1DrawIfAttack:'Outro aliado recebe +1 ATK e compra ao atacar',sacDraw2BuffAtkAll1:'Sacrifique um aliado, compre 2 e fortaleça o time',duelBuffOnKill:'Aliado luta e ganha ATK se vencer',stunEnemy1:'Impede um inimigo de atacar no próximo turno',draw1DiscountSpell:'Compre 1 e reduza o custo de uma spell da mão',hitDamaged2:'Causa 2 a um inimigo ferido',freeze2Draw1:'Trava até 2 inimigos e compra 1',lockStrongestEnemy:'Trava o inimigo mais forte',draw1IfWideGainMana1:'Compra 1 e pode ganhar 1 mana',buffAll1_1DrawIf4:'Concede +1/+1 ao time, compra 1 se mesa larga',rootEnemyDrawIfProtector:'Trava inimigo e compra se houver Protetor',gainFuriousIfDamagedEnemy:'Recebe Furioso se houver inimigo ferido',scoutDrawUnit:'Revela o topo e compra se for unidade',buffHuntersVsDamaged:'Suas feras ficam mais letais neste turno',duelBuffIfSurvive:'Aliado duela e fortalece se sobreviver',aoeVsDamaged2:'Causa 2 a todos os inimigos feridos',discoverNeutral:'Adiciona uma carta especial aleatória à mão',draw1Or2IfLowHand:'Compra 1, ou 2 se a mão estiver baixa',triggerTotemNow:'Ativa um totem imediatamente',buffHp3DrawIfTotem:'Concede +3 HP e compra se houver totem',buffAllIfTotem:'Se houver totem, equipe recebe +1/+1',buffAlliesAtk2Temp:'Aliados ganham +2 ATK neste turno'};
const normalizeCardName=f=>f.replace(/\.[^.]+$/,'').replace(/^nb[_-]?/i,'').replace(/^\d+[_-]?/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
function deriveClassSub(name){
  const n=name.toLowerCase();
  if(n.includes('berserker')) return {classe:'tank', subclasse:'Berserker'};
  if(n.includes('guardião do véu')||n.includes('véu')) return {classe:'control', subclasse:'Guardião do Véu'};
  if(n.includes('guardião')) return {classe:'tank', subclasse:'Guardião'};
  if(n.includes('uivante')) return {classe:'tank', subclasse:'Uivante'};
  if(n.includes('caçador')) return {classe:'dps', subclasse:'Caçador'};
  if(n.includes('runomante')) return {classe:'dps', subclasse:'Runomante'};
  if(n.includes('serpente')) return {classe:'dps', subclasse:'Serpente'};
  if(n.includes('curandeir')) return {classe:'support', subclasse:'Curandeiro'};
  if(n.includes('totêmico')||n.includes('totemico')) return {classe:'support', subclasse:'Totêmico'};
  if(n.includes('sacerdote')||n.includes('tecelão')) return {classe:'support', subclasse:'Tecelão'};
  if(n.includes('xamã')) return {classe:'control', subclasse:'Xamã'};
  if(n.includes('corvo')) return {classe:'control', subclasse:'Corvo'};
  if(n.includes('guerreiro')) return {classe:'dps', subclasse:'Guerreiro'};
  if(n.includes('raider')) return {classe:'dps', subclasse:'Raider'};
  if(n.includes('batalhador')) return {classe:'dps', subclasse:'Batalhador'};
  if(n.includes('mago')||n.includes('mistico')) return {classe:'support', subclasse:'Mago'};
  if(n.includes('sombras')||n.includes('encapuzado')) return {classe:'control', subclasse:'Sombras'};
  if(n.includes('navegador')) return {classe:'support', subclasse:'Navegador'};
  return {classe:'', subclasse:''};
}
const makeCard=a=>{
  const [n,e,t,atk,hp,cost,tx,k=0,b=0,i,extraMaybe]=a;
  let icon='';
  let extra=null;
  if(typeof i==='string' || typeof i==='undefined'){
    icon=i||'';
    if(extraMaybe && typeof extraMaybe==='object'){ extra=extraMaybe; }
  }else if(i && typeof i==='object'){
    extra=i;
  }
  let name=n;
  if(!name && typeof icon==='string' && icon){ name=normalizeCardName(icon); }
  const cls=deriveClassSub(name||'');
  const card={
    name,
    emoji:e,
    tribe:t,
    atk,
    hp,
    cost,
    text:tx,
    kw:k?k.split('|').map(x=>KW[x]).filter(Boolean):[],
    battlecry:b?BC[b]:void 0,
    icon:typeof icon==='string'?icon:'',
    classe:cls.classe,
    subclasse:cls.subclasse,
    id:uid()
  };
  if(extra && typeof extra==='object'){
    Object.assign(card, extra);
  }
  if(!card.combatStyle){
    if(card.type==='spell'){
      const txt = normalizeText(`${card.name||''} ${card.text||''}`);
      if(FIRE_HINTS.some(h=>txt.includes(h))) card.combatStyle = 'flame';
      else if(STORM_HINTS.some(h=>txt.includes(h))) card.combatStyle = 'storm';
      else if(FROST_HINTS.some(h=>txt.includes(h)) || WATER_HINTS.some(h=>txt.includes(h))) card.combatStyle = 'tidal';
      else if(NATURE_HINTS.some(h=>txt.includes(h))) card.combatStyle = 'feral';
      else card.combatStyle = 'mystic';
    }else{
      card.combatStyle = detectAttackFx(card);
    }
  }
  if(!card.type){
    if(cardLooksTotemic(card.name)) card.type='totem';
    else if(typeof atk==='number') card.type='unit';
    else card.type='spell';
  }
  applyClassDefaults(card,t);
  return card;
};
const DECK_IMAGES={
  vikings:['1_Guerreiro_Loiro','2_Guerreiro_Esqueleto','3_Guerreiro_Rubro','4_Mago_Elder','5_Raider_Mascara','6_Guerreiro_Machado','7_Sombras_Encapuzado','8_Guerreiro_Espada','9_Raider_Mascara_Sombra','10_Mago_Elder_Sombra'],
  pescadores:['1_Fogueira_Viking','2_Mistico_Encapuzado','3_Drakkar','4_Guerreiro_do_Escudo','5_Estandarte_do_Cla','6_Guerreiro_das_Runas','7_Guardiao_do_Machado','8_Batalhador_Duplo','9_Navegador','10_Batalhador'],
  floresta:['Alce_Espiritual','Bode_Sagrado','Coruja_Guardiao','Coruja_Runica','Corvo_de_Odin','Esquilo_Ratatoskr','Fogueira_Sagrada','Lobo_Fenrir','Serpente_Jormungandr'],
  animais:['alce-bravo','coelho-escudeiro','coruja-ancia','coruja-sabia','esquilo-viking','guerreiro-cervo','morcego-noturno','raposa-espadachim','urso-guardiao']
};
const SPECIAL_IMAGES=['1_Fogueira_Viking','5_Estandarte_do_Cla','2_Mistico_Encapuzado','7_Guardiao_do_Machado'];
function cardLooksTotemic(name){return /totem/i.test((name||'').toLowerCase());}
function applyClassDefaults(card, tribeHint){
  if(card.classe && card.subclasse) return;
  if(card.type==='spell'){
    card.classe = card.classe || 'support';
    card.subclasse = card.subclasse || 'Ritual';
    return;
  }
  if(card.type==='totem' || cardLooksTotemic(card.name)){
    card.classe = 'support';
    card.subclasse = 'Totêmico';
    return;
  }
  const tribe=(tribeHint||card.tribe||'').toLowerCase();
  if(tribe.includes('viking')){card.classe='dps';card.subclasse='Combatente';return;}
  if(tribe.includes('animal')){card.classe='dps';card.subclasse='Fera';return;}
  if(tribe.includes('convergente')){card.classe='control';card.subclasse='Convergente';return;}
  card.classe=card.classe||'support';
  card.subclasse=card.subclasse||'Campeão';
}
function estimateCardCost(card){
  if(!card) return 1;
  if(card.type==='totem' || cardLooksTotemic(card.name)){
    const buffs = card.buffs || {};
    const totalBuff = (Number(buffs.atk)||0) + (Number(buffs.hp)||0);
    const targetSpread = Math.max(1, Number(card.maxTargets || 1));
    const totemValue = (totalBuff * 1.25) + (Math.min(3, targetSpread) - 1) * 0.45;
    return Math.max(2, Math.min(4, Math.round(totemValue + 1)));
  }
  if(card.type==='spell'){
    const spellWeights = { draw1:1, heal2:1, ping1:1, buffRandom1:2, buffAlliesAtk1:3, mana1:2, mana2:3, sacMana:3, buffTargetAtk1DrawIfAttack:2, sacDraw2BuffAtkAll1:4, duelBuffOnKill:3, stunEnemy1:1, draw1DiscountSpell:2, hitDamaged2:2, freeze2Draw1:4, lockStrongestEnemy:5, draw1IfWideGainMana1:2, buffAll1_1DrawIf4:4, rootEnemyDrawIfProtector:2, gainFuriousIfDamagedEnemy:2, scoutDrawUnit:2, buffHuntersVsDamaged:3, duelBuffIfSurvive:2, aoeVsDamaged2:5, discoverNeutral:3, draw1Or2IfLowHand:2, triggerTotemNow:2, buffHp3DrawIfTotem:2, buffAllIfTotem:3, buffAlliesAtk2Temp:4 };
    const spellCost = spellWeights[card.battlecry] || 2;
    return Math.max(1, Math.min(6, spellCost));
  }
  let value = (Number(card.atk)||0) * 0.62 + (Number(card.hp)||0) * 0.44;
  if(Array.isArray(card.kw)){
    if(card.kw.includes('Furioso')) value += 0.6;
    if(card.kw.includes('Protetor')) value += 0.85;
    if(card.kw.includes('Absorver')) value += 0.8;
    if(card.kw.includes('Mutável')) value += 0.35;
  }
  const battlecryWeights = { draw1:0.8, heal2:0.75, ping1:0.55, buffRandom1:0.9, buffAlliesAtk1:1.2, mana1:1.2, mana2:2, sacMana:1.4, buffTargetAtk1DrawIfAttack:1.3, sacDraw2BuffAtkAll1:2, duelBuffOnKill:1.4, stunEnemy1:0.8, draw1DiscountSpell:1, hitDamaged2:1, freeze2Draw1:1.7, lockStrongestEnemy:1.8, draw1IfWideGainMana1:1.1, buffAll1_1DrawIf4:1.8, rootEnemyDrawIfProtector:1.2, gainFuriousIfDamagedEnemy:0.7, scoutDrawUnit:0.8, buffHuntersVsDamaged:1.8, duelBuffIfSurvive:1.2, aoeVsDamaged2:2.1, discoverNeutral:1.3, draw1Or2IfLowHand:1.1, triggerTotemNow:1.1, buffHp3DrawIfTotem:1.2, buffAllIfTotem:1.5, buffAlliesAtk2Temp:1.8 };
  value += battlecryWeights[card.battlecry] || 0;
  if((Number(card.atk)||0) <= 1 && (Number(card.hp)||0) <= 2 && card.battlecry==='draw1') value -= 0.35;
  return Math.max(1, Math.min(7, Math.round(value)));
}
function unitTemplate(name,emoji,tribe,atk,hp,cost,text,kw='',icon='',extra={}){return [name,emoji,tribe,atk,hp,cost,text,kw,'',icon,extra];}
function spellTemplate(name,emoji,tribe,cost,text,battlecry,icon='',extra={}){return [name,emoji,tribe,0,0,cost,text,'','',icon,Object.assign({type:'spell',battlecry},extra)];}
function totemTemplate(name,emoji,cost,text,buffs,icon='',extra={}){return [name,emoji,'Totem',0,0,cost,text,'','',icon,Object.assign({type:'totem',buffs},extra)];}
const TEMPLATES={
vikings:[
  unitTemplate('Raider do Primeiro Sangue','🪓','Viking',3,2,2,'Ao causar dano, ganha +1 ATK permanente.','','5_Raider_Mascara',{onDealDamagePermanentAtk:1,classe:'dps',subclasse:'Raider'}),
  unitTemplate('Tamboreiro de Guerra','🥁','Viking',2,3,2,'Entra: outro aliado ganha +1 ATK e compra 1 ao atacar neste turno.','','5_Estandarte_do_Cla',{battlecry:'buffTargetAtk1DrawIfAttack',classe:'support',subclasse:'Tamboreiro'}),
  unitTemplate('Escudeiro Juramentado','🛡️','Viking',2,5,3,'Quando morrer, você ganha +1 mana no próximo turno.','P','4_Guerreiro_do_Escudo',{deathNextTurnMana:1,classe:'tank',subclasse:'Escudeiro'}),
  unitTemplate('Berserker do Clã','🪓','Viking',4,2,3,'Furioso. Quando sobreviver a um combate, ganha +1/+1 até o fim do turno.','F','1_Guerreiro_Loiro',{onCombatSurviveTempBuff:{atk:1,hp:1},classe:'dps',subclasse:'Berserker'}),
  unitTemplate('Saqueador das Cinzas','🔥','Viking',5,2,4,'Furioso. Ao eliminar uma unidade, causa 1 ao herói inimigo.','F','6_Guerreiro_Machado',{onKillFaceDamage:1,classe:'dps',subclasse:'Saqueador'}),
  spellTemplate('Banquete de Odin','🍖','Ritual Viking',4,'Sacrifique um aliado. Compre 2 e suas unidades ganham +1 ATK neste turno.','sacDraw2BuffAtkAll1','5_Estandarte_do_Cla'),
  spellTemplate('Machado do Jarl','🪓','Ritual Viking',4,'Uma unidade aliada luta imediatamente contra uma inimiga. Se vencer, ganha +2 ATK.','duelBuffOnKill','6_Guerreiro_Machado'),
  unitTemplate('Chamado do Massacre','📯','Viking',5,5,6,'Entra: suas outras unidades ganham +2 ATK neste turno.','','3_Guerreiro_Rubro',{battlecry:'buffAlliesAtk2Temp',classe:'dps',subclasse:'Jarl'}),
  unitTemplate('Herdeira do Machado','🪓','Viking',3,4,4,'Entra: se voce tiver outro Viking, ganha +1/+1 permanente.','','8_Guerreiro_Espada',{battlecry:'buffRandom1',classe:'dps',subclasse:'Herdeira'})
],
animais:[
  unitTemplate('Rastreador da Alcateia','🐺','Animal',2,1,1,'Ao atacar unidade ferida, ganha +1 ATK neste combate.','','raposa-espadachim',{onAttackDamagedGainAtk:1,classe:'dps',subclasse:'Rastreador'}),
  unitTemplate('Raposa de Emboscada','🦊','Animal',3,2,2,'Entra: se houver inimigo ferido, ganha Furioso neste turno.','','raposa-espadachim',{battlecry:'gainFuriousIfDamagedEnemy',classe:'dps',subclasse:'Emboscadora'}),
  unitTemplate('Coruja Caçadora','🦉','Animal',2,2,2,'Entra: revele o topo. Se for unidade, compre.','','coruja-ancia',{battlecry:'scoutDrawUnit',classe:'control',subclasse:'Coruja'}),
  unitTemplate('Urso Territorial','🐻','Animal',3,5,3,'Protetor. Quando outra fera sua morrer, ganha +2 ATK neste turno.','P','urso-guardiao',{onAllyDeathTempAtk:2,classe:'tank',subclasse:'Urso'}),
  unitTemplate('Lince do Abate','🐾','Animal',4,2,4,'Ao eliminar uma unidade, causa 1 ao herói inimigo.','','morcego-noturno',{onKillFaceDamage:1,classe:'dps',subclasse:'Lince'}),
  spellTemplate('Bando Faminto','🩸','Ritual Animal',3,'Suas feras ganham +2 ATK neste turno contra inimigos feridos.','buffHuntersVsDamaged','morcego-noturno'),
  spellTemplate('Mordida Coordenada','🦷','Ritual Animal',2,'Uma unidade aliada e uma inimiga causam dano entre si. Se sobreviver, seu aliado ganha +1 ATK.','duelBuffIfSurvive','guerreiro-cervo'),
  unitTemplate('Fenrir Desperto','🐺','Animal',7,5,7,'Furioso. Entra: causa 2 a todos os inimigos feridos.','F','Lobo_Fenrir',{battlecry:'aoeVsDamaged2',classe:'dps',subclasse:'Fenrir'}),
  unitTemplate('Corvo das Presas','🪶','Animal',2,3,2,'Entra: se houver inimigo ferido, compre 1.','','coruja-sabia',{battlecry:'draw1',classe:'support',subclasse:'Corvo'})
],
pescadores:[
  unitTemplate('Lançador de Rede','🎣','Viking do Fiorde',2,4,2,'Entra: uma unidade inimiga perde o próximo ataque.','','9_Navegador',{battlecry:'stunEnemy1',classe:'control',subclasse:'Marujo'}),
  unitTemplate('Navegador da Névoa','🌫️','Viking do Fiorde',1,3,2,'Entra: compre 1. Reduza em 1 o custo de uma spell da sua mão.','','9_Navegador',{battlecry:'draw1DiscountSpell',classe:'support',subclasse:'Navegador'}),
  unitTemplate('Guardião do Fiorde','🛡️','Viking do Fiorde',2,5,3,'Protetor. Quando receber cura, ganha +1 ATK.','P','7_Guardiao_do_Machado',{onHealedGainAtk:1,classe:'tank',subclasse:'Guardião'}),
  unitTemplate('Pescador de Maré Alta','🌊','Viking do Fiorde',3,3,3,'Fim do turno: se você comprou carta, ganha +0/+1 e cura 1.','','3_Drakkar',{endTurnIfDrawn:{hp:1,heal:1},classe:'support',subclasse:'Pescador'}),
  unitTemplate('Arpoador do Kraken','🦑','Viking do Fiorde',4,3,4,'Entra: cause 2 a uma unidade já danificada.','','8_Batalhador_Duplo',{battlecry:'hitDamaged2',classe:'dps',subclasse:'Arpoador'}),
  spellTemplate('Águas Rasas','💧','Ritual do Fiorde',1,'Uma unidade inimiga não pode atacar no próximo turno.','stunEnemy1','3_Drakkar'),
  spellTemplate('Chamado da Tempestade Fria','⛈️','Ritual do Fiorde',4,'Congele até 2 inimigos. Compre 1.','freeze2Draw1','6_Guerreiro_das_Runas'),
  unitTemplate('Kraken do Fiorde','🦑','Viking do Fiorde',6,7,7,'Entra: a unidade inimiga mais forte não pode atacar no próximo turno.','','3_Drakkar',{battlecry:'lockStrongestEnemy',classe:'control',subclasse:'Kraken'}),
  unitTemplate('Batedor da Costa','🪝','Viking do Fiorde',2,2,1,'Entra: compre 1 se voce conjurou spell no turno passado.','','8_Batalhador_Duplo',{battlecry:'draw1',classe:'support',subclasse:'Batedor'})
],
floresta:[
  unitTemplate('Broto Guardião','🌱','Animal da Floresta',1,3,1,'A primeira vez por turno que receber buff, compre 1.','','Fogueira_Sagrada',{drawOnFirstBuffEachTurn:true,classe:'support',subclasse:'Broto'}),
  unitTemplate('Coruja do Orvalho','🦉','Animal da Floresta',1,3,2,'Entra: compre 1. Se controlar 3 aliados, ganhe +1 mana.','','Coruja_Guardiao',{battlecry:'draw1IfWideGainMana1',classe:'support',subclasse:'Coruja'}),
  unitTemplate('Raiz Protetora','🌳','Animal da Floresta',0,5,2,'Protetor. Seus buffs concedem +1 HP extra.','P','Bode_Sagrado',{buffAuraHpBonus:1,classe:'tank',subclasse:'Raiz'}),
  unitTemplate('Guardiã das Sementes','🌿','Animal da Floresta',2,4,3,'Fim do turno: conceda +1/+1 a um aliado aleatório.','','Esquilo_Ratatoskr',{endTurnRandomBuff:{atk:1,hp:1},classe:'support',subclasse:'Guardiã'}),
  unitTemplate('Lobo do Bosque Antigo','🐺','Animal da Floresta',3,3,3,'Furioso. Quando um aliado receber buff, ganha +1 ATK neste turno.','F','Lobo_Fenrir',{onBuffTempAtk:1,classe:'dps',subclasse:'Lobo'}),
  spellTemplate('Canção da Floresta','🎶','Ritual da Floresta',3,'Conceda +1/+1 a todos os aliados. Compre 1 se controlar 4 ou mais.','buffAll1_1DrawIf4','Corvo_de_Odin'),
  spellTemplate('Enredar','🌾','Ritual da Floresta',2,'Uma unidade inimiga não pode atacar no próximo turno. Compre 1 se você tiver Protetor.','rootEnemyDrawIfProtector','Serpente_Jormungandr'),
  unitTemplate('Avatar do Carvalho','🌲','Animal da Floresta',4,7,6,'Protetor. Seus buffs agora afetam um aliado adicional.','P','Alce_Espiritual',{doubleBuffAura:true,classe:'tank',subclasse:'Avatar'}),
  unitTemplate('Lamina do Musgo','🍃','Animal da Floresta',2,2,2,'Ao receber buff, ganha +1 ATK neste turno.','','Coruja_Runica',{onBuffTempAtk:1,classe:'dps',subclasse:'Lamina'})
],
};

const CARD_TEMPLATE_INDEX=(()=>{
  const map=new Map();
  Object.entries(TEMPLATES).forEach(([deckKey,entries])=>{
    entries.forEach(entry=>{
      try{
        const card=makeCard(entry);
        const key=(card.name||'').trim().toLowerCase();
        if(!key) return;
        const snapshot={
          name:card.name,
          deck:deckKey,
          atk:card.atk,
          hp:card.hp,
          cost:card.cost,
          icon:card.icon,
          emoji:card.emoji,
          img:card.img,
          type:card.type,
          tribe:card.tribe,
          text:card.text||'',
          kw:Array.isArray(card.kw)?card.kw.slice():[],
          battlecry:card.battlecry||'',
          classe:card.classe,
          subclasse:card.subclasse
        };
        map.set(key,snapshot);
      }catch(_){ }
    });
  });
  return map;
})();

function lookupCardTemplate(name){
  if(!name) return null;
  return CARD_TEMPLATE_INDEX.get(name.trim().toLowerCase())||null;
}
function getAllCardTemplates(){
  return Array.from(CARD_TEMPLATE_INDEX.values()).map(card=>Object.assign({},card));
}

function hydrateCardArt(card){
  if(!card||!card.name) return card;
  const template=lookupCardTemplate(card.name);
  if(!template) return card;
  const enriched=Object.assign({},card);
  ['deck','icon','emoji','img','type','tribe','classe','subclasse'].forEach(field=>{
    if(enriched[field]==null && template[field]!=null) enriched[field]=template[field];
  });
  if(!enriched.kw && template.kw) enriched.kw=template.kw.slice();
  if(!enriched.battlecry && template.battlecry) enriched.battlecry=template.battlecry;
  if(enriched.baseAtk===undefined && template.atk!==undefined) enriched.baseAtk=template.atk;
  if(enriched.baseHp===undefined && template.hp!==undefined) enriched.baseHp=template.hp;
  if(enriched.atk===undefined && template.atk!==undefined) enriched.atk=template.atk;
  if(enriched.hp===undefined && template.hp!==undefined) enriched.hp=template.hp;
  if(enriched.cost===undefined && template.cost!==undefined) enriched.cost=template.cost;
  // Ensure we keep a valid icon to avoid missing art lookups
  if(!enriched.icon && enriched.deck && DECK_IMAGES[enriched.deck] && DECK_IMAGES[enriched.deck].length){
    enriched.icon = DECK_IMAGES[enriched.deck][0];
  }
  return enriched;
}

window.lookupCardTemplate=lookupCardTemplate;
window.getAllCardTemplates=getAllCardTemplates;
window.hydrateCardArt=hydrateCardArt;
window.balanceCardCost=estimateCardCost;

// ===== RELICS SYSTEM =====
const RELICS = {
  // Tier 1 - Comuns
  'bencao-freyja': {
    id: 'bencao-freyja',
    name: 'Bênção de Freyja',
    icon: '🍃',
    rarity: 'common',
    desc: 'Cura 3 HP no início de cada combate.',
    effect: 'healStart',
    value: 3
  },
  'amuleto-trovao': {
    id: 'amuleto-trovao',
    name: 'Amuleto do Trovão',
    icon: '⚡',
    rarity: 'common',
    desc: 'A primeira carta jogada em cada turno custa 1 de mana a menos.',
    effect: 'firstCardDiscount',
    value: 1
  },
  'coracao-urso': {
    id: 'coracao-urso',
    name: 'Coração do Urso',
    icon: '🐻',
    rarity: 'common',
    desc: 'Inicie cada combate com +5 HP temporário.',
    effect: 'tempHP',
    value: 5
  },
  'runa-pescador': {
    id: 'runa-pescador',
    name: 'Runa do Pescador',
    icon: '🎣',
    rarity: 'common',
    desc: 'Compre +1 carta no início de cada turno.',
    effect: 'extraDraw',
    value: 1
  },
  'dente-lobo': {
    id: 'dente-lobo',
    name: 'Dente de Lobo',
    icon: '🦷',
    rarity: 'common',
    desc: 'Suas unidades com Furioso ganham +1 ATK.',
    effect: 'buffFurious',
    value: 1
  },
  
  // Tier 2 - Raras
  'machado-ancestral': {
    id: 'machado-ancestral',
    name: 'Machado Ancestral',
    icon: '🪓',
    rarity: 'rare',
    desc: 'Ganhe +2 de ouro por vitória.',
    effect: 'extraGold',
    value: 2
  },
  'escudo-runico': {
    id: 'escudo-runico',
    name: 'Escudo Rúnico',
    icon: '🛡️',
    rarity: 'rare',
    desc: 'A primeira unidade que você jogar ganha Protetor.',
    effect: 'firstUnitProtector',
    value: true
  },
  'chifre-alce': {
    id: 'chifre-alce',
    name: 'Chifre do Alce',
    icon: '🦌',
    rarity: 'rare',
    desc: 'Suas unidades com Protetor ganham +0/+2.',
    effect: 'buffProtector',
    value: 2
  },
  'orbe-aurora': {
    id: 'orbe-aurora',
    name: 'Orbe da Aurora',
    icon: '🔮',
    rarity: 'rare',
    desc: 'Ao jogar uma spell, compre 1 carta.',
    effect: 'spellDraw',
    value: 1
  },
  'pena-corvo': {
    id: 'pena-corvo',
    name: 'Pena do Corvo Sábio',
    icon: '🪶',
    rarity: 'rare',
    desc: 'Comece cada combate com +1 de mana.',
    effect: 'startMana',
    value: 1
  },
  
  // Tier 3 - Épicas
  'coroa-jarl': {
    id: 'coroa-jarl',
    name: 'Coroa do Jarl',
    icon: '👑',
    rarity: 'epic',
    desc: 'Todas as suas unidades ganham +1/+1.',
    effect: 'allBuff',
    value: {atk: 1, hp: 1}
  },
  'garra-kraken': {
    id: 'garra-kraken',
    name: 'Garra do Kraken',
    icon: '🦑',
    rarity: 'epic',
    desc: 'Ao destruir uma unidade inimiga, ganhe 2 de mana.',
    effect: 'killMana',
    value: 2
  },
  'totem-primordial': {
    id: 'totem-primordial',
    name: 'Totem Primordial',
    icon: '🗿',
    rarity: 'epic',
    desc: 'Seus totens custam 1 de mana a menos e concedem +1/+1 adicional.',
    effect: 'totemBoost',
    value: 1
  },
  'anel-convergencia': {
    id: 'anel-convergencia',
    name: 'Anel da Convergência',
    icon: '💍',
    rarity: 'epic',
    desc: 'Cartas de todas as facções custam 1 a menos.',
    effect: 'allCardsDiscount',
    value: 1
  },
  
  // Tier 4 - Lendárias (Amaldiçoadas - risco/recompensa)
  'caveira-draugr': {
    id: 'caveira-draugr',
    name: 'Caveira do Draugr',
    icon: '💀',
    rarity: 'legendary',
    desc: 'Suas unidades ganham +2 ATK, mas você perde 1 HP no início de cada turno.',
    effect: 'cursedPower',
    value: {buff: 2, cost: 1}
  },
  'olho-odin': {
    id: 'olho-odin',
    name: 'Olho de Odin',
    icon: '👁️',
    rarity: 'legendary',
    desc: 'Veja as 3 próximas cartas do seu deck. Comece cada combate com -5 HP máximo.',
    effect: 'vision',
    value: {cards: 3, hpCost: 5}
  },
  'estrela-polar': {
    id: 'estrela-polar',
    name: 'Estrela Polar',
    icon: '⭐',
    rarity: 'legendary',
    desc: 'No início do combate, invoca uma unidade 2/2 aleatória do seu deck.',
    effect: 'startSummon',
    value: {atk: 2, hp: 2}
  }
};

// ===== RANDOM EVENTS SYSTEM =====
const STORY_EVENTS = [
  {
    id: 'shaman-ritual',
    name: 'Ritual do Xamã',
    icon: '🔥',
    desc: 'Um xamã oferece um ritual ancestral.',
    choices: [
      {
        text: 'Participar do ritual',
        effect: 'upgrade2Cards',
        result: 'O xamã abençoa 2 de suas cartas. Elas evoluem (+1/+1)!',
        cost: {hp: 5}
      },
      {
        text: 'Recusar educadamente',
        effect: 'gainGold',
        result: 'O xamã respeita sua decisão e oferece 15 moedas de ouro.',
        reward: {gold: 15}
      }
    ]
  },
  {
    id: 'ancient-library',
    name: 'Biblioteca Ancestral',
    icon: '📚',
    desc: 'Você encontra uma biblioteca esquecida nas montanhas.',
    choices: [
      {
        text: 'Estudar os tomos antigos',
        effect: 'upgradeCard',
        result: 'Você aprende técnicas antigas. Evolua 1 carta (+2/+2)!',
        reward: {upgradeCard: 2}
      },
      {
        text: 'Procurar por tesouros',
        effect: 'gainGold',
        result: 'Entre as prateleiras, você encontra um baú com 25 moedas!',
        reward: {gold: 25}
      },
      {
        text: 'Queimar a biblioteca',
        effect: 'removeCard',
        result: 'As chamas purificam sua alma. Remova 1 carta do deck.',
        reward: {removeCard: 1}
      }
    ]
  },
  {
    id: 'merchant-caravan',
    name: 'Caravana de Mercadores',
    icon: '🛒',
    desc: 'Uma caravana de mercadores cruza seu caminho.',
    choices: [
      {
        text: 'Negociar (30 ouro)',
        effect: 'buyRelic',
        result: 'Você adquire uma relíquia misteriosa!',
        cost: {gold: 30},
        reward: {relic: 'random'}
      },
      {
        text: 'Oferecer ajuda',
        effect: 'helpMerchants',
        result: 'Gratidão! Eles lhe dão uma carta rara.',
        reward: {card: 'rare'}
      },
      {
        text: 'Seguir em frente',
        effect: 'nothing',
        result: 'Você continua sua jornada.',
        reward: {}
      }
    ]
  },
  {
    id: 'frozen-shrine',
    name: 'Santuário Congelado',
    icon: '❄️',
    desc: 'Um santuário antigo brilha sob o gelo.',
    choices: [
      {
        text: 'Orar no santuário',
        effect: 'heal',
        result: 'Uma luz reconfortante cura todas as suas feridas!',
        reward: {healFull: true}
      },
      {
        text: 'Quebrar o gelo',
        effect: 'riskReward',
        result: '50% de chance: Relíquia OU perde 10 HP',
        risk: true
      }
    ]
  },
  {
    id: 'wolf-pack',
    name: 'Matilha de Lobos',
    icon: '🐺',
    desc: 'Uma matilha de lobos cerca você, mas não atacam.',
    choices: [
      {
        text: 'Alimentar os lobos (10 ouro)',
        effect: 'feedWolves',
        result: 'Os lobos se tornam seus aliados! Ganhe uma carta Lobo.',
        cost: {gold: 10},
        reward: {card: 'wolf'}
      },
      {
        text: 'Lutar',
        effect: 'fight',
        result: 'Você afugenta os lobos, mas sai ferido (-8 HP).',
        cost: {hp: 8},
        reward: {gold: 5}
      },
      {
        text: 'Recuar lentamente',
        effect: 'nothing',
        result: 'Você escapa ileso.',
        reward: {}
      }
    ]
  },
  {
    id: 'aurora-spring',
    name: 'Fonte da Aurora',
    icon: '💎',
    desc: 'Uma fonte luminosa emana energia arcana.',
    choices: [
      {
        text: 'Beber da fonte',
        effect: 'randomEffect',
        result: 'Efeito aleatório: Buff, Debuff ou Nada!',
        risk: true
      },
      {
        text: 'Encher cantis (+20 ouro)',
        effect: 'sellWater',
        result: 'Você vende a água mágica na próxima vila.',
        reward: {gold: 20}
      }
    ]
  },
  {
    id: 'village-blacksmith',
    name: 'Ferreiro da Vila',
    icon: '⚒️',
    desc: 'Um ferreiro oferece seus serviços.',
    choices: [
      {
        text: 'Forjar equipamento (25 ouro)',
        effect: 'forge',
        result: 'Suas unidades ganham +1 ATK permanentemente!',
        cost: {gold: 25},
        reward: {buffAll: {atk: 1}}
      },
      {
        text: 'Ajudar na forja',
        effect: 'helpForge',
        result: 'O ferreiro ensina técnicas. Evolua 1 carta (+1/+1).',
        cost: {hp: 3},
        reward: {upgradeCard: 1}
      },
      {
        text: 'Seguir viagem',
        effect: 'nothing',
        result: 'Você agradece e parte.',
        reward: {}
      }
    ]
  },
  {
    id: 'totem-grove',
    name: 'Bosque dos Totens',
    icon: '🌲',
    desc: 'Totens ancestrais erguem-se entre as árvores.',
    choices: [
      {
        text: 'Meditar entre os totens',
        effect: 'gainTotem',
        result: 'Os espíritos lhe concedem um totem sagrado!',
        reward: {totem: true}
      },
      {
        text: 'Derrubar uma árvore',
        effect: 'anger',
        result: 'Os espíritos se irritam! Você perde 10 HP mas ganha 30 ouro.',
        cost: {hp: 10},
        reward: {gold: 30}
      }
    ]
  },
  {
    id: 'lost-traveler',
    name: 'Viajante Perdido',
    icon: '🧳',
    desc: 'Um viajante perdido pede ajuda.',
    choices: [
      {
        text: 'Guiá-lo (custa 1 turno)',
        effect: 'help',
        result: 'Ele revela ser um nobre! Recompensa: 40 ouro.',
        reward: {gold: 40}
      },
      {
        text: 'Dar direções',
        effect: 'directions',
        result: 'Ele agradece e lhe dá um mapa. Escolha sua próxima recompensa.',
        reward: {extraChoice: true}
      },
      {
        text: 'Ignorar',
        effect: 'nothing',
        result: 'Você segue seu caminho.',
        reward: {}
      }
    ]
  },
  {
    id: 'cursed-altar',
    name: 'Altar Amaldiçoado',
    icon: '⚰️',
    desc: 'Um altar sombrio pulsa com energia maligna.',
    choices: [
      {
        text: 'Destruir o altar',
        effect: 'destroy',
        result: 'Você liberta as almas presas! Remova 2 cartas do deck.',
        cost: {hp: 7},
        reward: {removeCard: 2}
      },
      {
        text: 'Fazer uma oferenda',
        effect: 'curse',
        result: 'Você ganha poder sombrio! +2 ATK em todas as unidades, mas perde 10 HP máximo.',
        reward: {buffAll: {atk: 2}, maxHPLoss: 10}
      },
      {
        text: 'Fugir',
        effect: 'nothing',
        result: 'Melhor não arriscar...',
        reward: {}
      }
    ]
  }
];

class StoryMode{
  constructor({level=1,bossInterval=10,eliteEvery=5,eventEvery=4,startGold=30,maxTotems=3,seed}={}){this.level=level;this.round=0;this.act=1;this.totems=[];this.deck=[];this.scaling=0;this.xp=0;this.gold=startGold;this.startGold=startGold;this.seed=(seed||String(Date.now()));this._rngState=this.hashSeed(this.seed);this.bossInterval=bossInterval;this.eliteEvery=eliteEvery;this.eventEvery=eventEvery;this.currentEncounter='normal';this.currentBossModifier=null;this.bossModifiersSeen=[];this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this.relics=[];this.eventsSeen=[];this._startManaGranted=false;this.lastShopEventRound=0;this.maxTotems=maxTotems;this.metrics={wins:0,elites:0,bosses:0,events:0,goldEarned:0,rewardsTaken:[]};}
  hashSeed(seed){let h=2166136261>>>0;const s=String(seed||'fff');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0||1;}
  random(){let t=this._rngState+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
  pick(arr){if(!arr||!arr.length)return null;const idx=Math.floor(this.random()*arr.length);return arr[idx];}
  weightedPick(items){if(!items||!items.length)return null;const total=items.reduce((s,it)=>s+Math.max(0,it.w||0),0);if(total<=0)return this.pick(items);let r=this.random()*total;for(const it of items){r-=Math.max(0,it.w||0);if(r<=0)return it;}return items[items.length-1];}
  nextRound(){this.round+=1;this.act=Math.max(1,Math.floor((this.round-1)/5)+1);const actBase=this.act-1;const roundRamp=Math.floor((this.round-1)/2);this.scaling=actBase*2+roundRamp+(this.level-1);const isBoss=this.round%this.bossInterval===0;const isElite=!isBoss&&this.round%this.eliteEvery===0;const isEvent=!isBoss&&!isElite&&this.eventEvery>0&&this.round>2&&this.round%this.eventEvery===0;this.currentEncounter=isBoss?'boss':isElite?'elite':isEvent?'event':'normal';this.currentBossModifier=isBoss?this.rollBossModifier():null;if(isElite)this.metrics.elites++;if(isBoss)this.metrics.bosses++;if(isEvent)this.metrics.events++;return{isBoss,isElite,isEvent};}
  rollBossModifier(){const all=['fortificado','furia','escassez'];const remaining=all.filter(m=>!this.bossModifiersSeen.includes(m));const chosen=this.pick(remaining.length?remaining:all);if(chosen)this.bossModifiersSeen.push(chosen);return chosen;}
  handleVictory(){const encounterMult=this.currentEncounter==='boss'?2.4:this.currentEncounter==='elite'?1.6:1;const actMult=1+((this.act-1)*0.12);const xpGain=Math.max(5,Math.round(5*encounterMult*actMult));const goldGain=Math.max(5,Math.round(5*encounterMult*actMult));this.metrics.wins+=1;this.metrics.goldEarned+=goldGain;this.xp+=xpGain;this.gold+=goldGain;if(typeof updateGoldHUD==='function')updateGoldHUD();const leveled=this.checkLevelUp();return{leveled,rewards:this.rewardOptions(),goldGain,isBoss:this.currentEncounter==='boss'};}
  rewardOptions(){const isBoss=this.currentEncounter==='boss';const baseRewards=['Nova carta','Evoluir carta','Ganhar Totem'];if(isBoss||this.random()<0.4){baseRewards.push('Buff permanente');}if(isBoss){baseRewards.push('Relíquia');}return baseRewards;}
  checkLevelUp(){const need=this.level*50;if(this.xp>=need){this.level+=1;this.xp-=need;return true}return false}
  addTotem(t){if(this.totems.length>=(this.maxTotems||3))return false;this.totems.push(t);return true}
  addRelic(relic){if(!this.relics.find(r=>r.id===relic.id)){this.relics.push(relic);return true;}return false;}
  hasRelic(id){return this.relics.some(r=>r.id===id);}
  registerBonus(bonus,src){if(!bonus)return'';const notes=[];if(bonus.startMana){this.bonuses.startMana+=bonus.startMana;notes.push('+'+bonus.startMana+' mana inicial');}if(bonus.killMana){this.bonuses.killMana+=bonus.killMana;notes.push('+'+bonus.killMana+' mana por eliminacao');}if(bonus.allyBuff){this.bonuses.allyBuff.atk+=bonus.allyBuff.atk||0;this.bonuses.allyBuff.hp+=bonus.allyBuff.hp||0;if(bonus.allyBuff.atk)notes.push('Aliados +'+bonus.allyBuff.atk+' ATK');if(bonus.allyBuff.hp)notes.push('Aliados +'+bonus.allyBuff.hp+' HP');}if(bonus.totemBonus){this.bonuses.totemBonus.atk+=bonus.totemBonus.atk||0;this.bonuses.totemBonus.hp+=bonus.totemBonus.hp||0;if(bonus.totemBonus.atk||bonus.totemBonus.hp)notes.push('Totens fortalecidos');}if(src&&src.name){this.bonuses.items.push(src.name);}return notes.join(', ');}
  markRewardTaken(name){if(!name)return;this.metrics.rewardsTaken.push({round:this.round,name});}
  toJSON(){return{level:this.level,round:this.round,act:this.act,totems:this.totems,deck:this.deck,scaling:this.scaling,xp:this.xp,gold:this.gold,startGold:this.startGold,seed:this.seed,_rngState:this._rngState,bossInterval:this.bossInterval,eliteEvery:this.eliteEvery,eventEvery:this.eventEvery,currentEncounter:this.currentEncounter,currentBossModifier:this.currentBossModifier,bossModifiersSeen:this.bossModifiersSeen,bonuses:this.bonuses,relics:this.relics,eventsSeen:this.eventsSeen,lastShopEventRound:this.lastShopEventRound,maxTotems:this.maxTotems,metrics:this.metrics,map:this.map||null};}
  fromJSON(data){if(!data)return this;Object.assign(this,data);if(!this.seed)this.seed=String(Date.now());if(!this._rngState)this._rngState=this.hashSeed(this.seed);if(!this.metrics)this.metrics={wins:0,elites:0,bosses:0,events:0,goldEarned:0,rewardsTaken:[]};if(!this.map)this.map=null;return this;}
  reset(){this.round=0;this.act=1;this.totems=[];this.deck=[];this.xp=0;this.gold=this.startGold||30;this.currentEncounter='normal';this.currentBossModifier=null;this.bossModifiersSeen=[];this._rngState=this.hashSeed(this.seed);this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this.relics=[];this.eventsSeen=[];this._startManaGranted=false;this.metrics={wins:0,elites:0,bosses:0,events:0,goldEarned:0,rewardsTaken:[]};this.map=null;if(typeof updateGoldHUD==='function')updateGoldHUD();}
}

const ALL_DECKS=Object.keys(TEMPLATES);
const G={playerHP:30,aiHP:30,turn:0,playerMana:0,playerManaCap:0,aiMana:0,aiManaCap:0,current:'player',playerDeck:[],aiDeck:[],playerHand:[],aiHand:[],playerBoard:[],aiBoard:[],playerDiscard:[],aiDiscard:[],chosen:null,lastChosenId:null,playerDeckChoice:'vikings',aiDeckChoice:rand(ALL_DECKS),customDeck:null,mode:'solo',story:null,story2:null,storyVariant:null,enemyScaling:0,maxHandSize:5,totems:[]};
const STORY_SAVE_KEY='fff_story_run_v1';
function saveStoryProgress(){try{if(!(G.mode==='story'&&G.story))return;const payload={variant:G.storyVariant||'story',deckChoice:G.playerDeckChoice,aiDeckChoice:G.aiDeckChoice,playerHP:G.playerHP,state:G.story.toJSON()};localStorage.setItem(STORY_SAVE_KEY,JSON.stringify(payload));}catch(_){ }}
function loadStoryProgress(){try{const raw=localStorage.getItem(STORY_SAVE_KEY);if(!raw)return null;return JSON.parse(raw);}catch(_){return null;}}
function clearStoryProgress(){try{localStorage.removeItem(STORY_SAVE_KEY);}catch(_){ }}
const STORY_NODE_TYPES = {
  combat: 'combat',
  elite: 'elite',
  event: 'event',
  shop: 'shop',
  rest: 'rest',
  treasure: 'treasure',
  boss: 'boss'
};
function mapNodeId(floor,col){return `f${floor}c${col}`;}
function storyPickWeighted(story, entries){
  if(!entries||!entries.length) return null;
  const total = entries.reduce((s,e)=>s+Math.max(0,e.w||0),0);
  if(total<=0) return entries[0];
  let r = (story&&story.random?story.random():Math.random())*total;
  for(const e of entries){
    r -= Math.max(0,e.w||0);
    if(r<=0) return e;
  }
  return entries[entries.length-1];
}
function storyGenerateMap(story, floors=15, cols=7){
  const makeMapOnce = () => {
    const nodes = {};
    const edges = {};
    const incoming = {};
    const active = new Set();
    for(let f=1; f<=floors; f+=1){
      for(let c=0; c<cols; c+=1){
        const id = mapNodeId(f,c);
        nodes[id] = { id, floor:f, col:c, type:null };
        edges[id] = [];
        incoming[id] = [];
      }
    }
    const pathCount = 6;
    const starts = [];
    while(starts.length < pathCount){
      if(starts.length === 0){
        starts.push(Math.floor((story.random?story.random():Math.random())*cols));
        continue;
      }
      if(starts.length === 1){
        let second = Math.floor((story.random?story.random():Math.random())*cols);
        if(second === starts[0]) second = (second + 1) % cols;
        starts.push(second);
        continue;
      }
      starts.push(Math.floor((story.random?story.random():Math.random())*cols));
    }
    const layerEdges = {};
    const addLayerEdge = (floor,a,b) => {
      layerEdges[floor] = layerEdges[floor] || [];
      layerEdges[floor].push({a,b});
    };
    const crosses = (f,a,b) => {
      const list = layerEdges[f] || [];
      return list.some(e => (a < e.a && b > e.b) || (a > e.a && b < e.b));
    };
    for(let p=0; p<pathCount; p+=1){
      let col = starts[p];
      for(let floor=1; floor<=floors; floor+=1){
        const id = mapNodeId(floor,col);
        active.add(id);
        if(floor >= floors) continue;
        let candidates = [col];
        if(col>0) candidates.push(col-1);
        if(col<cols-1) candidates.push(col+1);
        candidates = candidates
          .sort(()=>((story.random?story.random():Math.random())-0.5))
          .filter(nextCol => !crosses(floor,col,nextCol));
        if(!candidates.length) candidates = [col];
        const nextCol = candidates[0];
        const nextId = mapNodeId(floor+1,nextCol);
        edges[id].push(nextId);
        addLayerEdge(floor,col,nextCol);
        col = nextCol;
      }
    }
    Object.keys(edges).forEach(id=>{
      edges[id] = [...new Set(edges[id].filter(nid=>active.has(nid)))];
    });
    Object.keys(incoming).forEach(id=>incoming[id]=[]);
    Object.entries(edges).forEach(([from,arr])=>{
      if(!active.has(from)) return;
      arr.forEach(to=>{
        if(active.has(to)) incoming[to].push(from);
      });
    });
    const restricted = new Set([STORY_NODE_TYPES.elite, STORY_NODE_TYPES.shop, STORY_NODE_TYPES.rest]);
    for(let floor=1; floor<=floors; floor+=1){
      const floorIds = [...active].filter(id=>nodes[id].floor===floor);
      floorIds.forEach(id=>{
        const n = nodes[id];
        if(floor===1){ n.type = STORY_NODE_TYPES.combat; return; }
        if(floor===9){ n.type = STORY_NODE_TYPES.treasure; return; }
        if(floor===floors){ n.type = STORY_NODE_TYPES.rest; return; }
        let choices = [
          { t: STORY_NODE_TYPES.combat, w: 45 },
          { t: STORY_NODE_TYPES.elite, w: 16 },
          { t: STORY_NODE_TYPES.event, w: 22 },
          { t: STORY_NODE_TYPES.shop, w: 5 },
          { t: STORY_NODE_TYPES.rest, w: 12 }
        ];
        if(floor<6) choices = choices.filter(x=>x.t!==STORY_NODE_TYPES.elite && x.t!==STORY_NODE_TYPES.rest);
        if(floor===14) choices = choices.filter(x=>x.t!==STORY_NODE_TYPES.rest);
        let selected = null;
        let guard = 0;
        while(!selected && guard < 60){
          guard += 1;
          const picked = storyPickWeighted(story, choices) || { t: STORY_NODE_TYPES.combat };
          const candidate = picked.t;
          const invalidByFloor = (floor<6 && (candidate===STORY_NODE_TYPES.elite || candidate===STORY_NODE_TYPES.rest)) || (floor===14 && candidate===STORY_NODE_TYPES.rest);
          if(invalidByFloor) continue;
          const incomingIds = incoming[id] || [];
          const consecutiveBlocked = incomingIds.some(pid => {
            const pt = nodes[pid] && nodes[pid].type;
            return restricted.has(pt) && restricted.has(candidate);
          });
          if(consecutiveBlocked) continue;
          const siblingConflict = incomingIds.some(pid => {
            const out = (edges[pid]||[]);
            if(out.length < 2) return false;
            const assignedSiblingTypes = out
              .filter(cid=>cid!==id)
              .map(cid=>nodes[cid]&&nodes[cid].type)
              .filter(Boolean);
            return assignedSiblingTypes.includes(candidate);
          });
          if(siblingConflict) continue;
          selected = candidate;
        }
        n.type = selected || STORY_NODE_TYPES.combat;
      });
    }
    const startNodeIds = [...active].filter(id=>nodes[id].floor===1);
    if(startNodeIds.length < 2) return null;
    const bossNodeId = 'boss';
    nodes[bossNodeId] = { id: bossNodeId, floor: floors+1, col: Math.floor(cols/2), type: STORY_NODE_TYPES.boss };
    edges[bossNodeId] = [];
    incoming[bossNodeId] = [];
    const topNodes = [...active].filter(id=>nodes[id].floor===floors);
    topNodes.forEach(id=>{
      edges[id] = edges[id] || [];
      if(!edges[id].includes(bossNodeId)) edges[id].push(bossNodeId);
      incoming[bossNodeId].push(id);
    });
    return {
      floors,
      cols,
      nodes,
      edges,
      incoming,
      activeNodeIds:[...active],
      startNodeIds,
      currentNodeId:null,
      visited:[]
    };
  };
  for(let i=0; i<24; i+=1){
    const m = makeMapOnce();
    if(m) return m;
  }
  return makeMapOnce() || { floors, cols, nodes:{}, edges:{}, incoming:{}, activeNodeIds:[], startNodeIds:[], currentNodeId:null, visited:[] };
}
function storyEnsureMap(story){
  if(!story.map || !story.map.nodes){
    story.map = storyGenerateMap(story);
  }
}
function storyGetCurrentNode(story){
  storyEnsureMap(story);
  if(!story.map || !story.map.currentNodeId) return null;
  return story.map.nodes[story.map.currentNodeId] || null;
}
function storyAdvanceMap(story){
  storyEnsureMap(story);
  const current = story.map.currentNodeId;
  const outs = (story.map.edges[current] || []).filter(Boolean);
  if(!outs.length) return null;
  const unvisited = outs.filter(id=>!story.map.visited.includes(id));
  const pool = unvisited.length ? unvisited : outs;
  const pick = pool[Math.floor((story.random?story.random():Math.random())*pool.length)];
  story.map.currentNodeId = pick;
  story.map.visited.push(pick);
  return story.map.nodes[pick] || null;
}
function storyNodeTitle(type){
  return ({
    combat:'Combate',
    elite:'Elite',
    boss:'Boss',
    event:'Evento ?',
    shop:'Loja',
    rest:'Descanso',
    treasure:'Tesouro'
  })[type] || 'Nó';
}
function storyNodeIcon(type){
  return ({
    combat:'⚔️',
    elite:'💀',
    boss:'👑',
    event:'❓',
    shop:'🛒',
    rest:'🔥',
    treasure:'🧰'
  })[type] || '•';
}
function storyNodeRisk(type){
  return ({
    combat:'Médio',
    elite:'Alto',
    boss:'Extremo',
    event:'Variável',
    shop:'Baixo',
    rest:'Baixo',
    treasure:'Médio'
  })[type] || 'Desconhecido';
}
function storyNodeRewardHint(type){
  return ({
    combat:'Carta, ouro e progresso de run',
    elite:'Recompensa reforçada e mais ouro',
    boss:'Relíquia poderosa e avanço de ato',
    event:'Escolha com custo e benefício',
    shop:'Compra, reroll e remoção de carta',
    rest:'Recuperação ou preparação de rota',
    treasure:'Relíquia ou pico de poder'
  })[type] || 'Recompensa indefinida';
}
function storyNodeDescription(type){
  return ({
    combat:'Combate padrão para consolidar sua build sem exigir tanto risco.',
    elite:'Encontro agressivo para rotas que buscam aceleração de poder.',
    boss:'Marco da run. Deve cobrar sinergia real do deck e da economia.',
    event:'Decisão narrativa com troca entre curto e longo prazo.',
    shop:'Janela para ajustar curva, remover cartas fracas e buscar sinergias.',
    rest:'Ponto seguro para respirar antes de um trecho mais exigente.',
    treasure:'Parada de alto valor com recompensa acima da média.'
  })[type] || 'Nó da campanha.';
}
function storyChooseNextNode(story, onChosen){
  storyEnsureMap(story);
  const modal = document.getElementById('storyMapModal');
  const grid = document.getElementById('storyMapGrid');
  const nodesLayer = document.getElementById('storyMapNodes');
  const linesSvg = document.getElementById('storyMapLines');
  const subtitle = document.getElementById('storyMapSubtitle');
  const closeBtn = document.getElementById('storyMapClose');
  const detailIcon = document.getElementById('storyMapDetailIcon');
  const detailTitle = document.getElementById('storyMapDetailTitle');
  const detailDesc = document.getElementById('storyMapDetailDesc');
  const detailMeta = document.getElementById('storyMapDetailMeta');
  if(!modal || !grid || !nodesLayer || !linesSvg){
    if(!story.map.currentNodeId){
      const starts = (story.map.startNodeIds||[]).filter(Boolean);
      if(!starts.length){ onChosen && onChosen(null); return; }
      const pick = starts[Math.floor((story.random?story.random():Math.random())*starts.length)];
      story.map.currentNodeId = pick;
      if(!story.map.visited.includes(pick)) story.map.visited.push(pick);
      onChosen && onChosen(story.map.nodes[pick] || null);
      return;
    }
    const next = storyAdvanceMap(story);
    onChosen && onChosen(next);
    return;
  }
  const current = story.map.currentNodeId;
  const selectingStart = !current;
  const outs = selectingStart
    ? (story.map.startNodeIds || []).filter(Boolean)
    : (story.map.edges[current] || []).filter(Boolean);
  if(!outs.length){ onChosen && onChosen(null); return; }
  const floorMax = 15;
  const usableGridWidth = Math.max(640, Math.round((grid.clientWidth || 1200) * 0.95));
  const xStep = Math.max(118, Math.min(172, Math.floor(usableGridWidth / Math.max(4, story.map.cols || 7))));
  const yStep = 158;
  const xBase = 0;
  const yBase = 80;
  const floorShift = (floor) => {
    const seedLen = String(story && story.seed ? story.seed : '0').length;
    const v = Math.sin((floor * 12.9898) + (seedLen * 78.233)) * 43758.5453;
    const frac = v - Math.floor(v);
    return (frac - 0.5) * (xStep * 0.55);
  };
  const rawPos = (node) => {
    const row = floorMax - node.floor;
    const isoOffset = (row % 2 === 0) ? 0 : (xStep * 0.5);
    return {
      x: xBase + (node.col * xStep) + isoOffset + floorShift(node.floor),
      y: yBase + (row * yStep)
    };
  };
  const activeSet = new Set([...(story.map.activeNodeIds||[]), 'boss']);
  const rawPositions = {};
  Object.values(story.map.nodes).forEach(n => {
    if(!n || !activeSet.has(n.id)) return;
    rawPositions[n.id] = rawPos(n.id==='boss' ? {floor:16,col:3} : n);
  });
  const xVals = Object.values(rawPositions).map(p=>p.x);
  const yVals = Object.values(rawPositions).map(p=>p.y);
  const minX = xVals.length ? Math.min(...xVals) : 0;
  const maxX = xVals.length ? Math.max(...xVals) : 1200;
  const minY = yVals.length ? Math.min(...yVals) : 0;
  const maxY = yVals.length ? Math.max(...yVals) : 1600;
  const padX = Math.max(48, Math.round(xStep * 0.55));
  const padY = 120;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const mapWidth = Math.max(Math.round(grid.clientWidth), Math.round(spanX + (padX * 2)));
  const mapHeight = Math.max(Math.round(grid.clientHeight), Math.round(spanY + (padY * 2)));
  const xOffset = ((mapWidth - spanX) * 0.5) - minX;
  const yOffset = padY - minY;
  const nodePos = (nodeId) => {
    const p = rawPositions[nodeId] || {x:0,y:0};
    return { x: p.x + xOffset, y: p.y + yOffset };
  };
  nodesLayer.style.width = `${mapWidth}px`;
  nodesLayer.style.height = `${mapHeight}px`;
  nodesLayer.style.minWidth = `${mapWidth}px`;
  nodesLayer.style.minHeight = `${mapHeight}px`;
  linesSvg.setAttribute('viewBox', `0 0 ${mapWidth} ${mapHeight}`);
  linesSvg.style.width = `${mapWidth}px`;
  linesSvg.style.height = `${mapHeight}px`;
  linesSvg.style.minWidth = `${mapWidth}px`;
  linesSvg.style.minHeight = `${mapHeight}px`;
  subtitle.textContent = selectingStart
    ? `Selecione seu ponto de partida (${outs.length} opção(ões)).`
    : `Escolha a próxima rota (${outs.length} opção(ões)).`;
  nodesLayer.innerHTML = '';
  linesSvg.innerHTML = '';
  const updateMapDetails = node => {
    if(!detailIcon || !detailTitle || !detailDesc || !detailMeta) return;
    if(!node){
      detailIcon.textContent = '⚔️';
      detailTitle.textContent = 'Mapa da Campanha';
      detailDesc.textContent = 'Passe o mouse ou selecione um nó para ver os detalhes.';
      detailMeta.innerHTML = '';
      return;
    }
    const nextCount = ((story.map.edges[node.id] || []).filter(Boolean)).length;
    const meta = [
      `Andar ${node.floor || 1}`,
      `Risco ${storyNodeRisk(node.type)}`,
      `Recompensa ${storyNodeRewardHint(node.type)}`,
      nextCount ? `${nextCount} saída${nextCount===1?'':'s'}` : 'Sem saídas'
    ];
    detailIcon.textContent = storyNodeIcon(node.type);
    detailTitle.textContent = storyNodeTitle(node.type);
    detailDesc.textContent = storyNodeDescription(node.type);
    detailMeta.innerHTML = '';
    meta.forEach(text => {
      const chip = document.createElement('div');
      chip.className = 'story-map-detail-chip';
      chip.textContent = text;
      detailMeta.appendChild(chip);
    });
  };
  updateMapDetails(current ? story.map.nodes[current] : (outs[0] ? story.map.nodes[outs[0]] : null));
  Object.values(story.map.nodes).forEach(n=>{
    if(!n) return;
    if(!activeSet.has(n.id)) return;
    const from = nodePos(n.id);
    const outsN = (story.map.edges[n.id] || []);
    outsN.forEach(toId=>{
      if(!activeSet.has(toId)) return;
      const t = story.map.nodes[toId];
      if(!t) return;
      const to = nodePos(toId);
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      const mx = (from.x + to.x) * 0.5;
      const my = (from.y + to.y) * 0.5;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1, Math.hypot(dx,dy));
      const nx = (-dy / len);
      const ny = (dx / len);
      const curve = Math.min(34, Math.max(12, Math.abs(dx) * 0.12));
      const cx = mx + (nx * curve);
      const cy = my + (ny * curve);
      path.setAttribute('d', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
      const edgeVisited = story.map.visited.includes(n.id) && story.map.visited.includes(toId);
      if(edgeVisited) path.classList.add('past');
      else path.classList.add('trail');
      if(!selectingStart && n.id===current && outs.includes(toId)) path.classList.add('available');
      linesSvg.appendChild(path);
    });
  });
  Object.values(story.map.nodes).forEach(n=>{
    if(!n) return;
    if(!activeSet.has(n.id)) return;
    const p = nodePos(n.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'story-map-node';
    btn.dataset.type = n.type || 'combat';
    btn.style.left = `${p.x}px`;
    btn.style.top = `${p.y}px`;
    btn.textContent = storyNodeIcon(n.type);
    btn.title = `${storyNodeTitle(n.type)} - Andar ${n.floor||16}`;
    if(n.id===current) btn.classList.add('current');
    if(story.map.visited.includes(n.id)) btn.classList.add('visited');
    const clickable = outs.includes(n.id);
    btn.dataset.clickable = clickable ? 'true' : 'false';
    if(clickable){
      btn.onclick = () => {
        story.map.currentNodeId = n.id;
        if(!story.map.visited.includes(n.id)) story.map.visited.push(n.id);
        story.map.pendingResolution = true;
        const encounterType = storyNodeToEncounter(n.type);
        const keepMapOpen = encounterType === 'event' || encounterType === 'rest';
        if(!keepMapOpen) closeModal(modal);
        onChosen && onChosen(n, { keepMapOpen });
      };
      btn.addEventListener('mouseenter', () => {
        nodesLayer.querySelectorAll('.story-map-node.focused').forEach(el => el.classList.remove('focused'));
        btn.classList.add('focused');
        updateMapDetails(n);
      });
      btn.addEventListener('focus', () => {
        nodesLayer.querySelectorAll('.story-map-node.focused').forEach(el => el.classList.remove('focused'));
        btn.classList.add('focused');
        updateMapDetails(n);
      });
      btn.addEventListener('mouseleave', () => {
        btn.classList.remove('focused');
        updateMapDetails(current ? story.map.nodes[current] : (outs[0] ? story.map.nodes[outs[0]] : null));
      });
    }else{
      btn.disabled = true;
    }
    if(!clickable) btn.classList.add('locked');
    if(clickable) btn.classList.add('available-node');
    nodesLayer.appendChild(btn);
  });
  if(story.map.pendingResolution && current){
    const resolvedBtn = nodesLayer.querySelector('.story-map-node.current');
    const availableBtns = Array.from(nodesLayer.querySelectorAll('.story-map-node.available-node')).filter(btn => !btn.classList.contains('current'));
    availableBtns.forEach(btn => {
      btn.disabled = true;
      btn.dataset.clickable = 'false';
    });
    setTimeout(() => {
      if(resolvedBtn) resolvedBtn.classList.add('resolved-check');
    }, 80);
    setTimeout(() => {
      availableBtns.forEach(btn => {
        btn.classList.add('pulse-ready');
        btn.disabled = false;
        btn.dataset.clickable = 'true';
      });
      story.map.pendingResolution = false;
    }, 900);
  }else{
    Array.from(nodesLayer.querySelectorAll('.story-map-node.available-node')).forEach(btn => btn.classList.add('pulse-ready'));
  }
  if(closeBtn) closeBtn.style.display = 'none';
  if(!grid.dataset.dragScrollBound){
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let scrollL = 0;
    let scrollT = 0;
    grid.addEventListener('pointerdown', ev => {
      const t = ev.target;
      if(t && t.closest && t.closest('.story-map-node')) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      scrollL = grid.scrollLeft;
      scrollT = grid.scrollTop;
      grid.classList.add('dragging');
      try{ grid.setPointerCapture(ev.pointerId); }catch(_){ }
      try{ ev.preventDefault(); }catch(_){ }
    });
    const stopDrag = () => { dragging = false; grid.classList.remove('dragging'); };
    grid.addEventListener('pointerleave', stopDrag);
    grid.addEventListener('pointerup', stopDrag);
    grid.addEventListener('pointercancel', stopDrag);
    grid.addEventListener('pointermove', ev => {
      if(!dragging) return;
      grid.scrollLeft = scrollL - (ev.clientX - startX);
      grid.scrollTop = scrollT - (ev.clientY - startY);
      try{ ev.preventDefault(); }catch(_){ }
    });
    grid.dataset.dragScrollBound = '1';
  }
  const scrollToPoint = (x,y,smooth=false) => {
    const maxLeft = Math.max(0, grid.scrollWidth - grid.clientWidth);
    const maxTop = Math.max(0, grid.scrollHeight - grid.clientHeight);
    const left = Math.max(0, Math.min(maxLeft, Math.round(x - (grid.clientWidth * 0.5))));
    const top = Math.max(0, Math.min(maxTop, Math.round(y - (grid.clientHeight * 0.5))));
    try{ grid.scrollTo({ left, top, behavior: smooth ? 'smooth' : 'auto' }); }
    catch(_){ grid.scrollLeft = left; grid.scrollTop = top; }
  };
  showModal(modal);
  const firstNodeId = outs[0] || (story.map.startNodeIds && story.map.startNodeIds[0]) || null;
  const firstNodePos = firstNodeId ? nodePos(firstNodeId) : { x: mapWidth * 0.5, y: mapHeight - 10 };
  const anchorMapViewport = () => {
    if(selectingStart){
      scrollToPoint(firstNodePos.x, firstNodePos.y + 140, false);
      return;
    }
    if(current){
      const cp = nodePos(current);
      scrollToPoint(cp.x, cp.y + 40, false);
      return;
    }
    scrollToPoint(firstNodePos.x, firstNodePos.y + 140, false);
  };
  requestAnimationFrame(() => {
    anchorMapViewport();
    setTimeout(anchorMapViewport, 80);
  });
}
function storyAdvanceOrChoose(story, onDone){
  const wrap = document.getElementById('gameWrap');
  if(wrap) wrap.style.display = 'none';
  if(typeof cleanupGameElements === 'function') cleanupGameElements();
  storyChooseNextNode(story, (node, meta) => {
    saveStoryProgress();
    onDone && onDone(node, meta||{});
  });
}
function storyNodeToEncounter(type){
  if(type===STORY_NODE_TYPES.elite) return 'elite';
  if(type===STORY_NODE_TYPES.boss) return 'boss';
  if(type===STORY_NODE_TYPES.event) return 'event';
  if(type===STORY_NODE_TYPES.shop) return 'shop';
  if(type===STORY_NODE_TYPES.rest) return 'rest';
  if(type===STORY_NODE_TYPES.treasure) return 'treasure';
  return 'normal';
}
const STORY2={active:false,route:[],nodeIndex:0,hand:[],drawPile:[],discard:[],board:[],enemies:[],energy:3,maxEnergy:3,turn:1,maxHand:7,hp:60,maxHp:60,rewards:[],deckKey:'vikings'};
// expose for helpers that run outside this closure
try{ window.G = G; }catch(_){ }
function getStoryState(variant){
  if(variant==='story2'){
    if(!G.story2) G.story2=new StoryMode({level:1,bossInterval:7,eliteEvery:3,eventEvery:3,startGold:50,maxTotems:5});
    return G.story2;
  }
  if(!G.story) G.story=new StoryMode({level:1});
  return G.story;
}
const els={pHP:$('#playerHP'),pHP2:$('#playerHP2'),aHP:$('#aiHP'),aHP2:$('#aiHP2'),opponentLabel:$('#opponentLabel'),mana:$('#mana'),aiMana:$('#aiMana'),pHand:$('#playerHand'),pBoard:$('#playerBoard'),aBoard:$('#aiBoard'),endBtn:$('#endTurnBtn'),instantWinBtn:$('#instantWinBtn'),muteBtn:$('#muteBtn'),aAva:$('#aiAvatar'),drawCount:$('#drawCount'),discardCount:$('#discardCount'),barPHP:$('#barPlayerHP'),barAHP:$('#barAiHP'),barMana:$('#barMana'),barAiMana:$('#barAiMana'),wrap:$('#gameWrap'),start:$('#start'),openEncy:$('#openEncy'),ency:$('#ency'),encyGrid:$('#encyGrid'),encyFilters:$('#encyFilters'),closeEncy:$('#closeEncy'),startGame:$('#startGame'),endOverlay:$('#endOverlay'),endMsg:$('#endMsg'),endSub:$('#endSub'),endStats:$('#endStats'),playAgainBtn:$('#playAgainBtn'),rematchBtn:$('#rematchBtn'),menuBtn:$('#menuBtn'),openMenuBtn:$('#openMenuBtn'),gameMenu:$('#gameMenu'),closeMenuBtn:$('#closeMenuBtn'),resignBtn:$('#resignBtn'),restartBtn:$('#restartBtn'),mainMenuBtn:$('#mainMenuBtn'),turnIndicator:$('#turnIndicator'),emojiBar:$('#emojiBar'),playerEmoji:$('#playerEmoji'),opponentEmoji:$('#opponentEmoji'),deckBuilder:$('#deckBuilder'),saveDeck:$('#saveDeck'),storyRunHud:$('#storyRunHud'),storyActChip:$('#storyActChip'),storyRoundChip:$('#storyRoundChip'),storyEncounterChip:$('#storyEncounterChip'),storyBossModChip:$('#storyBossModChip'),storySeedChip:$('#storySeedChip'),storyGoldChip:$('#storyGoldChip'),storyDeckChip:$('#storyDeckChip'),storyRelicChip:$('#storyRelicChip'),storyPathChip:$('#storyPathChip'),storyEliteLabel:$('#storyEliteLabel'),storyEliteFill:$('#storyEliteFill'),storyBossLabel:$('#storyBossLabel'),storyBossFill:$('#storyBossFill'),confirmModal:$('#confirmModal'),confirmTitle:$('#confirmTitle'),confirmText:$('#confirmText'),confirmOkBtn:$('#confirmOkBtn'),confirmCancelBtn:$('#confirmCancelBtn')};
function showPileViewer(title, cards, owner='player'){
  const viewer = document.getElementById('pileViewer');
  const grid = document.getElementById('pileViewerGrid');
  const heading = document.getElementById('pileViewerTitle');
  if(!viewer || !grid || !heading) return;
  heading.textContent = title;
  grid.innerHTML = '';
  const list = Array.isArray(cards) ? cards.slice() : [];
  if(!list.length){
    const empty = document.createElement('div');
    empty.className = 'sub';
    empty.textContent = 'Nenhuma carta nesta pilha.';
    grid.appendChild(empty);
  }else{
    list.forEach(card => {
      try{
        const node = cardNode(card, owner);
        node.classList.add('ency-card');
        tiltify(node);
        node.addEventListener('click', ev => {
          ev.preventDefault();
          ev.stopPropagation();
          openEncyCardFocus(node);
        });
        grid.appendChild(node);
      }catch(_){ }
    });
  }
  viewer.classList.add('show');
  viewer.setAttribute('aria-hidden','false');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('overlay:archive:open', { id: 'pileViewer', title });
    }
  }catch(_){ }
}
function closePileViewer(){
  const viewer = document.getElementById('pileViewer');
  if(!viewer) return;
  closeEncyCardFocus();
  viewer.classList.remove('show');
  viewer.setAttribute('aria-hidden','true');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('overlay:archive:close', { id: 'pileViewer' });
    }
  }catch(_){ }
}
function emitSystemOverlay(open, id){
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit(open ? 'overlay:system:open' : 'overlay:system:close', { id });
    }
  }catch(_){ }
}
function cleanupTransientUi(){
  closeEncyCardFocus();
  closePileViewer();
  try{ document.querySelectorAll('.modal.show,.options-menu.show,.ency.show,.game-menu.show,.end-overlay.show').forEach(node => {
    node.classList.remove('show');
    setAriaHidden(node,true);
    if(node.classList.contains('options-menu')) node.style.display = 'none';
  }); }catch(_){ }
  try{ document.querySelectorAll('.ency-focus-backdrop,.ency-focus-card,.fx,.fx-float,.card-impact-ring,.ember-particle,.burn-layer,.attack-arrow-layer').forEach(node => node.remove()); }catch(_){ }
  try{
    const tip = document.querySelector('.floating-hover-tip');
    if(tip) tip.classList.remove('show');
    const shopTip = document.getElementById('shopTooltip');
    if(shopTip) shopTip.style.display = 'none';
  }catch(_){ }
  try{ modalStack.length = 0; }catch(_){ }
}
const bodyEl=document.body||document.querySelector('body');
let story2UI=null;
function ensureLeavesBackground(){
  if(!bodyEl || document.getElementById('leafField')) return;
  const field = document.createElement('div');
  field.id = 'leafField';
  field.className = 'leaf-field';
  for(let i=0;i<18;i+=1){
    const leaf = document.createElement('span');
    leaf.className = 'leaf';
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.animationDelay = `${Math.random() * 12}s`;
    leaf.style.animationDuration = `${10 + Math.random() * 9}s`;
    leaf.style.setProperty('--drift', `${-60 + Math.random() * 120}px`);
    leaf.style.setProperty('--spin', `${-180 + Math.random() * 360}deg`);
    field.appendChild(leaf);
  }
  bodyEl.appendChild(field);
}
function applyBattleTheme(theme){
  if(!bodyEl) return;
  const wrap = els.wrap;
  if(!theme){
    bodyEl.removeAttribute('data-battle-theme');
    if(wrap) wrap.removeAttribute('data-battle-theme');
    setBattleAmbience(null);
    try{
      if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
        window.FFFEvents.emit('battle:theme', { theme: null });
      }
    }catch(_){ }
    return;
  }
  bodyEl.setAttribute('data-battle-theme', theme);
  if(wrap) wrap.setAttribute('data-battle-theme', theme);
  setBattleAmbience(theme);
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('battle:theme', { theme });
    }
  }catch(_){ }
}
ensureLeavesBackground();
els.startGame.disabled=true;

function updateCardSize(){
  if(!els.wrap||getComputedStyle(els.wrap).display==='none')return;
  const root=document.documentElement,wrap=els.wrap;
  const bodyH = (document.body && document.body.getBoundingClientRect) ? document.body.getBoundingClientRect().height : window.innerHeight;
  const vh = Math.min(window.innerHeight, bodyH);
  const q=s=>wrap.querySelector(s);
  const marginY=e=>{if(!e)return 0;const st=getComputedStyle(e);return parseFloat(st.marginTop)+parseFloat(st.marginBottom)};
  const outer=e=>e?e.offsetHeight+marginY(e):0;
  const pad=(()=>{const st=getComputedStyle(wrap);return parseFloat(st.paddingTop)+parseFloat(st.paddingBottom)})();
  const bodyPad=(()=>{try{const st=getComputedStyle(document.body);return (parseFloat(st.paddingBottom)||0)+(parseFloat(st.marginBottom)||0)+(parseFloat(st.paddingTop)||0)+(parseFloat(st.marginTop)||0);}catch(_){return 0}})();
  const h1=q('h1'),hud=q('.hud'),turn=q('.turn-bar'),totem=q('.totem-bar'),footer=q('.footer'),hand=q('.hand'),board=q('.board');
  const space=outer(h1)+outer(hud)+outer(turn)+outer(totem)+outer(footer)+pad+marginY(hand)+marginY(board)*2+60+bodyPad+24;
  let cardH=(vh-space)/3; if(!isFinite(cardH)||cardH<40) cardH=40; const cardW=cardH*(220/300);
  root.style.setProperty('--card-h',cardH+'px');
  root.style.setProperty('--card-w',cardW+'px');
}
window.addEventListener('resize',updateCardSize);

// === MODO HISTÓRIA 2 (estilo deckbuilder, separado do tabuleiro) ===
const STORY2_CONFIG={hp:60,maxEnergy:3,handSize:7,route:['combate','combate','evento','descanso','elite','loja','combate','boss']};
let STORY2_STATE=null;

function ensureStory2UI(){
  if(story2UI) return story2UI;
  const wrap=document.createElement('div');
  wrap.id='story2Wrap';
  wrap.style.display='none';
  wrap.innerHTML=`
    <div class="s2-hud">
      <div class="s2-hp"><span id="s2HpVal">60</span>/<span id="s2HpMax">60</span> HP</div>
      <div class="s2-energy">⚡ <span id="s2Energy">3</span>/3</div>
      <div class="s2-turn" id="s2Turn">Turno 1</div>
      <div class="s2-controls">
        <button id="s2EndTurn" class="btn">Fim do turno</button>
        <button id="s2Exit" class="btn-ghost">Sair</button>
      </div>
    </div>
    <div class="s2-route">
      <div class="title">Rota</div>
      <div id="s2Nodes" class="s2-nodes"></div>
    </div>
    <div class="s2-arena">
      <div class="s2-enemies" id="s2Enemies"></div>
      <div class="s2-allies" id="s2Allies"></div>
    </div>
    <div class="s2-hand" id="s2Hand"></div>
    <div class="s2-log" id="s2Log"></div>
  `;
  const style=document.createElement('style');
  style.textContent=`
  #story2Wrap{padding:12px;display:flex;flex-direction:column;gap:12px;background:#0b1724;color:#e5e7eb;height:100vh;overflow:hidden;}
  #story2Wrap .btn{cursor:var(--cursor-pointer);}
  .s2-hud{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;}
  .s2-route{background:#111827;padding:8px;border:1px solid #1f2937;border-radius:8px;}
  .s2-nodes{display:flex;gap:8px;flex-wrap:wrap;}
  .s2-node{padding:6px 10px;border-radius:6px;border:1px solid #1f2937;background:#0f172a;font-size:12px;}
  .s2-node.active{border-color:#38bdf8;color:#38bdf8;}
  .s2-arena{flex:1;display:flex;flex-direction:column;gap:8px;border:1px solid #1f2937;background:#0f172a;padding:10px;border-radius:10px;min-height:260px;}
  .s2-enemies,.s2-allies{display:flex;gap:10px;align-items:flex-end;min-height:100px;}
  .s2-card{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:8px;min-width:110px;max-width:150px;cursor:var(--cursor-pointer);display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 8px rgba(0,0,0,.35);}
  .s2-hand{display:flex;gap:10px;flex-wrap:wrap;min-height:120px;}
  .s2-enemy{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px;min-width:90px;text-align:center;}
  .s2-log{height:120px;overflow:auto;font-size:12px;background:#0f172a;border:1px solid #1f2937;border-radius:8px;padding:6px;}
  `;
  document.head.appendChild(style);
  document.body.appendChild(wrap);
  story2UI={
    wrap,
    hp:wrap.querySelector('#s2HpVal'),
    hpMax:wrap.querySelector('#s2HpMax'),
    energy:wrap.querySelector('#s2Energy'),
    turn:wrap.querySelector('#s2Turn'),
    endTurn:wrap.querySelector('#s2EndTurn'),
    exit:wrap.querySelector('#s2Exit'),
    nodes:wrap.querySelector('#s2Nodes'),
    enemies:wrap.querySelector('#s2Enemies'),
    allies:wrap.querySelector('#s2Allies'),
    hand:wrap.querySelector('#s2Hand'),
    log:wrap.querySelector('#s2Log')
  };
  story2UI.endTurn.addEventListener('click',story2EndTurn);
  story2UI.exit.addEventListener('click',exitStory2);
  return story2UI;
}

function story2Log(msg){
  const ui=ensureStory2UI();
  const line=document.createElement('div');
  line.textContent=msg;
  ui.log.prepend(line);
}

function exitStory2(){
  STORY2.active=false;
  STORY2_STATE=null;
  if(story2UI) story2UI.wrap.style.display='none';
  els.wrap.style.display='none';
  els.start.style.display='flex';
  applyBattleTheme(null);
  window.currentGameMode=null;
}

function newStory2State(deckKey){
  const base={deckKey:deckKey||'vikings',hp:STORY2_CONFIG.hp,maxHp:STORY2_CONFIG.hp,energy:STORY2_CONFIG.maxEnergy,maxEnergy:STORY2_CONFIG.maxEnergy,turn:1,hand:[],drawPile:[],discard:[],board:[],enemies:[],route:[],nodeIndex:0,maxHand:STORY2_CONFIG.handSize};
  base.route=STORY2_CONFIG.route.map((t,i)=>({type:t,label:`${i+1}. ${t}`}));
  return base;
}

function buildStory2Deck(state){
  const pool=(TEMPLATES[state.deckKey]||[]).slice(0,12);
  state.drawPile=shuffle(pool.map(raw=>{const c=makeCard(raw);return{id:uid(),name:c.name,atk:c.atk||1,hp:c.hp||1,cost:c.cost||1,type:'unit',deck:state.deckKey};}));
}

function drawStory2(state,count){
  for(let i=0;i<count;i++){
    if(!state.drawPile.length){state.drawPile=shuffle(state.discard.splice(0));}
    if(!state.drawPile.length) break;
    if(state.hand.length>=state.maxHand) break;
    state.hand.push(state.drawPile.shift());
  }
}

function renderStory2(){
  const ui=ensureStory2UI();
  const s=STORY2_STATE;
  ui.hp.textContent=s.hp;
  ui.hpMax.textContent=s.maxHp;
  ui.energy.textContent=s.energy;
  ui.turn.textContent=`Turno ${s.turn}`;
  ui.nodes.innerHTML='';
  s.route.forEach((n,idx)=>{const el=document.createElement('div');el.className='s2-node'+(idx===s.nodeIndex?' active':'');el.textContent=n.label;ui.nodes.appendChild(el);});
  ui.enemies.innerHTML='';
  s.enemies.forEach(e=>{const el=document.createElement('div');el.className='s2-enemy';el.innerHTML=`<div><strong>${e.name}</strong></div><div>HP ${e.hp}/${e.maxHp}</div><div>ATK ${e.atk}</div>`;ui.enemies.appendChild(el);});
  ui.allies.innerHTML='';
  s.board.forEach(c=>{const el=document.createElement('div');el.className='s2-card';el.innerHTML=`<div><strong>${c.name}</strong></div><div>ATK ${c.atk}</div><div>HP ${c.hp}</div>`;ui.allies.appendChild(el);});
  ui.hand.innerHTML='';
  s.hand.forEach(card=>{const el=document.createElement('div');el.className='s2-card';el.innerHTML=`<div><strong>${card.name}</strong></div><div>Custo ${card.cost}</div><div>${card.atk}/${card.hp}</div>`;el.addEventListener('click',()=>playStory2Card(card));ui.hand.appendChild(el);});
  ui.wrap.style.display='flex';
}

function spawnStory2Enemies(type){
  const set=type==='elite'?[{name:'Elite Rúnico',hp:18,atk:4},{name:'Guardião',hp:12,atk:3}]:type==='boss'?[{name:'Chefe da Aurora',hp:32,atk:6},{name:'Arauto',hp:12,atk:3}]:[{name:'Bruto',hp:12,atk:3},{name:'Lacaio',hp:8,atk:2},{name:'Simbionte',hp:6,atk:2}];
  const count=type==='boss'?3:type==='elite'?2:Math.min(3,set.length);
  return set.slice(0,count).map(e=>({id:uid(),name:e.name,hp:e.hp,maxHp:e.hp,atk:e.atk}));
}

function processStory2Node(){
  const s=STORY2_STATE;
  if(s.nodeIndex>=s.route.length){
    story2Log('Corrida concluída!');
    renderStory2();
    return;
  }
  const node=s.route[s.nodeIndex];
  if(node.type==='descanso'){
    const heal=Math.ceil(s.maxHp*0.2);
    s.hp=Math.min(s.maxHp,s.hp+heal);
    story2Log(`Descanso: recuperou ${heal} HP.`);
    s.nodeIndex++;
    processStory2Node();
    return;
  }
  if(node.type==='evento'){
    s.maxEnergy+=0; // placeholder buff
    story2Log('Evento misterioso: seus aliados ganham +1 ATK nesta corrida.');
    s.board.forEach(a=>a.atk+=1);
    s.nodeIndex++;
    processStory2Node();
    return;
  }
  if(node.type==='loja'){
    s.maxHp+=2; s.hp=Math.min(s.maxHp,s.hp+2);
    story2Log('Loja: refez suprimentos (+2 HP máximo).');
    s.nodeIndex++;
    processStory2Node();
    return;
  }
  // Combates
  s.enemies=spawnStory2Enemies(node.type);
  s.hand=[];s.board=[];s.discard=[];s.drawPile=[];
  buildStory2Deck(s);
  drawStory2(s,5);
  s.turn=1;
  s.energy=s.maxEnergy;
  renderStory2();
}

function playStory2Card(card){
  const s=STORY2_STATE;
  if(!s||!STORY2.active) return;
  if(s.energy<card.cost){story2Log('Energia insuficiente.');return;}
  if(s.board.length>=5){story2Log('Limite de 5 aliados em campo.');return;}
  s.energy-=card.cost;
  s.hand=s.hand.filter(c=>c.id!==card.id);
  s.board.push(Object.assign({},card));
  story2Log(`${card.name} entrou em campo.`);
  renderStory2();
}

function story2EndTurn(){
  const s=STORY2_STATE;
  if(!s||!STORY2.active) return;
  // aliados atacam
  s.board.forEach(a=>{const target=s.enemies[Math.floor(Math.random()*s.enemies.length)];if(!target)return;target.hp=Math.max(0,target.hp-a.atk);story2Log(`${a.name} causou ${a.atk} em ${target.name}.`);});
  s.enemies=s.enemies.filter(e=>e.hp>0);
  if(!s.enemies.length){
    story2Log('Vitória! Avançando na rota.');
    s.nodeIndex++;
    processStory2Node();
    return;
  }
  // inimigos atacam
  s.enemies.forEach(e=>{
    if(s.board.length){
      const target=s.board[Math.floor(Math.random()*s.board.length)];
      target.hp=Math.max(0,target.hp-e.atk);
      story2Log(`${e.name} atingiu ${target.name} por ${e.atk}.`);
    }else{
      s.hp=Math.max(0,s.hp-e.atk);
      story2Log(`${e.name} causou ${e.atk} em você.`);
    }
  });
  s.board=s.board.filter(a=>a.hp>0);
  s.turn++;
  s.energy=s.maxEnergy;
  s.discard.push(...s.hand.splice(0));
  drawStory2(s,5);
  renderStory2();
  if(s.hp<=0){story2Log('Derrota.');exitStory2();}
}

function startStory2(){
  STORY2.active=true;
  STORY2_STATE=newStory2State(G.playerDeckChoice||'vikings');
  initAudio();
  ensureRunning();
  stopMenuMusic();
  els.start.style.display='none';
  if(els.wrap) els.wrap.style.display='none';
  processStory2Node();
  renderStory2();
  story2Log('História 2 iniciada (beta).');
}
const DECK_TITLES={vikings:'Fazendeiros Vikings',animais:'Bestas do Norte',pescadores:'Pescadores do Fiorde',floresta:'Feras da Floresta',custom:'Custom'};
const DECK_ASSETS={
  vikings:{folder:'farm-vikings',back:'fv',dbExt:'webp',cbExt:'webp'},
  pescadores:{folder:'fJord-fishers',back:'jf',dbExt:'webp',cbExt:'webp'},
  floresta:{folder:'forest-beasts',back:'fb',dbExt:'webp',cbExt:'webp'},
  animais:{folder:'north-beasts',back:'nb',dbExt:'webp',cbExt:'webp'}
};
function assetExtFallbacks(primary){
  return primary ? [primary] : [];
}
function deckAssetCandidates(deck,kind){
  const info=DECK_ASSETS[deck];
  if(!info) return [];
  const extKey = kind==='card-back' ? 'cbExt' : 'dbExt';
  const suffix = kind==='card-back' ? 'cb' : 'db';
  return assetExtFallbacks(info[extKey]).map(ext=>`img/decks/${info.folder}/${kind==='card-back'?'card-backs':'deck-backs'}/${info.back}-${suffix}-default.${ext}`);
}
function primaryDeckAssetUrl(deck,kind){
  const candidates=deckAssetCandidates(deck,kind);
  return candidates[0] || '';
}
function attachAssetFallback(img,candidates){
  if(!img || !candidates || !candidates.length) return;
  img.dataset.assetFallbacks = JSON.stringify(candidates);
  img.dataset.assetFallbackIndex = '0';
  img.onerror = function(){
    let list;
    try{ list = JSON.parse(this.dataset.assetFallbacks || '[]'); }catch(_){ list = []; }
    let index = Number(this.dataset.assetFallbackIndex || '0') + 1;
    while(index < list.length && this.src.includes(list[index])){
      index += 1;
    }
    if(index >= list.length){
      this.onerror = null;
      return;
    }
    this.dataset.assetFallbackIndex = String(index);
    this.src = list[index];
  };
  img.src = candidates[0];
}
const DECK_ASSET_INDEX = Object.fromEntries(Object.entries(DECK_IMAGES).map(([deck,list])=>{
  const norm = list.map(n=>n.replace(/\.[^.]+$/,'')).map(n=>n.replace(/^\d+[_-]?/, '').toLowerCase());
  return [deck, new Set(norm)];
}));
const IMG_CACHE={};
const IMG_PRELOAD_PROMISES={};
const DECK_PREVIEW_PRELOADS={};
function preloadImageUrl(src){
  if(!src) return Promise.resolve();
  if(IMG_CACHE[src] && IMG_CACHE[src].complete) return Promise.resolve();
  if(IMG_CACHE[src] && IMG_CACHE[src].failed) return Promise.resolve();
  if(IMG_PRELOAD_PROMISES[src]) return IMG_PRELOAD_PROMISES[src];
  IMG_PRELOAD_PROMISES[src] = new Promise(resolve=>{
    const img = new Image();
    const finalize = ()=>{
      try{
        IMG_CACHE[src] = img.cloneNode();
        IMG_CACHE[src].complete = true;
      }catch(_){ }
      resolve();
    };
    img.onload = ()=>{
      try{
        const decodePromise = typeof img.decode === 'function' ? img.decode() : null;
        if(decodePromise && typeof decodePromise.then === 'function'){
          decodePromise.then(finalize).catch(finalize);
          return;
        }
      }catch(_){ }
      finalize();
    };
    img.onerror = ()=>{
      try{ IMG_CACHE[src] = { failed:true }; }catch(_){ }
      resolve();
    };
    img.src = src;
  }).finally(()=>{ delete IMG_PRELOAD_PROMISES[src]; });
  return IMG_PRELOAD_PROMISES[src];
}
function preloadAssets(){
  for(const [key,info] of Object.entries(DECK_ASSETS)){
    const deckBackSrc = primaryDeckAssetUrl(key,'deck-back');
    if(deckBackSrc){
      preloadImageUrl(deckBackSrc);
    }
    const cardBackSrc = primaryDeckAssetUrl(key,'card-back');
    if(cardBackSrc){
      preloadImageUrl(cardBackSrc);
    }
    (DECK_IMAGES[key]||[]).forEach(fn=>{
      const src=`img/decks/${info.folder}/characters/${fn.replace(/\.[^.]+$/,'')}.png`;
      preloadImageUrl(src);
    });
  }
}
preloadAssets();
// Return local icon path candidates for decks that provide artwork
function iconUrl(deck,idx){
  // Accept explicit strings and basenames, return deck characters path
  if(!idx) return null;
  const info=DECK_ASSETS[deck];
  if(typeof idx==='string'){
    if(idx.startsWith('img/')) return [idx];
    const base = idx.replace(/\.[^.]+$/,'');
    const norm = base.replace(/^\d+[_-]?/, '').toLowerCase();
    if(info && DECK_ASSET_INDEX[deck] && DECK_ASSET_INDEX[deck].has(norm)){
      return [`img/decks/${info.folder}/characters/${base}.png`];
    }
    return null;
  }
  return null;
}

// Inline SVG placeholder (question mark) used only when no art exists
function makeArtPlaceholder(card){
  try{
    const deck = (card && card.deck) || 'default';
    const symbol = '?';
    const bg = deck==='vikings'?'#1f2937':deck==='animais'?'#065f46':deck==='pescadores'?'#0e7490':deck==='floresta'?'#14532d':'#334155';
    const fg = '#e5e7eb';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${bg}' stop-opacity='0.95'/>
      <stop offset='100%' stop-color='${bg}' stop-opacity='0.6'/>
    </linearGradient>
  </defs>
  <rect x='0' y='0' width='96' height='96' rx='12' fill='url(#g)'/>
  <circle cx='78' cy='18' r='8' fill='rgba(255,255,255,0.12)'/>
  <circle cx='18' cy='78' r='10' fill='rgba(255,255,255,0.08)'/>
  <text x='50' y='58' font-family='Inter,Segoe UI,Arial' font-size='54' text-anchor='middle' fill='${fg}' font-weight='800'>${symbol}</text>
</svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }catch(_){
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc5NicgaGVpZ2h0PSc5Nic+PHJlY3Qgd2lkdGg9Jzk2JyBoZWlnaHQ9Jzk2JyBmaWxsPScjMzM0MTU1JyByeD0nMTInLz48dGV4dCB4PSc0OCcgeT0nNTEnIGZpbGw9JyNlNWU3ZWInIGZvbnQtc2l6ZT0nNDgnIHRleHQtYW5jaG9yPSdtaWRkbGUnPkM8L3RleHQ+PC9zdmc+';
  }
}

// Helpers: build candidates from the card name
function stripAcc(s){ try{ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(_){ return s; } }
function wordsOf(s){ return stripAcc(String(s||'')).replace(/[^A-Za-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean); }
function toKebabLower(s){ return wordsOf(s).join('-').toLowerCase(); }
function toSnakeTitle(s){ const w=wordsOf(s).map(x=>x.charAt(0).toUpperCase()+x.slice(1).toLowerCase()); return w.join('_'); }
function nameBasedCharUrls(deck,name){
  const info=DECK_ASSETS[deck]; if(!info) return [];
  const bases=[];
  const keb=toKebabLower(name); if(keb) bases.push(keb);
  const snake=toSnakeTitle(name); if(snake) bases.push(snake);
  const snakeLower=wordsOf(name).join('_').toLowerCase(); if(snakeLower) bases.push(snakeLower);
  const urls=[];
  const idx = DECK_ASSET_INDEX[deck];
  bases.forEach(b=>{
    const norm = b.replace(/^\d+[_-]?/, '').toLowerCase();
    if(idx && idx.has(norm)){
      urls.push(`img/decks/${info.folder}/characters/${b}.png`);
    }
  });
  return urls;
}
function cardArtUrls(card){
  let urls = [];
  const ic = iconUrl(card && card.deck, card && card.icon);
  if(ic && ic.length) urls = urls.concat(ic);
  if(card && card.name) urls = urls.concat(nameBasedCharUrls(card.deck, card.name));
  if(card && typeof card.img === 'string' && card.img.trim() && !card.img.includes('img/cards/')) urls.push(card.img);
  return [...new Set(urls.filter(Boolean))];
}
function preloadDeckPreviewAssets(deck){
  if(DECK_PREVIEW_PRELOADS[deck]) return DECK_PREVIEW_PRELOADS[deck];
  const urls = [];
  const back = primaryDeckAssetUrl(deck,'deck-back');
  if(back) urls.push(back);
  previewDeckCards(deck).forEach(card=>{
    urls.push(...cardArtUrls(card));
  });
  DECK_PREVIEW_PRELOADS[deck] = Promise.all([...new Set(urls)].map(preloadImageUrl)).then(()=>undefined,()=>undefined);
  return DECK_PREVIEW_PRELOADS[deck];
}

function setDeckBacks(){
  const apply=(deck,drawId,discId)=>{
    const candidates=deckAssetCandidates(deck,'deck-back');
    if(!candidates.length)return;
    const drawImg=document.querySelector(`#${drawId} img`);
    const discImg=document.querySelector(`#${discId} img`);
    if(drawImg) attachAssetFallback(drawImg,candidates);
    if(discImg) attachAssetFallback(discImg,candidates);
  };
  apply(G.playerDeckChoice,'drawPile','discardPile');
  apply(G.aiDeckChoice,'aiDrawPile','aiDiscardPile');
}

// deck builder DOM (may be null if builder UI not present)
const poolEl=$('#pool'), chosenEl=$('#chosen'), countEl=$('#countDeck'), curveEl=$('#curve');
// safe builder functions (no-ops if UI not present)
function renderPool(){const all=[...TEMPLATES.vikings,...TEMPLATES.animais,...TEMPLATES.pescadores,...TEMPLATES.floresta];if(!poolEl)return;poolEl.innerHTML='';all.forEach(raw=>{const name=raw[0]|| (typeof raw[9]==='string'?normalizeCardName(raw[9]):'');const emoji=raw[1]||'';const row=document.createElement('div');row.className='pitem';row.innerHTML=`<span class="c">${raw[5]}</span><div>${emoji} ${name}</div><button class="add">+</button>`;row.querySelector('.add').onclick=()=>{if(!G.customDeck)G.customDeck=[];if(G.customDeck.length>=20)return;const c=makeCard(raw);G.customDeck.push(c);renderChosen();updateCurve()};poolEl.appendChild(row)})}
function renderChosen(){if(!chosenEl||!countEl)return;chosenEl.innerHTML='';const list=(G.customDeck||[]);list.forEach((c,i)=>{const item=document.createElement('div');item.className='chitem';item.dataset.idx=i;item.innerHTML=`<div>${c.emoji} ${c.name} <small>(${c.cost})</small></div><button class="rm">remover</button>`;item.querySelector('.rm').onclick=()=>{const idx=Number(item.dataset.idx);if(idx>=0){G.customDeck.splice(idx,1);renderChosen();updateCurve()}};chosenEl.appendChild(item)});countEl.textContent=String(list.length)}
function updateCurve(){if(!curveEl)return;const list=(G.customDeck||[]);const buckets=new Array(8).fill(0);list.forEach(c=>{buckets[Math.min(c.cost,7)]++});curveEl.innerHTML='';const max=Math.max(1,Math.max(...buckets));buckets.forEach(v=>{const bar=document.createElement('div');bar.className='barc';const i=document.createElement('i');i.style.width=(v/max*100)+'%';bar.appendChild(i);curveEl.appendChild(bar)})}
// --- Global error capture ---
window.addEventListener('error',function(e){console.error('JS Error:',e.message,e.filename+':'+e.lineno);try{typeof log==='function'&&log('⚠️ '+e.message)}catch(_){}});
window.addEventListener('unhandledrejection',function(e){console.error('Unhandled Rejection:',e.reason);try{const msg=e.reason&&e.reason.message?e.reason.message:String(e.reason);typeof log==='function'&&log('⚠️ '+msg)}catch(_){}});

function tiltify(card,lift=!1,opts={}){
  if(!card || card.dataset.tiltified) return; // idempotent
  card.dataset.tiltified = '1';
  let hov=false;
  const hoverScale = typeof opts.hoverScale === 'number' ? opts.hoverScale : 1.03;
  const updateTilt = (clientX, clientY) => {
    if(card.classList.contains('chosen')) return;
    const rect = card.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const x=(relX/w-.5)*16;
    const y=(relY/h-.5)*-16;
    const ty=hov?-20:0;
    card.style.setProperty('--mx', `${(relX / w) * 100}%`);
    card.style.setProperty('--my', `${(relY / h) * 100}%`);
    card.style.setProperty('--shine','1');
    card.style.setProperty('--foil','1');
    card.style.setProperty('--card-tilt', `translateY(${ty}px) perspective(980px) rotateX(${y}deg) rotateY(${x}deg) scale(${hoverScale})`);
    card.style.transform=`var(--card-tilt)`;
  };
  if(lift){
    card.addEventListener('mouseenter', e=>{ if(card.classList.contains('chosen')) return; hov=true; card.style.zIndex=1000; card.style.setProperty('--shine','1'); card.style.setProperty('--foil','1'); updateTilt(e.clientX, e.clientY); });
    card.addEventListener('mouseleave', ()=>{ if(card.classList.contains('chosen')) return; hov=false; card.style.zIndex=card.dataset.z||''; card.style.removeProperty('--shine'); card.style.removeProperty('--foil'); card.style.removeProperty('--card-tilt'); card.style.transform=''});
  } else {
    card.addEventListener('mouseenter', e=>{ if(card.classList.contains('chosen')) return; card.style.setProperty('--shine','1'); card.style.setProperty('--foil','1'); updateTilt(e.clientX, e.clientY); });
    card.addEventListener('mouseleave', ()=>{ if(card.classList.contains('chosen')) return; card.style.removeProperty('--shine'); card.style.removeProperty('--foil'); card.style.removeProperty('--card-tilt'); card.style.transform=''});
  }
  card.addEventListener('mousemove', e=>updateTilt(e.clientX,e.clientY));
}
function showPopup(anchor,text){const box=document.createElement('div');box.className='card-popup';box.textContent=text;const r=anchor.getBoundingClientRect();box.style.left=r.left+r.width/2+'px';box.style.top=r.top+'px';document.body.appendChild(box);setTimeout(()=>box.remove(),1200)}
let hoverTipEl = null;
function ensureHoverTip(){
  if(hoverTipEl && document.body.contains(hoverTipEl)) return hoverTipEl;
  hoverTipEl = document.createElement('div');
  hoverTipEl.className = 'floating-hover-tip';
  document.body.appendChild(hoverTipEl);
  return hoverTipEl;
}
function placeHoverTip(ev, el){
  const tip = ensureHoverTip();
  const pad = 14;
  const rect = tip.getBoundingClientRect();
  let left = ev.clientX - rect.width / 2;
  let top = ev.clientY - rect.height - 18;
  if(left < pad) left = pad;
  if(left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if(top < pad) top = ev.clientY + 18;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
function showHoverTip(ev, text){
  if(!text) return;
  const tip = ensureHoverTip();
  tip.textContent = text;
  tip.classList.add('show');
  placeHoverTip(ev, tip);
}
function hideHoverTip(){
  if(!hoverTipEl) return;
  hoverTipEl.classList.remove('show');
}
function closestTipTarget(node){
  if(!node) return null;
  const base = node.nodeType === 1 ? node : node.parentElement;
  if(!base || typeof base.closest !== 'function') return null;
  return base.closest('.effect-link[data-tip], .relic-card[data-tip]');
}
document.addEventListener('pointerenter', ev => {
  const target = closestTipTarget(ev.target);
  if(!target) return;
  showHoverTip(ev, target.getAttribute('data-tip'));
}, true);
document.addEventListener('pointermove', ev => {
  const target = closestTipTarget(ev.target);
  if(!target || !hoverTipEl || !hoverTipEl.classList.contains('show')) return;
  placeHoverTip(ev, hoverTipEl);
}, true);
document.addEventListener('pointerleave', ev => {
  if(!closestTipTarget(ev.target)) return;
  hideHoverTip();
}, true);
function createProjection(container,card){
  if(container){
    const existing = container.querySelector('img,canvas,.img-missing');
    if(existing) existing.remove();
  }
  // Build URL candidates: preferred deck character icon, then explicit img
  const urls = cardArtUrls(card);

  const showFallback=()=>{
    if(container.querySelector('canvas,.img-missing')) return;
    if(card && card.emoji){
      const c=document.createElement('canvas'); c.width=96; c.height=96; const ctx=c.getContext('2d'); ctx.font='72px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(card.emoji,48,60); container.appendChild(c);
    } else {
      const img=document.createElement('img'); img.width=96; img.height=96; img.loading='eager'; img.alt='';
      img.src = makeArtPlaceholder(card);
      container.appendChild(img);
    }
  };

  if(urls.length){
    const src = urls[0];
    if(!src || (IMG_CACHE[src] && IMG_CACHE[src].failed)){ showFallback(); return; }
    let img;
    if(IMG_CACHE[src]&&IMG_CACHE[src].complete){ img=IMG_CACHE[src].cloneNode(); }
    else { img=document.createElement('img'); setSrcFallback(img,urls.slice(),showFallback); }
    img.width=96; img.height=96; img.loading='eager'; container.appendChild(img);
  } else { showFallback(); }
}
function isTotem(card){ return card && (card.type==='totem' || /Totem/i.test(card.subclasse||'') || /Totem/i.test(card.name||'')); }
function describeTotem(card){
  if(!card) return '';
  const a = card.buffs && card.buffs.atk ? card.buffs.atk : 0;
  const h = card.buffs && card.buffs.hp ? card.buffs.hp : 0;
  const lines = [];
  if(a && h) lines.push(`Mantém até 3 aliados com +${a}/+${h}.`);
  else if(a) lines.push(`Mantém até 3 aliados com +${a} ATK.`);
  else if(h) lines.push(`Mantém até 3 aliados com +${h} HP.`);
  if(card.healTotem) lines.push(`No fim do turno, cura ${card.healTotem} o aliado mais ferido.`);
  if(card.summonAtkTotem) lines.push(`Quando um aliado entra em campo, ele recebe +${card.summonAtkTotem} ATK neste turno.`);
  if(card.desc && !lines.length) lines.push(card.desc);
  if(card.desc && lines.length && !lines.includes(card.desc) && !/Ative:|Mantém|No fim do turno|Quando um aliado entra/i.test(card.desc)) lines.unshift(card.desc);
  if(lines.length) return lines.join(' ');
  return 'Ative: Bônus a aliados';
}
function totemIcon(t){
  if(t && t.icon) return t.icon;
  const a = t && t.buffs && t.buffs.atk ? 1 : 0;
  const h = t && t.buffs && t.buffs.hp ? 1 : 0;
  if(a && h) return '⚡';
  if(a) return '🪓';
  if(h) return '🛡️';
  return '🗿';
}
function describePassiveLines(card){
  if(!card) return [];
  const lines = [];
  if(card.drawOnFirstBuffEachTurn) lines.push('Primeiro buff do turno nesta carta: compre 1.');
  if(card.endTurnIfDrawn) lines.push('Fim do turno: se voce comprou carta neste turno, este efeito ativa.');
  if(card.buffAuraHpBonus) lines.push(`Seus buffs concedem +${card.buffAuraHpBonus} HP extra.`);
  if(card.onBuffTempAtk) lines.push(`Quando um aliado receber buff, ganha +${card.onBuffTempAtk} ATK neste turno.`);
  if(card.doubleBuffAura) lines.push('Seus buffs ecoam em mais um aliado.');
  if(card.onHealedGainAtk) lines.push(`Sempre que for curada, ganha +${card.onHealedGainAtk} ATK.`);
  if(card.onDealDamagePermanentAtk) lines.push(`Ao causar dano, ganha +${card.onDealDamagePermanentAtk} ATK permanente.`);
  if(card.onAttackDamagedGainAtk) lines.push(`Ao atacar alvo ferido, ganha +${card.onAttackDamagedGainAtk} ATK neste combate.`);
  if(card.onCombatSurviveTempBuff) lines.push('Se sobreviver ao combate, recebe bonus temporario.');
  return lines;
}
function buildCardTooltip(card){
  if(!card) return 'Sem detalhes.';
  const lines = [];
  if(isTotem(card)) lines.push(describeTotem(card));
  else{
    const rawText = String(card.text || card.desc || '').trim();
    if(rawText) lines.push(rawText);
    describePassiveLines(card).forEach(line => { if(line) lines.push(line); });
  }
  if(card.battlecry && BC_TIPS[card.battlecry]) lines.push(`Efeito de entrada: ${BC_TIPS[card.battlecry]}.`);
  if(card.kw && card.kw.length) lines.push(`Palavras-chave: ${card.kw.join(', ')}.`);
  return lines.filter(Boolean).join('\n');
}
function buildEffectDescription(card){
  if(!card) return 'Sem efeito.';
  if(isTotem(card)) return describeTotem(card);
  const lines = [];
  const rawText = String(card.text || card.desc || '').trim();
  if(rawText) lines.push(rawText);
  if(card.battlecry && BC_TIPS[card.battlecry]){
    const bcText = BC_TIPS[card.battlecry];
    if(!lines.some(line => line.toLowerCase() === bcText.toLowerCase())) lines.push(bcText);
  }
  (card.kw || []).forEach(keyword => {
    const tip = KW_TIPS[keyword];
    if(tip && !lines.some(line => line.toLowerCase() === tip.toLowerCase())) lines.push(tip);
  });
  describePassiveLines(card).forEach(line => {
    if(line && !lines.some(existing => existing.toLowerCase() === line.toLowerCase())) lines.push(line);
  });
  return lines[0] || 'Sem efeito.';
}
function escapeAttr(value){
  return String(value == null ? '' : value)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
function escapeHtml(value){
  return String(value == null ? '' : value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
function summarizeRawEffect(text){
  const clean = String(text || '').replace(/\s+/g,' ').trim();
  if(!clean) return '';
  if(clean.length <= 56) return clean;
  return `${clean.slice(0,53).trimEnd()}...`;
}
function buildEffectTokens(card){
  if(!card || isTotem(card)) return [];
  const tokens = [];
  const pushToken = (label, tip, kind='effect') => {
    if(!label || !tip) return;
    if(tokens.some(entry => entry.label === label && entry.tip === tip)) return;
    tokens.push({ label, tip, kind });
  };
  if(card.battlecry && BC_NAMES[card.battlecry] && BC_TIPS[card.battlecry]){
    pushToken(BC_NAMES[card.battlecry], BC_TIPS[card.battlecry], 'battlecry');
  }
  (card.kw || []).forEach(keyword => {
    if(KW_TIPS[keyword]) pushToken(keyword, KW_TIPS[keyword], 'keyword');
  });
  if(card.drawOnFirstBuffEachTurn) pushToken('Broto', 'Primeiro buff do turno nesta carta: compre 1.');
  if(card.endTurnIfDrawn) pushToken('Maré', 'Fim do turno: se voce comprou carta neste turno, este efeito ativa.');
  if(card.buffAuraHpBonus) pushToken('Raiz', `Seus buffs concedem +${card.buffAuraHpBonus} HP extra.`);
  if(card.onBuffTempAtk) pushToken('Matilha', `Quando um aliado receber buff, ganha +${card.onBuffTempAtk} ATK neste turno.`);
  if(card.doubleBuffAura) pushToken('Eco', 'Seus buffs ecoam em mais um aliado.');
  if(card.onHealedGainAtk) pushToken('Vigilia', `Sempre que for curada, ganha +${card.onHealedGainAtk} ATK.`);
  if(card.onDealDamagePermanentAtk) pushToken('Sangue', `Ao causar dano, ganha +${card.onDealDamagePermanentAtk} ATK permanente.`);
  if(card.onAttackDamagedGainAtk) pushToken('Caçada', `Ao atacar alvo ferido, ganha +${card.onAttackDamagedGainAtk} ATK neste combate.`);
  if(card.onCombatSurviveTempBuff) pushToken('Folego', 'Se sobreviver ao combate, recebe bonus temporario.');
  return tokens;
}
function buildInlineEffectSentence(card, effectTokens){
  if(!card) return 'Sem efeito.';
  const tokenMap = new Map(effectTokens.map(token => [token.label, `<span class="effect-link effect-${token.kind}" data-tip="${escapeAttr(token.tip)}">${escapeHtml(token.label)}</span>`]));
  const battlecryLabel = card.battlecry ? BC_NAMES[card.battlecry] : '';
  if(battlecryLabel && tokenMap.has(battlecryLabel)){
    const t = tokenMap.get(battlecryLabel);
    const patterns = {
      duelBuffOnKill: `Ao entrar aplica ${t}.`,
      buffTargetAtk1DrawIfAttack: `Ao entrar ativa ${t}.`,
      buffAlliesAtk2Temp: `Ao entrar invoca ${t}.`,
      gainFuriousIfDamagedEnemy: `Ao entrar busca ${t}.`,
      scoutDrawUnit: `Ao entrar usa ${t}.`,
      freeze2Draw1: `Ao entrar conjura ${t}.`,
      stunEnemy1: `Ao entrar lança ${t}.`,
      hitDamaged2: `Ao entrar usa ${t}.`,
      draw1DiscountSpell: `Ao entrar ativa ${t}.`,
      draw1IfWideGainMana1: `Ao entrar recebe ${t}.`,
      buffAll1_1DrawIf4: `Ao entrar ecoa ${t}.`,
      rootEnemyDrawIfProtector: `Ao entrar usa ${t}.`,
      buffHuntersVsDamaged: `Ao entrar ativa ${t}.`,
      aoeVsDamaged2: `Ao entrar desperta ${t}.`,
      discoverNeutral: `Ao entrar chama ${t}.`,
      draw1Or2IfLowHand: `Ao entrar usa ${t}.`,
      triggerTotemNow: `Ao entrar chama ${t}.`,
      buffHp3DrawIfTotem: `Ao entrar recebe ${t}.`,
      buffAllIfTotem: `Ao entrar ativa ${t}.`
    };
    if(patterns[card.battlecry]) return patterns[card.battlecry];
    return `Ao entrar ativa ${t}.`;
  }
  if(card.onDealDamagePermanentAtk && tokenMap.has('Sangue')) return `Ao causar dano ganha ${tokenMap.get('Sangue')}.`;
  if(card.onAttackDamagedGainAtk && tokenMap.has('Caçada')) return `Ao atacar ferido ativa ${tokenMap.get('Caçada')}.`;
  if(card.onHealedGainAtk && tokenMap.has('Vigilia')) return `Ao ser curada ativa ${tokenMap.get('Vigilia')}.`;
  if(card.drawOnFirstBuffEachTurn && tokenMap.has('Broto')) return `No primeiro buff ativa ${tokenMap.get('Broto')}.`;
  if(card.endTurnIfDrawn && tokenMap.has('Maré')) return `No fim do turno ativa ${tokenMap.get('Maré')}.`;
  if(card.buffAuraHpBonus && tokenMap.has('Raiz')) return `Seus buffs recebem ${tokenMap.get('Raiz')}.`;
  if(card.onBuffTempAtk && tokenMap.has('Matilha')) return `Quando um aliado recebe buff ativa ${tokenMap.get('Matilha')}.`;
  if(card.doubleBuffAura && tokenMap.has('Eco')) return `Seus buffs ativam ${tokenMap.get('Eco')}.`;
  if(card.onCombatSurviveTempBuff && tokenMap.has('Folego')) return `Se sobreviver ativa ${tokenMap.get('Folego')}.`;
  if(card.kw && card.kw.length){
    const firstKw = KW[card.kw[0]] || card.kw[0];
    if(tokenMap.has(firstKw)) return `Possui ${tokenMap.get(firstKw)}.`;
  }
  const summary = summarizeRawEffect(card.text || card.desc || '');
  return summary ? escapeHtml(summary) : 'Sem efeito.';
}
function buildCardTextMarkup(card){
  if(!card) return `<div class="rules-copy">Sem efeito.</div>`;
  if(isTotem(card)) return `<div class="rules-copy">${escapeHtml(buildEffectDescription(card))}</div>`;
  const effectTokens = buildEffectTokens(card);
  return `<div class="rules-copy concise-rules"><span class="rules-summary">${buildInlineEffectSentence(card, effectTokens)}</span></div>`;
}
function cardNameScale(name){
  return 0.054;
}
function ensureStatusFx(cardNodeEl, variant){
  if(!cardNodeEl) return;
  const current = cardNodeEl.querySelector('.status-flames');
  if(current) current.remove();
}
function relicNode(relic){
  const node = document.createElement('div');
  node.className = 'relic-card';
  node.dataset.rarity = relic.rarity || 'common';
  const desc = relic.desc || relic.text || 'Sem descricao.';
  node.setAttribute('data-tip', desc);
  node.innerHTML = `<div class="relic-card-icon">${relic.icon || relic.emoji || '🔮'}</div><div class="relic-card-name">${relic.name || 'Relíquia'}</div><div class="relic-card-desc">${desc}</div><div class="relic-card-rarity">${String(relic.rarity || 'common').toUpperCase()}</div>`;
  return node;
}
function cardNode(c,owner,onBoard=false){
  const d=document.createElement('div');
  d.className=`card ${owner==='player'?'me':'enemy'} ${c.stance==='defense'?'defense':''}`;
  if(['totens','reliquias','efeitos'].includes(c.deck)) d.classList.add('special-card');
  // if caller marked card to be hidden during summon animation, start hidden
  if(c && c._hideDuringSummon){ d.style.visibility='hidden'; }
  d.dataset.id=c.id;
  d.dataset.combatStyle = c.combatStyle || detectAttackFx(c);
  if(c.stance) d.dataset.stance = c.stance;
  if(onBoard && c.type==='unit') d.classList.add('board-unit');
  const manaMarkup = `<span class="mana-badge ${c.deck}"><span class="mana-badge-icon" aria-hidden="true"></span><span class="mana-badge-num">${Math.max(0, Number(c.cost)||0)}</span></span>`;
  const rulesMarkup = buildCardTextMarkup(c);
  const stanceMarkup = c.stance ? `<span class="stance-label ${c.stance}" aria-label="${c.stance==='defense'?'Modo defesa':'Modo ataque'}">${c.stance==='defense'?'🛡️':'⚔️'}</span>` : '';
  d.innerHTML=`<div class="bg bg-${c.deck||'default'}"></div>
  <div class="card-frame">
    <div class="head-bar">
      <div class="title-row">
        <div class="name" style="--name-scale:${cardNameScale(c.name)}">${c.name}</div>
      </div>
    </div>
    <div class="art"></div>
    <div class="card-body">
      <div class="text">${rulesMarkup}</div>
    </div>
    <div class="stats">${manaMarkup}<span class="stat-number stat-atk">${c.atk}</span>${stanceMarkup}<span class="stat-number stat-hp ${c.hp<=2?'low':''}">${c.hp}</span></div>
  </div>`;
  if(c._dying) d.classList.add('is-dying');
  
  // Add buff glow visual effect if card has buffs
  try{
    ensureCardBase(c);
    const hasAtkBuff = c.atk > c.baseAtk;
    const hasHpBuff = c.hp > c.baseHp;
    const atkIcon = buffIconFor(c,'atk') || '⚔️';
    const hpIcon = buffIconFor(c,'hp') || '❤️';
    const hasDebuff = c.atk < c.baseAtk || c.hp < c.baseHp;
    d.classList.toggle('buff-state', hasAtkBuff || hasHpBuff);
    d.classList.toggle('debuff-state', hasDebuff);
    ensureStatusFx(d, '');
    if(hasAtkBuff || hasHpBuff){
      if(hasAtkBuff){
        const atkGem=d.querySelector('.stat-atk');
        if(atkGem){
          atkGem.classList.add('buffed');
          atkGem.setAttribute('data-buff-icon',atkIcon);
        }
      }
      if(hasHpBuff){
        const hpGem=d.querySelector('.stat-hp');
        if(hpGem){
          hpGem.classList.add('buffed');
          hpGem.setAttribute('data-buff-icon',hpIcon);
        }
      }
    }
  }catch(_){ }
  
  try{
    const tipNodes=d.querySelectorAll('.text .keyword[data-tip], .text .chip[data-tip]');
    tipNodes.forEach((node,idx)=>{node.style.setProperty('--tip-index',idx);});
  }catch(_){ }
  if(!onBoard){
    const art=d.querySelector('.art');
    if(!isTotem(c)){
      const p=document.createElement('div');
      p.className='projection';
      art.appendChild(p);
      createProjection(p,c);
    }
  }
  // Totem: hide stats, show name+effect in text area
  try{
    if(isTotem(c)){
      const textBox=d.querySelector('.text');
      if(textBox){
        textBox.innerHTML = `<div class="rules-copy">${describeTotem(c)}</div>`;
      }
      // show same icon in art area
      const art=d.querySelector('.art');
      if(art){ art.innerHTML = `<div class="totem-icon-art">${totemIcon(c)}</div>`; }
      const stats=d.querySelector('.stats');
      if(stats){ stats.innerHTML=''; }
    }
  }catch(_){ }
  return d;
}

// Shop, rewards and encyclopedia reuse the same card renderer.
// Keep this on window so feature modules do not silently fall back to
// placeholder tiles when they load outside this closure.
try{
  window.cardNode = cardNode;
}catch(_){ }

function updateCardNode(){ /* removed - use cardNode for now */ }
function resetCardState(c){
  if(!c)return;
  c.stance=null;
  c.canAttack=false;
  delete c.summonTurn;
  ensureCardBase(c);
  c.atk = c.baseAtk;
  c.hp = c.baseHp;
  removeBuffBadges(c,(entry)=>entry.temporary || entry.sourceType==='totem',{adjustStats:false});
}
const hasGuard=b=>b.some(x=>x && !x._dying && (x.kw.includes('Protetor')||x.stance==='defense'));
function updateMeters(){
  const hasPrevSnapshot = !!G._meterSnapshot;
  const prev = G._meterSnapshot || { playerHP:G.playerHP, aiHP:G.aiHP, playerMana:G.playerMana, aiMana:G.aiMana };
  const pct=(v,max)=>(max>0?Math.max(0,Math.min(100,(v/max)*100)):0);
  const setMeter = (node, value, max) => {
    if(!node) return;
    const percent = pct(value, max);
    if(!hasPrevSnapshot){
      node.style.transition = 'none';
    }
    node.style.width = '';
    node.style.setProperty('--hud-fill-pct', String(percent / 100));
    node.style.opacity = percent > 0 ? '1' : '0';
    node.setAttribute('aria-valuenow', String(value));
    node.setAttribute('aria-valuemax', String(Math.max(0, max || 0)));
    if(!hasPrevSnapshot){
      void node.offsetWidth;
      node.style.transition = '';
    }
  };
  setMeter(els.barPHP, G.playerHP, 30);
  if(els.barAHP){ try{ setMeter(els.barAHP, G.aiHP, 30); }catch(_){ } }
  setMeter(els.barMana, G.playerMana, G.playerManaCap);
  try{ if(els.aiMana){ els.aiMana.textContent = `${G.aiMana}/${G.aiManaCap}`; } }catch(_){ }
  try{ if(els.barAiMana){ setMeter(els.barAiMana, G.aiMana, G.aiManaCap); } }catch(_){ }
  if(G.playerHP !== prev.playerHP) pulseMeter(G.playerHP > prev.playerHP ? 'heal' : 'hit','player');
  if(G.aiHP !== prev.aiHP) pulseMeter(G.aiHP > prev.aiHP ? 'heal' : 'hit','ai');
  if(G.playerMana !== prev.playerMana) pulseMeter('mana','player');
  if(G.aiMana !== prev.aiMana) pulseMeter('mana','ai');
  G._meterSnapshot = { playerHP:G.playerHP, aiHP:G.aiHP, playerMana:G.playerMana, aiMana:G.aiMana };
  try{ updateGoldHUD(); }catch(_){ }
}
// Atualiza HUD de ouro (story + loja)
function updateGoldHUD(){
  try{
    const hud=document.getElementById('playerGoldHUD');
    if(hud){ hud.textContent = (G.mode==='story' && G.story)? G.story.gold : '0'; }
    const shopGold=document.getElementById('shopGold');
    if(shopGold && typeof shopState!=='undefined'){ shopGold.textContent = shopState.gold; }
  }catch(_){ }
}
function updateStoryRunHUD(){
  try{
    if(!els.storyRunHud) return;
    if(!(G.mode==='story' && G.story)){
      els.storyRunHud.style.display='none';
      if(els.storyEliteFill) els.storyEliteFill.style.width = '0%';
      if(els.storyBossFill) els.storyBossFill.style.width = '0%';
      return;
    }
    els.storyRunHud.style.display='flex';
    if(els.storyActChip) els.storyActChip.textContent = `Ato ${G.story.act || 1}`;
    if(els.storyRoundChip) els.storyRoundChip.textContent = `Round ${G.story.round || 0}`;
    if(els.storySeedChip) els.storySeedChip.textContent = `Seed ${String(G.story.seed||'-').slice(0,10)}`;
    if(els.storyGoldChip) els.storyGoldChip.textContent = `Ouro ${Number(G.story.gold || 0)}`;
    if(els.storyDeckChip) els.storyDeckChip.textContent = `Deck ${Array.isArray(G.story.deck) ? G.story.deck.length : 0}`;
    if(els.storyRelicChip) els.storyRelicChip.textContent = `Relíquias ${Array.isArray(G.story.relics) ? G.story.relics.length : 0}`;
    const kind = G.story.currentEncounter || 'normal';
    const labels = { normal:'Encontro normal', elite:'Encontro elite', boss:'Boss', event:'Evento', shop:'Loja', rest:'Descanso', treasure:'Tesouro' };
    if(els.storyEncounterChip){
      els.storyEncounterChip.textContent = labels[kind] || kind;
      els.storyEncounterChip.classList.remove('mod-boss','mod-elite','mod-event','mod-normal');
      els.storyEncounterChip.classList.add(kind==='boss'?'mod-boss':kind==='elite'?'mod-elite':kind==='event'?'mod-event':'mod-normal');
    }
    if(els.storyBossModChip){
      const mod = G.story.currentBossModifier;
      if(kind==='boss' && mod){
        els.storyBossModChip.style.display='inline-flex';
        els.storyBossModChip.textContent = `Mutador: ${mod}`;
      }else{
        els.storyBossModChip.style.display='none';
      }
    }
    const round = Number(G.story.round || 0);
    const eliteEvery = Math.max(1, Number(G.story.eliteEvery || 5));
    const bossInterval = Math.max(1, Number(G.story.bossInterval || 10));
    const nowKind = G.story.currentEncounter || 'normal';
    const plural = n => (n === 1 ? '' : 's');
    const clampPercent = v => `${Math.max(0, Math.min(100, Math.round(v * 100)))}%`;

    const nextBossRound = nowKind === 'boss'
      ? round
      : Math.ceil((round + 1) / bossInterval) * bossInterval;
    let nextEliteRound = nowKind === 'elite' ? round : null;
    if(nextEliteRound === null){
      for(let step = 1; step <= bossInterval * 3; step += 1){
        const candidate = round + step;
        const isBossRound = candidate % bossInterval === 0;
        const isEliteRound = !isBossRound && candidate % eliteEvery === 0;
        if(isEliteRound){
          nextEliteRound = candidate;
          break;
        }
      }
      if(nextEliteRound === null){
        nextEliteRound = round + eliteEvery;
      }
    }

    const bossRemaining = Math.max(0, nextBossRound - round);
    const eliteRemaining = Math.max(0, nextEliteRound - round);
    const bossProgress = bossRemaining === 0 ? 1 : (bossInterval - bossRemaining) / bossInterval;
    const eliteProgress = eliteRemaining === 0 ? 1 : (eliteEvery - eliteRemaining) / eliteEvery;

    if(els.storyBossLabel){
      els.storyBossLabel.textContent = bossRemaining === 0
        ? 'Boss agora'
        : `Boss em ${bossRemaining} round${plural(bossRemaining)}`;
    }
    if(els.storyEliteLabel){
      els.storyEliteLabel.textContent = eliteRemaining === 0
        ? 'Elite agora'
        : `Elite em ${eliteRemaining} round${plural(eliteRemaining)}`;
    }
    if(els.storyBossFill) els.storyBossFill.style.width = clampPercent(bossProgress);
    if(els.storyEliteFill) els.storyEliteFill.style.width = clampPercent(eliteProgress);
    if(els.storyPathChip){
      const map = G.story.map;
      const currentNodeId = map && map.currentNodeId;
      const nextNodes = currentNodeId && map && map.edges ? (map.edges[currentNodeId] || []).map(id => map.nodes && map.nodes[id]).filter(Boolean) : [];
      if(nextNodes.length){
        const labels = nextNodes.slice(0, 2).map(node => storyNodeTitle(node.type));
        const extra = nextNodes.length > 2 ? ` +${nextNodes.length - 2}` : '';
        els.storyPathChip.textContent = `Próximo: ${labels.join(' / ')}${extra}`;
      }else if(map && !currentNodeId && Array.isArray(map.startNodeIds) && map.startNodeIds.length){
        const startNodes = map.startNodeIds.map(id => map.nodes && map.nodes[id]).filter(Boolean);
        const labels = [...new Set(startNodes.slice(0, 2).map(node => storyNodeTitle(node.type)))];
        els.storyPathChip.textContent = `Início: ${labels.join(' / ') || 'Combate'}`;
      }else{
        els.storyPathChip.textContent = 'Próximo: -';
      }
    }
  }catch(_){ }
}
function updateOpponentLabel(){if(!els.opponentLabel)return;if(window.isMultiplayer){els.opponentLabel.textContent=window.opponentName?` ${window.opponentName}`:'';}else if(G.mode==='story'){els.opponentLabel.textContent='';}else{const t=DECK_TITLES[G.aiDeckChoice]||'';els.opponentLabel.textContent=t?` ${t}`:'';}}
function renderAll(){
  els.pHP.textContent=G.playerHP;
  if(els.pHP2) els.pHP2.textContent=G.playerHP;
  els.aHP.textContent=G.aiHP;
  if(els.aHP2) els.aHP2.textContent=G.aiHP;
  els.mana.textContent=`${G.playerMana}/${G.playerManaCap}`;
  try{ if(els.aiMana){ els.aiMana.textContent = `${G.aiMana}/${G.aiManaCap}`; } }catch(_){ }
  // disable the button and hide it when it's not the player's turn; pulse highlight on your turn
  if(els.endBtn){
    const yourTurn = (G.current === 'player');
    els.endBtn.disabled = !yourTurn;
    els.endBtn.style.display = yourTurn ? 'inline-block' : 'none';
    if(yourTurn){ els.endBtn.classList.add('your-turn'); } else { els.endBtn.classList.remove('your-turn'); }
  }
  emphasizeBoard(G.current === 'player' ? 'player' : 'ai');
  // ensure the turn indicator text doesn't wrap and reflects current turn
  if(els.turnIndicator){
    els.turnIndicator.textContent = (G.current === 'player') ? 'Seu turno' : 'Turno do oponente';
    els.turnIndicator.classList.toggle('player-turn', G.current === 'player');
    els.turnIndicator.classList.toggle('ai-turn', G.current !== 'player');
  }
  syncTurnUiVisuals(G.current);
  els.drawCount.textContent=G.playerDeck.length;
  els.discardCount.textContent=G.playerDiscard.length;
  updateMeters();updateOpponentLabel();updateStoryRunHUD();renderHand();renderBoard();renderTotems();renderStoryEffects();updateDirectAttackHint()
}
function renderHand(){
  els.pHand.innerHTML='';
  G.playerHand.forEach(c=>{
    const d=cardNode(c,'player');
    d.classList.add('handcard');
    if(c._justDrawn){ d.classList.add('draw-in'); delete c._justDrawn; }
    tiltify(d,!0);
    d.addEventListener('click',e=>{
      if(d.classList.contains('chosen'))return;
      const noMana = c.cost>G.playerMana;
      const wrongTurn = G.current!=='player';
      const boardFull = c.type==='unit'&&G.playerBoard.length>=5;
      const blocked=noMana||wrongTurn||boardFull;
      if(blocked){
        d.style.transform='translateY(-2px)';
        setTimeout(()=>d.style.transform='',150);
        sfx('error');
        showPopup(d, noMana ? 'Mana insuficiente' : boardFull ? 'Campo cheio' : 'Nao e seu turno');
        return;
      }
      e.stopPropagation();
      // Totens não escolhem postura; abrem confirmação de uso
      if(isTotem(c)){
        openTotemConfirm(d,()=>window.activateTotemById(c.id,d),()=>{});
      } else {
        openStanceChooser(d,st=>{ animateHandCardToBoard(d,()=>playFromHand(c.id,st)); });
      }
    });
    const cantPay=(c.cost>G.playerMana);
    const disable=(G.current!=='player'||(c.type==='unit'&&G.playerBoard.length>=5));
    d.classList.toggle('blocked',cantPay);
    d.classList.toggle('blocked-mana',cantPay);
    d.classList.toggle('playable',!cantPay&&!disable);
    d.classList.toggle('play-ready',!cantPay&&!disable&&G.current==='player');
    d.style.cursor=(cantPay||disable)?'var(--cursor-blocked)':'var(--cursor-pointer)';
    els.pHand.appendChild(d)
  });
  stackHand()
}


// Animate a sequential flip for newly drawn cards.
// ids: array of card ids in the order they appear in hand (left to right)
// Removido efeito de flip ao comprar cartas: função agora é no-op
function animateDrawFlip(ids=[]){ return; }

function animateDrawFlipOne(id){ return Promise.resolve(); }

  document.addEventListener('click', e => {
    if(!G.chosen) return;
    if(e.target.closest('#aiBoard .card.selectable') || e.target.closest('#playerBoard .card.selectable') || e.target.closest('#aiBoard .face-attack-btn') || e.target.closest('#directAttackHint')) return;
    // reset chosen hand visuals (if any)
    document.querySelectorAll('.hand .card.chosen').forEach(cn => { cn.classList.remove('chosen'); cn.style.transform = ''; });
    cancelTargeting();
  }, { capture: true });
function renderBoard(){
  validateChosen();
  const animateBoardTransition = (container, nextCards, owner) => {
    const first = new Map();
    Array.from(container.children).forEach(node => {
      const id = node && node.dataset ? node.dataset.id : '';
      if(id) first.set(id, node.getBoundingClientRect());
    });
    container.innerHTML = '';
    for(const c of nextCards){
      const d = cardNode(c,owner,true);
      d.classList.add('idle-float');
      if(c._justSummoned){ d.classList.add('board-drop'); delete c._justSummoned; }
      tiltify(d);
      const art = d.querySelector('.art');
      if(!art.querySelector('.projection')){ const p=document.createElement('div'); p.className='projection'; art.appendChild(p); createProjection(p,c); } else { const p=art.querySelector('.projection'); if(p) createProjection(p,c); }
      if(owner==='player'){
        if(G.current==='player' && c.canAttack && c.stance!=='defense' && !c._dying){
          d.classList.add('selectable','attackable');
          d.addEventListener('click',()=>selectAttacker(c));
          bindAttackDrag(d,c);
        } else if(G.current==='player' && !c._dying){
          d.addEventListener('click',()=>{const reason=c.stance==='defense'?'Em defesa':(G.turn===c.summonTurn?'Recém jogada':'Já agiu'); showPopup(d,reason)});
        }
      }else if(G.chosen && legalTarget('ai',c) && !c._dying){
        d.classList.add('selectable'); d.addEventListener('click',()=>attackCard(G.chosen,c));
        d.addEventListener('mouseenter',()=>{
          const from = attackerCenter(G.chosen);
          const r = d.getBoundingClientRect();
          if(from) showAttackArrow(from.x, from.y, r.left + r.width / 2, r.top + r.height / 2);
        });
      }
      container.appendChild(d);
    }
    Array.from(container.children).forEach(node => {
      const id = node && node.dataset ? node.dataset.id : '';
      if(!id) return;
      const prev = first.get(id);
      if(!prev) return;
      const last = node.getBoundingClientRect();
      const dx = prev.left - last.left;
      const dy = prev.top - last.top;
      if(Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      node.style.transition = 'none';
      node.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(()=>{
        node.style.transition = 'transform .52s cubic-bezier(.22,.78,.2,1)';
        node.style.transform = '';
        setTimeout(()=>{ try{ node.style.transition=''; }catch(_){ } }, 540);
      });
    });
  };
  animateBoardTransition(els.pBoard, G.playerBoard, 'player');
  animateBoardTransition(els.aBoard, G.aiBoard, 'ai');

  updateFaceAttackZone();
}

function renderTotems(){
  const bar=document.getElementById('totemBar');
  if(!bar) return;
  // Only show actual acquired totems; remove fixed placeholder slots
  bar.innerHTML='';
  if(Array.isArray(G.totems)){
    G.totems.forEach(t=>{
      const slot=document.createElement('div');
      slot.className='totem-slot';
      slot.style.display='none'; // hidden bar; effects are shown in effects-hud
      if(t){ slot.textContent=t.icon||'🗿'; }
      bar.appendChild(slot);
    });
  }
}
function renderStoryEffects(){
  const panel = document.getElementById('activeEffects');
  const list = document.getElementById('effectsList');
  if(!panel || !list) return;
  if(G.mode !== 'story' || !G.story || !G.story.bonuses) {
    panel.style.display = 'none';
    return;
  }
  const b = G.story.bonuses;
  const effects = [];
  if(b.startMana > 0) effects.push({ icon: '💠', text: `+${b.startMana} mana inicial`, title: 'Elixir de Mana Primordial' });
  if(b.killMana > 0) effects.push({ icon: '🪘', text: `+${b.killMana} mana por kill`, title: 'Tambor dos Conquistadores' });
  if(b.allyBuff && (b.allyBuff.atk > 0 || b.allyBuff.hp > 0)) {
    const parts = [];
    if(b.allyBuff.atk > 0) parts.push(`+${b.allyBuff.atk} ATK`);
    if(b.allyBuff.hp > 0) parts.push(`+${b.allyBuff.hp} HP`);
    effects.push({ icon: '⚔️', text: parts.join(' / ') + ' permanente', title: 'Relíquias de Buff' });
  }
  if(b.totemBonus && (b.totemBonus.atk > 0 || b.totemBonus.hp > 0)) {
    const parts = [];
    if(b.totemBonus.atk > 0) parts.push(`+${b.totemBonus.atk} ATK`);
    if(b.totemBonus.hp > 0) parts.push(`+${b.totemBonus.hp} HP`);
    effects.push({ icon: '🗿', text: `Totens ${parts.join('/')} extra`, title: 'Talismã Totêmico Ancestral' });
  }
  
  // Update new unified effects HUD
  updateEffectsHud();
  
  if(effects.length === 0) {
    panel.style.display = 'none';
    return;
  }
  list.innerHTML = '';
  effects.forEach(e => {
    const item = document.createElement('div');
    item.className = 'effect-item';
    item.setAttribute('data-tip', e.title);
    item.innerHTML = `<span class="effect-icon">${e.icon}</span><span class="effect-text">${e.text}</span>`;
    list.appendChild(item);
  });
  panel.style.display = 'block';
}

function updateEffectsHud(){
  const hud = document.getElementById('effectsHud');
  if(!hud) return;
  
  hud.innerHTML = '';
  const items = [];
  
  // Add active relics
  if(G.story && G.story.relics && G.story.relics.length > 0){
    G.story.relics.forEach(relic => {
      items.push({
        type: 'relic',
        icon: relic.icon,
        tip: `${relic.name}\n${relic.desc}`
      });
    });
  }
  
  // Add story bonuses (buffs permanentes)
  if(G.mode === 'story' && G.story && G.story.bonuses){
    const b = G.story.bonuses;
    if(b.startMana > 0) items.push({type:'buff', icon:'💠', tip:`Elixir de Mana\nNo inicio de cada combate, voce ganha +${b.startMana} mana imediatamente.`});
    if(b.killMana > 0) items.push({type:'buff', icon:'🪘', tip:`Tambor dos Conquistadores\nSempre que uma unidade inimiga sua for eliminada, voce ganha +${b.killMana} mana.`});
    if(b.allyBuff && (b.allyBuff.atk > 0 || b.allyBuff.hp > 0)){
      const parts = [];
      if(b.allyBuff.atk > 0) parts.push(`+${b.allyBuff.atk} ATK`);
      if(b.allyBuff.hp > 0) parts.push(`+${b.allyBuff.hp} HP`);
      items.push({type:'buff', icon:'⚔️', tip:`Buff Permanente\nTodas as unidades do deck entram nas batalhas com ${parts.join(' / ')}.`});
    }
    if(b.totemBonus && (b.totemBonus.atk > 0 || b.totemBonus.hp > 0)){
      const parts = [];
      if(b.totemBonus.atk > 0) parts.push(`+${b.totemBonus.atk} ATK`);
      if(b.totemBonus.hp > 0) parts.push(`+${b.totemBonus.hp} HP`);
      items.push({type:'buff', icon:'🗿', tip:`Talismã Totemico\nTotens ganham ${parts.join('/')} enquanto estiverem no deck e em campo.`});
    }
  }
  
  // Render items
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'effect-item';
    el.setAttribute('data-type', item.type);
    el.setAttribute('data-tip', item.tip);
    el.textContent = item.icon;
    hud.appendChild(el);
  });
  
  hud.style.display = items.length > 0 ? 'flex' : 'none';
}
function showRestModal(onComplete){
  const modal = document.getElementById('restModal');
  const mapModal = document.getElementById('storyMapModal');
  const choices = document.getElementById('restChoices');
  const result = document.getElementById('restResult');
  const closeBtn = document.getElementById('restClose');
  if(!modal || !choices || !result) return onComplete?.();
  modal.classList.toggle('on-story-map', !!(mapModal && mapModal.classList.contains('show')));
  const maxHp = 30;
  const missing = Math.max(0, maxHp - (G.playerHP || maxHp));
  const healAmount = Math.max(1, Math.ceil(maxHp * 0.3));
  const actualHeal = Math.min(missing, healAmount);
  const storyDeck = Array.isArray(G.story && G.story.deck) ? G.story.deck : [];
  const forgeable = storyDeck.filter(card => card && card.type !== 'spell' && !card._restReforged);
  let resolved = false;
  const finish = () => {
    if(resolved) return;
    resolved = true;
    saveStoryProgress();
    closeModal(modal);
    modal.classList.remove('on-story-map');
    setTimeout(()=>onComplete?.(), 220);
  };
  choices.innerHTML = '';
  result.textContent = 'Escolha uma acao para este ponto seguro.';
  const actions = [
    { key:'heal', title:'Descansar', subtitle: actualHeal > 0 ? `Recupera ${actualHeal} HP (30% do maximo).` : 'Sua vida ja esta cheia.', disabled: actualHeal <= 0, run: () => {
      G.playerHP = Math.min(maxHp, (G.playerHP || maxHp) + actualHeal);
      result.textContent = `Voce descansou e recuperou ${actualHeal} HP.`;
      renderAll();
      setTimeout(finish, 700);
    }},
    { key:'forge', title:'Reforjar', subtitle: forgeable.length ? 'Abra o deck de reforja e escolha uma carta ainda nao reforjada.' : 'Nenhuma carta elegivel para reforja agora.', disabled: !forgeable.length, run: () => {
      if(!forgeable.length){
        result.textContent = 'Nao ha cartas disponiveis para reforjar.';
        return;
      }
      result.textContent = 'Escolha uma carta do deck para reforjar.';
      showCardRemoval({
        cards: forgeable,
        title: '⚒️ Reforjar Carta',
        subtitle: 'Selecione uma carta para receber +1 ATK e +2 HP.',
        confirmMessage: card => `Reforjar ${card.name}?`,
        removeFromDeck: false,
        onCardSelected: card => {
          if(card._restReforged || resolved) return;
          card.atk = Math.max(0, (card.atk || 0) + 1);
          card.hp = Math.max(1, (card.hp || 1) + 2);
          card.baseAtk = card.atk;
          card.baseHp = card.hp;
          card._restReforged = true;
          result.textContent = `${card.name} foi reforjada com +1 ATK e +2 HP.`;
          showEventUpgradeOverlay(card, { bonus: 1, subtitle: 'Reforja da fogueira' }, () => {});
          renderAll();
          setTimeout(finish, 900);
        },
        onComplete: () => {}
      });
    }},
    { key:'skip', title:'Seguir viagem', subtitle:'Nao faz nada e avanca para o proximo trecho.', run: () => {
      result.textContent = 'Voce manteve o ritmo e deixou a fogueira para tras.';
      setTimeout(finish, 450);
    }}
  ];
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `event-choice${action.disabled ? ' disabled' : ''}`;
    btn.innerHTML = `<div class="event-choice-text">${action.title}</div><div class="event-choice-cost">${action.subtitle}</div>`;
    if(!action.disabled){
      btn.addEventListener('click',()=>{
        choices.querySelectorAll('.event-choice').forEach(node=>node.classList.remove('selected'));
        btn.classList.add('selected');
        action.run();
      });
    }
    choices.appendChild(btn);
  });
  if(closeBtn) closeBtn.onclick = () => finish();
  showModal(modal);
}

function openStanceChooser(anchor,cb,onCancel){
  closeStanceChooser();
  anchor.classList.add('chosen');
  const prevZ = anchor.style.zIndex;
  anchor.style.zIndex = 10000;
  const box=document.createElement('div');
  box.className='stance-chooser';
  const bA=document.createElement('button');bA.className='btn';bA.textContent='⚔️ Ataque';
  const bD=document.createElement('button');bD.className='btn';bD.textContent='🛡️ Defesa';
  const cleanup=()=>{anchor.classList.remove('chosen');anchor.style.zIndex=prevZ;closeStanceChooser();};
  bA.addEventListener('click',e=>{e.stopPropagation();cleanup();cb('attack')});
  bD.addEventListener('click',e=>{e.stopPropagation();cleanup();cb('defense')});
  box.append(bA,bD);
  anchor.appendChild(box);
  Object.assign(box.style,{position:'absolute',left:'50%',bottom:'100%',transform:'translate(-50%,-8px)'});
  setTimeout(()=>{
    const h=ev=>{
      if(ev.target.closest('.stance-chooser')||ev.target===anchor) return;
      window.removeEventListener('click',h,true);
      // cleanup and ensure chosen state is removed and transforms reset
      cleanup();
      // reset chosen hand card transforms
      document.querySelectorAll('.hand .card.chosen').forEach(cn=>{ cn.classList.remove('chosen'); cn.style.transform=''; });
      onCancel&&onCancel();
    };
    window.addEventListener('click',h,true);
    bA.focus()
  },0)
}
const closeStanceChooser=()=>{const old=document.querySelector('.stance-chooser');if(old)old.remove();document.querySelectorAll('.hand .card.chosen').forEach(c=>c.classList.remove('chosen'))}
function spawnImpactRing(x,y,theme='heavy'){
  emitVisualEvent('visual:impact-ring', {
    x: typeof x === 'number' ? x : null,
    y: typeof y === 'number' ? y : null,
    theme: theme || 'heavy',
    combatStyle: theme || 'heavy',
    source: 'spawnImpactRing'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  const ring=document.createElement('div');
  ring.className=`card-impact-ring ${theme||'heavy'}`;
  ring.style.left=`${x}px`;
  ring.style.top=`${y}px`;
  document.body.appendChild(ring);
  setTimeout(()=>{ try{ ring.remove(); }catch(_){ } },580);
}
function estimateBoardSlotRect(slotIndex){
  const boardRect = els.pBoard.getBoundingClientRect();
  const cardWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 175;
  const gap = 14;
  const totalWidth = (cardWidth * 5) + (gap * 4);
  const startX = boardRect.left + Math.max(12, (boardRect.width - totalWidth) / 2);
  const left = startX + (slotIndex * (cardWidth + gap));
  return {
    left,
    top: boardRect.top + Math.max(6, (boardRect.height - ((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h')) || 230))) / 2),
    width: cardWidth,
    height: (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h')) || 230)
  };
}
function flyToBoard(node,onEnd){
  try{ if(window.animationsDisabled){ onEnd&&onEnd(); return; } }catch(_){ }
  const r=node.getBoundingClientRect();
  const targetIndex = Math.max(0, Math.min(4, G.playerBoard.length));
  const br = estimateBoardSlotRect(targetIndex);
  const ghost=node.cloneNode(true);
  ghost.classList.add('play-travel-ghost');
  // detach the original node and animate it to the board
  const w=r.width,h=r.height;
  Object.assign(ghost.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:w+'px',height:h+'px',zIndex:1300,margin:'0'});
  document.body.appendChild(ghost);
  requestAnimationFrame(()=>{
    const tx=br.left-r.left;
    const ty=br.top-r.top;
    ghost.style.transition='transform .42s cubic-bezier(.2,.82,.24,1), opacity .18s ease, filter .42s ease';
    ghost.style.transform=`translate(${tx}px,${ty}px) scale(1) rotate(0deg)`;
    ghost.style.opacity='.98';
    ghost.style.filter='none';
  });
  setTimeout(()=>{ onEnd&&onEnd(); },380);
  setTimeout(()=>{
    ghost.style.opacity='0';
  },405);
  setTimeout(()=>{
    try{ ghost.remove(); }catch(_){ }
  },520);
}

// alias kept for previous call sites
const animateHandCardToBoard = flyToBoard;
function animateMove(fromEl,toEl){
  return new Promise(resolve=>{
    try{
      if(window.animationsDisabled){ resolve(); return; }
      const r1=fromEl.getBoundingClientRect(),r2=toEl.getBoundingClientRect();
      const ghost=document.createElement('div');
      Object.assign(ghost.style,{left:r1.left+'px',top:r1.top+'px',width:r1.width+'px',height:r1.height+'px',position:'fixed',zIndex:998,transition:'transform .35s ease,opacity .35s ease',background:'#fff',borderRadius:'10px',opacity:1});
      document.body.appendChild(ghost);
      requestAnimationFrame(()=>{ghost.style.transform=`translate(${r2.left-r1.left}px,${r2.top-r1.top}px)`;ghost.style.opacity='0'});
      setTimeout(()=>{try{ghost.remove()}catch(_){ }resolve();},350);
    }catch(e){resolve();}
  });
}
function stackHand(){const cards=$$('#playerHand .card');const total=cards.length;if(!total)return;const width=cards[0].offsetWidth,spread=Math.round(width*0.75),overlap=width-spread;els.pHand.style.setProperty('--hover-shift',`${overlap}px`);cards.forEach((c,i)=>{const offset=(i-(total-1)/2)*spread;c.style.setProperty('--x',`${offset}px`);c.dataset.z=String(i+1);c.style.zIndex=i+1;})}
function applyStoryDeckBonuses(){
  if(!(G.mode==='story'&&G.story&&G.story.bonuses)) return;
  const buff=G.story.bonuses.allyBuff||{};
  if(!buff.atk&&!buff.hp) return;
  let count = 0;
  G.playerDeck.forEach(c=>{
    if(c.type==='spell'||isTotem(c)) return;
    if(buff.atk){c.atk+=buff.atk;}
    if(buff.hp){c.hp+=buff.hp;}
    if(c.atk<0)c.atk=0;
    if(c.hp<1)c.hp=1;
    c.baseAtk=c.atk;
    c.baseHp=c.hp;
    count++;
  });
  if(count > 0){
    const msgs = [];
    if(buff.atk) msgs.push(`+${buff.atk} ATK`);
    if(buff.hp) msgs.push(`+${buff.hp} HP`);
    log(`⚔️ Relíquias da campanha aplicadas: ${msgs.join(' / ')} em ${count} unidades!`);
  }
}
// Configuração central do delay de compra inicial ao continuar história
const STORY_CONTINUE_DEAL_DELAY = 800; // ms
// Identificador de sessão para ignorar efeitos/anim de draws da partida anterior
let GAME_SESSION_ID = 0;

function startGame(opts='player') {
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('battle:start', {
        mode: window.currentGameMode || 'solo',
        opts: typeof opts === 'object' ? Object.assign({}, opts) : { first: opts }
      });
    }
  }catch(_){ }
  GAME_SESSION_ID++;
  updateCardSize();
  const isObj = typeof opts === 'object';
  const first = isObj ? (opts.first || 'player') : opts;
  const continuing = isObj && opts.continueStory;
  const keepMapOpen = isObj && !!opts.keepMapOpen;
  const sanitize = c => { if (c.hp < 1) c.hp = 1; if (c.atk < 0) c.atk = 0; return c; };
  const selectedMode = window.currentGameMode;
  const isStoryLike = selectedMode === 'story' || selectedMode === 'story2';
  G.storyVariant = isStoryLike && selectedMode === 'story2' ? 'story2' : null;
  G.mode = isStoryLike ? 'story' : 'solo';
  if (G.mode === 'story') {
    const activeStory = getStoryState(G.storyVariant === 'story2' ? 'story2' : 'story');
    if(!continuing){
      clearStoryProgress();
      activeStory.seed = String(Date.now());
      activeStory._rngState = activeStory.hashSeed(activeStory.seed);
      activeStory.reset();
    }
    G.story = activeStory;
    storyEnsureMap(G.story);
    if(!G.story.map.currentNodeId){
      if(els.wrap) els.wrap.style.display = 'none';
      cleanupGameElements();
      storyChooseNextNode(G.story, (chosen, meta) => {
        if(!chosen) return;
        saveStoryProgress();
        startGame({continueStory:true, keepMapOpen: !!(meta && meta.keepMapOpen)});
      });
      return;
    }
    const currentNode = storyGetCurrentNode(G.story);
    G.story.nextRound();
    G.story._startManaGranted = false;
    const mappedEncounter = storyNodeToEncounter(currentNode && currentNode.type);
    G.story.currentEncounter = mappedEncounter || G.story.currentEncounter;
    if(G.storyVariant==='story2' && !continuing){
      log('[Historia 2 - beta] Corrida inspirada em deckbuilder; ate 5 aliados ativos no campo.');
    }

    if(G.story.currentEncounter === 'event'){
      const mapModal = document.getElementById('storyMapModal');
      if(els.wrap) els.wrap.style.display = 'none';
      cleanupGameElements();
      if(!keepMapOpen && mapModal) closeModal(mapModal);
      showRandomEvent(() => {
        storyAdvanceOrChoose(G.story, (_node, meta) => startGame({continueStory:true, keepMapOpen: !!(meta && meta.keepMapOpen)}));
      }, { source: keepMapOpen ? 'map' : 'story' });
      return;
    }
    if(G.story.currentEncounter === 'shop'){
      if(els.wrap) els.wrap.style.display = 'none';
      cleanupGameElements();
      showEncounterBanner('Loja do Clã','shop');
      openShop({
        faction:G.playerDeckChoice,
        gold:G.story.gold,
        story:true,
        onClose: async state => {
          if(state&&state.pending&&state.pending.length){
            try{ await Promise.all(state.pending); }catch(_){ }
          }
          if(state){
            G.story.gold = state.gold;
            if(Array.isArray(state.purchased) && state.purchased.length){
              state.purchased.forEach(item => {
                if(item && item._appliedToStory) return;
                if(item && item.bonus) applyStoryShopBonus(item);
                else if(item) addRewardCardToStory(item);
              });
              state.purchased = [];
            }
            if(typeof updateGoldHUD==='function')updateGoldHUD();
            saveStoryProgress();
          }
          storyAdvanceOrChoose(G.story, (_node, meta) => startGame({continueStory:true, keepMapOpen: !!(meta && meta.keepMapOpen)}));
        }
      });
      return;
    }
    if(G.story.currentEncounter === 'rest'){
      if(els.wrap) els.wrap.style.display = 'none';
      cleanupGameElements();
      showRestModal(() => {
        storyAdvanceOrChoose(G.story, (_node, meta) => startGame({continueStory:true, keepMapOpen: !!(meta && meta.keepMapOpen)}));
      });
      return;
    }
    if(G.story.currentEncounter === 'treasure'){
      if(els.wrap) els.wrap.style.display = 'none';
      cleanupGameElements();
      showRelicChoice(() => {
        storyAdvanceOrChoose(G.story, (_node, meta) => startGame({continueStory:true, keepMapOpen: !!(meta && meta.keepMapOpen)}));
      });
      return;
    }
    
    G.aiDeckChoice = G.story.pick(ALL_DECKS) || rand(ALL_DECKS);
    const boss = G.story.currentEncounter === 'boss';
    G.enemyScaling = G.story.scaling;
    G.currentEnemyName = pickEnemyName(G.aiDeckChoice, boss);
    const bossInfo = boss && G.story.currentBossModifier ? ` [Mutador: ${G.story.currentBossModifier}]` : '';
    log(`Round ${G.story.round} (Ato ${G.story.act}): ${G.currentEnemyName} (${G.story.currentEncounter})${bossInfo}`);
    saveStoryProgress();
    try{ showEncounterIntro({ name:G.currentEnemyName, round:G.story.round, kind: boss?'boss':'enemy', deckKey:G.aiDeckChoice }); }
    catch(_){ showEncounterBanner(G.currentEnemyName, boss ? 'boss' : 'enemy'); }
    G.maxHandSize = G.storyVariant === 'story2' ? 7 : 10;
  } else {
    G.story = null;
    G.storyVariant = null;
    G.enemyScaling = 0;
    G.maxHandSize = 5;
  }
  
  continueGameSetup();
}

function continueGameSetup(){
  if(els.wrap) els.wrap.style.display = 'block';
  const sessionId = GAME_SESSION_ID;
  const sanitize = c => { if (c.hp < 1) c.hp = 1; if (c.atk < 0) c.atk = 0; return c; };
  const continuing = G.mode === 'story' && G.story && G.story.round > 1;
  const first = 'player'; // Default first player
  
  if (G.mode === 'story' && continuing) {
    // Recoloca todas as cartas usadas de volta no deck e limpa zonas antes de nova compra
    const deckBefore = G.playerDeck.length;
    const handCards = G.playerHand.length;
    const boardCards = G.playerBoard.length;
    const discardCards = G.playerDiscard.length;
    G.playerDeck.push(...G.playerHand, ...G.playerBoard, ...G.playerDiscard);
    G.playerHand = [];
    G.playerBoard = [];
    G.playerDiscard = [];
    log(`🔄 Deck: ${deckBefore} + Mão: ${handCards} + Mesa: ${boardCards} + Descarte: ${discardCards} = ${G.playerDeck.length} cartas`);

    // Limpa completamente zonas do inimigo ao avançar de round
    G.aiHand = [];
    G.aiBoard = [];
    G.aiDiscard = [];
    // Add purchased cards from story progression
    if (G.story && G.story.deck && G.story.deck.length) {
      const deckSizeBefore = G.playerDeck.length;
      log(`🔍 Adicionando ${G.story.deck.length} cartas de G.story.deck ao deck (continuing)`);
      G.story.deck.forEach(it => {
        const deckKey = it.deck || (G.playerDeckChoice === 'custom' ? 'custom' : G.playerDeckChoice);
        const c = toStoryCard(it, deckKey);
        if(c){
          c.owner = 'player';
          G.playerDeck.push(c);
          log(`📦 Carta da campanha adicionada: ${c.name}`);
        }
      });
      // Clear story deck after adding to prevent duplicates
      G.story.deck = [];
      log(`✅ Deck aumentou de ${deckSizeBefore} para ${G.playerDeck.length} cartas`);
    }
    // Em continuidade não era feito shuffle antes: adicionamos agora para garantir aleatoriedade
    shuffle(G.playerDeck);
    // Limpa imediatamente a UI para não parecer que as cartas foram somadas
    try { 
      els.pHand.innerHTML = '';
      els.pBoard.innerHTML = '';
      els.aiBoard.innerHTML = '';
    } catch(_) {}
  } else {
    G.totems = [];
    G.playerDeck = (G.playerDeckChoice === 'custom' && G.customDeck ? G.customDeck.slice() : TEMPLATES[G.playerDeckChoice].map(makeCard));
    // Start with 10 random cards from deck
    if(G.playerDeck.length > 10){
      shuffle(G.playerDeck);
      G.playerDeck = G.playerDeck.slice(0, 10);
    }
    log(`📋 Deck inicial criado com ${G.playerDeck.length} cartas (${G.playerDeckChoice})`);
    if (G.mode === 'story') {
      const t = makeCard(["Totem de Força", "🗿", "Totem", 0, 0, 2, "Ative: +1/+1 em um aliado"]);
      t.type = 'totem';
      G.playerDeck.push(t);
      log(`🗿 Totem de Força adicionado. Deck agora: ${G.playerDeck.length} cartas`);
      // Add purchased cards from story progression
      if (G.story && G.story.deck && G.story.deck.length) {
        G.story.deck.forEach(it => {
          const deckKey = it.deck || (G.playerDeckChoice === 'custom' ? 'custom' : G.playerDeckChoice);
          const c = toStoryCard(it, deckKey);
          if(c){
            G.playerDeck.push(c);
            log(`📦 Carta da campanha adicionada: ${c.name}`);
          }
        });
        // Clear story deck after adding to prevent duplicates in next initialization
        G.story.deck = [];
      }
      applyStoryDeckBonuses();
    }
    shuffle(G.playerDeck);
  }
  const defaultPlayerDeck = (G.playerDeckChoice === 'custom' ? 'custom' : G.playerDeckChoice);
  G.playerDeck.forEach(c => {
    sanitize(c);
    c.owner = 'player';
    if(!c.deck) c.deck = defaultPlayerDeck;
  });
  G.aiDeck = TEMPLATES[G.aiDeckChoice].map(makeCard);
  shuffle(G.aiDeck);
  G.aiDeck.forEach(c => { sanitize(c); c.owner = 'ai'; c.deck = G.aiDeckChoice; if (G.mode === 'story') { c.atk += G.enemyScaling; c.hp += G.enemyScaling; } });
  G.playerDiscard = [];
  G.aiDiscard = [];
  G.chosen=null;
  G.lastChosenId=null;
  if (!(G.mode === 'story' && continuing)) {
    G.playerHand = [];
    G.aiHand = [];
    G.playerBoard = [];
    G.aiBoard = [];
  }
  G.playerHP = 30;
  G.aiHP = 30;
  G.current = first;
  G._meterSnapshot = null;
  G.playerMana = 0;
  G.playerManaCap = 0;
  G.aiMana = 0;
  G.aiManaCap = 0;
  if(G.mode==='story'&&G.story&&G.story.currentEncounter==='boss'){
    if(G.story.currentBossModifier==='fortificado'){
      G.aiHP += 8;
    }else if(G.story.currentBossModifier==='escassez'){
      G.playerManaCap = Math.max(0, G.playerManaCap - 1);
    }
  }
  G.turn = 0;
  if (!window.isMultiplayer) {
    const diff = document.getElementById('difficulty');
    G.aiSkill = diff ? parseInt(diff.value) : 1;
  }
  els.emojiBar && (els.emojiBar.style.display = window.isMultiplayer ? 'flex' : 'none');
  setDeckBacks();
  applyBattleTheme(G.aiDeckChoice);

  // Ao continuar no modo história, adiciona um pequeno delay entre a troca de inimigo
  // (banner/transition) e a animação de entrega de cartas para evitar sobreposição.
  const dealDelayMs = (G.mode === 'story' && continuing) ? STORY_CONTINUE_DEAL_DELAY : 0;
  const doInitialDeal = async () => {
    // Se outra partida já iniciou, aborta este deal atrasado
    if (sessionId !== GAME_SESSION_ID) return;
    
    // Apply relic effects at combat start
    if(G.mode==='story' && G.story){
      applyRelicEffects('combatStart');
      updateRelicsDisplay();
      saveStoryProgress();
    }
    
    if (first === 'player') await draw('player', 5); else await draw('ai', 5);
    newTurn(true);
    renderAll();
    stopMenuMusic();
    startMenuMusic('combat');
    log('A batalha começou!');
    sfx('start');
    // Show instant win button if in story test mode
    if (els.instantWinBtn) {
      els.instantWinBtn.style.display = (window.storyTestMode && G.mode === 'story') ? 'inline-block' : 'none';
    }
  };
  if (dealDelayMs > 0) {
    // Render básico vazio antes do delay (já feito), só agenda compra
    setTimeout(() => { doInitialDeal(); }, dealDelayMs);
  } else {
    doInitialDeal();
  }
}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
async function draw(who,n=1){
  const deck = who==='player'?G.playerDeck:G.aiDeck,
        hand = who==='player'?G.playerHand:G.aiHand,
        disc = who==='player'?G.playerDiscard:G.aiDiscard;
  const turnState = getTurnState(who);
  const deckEl = document.getElementById('drawPile');
  const handEl = els.pHand;
  for(let i=0;i<n;i++){
    if(deck.length===0 && disc.length){
      disc.forEach(resetCardState);
      deck.push(...shuffle(disc.splice(0)));
  deckEl.classList.add('shuffling');
  setTimeout(()=>deckEl.classList.remove('shuffling'),300);
    }
    if(deck.length){
      const c = deck.shift();
      resetCardState(c);
      if(c.hp<1) c.hp=1;
      c._justDrawn = true;
      if(who==='player' && hand.length>=G.maxHandSize){
        G.playerDiscard.push(c);
        log(`${c.name} queimou por excesso de cartas.`);
      } else {
        if(who==='player'){
          // add to hand first so we can target its final position
          hand.push(c);
          renderHand();
          stackHand();
          const node=document.querySelector(`#playerHand .card[data-id='${c.id}']`)||handEl;
          node.style.visibility='hidden';
          try{ await animateMove(deckEl,node); }catch(_){ }
          node.style.visibility='';
          await animateDrawFlipOne(c.id);
        } else {
          hand.push(c);
        }
        turnState.drawn += 1;
      }
    }
  }
  if(who==='player'){
  els.drawCount.textContent = G.playerDeck.length;
  els.discardCount.textContent = G.playerDiscard.length;
  // final render/stack to ensure layout (no flip)
  renderHand();
  setTimeout(stackHand,150);
  }
}
function discardHand(side){const hand=side==='player'?G.playerHand:G.aiHand;const disc=side==='player'?G.playerDiscard:G.aiDiscard;if(hand.length){if(side==='player'){const cards=$$('#playerHand .card');const pile=document.getElementById('discardPile');cards.forEach(c=>animateMove(c,pile))}disc.push(...hand.splice(0));if(side==='player'){els.discardCount.textContent=G.playerDiscard.length;setTimeout(stackHand,500)}}}
function storyTotemBonus(){return (G.mode==='story'&&G.story&&G.story.bonuses&&G.story.bonuses.totemBonus) ? G.story.bonuses.totemBonus : null;}
function ensureTotemTargets(t){
  if(!t) return [];
  const board=G.playerBoard;
  if(!board.length) return [];
  const defaultTargets=Math.min(3, Math.max(1, board.length));
  t.maxTargets = Math.min(Math.max(t.maxTargets||defaultTargets,1),3);
  const current=(t.targets||[]).map(id=>board.find(c=>c.id===id)).filter(Boolean);
  const desired=Math.min(t.maxTargets, board.length);
  const available=board.filter(card=>!current.includes(card));
  while(current.length<desired && available.length){
    const idx=Math.floor(Math.random()*available.length);
    current.push(available.splice(idx,1)[0]);
  }
  t.targets=current.map(card=>card.id);
  return current;
}
function applyTotemBuffs({focusTotem=null,animate=false}={}){
  if(!G.playerBoard.length||!G.totems.length)return;
  G.playerBoard.forEach(card=>{
    ensureCardBase(card);
    removeBuffBadges(card,entry=>entry.sourceType==='totem',{adjustStats:true});
  });
  const storyBonus=storyTotemBonus();
  G.totems.forEach(t=>{
    if(!t) return;
    const targets=ensureTotemTargets(t);
    if(!targets.length) return;
    const bonusAtk=(t.buffs&&t.buffs.atk)||0;
    const bonusHp=(t.buffs&&t.buffs.hp)||0;
    const totalAtk=bonusAtk + (storyBonus&&storyBonus.atk||0);
    const totalHp=bonusHp + (storyBonus&&storyBonus.hp||0);
    const icon=t.icon||totemIcon(t)||'🗿';
    targets.forEach(card=>{
      applyCardBuff(card,{atk:totalAtk,hp:totalHp,icon,sourceId:t.id||t.name,sourceType:'totem',permanent:false});
      if(animate && focusTotem && focusTotem===t){
        const context=(totalAtk&&totalHp)?'buff':totalAtk?'attack':'heal';
        try{ playContextParticleOnCard(card, context, focusTotem); }catch(_){ }
        if(totalAtk) try{ fxTextOnCard(card.id,`+${totalAtk} ATK`,'buff'); }catch(_){ }
        if(totalHp) try{ fxTextOnCard(card.id,`+${totalHp} HP`,'buff'); }catch(_){ }
      }
    });
  });
}
function showMultiplayerDeckSelect(){
  showAppScreen('deck');
  applyBattleTheme(null);
  const mpOpen=document.getElementById('openMultiplayer');
  mpOpen&&(mpOpen.style.display='none');
  const btn=document.getElementById('startGame');
  if(btn){btn.textContent='Confirmar deck';btn.disabled=false}
  // hide difficulty controls in multiplayer mode
  const diffLabel=document.querySelector('label[for="difficulty"]');
  const diffSelect=document.getElementById('difficulty');
  diffLabel&&(diffLabel.style.display='none');
  diffSelect&&(diffSelect.style.display='none');
  window.isMultiplayer=true;window.mpState=null;window.opponentConfirmed=false;
  const custom=document.querySelector('.deckbtn[data-deck="custom"]');
  custom&&(custom.style.display='none');
}
function showTurnIndicator(){if(!els.turnIndicator)return;els.turnIndicator.textContent=G.current==='player'?'Seu turno':'Turno do oponente'}
function showEmoji(side,e){const el=side==='player'?els.playerEmoji:els.opponentEmoji;if(!el)return;el.textContent=e;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500)}
function newTurn(skipDraw=false,prev){
  if(prev)applyEndTurnEffects(prev);
  G.turn++;
  resetTurnState(G.current);
  
  // Apply relic effects at turn start
  if(G.mode==='story' && G.story){
    applyRelicEffects('turnStart');
  }
  
  if(G.current==='player'){
    if(!skipDraw){
      if(G.playerDeck.length<=4){G.playerDeck.push(...shuffle(G.playerDiscard.splice(0)))}
      draw('player',5)
    }
    G.playerManaCap=clamp(G.playerManaCap+1,0,10);
    G.playerMana=G.playerManaCap;
    if(G.playerPendingMana){
      G.playerMana=Math.min(G.playerMana + G.playerPendingMana, G.playerManaCap);
      G.playerPendingMana = 0;
    }
    if(G.mode==='story'&&G.story){
      if(!G.story._startManaGranted){
        const bonus=G.story.bonuses&&G.story.bonuses.startMana||0;
        if(bonus){
          const beforeCap=G.playerManaCap;
          G.playerManaCap=clamp(G.playerManaCap+bonus,0,10);
          G.playerMana=Math.min(G.playerMana+bonus,G.playerManaCap);
          if(G.playerManaCap>beforeCap||bonus){
            log(`💫 Elixir de Mana Primordial: Você começa com +${bonus} de mana!`);
          }
        }
        G.story._startManaGranted=true;
      }
    }
    G.playerBoard.forEach(c=>{ c.canAttack=!c.skipAttackTurns; if(c.skipAttackTurns) c.skipAttackTurns=Math.max(0,c.skipAttackTurns-1); })
  }else{
    if(!skipDraw){
      if(G.aiDeck.length<=4){G.aiDeck.push(...shuffle(G.aiDiscard.splice(0)))}
      draw('ai',5)
    }
    G.aiManaCap=clamp(G.aiManaCap+1,0,10);
    if(G.mode==='story'&&G.story&&G.story.currentEncounter==='boss'&&G.story.currentBossModifier==='furia'){
      G.aiManaCap=clamp(G.aiManaCap+1,0,10);
    }
    G.aiMana=G.aiManaCap;
    if(G.aiPendingMana){
      G.aiMana=Math.min(G.aiMana + G.aiPendingMana, G.aiManaCap);
      G.aiPendingMana = 0;
    }
    G.aiBoard.forEach(c=>{ c.canAttack=!c.skipAttackTurns; if(c.skipAttackTurns) c.skipAttackTurns=Math.max(0,c.skipAttackTurns-1); })
  }
  renderAll();
  showTurnIndicator();
  updateRelicsDisplay();
}
function endTurn(){if(G.current!=='player')return;discardHand('player');G.current='ai';G.chosen=null;G.lastChosenId=null;updateTargetingUI();newTurn(false,'player');sfx('end');if(window.isMultiplayer){NET.sendTurn('end')}else{setTimeout(aiTurn,500)}}
function castSpell(side,c){
  emitCardPlayed(c,{ side, stance:'spell', source:'castSpell' });
  log(`${side==='player'?'Você':'Inimigo'} conjurou ${c.name}.`);
  const effects = triggerBattlecry(side,c);
  applyOnPlayRewards(side,c);
  animateSpellCast(side);
  resetCardState(c);
  (side==='player'?G.playerDiscard:G.aiDiscard).push(c);
  renderAll();
  return effects;
}
function playFromHand(id,st){if(G.current!=='player')return;const i=G.playerHand.findIndex(c=>c.id===id);if(i<0)return;const c=G.playerHand[i];const boardFull=c.type==='unit'&&G.playerBoard.length>=5;if(c.cost>G.playerMana||boardFull)return;G.playerHand.splice(i,1);G.playerMana-=c.cost;getTurnState('player').played+=1;if(c.type==='totem'){if(G.totems.filter(t=>t.owner==='player').length>=3){log('Número máximo de Totens atingido.');G.playerDiscard.push(c);}else{const t={id:c.id,name:c.name,buffs:c.buffs||{atk:1,hp:1},icon:c.icon||totemIcon(c),theme:getTotemTheme(c),maxTargets:Math.min(3,Math.max(1,G.playerBoard.length||1)),owner:'player',...c};G.totems.push(t);applyTotemBuffsWithFx(t);animateTotemCast();log(`${c.name} ativado.`);}renderAll();return;}if(c.type==='spell'){castSpell('player',c);renderAll();return;}summon('player',c,st);renderAll();sfx(st==='defense'?'defense':'play')}
function summon(side,c,st='attack',skipBC=false){
  emitCardPlayed(c,{ side, stance:st, source:'summon' });
  const board = side==='player'?G.playerBoard:G.aiBoard;
  c.stance = st;
  c.canAttack = (st==='attack') && c.kw.includes('Furioso');
  c.summonTurn = G.turn;
  c._justSummoned = true;
  board.push(c);
  ensureCardBase(c);
  // Only initialize stats if they are truly undefined, never restore HP
  if(c.atk===undefined) c.atk = c.baseAtk;
  if(c.hp===undefined) c.hp = c.baseHp;
  removeBuffBadges(c,(entry)=>entry.sourceType==='totem',{adjustStats:false});
  playContextParticleOnCard(c,'summon',c);
  if(c.type==='totem'){ playAbilityCue('totem',c); }
  else if(c.type==='spell'){ playAbilityCue('spell',c); }
  log(`${side==='player'?'Você':'Inimigo'} jogou ${c.name} em modo ${st==='defense'?'defesa':'ataque'}.`);
  let effects = [];
  if(!skipBC){
    effects = triggerBattlecry(side,c);
    if(window.isMultiplayer && side==='player'){
      NET.sendMove({type:'summon',card:c,stance:st,effects});
    }
  }
  applyOnPlayRewards(side,c);
  if(c.kw && c.kw.includes && c.kw.includes('Absorver')) absorbFromAlly(side,c);
  if(st==='defense') setTimeout(()=>animateDefense(c.id),30);

  // player summons: no animation here, keep behavior
  if(side==='player'){ applyTotemBuffs(); return effects; }

  // if skipBC, render immediately without animation (used by multiplayer replays)
  if(skipBC){ renderBoard(); applyTotemBuffs(); return effects; }

  // AI: animate the summon and return a Promise so callers can await
  return new Promise((resolve)=>{
    // flag the card so it renders hidden immediately (avoids flash)
    c._hideDuringSummon = true;
    renderBoard();
    setTimeout(()=>{
      const real = nodeById(c.id);
      const pile = document.getElementById('aiDrawPile');
      if(!real || !pile){ applyTotemBuffs(); resolve(effects); return; }
      try{
        // ensure real is hidden while animating
        real.style.visibility = 'hidden';
        const tr = real.getBoundingClientRect();
        const pr = pile.getBoundingClientRect();

        // start ghost centered over the pile and animate to the final rect
        const ghost = real.cloneNode(true);
        const startLeft = pr.left + (pr.width - tr.width)/2;
        const startTop = pr.top - tr.height - 8;
        Object.assign(ghost.style,{
          position:'fixed',
          left: startLeft + 'px',
          top: startTop + 'px',
          width: tr.width + 'px',
          height: tr.height + 'px',
          margin:'0',
          pointerEvents:'none',
          transition:'transform .45s cubic-bezier(.2,.9,.2,1),opacity .25s ease',
          transform:'translate(0px,0px) scale(.98)',
          opacity:'0.95',
          zIndex:1400
        });
        document.body.appendChild(ghost);
        requestAnimationFrame(()=>{
          const dx = tr.left - startLeft;
          const dy = tr.top - startTop;
          ghost.style.transform = `translate(${dx}px,${dy}px) scale(1)`;
          ghost.style.opacity = '1';
        });

        setTimeout(()=>{
          try{ ghost.remove(); }catch(_){ }
          try{ delete c._hideDuringSummon; }catch(_){ }
          real.style.visibility = '';
          addAnim(real,'shield-flash',250);
          applyTotemBuffs();
          resolve(effects);
        },520);
      }catch(e){ console.error('summon animation error',e); if(real) real.style.visibility=''; applyTotemBuffs(); resolve(effects); }
    },30);
  });
}
function randomAlly(side, predicate=null, excludeId=null){
  const pool = cardsOnSide(side).filter(x=>x && x.id!==excludeId && (!predicate || predicate(x)));
  return pool.length ? rand(pool) : null;
}
function randomEnemy(side, predicate=null){
  const pool = cardsOnSide(opponentSide(side)).filter(x=>x && (!predicate || predicate(x)));
  return pool.length ? rand(pool) : null;
}
function drawNeutralSpecial(side){
  const pool = [
    spellTemplate('Estandarte Quebrado','🧵','Especial',1,'Compre 1, ou 2 se a mão estiver baixa.','draw1Or2IfLowHand',SPECIAL_IMAGES[1]),
    totemTemplate('Fogueira Ritual','🔥',2,'Fim do turno: cure 1 no aliado mais ferido.',{},SPECIAL_IMAGES[0],{healTotem:1}),
    totemTemplate('Totem de Guerra','⚔️',3,'Aliados que entram ganham +1 ATK neste turno.',{atk:1},SPECIAL_IMAGES[1],{summonAtkTotem:1}),
    spellTemplate('Ritual de Pedra','🪨','Especial',2,'Conceda +3 HP a um aliado. Compre 1 se houver totem.','buffHp3DrawIfTotem',SPECIAL_IMAGES[3])
  ].map(makeCard);
  const card = rand(pool);
  card.owner = side;
  (side==='player'?G.playerHand:G.aiHand).push(card);
  return card;
}
function triggerBattlecry(side,c){
  const foe=side==='player'?'ai':'player';
  const effects=[];
  switch(c.battlecry){
    case 'draw1':{
      draw(side,1);
      log(`${c.name}: comprou 1 carta.`);
      playAbilityCue('draw',c);
      effects.push({type:'draw'});
      break;
    }
    case 'heal2':{
      const allies=(side==='player'?G.playerBoard:G.aiBoard);
      if(allies.length){
        const t=rand(allies);
        healUnit(t,2,c);
        fxTextOnCard(t.id,'+2','heal');
        playContextParticleOnCard(t,'heal',c);
        log(`${c.name}: curou 2 em ${t.name}.`);
        playAbilityCue('heal',c);
        effects.push({type:'heal',targetId:t.id,amount:2});
      }
      break;
    }
    case 'ping1':{
      const foes=(foe==='ai'?G.aiBoard:G.playerBoard);
      if(foes.length){
        const t=rand(foes);
        damageMinion(t,1);
        playContextParticleOnCard(t,'attack',c,{scale:0.78});
        fxTextOnCard(t.id,'-1','dmg');
        log(`${c.name}: 1 de dano em ${t.name}.`);
        playAbilityCue('debuff',c);
        checkDeaths();
        renderAll();
        sfx('hit');
        effects.push({type:'damage',targetId:t.id,amount:1});
      }
      break;
    }
    case 'buffRandom1':{
      const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);
      if(allies.length){
        const t=rand(allies);
        applyCardBuff(t,{atk:1,hp:1,icon:c.emoji||'✨',sourceId:c.id,sourceType:'battlecry',permanent:true});
        fxTextOnCard(t.id,'+1/+1','buff');
        playContextParticleOnCard(t,'buff',c);
        log(`${c.name}: deu +1/+1 em ${t.name}.`);
        playAbilityCue('buff',c);
        effects.push({type:'buff',targetId:t.id,atk:1,hp:1});
      }
      break;
    }
    case 'buffAlliesAtk1':{
      const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);
      allies.forEach(x=>{
        applyCardBuff(x,{atk:1,icon:c.emoji||'✨',sourceId:c.id,sourceType:'battlecry',permanent:true});
        fxTextOnCard(x.id,'+1 ATK','buff');
        playContextParticleOnCard(x,'buff',c);
        effects.push({type:'buff',targetId:x.id,atk:1,hp:0});
      });
      if(allies.length){
        log(`${c.name}: aliados ganharam +1 de ataque.`);
        playAbilityCue('buff',c);
      }
      break;
    }
    case 'mana1':{
      if(side==='player'){
        G.playerManaCap=clamp(G.playerManaCap+1,0,10);
        G.playerMana=Math.min(G.playerMana+1,G.playerManaCap);
      }else{
        G.aiManaCap=clamp(G.aiManaCap+1,0,10);
        G.aiMana=Math.min(G.aiMana+1,G.aiManaCap);
      }
      log(`${c.name}: ganhou 1 de mana.`);
      playAbilityCue('mana',c);
      effects.push({type:'mana',amount:1});
      break;
    }
    case 'mana2':{
      if(side==='player'){
        G.playerManaCap=clamp(G.playerManaCap+2,0,10);
        G.playerMana=Math.min(G.playerMana+2,G.playerManaCap);
      }else{
        G.aiManaCap=clamp(G.aiManaCap+2,0,10);
        G.aiMana=Math.min(G.aiMana+2,G.aiManaCap);
      }
      log(`${c.name}: canalizou 2 de mana.`);
      playAbilityCue('mana',c);
      effects.push({type:'mana',amount:2});
      break;
    }
    case 'sacMana':{
      const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);
      if(allies.length){
        const t=rand(allies);
        const board=side==='player'?G.playerBoard:G.aiBoard;
        const discard=side==='player'?G.playerDiscard:G.aiDiscard;
        const idx=board.findIndex(x=>x.id===t.id);
        if(idx>-1){
          board.splice(idx,1);
          discard.push(t);
          resetCardState(t);
          playContextParticleOnCard(t,'explosion',c);
        }
        if(side==='player'){
          G.playerMana=Math.min(G.playerMana+t.cost,G.playerManaCap);
        }else{
          G.aiMana=Math.min(G.aiMana+t.cost,G.aiManaCap);
        }
        fxTextOnCard(t.id,'sac','dmg');
        log(`${c.name}: sacrificou ${t.name} e ganhou ${t.cost} de mana.`);
        playAbilityCue('mana',c);
        effects.push({type:'sacMana',targetId:t.id,amount:t.cost});
        checkDeaths();
        renderAll();
      }
      break;
    }
    case 'buffTargetAtk1DrawIfAttack':{
      const t=randomAlly(side,x=>x.type==='unit',c.id);
      if(t){
        applyCardBuff(t,{atk:1,icon:c.emoji||'🥁',sourceId:c.id,sourceType:'battlecry',permanent:true});
        t.drawOnAttackThisTurn = 1;
        t.drawOnAttackTurn = G.turn;
        fxTextOnCard(t.id,'+1 ATK','buff');
      }
      break;
    }
    case 'sacDraw2BuffAtkAll1':{
      const victim=randomAlly(side,x=>x.type==='unit');
      if(victim){
        const board=cardsOnSide(side), discard=side==='player'?G.playerDiscard:G.aiDiscard;
        board.splice(board.indexOf(victim),1);
        discard.push(victim);
      }
      draw(side,2);
      cardsOnSide(side).forEach(x=>applyTurnBuff(x,{atk:1,icon:'🍖',sourceId:c.id}));
      break;
    }
    case 'duelBuffOnKill':
    case 'duelBuffIfSurvive':{
      const ally=randomAlly(side,x=>x.type==='unit');
      const enemy=randomEnemy(side,x=>x.type==='unit');
      if(ally&&enemy){
        damageMinion(enemy,ally.atk,{defer:true});
        damageMinion(ally,enemy.atk,{defer:true});
        if(enemy.hp<=0 && (c.battlecry==='duelBuffOnKill' || ally.hp>0)){
          applyCardBuff(ally,{atk:1+(c.battlecry==='duelBuffOnKill'?1:0),icon:c.emoji||'🦷',sourceId:c.id,sourceType:'battlecry',permanent:true});
        }
        checkDeaths();
      }
      break;
    }
    case 'stunEnemy1':{
      const t=randomEnemy(side,x=>x.type==='unit');
      if(t) t.skipAttackTurns = Math.max(1,t.skipAttackTurns||0);
      break;
    }
    case 'draw1DiscountSpell':{
      draw(side,1);
      const hand=side==='player'?G.playerHand:G.aiHand;
      const spell=hand.find(x=>x.type==='spell'&&x.id!==c.id);
      if(spell) spell.cost=Math.max(0,spell.cost-1);
      break;
    }
    case 'hitDamaged2':{
      const t=randomEnemy(side,x=>x.hp < (x.baseHp||x.hp)) || randomEnemy(side,x=>x.type==='unit');
      if(t){ damageMinion(t,2); checkDeaths(); }
      break;
    }
    case 'freeze2Draw1':{
      const foes=cardsOnSide(opponentSide(side)).filter(x=>x.type==='unit').slice(0,2);
      foes.forEach(t=>t.skipAttackTurns = Math.max(1,t.skipAttackTurns||0));
      draw(side,1);
      break;
    }
    case 'lockStrongestEnemy':{
      const foes=cardsOnSide(opponentSide(side)).filter(x=>x.type==='unit');
      if(foes.length) foes.sort((a,b)=>(b.atk+b.hp)-(a.atk+a.hp))[0].skipAttackTurns = 1;
      break;
    }
    case 'draw1IfWideGainMana1':{
      draw(side,1);
      if(cardsOnSide(side).length>=3){
        if(side==='player') G.playerMana=Math.min(G.playerMana+1,G.playerManaCap);
        else G.aiMana=Math.min(G.aiMana+1,G.aiManaCap);
      }
      break;
    }
    case 'buffAll1_1DrawIf4':{
      cardsOnSide(side).forEach(x=>applyCardBuff(x,{atk:1,hp:1,icon:c.emoji||'🎶',sourceId:c.id,sourceType:'battlecry',permanent:true}));
      if(cardsOnSide(side).length>=4) draw(side,1);
      break;
    }
    case 'rootEnemyDrawIfProtector':{
      const t=randomEnemy(side,x=>x.type==='unit');
      if(t) t.skipAttackTurns = 1;
      if(cardsOnSide(side).some(x=>x.kw&&x.kw.includes('Protetor'))) draw(side,1);
      break;
    }
    case 'gainFuriousIfDamagedEnemy':{
      if(cardsOnSide(opponentSide(side)).some(x=>x.hp < (x.baseHp||x.hp))){
        c.canAttack = true;
        if(!c.kw.includes('Furioso')) c.kw.push('Furioso');
      }
      break;
    }
    case 'scoutDrawUnit':{
      const deck=side==='player'?G.playerDeck:G.aiDeck;
      if(deck[0] && deck[0].type==='unit') draw(side,1);
      break;
    }
    case 'buffHuntersVsDamaged':{
      cardsOnSide(side).filter(x=>(x.tribe||'').toLowerCase().includes('animal')).forEach(x=>applyTurnBuff(x,{atk:2,icon:'🩸',sourceId:c.id}));
      break;
    }
    case 'aoeVsDamaged2':{
      cardsOnSide(opponentSide(side)).filter(x=>x.hp < (x.baseHp||x.hp)).forEach(x=>damageMinion(x,2,{defer:true}));
      checkDeaths();
      break;
    }
    case 'discoverNeutral':{
      const card=drawNeutralSpecial(side);
      if(card) log(`${c.name}: ${card.name} foi adicionada à mão.`);
      break;
    }
    case 'draw1Or2IfLowHand':{
      const hand=side==='player'?G.playerHand:G.aiHand;
      draw(side, hand.length<=1 ? 2 : 1);
      break;
    }
    case 'triggerTotemNow':{
      applyTotemSpecialEffects(side,true);
      break;
    }
    case 'buffHp3DrawIfTotem':{
      const t=randomAlly(side,x=>x.type==='unit');
      if(t) applyCardBuff(t,{hp:3,icon:c.emoji||'🪨',sourceId:c.id,sourceType:'battlecry',permanent:true});
      if((G.totems||[]).some(t=>t.owner===side)) draw(side,1);
      break;
    }
    case 'buffAllIfTotem':{
      if((G.totems||[]).some(t=>t.owner===side)){
        cardsOnSide(side).forEach(x=>applyCardBuff(x,{atk:1,hp:1,icon:c.emoji||'🗿',sourceId:c.id,sourceType:'battlecry',permanent:true}));
      }
      break;
    }
    case 'buffAlliesAtk2Temp':{
      cardsOnSide(side).filter(x=>x.id!==c.id).forEach(x=>applyTurnBuff(x,{atk:2,icon:c.emoji||'📯',sourceId:c.id}));
      break;
    }
  }
  return effects;
}
function applyBattlecryEffects(side,effects){effects.forEach(e=>{if(e.type==='heal'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){healUnit(t,e.amount,t);fxTextOnCard(t.id,'+'+e.amount,'heal');playContextParticleOnCard(t,'heal',t)}}else if(e.type==='damage'){const foes=side==='player'?G.aiBoard:G.playerBoard;const t=foes.find(x=>x.id===e.targetId);if(t){damageMinion(t,e.amount);playContextParticleOnCard(t,'attack',t,{scale:0.78});fxTextOnCard(t.id,'-'+e.amount,'dmg')}}else if(e.type==='buff'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.atk+=e.atk;t.hp+=e.hp;fxTextOnCard(t.id,'+'+e.atk+(e.hp?'/'+e.hp:''),'buff');playContextParticleOnCard(t,'buff',t)}}else if(e.type==='mana'){if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+e.amount,0,10);G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+e.amount,0,10);G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}else if(e.type==='sacMana'){const allies=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const t=allies.find(x=>x.id===e.targetId);if(t){allies.splice(allies.indexOf(t),1);discard.push(t);resetCardState(t);playContextParticleOnCard(t,'explosion',t);}if(side==='player'){G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}});checkDeaths()}

function absorbFromAlly(side,c){const board=side==='player'?G.playerBoard:G.aiBoard;const allies=board.filter(x=>x.id!==c.id&&x.kw&&x.kw.length);if(!allies.length)return;const src=rand(allies);const choices=src.kw.filter(k=>!c.kw.includes(k));if(!choices.length)return;const kw=rand(choices);c.kw.push(kw);playContextParticleOnCard(c,'buff',c);fxTextOnCard(c.id,kw,'buff');log(`${c.name} absorveu ${kw}.`);if(c.name==='Sombra Rúnica'){applyCardBuff(c,{atk:1,hp:1,icon:c.emoji||'✨',sourceType:'absorb',sourceId:c.id,permanent:true});}if(c.name==='Capataz de Runas'){const foes=side==='player'?G.aiBoard:G.playerBoard;foes.forEach(t=>{damageMinion(t,1);playContextParticleOnCard(t,'attack',c,{scale:0.74});fxTextOnCard(t.id,'-1','dmg')});checkDeaths()}}

function applyTotemSpecialEffects(side,force=false){
  const board=cardsOnSide(side);
  const totems=(G.totems||[]).filter(t=>t.owner===side);
  totems.forEach(t=>{
    if(t.healTotem){
      const target=board.slice().sort((a,b)=>a.hp-b.hp)[0];
      if(target){ healUnit(target,t.healTotem,t); }
    }
    if(force && t.summonAtkTotem){
      board.forEach(card=>applyTurnBuff(card,{atk:t.summonAtkTotem,icon:t.emoji||'⚔️',sourceId:t.id}));
    }
  });
}
function applyEndTurnEffects(side){const board=side==='player'?G.playerBoard:G.aiBoard;const foeBoard=side==='player'?G.aiBoard:G.playerBoard;board.forEach(c=>removeBuffBadges(c,entry=>entry.sourceType==='turnBuff',{adjustStats:true}));for(const c of board){if(c.kw.includes('Mutável')){const atk=c.atk;c.atk=c.hp;c.hp=atk;fxTextOnCard(c.id,'⇆','buff');playContextParticleOnCard(c,'buff',c);}if(c.endTurnRandomBuff){const target=randomAlly(side,x=>x.id!==c.id)||c;applyCardBuff(target,{atk:c.endTurnRandomBuff.atk||0,hp:c.endTurnRandomBuff.hp||0,icon:c.emoji||'🌿',sourceId:c.id,sourceType:'endTurn',permanent:true});}if(c.endTurnIfDrawn&&getTurnState(side).drawn>0){if(c.endTurnIfDrawn.hp)applyCardBuff(c,{hp:c.endTurnIfDrawn.hp,icon:c.emoji||'🌊',sourceId:c.id,sourceType:'endTurn',permanent:true});if(c.endTurnIfDrawn.heal)healUnit(c,c.endTurnIfDrawn.heal,c);}if(c.name==='Totem Absorvente'){const foes=foeBoard.filter(f=>f.kw&&f.kw.length);if(foes.length){const src=rand(foes);const opts=src.kw.filter(k=>!c.kw.includes(k));if(opts.length){const kw=rand(opts);c.kw.push(kw);playContextParticleOnCard(c,'buff',c);fxTextOnCard(c.id,kw,'buff');log(`${c.name} absorveu ${kw} de ${src.name}.`)}}}}applyTotemSpecialEffects(side,false)}
let attackArrow=null;
function ensureAttackArrow(){
  if(attackArrow) return attackArrow;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('attack-arrow-layer');
  svg.setAttribute('width','100%');
  svg.setAttribute('height','100%');
  svg.innerHTML = `<defs><linearGradient id="attackArrowStroke" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#60a5fa"/><stop offset="55%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient></defs><path class="arrow-shadow" d=""></path><path class="arrow-path" d=""></path><polygon class="arrow-head" points="0,0 0,0 0,0"></polygon>`;
  document.body.appendChild(svg);
  attackArrow = svg;
  return svg;
}
function hideAttackArrow(){
  emitVisualEvent('visual:attack-arrow', { active:false, source:'hideAttackArrow' });
  if(attackArrow) attackArrow.style.display = 'none';
}
function showAttackArrow(fromX, fromY, toX, toY){
  emitVisualEvent('visual:attack-arrow', {
    active:true,
    fromX, fromY, toX, toY,
    source:'showAttackArrow'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  const svg = ensureAttackArrow();
  const path = svg.querySelector('.arrow-path');
  const shadow = svg.querySelector('.arrow-shadow');
  const head = svg.querySelector('.arrow-head');
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const curve = Math.min(42, Math.max(10, len * 0.12));
  const nxCurve = -uy * curve;
  const nyCurve = ux * curve;
  const ctrlX = midX + nxCurve;
  const ctrlY = midY + nyCurve;
  const baseX = toX - ux * 24;
  const baseY = toY - uy * 24;
  const nx = -uy * 10;
  const ny = ux * 10;
  const d = `M ${fromX} ${fromY} Q ${ctrlX} ${ctrlY} ${baseX} ${baseY}`;
  path.setAttribute('d', d);
  shadow.setAttribute('d', d);
  head.setAttribute('points', `${toX},${toY} ${baseX + nx},${baseY + ny} ${baseX - nx},${baseY - ny}`);
  svg.style.display = 'block';
}
function attackerCenter(card){
  const node = nodeById(card && card.id);
  if(!node) return null;
  const r = node.getBoundingClientRect();
  return { x:r.left + r.width / 2, y:r.top + r.height / 2 };
}
function resolveDraggedTarget(clientX, clientY){
  const el = document.elementFromPoint(clientX, clientY);
  const cardEl = el && el.closest ? el.closest('#aiBoard .card') : null;
  if(!cardEl) return null;
  return G.aiBoard.find(card => String(card.id) === String(cardEl.dataset.id)) || null;
}
function bindAttackDrag(node, card){
  if(!node || !card || node.dataset.attackBound) return;
  node.dataset.attackBound = '1';
  node.addEventListener('pointerdown', ev => {
    if(G.current!=='player' || !card.canAttack || card.stance==='defense') return;
    ev.preventDefault();
    selectAttacker(card);
    const update = evt => {
      const from = attackerCenter(card);
      if(from) showAttackArrow(from.x, from.y, evt.clientX, evt.clientY);
    };
    const finish = evt => {
      window.removeEventListener('pointermove', update, true);
      window.removeEventListener('pointerup', finish, true);
      const target = resolveDraggedTarget(evt.clientX, evt.clientY);
      hideAttackArrow();
      if(target && G.chosen && String(G.chosen.id) === String(card.id)) attackCard(card, target);
    };
    update(ev);
    window.addEventListener('pointermove', update, true);
    window.addEventListener('pointerup', finish, true);
  });
}
function updateTargetingUI(){document.body.classList.toggle('targeting',!!G.chosen);if(!G.chosen)hideAttackArrow();}
function validateChosen(){
  if(!G.chosen) return false;
  if(G.current!=='player'){
    G.chosen=null; document.body.classList.remove('targeting');
    return false;
  }
  const ref=G.playerBoard.find(x=>x.id===G.chosen.id);
  if(!ref || !ref.canAttack || ref.stance==='defense'){
    G.chosen=null; G.lastChosenId=null; document.body.classList.remove('targeting');
    return false;
  }
  G.chosen=ref;
  G.lastChosenId = ref.id;
  return true;
}
function cancelTargeting(){
  if(!G.chosen)return;
  G.chosen=null;
  G.lastChosenId=null;
  hideAttackArrow();
  updateTargetingUI();
  els.aBoard.classList.remove('face-can-attack');
  renderBoard();
  try{ updateDirectAttackHint(); }catch(_){ }
}
document.addEventListener('contextmenu',e=>{
  if(!G.chosen) return;
  e.preventDefault();
  cancelTargeting();
},{capture:true});
function selectAttacker(c){
  if(G.current!=='player'||!c.canAttack||c.stance==='defense')return;
  G.chosen=c;
  G.lastChosenId=c.id;
  const from = attackerCenter(c);
  if(from) showAttackArrow(from.x, from.y, from.x + 1, from.y - 1);
  updateTargetingUI();
  renderBoard();
  updateFaceAttackZone();
  try{ updateDirectAttackHint(); }catch(_){ }
  G.aiBoard.filter(x=>x.stance==='defense').forEach(x=>setTimeout(()=>animateDefense(x.id),20))
}
function updateFaceAttackZone(){
  // Function kept for compatibility but no longer manages the corner button
  const guard=hasGuard(G.aiBoard), valid=validateChosen();
  const canFace = valid && !guard;
  if(canFace){
    els.aBoard.classList.add('face-can-attack');
  }else{
    els.aBoard.classList.remove('face-can-attack');
  }
}
function legalTarget(side,target){
  if(!target || target._dying) return false;
  const b=side==='ai'?G.aiBoard:G.playerBoard;
  return hasGuard(b)?(target.kw.includes('Protetor')||target.stance==='defense'):true;
}
const nodeById=id=>document.querySelector(`.card[data-id="${id}"]`);
function emitCardMana(card, amount, sideOverride=null){
  if(!card || !amount) return;
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('card:mana', {
        id: card.id,
        name: card.name,
        side: sideOverride || getCardSide(card),
        amount,
        deck: card.deck || null,
        tribe: card.tribe || null,
        combatStyle: card.combatStyle || null,
        sourceType: card.type || null
      });
    }
  }catch(_){ }
}
function emitFaceDamaged(side, amount, sourceCard=null, meta={}){
  if(!side || !amount) return;
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('face:damaged', {
        side,
        amount,
        sourceId: sourceCard && sourceCard.id ? sourceCard.id : null,
        sourceName: sourceCard && sourceCard.name ? sourceCard.name : null,
        sourceType: meta && meta.sourceType ? meta.sourceType : 'attack',
        combatStyle: sourceCard && sourceCard.combatStyle ? sourceCard.combatStyle : null,
        deck: sourceCard && sourceCard.deck ? sourceCard.deck : null,
        tribe: sourceCard && sourceCard.tribe ? sourceCard.tribe : null,
        hp: side === 'player' ? G.playerHP : G.aiHP,
        maxHp: 30
      });
    }
  }catch(_){ }
}
function emitCardPlayed(card,{ side=null, stance='attack', source='runtime' }={}){
  if(!card || card._playedEventEmitted) return;
  card._playedEventEmitted = true;
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('card:played',{
        id: card.id,
        name: card.name,
        type: card.type || 'unit',
        cost: card.cost || 0,
        stance: stance || card.stance || 'attack',
        side: side || getCardSide(card),
        source,
        deck: card.deck || null,
        tribe: card.tribe || null,
        combatStyle: card.combatStyle || null,
        keywords: Array.isArray(card.kw) ? card.kw.slice(0) : []
      });
    }
  }catch(_){ }
}
const addAnim=(n,c,d=400)=>null;
// (replaced below with sequenced version) original animateAttack removed to avoid duplicate const redeclaration
const animateDefense=id=>null;
function screenSlash(x,y,ang){
  emitVisualEvent('visual:screen-slash', {
    x: typeof x === 'number' ? x : null,
    y: typeof y === 'number' ? y : null,
    angle: typeof ang === 'number' ? ang : 0,
    source: 'screenSlash'
  });
  return null;
}
function screenParticle(n,x,y){return null}
function applyOnPlayRewards(side,card){
  if(!card||!card.onPlay)return;
  const info=card.onPlay;
  if(info.mana){
    if(side==='player'){
      const before=G.playerMana;
      G.playerMana=Math.min(G.playerMana+info.mana,G.playerManaCap);
      const gained=G.playerMana-before;
      if(gained>0){
        emitCardMana(card, gained, 'player');
        try{playContextParticleOnCard(card,'mana',card);fxTextOnCard(card.id,`+${gained} mana`,'buff');}catch(_){ }
        sfx('mana');
        log(`${card.name} canalizou ${gained} de mana.`);
        playAbilityCue('mana',card);
      }
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+info.mana,G.aiManaCap);
      if(G.aiMana>before){
        emitCardMana(card, G.aiMana-before, 'ai');
        try{playContextParticleOnCard(card,'mana',card);}catch(_){ }
        sfx('mana');
        log(`O inimigo canalizou energia com ${card.name}.`);
        playAbilityCue('mana',card);
      }
    }
  }
  if(info.draw){
    const amount=Math.max(1,info.draw|0);
    const res=draw(side,amount);
    sfx('reward');
    log(`${card.name} inspirou ${amount} carta${amount>1?'s':''}.`);
    playAbilityCue('draw',card);
    if(res&&typeof res.then==='function'){res.then(()=>{try{renderAll();}catch(_){ }});}
  }
}
function showEncounterBanner(name,type='enemy'){
  // Revert: show centered overlay banner
  try{ const board=document.getElementById('aiBoard'); const old=board&&board.querySelector('.board-banner'); if(old) old.remove(); }catch(_){ }
  const b=document.getElementById('encounterBanner');
  if(!b) return;
  emitVisualEvent('visual:banner', {
    kind: type || 'enemy',
    title: name || 'Inimigo',
    subtitle: '',
    source: 'showEncounterBanner'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  b.textContent=name;
  b.className=type+' show';
  setTimeout(()=>b.classList.remove('show'),1600);
}
// Rich intro banner for story mode with round and deck title
function showEncounterIntro({ name, round, kind, deckKey }){
  const b = document.getElementById('encounterBanner');
  if(!b){ return; }
  const deckTitle = DECK_TITLES[deckKey] || '';
  const sub = [];
  if(typeof round === 'number' && round > 0) sub.push(`Round ${round}`);
  if(deckTitle) sub.push(deckTitle);
  if(kind === 'boss') sub.push('Chefão');
  emitVisualEvent('visual:banner', {
    kind: kind || 'enemy',
    title: name || 'Inimigo',
    subtitle: sub.join(' - '),
    deck: deckKey || null,
    source: 'showEncounterIntro'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  b.innerHTML = `<div class=\"enc-title\">${name||'Inimigo'}</div>${sub.length?`<div class=\\\"enc-sub\\\">${sub.join(' — ')}</div>`:''}`;
  b.className = (kind||'enemy') + ' show';
  setTimeout(()=>b.classList.remove('show'), 1700);
}
function encounterTransition(cb){const t=document.getElementById('encounterTransition');if(!t){cb();return;}t.classList.add('show');setTimeout(()=>{cb();setTimeout(()=>t.classList.remove('show'),400);},400)}
// Simple victory modal for story mode
function showVictoryBanner(enemyName,onContinue){
  const banner = document.getElementById('encounterBanner');
  if(!banner){
    onContinue?.();
    return;
  }
  const subtitle = enemyName ? `Você derrotou ${enemyName}.` : 'Inimigo derrotado.';
  emitVisualEvent('visual:banner', {
    kind: 'victory',
    title: 'Vitoria!',
    subtitle,
    source: 'showVictoryBanner'
  });
  if(!shouldUseLegacyVisualFallback()){
    setTimeout(() => { onContinue?.(); }, 1700);
    return;
  }
  banner.innerHTML = `<div class="enc-title">Vitória!</div><div class="enc-sub">${subtitle}</div>`;
  banner.className = 'victory show';
  try{ sfx('reward'); }catch(_){ }
  setTimeout(() => {
    banner.classList.remove('show');
    onContinue?.();
  }, 1700);
}
function particleOnCard(cid,n){
  const id = typeof cid === 'string' ? cid : (cid && cid.id ? cid.id : null);
  if(!id) return null;
  emitVisualEvent('visual:card-context', { id, context: n || 'attack', source: 'particleOnCard' });
  return null;
}
function particleOnFace(side,n,options={}){
  if(!side) return null;
  emitVisualEvent('visual:face-context', { side, context: n || 'face', source: 'particleOnFace' });
  return null;
}
function fxTextOnCard(cid,text,cls){
  const n=document.querySelector(`.card[data-id="${cid}"]`);
  if(!n)return;
  const card = typeof byId === 'function' ? byId(cid) : null;
  emitVisualEvent('visual:text-float', {
    id: cid,
    text: text || '',
    cls: cls || '',
    side: card ? getCardSide(card) : null,
    deck: card && card.deck ? card.deck : null,
    tribe: card && card.tribe ? card.tribe : null,
    combatStyle: card && card.combatStyle ? card.combatStyle : null,
    source: 'fxTextOnCard'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  const r=n.getBoundingClientRect();
  const fx=document.createElement('div');
  fx.className='fx-float '+(cls||'');
  fx.textContent=text;
  fx.style.left=(r.left+r.width/2)+'px';
  fx.style.top=(r.top+r.height/2)+'px';
  document.body.appendChild(fx);
  setTimeout(()=>fx.remove(),950);
}

function updateDirectAttackHint(){
  const board=document.getElementById('aiBoard');
  if(!board) return;
  let hint=document.getElementById('directAttackHint');
  if(!hint){
    hint=document.createElement('button');
    hint.id='directAttackHint';
    hint.type='button';
    hint.className='direct-attack-hint';
    hint.innerHTML = '<div class="label"><span class="sword">⚔️</span> ATACAR DIRETO <span class="sword">⚔️</span></div>';
    hint.addEventListener('click',()=>{
      // Require an explicitly selected attacker; never auto-pick leftmost
      if(validateChosen() && G.chosen && G.chosen.canAttack){
        attackFace(G.chosen,'ai');
      }
    });
    board.appendChild(hint);
  }
  // Show hint if player's turn, has at least one ready attacker, enemy board empty, and no guard
  const yourTurn = (G.current==='player');
  const hasAttacker = G.playerBoard && G.playerBoard.some(c=>c&&c.canAttack&&c.stance!=='defense');
  const enemyEmpty = (G.aiBoard && G.aiBoard.length===0);
  const noGuard = !hasGuard(G.aiBoard);
  const shouldShow = yourTurn && hasAttacker && enemyEmpty && noGuard && G.chosen && G.chosen.canAttack && G.chosen.stance!=='defense';
  hint.classList.toggle('show', shouldShow);
}
function applyKillRewards(attacker,target){
  if(!attacker||!target) return;
  const onPlayerBoard=G.playerBoard.includes(attacker);
  const onAiBoard=G.aiBoard.includes(attacker);
  const side=onPlayerBoard?'player':onAiBoard?'ai':null;
  if(!side) return;
  let manaGain=0;
  let cardMana=0;
  if(attacker.onKill&&attacker.onKill.mana){manaGain+=attacker.onKill.mana;cardMana=attacker.onKill.mana;}
  const drawGain=attacker.onKill&&attacker.onKill.draw?attacker.onKill.draw:0;
  let storyMana=0;
  if(side==='player'&&G.mode==='story'&&G.story&&G.story.bonuses&&G.story.bonuses.killMana){storyMana=G.story.bonuses.killMana;manaGain+=storyMana;}
  if(manaGain>0){
    if(side==='player'){
      const before=G.playerMana;
      G.playerMana=Math.min(G.playerMana+manaGain,G.playerManaCap);
      const gained=G.playerMana-before;
      if(gained>0){emitCardMana(attacker, gained, 'player');try{playContextParticleOnCard(attacker,'mana',attacker);fxTextOnCard(attacker.id,`+${gained} mana`,'buff');}catch(_){ }sfx('mana');playAbilityCue('mana',attacker);}
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+manaGain,G.aiManaCap);
      if(G.aiMana>before){emitCardMana(attacker, G.aiMana-before, 'ai');try{playContextParticleOnCard(attacker,'mana',attacker);}catch(_){ }sfx('mana');playAbilityCue('mana',attacker);}
    }
  }
  if(drawGain){
    const amount=Math.max(1,drawGain|0);
    const res=draw(side,amount);
    sfx('reward');
    playAbilityCue('draw',attacker);
    log(`${attacker.name} saqueou ${amount} carta${amount>1?'s':''} após derrotar ${target.name}.`);
    if(res&&typeof res.then==='function'){res.then(()=>{try{renderAll();}catch(_){ }});}
  }
  if(cardMana){log(`⚡ ${attacker.name} drenou energia de ${target.name}.`);}
  if(storyMana){log(`🪘 Tambor dos Conquistadores: +${storyMana} mana por eliminação!`);}
}
const ATTACK_FX_BY_CLASS={tank:'heavy',dps:'flame',support:'mystic',control:'storm'};
const ATTACK_FX_RULES=[
  {test:/totem/,fx:'totem'},
  {test:/fogo|chama|chamas|ardent|forja|brasas|inferno/,fx:'flame'},
  {test:/tempest|raio|trov|maelstrom|tempes|tempes|storm/,fx:'storm'},
  {test:/gelo|neve|artic|ártico|frio|geada|inverno|glacial/,fx:'frost'},
  {test:/serpente|venen|toxin|acido|ácido|tox|escama/,fx:'poison'},
  {test:/mar|onda|mare|maré|oceano|kraken|pesc|agu|água/,fx:'tidal'},
  {test:/espirit|mistic|runa|arcano|converg|mana|etereo/,fx:'mystic'},
  {test:/urso|lobo|fera|raposa|felin|garra|garou|javali|falca|lince|alce/,fx:'feral'}
];
const ATTACK_SFX_VARIANT={flame:'flame',storm:'storm',feral:'feral',mystic:'mystic',heavy:'heavy',totem:'totem',frost:'storm',poison:'mystic',tidal:'storm',attack:'heavy'};
const FX_THEME_PROFILE={
  attack:{attack:'spark-burst',face:'spark-burst',buff:'electric-burst',heal:'heal-sheet',mana:'electric-aura',summon:'spark-burst',death:'blood-splat',explosion:'fire-sparks'},
  heavy:{attack:'fire-arrow',face:'fire-sparks',buff:'fire-spell',heal:'heal-sheet',mana:'fire-spell',summon:'fire-spell',death:'blood-splat',explosion:'fire-sparks'},
  flame:{attack:'fire-sparks',face:'fire-ball',buff:'fire-spell',heal:'heal-sheet',mana:'fire-spell',summon:'fire-spell',death:'blood-splat',explosion:'fire-sparks'},
  storm:{attack:'spark-rain',face:'electric-burst',buff:'electric-aura',heal:'electric-aura',mana:'electric-aura',summon:'electric-burst',death:'blood-splat',explosion:'electric-burst'},
  frost:{attack:'water-arrow',face:'water-vortex',buff:'water-spell',heal:'water-ball',mana:'water-spell',summon:'water-spell',death:'blood-splat',explosion:'water-vortex'},
  poison:{attack:'smoke-burst',face:'smoke-burst',buff:'smoke-burst',heal:'heal-sheet',mana:'smoke-burst',summon:'smoke-burst',death:'blood-splat',explosion:'smoke-burst'},
  tidal:{attack:'water-ball',face:'water-vortex',buff:'water-spell',heal:'water-ball',mana:'water-spell',summon:'water-vortex',death:'blood-splat',explosion:'water-vortex'},
  mystic:{attack:'electric-burst',face:'electric-aura',buff:'electric-aura',heal:'heal-sheet',mana:'electric-aura',summon:'electric-burst',death:'blood-splat',explosion:'electric-burst'},
  feral:{attack:'leaf-swarm',face:'leaf-swarm',buff:'sakura-burst',heal:'heal-sheet',mana:'leaf-swarm',summon:'leaf-swarm',death:'blood-splat',explosion:'leaf-swarm'},
  totem:{attack:'sakura-burst',face:'sakura-burst',buff:'sakura-burst',heal:'heal-sheet',mana:'electric-aura',summon:'sakura-burst',death:'blood-splat',explosion:'sakura-burst'}
};
const FX_CONTEXT_SCALE={attack:0.88, face:0.96, buff:0.82, heal:0.9, mana:0.84, summon:0.92, death:0.92, explosion:0.96};
const FX_CONTEXT_BURST={
  storm:{attack:['electric-burst'],face:['spark-burst']},
  flame:{attack:['spark-burst'],face:['fire-sparks']},
  poison:{attack:['blood-splat'],buff:['smoke-burst']},
  tidal:{attack:['water-arrow'],face:['water-ball']},
  mystic:{buff:['electric-burst'],mana:['electric-burst']},
  feral:{attack:['spark-burst'],summon:['sakura-burst']},
  totem:{buff:['electric-aura'],summon:['electric-aura']}
};
const FX_DECK_PROFILE={
  vikings:{
    scale:{attack:0.96,face:1.02,summon:0.94,explosion:1.04},
    burst:{heavy:{attack:['fire-sparks'],face:['spark-burst']},flame:{attack:['fire-arrow']}}
  },
  pescadores:{
    scale:{attack:0.92,face:1.02,heal:0.96,mana:0.9,summon:0.96},
    burst:{tidal:{attack:['water-arrow','spark-burst'],face:['water-ball']},frost:{attack:['water-ball']}}
  },
  floresta:{
    scale:{attack:0.94,buff:0.9,summon:1.02,heal:0.94},
    burst:{feral:{attack:['sakura-burst'],buff:['leaf-swarm'],summon:['spark-burst']}}
  },
  animais:{
    scale:{attack:1,face:0.98,summon:0.98,death:0.96},
    burst:{feral:{attack:['spark-burst','leaf-swarm'],face:['spark-burst']},heavy:{attack:['leaf-swarm']}}
  }
};
// Tunable combat sequencing constants
const ATTACK_SEQUENCE_DELAY = 320; // ms between initial strike and counter resolution
const TARGET_HIT_ANIM_DELAY = 180; // ms after lunge starts to begin target hit shake
const DEBUG_COMBAT_SEQUENCE = false;
const BURN_DESTROY_DURATION = 2200;
const animateAttack=(aId,tId)=>{
  const a=nodeById(aId),t=tId?nodeById(tId):null;
  if(a){
    const ar = a.getBoundingClientRect();
    const tr = t ? t.getBoundingClientRect() : { left: ar.left + ar.width + 60, top: ar.top + ar.height * 0.5, width:0, height:0 };
    const ax = ar.left + ar.width / 2;
    const ay = ar.top + ar.height / 2;
    const tx = tr.left + tr.width / 2;
    const ty = tr.top + tr.height / 2;
    const dx = tx - ax;
    const dy = ty - ay;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    a.style.transition = 'transform .13s ease-out';
    a.style.transform = `translate(${-ux * 16}px,${-uy * 16}px) scale(.98)`;
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        a.style.transition = 'transform .18s cubic-bezier(.08,.9,.2,1.18)';
        a.style.transform = `translate(${ux * 40}px,${uy * 40}px) scale(1.03)`;
        setTimeout(()=>{
          a.classList.add('attack-impact');
          setTimeout(()=>{ try{ a.classList.remove('attack-impact'); }catch(_){ } }, 220);
          a.style.transition = 'transform .16s ease-out';
          a.style.transform = '';
        }, 170);
      });
    });
  }
  if(t) setTimeout(()=>addAnim(t,'hit-shake',350), TARGET_HIT_ANIM_DELAY);
};
function normalizeText(txt){return (txt||'').normalize('NFD').replace(/[^a-zA-Z0-9\s]/g,'').toLowerCase();}
function detectAttackFx(card){if(!card)return'attack';const nameNorm=normalizeText(card.name);const tribeNorm=normalizeText(card.tribe);if(card.type==='totem'||ATTACK_FX_RULES[0].test.test(nameNorm))return'totem';for(const rule of ATTACK_FX_RULES){if(rule.test.test(nameNorm))return rule.fx;}if(tribeNorm.includes('animal')||tribeNorm.includes('fera'))return'feral';if(tribeNorm.includes('pesc')||tribeNorm.includes('mar')||tribeNorm.includes('oceano'))return'tidal';if(tribeNorm.includes('floresta')||tribeNorm.includes('bosque'))return'feral';if(tribeNorm.includes('converg'))return'mystic';if(tribeNorm.includes('viking'))return'heavy';const cls=card.classe&&card.classe.toLowerCase();if(cls&&ATTACK_FX_BY_CLASS[cls])return ATTACK_FX_BY_CLASS[cls];return'attack';}
function detectFxDeck(card){
  if(!card) return '';
  const deck=(card.deck||'').toLowerCase();
  if(FX_DECK_PROFILE[deck]) return deck;
  const tribe=normalizeText(card.tribe);
  if(tribe.includes('viking')) return 'vikings';
  if(tribe.includes('pesc')||tribe.includes('fiorde')||tribe.includes('oceano')) return 'pescadores';
  if(tribe.includes('floresta')||tribe.includes('bosque')) return 'floresta';
  if(tribe.includes('animal')||tribe.includes('fera')) return 'animais';
  return '';
}
function resolveCardFx(card,context='attack'){
  const theme=detectAttackFx(card);
  const profile=FX_THEME_PROFILE[theme]||FX_THEME_PROFILE.attack;
  const deck=detectFxDeck(card);
  const deckProfile=FX_DECK_PROFILE[deck]||null;
  const baseScale=FX_CONTEXT_SCALE[context] || 0.85;
  const deckScale=(deckProfile&&deckProfile.scale&&deckProfile.scale[context]) || 1;
  return { theme, deck, key: profile[context] || profile.attack || 'spark-burst', scale: baseScale * deckScale };
}
function deathVisualFor(style){
  if(style==='flame') return 'damage-burn';
  if(style==='storm' || style==='mystic') return 'damage-arcane';
  if(style==='heavy' || style==='feral') return 'damage-cut';
  return 'damage-impact';
}
function burnEase(raw){
  if(raw < 0.16) return raw * raw * 2.7;
  if(raw < 0.78) return 0.045 + (raw - 0.16) * 1.34;
  const tail = (raw - 0.78) / 0.22;
  return 0.94 + tail * tail * 0.06;
}
function burnClip(eased, wobble=0){
  const front = eased <= 0.12 ? 0 : ((eased - 0.12) / 0.88);
  const pct = Math.max(0, Math.min(100, front * 100));
  const leftA = Math.max(0, Math.min(100, pct - 4 + wobble));
  const leftB = Math.max(0, Math.min(100, pct + 3 - wobble * .45));
  const rightA = Math.max(0, Math.min(100, pct + 5 - wobble * .7));
  const rightB = Math.max(0, Math.min(100, pct - 2 + wobble * .35));
  return `polygon(0 ${leftA}%,18% ${leftB}%,36% ${rightA}%,52% ${leftA}%,68% ${rightB}%,84% ${leftB}%,100% ${rightA}%,100% 100%,0 100%)`;
}
function spawnFireDissolve(card){
  const node = nodeById(card && card.id);
  if(!node) return;
  node.classList.add('is-dying-hidden');
  const r = node.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'burn-layer';
  layer.style.left = `${r.left}px`;
  layer.style.top = `${r.top}px`;
  layer.style.width = `${r.width}px`;
  layer.style.height = `${r.height}px`;
  const cloneWrap = document.createElement('div');
  cloneWrap.className = 'burn-card-clone';
  const clone = node.cloneNode(true);
  clone.style.width = '100%';
  clone.style.height = '100%';
  clone.style.margin = '0';
  cloneWrap.appendChild(clone);
  const bloom = document.createElement('div');
  bloom.className = 'burn-bloom';
  const core = document.createElement('div');
  core.className = 'burn-core';
  const ash = document.createElement('div');
  ash.className = 'burn-ash';
  layer.appendChild(cloneWrap);
  layer.appendChild(bloom);
  layer.appendChild(core);
  layer.appendChild(ash);
  document.body.appendChild(layer);
  const start = performance.now();
  let lastEmber = start;
  const duration = BURN_DESTROY_DURATION;
  const spawnEmber = (eased) => {
    const ember = document.createElement('span');
    ember.className = 'ember-particle';
    const edgeY = Math.max(0.08, Math.min(0.96, eased));
    ember.style.left = `${r.left + (r.width * (0.16 + Math.random() * 0.68))}px`;
    ember.style.top = `${r.top + (r.height * edgeY)}px`;
    ember.style.setProperty('--dx', `${(-22 + Math.random() * 44).toFixed(1)}px`);
    ember.style.setProperty('--dy', `${(-44 - Math.random() * 56).toFixed(1)}px`);
    document.body.appendChild(ember);
    setTimeout(()=>{ try{ ember.remove(); }catch(_){ } }, 1050);
  };
  const step = now => {
    const raw = Math.min((now - start) / duration, 1);
    const eased = Math.min(1, burnEase(raw));
    const wobble = Math.sin(now * 0.018) * 3.8;
    const edgePct = `${Math.max(2, Math.min(96, eased * 100))}%`;
    cloneWrap.style.clipPath = burnClip(eased, wobble);
    const fade = eased < 0.82 ? 1 : Math.max(0, 1 - Math.pow((eased - 0.82) / 0.18, 1.18));
    cloneWrap.style.opacity = `${fade}`;
    cloneWrap.style.filter = `brightness(${1.12 - eased * 0.28}) saturate(${1.18 - eased * 0.32})`;
    bloom.style.setProperty('--edge-y', edgePct);
    core.style.setProperty('--edge-y', edgePct);
    ash.style.opacity = `${Math.max(0, Math.min(.5, (eased - 0.38) * 1.15))}`;
    bloom.style.opacity = `${Math.max(0, 1 - Math.abs(eased - 0.46) * 2.05)}`;
    core.style.opacity = `${Math.max(0, 1 - Math.abs(eased - 0.38) * 2.3)}`;
    if(now - lastEmber > 55 && eased > 0.04 && eased < 0.97){
      lastEmber = now;
      spawnEmber(eased);
      if(Math.random() > 0.5) spawnEmber(Math.min(.98, eased + Math.random() * .06));
    }
    if(raw < 1){
      requestAnimationFrame(step);
      return;
    }
    try{ node.classList.remove('is-dying-hidden'); }catch(_){ }
    try{ layer.remove(); }catch(_){ }
  };
  requestAnimationFrame(step);
}
function markCardDamaged(target, source){
  if(!target) return;
  target._lastDamageStyle = (source && source.combatStyle) || detectAttackFx(source) || 'attack';
}
function triggerDeathVisual(card){
  const node = card && nodeById(card.id);
  if(!node) return;
  emitVisualEvent('visual:death-burn', {
    id: card && card.id ? card.id : null,
    name: card && card.name ? card.name : null,
    side: card ? getCardSide(card) : null,
    deck: card && card.deck ? card.deck : null,
    tribe: card && card.tribe ? card.tribe : null,
    combatStyle: card && card.combatStyle ? card.combatStyle : null,
    source: 'triggerDeathVisual'
  });
  playBurnDestroySfx();
  spawnFireDissolve(card);
}
function playContextParticleOnCard(cardOrId, context='attack', sourceCard=null, options={}){
  const card = typeof cardOrId === 'string'
    ? { id: cardOrId }
    : cardOrId;
  const id = card && card.id ? card.id : null;
  if(!id) return null;
  emitVisualEvent('visual:card-context', {
    id,
    context: context || 'attack',
    sourceId: sourceCard && sourceCard.id ? sourceCard.id : null,
    sourceType: sourceCard && sourceCard.type ? sourceCard.type : null,
    combatStyle: sourceCard && sourceCard.combatStyle ? sourceCard.combatStyle : null,
    deck: (sourceCard && sourceCard.deck) || (card && card.deck) || null,
    scale: options && options.scale ? options.scale : null,
    side: card && card.id && typeof getCardSide === 'function' ? getCardSide(card) : null,
    source: 'playContextParticleOnCard'
  });
  return null;
}
function playContextParticleOnFace(side, context='face', sourceCard=null, options={}){
  if(!side) return null;
  emitVisualEvent('visual:face-context', {
    side,
    context: context || 'face',
    sourceId: sourceCard && sourceCard.id ? sourceCard.id : null,
    sourceType: sourceCard && sourceCard.type ? sourceCard.type : null,
    combatStyle: sourceCard && sourceCard.combatStyle ? sourceCard.combatStyle : null,
    deck: sourceCard && sourceCard.deck ? sourceCard.deck : null,
    scale: options && options.scale ? options.scale : null,
    source: 'playContextParticleOnFace'
  });
  return null;
}
function attackCard(attacker,target){
  if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;
  hideAttackArrow();
  const fx=detectAttackFx(attacker);
  const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;
  sfx('attack',sfxVariant);
  playCharacterCue(attacker,'attack');
  const a=nodeById(attacker.id),t=nodeById(target.id);
  if(a&&t){const ar=a.getBoundingClientRect(),tr=t.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,15);}
  animateAttack(attacker.id,target.id);
  if(target.stance==='defense') setTimeout(()=>animateDefense(target.id), TARGET_HIT_ANIM_DELAY);
  playContextParticleOnCard(target,'attack',attacker);

  const preAttackerHP = Math.max(0, attacker.hp);
  const preTargetHP = Math.max(0, target.hp);
  const attackerDamage = Math.max(0, attacker.atk);
  const counterDamage = target.stance==='defense' ? 0 : Math.max(0, target.atk);
  const overflow = Math.max(0, attackerDamage - preTargetHP);

  // Step 1: target takes damage
  markCardDamaged(target, attacker);
  damageMinion(target, attackerDamage, { defer:true });
  if(attackerDamage > 0) fxTextOnCard(target.id, `-${attackerDamage}`, 'dmg');
  if(preTargetHP > target.hp && attacker.onDealDamagePermanentAtk){
    applyCardBuff(attacker,{atk:attacker.onDealDamagePermanentAtk,icon:attacker.emoji||'🪓',sourceId:attacker.id,sourceType:'dealDamage',permanent:true});
  }
  if(preTargetHP > target.hp && target.hp < preTargetHP && attacker.onAttackDamagedGainAtk){
    applyTurnBuff(attacker,{atk:attacker.onAttackDamagedGainAtk,icon:attacker.emoji||'🐺',sourceId:attacker.id});
  }
  playCharacterCue(target,'hit');
  sfx('hit');
  if(DEBUG_COMBAT_SEQUENCE) log(`[SEQ] ${attacker.name} (${attackerDamage} ATK) hit ${target.name} (${preTargetHP} HP) → ${target.hp} HP, overflow: ${overflow}`);

  // Step 2 (slight delay): attacker takes counter-damage
  setTimeout(()=>{
    const shouldCounter = counterDamage > 0;
    if(shouldCounter){
      markCardDamaged(attacker, target);
      damageMinion(attacker, counterDamage, { defer:true });
      fxTextOnCard(attacker.id, `-${counterDamage}`, 'reflect');
      if(counterDamage>0) playContextParticleOnCard(attacker,'attack',target,{scale:0.76});
      if(DEBUG_COMBAT_SEQUENCE) log(`[SEQ] ${target.name} (${counterDamage} ATK) retaliated ${attacker.name} → ${attacker.hp} HP`);
    }else if(DEBUG_COMBAT_SEQUENCE){
      log(`[SEQ] ${target.name} did not counter (stance=${target.stance})`);
    }
    
    // Overflow to face after resolving both sides (if target died)
    if(overflow>0 && target.hp<=0){
      const isP = G.playerBoard.includes(attacker);
      sfx('overflow');
      const faceFx=fx||'attack';
      if(isP){
        G.aiHP=Math.max(0, G.aiHP-overflow);
        emitFaceDamaged('ai', overflow, attacker, { sourceType: 'overflow' });
        log(`${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`);
        playContextParticleOnFace('ai','face',attacker);
      }else{
        G.playerHP=Math.max(0, G.playerHP-overflow);
        emitFaceDamaged('player', overflow, attacker, { sourceType: 'overflow' });
        log(`${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`);
        playContextParticleOnFace('player','face',attacker);
      }
      checkWin();
    }

    const targetDied = target.hp<=0;
    const attackerSurvived = attacker.hp>0;
    if(targetDied){
      playCharacterCue(target,'death');
      if(attackerSurvived){
        applyKillRewards(attacker,target);
        if(attacker.onKillFaceDamage){
          if(G.playerBoard.includes(attacker)){
            G.aiHP=Math.max(0,G.aiHP-attacker.onKillFaceDamage);
            emitFaceDamaged('ai', attacker.onKillFaceDamage, attacker, { sourceType: 'killBonus' });
          }
          else{
            G.playerHP=Math.max(0,G.playerHP-attacker.onKillFaceDamage);
            emitFaceDamaged('player', attacker.onKillFaceDamage, attacker, { sourceType: 'killBonus' });
          }
        }
      }
    }else if(attackerSurvived && attacker.onCombatSurviveTempBuff){
      applyTurnBuff(attacker,{atk:attacker.onCombatSurviveTempBuff.atk||0,hp:attacker.onCombatSurviveTempBuff.hp||0,icon:attacker.emoji||'🪓',sourceId:attacker.id});
    }

    attacker.canAttack=false;
    if(attacker.drawOnAttackThisTurn && attacker.drawOnAttackTurn===G.turn){
      draw(G.playerBoard.includes(attacker)?'player':'ai',1);
      attacker.drawOnAttackThisTurn = 0;
    }
    log(`${attacker.name} atacou ${target.name}.`);
    // Now process deaths and re-render
    const hasPendingDeaths = checkDeaths();
    if(!hasPendingDeaths) renderAll();
    if(window.isMultiplayer&&G.current==='player'){
      NET.sendMove({type:'attack',attackerId:attacker.id,targetId:target.id});
    }
    G.chosen=null;
    updateTargetingUI();
    els.aBoard.classList.remove('face-can-attack');
  }, ATTACK_SEQUENCE_DELAY);
}
function attackFace(attacker,face){
  if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;
  hideAttackArrow();
  G.lastChosenId = attacker.id || null;
  const fx=detectAttackFx(attacker);
  const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;
  sfx('attack',sfxVariant);
  playCharacterCue(attacker,'attack');
  const a=nodeById(attacker.id);
  if(a){const ar=a.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,10);}
  animateAttack(attacker.id,null);
  playContextParticleOnFace(face,'face',attacker);
  const dmg=Math.max(0, attacker.atk);
  attacker.canAttack=false;
  if(attacker.drawOnAttackThisTurn && attacker.drawOnAttackTurn===G.turn){
    draw(G.playerBoard.includes(attacker)?'player':'ai',1);
    attacker.drawOnAttackThisTurn = 0;
  }
  if(face==='ai'){
    G.aiHP=Math.max(0, G.aiHP-dmg);
    emitFaceDamaged('ai', dmg, attacker, { sourceType: 'attack' });
    log(`${attacker.name} causou ${dmg} ao Inimigo!`);
    sfx('crit');
  }else{
    G.playerHP=Math.max(0, G.playerHP-dmg);
    emitFaceDamaged('player', dmg, attacker, { sourceType: 'attack' });
    log(`${attacker.name} causou ${dmg} a Você!`);
    sfx('hit');
  }
  checkWin();
  if(window.isMultiplayer&&G.current==='player'){
    NET.sendMove({type:'attackFace',attackerId:attacker.id});
  }
  G.chosen=null;
  updateTargetingUI();
  els.aBoard.classList.remove('face-can-attack');
  renderAll();
}
function damageMinion(m,amt,opts){
  if(!m||typeof amt!=='number')return;
  if(amt<0) amt=0;
  const newHP = m.hp - amt;
  m.hp = Math.max(0, Math.min(99, newHP));
  const side = getCardSide(m);
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('card:damaged', {
        id: m.id,
        name: m.name,
        side: side || null,
        amount: amt,
        hp: m.hp,
        maxHp: m.baseHp || m.hp,
        deferred: !!(opts && opts.defer)
      });
    }
  }catch(_){ }
  if(side) pulseMeter('hit', side);
  const defer = opts && opts.defer;
  if(m.hp<=0 && !defer) setTimeout(checkDeaths,10);
}
function finalizeDeadCards(side, deadCards){
  const board = side==='player' ? G.playerBoard : G.aiBoard;
  const discard = side==='player' ? G.playerDiscard : G.aiDiscard;
  deadCards.forEach(c => {
    const idx = board.findIndex(entry => entry && entry.id === c.id);
    if(idx >= 0) board.splice(idx,1);
  });
  deadCards.forEach(c => {
    resetCardState(c);
    delete c._dying;
    delete c._deathQueued;
  });
  discard.push(...deadCards);
  renderAll();
  if(els.discardCount) els.discardCount.textContent = G.playerDiscard.length;
}
function checkDeaths(){
  let queuedDeath = false;
  const deadA = G.aiBoard.filter(c=>c.hp<=0);
  if(deadA.length){
    G.aiBoard.filter(c=>c.hp>0).forEach(ally=>{ if(ally&&ally.onAllyDeathTempAtk) applyTurnBuff(ally,{atk:ally.onAllyDeathTempAtk,icon:ally.emoji||'🐻',sourceId:ally.id}); });
    deadA.forEach(c=>{
      if(c._deathQueued) return;
      c._deathQueued = true;
      c._dying = true;
      queuedDeath = true;
      triggerDeathVisual(c);
      playContextParticleOnCard(c,'death',c);
    });
    log('Uma criatura inimiga caiu.');
    setTimeout(()=>finalizeDeadCards('ai', deadA.filter(c => c && c._deathQueued)), BURN_DESTROY_DURATION + 60);
  }

  const deadP = G.playerBoard.filter(c=>c.hp<=0);
  if(deadP.length){
    deadP.forEach(c=>{ if(c&&c.deathNextTurnMana){ G.playerPendingMana=(G.playerPendingMana||0)+c.deathNextTurnMana; } });
    G.playerBoard.filter(c=>c.hp>0).forEach(ally=>{ if(ally&&ally.onAllyDeathTempAtk) applyTurnBuff(ally,{atk:ally.onAllyDeathTempAtk,icon:ally.emoji||'🐻',sourceId:ally.id}); });
    deadP.forEach(c=>{
      if(c._deathQueued) return;
      c._deathQueued = true;
      c._dying = true;
      queuedDeath = true;
      triggerDeathVisual(c);
      playContextParticleOnCard(c,'death',c);
    });
    log('Sua criatura caiu.');
    setTimeout(()=>finalizeDeadCards('player', deadP.filter(c => c && c._deathQueued)), BURN_DESTROY_DURATION + 60);
  }

  if(els.discardCount) els.discardCount.textContent = G.playerDiscard.length;
  return queuedDeath;
}
async function aiTurn(){
  const skill=G.aiSkill||1;
  const playable=G.aiHand.filter(c=>c.cost<=G.aiMana);
  if(skill===2){playable.sort((a,b)=>(b.atk+b.hp)-(a.atk+a.hp))}
  else if(skill===1){playable.sort((a,b)=>b.cost-a.cost)}
  else{playable.sort(()=>Math.random()-0.5)}

  // play cards sequentially, awaiting animations
  while(playable.length && G.aiMana>0){
    const c = skill===0 ? playable.pop() : playable.shift();
    const i = G.aiHand.findIndex(x=>x.id===c.id);
    if(i>-1 && c.cost<=G.aiMana){
      if(c.type==='unit' && G.aiBoard.length>=5) continue;
      G.aiHand.splice(i,1);
      getTurnState('ai').played += 1;
      if(c.type==='spell'){
        G.aiMana -= c.cost;
        castSpell('ai',c);
      }else{
        const stance = (c.hp>=c.atk+1)?(Math.random()<.7?'defense':'attack'):(Math.random()<.3?'defense':'attack');
        const res = summon('ai',c,stance);
        if(res && typeof res.then==='function'){
          renderAll();
          G.aiMana -= c.cost;
          await res;
        }else{
          G.aiMana -= c.cost;
        }
      }
      // small gap between plays for clarity
      await new Promise(r=>setTimeout(r,120));
    }
  }

  renderAll();
  const attackers=G.aiBoard.filter(c=>c.canAttack&&c.stance!=='defense');
  function next(){
    if(!attackers.length){discardHand('ai');G.current='player';newTurn(false,'ai');return}
    const a=attackers.shift();
    const legal=G.playerBoard.filter(x=>legalTarget('player',x));
    if(legal.length){let target;if(skill===2){target=legal.reduce((p,c)=>c.hp<p.hp?c:p,legal[0])}else{target=rand(legal)}attackCard(a,target)}else{attackFace(a,'player')}
    setTimeout(next,500);
  }
  setTimeout(next,500);
}
function fireworks(win){
  emitVisualEvent('visual:celebration', {
    kind: win ? 'victory' : 'defeat',
    source: 'fireworks'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  const b=document.createElement('div');
  b.className='boom';
  b.style.left='50%';
  b.style.top='50%';
  b.style.background=`radial-gradient(circle at 50% 50%, ${win?'#8bf5a2':'#ff8a8a'}, transparent)`;
  document.body.appendChild(b);
  setTimeout(()=>b.remove(),650);
} 
function buildEndSummary(win){
  const story = G.story || null;
  const metrics = story && story.metrics ? story.metrics : null;
  if(metrics){
    return [
      { label:'Resultado', value: win ? 'Vitória' : 'Derrota', tone: win ? 'win' : 'loss' },
      { label:'Andares', value: String(story.round || 0) },
      { label:'Elites', value: String(metrics.elites || 0) },
      { label:'Ouro', value: String(metrics.goldEarned || story.gold || 0) },
      { label:'Relíquias', value: String((story.relics || []).length) },
      { label:'Totens', value: String((story.totems || []).length) }
    ];
  }
  return [
    { label:'Resultado', value: win ? 'Vitória' : 'Derrota', tone: win ? 'win' : 'loss' },
    { label:'Turnos', value: String(G.turn || 0) },
    { label:'HP Final', value: `${Math.max(0,G.playerHP||0)}` },
    { label:'Cartas no Deck', value: String((G.playerDeck || []).length) },
    { label:'Descartes', value: String((G.playerDiscard || []).length) },
    { label:'Deck', value: String(G.playerDeckChoice || 'padrao').toUpperCase() }
  ];
}
function renderEndSummary(win){
  if(!els.endStats) return;
  const rows = buildEndSummary(win);
  els.endStats.innerHTML = '';
  rows.forEach(row => {
    const item = document.createElement('div');
    item.className = 'end-stat';
    const valueTone = row.tone === 'loss' ? ' is-loss' : (row.tone === 'win' ? ' is-win' : '');
    item.innerHTML = `<div class="end-stat-label">${row.label}</div><div class="end-stat-value${valueTone}">${row.value}</div>`;
    els.endStats.appendChild(item);
  });
}
function endGame(win){
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('battle:end', {
        win: !!win,
        mode: G && G.mode ? G.mode : 'solo'
      });
    }
  }catch(_){ }
  stopMenuMusic();
  els.endMsg.textContent=win?'Vitória!':'Fracasso!';
  els.endMsg.style.color=win?'#8bf5a2':'#ff8a8a';
  els.endSub.textContent=win?'Resumo da run concluída.':'Resumo da sua run até a derrota.';
  renderEndSummary(win);
  els.endOverlay.classList.add('show');
  emitSystemOverlay(true, 'endOverlay');
  setAriaHidden(els.endOverlay,false);
  focusDialog(els.endOverlay);
  setTimeout(()=>fireworks(win),1000);
} 
const hideEndOverlay=()=>{if(!els.endOverlay)return;els.endOverlay.classList.remove('show');emitSystemOverlay(false, 'endOverlay');setAriaHidden(els.endOverlay,true)};
function pulseNode(node, cls, duration=420){
  if(!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  setTimeout(()=>{ try{ node.classList.remove(cls); }catch(_){ } }, duration);
}
function pulseMeter(kind, side='player'){
  emitVisualEvent('visual:meter-pulse', {
    kind: kind || 'hit',
    side: side || 'player',
    source: 'pulseMeter'
  });
  if(kind==='mana'){
    if(!shouldUseLegacyVisualFallback()) return;
    pulseNode(side==='player'?els.barMana:els.barAiMana,'meter-mana',320);
    return;
  }
  if(!shouldUseLegacyVisualFallback()) return;
  pulseNode(side==='player'?els.barPHP:els.barAHP, kind==='heal'?'meter-heal':'meter-hit', kind==='heal'?420:340);
}
function emphasizeBoard(side='player'){
  emitVisualEvent('visual:board-pulse', {
    side: side || 'player',
    source: 'emphasizeBoard'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  pulseNode(side==='player'?els.pBoard:els.aBoard,'turn-focus',1550);
}
function animateSpellCast(side='player'){
  const board = side==='player'?els.pBoard:els.aBoard;
  if(!board) return;
  const card = board.querySelector('.card:last-child');
  emitVisualEvent('visual:spell-cast', {
    side: side || 'player',
    id: card && card.dataset ? card.dataset.id : null,
    source: 'animateSpellCast'
  });
  if(shouldUseLegacyVisualFallback() && card) pulseNode(card,'spell-cast-pop',360);
  emphasizeBoard(side);
}
function animateTotemCast(){
  const items = document.querySelectorAll('#effectsHud .effect-item[data-type="totem"], .totem-slot');
  emitVisualEvent('visual:totem-cast', {
    source: 'animateTotemCast'
  });
  if(!shouldUseLegacyVisualFallback()) return;
  if(items.length){
    pulseNode(items[items.length-1],'totem-cast',420);
    pulseNode(items[items.length-1],'effect-pop',420);
  }
}

// Universal cleanup function for all in-game elements
function cleanupGameElements(){
  // Clear all dynamic game containers
  if(els.pHand) els.pHand.innerHTML = '';
  if(els.pBoard) els.pBoard.innerHTML = '';
  if(els.aBoard) els.aBoard.innerHTML = '';
  const totemBar = document.getElementById('totemBar');
  if(totemBar) totemBar.innerHTML = '';
  const effectsHud = document.getElementById('effectsHud');
  if(effectsHud) effectsHud.innerHTML = '';
  if(els.storyRunHud) els.storyRunHud.style.display = 'none';
  const directHint = document.getElementById('directAttackHint');
  if(directHint) directHint.remove();
  // Clear any floating elements
  document.querySelectorAll('.totem-fly, .floating-totem, .fx').forEach(el => el.remove());
}

function showRewardsModal(rewardOptions, onComplete){
  const modal = document.getElementById('rewardsModal');
  const grid = document.getElementById('rewardsChoices');
  const msg = document.getElementById('rewardsMsg');
  if(!modal || !grid) return onComplete?.();
  
  grid.innerHTML = '';
  msg.textContent = '';

  const rewardData = {
    'Nova carta': { icon: '🎴', desc: 'Adicione uma carta ao seu deck' },
    'Evoluir carta': { icon: '⬆️', desc: 'Evolua uma carta já existente' },
    'Ganhar Totem': { icon: '🗿', desc: 'Escolha um totem' },
    'Buff permanente': { icon: '✨', desc: 'Buff permanente em todas as cartas' },
    'Relíquia': { icon: '🔮', desc: 'Escolha uma relíquia poderosa' }
  };

  rewardOptions.forEach(reward => {
    const data = rewardData[reward] || { icon: '🎁', desc: reward };
    const option = document.createElement('div');
    option.className = 'reward-option';
    option.innerHTML = `
      <span class="reward-icon">${data.icon}</span>
      <div class="reward-name">${reward}</div>
      <div class="reward-desc">${data.desc}</div>
    `;
    option.onclick = () => {
      grid.querySelectorAll('.reward-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selectedReward = reward;
      msg.textContent = `Selecionado: ${reward}`;
      setTimeout(() => {
        closeModal(modal);
        handleRewardSelection(reward, () => {
          if(window.playSfx) window.playSfx('reward');
          onComplete?.();
        });
      }, 450);
    };
    grid.appendChild(option);
  });

  showModal(modal);
}

const REWARD_TOTEMS = [
  { name: 'Totem do Rugido', emoji: '🗿', desc: 'Ative: +1 ATK em um aliado', cost: 2, buffs: { atk: 1 } },
  { name: 'Totem do Escudo', emoji: '🛡️', desc: 'Ative: +1 HP em um aliado', cost: 2, buffs: { hp: 1 } },
  { name: 'Totem Cristalino', emoji: '🔮', desc: 'Ative: +1 ATK e +1 HP', cost: 3, buffs: { atk: 1, hp: 1 } }
];

function handleRewardSelection(rewardType, onDone){
  if(!G.story){
    onDone?.();
    return;
  }
  const fallback = msg => awardFallbackGold(onDone, msg);
  G.story.markRewardTaken(rewardType);
  switch(rewardType){
    case 'Nova carta':{
      const deckKey = G.playerDeckChoice || G.aiDeckChoice || 'vikings';
      const rarity = G.story.currentEncounter==='boss' ? 'epic' : (G.story.currentEncounter==='elite' ? 'rare' : 'common');
      const options = getRandomCardRewardOptions(deckKey, 4, rarity);
      if(!options.length){
        fallback('Nenhuma carta disponível. Recebe 10 ouro.');
        return;
      }
      openCardSelectionModal(options, card => {
        addRewardCardToStory(card);
        log(`🎴 Recompensa: ${card.name} adicionado ao deck!`);
        saveStoryProgress();
        onDone?.();
      }, () => fallback('Nenhuma seleção realizada. Recebe 10 ouro.'));
      break;
    }
    case 'Evoluir carta':{
      const candidates = (G.story.deck || []).filter(c => c && c.type==='unit');
      if(!candidates.length){
        fallback('Nenhuma carta para evoluir. Recebe 10 ouro.');
        return;
      }
      openEvolveCardModal(candidates, card => {
        const prevAtk = card.atk;
        const prevHp = card.hp;
        card.atk += 1;
        card.hp += 1;
        card.baseAtk = card.atk;
        card.baseHp = card.hp;
        log(`?? Recompensa: ${card.name} evoluiu para ${card.atk}/${card.hp}!`);
        showEventRewardOverlay(card, { title: 'Carta evoluida', subtitle: `${prevAtk}/${prevHp} -> ${card.atk}/${card.hp}` });
        saveStoryProgress();
        onDone?.();
      }, () => fallback('Nenhuma carta selecionada. Recebe 10 ouro.'));
      break;
    }
    case 'Ganhar Totem':{
      openTotemSelectionModal(REWARD_TOTEMS, optionData => {
        const totemEntry = createTotemRewardCard(optionData);
        addRewardCardToStory(totemEntry);
        log(`🗿 Recompensa: ${totemEntry.name} adicionado ao deck!`);
        saveStoryProgress();
        onDone?.();
      }, () => fallback('Nenhum totem selecionado. Recebe 10 ouro.'));
      break;
    }
    case 'Relíquia':{
      showRelicChoice(() => { saveStoryProgress(); onDone?.(); });
      break;
    }
    default:
      applyPermanentBuffReward();
      saveStoryProgress();
      onDone?.();
      break;
  }
}

function addRewardCardToStory(card){
  if(!card) return;
  const template = lookupCardTemplate(card.name);
  const hydrated = hydrateCardArt(card) || card;
  const entry = Object.assign({}, template || {}, hydrated);
  entry.id = entry.id || uid();
  if(!entry.deck) entry.deck = hydrated.deck || (template&&template.deck) || G.playerDeckChoice;
  entry.type = entry.type || 'unit';
  entry.text = entry.text || entry.desc || '';
  if(!entry.img && template && template.img) entry.img = template.img;
  if(!entry.icon && template && template.icon) entry.icon = template.icon;
  if(!entry.emoji && template && template.emoji) entry.emoji = template.emoji;
  if(!entry.icon && entry.deck && DECK_IMAGES[entry.deck] && DECK_IMAGES[entry.deck].length){
    entry.icon = DECK_IMAGES[entry.deck][0];
  }
  G.story.deck = G.story.deck || [];
  G.story.deck.push(entry);
  saveStoryProgress();
}

function applyStoryShopBonus(item){
  if(!item || !item.bonus || !G.story) return '';
  const notes = G.story.registerBonus(item.bonus, item);
  if(typeof updateGoldHUD === 'function') updateGoldHUD();
  saveStoryProgress();
  if(notes && typeof log === 'function'){
    log(`✨ ${item.name}: ${notes}`);
  }
  return notes;
}

function toStoryCard(entry,fallbackDeck){
  if(!entry) return null;
  const template = lookupCardTemplate(entry.name);
  const hydrated = hydrateCardArt(entry) || entry;
  const card = Object.assign({}, template || {}, hydrated);
  card.id = card.id || uid();
  card.deck = card.deck || entry.deck || fallbackDeck;
  card.type = card.type || entry.type || 'unit';
  if(!card.img && template && template.img) card.img = template.img;
  if(!card.icon && template && template.icon) card.icon = template.icon;
  if(!card.emoji && template && template.emoji) card.emoji = template.emoji;
  if(!card.icon && card.deck && DECK_IMAGES[card.deck] && DECK_IMAGES[card.deck].length){
    card.icon = DECK_IMAGES[card.deck][0];
  }
  applyClassDefaults(card, card.tribe || card.deck);
  ensureCardBase(card);
  return card;
}

try{
  window.G = G;
  window.addRewardCardToStory = addRewardCardToStory;
  window.applyStoryShopBonus = applyStoryShopBonus;
}catch(_){ }

function awardFallbackGold(onDone, message){
  log(message || 'Ganhou 10 ouro como alternativa.');
  G.story.gold += 10;
  if(typeof updateGoldHUD==='function') updateGoldHUD();
  saveStoryProgress();
  onDone?.();
}

function applyPermanentBuffReward(){
  if(!G.story) return;
  const buffType = (G.story.random ? G.story.random() : Math.random()) > 0.5 ? 'atk' : 'hp';
  G.story.bonuses.allyBuff[buffType] += 1;
  log(`✨ Recompensa: Todas as suas unidades ganham +1 ${buffType.toUpperCase()}!`);
}

function getRandomCardRewardOptions(deckKey, count=4, rarity='common'){
  const pool = (TEMPLATES[deckKey] || []).map(template => {
    const card = makeCard(template);
    card.deck = deckKey;
    const roll = G.story&&G.story.random ? G.story.random() : Math.random();
    const tier = rarity==='epic' ? (roll>0.4?'epic':'rare') : (rarity==='rare' ? (roll>0.6?'rare':'common') : 'common');
    card.rarity = tier;
    if(tier==='rare'){ card.atk += 1; card.hp += 1; }
    if(tier==='epic'){ card.atk += 2; card.hp += 2; }
    return card;
  });
  const chosen = [];
  const working = [...pool];
  while(chosen.length < count && working.length){
    const randv = G.story&&G.story.random ? G.story.random() : Math.random();
    const idx = Math.floor(randv * working.length);
    chosen.push(working.splice(idx, 1)[0]);
  }
  return chosen;
}

function openCardSelectionModal(cards, onSelect, onCancel){
  const modal = document.getElementById('cardSelectModal');
  const grid = document.getElementById('cardSelectGrid');
  if(!modal || !grid){ onCancel?.(); return; }
  const title = document.getElementById('cardSelectTitle');
  const subtitle = document.getElementById('cardSelectSubtitle');
  const cancelBtn = document.getElementById('cardSelectCancel');
  if(title) title.textContent = 'Nova carta';
  if(subtitle) subtitle.textContent = 'Escolha uma carta para adicionar ao deck:';
  grid.innerHTML = '';
  cards.forEach(card => {
    const option = document.createElement('div');
    option.className = 'selection-card';
    const cardNodeEl = cardNode(card, 'player');
    cardNodeEl.classList.add('selection-card-preview');
    option.appendChild(cardNodeEl);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'selection-card-btn btn';
    btn.textContent = 'Selecionar';
    option.appendChild(btn);
    const selectCard = () => {
      closeModal(modal);
      onSelect?.(card);
    };
    option.addEventListener('click', selectCard);
    btn.addEventListener('click', e => { e.stopPropagation(); selectCard(); });
    grid.appendChild(option);
  });
  if(cancelBtn) cancelBtn.onclick = () => { closeModal(modal); onCancel?.(); };
  showModal(modal);
}

function openTotemSelectionModal(options, onSelect, onCancel){
  const modal = document.getElementById('totemSelectModal');
  const grid = document.getElementById('totemSelectGrid');
  if(!modal || !grid){ onCancel?.(); return; }
  const title = document.getElementById('totemSelectTitle');
  const subtitle = document.getElementById('totemSelectSubtitle');
  const cancelBtn = document.getElementById('totemSelectCancel');
  if(title) title.textContent = 'Escolha um Totem';
  if(subtitle) subtitle.textContent = 'Selecione um totem e adicione ao seu deck:';
  grid.innerHTML = '';
  options.forEach(optionData => {
    const totemCard = createTotemRewardCard(optionData);
    const tile = document.createElement('div');
    tile.className = 'selection-card';
    const cardEl = cardNode(totemCard, 'player');
    cardEl.classList.add('selection-card-preview');
    tile.appendChild(cardEl);
    const desc = document.createElement('p');
    desc.className = 'sub';
    desc.textContent = optionData.desc;
    tile.appendChild(desc);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'selection-card-btn btn';
    btn.textContent = 'Selecionar';
    tile.appendChild(btn);
    const choose = () => {
      closeModal(modal);
      onSelect?.(optionData);
    };
    tile.addEventListener('click', choose);
    btn.addEventListener('click', e => { e.stopPropagation(); choose(); });
    grid.appendChild(tile);
  });
  if(cancelBtn) cancelBtn.onclick = () => { closeModal(modal); onCancel?.(); };
  showModal(modal);
}

function openEvolveCardModal(options, onSelect, onCancel){
  const modal = document.getElementById('evolveCardModal');
  const grid = document.getElementById('evolveCardGrid');
  if(!modal || !grid){ onCancel?.(); return; }
  const title = document.getElementById('evolveCardTitle');
  const subtitle = document.getElementById('evolveCardSubtitle');
  const cancelBtn = document.getElementById('evolveCardCancel');
  if(title) title.textContent = 'Evoluir carta';
  if(subtitle) subtitle.textContent = 'Escolha sua carta e ganhe +1/+1:';
  grid.innerHTML = '';
  options.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'selection-card';
    const cardEl = cardNode(card, 'player');
    cardEl.classList.add('selection-card-preview');
    tile.appendChild(cardEl);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'selection-card-btn btn';
    btn.textContent = 'Evoluir';
    tile.appendChild(btn);
    const pick = () => {
      closeModal(modal);
      onSelect?.(card);
    };
    tile.addEventListener('click', pick);
    btn.addEventListener('click', e => { e.stopPropagation(); pick(); });
    grid.appendChild(tile);
  });
  if(cancelBtn) cancelBtn.onclick = () => { closeModal(modal); onCancel?.(); };
  showModal(modal);
}

function createTotemRewardCard(option){
  return {
    name: option.name,
    emoji: option.emoji || '🗿',
    tribe: 'Totem',
    atk: 0,
    hp: 0,
    cost: option.cost || 2,
    desc: option.desc,
    text: option.desc,
    type: 'totem',
    deck: G.playerDeckChoice,
    buffs: option.buffs,
    icon: option.icon || option.emoji || '🗿',
    id: uid()
  };
}
const modalStack = [];
function syncModalStack(){
  modalStack.forEach((modal,idx)=>{
    if(!modal) return;
    modal.style.zIndex = String(4000 + idx * 20);
    const box = modal.querySelector('.box');
    if(box) box.style.zIndex = String(4001 + idx * 20);
  });
}

function showModal(modal){
  if(!modal) return;
  const existingIdx = modalStack.indexOf(modal);
  if(existingIdx >= 0) modalStack.splice(existingIdx,1);
  modalStack.push(modal);
  syncModalStack();
  modal.classList.add('show');
  modal.style.display = 'grid';
  if(window.setAriaHidden) setAriaHidden(modal, false);
  else modal.setAttribute('aria-hidden', 'false');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      if(modal.id === 'storyMapModal') window.FFFEvents.emit('campaign:map:open', { id: modal.id });
      if(modal.id === 'eventModal') window.FFFEvents.emit('campaign:event:open', { id: modal.id });
      if(['rewardsModal','cardSelectModal','totemSelectModal','evolveCardModal','relicModal','removalModal','restModal'].includes(modal.id)){
        window.FFFEvents.emit('campaign:reward:open', { id: modal.id });
      }
    }
  }catch(_){ }
}

function closeModal(modal){
  if(!modal) return;
  modal.classList.remove('show');
  const idx = modalStack.indexOf(modal);
  if(idx >= 0) modalStack.splice(idx,1);
  syncModalStack();
  setTimeout(()=>{
    if(!modal.classList.contains('show')) modal.style.display = 'none';
  },220);
  if(window.setAriaHidden) setAriaHidden(modal, true);
  else modal.setAttribute('aria-hidden', 'true');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      if(modal.id === 'storyMapModal') window.FFFEvents.emit('campaign:map:close', { id: modal.id });
      if(modal.id === 'eventModal') window.FFFEvents.emit('campaign:event:close', { id: modal.id });
      if(['rewardsModal','cardSelectModal','totemSelectModal','evolveCardModal','relicModal','removalModal','restModal'].includes(modal.id)){
        window.FFFEvents.emit('campaign:reward:close', { id: modal.id });
      }
    }
  }catch(_){ }
}

let confirmModalResolver = null;
function askGameConfirmation(message,{title='Confirmar',confirmLabel='Continuar',cancelLabel='Cancelar'}={}){
  if(!els.confirmModal || !els.confirmTitle || !els.confirmText || !els.confirmOkBtn || !els.confirmCancelBtn){
    return Promise.resolve(confirm(message));
  }
  if(confirmModalResolver){
    try{ confirmModalResolver(false); }catch(_){ }
    confirmModalResolver = null;
  }
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = message || 'Tem certeza?';
  els.confirmOkBtn.textContent = confirmLabel;
  els.confirmCancelBtn.textContent = cancelLabel;
  showModal(els.confirmModal);
  return new Promise(resolve => {
    confirmModalResolver = value => {
      confirmModalResolver = null;
      closeModal(els.confirmModal);
      resolve(!!value);
    };
  });
}

// ===== RELIC SYSTEM FUNCTIONS =====
function showRelicChoice(onComplete){
  if(!G.story) return onComplete?.();
  
  const modal = document.getElementById('relicModal');
  const grid = document.getElementById('relicChoices');
  const msg = document.getElementById('relicMsg');
  if(!modal || !grid) return onComplete?.();
  
  // Get 3 random relics
  const allRelics = Object.values(RELICS);
  const available = allRelics.filter(r => !G.story.hasRelic(r.id));
  if(available.length === 0) {
    log('🔮 Sem novas relíquias disponíveis!');
    return onComplete?.();
  }
  
  const choices = [];
  while(choices.length < 3 && available.length > 0){
    const roll = G.story&&G.story.random ? G.story.random() : Math.random();
    const idx = Math.floor(roll * available.length);
    choices.push(available.splice(idx, 1)[0]);
  }
  
  grid.innerHTML = '';
  msg.textContent = '';
  
  choices.forEach(relic => {
    const option = document.createElement('div');
    option.className = 'reward-option';
    option.dataset.rarity = relic.rarity;
    option.appendChild(relicNode(relic));
    option.onclick = () => {
      G.story.addRelic(relic);
      log(`✨ ${relic.name} adquirido!`);
      closeModal(modal);
      updateRelicsDisplay();
      saveStoryProgress();
      if(window.playSfx) window.playSfx('reward');
      setTimeout(() => onComplete?.(), 300);
    };
    grid.appendChild(option);
  });
  
  showModal(modal);
  if(window.playSfx) window.playSfx('start');
}

function updateRelicsDisplay(){
  const panel = document.getElementById('activeRelics');
  const list = document.getElementById('relicsList');
  if(!panel || !list || !G.story || !G.story.relics.length) {
    if(panel) panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  list.innerHTML = '';
  
  G.story.relics.forEach(relic => {
    const item = document.createElement('div');
    item.className = 'relic-item';
    item.dataset.rarity = relic.rarity;
    item.textContent = relic.icon;
    item.title = `${relic.name}\n${relic.desc}`;
    list.appendChild(item);
  });
}

function applyRelicEffects(trigger, context = {}){
  if(!G.story || !G.story.relics.length) return;
  
  G.story.relics.forEach(relic => {
    switch(relic.effect){
      case 'healStart':
        if(trigger === 'combatStart'){
          G.playerHP = Math.min(G.playerHP + relic.value, 30);
          log(`🍃 ${relic.name}: Curou ${relic.value} HP`);
        }
        break;
      case 'tempHP':
        if(trigger === 'combatStart'){
          // Implementar HP temporário
          log(`🐻 ${relic.name}: +${relic.value} HP temporário`);
        }
        break;
      case 'startMana':
        if(trigger === 'combatStart'){
          G.playerMana += relic.value;
          log(`🪶 ${relic.name}: +${relic.value} mana inicial`);
        }
        break;
      case 'extraDraw':
        if(trigger === 'turnStart' && G.current === 'player'){
          draw('player', relic.value);
        }
        break;
      case 'killMana':
        if(trigger === 'onKill' && context.killer?.owner === 'player'){
          G.playerMana = Math.min(G.playerMana + relic.value, G.playerManaCap);
          log(`🦑 ${relic.name}: +${relic.value} mana`);
        }
        break;
    }
  });
}

// ===== EVENT SYSTEM FUNCTIONS =====
function eventThemeClass(event){
  const id = String(event && event.id || '');
  if(id.includes('ritual')) return 'theme-ritual';
  if(id.includes('library')) return 'theme-library';
  if(id.includes('merchant')) return 'theme-merchant';
  if(id.includes('frozen') || id.includes('shrine')) return 'theme-frozen';
  if(id.includes('wolf')) return 'theme-beast';
  if(id.includes('aurora')) return 'theme-arcane';
  if(id.includes('blacksmith') || id.includes('forge')) return 'theme-forge';
  if(id.includes('totem')) return 'theme-totem';
  return 'theme-travel';
}
function showRandomEvent(onComplete, opts={}){
  if(!G.story) return onComplete?.();
  
  const available = STORY_EVENTS.filter(e => !G.story.eventsSeen.includes(e.id));
  if(!available.length) return onComplete?.();
  const { source='story' } = opts;
  
  const roll = G.story&&G.story.random ? G.story.random() : Math.random();
  const event = available[Math.floor(roll * available.length)];
  G.story.eventsSeen.push(event.id);
  saveStoryProgress();
  
  const modal = document.getElementById('eventModal');
  const screen = document.getElementById('eventScreen');
  const icon = document.getElementById('eventIcon');
  const eyebrow = document.getElementById('eventEyebrow');
  const title = document.getElementById('eventTitle');
  const desc = document.getElementById('eventDesc');
  const choices = document.getElementById('eventChoices');
  const result = document.getElementById('eventResult');
  const mapModal = document.getElementById('storyMapModal');
  const inMapContext = source==='map' || !!(mapModal && mapModal.classList.contains('show'));
  
  if(!modal) return onComplete?.();
  
  if(screen){
    screen.className = `event-screen ${eventThemeClass(event)}`;
  }
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('campaign:event:theme', {
        id: event.id,
        theme: eventThemeClass(event),
        source
      });
    }
  }catch(_){ }
  icon.textContent = event.icon;
  if(eyebrow) eyebrow.textContent = source === 'map' ? 'Evento de Rota' : 'Evento Aleatório';
  title.textContent = event.name;
  desc.innerHTML = `<strong style="color:#f6da75">💰 Ouro disponível: ${G.story.gold}</strong><br><br>${event.desc}`;
  choices.innerHTML = '';
  result.textContent = '';
  modal.classList.toggle('on-story-map', inMapContext);
  let eventResolved = false;
  const lockChoices = () => {
    choices.querySelectorAll('.event-choice').forEach(el => {
      el.classList.add('disabled');
      el.style.pointerEvents = 'none';
    });
  };
  
  event.choices.forEach(choice => {
    const canAfford = !choice.cost || 
      (!choice.cost.gold || G.story.gold >= choice.cost.gold) &&
      (!choice.cost.hp || G.playerHP > choice.cost.hp);
    
    const btn = document.createElement('div');
    btn.className = 'event-choice' + (!canAfford ? ' disabled' : '');
    btn.innerHTML = `
      <div class="event-choice-text">${choice.text}</div>
      ${choice.cost ? `<div class="event-choice-cost">Custo: ${choice.cost.gold ? choice.cost.gold + ' ouro' : ''}${choice.cost.hp ? choice.cost.hp + ' HP' : ''}</div>` : ''}
      ${choice.reward && choice.reward.gold ? `<div class="event-choice-reward">+${choice.reward.gold} ouro</div>` : ''}
    `;
    
    if(canAfford){
      btn.onclick = () => {
        if(eventResolved) return;
        eventResolved = true;
        lockChoices();
        executeEventChoice(event, choice, result, () => {
          setTimeout(() => {
            closeModal(modal);
            modal.classList.remove('on-story-map');
            onComplete?.();
          }, 900);
        });
      };
    }
    
    choices.appendChild(btn);
  });
  
  showModal(modal);
  if(window.playSfx) window.playSfx('start');
}

function executeEventChoice(event, choice, resultEl, onDone){
  const finish = () => {
    saveStoryProgress();
    if(window.playSfx) window.playSfx('reward');
    onDone?.();
  };
  // Apply costs
  if(choice.cost){
    if(choice.cost.gold){ G.story.gold -= choice.cost.gold; if(typeof updateGoldHUD==='function')updateGoldHUD(); }
    if(choice.cost.hp) G.playerHP = Math.max(1, G.playerHP - choice.cost.hp);
  }
  
  // Apply rewards
  if(choice.reward){
    if(choice.reward.gold) {
      G.story.gold += choice.reward.gold;
      if(typeof updateGoldHUD==='function')updateGoldHUD();
      log(`💰 +${choice.reward.gold} ouro`);
    }
    if(choice.reward.card){
      const card = createEventRewardCard({ rarity: choice.reward.card });
      if(card){
        addRewardCardToStory(card);
        showEventRewardOverlay(card, { title: 'Carta adicionada!', subtitle: 'Evento aleatório' });
        log(`🎴 Evento: ${card.name} adicionado ao deck!`);
      }
    }
    if(choice.reward.healFull) {
      G.playerHP = 30;
      log(`💚 HP restaurado!`);
    }
    if(choice.reward.upgradeCard) {
      const bonus = choice.reward.upgradeCard || 1;
      const deck = Array.isArray(G.story.deck) ? G.story.deck : [];
      const fresh = deck.filter(c => c && (c.type!=='spell') && !c._eventUpgradeLevel);
      const pool = fresh.length ? fresh : deck.filter(c => c && c.type!=='spell');
      if(pool.length){
        const roll = G.story&&G.story.random ? G.story.random() : Math.random();
        const card = pool[Math.floor(roll * pool.length)];
        card.atk = Math.max(0, (card.atk||0) + bonus);
        card.hp = Math.max(1, (card.hp||1) + bonus);
        card.baseAtk = card.atk;
        card.baseHp = card.hp;
        card._eventUpgradeLevel = (card._eventUpgradeLevel||0) + 1;
        const upgradeMsg = `⬆️ ${card.name} recebeu +${bonus}/+${bonus}.`;
        log(upgradeMsg);
        resultEl.textContent = upgradeMsg;
        showEventUpgradeOverlay(card, { bonus, subtitle: 'Evento aleatório' }, finish);
        return;
      }
    }
    if(choice.reward.removeCard) {
      const eventModal = document.getElementById('eventModal');
      if(eventModal) closeModal(eventModal);
      showCardRemoval({
        onComplete: () => onDone?.(),
        onCardRemoved: card => animateCardRemovalOverlay(card, 'Carta removida no evento')
      });
      return; // Callback handled by removal modal
    }
    if(choice.reward.relic === 'random') {
      showRelicChoice(() => onDone?.());
      return;
    }
    if(choice.reward.totem) {
      const totemEntry = {
        name: 'Totem Místico',
        emoji: '🗿',
        tribe: 'Totem',
        atk: 0,
        hp: 0,
        cost: 3,
        desc: 'Ative: +1/+1 em um aliado',
        text: 'Ative: +1/+1 em um aliado',
        type: 'totem',
        deck: G.playerDeckChoice
      };
      addRewardCardToStory(totemEntry);
      log(`🗿 Totem Místico adicionado!`);
      showEventRewardOverlay(totemEntry, { title: 'Totem conquistado', subtitle: 'Evento aleatório' });
    }
    if(choice.reward.buffAll) {
      if(choice.reward.buffAll.atk) {
        G.story.bonuses.allyBuff.atk += choice.reward.buffAll.atk;
        log(`⚔️ Aliados +${choice.reward.buffAll.atk} ATK!`);
      }
      if(choice.reward.buffAll.hp) {
        G.story.bonuses.allyBuff.hp += choice.reward.buffAll.hp;
        log(`❤️ Aliados +${choice.reward.buffAll.hp} HP!`);
      }
    }
    if(choice.reward.maxHPLoss) {
      G.playerHP = Math.max(1, (G.playerHP || 30) - choice.reward.maxHPLoss);
      log(`💀 O altar drenou ${choice.reward.maxHPLoss} do seu vigor.`);
    }
  }
  
  // Risk/random effects
  if(choice.risk) {
    const lucky = (G.story&&G.story.random ? G.story.random() : Math.random()) > 0.5;
    if(choice.effect === 'riskReward') {
      if(lucky) {
        showRelicChoice(() => onDone?.());
        resultEl.textContent = '✨ Você teve sorte! Ganhou uma relíquia!';
        return;
      } else {
        G.playerHP = Math.max(1, G.playerHP - 10);
        resultEl.textContent = '💔 Azar! Você perdeu 10 HP.';
      }
    }
  }
  
  resultEl.textContent = choice.result;
  finish();
}

let eventOverlayTimer;
function showEventUpgradeOverlay(card, { bonus=1, subtitle='' } = {}, onDone){
  const overlay = document.getElementById('eventRewardOverlay');
  if(!overlay){ onDone?.(); return; }
  overlay.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'event-reward-msg';
  title.textContent = `⬆️ ${card.name} aprimorada`;
  overlay.appendChild(title);
  const container = document.createElement('div');
  container.className = 'event-reward-card';
  try{
    const preview = cardNode(card,'player');
    preview.classList.add('selection-card-preview');
    preview.classList.add('event-upgrade-card');
    container.appendChild(preview);
  }catch(_){ }
  overlay.appendChild(container);
  const details = document.createElement('div');
  details.className = 'event-reward-caption';
  details.textContent = `Bônus aplicado: +${bonus} ATK / +${bonus} HP${subtitle ? ` • ${subtitle}` : ''}`;
  overlay.appendChild(details);
  overlay.classList.remove('show','upgrade-seq');
  void overlay.offsetWidth;
  overlay.classList.add('show','upgrade-seq');
  clearTimeout(eventOverlayTimer);
  eventOverlayTimer = setTimeout(()=>{
    overlay.classList.remove('show','upgrade-seq');
    onDone?.();
  }, 2500);
}
function showEventRewardOverlay(card, { title='', subtitle='' } = {}){
  const overlay = document.getElementById('eventRewardOverlay');
  if(!overlay) return;
  overlay.innerHTML = '';
  if(title){
    const msg = document.createElement('div');
    msg.className = 'event-reward-msg';
    msg.textContent = title;
    overlay.appendChild(msg);
  }
  const container = document.createElement('div');
  container.className = 'event-reward-card';
  try{
    const preview = cardNode(card,'player');
    preview.classList.add('selection-card-preview');
    container.appendChild(preview);
  }catch(_){ }
  overlay.appendChild(container);
  if(subtitle){
    const caption = document.createElement('div');
    caption.className = 'event-reward-caption';
    caption.textContent = subtitle;
    overlay.appendChild(caption);
  }
  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');
  clearTimeout(eventOverlayTimer);
  eventOverlayTimer = setTimeout(()=>{overlay.classList.remove('show');}, 3200);
}
function animateCardRemovalOverlay(card, message='Carta removida'){ showEventRewardOverlay(card, { title: message, subtitle: 'Evento aleatório' }); }
function createEventRewardCard({ rarity='common', deckKey } = {}){
  const key = deckKey || G.aiDeckChoice || G.playerDeckChoice || 'vikings';
  const pool = (TEMPLATES[key] || []).map(makeCard);
  if(!pool.length) return null;
  const roll = G.story&&G.story.random ? G.story.random() : Math.random();
  const candidate = pool[Math.floor(roll*pool.length)];
  candidate.rarity = rarity === 'rare' ? 'raro' : candidate.rarity || 'comum';
  candidate.deck = key;
  return hydrateCardArt(candidate);
}
function maybeRunEventBeforeShop(onDone){
  if(!G.story) return onDone?.();
  const available = STORY_EVENTS.filter(e => !G.story.eventsSeen.includes(e.id));
  if(!available.length) return onDone?.();
  if(G.story.lastShopEventRound === G.story.round) return onDone?.();
  const chance = 0.42;
  const roll = G.story&&G.story.random ? G.story.random() : Math.random();
  if(roll > chance) return onDone?.();
  G.story.lastShopEventRound = G.story.round;
  saveStoryProgress();
  showRandomEvent(() => onDone?.(), { source: 'shop' });
}

// ===== CARD REMOVAL SYSTEM =====

function showCardRemoval(opts){
  const {
    onComplete,
    onCardRemoved,
    onCardSelected,
    cards,
    title = '🔥 Remover Carta do Deck',
    subtitle = 'Selecione uma carta para remover permanentemente:',
    confirmMessage,
    removeFromDeck = true
  } = (typeof opts === 'function') ? { onComplete: opts } : (opts || {});
  const modal = document.getElementById('removalModal');
  const grid = document.getElementById('removalChoices');
  const cancelBtn = document.getElementById('cancelRemoval');
  const titleEl = document.getElementById('removalTitle');
  const subtitleEl = document.getElementById('removalSubtitle');
  try{ window.showCardRemoval = showCardRemoval; }catch(_){ }
  
  if(!modal || !grid) {
    log('⚠️ Modal de remoção não encontrado!');
    return onComplete?.();
  }
  
  if(titleEl) titleEl.textContent = title;
  if(subtitleEl) subtitleEl.textContent = subtitle;
  const allCards = (Array.isArray(cards) ? cards : [
    ...(G.playerDeck || []),
    ...(G.playerHand || []),
    ...(G.playerBoard || []),
    ...(G.playerDiscard || [])
  ]).filter(Boolean);
  
  const uniqueCards = [];
  const seenIds = new Set();
  allCards.forEach(c => {
    const hydrated = hydrateCardArt(c) || c;
    const id = hydrated.id || c.id || uid();
    hydrated.id = hydrated.id || id;
    c.id = c.id || id;
    if(seenIds.has(id)) return;
    seenIds.add(id);
    const entry = Object.assign({}, hydrated);
    ensureCardBase(entry);
    if(!entry.deck) entry.deck = hydrated.deck || G.playerDeckChoice;
    uniqueCards.push(entry);
  });
  
  if(!uniqueCards.length) {
    log('⚠️ Nenhuma carta disponível para remover!');
    if(onComplete) setTimeout(onComplete, 100);
    return;
  }
  
  grid.innerHTML = '';
  
  uniqueCards.forEach((card) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'removal-card';
    
    try {
      const node = cardNode(card, 'player');
      cardWrapper.appendChild(node);
    } catch(err) {
      console.error('Error creating card node:', err);
      return;
    }
    
    cardWrapper.onclick = async () => {
      const prompt = typeof confirmMessage === 'function' ? confirmMessage(card) : (confirmMessage || `Remover ${card.name} permanentemente do seu deck?`);
      if(prompt && !await askGameConfirmation(prompt,{title:'Remover carta',confirmLabel:'Remover'})) return;
      cardWrapper.classList.add('removing');
      setTimeout(()=>{
        if(removeFromDeck){
          const rarity = (card.rarity || 'comum').toLowerCase();
          const rarityLabel = {'common':'comum','rare':'raro','epic':'épico','legendary':'lendário'}[rarity] || rarity;
          const removeById = (arr) => {
            if(!arr) return;
            const foundIdx = arr.findIndex(c => c && c.id === card.id);
            if(foundIdx >= 0) arr.splice(foundIdx, 1);
          };
          [G.playerDeck,G.playerHand,G.playerBoard,G.playerDiscard].forEach(zone=>removeById(zone));
          if(G.story && Array.isArray(G.story.deck)){
            const idx = G.story.deck.findIndex(x=>x && x.id===card.id);
            if(idx>-1) G.story.deck.splice(idx,1);
          }
          log(`⚡ ${card.name} (${rarityLabel}) foi removido do deck!`);
        }
        closeModal(modal);
        if(window.playSfx) window.playSfx('error');
        onCardSelected?.(card);
        onCardRemoved?.(card);
        onComplete?.();
      },350);
    };
    
    grid.appendChild(cardWrapper);
  });
  
  if(cancelBtn){
    cancelBtn.onclick = () => {
      closeModal(modal);
      onComplete?.();
    };
  }
  
  showModal(modal);
  try{ const first = grid.querySelector('.removal-card'); first && first.focus && first.focus(); }catch(_){ }
}
try{ window.showCardRemoval = showCardRemoval; }catch(_){ }

function checkWin(){
  if(G.aiHP<=0){
    if(G.mode==='story'&&G.story){
      const {leveled,rewards,goldGain,isBoss}=G.story.handleVictory();
      log(`Voce ganhou ${goldGain} ouro.`);
      if(leveled) log(`Voce alcancou o nivel ${G.story.level}!`);
      const afterRewards = () => {
        const proceedNext = () => {
          storyAdvanceOrChoose(G.story, (_node, meta) => {
            const keepMapOpen = !!(meta && meta.keepMapOpen);
            if(keepMapOpen){
              startGame({continueStory:true, keepMapOpen:true});
              return;
            }
            encounterTransition(()=>startGame({continueStory:true}));
          });
        };
        if(isBoss){
          showRelicChoice(() => {
            showVictoryBanner(G.currentEnemyName, proceedNext);
          });
        } else {
          showVictoryBanner(G.currentEnemyName, proceedNext);
        }
      };
      showRewardsModal(rewards, afterRewards);
      return;
    }
    endGame(true);
  }
  if(G.playerHP<=0){ clearStoryProgress(); endGame(false); }
}

function allCards(){let out=[];for(const k of Object.keys(TEMPLATES)){for(const raw of TEMPLATES[k]){const c=makeCard(raw);c.deck=k;out.push(c)}}return out}
function encyclopediaSpecialCards(){
  const items = [];
  const pushUnique = item => {
    if(!item || !item.name) return;
    const key = item.name.trim().toLowerCase();
    if(items.some(entry => entry._encyKey === key)) return;
    items.push(Object.assign({_encyKey:key}, item));
  };
  (window.SHOP_NEUTRAL_ITEMS || []).forEach(item => {
    const card = Object.assign({}, item, {
      deck: 'efeitos',
      tribe: item.tribe || 'Neutro',
      emoji: item.emoji || item.icon || '✨',
      text: item.text || item.desc || '',
      atk: typeof item.atk === 'number' ? item.atk : 0,
      hp: typeof item.hp === 'number' ? item.hp : 0,
      type: item.type || 'spell'
    });
    pushUnique(card);
  });
  (window.SHOP_STORY_ITEMS || []).forEach(item => {
    const card = Object.assign({}, item, {
      deck: item.type === 'relic' ? 'reliquias' : item.type === 'totem' ? 'totens' : 'efeitos',
      tribe: item.type === 'relic' ? 'Relíquia' : item.type === 'buff' ? 'Upgrade de Campanha' : 'Totem de Campanha',
      emoji: item.icon || '✨',
      desc: item.desc || '',
      text: item.desc || '',
      atk: 0,
      hp: 0,
      type: item.type === 'totem' ? 'totem' : item.type === 'relic' ? 'relic' : 'spell'
    });
    pushUnique(card);
  });
  Object.values(RELICS).forEach(item => {
    const card = {
      name: item.name,
      deck: 'reliquias',
      tribe: 'Relíquia',
      emoji: item.icon || '🔮',
      icon: item.icon || '🔮',
      atk: 0,
      hp: 0,
      cost: 0,
      desc: item.desc || '',
      text: item.desc || '',
      type: 'relic',
      rarity: item.rarity
    };
    pushUnique(card);
  });
  REWARD_TOTEMS.forEach(item => {
    pushUnique(createTotemRewardCard(Object.assign({}, item, { deck: 'totens' })));
  });
  [
    { name: 'Totem Místico', emoji: '🗿', tribe: 'Totem de Evento', atk: 0, hp: 0, cost: 3, text: 'Totem obtido em evento aleatório.', type: 'totem', buffs: { atk: 1, hp: 1 }, deck: 'totens', icon: '🗿' },
    { name: 'Totem de Força', emoji: '🗿', tribe: 'Totem Básico', atk: 0, hp: 0, cost: 2, text: 'Ative: +1/+1 em um aliado.', type: 'totem', buffs: { atk: 1, hp: 1 }, deck: 'totens', icon: '🗿' }
  ].forEach(pushUnique);
  return items.map(entry => {
    const card = Object.assign({}, entry);
    delete card._encyKey;
    if(card.cost == null && typeof window.balanceCardCost === 'function') card.cost = window.balanceCardCost(card);
    return card;
  });
}
function renderEncy(filter='all',locked=false){
  els.encyGrid.innerHTML='';
  const specials = encyclopediaSpecialCards();
  let cards;
  if(filter==='all'){
    cards = allCards().concat(specials);
  }else if(['totens','reliquias','efeitos'].includes(filter)){
    cards = specials.filter(c => c.deck === filter || (filter === 'reliquias' && (c.type === 'relic' || c.tribe === 'Relíquia')));
  }else{
    cards = TEMPLATES[filter].map(makeCard).map(c=>Object.assign(c,{deck:filter}));
  }
  cards.forEach(c=>{
    const d=(c.tribe==='Relíquia'||c.type==='relic') ? relicNode(c) : cardNode(c,'player');
    d.classList.add('ency-card');
    tiltify(d);
    d.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      openEncyCardFocus(d);
    });
    els.encyGrid.appendChild(d);
  });
  els.ency.classList.add('show');
  setAriaHidden(els.ency,false);
  focusDialog(els.ency);
  els.encyFilters.style.display=locked?'none':'flex';
  $$('.filters .fbtn').forEach(b=>b.classList.toggle('active',b.dataset.deck===filter||filter==='all'&&b.dataset.deck==='all'));
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('overlay:archive:open', { id: 'ency', filter, locked: !!locked });
    }
  }catch(_){ }
}
let encyFocusState = null;
function closeEncyCardFocus(){
  if(!encyFocusState) return;
  const { source, cloneWrap, backdrop, escHandler } = encyFocusState;
  cloneWrap.style.transform = 'translate(0px,0px) scale(1)';
  backdrop.classList.remove('show');
  const cleanup = () => {
    try{ source.classList.remove('focus-source'); }catch(_){ }
    try{ cloneWrap.remove(); }catch(_){ }
    try{ backdrop.remove(); }catch(_){ }
    try{ document.removeEventListener('keydown', escHandler, true); }catch(_){ }
    encyFocusState = null;
  };
  setTimeout(cleanup, 300);
}
function copyCanvasContent(sourceRoot, cloneRoot){
  if(!sourceRoot || !cloneRoot) return;
  const sourceCanvases = sourceRoot.querySelectorAll('canvas');
  const cloneCanvases = cloneRoot.querySelectorAll('canvas');
  sourceCanvases.forEach((canvas, idx) => {
    const target = cloneCanvases[idx];
    if(!target) return;
    try{
      const ctx = target.getContext('2d');
      if(ctx) ctx.drawImage(canvas, 0, 0);
    }catch(_){ }
  });
}
function openEncyCardFocus(cardEl){
  if(!cardEl || encyFocusState) return;
  const fromDeckPreviewMini = cardEl.classList && cardEl.classList.contains('deck-preview-mini');
  const r = cardEl.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const scale = Math.min(2, (vw * 0.42) / Math.max(1, r.width), ((vh - 48) / Math.max(1, r.height)));
  const targetW = r.width * scale;
  const targetH = r.height * scale;
  const targetL = (vw - targetW) / 2;
  const targetT = Math.max(24, (vh - targetH) / 2);
  const dx = targetL - r.left;
  const dy = targetT - r.top;
  const backdrop = document.createElement('div');
  backdrop.className = 'ency-focus-backdrop';
  const cloneWrap = document.createElement('div');
  cloneWrap.className = 'ency-focus-card';
  if(fromDeckPreviewMini) cloneWrap.classList.add('from-deck-preview-mini');
  cloneWrap.style.left = `${r.left}px`;
  cloneWrap.style.top = `${r.top}px`;
  cloneWrap.style.width = `${r.width}px`;
  cloneWrap.style.height = `${r.height}px`;
  cloneWrap.style.transform = 'translate(0px,0px) scale(1)';
  const clone = cardEl.cloneNode(true);
  clone.classList.remove('focus-source');
  clone.classList.add('ency-zoomed-card');
  clone.style.transform = '';
  clone.style.setProperty('--card-tilt','none');
  copyCanvasContent(cardEl, clone);
  cloneWrap.appendChild(clone);
  document.body.appendChild(backdrop);
  document.body.appendChild(cloneWrap);
  cardEl.classList.add('focus-source');
  const escHandler = e => {
    if(e.key === 'Escape'){
      e.preventDefault();
      closeEncyCardFocus();
    }
  };
  backdrop.addEventListener('click', closeEncyCardFocus);
  document.addEventListener('keydown', escHandler, true);
  encyFocusState = { source: cardEl, cloneWrap, backdrop, escHandler };
  tiltify(clone, true, { hoverScale: 1 });
  requestAnimationFrame(()=>{
    backdrop.classList.add('show');
    cloneWrap.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`;
    if(fromDeckPreviewMini){
      requestAnimationFrame(()=>cloneWrap.classList.add('is-settled'));
    }
  });
}
const updateRestartVisibility=()=>{if(els.restartBtn)els.restartBtn.style.display=window.isMultiplayer?'none':'block'};
const showAppScreen=screen=>{
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('screen:change', { screen });
    }
  }catch(_){ }
  if(typeof window.showAppScreen==='function'){
    window.showAppScreen(screen);
    return;
  }
  const screens={
    title: document.getElementById('titleMenu'),
    deck: document.getElementById('start'),
    multiplayer: document.getElementById('multiplayerMenu'),
    game: els.wrap
  };
  const displays={ title:'flex', deck:'flex', multiplayer:'grid', game:'block' };
  Object.keys(screens).forEach(key=>{
    const node=screens[key];
    if(!node) return;
    node.style.display = key===screen ? displays[key] : 'none';
    setAriaHidden(node, key!==screen);
  });
};
const toggleGameMenu=open=>{if(!els.gameMenu)return;if(open){els.gameMenu.classList.add('show');emitSystemOverlay(true, 'gameMenu');setAriaHidden(els.gameMenu,false);focusDialog(els.gameMenu);updateRestartVisibility();}else{els.gameMenu.classList.remove('show');emitSystemOverlay(false, 'gameMenu');setAriaHidden(els.gameMenu,true)}};
function toggleSimpleDialog(dialog, open){
  if(!dialog) return;
  dialog.style.display = open ? 'grid' : 'none';
  setAriaHidden(dialog, !open);
  if(open) focusDialog(dialog);
}
function initTestMenu(){
  const testMenuBtn = document.getElementById('menuTestes');
  const testModal = document.getElementById('testModal');
  const closeTestBtn = document.getElementById('closeTest');
  const testBindings = [
    ['testMapBtn', 'map'],
    ['testEventBtn', 'event'],
    ['testRestBtn', 'rest'],
    ['testRelicBtn', 'relic'],
    ['testRewardsBtn', 'rewards'],
    ['testRemovalBtn', 'removal'],
    ['testUpgradeBtn', 'upgrade'],
    ['testRewardCardBtn', 'reward-card'],
    ['testEncyBtn', 'ency'],
    ['testShopBtn', 'shop'],
    ['testVisualFxBtn', 'visual-fx'],
    ['testStoryWinBtn', 'story-win'],
    ['testTotemBtn', 'totem']
  ];

  if(window.__FFF_DEV_MODE__ && testMenuBtn){
    testMenuBtn.hidden = false;
    testMenuBtn.removeAttribute('aria-hidden');
    testMenuBtn.removeAttribute('tabindex');
  }

  if(testMenuBtn && !testMenuBtn.dataset.bound){
    testMenuBtn.addEventListener('click', ()=>toggleSimpleDialog(testModal, true));
    testMenuBtn.dataset.bound = '1';
  }
  if(closeTestBtn && !closeTestBtn.dataset.bound){
    closeTestBtn.addEventListener('click', ()=>toggleSimpleDialog(testModal, false));
    closeTestBtn.dataset.bound = '1';
  }
  if(testModal && !testModal.dataset.bound){
    testModal.addEventListener('click', event => {
      if(event.target === testModal){
        toggleSimpleDialog(testModal, false);
      }
    });
    testModal.dataset.bound = '1';
  }

  testBindings.forEach(([id, kind]) => {
    const btn = document.getElementById(id);
    if(!btn || btn.dataset.bound) return;
    btn.addEventListener('click', () => {
      toggleSimpleDialog(testModal, false);
      runGameTest(kind);
    });
    btn.dataset.bound = '1';
  });
}
window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(confirmModalResolver){confirmModalResolver(false);return;}if(G.chosen){cancelTargeting();return}if(!els.gameMenu)return;const t=els.gameMenu.classList.contains('show');t?toggleGameMenu(false):toggleGameMenu(true)});document.addEventListener('click',e=>{if(!G.chosen)return;if(e.target.closest('#aiBoard .card.selectable')||e.target.closest('#playerBoard .card.selectable')||e.target.closest('#aiBoard .face-attack-btn')||e.target.closest('#directAttackHint'))return;cancelTargeting()},{capture:true});
document.addEventListener('pointermove',e=>{if(!G.chosen)return;const from=attackerCenter(G.chosen);if(from)showAttackArrow(from.x,from.y,e.clientX,e.clientY);},{capture:true});
function confirmExit(){return askGameConfirmation(G.mode==='story'?'Progresso da história será perdido. Continuar?':'Tem certeza?',{title:'Sair da partida',confirmLabel:'Continuar'});}
if(els.openMenuBtn)els.openMenuBtn.addEventListener('click',()=>{toggleGameMenu(true)});
if(els.closeMenuBtn)els.closeMenuBtn.addEventListener('click',()=>{toggleGameMenu(false)});
if(els.mainMenuBtn)els.mainMenuBtn.addEventListener('click',async ()=>{if(!await confirmExit())return;toggleGameMenu(false);cleanupTransientUi();showAppScreen('title');applyBattleTheme(null);cleanupGameElements();startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;G.storyVariant=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='PLAY';els.startGame.disabled=true;}});
if(els.restartBtn)els.restartBtn.addEventListener('click',async ()=>{if(window.isMultiplayer)return;if(!await confirmExit())return;toggleGameMenu(false);startGame()});
if(els.resignBtn)els.resignBtn.addEventListener('click',async ()=>{if(!await confirmExit())return;toggleGameMenu(false);if(window.isMultiplayer&&window.NET){NET.resign();}endGame(false)});
if(els.emojiBar){els.emojiBar.querySelectorAll('.emoji-btn').forEach(b=>b.addEventListener('click',()=>{const em=b.dataset.emoji;showEmoji('player',em);if(window.isMultiplayer&&window.NET){NET.sendEmoji(em)}}));}
const DECK_TAGLINES={vikings:'Cura e protecao',animais:'Ataque bruto',pescadores:'Suporte e bonus',floresta:'Pressao constante'};
const LOCKED_DECK_CARD={key:'locked',title:'???',tag:'Novos decks poderao ser desbloqueados',locked:true,variant:'mystery'};
const UNLOCK_DECK_CARD={key:'unlock-deck',title:'Deck Bloqueado',tag:'Libere novos decks futuramente',locked:true,variant:'unlock'};
function getDeckCarouselItems(){
  return ALL_DECKS.map(deck=>({key:deck,title:DECK_TITLES[deck]||deck,tag:DECK_TAGLINES[deck]||'',locked:false})).concat([LOCKED_DECK_CARD,UNLOCK_DECK_CARD]);
}
let deckCarouselIndex = Math.max(0, ALL_DECKS.indexOf(G.playerDeckChoice||'vikings'));
let deckPreviewSelection = null;
let deckCarouselPosition = deckCarouselIndex;
let deckCarouselTargetIndex = deckCarouselIndex;
let deckCarouselAnimationFrame = null;
let deckCarouselAnimating = false;
let deckCarouselPreloadPromise = null;
function deckBackUrl(deck){
  return primaryDeckAssetUrl(deck,'deck-back');
}
function preloadCarouselImage(src){
  return preloadImageUrl(src);
}
function preloadDeckCarouselAssets(){
  if(deckCarouselPreloadPromise) return deckCarouselPreloadPromise;
  const urls=ALL_DECKS.map(deck=>deckBackUrl(deck)).filter(Boolean);
  urls.push('img/ui/DeckBackUnlock.webp');
  deckCarouselPreloadPromise=Promise.all(urls.map(preloadCarouselImage)).then(()=>undefined,()=>undefined);
  return deckCarouselPreloadPromise;
}
window.preloadDeckCarouselAssets = preloadDeckCarouselAssets;
window.preloadDeckPreviewAssets = preloadDeckPreviewAssets;
function preloadDeckScreenAssets(){
  return Promise.all([
    preloadDeckCarouselAssets(),
    ...ALL_DECKS.map(deck=>preloadDeckPreviewAssets(deck))
  ]).then(()=>undefined,()=>undefined);
}
window.preloadDeckScreenAssets = preloadDeckScreenAssets;
function stopDeckCarouselSpin(){
  if(deckCarouselAnimationFrame){
    cancelAnimationFrame(deckCarouselAnimationFrame);
    deckCarouselAnimationFrame = null;
  }
  deckCarouselAnimating = false;
}
function normalizeCarouselPosition(position,total){
  let value=position%total;
  if(value<0) value+=total;
  return value;
}
function shortestCarouselDelta(from,to,total){
  let delta=to-from;
  if(delta>total/2) delta-=total;
  if(delta<-total/2) delta+=total;
  return delta;
}
function spinDeckCarouselTo(targetIndex,total){
  stopDeckCarouselSpin();
  deckCarouselTargetIndex = normalizeCarouselPosition(targetIndex,total);
  const startPosition=deckCarouselPosition;
  const travel=shortestCarouselDelta(startPosition,deckCarouselTargetIndex,total);
  if(Math.abs(travel)<0.001){
    deckCarouselPosition=deckCarouselTargetIndex;
    deckCarouselIndex=Math.round(deckCarouselTargetIndex)%total;
    renderDeckCarousel();
    return;
  }
  const duration=Math.min(420, Math.max(180, Math.abs(travel)*150));
  const startTime=(typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
  deckCarouselAnimating = true;
  const ease=t=>1-Math.pow(1-t,3);
  const animate=(now)=>{
    const currentTime=typeof now==='number'?now:((typeof performance!=='undefined' && performance.now)?performance.now():Date.now());
    const elapsed=currentTime-startTime;
    const progress=Math.max(0, Math.min(1, elapsed/duration));
    deckCarouselPosition=normalizeCarouselPosition(startPosition + travel*ease(progress),total);
    deckCarouselIndex=Math.round(deckCarouselPosition)%total;
    renderDeckCarousel();
    if(progress>=1){
      deckCarouselPosition=deckCarouselTargetIndex;
      deckCarouselIndex=Math.round(deckCarouselTargetIndex)%total;
      renderDeckCarousel();
      stopDeckCarouselSpin();
      return;
    }
    deckCarouselAnimationFrame=requestAnimationFrame(animate);
  };
  deckCarouselAnimationFrame=requestAnimationFrame(animate);
}
function nearestDeckCarouselIndexFromPoint(root, clickX){
  if(!root) return deckCarouselIndex;
  const cards=Array.from(root.querySelectorAll('.deck-carousel-card:not(.is-hidden)'));
  if(!cards.length) return deckCarouselIndex;
  let bestIndex=deckCarouselIndex;
  let bestDistance=Infinity;
  cards.forEach(card=>{
    const rect=card.getBoundingClientRect();
    const centerX=rect.left + rect.width/2;
    const distance=Math.abs(clickX-centerX);
    if(distance<bestDistance){
      bestDistance=distance;
      const idx=Number(card.dataset.index);
      if(Number.isFinite(idx)) bestIndex=idx;
    }
  });
  return bestIndex;
}
function deckCardMarkup(item){
  if(item.locked){
    if(item.variant==='unlock'){
      return `<span class="deck-back-frame deck-back-frame-carousel deck-locked-art deck-locked-art-unlock" aria-hidden="true"><img src="img/ui/DeckBackUnlock.webp" alt="" class="deck-locked-back" loading="eager" decoding="async"><span class="deck-locked-icon"><img src="img/ui/Locker.png" alt="" loading="eager" decoding="async"></span></span>`;
    }
    return `<svg viewBox="0 0 175 230" aria-hidden="true" focusable="false"><rect x="0" y="0" width="175" height="230" rx="18" fill="#0c1430"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="108" font-family="'Press Start 2P', monospace" fill="#eef4ff">?</text></svg>`;
  }
  return `<span class="deck-back-frame deck-back-frame-carousel"><img src="${deckBackUrl(item.key)}" alt="${item.title}" loading="eager" decoding="async" data-deck-back="${item.key}"></span>`;
}
function previewDeckCards(deck){
  return (TEMPLATES[deck]||[]).slice(0,9).map(raw=>Object.assign(makeCard(raw),{deck}));
}
async function openDeckPreview(deck){
  const startScreen=document.getElementById('start');
  const screen=document.getElementById('deckPreviewScreen');
  const title=document.getElementById('deckPreviewTitle');
  const sub=document.getElementById('deckPreviewSubtitle');
  const grid=document.getElementById('deckPreviewGrid');
  const back=document.getElementById('deckPreviewBack');
  const previewDifficulty=document.getElementById('deckPreviewDifficulty');
  if(!screen||!title||!sub||!grid||!back) return;
  deckPreviewSelection = deck;
  if(startScreen){
    startScreen.classList.add('preview-open');
    startScreen.setAttribute('data-deck-theme', deck || 'locked');
  }
  if(previewDifficulty && document.getElementById('difficulty')){
    previewDifficulty.value = document.getElementById('difficulty').value;
  }
  await preloadDeckPreviewAssets(deck);
  title.textContent = DECK_TITLES[deck] || deck;
  sub.textContent = '9 cartas';
  attachAssetFallback(back, deckAssetCandidates(deck,'deck-back'));
  grid.innerHTML = '';
  previewDeckCards(deck).forEach(card=>{
    const node=cardNode(card,'player');
    node.classList.add('ency-card','deck-preview-mini');
    node.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      openEncyCardFocus(node);
    });
    const cell=document.createElement('div');
    cell.className='deck-preview-cell';
    cell.appendChild(node);
    grid.appendChild(cell);
  });
  screen.hidden = false;
  screen.classList.add('show');
  screen.setAttribute('aria-hidden','false');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('deck:preview:open', { deck });
    }
  }catch(_){ }
}
function closeDeckPreview(){
  const startScreen=document.getElementById('start');
  const screen=document.getElementById('deckPreviewScreen');
  if(!screen) return;
  if(startScreen) startScreen.classList.remove('preview-open');
  screen.hidden = true;
  screen.classList.remove('show');
  screen.setAttribute('aria-hidden','true');
  try{
    if(window.FFFEvents && typeof window.FFFEvents.emit === 'function'){
      window.FFFEvents.emit('deck:preview:close', { deck: deckPreviewSelection });
    }
  }catch(_){ }
}
function applyDeckSelection(pick){
  G.playerDeckChoice=pick;
  els.deckBuilder.style.display='none';
  els.startGame.disabled=false;
  G.aiDeckChoice=rand(ALL_DECKS.filter(d=>d!==pick));
  startMenuMusic(pick);
  closeDeckPreview();
  renderDeckCarousel();
}
function renderDeckCarousel(){
  const root=document.getElementById('deckCarousel');
  const infoName=document.getElementById('deckCarouselName');
  const infoTag=document.getElementById('deckCarouselTag');
  if(!root) return;
  const decks=getDeckCarouselItems();
  const total=decks.length;
  if(deckCarouselIndex<0) deckCarouselIndex=0;
  if(deckCarouselIndex>=decks.length) deckCarouselIndex=decks.length-1;
  deckCarouselPosition = normalizeCarouselPosition(deckCarouselPosition,total);
  const existing=new Map(Array.from(root.querySelectorAll('.deck-carousel-card')).map(node=>[node.dataset.deck,node]));
  decks.forEach((deck,idx)=>{
    let btn=existing.get(deck.key);
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='deck-carousel-card';
      btn.dataset.deck=deck.key;
      btn.innerHTML=deckCardMarkup(deck);
      btn.addEventListener('click',ev=>{
        ev.stopPropagation();
        const targetDeck=btn.dataset.deck;
        const targetIndex=decks.findIndex(item=>item.key===targetDeck);
        if(targetIndex!==Math.round(deckCarouselPosition)%total || deckCarouselAnimating){ spinDeckCarouselTo(targetIndex,total); return; }
        if(btn.classList.contains('is-locked')){ renderDeckCarousel(); return; }
        openDeckPreview(targetDeck);
      });
      root.appendChild(btn);
    }
    let delta=shortestCarouselDelta(deckCarouselPosition, idx, total);
    const abs=Math.abs(delta);
    btn.className='deck-carousel-card';
    btn.dataset.index=String(idx);
    if(deck.locked) btn.classList.add('is-locked');
    if(abs>2.75) btn.classList.add('is-hidden');
    if(Math.abs(delta)<0.35) btn.classList.add('is-active');
    const img=btn.querySelector('img[data-deck-back]');
    if(img && deck.key && !deck.locked){
      attachAssetFallback(img, deckAssetCandidates(deck.key,'deck-back'));
    }
    const offsetX=delta*218;
    const depth=abs*118;
    const angle=delta*9;
    const scale=1;
    btn.style.transform=`translate(-50%,-50%) translateX(${offsetX}px) translateZ(${-depth}px) rotateY(${angle}deg) scale(${scale})`;
    btn.style.opacity=abs>2.75?'0':'1';
    btn.style.zIndex=String(Math.round(1000 - depth - abs*40));
  });
  const activeDeck=decks[Math.round(deckCarouselPosition)%total];
  if(infoName) infoName.textContent=activeDeck ? activeDeck.title : '';
  if(infoTag) infoTag.textContent=activeDeck ? activeDeck.tag : '';
  if(els.start){
    const theme = activeDeck && activeDeck.key ? activeDeck.key : '';
    if(theme) els.start.setAttribute('data-deck-theme', theme);
    else els.start.removeAttribute('data-deck-theme');
  }
}
function initDeckButtons(){
  const topBack=document.getElementById('deckScreenBackTop');
  const prev=document.getElementById('deckCarouselPrev');
  const next=document.getElementById('deckCarouselNext');
  const carousel=document.getElementById('deckCarousel');
  const playBtn=document.getElementById('deckPreviewPlay');
  const backBtn=document.getElementById('deckPreviewBackBtn');
  const previewDifficulty=document.getElementById('deckPreviewDifficulty');
  const difficulty=document.getElementById('difficulty');
  topBack&&topBack.addEventListener('click',()=>{showAppScreen('title'); closeDeckPreview();});
  prev&&prev.addEventListener('click',()=>{const total=getDeckCarouselItems().length; spinDeckCarouselTo(normalizeCarouselPosition(Math.round(deckCarouselPosition)-1,total),total);});
  next&&next.addEventListener('click',()=>{const total=getDeckCarouselItems().length; spinDeckCarouselTo(normalizeCarouselPosition(Math.round(deckCarouselPosition)+1,total),total);});
  carousel&&carousel.addEventListener('click',ev=>{
    const rect=carousel.getBoundingClientRect();
    const total=getDeckCarouselItems().length;
    const activeCard=carousel.querySelector('.deck-carousel-card.is-active');
    if(activeCard && ev.target && ev.target.closest && ev.target.closest('.deck-carousel-card.is-active')) return;
    const targetIndex=nearestDeckCarouselIndexFromPoint(carousel, ev.clientX);
    if(targetIndex!==Math.round(deckCarouselPosition)%total){
      spinDeckCarouselTo(targetIndex,total);
      return;
    }
    const goNext=ev.clientX>=rect.left + rect.width/2;
    spinDeckCarouselTo(normalizeCarouselPosition(Math.round(deckCarouselPosition) + (goNext?1:-1),total),total);
  });
  previewDifficulty&&difficulty&&previewDifficulty.addEventListener('change',()=>{difficulty.value=previewDifficulty.value;});
  playBtn&&playBtn.addEventListener('click',()=>{if(!deckPreviewSelection) return; applyDeckSelection(deckPreviewSelection); els.startGame&&els.startGame.click();});
  backBtn&&backBtn.addEventListener('click',()=>closeDeckPreview());
  renderDeckCarousel();
  if(G.playerDeckChoice && ALL_DECKS.includes(G.playerDeckChoice)) applyDeckSelection(G.playerDeckChoice);
}
preloadDeckCarouselAssets();

// Attach the same pointer-follow and halo/shine behaviour used by deck buttons
function attachButtonHover(btn){
  if(!btn || btn.dataset.hoverAttached) return;
  btn.dataset.hoverAttached = '1';
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    if(r.width>0 && r.height>0){
      btn.style.setProperty('--px', ((e.clientX - r.left)/r.width*100)+'%');
      btn.style.setProperty('--py', ((e.clientY - r.top)/r.height*100)+'%');
    }
  });
  btn.addEventListener('mouseenter', ()=>{
    btn.style.setProperty('--halo', .7);
    btn.style.setProperty('--shine', .7);
  });
  btn.addEventListener('mouseleave', ()=>{
    btn.style.removeProperty('--halo');
    btn.style.removeProperty('--shine');
  });
}

function initCommonButtonHover(){
  // Attach to all primary/ghost buttons but skip deck buttons (they already have handlers)
  const sel = '.btn, .btn-ghost';
  $$(sel).forEach(b=>{ if(!b.classList.contains('deckbtn')) attachButtonHover(b); });
}
if(document.readyState!=='loading'){
  initDeckButtons();
  initCommonButtonHover();
  initTestMenu();
} else {
  document.addEventListener('DOMContentLoaded',()=>{ initDeckButtons(); initCommonButtonHover(); initTestMenu(); });
}
[
  { id:'drawPile', title:'Seu Deck', getCards:()=>G.playerDeck, owner:'player' },
  { id:'discardPile', title:'Seu Descarte', getCards:()=>G.playerDiscard, owner:'player' }
].forEach(entry => {
  const el = document.getElementById(entry.id);
  if(!el) return;
  el.addEventListener('click', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    showPileViewer(entry.title, entry.getCards(), entry.owner);
  });
});
const pileViewerClose = document.getElementById('pileViewerClose');
const pileViewerBackdrop = document.getElementById('pileViewerBackdrop');
if(pileViewerClose) pileViewerClose.addEventListener('click', closePileViewer);
if(pileViewerBackdrop) pileViewerBackdrop.addEventListener('click', closePileViewer);
if(els.endBtn){ els.endBtn.addEventListener('click', ()=>{ emitVisualEvent('visual:turn-ui', { side:'player', yourTurn:true, source:'end-turn' }); endTurn(); }); }
if(els.instantWinBtn){
  els.instantWinBtn.addEventListener('click', ()=>{
    emitVisualEvent('visual:turn-ui', { side:'player', yourTurn:true, source:'instant-win' });
    if(G.mode!=='story'||!window.storyTestMode) return;
    G.aiHP = 0;
    try{ particleOnFace('ai','explosion'); }catch(_){ }
    log('? Teste: Vitoria instantanea ativada!');
    sfx('crit');
    checkWin();
  });
}
if(els.saveDeck)els.saveDeck.addEventListener('click',()=>{if(G.customDeck&&G.customDeck.length){els.deckBuilder.style.display='none';els.startGame.disabled=false;}});
els.startGame.addEventListener('click',()=>{if(els.startGame.disabled)return;if(window.isMultiplayer){if(window.mpState==='readyStart'){NET.startReady();window.mpState='waitingStart';els.startGame.textContent='Aguardando oponente iniciar...';els.startGame.disabled=true}else if(!window.mpState){NET.deckChoice(G.playerDeckChoice);if(window.opponentConfirmed){window.mpState='readyStart';els.startGame.textContent='PLAY';els.startGame.disabled=false}else{window.mpState='waitingDeck';els.startGame.textContent='Aguardando oponente confirmar deck...';els.startGame.disabled=true}}}else{if(window.currentGameMode==='story2'){startStory2();return;}showAppScreen('game');initAudio();ensureRunning();stopMenuMusic();startGame()}});
els.openEncy.addEventListener('click',()=>renderEncy('all',false));els.closeEncy.addEventListener('click',()=>{closeEncyCardFocus();els.ency.classList.remove('show');setAriaHidden(els.ency,true);try{if(window.FFFEvents&&typeof window.FFFEvents.emit==='function'){window.FFFEvents.emit('overlay:archive:close',{id:'ency'});}}catch(_){ }});$$('.filters .fbtn').forEach(b=>b.addEventListener('click',()=>{closeEncyCardFocus();renderEncy(b.dataset.deck,false)}));
els.playAgainBtn.addEventListener('click',async ()=>{if(!await confirmExit())return;if(window.isMultiplayer){showMultiplayerDeckSelect();hideEndOverlay();}else{hideEndOverlay();startGame()}});els.rematchBtn.addEventListener('click',async ()=>{if(!await confirmExit())return;if(window.isMultiplayer&&window.NET){NET.requestRematch();els.rematchBtn.disabled=true;els.endSub.textContent='Aguardando oponente';}else{hideEndOverlay();startGame()}});els.menuBtn.addEventListener('click',async ()=>{if(!await confirmExit())return;hideEndOverlay();cleanupTransientUi();applyBattleTheme(null);showAppScreen('deck');cleanupGameElements();startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;G.storyVariant=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='PLAY';els.startGame.disabled=true;}});
if(els.confirmOkBtn && !els.confirmOkBtn.dataset.bound){els.confirmOkBtn.addEventListener('click',()=>{if(confirmModalResolver) confirmModalResolver(true);});els.confirmOkBtn.dataset.bound='1';}
if(els.confirmCancelBtn && !els.confirmCancelBtn.dataset.bound){els.confirmCancelBtn.addEventListener('click',()=>{if(confirmModalResolver) confirmModalResolver(false);});els.confirmCancelBtn.dataset.bound='1';}
if(els.confirmModal && !els.confirmModal.dataset.bound){els.confirmModal.addEventListener('click',event=>{if(event.target===els.confirmModal && confirmModalResolver) confirmModalResolver(false);});els.confirmModal.dataset.bound='1';}
window.startTotemTest=()=>{
  window.currentGameMode='solo';
  const deck=[
    {id:uid(),type:'unit',name:'Rastreador do Fiorde',cost:1,atk:1,hp:2,kw:[]},
    {id:uid(),type:'unit',name:'Ceifeira Ágil',cost:2,atk:3,hp:2,kw:[]},
    {id:uid(),type:'totem',name:'Totem de Fúria',cost:1,buffs:{atk:1}},
    {id:uid(),type:'totem',name:'Totem de Pedra',cost:1,buffs:{hp:1}}
  ];
  G.customDeck=deck.map(c=>Object.assign({},c));
  G.playerDeckChoice='custom';
  showAppScreen('game');
  initAudio();
  ensureRunning();
  stopMenuMusic();
  startGame();
  G.playerHand=G.playerDeck.splice(0);
  G.playerManaCap=10;
  G.playerMana=10;
  renderAll();
  stackHand();
};
function handleMove(move){switch(move.type){case 'summon':{summon('ai',move.card,move.stance,true);applyBattlecryEffects('ai',move.effects||[]);G.aiMana-=move.card.cost;renderAll();break}case 'attack':{const a=G.aiBoard.find(x=>x.id===move.attackerId);const t=G.playerBoard.find(x=>x.id===move.targetId);if(a&&t)attackCard(a,t);break}case 'attackFace':{const a=G.aiBoard.find(x=>x.id===move.attackerId);if(a)attackFace(a,'player');break}}}
function handleTurn(turn){if(turn==='end'){G.current='player';G.chosen=null;updateTargetingUI();newTurn(false,'ai')}}
if(window.NET){NET.onOpponentDeckConfirmed(d=>{G.aiDeckChoice=d;if(window.mpState==='waitingDeck'){els.startGame.textContent='PLAY';els.startGame.disabled=false;window.mpState='readyStart'}else{window.opponentConfirmed=true}});NET.onStartGame(()=>{showAppScreen('game');initAudio();ensureRunning();stopMenuMusic();startGame(NET.isHost()?'player':'ai');window.mpState=null;window.opponentConfirmed=false});NET.onOpponentName(n=>{window.opponentName=n;updateOpponentLabel()})}
if(window.NET){
NET.onMove(handleMove);
NET.onTurn(handleTurn);
NET.onEmoji(e=>showEmoji('opponent',e));
NET.onOpponentDisconnected(()=>{if(window.showReconnect)window.showReconnect('Oponente desconectou. Aguardando reconexão...');});
NET.onOpponentReconnected(()=>{if(window.hideReconnect)window.hideReconnect();});
NET.onOpponentLeft(()=>{if(window.hideReconnect)window.hideReconnect();log('Oponente desconectou.');if(window.isMultiplayer&&els.wrap.style.display==='block')endGame(true);});
NET.onOpponentResigned(()=>endGame(true));
NET.onRematch(()=>{showMultiplayerDeckSelect();hideEndOverlay()});
}
document.addEventListener('DOMContentLoaded',tryStartMenuMusicImmediate);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tryStartMenuMusicImmediate()});

// --- Overrides & helpers (appended) ---
// Expose a card pool for the shop, derived from in-game templates
try{
  window.getCardPoolForShop = function(currentDeck){
    const outByDeck = {};
    const add = (deckKey, raw)=>{
      try{
        const tmp = makeCard(raw);
        const obj = {
          name: tmp.name,
          type: tmp.type,
          atk: tmp.atk||0,
          hp: tmp.hp||0,
          cost: tmp.cost||0,
          text: tmp.text||'',
          desc: tmp.text||'',
          deck: deckKey,
          // preserve artwork hints so shop previews can render character art like the encyclopaedia
          icon: tmp.icon||'',
          emoji: tmp.emoji||'',
          kw: tmp.kw||[],
          battlecry: tmp.battlecry||''
        };
        if(!outByDeck[deckKey]) outByDeck[deckKey] = [];
        outByDeck[deckKey].push(obj);
      }catch(_){ }
    };
    try{
      Object.keys(TEMPLATES).forEach(deckKey=>{
        (TEMPLATES[deckKey]||[]).forEach(raw=>add(deckKey,raw));
      });
    }catch(_){ }
    const all = Object.values(outByDeck).flat();
    return { byDeck: outByDeck, all, current: (outByDeck[currentDeck]||[]) };
  };
}catch(_){ }

function getTotemTheme(t){
  const name=((t&&t.name)||'').toLowerCase();
  if(name.indexOf('fúria')>-1||name.indexOf('furia')>-1) return 'fury';
  if(name.indexOf('lua')>-1||name.indexOf('noite')>-1||name.indexOf('lunar')>-1) return 'lunar';
  if(name.indexOf('olho')>-1||name.indexOf('aurora')>-1||name.indexOf('prisma')>-1) return 'mystic';
  if(name.indexOf('carvalho')>-1||name.indexOf('floresta')>-1||name.indexOf('bosque')>-1) return 'grove';
  return 'ancient';
}
function triggerTotemSlotFx(slot,theme){
  if(!slot) return;
  if(theme){ slot.dataset.theme=theme; } else { try{slot.removeAttribute('data-theme');}catch(_){ } }
  slot.classList.add('totem-anim');
  if(theme){ slot.classList.add('totem-anim-'+theme); }
  slot.classList.add('pop');
  setTimeout(()=>{ try{slot.classList.remove('pop');}catch(_){ } },260);
  setTimeout(()=>{ try{slot.classList.remove('totem-anim'); if(theme) slot.classList.remove('totem-anim-'+theme);}catch(_){ } },720);
}
function applyTotemBuffsWithFx(t){
  if(!G.playerBoard.length||!t)return;
  ensureTotemTargets(t);
  const storyBonus = storyTotemBonus();
  applyTotemBuffs({focusTotem:t,animate:true});
  if(storyBonus && (storyBonus.atk||storyBonus.hp)){
    log(`🗿 Talismã Totêmico: Totem fortalecido com bônus da relíquia!`);
  }
}
function openTotemConfirm(anchor, onConfirm, onCancel){
  const box=document.createElement('div');
  box.className='stance-chooser totem-confirm';
  const bUse=document.createElement('button'); bUse.className='btn'; bUse.textContent='Usar Totem';
  const bCancel=document.createElement('button'); bCancel.className='btn-ghost'; bCancel.textContent='Cancelar';
  const cleanup=()=>{ try{ box.remove(); }catch(_){ } };
  bUse.addEventListener('click',e=>{ e.stopPropagation(); cleanup(); onConfirm&&onConfirm(anchor); });
  bCancel.addEventListener('click',e=>{ e.stopPropagation(); cleanup(); onCancel&&onCancel(); });
  box.append(bUse,bCancel);
  document.body.appendChild(box);
  const r=anchor.getBoundingClientRect();
  Object.assign(box.style,{position:'fixed',left:(r.left+r.width/2)+'px',top:(r.top-8)+'px',transform:'translate(-50%,-100%)'});
  setTimeout(()=>{
    const h=ev=>{ if(ev.target.closest('.totem-confirm')) return; window.removeEventListener('click',h,true); cleanup(); };
    window.addEventListener('click',h,true);
    bUse.focus();
  },0);
}
// Override: add totem confirm + animations and hand->board fly
const __orig_playFromHand = (typeof playFromHand==='function') ? playFromHand : null;
function playFromHand(id,st){
  if(G.current!=='player')return; const i=G.playerHand.findIndex(c=>c.id===id); if(i<0)return; const c=G.playerHand[i]; const boardFull=c.type!=='totem'&&G.playerBoard.length>=5; if(c.cost>G.playerMana||boardFull)return;
  const isT = (c.type==='totem');
  if(isT){
    if(G.totems.length>=3){ log('Número máximo de Totens atingido.'); return; }
    const node = document.querySelector(`#playerHand .card[data-id='${c.id}']`) || document.querySelector('#playerHand .card:last-child');
    const doConfirm = (anchor)=>{ activateTotemById(c.id, anchor); };
    openTotemConfirm(node||document.body, doConfirm, ()=>{});
    return;
  }
  emitCardPlayed(c,{ side:'player', stance:c.type==='spell' ? 'spell' : (st||'attack'), source:'playFromHand' });
  G.playerHand.splice(i,1); G.playerMana-=c.cost;
  summon('player',c,st); renderAll(); sfx(st==='defense'?'defense':'play')
}

// Override renderTotems to include tooltip and unified icon
function renderTotems(){
  const bar=document.getElementById('totemBar');
  if(!bar) return;
  bar.innerHTML='';
  for(let i=0;i<3;i++){
    const slot=document.createElement('div');
    slot.className='totem-slot';
    if(G.totems[i]){
      const t=G.totems[i];
      slot.textContent=totemIcon(t);
      const theme = t.theme || getTotemTheme(t);
      if(theme) slot.dataset.theme = theme; else slot.removeAttribute('data-theme');
      try{ slot.setAttribute('data-tip', `${t.name||'Totem'} — ${describeTotem(t)}`);}catch(_){ }
    }else{
      slot.textContent='';
      slot.removeAttribute('data-theme');
    }
    bar.appendChild(slot);
  }
}
document.addEventListener('pointerdown',()=>{tryStartMenuMusicImmediate()},{once:true});
window.addEventListener('pointerdown',()=>{initAudio();ensureRunning();startMenuMusic('menu')},{once:true});
// Implementation lives inside this closure so it can use G/totemIcon/etc.
window._activateTotemByIdImpl = function(cardId, anchor){
  const i = G.playerHand.findIndex(x=>x.id===cardId);
  if(i<0) return;
  const c = G.playerHand[i];
  if(G.totems.length>=3){ log('Número máximo de Totens atingido.'); return; }
  emitCardPlayed(c,{ side:'player', stance:'totem', source:'activateTotem' });
  G.playerHand.splice(i,1); G.playerMana-=c.cost;
  const t={
    id:c.id,
    name:c.name,
    buffs:c.buffs||{atk:1,hp:1},
    icon:c.icon||totemIcon(c),
    theme:getTotemTheme(c),
    maxTargets:Math.min(3,Math.max(1,G.playerBoard.length||1)),
    desc:describeTotem(c)
  };
  try{ if(!window.animationsDisabled && anchor){
    const r=anchor.getBoundingClientRect();
    Object.assign(anchor.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:1500,margin:'0'});
    document.body.appendChild(anchor);
    const cx=window.innerWidth/2 - r.left - r.width/2;
    const cy=window.innerHeight/2 - r.top - r.height/2;
    requestAnimationFrame(()=>{ anchor.style.transition='transform .35s ease,opacity .35s ease'; anchor.style.transform=`translate(${cx}px,${cy}px) scale(1.02)`; });
    setTimeout(()=>{ anchor.style.transform += ' scale(.85) rotate(-2deg)'; anchor.style.opacity='0'; },200);
    setTimeout(()=>{ try{anchor.remove()}catch(_){ } },460);
    const bar=document.getElementById('totemBar'); const slots=bar?Array.from(bar.children):[]; const idx=G.totems.length; const slot=slots[idx];
    if(slot){ const sr=slot.getBoundingClientRect(); const fly=document.createElement('div'); fly.className='totem-fly'; fly.textContent=t.icon||'🗿'; if(theme) fly.dataset.theme=theme; Object.assign(fly.style,{left:(r.left+r.width/2)+'px',top:(r.top+r.height/2)+'px'}); document.body.appendChild(fly); requestAnimationFrame(()=>{ fly.style.transform=`translate(${(sr.left+sr.width/2)-(r.left+r.width/2)}px, ${(sr.top+sr.height/2)-(r.top+r.height/2)}px) scale(1)`; fly.style.opacity='1'; }); setTimeout(()=>{ try{fly.remove()}catch(_){ } try{ const barNow=document.getElementById('totemBar'); const liveSlot=barNow&&barNow.children?barNow.children[idx]:null; triggerTotemSlotFx(liveSlot||slot, theme); }catch(_){ } },420); }
  } }catch(_){ }
  G.totems.push(t);
  applyTotemBuffsWithFx(t);
  log(`${c.name} ativado.`);
  renderAll();
};
function ensureTestStoryState(){
  if(!G.story) G.story = new StoryMode({ level:1, startGold:80 });
  G.playerDeckChoice = G.playerDeckChoice || 'vikings';
  G.aiDeckChoice = G.aiDeckChoice || 'animais';
  G.playerHP = Math.max(1, G.playerHP || 24);
  G.story.gold = Math.max(80, G.story.gold || 80);
  G.story.currentEncounter = G.story.currentEncounter || 'normal';
  if(!Array.isArray(G.story.deck) || !G.story.deck.length){
    G.story.deck = (TEMPLATES[G.playerDeckChoice] || []).slice(0, 9).map(makeCard);
  }
  storyEnsureMap(G.story);
  return G.story;
}
function ensureTestBattleState(){
  window.currentGameMode = 'solo';
  G.playerDeckChoice = G.playerDeckChoice || 'vikings';
  G.aiDeckChoice = G.aiDeckChoice || 'animais';
  showAppScreen('game');
  initAudio();
  ensureRunning();
  stopMenuMusic();
  startGame();
  G.playerManaCap = 10;
  G.playerMana = 10;
  G.aiManaCap = 10;
  G.aiMana = 10;
  renderAll();
  stackHand();
}
const VISUAL_FX_LAB_CARD_ID = 'visual-fx-lab-card';
function getVisualFxLabCard(){
  const raw = (TEMPLATES.vikings||[])[0] || (TEMPLATES.animais||[])[0] || null;
  if(!raw) return null;
  const card = makeCard(raw);
  card.id = VISUAL_FX_LAB_CARD_ID;
  card.atk = card.baseAtk = 4;
  card.hp = card.baseHp = 5;
  card.cost = Math.max(1, card.cost || 1);
  card._labPreview = true;
  return card;
}
function ensureVisualFxLabPreview(){
  const slot = document.getElementById('visualFxCardSlot');
  if(!slot) return null;
  let node = slot.querySelector(`.card[data-id="${VISUAL_FX_LAB_CARD_ID}"]`);
  if(node) return node;
  const card = getVisualFxLabCard();
  if(!card) return null;
  slot.innerHTML = '';
  node = cardNode(card, 'player', true);
  node.dataset.id = VISUAL_FX_LAB_CARD_ID;
  node.classList.add('visual-fx-lab-card');
  slot.appendChild(node);
  return node;
}
function clearVisualFxLabOverlay(){
  const overlay = document.getElementById('visualFxOverlay');
  if(overlay) overlay.innerHTML = '';
}
function spawnVisualFxLabNode(className, styles={}){
  const overlay = document.getElementById('visualFxOverlay');
  if(!overlay) return null;
  const node = document.createElement('div');
  node.className = className;
  Object.keys(styles).forEach(key => node.style.setProperty(key, styles[key]));
  overlay.appendChild(node);
  return node;
}
function visualFxLabBounds(){
  const overlay = document.getElementById('visualFxOverlay');
  const card = ensureVisualFxLabPreview();
  if(!overlay || !card) return null;
  const overlayRect = overlay.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  return {
    overlay,
    left: cardRect.left - overlayRect.left,
    top: cardRect.top - overlayRect.top,
    width: cardRect.width,
    height: cardRect.height,
    centerX: (cardRect.left - overlayRect.left) + (cardRect.width / 2),
    centerY: (cardRect.top - overlayRect.top) + (cardRect.height / 2)
  };
}
function flashVisualFxLabCard(className, duration=360){
  const card = ensureVisualFxLabPreview();
  if(!card) return;
  card.classList.remove(className);
  void card.offsetWidth;
  card.classList.add(className);
  setTimeout(()=>{ try{ card.classList.remove(className); }catch(_){ } }, duration);
}
function runVisualFxLabAction(action){
  const bounds = visualFxLabBounds();
  if(!bounds) return;
  clearVisualFxLabOverlay();
  const toneMap = {
    battle: '#7cc4ff',
    end: '#fb7185',
    spell: '#a78bfa',
    totem: '#22d3ee',
    damage: '#fb7185',
    heal: '#4ade80',
    mana: '#60a5fa',
    buff: '#facc15',
    debuff: '#f97316'
  };
  const themedAttackMap = {
    flame: { primary: '#f97316', secondary: '#fb7185', accent: '#fdba74', label: 'Flame' },
    storm: { primary: '#a78bfa', secondary: '#60a5fa', accent: '#e9d5ff', label: 'Storm' },
    tidal: { primary: '#38bdf8', secondary: '#22d3ee', accent: '#e0f2fe', label: 'Tidal' },
    feral: { primary: '#84cc16', secondary: '#facc15', accent: '#fef08a', label: 'Feral' },
    heavy: { primary: '#f59e0b', secondary: '#fb7185', accent: '#ffedd5', label: 'Heavy' },
    mystic: { primary: '#c084fc', secondary: '#67e8f9', accent: '#f5d0fe', label: 'Mystic' }
  };
  const themedEntryMap = {
    mystic: { primary: '#c084fc', secondary: '#67e8f9', accent: '#f5d0fe', label: 'Entrada' },
    floresta: { primary: '#4ade80', secondary: '#84cc16', accent: '#dcfce7', label: 'Broto' }
  };
  const themedSupportMap = {
    floresta: { primary: '#4ade80', secondary: '#84cc16', accent: '#dcfce7', label: '+2 HP' },
    pescadores: { primary: '#38bdf8', secondary: '#22d3ee', accent: '#e0f2fe', label: '+1 Mana' },
    feral: { primary: '#84cc16', secondary: '#facc15', accent: '#fef08a', label: 'Buff' },
    heavy: { primary: '#f59e0b', secondary: '#fb7185', accent: '#ffedd5', label: 'Debuff' }
  };
  const ring = (color, scale='1') => spawnVisualFxLabNode('visual-fx-ring', {
    '--fx-color': color,
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    transform: `scale(${scale})`
  });
  const flash = color => spawnVisualFxLabNode('visual-fx-flash', {
    '--fx-color': color,
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`
  });
  const pill = (color, text, yOffset=0) => {
    const node = spawnVisualFxLabNode('visual-fx-pill', {
      '--fx-color': color,
      left: `${bounds.centerX}px`,
      top: `${bounds.centerY + yOffset}px`
    });
    if(node) node.textContent = text;
  };
  const orb = (color, x, y) => spawnVisualFxLabNode('visual-fx-orb', {
    '--fx-color': color,
    left: `${x}px`,
    top: `${y}px`
  });
  const slash = (color, rot) => spawnVisualFxLabNode('visual-fx-slash', {
    '--fx-color': color,
    '--fx-rot': `${rot}deg`,
    left: `${bounds.centerX}px`,
    top: `${bounds.centerY}px`,
    width: `${Math.max(54, bounds.width * 0.42)}px`
  });
  const themedAttack = theme => {
    const palette = themedAttackMap[theme];
    if(!palette) return;
    flashVisualFxLabCard('hit');
    ring(palette.primary, '.9');
    flash(palette.accent);
    slash(palette.secondary, 32);
    slash(palette.accent, -28);
    orb(palette.primary, bounds.centerX - 12, bounds.centerY + 10);
    orb(palette.secondary, bounds.centerX + 14, bounds.centerY - 4);
    pill(palette.primary, palette.label, -4);
  };
  const themedEntry = theme => {
    const palette = themedEntryMap[theme];
    if(!palette) return;
    ring(palette.primary, '.84');
    flash(palette.accent);
    orb(palette.secondary, bounds.centerX - 16, bounds.centerY + 14);
    orb(palette.primary, bounds.centerX + 16, bounds.centerY + 8);
    pill(palette.primary, palette.label, -8);
  };
  const themedSupport = (theme, kind) => {
    const palette = themedSupportMap[theme];
    if(!palette) return;
    if(kind === 'heal' || kind === 'buff') flashVisualFxLabCard('buffed');
    else flashVisualFxLabCard('hit');
    ring(palette.primary, kind === 'debuff' ? '.94' : '.9');
    orb(palette.secondary, bounds.centerX, bounds.centerY + 14);
    if(kind === 'debuff'){
      slash(palette.primary, 35);
      slash(palette.accent, -35);
    }else if(kind === 'buff'){
      flash(palette.accent);
    }
    pill(palette.primary, palette.label, -6);
  };
  const abilityCue = (primary, secondary, accent, label) => {
    ring(secondary, '.92');
    flash(accent);
    orb(primary, bounds.centerX, bounds.centerY + 10);
    pill(primary, label, -8);
  };
  const characterCue = (primary, secondary, label) => {
    ring(primary, '.9');
    orb(secondary, bounds.centerX, bounds.centerY + 6);
    pill(primary, label, -8);
  };
  const textFloat = (primary, label) => {
    orb(primary, bounds.centerX, bounds.centerY + 4);
    pill(primary, label, -4);
  };
  const bannerFx = (primary, title, subtitle='') => {
    ring(primary, '1.06');
    flash(primary);
    pill(primary, title, -26);
    if(subtitle) pill(primary, subtitle, 8);
  };
  const arrowFx = () => {
    slash('#60a5fa', -12);
    slash('#e0e7ff', -12);
    orb('#60a5fa', bounds.centerX + Math.max(48, bounds.width * 0.34), bounds.centerY - 8);
  };
  const faceBurst = (color, text) => {
    ring(color, '1.06');
    flash(color);
    pill(color, text, -8);
    slash(color, 35);
    slash(color, -35);
  };

  switch(action){
    case 'battle-start':
      ring(toneMap.battle, '.92');
      flash(toneMap.battle);
      pill(toneMap.battle, 'Batalha', -8);
      break;
    case 'battle-end':
      ring(toneMap.end, '1');
      flash(toneMap.end);
      pill(toneMap.end, 'Fim', -8);
      break;
    case 'play-unit':
      ring(toneMap.mana, '.82');
      flash(toneMap.mana);
      orb(toneMap.mana, bounds.centerX, bounds.centerY);
      pill(toneMap.mana, 'Invocar', -8);
      break;
    case 'play-spell':
      ring(toneMap.spell, '.84');
      orb(toneMap.spell, bounds.centerX - 18, bounds.centerY + 14);
      orb(toneMap.spell, bounds.centerX + 18, bounds.centerY + 10);
      pill(toneMap.spell, 'Spell', -8);
      break;
    case 'play-totem':
      ring(toneMap.totem, '.86');
      flash(toneMap.totem);
      pill(toneMap.totem, 'Totem', -8);
      break;
    case 'play-mystic':
      themedEntry('mystic');
      break;
    case 'play-floresta':
      themedEntry('floresta');
      break;
    case 'impact-card':
      flashVisualFxLabCard('hit');
      ring(toneMap.damage, '.94');
      slash(toneMap.damage, 35);
      slash(toneMap.damage, -35);
      pill(toneMap.damage, 'Impacto', -4);
      break;
    case 'explode-card':
      flashVisualFxLabCard('hit');
      ring('#ffa861', '1.04');
      flash('#ffa861');
      orb('#ffa861', bounds.centerX - 14, bounds.centerY + 8);
      orb('#fb7185', bounds.centerX + 14, bounds.centerY + 2);
      pill('#ffa861', 'Explosao', -4);
      break;
    case 'screen-slash':
      flashVisualFxLabCard('hit');
      slash('#fb7185', 18);
      slash('#ffe4e6', 18);
      orb('#fb7185', bounds.centerX, bounds.centerY);
      break;
    case 'attack-flame':
      themedAttack('flame');
      break;
    case 'attack-storm':
      themedAttack('storm');
      break;
    case 'attack-tidal':
      themedAttack('tidal');
      break;
    case 'attack-feral':
      themedAttack('feral');
      break;
    case 'attack-heavy':
      themedAttack('heavy');
      break;
    case 'attack-mystic':
      themedAttack('mystic');
      break;
    case 'cue-mana':
      abilityCue('#60a5fa', '#38bdf8', '#e0f2fe', 'Mana');
      break;
    case 'cue-spell':
      abilityCue('#a78bfa', '#c084fc', '#f5d0fe', 'Spell');
      break;
    case 'cue-totem':
      abilityCue('#22d3ee', '#67e8f9', '#ccfbf1', 'Totem');
      break;
    case 'cue-attack':
      characterCue('#93c5fd', '#e0f2fe', 'Ataque');
      break;
    case 'cue-hit':
      flashVisualFxLabCard('hit');
      characterCue('#fb7185', '#ffa861', 'Hit');
      break;
    case 'cue-death':
      flashVisualFxLabCard('hit');
      characterCue('#f97316', '#fdba74', 'Morte');
      break;
    case 'death-burn':
      flashVisualFxLabCard('hit');
      ring('#f97316', '1.02');
      orb('#f97316', bounds.centerX - 10, bounds.centerY + 14);
      orb('#fdba74', bounds.centerX + 12, bounds.centerY + 8);
      pill('#f97316', 'Burn', -6);
      break;
    case 'text-buff':
      flashVisualFxLabCard('buffed');
      textFloat('#facc15', '+1/+1');
      break;
    case 'text-heal':
      flashVisualFxLabCard('buffed');
      textFloat('#4ade80', '+2');
      break;
    case 'text-dmg':
      flashVisualFxLabCard('hit');
      textFloat('#fb7185', '-3');
      break;
    case 'banner-enemy':
      bannerFx('#7cc4ff', 'Inimigo', 'Round 1');
      break;
    case 'banner-victory':
      bannerFx('#34d399', 'Vitoria!', 'Inimigo derrotado');
      break;
    case 'meter-hit':
      ring('#fb7185', '1.02');
      pill('#fb7185', 'HP', -4);
      break;
    case 'meter-heal':
      ring('#4ade80', '.98');
      pill('#4ade80', 'Heal', -4);
      break;
    case 'meter-mana':
      ring('#60a5fa', '.98');
      pill('#60a5fa', 'Mana', -4);
      break;
    case 'turn-ui-player':
      emitVisualEvent('visual:turn-ui', { side:'player', yourTurn:true, source:'visual-fx-lab' });
      ring('#7cc4ff', '1.1');
      flash('#7cc4ff');
      pill('#7cc4ff', 'Seu turno', -6);
      break;
    case 'turn-ui-ai':
      emitVisualEvent('visual:turn-ui', { side:'ai', yourTurn:false, source:'visual-fx-lab' });
      ring('#fb7185', '1.1');
      flash('#fb7185');
      pill('#fb7185', 'Oponente', -6);
      break;
    case 'board-pulse':
      ring('#7cc4ff', '1.18');
      pill('#7cc4ff', 'Board', -4);
      break;
    case 'spell-cast':
      flash('#a78bfa');
      ring('#a78bfa', '.98');
      orb('#c084fc', bounds.centerX, bounds.centerY + 8);
      pill('#a78bfa', 'Spell', -6);
      break;
    case 'totem-cast':
      flash('#22d3ee');
      ring('#22d3ee', '.98');
      orb('#67e8f9', bounds.centerX, bounds.centerY + 8);
      pill('#22d3ee', 'Totem', -6);
      break;
    case 'celebration-victory':
      ring('#34d399', '1.12');
      flash('#34d399');
      orb('#bbf7d0', bounds.centerX - 18, bounds.centerY + 10);
      orb('#34d399', bounds.centerX + 18, bounds.centerY + 2);
      pill('#34d399', 'Vitoria!', -6);
      break;
    case 'celebration-defeat':
      ring('#fb7185', '1.12');
      flash('#fb7185');
      orb('#fecdd3', bounds.centerX - 18, bounds.centerY + 10);
      orb('#fb7185', bounds.centerX + 18, bounds.centerY + 2);
      pill('#fb7185', 'Derrota', -6);
      break;
    case 'impact-ring':
      ring('#f59e0b', '1.08');
      break;
    case 'attack-arrow':
      arrowFx();
      break;
    case 'damage-player':
    case 'damage-ai':
      flashVisualFxLabCard('hit');
      ring(toneMap.damage, '.94');
      slash(toneMap.damage, 35);
      slash(toneMap.damage, -35);
      pill(toneMap.damage, '-2 HP', -4);
      break;
    case 'face-player':
      faceBurst(toneMap.damage, 'Face');
      break;
    case 'face-ai':
      faceBurst('#ffa861', 'Face');
      break;
    case 'heal-player':
    case 'heal-ai':
      flashVisualFxLabCard('buffed');
      ring(toneMap.heal, '.92');
      orb(toneMap.heal, bounds.centerX, bounds.centerY + 14);
      pill(toneMap.heal, '+2 HP', -6);
      break;
    case 'heal-floresta':
      themedSupport('floresta', 'heal');
      break;
    case 'mana-player':
    case 'mana-ai':
      ring(toneMap.mana, '.9');
      orb(toneMap.mana, bounds.centerX, bounds.centerY + 18);
      pill(toneMap.mana, '+1 Mana', 0);
      break;
    case 'mana-pescadores':
      themedSupport('pescadores', 'mana');
      break;
    case 'buff-player':
    case 'buff-ai':
      flashVisualFxLabCard('buffed');
      ring(toneMap.buff, '.9');
      flash(toneMap.buff);
      pill(toneMap.buff, 'Buff', -6);
      break;
    case 'buff-feral':
      themedSupport('feral', 'buff');
      break;
    case 'debuff-player':
    case 'debuff-ai':
      flashVisualFxLabCard('hit');
      ring(toneMap.debuff, '.94');
      pill(toneMap.debuff, 'Debuff', -6);
      break;
    case 'debuff-heavy':
      themedSupport('heavy', 'debuff');
      break;
  }

  const overlay = document.getElementById('visualFxOverlay');
  if(overlay){
    window.clearTimeout(runVisualFxLabAction._resetTimer);
    runVisualFxLabAction._resetTimer = window.setTimeout(()=>clearVisualFxLabOverlay(), 760);
  }
}
function showVisualFxLab(){
  const modal = document.getElementById('visualFxModal');
  const grid = document.getElementById('visualFxGrid');
  if(!modal || !grid) return;
  ensureVisualFxLabPreview();
  clearVisualFxLabOverlay();
  showModal(modal);
  if(!grid.dataset.bound){
    grid.addEventListener('click', (event)=>{
      const btn = event.target && event.target.closest ? event.target.closest('[data-vfx-action]') : null;
      if(!btn) return;
      runVisualFxLabAction(btn.dataset.vfxAction);
    });
    grid.dataset.bound = '1';
  }
  const closeBtn = document.getElementById('visualFxClose');
  if(closeBtn && !closeBtn.dataset.bound){
    closeBtn.addEventListener('click', ()=>closeModal(modal));
    closeBtn.dataset.bound = '1';
  }
}
function runGameTest(kind){
  switch(kind){
    case 'shop':
      ensureTestStoryState();
      if(window.openShop) window.openShop({ faction:'random', gold:9999, unlimited:true });
      break;
    case 'map':
      storyChooseNextNode(ensureTestStoryState(), ()=>{});
      break;
    case 'event':
      ensureTestStoryState();
      showRandomEvent(()=>{}, { source:'map' });
      break;
    case 'rest':
      ensureTestStoryState();
      showRestModal(()=>{});
      break;
    case 'relic':
      ensureTestStoryState();
      showRelicChoice(()=>{});
      break;
    case 'rewards':
      ensureTestStoryState();
      showRewardsModal(['Nova carta','Evoluir carta','Ganhar Totem','Buff permanente','Relíquia'], ()=>{});
      break;
    case 'removal':
      ensureTestStoryState();
      showCardRemoval({ onComplete:()=>{} });
      break;
    case 'upgrade':{
      const story = ensureTestStoryState();
      const card = story.deck && story.deck[0];
      if(card) showEventUpgradeOverlay(card, { bonus:1, subtitle:'Sandbox de teste' }, ()=>{});
      break;
    }
    case 'reward-card':{
      const story = ensureTestStoryState();
      const card = story.deck && story.deck[0];
      if(card) showEventRewardOverlay(card, { title:'Carta de Evento', subtitle:'Sandbox de teste' });
      break;
    }
    case 'ency':
      renderEncy('all', false);
      break;
    case 'totem':
      window.startTotemTest && window.startTotemTest();
      break;
    case 'visual-fx':
      showVisualFxLab();
      break;
    case 'story-battle':
      ensureTestBattleState();
      break;
    case 'story-win':
      window.storyTestMode = true;
      window.currentGameMode = 'story';
      showAppScreen('deck');
      break;
  }
}
try{
  window.makeCard = makeCard;
  window.TEMPLATES = TEMPLATES;
  window.StoryMode = StoryMode;
  window.storyEnsureMap = storyEnsureMap;
  window.storyChooseNextNode = storyChooseNextNode;
  window.showRestModal = showRestModal;
  window.showRelicChoice = showRelicChoice;
  window.showRewardsModal = showRewardsModal;
  window.showRandomEvent = showRandomEvent;
  window.showEventUpgradeOverlay = showEventUpgradeOverlay;
  window.showEventRewardOverlay = showEventRewardOverlay;
  window.renderEncy = renderEncy;
  window.showVisualFxLab = showVisualFxLab;
  window.cleanupTransientUi = cleanupTransientUi;
  window.runGameTest = runGameTest;
}catch(_){ }
})();
function activateTotemById(cardId, anchor){
  if(window._activateTotemByIdImpl) return window._activateTotemByIdImpl(cardId, anchor);
  const i = G.playerHand.findIndex(x=>x.id===cardId);
  if(i<0) return;
  const c = G.playerHand[i];
  if(G.totems.length>=3){ log('Número máximo de Totens atingido.'); return; }
  emitCardPlayed(c,{ side:'player', stance:'totem', source:'activateTotem' });
  G.playerHand.splice(i,1); G.playerMana-=c.cost;
  const t={
    id:c.id,
    name:c.name,
    buffs:c.buffs||{atk:1,hp:1},
    icon:c.icon||totemIcon(c),
    theme:getTotemTheme(c),
    maxTargets:Math.min(3,Math.max(1,G.playerBoard.length||1)),
    desc:describeTotem(c)
  };
  try{ if(!window.animationsDisabled && anchor){
    const r=anchor.getBoundingClientRect();
    Object.assign(anchor.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:1500,margin:'0'});
    document.body.appendChild(anchor);
    const cx=window.innerWidth/2 - r.left - r.width/2;
    const cy=window.innerHeight/2 - r.top - r.height/2;
    requestAnimationFrame(()=>{ anchor.style.transition='transform .35s ease,opacity .35s ease'; anchor.style.transform=`translate(${cx}px,${cy}px) scale(1.02)`; });
    setTimeout(()=>{ anchor.style.transform += ' scale(.85) rotate(-2deg)'; anchor.style.opacity='0'; },200);
    setTimeout(()=>{ try{anchor.remove()}catch(_){ } },460);
    const bar=document.getElementById('totemBar'); const slots=bar?Array.from(bar.children):[]; const idx=G.totems.length; const slot=slots[idx];
    if(slot){ const sr=slot.getBoundingClientRect(); const fly=document.createElement('div'); fly.className='totem-fly'; fly.textContent=t.icon||'🗿'; if(theme) fly.dataset.theme=theme; Object.assign(fly.style,{left:(r.left+r.width/2)+'px',top:(r.top+r.height/2)+'px'}); document.body.appendChild(fly); requestAnimationFrame(()=>{ fly.style.transform=`translate(${(sr.left+sr.width/2)-(r.left+r.width/2)}px, ${(sr.top+sr.height/2)-(r.top+r.height/2)}px) scale(1)`; fly.style.opacity='1'; }); setTimeout(()=>{ try{fly.remove()}catch(_){ } try{ const barNow=document.getElementById('totemBar'); const liveSlot=barNow&&barNow.children?barNow.children[idx]:null; triggerTotemSlotFx(liveSlot||slot, theme); }catch(_){ } },420); }
  } }catch(_){ }
  G.totems.push(t);
  applyTotemBuffsWithFx(t);
  log(`${c.name} ativado.`);
  renderAll();
}
