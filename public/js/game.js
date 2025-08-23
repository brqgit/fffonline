(function(){const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));const logBox=$('#log');const log=t=>{if(!logBox)return;const d=document.createElement('div');d.textContent=t;logBox.prepend(d)};const rand=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),uid=()=>(Math.random().toString(36).slice(2));
const AudioCtx=window.AudioContext||window.webkitAudioContext;let actx=null,master=null,musicGain=null,musicLoopId=null,musicOn=false,musicPreset='menu',musicMuted=false,sfxMuted=false,musicVolume=1,sfxVolume=1,musicBase=.18,allMuted=false;function initAudio(){if(!AudioCtx)return;if(!actx){actx=new AudioCtx();master=actx.createGain();master.gain.value=.18*sfxVolume;master.connect(actx.destination)}}function ensureRunning(){if(actx&&actx.state==='suspended')actx.resume()}function tone(f=440,d=.1,t='sine',v=1,w=0){if(!actx||sfxMuted)return;ensureRunning();const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.setValueAtTime(f,actx.currentTime+w);g.gain.setValueAtTime(.0001,actx.currentTime+w);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v)*sfxVolume,actx.currentTime+w+.01);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+w+d);o.connect(g);g.connect(master);o.start(actx.currentTime+w);o.stop(actx.currentTime+w+d+.02)}function sfx(n){if(!actx||sfxMuted)return;({start:()=>{tone(520,.08,'triangle',.7,0);tone(780,.09,'triangle',.6,.08)},play:()=>{tone(420,.07,'sine',.7,0);tone(560,.08,'sine',.6,.06)},defense:()=>{tone(280,.09,'square',.6,0);tone(200,.12,'sine',.5,.08)},attack:()=>{tone(300,.06,'sawtooth',.7,0);tone(220,.06,'sawtooth',.6,.05)},hit:()=>{tone(160,.07,'square',.6,0)},overflow:()=>{tone(600,.1,'triangle',.6,0)},death:()=>{tone(420,.08,'sawtooth',.6,0);tone(260,.12,'sawtooth',.55,.06)},end:()=>{tone(600,.06,'triangle',.6,0);tone(400,.06,'triangle',.5,.05)},crit:()=>{tone(120,.08,'square',.75,0);tone(90,.12,'square',.7,.06)},error:()=>{tone(140,.05,'square',.6,0);tone(140,.05,'square',.6,.06)}}[n]||(()=>{}))()}
function setSrcFallback(el,urls){const tryNext=()=>{if(!urls.length)return;const u=urls.shift();el.onerror=tryNext;el.src=u;};tryNext();}
// --- MENU MUSIC (procedural, deck-themed) ---
const MUSIC={menu:{bpm:84,leadBase:196,bassBase:98,leadWave:'triangle',bassWave:'sine',scale:[0,3,5,7,5,3,0,-5]},vikings:{bpm:76,leadBase:174.61,bassBase:87.31,leadWave:'sawtooth',bassWave:'sine',scale:[0,3,5,7,10,7,5,3]},animais:{bpm:90,leadBase:220,bassBase:110,leadWave:'square',bassWave:'sine',scale:[0,2,5,7,9,7,5,2]},pescadores:{bpm:96,leadBase:196,bassBase:98,leadWave:'triangle',bassWave:'triangle',scale:[0,2,4,7,9,7,4,2]},floresta:{bpm:68,leadBase:207.65,bassBase:103.83,leadWave:'sine',bassWave:'sine',scale:[0,3,5,10,5,3,0,-2]},combat:{bpm:118,leadBase:220,bassBase:110,leadWave:'sawtooth',bassWave:'square',scale:[0,2,3,5,7,8,7,5],perc:true,ac:4}};
function startMenuMusic(preset){if(!AudioCtx||musicMuted)return;initAudio();ensureRunning();if(preset&&preset!==musicPreset&&musicOn){stopMenuMusic()}musicPreset=preset||musicPreset||'menu';if(musicOn)return;musicOn=true;const P=MUSIC[musicPreset]||MUSIC.menu;musicGain=actx.createGain();musicGain.gain.value=.0001;musicGain.connect(master);musicBase=musicPreset==='combat'?.22:.18;musicGain.gain.exponentialRampToValueAtTime(musicBase*musicVolume,actx.currentTime+.4);const beat=60/P.bpm,steps=P.scale.length;const schedule=()=>{if(!musicOn||!musicGain) return; let t=actx.currentTime;for(let i=0;i<steps;i++){const f=P.leadBase*Math.pow(2,P.scale[i]/12),o=actx.createOscillator(),g=actx.createGain();o.type=P.leadWave;o.frequency.setValueAtTime(f,t+i*beat);g.gain.setValueAtTime(.0001,t+i*beat);g.gain.exponentialRampToValueAtTime((musicPreset==='combat'?.13:.11)*musicVolume,t+i*beat+.01);g.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.92);o.connect(g);g.connect(musicGain);o.start(t+i*beat);o.stop(t+i*beat+beat)}for(let i=0;i<steps;i+=2){const o=actx.createOscillator(),g=actx.createGain();o.type=P.bassWave;o.frequency.setValueAtTime(P.bassBase,t+i*beat);g.gain.setValueAtTime(.0001,t+i*beat);g.gain.exponentialRampToValueAtTime((musicPreset==='combat'?.1:.09)*musicVolume,t+i*beat+.01);g.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.96);o.connect(g);g.connect(musicGain);o.start(t+i*beat);o.stop(t+i*beat+beat)}if(P.perc){for(let i=0;i<steps;i++){const h=actx.createOscillator(),hg=actx.createGain();h.type='square';h.frequency.setValueAtTime(1600,t+i*beat);hg.gain.setValueAtTime(.0001,t+i*beat);hg.gain.exponentialRampToValueAtTime(.07*musicVolume,t+i*beat+.005);hg.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.2);h.connect(hg);hg.connect(musicGain);h.start(t+i*beat);h.stop(t+i*beat+beat*.2);if(P.ac&&i%P.ac===0){const k=actx.createOscillator(),kg=actx.createGain();k.type='sine';k.frequency.setValueAtTime(120,t+i*beat);kg.gain.setValueAtTime(.0001,t+i*beat);kg.gain.exponentialRampToValueAtTime(.12*musicVolume,t+i*beat+.01);kg.gain.exponentialRampToValueAtTime(.0001,t+i*beat+beat*.3);k.connect(kg);kg.connect(musicGain);k.start(t+i*beat);k.stop(t+i*beat+beat*.3)}}}};schedule();const loopMs=beat*steps*1000;musicLoopId=setInterval(schedule,loopMs-25)}
function stopMenuMusic(){if(!musicOn)return;musicOn=false;if(musicLoopId){clearInterval(musicLoopId);musicLoopId=null}if(musicGain){try{musicGain.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.25)}catch(e){}setTimeout(()=>{try{musicGain.disconnect()}catch(e){}musicGain=null},300)}}
function tryStartMenuMusicImmediate(){if(!AudioCtx)return;initAudio();try{ensureRunning()}catch(e){}try{startMenuMusic('menu')}catch(e){}if(actx&&actx.state!=='running'){try{actx.resume().then(()=>startMenuMusic('menu')).catch(()=>{})}catch(e){}}if(!musicOn){let tries=0;const t=setInterval(()=>{tries++;if(musicOn||tries>8){clearInterval(t);return}try{initAudio();ensureRunning();startMenuMusic('menu')}catch(e){}},800)}}

