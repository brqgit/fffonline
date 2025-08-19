(function(){
  const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
  const logBox = $('#log');
  function log(t){const d=document.createElement('div');d.textContent=t;logBox&&logBox.prepend(d)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function uid(){return Math.random().toString(36).slice(2)}

  let RNG=null;
  function setSeed(seed){RNG=typeof seed==='number'?seededRng(seed):null;}
  function rand(){return RNG?RNG():Math.random();}

  // Audio
  const AudioCtx=window.AudioContext||window.webkitAudioContext; let actx=null,master=null,muted=false;
  function initAudio(){ try{ if(!AudioCtx) return; if(!actx){ actx=new AudioCtx(); master=actx.createGain(); master.gain.value=.18; master.connect(actx.destination);} }catch(e){} }
  function ensureRunning(){ if(actx && actx.state==='suspended') actx.resume(); }
  function tone(f=440,d=.1,t='sine',v=1,w=0){
    if(!actx||!master){ initAudio(); if(!actx||!master) return; }
    if(muted) return; ensureRunning();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=t; o.frequency.setValueAtTime(f,actx.currentTime+w);
    g.gain.setValueAtTime(.0001,actx.currentTime+w);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),actx.currentTime+w+.01);
    g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+w+d);
    o.connect(g); g.connect(master); o.start(actx.currentTime+w); o.stop(actx.currentTime+w+d+.02);
  }
  function sfx(n){switch(n){case'start':tone(520,.08,'triangle',.7,0);tone(780,.09,'triangle',.6,.08);break;case'play':tone(420,.07,'sine',.7,0);tone(560,.08,'sine',.6,.06);break;case'defense':tone(280,.09,'square',.6,0);tone(200,.12,'sine',.5,.08);break;case'attack':tone(300,.06,'sawtooth',.7,0);tone(220,.06,'sawtooth',.6,.05);break;case'hit':tone(160,.07,'square',.6,0);break;case'overflow':tone(600,.1,'triangle',.6,0);break;case'death':tone(420,.08,'sawtooth',.6,0);tone(260,.12,'sawtooth',.55,.06);break;case'end':tone(600,.06,'triangle',.6,0);tone(400,.06,'triangle',.5,.05);break;case'crit':tone(120,.08,'square',.75,0);tone(90,.12,'square',.7,.06);break}}

  // Cards
  const K={P:'Protetor',F:'Furioso'}; const B={D1:'draw1',H2:'heal2',P1:'ping1',BR1:'buffRandom1',BA1:'buffAlliesAtk1'};
  function C(a,id){const[n,e,t,atk,hp,cost,tx,k=0,b=0]=a;return{name:n,emoji:e,tribe:t,atk,hp,cost,text:tx,kw:k?k.split('|').map(x=>K[x]):[],battlecry:b?B[b]:undefined,id:id||uid()}}
  const TEMPLATES={
    vikings:[['Lavrador de Lança','🧔‍🌾','Viking',2,2,2,'Disciplinado'],['Camponesa Curandeira','👩‍🌾✨','Viking',2,3,3,'Entra: cura 2','', 'H2'],['Ceifeiro Berserker','👨‍🌾⚔️','Viking',5,2,4,'Furioso','F'],['Escudeiro Rural','🛡️','Viking',0,3,1,'Protetor','P'],['Guardião da Aldeia','🛡️🌾','Viking',3,5,4,'Protetor','P'],['Caçador de Lobos','🏹','Viking',3,2,2,'Entra: dano 1 aleatório','', 'P1'],['Ferreiro Rural','🔨','Viking',4,6,5,'Entra: +1/+1 aleatório','', 'BR1'],['Chefe da Colheita','👑🌾','Viking',5,6,6,'Aliados +1 ATK','', 'BA1']],
    animais:[['Urso Pardo','🐻','Animal',6,6,5,'Protetor','P'],['Lobo Cinzento','🐺','Animal',4,2,3,'Furioso','F'],['Javali Selvagem','🐗','Animal',3,2,2,'Impulsivo'],['Cervo Nobre','🦌','Animal',4,5,4,'Resistente'],['Coruja Sábia','🦉','Animal',1,2,1,'Entra: compre 1','', 'D1'],['Cavalo de Guerra','🐴','Animal',3,3,3,'Confiável'],['Cabra da Montanha','🐐','Animal',2,3,2,'Protetor','P'],['Águia do Norte','🦅','Animal',5,3,4,'Veloz'],['Urso Polar','🐻‍❄️','Animal',7,7,6,'Gigante'],['Serpente do Mar','🐍','Animal',8,7,7,'Colosso']],
    pescadores:[['Grumete do Fiorde','👦🎣','Viking',1,1,1,'Aprendiz'],['Pescador do Fiorde','🧔‍♂️🎣','Viking',2,3,2,'Veterano'],['Arpoador Nórdico','🪝','Viking',3,2,2,'Entra: dano 1 aleatório','', 'P1'],['Curandeira do Sal','🧂✨','Viking',2,3,3,'Entra: cura 2','', 'H2'],['Vigia do Farol','🗼🛡️','Viking',2,5,4,'Protetor','P'],['Ferreiro Naval','⚓️🔨','Viking',4,5,5,'Entra: +1/+1 aleatório','', 'BR1'],['Capitão da Pesca','👑🎣','Viking',5,6,6,'Aliados +1 ATK','', 'BA1'],['Remador Ágil','🚣','Viking',4,2,3,'Furioso','F']],
    floresta:[['Urso Negro','🐻','Animal',5,5,5,'Protetor','P'],['Lobo da Mata','🐺','Animal',4,2,3,'Furioso','F'],['Javali da Floresta','🐗','Animal',3,2,2,'Impulsivo'],['Cervo Vermelho','🦌','Animal',4,5,4,'Resistente'],['Coruja Sábia','🦉','Animal',1,2,1,'Entra: compre 1','', 'D1'],['Raposa Ágil','🦊','Animal',3,3,3,'Veloz'],['Bisonte das Colinas','🐂','Animal',6,6,6,'Imponente'],['Serpente do Bosque','🐍','Animal',5,4,4,'Silenciosa']]
  };

  const HUMAN_DECKS=['vikings','pescadores'];const ANIMAL_DECKS=['animais','floresta'];
  function seededRng(seed){let s=seed>>>0;return function(){s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)/4294967296);}}
  function makeDeck(k,seed,prefix=''){const base=TEMPLATES[k];const deck=[];const rng=typeof seed==='number'?seededRng(seed):Math.random;const pool=[...base];let i=0;while(deck.length<20){const r=Math.floor(rng()*pool.length);const id=typeof seed==='number'?`${prefix}${i++}`:undefined;deck.push(C(pool[r],id))}return typeof seed==='number'?deck:shuffle(deck)}
  function shuffle(a,seed){const rng=typeof seed==='number'?seededRng(seed):Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  const S={playerHP:30,aiHP:30,turn:1,playerMana:0,playerManaCap:0,aiMana:0,aiManaCap:0,current:'player',playerDeck:[],aiDeck:[],playerHand:[],aiHand:[],playerBoard:[],aiBoard:[],chosenAttacker:null,playerDeckChoice:'vikings',aiDeckChoice:'animais'};
  const el={playerHP:$('#playerHP'),aiHP:$('#aiHP'),mana:$('#mana'),playerHand:$('#playerHand'),playerBoard:$('#playerBoard'),aiBoard:$('#aiBoard'),endTurnBtn:$('#endTurnBtn')};

  function updateMeters(){const pct=(v,max)=>(max>0?Math.max(0,Math.min(100,(v/max)*100)):0);$('#barPlayerHP').style.width=pct(S.playerHP,30)+'%';$('#barAiHP').style.width=pct(S.aiHP,30)+'%';$('#barMana').style.width=pct(S.playerMana,S.playerManaCap)+'%'}
  function renderAll(){el.playerHP.textContent=S.playerHP;el.aiHP.textContent=S.aiHP;$('#mana').textContent=`${S.playerMana}/${S.playerManaCap}`;updateMeters();renderHand();renderBoard();el.endTurnBtn.disabled=S.current!=='player'}

  function cardEl(card,owner){const d=document.createElement('div');d.className=`card ${owner==='player'?'me':'enemy'} ${card.stance==='defense'?'defense':''}`;d.dataset.id=card.id;d.innerHTML=`
    <div class="head"><span class="cost">${card.cost}</span><div class="name">${card.name}</div>${card.stance?`<span class="badge ${card.stance==='defense'?'def':'atkBadge'}">${card.stance==='defense'?'DEFESA':'ATAQUE'}</span>`:''}</div>
    <div class="tribe">${card.tribe}</div>
    <div class="art">${card.emoji}</div>
    <div class="text">${card.kw.map(k=>`<span class='keyword'>${k}</span>`).join('')} ${card.text||''}</div>
    <div class="stats"><span class="gem atk">⚔️ ${card.atk}</span><span class="gem hp ${card.hp<=2?'low':''}">❤️ ${card.hp}</span></div>`;return d}

  function renderHand(){el.playerHand.innerHTML='';S.playerHand.forEach(c=>{const d=cardEl(c,'player');d.classList.add('handcard');d.addEventListener('click',(e)=>{const blocked=(c.cost>S.playerMana)||S.current!=='player'||S.playerBoard.length>=5;if(blocked){d.style.transform='translateY(-2px) rotate(-1deg)';setTimeout(()=>d.style.transform='',150);sfx('error');return}openStanceChooser(d,(stance)=>playFromHand(c.id,stance))});if(c.cost>S.playerMana){d.querySelector('.cost').style.background='radial-gradient(circle at 30% 30%,#ffc2c2,#ff4d6d)';d.style.opacity=.95}else d.style.opacity=1;el.playerHand.appendChild(d)})}

  function renderBoard(){el.playerBoard.innerHTML='';for(const c of S.playerBoard){const d=cardEl(c,'player');if(S.current==='player'&&c.canAttack&&c.stance!=='defense'){d.classList.add('selectable');d.addEventListener('click',()=>selectAttacker(c))}el.playerBoard.appendChild(d)}
    el.aiBoard.innerHTML='';for(const c of S.aiBoard){const d=cardEl(c,'ai');if(S.chosenAttacker){if(legalTarget('ai',c)){d.classList.add('selectable');d.addEventListener('click',()=>attackCard(S.chosenAttacker,c))}}el.aiBoard.appendChild(d)}
    let btn=document.querySelector('#aiBoard .face-attack-btn'); if(!btn){btn=document.createElement('button');btn.type='button';btn.className='face-attack-btn';btn.textContent='🗡️ Atacar diretamente';btn.addEventListener('click',()=>{if(S.chosenAttacker)attackFace(S.chosenAttacker,'ai')});el.aiBoard.appendChild(btn)} updateFaceAttackZone()}

  function openStanceChooser(anchor,cb){closeStanceChooser();const r=anchor.getBoundingClientRect();const box=document.createElement('div');box.className='stance-chooser';box.style.position='fixed';box.style.left=Math.max(8,r.left+r.width/2-140)+'px';box.style.top=Math.max(8,r.top-48)+'px';box.style.zIndex=1000;const bA=document.createElement('button');bA.className='btn';bA.textContent='⚔️ Ataque';const bD=document.createElement('button');bD.className='btn';bD.textContent='🛡️ Defesa';bA.onclick=()=>{closeStanceChooser();cb('attack')};bD.onclick=()=>{closeStanceChooser();cb('defense')};box.appendChild(bA);box.appendChild(bD);document.body.appendChild(box);setTimeout(()=>{const handler=(ev)=>{if(ev.target.closest('.stance-chooser')) return;window.removeEventListener('click',handler,true);closeStanceChooser()};window.addEventListener('click',handler,true);bA.focus()},0)}
  function closeStanceChooser(){const old=document.querySelector('.stance-chooser');if(old)old.remove()}

  // Game flow
  function startGame(){setSeed();S.playerDeck=makeDeck(S.playerDeckChoice);S.aiDeck=makeDeck(S.aiDeckChoice);S.playerHand=[];S.aiHand=[];S.playerBoard=[];S.aiBoard=[];S.playerHP=30;S.aiHP=30;S.current='player';S.playerMana=0;S.playerManaCap=0;S.aiMana=0;S.aiManaCap=0;draw('player',3);draw('ai',3);newTurn();renderAll();log('A batalha começou!');sfx('start')}
  function draw(who,n=1){const deck=who==='player'?S.playerDeck:S.aiDeck;const hand=who==='player'?S.playerHand:S.aiHand;for(let i=0;i<n;i++){if(deck.length){hand.push(deck.shift())}}}
  function newTurn(){if(S.current==='player'){S.playerManaCap=clamp(S.playerManaCap+1,0,10);S.playerMana=S.playerManaCap;draw('player',1);S.playerBoard.forEach(c=>{c.canAttack=true})}else{S.aiManaCap=clamp(S.aiManaCap+1,0,10);S.aiMana=S.aiManaCap;draw('ai',1);S.aiBoard.forEach(c=>{c.canAttack=true})}renderAll()}
  function endTurn(){if(S.current!=='player')return;S.current='ai';S.chosenAttacker=null;updateFaceAttackZone();newTurn();sfx('end');setTimeout(aiTurn,500)}
  function playFromHand(id,stance){if(S.current!=='player')return;const idx=S.playerHand.findIndex(c=>c.id===id);if(idx<0)return;const c=S.playerHand[idx];if(c.cost>S.playerMana)return;if(S.playerBoard.length>=5)return;S.playerHand.splice(idx,1);summon('player',c,stance);S.playerMana-=c.cost;renderAll();sfx(stance==='defense'?'defense':'play')}
  function summon(side,c,stance='attack'){const board=side==='player'?S.playerBoard:S.aiBoard;c.stance=stance;c.canAttack=(c.stance==='attack')&&c.kw.includes('Furioso');board.push(c);log(`${side==='player'?'Você':'Inimigo'} jogou ${c.name} em modo ${c.stance==='defense'?'defesa':'ataque'}.`);triggerBattlecry(side,c)}
  function triggerBattlecry(side,c){const enemy=side==='player'?'ai':'player';switch(c.battlecry){case'draw1':draw(side,1);log(`${c.name}: comprou 1 carta.`);break;case'heal2':{const allies=(side==='player'?S.playerBoard:S.aiBoard);if(allies.length){const t=allies[Math.floor(rand()*allies.length)];t.hp=Math.min(t.hp+2,20);log(`${c.name}: curou 2 em ${t.name}.`)}}break;case'ping1':{const foes=(enemy==='ai'?S.aiBoard:S.playerBoard);if(foes.length){const t=foes[Math.floor(rand()*foes.length)];damageMinion(t,1);log(`${c.name}: 1 de dano em ${t.name}.`);checkDeaths();renderAll();sfx('hit')}}break;case'buffRandom1':{const allies=(side==='player'?S.playerBoard:S.aiBoard).filter(x=>x.id!==c.id);if(allies.length){const t=allies[Math.floor(rand()*allies.length)];t.atk+=1;t.hp+=1;log(`${c.name}: deu +1/+1 em ${t.name}.`)}}break;case'buffAlliesAtk1':{const allies=(side==='player'?S.playerBoard:S.aiBoard).filter(x=>x.id!==c.id);allies.forEach(x=>x.atk+=1);if(allies.length)log(`${c.name}: aliados ganharam +1 de ataque.`)}break}}
  function hasGuard(board){return board.some(x=>x.kw.includes('Protetor')||x.stance==='defense')}
  function selectAttacker(c){if(S.current!=='player')return;if(!c.canAttack||c.stance==='defense')return;S.chosenAttacker=c;renderBoard();updateFaceAttackZone();S.aiBoard.filter(x=>x.stance==='defense').forEach(x=>setTimeout(()=>{},20))}
  function updateFaceAttackZone(){const isMyTurn=S.current==='player';const canFace=isMyTurn && !!S.chosenAttacker && !hasGuard(S.aiBoard);if(canFace) el.aiBoard.classList.add('face-can-attack'); else el.aiBoard.classList.remove('face-can-attack');const btn=document.querySelector('#aiBoard .face-attack-btn'); if(btn) btn.style.display=canFace?'block':'none'}
  function legalTarget(side,target){const b=side==='ai'?S.aiBoard:S.playerBoard;const must=hasGuard(b);if(must)return target.kw.includes('Protetor')||target.stance==='defense';return true}

  function attackCard(attacker,target){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;sfx('attack');if(target.stance==='defense'){}const pre=target.hp;const overflow=Math.max(0,attacker.atk-pre);damageMinion(target,attacker.atk);damageMinion(attacker,target.atk);sfx('hit');if(overflow>0&&target.hp<=0){const isPlayer=S.playerBoard.includes(attacker);if(isPlayer){S.aiHP=clamp(S.aiHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`)}else{S.playerHP=clamp(S.playerHP-overflow,0,99);log(`${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`)}checkWin()}attacker.canAttack=false;log(`${attacker.name} atacou ${target.name}.`);const beforeA=S.aiBoard.length,beforeP=S.playerBoard.length;checkDeaths();if(S.aiBoard.length<beforeA||S.playerBoard.length<beforeP){sfx('death')}S.chosenAttacker=null;updateFaceAttackZone();renderAll()}
  function attackFace(attacker,face){if(!attacker||!attacker.canAttack||attacker.stance==='defense')return;sfx('attack');const dmg=attacker.atk;attacker.canAttack=false;if(face==='ai'){S.aiHP=clamp(S.aiHP-dmg,0,99);log(`${attacker.name} causou ${dmg} ao Inimigo!`)}else{S.playerHP=clamp(S.playerHP-dmg,0,99);log(`${attacker.name} causou ${dmg} a Você!`)}checkWin();S.chosenAttacker=null;updateFaceAttackZone();renderAll()}

  function damageMinion(m,amt){if(!m||typeof amt!=='number')return;m.hp=clamp(m.hp-amt,0,99)}
  function checkDeaths(){S.aiBoard=S.aiBoard.filter(c=>c.hp>0);S.playerBoard=S.playerBoard.filter(c=>c.hp>0)}
  function checkWin(){if(S.aiHP<=0){showWin(true)}if(S.playerHP<=0){showWin(false)}}

  function aiTurn(){const playable=S.aiHand.filter(c=>c.cost<=S.aiMana).sort((a,b)=>b.cost-a.cost);while(playable.length&&S.aiBoard.length<5&&S.aiMana>0){const c=playable.shift();const idx=S.aiHand.findIndex(x=>x.id===c.id);if(idx>-1&&c.cost<=S.aiMana){S.aiHand.splice(idx,1);const stance=(c.hp>=c.atk+1)?(rand()<.7?'defense':'attack'):(rand()<.3?'defense':'attack');summon('ai',c,stance);S.aiMana-=c.cost}}renderAll();const attackers=S.aiBoard.filter(c=>c.canAttack&&c.stance!=='defense');function next(){if(!attackers.length){S.current='player';newTurn();return}const a=attackers.shift();const legal=S.playerBoard.filter(x=>legalTarget('player',x));if(legal.length){attackCard(a,legal[Math.floor(rand()*legal.length)])}else{attackFace(a,'player')}setTimeout(next,500)}setTimeout(next,500)}

  // UI bindings
  $('#endTurnBtn').addEventListener('click',endTurn);
  $('#startGame').addEventListener('click',()=>{
    if(window.NET_STATE && window.NET_STATE.online) return;
    $('#start').style.display='none';initAudio();ensureRunning();startGame()
  });
  $('#muteBtn').addEventListener('click',()=>{initAudio();ensureRunning();muted=!muted;master&&(master.gain.value=muted?0:.18);$('#muteBtn').textContent=muted?'🔇 Mudo':'🔊 Som'});
  $$('.deckbtn').forEach(btn=>btn.addEventListener('click',()=>{
    const pick=btn.dataset.deck;S.playerDeckChoice=pick;
    if(!(window.NET_STATE && window.NET_STATE.online)){
      if(HUMAN_DECKS.includes(pick)){S.aiDeckChoice=ANIMAL_DECKS[Math.floor(rand()*ANIMAL_DECKS.length)]}else{S.aiDeckChoice=HUMAN_DECKS[Math.floor(rand()*HUMAN_DECKS.length)]}
    }
    $$('.deckbtn').forEach(b=>b.style.outline='none');btn.style.outline='2px solid var(--accent)'}));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){S.chosenAttacker=null;updateFaceAttackZone();renderBoard()}});

  // Win/Lose panel actions
  function showWin(win){const panel=$('#win');const title=$('#winTitle');panel.classList.add('show');title.textContent=win?'You WIN!':'You Lose...';title.classList.toggle('titleLose',!win)}
  $('#btnReplay').addEventListener('click',()=>{$('#win').classList.remove('show');startGame()});
  $('#btnRematch').addEventListener('click',()=>{
    $('#win').classList.remove('show');
    if(window.NET_STATE && window.NET_STATE.online){
      window.FFON.confirmReady();
    }else{
      startGame();
    }
  });
  $('#btnMenu').addEventListener('click',()=>{location.reload()});

  // Kick audio
  window.addEventListener('pointerdown',()=>{initAudio();ensureRunning()},{once:true});

  // expose for networking hooks
  Object.assign(window,{S,makeDeck,shuffle,draw,newTurn,renderAll,aiTurn,playFromHand,endTurn,attackCard,attackFace,setSeed,summon,sfx,updateFaceAttackZone});
})();
