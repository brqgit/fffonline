const $ = sel => document.querySelector(sel);

const FACTIONS = {
  Furioso: { pool: [
    { name: 'Ceifeira Ágil', type: 'unit', atk: 3, hp: 2, cost: 3, rarity: 'common' },
    { name: 'Grito de Guerra', type: 'spell', desc: '+1 ATK a uma unidade', cost: 2, rarity: 'common' },
    { name: 'Totem da Fúria', type: 'totem', desc: '+1 ATK a 1-3 unidades', cost: 2, rarity: 'rare' }
  ]},
  Sombras: { pool: [
    { name: 'Sombras Encapuçado', type: 'unit', atk: 3, hp: 5, cost: 4, rarity: 'common' },
    { name: 'Dreno Sombrio', type: 'spell', desc: 'Drena 2 de HP', cost: 3, rarity: 'common' },
    { name: 'Totem da Lua Nova', type: 'totem', desc: '+1 HP a 1-3 unidades', cost: 2, rarity: 'rare' }
  ]},
  Percepcao: { pool: [
    { name: 'Guardiao do Bosque', type: 'unit', atk: 2, hp: 4, cost: 3, rarity: 'common' },
    { name: 'Insight', type: 'spell', desc: 'Compre 2 cartas', cost: 3, rarity: 'common' },
    { name: 'Totem do Olho Antigo', type: 'totem', desc: '+1/+1 a 1-3 unidades', cost: 3, rarity: 'rare' }
  ]}
};

const NEUTRAL = [
  { name: 'Aldeão Valente', type: 'unit', atk: 1, hp: 2, cost: 2, rarity: 'common' },
  { name: 'Afiar Lâminas', type: 'spell', desc: '+1 ATK', cost: 1, rarity: 'common' },
  { name: 'Totem do Carvalho', type: 'totem', desc: '+1 HP', cost: 2, rarity: 'rare' }
];

const STORY_ITEMS = [
  { name: 'Elixir de Mana Primordial', type: 'relic', desc: 'Comece os combates da história com +1 de mana.', cost: 14, rarity: 'rare', flair: 'mana', icon: '💠', bonus: { startMana: 1 } },
  { name: 'Tambor dos Conquistadores', type: 'relic', desc: 'Ganha +1 de mana sempre que destruir uma unidade inimiga.', cost: 19, rarity: 'epic', flair: 'weapon', icon: '🪘', bonus: { killMana: 1 } },
  { name: 'Grãos Encantados de Freyja', type: 'buff', desc: 'Aliados começam com +1 HP permanente na campanha.', cost: 13, rarity: 'rare', flair: 'buff', icon: '🌾', bonus: { allyBuff: { hp: 1 } } },
  { name: 'Lâmina das Sete Runas', type: 'buff', desc: '+1 ATK permanente para suas unidades na campanha.', cost: 17, rarity: 'epic', flair: 'weapon', icon: '⚔️', bonus: { allyBuff: { atk: 1 } } },
  { name: 'Talismã Totêmico Ancestral', type: 'totem', desc: 'Totens concedem +1/+1 adicional ao ativar.', cost: 20, rarity: 'legendary', flair: 'totem', icon: '🗿', bonus: { totemBonus: { atk: 1, hp: 1 } } }
];
try{
  window.SHOP_STORY_ITEMS = STORY_ITEMS.map(item => Object.assign({}, item));
  window.SHOP_NEUTRAL_ITEMS = NEUTRAL.map(item => Object.assign({}, item));
}catch(_){ }

const SHOP_ICONS = {
  buff: '✨',
  relic: '🔮',
  totem: '🗿',
  mana: '💠',
  weapon: '⚔️',
  item: '🧭',
  spell: '📜',
  unit: '⚔️'
};

function getPlayerId(){
  if(window && window.PLAYER_ID) return window.PLAYER_ID;
  const fallback = window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
  if(window) window.PLAYER_ID = fallback;
  return fallback;
}

let shopState = {
  faction: '',
  deckKey: 'vikings',
  gold: 0,
  onClose: null,
  unlimited: false,
  purchased: [],
  purchasedIds: new Set(),
  story: false,
  removals: 0,
  pending: [],
  selectedOffer: null,
  visitId: 0
};
let rerollCount = 0;

