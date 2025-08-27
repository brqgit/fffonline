const $ = sel => document.querySelector(sel);

const FACTIONS = {
  Furioso: { pool: [
    { name: 'Ceifeira Ágil', type: 'unit', atk: 3, hp: 2, cost: 9 },
    { name: 'Grito de Guerra', type: 'spell', desc: '+1 ATK a uma unidade', cost: 6 },
    { name: 'Totem da Fúria', type: 'totem', desc: '+1 ATK a 1–3 unidades', cost: 12 }
  ]},
  Sombras: { pool: [
    { name: 'Sombras Encapuçado', type: 'unit', atk: 3, hp: 5, cost: 10 },
    { name: 'Dreno Sombrio', type: 'spell', desc: 'Drena 2 de HP', cost: 7 },
    { name: 'Totem da Lua Nova', type: 'totem', desc: '+1 HP a 1–3 unidades', cost: 11 }
  ]},
  Percepcao: { pool: [
    { name: 'Guardião do Bosque', type: 'unit', atk: 2, hp: 4, cost: 8 },
    { name: 'Insight', type: 'spell', desc: 'Compre 2 cartas', cost: 7 },
    { name: 'Totem do Olho Antigo', type: 'totem', desc: '+1/+1 a 1–3 unidades', cost: 13 }
  ]}
};

const NEUTRAL = [
  { name: 'Aldeão Valente', type: 'unit', atk: 1, hp: 2, cost: 5 },
  { name: 'Afiar Lâminas', type: 'spell', desc: '+1 ATK', cost: 5 },
  { name: 'Totem do Carvalho', type: 'totem', desc: '+1 HP', cost: 9 }
];

// Additional totems
const EXTRA_TOTEMS = [
  { name: 'Totem de Força', type: 'totem', buffs:{atk:1}, tag:'fire', particle:'attack', desc:'+1 ATK a aliados', cost:10 },
  { name: 'Totem da Cura', type: 'totem', buffs:{hp:2}, tag:'heal', particle:'healing', desc:'+2 HP a aliados', cost:10 },
  { name: 'Totem da Água', type: 'totem', buffs:{hp:1,atk:0}, tag:'water', particle:'magic', desc:'+1 HP (água)', cost:9 },
  { name: 'Totem da Terra', type: 'totem', buffs:{hp:1}, tag:'earth', particle:'magic', desc:'+1 HP (terra)', cost:9 },
  { name: 'Totem do Trovão', type: 'totem', buffs:{atk:2}, tag:'lightning', particle:'attack', desc:'+2 ATK a 1 aliado', cost:12 },
  { name: 'Totem do Vigor', type: 'totem', buffs:{atk:1,hp:1}, tag:'regen', particle:'healing', desc:'+1/+1 aleatório', cost:11 },
  { name: 'Totem do Olho', type: 'totem', buffs:{}, tag:'perception', particle:'magic', desc:'Ao entrar: compre 1', cost:11 },
  { name: 'Totem Absorvente', type: 'totem', buffs:{}, tag:'absorb', particle:'magic', desc:'Copia uma palavra-chave ao fim do turno', cost:12 },
  { name: 'Totem do Escudo', type: 'totem', buffs:{hp:2}, tag:'shield', particle:'magic', desc:'+2 HP em aliados', cost:11 },
  { name: 'Totem das Sombras', type: 'totem', buffs:{atk:1}, tag:'fire', particle:'magic', desc:'Dá +1 ATK a aliados selecionados', cost:10 }
];

// merge extras into neutral pool so shop can draw them
EXTRA_TOTEMS.forEach(t=>NEUTRAL.push(t));

const POTIONS = [
  { name: 'Poção de Cura', type: 'potion', effect: 'heal3', desc: 'Cura 3 HP a uma carta', cost: 6 },
  { name: 'Poção de Força', type: 'potion', effect: 'atk2', desc: '+2 ATK a uma carta', cost: 7 },
  { name: 'Poção de Escudo', type: 'potion', effect: 'shield2', desc: '+2 HP temporário', cost: 7 },
  { name: 'Poção de Fogo', type: 'potion', effect: 'firebuff', desc: 'Aplica fogo (buff visual)', cost: 8 },
  { name: 'Poção de Água', type: 'potion', effect: 'waterbuff', desc: 'Aplica água (buff visual)', cost: 8 },
  { name: 'Poção de Terra', type: 'potion', effect: 'earthbuff', desc: 'Aplica terra (buff visual)', cost: 8 },
  { name: 'Poção de Raio', type: 'potion', effect: 'lightningbuff', desc: 'Aplica raio (buff visual)', cost: 9 },
  { name: 'Poção de Regeneração', type: 'potion', effect: 'regen', desc: 'Cura ao longo do turno', cost: 7 },
  { name: 'Poção de Dano', type: 'potion', effect: 'dmg3', desc: 'Causa 3 de dano a uma carta', cost: 6 },
  { name: 'Poção de Totem', type: 'potion', effect: 'add_totem_slot', desc: 'Aumenta 1 slot de totem (máx 10)', cost: 10 }
];

