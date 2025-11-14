(function(){const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));const logBox=$('#log');const log=t=>{if(!logBox)return;const d=document.createElement('div');d.textContent=t;logBox.prepend(d)};const rand=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),uid=()=>(Math.random().toString(36).slice(2));
const AudioCtx=window.AudioContext||window.webkitAudioContext;let actx=null,master=null,musicGain=null,musicLoopId=null,musicOn=false,musicPreset='menu',musicMuted=false,sfxMuted=false,musicVolume=1,sfxVolume=1,musicBase=.18,allMuted=false;const SFX_TONES={start:[{f:520,d:.08,t:'triangle',v:.7,w:0},{f:780,d:.09,t:'triangle',v:.6,w:.08}],play:[{f:420,d:.07,t:'sine',v:.7,w:0},{f:560,d:.08,t:'sine',v:.6,w:.06}],defense:[{f:280,d:.09,t:'square',v:.6,w:0},{f:200,d:.12,t:'sine',v:.5,w:.08}],hit:[{f:160,d:.07,t:'square',v:.6,w:0}],overflow:[{f:600,d:.1,t:'triangle',v:.6,w:0}],death:[{f:420,d:.08,t:'sawtooth',v:.6,w:0},{f:260,d:.12,t:'sawtooth',v:.55,w:.06}],end:[{f:600,d:.06,t:'triangle',v:.6,w:0},{f:400,d:.06,t:'triangle',v:.5,w:.05}],crit:[{f:120,d:.08,t:'square',v:.75,w:0},{f:90,d:.12,t:'square',v:.7,w:.06}],error:[{f:140,d:.05,t:'square',v:.6,w:0},{f:140,d:.05,t:'square',v:.6,w:.06}],mana:[{f:480,d:.08,t:'sine',v:.7,w:0},{f:720,d:.08,t:'sine',v:.6,w:.06}],reward:[{f:560,d:.08,t:'sine',v:.7,w:0},{f:840,d:.08,t:'sine',v:.6,w:.06}],reroll:[{f:360,d:.08,t:'square',v:.6,w:0}]};const ATTACK_TONES={default:[{f:320,d:.08,t:'sawtooth',v:.7,w:0},{f:180,d:.08,t:'sawtooth',v:.55,w:.05}],flame:[{f:540,d:.07,t:'sawtooth',v:.75,w:0},{f:720,d:.09,t:'triangle',v:.6,w:.05}],storm:[{f:500,d:.06,t:'square',v:.7,w:0},{f:900,d:.09,t:'triangle',v:.5,w:.04}],feral:[{f:260,d:.06,t:'square',v:.75,w:0},{f:180,d:.08,t:'square',v:.6,w:.05}],mystic:[{f:440,d:.08,t:'sine',v:.7,w:0},{f:660,d:.1,t:'sine',v:.55,w:.04}],heavy:[{f:200,d:.09,t:'sawtooth',v:.75,w:0},{f:120,d:.12,t:'square',v:.65,w:.06}],totem:[{f:360,d:.07,t:'triangle',v:.7,w:0},{f:540,d:.09,t:'triangle',v:.6,w:.05}],frost:[{f:400,d:.07,t:'sine',v:.65,w:0},{f:620,d:.09,t:'sine',v:.55,w:.05}],poison:[{f:300,d:.07,t:'sawtooth',v:.6,w:0},{f:180,d:.1,t:'triangle',v:.5,w:.04}],tidal:[{f:420,d:.07,t:'sine',v:.65,w:0},{f:540,d:.1,t:'triangle',v:.55,w:.05}]};function initAudio(){if(!AudioCtx)return;if(!actx){actx=new AudioCtx();master=actx.createGain();master.gain.value=sfxMuted?0:sfxVolume;master.connect(actx.destination)}}function ensureRunning(){if(actx&&actx.state==='suspended'){try{actx.resume()}catch(_){}}}function tone(f=440,d=.1,t='sine',v=1,w=0){if(!actx||sfxMuted)return;ensureRunning();const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.setValueAtTime(f,actx.currentTime+w);g.gain.setValueAtTime(.0001,actx.currentTime+w);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v)*sfxVolume,actx.currentTime+w+.01);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+w+d);o.connect(g);g.connect(master);o.start(actx.currentTime+w);o.stop(actx.currentTime+w+d+.02)}function playToneSequence(seq){if(!seq||!seq.length)return;for(let i=0;i<seq.length;i++){const step=seq[i];tone(step.f,step.d,step.t,step.v,step.w)}}function sfx(name,variant){if(!AudioCtx)return Promise.resolve();initAudio();if(!actx||sfxMuted)return Promise.resolve();let seq;if(name==='attack'){const key=(variant&&ATTACK_TONES[variant])?variant:'default';seq=ATTACK_TONES[key]||ATTACK_TONES.default;}else{seq=SFX_TONES[name];}if(seq){playToneSequence(seq);}return Promise.resolve();}
function setSrcFallback(el,urls,onFail){
  // Try urls in order and record failures in IMG_CACHE to avoid repeated 404s
  const tried = urls.slice();
  const tryNext = ()=>{
    if(!urls.length){
      // mark all tried URLs as failed so future renders won't re-request them
      tried.forEach(u=>{ IMG_CACHE[u] = { failed:true }; });
      try{ if(typeof onFail==='function') onFail(); }catch(_){ }
      return;
    }
    const u = urls.shift();
    // if this url is already known to have failed, skip it
    if(IMG_CACHE[u] && IMG_CACHE[u].failed) return tryNext();
    el.onerror = ()=>{
      // mark this specific url as failed immediately to prevent parallel re-requests
      try{ IMG_CACHE[u] = { failed:true }; }catch(_){ }
      tryNext();
    };
    el.onload = ()=>{
      try{
        // cache a clone of the loaded image and mark as complete
        IMG_CACHE[u] = el.cloneNode();
        IMG_CACHE[u].complete = true;
      }catch(_){ }
    };
    // set src last so handlers are in place
    el.src = u;
  };
  tryNext();
}
const pickEnemyName=(deck,boss=false)=>{const pool=(window.ENEMY_NAMES||{})[deck]||[];const list=pool.filter(e=>boss?e.boss:!e.boss);const c=list.length?rand(list):{name:"Inimigo"};return c.name;};
// --- MENU MUSIC (procedural, deck-themed) ---
const MUSIC={menu:{bpm:84,leadBase:196,bassBase:98,leadWave:'triangle',bassWave:'sine',scale:[0,3,5,7,5,3,0,-5]},vikings:{bpm:76,leadBase:174.61,bassBase:87.31,leadWave:'sawtooth',bassWave:'sine',scale:[0,3,5,7,10,7,5,3]},animais:{bpm:90,leadBase:220,bassBase:110,leadWave:'square',bassWave:'sine',scale:[0,2,5,7,9,7,5,2]},pescadores:{bpm:96,leadBase:196,bassBase:98,leadWave:'triangle',bassWave:'triangle',scale:[0,2,4,7,9,7,4,2]},floresta:{bpm:68,leadBase:207.65,bassBase:103.83,leadWave:'sine',bassWave:'sine',scale:[0,3,5,10,5,3,0,-2]},combat:{bpm:118,leadBase:220,bassBase:110,leadWave:'sawtooth',bassWave:'square',scale:[0,2,3,5,7,8,7,5],perc:true,ac:4}};
function startMenuMusic(preset){if(!AudioCtx||musicMuted)return;initAudio();ensureRunning();if(preset&&preset!==musicPreset&&musicOn){stopMenuMusic()}musicPreset=preset||musicPreset||'menu';if(musicOn)return;musicOn=true;const P=MUSIC[musicPreset]||MUSIC.menu;musicGain=actx.createGain();musicGain.gain.value=.0001;musicGain.connect(master);musicBase=musicPreset==='combat'?.22:.18;musicGain.gain.exponentialRampToValueAtTime(musicBase*musicVolume,actx.currentTime+.4);const beat=60/P.bpm,steps=P.scale.length;const schedule=()=>{if(!musicOn||!musicGain) return; let t=actx.currentTime;for(let i=0;i<steps;i++){const f=P.leadBase*Math.pow(2,P.scale[i]/12),o=actx.createOscillator(),g=actx.createGain();o.type=P.leadWave;o.frequency.setValueAtTime(f,t+i*beat);g.gain.setValueAtTime(.0001,t+i*beat);g.gain.exponentialRampToValueAtTime((musicPreset==='combat'?.13:.11)*musicVolume,t+i*beat+.01);g.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.92);o.connect(g);g.connect(musicGain);o.start(t+i*beat);o.stop(t+i*beat+beat)}for(let i=0;i<steps;i+=2){const o=actx.createOscillator(),g=actx.createGain();o.type=P.bassWave;o.frequency.setValueAtTime(P.bassBase,t+i*beat);g.gain.setValueAtTime(.0001,t+i*beat);g.gain.exponentialRampToValueAtTime((musicPreset==='combat'?.1:.09)*musicVolume,t+i*beat+.01);g.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.96);o.connect(g);g.connect(musicGain);o.start(t+i*beat);o.stop(t+i*beat+beat)}if(P.perc){for(let i=0;i<steps;i++){const h=actx.createOscillator(),hg=actx.createGain();h.type='square';h.frequency.setValueAtTime(1600,t+i*beat);hg.gain.setValueAtTime(.0001,t+i*beat);hg.gain.exponentialRampToValueAtTime(.07*musicVolume,t+i*beat+.005);hg.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.2);h.connect(hg);hg.connect(musicGain);h.start(t+i*beat);h.stop(t+i*beat+beat*.2);if(P.ac&&i%P.ac===0){const k=actx.createOscillator(),kg=actx.createGain();k.type='sine';k.frequency.setValueAtTime(120,t+i*beat);kg.gain.setValueAtTime(.0001,t+i*beat);kg.gain.exponentialRampToValueAtTime(.12*musicVolume,t+i*beat+.01);kg.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.3);k.connect(kg);kg.connect(musicGain);k.start(t+i*beat);k.stop(t+i*beat+beat*.3)}}}};schedule();const loopMs=beat*steps*1000;musicLoopId=setInterval(schedule,loopMs-25)}
function stopMenuMusic(){if(!musicOn)return;musicOn=false;if(musicLoopId){clearInterval(musicLoopId);musicLoopId=null}if(musicGain){try{musicGain.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.25)}catch(e){}setTimeout(()=>{try{musicGain.disconnect()}catch(e){}musicGain=null},300)}}
function tryStartMenuMusicImmediate(){if(!AudioCtx)return;initAudio();try{ensureRunning()}catch(e){}try{startMenuMusic('menu')}catch(e){}if(actx&&actx.state!=='running'){try{actx.resume().then(()=>startMenuMusic('menu')).catch(()=>{})}catch(e){}}if(!musicOn){let tries=0;const t=setInterval(()=>{tries++;if(musicOn||tries>8){clearInterval(t);return}try{initAudio();ensureRunning();startMenuMusic('menu')}catch(e){}},800)}}

