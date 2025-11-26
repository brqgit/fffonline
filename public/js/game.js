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
}
const setAriaHidden=(node,hidden)=>{if(!node)return;try{if(hidden){const ae=document.activeElement; if(ae && node.contains(ae)){ try{ae.blur()}catch(_){ } } node.setAttribute('inert','');} else { node.removeAttribute('inert'); }}catch(_){ } node.setAttribute('aria-hidden',hidden?'true':'false')};
const focusDialog=node=>{if(!node)return;const target=node.querySelector('[autofocus],button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');if(target&&typeof target.focus==='function'){target.focus()}};
const AUDIO_ENABLED = true;
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

function playCharacterCue(card,stage){
  if(!card) return;
  const profile = deriveAudioProfile(card);
  let bank = null;
  switch(stage){
    case 'hit': bank = CHARACTER_HIT_CUES; break;
    case 'death': bank = CHARACTER_DEATH_CUES; break;
    default: bank = CHARACTER_ATTACK_CUES; break;
  }
  if(!bank) return;
  let clip = null;
  if(profile.element) clip = pickClip(bank, profile.element);
  if(!clip && profile.race) clip = pickClip(bank, profile.race);
  if(!clip && profile.gender) clip = pickClip(bank, profile.gender);
  if(!clip) clip = pickClip(bank);
  if(clip) playBufferedClip(clip, { volume: stage==='hit' ? .7 : .85 });
}