let shopState = { faction: '', gold: 0, onClose: null, unlimited: false };
let rerolled = false;

const shuffle = arr => arr.sort(() => Math.random() - 0.5);

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g,'-');
function withImg(it){
  if(['unit','spell','totem'].includes(it.type)){
  return { ...it, img:`img/cards/${slug(it.name)}.png` };
  }
  return it;
}

function genShopOffers(){
  if(shopState.onlyPotions){
    // return a shuffled selection of potions only
    return shuffle(POTIONS).slice(0,12).map(p=>withImg(Object.assign({},p)));
  }
  // produce up to 12 offers, preferring faction pool when available
  const maxOffers = 12;
  const factionPool = (shopState.faction && FACTIONS[shopState.faction]) ? FACTIONS[shopState.faction].pool.slice() : [];
  const neutralPool = NEUTRAL.slice();
  let pool = [];
  if(factionPool.length){
    pool = pool.concat(shuffle(factionPool).slice(0, Math.ceil(maxOffers/2)));
  }
  const otherCandidates = shuffle([].concat(neutralPool, ...Object.values(FACTIONS).map(f=>f.pool)));
  for(const it of otherCandidates){ if(pool.length>=maxOffers) break; if(!pool.includes(it)) pool.push(it); }
  if(pool.length < 6){ pool = pool.concat(otherCandidates.slice(0, 6 - pool.length)); }
  const offers = pool.slice(0, maxOffers).map(it => {
    const base = Object.assign({}, it);
  if(['unit','spell','totem'].includes(base.type) && !base.img){ base.img = `img/cards/${slug(base.name)}.png`; }
    // if player deck choice exists, hint renderer to prefer that deck for art
    if(window && window.G && window.G.playerDeckChoice && !base.deck){ base.deck = window.G.playerDeckChoice; }
    return withImg(base);
  });
  // randomly include some potions and totems among offers
  const includePotions = shuffle(POTIONS).slice(0,3);
  includePotions.forEach(p=>{ if(offers.length<maxOffers) offers.splice(Math.floor(Math.random()*offers.length),0,withImg(p)); });
  // add a consumable if there's room
  if(offers.length < maxOffers) offers.push(withImg({ name: 'Elixir de Força', type: 'buff', desc: '+1 ATK a suas unidades neste round', cost: 7 }));
  return offers.slice(0, maxOffers);
}

function renderShop(){
  const wrap = $('#shopChoices');
  if(!wrap) return;
  wrap.innerHTML = '';
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    if(['unit','spell','totem'].includes(it.type) && window.cardNode){
      // normalize data for cardNode: prefer deck/icon or img
      const nodeData = Object.assign({}, it);
      if(nodeData.img && !nodeData.icon) nodeData.icon = nodeData.icon || '';
      if(!nodeData.deck && window && window.G && window.G.playerDeckChoice) nodeData.deck = window.G.playerDeckChoice;
      const node = window.cardNode(nodeData,'player');
      node.classList.add('shop-preview');
      card.appendChild(node);
    }else{
      const p = document.createElement('div');
      p.className = 'shop-placeholder';
      p.textContent = it.name;
      card.appendChild(p);
    }

    const btn = document.createElement('button');
    btn.className = 'btn price-btn';
  btn.innerHTML = `${it.cost}<img src="img/ui/coin.png" class="coin-icon" alt="moeda">`;
    btn.onclick = () => {
      if(shopState.gold < it.cost){ alert('Sem ouro.'); return; }
      shopState.gold -= it.cost;
      $('#shopGold').textContent = shopState.gold;
      btn.disabled = true;
      btn.textContent = '✔';
      // if potion, add to player's potion inventory and show tray UI
      if(it.type==='potion' && window && window.G){
        window.G.potionInventory = window.G.potionInventory || [];
        window.G.potionInventory.push({ effect: it.effect, name: it.name });
        // create and render tray UI
        ensurePotionTray();
        renderPotionTray();
      }
    };
    card.appendChild(btn);
    wrap.appendChild(card);
  });
}

function openShop({ faction, gold, onClose, unlimited=false }){
  const map = { vikings:'Furioso', animais:'Furioso', pescadores:'Sombras', floresta:'Percepcao', convergentes:'Percepcao' };
  shopState.faction = map[faction] || faction || 'Furioso';
  shopState.gold = gold;
  shopState.onClose = onClose;
  shopState.unlimited = unlimited;
  // allow test pages to open potions-only
  shopState.onlyPotions = arguments[0] && arguments[0].onlyPotions ? true : false;
  rerolled = false;
  $('#btnReroll').disabled = false;
  $('#shopGold').textContent = shopState.gold;
  renderShop();
  // mark buys pending so player cannot end turn until shop closed
  if(window && window.G) window.G.buysPending = true;
  // ensure the close button is enabled and clickable
  const closeBtn = document.getElementById('closeShop');
  if(closeBtn){ closeBtn.disabled = false; }
  // attach delegated click to modal root as a safety net
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.style.display = 'grid';
    modal.addEventListener('click', function delegatedClose(ev){
      // if user clicks the backdrop (outside .box) or the explicit close button
      const box = modal.querySelector('.box');
      if(!box) return;
      if(ev.target === modal){
        // click on backdrop
        closeShop();
      }
      if(ev.target && ev.target.id === 'closeShop'){
        closeShop();
      }
    });
  }
}