function setMusicVolume(v){musicVolume=clamp(v,0,1);if(musicGain)musicGain.gain.value=musicMuted?0:musicBase*musicVolume}
function setSfxVolume(v){sfxVolume=clamp(v,0,1);if(master)master.gain.value=sfxMuted?0:.18*sfxVolume}
window.setMusicVolume=setMusicVolume;
window.setSfxVolume=setSfxVolume;

const KW={P:'Protetor',F:'Furioso'},
      KW_TIPS={Protetor:'Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mirá-los.',Furioso:'Pode atacar no turno em que é jogada.'},
      BC={D1:'draw1',H2:'heal2',P1:'ping1',BR1:'buffRandom1',BA1:'buffAlliesAtk1',M1:'mana1',SM:'sacMana'},
      BC_NAMES={draw1:'Percepção',heal2:'Cura',ping1:'Golpe',buffRandom1:'Benção',buffAlliesAtk1:'Comando',mana1:'Canalizar',sacMana:'Sacrifício'},
      BC_TIPS={draw1:'Compra 1 carta ao entrar',heal2:'Cura 2 de um aliado ao entrar',ping1:'Causa 1 de dano aleatório ao entrar',buffRandom1:'Concede +1/+1 a um aliado aleatório ao entrar',buffAlliesAtk1:'Aliados ganham +1 ATK',mana1:'Ganha 1 de mana ao entrar',sacMana:'Sacrifica um aliado e ganha mana igual ao custo'};