const REMOVAL_COST_BY_RARITY = {
  common: 15,
  rare: 25,
  epic: 35,
  legendary: 50
};

function showShopMsg(msg){
  const el = $('#shopMsg');
  if(!el) return;
  el.textContent = msg;
  clearTimeout(showShopMsg._t);
  showShopMsg._t = setTimeout(() => { el.textContent = ''; }, 2000);
}
function fisherYatesShuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// alias to maintain existing shuffle calls
function shuffle(arr){
  return fisherYatesShuffle(arr);
}
const KNOWN_DECKS = ['vikings','animais','pescadores','floresta'];
function normalizeDeckKey(input){
  const raw = String(input||'').trim().toLowerCase();
  if(KNOWN_DECKS.includes(raw)) return raw;
  const map = { furioso:'vikings', sombras:'pescadores', percepcao:'floresta' };
  return map[raw] || (window && window.G && KNOWN_DECKS.includes(window.G.playerDeckChoice) ? window.G.playerDeckChoice : 'vikings');
}
function buildShopCardPool(deckKey){
  const getPool = window.getCardPoolForShop;
  if(typeof getPool !== 'function'){
    const legacyByDeck = {
      vikings: 'Furioso',
      animais: 'Furioso',
      pescadores: 'Sombras',
      floresta: 'Percepcao'
    };
    const preferredFaction = legacyByDeck[deckKey] || 'Furioso';
    const fallback = []
      .concat((FACTIONS[preferredFaction] && FACTIONS[preferredFaction].pool) || [])
      .concat(NEUTRAL)
      .map(card => Object.assign({}, card, { deck: deckKey, faction: preferredFaction }));
    return shuffle(fallback);
  }
  const poolData = getPool(deckKey) || {};
  const current = Array.isArray(poolData.current) ? poolData.current : [];
  const all = Array.isArray(poolData.all) ? poolData.all : [];
  const uniqueByName = new Map();
  current.concat(all).forEach(card => {
    if(!card || !card.name) return;
    const key = String(card.name).trim().toLowerCase();
    if(!key || uniqueByName.has(key)) return;
    uniqueByName.set(key, Object.assign({}, card, {
      deck: card.deck || deckKey,
      faction: card.deck || deckKey,
      type: card.type || 'unit',
      cost: Math.max(1, Number((window.balanceCardCost && window.balanceCardCost(card)) || card.cost || 1))
    }));
  });
  const unique = Array.from(uniqueByName.values());
  const preferred = shuffle(unique.filter(c => c.deck === deckKey));
  const others = shuffle(unique.filter(c => c.deck !== deckKey));
  return preferred.concat(others);
}

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g,'-');
// Do not force non-existent images; let card renderer pick deck placeholders/emoji
function withImg(it){ return it; }

// --- tooltip ---
const tooltip = (() => {
  const el = document.createElement('div');
  el.id = 'shopTooltip';
  el.style.position = 'fixed';
  el.style.display = 'none';
  el.style.background = 'rgba(0,0,0,0.85)';
  el.style.color = '#fff';
  el.style.padding = '6px';
  el.style.borderRadius = '4px';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '5000';
  document.body.appendChild(el);
  function hide(){ el.style.display = 'none'; }
  function show(data, target){
    if(!target) return;
    const parts = [];
    if(data.desc) parts.push(`<div>${data.desc}</div>`);
    if(typeof data.atk === 'number' && typeof data.hp === 'number'){
      parts.push(`<div>ATK/HP: ${data.atk}/${data.hp}</div>`);
    }
    if(data.faction){ parts.push(`<div>Sinergia: ${data.faction}</div>`); }
    const inDeck = window && window.G && Array.isArray(window.G.playerDeck)
      && window.G.playerDeck.some(c => c.name === data.name);
    if(inDeck) parts.push('<div style="color: #ffd700;">Já no deck</div>');
    el.innerHTML = parts.join('');
    el.style.display = 'block';
    const r = target.getBoundingClientRect();
    el.style.left = (r.right + 6) + 'px';
    el.style.top = r.top + 'px';
  }
  document.addEventListener('click', hide);
  return { show, hide };
})();