function closeShop(){
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.remove('show');
    modal.style.display = 'none';
    // try to remove delegated listener if present by cloning node
    try{
      const clone = modal.cloneNode(true);
      modal.parentNode.replaceChild(clone, modal);
    }catch(_){ }
  }
  if(shopState.onClose) shopState.onClose(shopState);
  // clear buys pending flag
  if(window && window.G) window.G.buysPending = false;
}

window.openShop = openShop;

document.getElementById('btnReroll')?.addEventListener('click', () => {
  if(!shopState.unlimited && rerolled){ alert('Sem re-rolagens.'); return; }
  rerolled = true;
  if(!shopState.unlimited) document.getElementById('btnReroll').disabled = true;
  renderShop();
});
document.getElementById('closeShop')?.addEventListener('click', closeShop);

// --- Potion tray UI helpers ---
function ensurePotionTray(){
  let tray = document.getElementById('potionTray');
  if(tray) return tray;
  tray = document.createElement('div');
  tray.id = 'potionTray';
  tray.className = 'potion-tray';
  tray.style.position = 'fixed';
  tray.style.right = '12px';
  tray.style.bottom = '12px';
  tray.style.zIndex = 99999;
  tray.style.display = 'flex';
  tray.style.gap = '8px';
  tray.style.pointerEvents = 'auto';
  document.body.appendChild(tray);
  // expose helpers for console testing
  try{ window.renderPotionTray = renderPotionTray; window.ensurePotionTray = ensurePotionTray; }catch(_){ }
  return tray;
}

function renderPotionTray(){
  if(!window || !window.G) return;
  const tray = ensurePotionTray();
  tray.innerHTML = '';
  const inv = window.G.potionInventory || [];
  if(!inv.length){ tray.style.display = 'none'; return; }
  tray.style.display = 'flex';
  inv.forEach((p,idx)=>{
    const el = document.createElement('div');
    el.className = 'potion-item';
    el.style.background = '#222';
    el.style.color = '#fff';
    el.style.padding = '6px 8px';
    el.style.borderRadius = '6px';
    el.style.minWidth = '120px';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,.4)';
    el.innerHTML = `<div style="font-weight:600">${p.name}</div><div style="font-size:12px;margin-top:4px">${p.effect}</div>`;
    const actions = document.createElement('div'); actions.style.marginTop='6px'; actions.style.display='flex'; actions.style.gap='6px';
    const useBtn = document.createElement('button'); useBtn.className='btn'; useBtn.textContent='Usar';
    useBtn.onclick = ()=>{
      // set pending potion and enter targeting mode
      window.G.pendingPotion = { effect: p.effect, name: p.name };
      // visually indicate pending potion
      document.body.classList.add('potion-pending');
      // instruct player
      alert(`Usar ${p.name}: selecione a carta alvo ou clique Cancelar.`);
    };
    const discardBtn = document.createElement('button'); discardBtn.className='btn btn-ghost'; discardBtn.textContent='Descartar';
    discardBtn.onclick = ()=>{
      window.G.potionInventory.splice(idx,1);
      // if current pending potion is this one, clear it
      if(window.G.pendingPotion && window.G.pendingPotion.name===p.name){ window.G.pendingPotion = null; document.body.classList.remove('potion-pending'); }
      renderPotionTray();
    };
    const cancelBtn = document.createElement('button'); cancelBtn.className='btn btn-ghost'; cancelBtn.textContent='Cancelar';
    cancelBtn.style.display='none';
    actions.appendChild(useBtn); actions.appendChild(discardBtn); actions.appendChild(cancelBtn);
    el.appendChild(actions);
    tray.appendChild(el);
  });
}

// when a potion is consumed by applyPotionToCard (in game.js), remove one matching from inventory
// and clear pending UI class
const originalApplyPotionToCard = window.applyPotionToCard;
if(typeof originalApplyPotionToCard==='function'){
  // if applyPotionToCard exists, wrap to update inventory
  window.applyPotionToCard = function(card){
    originalApplyPotionToCard(card);
    if(window.G && window.G.potionInventory && window.G.pendingPotion===null){
      // remove the first inventory entry with matching name (consumed)
      const name = arguments[0] && arguments[0].name; // not reliable; instead, remove by effect via last used
      // best-effort: remove any item if inventory non-empty
      if(window.G.potionInventory.length) window.G.potionInventory.shift();
      document.body.classList.remove('potion-pending');
      renderPotionTray();
    }
  };
}