function playAbilityCue(effect,card){
  const profile = card ? deriveAudioProfile(card) : null;
  let clip = null;
  if(profile && profile.element) clip = pickClip(ABILITY_CUES, profile.element);
  if(!clip && effect) clip = pickClip(ABILITY_CUES, effect);
  if(!clip) clip = pickClip(ABILITY_CUES);
  if(clip) playBufferedClip(clip, { volume: .8 });
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
      BC_NAMES={draw1:'Percepção',heal2:'Cura',ping1:'Golpe',buffRandom1:'Benção',buffAlliesAtk1:'Comando',mana1:'Canalizar',mana2:'Canalizar II',sacMana:'Sacrifício'},
      BC_TIPS={draw1:'Compra 1 carta ao entrar',heal2:'Cura 2 de um aliado ao entrar',ping1:'Causa 1 de dano aleatório ao entrar',buffRandom1:'Concede +1/+1 a um aliado aleatório ao entrar',buffAlliesAtk1:'Aliados ganham +1 ATK',mana1:'Ganha 1 de mana ao entrar',mana2:'Ganha 2 de mana ao entrar',sacMana:'Sacrifica um aliado e ganha mana igual ao custo'};
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
function deriveStatsFromName(name){const n=name.toLowerCase();let atk=3,hp=3,kw='',bc='',text='';if(/guard/i.test(n)){atk=2;hp=5;kw='P';text='Protetor'}else if(/mago|mistico/.test(n)){atk=2;hp=3;bc='H2';text='Entra: cura 2'}else if(/guerreiro|batalhador|raider|lobo|raposa/.test(n)){atk=4;hp=2;kw='F';text='Furioso'}else if(/fogueira|estandarte/.test(n)){atk=1;hp=1;bc='BR1';text='Entra: +1/+1 aleatório'}else if(/coruja/.test(n)){atk=1;hp=2;bc='D1';text='Entra: compre 1'}else if(/serpente/.test(n)){atk=5;hp=4}else if(/alce|urso|bode|cervo/.test(n)){atk=4;hp=5;kw='P';text='Protetor'}return{atk,hp,kw,bc,text};}
function buildDeck(key){const tribe=key==='vikings'||key==='pescadores'?'Viking':'Animal';return (DECK_IMAGES[key]||[]).map(fn=>{const name=normalizeCardName(fn);const s=deriveStatsFromName(name);const cost=Math.max(1,Math.round((s.atk+s.hp)/2));return [name,'',tribe,s.atk,s.hp,cost,s.text,s.kw,s.bc,fn];});}
const TEMPLATES={
vikings:[...buildDeck('vikings')],
animais:[...buildDeck('animais')],
pescadores:[...buildDeck('pescadores')],
floresta:[...buildDeck('floresta')],
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
window.hydrateCardArt=hydrateCardArt;

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
  constructor({level=1,bossInterval=10,eliteEvery=5,eventEvery=4,startGold=30,maxTotems=3}={}){this.level=level;this.round=0;this.totems=[];this.deck=[];this.scaling=0;this.xp=0;this.gold=startGold;this.startGold=startGold;this.bossInterval=bossInterval;this.eliteEvery=eliteEvery;this.eventEvery=eventEvery;this.currentEncounter='normal';this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this.relics=[];this.eventsSeen=[];this._startManaGranted=false;this.lastShopEventRound=0;this.maxTotems=maxTotems;}
  nextRound(){this.round+=1;this.scaling=Math.floor(this.round/2)+(this.level-1);const isBoss=this.round%this.bossInterval===0;const isElite=!isBoss&&this.round%this.eliteEvery===0;const isEvent=!isBoss&&!isElite&&this.eventEvery>0&&this.round>2&&this.round%this.eventEvery===0;this.currentEncounter=isBoss?'boss':isElite?'elite':isEvent?'event':'normal';return{isBoss,isElite,isEvent};}
  handleVictory(){const xpGain=this.currentEncounter==='boss'?20:this.currentEncounter==='elite'?10:5;const goldGain=this.currentEncounter==='boss'?20:this.currentEncounter==='elite'?10:5;this.xp+=xpGain;this.gold+=goldGain;if(typeof updateGoldHUD==='function')updateGoldHUD();const leveled=this.checkLevelUp();return{leveled,rewards:this.rewardOptions(),goldGain,isBoss:this.currentEncounter==='boss'};}
  rewardOptions(){const isBoss=this.currentEncounter==='boss';const baseRewards=['Nova carta','Evoluir carta','Ganhar Totem'];if(isBoss||Math.random()<0.3){baseRewards.push('Buff permanente');}return baseRewards;}
  checkLevelUp(){const need=this.level*50;if(this.xp>=need){this.level+=1;this.xp-=need;return true}return false}
  addTotem(t){if(this.totems.length>=(this.maxTotems||3))return false;this.totems.push(t);return true}
  addRelic(relic){if(!this.relics.find(r=>r.id===relic.id)){this.relics.push(relic);return true;}return false;}
  hasRelic(id){return this.relics.some(r=>r.id===id);}
  registerBonus(bonus,src){if(!bonus)return'';const notes=[];if(bonus.startMana){this.bonuses.startMana+=bonus.startMana;notes.push('+'+bonus.startMana+' mana inicial');}if(bonus.killMana){this.bonuses.killMana+=bonus.killMana;notes.push('+'+bonus.killMana+' mana por eliminacao');}if(bonus.allyBuff){this.bonuses.allyBuff.atk+=bonus.allyBuff.atk||0;this.bonuses.allyBuff.hp+=bonus.allyBuff.hp||0;if(bonus.allyBuff.atk)notes.push('Aliados +'+bonus.allyBuff.atk+' ATK');if(bonus.allyBuff.hp)notes.push('Aliados +'+bonus.allyBuff.hp+' HP');}if(bonus.totemBonus){this.bonuses.totemBonus.atk+=bonus.totemBonus.atk||0;this.bonuses.totemBonus.hp+=bonus.totemBonus.hp||0;if(bonus.totemBonus.atk||bonus.totemBonus.hp)notes.push('Totens fortalecidos');}if(src&&src.name){this.bonuses.items.push(src.name);}return notes.join(', ');}
  reset(){this.round=0;this.totems=[];this.deck=[];this.xp=0;this.gold=this.startGold||30;this.currentEncounter='normal';this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this.relics=[];this.eventsSeen=[];this._startManaGranted=false;if(typeof updateGoldHUD==='function')updateGoldHUD();}
}

const ALL_DECKS=Object.keys(TEMPLATES);
const G={playerHP:30,aiHP:30,turn:0,playerMana:0,playerManaCap:0,aiMana:0,aiManaCap:0,current:'player',playerDeck:[],aiDeck:[],playerHand:[],aiHand:[],playerBoard:[],aiBoard:[],playerDiscard:[],aiDiscard:[],chosen:null,lastChosenId:null,playerDeckChoice:'vikings',aiDeckChoice:rand(ALL_DECKS),customDeck:null,mode:'solo',story:null,story2:null,storyVariant:null,enemyScaling:0,maxHandSize:5,totems:[]};
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
const els={pHP:$('#playerHP'),pHP2:$('#playerHP2'),aHP:$('#aiHP'),aHP2:$('#aiHP2'),opponentLabel:$('#opponentLabel'),mana:$('#mana'),aiMana:$('#aiMana'),pHand:$('#playerHand'),pBoard:$('#playerBoard'),aBoard:$('#aiBoard'),endBtn:$('#endTurnBtn'),instantWinBtn:$('#instantWinBtn'),muteBtn:$('#muteBtn'),aAva:$('#aiAvatar'),drawCount:$('#drawCount'),discardCount:$('#discardCount'),barPHP:$('#barPlayerHP'),barAHP:$('#barAiHP'),barMana:$('#barMana'),barAiMana:$('#barAiMana'),wrap:$('#gameWrap'),start:$('#start'),openEncy:$('#openEncy'),ency:$('#ency'),encyGrid:$('#encyGrid'),encyFilters:$('#encyFilters'),closeEncy:$('#closeEncy'),startGame:$('#startGame'),endOverlay:$('#endOverlay'),endMsg:$('#endMsg'),endSub:$('#endSub'),playAgainBtn:$('#playAgainBtn'),rematchBtn:$('#rematchBtn'),menuBtn:$('#menuBtn'),openMenuBtn:$('#openMenuBtn'),gameMenu:$('#gameMenu'),closeMenuBtn:$('#closeMenuBtn'),resignBtn:$('#resignBtn'),restartBtn:$('#restartBtn'),mainMenuBtn:$('#mainMenuBtn'),turnIndicator:$('#turnIndicator'),emojiBar:$('#emojiBar'),playerEmoji:$('#playerEmoji'),opponentEmoji:$('#opponentEmoji'),deckBuilder:$('#deckBuilder'),saveDeck:$('#saveDeck')};
const bodyEl=document.body||document.querySelector('body');
let story2UI=null;
function applyBattleTheme(theme){
  if(!bodyEl) return;
  const wrap = els.wrap;
  if(!theme){
    bodyEl.removeAttribute('data-battle-theme');
    if(wrap) wrap.removeAttribute('data-battle-theme');
    setBattleAmbience(null);
    return;
  }
  bodyEl.setAttribute('data-battle-theme', theme);
  if(wrap) wrap.setAttribute('data-battle-theme', theme);
  setBattleAmbience(theme);
}
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
  #story2Wrap .btn{cursor:pointer;}
  .s2-hud{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;}
  .s2-route{background:#111827;padding:8px;border:1px solid #1f2937;border-radius:8px;}
  .s2-nodes{display:flex;gap:8px;flex-wrap:wrap;}
  .s2-node{padding:6px 10px;border-radius:6px;border:1px solid #1f2937;background:#0f172a;font-size:12px;}
  .s2-node.active{border-color:#38bdf8;color:#38bdf8;}
  .s2-arena{flex:1;display:flex;flex-direction:column;gap:8px;border:1px solid #1f2937;background:#0f172a;padding:10px;border-radius:10px;min-height:260px;}
  .s2-enemies,.s2-allies{display:flex;gap:10px;align-items:flex-end;min-height:100px;}
  .s2-card{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:8px;min-width:110px;max-width:150px;cursor:pointer;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 8px rgba(0,0,0,.35);}
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
  vikings:{folder:'farm-vikings',back:'fv',dbExt:'png',cbExt:'webp'},
  pescadores:{folder:'fJord-fishers',back:'jf',dbExt:'webp',cbExt:'webp'},
  floresta:{folder:'forest-beasts',back:'fb',dbExt:'webp',cbExt:'webp'},
  animais:{folder:'north-beasts',back:'nb',dbExt:'webp',cbExt:'webp'}
};
const DECK_ASSET_INDEX = Object.fromEntries(Object.entries(DECK_IMAGES).map(([deck,list])=>{
  const norm = list.map(n=>n.replace(/\.[^.]+$/,'')).map(n=>n.replace(/^\d+[_-]?/, '').toLowerCase());
  return [deck, new Set(norm)];
}));
const IMG_CACHE={};
function preloadAssets(){
  for(const [key,info] of Object.entries(DECK_ASSETS)){
  const dbSrc=`img/decks/${info.folder}/deck-backs/${info.back}-db-default.${info.dbExt}`;
    const dbImg=new Image();
    dbImg.src=dbSrc;
    IMG_CACHE[dbSrc]=dbImg;
  const cbSrc=`img/decks/${info.folder}/card-backs/${info.back}-cb-default.${info.cbExt}`;
    const cbImg=new Image();
    cbImg.src=cbSrc;
    IMG_CACHE[cbSrc]=cbImg;
    (DECK_IMAGES[key]||[]).forEach(fn=>{
  const src=`img/decks/${info.folder}/characters/${fn.replace(/\.[^.]+$/,'')}.png`;
      const img=new Image();
      img.src=src;
      IMG_CACHE[src]=img;
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

function setDeckBacks(){
  const apply=(deck,drawId,discId)=>{
    const info=DECK_ASSETS[deck];
    if(!info)return;
    // Use deck-back art for both the draw and discard piles
  const src=`img/decks/${info.folder}/deck-backs/${info.back}-db-default.${info.dbExt}`;
    const drawImg=document.querySelector(`#${drawId} img`);
    const discImg=document.querySelector(`#${discId} img`);
    if(drawImg) drawImg.src=src;
    if(discImg) discImg.src=src;
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

function tiltify(card,lift=!1){
  if(!card || card.dataset.tiltified) return; // idempotent
  card.dataset.tiltified = '1';
  const h=card.offsetHeight, w=card.offsetWidth; let hov=false;
  if(lift){
    card.addEventListener('mouseenter', ()=>{ if(card.classList.contains('chosen')) return; hov=true; card.style.zIndex=1000; card.style.transform='translateY(-20px)'});
    card.addEventListener('mouseleave', ()=>{ if(card.classList.contains('chosen')) return; hov=false; card.style.zIndex=card.dataset.z||''; card.style.transform=''});
  } else {
    card.addEventListener('mouseleave', ()=>{ if(card.classList.contains('chosen')) return; card.style.transform=''});
  }
  card.addEventListener('mousemove', e=>{ if(card.classList.contains('chosen')) return; const x=(e.offsetX/w-.5)*12, y=(e.offsetY/h-.5)*-12, ty=hov?-20:0; card.style.transform=`translateY(${ty}px) perspective(600px) rotateX(${y}deg) rotateY(${x}deg)` });
}
function showPopup(anchor,text){const box=document.createElement('div');box.className='card-popup';box.textContent=text;const r=anchor.getBoundingClientRect();box.style.left=r.left+r.width/2+'px';box.style.top=r.top+'px';document.body.appendChild(box);setTimeout(()=>box.remove(),1200)}
function createProjection(container,card){
  // Build URL candidates: preferred deck character icon, then explicit img
  let urls = [];
  const ic = iconUrl(card.deck,card.icon);
  if(ic && ic.length) urls = urls.concat(ic);
  if(card && card.name){ urls = urls.concat(nameBasedCharUrls(card.deck, card.name)); }
  if(card && typeof card.img === 'string' && card.img.trim() && !card.img.includes('img/cards/')) urls.push(card.img);

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
  if(card.desc) return card.desc;
  const a = card.buffs && card.buffs.atk ? card.buffs.atk : 0;
  const h = card.buffs && card.buffs.hp ? card.buffs.hp : 0;
  if(a && h) return `Ative: +${a}/+${h} em 1–3 aliados`;
  if(a) return `Ative: +${a} ATK em 1–3 aliados`;
  if(h) return `Ative: +${h} HP em 1–3 aliados`;
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
function cardNode(c,owner,onBoard=false){
  const d=document.createElement('div');
  d.className=`card ${owner==='player'?'me':'enemy'} ${c.stance==='defense'?'defense':''}`;
  // if caller marked card to be hidden during summon animation, start hidden
  if(c && c._hideDuringSummon){ d.style.visibility='hidden'; }
  d.dataset.id=c.id;
  const totalDots = Math.min(c.cost, 15); // Cap display at 15
  let manaDots = '';
  const wrapThreshold = 10;
  if(totalDots <= wrapThreshold){
    manaDots = `<span class="mana-dot ${c.deck}"></span>`.repeat(totalDots);
  } else {
    const firstRowCount = Math.ceil(totalDots / 2);
    const secondRowCount = totalDots - firstRowCount;
    const firstRow = `<span class="mana-dot ${c.deck}"></span>`.repeat(firstRowCount);
    const secondRow = `<span class="mana-dot ${c.deck}"></span>`.repeat(secondRowCount);
    manaDots = `<div class="mana-row">${firstRow}</div><div class="mana-row">${secondRow}</div>`;
  }
  const kwTags=[];
  (c.kw||[]).forEach(k=>{const tip=KW_TIPS[k]||'';kwTags.push(`<span class='keyword' data-tip='${tip}'>${k}</span>`)});
  if(c.battlecry){
    const n=BC_NAMES[c.battlecry], tip=BC_TIPS[c.battlecry];
    if(n)kwTags.push(`<span class='keyword' data-tip='${tip}'>${n}</span>`);
  }
  if(c.subclasse&&c.classe)kwTags.push(`<span class='class-tag ${c.classe}'>${c.subclasse}</span>`);
  const text=c.text||'';
  const tip=text&&!kwTags.some(s=>s.includes('>'+text.trim()+'<'))?text:'';
  d.innerHTML=`<div class="bg bg-${c.deck||'default'}"></div>
  <div class="head-bar"><div class="name">${c.name}</div><div class="cost-bar"><div class="mana-row"><span class="mana-num">${c.cost}</span>${manaDots}</div></div></div>
  <div class="art"></div>
  <div class="text" ${tip?`data-tip='${tip}'`:''}>${kwTags.join(' ')}</div>
  <div class="stats"><span class="gem atk">⚔️ <span class="stat-val">${c.atk}</span></span>${c.stance?`<span class="stance-label ${c.stance}">${c.stance==='defense'?'🛡️':'⚔️'}</span>`:''}<span class="gem hp ${c.hp<=2?'low':''}">❤️ <span class="stat-val">${c.hp}</span></span></div>`;
  
  // Add buff glow visual effect if card has buffs
  try{
    ensureCardBase(c);
    const hasAtkBuff = c.atk > c.baseAtk;
    const hasHpBuff = c.hp > c.baseHp;
    const atkIcon = buffIconFor(c,'atk') || '⚔️';
    const hpIcon = buffIconFor(c,'hp') || '❤️';
    if(hasAtkBuff || hasHpBuff){
      if(hasAtkBuff){
        const atkGem=d.querySelector('.gem.atk');
        if(atkGem){
          atkGem.classList.add('buffed');
          atkGem.setAttribute('data-buff-icon',atkIcon);
        }
      }
      if(hasHpBuff){
        const hpGem=d.querySelector('.gem.hp');
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
        const desc = describeTotem(c);
        textBox.innerHTML = `<span class='keyword'>Totem</span> ${desc}`;
      }
      // show same icon in art area
      const art=d.querySelector('.art');
      if(art){ art.innerHTML = `<div class="totem-icon-art">${totemIcon(c)}</div>`; }
      // Remove tooltip from card itself to avoid redundancy
      const stats=d.querySelector('.stats');
      if(stats){ stats.innerHTML=''; }
    }
  }catch(_){ }
  try{
    if(kwTags.length && !isTotem(c)){
      const textBox=d.querySelector('.text');
      if(textBox){ textBox.removeAttribute('data-tip'); }
    }
  }catch(_){ }
  return d;
}

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
const hasGuard=b=>b.some(x=>x.kw.includes('Protetor')||x.stance==='defense');
function updateMeters(){
  const pct=(v,max)=>(max>0?Math.max(0,Math.min(100,(v/max)*100)):0);
  els.barPHP.style.width=pct(G.playerHP,30)+'%';
  if(els.barAHP){ try{ els.barAHP.style.width = pct(G.aiHP,30)+'%'; }catch(_){ } }
  els.barMana.style.width=pct(G.playerMana,G.playerManaCap)+'%';
  try{ if(els.aiMana){ els.aiMana.textContent = `${G.aiMana}/${G.aiManaCap}`; } }catch(_){ }
  try{ if(els.barAiMana){ els.barAiMana.style.width = pct(G.aiMana,G.aiManaCap)+'%'; } }catch(_){ }
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
  // ensure the turn indicator text doesn't wrap and reflects current turn
  if(els.turnIndicator){
    els.turnIndicator.textContent = (G.current === 'player') ? 'Seu turno' : 'Turno do oponente';
  }
  els.drawCount.textContent=G.playerDeck.length;
  els.discardCount.textContent=G.playerDiscard.length;
  updateMeters();updateOpponentLabel();renderHand();renderBoard();renderTotems();renderStoryEffects();updateDirectAttackHint()
}
function renderHand(){
  els.pHand.innerHTML='';
  G.playerHand.forEach(c=>{
    const d=cardNode(c,'player');
    d.classList.add('handcard');
    tiltify(d,!0);
    d.addEventListener('click',e=>{
      if(d.classList.contains('chosen'))return;
      const blocked=(c.cost>G.playerMana)||G.current!=='player'||G.playerBoard.length>=5;
      if(blocked){d.style.transform='translateY(-2px)';setTimeout(()=>d.style.transform='',150);sfx('error');return}
      e.stopPropagation();
      // Totens não escolhem postura; abrem confirmação de uso
      if(isTotem(c)){
        openTotemConfirm(d,()=>window.activateTotemById(c.id,d),()=>{});
      } else {
        openStanceChooser(d,st=>{ animateHandCardToBoard(d,()=>playFromHand(c.id,st)); });
      }
    });
    const cantPay=(c.cost>G.playerMana);
    const disable=(G.current!=='player'||G.playerBoard.length>=5);
    d.classList.toggle('blocked',cantPay);
    d.classList.toggle('playable',!cantPay&&!disable);
    d.style.cursor=(cantPay||disable)?'not-allowed':'pointer';
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
  // Simple, deterministic render: clear boards and recreate nodes.
  // This prevents duplication caused by cloning + leaving originals in the DOM.
  els.pBoard.innerHTML = '';
  for(const c of G.playerBoard){
    const d = cardNode(c,'player',true);
    tiltify(d);
    const art = d.querySelector('.art');
    if(!art.querySelector('.projection')){ const p=document.createElement('div'); p.className='projection'; art.appendChild(p); createProjection(p,c); } else { const p=art.querySelector('.projection'); if(p) createProjection(p,c); }
    if(G.current==='player' && c.canAttack && c.stance!=='defense'){
      d.classList.add('selectable','attackable');
      d.addEventListener('click',()=>selectAttacker(c));
    } else if(G.current==='player'){
      d.addEventListener('click',()=>{const reason=c.stance==='defense'?'Em defesa':(G.turn===c.summonTurn?'Recém jogada':'Já agiu'); showPopup(d,reason)});
    }
    els.pBoard.appendChild(d);
  }

  els.aBoard.innerHTML = '';
  for(const c of G.aiBoard){
    const d = cardNode(c,'ai',true);
    tiltify(d);
    const art = d.querySelector('.art');
    if(!art.querySelector('.projection')){ const p=document.createElement('div'); p.className='projection'; art.appendChild(p); createProjection(p,c); } else { const p=art.querySelector('.projection'); if(p) createProjection(p,c); }
    if(G.chosen && legalTarget('ai',c)){
      d.classList.add('selectable'); d.addEventListener('click',()=>attackCard(G.chosen,c));
    }
    els.aBoard.appendChild(d);
  }

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
  
  // Add active totems
  if(G.totems && G.totems.length > 0){
    G.totems.forEach(totem => {
      items.push({
        type: 'totem',
        icon: totem.icon || '🗿',
        tip: `${totem.name}\n${totem.effect || ''}`
      });
    });
  }
  
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
    if(b.startMana > 0) items.push({type:'buff', icon:'💠', tip:`Elixir de Mana\n+${b.startMana} mana ao início do combate`});
    if(b.killMana > 0) items.push({type:'buff', icon:'🪘', tip:`Tambor dos Conquistadores\n+${b.killMana} mana por eliminação`});
    if(b.allyBuff && (b.allyBuff.atk > 0 || b.allyBuff.hp > 0)){
      const parts = [];
      if(b.allyBuff.atk > 0) parts.push(`+${b.allyBuff.atk} ATK`);
      if(b.allyBuff.hp > 0) parts.push(`+${b.allyBuff.hp} HP`);
      items.push({type:'buff', icon:'⚔️', tip:`Buff Permanente\n${parts.join(' / ')} em todas as cartas`});
    }
    if(b.totemBonus && (b.totemBonus.atk > 0 || b.totemBonus.hp > 0)){
      const parts = [];
      if(b.totemBonus.atk > 0) parts.push(`+${b.totemBonus.atk} ATK`);
      if(b.totemBonus.hp > 0) parts.push(`+${b.totemBonus.hp} HP`);
      items.push({type:'buff', icon:'🗿', tip:`Talismã Totêmico\nTotens ganham ${parts.join('/')}`});
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
function flyToBoard(node,onEnd){
  try{ if(window.animationsDisabled){ onEnd&&onEnd(); return; } }catch(_){ }
  const r=node.getBoundingClientRect();
  // detach the original node and animate it to the board
  const w=r.width,h=r.height;
  Object.assign(node.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:w+'px',height:h+'px',zIndex:1300,margin:'0'});
  document.body.appendChild(node);
  const br=els.pBoard.getBoundingClientRect();
  requestAnimationFrame(()=>{
    const tx=br.left+br.width/2-r.left-w/2;
    const ty=br.top+10-r.top;
    node.style.transition='transform .25s ease, opacity .25s ease';
    node.style.transform=`translate(${tx}px,${ty}px) scale(.95)`;
    node.style.opacity='0.0';
  });
  setTimeout(()=>{ try{ node.remove(); }catch(_){ } onEnd&&onEnd(); },260);
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
  GAME_SESSION_ID++;
  updateCardSize();
  const isObj = typeof opts === 'object';
  const first = isObj ? (opts.first || 'player') : opts;
  const continuing = isObj && opts.continueStory;
  const sanitize = c => { if (c.hp < 1) c.hp = 1; if (c.atk < 0) c.atk = 0; return c; };
  const selectedMode = window.currentGameMode;
  const isStoryLike = selectedMode === 'story' || selectedMode === 'story2';
  G.storyVariant = isStoryLike && selectedMode === 'story2' ? 'story2' : null;
  G.mode = isStoryLike ? 'story' : 'solo';
  if (G.mode === 'story') {
    const activeStory = getStoryState(G.storyVariant === 'story2' ? 'story2' : 'story');
    if(G.storyVariant==='story2' && !continuing){ activeStory.reset(); }
    G.story = activeStory;
    G.story.nextRound();
    G.story._startManaGranted = false;
    if(G.storyVariant==='story2' && !continuing){
      log('[Historia 2 - beta] Corrida inspirada em deckbuilder; ate 5 aliados ativos no campo.');
    }
    
    // Check if this round is an event
    if(G.story.currentEncounter === 'event'){
      showRandomEvent(() => {
        // After event, continue to next round (combat)
        G.story.nextRound();
        G.aiDeckChoice = rand(ALL_DECKS);
        const boss = G.story.currentEncounter === 'boss';
        G.enemyScaling = G.story.scaling;
        G.currentEnemyName = pickEnemyName(G.aiDeckChoice, boss);
        log(`Round ${G.story.round}: ${G.currentEnemyName} (${G.story.currentEncounter})`);
        try{ showEncounterIntro({ name:G.currentEnemyName, round:G.story.round, kind: boss?'boss':'enemy', deckKey:G.aiDeckChoice }); }
        catch(_){ showEncounterBanner(G.currentEnemyName, boss ? 'boss' : 'enemy'); }
        continueGameSetup();
      });
      return; // Wait for event to complete
    }
    
    G.aiDeckChoice = rand(ALL_DECKS);
    const boss = G.story.currentEncounter === 'boss';
    G.enemyScaling = G.story.scaling;
    G.currentEnemyName = pickEnemyName(G.aiDeckChoice, boss);
    log(`Round ${G.story.round}: ${G.currentEnemyName} (${G.story.currentEncounter})`);
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
  G.playerMana = 0;
  G.playerManaCap = 0;
  G.aiMana = 0;
  G.aiManaCap = 0;
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
        const fx=(totalAtk&&totalHp)?'magic':totalAtk?'attack':'healing';
        try{ particleOnCard(card.id, fx); }catch(_){ }
        if(totalAtk) try{ fxTextOnCard(card.id,`+${totalAtk} ATK`,'buff'); }catch(_){ }
        if(totalHp) try{ fxTextOnCard(card.id,`+${totalHp} HP`,'buff'); }catch(_){ }
      }
    });
  });
}
function showMultiplayerDeckSelect(){
  els.wrap.style.display='none';
  applyBattleTheme(null);
  els.start.style.display='flex';
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
    G.playerBoard.forEach(c=>c.canAttack=true)
  }else{
    if(!skipDraw){
      if(G.aiDeck.length<=4){G.aiDeck.push(...shuffle(G.aiDiscard.splice(0)))}
      draw('ai',5)
    }
    G.aiManaCap=clamp(G.aiManaCap+1,0,10);
    G.aiMana=G.aiManaCap;
    G.aiBoard.forEach(c=>c.canAttack=true)
  }
  renderAll();
  showTurnIndicator();
  updateRelicsDisplay();
}
function endTurn(){if(G.current!=='player')return;discardHand('player');G.current='ai';G.chosen=null;G.lastChosenId=null;updateTargetingUI();newTurn(false,'player');sfx('end');if(window.isMultiplayer){NET.sendTurn('end')}else{setTimeout(aiTurn,500)}}
function playFromHand(id,st){if(G.current!=='player')return;const i=G.playerHand.findIndex(c=>c.id===id);if(i<0)return;const c=G.playerHand[i];const boardFull=c.type!=='totem'&&G.playerBoard.length>=5;if(c.cost>G.playerMana||boardFull)return;G.playerHand.splice(i,1);G.playerMana-=c.cost;if(c.type==='totem'){if(G.totems.length>=3){log('Número máximo de Totens atingido.');G.playerDiscard.push(c);}else{const t={id:c.id,name:c.name,buffs:c.buffs||{atk:1,hp:1},icon:c.icon||totemIcon(c),theme:getTotemTheme(c),maxTargets:Math.min(3,Math.max(1,G.playerBoard.length||1))};G.totems.push(t);applyTotemBuffsWithFx(t);log(`${c.name} ativado.`);}renderAll();return;}summon('player',c,st);renderAll();sfx(st==='defense'?'defense':'play')}
function summon(side,c,st='attack',skipBC=false){
  const board = side==='player'?G.playerBoard:G.aiBoard;
  c.stance = st;
  c.canAttack = (st==='attack') && c.kw.includes('Furioso');
  c.summonTurn = G.turn;
  board.push(c);
  ensureCardBase(c);
  // Only initialize stats if they are truly undefined, never restore HP
  if(c.atk===undefined) c.atk = c.baseAtk;
  if(c.hp===undefined) c.hp = c.baseHp;
  removeBuffBadges(c,(entry)=>entry.sourceType==='totem',{adjustStats:false});
  particleOnCard(c.id,'summon');
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
        t.hp=Math.min(t.hp+2,20);
        fxTextOnCard(t.id,'+2','heal');
        if(window.playParticleEffect) particleOnCard(t.id, 'water-ball', {scale: 0.8});
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
        if(window.playParticleEffect) particleOnCard(t.id, 'fire-arrow', {scale: 0.7});
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
        particleOnCard(t.id,'magic');
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
        particleOnCard(x.id,'magic');
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
          particleOnCard(t.id,'explosion');
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
  }
  return effects;
}
function applyBattlecryEffects(side,effects){effects.forEach(e=>{if(e.type==='heal'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.hp=Math.min(t.hp+e.amount,20);fxTextOnCard(t.id,'+'+e.amount,'heal');if(window.playParticleEffect)particleOnCard(t.id,'water-ball',{scale:0.8})}}else if(e.type==='damage'){const foes=side==='player'?G.aiBoard:G.playerBoard;const t=foes.find(x=>x.id===e.targetId);if(t){damageMinion(t,e.amount);if(window.playParticleEffect)particleOnCard(t.id,'fire-arrow',{scale:0.7});fxTextOnCard(t.id,'-'+e.amount,'dmg')}}else if(e.type==='buff'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.atk+=e.atk;t.hp+=e.hp;fxTextOnCard(t.id,'+'+e.atk+(e.hp?'/'+e.hp:''),'buff');if(window.playParticleEffect)particleOnCard(t.id,'water-spell',{scale:0.75})}}else if(e.type==='mana'){if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+e.amount,0,10);G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+e.amount,0,10);G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}else if(e.type==='sacMana'){const allies=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const t=allies.find(x=>x.id===e.targetId);if(t){allies.splice(allies.indexOf(t),1);discard.push(t);resetCardState(t);particleOnCard(t.id,'explosion');}if(side==='player'){G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}});checkDeaths()}

function absorbFromAlly(side,c){const board=side==='player'?G.playerBoard:G.aiBoard;const allies=board.filter(x=>x.id!==c.id&&x.kw&&x.kw.length);if(!allies.length)return;const src=rand(allies);const choices=src.kw.filter(k=>!c.kw.includes(k));if(!choices.length)return;const kw=rand(choices);c.kw.push(kw);particleOnCard(c.id,'magic');fxTextOnCard(c.id,kw,'buff');log(`${c.name} absorveu ${kw}.`);if(c.name==='Sombra Rúnica'){applyCardBuff(c,{atk:1,hp:1,icon:c.emoji||'✨',sourceType:'absorb',sourceId:c.id,permanent:true});}if(c.name==='Capataz de Runas'){const foes=side==='player'?G.aiBoard:G.playerBoard;foes.forEach(t=>{damageMinion(t,1);particleOnCard(t.id,'attack');fxTextOnCard(t.id,'-1','dmg')});checkDeaths()}}

function applyEndTurnEffects(side){const board=side==='player'?G.playerBoard:G.aiBoard;const foeBoard=side==='player'?G.aiBoard:G.playerBoard;for(const c of board){if(c.kw.includes('Mutável')){const atk=c.atk;c.atk=c.hp;c.hp=atk;fxTextOnCard(c.id,'⇆','buff');}if(c.name==='Totem Absorvente'){const foes=foeBoard.filter(f=>f.kw&&f.kw.length);if(foes.length){const src=rand(foes);const opts=src.kw.filter(k=>!c.kw.includes(k));if(opts.length){const kw=rand(opts);c.kw.push(kw);particleOnCard(c.id,'magic');fxTextOnCard(c.id,kw,'buff');log(`${c.name} absorveu ${kw} de ${src.name}.`)}}}}}
function updateTargetingUI(){document.body.classList.toggle('targeting',!!G.chosen)}
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
  updateTargetingUI();
  els.aBoard.classList.remove('face-can-attack');
  renderBoard();
  try{ updateDirectAttackHint(); }catch(_){ }
}
function selectAttacker(c){
  if(G.current!=='player'||!c.canAttack||c.stance==='defense')return;
  G.chosen=c;
  G.lastChosenId=c.id;
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
function legalTarget(side,target){const b=side==='ai'?G.aiBoard:G.playerBoard;return hasGuard(b)?(target.kw.includes('Protetor')||target.stance==='defense'):true}
const nodeById=id=>document.querySelector(`.card[data-id="${id}"]`);
const addAnim=(n,c,d=400)=>{n&&n.classList.add(c);setTimeout(()=>n&&n.classList.remove(c),d)};
// (replaced below with sequenced version) original animateAttack removed to avoid duplicate const redeclaration
const animateDefense=id=>{const n=nodeById(id);addAnim(n,'shield-flash',600)};
function screenSlash(x,y,ang){const fx=document.createElement('div');fx.className='fx fx-slash';fx.style.left=x+'px';fx.style.top=y+'px';fx.style.setProperty('--ang',ang+'deg');document.body.appendChild(fx);setTimeout(()=>fx.remove(),380)}
function screenParticle(n,x,y){
  if(window.playParticleEffect){
    const key=(window.PARTICLE_MAP&&window.PARTICLE_MAP[n])?window.PARTICLE_MAP[n]:n;
    playParticleEffect(key,x,y,{scale:0.8});
    return;
  }
  const fx=document.createElement('div');fx.className='fx fx-'+n;fx.style.left=x+'px';fx.style.top=y+'px';document.body.appendChild(fx);setTimeout(()=>fx.remove(),600)
}
function applyOnPlayRewards(side,card){
  if(!card||!card.onPlay)return;
  const info=card.onPlay;
  if(info.mana){
    if(side==='player'){
      const before=G.playerMana;
      G.playerMana=Math.min(G.playerMana+info.mana,G.playerManaCap);
      const gained=G.playerMana-before;
      if(gained>0){
        try{particleOnCard(card.id,'magic');fxTextOnCard(card.id,`+${gained} mana`,'buff');}catch(_){ }
        sfx('mana');
        log(`${card.name} canalizou ${gained} de mana.`);
        playAbilityCue('mana',card);
      }
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+info.mana,G.aiManaCap);
      if(G.aiMana>before){
        try{particleOnCard(card.id,'magic');}catch(_){ }
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
  banner.innerHTML = `<div class="enc-title">Vitória!</div><div class="enc-sub">${subtitle}</div>`;
  banner.className = 'victory show';
  try{ sfx('reward'); }catch(_){ }
  setTimeout(() => {
    banner.classList.remove('show');
    onContinue?.();
  }, 1700);
}
function particleOnCard(cid,n){
  const t=nodeById(cid);if(!t)return;const r=t.getBoundingClientRect();
  if(window.playParticleEffect){
    const key=(window.PARTICLE_MAP&&window.PARTICLE_MAP[n])?window.PARTICLE_MAP[n]:n;
    playParticleEffect(key,r.left+r.width/2,r.top+r.height/2,{scale:0.85});
  } else {
    screenParticle(n,r.left+r.width/2,r.top+r.height/2)
  }
}
function particleOnFace(side,n){
  // Prefer HP meters in the HUD; fallback to hidden bottom faces if present
  const anchor = side==='ai' ? (els.barAHP || els.aHP2) : (els.barPHP || els.pHP2);
  if(!anchor) return;
  const r = anchor.getBoundingClientRect();
  screenParticle(n, r.left + r.width/2, r.top + r.height/2);
}
function fxTextOnCard(cid,text,cls){const n=document.querySelector(`.card[data-id="${cid}"]`);if(!n)return;const r=n.getBoundingClientRect();const fx=document.createElement('div');fx.className='fx-float '+(cls||'');fx.textContent=text;fx.style.left=(r.left+r.width/2)+'px';fx.style.top=(r.top+r.height/2)+'px';document.body.appendChild(fx);setTimeout(()=>fx.remove(),950);}

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
      if(gained>0){try{particleOnCard(attacker.id,'magic');fxTextOnCard(attacker.id,`+${gained} mana`,'buff');}catch(_){ }sfx('mana');playAbilityCue('mana',attacker);}
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+manaGain,G.aiManaCap);
      if(G.aiMana>before){try{particleOnCard(attacker.id,'magic');}catch(_){ }sfx('mana');playAbilityCue('mana',attacker);}
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
// Tunable combat sequencing constants
const ATTACK_SEQUENCE_DELAY = 320; // ms between initial strike and counter resolution
const TARGET_HIT_ANIM_DELAY = 180; // ms after lunge starts to begin target hit shake
const DEBUG_COMBAT_SEQUENCE = false;
const animateAttack=(aId,tId)=>{
  const a=nodeById(aId),t=tId?nodeById(tId):null;
  if(a) addAnim(a,'attack-lunge',350);
  if(t) setTimeout(()=>addAnim(t,'hit-shake',350), TARGET_HIT_ANIM_DELAY);
};
function normalizeText(txt){return (txt||'').normalize('NFD').replace(/[^a-zA-Z0-9\s]/g,'').toLowerCase();}
function detectAttackFx(card){if(!card)return'attack';const nameNorm=normalizeText(card.name);const tribeNorm=normalizeText(card.tribe);if(card.type==='totem'||ATTACK_FX_RULES[0].test.test(nameNorm))return'totem';for(const rule of ATTACK_FX_RULES){if(rule.test.test(nameNorm))return rule.fx;}if(tribeNorm.includes('animal')||tribeNorm.includes('fera'))return'feral';if(tribeNorm.includes('pesc')||tribeNorm.includes('mar')||tribeNorm.includes('oceano'))return'tidal';if(tribeNorm.includes('floresta')||tribeNorm.includes('bosque'))return'feral';if(tribeNorm.includes('converg'))return'mystic';if(tribeNorm.includes('viking'))return'heavy';const cls=card.classe&&card.classe.toLowerCase();if(cls&&ATTACK_FX_BY_CLASS[cls])return ATTACK_FX_BY_CLASS[cls];return'attack';}
function attackCard(attacker,target){
  if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;
  const fx=detectAttackFx(attacker);
  const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;
  sfx('attack',sfxVariant);
  playCharacterCue(attacker,'attack');
  const a=nodeById(attacker.id),t=nodeById(target.id);
  if(a&&t){const ar=a.getBoundingClientRect(),tr=t.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,15);}
  animateAttack(attacker.id,target.id);
  if(target.stance==='defense') setTimeout(()=>animateDefense(target.id), TARGET_HIT_ANIM_DELAY);
  if(window.playParticleEffect) particleOnCard(target.id, 'fire-arrow', {scale: 0.75});

  // Calculate overflow BEFORE applying damage (when target HP > 0)
  const preTargetHP = Math.max(0, target.hp);
  const attackerDamage = Math.max(0, attacker.atk);
  const overflow = Math.max(0, attackerDamage - preTargetHP);

  // Step 1: target takes damage
  damageMinion(target, attackerDamage, { defer:true });
  playCharacterCue(target,'hit');
  sfx('hit');
  if(DEBUG_COMBAT_SEQUENCE) log(`[SEQ] ${attacker.name} (${attackerDamage} ATK) hit ${target.name} (${preTargetHP} HP) → ${target.hp} HP, overflow: ${overflow}`);

  // Step 2 (slight delay): attacker takes counter-damage
  setTimeout(()=>{
    const shouldCounter = target.hp>0 && target.stance!=='defense' && target.atk>0;
    if(shouldCounter){
      const counterDamage = Math.max(0, target.atk);
      damageMinion(attacker, counterDamage, { defer:true });
      if(window.playParticleEffect && counterDamage>0) particleOnCard(attacker.id, 'water-ball', {scale: 0.6});
      if(DEBUG_COMBAT_SEQUENCE) log(`[SEQ] ${target.name} (${counterDamage} ATK) countered ${attacker.name} → ${attacker.hp} HP`);
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
        log(`${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`);
        particleOnFace('ai',faceFx);
      }else{
        G.playerHP=Math.max(0, G.playerHP-overflow);
        log(`${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`);
        particleOnFace('player',faceFx);
      }
      checkWin();
    }

    const targetDied = target.hp<=0;
    if(targetDied){
      playCharacterCue(target,'death');
      if(attacker.hp>0) applyKillRewards(attacker,target);
    }

    attacker.canAttack=false;
    log(`${attacker.name} atacou ${target.name}.`);
    // Now process deaths and re-render
    checkDeaths();
    renderAll();
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
  G.lastChosenId = attacker.id || null;
  const fx=detectAttackFx(attacker);
  const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;
  sfx('attack',sfxVariant);
  playCharacterCue(attacker,'attack');
  const a=nodeById(attacker.id);
  if(a){const ar=a.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,10);}
  animateAttack(attacker.id,null);
  particleOnFace(face,fx||'attack');
  const dmg=Math.max(0, attacker.atk);
  attacker.canAttack=false;
  if(face==='ai'){
    G.aiHP=Math.max(0, G.aiHP-dmg);
    log(`${attacker.name} causou ${dmg} ao Inimigo!`);
    sfx('crit');
  }else{
    G.playerHP=Math.max(0, G.playerHP-dmg);
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
  const defer = opts && opts.defer;
  if(m.hp<=0 && !defer) setTimeout(checkDeaths,10);
}
function checkDeaths(){
  const deadA = G.aiBoard.filter(c=>c.hp<=0);
  if(deadA.length){
    deadA.forEach(c=>{
      if(window.playParticleEffect) particleOnCard(c.id,'fire-ball',{scale:0.9});
    });
    G.aiBoard = G.aiBoard.filter(c=>c.hp>0);
    deadA.forEach(resetCardState);
    G.aiDiscard.push(...deadA);
    log('Uma criatura inimiga caiu.');
  }

  const deadP = G.playerBoard.filter(c=>c.hp<=0);
  if(deadP.length){
    deadP.forEach(c=>{
      if(window.playParticleEffect) particleOnCard(c.id,'fire-ball',{scale:0.9});
    });
    G.playerBoard = G.playerBoard.filter(c=>c.hp>0);
    deadP.forEach(resetCardState);
    G.playerDiscard.push(...deadP);
    log('Sua criatura caiu.');
  }

  if(els.discardCount) els.discardCount.textContent = G.playerDiscard.length;
}
async function aiTurn(){
  const skill=G.aiSkill||1;
  const playable=G.aiHand.filter(c=>c.cost<=G.aiMana);
  if(skill===2){playable.sort((a,b)=>(b.atk+b.hp)-(a.atk+a.hp))}
  else if(skill===1){playable.sort((a,b)=>b.cost-a.cost)}
  else{playable.sort(()=>Math.random()-0.5)}

  // play cards sequentially, awaiting animations
  while(playable.length && G.aiBoard.length<5 && G.aiMana>0){
    const c = skill===0 ? playable.pop() : playable.shift();
    const i = G.aiHand.findIndex(x=>x.id===c.id);
    if(i>-1 && c.cost<=G.aiMana){
      G.aiHand.splice(i,1);
      const stance = (c.hp>=c.atk+1)?(Math.random()<.7?'defense':'attack'):(Math.random()<.3?'defense':'attack');
      const res = summon('ai',c,stance);
      if(res && typeof res.then==='function'){
        renderAll();
        G.aiMana -= c.cost;
        await res;
      }else{
        G.aiMana -= c.cost;
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
function fireworks(win){const b=document.createElement('div');b.className='boom';b.style.left='50%';b.style.top='50%';b.style.background=`radial-gradient(circle at 50% 50%, ${win?'#8bf5a2':'#ff8a8a'}, transparent)`;document.body.appendChild(b);setTimeout(()=>b.remove(),650);} 
function endGame(win){stopMenuMusic();els.endMsg.textContent=win?'You WIN!':'You Lose...';els.endMsg.style.color=win?'#8bf5a2':'#ff8a8a';els.endSub.textContent=win?'Parabéns! Quer continuar jogando?':'Tentar de novo ou voltar ao menu.';els.endOverlay.classList.add('show');setAriaHidden(els.endOverlay,false);focusDialog(els.endOverlay);setTimeout(()=>fireworks(win),1000);} 
const hideEndOverlay=()=>{if(!els.endOverlay)return;els.endOverlay.classList.remove('show');setAriaHidden(els.endOverlay,true)};

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
    'Buff permanente': { icon: '✨', desc: 'Buff permanente em todas as cartas' }
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
  switch(rewardType){
    case 'Nova carta':{
      const deckKey = G.aiDeckChoice || G.playerDeckChoice || 'vikings';
      const options = getRandomCardRewardOptions(deckKey, 4);
      if(!options.length){
        fallback('Nenhuma carta disponível. Recebe 10 ouro.');
        return;
      }
      openCardSelectionModal(options, card => {
        addRewardCardToStory(card);
        log(`🎴 Recompensa: ${card.name} adicionado ao deck!`);
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
        onDone?.();
        addRewardCardToStory(totemCard);
        log(`🗿 Recompensa: ${totemCard.name} adicionado ao deck!`);
        onDone?.();
      }, () => fallback('Totem não selecionado. Recebe 10 ouro.'));
      break;
    }
    default:
      applyPermanentBuffReward();
      onDone?.();
      break;
  }
}

function addRewardCardToStory(card){
  if(!card) return;
  const hydrated = hydrateCardArt(card) || card;
  const entry = Object.assign({}, hydrated);
  entry.id = entry.id || uid();
  if(!entry.deck) entry.deck = hydrated.deck || lookupCardTemplate(card.name)?.deck || G.playerDeckChoice;
  entry.type = entry.type || 'unit';
  entry.text = entry.text || entry.desc || '';
  if(!entry.icon && entry.deck && DECK_IMAGES[entry.deck] && DECK_IMAGES[entry.deck].length){
    entry.icon = DECK_IMAGES[entry.deck][0];
  }
  G.story.deck = G.story.deck || [];
  G.story.deck.push(entry);
}

function toStoryCard(entry,fallbackDeck){
  if(!entry) return null;
  const hydrated = hydrateCardArt(entry) || entry;
  const card = Object.assign({}, hydrated);
  card.id = card.id || uid();
  card.deck = card.deck || entry.deck || fallbackDeck;
  card.type = card.type || entry.type || 'unit';
  if(!card.icon && card.deck && DECK_IMAGES[card.deck] && DECK_IMAGES[card.deck].length){
    card.icon = DECK_IMAGES[card.deck][0];
  }
  applyClassDefaults(card, card.tribe || card.deck);
  ensureCardBase(card);
  return card;
}

function awardFallbackGold(onDone, message){
  log(message || 'Ganhou 10 ouro como alternativa.');
  G.story.gold += 10;
  if(typeof updateGoldHUD==='function') updateGoldHUD();
  onDone?.();
}

function applyPermanentBuffReward(){
  if(!G.story) return;
  const buffType = Math.random() > 0.5 ? 'atk' : 'hp';
  G.story.bonuses.allyBuff[buffType] += 1;
  log(`✨ Recompensa: Todas as suas unidades ganham +1 ${buffType.toUpperCase()}!`);
}

function getRandomCardRewardOptions(deckKey, count=4){
  const pool = (TEMPLATES[deckKey] || []).map(template => {
    const card = makeCard(template);
    card.deck = deckKey;
    return card;
  });
  const chosen = [];
  const working = [...pool];
  while(chosen.length < count && working.length){
    const idx = Math.floor(Math.random() * working.length);
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

function showModal(modal){
  if(!modal) return;
  modal.classList.add('show');
  modal.style.display = 'grid';
  if(window.setAriaHidden) setAriaHidden(modal, false);
  else modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal){
  if(!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
  if(window.setAriaHidden) setAriaHidden(modal, true);
  else modal.setAttribute('aria-hidden', 'true');
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
    const idx = Math.floor(Math.random() * available.length);
    choices.push(available.splice(idx, 1)[0]);
  }
  
  grid.innerHTML = '';
  msg.textContent = '';
  
  choices.forEach(relic => {
    const option = document.createElement('div');
    option.className = 'reward-option';
    option.dataset.rarity = relic.rarity;
    option.innerHTML = `
      <span class="reward-icon">${relic.icon}</span>
      <div class="reward-name">${relic.name}</div>
      <div class="reward-desc">${relic.desc}</div>
      <div style="font-size:11px;margin-top:8px;color:var(--muted)">${relic.rarity.toUpperCase()}</div>
    `;
    option.onclick = () => {
      G.story.addRelic(relic);
      log(`✨ ${relic.name} adquirido!`);
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      updateRelicsDisplay();
      if(window.playSfx) window.playSfx('reward');
      setTimeout(() => onComplete?.(), 300);
    };
    grid.appendChild(option);
  });
  
  modal.style.display = 'grid';
  modal.setAttribute('aria-hidden', 'false');
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
function showRandomEvent(onComplete, opts={}){
  if(!G.story) return onComplete?.();
  
  const available = STORY_EVENTS.filter(e => !G.story.eventsSeen.includes(e.id));
  if(!available.length) return onComplete?.();
  const { source='story' } = opts;
  
  const event = available[Math.floor(Math.random() * available.length)];
  G.story.eventsSeen.push(event.id);
  
  const modal = document.getElementById('eventModal');
  const icon = document.getElementById('eventIcon');
  const title = document.getElementById('eventTitle');
  const desc = document.getElementById('eventDesc');
  const choices = document.getElementById('eventChoices');
  const result = document.getElementById('eventResult');
  
  if(!modal) return onComplete?.();
  
  icon.textContent = event.icon;
  title.textContent = event.name;
  desc.innerHTML = `<div style="margin-bottom:12px;font-size:16px;color:#fbbf24;font-weight:bold">💰 Ouro disponível: ${G.story.gold}</div>${event.desc}`;
  choices.innerHTML = '';
  result.textContent = '';
  
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
        executeEventChoice(event, choice, result, () => {
          setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            onComplete?.();
          }, 2000);
        });
      };
    }
    
    choices.appendChild(btn);
  });
  
  modal.style.display = 'grid';
  modal.setAttribute('aria-hidden', 'false');
  if(window.playSfx) window.playSfx('start');
}

function executeEventChoice(event, choice, resultEl, onDone){
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
      if(G.story.deck.length){
        const idx = Math.floor(Math.random() * G.story.deck.length);
        G.story.deck[idx].atk += choice.reward.upgradeCard || 1;
        G.story.deck[idx].hp += choice.reward.upgradeCard || 1;
        log(`⬆️ ${G.story.deck[idx].name} evoluiu!`);
      }
    }
    if(choice.reward.removeCard) {
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
    }
  }
  
  // Risk/random effects
  if(choice.risk) {
    const lucky = Math.random() > 0.5;
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
  if(window.playSfx) window.playSfx('reward');
  onDone?.();
}

let eventOverlayTimer;
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
  const candidate = pool[Math.floor(Math.random()*pool.length)];
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
  if(Math.random() > chance) return onDone?.();
  G.story.lastShopEventRound = G.story.round;
  showRandomEvent(() => onDone?.(), { source: 'shop' });
}

// ===== CARD REMOVAL SYSTEM =====

function showCardRemoval(opts){
  const { onComplete, onCardRemoved } = (typeof opts === 'function') ? { onComplete: opts } : (opts || {});
  const modal = document.getElementById('removalModal');
  const grid = document.getElementById('removalChoices');
  const cancelBtn = document.getElementById('cancelRemoval');
  try{ window.showCardRemoval = showCardRemoval; }catch(_){ }
  
  if(!modal || !grid) {
    log('⚠️ Modal de remoção não encontrado!');
    return onComplete?.();
  }
  
  const allCards = [
    ...(G.playerDeck || []),
    ...(G.playerHand || []),
    ...(G.playerBoard || []),
    ...(G.playerDiscard || [])
  ].filter(Boolean);
  
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
    
    cardWrapper.onclick = () => {
      if(!confirm(`Remover ${card.name} permanentemente do seu deck?`)) return;
      cardWrapper.classList.add('removing');
      const rarity = (card.rarity || 'comum').toLowerCase();
      const rarityLabel = {'common':'comum','rare':'raro','epic':'épico','legendary':'lendário'}[rarity] || rarity;
      setTimeout(()=>{
        const removeById = (arr) => {
          if(!arr) return;
          const foundIdx = arr.findIndex(c => c && c.id === card.id);
          if(foundIdx >= 0) arr.splice(foundIdx, 1);
        };
        [G.playerDeck,G.playerHand,G.playerBoard,G.playerDiscard].forEach(zone=>removeById(zone));
        if(G.story && Array.isArray(G.story.pool)){
          const idx = G.story.pool.findIndex(x=>x && x.id===card.id);
          if(idx>-1) G.story.pool.splice(idx,1);
        }
        log(`⚡ ${card.name} (${rarityLabel}) foi removido do deck!`);
        modal.style.display = 'none';
        modal.classList.remove('show');
        if(window.setAriaHidden) setAriaHidden(modal, true);
        else modal.setAttribute('aria-hidden', 'true');
        if(window.playSfx) window.playSfx('error');
        onCardRemoved?.(card);
        onComplete?.();
      },350);
    };
    
    grid.appendChild(cardWrapper);
  });
  
  if(cancelBtn){
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('show');
      if(window.setAriaHidden) setAriaHidden(modal, true);
      else modal.setAttribute('aria-hidden', 'true');
      onComplete?.();
    };
  }
  
  modal.style.display = 'grid';
  modal.classList.add('show');
  if(window.setAriaHidden) setAriaHidden(modal, false);
  else modal.setAttribute('aria-hidden', 'false');
  try{ const first = grid.querySelector('.removal-card'); first && first.focus && first.focus(); }catch(_){ }
}

function checkWin(){
  if(G.aiHP<=0){
    if(G.mode==='story'&&G.story){
      const {leveled,rewards,goldGain,isBoss}=G.story.handleVictory();
      log(`Voce ganhou ${goldGain} ouro.`);
      if(leveled) log(`Voce alcancou o nivel ${G.story.level}!`);
      const shouldShowShop = G.story.round % 3 === 0;
      const openStoryShop = () => {
        const launchShop = () => {
          showEncounterBanner('Loja do Cl�','shop');
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
                if(typeof updateGoldHUD==='function')updateGoldHUD();
                if(state.purchased&&state.purchased.length){
                  state.purchased.forEach(item=>{
                    if(item&&item.bonus){
                      try{
                        const note = G.story.registerBonus(item.bonus,item);
                        if(note){ log(`Campanha: ${item.name} concedeu ${note}.`); }
                      }catch(err){ console.error('register bonus',err); }
                    }else if(item && ['unit','spell','totem'].includes(item.type)){
                      try{
                        addRewardCardToStory(item);
                        log(`? Campanha: ${item.name} foi adicionado ao seu baralho!`);
                      }catch(err){ console.error('add purchased card',err); }
                    }
                  });
                }
              }
              encounterTransition(()=>startGame({continueStory:true}));
            }
          });
        };
        maybeRunEventBeforeShop(launchShop);
      };
      const afterRewards = () => {
        const proceedNext = () => encounterTransition(()=>startGame({continueStory:true}));
        if(isBoss){
          showRelicChoice(() => {
            if(shouldShowShop){
              showVictoryBanner(G.currentEnemyName, openStoryShop);
            } else {
              showVictoryBanner(G.currentEnemyName, proceedNext);
            }
          });
        } else if(shouldShowShop){
          showVictoryBanner(G.currentEnemyName, openStoryShop);
        } else {
          showVictoryBanner(G.currentEnemyName, proceedNext);
        }
      };
      showRewardsModal(rewards, afterRewards);
      return;
    }
    endGame(true);
  }
  if(G.playerHP<=0){endGame(false);}
}