function genShopOffers(){
  // produce up to 6 offers so the catalog fits without scroll
  const maxOffers = 6;
  const pool = [];
  if(shopState.story || shopState.unlimited){
    const storyPicks = shuffle(STORY_ITEMS).slice(0, 3).map(it => Object.assign({}, it));
    for(const item of storyPicks){
      if(pool.length >= maxOffers) break;
      if(!pool.some(p => p.name === item.name)) pool.push(item);
    }
  }
  const cardsPool = buildShopCardPool(shopState.deckKey);
  for(const card of cardsPool){
    if(pool.length >= maxOffers) break;
    if(pool.some(p => String(p.name).trim().toLowerCase() === String(card.name).trim().toLowerCase())) continue;
    pool.push(card);
  }
  const offers = pool.slice(0, maxOffers).map(it => {
    let base = Object.assign({}, it);
    if(window.hydrateCardArt){ base = window.hydrateCardArt(base); }
    else if(window && window.G && window.G.playerDeckChoice && !base.deck){ base.deck = window.G.playerDeckChoice; }
    return withImg(base);
  });
  return offers.slice(0, maxOffers);
}

function isCampaignSpecialOffer(offer){
  return !!(offer && (offer.type === 'relic' || offer.type === 'buff' || offer.bonus));
}

function updateShopPreviewPanel(offer){
  shopState.selectedOffer = offer || null;
}

function refreshShopAffordability(){
  try{
    document.querySelectorAll('.price-btn').forEach(b => {
      const amt = b.querySelector('.price-amt');
      if(!amt) return;
      const price = parseInt(amt.textContent,10) || 0;
      if(!shopState.unlimited && shopState.gold < price){
        b.classList.add('unaffordable');
        b.disabled = true;
        amt.classList.add('unaffordable');
      }else if(!b.dataset.purchased){
        b.classList.remove('unaffordable');
        b.disabled = false;
        amt.classList.remove('unaffordable');
      }
    });
  }catch(_){ }
}

function markOfferPurchased(offer){
  if(!offer) return;
  offer._purchased = true;
  shopState.purchasedIds.add(slug(offer.name));
  const idx = (shopState.offers||[]).findIndex(o => o && o.name === offer.name);
  if(idx >= 0) shopState.offers[idx]._purchased = true;
}

function isOfferPurchased(offer){
  if(!offer) return false;
  return shopState.purchasedIds.has(slug(offer.name)) || !!offer._purchased;
}

function applyStoryPurchaseEffects(item){
  if(!shopState.story || !item) return;
  if(item._appliedToStory) return;
  if(item.bonus && typeof window.applyStoryShopBonus === 'function'){
    window.applyStoryShopBonus(item);
    item._appliedToStory = true;
    return;
  }
  if(['unit','spell','totem'].includes(item.type) && typeof window.addRewardCardToStory === 'function'){
    window.addRewardCardToStory(item);
    item._appliedToStory = true;
  }
}

function purchaseOffer(it, btn){
  if(!it) return;
  if(isOfferPurchased(it)){
    showShopMsg('Item já comprado.');
    return;
  }
  if(!shopState.unlimited && shopState.gold < it.cost){
    showShopMsg('Sem ouro.');
    if(window.playSfx) window.playSfx('error');
    return;
  }
  const applyLocal = () => {
    shopState.gold = Math.max(0, shopState.gold - it.cost);
    $('#shopGold').textContent = shopState.gold;
    if(window.updateGoldHUD) window.updateGoldHUD();
    if(btn){
      btn.textContent = '✔';
      btn.disabled = true;
      btn.dataset.purchased = '1';
    }
    markOfferPurchased(it);
    const purchaseItem = window.hydrateCardArt ? window.hydrateCardArt(Object.assign({}, it)) : Object.assign({}, it);
    shopState.purchased.push(purchaseItem);
    applyStoryPurchaseEffects(purchaseItem);
    refreshShopAffordability();
    if(window.playSfx) window.playSfx('reward');
    showShopMsg('✓ Compra registrada');
  };
  const useServer = !!(window.isMultiplayer || window.usePurchaseAPI);
  if(!useServer){
    applyLocal();
    return;
  }
  if(btn) btn.disabled = true;
  const API_BASE = window.SHOP_API_BASE || '';
  const currentGold = shopState.gold;
  const req = fetch(API_BASE + '/api/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: getPlayerId(),
      itemId: slug(it.name),
      cost: it.cost,
      gold: currentGold,
    })
  })
  .then(r => {
    if(!r.ok){ throw new Error('HTTP '+r.status); }
    return r.json().catch(()=>({ gold: currentGold - it.cost }));
  })
  .then(data => {
    if(!data || typeof data.gold !== 'number'){ throw new Error('Resposta inválida'); }
    shopState.gold = Math.max(0, data.gold);
    $('#shopGold').textContent = shopState.gold;
    if(btn){
      btn.textContent = '✔';
      btn.disabled = true;
      btn.dataset.purchased = '1';
    }
    markOfferPurchased(it);
    const purchaseItem = window.hydrateCardArt ? window.hydrateCardArt(Object.assign({}, it)) : Object.assign({}, it);
    shopState.purchased.push(purchaseItem);
    applyStoryPurchaseEffects(purchaseItem);
    if(window.updateGoldHUD) window.updateGoldHUD();
    refreshShopAffordability();
    if(window.playSfx) window.playSfx('reward');
    showShopMsg('✓ Compra registrada');
  })
  .catch(err => {
    console.warn('Falha na API de compra, usando fallback local:', err.message);
    applyLocal();
  });
  shopState.pending.push(req);
}