const normalizeCardName=f=>f.replace(/\.[^.]+$/,'').replace(/^\d+[_-]?/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const makeCard=a=>{const[n,e,t,atk,hp,cost,tx,k=0,b=0,i]=a;let name=n;if(!name&&typeof i==='string')name=normalizeCardName(i);return{name,emoji:e,tribe:t,atk,hp,cost,text:tx,kw:k?k.split('|').map(x=>KW[x]):[],battlecry:b?BC[b]:void 0,icon:i,id:uid()}};
const DECK_IMAGES={
  vikings:['1_Guerreiro_Loiro','2_Guerreiro_Esqueleto','3_Guerreiro_Rubro','4_Mago_Elder','5_Raider_Mascara','6_Guerreiro_Machado','7_Sombras_Encapuzado','8_Guerreiro_Espada','9_Raider_Mascara_Sombra','10_Mago_Elder_Sombra'],
  pescadores:['1_Fogueira_Viking','2_Mistico_Encapuzado','3_Drakkar','4_Guerreiro_do_Escudo','5_Estandarte_do_Cla','6_Guerreiro_das_Runas','7_Guardiao_do_Machado','8_Batalhador_Duplo','9_Navegador','10_Batalhador'],
  floresta:['Alce_Espiritual','Bode_Sagrado','Coruja_Guardiao','Coruja_Runica','Corvo_de_Odin','Esquilo_Ratatoskr','Fogueira_Sagrada','Lobo_Fenrir','Serpente_Jormungandr'],
  animais:['nb-alce-bravo','nb-coelho-escudeiro','nb-coruja-ancia','nb-coruja-sabia','nb-esquilo-viking','nb-guerreiro-cervo','nb-morcego-noturno','nb-raposa-espadachim','nb-urso-guardiao']
};
function deriveStatsFromName(name){const n=name.toLowerCase();let atk=3,hp=3,kw='',bc='',text='';if(/guard/i.test(n)){atk=2;hp=5;kw='P';text='Protetor'}else if(/mago|mistico/.test(n)){atk=2;hp=3;bc='H2';text='Entra: cura 2'}else if(/guerreiro|batalhador|raider|lobo|raposa/.test(n)){atk=4;hp=2;kw='F';text='Furioso'}else if(/fogueira|estandarte/.test(n)){atk=1;hp=1;bc='BR1';text='Entra: +1/+1 aleatório'}else if(/coruja/.test(n)){atk=1;hp=2;bc='D1';text='Entra: compre 1'}else if(/serpente/.test(n)){atk=5;hp=4}else if(/alce|urso|bode|cervo/.test(n)){atk=4;hp=5;kw='P';text='Protetor'}return{atk,hp,kw,bc,text};}
function buildDeck(key){const tribe=key==='vikings'||key==='pescadores'?'Viking':'Animal';return (DECK_IMAGES[key]||[]).map(fn=>{const name=normalizeCardName(fn);const s=deriveStatsFromName(fn);const cost=Math.max(1,Math.round((s.atk+s.hp)/2));return [name,'',tribe,s.atk,s.hp,cost,s.text,s.kw,s.bc,fn];});}
const TEMPLATES={vikings:buildDeck('vikings'),animais:buildDeck('animais'),pescadores:buildDeck('pescadores'),floresta:buildDeck('floresta')};
const HUMAN=['vikings','pescadores'],BEAST=['animais','floresta'];
const G={playerHP:30,aiHP:30,turn:0,playerMana:0,playerManaCap:0,aiMana:0,aiManaCap:0,current:'player',playerDeck:[],aiDeck:[],playerHand:[],aiHand:[],playerBoard:[],aiBoard:[],playerDiscard:[],aiDiscard:[],chosen:null,playerDeckChoice:'vikings',aiDeckChoice:'animais',customDeck:null};
const els={pHP:$('#playerHP'),pHP2:$('#playerHP2'),aHP:$('#aiHP'),aHP2:$('#aiHP2'),opponentLabel:$('#opponentLabel'),mana:$('#mana'),pHand:$('#playerHand'),pBoard:$('#playerBoard'),aBoard:$('#aiBoard'),endBtn:$('#endTurnBtn'),muteBtn:$('#muteBtn'),aAva:$('#aiAvatar'),drawCount:$('#drawCount'),discardCount:$('#discardCount'),barPHP:$('#barPlayerHP'),barAHP:$('#barAiHP'),barMana:$('#barMana'),wrap:$('#gameWrap'),start:$('#start'),openEncy:$('#openEncy'),ency:$('#ency'),encyGrid:$('#encyGrid'),encyFilters:$('#encyFilters'),closeEncy:$('#closeEncy'),startGame:$('#startGame'),endOverlay:$('#endOverlay'),endMsg:$('#endMsg'),endSub:$('#endSub'),playAgainBtn:$('#playAgainBtn'),rematchBtn:$('#rematchBtn'),menuBtn:$('#menuBtn'),openMenuBtn:$('#openMenuBtn'),gameMenu:$('#gameMenu'),closeMenuBtn:$('#closeMenuBtn'),resignBtn:$('#resignBtn'),restartBtn:$('#restartBtn'),mainMenuBtn:$('#mainMenuBtn'),turnIndicator:$('#turnIndicator'),emojiBar:$('#emojiBar'),playerEmoji:$('#playerEmoji'),opponentEmoji:$('#opponentEmoji'),deckBuilder:$('#deckBuilder'),saveDeck:$('#saveDeck')};
els.startGame.disabled=true;
const DECK_TITLES={vikings:'Fazendeiros Vikings',animais:'Bestas do Norte',pescadores:'Pescadores do Fiorde',floresta:'Feras da Floresta',custom:'Custom'};
const DECK_ASSETS={
  vikings:{folder:'farm-vikings',back:'fv'},
  pescadores:{folder:'fJord-fishers',back:'jf'},
  floresta:{folder:'forest-beasts',back:'fb'},
  animais:{folder:'north-beasts',back:'nb'}
};
const IMG_CACHE={};
function preloadAssets(){
  const list=[];
  for(const [key,info] of Object.entries(DECK_ASSETS)){
    // Preload both deck-back and card-back images
    list.push(`/img/decks/${info.folder}/deck-backs/${info.back}-db-default.webp`);
    list.push(`/img/decks/${info.folder}/card-backs/${info.back}-cb-default.webp`);
    (DECK_IMAGES[key]||[]).forEach(fn=>{
      const base=`/img/decks/${info.folder}/characters/${fn.replace(/\.[^.]+$/,'')}.png`;
      list.push(base);
    });
  }
  list.forEach(src=>{const img=new Image();img.src=src;IMG_CACHE[src]=img;});
}
preloadAssets();
// Return local icon path candidates for decks that provide artwork
function iconUrl(deck,idx){
  const info=DECK_ASSETS[deck];
  if(!info)return null;
  let base;
  if(typeof idx==='string'){
    base=idx.replace(/\.[^.]+$/,'');
  }else{
    base=`char${(idx||0)+1}`;
  }
  return [`/img/decks/${info.folder}/characters/${base}.png`];
}

function setDeckBacks(){
  const apply=(deck,drawId,discId)=>{
    const info=DECK_ASSETS[deck];
    if(!info)return;
    // Use deck-back art for both the draw and discard piles
    const base=`/img/decks/${info.folder}/deck-backs/${info.back}-db-default.webp`;
    const drawImg=document.querySelector(`#${drawId} img`);
    const discImg=document.querySelector(`#${discId} img`);
    drawImg&&setSrcFallback(drawImg,[base]);
    discImg&&setSrcFallback(discImg,[base]);
  };
  apply(G.playerDeckChoice,'drawPile','discardPile');
  apply(G.aiDeckChoice,'aiDrawPile','aiDiscardPile');
}

function determineClass(c){
  const n=c.name.toLowerCase();
  if(n.includes('berserker')) return {name:'Berserker',group:'tank'};
  if(n.includes('guardião do véu')||n.includes('véu')) return {name:'Guardião do Véu',group:'control'};
  if(n.includes('guardião')) return {name:'Guardião',group:'tank'};
  if(n.includes('uivante')) return {name:'Uivante',group:'tank'};
  if(n.includes('caçador')) return {name:'Caçador',group:'dps'};
  if(n.includes('runomante')) return {name:'Runomante',group:'dps'};
  if(n.includes('serpente')) return {name:'Serpente',group:'dps'};
  if(n.includes('curandeir')) return {name:'Curandeiro',group:'support'};
  if(n.includes('totêmico')||n.includes('totemico')) return {name:'Totêmico',group:'support'};
  if(n.includes('sacerdote')||n.includes('tecelão')) return {name:'Tecelão',group:'support'};
  if(n.includes('xamã')) return {name:'Xamã',group:'control'};
  if(n.includes('corvo')) return {name:'Corvo',group:'control'};
  return null;
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

function tiltify(card){card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width*100,my=(e.clientY-r.top)/r.height*100;card.style.setProperty('--mx',mx+'%');card.style.setProperty('--my',my+'%');card.style.setProperty('--rY',((mx-50)/8)+'deg');card.style.setProperty('--rX',(-(my-50)/8)+'deg');card.classList.add('tilted')});card.addEventListener('mouseleave',()=>{card.classList.remove('tilted');card.style.removeProperty('--rX');card.style.removeProperty('--rY')})}
function showPopup(anchor,text){const box=document.createElement('div');box.className='card-popup';box.textContent=text;const r=anchor.getBoundingClientRect();box.style.left=r.left+r.width/2+'px';box.style.top=r.top+'px';document.body.appendChild(box);setTimeout(()=>box.remove(),1200)}
function createProjection(container,card){
  const urls=iconUrl(card.deck,card.icon);
  if(urls){
    const src=urls[0];
    let img;
    if(IMG_CACHE[src]&&IMG_CACHE[src].complete){
      img=IMG_CACHE[src].cloneNode();
    }else{
      img=document.createElement('img');
      setSrcFallback(img,urls.slice());
    }
    img.width=96;img.height=96;
    img.loading='eager';
    container.appendChild(img);
  }else if(card.emoji){
    const c=document.createElement('canvas');
    c.width=96; c.height=96;
    const ctx=c.getContext('2d');
    ctx.font='72px serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(card.emoji,48,60);
    container.appendChild(c);
  }
}
function cardNode(c,owner,onBoard=false){
  const d=document.createElement('div');
  d.className=`card ${owner==='player'?'me':'enemy'} ${c.stance==='defense'?'defense':''}`;
  d.dataset.id=c.id;
  const manaDots=`<span class="mana-dot ${c.deck}"></span>`.repeat(c.cost);
  const kwTags=[];
  (c.kw||[]).forEach(k=>{const tip=KW_TIPS[k]||'';kwTags.push(`<span class='keyword' data-tip='${tip}' title='${tip}'>${k}</span>`)});
  if(c.battlecry){
    const n=BC_NAMES[c.battlecry], tip=BC_TIPS[c.battlecry];
    if(n)kwTags.push(`<span class='keyword' data-tip='${tip}' title='${tip}'>${n}</span>`);
  }
  const cls=determineClass(c);if(cls)kwTags.push(`<span class='class-tag ${cls.group}'>${cls.name}</span>`);
  const text=c.text||'';
  const tip=text&&!kwTags.some(s=>s.includes('>'+text.trim()+'<'))?text:'';
  d.innerHTML=`<div class="bg bg-${c.deck||'default'}"></div>
  <div class="head-bar"><div class="name">${c.name}</div><div class="cost-bar"><div class="mana-row"><span class="mana-num">${c.cost}</span>${manaDots}</div></div></div>
  <div class="art"></div>
  <div class="text" ${tip?`data-tip='${tip}' title='${tip}'`:''}>${kwTags.join(' ')}</div>
  <div class="stats"><span class="gem atk">⚔️ ${c.atk}</span>${c.stance?`<span class=\"stance-label ${c.stance}\">${c.stance==='defense'?'DEFESA':'ATAQUE'}</span>`:''}<span class="gem hp ${c.hp<=2?'low':''}">❤️ ${c.hp}</span></div>`;
  if(!onBoard){
    const art=d.querySelector('.art');
    createProjection(art,c);
  }
  return d;
}
const hasGuard=b=>b.some(x=>x.kw.includes('Protetor')||x.stance==='defense');
function updateMeters(){const pct=(v,max)=>(max>0?Math.max(0,Math.min(100,(v/max)*100)):0);els.barPHP.style.width=pct(G.playerHP,30)+'%';els.barAHP.style.width=pct(G.aiHP,30)+'%';els.barMana.style.width=pct(G.playerMana,G.playerManaCap)+'%'}
function updateOpponentLabel(){if(!els.opponentLabel)return;if(window.isMultiplayer){els.opponentLabel.textContent=window.opponentName?` ${window.opponentName}`:'';}else{const t=DECK_TITLES[G.aiDeckChoice]||'';els.opponentLabel.textContent=t?` ${t}`:'';}}
function renderAll(){els.pHP.textContent=G.playerHP;els.pHP2.textContent=G.playerHP;els.aHP.textContent=G.aiHP;els.aHP2.textContent=G.aiHP;els.mana.textContent=`${G.playerMana}/${G.playerManaCap}`;els.endBtn.disabled=G.current!=='player';els.drawCount.textContent=G.playerDeck.length;els.discardCount.textContent=G.playerDiscard.length;updateMeters();updateOpponentLabel();renderHand();renderBoard()}
function renderHand(){els.pHand.innerHTML='';G.playerHand.forEach(c=>{const d=cardNode(c,'player');tiltify(d);d.classList.add('handcard');d.addEventListener('click',e=>{const blocked=(c.cost>G.playerMana)||G.current!=='player'||G.playerBoard.length>=5;if(blocked){d.style.transform='translateY(-2px)';setTimeout(()=>d.style.transform='',150);sfx('error');return}e.stopPropagation();openStanceChooser(d,st=>flyToBoard(d,()=>playFromHand(c.id,st)))});const cantPay=(c.cost>G.playerMana);const disable=(G.current!=='player'||G.playerBoard.length>=5);d.classList.toggle('blocked',cantPay);d.classList.toggle('playable',!cantPay&&!disable);d.style.cursor=(cantPay||disable)?'not-allowed':'pointer';els.pHand.appendChild(d)});stackHand()}
function renderBoard(){
  validateChosen();
  els.pBoard.innerHTML='';
  for(const c of G.playerBoard){
    const d=cardNode(c,'player',true);
    tiltify(d);
    const art=d.querySelector('.art');
    const p=document.createElement('div');
    p.className='projection';
    art.appendChild(p);
    createProjection(p,c);
    if(G.current==='player'&&c.canAttack&&c.stance!=='defense'){
      d.classList.add('selectable','attackable');
      d.addEventListener('click',()=>selectAttacker(c));
    }else if(G.current==='player'){
      d.addEventListener('click',()=>{const reason=c.stance==='defense'?'Em defesa':(G.turn===c.summonTurn?'Recém jogada':'Já agiu');showPopup(d,reason)});
    }
    els.pBoard.appendChild(d);
  }
  els.aBoard.innerHTML='';
  for(const c of G.aiBoard){
    const d=cardNode(c,'ai',true);
    tiltify(d);
    const art=d.querySelector('.art');
    const p=document.createElement('div');
    p.className='projection';
    art.appendChild(p);
    createProjection(p,c);
    if(G.chosen && legalTarget('ai',c)){
      d.classList.add('selectable');
      d.addEventListener('click',()=>attackCard(G.chosen,c));
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
function openStanceChooser(anchor,cb){
  closeStanceChooser();
  anchor.classList.add('chosen');
  const box=document.createElement('div');
  box.className='stance-chooser';
  const bA=document.createElement('button');bA.className='btn';bA.textContent='⚔️ Ataque';
  const bD=document.createElement('button');bD.className='btn';bD.textContent='🛡️ Defesa';
  bA.onclick=()=>{anchor.classList.remove('chosen');closeStanceChooser();cb('attack')};
  bD.onclick=()=>{anchor.classList.remove('chosen');closeStanceChooser();cb('defense')};
  box.append(bA,bD);
  anchor.appendChild(box);
  Object.assign(box.style,{position:'absolute',left:'50%',bottom:'100%',transform:'translate(-50%,-8px)'});
  setTimeout(()=>{
    const h=ev=>{if(ev.target.closest('.stance-chooser')||ev.target===anchor)return;window.removeEventListener('click',h,true);anchor.classList.remove('chosen');closeStanceChooser()};
    window.addEventListener('click',h,true);
    bA.focus();
  },0)
}
const closeStanceChooser=()=>{const old=document.querySelector('.stance-chooser');if(old)old.remove();document.querySelectorAll('.hand .card.chosen').forEach(c=>c.classList.remove('chosen'))}
function flyToBoard(node,onEnd){const r=node.getBoundingClientRect(),clone=node.cloneNode(true);Object.assign(clone.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',position:'fixed',zIndex:999,transition:'transform .45s ease,opacity .45s ease'});clone.classList.add('fly');document.body.appendChild(clone);const br=els.pBoard.getBoundingClientRect();requestAnimationFrame(()=>{const tx=br.left+br.width/2-r.left-r.width/2,ty=br.top+10-r.top;clone.style.transform=`translate(${tx}px,${ty}px) scale(.9)`;clone.style.opacity='0'});setTimeout(()=>{clone.remove();onEnd&&onEnd()},450)}
function animateMove(fromEl,toEl){const r1=fromEl.getBoundingClientRect(),r2=toEl.getBoundingClientRect(),ghost=document.createElement('div');Object.assign(ghost.style,{left:r1.left+'px',top:r1.top+'px',width:r1.width+'px',height:r1.height+'px',position:'fixed',zIndex:998,transition:'transform .5s ease,opacity .5s ease',background:'#fff',borderRadius:'10px',opacity:1});document.body.appendChild(ghost);requestAnimationFrame(()=>{ghost.style.transform=`translate(${r2.left-r1.left}px,${r2.top-r1.top}px)`;ghost.style.opacity='0'});setTimeout(()=>ghost.remove(),500)}
function stackHand(){const cards=$$('#playerHand .card');const total=cards.length;if(!total)return;const spread=Math.min(60,120/Math.max(total-1,1));cards.forEach((c,i)=>{const offset=(i-(total-1)/2)*spread;c.style.left=`calc(50% + ${offset}px - 88px)`;c.style.zIndex=i+1;c.style.setProperty('--rot',offset/5);c.onmouseenter=()=>c.style.zIndex=1000;c.onmouseleave=()=>c.style.zIndex=i+1;})}
function startGame(first='player'){const sanitize=c=>{if(c.hp<1)c.hp=1;if(c.atk<0)c.atk=0;return c};G.playerDeck=(G.playerDeckChoice==='custom'&&G.customDeck?shuffle(G.customDeck.slice()):TEMPLATES[G.playerDeckChoice].map(makeCard));G.playerDeck.forEach(c=>{sanitize(c);c.owner='player';c.deck=(G.playerDeckChoice==='custom'?'custom':G.playerDeckChoice)});G.aiDeck=TEMPLATES[G.aiDeckChoice].map(makeCard);G.aiDeck.forEach(c=>{sanitize(c);c.owner='ai';c.deck=G.aiDeckChoice});G.playerDiscard=[];G.aiDiscard=[];G.playerHand=[];G.aiHand=[];G.playerBoard=[];G.aiBoard=[];G.playerHP=30;G.aiHP=30;G.current=first;G.playerMana=0;G.playerManaCap=0;G.turn=0;if(!window.isMultiplayer){const diff=document.getElementById('difficulty');G.aiSkill=diff?parseInt(diff.value):1;}els.emojiBar&&(els.emojiBar.style.display=window.isMultiplayer?'flex':'none');setDeckBacks();if(first==='player')draw('player',5);else draw('ai',5);newTurn(true);renderAll();stopMenuMusic();startMenuMusic('combat');log('A batalha começou!');sfx('start')}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function draw(who,n=1){const deck=who==='player'?G.playerDeck:G.aiDeck,hand=who==='player'?G.playerHand:G.aiHand,disc=who==='player'?G.playerDiscard:G.aiDiscard;const deckEl=document.getElementById('drawPile');const handEl=els.pHand;for(let i=0;i<n;i++){if(deck.length===0&&disc.length){deck.push(...shuffle(disc.splice(0)));deckEl.classList.add('shuffling');setTimeout(()=>deckEl.classList.remove('shuffling'),600)}if(deck.length){const c=deck.shift();if(c.hp<1)c.hp=1;hand.push(c);if(who==='player')animateMove(deckEl,handEl)}}if(who==='player'){els.drawCount.textContent=G.playerDeck.length;els.discardCount.textContent=G.playerDiscard.length;setTimeout(stackHand,500)}}
function discardHand(side){const hand=side==='player'?G.playerHand:G.aiHand;const disc=side==='player'?G.playerDiscard:G.aiDiscard;if(hand.length){if(side==='player'){const cards=$$('#playerHand .card');const pile=document.getElementById('discardPile');cards.forEach(c=>animateMove(c,pile))}disc.push(...hand.splice(0));if(side==='player'){els.discardCount.textContent=G.playerDiscard.length;setTimeout(stackHand,500)}}}
function showMultiplayerDeckSelect(){
  els.wrap.style.display='none';
  els.start.style.display='grid';
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
function newTurn(skipDraw=false){G.turn++;if(G.current==='player'){if(!skipDraw){if(G.playerDeck.length<=4){G.playerDeck.push(...shuffle(G.playerDiscard.splice(0)))}draw('player',5)}G.playerManaCap=clamp(G.playerManaCap+1,0,10);G.playerMana=G.playerManaCap;G.playerBoard.forEach(c=>c.canAttack=true)}else{if(!skipDraw){if(G.aiDeck.length<=4){G.aiDeck.push(...shuffle(G.aiDiscard.splice(0)))}draw('ai',5)}G.aiManaCap=clamp(G.aiManaCap+1,0,10);G.aiMana=G.aiManaCap;G.aiBoard.forEach(c=>c.canAttack=true)}renderAll();showTurnIndicator()}
function endTurn(){if(G.current!=='player')return;discardHand('player');G.current='ai';G.chosen=null;updateTargetingUI();newTurn();sfx('end');if(window.isMultiplayer){NET.sendTurn('end')}else{setTimeout(aiTurn,500)}}
function playFromHand(id,st){if(G.current!=='player')return;const i=G.playerHand.findIndex(c=>c.id===id);if(i<0)return;const c=G.playerHand[i];if(c.cost>G.playerMana||G.playerBoard.length>=5)return;G.playerHand.splice(i,1);summon('player',c,st);G.playerMana-=c.cost;renderAll();sfx(st==='defense'?'defense':'play')}
function summon(side,c,st='attack',skipBC=false){const board=side==='player'?G.playerBoard:G.aiBoard;c.stance=st;c.canAttack=(st==='attack')&&c.kw.includes('Furioso');c.summonTurn=G.turn;board.push(c);log(`${side==='player'?'Você':'Inimigo'} jogou ${c.name} em modo ${st==='defense'?'defesa':'ataque'}.`);let effects=[];if(!skipBC){effects=triggerBattlecry(side,c);if(window.isMultiplayer&&side==='player'){NET.sendMove({type:'summon',card:c,stance:st,effects})}}if(st==='defense')setTimeout(()=>animateDefense(c.id),30);return effects}
function triggerBattlecry(side,c){const foe=side==='player'?'ai':'player';const effects=[];switch(c.battlecry){case 'draw1':draw(side,1);log(`${c.name}: comprou 1 carta.`);effects.push({type:'draw'});break;case 'heal2':{const allies=(side==='player'?G.playerBoard:G.aiBoard);if(allies.length){const t=rand(allies);t.hp=Math.min(t.hp+2,20);fxTextOnCard(t.id,'+2','heal');log(`${c.name}: curou 2 em ${t.name}.`);effects.push({type:'heal',targetId:t.id,amount:2})}}break;case 'ping1':{const foes=(foe==='ai'?G.aiBoard:G.playerBoard);if(foes.length){const t=rand(foes);damageMinion(t,1);fxTextOnCard(t.id,'-1','dmg');log(`${c.name}: 1 de dano em ${t.name}.`);checkDeaths();renderAll();sfx('hit');effects.push({type:'damage',targetId:t.id,amount:1})}}break;case 'buffRandom1':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);if(allies.length){const t=rand(allies);t.atk+=1;t.hp+=1;fxTextOnCard(t.id,'+1/+1','buff');log(`${c.name}: deu +1/+1 em ${t.name}.`);effects.push({type:'buff',targetId:t.id,atk:1,hp:1})}}break;case 'buffAlliesAtk1':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);allies.forEach(x=>{x.atk+=1;fxTextOnCard(x.id,'+1 ATK','buff');effects.push({type:'buff',targetId:x.id,atk:1,hp:0})});if(allies.length)log(`${c.name}: aliados ganharam +1 de ataque.`)}break;case 'mana1':{if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+1,0,10);G.playerMana=Math.min(G.playerMana+1,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+1,0,10);G.aiMana=Math.min(G.aiMana+1,G.aiManaCap);}log(`${c.name}: ganhou 1 de mana.`);effects.push({type:'mana',amount:1})}break;case 'sacMana':{const allies=(side==='player'?G.playerBoard:G.aiBoard).filter(x=>x.id!==c.id);if(allies.length){const t=rand(allies);const board=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const idx=board.findIndex(x=>x.id===t.id);if(idx>-1){board.splice(idx,1);discard.push(t);}if(side==='player'){G.playerMana=Math.min(G.playerMana+t.cost,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+t.cost,G.aiManaCap);}fxTextOnCard(t.id,'sac','dmg');log(`${c.name}: sacrificou ${t.name} e ganhou ${t.cost} de mana.`);effects.push({type:'sacMana',targetId:t.id,amount:t.cost});checkDeaths();renderAll();}}break;}return effects}
function applyBattlecryEffects(side,effects){effects.forEach(e=>{if(e.type==='heal'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.hp=Math.min(t.hp+e.amount,20);fxTextOnCard(t.id,'+'+e.amount,'heal')}}else if(e.type==='damage'){const foes=side==='player'?G.aiBoard:G.playerBoard;const t=foes.find(x=>x.id===e.targetId);if(t){damageMinion(t,e.amount);fxTextOnCard(t.id,'-'+e.amount,'dmg')}}else if(e.type==='buff'){const allies=side==='player'?G.playerBoard:G.aiBoard;const t=allies.find(x=>x.id===e.targetId);if(t){t.atk+=e.atk;t.hp+=e.hp;fxTextOnCard(t.id,'+'+e.atk+(e.hp?'/'+e.hp:''),'buff')}}else if(e.type==='mana'){if(side==='player'){G.playerManaCap=clamp(G.playerManaCap+e.amount,0,10);G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiManaCap=clamp(G.aiManaCap+e.amount,0,10);G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}else if(e.type==='sacMana'){const allies=side==='player'?G.playerBoard:G.aiBoard;const discard=side==='player'?G.playerDiscard:G.aiDiscard;const t=allies.find(x=>x.id===e.targetId);if(t){allies.splice(allies.indexOf(t),1);discard.push(t);}if(side==='player'){G.playerMana=Math.min(G.playerMana+e.amount,G.playerManaCap);}else{G.aiMana=Math.min(G.aiMana+e.amount,G.aiManaCap);}}});checkDeaths()}
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
function fxTextOnCard(cid,text,cls){const n=document.querySelector(`.card[data-id="${cid}"]`);if(!n)return;const r=n.getBoundingClientRect();const fx=document.createElement('div');fx.className='fx-float '+(cls||'');fx.textContent=text;fx.style.left=(r.left+r.width/2)+'px';fx.style.top=(r.top+r.height/2)+'px';document.body.appendChild(fx);setTimeout(()=>fx.remove(),950);}
function attackCard(attacker,target){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;sfx('attack');const a=nodeById(attacker.id),t=nodeById(target.id);if(a&&t){const ar=a.getBoundingClientRect(),tr=t.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,15)}animateAttack(attacker.id,target.id);if(target.stance==='defense')animateDefense(target.id);const pre=target.hp,overflow=Math.max(0,attacker.atk-pre);damageMinion(target,attacker.atk);damageMinion(attacker,target.atk);sfx('hit');if(overflow>0&&target.hp<=0){const isP=G.playerBoard.includes(attacker);if(isP){G.aiHP=clamp(G.aiHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`)}else{G.playerHP=clamp(G.playerHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`)}checkWin()}attacker.canAttack=false;log(`${attacker.name} atacou ${target.name}.`);checkDeaths();renderAll();if(window.isMultiplayer&&G.current==='player'){NET.sendMove({type:'attack',attackerId:attacker.id,targetId:target.id})}G.chosen=null;updateTargetingUI();els.aBoard.classList.remove('face-can-attack')}
function attackFace(attacker,face){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;sfx('attack');const a=nodeById(attacker.id);if(a){const ar=a.getBoundingClientRect();screenSlash(ar.right,ar.top+ar.height/2,10)}animateAttack(attacker.id,null);const dmg=attacker.atk;attacker.canAttack=false;if(face==='ai'){G.aiHP=clamp(G.aiHP-dmg,0,99);log(`${attacker.name} causou ${dmg} ao Inimigo!`);sfx('crit')}else{G.playerHP=clamp(G.playerHP-dmg,0,99);log(`${attacker.name} causou ${dmg} a Você!`);sfx('hit')}checkWin();if(window.isMultiplayer&&G.current==='player'){NET.sendMove({type:'attackFace',attackerId:attacker.id})}G.chosen=null;updateTargetingUI();els.aBoard.classList.remove('face-can-attack');renderAll()}
function damageMinion(m,amt){if(!m||typeof amt!=='number')return;m.hp=clamp(m.hp-amt,0,99);if(m.hp<=0) setTimeout(checkDeaths,10)}
function checkDeaths(){const deadA=G.aiBoard.filter(c=>c.hp<=0);if(deadA.length){G.aiBoard=G.aiBoard.filter(c=>c.hp>0);G.aiDiscard.push(...deadA);log('Uma criatura inimiga caiu.')}const deadP=G.playerBoard.filter(c=>c.hp<=0);if(deadP.length){G.playerBoard=G.playerBoard.filter(c=>c.hp>0);G.playerDiscard.push(...deadP);log('Sua criatura caiu.')}els.discardCount.textContent=G.playerDiscard.length}
function aiTurn(){const skill=G.aiSkill||1;const playable=G.aiHand.filter(c=>c.cost<=G.aiMana);if(skill===2){playable.sort((a,b)=>(b.atk+b.hp)-(a.atk+a.hp))}else if(skill===1){playable.sort((a,b)=>b.cost-a.cost)}else{playable.sort(()=>Math.random()-0.5)}while(playable.length&&G.aiBoard.length<5&&G.aiMana>0){const c=skill===0?playable.pop():playable.shift();const i=G.aiHand.findIndex(x=>x.id===c.id);if(i>-1&&c.cost<=G.aiMana){G.aiHand.splice(i,1);const stance=(c.hp>=c.atk+1)?(Math.random()<.7?'defense':'attack'):(Math.random()<.3?'defense':'attack');summon('ai',c,stance);G.aiMana-=c.cost}}renderAll();const attackers=G.aiBoard.filter(c=>c.canAttack&&c.stance!=='defense');function next(){if(!attackers.length){discardHand('ai');G.current='player';newTurn();return}const a=attackers.shift();const legal=G.playerBoard.filter(x=>legalTarget('player',x));if(legal.length){let target;if(skill===2){target=legal.reduce((p,c)=>c.hp<p.hp?c:p,legal[0])}else{target=rand(legal)}attackCard(a,target)}else{attackFace(a,'player')}setTimeout(next,500)}setTimeout(next,500)}
function fireworks(win){const b=document.createElement('div');b.className='boom';b.style.left='50%';b.style.top='50%';b.style.background=`radial-gradient(circle at 50% 50%, ${win?'#8bf5a2':'#ff8a8a'}, transparent)`;document.body.appendChild(b);setTimeout(()=>b.remove(),650);} 
function endGame(win){stopMenuMusic();els.endMsg.textContent=win?'You WIN!':'You Lose...';els.endMsg.style.color=win?'#8bf5a2':'#ff8a8a';els.endSub.textContent=win?'Parabéns! Quer continuar jogando?':'Tentar de novo ou voltar ao menu.';els.endOverlay.classList.add('show');setTimeout(()=>fireworks(win),1000);} 
function checkWin(){if(G.aiHP<=0){endGame(true)}if(G.playerHP<=0){endGame(false)}}
function allCards(){let out=[];for(const k of Object.keys(TEMPLATES)){for(const raw of TEMPLATES[k]){const c=makeCard(raw);c.deck=k;out.push(c)}}return out}
function renderEncy(filter='all',locked=false){els.encyGrid.innerHTML='';const cards=(filter==='all'?allCards():TEMPLATES[filter].map(makeCard).map(c=>Object.assign(c,{deck:filter})));cards.forEach(c=>{const d=cardNode(c,'player');d.classList.add('ency-card');tiltify(d);els.encyGrid.appendChild(d)});els.ency.classList.add('show');els.encyFilters.style.display=locked?'none':'flex';$$('.filters .fbtn').forEach(b=>b.classList.toggle('active',b.dataset.deck===filter||filter==='all'&&b.dataset.deck==='all'))}
els.endBtn.addEventListener('click',endTurn);els.muteBtn.addEventListener('click',()=>{initAudio();ensureRunning();allMuted=!allMuted;musicMuted=allMuted;sfxMuted=allMuted;if(master) master.gain.value=allMuted?0:.18*sfxVolume; if(musicGain) musicGain.gain.value=allMuted?0:musicBase*musicVolume; els.muteBtn.textContent=allMuted?'🔇 Som':'🔊 Som'});window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelTargeting()});document.addEventListener('click',e=>{if(!G.chosen)return;if(e.target.closest('#aiBoard .card.selectable')||e.target.closest('#playerBoard .card.selectable')||e.target.closest('#aiBoard .face-attack-btn'))return;cancelTargeting()},{capture:true});
if(els.openMenuBtn)els.openMenuBtn.addEventListener('click',()=>{els.gameMenu.classList.add('show');els.restartBtn&&(els.restartBtn.style.display=window.isMultiplayer?'none':'block')});
if(els.closeMenuBtn)els.closeMenuBtn.addEventListener('click',()=>{els.gameMenu.classList.remove('show')});
if(els.mainMenuBtn)els.mainMenuBtn.addEventListener('click',()=>{els.gameMenu.classList.remove('show');els.start.style.display='grid';els.wrap.style.display='none';startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
if(els.restartBtn)els.restartBtn.addEventListener('click',()=>{if(!window.isMultiplayer){els.gameMenu.classList.remove('show');startGame()}});
if(els.resignBtn)els.resignBtn.addEventListener('click',()=>{els.gameMenu.classList.remove('show');if(window.isMultiplayer&&window.NET){NET.resign();}endGame(false)});
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
        if(HUMAN.includes(pick)){
          G.aiDeckChoice=rand(BEAST);
        } else {
          G.aiDeckChoice=rand(HUMAN);
        }
      }
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
if(document.readyState!=='loading') initDeckButtons();
else document.addEventListener('DOMContentLoaded',initDeckButtons);
if(els.saveDeck)els.saveDeck.addEventListener('click',()=>{if(G.customDeck&&G.customDeck.length){els.deckBuilder.style.display='none';els.startGame.disabled=false;}});
els.startGame.addEventListener('click',()=>{if(els.startGame.disabled)return;if(window.isMultiplayer){if(window.mpState==='readyStart'){NET.startReady();window.mpState='waitingStart';els.startGame.textContent='Aguardando oponente iniciar...';els.startGame.disabled=true}else if(!window.mpState){NET.deckChoice(G.playerDeckChoice);if(window.opponentConfirmed){window.mpState='readyStart';els.startGame.textContent='Iniciar';els.startGame.disabled=false}else{window.mpState='waitingDeck';els.startGame.textContent='Aguardando oponente confirmar deck...';els.startGame.disabled=true}}}else{els.start.style.display='none';els.wrap.style.display='block';initAudio();ensureRunning();stopMenuMusic();startGame()}});
els.openEncy.addEventListener('click',()=>renderEncy('all',false));els.closeEncy.addEventListener('click',()=>{els.ency.classList.remove('show')});$$('.filters .fbtn').forEach(b=>b.addEventListener('click',()=>{renderEncy(b.dataset.deck,false)}));
els.playAgainBtn.addEventListener('click',()=>{if(window.isMultiplayer){showMultiplayerDeckSelect();els.endOverlay.classList.remove('show');}else{els.endOverlay.classList.remove('show');startGame()}});els.rematchBtn.addEventListener('click',()=>{if(window.isMultiplayer&&window.NET){NET.requestRematch();els.rematchBtn.disabled=true;els.endSub.textContent='Aguardando oponente';}else{els.endOverlay.classList.remove('show');startGame()}});els.menuBtn.addEventListener('click',()=>{els.endOverlay.classList.remove('show');els.start.style.display='grid';els.wrap.style.display='none';startMenuMusic('menu');if(window.isMultiplayer&&window.NET){NET.disconnect();}window.isMultiplayer=false;window.mpState=null;const custom=document.querySelector('.deckbtn[data-deck="custom"]');custom&&(custom.style.display='');if(els.startGame){els.startGame.textContent='Jogar';els.startGame.disabled=true;}});
function handleMove(move){switch(move.type){case 'summon':{summon('ai',move.card,move.stance,true);applyBattlecryEffects('ai',move.effects||[]);G.aiMana-=move.card.cost;renderAll();break}case 'attack':{const a=G.aiBoard.find(x=>x.id===move.attackerId);const t=G.playerBoard.find(x=>x.id===move.targetId);if(a&&t)attackCard(a,t);break}case 'attackFace':{const a=G.aiBoard.find(x=>x.id===move.attackerId);if(a)attackFace(a,'player');break}}}
function handleTurn(turn){if(turn==='end'){G.current='player';G.chosen=null;updateTargetingUI();newTurn()}}
if(window.NET){NET.onOpponentDeckConfirmed(d=>{G.aiDeckChoice=d;if(window.mpState==='waitingDeck'){els.startGame.textContent='Iniciar';els.startGame.disabled=false;window.mpState='readyStart'}else{window.opponentConfirmed=true}});NET.onStartGame(()=>{els.start.style.display='none';els.wrap.style.display='block';initAudio();ensureRunning();stopMenuMusic();startGame(NET.isHost()?'player':'ai');window.mpState=null;window.opponentConfirmed=false});NET.onOpponentName(n=>{window.opponentName=n;updateOpponentLabel()})}
if(window.NET){NET.onMove(handleMove);NET.onTurn(handleTurn);NET.onEmoji(e=>showEmoji('opponent',e));NET.onOpponentLeft(()=>{log('Oponente desconectou.');if(window.isMultiplayer&&els.wrap.style.display==='block')endGame(true);});NET.onOpponentResigned(()=>endGame(true));NET.onRematch(()=>{showMultiplayerDeckSelect();els.endOverlay.classList.remove('show')})}
document.addEventListener('DOMContentLoaded',tryStartMenuMusicImmediate);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tryStartMenuMusicImmediate()});
document.addEventListener('pointerdown',()=>{tryStartMenuMusicImmediate()},{once:true});
window.addEventListener('pointerdown',()=>{initAudio();ensureRunning();startMenuMusic('menu')},{once:true});
})();