function setMusicVolume(v){musicVolume=clamp(v,0,1);if(musicGain)musicGain.gain.value=musicMuted?0:musicBase*musicVolume}
function setSfxVolume(v){sfxVolume=clamp(v,0,1);if(master)master.gain.value=sfxMuted?0:sfxVolume}
window.setMusicVolume=setMusicVolume;
window.setSfxVolume=setSfxVolume;
window.playSfx=sfx;
window.sfx=sfx;

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
vikings:[...buildDeck('vikings'),
  ["Camponês Vigilante","","Viking",2,4,3,"Protetor","P","",""],
  ["Herbalista do Vilarejo","","Viking",1,3,2,"Entra: cura 2","","H2",""],
  ["Batedor da Aldeia","","Viking",3,2,2,"Entra: dano 1 aleatório","","P1",""],
  ["Ancião do Trigo","","Viking",2,2,3,"","","BR1","",{text:"Entra: +1/+1 aleatório. Canaliza 1 de mana.",onPlay:{mana:1}}],
  ["Patriarca da Fazenda","","Viking",4,5,5,"","","BA1","",{text:"Aliados +1 ATK. Ao destruir um inimigo, compre 1 carta.",onKill:{draw:1}}],
  ["Rastreador do Fiorde","","Viking",1,2,1,"Entra: compre 1. Ao destruir uma unidade, ganha 1 de mana.","","D1","",{onKill:{mana:1}}],
  ["Ceifeira Ágil","","Viking",3,2,2,"Furioso","F","",""],
  ["Defensor do Arado","","Viking",1,5,3,"Protetor","P","",""],
  ["Runomante Rural","","Viking",2,3,3,"Entra: +1/+1 aleatório","","BR1",""],
  ["Guerreiro da Foice","","Viking",5,3,4,"Furioso","F","",""],
],
animais:[...buildDeck('animais'),
  ["Lobo Alfa","","Animal",5,4,4,"Furioso","F","",""],
  ["Lince Ártico","","Animal",3,3,3,"Veloz","","",""],
  ["Falcão das Montanhas","","Animal",2,3,3,"Entra: compre 1","","D1",""],
  ["Caribu Selvagem","","Animal",4,5,4,"","P","","",{text:"Protetor. Entra: gera 1 mana temporária.",onPlay:{mana:1}}],
  ["Texugo Ártico","","Animal",3,2,2,"Furioso","F","",""],
  ["Foca do Gelo","","Animal",2,3,2,"Entra: compre 1","","D1",""],
  ["Lobo Uivante","","Animal",4,3,4,"Furioso. Ao destruir uma unidade inimiga, ganha 1 de mana.","F","","",{onKill:{mana:1}}],
  ["Raposa Escarlate","","Animal",3,2,2,"Furioso","F","",""],
  ["Touro das Neves","","Animal",5,5,5,"Protetor","P","",""],
  ["Corvo Astuto","","Animal",1,2,2,"Entra: compre 1","","D1",""],
  ["Fera das Cavernas","","Animal",6,6,6,"Furioso","F","",""],
],
pescadores:[...buildDeck('pescadores'),
  ["Curandeiro do Mar","","Viking",1,4,3,"Entra: cura 2","","H2",""],
  ["Bardo do Porto","","Viking",2,3,3,"Aliados +1 ATK","","BA1",""],
  ["Caçador de Tesouros","","Viking",2,2,2,"Entra: compre 1","","D1",""],
  ["Escudeiro do Convés","","Viking",2,5,4,"Protetor","P","",""],
  ["Guarda do Cais","","Viking",3,2,3,"Entra: dano 1 aleatório","","P1",""],
  ["Aprendiz de Rede","","Viking",1,2,1,"Entra: compre 1","","D1",""],
  ["Baleeiro Leal","","Viking",2,4,3,"Protetor","P","",""],
  ["Atirador do Convés","","Viking",3,2,2,"Entra: dano 1 aleatório","","P1",""],
  ["Sacerdote das Ondas","","Viking",2,3,3,"Entra: canaliza 2 de mana.","","M2",""],
  ["Corsário Intrépido","","Viking",4,2,3,"","F","","",{text:"Furioso. Ao destruir um inimigo, ganha 1 de mana.",onKill:{mana:1}}],
],
floresta:[...buildDeck('floresta'),
  ["Lince da Sombra","","Animal",4,2,3,"Furioso","F","",""],
  ["Corvo Observador","","Animal",1,2,2,"Entra: compre 1","","D1",""],
  ["Guardião Musgoso","","Animal",3,5,4,"Protetor","P","",""],
  ["Cervo Rúnico","","Animal",3,3,3,"Entra: +1/+1 aleatório","","BR1",""],
  ["Javali Voraz","","Animal",5,3,4,"Furioso","F","",""],
  ["Lebre da Névoa","","Animal",1,1,1,"Veloz","","",""],
  ["Guardião da Clareira","","Animal",2,5,3,"","P","","",{text:"Protetor. Entra: concede 1 mana temporária.",onPlay:{mana:1}}],
  ["Raposa Sombria","","Animal",3,2,2,"Furioso","F","",""],
  ["Urso Musgoso","","Animal",5,6,5,"Protetor","P","",""],
  ["Coruja Mensageira","","Animal",1,2,2,"Entra: compre 1","","D1",""],
  ["Cervo das Runas","","Animal",3,3,3,"Entra: +1/+1 aleatório","","BR1",""],
],
convergentes:[
  ["Neófito Convergente","🌀","Convergente",2,2,1,"Entra: copia uma palavra-chave de um aliado","A"],
  ["Proteiforme da Aurora","🌈","Convergente",3,3,3,"","M"],
  ["Guardião Quimérico","🛡️🐺","Convergente",2,6,4,"","P|M"],
  ["Raider Metamorfo","⚔️🌊","Convergente",4,2,3,"","F|M"],
  ["Runa Voraz","🌀🪨","Convergente",1,4,2,"Ganha +1 ATK sempre que um aliado morre."],
  ["Totem Absorvente","🪵🌀","Convergente",0,5,3,"Fim de turno: copia uma palavra-chave de um inimigo aleatório.","P"],
  ["Arauto da Aurora","✨👑","Convergente",5,5,6,"Se você copiou ≥3 palavras-chave na partida, aliados +1/+1."],
  ["Sombra Rúnica","🌘🌀","Convergente",3,3,3,"Sempre que absorver, ganha +1/+1.","A"],
  ["Guerreiro Sincrético","⚔️🛡️","Convergente",4,4,4,"Entra: escolha Furioso ou Protetor; ganha essa palavra-chave."],
  ["Lince Metamórfico","🐱🌈","Convergente",3,2,2,"","F|M"],
  ["Capataz de Runas","🌀⚙️","Convergente",2,4,3,"Ao absorver, causa 1 de dano a todos os inimigos.","A"],
  ["Colosso Alquímico","🗿🌈","Convergente",7,7,7,"Entra: copia uma palavra-chave de cada aliado.","M"],
  ["Essência Convergente","💠","Convergente",0,0,1,"Entra com ATK/HP iguais ao nº de palavras-chave diferentes que você controla.","A"],
  ["Discípulo Maleável","","Convergente",1,3,2,"","M"],
  ["Sentinela Vórtice","","Convergente",2,4,3,"Entra: copia uma palavra-chave de um aliado","P|A"],
  ["Tecelão Cambiante","","Convergente",2,3,3,"Entra: compre 1","A","D1"],
  ["Eco Mutante","","Convergente",4,4,4,"","A|M"],
  ["Bruto Assimilador","","Convergente",5,5,5,"","A|M"],
  ["Sábio Prismal","","Convergente",3,5,4,"Entra: +1/+1 aleatório","M","BR1"],
  ["Avatar Mutagênico","","Convergente",6,6,6,"","M"],
]};
class StoryMode{
  constructor({level=1}={}){this.level=level;this.round=0;this.totems=[];this.deck=[];this.scaling=0;this.xp=0;this.gold=30;this.bossInterval=10;this.eliteEvery=5;this.currentEncounter='normal';this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this._startManaGranted=false;}
  nextRound(){this.round+=1;this.scaling=Math.floor(this.round/2)+(this.level-1);const isBoss=this.round%this.bossInterval===0;const isElite=!isBoss&&this.round%this.eliteEvery===0;this.currentEncounter=isBoss?'boss':isElite?'elite':'normal';return{isBoss,isElite};}
  handleVictory(){const xpGain=this.currentEncounter==='boss'?20:this.currentEncounter==='elite'?10:5;const goldGain=this.currentEncounter==='boss'?20:this.currentEncounter==='elite'?10:5;this.xp+=xpGain;this.gold+=goldGain;const leveled=this.checkLevelUp();return{leveled,rewards:this.rewardOptions(),goldGain};}
  rewardOptions(){return['Nova carta','Evoluir carta','Ganhar Totem','Buff permanente'];}
  checkLevelUp(){const need=this.level*50;if(this.xp>=need){this.level+=1;this.xp-=need;return true}return false}
  addTotem(t){if(this.totems.length>=3)return false;this.totems.push(t);return true}
  registerBonus(bonus,src){if(!bonus)return'';const notes=[];if(bonus.startMana){this.bonuses.startMana+=bonus.startMana;notes.push(`+${bonus.startMana} mana inicial`);}if(bonus.killMana){this.bonuses.killMana+=bonus.killMana;notes.push(`+${bonus.killMana} mana por eliminação`);}if(bonus.allyBuff){this.bonuses.allyBuff.atk+=bonus.allyBuff.atk||0;this.bonuses.allyBuff.hp+=bonus.allyBuff.hp||0;if(bonus.allyBuff.atk)notes.push(`Aliados +${bonus.allyBuff.atk} ATK`);if(bonus.allyBuff.hp)notes.push(`Aliados +${bonus.allyBuff.hp} HP`);}if(bonus.totemBonus){this.bonuses.totemBonus.atk+=bonus.totemBonus.atk||0;this.bonuses.totemBonus.hp+=bonus.totemBonus.hp||0;if(bonus.totemBonus.atk||bonus.totemBonus.hp)notes.push('Totens fortalecidos');}if(src&&src.name){this.bonuses.items.push(src.name);}return notes.join(', ');}
  reset(){this.round=0;this.totems=[];this.deck=[];this.xp=0;this.gold=30;this.currentEncounter='normal';this.bonuses={startMana:0,killMana:0,allyBuff:{atk:0,hp:0},totemBonus:{atk:0,hp:0},items:[]};this._startManaGranted=false;}
}
const ALL_DECKS=Object.keys(TEMPLATES);
const G={playerHP:30,aiHP:30,turn:0,playerMana:0,playerManaCap:0,aiMana:0,aiManaCap:0,current:'player',playerDeck:[],aiDeck:[],playerHand:[],aiHand:[],playerBoard:[],aiBoard:[],playerDiscard:[],aiDiscard:[],chosen:null,playerDeckChoice:'vikings',aiDeckChoice:rand(ALL_DECKS),customDeck:null,mode:'solo',story:null,enemyScaling:0,maxHandSize:5,totems:[]};
// expose for helpers that run outside this closure
try{ window.G = G; }catch(_){ }
const els={pHP:$('#playerHP'),pHP2:$('#playerHP2'),aHP:$('#aiHP'),aHP2:$('#aiHP2'),opponentLabel:$('#opponentLabel'),mana:$('#mana'),pHand:$('#playerHand'),pBoard:$('#playerBoard'),aBoard:$('#aiBoard'),endBtn:$('#endTurnBtn'),muteBtn:$('#muteBtn'),aAva:$('#aiAvatar'),drawCount:$('#drawCount'),discardCount:$('#discardCount'),barPHP:$('#barPlayerHP'),barAHP:$('#barAiHP'),barMana:$('#barMana'),wrap:$('#gameWrap'),start:$('#start'),openEncy:$('#openEncy'),ency:$('#ency'),encyGrid:$('#encyGrid'),encyFilters:$('#encyFilters'),closeEncy:$('#closeEncy'),startGame:$('#startGame'),endOverlay:$('#endOverlay'),endMsg:$('#endMsg'),endSub:$('#endSub'),playAgainBtn:$('#playAgainBtn'),rematchBtn:$('#rematchBtn'),menuBtn:$('#menuBtn'),openMenuBtn:$('#openMenuBtn'),gameMenu:$('#gameMenu'),closeMenuBtn:$('#closeMenuBtn'),resignBtn:$('#resignBtn'),restartBtn:$('#restartBtn'),mainMenuBtn:$('#mainMenuBtn'),turnIndicator:$('#turnIndicator'),emojiBar:$('#emojiBar'),playerEmoji:$('#playerEmoji'),opponentEmoji:$('#opponentEmoji'),deckBuilder:$('#deckBuilder'),saveDeck:$('#saveDeck'),midMana:$('#midMana')};
const bodyEl=document.body||document.querySelector('body');
function applyBattleTheme(theme){if(!bodyEl)return;const wrap=els.wrap;if(!theme){bodyEl.removeAttribute('data-battle-theme');if(wrap)wrap.removeAttribute('data-battle-theme');return;}bodyEl.setAttribute('data-battle-theme',theme);if(wrap)wrap.setAttribute('data-battle-theme',theme);}
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
const DECK_TITLES={vikings:'Fazendeiros Vikings',animais:'Bestas do Norte',pescadores:'Pescadores do Fiorde',floresta:'Feras da Floresta',convergentes:'Convergentes da Aurora',custom:'Custom'};
const DECK_ASSETS={
  vikings:{folder:'farm-vikings',back:'fv',dbExt:'png',cbExt:'webp'},
  pescadores:{folder:'fJord-fishers',back:'jf',dbExt:'webp',cbExt:'webp'},
  floresta:{folder:'forest-beasts',back:'fb',dbExt:'webp',cbExt:'webp'},
  animais:{folder:'north-beasts',back:'nb',dbExt:'webp',cbExt:'webp'}
};
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
    if(info) return [`img/decks/${info.folder}/characters/${base}.png`];
    return null;
  }
  return null;
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
  const urls=[]; bases.forEach(b=>urls.push(`img/decks/${info.folder}/characters/${b}.png`));
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
function renderPool(){const all=[...TEMPLATES.vikings,...TEMPLATES.animais,...TEMPLATES.pescadores,...TEMPLATES.floresta,...TEMPLATES.convergentes];if(!poolEl)return;poolEl.innerHTML='';all.forEach(raw=>{const name=raw[0]|| (typeof raw[9]==='string'?normalizeCardName(raw[9]):'');const emoji=raw[1]||'';const row=document.createElement('div');row.className='pitem';row.innerHTML=`<span class="c">${raw[5]}</span><div>${emoji} ${name}</div><button class="add">+</button>`;row.querySelector('.add').onclick=()=>{if(!G.customDeck)G.customDeck=[];if(G.customDeck.length>=20)return;const c=makeCard(raw);G.customDeck.push(c);renderChosen();updateCurve()};poolEl.appendChild(row)})}
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
    if(card.emoji){
      const c=document.createElement('canvas'); c.width=96; c.height=96; const ctx=c.getContext('2d'); ctx.font='72px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(card.emoji,48,60); container.appendChild(c);
    }else{ const ph=document.createElement('div'); ph.className='img-missing'; ph.textContent='?'; container.appendChild(ph); }
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
  const manaDots=`<span class="mana-dot ${c.deck}"></span>`.repeat(c.cost);
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
  <div class="stats"><span class="gem atk">⚔️ ${c.atk}</span>${c.stance?`<span class="stance-label ${c.stance}">${c.stance==='defense'?'🛡️':'⚔️'}</span>`:''}<span class="gem hp ${c.hp<=2?'low':''}">❤️ ${c.hp}</span></div>`;
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
  // Totem: hide stats, show name+effect in text area with tooltip
  try{
    if(isTotem(c)){
      const textBox=d.querySelector('.text');
      if(textBox){
        const desc = describeTotem(c);
        textBox.setAttribute('data-tip', desc);
        textBox.innerHTML = `<span class='keyword'>Totem</span> ${desc}`;
      }
      // show same icon in art area
      const art=d.querySelector('.art');
      if(art){ art.innerHTML = `<div class="totem-icon-art">${totemIcon(c)}</div>`; }
      // make card itself show tooltip anywhere
      d.setAttribute('data-tip', describeTotem(c));
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
}
const hasGuard=b=>b.some(x=>x.kw.includes('Protetor')||x.stance==='defense');
function updateMeters(){
  const pct=(v,max)=>(max>0?Math.max(0,Math.min(100,(v/max)*100)):0);
  els.barPHP.style.width=pct(G.playerHP,30)+'%';
  els.barAHP.style.width=pct(G.aiHP,30)+'%';
  els.barMana.style.width=pct(G.playerMana,G.playerManaCap)+'%';
  try{ if(els.midMana){ els.midMana.textContent = `${G.playerMana}/${G.playerManaCap}`; } }catch(_){ }
}
function updateOpponentLabel(){if(!els.opponentLabel)return;if(window.isMultiplayer){els.opponentLabel.textContent=window.opponentName?` ${window.opponentName}`:'';}else if(G.mode==='story'){els.opponentLabel.textContent='';}else{const t=DECK_TITLES[G.aiDeckChoice]||'';els.opponentLabel.textContent=t?` ${t}`:'';}}
function renderAll(){
  els.pHP.textContent=G.playerHP;
  els.pHP2.textContent=G.playerHP;
  els.aHP.textContent=G.aiHP;
  els.aHP2.textContent=G.aiHP;
  els.mana.textContent=`${G.playerMana}/${G.playerManaCap}`;
  try{ if(els.midMana){ els.midMana.textContent = `${G.playerMana}/${G.playerManaCap}`; } }catch(_){ }
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
  updateMeters();updateOpponentLabel();renderHand();renderBoard();renderTotems()
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
function animateDrawFlip(ids=[]){
  if(!ids.length) return;
  // ensure hand is rendered first
  const cards = $$('#playerHand .card');
  // map id -> node and keep left-to-right order from DOM
  const domOrder = cards.slice().sort((a,b)=>Number(a.style.zIndex||0)-Number(b.style.zIndex||0));
  // find nodes for ids, in DOM left-to-right order
  const nodes = domOrder.filter(n=>ids.includes(n.dataset.id));
  nodes.forEach((node,i)=>{
    // prepare back/front faces if not present
    if(!node.querySelector('.flip-inner')){
      const inner=document.createElement('div'); inner.className='flip-inner';
      // create front and back wrappers
      const front=document.createElement('div'); front.className='face front';
      const back=document.createElement('div'); back.className='face back';
      // back image: use deck-specific back if available
      const deckKey = (G.playerDeckChoice||'vikings');
      const info = DECK_ASSETS[deckKey] || DECK_ASSETS.vikings;
  const backUrl = `img/decks/${info.folder}/card-backs/${info.back}-cb-default.${info.cbExt}`;
      back.innerHTML = `<img src='${backUrl}' alt='back' style='width:90%;height:auto;max-height:80%;object-fit:contain'>`;
      // move existing content into front
      while(node.firstChild) front.appendChild(node.firstChild);
      inner.appendChild(front);
      inner.appendChild(back);
      node.appendChild(inner);
      node.classList.add('show-back');
    }
    // schedule flip with stagger (50% faster)
    setTimeout(()=>{
      // toggle class to rotate inner once
      node.classList.remove('show-back');
      // after flip, cleanup: unwrap front children back into card root
      setTimeout(()=>{
        const inner=node.querySelector('.flip-inner');
        if(inner){
          const front=inner.querySelector('.face.front');
          while(front && front.firstChild) node.insertBefore(front.firstChild, node.firstChild);
          inner.remove();
        }
        node.classList.remove('show-back');
      },175);
    }, i*45);
  });
}

function animateDrawFlipOne(id){
  return new Promise(resolve=>{
    const node = document.querySelector(`#playerHand .card[data-id='${id}']`);
    if(!node) return resolve();
    // prepare faces if absent
    if(!node.querySelector('.flip-inner')){
      const inner=document.createElement('div'); inner.className='flip-inner';
      const front=document.createElement('div'); front.className='face front';
      const back=document.createElement('div'); back.className='face back';
      const deckKey = (G.playerDeckChoice||'vikings');
      const info = DECK_ASSETS[deckKey] || DECK_ASSETS.vikings;
  const backUrl = `img/decks/${info.folder}/card-backs/${info.back}-cb-default.${info.cbExt}`;
      back.innerHTML = `<img src='${backUrl}' alt='back' style='width:90%;height:auto;max-height:80%;object-fit:contain'>`;
      while(node.firstChild) front.appendChild(node.firstChild);
      inner.appendChild(front); inner.appendChild(back); node.appendChild(inner);
      node.classList.add('show-back');
    }
    // trigger flip (50% faster)
    requestAnimationFrame(()=>{
      node.classList.remove('show-back');
      setTimeout(()=>{
        const inner=node.querySelector('.flip-inner');
        if(inner){ const front=inner.querySelector('.face.front'); while(front && front.firstChild) node.insertBefore(front.firstChild, node.firstChild); inner.remove(); }
        node.classList.remove('show-back');
        resolve();
      },175);
    });
  });
}

  document.addEventListener('click', e => {
    if(!G.chosen) return;
    if(e.target.closest('#aiBoard .card.selectable') || e.target.closest('#playerBoard .card.selectable') || e.target.closest('#aiBoard .face-attack-btn')) return;
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

  let btn=document.querySelector('#aiBoard .face-attack-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='btn-ghost face-attack-btn';
    btn.textContent='🗡️ Atacar diretamente';
    Object.assign(btn.style,{position:'absolute',top:'8px',right:'8px',display:'none'});
    btn.addEventListener('click',()=>{if(G.chosen)attackFace(G.chosen,'ai')});
    els.aBoard.appendChild(btn);
  }
  updateFaceAttackZone();
}

function renderTotems(){
  const bar=document.getElementById('totemBar');
  if(!bar) return;
  bar.innerHTML='';
  for(let i=0;i<3;i++){
    const slot=document.createElement('div');
    slot.className='totem-slot';
    if(G.totems[i]){ slot.textContent=G.totems[i].icon||'🗿'; }
    bar.appendChild(slot);
  }
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
  G.playerDeck.forEach(c=>{
    if(c.type==='spell'||isTotem(c)) return;
    if(buff.atk){c.atk+=buff.atk;}
    if(buff.hp){c.hp+=buff.hp;}
    if(c.atk<0)c.atk=0;
    if(c.hp<1)c.hp=1;
    c.baseAtk=c.atk;
    c.baseHp=c.hp;
  });
}
function startGame(opts='player') {
  updateCardSize();
  const isObj = typeof opts === 'object';
  const first = isObj ? (opts.first || 'player') : opts;
  const continuing = isObj && opts.continueStory;
  const sanitize = c => { if (c.hp < 1) c.hp = 1; if (c.atk < 0) c.atk = 0; return c; };
  G.mode = window.currentGameMode === 'story' ? 'story' : 'solo';
  if (G.mode === 'story') {
    if (!G.story) G.story = new StoryMode({ level: 1 });
    G.story.nextRound();
    G.story._startManaGranted = false;
    G.aiDeckChoice = rand(ALL_DECKS);
    const boss = G.story.currentEncounter === 'boss';
    G.enemyScaling = G.story.scaling;
    G.currentEnemyName = pickEnemyName(G.aiDeckChoice, boss);
    log(`Round ${G.story.round}: ${G.currentEnemyName} (${G.story.currentEncounter})`);
    showEncounterBanner(G.currentEnemyName, boss ? 'boss' : 'enemy');
    G.maxHandSize = 10;
  } else {
    G.story = null;
    G.enemyScaling = 0;
    G.maxHandSize = 5;
  }
  if (G.mode === 'story' && continuing) {
    G.playerDeck.push(...G.playerHand, ...G.playerBoard, ...G.playerDiscard);
    G.playerHand = [];
    G.playerBoard = [];
    G.playerDiscard = [];
  } else {
    G.totems = [];
    G.playerDeck = (G.playerDeckChoice === 'custom' && G.customDeck ? G.customDeck.slice() : TEMPLATES[G.playerDeckChoice].map(makeCard));
    if (G.mode === 'story') {
      const t = makeCard(["Totem de Força", "🗿", "Totem", 0, 0, 2, "Ative: +1/+1 em um aliado"]);
      t.type = 'totem';
      G.playerDeck.push(t);
      if (G.story && G.story.deck && G.story.deck.length) {
        G.story.deck.forEach(it => {
          const raw = [it.name, '', '', it.atk || 0, it.hp || 0, it.cost || 0, it.desc || ''];
          const c = makeCard(raw);
          if (it.type) { c.type = it.type; applyClassDefaults(c, c.tribe); }
          G.playerDeck.push(c);
        });
      }
      applyStoryDeckBonuses();
    }
    shuffle(G.playerDeck);
  }
  G.playerDeck.forEach(c => { sanitize(c); c.owner = 'player'; c.deck = (G.playerDeckChoice === 'custom' ? 'custom' : G.playerDeckChoice); });
  G.aiDeck = TEMPLATES[G.aiDeckChoice].map(makeCard);
  shuffle(G.aiDeck);
  G.aiDeck.forEach(c => { sanitize(c); c.owner = 'ai'; c.deck = G.aiDeckChoice; if (G.mode === 'story') { c.atk += G.enemyScaling; c.hp += G.enemyScaling; } });
  G.playerDiscard = [];
  G.aiDiscard = [];
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
  if (first === 'player') draw('player', 5); else draw('ai', 5);
  newTurn(true);
  renderAll();
  stopMenuMusic();
  startMenuMusic('combat');
  log('A batalha começou!');
  sfx('start');
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
function applyTotemBuffs(){if(!G.playerBoard.length||!G.totems.length)return;G.playerBoard.forEach(u=>{u.atk=(u.baseAtk!==undefined?u.baseAtk:u.atk);u.hp=(u.baseHp!==undefined?u.baseHp:u.hp);u.baseAtk=u.atk;u.baseHp=u.hp});G.totems.forEach(t=>{const cnt=Math.min(3,G.playerBoard.length);const picks=shuffle(G.playerBoard.slice()).slice(0,cnt);picks.forEach(u=>{if(t.buffs&&t.buffs.atk)u.atk+=t.buffs.atk;if(t.buffs&&t.buffs.hp)u.hp+=t.buffs.hp;})})}
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
function newTurn(skipDraw=false,prev){if(prev)applyEndTurnEffects(prev);G.turn++;if(G.current==='player'){if(!skipDraw){if(G.playerDeck.length<=4){G.playerDeck.push(...shuffle(G.playerDiscard.splice(0)))}draw('player',5)}G.playerManaCap=clamp(G.playerManaCap+1,0,10);G.playerMana=G.playerManaCap;if(G.mode==='story'&&G.story){if(!G.story._startManaGranted){const bonus=G.story.bonuses&&G.story.bonuses.startMana||0;if(bonus){const beforeCap=G.playerManaCap;G.playerManaCap=clamp(G.playerManaCap+bonus,0,10);G.playerMana=Math.min(G.playerMana+bonus,G.playerManaCap);if(G.playerManaCap>beforeCap||bonus){log('Os suprimentos da campanha concedem mana extra ao clã.');}}G.story._startManaGranted=true;}}G.playerBoard.forEach(c=>c.canAttack=true)}else{if(!skipDraw){if(G.aiDeck.length<=4){G.aiDeck.push(...shuffle(G.aiDiscard.splice(0)))}draw('ai',5)}G.aiManaCap=clamp(G.aiManaCap+1,0,10);G.aiMana=G.aiManaCap;G.aiBoard.forEach(c=>c.canAttack=true)}renderAll();showTurnIndicator()}
function endTurn(){if(G.current!=='player')return;discardHand('player');G.current='ai';G.chosen=null;updateTargetingUI();newTurn(false,'player');sfx('end');if(window.isMultiplayer){NET.sendTurn('end')}else{setTimeout(aiTurn,500)}}
function playFromHand(id,st){if(G.current!=='player')return;const i=G.playerHand.findIndex(c=>c.id===id);if(i<0)return;const c=G.playerHand[i];const boardFull=c.type!=='totem'&&G.playerBoard.length>=5;if(c.cost>G.playerMana||boardFull)return;G.playerHand.splice(i,1);G.playerMana-=c.cost;if(c.type==='totem'){if(G.totems.length>=3){log('Número máximo de Totens atingido.');G.playerDiscard.push(c);}else{const t={name:c.name,buffs:c.buffs||{atk:1,hp:1}};G.totems.push(t);applyTotemBuffs();log(`${c.name} ativado.`);}renderAll();return;}summon('player',c,st);renderAll();sfx(st==='defense'?'defense':'play')}
function summon(side,c,st='attack',skipBC=false){
  const board = side==='player'?G.playerBoard:G.aiBoard;
  c.stance = st;
  c.canAttack = (st==='attack') && c.kw.includes('Furioso');
  c.summonTurn = G.turn;
  board.push(c);
  particleOnCard(c.id,'summon');
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
function triggerBattlecry(side,c){const foe=side==='player'?'ai':'player';const effects=[];switch(c.battlecry){case 'draw1':draw(side,1);log(`${c.name}: comprou 1 carta.`);effects.push({type:'draw'});break;case 'heal2':{const allies=(side==='player'?G.playerBoard:G.aiBoard);if(allies.length){const t=rand(allies);t.hp=Math.min(t.hp+2,20);fxTextOnCard(t.id,'+2','heal');const n=nodeById(t.id);if(n){const r=n.getBoundingClientRect();screenParticle('healing',r.left+r.width/2,r.top+r.height/2);}log(`${c.name}: curou 2 em ${t.name}.`);effects.push({type:'heal',targetId:t.id,amount:2})}}break;case 'ping1':{const foes=(foe==='ai'?G.aiBoard:G.playerBoard);if(foes.length){const t=rand(foes);damageMinion(t,1);particleOnCard(t.id,'attack');fxTextOnCard(t.id,'-1','dmg');log(`${c.name}: 1 de dano em ${t.name}.`);checkDeaths();renderAll();sfx('hit');effects.push({type:'damage',targetId:t.id,amount:1})}}break;case 'buffRandom1':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);if(allies.length){const t=rand(allies);t.atk+=1;t.hp+=1;fxTextOnCard(t.id,'+1/+1','buff');particleOnCard(t.id,'magic');log(`${c.name}: deu +1/+1 em ${t.name}.`);effects.push({type:'buff',targetId:t.id,atk:1,hp:1})}}break;case 'buffAlliesAtk1':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);allies.forEach(x=>{x.atk+=1;fxTextOnCard(x.id,'+1 ATK','buff');particleOnCard(x.id,'magic');effects.push({type:'buff',targetId:x.id,atk:1,hp:0})});if(allies.length)log(`${c.name}: aliados ganharam +1 de ataque.`)}break;case 'mana1':{if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+1,0,10);G.playerMana=Math.min(G.playerMana+1,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+1,0,10);G.aiMana=Math.min(G.aiMana+1,G.aiManaCap);}log(`${c.name}: ganhou 1 de mana.`);effects.push({type:'mana',amount:1})}break;case 'mana2':{if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+2,0,10);G.playerMana=Math.min(G.playerMana+2,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+2,0,10);G.aiMana=Math.min(G.aiMana+2,G.aiManaCap);}log(`${c.name}: canalizou 2 de mana.`);effects.push({type:'mana',amount:2})}break;case 'sacMana':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);if(allies.length){const t=rand(allies);const board=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const idx=board.findIndex(x=>x.id===t.id);if(idx>-1){board.splice(idx,1);discard.push(t);resetCardState(t);particleOnCard(t.id,'explosion');}if(side==='player'){G.playerMana=Math.min(G.playerMana+t.cost,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+t.cost,G.aiManaCap);}fxTextOnCard(t.id,'sac','dmg');log(`${c.name}: sacrificou ${t.name} e ganhou ${t.cost} de mana.`);effects.push({type:'sacMana',targetId:t.id,amount:t.cost});checkDeaths();renderAll();}}break;}return effects}
function applyBattlecryEffects(side,effects){effects.forEach(e=>{if(e.type==='heal'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.hp=Math.min(t.hp+e.amount,20);fxTextOnCard(t.id,'+'+e.amount,'heal');particleOnCard(t.id,'healing')}}else if(e.type==='damage'){const foes=side==='player'?G.aiBoard:G.playerBoard;const t=foes.find(x=>x.id===e.targetId);if(t){damageMinion(t,e.amount);particleOnCard(t.id,'attack');fxTextOnCard(t.id,'-'+e.amount,'dmg')}}else if(e.type==='buff'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.atk+=e.atk;t.hp+=e.hp;fxTextOnCard(t.id,'+'+e.atk+(e.hp?'/'+e.hp:''),'buff');particleOnCard(t.id,'magic')}}else if(e.type==='mana'){if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+e.amount,0,10);G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+e.amount,0,10);G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}else if(e.type==='sacMana'){const allies=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const t=allies.find(x=>x.id===e.targetId);if(t){allies.splice(allies.indexOf(t),1);discard.push(t);resetCardState(t);particleOnCard(t.id,'explosion');}if(side==='player'){G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}});checkDeaths()}