function renderShop(){
  const wrap = $('#shopChoices');
  const specialWrap = $('#shopSpecialChoices');
  const specialPanel = $('#shopSpecialsPanel');
  if(!wrap) return;
  wrap.innerHTML = '';
  if(specialWrap) specialWrap.innerHTML = '';
  tooltip.hide();
  shopState.offers = genShopOffers();
  shopState.selectedOffer = null;
  const specialOffers = shopState.offers.filter(isCampaignSpecialOffer);
  const regularOffers = shopState.offers.filter(it => !isCampaignSpecialOffer(it));
  if(specialPanel) specialPanel.style.display = specialOffers.length ? '' : 'none';
  specialOffers.forEach(it => {
    if(!specialWrap) return;
    const card = document.createElement('div');
    const flair = (it && (it.flair || it.type)) || 'item';
    card.className = 'shop-special-card';
    card.dataset.flair = flair;
    const icon = document.createElement('div');
    icon.className = 'shop-special-icon';
    icon.textContent = it.icon || SHOP_ICONS[flair] || SHOP_ICONS[it.type] || '🛒';
    const name = document.createElement('div');
    name.className = 'shop-special-name';
    name.textContent = it.name;
    const desc = document.createElement('div');
    desc.className = 'shop-special-desc';
    desc.textContent = it.desc || it.text || 'Item de campanha';
    const btn = document.createElement('button');
    btn.className = 'btn price-btn';
    btn.innerHTML = `<span class="price-amt">${it.cost}</span><span class="coin-icon"></span>`;
    const alreadyPurchased = isOfferPurchased(it);
    const unaffordable = (!shopState.unlimited && shopState.gold < it.cost);
    if(alreadyPurchased){
      btn.textContent = '✔';
      btn.disabled = true;
      btn.dataset.purchased = '1';
    }else if(unaffordable){
      btn.classList.add('unaffordable');
      btn.disabled = true;
      const amt = btn.querySelector('.price-amt'); if (amt) amt.classList.add('unaffordable');
    }
    card.append(icon,name,desc,btn);
    card.addEventListener('click', ev => {
      if(ev.target === btn) return;
      tooltip.show(it, card);
    });
    btn.onclick = ev => {
      ev.stopPropagation();
      purchaseOffer(it, btn);
    };
    card.addEventListener('mouseenter', () => tooltip.show(it, card));
    card.addEventListener('mouseleave', () => tooltip.hide());
    specialWrap.appendChild(card);
  });
  regularOffers.forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    const flair = (it && (it.flair || (it.type === 'buff' && it.bonus && it.bonus.startMana ? 'mana' : it.type))) || 'item';
    card.dataset.flair = flair;
    if(it && it.type) card.dataset.type = it.type;
    const hoverData = window.hydrateCardArt ? window.hydrateCardArt(Object.assign({}, it)) : it;

    // Use the shared card renderer from game.js so shop cards stay visually
    // identical to encyclopedia/game cards and keep the same art-loading path.
    if(['unit','spell','totem'].includes(it.type) && window.cardNode){
      let nodeData = Object.assign({}, it);
      if(window.hydrateCardArt){ nodeData = window.hydrateCardArt(nodeData); }
      const node = window.cardNode(nodeData,'player');
      node.classList.add('ency-card', 'shop-card-face', 'shop-preview');
      card.appendChild(node);
    }else{
      const art = document.createElement('div');
      art.className = 'shop-art';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'shop-art-icon';
      iconSpan.textContent = it.icon || SHOP_ICONS[flair] || SHOP_ICONS[it.type] || '🛒';
      art.appendChild(iconSpan);
      const kind = document.createElement('span');
      kind.className = 'shop-art-kind';
      kind.textContent = it.type === 'relic' ? 'Relíquia' : it.type === 'buff' ? 'Upgrade' : it.type === 'totem' ? 'Totem' : 'Item';
      art.appendChild(kind);
      card.appendChild(art);
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rx = (y - r.height/2)/(r.height/2)*-8;
        const ry = (x - r.width/2)/(r.width/2)*8;
        art.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener('mouseleave', () => { art.style.transform=''; });
    }
    const name = document.createElement('div');
    name.className = 'shop-item-name';
    name.textContent = it.name;
    card.appendChild(name);
    card.addEventListener('click', () => {
      tooltip.show(hoverData, card);
    });

    const btn = document.createElement('button');
    btn.className = 'btn price-btn';
    // show price with a span we can style when unaffordable
    btn.innerHTML = `<span class="price-amt">${it.cost}</span><span class="coin-icon"></span>`;
    const alreadyPurchased = isOfferPurchased(it);
    // initial disabled state if unaffordable
    const unaffordable = (!shopState.unlimited && shopState.gold < it.cost);
    if (alreadyPurchased) {
      btn.textContent = '✔';
      btn.disabled = true;
      btn.dataset.purchased = '1';
    } else if (unaffordable) {
      btn.classList.add('unaffordable');
      btn.disabled = true;
      const amt = btn.querySelector('.price-amt'); if (amt) amt.classList.add('unaffordable');
    }
    btn.onclick = () => {
      purchaseOffer(it, btn);
    };
    card.appendChild(btn);

    card.addEventListener('mouseenter', () => tooltip.show(hoverData, card));
    card.addEventListener('mouseleave', () => tooltip.hide());
    card.addEventListener('click', ev => { ev.stopPropagation(); tooltip.show(hoverData, card); });

    wrap.appendChild(card);
  });
}