function allCards(){let out=[];for(const k of Object.keys(TEMPLATES)){for(const raw of TEMPLATES[k]){const c=makeCard(raw);c.deck=k;out.push(c)}}return out}
function renderEncy(filter='all',locked=false){els.encyGrid.innerHTML='';const cards=(filter==='all'?allCards():TEMPLATES[filter].map(makeCard).map(c=>Object.assign(c,{deck:filter})));cards.forEach(c=>{const d=cardNode(c,'player');d.classList.add('ency-card');tiltify(d);els.encyGrid.appendChild(d)});els.ency.classList.add('show');setAriaHidden(els.ency,false);focusDialog(els.ency);els.encyFilters.style.display=locked?'none':'flex';$$('.filters .fbtn').forEach(b=>b.classList.toggle('active',b.dataset.deck===filter||filter==='all'&&b.dataset.deck==='all'))}
const updateRestartVisibility=()=>{if(els.restartBtn)els.restartBtn.style.display=window.isMultiplayer?'none':'block'};
const toggleGameMenu=open=>{if(!els.gameMenu)return;if(open){els.gameMenu.classList.add('show');setAriaHidden(els.gameMenu,false);focusDialog(els.gameMenu);updateRestartVisibility();}else{els.gameMenu.classList.remove('show');setAriaHidden(els.gameMenu,true)}};
window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(G.chosen){cancelTargeting();return}if(!els.gameMenu)return;const t=els.gameMenu.classList.contains('show');t?toggleGameMenu(false):toggleGameMenu(true)});document.addEventListener('click',e=>{if(!G.chosen)return;if(e.target.closest('#aiBoard .card.selectable')||e.target.closest('#playerBoard .card.selectable')||e.target.closest('#aiBoard .face-attack-btn')||e.target.closest('#directAttackHint'))return;cancelTargeting()},{capture:true});
function confirmExit(){return G.mode==='story'?confirm('Progresso da história será perdido. Continuar?'):confirm('Tem certeza?');}
if(els.openMenuBtn)els.openMenuBtn.addEventListener('click',()=>{toggleGameMenu(true)});
if(els.closeMenuBtn)els.closeMenuBtn.addEventListener('click',()=>{toggleGameMenu(false)});
if(els.mainMenuBtn)els.mainMenuBtn.addEventListener('click',()=>{if(!confirmExit())return;toggleGameMenu(false);const title=document.getElementById('titleMenu');const deck=document.getElementById('start');if(title)title.style.display='flex';if(deck)deck.style.display='none';applyBattleTheme(null);els.wrap.style.display='none';cleanupGameElements();startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;G.storyVariant=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
if(els.restartBtn)els.restartBtn.addEventListener('click',()=>{if(window.isMultiplayer)return;if(!confirmExit())return;toggleGameMenu(false);startGame()});
if(els.resignBtn)els.resignBtn.addEventListener('click',()=>{if(!confirmExit())return;toggleGameMenu(false);if(window.isMultiplayer&&window.NET){NET.resign();}endGame(false)});
if(els.emojiBar){els.emojiBar.querySelectorAll('.emoji-btn').forEach(b=>b.addEventListener('click',()=>{const em=b.dataset.emoji;showEmoji('player',em);if(window.isMultiplayer&&window.NET){NET.sendEmoji(em)}}));}
function initDeckButtons(){
  $$('.deckbtn').forEach(btn=>{
    btn.addEventListener('pointermove',e=>{
      const r=btn.getBoundingClientRect();
      btn.style.setProperty('--px',((e.clientX-r.left)/r.width*100)+'%');
      btn.style.setProperty('--py',((e.clientY-r.top)/r.height*100)+'%');
    });
    btn.addEventListener('mouseenter',()=>{
      btn.style.setProperty('--halo',.7);
      btn.style.setProperty('--shine',.7);
    });
    btn.addEventListener('mouseleave',()=>{
      btn.style.removeProperty('--halo');
      btn.style.removeProperty('--shine');
    });
    btn.addEventListener('click',()=>{
      const pick=btn.dataset.deck;
      G.playerDeckChoice=pick;
      if(pick==='custom'){
        els.deckBuilder.style.display='block';
        renderPool();renderChosen();updateCurve();
        els.startGame.disabled=true;
      }else{
        els.deckBuilder.style.display='none';
        els.startGame.disabled=false;
      }
      G.aiDeckChoice=rand(ALL_DECKS.filter(d=>d!==pick));
      startMenuMusic(pick);
      $$('.deckbtn').forEach(b=>b.style.outline='none');
      btn.style.outline='2px solid var(--accent)';
    });
    const wrap=btn.closest('.deck-option');
    const book=wrap?wrap.querySelector('.view-cards'):null;
    if(book){
      book.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        renderEncy(btn.dataset.deck,true);
      });
    }
  });
}

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
} else {
  document.addEventListener('DOMContentLoaded',()=>{ initDeckButtons(); initCommonButtonHover(); });
}
if(els.endBtn){ els.endBtn.addEventListener('click', endTurn); }
if(els.instantWinBtn){
  els.instantWinBtn.addEventListener('click', ()=>{
    if(G.mode!=='story'||!window.storyTestMode) return;
    G.aiHP = 0;
    try{ particleOnFace('ai','explosion'); }catch(_){ }
    log('? Teste: Vitoria instantanea ativada!');
    sfx('crit');
    checkWin();
  });
}
if(els.saveDeck)els.saveDeck.addEventListener('click',()=>{if(G.customDeck&&G.customDeck.length){els.deckBuilder.style.display='none';els.startGame.disabled=false;}});
els.startGame.addEventListener('click',()=>{if(els.startGame.disabled)return;if(window.isMultiplayer){if(window.mpState==='readyStart'){NET.startReady();window.mpState='waitingStart';els.startGame.textContent='Aguardando oponente iniciar...';els.startGame.disabled=true}else if(!window.mpState){NET.deckChoice(G.playerDeckChoice);if(window.opponentConfirmed){window.mpState='readyStart';els.startGame.textContent='Iniciar';els.startGame.disabled=false}else{window.mpState='waitingDeck';els.startGame.textContent='Aguardando oponente confirmar deck...';els.startGame.disabled=true}}}else{if(window.currentGameMode==='story2'){startStory2();return;}els.start.style.display='none';els.wrap.style.display='block';initAudio();ensureRunning();stopMenuMusic();startGame()}});
els.openEncy.addEventListener('click',()=>renderEncy('all',false));els.closeEncy.addEventListener('click',()=>{els.ency.classList.remove('show');setAriaHidden(els.ency,true)});$$('.filters .fbtn').forEach(b=>b.addEventListener('click',()=>{renderEncy(b.dataset.deck,false)}));
els.playAgainBtn.addEventListener('click',()=>{if(!confirmExit())return;if(window.isMultiplayer){showMultiplayerDeckSelect();hideEndOverlay();}else{hideEndOverlay();startGame()}});els.rematchBtn.addEventListener('click',()=>{if(!confirmExit())return;if(window.isMultiplayer&&window.NET){NET.requestRematch();els.rematchBtn.disabled=true;els.endSub.textContent='Aguardando oponente';}else{hideEndOverlay();startGame()}});els.menuBtn.addEventListener('click',()=>{if(!confirmExit())return;hideEndOverlay();applyBattleTheme(null);els.start.style.display='flex';els.wrap.style.display='none';cleanupGameElements();startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;G.storyVariant=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
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
  const title=document.getElementById('titleMenu');
  if(title) title.style.display='none';
  els.start.style.display='none';
  els.wrap.style.display='block';
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
if(window.NET){NET.onOpponentDeckConfirmed(d=>{G.aiDeckChoice=d;if(window.mpState==='waitingDeck'){els.startGame.textContent='Iniciar';els.startGame.disabled=false;window.mpState='readyStart'}else{window.opponentConfirmed=true}});NET.onStartGame(()=>{els.start.style.display='none';els.wrap.style.display='block';initAudio();ensureRunning();stopMenuMusic();startGame(NET.isHost()?'player':'ai');window.mpState=null;window.opponentConfirmed=false});NET.onOpponentName(n=>{window.opponentName=n;updateOpponentLabel()})}
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
  G.playerHand.splice(i,1); G.playerMana-=c.cost;
  const origin = document.querySelector(`#playerHand .card[data-id='${c.id}']`);
  if(origin && !window.animationsDisabled){ try{ flyToBoard(origin,()=>{}); }catch(_){ } }
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
})();
function activateTotemById(cardId, anchor){
  if(window._activateTotemByIdImpl) return window._activateTotemByIdImpl(cardId, anchor);
  const i = G.playerHand.findIndex(x=>x.id===cardId);
  if(i<0) return;
  const c = G.playerHand[i];
  if(G.totems.length>=3){ log('Número máximo de Totens atingido.'); return; }
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
