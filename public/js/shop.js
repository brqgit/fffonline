const $ = sel => document.querySelector(sel);

const FACTIONS = {
  Furioso: { pool: [
    { name: 'Ceifeira Ágil', type: 'unit', atk: 3, hp: 2, cost: 9, rarity: 'common' },
    { name: 'Grito de Guerra', type: 'spell', desc: '+1 ATK a uma unidade', cost: 6, rarity: 'common' },
    { name: 'Totem da Fúria', type: 'totem', desc: '+1 ATK a 1–3 unidades', cost: 12, rarity: 'rare' }
  ]},
  Sombras: { pool: [
    { name: 'Sombras Encapuçado', type: 'unit', atk: 3, hp: 5, cost: 10, rarity: 'common' },
    { name: 'Dreno Sombrio', type: 'spell', desc: 'Drena 2 de HP', cost: 7, rarity: 'common' },
    { name: 'Totem da Lua Nova', type: 'totem', desc: '+1 HP a 1–3 unidades', cost: 11, rarity: 'rare' }
  ]},
  Percepcao: { pool: [
    { name: 'Guardião do Bosque', type: 'unit', atk: 2, hp: 4, cost: 8, rarity: 'common' },
    { name: 'Insight', type: 'spell', desc: 'Compre 2 cartas', cost: 7, rarity: 'common' },
    { name: 'Totem do Olho Antigo', type: 'totem', desc: '+1/+1 a 1–3 unidades', cost: 13, rarity: 'rare' }
  ]}
};

const NEUTRAL = [
  { name: 'Aldeão Valente', type: 'unit', atk: 1, hp: 2, cost: 5, rarity: 'common' },
  { name: 'Afiar Lâminas', type: 'spell', desc: '+1 ATK', cost: 5, rarity: 'common' },
  { name: 'Totem do Carvalho', type: 'totem', desc: '+1 HP', cost: 9, rarity: 'rare' }
];

const STORY_ITEMS = [
  { name: 'Elixir de Mana Primordial', type: 'relic', desc: 'Comece os combates da história com +1 de mana.', cost: 18, rarity: 'rare', flair: 'mana', bonus: { startMana: 1 } },
  { name: 'Tambor dos Conquistadores', type: 'relic', desc: 'Ganha +1 de mana sempre que destruir uma unidade inimiga.', cost: 24, rarity: 'epic', flair: 'weapon', bonus: { killMana: 1 } },
  { name: 'Grãos Encantados de Freyja', type: 'buff', desc: 'Aliados começam com +1 HP permanente na campanha.', cost: 16, rarity: 'rare', flair: 'buff', bonus: { allyBuff: { hp: 1 } } },
  { name: 'Lâmina das Sete Runas', type: 'buff', desc: '+1 ATK permanente para suas unidades na campanha.', cost: 22, rarity: 'epic', flair: 'weapon', bonus: { allyBuff: { atk: 1 } } },
  { name: 'Talismã Totêmico Ancestral', type: 'totem', desc: 'Totens concedem +1/+1 adicional ao ativar.', cost: 26, rarity: 'legendary', flair: 'totem', bonus: { totemBonus: { atk: 1, hp: 1 } } }
];

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

let shopState = { faction: '', gold: 0, onClose: null, unlimited: false, purchased: [], story: false };
let rerollCount = 0;

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
  // produce up to 12 offers, preferring faction pool when available
  const maxOffers = 12;
  const factionPool = (shopState.faction && FACTIONS[shopState.faction])
    ? FACTIONS[shopState.faction].pool.map(c => Object.assign({ faction: shopState.faction }, c))
    : [];
  const neutralPool = NEUTRAL.map(c => Object.assign({ faction: 'Neutro' }, c));
  let pool = [];
  if(shopState.story){
    const storyPicks = shuffle(STORY_ITEMS).slice(0, 4).map(it => Object.assign({}, it));
    for(const item of storyPicks){
      if(pool.length >= maxOffers) break;
      if(!pool.some(p => p.name === item.name)) pool.push(item);
    }
  }
  if(factionPool.length){
    shuffle(factionPool).forEach(it => {
      if(pool.length >= maxOffers) return;
      if(!pool.some(p => p.name === it.name)) pool.push(it);
    });
  }
  const allPools = Object.entries(FACTIONS).flatMap(([fac, obj]) =>
    obj.pool.map(c => Object.assign({ faction: fac }, c))
  );
  const otherCandidates = shuffle([].concat(neutralPool, allPools));
  for(const it of otherCandidates){
    if(pool.length>=maxOffers) break;
    if(!pool.some(p => p.name === it.name)) pool.push(it);
  }
  if(pool.length < 6){
    for(const cand of otherCandidates){
      if(pool.length >= 6) break;
      if(!pool.some(p => p.name === cand.name)) pool.push(cand);
    }
  }
  const offers = pool.slice(0, maxOffers).map(it => {
    const base = Object.assign({}, it);
    // if player deck choice exists, hint renderer to prefer that deck for art
    if(window && window.G && window.G.playerDeckChoice && !base.deck){ base.deck = window.G.playerDeckChoice; }
    return withImg(base);
  });
  // add a consumable if there's room
  if(offers.length < maxOffers) offers.push(withImg({ name: 'Elixir de Força', type: 'buff', desc: '+1 ATK a suas unidades neste round', cost: 7 }));
  return offers.slice(0, maxOffers);
}