function updateRerollBtn(){
  const btn = document.getElementById('btnReroll');
  if(!btn) return;
  const cost = 5 * (rerollCount + 1);
  if(!shopState.unlimited){
    const remaining = Math.max(0, 1 - rerollCount);
    if(remaining <= 0){
      btn.disabled = true;
      btn.innerHTML = 'Re-rolar (0 restantes)';
      return;
    }
    btn.disabled = false;
    btn.innerHTML = `Re-rolar (${cost}<span class="coin-icon"></span>, ${remaining} restantes)`;
  }else{
    btn.disabled = false;
    btn.innerHTML = `Re-rolar (${cost}<span class="coin-icon"></span>)`;
  }
}

function getRemovalCost(card){
  if(!card) return 15 + (shopState.removals * 5);
  const rarity = (card.rarity || 'common').toLowerCase();
  const base = REMOVAL_COST_BY_RARITY[rarity] || 15;
  return base + (shopState.removals * 5);
}

function openShop({ faction, gold, onClose, unlimited=false, story=false, resumeVisit=false }){
  const deckKey = normalizeDeckKey(faction);
  shopState.faction = deckKey;
  shopState.deckKey = deckKey;
  shopState.gold = gold;
  shopState.onClose = onClose;
  shopState.unlimited = unlimited;
  if(!resumeVisit){
    shopState.purchased = [];
    shopState.purchasedIds = new Set();
    shopState.pending = [];
    shopState.removals = 0;
    shopState.visitId += 1;
    rerollCount = 0;
  }
  shopState.story = !!story;
  updateRerollBtn();
  $('#shopGold').textContent = shopState.gold;
  $('#shopMsg').textContent = '';
  renderShop();
  // Atualiza texto do botão de remoção com custo dinâmico
  const removeBtn = document.getElementById('btnRemoveCard');
  if(removeBtn){
    const baseCost = getRemovalCost();
    removeBtn.textContent = `🔥 Remover Carta (${baseCost} ouro)`;
    if(shopState.gold < baseCost){
      removeBtn.disabled = true;
      removeBtn.classList.add('insufficient-funds');
    } else {
      removeBtn.disabled = false;
      removeBtn.classList.remove('insufficient-funds');
    }
  }
  // ensure the close button is enabled and clickable
  const closeBtn = document.getElementById('closeShop');
  if(closeBtn){ closeBtn.disabled = false; }
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.add('show');
    modal.style.display = 'grid';
    modal.setAttribute('aria-hidden','false');
    const focusTarget = modal.querySelector('#closeShop') || modal.querySelector('button');
    if(focusTarget && typeof focusTarget.focus==='function'){ focusTarget.focus(); }
  }
}