function absorbFromAlly(side,c){const board=side==='player'?G.playerBoard:G.aiBoard;const allies=board.filter(x=>x.id!==c.id&&x.kw&&x.kw.length);if(!allies.length)return;const src=rand(allies);const choices=src.kw.filter(k=>!c.kw.includes(k));if(!choices.length)return;const kw=rand(choices);c.kw.push(kw);particleOnCard(c.id,'magic');fxTextOnCard(c.id,kw,'buff');log(`${c.name} absorveu ${kw}.`);if(c.name==='Sombra Rúnica'){c.atk+=1;c.hp+=1;}if(c.name==='Capataz de Runas'){const foes=side==='player'?G.aiBoard:G.playerBoard;foes.forEach(t=>{damageMinion(t,1);particleOnCard(t.id,'attack');fxTextOnCard(t.id,'-1','dmg')});checkDeaths()}}

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
    G.chosen=null; document.body.classList.remove('targeting');
    return false;
  }
  G.chosen=ref;
  return true;
}
function cancelTargeting(){if(!G.chosen)return;G.chosen=null;updateTargetingUI();els.aBoard.classList.remove('face-can-attack');renderBoard()}
function selectAttacker(c){if(G.current!=='player'||!c.canAttack||c.stance==='defense')return;G.chosen=c;updateTargetingUI();renderBoard();updateFaceAttackZone();G.aiBoard.filter(x=>x.stance==='defense').forEach(x=>setTimeout(()=>animateDefense(x.id),20))}
function updateFaceAttackZone(){
  const guard=hasGuard(G.aiBoard), valid=validateChosen();
  const canFace = valid && !guard;
  const btn=document.querySelector('#aiBoard .face-attack-btn');
  if(canFace){
    els.aBoard.classList.add('face-can-attack');
    btn&&(btn.style.display='block');
  }else{
    els.aBoard.classList.remove('face-can-attack');
    btn&&(btn.style.display='none');
  }
}
function legalTarget(side,target){const b=side==='ai'?G.aiBoard:G.playerBoard;return hasGuard(b)?(target.kw.includes('Protetor')||target.stance==='defense'):true}
const nodeById=id=>document.querySelector(`.card[data-id="${id}"]`);
const addAnim=(n,c,d=400)=>{n&&n.classList.add(c);setTimeout(()=>n&&n.classList.remove(c),d)};
const animateAttack=(aId,tId)=>{const a=nodeById(aId),t=tId?nodeById(tId):null;addAnim(a,'attack-lunge',350);if(t)addAnim(t,'hit-shake',350)};
const animateDefense=id=>{const n=nodeById(id);addAnim(n,'shield-flash',600)};
function screenSlash(x,y,ang){const fx=document.createElement('div');fx.className='fx fx-slash';fx.style.left=x+'px';fx.style.top=y+'px';fx.style.setProperty('--ang',ang+'deg');document.body.appendChild(fx);setTimeout(()=>fx.remove(),380)}
function screenParticle(n,x,y){const fx=document.createElement('div');fx.className='fx fx-'+n;fx.style.left=x+'px';fx.style.top=y+'px';document.body.appendChild(fx);setTimeout(()=>fx.remove(),600)}
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
      }
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+info.mana,G.aiManaCap);
      if(G.aiMana>before){
        try{particleOnCard(card.id,'magic');}catch(_){ }
        sfx('mana');
        log(`O inimigo canalizou energia com ${card.name}.`);
      }
    }
  }
  if(info.draw){
    const amount=Math.max(1,info.draw|0);
    const res=draw(side,amount);
    sfx('reward');
    log(`${card.name} inspirou ${amount} carta${amount>1?'s':''}.`);
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
  setTimeout(()=>b.classList.remove('show'),1500);
}
function encounterTransition(cb){const t=document.getElementById('encounterTransition');if(!t){cb();return;}t.classList.add('show');setTimeout(()=>{cb();setTimeout(()=>t.classList.remove('show'),400);},400)}
function particleOnCard(cid,n){const t=nodeById(cid);if(!t)return;const r=t.getBoundingClientRect();screenParticle(n,r.left+r.width/2,r.top+r.height/2)}
function particleOnFace(side,n){
  // Prefer HP meters in the HUD; fallback to hidden bottom faces if present
  const anchor = side==='ai' ? (els.barAHP || els.aHP2) : (els.barPHP || els.pHP2);
  if(!anchor) return;
  const r = anchor.getBoundingClientRect();
  screenParticle(n, r.left + r.width/2, r.top + r.height/2);
}
function fxTextOnCard(cid,text,cls){const n=document.querySelector(`.card[data-id="${cid}"]`);if(!n)return;const r=n.getBoundingClientRect();const fx=document.createElement('div');fx.className='fx-float '+(cls||'');fx.textContent=text;fx.style.left=(r.left+r.width/2)+'px';fx.style.top=(r.top+r.height/2)+'px';document.body.appendChild(fx);setTimeout(()=>fx.remove(),950);}
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
      if(gained>0){try{particleOnCard(attacker.id,'magic');fxTextOnCard(attacker.id,`+${gained} mana`,'buff');}catch(_){ }sfx('mana');}
    }else{
      const before=G.aiMana;
      G.aiMana=Math.min(G.aiMana+manaGain,G.aiManaCap);
      if(G.aiMana>before){try{particleOnCard(attacker.id,'magic');}catch(_){ }sfx('mana');}
    }
  }
  if(drawGain){
    const amount=Math.max(1,drawGain|0);
    const res=draw(side,amount);
    sfx('reward');
    log(`${attacker.name} saqueou ${amount} carta${amount>1?'s':''} após derrotar ${target.name}.`);
    if(res&&typeof res.then==='function'){res.then(()=>{try{renderAll();}catch(_){ }});}
  }
  if(cardMana){log(`${attacker.name} drenou energia de ${target.name}.`);}
  if(storyMana){log('Os artefatos de campanha revertem a energia da batalha em mana.');}
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
function normalizeText(txt){return (txt||'').normalize('NFD').replace(/[^a-zA-Z0-9\s]/g,'').toLowerCase();}
function detectAttackFx(card){if(!card)return'attack';const nameNorm=normalizeText(card.name);const tribeNorm=normalizeText(card.tribe);if(card.type==='totem'||ATTACK_FX_RULES[0].test.test(nameNorm))return'totem';for(const rule of ATTACK_FX_RULES){if(rule.test.test(nameNorm))return rule.fx;}if(tribeNorm.includes('animal')||tribeNorm.includes('fera'))return'feral';if(tribeNorm.includes('pesc')||tribeNorm.includes('mar')||tribeNorm.includes('oceano'))return'tidal';if(tribeNorm.includes('floresta')||tribeNorm.includes('bosque'))return'feral';if(tribeNorm.includes('converg'))return'mystic';if(tribeNorm.includes('viking'))return'heavy';const cls=card.classe&&card.classe.toLowerCase();if(cls&&ATTACK_FX_BY_CLASS[cls])return ATTACK_FX_BY_CLASS[cls];return'attack';}
function attackCard(attacker,target){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;const fx=detectAttackFx(attacker);const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;sfx('attack',sfxVariant);const a=nodeById(attacker.id),t=nodeById(target.id);if(a&&t){const ar=a.getBoundingClientRect(),tr=t.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,15)}animateAttack(attacker.id,target.id);if(target.stance==='defense')animateDefense(target.id);particleOnCard(target.id,fx||'attack');const pre=target.hp,overflow=Math.max(0,attacker.atk-pre);damageMinion(target,attacker.atk);damageMinion(attacker,target.atk);const targetDied=target.hp<=0;sfx('hit');if(overflow>0&&target.hp<=0){const isP=G.playerBoard.includes(attacker);sfx('overflow');const faceFx=fx||'attack';if(isP){G.aiHP=clamp(G.aiHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`);particleOnFace('ai',faceFx)}else{G.playerHP=clamp(G.playerHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`);particleOnFace('player',faceFx)}checkWin()}if(targetDied){applyKillRewards(attacker,target);}attacker.canAttack=false;log(`${attacker.name} atacou ${target.name}.`);checkDeaths();renderAll();if(window.isMultiplayer&&G.current==='player'){NET.sendMove({type:'attack',attackerId:attacker.id,targetId:target.id})}G.chosen=null;updateTargetingUI();els.aBoard.classList.remove('face-can-attack')}
function attackFace(attacker,face){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;const fx=detectAttackFx(attacker);const sfxVariant=ATTACK_SFX_VARIANT[fx]||ATTACK_SFX_VARIANT.attack;sfx('attack',sfxVariant);const a=nodeById(attacker.id);if(a){const ar=a.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,10)}animateAttack(attacker.id,null);particleOnFace(face,fx||'attack');const dmg=attacker.atk;attacker.canAttack=false;if(face==='ai'){G.aiHP=clamp(G.aiHP-dmg,0,99);log(`${attacker.name} causou ${dmg} ao Inimigo!`);sfx('crit')}else{G.playerHP=clamp(G.playerHP-dmg,0,99);log(`${attacker.name} causou ${dmg} a Você!`);sfx('hit')}checkWin();if(window.isMultiplayer&&G.current==='player'){NET.sendMove({type:'attackFace',attackerId:attacker.id})}G.chosen=null;updateTargetingUI();els.aBoard.classList.remove('face-can-attack');renderAll()}
function damageMinion(m,amt){if(!m||typeof amt!=='number')return;m.hp=clamp(m.hp-amt,0,99);if(m.hp<=0) setTimeout(checkDeaths,10)}
function checkDeaths(){const deadA=G.aiBoard.filter(c=>c.hp<=0);deadA.forEach(c=>{particleOnCard(c.id,'explosion');resetCardState(c);});if(deadA.length){G.aiBoard=G.aiBoard.filter(c=>c.hp>0);G.aiDiscard.push(...deadA);log('Uma criatura inimiga caiu.')}const deadP=G.playerBoard.filter(c=>c.hp<=0);deadP.forEach(c=>{particleOnCard(c.id,'explosion');resetCardState(c);});if(deadP.length){G.playerBoard=G.playerBoard.filter(c=>c.hp>0);G.playerDiscard.push(...deadP);log('Sua criatura caiu.')}els.discardCount.textContent=G.playerDiscard.length}
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
function endGame(win){stopMenuMusic();els.endMsg.textContent=win?'You WIN!':'You Lose...';els.endMsg.style.color=win?'#8bf5a2':'#ff8a8a';els.endSub.textContent=win?'Parabéns! Quer continuar jogando?':'Tentar de novo ou voltar ao menu.';els.endOverlay.classList.add('show');setTimeout(()=>fireworks(win),1000);} 
function checkWin(){
  if(G.aiHP<=0){
    if(G.mode==='story'&&G.story){
      const {leveled,rewards,goldGain}=G.story.handleVictory();
      log(`Recompensas disponíveis: ${rewards.join(', ')}`);
      log(`Você ganhou ${goldGain} ouro.`);
      if(leveled) log(`Você alcançou o nível ${G.story.level}!`);
      const proceed=()=>encounterTransition(()=>startGame({continueStory:true}));
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
            if(state.purchased&&state.purchased.length){
              state.purchased.forEach(item=>{
                if(item&&item.bonus){
                  try{
                    const note = G.story.registerBonus(item.bonus,item);
                    if(note){ log(`Campanha: ${item.name} concedeu ${note}.`); }
                  }catch(err){ console.error('register bonus',err); }
                }
              });
            }
          }
          proceed();
        }
      });
      return;
    }
    endGame(true);
  }
  if(G.playerHP<=0){endGame(false);}
}
function allCards(){let out=[];for(const k of Object.keys(TEMPLATES)){for(const raw of TEMPLATES[k]){const c=makeCard(raw);c.deck=k;out.push(c)}}return out}
function renderEncy(filter='all',locked=false){els.encyGrid.innerHTML='';const cards=(filter==='all'?allCards():TEMPLATES[filter].map(makeCard).map(c=>Object.assign(c,{deck:filter})));cards.forEach(c=>{const d=cardNode(c,'player');d.classList.add('ency-card');tiltify(d);els.encyGrid.appendChild(d)});els.ency.classList.add('show');els.encyFilters.style.display=locked?'none':'flex';$$('.filters .fbtn').forEach(b=>b.classList.toggle('active',b.dataset.deck===filter||filter==='all'&&b.dataset.deck==='all'))}
els.endBtn.addEventListener('click',endTurn);els.muteBtn.addEventListener('click',()=>{initAudio();ensureRunning();allMuted=!allMuted;musicMuted=allMuted;sfxMuted=allMuted;if(master) master.gain.value=allMuted?0:sfxVolume; if(musicGain) musicGain.gain.value=allMuted?0:musicBase*musicVolume; els.muteBtn.textContent=allMuted?'🔇 Som':'🔊 Som'});window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(G.chosen){cancelTargeting();return}if(!els.gameMenu)return;const t=els.gameMenu.classList.contains('show');t?els.gameMenu.classList.remove('show'):(els.gameMenu.classList.add('show'),els.restartBtn&&(els.restartBtn.style.display=window.isMultiplayer?'none':'block'))});document.addEventListener('click',e=>{if(!G.chosen)return;if(e.target.closest('#aiBoard .card.selectable')||e.target.closest('#playerBoard .card.selectable')||e.target.closest('#aiBoard .face-attack-btn'))return;cancelTargeting()},{capture:true});
function confirmExit(){return G.mode==='story'?confirm('Progresso da história será perdido. Continuar?'):confirm('Tem certeza?');}
if(els.openMenuBtn)els.openMenuBtn.addEventListener('click',()=>{els.gameMenu.classList.add('show');els.restartBtn&&(els.restartBtn.style.display=window.isMultiplayer?'none':'block')});
if(els.closeMenuBtn)els.closeMenuBtn.addEventListener('click',()=>{els.gameMenu.classList.remove('show')});
if(els.mainMenuBtn)els.mainMenuBtn.addEventListener('click',()=>{if(!confirmExit())return;els.gameMenu.classList.remove('show');const title=document.getElementById('titleMenu');const deck=document.getElementById('start');if(title)title.style.display='flex';if(deck)deck.style.display='none';applyBattleTheme(null);els.wrap.style.display='none';startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
if(els.restartBtn)els.restartBtn.addEventListener('click',()=>{if(window.isMultiplayer)return;if(!confirmExit())return;els.gameMenu.classList.remove('show');startGame()});
if(els.resignBtn)els.resignBtn.addEventListener('click',()=>{if(!confirmExit())return;els.gameMenu.classList.remove('show');if(window.isMultiplayer&&window.NET){NET.resign();}endGame(false)});
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
    const book=btn.querySelector('.view-cards');
    book&&book.addEventListener('click',ev=>{
      ev.stopPropagation();
      renderEncy(btn.dataset.deck,true);
    });
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
if(els.saveDeck)els.saveDeck.addEventListener('click',()=>{if(G.customDeck&&G.customDeck.length){els.deckBuilder.style.display='none';els.startGame.disabled=false;}});
els.startGame.addEventListener('click',()=>{if(els.startGame.disabled)return;if(window.isMultiplayer){if(window.mpState==='readyStart'){NET.startReady();window.mpState='waitingStart';els.startGame.textContent='Aguardando oponente iniciar...';els.startGame.disabled=true}else if(!window.mpState){NET.deckChoice(G.playerDeckChoice);if(window.opponentConfirmed){window.mpState='readyStart';els.startGame.textContent='Iniciar';els.startGame.disabled=false}else{window.mpState='waitingDeck';els.startGame.textContent='Aguardando oponente confirmar deck...';els.startGame.disabled=true}}}else{els.start.style.display='none';els.wrap.style.display='block';initAudio();ensureRunning();stopMenuMusic();startGame()}});
els.openEncy.addEventListener('click',()=>renderEncy('all',false));els.closeEncy.addEventListener('click',()=>{els.ency.classList.remove('show')});$$('.filters .fbtn').forEach(b=>b.addEventListener('click',()=>{renderEncy(b.dataset.deck,false)}));
els.playAgainBtn.addEventListener('click',()=>{if(!confirmExit())return;if(window.isMultiplayer){showMultiplayerDeckSelect();els.endOverlay.classList.remove('show');}else{els.endOverlay.classList.remove('show');startGame()}});els.rematchBtn.addEventListener('click',()=>{if(!confirmExit())return;if(window.isMultiplayer&&window.NET){NET.requestRematch();els.rematchBtn.disabled=true;els.endSub.textContent='Aguardando oponente';}else{els.endOverlay.classList.remove('show');startGame()}});els.menuBtn.addEventListener('click',()=>{if(!confirmExit())return;els.endOverlay.classList.remove('show');applyBattleTheme(null);els.start.style.display='flex';els.wrap.style.display='none';startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
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
NET.onRematch(()=>{showMultiplayerDeckSelect();els.endOverlay.classList.remove('show')});
}
document.addEventListener('DOMContentLoaded',tryStartMenuMusicImmediate);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tryStartMenuMusicImmediate()});

// --- Overrides & helpers (appended) ---
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
  G.playerBoard.forEach(u=>{u.atk=(u.baseAtk!==undefined?u.baseAtk:u.atk);u.hp=(u.baseHp!==undefined?u.baseHp:u.hp);u.baseAtk=u.atk;u.baseHp=u.hp});
  const cnt=Math.min(3,G.playerBoard.length);
  const picks=shuffle(G.playerBoard.slice()).slice(0,cnt);
  const fx = (t.buffs&&t.buffs.atk)&&(t.buffs&&t.buffs.hp) ? 'magic' : (t.buffs&&t.buffs.atk) ? 'attack' : 'healing';
  const storyBonus = (G.mode==='story'&&G.story&&G.story.bonuses&&G.story.bonuses.totemBonus)?G.story.bonuses.totemBonus:null;
  picks.forEach(u=>{
    if(t.buffs&&t.buffs.atk)u.atk+=t.buffs.atk;
    if(t.buffs&&t.buffs.hp)u.hp+=t.buffs.hp;
    if(storyBonus){
      if(storyBonus.atk) u.atk+=storyBonus.atk;
      if(storyBonus.hp) u.hp+=storyBonus.hp;
    }
    try{ particleOnCard(u.id, fx); }catch(_){ }
    if(t.buffs&&t.buffs.atk){ try{ fxTextOnCard(u.id, `+${t.buffs.atk} ATK`,'buff'); }catch(_){ } }
    if(t.buffs&&t.buffs.hp){ try{ fxTextOnCard(u.id, `+${t.buffs.hp} HP`,'buff'); }catch(_){ } }
    if(storyBonus){
      try{
        if(storyBonus.atk){ fxTextOnCard(u.id, `+${storyBonus.atk} ATK`,'buff'); }
        if(storyBonus.hp){ fxTextOnCard(u.id, `+${storyBonus.hp} HP`,'buff'); }
      }catch(_){ }
    }
  });
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
  const t={name:c.name,buffs:c.buffs||{atk:1,hp:1},icon:c.icon}; t.icon = totemIcon(t); t.desc = describeTotem(c); const theme=getTotemTheme(t); t.theme=theme;
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
  const t={name:c.name,buffs:c.buffs||{atk:1,hp:1},icon:c.icon}; t.icon = totemIcon(t); t.desc = describeTotem(c); const theme=getTotemTheme(t); t.theme=theme;
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