function renderShop(){
  const wrap = $('#shopChoices');
  if(!wrap) return;
  wrap.innerHTML = '';
  tooltip.hide();
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    const flair = (it && (it.flair || (it.type === 'buff' && it.bonus && it.bonus.startMana ? 'mana' : it.type))) || 'item';
    card.dataset.flair = flair;
    if(it && it.type) card.dataset.type = it.type;

    if(['unit','spell','totem'].includes(it.type) && window.cardNode){
      // normalize data for cardNode: prefer deck/icon or img
      const nodeData = Object.assign({}, it);
      // clear img if present to avoid 404s; let game.js choose a safe deck placeholder
      if(nodeData.img) delete nodeData.img;
      if(!nodeData.deck && window && window.G && window.G.playerDeckChoice) nodeData.deck = window.G.playerDeckChoice;
      const node = window.cardNode(nodeData,'player');
      node.classList.add('shop-preview');
      card.appendChild(node);
    }else{
      const art = document.createElement('div');
      art.className = 'shop-art';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'shop-art-icon';
      iconSpan.textContent = it.icon || SHOP_ICONS[flair] || SHOP_ICONS[it.type] || '🛒';
      art.appendChild(iconSpan);
      card.appendChild(art);
      const name = document.createElement('div');
      name.className = 'shop-item-name';
      name.textContent = it.name;
      card.appendChild(name);
    }

    const btn = document.createElement('button');
    btn.className = 'btn price-btn';
    btn.innerHTML = `${it.cost}<span class="coin-icon"></span>`;
    btn.onclick = () => {
      if(shopState.gold < it.cost){ showShopMsg('Sem ouro.'); if(window.playSfx) window.playSfx('error'); return; }
      btn.disabled = true;
      const currentGold = shopState.gold;
      const req = fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: getPlayerId(),
          itemId: slug(it.name),
          cost: it.cost,
          gold: currentGold,
        })
      })
      .then(r => r.json())
      .then(data => {
        if(data && typeof data.gold === 'number'){
          shopState.gold = data.gold;
          $('#shopGold').textContent = shopState.gold;
          btn.textContent = '✔';
          shopState.purchased.push(it);
          if(window.playSfx) window.playSfx('reward');
        } else {
          throw new Error('Resposta inválida');
        }
      })
      .catch(err => {
        console.error('purchase error', err);
        showShopMsg('Erro ao registrar compra');
        btn.disabled = false;
        if(window.playSfx) window.playSfx('error');
      });
      shopState.pending.push(req);
    };
    card.appendChild(btn);

    card.addEventListener('mouseenter', () => tooltip.show(it, card));
    card.addEventListener('mouseleave', () => tooltip.hide());
    card.addEventListener('click', ev => { ev.stopPropagation(); tooltip.show(it, card); });

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

function openShop({ faction, gold, onClose, unlimited=false, story=false }){

  const map = { vikings:'Furioso', animais:'Furioso', pescadores:'Sombras', floresta:'Percepcao', convergentes:'Percepcao' };
  shopState.faction = map[faction] || faction || 'Furioso';
  shopState.gold = gold;
  shopState.onClose = onClose;
  shopState.unlimited = unlimited;
  shopState.purchased = [];
  shopState.pending = [];
  shopState.story = !!story;
  rerollCount = 0;
  updateRerollBtn();
  $('#shopGold').textContent = shopState.gold;
  $('#shopMsg').textContent = '';
  renderShop();
  // ensure the close button is enabled and clickable
  const closeBtn = document.getElementById('closeShop');
  if(closeBtn){ closeBtn.disabled = false; }
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.add('show');
    modal.style.display = 'grid';
  }
}

function closeShop(){
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  tooltip.hide();
  // reset any in-flight purchase tracking on close
  shopState.pending = [];
  shopState.story = false;
  if(shopState.onClose) shopState.onClose(shopState);
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
  if(!shopState.unlimited && rerollCount >= 1){ showShopMsg('Sem re-rolagens.'); if(window.playSfx) window.playSfx('error'); return; }
  if(shopState.gold < cost){ showShopMsg('Sem ouro.'); if(window.playSfx) window.playSfx('error'); return; }
  shopState.gold -= cost;
  $('#shopGold').textContent = shopState.gold;
  rerollCount++;
  renderShop();
  updateRerollBtn();
  if(window.playSfx) window.playSfx('reroll');
});
document.getElementById('closeShop')?.addEventListener('click', closeShop);