function hideShopModal(){
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
  }
  tooltip.hide();
}

function closeShop(notify=true){
  hideShopModal();
  // reset any in-flight purchase tracking on close
  shopState.pending = [];
  if(notify && shopState.onClose) shopState.onClose(shopState);
}

window.openShop = openShop;

const shopModal = document.getElementById('shopModal');
shopModal?.addEventListener('click', ev => {
  const box = shopModal.querySelector('.box');
  if(!box) return;
  if(ev.target === shopModal || ev.target.id === 'closeShop'){
    closeShop();
  }
});

document.getElementById('btnReroll')?.addEventListener('click', () => {
  const cost = 5 * (rerollCount + 1);
  const rerollBtn = document.getElementById('btnReroll');
  if(!shopState.unlimited && rerollCount >= 1){ showShopMsg('Sem re-rolagens.'); if(window.playSfx) window.playSfx('error'); return; }
  if(shopState.gold < cost){ 
    showShopMsg('Sem ouro.'); 
    if(window.playSfx) window.playSfx('error');
    if(rerollBtn) rerollBtn.classList.add('insufficient-funds');
    return; 
  }
  if(rerollBtn) rerollBtn.classList.remove('insufficient-funds');
  shopState.gold -= cost;
  $('#shopGold').textContent = shopState.gold;
  rerollCount++;
  renderShop();
  updateRerollBtn();
  if(window.playSfx) window.playSfx('reroll');
});

document.getElementById('btnRemoveCard')?.addEventListener('click', () => {
  const cost = getRemovalCost();
  if(shopState.removals>=1){
    showShopMsg('Apenas 1 remoção por visita.');
    if(window.playSfx) window.playSfx('error');
    return;
  }
  if(shopState.gold < cost){ 
    showShopMsg('Sem ouro suficiente!'); 
    if(window.playSfx) window.playSfx('error'); 
    return; 
  }
  // Lazy attach if not defined yet but game.js loaded
  if(!window.showCardRemoval && typeof window.showCardRemoval!=='function'){
    if(typeof window.showCardRemoval==='undefined' && typeof window.gameReady==='function'){
      try{ window.gameReady(); }catch(_){ }
    }
  }
  if(typeof window.showCardRemoval!=='function'){
    showShopMsg('Sistema de remoção indisponível.');
    return;
  }
  
  closeShop(false);

  let removedCard = false;
  window.showCardRemoval({
    onCardRemoved: () => {
      removedCard = true;
      shopState.gold = Math.max(0, shopState.gold - cost);
      $('#shopGold').textContent = shopState.gold;
      if(window.updateGoldHUD) window.updateGoldHUD();
      if(typeof window.log==='function'){
        window.log(`💰 Custo de remoção: ${cost} ouro (base + ${shopState.removals * 5} incremental)`);
      }
    },
    onComplete: () => {
      if(removedCard){
        shopState.removals++;
      }
      openShop({
        faction: shopState.faction,
        gold: shopState.gold,
        onClose: shopState.onClose,
        unlimited: shopState.unlimited,
        story: shopState.story,
        resumeVisit: true
      });
    }
  });
});

document.getElementById('closeShop')?.addEventListener('click', closeShop);
